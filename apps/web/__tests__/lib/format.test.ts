import { describe, test, expect, beforeEach } from 'bun:test';
import {
  formatTimeAgo,
  formatTimeCompact,
  truncateAddress,
  truncateText,
  getBaseScanUrl,
  getBaseScanTxUrl,
  getIpfsUrl,
  getStatusColor,
  formatStatus,
  formatBounty,
} from '../../lib/format';

describe('truncateAddress', () => {
  test('truncates a standard Ethereum address', () => {
    const address = '0x1234567890abcdef1234567890abcdef12345678';
    expect(truncateAddress(address)).toBe('0x1234...5678');
  });

  test('returns short strings unchanged', () => {
    expect(truncateAddress('0x1234')).toBe('0x1234');
    expect(truncateAddress('')).toBe('');
  });

  test('handles falsy input', () => {
    // @ts-expect-error testing runtime behavior with invalid input
    expect(truncateAddress(undefined)).toBeUndefined();
    // @ts-expect-error testing runtime behavior with invalid input
    expect(truncateAddress(null)).toBeNull();
  });
});

describe('truncateText', () => {
  test('truncates text exceeding max length', () => {
    expect(truncateText('Hello world, this is a long text', 10)).toBe('Hello worl...');
  });

  test('returns short text unchanged', () => {
    expect(truncateText('Short', 10)).toBe('Short');
  });

  test('returns text at exact max length unchanged', () => {
    expect(truncateText('1234567890', 10)).toBe('1234567890');
  });

  test('handles empty or falsy input', () => {
    expect(truncateText('', 10)).toBe('');
    // @ts-expect-error testing runtime behavior with invalid input
    expect(truncateText(null, 10)).toBeNull();
  });
});

describe('formatTimeAgo', () => {
  test('returns "just now" for recent timestamps', () => {
    const now = new Date();
    expect(formatTimeAgo(now)).toBe('just now');
  });

  test('returns minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago');
  });

  test('returns hours ago', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago');
  });

  test('returns days ago', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago');
  });

  test('returns months ago', () => {
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoMonthsAgo)).toBe('2mo ago');
  });

  test('returns years ago', () => {
    const twoYearsAgo = new Date(Date.now() - 730 * 24 * 60 * 60 * 1000);
    expect(formatTimeAgo(twoYearsAgo)).toBe('2y ago');
  });

  test('accepts string input', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago');
  });
});

describe('formatTimeCompact', () => {
  test('returns "now" for recent timestamps', () => {
    expect(formatTimeCompact(new Date())).toBe('now');
  });

  test('returns compact minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatTimeCompact(fiveMinAgo)).toBe('5m');
  });

  test('returns compact hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    expect(formatTimeCompact(threeHoursAgo)).toBe('3h');
  });

  test('returns compact days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(formatTimeCompact(twoDaysAgo)).toBe('2d');
  });
});

describe('getBaseScanUrl', () => {
  test('returns correct URL for address', () => {
    expect(getBaseScanUrl('0xabc')).toBe('https://sepolia.basescan.org/address/0xabc');
  });
});

describe('getBaseScanTxUrl', () => {
  test('returns correct URL for tx hash', () => {
    expect(getBaseScanTxUrl('0xtx')).toBe('https://sepolia.basescan.org/tx/0xtx');
  });
});

describe('getIpfsUrl', () => {
  test('returns gateway URL for raw CID', () => {
    expect(getIpfsUrl('QmTest123')).toBe('https://gateway.pinata.cloud/ipfs/QmTest123');
  });

  test('strips ipfs:// prefix', () => {
    expect(getIpfsUrl('ipfs://QmTest123')).toBe('https://gateway.pinata.cloud/ipfs/QmTest123');
  });
});

describe('getStatusColor', () => {
  test('returns correct colors for known phases', () => {
    expect(getStatusColor('open')).toContain('green');
    expect(getStatusColor('work_phase')).toContain('blue');
    expect(getStatusColor('judge_phase')).toContain('yellow');
    expect(getStatusColor('resolved')).toContain('emerald');
    expect(getStatusColor('failed')).toContain('red');
    expect(getStatusColor('cancelled')).toContain('gray');
  });

  test('returns muted for unknown status', () => {
    expect(getStatusColor('unknown')).toContain('muted');
  });
});

describe('formatStatus', () => {
  test('formats known phases', () => {
    expect(formatStatus('open')).toBe('Open');
    expect(formatStatus('work_phase')).toBe('Work Phase');
    expect(formatStatus('judge_phase')).toBe('Judge Phase');
    expect(formatStatus('resolved')).toBe('Resolved');
    expect(formatStatus('failed')).toBe('Failed');
    expect(formatStatus('cancelled')).toBe('Cancelled');
  });

  test('returns raw string for unknown status', () => {
    expect(formatStatus('something_else')).toBe('something_else');
  });
});

describe('formatBounty', () => {
  test('formats zero wei', () => {
    expect(formatBounty('0')).toBe('0 ETH');
  });

  test('formats very small amounts', () => {
    // 1 wei
    expect(formatBounty('1')).toBe('<0.0001 ETH');
  });

  test('formats sub-1 ETH amounts with 4 decimals', () => {
    // 0.5 ETH = 500000000000000000 wei
    expect(formatBounty('500000000000000000')).toBe('0.5000 ETH');
  });

  test('formats large ETH amounts with 2 decimals', () => {
    // 10 ETH = 10000000000000000000 wei
    expect(formatBounty('10000000000000000000')).toBe('10.00 ETH');
  });

  test('formats 1 ETH boundary', () => {
    // 1 ETH = 1000000000000000000 wei
    expect(formatBounty('1000000000000000000')).toBe('1.00 ETH');
  });

  test('returns 0 ETH for invalid input', () => {
    expect(formatBounty('not-a-number')).toBe('0 ETH');
  });

  test('handles very large numbers', () => {
    // 1000 ETH
    expect(formatBounty('1000000000000000000000')).toBe('1000.00 ETH');
  });
});
