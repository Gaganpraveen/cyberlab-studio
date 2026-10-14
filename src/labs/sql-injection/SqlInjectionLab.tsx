import { KeyRound, Play, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Database as SqlDatabase } from 'sql.js';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout, Spinner, inputClasses } from '@/components/ui/primitives';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/radix';
import { cn } from '@/lib/cn';
import { loadLabState, markChallengeSolved, saveLabState } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type GradeReport,
  PRODUCT_BASELINE,
  attemptLogin,
  attemptSearch,
  gradeLogin,
  loginReturnedAdmin,
  loginSucceeded,
  searchLeakedData,
} from './engine';
import { createDatabase, type QueryMode, type QueryResult } from './database';
import { sqlInjectionLab } from './index';

interface SavedState {
  mode: QueryMode;
  username: string;
  password: string;
  term: string;
}

const DEFAULT_STATE: SavedState = {
  mode: 'vulnerable',
  username: "' OR '1'='1' -- ",
  password: 'anything',
  term: 'bottle',
};

/** A query and its result, shown as the lab's central "what ran" panel. */
function SqlPanel({ sql, result }: { sql: string; result: QueryResult | null }) {
  return (
    <div className="border-line overflow-hidden rounded-xl border">
      <div className="border-line bg-surface-2 text-fg-subtle border-b px-3 py-1.5 text-xs font-semibold tracking-wide uppercase">
        Query sent to the database
      </div>
      <pre className="bg-code-bg text-fg overflow-x-auto p-3 font-mono text-[0.8125rem] leading-relaxed whitespace-pre-wrap">
        {sql || '—'}
      </pre>
      {result && (
        <div className="border-line border-t">
          {result.error ? (
            <p className="text-danger px-3 py-2 font-mono text-xs">Error: {result.error}</p>
          ) : (
            <ResultTable result={result} />
          )}
        </div>
      )}
    </div>
  );
}

