import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
// Vite resolves this to a served URL for the WebAssembly binary.
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';

/**
 * A real SQLite database, compiled to WebAssembly, running entirely in the
 * browser tab. Nothing here touches the network or any real system; the whole
 * "CampusHub" store exists only in memory in the learner's own tab.
 */

let sqlPromise: Promise<SqlJsStatic> | null = null;

function getSql(): Promise<SqlJsStatic> {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({ locateFile: () => wasmUrl });
  }
  return sqlPromise;
}

export const SEED = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  recovery_code TEXT NOT NULL
);
INSERT INTO users (id, username, password, role, recovery_code) VALUES
  (1, 'admin',   'Spr1ng2026!Admin', 'admin', 'CTF{union_select_all_the_rows}'),
  (2, 'j.rivera','basketball',        'staff', 'RC-55120'),
  (3, 'l.nguyen','p@ssw0rd',          'student','RC-88213'),
  (4, 'm.okoro', 'qwerty123',         'student','RC-20947');

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL
);
INSERT INTO products (id, name, category, price) VALUES
  (1, 'Campus Hoodie',      'Apparel',     38.00),
  (2, 'Stainless Bottle',   'Accessories', 18.50),
  (3, 'Lab Safety Goggles', 'Equipment',   12.00),
  (4, 'Intro to Security',  'Books',       64.00),
  (5, 'USB-C Hub',          'Electronics', 29.99);
`;

/** Build a fresh, seeded database from an initialized sql.js module. */
export function seedDatabase(SQL: SqlJsStatic): Database {
  const db = new SQL.Database();
  db.run(SEED);
  return db;
}

/** Build a fresh, seeded database in the browser. Call once per lab session. */
export async function createDatabase(): Promise<Database> {
  return seedDatabase(await getSql());
}

export interface QueryResult {
  columns: string[];
  rows: Array<Array<string | number | null>>;
  error?: string;
}

function toResult(db: Database, sql: string, params?: Record<string, unknown>): QueryResult {
  try {
    const stmt = db.prepare(sql);
    if (params) stmt.bind(params as never);
    const rows: Array<Array<string | number | null>> = [];
    let columns: string[] = [];
    while (stmt.step()) {
      columns = stmt.getColumnNames();
      rows.push(stmt.get() as Array<string | number | null>);
    }
    stmt.free();
    return { columns, rows };
  } catch (error) {
    return { columns: [], rows: [], error: (error as Error).message };
  }
}

// --- The login query, built two ways --------------------------------------

/**
 * The VULNERABLE login query: the username and password are concatenated
 * straight into the SQL string. This is exactly the bug the lab teaches.
 */
export function vulnerableLoginSql(username: string, password: string): string {
  return (
    "SELECT id, username, role FROM users " +
    `WHERE username = '${username}' AND password = '${password}'`
  );
}

export function runVulnerableLogin(
  db: Database,
  username: string,
  password: string,
): QueryResult & { sql: string } {
  const sql = vulnerableLoginSql(username, password);
  return { ...toResult(db, sql), sql };
}

/**
 * The SAFE login query: the SQL structure is fixed, and the inputs are bound
 * as parameters, so they can never change the query's meaning.
 */
export function safeLoginSql(): string {
  return 'SELECT id, username, role FROM users WHERE username = :u AND password = :p';
}

export function runSafeLogin(
  db: Database,
  username: string,
  password: string,
): QueryResult & { sql: string } {
  const sql = safeLoginSql();
  return { ...toResult(db, sql, { ':u': username, ':p': password }), sql };
}

// --- The product search, built two ways -----------------------------------

export function vulnerableSearchSql(term: string): string {
  return (
    "SELECT name, category, price FROM products " +
    `WHERE name LIKE '%${term}%' ORDER BY name`
  );
}

export function runVulnerableSearch(db: Database, term: string): QueryResult & { sql: string } {
  const sql = vulnerableSearchSql(term);
  return { ...toResult(db, sql), sql };
}

export function runSafeSearch(db: Database, term: string): QueryResult & { sql: string } {
  const sql = 'SELECT name, category, price FROM products WHERE name LIKE :t ORDER BY name';
  return { ...toResult(db, sql, { ':t': `%${term}%` }), sql };
}

export type QueryMode = 'vulnerable' | 'safe';
