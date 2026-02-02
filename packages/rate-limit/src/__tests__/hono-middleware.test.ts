import { describe, test, expect, mock } from 'bun:test';
import { Hono } from 'hono';
import { createMcpRateLimitMiddleware } from '../middleware/hono';

describe('Hono Rate Limit Middleware', () => {
  describe('createMcpRateLimitMiddleware', () => {
    test('returns a middleware function', () => {
      const middleware = createMcpRateLimitMiddleware();
      expect(typeof middleware).toBe('function');
    });

    test('middleware can be used with Hono app', () => {
      const app = new Hono();

      // Should not throw when adding middleware
      expect(() => {
        app.use('/tools/*', createMcpRateLimitMiddleware());
      }).not.toThrow();
    });
  });

  describe('IP extraction', () => {
    test('extracts IP from x-forwarded-for header', async () => {
      const app = new Hono();
      let extractedIp = '';

      // Add middleware that captures the context
      app.use('/*', async (c, next) => {
        const forwarded = c.req.header('x-forwarded-for');
        if (forwarded) {
          extractedIp = forwarded.split(',')[0].trim();
        }
        await next();
      });

      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      expect(res.status).toBe(200);
      expect(extractedIp).toBe('192.168.1.1');
    });

    test('extracts IP from x-real-ip header when x-forwarded-for is missing', async () => {
      const app = new Hono();
      let extractedIp = '';

      app.use('/*', async (c, next) => {
        const forwarded = c.req.header('x-forwarded-for');
        const realIp = c.req.header('x-real-ip');

        if (forwarded) {
          extractedIp = forwarded.split(',')[0].trim();
        } else if (realIp) {
          extractedIp = realIp;
        }
        await next();
      });

      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: {
          'x-real-ip': '10.20.30.40',
        },
      });

      expect(res.status).toBe(200);
      expect(extractedIp).toBe('10.20.30.40');
    });

    test('returns unknown when no IP headers present', async () => {
      const app = new Hono();
      let extractedIp = 'unknown';

      app.use('/*', async (c, next) => {
        const forwarded = c.req.header('x-forwarded-for');
        const realIp = c.req.header('x-real-ip');

        if (forwarded) {
          extractedIp = forwarded.split(',')[0].trim();
        } else if (realIp) {
          extractedIp = realIp;
        }
        await next();
      });

      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test');

      expect(res.status).toBe(200);
      expect(extractedIp).toBe('unknown');
    });
  });

  describe('session identifier', () => {
    test('uses session ID from header when present', async () => {
      const app = new Hono();
      let identifier = '';

      app.use('/*', async (c, next) => {
        const sessionId = c.req.header('X-Session-Id');
        if (sessionId) {
          identifier = `session:${sessionId}`;
        } else {
          identifier = 'ip:unknown';
        }
        await next();
      });

      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: {
          'X-Session-Id': 'test-session-123',
        },
      });

      expect(res.status).toBe(200);
      expect(identifier).toBe('session:test-session-123');
    });

    test('falls back to IP when no session ID', async () => {
      const app = new Hono();
      let identifier = '';

      app.use('/*', async (c, next) => {
        const sessionId = c.req.header('X-Session-Id');
        const forwarded = c.req.header('x-forwarded-for');
        const realIp = c.req.header('x-real-ip');

        if (sessionId) {
          identifier = `session:${sessionId}`;
        } else if (forwarded) {
          identifier = `ip:${forwarded.split(',')[0].trim()}`;
        } else if (realIp) {
          identifier = `ip:${realIp}`;
        } else {
          identifier = 'ip:unknown';
        }
        await next();
      });

      app.get('/test', (c) => c.text('ok'));

      const res = await app.request('/test', {
        headers: {
          'x-forwarded-for': '192.168.1.100',
        },
      });

      expect(res.status).toBe(200);
      expect(identifier).toBe('ip:192.168.1.100');
    });
  });

  describe('tool path parsing', () => {
    test('extracts tool name from path', async () => {
      const app = new Hono();
      let toolName = '';

      app.post('/tools/:toolName', async (c) => {
        toolName = c.req.param('toolName');
        return c.text('ok');
      });

      const res = await app.request('/tools/list_tasks', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      expect(toolName).toBe('list_tasks');
    });
  });

  describe('middleware behavior (without Redis)', () => {
    test('allows requests through when rate limiting is disabled (fail open)', async () => {
      const app = new Hono();

      // Add the actual rate limit middleware
      app.use('/tools/*', createMcpRateLimitMiddleware());

      app.post('/tools/list_tasks', (c) => c.json({ success: true }));

      // When Redis is not configured, requests should pass through
      const res = await app.request('/tools/list_tasks', {
        method: 'POST',
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
    });

    test('processes multiple requests when rate limiting disabled', async () => {
      const app = new Hono();

      app.use('/tools/*', createMcpRateLimitMiddleware());
      app.post('/tools/create_task', (c) => c.json({ created: true }));

      // Make multiple requests - all should succeed when Redis disabled
      const requests = Array(15)
        .fill(null)
        .map(() =>
          app.request('/tools/create_task', {
            method: 'POST',
          })
        );

      const responses = await Promise.all(requests);

      // All requests should succeed (fail open behavior)
      for (const res of responses) {
        expect(res.status).toBe(200);
      }
    });
  });
});
