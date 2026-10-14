import type { Database } from 'sql.js';

import {
  type QueryMode,
  type QueryResult,
  runSafeLogin,
  runSafeSearch,
  runVulnerableLogin,
  runVulnerableSearch,
} from './database';

/**
 * Attack test suite and grading. These functions decide, from real query
 * results, whether an injection succeeded, so the lab can verify a learner's
 * work instead of taking their word for it.
 */

/** A login succeeds (bypassed) when it returns any row. */
export function loginSucceeded(result: QueryResult): boolean {
  return !result.error && result.rows.length > 0;
}

/** A login returned the admin row specifically. */
export function loginReturnedAdmin(result: QueryResult): boolean {
  const usernameCol = result.columns.indexOf('username');
  if (usernameCol < 0) return false;
  return result.rows.some((row) => row[usernameCol] === 'admin');
}

/** A search leaked data it should not expose (more than the 5 product rows, or user data). */
export function searchLeakedData(result: QueryResult, baselineRowCount: number): boolean {
  if (result.error) return false;
  // A UNION attack pulls in rows that are not products, pushing the count up
  // or surfacing values that look like usernames / recovery codes.
  const flat = result.rows.flat().map((v) => String(v));
  const leakedSecret = flat.some((v) => v.startsWith('CTF{') || v.startsWith('RC-'));
  return leakedSecret || result.rows.length > baselineRowCount;
}

export interface LoginAttempt {
  username: string;
  password: string;
  description: string;
  /** Whether this input is a legitimate login or an attack. */
  legitimate: boolean;
}

/**
 * The grading battery for the login form. A correct (safe) implementation
 * lets the one legitimate login through and blocks every injection.
 */
export const LOGIN_TESTS: LoginAttempt[] = [
  {
    username: 'admin',
    password: 'Spr1ng2026!Admin',
    description: 'Legitimate admin login with the correct password',
    legitimate: true,
  },
  {
    username: "' OR '1'='1' -- ",
    password: 'anything',
    description: "Classic boolean bypass: ' OR '1'='1' -- ",
    legitimate: false,
  },
  {
    username: "admin' -- ",
    password: 'wrong',
    description: "Comment out the password check: admin' -- ",
    legitimate: false,
  },
  {
    username: "' OR 1=1 LIMIT 1 -- ",
    password: 'x',
    description: 'Return the first user regardless of credentials',
    legitimate: false,
  },
  {
    username: 'nouser',
    password: 'nopass',
    description: 'A wrong username and password (should fail either way)',
    legitimate: false,
  },
];

export interface GradeRow {
  attempt: LoginAttempt;
  loggedIn: boolean;
  /** Correct behavior: legitimate logins succeed, attacks fail. */
  correct: boolean;
}

export interface GradeReport {
  mode: QueryMode;
  rows: GradeRow[];
  passed: number;
  total: number;
  /** True when the mode behaves safely on every test. */
  secure: boolean;
}

function runLogin(db: Database, mode: QueryMode, username: string, password: string): QueryResult {
  return mode === 'safe'
    ? runSafeLogin(db, username, password)
    : runVulnerableLogin(db, username, password);
}

/** Run every login test against the chosen query mode and grade the outcome. */
export function gradeLogin(db: Database, mode: QueryMode): GradeReport {
  const rows = LOGIN_TESTS.map((attempt) => {
    const result = runLogin(db, mode, attempt.username, attempt.password);
    const loggedIn = loginSucceeded(result);
    const correct = attempt.legitimate ? loggedIn : !loggedIn;
    return { attempt, loggedIn, correct };
  });
  const passed = rows.filter((r) => r.correct).length;
  return {
    mode,
    rows,
    passed,
    total: rows.length,
    secure: passed === rows.length,
  };
}

/** Run a single login attempt in a given mode (for the interactive form). */
export function attemptLogin(
  db: Database,
  mode: QueryMode,
  username: string,
  password: string,
): QueryResult & { sql: string } {
  return mode === 'safe'
    ? runSafeLogin(db, username, password)
    : runVulnerableLogin(db, username, password);
}

export function attemptSearch(
  db: Database,
  mode: QueryMode,
  term: string,
): QueryResult & { sql: string } {
  return mode === 'safe' ? runSafeSearch(db, term) : runVulnerableSearch(db, term);
}

export const PRODUCT_BASELINE = 5;
