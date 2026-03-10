import type { Database } from './database';

export type JudgmentRow = Database['public']['Tables']['judgments']['Row'];
export type JudgmentInsert = Database['public']['Tables']['judgments']['Insert'];
export type JudgmentUpdate = Database['public']['Tables']['judgments']['Update'];

export type TaskPayoutRow = Database['public']['Tables']['task_payouts']['Row'];
export type TaskPayoutInsert = Database['public']['Tables']['task_payouts']['Insert'];
export type TaskPayoutUpdate = Database['public']['Tables']['task_payouts']['Update'];
