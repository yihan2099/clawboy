import { describe, test, expect } from 'bun:test';
import {
  getOperationType,
  TOOL_OPERATION_MAP,
  MCP_RATE_LIMITS,
} from '../config/mcp-config';

describe('MCP Config', () => {
  describe('TOOL_OPERATION_MAP', () => {
    test('contains expected auth tools', () => {
      expect(TOOL_OPERATION_MAP.auth_get_challenge).toBe('auth');
      expect(TOOL_OPERATION_MAP.auth_verify).toBe('auth');
      expect(TOOL_OPERATION_MAP.auth_session).toBe('auth');
    });

    test('contains expected read tools', () => {
      expect(TOOL_OPERATION_MAP.list_tasks).toBe('read');
      expect(TOOL_OPERATION_MAP.get_task).toBe('read');
      expect(TOOL_OPERATION_MAP.get_my_submissions).toBe('read');
    });

    test('contains expected write tools', () => {
      expect(TOOL_OPERATION_MAP.create_task).toBe('write');
      expect(TOOL_OPERATION_MAP.cancel_task).toBe('write');
      expect(TOOL_OPERATION_MAP.submit_work).toBe('write');
    });
  });

  describe('getOperationType', () => {
    test('maps read tools correctly', () => {
      expect(getOperationType('list_tasks')).toBe('read');
      expect(getOperationType('get_task')).toBe('read');
      expect(getOperationType('get_my_submissions')).toBe('read');
    });

    test('maps write tools correctly', () => {
      expect(getOperationType('create_task')).toBe('write');
      expect(getOperationType('submit_work')).toBe('write');
      expect(getOperationType('cancel_task')).toBe('write');
    });

    test('maps auth tools correctly', () => {
      expect(getOperationType('auth_get_challenge')).toBe('auth');
      expect(getOperationType('auth_verify')).toBe('auth');
      expect(getOperationType('auth_session')).toBe('auth');
    });

    test('unknown tools default to read', () => {
      expect(getOperationType('unknown_tool')).toBe('read');
      expect(getOperationType('nonexistent')).toBe('read');
      expect(getOperationType('')).toBe('read');
    });
  });

  describe('MCP_RATE_LIMITS', () => {
    test('global limit is 100 per minute', () => {
      expect(MCP_RATE_LIMITS.global.limit).toBe(100);
      expect(MCP_RATE_LIMITS.global.window).toBe('1 m');
      expect(MCP_RATE_LIMITS.global.prefix).toBe('mcp:global');
    });

    test('read limit is 100 per minute', () => {
      expect(MCP_RATE_LIMITS.read.limit).toBe(100);
      expect(MCP_RATE_LIMITS.read.window).toBe('1 m');
      expect(MCP_RATE_LIMITS.read.prefix).toBe('mcp:read');
    });

    test('write limit is 10 per minute', () => {
      expect(MCP_RATE_LIMITS.write.limit).toBe(10);
      expect(MCP_RATE_LIMITS.write.window).toBe('1 m');
      expect(MCP_RATE_LIMITS.write.prefix).toBe('mcp:write');
    });

    test('auth limit is 20 per minute', () => {
      expect(MCP_RATE_LIMITS.auth.limit).toBe(20);
      expect(MCP_RATE_LIMITS.auth.window).toBe('1 m');
      expect(MCP_RATE_LIMITS.auth.prefix).toBe('mcp:auth');
    });
  });
});
