import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue, type StatementSync } from 'node:sqlite';
import { dbFile } from './config.ts';
import { ADDED_COLUMNS, SCHEMA } from './schema.ts';
import { seed } from './seed.ts';
import { convertToEuro } from './euro.ts';
import { applyShopDetails } from './shop-details.ts';
import { seedBlog } from './blog-seed.ts';

/*
 * One SQLite connection per process, opened lazily on the first query (so `next build` never
 * touches the database) and kept on globalThis so dev hot-reload doesn't open more.
 * Every query is parameterised; nothing user-supplied is concatenated into SQL.
 */
interface DbState { conn: DatabaseSync; cache: Map<string, StatementSync> }
const g = globalThis as typeof globalThis & { __startechDb?: DbState };

// `next build` prerenders a few pages (e.g. the 404 page, which shows site settings). Give it a
// throwaway in-memory database so a build never creates the real database or an admin account.
const isBuild = process.env.NEXT_PHASE === 'phase-production-build';

function state(): DbState {
  if (g.__startechDb) return g.__startechDb;
  if (!isBuild) fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const conn = new DatabaseSync(isBuild ? ':memory:' : dbFile);
  conn.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA temp_store = MEMORY;
  `);
  conn.exec(SCHEMA);
  for (const [table, column, definition] of ADDED_COLUMNS) {
    const exists = conn.prepare(`SELECT 1 AS x FROM pragma_table_info('${table}') WHERE name = ?`).get(column);
    if (!exists) conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  g.__startechDb = { conn, cache: new Map() };
  // First connection in this process: make sure demo data, pages and an admin account exist.
  seed({ get, all, run, tx }, { createAdmin: !isBuild });
  // Checked inside the write lock so two processes starting together can't both convert.
  tx(() => {
    const { user_version } = conn.prepare('PRAGMA user_version').get() as { user_version: number };
    if (user_version >= 3) return;
    if (user_version < 1) convertToEuro({ all, run });
    if (user_version < 2) applyShopDetails({ run });
    seedBlog({ run });
    conn.exec('PRAGMA user_version = 3');
  });
  return g.__startechDb;
}

export type Param = SQLInputValue;

function stmt(sql: string): StatementSync {
  const s = state();
  let prepared = s.cache.get(sql);
  if (!prepared) {
    if (s.cache.size > 500) s.cache.clear(); // dynamic filter queries could otherwise grow it unbounded
    prepared = s.conn.prepare(sql);
    s.cache.set(sql, prepared);
  }
  return prepared;
}

// node:sqlite returns null-prototype rows; copy them into plain objects so they can be passed
// from Server Components to Client Components.
const plain = <T,>(row: unknown) => ({ ...(row as object) }) as T;

export function get<T = Record<string, unknown>>(sql: string, ...params: Param[]): T | undefined {
  const row = stmt(sql).get(...params);
  return row === undefined ? undefined : plain<T>(row);
}

export function all<T = Record<string, unknown>>(sql: string, ...params: Param[]): T[] {
  return stmt(sql).all(...params).map((r) => plain<T>(r));
}

export function run(sql: string, ...params: Param[]) {
  const r = stmt(sql).run(...params);
  return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
}

export function tx<T>(fn: () => T): T {
  const { conn } = state();
  conn.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    conn.exec('COMMIT');
    return result;
  } catch (err) {
    conn.exec('ROLLBACK');
    throw err;
  }
}

export type Db = { get: typeof get; all: typeof all; run: typeof run; tx: typeof tx };
