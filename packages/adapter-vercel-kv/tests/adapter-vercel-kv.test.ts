import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock fetch globally for Vercel KV REST API
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// We need to import after setting up the mock
import { VercelKvAdapter, createVercelKvAdapter } from '../src/index';

describe('VercelKvAdapter', () => {
  let adapter: VercelKvAdapter;

  beforeEach(() => {
    mockFetch.mockReset();
    // Default mock for connect (GET /keys)
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => [{ key: 'nebula_test' }]
    } as Response);

    adapter = createVercelKvAdapter('https://kv.example.com', 'test-token');
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create adapter with valid credentials', () => {
      expect(adapter).toBeInstanceOf(VercelKvAdapter);
    });

    it('should throw on missing API URL', () => {
      expect(() => new VercelKvAdapter('', 'token')).toThrow('Vercel KV API URL and token are required');
      expect(() => new VercelKvAdapter('url', '')).toThrow('Vercel KV API URL and token are required');
    });

    it('should use default namespace prefix', async () => {
      // Trigger a save to see the prefix
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const urlStr = String(url);
        // Allow keys request during save
        if (urlStr.includes('/keys') && (!options || options.method !== 'POST')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        // Allow set request
        if (urlStr.includes('/set/nebula_')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      await adapter.save({ users: [{ id: '1', name: 'Alice' }] });

      const setCalls = mockFetch.mock.calls.filter((call: any[]) => String(call[0]).includes('/set/'));
      expect(setCalls.length).toBeGreaterThan(0);
      expect(String(setCalls[0][0])).toContain('nebula_users');
    });

    it('should use custom namespace prefix', async () => {
      const customAdapter = createVercelKvAdapter('https://kv.example.com', 'token', { namespacePrefix: 'custom_' });
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      await customAdapter.save({ users: [{ id: '1' }] });

      const setCalls = mockFetch.mock.calls.filter((call: any[]) => String(call[0]).includes('/set/'));
      expect(setCalls.length).toBeGreaterThan(0);
      expect(String(setCalls[0][0])).toContain('custom_users');
    });
  });

  describe('save and load', () => {
    it('should save data via REST API', async () => {
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys') && (!options || options.method !== 'POST')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const data = { users: [{ id: '1', name: 'Alice' }] };
      await adapter.save(data);

      const setCalls = mockFetch.mock.calls.filter((call: any[]) => String(call[0]).includes('/set/'));
      expect(setCalls).toHaveLength(1);
      expect(String(setCalls[0][0])).toContain('nebula_users');
    });

    it('should load data from REST API', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => [{ key: 'nebula_users' }]
          } as Response;
        }
        if (urlStr.includes('/get/nebula_users')) {
          return {
            ok: true,
            status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ data: JSON.stringify([{ id: '1', name: 'Alice' }]) })
          } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.users[0].name).toBe('Alice');
    });

    it('should handle empty collections', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return {
            ok: true, status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ([])
          } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const data = await adapter.load();
      expect(data).toEqual({});
    });

    it('should handle multiple collections', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return {
            ok: true, status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => [{ key: 'nebula_users' }, { key: 'nebula_posts' }]
          } as Response;
        }
        if (urlStr.includes('/get/nebula_users')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: JSON.stringify([{ id: '1', name: 'Alice' }]) }) } as Response;
        }
        if (urlStr.includes('/get/nebula_posts')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: JSON.stringify([{ id: '2', title: 'Hello' }]) }) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const data = await adapter.load();
      expect(data.users).toHaveLength(1);
      expect(data.posts).toHaveLength(1);
    });
  });

  describe('get and set specific keys', () => {
    it('should get a specific key', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        if (urlStr.includes('/get/nebula_custom-key')) {
          return {
            ok: true, status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => ({ data: JSON.stringify({ value: 'test' }) })
          } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const result = await adapter.get('custom-key');
      expect(result).toEqual({ value: 'test' });
    });

    it('should return null for missing keys', async () => {
      // Need to set up connect to succeed first
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          if (!options || options.method !== 'POST') {
            return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
          }
        }
        if (urlStr.includes('/get/nebula_missing-key')) {
          return { ok: false, status: 404, statusText: 'Not Found' } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      const result = await adapter.get('missing-key');
      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should throw on connection failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false, status: 500, statusText: 'Internal Server Error'
      } as Response);

      await expect(adapter.load()).rejects.toThrow('Failed to connect to Vercel KV');
    });

    it('should throw on save API errors', async () => {
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys') && (!options || options.method !== 'POST')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        return { ok: false, status: 500, statusText: 'Error' } as Response;
      });

      await expect(adapter.save({ users: [{ id: '1' }] })).rejects.toThrow('Failed to save to Vercel KV');
    });
  });

  describe('connect and close', () => {
    it('should connect successfully', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        if (String(url).includes('/keys')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      await adapter.connect();
      // Should not throw
    });

    it('should throw on failed connect', async () => {
      mockFetch.mockImplementation(async () => {
        return { ok: false, status: 401, statusText: 'Unauthorized' } as Response;
      });

      await expect(adapter.connect()).rejects.toThrow('Failed to connect to Vercel KV');
    });

    it('should close without error', async () => {
      await adapter.close();
      // Should not throw
    });
  });

  describe('getData', () => {
    it('should return current data', async () => {
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      // Load some data first
      mockFetch.mockImplementation(async (url: string) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return {
            ok: true, status: 200,
            headers: new Headers({ 'content-type': 'application/json' }),
            json: async () => [{ key: 'nebula_users' }]
          } as Response;
        }
        if (urlStr.includes('/get/nebula_users')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: JSON.stringify([{ id: '1', name: 'Alice' }]) }) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      await adapter.load();
      const data = adapter.getData();
      expect(data.users).toHaveLength(1);
    });
  });

  describe('delete key', () => {
    it('should delete a specific key', async () => {
      let deletedKey = '';
      mockFetch.mockImplementation(async (url: string, options?: RequestInit) => {
        const urlStr = String(url);
        if (urlStr.includes('/keys')) {
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ([]) } as Response;
        }
        if (urlStr.includes('/del/')) {
          deletedKey = urlStr;
          return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
        }
        return { ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) } as Response;
      });

      await adapter.delete('test-key');
      expect(deletedKey).toContain('nebula_test-key');
    });
  });
});
