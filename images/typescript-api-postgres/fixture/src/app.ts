import { createServer } from 'node:http';
import type { Pool } from 'pg';

export const summaryEnabled = false;

export function createApp(pool: Pool) {
  return createServer(async (request, response) => {
    response.setHeader('content-type', 'application/json');
    try {
      if (request.method === 'GET' && request.url === '/orders') {
        const rows = (await pool.query('SELECT id, total_cents FROM orders ORDER BY id')).rows;
        response.end(JSON.stringify(rows));
      } else if (request.method === 'GET' && request.url === '/summary' && summaryEnabled) {
        const row = (await pool.query("SELECT count(*)::int AS orders, sum(total_cents)::int AS total_cents, sum(total_cents) FILTER (WHERE status='paid')::int AS paid_cents FROM orders")).rows[0];
        response.end(JSON.stringify(row));
      } else {
        response.statusCode = 404;
        response.end(JSON.stringify({ error: 'not_found' }));
      }
    } catch {
      response.statusCode = 500;
      response.end(JSON.stringify({ error: 'database_error' }));
    }
  });
}
