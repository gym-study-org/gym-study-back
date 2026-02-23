export interface GemTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  source_id: string | null;
  description_pt: string | null;
  balance_after: number;
  created_at: string;
}

export interface ShopItem {
  id: string;
  item_code: string;
  name_pt: string;
  description_pt: string;
  category: string;
  gem_cost: number;
  icon: string;
  is_active: boolean;
  max_per_user: number | null;
  already_owned?: boolean;
}

export interface GemsBalance {
  balance: number;
  total_earned: number;
  total_spent: number;
}

// Sources for earning gems
export const GEM_EARN_SOURCES: Record<string, { amount: number; description: string }> = {
  daily_login: { amount: 5, description: 'Login diário' },
  quest_all_complete: { amount: 10, description: 'Completar todas as missões diárias' },
  streak_milestone_7: { amount: 15, description: 'Ofensiva de 7 dias' },
  streak_milestone_30: { amount: 50, description: 'Ofensiva de 30 dias' },
  streak_milestone_100: { amount: 100, description: 'Ofensiva de 100 dias' },
  league_top3: { amount: 25, description: 'Top 3 na liga semanal' },
  league_promotion: { amount: 20, description: 'Promoção de liga' },
  achievement_unlock: { amount: 10, description: 'Desbloquear conquista' },
};
