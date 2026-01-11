/**
 * Example Cloudflare Pages Function using NebulaDB with D1 adapter
 * 
 * Place this file in: functions/api/todos.ts
 * 
 * wrangler.toml configuration:
 * [[d1_databases]]
 * binding = "DB"
 * database_name = "nebula-db"
 * database_id = "your-database-id"
 */

import { createDb } from '@nebula-db/core';
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

interface Env {
  DB: D1Database;
}

export async function onRequest(context: any): Promise<Response> {
  const request = context.request;
  const env: Env = context.env;
  const url = new URL(request.url);

  // Initialize database with D1 adapter
  const adapter = createCloudflareD1Adapter(env.DB);
  const db = createDb({ adapter });
  const todos = db.collection('todos');

  try {
    switch (request.method) {
      case 'GET':
        return handleGetTodos(todos, url);

      case 'POST':
        return handleCreateTodo(todos, request);

      case 'PUT':
        return handleUpdateTodo(todos, request, url);

      case 'DELETE':
        return handleDeleteTodo(todos, url);

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleGetTodos(todos: any, url: URL): Promise<Response> {
  const status = url.searchParams.get('status');

  let query = {};
  if (status === 'completed') {
    query = { completed: true };
  } else if (status === 'pending') {
    query = { completed: false };
  }

  const allTodos = await todos.find(query);

  return new Response(JSON.stringify(allTodos), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreateTodo(todos: any, request: Request): Promise<Response> {
  const body = await request.json() as Record<string, any>;

  if (!body.title) {
    return new Response(JSON.stringify({ error: 'title is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const todo = await todos.insert({
    id: crypto.randomUUID(),
    title: body.title,
    description: body.description || '',
    completed: false,
    priority: body.priority || 'medium',
    dueDate: body.dueDate || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  return new Response(JSON.stringify(todo), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleUpdateTodo(todos: any, request: Request, url: URL): Promise<Response> {
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'id parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json() as Record<string, any>;

  // Build update object
  const update: Record<string, any> = {
    updatedAt: new Date().toISOString()
  };

  if ('title' in body) update.title = body.title;
  if ('description' in body) update.description = body.description;
  if ('completed' in body) update.completed = body.completed;
  if ('priority' in body) update.priority = body.priority;
  if ('dueDate' in body) update.dueDate = body.dueDate;

  const updated = await todos.updateOne(
    { id },
    { $set: update }
  );

  if (!updated) {
    return new Response(JSON.stringify({ error: 'Todo not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const todo = await todos.findOne({ id });

  return new Response(JSON.stringify(todo), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleDeleteTodo(todos: any, url: URL): Promise<Response> {
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ error: 'id parameter required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const deleted = await todos.deleteOne({ id });

  if (!deleted) {
    return new Response(JSON.stringify({ error: 'Todo not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ success: true, id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * API Examples:
 * 
 * Get all todos:
 * GET /api/todos
 * 
 * Get pending todos:
 * GET /api/todos?status=pending
 * 
 * Get completed todos:
 * GET /api/todos?status=completed
 * 
 * Create todo:
 * POST /api/todos
 * {
 *   "title": "Learn NebulaDB",
 *   "description": "Explore edge database features",
 *   "priority": "high",
 *   "dueDate": "2026-02-15"
 * }
 * 
 * Update todo:
 * PUT /api/todos?id=uuid
 * {
 *   "completed": true,
 *   "priority": "low"
 * }
 * 
 * Delete todo:
 * DELETE /api/todos?id=uuid
 */