function ResultTable({ result }: { result: QueryResult }) {
  if (result.rows.length === 0) {
    return <p className="text-fg-subtle px-3 py-2 text-sm">No rows returned.</p>;
  }
  return (
    <div className="max-h-56 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-fg-subtle sticky top-0 text-xs">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="px-3 py-1.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-line divide-y">
          {result.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => {
                const text = cell === null ? 'NULL' : String(cell);
                const secret = text.startsWith('CTF{') || text.startsWith('RC-');
                return (
                  <td
                    key={j}
                    className={cn(
                      'px-3 py-1.5 font-mono text-xs',
                      secret && 'text-warning font-semibold',
                    )}
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: QueryMode; onChange: (m: QueryMode) => void }) {
  return (
    <div
      className="border-line bg-sunken inline-flex rounded-lg border p-0.5"
      role="group"
      aria-label="Query mode"
    >
      {(['vulnerable', 'safe'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={cn(
            'rounded-md px-3 py-1 text-sm font-medium transition-colors',
            mode === m ? 'bg-accent text-on-accent' : 'text-fg-muted hover:text-fg',
          )}
        >
          {m === 'vulnerable' ? 'Vulnerable (string-built)' : 'Parameterized (fixed)'}
        </button>
      ))}
    </div>
  );
}

export default function SqlInjectionLab() {
  const saved = loadLabState<SavedState>(sqlInjectionLab.id);
  const [state, setState] = useState<SavedState>(saved ?? DEFAULT_STATE);
  const [db, setDb] = useState<SqlDatabase | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [loginResult, setLoginResult] = useState<(QueryResult & { sql: string }) | null>(null);
  const [searchResult, setSearchResult] = useState<(QueryResult & { sql: string }) | null>(null);
  const [grade, setGrade] = useState<GradeReport | null>(null);
  const [evidenceLog, setEvidenceLog] = useState<EvidenceEntry[]>([]);

  const { mode, username, password, term } = state;
  const patch = (next: Partial<SavedState>) => setState((prev) => ({ ...prev, ...next }));
  const log = (entry: EvidenceEntry) => setEvidenceLog((prev) => [...prev, entry]);

  useEffect(() => {
    let alive = true;
    createDatabase()
      .then((database) => {
        if (alive) setDb(database);
      })
      .catch((err: unknown) => {
        if (alive) setDbError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    saveLabState(sqlInjectionLab.id, state);
  }, [state]);

  const handleLogin = () => {
    if (!db) return;
    const result = attemptLogin(db, mode, username, password);
    setLoginResult(result);
    const ok = loginSucceeded(result);
    if (result.error) {
      log(evidence('warning', 'Login query errored', result.error));
    } else if (ok) {
      const asAdmin = loginReturnedAdmin(result);
      log(
        evidence(
          mode === 'vulnerable' ? 'danger' : 'success',
          `Signed in${asAdmin ? ' as admin' : ''} (${mode} mode)`,
          result.sql,
        ),
      );
      // A bypass is a vulnerable-mode success whose same inputs fail the
      // parameterized query — i.e. the credentials themselves are not valid.
      if (mode === 'vulnerable' && !loginSucceeded(attemptLogin(db, 'safe', username, password))) {
        markChallengeSolved('sqli-login-bypass');
        log(
          evidence(
            'danger',
            'Login bypassed without valid credentials',
            'Challenge solved: sign in without the password',
          ),
        );
      }
    } else {
      log(evidence('info', `Login rejected (${mode} mode)`, result.sql));
    }
  };

  const handleSearch = () => {
    if (!db) return;
    const result = attemptSearch(db, mode, term);
    setSearchResult(result);
    if (result.error) {
      log(evidence('warning', 'Search query errored', result.error));
    } else if (searchLeakedData(result, PRODUCT_BASELINE)) {
      log(
        evidence(
          'danger',
          `Search leaked non-product data (${result.rows.length} rows)`,
          result.sql,
        ),
      );
    } else {
      log(evidence('info', `Search returned ${result.rows.length} product row(s)`, result.sql));
    }
  };

  const handleGrade = () => {
    if (!db) return;
    const report = gradeLogin(db, mode);
    setGrade(report);
    log(
      evidence(
        report.secure ? 'success' : 'danger',
        `Attack battery: ${report.passed}/${report.total} handled correctly (${mode} mode)`,
        report.secure
          ? 'This query is safe against the suite.'
          : 'This query is bypassed by at least one attack.',
      ),
    );
    if (mode === 'safe' && report.secure) {
      markChallengeSolved('sqli-harden');
    }
  };

  const reset = () => {
    setState(DEFAULT_STATE);
    setLoginResult(null);
    setSearchResult(null);
    setGrade(null);
    setEvidenceLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        <strong className="text-fg">SQL injection</strong> happens when untrusted input is pasted
        straight into a query, so the input can change what the query <em>means</em>. You will break
        into a fake campus store&rsquo;s login, read a table it never meant to show you, then switch
        the query to a parameterized one and prove the same attacks now fail.
      </p>
      <LabSteps
        steps={[
          {
            title: 'Break in',
            body: 'On the Login tab in Vulnerable mode, sign in without a valid password.',
          },
          {
            title: 'Read the query',
            body: 'Watch how your input becomes part of the SQL that runs.',
          },
          {
            title: 'Dump data',
            body: 'On the Search tab, use a UNION to surface the hidden users table.',
          },
          {
            title: 'Fix it',
            body: 'Switch to Parameterized mode and run the attack battery on the Harden tab.',
          },
          {
            title: 'Prove it',
            body: 'Confirm the legitimate login still works and every attack now fails.',
          },
        ]}
      />
      <Callout tone="info" title="Everything here is fictional and local">
        The database is a tiny in-memory SQLite built in your browser tab. The store, users, and
        recovery codes are invented. Nothing connects to a network or a real system.
      </Callout>
    </div>
  );

  if (dbError) {
    return (
      <LabLayout
        lab={sqlInjectionLab}
        guide={guide}
        workspace={
          <div className="p-6">
            <Callout tone="danger" title="Could not start the database">
              {dbError}
            </Callout>
          </div>
        }
      />
    );
  }

  if (!db) {
    return (
      <LabLayout
        lab={sqlInjectionLab}
        guide={guide}
        workspace={
          <div className="flex h-full items-center justify-center gap-3 p-10">
            <Spinner /> <span className="text-fg-muted text-sm">Building the SQLite database…</span>
          </div>
        }
      />
    );
  }

  const workspace = (
    <Tabs defaultValue="login" className="flex h-full flex-col">
      <div className="border-line flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2">
        <TabsList>
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="harden">Harden</TabsTrigger>
        </TabsList>
        <ModeToggle mode={mode} onChange={(m) => patch({ mode: m })} />
      </div>

      <TabsContent value="login" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                Username
              </span>
              <input
                value={username}
                onChange={(e) => patch({ username: e.target.value })}
                spellCheck={false}
                className={cn(inputClasses, 'font-mono')}
              />
            </label>
            <label className="block">
              <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
                Password
              </span>
              <input
                value={password}
                onChange={(e) => patch({ password: e.target.value })}
                spellCheck={false}
                className={cn(inputClasses, 'font-mono')}
              />
            </label>
          </div>
          <Button onClick={handleLogin} className="gap-2">
            <KeyRound className="size-4" aria-hidden /> Sign in
          </Button>
          {loginResult && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {loginSucceeded(loginResult) ? (
                  <Badge tone={mode === 'vulnerable' ? 'danger' : 'success'}>
                    {loginReturnedAdmin(loginResult) ? 'Signed in as admin' : 'Signed in'}
                  </Badge>
                ) : (
                  <Badge tone="neutral">Rejected</Badge>
                )}
              </div>
              <SqlPanel sql={loginResult.sql} result={loginResult} />
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="search" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <label className="block">
            <span className="text-fg-subtle mb-1 block text-xs font-semibold tracking-wide uppercase">
              Product search
            </span>
            <input
              value={term}
              onChange={(e) => patch({ term: e.target.value })}
              spellCheck={false}
              className={cn(inputClasses, 'font-mono')}
            />
          </label>
          <Button onClick={handleSearch} className="gap-2">
            <Search className="size-4" aria-hidden /> Search
          </Button>
          {searchResult && <SqlPanel sql={searchResult.sql} result={searchResult} />}
          <Callout tone="info" title="Hint">
            The catalog query selects three columns. A <code>UNION SELECT</code> of three columns
            from another table is appended to the results.
          </Callout>
        </div>
      </TabsContent>

      <TabsContent value="harden" className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-4 p-5">
          <p className="text-fg-muted text-sm">
            The attack battery runs one legitimate login and several injection attempts against the
            query in the current mode. A safe query lets the real login through and blocks every
            attack.
          </p>
          <Button onClick={handleGrade} className="gap-2">
            <Play className="size-4" aria-hidden /> Run attack battery ({mode})
          </Button>
          {grade && (
            <div className="space-y-3">
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-3 text-sm',
                  grade.secure
                    ? 'border-success/40 bg-success-soft text-fg'
                    : 'border-danger/40 bg-danger-soft text-fg',
                )}
              >
                <ShieldCheck
                  className={cn('size-5 shrink-0', grade.secure ? 'text-success' : 'text-danger')}
                  aria-hidden
                />
                {grade.secure
                  ? `Secure: ${grade.passed}/${grade.total} handled correctly.`
                  : `Vulnerable: only ${grade.passed}/${grade.total} handled correctly.`}
              </div>
              <div className="border-line overflow-hidden rounded-xl border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-2 text-fg-subtle text-xs">
                    <tr>
                      <th className="px-3 py-2 font-medium">Attempt</th>
                      <th className="px-3 py-2 font-medium">Logged in?</th>
                      <th className="px-3 py-2 font-medium">Correct?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-line divide-y">
                    {grade.rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          {r.attempt.description}
                          {r.attempt.legitimate && (
                            <span className="text-success ml-2 text-xs">(legitimate)</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{r.loggedIn ? 'yes' : 'no'}</td>
                        <td className="px-3 py-2">
                          <span className={r.correct ? 'text-success' : 'text-danger font-medium'}>
                            {r.correct ? 'correct' : 'WRONG'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="prose-lesson max-w-none text-sm">
            <Markdown compact>
              {`**Why parameterizing works.** The vulnerable query glues your text into the SQL string, so your text can close a quote and add new SQL. A parameterized query fixes the SQL and sends your input as a separate value, so it is always treated as data and can never change the query's structure.`}
            </Markdown>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );

  return (
    <LabLayout
      lab={sqlInjectionLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={evidenceLog} onClear={() => setEvidenceLog([])} />}
      onReset={reset}
    />
  );
}
