import { describe, test, expect } from 'bun:test';

import {
  // Task phase exports
  TaskPhase,
  TaskPhaseNumber,
  TERMINAL_PHASES,
  VALID_PHASE_TRANSITIONS,
  numberToTaskPhase,
  isValidPhaseTransition,
  isTerminalPhase,
  stringToTaskPhase,
  InvalidPhaseTransitionError,
  assertValidPhaseTransition,
  getPhaseDescription,

  // Address utility exports
  normalizeAddress,
  normalizeEthAddress,
  addressesEqual,
  isValidAddress,
  validateAndNormalizeAddress,
  truncateAddress,
  ZERO_ADDRESS,
  isZeroAddress,
} from '../index.js';

describe('TaskPhase enum', () => {
  test('should define all expected phase values', () => {
    expect(TaskPhase.Open).toBe('open');
    expect(TaskPhase.WorkPhase).toBe('work_phase');
    expect(TaskPhase.JudgePhase).toBe('judge_phase');
    expect(TaskPhase.Resolved).toBe('resolved');
    expect(TaskPhase.Cancelled).toBe('cancelled');
    expect(TaskPhase.Failed).toBe('failed');
  });

  test('should have exactly 6 phases', () => {
    const values = Object.values(TaskPhase);
    expect(values).toHaveLength(6);
  });
});

describe('TaskPhaseNumber', () => {
  test('should map each phase to a unique number', () => {
    expect(TaskPhaseNumber[TaskPhase.Open]).toBe(0);
    expect(TaskPhaseNumber[TaskPhase.WorkPhase]).toBe(1);
    expect(TaskPhaseNumber[TaskPhase.JudgePhase]).toBe(2);
    expect(TaskPhaseNumber[TaskPhase.Resolved]).toBe(3);
    expect(TaskPhaseNumber[TaskPhase.Cancelled]).toBe(4);
    expect(TaskPhaseNumber[TaskPhase.Failed]).toBe(5);
  });
});

describe('TERMINAL_PHASES', () => {
  test('should include resolved, cancelled, and failed', () => {
    expect(TERMINAL_PHASES).toContain(TaskPhase.Resolved);
    expect(TERMINAL_PHASES).toContain(TaskPhase.Cancelled);
    expect(TERMINAL_PHASES).toContain(TaskPhase.Failed);
  });

  test('should not include non-terminal phases', () => {
    expect(TERMINAL_PHASES).not.toContain(TaskPhase.Open);
    expect(TERMINAL_PHASES).not.toContain(TaskPhase.WorkPhase);
    expect(TERMINAL_PHASES).not.toContain(TaskPhase.JudgePhase);
  });
});

describe('numberToTaskPhase', () => {
  test('should convert valid numbers to TaskPhase', () => {
    expect(numberToTaskPhase(0)).toBe(TaskPhase.Open);
    expect(numberToTaskPhase(1)).toBe(TaskPhase.WorkPhase);
    expect(numberToTaskPhase(2)).toBe(TaskPhase.JudgePhase);
    expect(numberToTaskPhase(3)).toBe(TaskPhase.Resolved);
    expect(numberToTaskPhase(4)).toBe(TaskPhase.Cancelled);
    expect(numberToTaskPhase(5)).toBe(TaskPhase.Failed);
  });

  test('should throw for unknown phase number', () => {
    expect(() => numberToTaskPhase(99)).toThrow('Unknown task phase number: 99');
  });
});

describe('stringToTaskPhase', () => {
  test('should convert valid strings to TaskPhase', () => {
    expect(stringToTaskPhase('open')).toBe(TaskPhase.Open);
    expect(stringToTaskPhase('work_phase')).toBe(TaskPhase.WorkPhase);
    expect(stringToTaskPhase('judge_phase')).toBe(TaskPhase.JudgePhase);
    expect(stringToTaskPhase('resolved')).toBe(TaskPhase.Resolved);
    expect(stringToTaskPhase('cancelled')).toBe(TaskPhase.Cancelled);
    expect(stringToTaskPhase('failed')).toBe(TaskPhase.Failed);
  });

  test('should throw for unknown phase string', () => {
    expect(() => stringToTaskPhase('invalid')).toThrow('Unknown task phase: invalid');
  });
});

