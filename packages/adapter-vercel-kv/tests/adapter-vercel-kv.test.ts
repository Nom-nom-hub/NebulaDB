import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '@nebula-db/core';
import { VercelKvAdapter, createVercelKvAdapter } from '../src/index';

const API_URL = 'https://kv.example.com';
const API_TOKEN = 'test-token';

type FetchCall = {
  url: string;
  init?: RequestInit;
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : 'Error',
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null
    },
    json: vi.fn().mockResolvedValue(body)
  } as unknown as Response;
}

function stubFetch(routes: Record<string, unknown>): FetchCall[] {
  const calls: FetchCall[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const path = url.replace(API_URL, '');
      if (!(path in routes)) {
        return jsonResponse({ error: `unhandled route: ${path}` }, 404);
      }

      return jsonResponse(routes[path]);
    })
  );

  return calls;
}

describe('VercelKvAdapter', () => {
  beforeEach(() => {
    stubFetch({ '/keys': [] });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create an adapter from the factory', () => {
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN);

    expect(adapter).toBeInstanceOf(VercelKvAdapter);
  });

  it('should require an API URL and token', () => {
    expect(() => new VercelKvAdapter('', API_TOKEN)).toThrow(
      'Vercel KV API URL and token are required'
    );
    expect(() => new VercelKvAdapter(API_URL, '')).toThrow(
      'Vercel KV API URL and token are required'
    );
  });

  it('should connect with Vercel KV authorization headers', async () => {
    const calls = stubFetch({ '/keys': [] });
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN);

    await adapter.connect();

    expect(calls[0].url).toBe(`${API_URL}/keys`);
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json'
    });
  });

  it('should load namespaced collections from KV', async () => {
    const users: Document[] = [{ id: '1', name: 'Alice' }];
    stubFetch({
      '/keys': [],
      '/keys?limit=1000': [
        { key: 'nebula_users' },
        { key: 'other_collection' }
      ],
      '/get/nebula_users': { data: JSON.stringify(users) }
    });
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN);

    const data = await adapter.load();

    expect(data).toEqual({ users });
    expect(adapter.getData()).toEqual({ users });
  });

  it('should save each collection with the configured namespace', async () => {
    const calls = stubFetch({ '/keys': [], '/set/app_users': undefined });
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN, {
      namespacePrefix: 'app_'
    });

    await adapter.save({ users: [{ id: '1', name: 'Bob' }] });

    const saveCall = calls.find(call => call.url === `${API_URL}/set/app_users`);
    expect(saveCall?.init?.method).toBe('POST');
    expect(JSON.parse(String(saveCall?.init?.body))).toEqual({
      value: JSON.stringify([{ id: '1', name: 'Bob' }])
    });
  });

  it('should get and set values through namespaced KV keys', async () => {
    const calls = stubFetch({
      '/keys': [],
      '/set/nebula_profile': undefined,
      '/get/nebula_profile': { data: JSON.stringify({ id: '1', active: true }) }
    });
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN);

    await adapter.set('profile', { id: '1', active: true });
    const profile = await adapter.get('profile');

    expect(profile).toEqual({ id: '1', active: true });
    expect(calls.map(call => call.url)).toContain(`${API_URL}/set/nebula_profile`);
    expect(calls.map(call => call.url)).toContain(`${API_URL}/get/nebula_profile`);
  });

  it('should delete namespaced KV keys', async () => {
    const calls = stubFetch({ '/keys': [], '/del/nebula_profile': undefined });
    const adapter = createVercelKvAdapter(API_URL, API_TOKEN);

    await adapter.delete('profile');

    const deleteCall = calls.find(
      call => call.url === `${API_URL}/del/nebula_profile`
    );
    expect(deleteCall?.init?.method).toBe('DELETE');
  });
});
