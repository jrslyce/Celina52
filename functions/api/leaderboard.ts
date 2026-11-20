interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta: { last_row_id?: number } }>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface Env {
  LEADERBOARD_DB: D1Database;
}

interface ScoreRow {
  id: number;
  initials: string;
  score: number;
  cash_won: number;
  grade: string;
  jugs_collected: number;
  brawls_won: number;
  worker: string;
  created_at: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
};

async function ensureSchema(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        initials TEXT NOT NULL,
        score INTEGER NOT NULL,
        cash_won INTEGER NOT NULL DEFAULT 0,
        grade TEXT NOT NULL DEFAULT 'C',
        jugs_collected INTEGER NOT NULL DEFAULT 0,
        brawls_won INTEGER NOT NULL DEFAULT 0,
        worker TEXT NOT NULL DEFAULT 'nevaeh',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    )
    .run();
}

function mapRow(row: ScoreRow) {
  return {
    id: row.id,
    initials: row.initials,
    score: row.score,
    cashWon: row.cash_won,
    grade: row.grade,
    jugsCollected: row.jugs_collected,
    brawlsWon: row.brawls_won,
    worker: row.worker,
    createdAt: row.created_at,
  };
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet(context: { env: Env }): Promise<Response> {
  try {
    const db = context.env.LEADERBOARD_DB;
    await ensureSchema(db);

    const { results } = await db
      .prepare(
        `SELECT id, initials, score, cash_won, grade, jugs_collected, brawls_won, worker, created_at
         FROM scores
         ORDER BY score DESC, cash_won DESC, id ASC
         LIMIT 20`,
      )
      .all<ScoreRow>();

    return new Response(JSON.stringify({ entries: results.map(mapRow) }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    console.error('Celina 52 Leaderboard GET error:', err);
    return new Response(JSON.stringify({ error: 'Failed to load leaderboard' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const rawInitials = String(body.initials ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 3);

    if (rawInitials.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Please enter exactly 3 letters or numbers for your initials.' }),
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const score = Math.round(Number(body.score));
    if (!Number.isFinite(score) || score < 0 || score > 500000) {
      return new Response(JSON.stringify({ error: 'Invalid score value.' }), {
        status: 400,
        headers: CORS_HEADERS,
      });
    }

    const cashWon = Math.max(0, Math.min(50000, Math.round(Number(body.cashWon ?? 0) || 0)));
    const allowedGrades = new Set(['S', 'A', 'B', 'C', 'D']);
    const grade = allowedGrades.has(String(body.grade)) ? String(body.grade) : 'C';
    const jugsCollected = Math.max(0, Math.min(5000, Math.round(Number(body.jugsCollected ?? 0) || 0)));
    const brawlsWon = Math.max(0, Math.min(500, Math.round(Number(body.brawlsWon ?? 0) || 0)));
    const allowedWorkers = new Set(['nevaeh', 'janitor', 'rodney']);
    const worker = allowedWorkers.has(String(body.worker)) ? String(body.worker) : 'nevaeh';

    const db = context.env.LEADERBOARD_DB;
    await ensureSchema(db);

    const insertRes = await db
      .prepare(
        `INSERT INTO scores (initials, score, cash_won, grade, jugs_collected, brawls_won, worker)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(rawInitials, score, cashWon, grade, jugsCollected, brawlsWon, worker)
      .run();

    const newId = Number(insertRes.meta?.last_row_id ?? 0);

    const rankRow = await db
      .prepare(
        `SELECT COUNT(*) + 1 AS rank
         FROM scores
         WHERE score > ? OR (score = ? AND cash_won > ?) OR (score = ? AND cash_won = ? AND id < ?)`,
      )
      .bind(score, score, cashWon, score, cashWon, newId)
      .first<{ rank: number }>();

    const { results } = await db
      .prepare(
        `SELECT id, initials, score, cash_won, grade, jugs_collected, brawls_won, worker, created_at
         FROM scores
         ORDER BY score DESC, cash_won DESC, id ASC
         LIMIT 20`,
      )
      .all<ScoreRow>();

    const entries = results.map(mapRow);
    const entry = entries.find((e) => e.id === newId) ?? {
      id: newId,
      initials: rawInitials,
      score,
      cashWon,
      grade,
      jugsCollected,
      brawlsWon,
      worker,
      createdAt: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        entry,
        rank: Number(rankRow?.rank ?? 1),
        entries,
      }),
      { status: 201, headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error('Celina 52 Leaderboard POST error:', err);
    return new Response(JSON.stringify({ error: 'Failed to save score' }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}
