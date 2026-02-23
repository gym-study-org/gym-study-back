import { query } from '../../../config/database';
import { AppError } from '../../../shared/utils/AppError';
import { logger } from '../../../shared/utils/logger.util';
import { GemTransaction, ShopItem, GemsBalance, GEM_EARN_SOURCES } from '../interfaces/gems.interface';
import { emitToUser } from '../../../websocket/socket.handler';
import { io } from '../../../server';

export class GemsService {
  /**
   * Get gems balance summary for a user
   */
  static async getBalance(userId: string): Promise<GemsBalance> {
    const userResult = await query('SELECT gems_balance FROM users WHERE id = $1', [userId]);
    const balance = userResult.rows.length > 0 ? (userResult.rows[0].gems_balance || 0) : 0;

    const statsResult = await query(
      `SELECT
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as total_earned,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as total_spent
       FROM gem_transactions WHERE user_id = $1`,
      [userId]
    );

    return {
      balance,
      total_earned: parseInt(statsResult.rows[0].total_earned),
      total_spent: parseInt(statsResult.rows[0].total_spent),
    };
  }

  /**
   * Award gems to a user
   */
  static async awardGems(
    userId: string,
    source: string,
    amount?: number,
    sourceId?: string
  ): Promise<GemTransaction> {
    const earnSource = GEM_EARN_SOURCES[source];
    const gemAmount = amount || (earnSource?.amount ?? 0);
    const description = earnSource?.description || source;

    if (gemAmount <= 0) {
      throw new AppError('Quantidade de gemas inválida', 400, 'INVALID_GEM_AMOUNT');
    }

    const result = await query(
      `INSERT INTO gem_transactions (user_id, amount, source, source_id, description_pt)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, gemAmount, source, sourceId || null, description]
    );

    const transaction = result.rows[0];

    // Emit WebSocket event
    emitToUser(io, userId, 'gems:earned', {
      amount: gemAmount,
      source,
      description,
      balance_after: transaction.balance_after,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`User ${userId} earned ${gemAmount} gems from ${source}`);
    return transaction;
  }

  /**
   * Get transaction history
   */
  static async getHistory(
    userId: string,
    options: { limit: number; cursor?: string }
  ): Promise<{ transactions: GemTransaction[]; next_cursor: string | null }> {
    const { limit, cursor } = options;
    let sql = 'SELECT * FROM gem_transactions WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIdx = 2;

    if (cursor) {
      sql += ` AND created_at < $${paramIdx++}`;
      params.push(cursor);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIdx}`;
    params.push(limit + 1);

    const result = await query(sql, params);
    const transactions = result.rows.slice(0, limit);
    const hasMore = result.rows.length > limit;
    const next_cursor = hasMore && transactions.length > 0
      ? transactions[transactions.length - 1].created_at
      : null;

    return { transactions, next_cursor };
  }

  /**
   * Get shop items with ownership status
   */
  static async getShopItems(userId: string): Promise<ShopItem[]> {
    const result = await query(
      `SELECT si.*,
        CASE WHEN up.id IS NOT NULL THEN true ELSE false END as already_owned
       FROM shop_items si
       LEFT JOIN user_purchases up ON up.shop_item_id = si.id AND up.user_id = $1
       WHERE si.is_active = true
       ORDER BY si.gem_cost ASC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Purchase a shop item
   */
  static async purchaseItem(userId: string, itemCode: string): Promise<{ item: ShopItem; new_balance: number }> {
    // Get shop item
    const itemResult = await query(
      'SELECT * FROM shop_items WHERE item_code = $1 AND is_active = true',
      [itemCode]
    );

    if (itemResult.rows.length === 0) {
      throw new AppError('Item não encontrado', 404, 'ITEM_NOT_FOUND');
    }

    const item = itemResult.rows[0];

    // Check max_per_user limit
    if (item.max_per_user !== null) {
      const ownedCount = await query(
        'SELECT COUNT(*) FROM user_purchases WHERE user_id = $1 AND shop_item_id = $2',
        [userId, item.id]
      );
      if (parseInt(ownedCount.rows[0].count) >= item.max_per_user) {
        throw new AppError('Você já possui este item', 400, 'ALREADY_OWNED');
      }
    }

    // Check balance
    const userResult = await query('SELECT gems_balance FROM users WHERE id = $1', [userId]);
    const balance = userResult.rows[0]?.gems_balance || 0;

    if (balance < item.gem_cost) {
      throw new AppError(
        `Gemas insuficientes. Custo: ${item.gem_cost}, Saldo: ${balance}`,
        400,
        'INSUFFICIENT_GEMS'
      );
    }

    // Create purchase record
    await query(
      'INSERT INTO user_purchases (user_id, shop_item_id, gem_cost) VALUES ($1, $2, $3)',
      [userId, item.id, item.gem_cost]
    );

    // Deduct gems via transaction (negative amount)
    await query(
      `INSERT INTO gem_transactions (user_id, amount, source, source_id, description_pt)
       VALUES ($1, $2, 'shop_purchase', $3, $4)`,
      [userId, -item.gem_cost, item.id, `Compra: ${item.name_pt}`]
    );

    // Apply item effect
    await this.applyItemEffect(userId, item.item_code);

    // Get new balance
    const newBalanceResult = await query('SELECT gems_balance FROM users WHERE id = $1', [userId]);
    const newBalance = newBalanceResult.rows[0]?.gems_balance || 0;

    emitToUser(io, userId, 'gems:spent', {
      item_code: item.item_code,
      cost: item.gem_cost,
      new_balance: newBalance,
      timestamp: new Date().toISOString(),
    });

    return { item, new_balance: newBalance };
  }

  /**
   * Apply the effect of a purchased item
   */
  private static async applyItemEffect(userId: string, itemCode: string): Promise<void> {
    switch (itemCode) {
      case 'streak_freeze':
        await query(
          `UPDATE users SET streak_freezes_available = LEAST(streak_freezes_available + 1, 2) WHERE id = $1`,
          [userId]
        );
        break;

      case 'xp_boost_2x':
        // Store boost expiry in user metadata or a separate table
        // For simplicity, we'll emit an event and let frontend handle the display
        logger.info(`XP boost 2x activated for user ${userId}`);
        break;

      // Cosmetic items don't need backend effects
      case 'profile_badge_fire':
      case 'profile_badge_star':
      case 'profile_badge_crown':
        break;

      default:
        logger.warn(`Unknown item effect: ${itemCode}`);
    }
  }
}
