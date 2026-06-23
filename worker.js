// Z Body Dashboard — Cloudflare Worker + D1
// Gerencia os dados de todos os dispositivos via API REST

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS — permite acesso do frontend
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Inicializa o banco se não existir
    await env.DB.exec(`
      CREATE TABLE IF NOT EXISTS days (
        date TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    try {
      // GET /api/days — retorna todos os dias
      if (request.method === 'GET' && path === '/api/days') {
        const result = await env.DB.prepare('SELECT date, data FROM days ORDER BY date DESC').all();
        const days = result.results.map(row => JSON.parse(row.data));
        return Response.json({ ok: true, days }, { headers: corsHeaders });
      }

      // POST /api/days — salva ou atualiza um dia
      if (request.method === 'POST' && path === '/api/days') {
        const body = await request.json();
        if (!body.date) return Response.json({ ok: false, error: 'date required' }, { status: 400, headers: corsHeaders });
        await env.DB.prepare(
          'INSERT INTO days (date, data, updated_at) VALUES (?, ?, datetime(\'now\')) ON CONFLICT(date) DO UPDATE SET data=excluded.data, updated_at=excluded.updated_at'
        ).bind(body.date, JSON.stringify(body)).run();
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      // DELETE /api/days/:date — remove um dia
      if (request.method === 'DELETE' && path.startsWith('/api/days/')) {
        const date = path.replace('/api/days/', '');
        await env.DB.prepare('DELETE FROM days WHERE date = ?').bind(date).run();
        return Response.json({ ok: true }, { headers: corsHeaders });
      }

      return Response.json({ ok: false, error: 'Not found' }, { status: 404, headers: corsHeaders });

    } catch (err) {
      return Response.json({ ok: false, error: err.message }, { status: 500, headers: corsHeaders });
    }
  }
};
