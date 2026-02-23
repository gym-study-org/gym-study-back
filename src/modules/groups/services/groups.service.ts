import { pool } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import {
  StudyGroupWithDetails,
  StudyGroupMember,
  StudyGroupMessage,
  CreateGroupDTO,
  UpdateGroupDTO,
  SendMessageDTO,
} from '../interfaces/groups.interface';

export class GroupsService {
  /**
   * Create a new study group
   */
  static async createGroup(userId: string, data: CreateGroupDTO): Promise<StudyGroupWithDetails> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO study_groups (name, description, subject, owner_id, is_public, max_members)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [data.name, data.description || null, data.subject || null, userId, data.is_public ?? true, data.max_members || 20]
      );
      const group = result.rows[0];

      // Add owner as member
      await client.query(
        `INSERT INTO study_group_members (group_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [group.id, userId]
      );

      await client.query('COMMIT');

      const userResult = await pool.query(
        'SELECT username, avatar_url FROM users WHERE id = $1',
        [userId]
      );

      return {
        ...group,
        members_count: 1,
        owner_username: userResult.rows[0].username,
        owner_avatar_url: userResult.rows[0].avatar_url,
        my_role: 'owner',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get group by ID with details
   */
  static async getGroup(groupId: string, userId: string): Promise<StudyGroupWithDetails> {
    const result = await pool.query(
      `SELECT g.*,
         (SELECT COUNT(*) FROM study_group_members WHERE group_id = g.id)::int AS members_count,
         u.username AS owner_username,
         u.avatar_url AS owner_avatar_url,
         sgm.role AS my_role
       FROM study_groups g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN study_group_members sgm ON sgm.group_id = g.id AND sgm.user_id = $2
       WHERE g.id = $1 AND g.is_active = true`,
      [groupId, userId]
    );

    if (result.rows.length === 0) {
      throw new AppError('Grupo não encontrado', 404, 'GROUP_NOT_FOUND');
    }

    return result.rows[0];
  }

  /**
   * List public groups or user's groups
   */
  static async listGroups(
    userId: string,
    filter: 'my' | 'public' | 'all',
    limit: number,
    cursor?: string
  ): Promise<StudyGroupWithDetails[]> {
    const params: unknown[] = [userId, limit];
    let paramIdx = 3;
    let whereClause = 'g.is_active = true';
    let cursorClause = '';

    if (filter === 'my') {
      whereClause += ' AND sgm.user_id IS NOT NULL';
    } else if (filter === 'public') {
      whereClause += ' AND g.is_public = true';
    } else {
      whereClause += ' AND (g.is_public = true OR sgm.user_id IS NOT NULL)';
    }

    if (cursor) {
      cursorClause = `AND g.created_at < $${paramIdx}`;
      params.push(cursor);
      paramIdx++;
    }

    const result = await pool.query(
      `SELECT g.*,
         (SELECT COUNT(*) FROM study_group_members WHERE group_id = g.id)::int AS members_count,
         u.username AS owner_username,
         u.avatar_url AS owner_avatar_url,
         sgm.role AS my_role
       FROM study_groups g
       JOIN users u ON u.id = g.owner_id
       LEFT JOIN study_group_members sgm ON sgm.group_id = g.id AND sgm.user_id = $1
       WHERE ${whereClause} ${cursorClause}
       ORDER BY g.created_at DESC
       LIMIT $2`,
      params
    );

    return result.rows;
  }

  /**
   * Update a group (owner/admin only)
   */
  static async updateGroup(groupId: string, userId: string, data: UpdateGroupDTO): Promise<StudyGroupWithDetails> {
    // Check permissions
    const memberCheck = await pool.query(
      `SELECT role FROM study_group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      throw new AppError('Sem permissão para editar este grupo', 403, 'FORBIDDEN');
    }

    const setClauses: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (data.name !== undefined) { setClauses.push(`name = $${idx}`); values.push(data.name); idx++; }
    if (data.description !== undefined) { setClauses.push(`description = $${idx}`); values.push(data.description); idx++; }
    if (data.subject !== undefined) { setClauses.push(`subject = $${idx}`); values.push(data.subject); idx++; }
    if (data.is_public !== undefined) { setClauses.push(`is_public = $${idx}`); values.push(data.is_public); idx++; }
    if (data.max_members !== undefined) { setClauses.push(`max_members = $${idx}`); values.push(data.max_members); idx++; }

    values.push(groupId);

    await pool.query(
      `UPDATE study_groups SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      values
    );

    return this.getGroup(groupId, userId);
  }

  /**
   * Delete a group (owner only)
   */
  static async deleteGroup(groupId: string, userId: string): Promise<void> {
    const result = await pool.query(
      `UPDATE study_groups SET is_active = false
       WHERE id = $1 AND owner_id = $2 AND is_active = true`,
      [groupId, userId]
    );

    if (result.rowCount === 0) {
      throw new AppError('Grupo não encontrado ou sem permissão', 404, 'GROUP_NOT_FOUND');
    }
  }

  /**
   * Join a group
   */
  static async joinGroup(groupId: string, userId: string): Promise<void> {
    const group = await pool.query(
      `SELECT id, max_members, is_public FROM study_groups WHERE id = $1 AND is_active = true`,
      [groupId]
    );

    if (group.rows.length === 0) {
      throw new AppError('Grupo não encontrado', 404, 'GROUP_NOT_FOUND');
    }

    if (!group.rows[0].is_public) {
      throw new AppError('Este grupo é privado', 403, 'GROUP_PRIVATE');
    }

    // Check member count
    const countResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM study_group_members WHERE group_id = $1',
      [groupId]
    );

    if (countResult.rows[0].count >= group.rows[0].max_members) {
      throw new AppError('Grupo lotado', 400, 'GROUP_FULL');
    }

    // Check if already a member
    const existing = await pool.query(
      'SELECT id FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (existing.rows.length > 0) {
      throw new AppError('Você já é membro deste grupo', 400, 'ALREADY_MEMBER');
    }

    await pool.query(
      `INSERT INTO study_group_members (group_id, user_id, role) VALUES ($1, $2, 'member')`,
      [groupId, userId]
    );

    // System message
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    await pool.query(
      `INSERT INTO study_group_messages (group_id, user_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [groupId, userId, `${userResult.rows[0].username} entrou no grupo`]
    );
  }

  /**
   * Leave a group
   */
  static async leaveGroup(groupId: string, userId: string): Promise<void> {
    // Check if owner
    const memberCheck = await pool.query(
      'SELECT role FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new AppError('Você não é membro deste grupo', 400, 'NOT_MEMBER');
    }

    if (memberCheck.rows[0].role === 'owner') {
      throw new AppError('O dono não pode sair do grupo. Transfira a propriedade ou delete o grupo.', 400, 'OWNER_CANNOT_LEAVE');
    }

    await pool.query(
      'DELETE FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    await pool.query(
      `INSERT INTO study_group_messages (group_id, user_id, content, message_type)
       VALUES ($1, $2, $3, 'system')`,
      [groupId, userId, `${userResult.rows[0].username} saiu do grupo`]
    );
  }

  /**
   * Get group members
   */
  static async getMembers(groupId: string): Promise<StudyGroupMember[]> {
    const result = await pool.query(
      `SELECT sgm.*, u.username, u.full_name, u.avatar_url
       FROM study_group_members sgm
       JOIN users u ON u.id = sgm.user_id
       WHERE sgm.group_id = $1
       ORDER BY
         CASE sgm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
         sgm.joined_at`,
      [groupId]
    );
    return result.rows;
  }

  /**
   * Send a message in a group
   */
  static async sendMessage(
    groupId: string,
    userId: string,
    data: SendMessageDTO
  ): Promise<StudyGroupMessage> {
    // Verify membership
    const memberCheck = await pool.query(
      'SELECT id FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new AppError('Você não é membro deste grupo', 403, 'NOT_MEMBER');
    }

    const result = await pool.query(
      `INSERT INTO study_group_messages (group_id, user_id, content, message_type, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [groupId, userId, data.content, data.message_type || 'text', JSON.stringify(data.metadata || {})]
    );

    const msg = result.rows[0];
    const authorResult = await pool.query(
      'SELECT username, avatar_url FROM users WHERE id = $1',
      [userId]
    );

    const fullMsg: StudyGroupMessage = {
      ...msg,
      author_username: authorResult.rows[0].username,
      author_avatar_url: authorResult.rows[0].avatar_url,
    };

    // Emit via WebSocket
    import('../../../server').then(({ io }) => {
      import('../../../websocket/socket.handler').then(({ emitGroupMessage }) => {
        emitGroupMessage(io, groupId, {
          id: fullMsg.id,
          user_id: fullMsg.user_id,
          content: fullMsg.content,
          message_type: fullMsg.message_type,
          author_username: fullMsg.author_username,
          created_at: fullMsg.created_at,
        });
      });
    }).catch(() => {});

    return fullMsg;
  }

  /**
   * Get messages in a group (cursor-based)
   */
  static async getMessages(
    groupId: string,
    userId: string,
    limit: number,
    cursor?: string
  ): Promise<StudyGroupMessage[]> {
    // Verify membership
    const memberCheck = await pool.query(
      'SELECT id FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberCheck.rows.length === 0) {
      throw new AppError('Você não é membro deste grupo', 403, 'NOT_MEMBER');
    }

    const params: unknown[] = [groupId, limit];
    let cursorClause = '';

    if (cursor) {
      cursorClause = 'AND m.created_at < $3';
      params.push(cursor);
    }

    const result = await pool.query(
      `SELECT m.*, u.username AS author_username, u.avatar_url AS author_avatar_url
       FROM study_group_messages m
       JOIN users u ON u.id = m.user_id
       WHERE m.group_id = $1 ${cursorClause}
       ORDER BY m.created_at DESC
       LIMIT $2`,
      params
    );

    return result.rows;
  }

  /**
   * Kick a member (owner/admin only, can't kick owner)
   */
  static async kickMember(groupId: string, actorId: string, targetUserId: string): Promise<void> {
    const actorRole = await pool.query(
      'SELECT role FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, actorId]
    );

    if (actorRole.rows.length === 0 || !['owner', 'admin'].includes(actorRole.rows[0].role)) {
      throw new AppError('Sem permissão', 403, 'FORBIDDEN');
    }

    const targetRole = await pool.query(
      'SELECT role FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );

    if (targetRole.rows.length === 0) {
      throw new AppError('Usuário não é membro', 400, 'NOT_MEMBER');
    }

    if (targetRole.rows[0].role === 'owner') {
      throw new AppError('Não é possível remover o dono do grupo', 400, 'CANNOT_KICK_OWNER');
    }

    if (actorRole.rows[0].role === 'admin' && targetRole.rows[0].role === 'admin') {
      throw new AppError('Admin não pode remover outro admin', 400, 'CANNOT_KICK_ADMIN');
    }

    await pool.query(
      'DELETE FROM study_group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, targetUserId]
    );
  }
}