describe('isValidPhaseTransition', () => {
  test('should allow valid transitions from open', () => {
    expect(isValidPhaseTransition(TaskPhase.Open, TaskPhase.WorkPhase)).toBe(true);
    expect(isValidPhaseTransition(TaskPhase.Open, TaskPhase.Cancelled)).toBe(true);
  });

  test('should reject invalid transitions from open', () => {
    expect(isValidPhaseTransition(TaskPhase.Open, TaskPhase.Resolved)).toBe(false);
    expect(isValidPhaseTransition(TaskPhase.Open, TaskPhase.JudgePhase)).toBe(false);
  });

  test('should allow valid transitions from work_phase', () => {
    expect(isValidPhaseTransition(TaskPhase.WorkPhase, TaskPhase.JudgePhase)).toBe(true);
    expect(isValidPhaseTransition(TaskPhase.WorkPhase, TaskPhase.Failed)).toBe(true);
  });

  test('should allow valid transitions from judge_phase', () => {
    expect(isValidPhaseTransition(TaskPhase.JudgePhase, TaskPhase.Resolved)).toBe(true);
    expect(isValidPhaseTransition(TaskPhase.JudgePhase, TaskPhase.Failed)).toBe(true);
  });

  test('should reject all transitions from terminal phases', () => {
    expect(isValidPhaseTransition(TaskPhase.Resolved, TaskPhase.Open)).toBe(false);
    expect(isValidPhaseTransition(TaskPhase.Cancelled, TaskPhase.Open)).toBe(false);
    expect(isValidPhaseTransition(TaskPhase.Failed, TaskPhase.Open)).toBe(false);
  });

  test('should accept string phase arguments', () => {
    expect(isValidPhaseTransition('open', 'work_phase')).toBe(true);
    expect(isValidPhaseTransition('open', 'resolved')).toBe(false);
  });
});

describe('VALID_PHASE_TRANSITIONS', () => {
  test('should define transitions for all phases', () => {
    const phases = Object.values(TaskPhase);
    for (const phase of phases) {
      expect(VALID_PHASE_TRANSITIONS[phase]).toBeDefined();
      expect(Array.isArray(VALID_PHASE_TRANSITIONS[phase])).toBe(true);
    }
  });
});

describe('isTerminalPhase', () => {
  test('should return true for terminal phases', () => {
    expect(isTerminalPhase(TaskPhase.Resolved)).toBe(true);
    expect(isTerminalPhase(TaskPhase.Cancelled)).toBe(true);
    expect(isTerminalPhase(TaskPhase.Failed)).toBe(true);
  });

  test('should return false for non-terminal phases', () => {
    expect(isTerminalPhase(TaskPhase.Open)).toBe(false);
    expect(isTerminalPhase(TaskPhase.WorkPhase)).toBe(false);
    expect(isTerminalPhase(TaskPhase.JudgePhase)).toBe(false);
  });

  test('should accept string arguments', () => {
    expect(isTerminalPhase('resolved')).toBe(true);
    expect(isTerminalPhase('open')).toBe(false);
  });
});

describe('InvalidPhaseTransitionError', () => {
  test('should construct with correct error message', () => {
    const error = new InvalidPhaseTransitionError(TaskPhase.Open, TaskPhase.Resolved);

    expect(error.name).toBe('InvalidPhaseTransitionError');
    expect(error.message).toContain("Invalid phase transition from 'open' to 'resolved'");
    expect(error.message).toContain("Valid transitions from 'open'");
    expect(error.fromPhase).toBe(TaskPhase.Open);
    expect(error.toPhase).toBe(TaskPhase.Resolved);
  });

  test('should include taskId in message when provided', () => {
    const error = new InvalidPhaseTransitionError(
      TaskPhase.Open,
      TaskPhase.Resolved,
      'task-42'
    );

    expect(error.message).toContain('(task: task-42)');
  });

  test('should show "none (terminal phase)" for terminal phase transitions', () => {
    const error = new InvalidPhaseTransitionError(TaskPhase.Resolved, TaskPhase.Open);

    expect(error.message).toContain('none (terminal phase)');
  });
});

describe('assertValidPhaseTransition', () => {
  test('should not throw for valid transitions', () => {
    expect(() => assertValidPhaseTransition(TaskPhase.Open, TaskPhase.WorkPhase)).not.toThrow();
  });

  test('should throw InvalidPhaseTransitionError for invalid transitions', () => {
    expect(() =>
      assertValidPhaseTransition(TaskPhase.Open, TaskPhase.Resolved, 'task-1')
    ).toThrow(InvalidPhaseTransitionError);
  });
});

describe('getPhaseDescription', () => {
  test('should return descriptions for all phases', () => {
    expect(getPhaseDescription(TaskPhase.Open)).toContain('accepting');
    expect(getPhaseDescription(TaskPhase.WorkPhase)).toContain('producing');
    expect(getPhaseDescription(TaskPhase.JudgePhase)).toContain('ranking');
    expect(getPhaseDescription(TaskPhase.Resolved)).toContain('Consensus');
    expect(getPhaseDescription(TaskPhase.Cancelled)).toContain('cancelled');
    expect(getPhaseDescription(TaskPhase.Failed)).toContain('failed');
  });

  test('should accept string arguments', () => {
    expect(getPhaseDescription('open')).toContain('accepting');
  });
});

