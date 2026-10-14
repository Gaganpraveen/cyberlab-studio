// @vitest-environment node
import { fileURLToPath } from 'node:url';

import initSqlJs, { type Database } from 'sql.js';
import { beforeAll, describe, expect, it } from 'vitest';

import { hashAnswer } from '../answers';
import { challenges } from './challenges';
import { seedDatabase } from './database';
import {
  attemptLogin,
  attemptSearch,
  gradeLogin,
  loginReturnedAdmin,
  loginSucceeded,
  PRODUCT_BASELINE,
  searchLeakedData,
} from './engine';

const WASM = fileURLToPath(new URL('../../../node_modules/sql.js/dist/sql-wasm.wasm', import.meta.url));
const UNION = "zzz' UNION SELECT username, recovery_code, role FROM users -- ";

let db: Database;

beforeAll(async () => {
  const SQL = await initSqlJs({ locateFile: () => WASM });
  db = seedDatabase(SQL);
});

describe('vulnerable login', () => {
  it('accepts the legitimate password', () => {
    const result = attemptLogin(db, 'vulnerable', 'admin', 'Spr1ng2026!Admin');
    expect(loginSucceeded(result)).toBe(true);
    expect(loginReturnedAdmin(result)).toBe(true);
  });

  it('is bypassed by a boolean injection', () => {
    const result = attemptLogin(db, 'vulnerable', "' OR '1'='1' -- ", 'anything');
    expect(result.error).toBeUndefined();
    expect(result.rows.length).toBe(4);
    expect(loginReturnedAdmin(result)).toBe(true);
  });

  it('is bypassed by commenting out the password check', () => {
    const result = attemptLogin(db, 'vulnerable', "admin' -- ", 'wrong');
    expect(loginReturnedAdmin(result)).toBe(true);
  });

  it('shows the input inside the executed SQL text', () => {
    const result = attemptLogin(db, 'vulnerable', "admin' -- ", 'wrong');
    expect(result.sql).toContain("username = 'admin' -- '");
  });

  it('reports syntax errors instead of throwing', () => {
    const result = attemptLogin(db, 'vulnerable', "'", 'x');
    expect(result.error).toBeTruthy();
    expect(loginSucceeded(result)).toBe(false);
  });
});

describe('parameterized login', () => {
  it('accepts the legitimate password', () => {
    expect(loginSucceeded(attemptLogin(db, 'safe', 'admin', 'Spr1ng2026!Admin'))).toBe(true);
  });

  it('treats injection text as plain data', () => {
    expect(loginSucceeded(attemptLogin(db, 'safe', "' OR '1'='1' -- ", 'anything'))).toBe(false);
    expect(loginSucceeded(attemptLogin(db, 'safe', "admin' -- ", 'wrong'))).toBe(false);
  });

  it('never changes the SQL text', () => {
    const a = attemptLogin(db, 'safe', 'admin', 'x');
    const b = attemptLogin(db, 'safe', "admin' -- ", 'x');
    expect(a.sql).toBe(b.sql);
  });
});

describe('grader', () => {
  it('fails the vulnerable query', () => {
    const report = gradeLogin(db, 'vulnerable');
    expect(report.secure).toBe(false);
    expect(report.passed).toBeLessThan(report.total);
  });

  it('passes the parameterized query on every test', () => {
    const report = gradeLogin(db, 'safe');
    expect(report.secure).toBe(true);
    expect(report.passed).toBe(report.total);
  });
});

describe('product search', () => {
  it('returns the catalog for an empty term', () => {
    const result = attemptSearch(db, 'vulnerable', '');
    expect(result.rows.length).toBe(PRODUCT_BASELINE);
    expect(searchLeakedData(result, PRODUCT_BASELINE)).toBe(false);
  });

  it('leaks the users table through a UNION in vulnerable mode', () => {
    const result = attemptSearch(db, 'vulnerable', UNION);
    expect(result.error).toBeUndefined();
    expect(searchLeakedData(result, PRODUCT_BASELINE)).toBe(true);
    expect(result.rows.flat()).toContain('CTF{union_select_all_the_rows}');
  });

  it('a UNION with the wrong column count fails with an error', () => {
    const result = attemptSearch(db, 'vulnerable', "zzz' UNION SELECT username FROM users -- ");
    expect(result.error).toMatch(/columns/i);
  });

  it('finds nothing for the same text in safe mode', () => {
    const result = attemptSearch(db, 'safe', UNION);
    expect(result.rows.length).toBe(0);
    expect(searchLeakedData(result, PRODUCT_BASELINE)).toBe(false);
  });
});

describe('challenges', () => {
  it('have unique ids, belong to this lab, and include hints and solutions', () => {
    const ids = new Set(challenges.map((c) => c.id));
    expect(ids.size).toBe(challenges.length);
    for (const c of challenges) {
      expect(c.labId).toBe('sql-injection');
      expect(c.hints.length).toBeGreaterThan(0);
      expect(c.solution.length).toBeGreaterThan(20);
      if (c.kind !== 'task') expect(c.acceptedHashes?.length).toBeGreaterThan(0);
    }
  });

  it('accept the expected answers', () => {
    const byId = Object.fromEntries(challenges.map((c) => [c.id, c]));
    const accepts = (id: string, answer: string) =>
      byId[id]?.acceptedHashes?.includes(hashAnswer(answer)) ?? false;
    expect(accepts('sqli-recovery-flag', 'CTF{union_select_all_the_rows}')).toBe(true);
    expect(accepts('sqli-column-count', '3')).toBe(true);
    expect(accepts('sqli-comment', '--')).toBe(true);
    expect(accepts('sqli-why-params', 'parameterized query')).toBe(true);
    expect(accepts('sqli-why-params', 'prepared statements')).toBe(true);
  });
});
