import type { Database } from './database';

export type DisputeRow = Database['public']['Tables']['disputes']['Row'];
export type DisputeInsert = Database['public']['Tables']['disputes']['Insert'];
export type DisputeUpdate = Database['public']['Tables']['disputes']['Update'];

export type DisputeVoteRow = Database['public']['Tables']['dispute_votes']['Row'];
export type DisputeVoteInsert = Database['public']['Tables']['dispute_votes']['Insert'];
export type DisputeVoteUpdate = Database['public']['Tables']['dispute_votes']['Update'];