describe('Address utilities', () => {
  describe('normalizeAddress', () => {
    test('should lowercase an address', () => {
      expect(normalizeAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12')).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef12'
      );
    });

    test('should leave lowercase address unchanged', () => {
      expect(normalizeAddress('0xabcdef')).toBe('0xabcdef');
    });
  });

  describe('normalizeEthAddress', () => {
    test('should return a typed EthAddress', () => {
      const result = normalizeEthAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
      expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      // Type check: result should be assignable to `0x${string}`
      const _typeCheck: `0x${string}` = result;
      expect(_typeCheck).toBeDefined();
    });
  });

  describe('addressesEqual', () => {
    test('should return true for same address different case', () => {
      expect(
        addressesEqual(
          '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
          '0xabcdef1234567890abcdef1234567890abcdef12'
        )
      ).toBe(true);
    });

    test('should return false for different addresses', () => {
      expect(
        addressesEqual(
          '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
          '0x1234567890ABCDEF1234567890ABCDEF12345678'
        )
      ).toBe(false);
    });
  });

  describe('isValidAddress', () => {
    test('should return true for valid 40-hex address', () => {
      expect(isValidAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    });

    test('should return false for short address', () => {
      expect(isValidAddress('0x1234')).toBe(false);
    });

    test('should return false for non-hex characters', () => {
      expect(isValidAddress('0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG')).toBe(false);
    });

    test('should return false for missing 0x prefix', () => {
      expect(isValidAddress('1234567890123456789012345678901234567890')).toBe(false);
    });
  });

  describe('validateAndNormalizeAddress', () => {
    test('should return normalized address for valid input', () => {
      const result = validateAndNormalizeAddress('0xABCDEF1234567890ABCDEF1234567890ABCDEF12');
      expect(result).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
    });

    test('should throw for invalid address', () => {
      expect(() => validateAndNormalizeAddress('not-an-address')).toThrow(
        'Invalid Ethereum address: not-an-address'
      );
    });
  });

  describe('truncateAddress', () => {
    test('should truncate with default params', () => {
      const result = truncateAddress('0x1234567890123456789012345678901234567890');
      expect(result).toBe('0x1234...7890');
    });

    test('should truncate with custom start and end chars', () => {
      const result = truncateAddress('0x1234567890123456789012345678901234567890', 10, 6);
      expect(result).toBe('0x12345678...567890');
    });

    test('should return full address if shorter than truncation bounds', () => {
      const result = truncateAddress('0x1234', 6, 4);
      expect(result).toBe('0x1234');
    });
  });

  describe('ZERO_ADDRESS', () => {
    test('should be the 40-zero hex address', () => {
      expect(ZERO_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
    });
  });

  describe('isZeroAddress', () => {
    test('should return true for zero address', () => {
      expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    test('should return true for zero address with mixed case', () => {
      expect(isZeroAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    test('should return false for non-zero address', () => {
      expect(isZeroAddress('0x1234567890123456789012345678901234567890')).toBe(false);
    });
  });
});

describe('Module exports completeness', () => {
  test('should export TaskPhase enum', () => {
    expect(TaskPhase).toBeDefined();
  });

  test('should export all task phase utility functions', () => {
    expect(typeof numberToTaskPhase).toBe('function');
    expect(typeof isValidPhaseTransition).toBe('function');
    expect(typeof isTerminalPhase).toBe('function');
    expect(typeof stringToTaskPhase).toBe('function');
    expect(typeof assertValidPhaseTransition).toBe('function');
    expect(typeof getPhaseDescription).toBe('function');
  });

  test('should export all address utility functions', () => {
    expect(typeof normalizeAddress).toBe('function');
    expect(typeof normalizeEthAddress).toBe('function');
    expect(typeof addressesEqual).toBe('function');
    expect(typeof isValidAddress).toBe('function');
    expect(typeof validateAndNormalizeAddress).toBe('function');
    expect(typeof truncateAddress).toBe('function');
    expect(typeof isZeroAddress).toBe('function');
  });

  test('should export constants', () => {
    expect(TaskPhaseNumber).toBeDefined();
    expect(TERMINAL_PHASES).toBeDefined();
    expect(VALID_PHASE_TRANSITIONS).toBeDefined();
    expect(ZERO_ADDRESS).toBeDefined();
  });
});
