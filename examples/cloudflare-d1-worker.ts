/**
 * Example Cloudflare Worker using NebulaDB with D1 adapter
 * 
 * Deploy with:
 * wrangler deploy
 * 
 * wrangler.toml configuration:
 * 
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "nebula-db-example"
 * database_id = "your-database-id"
 */

import { createDb } from '@nebula-db/core';
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

interface Env {
  DB: D1Database;
}

async function handleGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Initialize database with D1 adapter
  const adapter = createCloudflareD1Adapter(env.DB);
  const db = createDb({ adapter });

  const users = db.collection('users');

  switch (action) {
    case 'list':
      return handleListUsers(users);

    case 'get':
      const id = url.searchParams.get('id');
      if (!id) {
        return new Response(JSON.stringify({ error: 'id parameter required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handleGetUser(users, id);

    default:
      return handleListUsers(users);
  }
}

async function handlePost(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as Record<string, any>;

    const adapter = createCloudflareD1Adapter(env.DB);
    const db = createDb({ adapter });
    const users = db.collection('users');

    const user = await users.insert({
      id: body.id || crypto.randomUUID(),
      name: body.name,
      email: body.email,
      age: body.age,
      createdAt: new Date().toISOString()
    });

    return new Response(JSON.stringify(user), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleDelete(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'id parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const adapter = createCloudflareD1Adapter(env.DB);
  const db = createDb({ adapter });
  const users = db.collection('users');

  const deleted = await users.deleteOne({ id });

  return new Response(JSON.stringify({ deleted, id }), {
    status: deleted ? 200 : 404,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleListUsers(users: any): Promise<Response> {
  const allUsers = await users.find({});

  return new Response(JSON.stringify(allUsers), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetUser(users: any, id: string): Promise<Response> {
  const user = await users.findOne({ id });

  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(user), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const method = request.method;

    try {
      switch (method) {
        case 'GET':
          return await handleGet(request, env);

        case 'POST':
          return await handlePost(request, env);

        case 'DELETE':
          return await handleDelete(request, env);

        default:
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
          });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * API Usage Examples:
 * 
 * List all users:
 * GET /api?action=list
 * 
 * Get specific user:
 * GET /api?action=get&id=user-123
 * 
 * Create user:
 * POST /api
 * {
 *   "name": "Alice",
 *   "email": "alice@example.com",
 *   "age": 30
 * }
 * 
 * Delete user:
 * DELETE /api?id=user-123
 */
