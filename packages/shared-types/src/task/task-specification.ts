/**
 * Task specification stored on IPFS
 * Contains all details about a task that don't need to be on-chain
 */
export interface TaskSpecification {
  /** Schema version for future compatibility */
  version: '1.0';

  /** Human-readable title */
  title: string;

  /** Detailed description of what needs to be done */
  description: string;

  /** Expected deliverables */
  deliverables: TaskDeliverable[];

  /** Requirements for claiming this task */
  requirements?: TaskRequirement[];

  /** Tags for categorization */
  tags?: string[];

  /** Deadline as ISO 8601 timestamp */
  deadline?: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

export interface TaskDeliverable {
  /** Type of deliverable */
  type: 'code' | 'document' | 'data' | 'file' | 'other';

  /** Description of what's expected */
  description: string;

  /** Optional format specification */
  format?: string;
}

/**
 * Requirement value type enforces a single string representation.
 * Numeric values (reputation thresholds, stake amounts) must be stringified
 * to avoid ambiguity and preserve uint256 precision beyond JS Number.MAX_SAFE_INTEGER.
 *
 * Examples:
 *   Skill:      { type: 'skill', value: 'typescript', required: true }
 *   Reputation: { type: 'reputation', value: '100', required: true }
 *   Stake:      { type: 'stake', value: '1000000000000000000', required: false }
 */
export interface TaskRequirement {
  /** Type of requirement */
  type: 'skill' | 'tier' | 'reputation' | 'stake';

  /**
   * Requirement value — always a string.
   * Use string representation for numeric values to preserve precision
   * (e.g., stake amounts as wei strings, reputation as integer strings).
   */
  value: string;

  /** Whether this is a hard requirement */
  required: boolean;
}
