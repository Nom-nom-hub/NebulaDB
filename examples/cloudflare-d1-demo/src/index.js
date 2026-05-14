import { createDb } from '@nebula-db/core';
import { createCloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

export default {
  async fetch(request, env) {
    // env.DB is the D1 binding defined in wrangler.toml
    const adapter = createCloudflareD1Adapter(env.DB);
    const db = createDb({ adapter });

    const tasks = db.collection('tasks', {
      schema: {
        id: { type: 'string', optional: true },
        title: { type: 'string' },
        priority: { type: 'string' },
        done: { type: 'boolean' }
      }
    });

    try {
      const url = new URL(request.url);

      // POST /seed — insert sample data
      if (request.method === 'POST' && url.pathname === '/seed') {
        await tasks.insert({ title: 'Set up Cloudflare Worker', priority: 'high', done: true });
        await tasks.insert({ title: 'Connect D1 database', priority: 'high', done: true });
        await tasks.insert({ title: 'Deploy to production', priority: 'medium', done: false });
        return Response.json({ message: '3 tasks seeded successfully' });
      }

      // GET /tasks — return all tasks
      if (request.method === 'GET' && url.pathname === '/tasks') {
        const all = await tasks.find();
        return Response.json({ count: all.length, tasks: all });
      }

      // GET /tasks/pending — return pending tasks
      if (request.method === 'GET' && url.pathname === '/tasks/pending') {
        const pending = await tasks.find({ done: false });
        return Response.json({ count: pending.length, tasks: pending });
      }

      // PATCH /tasks/complete — mark high priority tasks as done
      if (request.method === 'PATCH' && url.pathname === '/tasks/complete') {
        await tasks.update({ priority: 'medium', done: false }, { $set: { done: true } });
        const updated = await tasks.findOne({ priority: 'medium' });
        return Response.json({ message: 'Task completed', task: updated });
      }

      // DELETE /tasks/done — remove completed tasks
      if (request.method === 'DELETE' && url.pathname === '/tasks/done') {
        await tasks.delete({ done: true });
        const remaining = await tasks.find();
        return Response.json({ message: 'Completed tasks removed', remaining });
      }

      return Response.json({
        message: 'NebulaDB Cloudflare D1 Demo',
        routes: {
          'POST /seed': 'Insert sample tasks',
          'GET /tasks': 'Fetch all tasks',
          'GET /tasks/pending': 'Fetch pending tasks',
          'PATCH /tasks/complete': 'Complete medium priority tasks',
          'DELETE /tasks/done': 'Delete completed tasks'
        }
      });

    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
};
