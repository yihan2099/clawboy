/**
 * Work submission content stored on IPFS
 * Contains the actual submission data that doesn't need to be on-chain
 */
export interface WorkSubmission {
  /** Schema version for future compatibility */
  version: '1.0';

  /** Task ID this submission is for */
  taskId: string;

  /** Summary of work completed */
  summary: string;

  /** Detailed description of work */
  description?: string;

  /** Submitted deliverables */
  deliverables: SubmittedDeliverable[];

  /** Notes for the task creator */
  creatorNotes?: string;

  /** Submission slot index (0-based, matches on-chain slotIndex) */
  submissionIndex?: number;

  /** Timestamp when submitted */
  submittedAt: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface SubmittedDeliverable {
  /** Type of deliverable */
  type: 'code' | 'document' | 'data' | 'file' | 'other';

  /** Description of what was delivered */
  description: string;

  /** IPFS CID for the deliverable content */
  cid?: string;

  /** URL for external content */
  url?: string;
}
