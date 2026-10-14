---
topicId: APP-01
title: SQL injection and parameterized queries
summary: See how building queries by string concatenation lets data become code, how tautology and UNION attacks exploit it, and why parameterized queries, least privilege, and identifier allowlisting are the real fixes.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 34
objectives:
  - Explain how string concatenation lets user input change a query's structure.
  - Describe tautology-based login bypass and UNION-based data extraction.
  - Rewrite a vulnerable query as a parameterized query in Python and JavaScript.
  - Apply least-privilege database accounts and allowlisting for identifiers, and explain why escaping is fragile.
prerequisites: [FND-01]
concepts: [sql-injection, parameterized-query, input-validation, least-privilege, allowlist]
labs: [sql-injection]
sources:
  - title: OWASP SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
  - title: OWASP Web Security Testing Guide, Testing for SQL Injection
    url: https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/05-Testing_for_SQL_Injection
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
  - title: UC Berkeley CS 161 Textbook, SQL Injection
    url: https://textbook.cs161.org/web/sqli.html
    publisher: University of California, Berkeley
  - title: Python Documentation, sqlite3 (placeholders and parameter substitution)
    url: https://docs.python.org/3/library/sqlite3.html
    publisher: Python Software Foundation
  - title: node-postgres, Queries (parameterized queries)
    url: https://node-postgres.com/features/queries
    publisher: node-postgres
  - title: "CISA and FBI, Secure by Design Alert: Eliminating SQL Injection Vulnerabilities in Software"
    url: https://www.cisa.gov/resources-tools/resources/secure-design-alert-eliminating-sql-injection-vulnerabilities-software
    publisher: Cybersecurity and Infrastructure Security Agency
quiz:
  - question: Why does building a query with string concatenation enable SQL injection?
    choices:
      - Because strings are slow
      - Because user input becomes part of the query text, so it can change the query's structure, not just its values
      - Because databases cannot store strings
      - Because concatenation encrypts the input
    answer: 1
    explanation: When input is concatenated into the query string, the database parses it as part of the command. Crafted input can close a quote and add new syntax, turning data into code.
  - question: A login checks WHERE username = '...' AND password = '...'. Entering a username that closes the quote and comments out the rest can log in as the first user. This is
    choices:
      - A UNION attack
      - A tautology-based (always-true) login bypass
      - A denial-of-service attack
      - A buffer overflow
    answer: 1
    explanation: Making the WHERE clause always true, or commenting out the password check, bypasses authentication. It is the classic tautology-based bypass.
  - question: Why do parameterized queries stop SQL injection?
    choices:
      - They encrypt the input
      - The database receives the query structure and the data separately, so input can never change the structure
      - They remove quote characters
      - They make the database read-only
    answer: 1
    explanation: The query text is fixed and parsed before any input arrives; parameters are supplied separately as data and can never be interpreted as SQL syntax.
  - question: You must let users sort results by a column they choose. Why can't you bind the column name as a parameter, and what should you do?
    choices:
      - You can bind it; there is no issue
      - Identifiers like column names cannot be parameters, so map the user's choice against an allowlist of known columns
      - Encrypt the column name
      - Let the user type raw SQL
    answer: 1
    explanation: Placeholders bind data values, not identifiers such as table or column names. For identifiers and sort order, map the input to a fixed set of known-good values (an allowlist).
  - question: According to the CISA/FBI Secure by Design alert, how do input sanitization techniques compare to parameterized queries?
    choices:
      - Sanitization is stronger
      - Sanitization is brittle and often bypassable, while parameterized queries separate code from data
      - They are identical
      - Neither works
    answer: 1
    explanation: The alert calls sanitization techniques "brittle, difficult to enforce at scale, and frequently ... bypassed," and recommends parameterized queries with prepared statements to separate SQL code from user-supplied data.
---

## Why it matters

Almost every application sits on top of a database, and almost every database is spoken to in SQL. [[sql-injection|SQL injection]] (SQLi) is what happens when the data a user supplies gets treated as part of the SQL *command* instead of as a *value* inside it. The consequences are among the worst in web security: an attacker can log in as someone else, read entire tables of personal data, modify or delete records, and sometimes reach the operating system underneath.

What makes SQLi worth studying carefully is that it is both decades old and still everywhere. In 2024 CISA and the FBI issued a joint *Secure by Design* alert after a widely publicized campaign exploited SQL injection in a managed file transfer product, affecting thousands of organizations. Their blunt conclusion was that this is a "preventable" class of defect that manufacturers "continue to develop products with." The fix is well understood. The point of this lesson is to understand it so completely that you would never write the vulnerable form by accident, and you would recognize it instantly in review.

SQLi is the database-side twin of [cross-site scripting](lesson:WEB-05): both are *injection* flaws, where a system fails to keep untrusted data separate from code. The mental habit you build here transfers directly.

> [!ETHICS]
> Only test systems you own or have written permission to test. The queries below are standard teaching examples using fictional data. Run them only against the course's contained lab, which executes a real database engine entirely inside your browser tab.

## The core idea

A SQL query is a sentence in a language the database interprets. When a program builds that sentence by gluing user input into the middle of it, the user gets to write part of the sentence. The academic framing by Su and Wassermann captures it exactly: an injection attack succeeds when input "changes the intended syntactic structure" of the query. The attacker is not supplying a *value*; they are supplying *grammar*.

The defense follows directly from the diagnosis. If the problem is that data and code are mixed in one string, the fix is to keep them apart. A **[[parameterized-query|parameterized query]]** (also called a prepared statement) sends the query *structure* to the database first, with placeholders where values go, and then sends the values *separately*. Because the structure is already parsed and fixed before any value arrives, no value can ever become new grammar. CS 161 calls this "the best defense against SQL injection," and OWASP lists it as the first and preferred prevention option. Everything else in this lesson supports that one idea.

## How it works

### How concatenation becomes a vulnerability

Consider a fictional login for `campus.test`. The programmer writes the query by concatenating the submitted username and password into a string:

```sql
-- VULNERABLE: values are concatenated into the query text
SELECT id, role FROM users WHERE username = 'INPUT_U' AND password = 'INPUT_P'
```

If a user submits the ordinary username `jordan`, the database sees a normal query and returns Jordan's row. But the single quotes that are *supposed* to wrap the value are themselves part of the string the attacker can influence. Supply a username that contains a quote, and the attacker can end the value early and start writing SQL.

> [!IMPORTANT]
> Real applications never store or compare plaintext passwords; they store a salted password hash and compare hashes. The plaintext comparison here is only to keep the injection example small. See [Password hashing and key derivation](lesson:CRY-05).

### Tautology-based login bypass

The simplest attack makes the `WHERE` clause always true or removes part of it. SQL treats `--` as the start of a comment, so everything after it on the line is ignored. A username crafted to close the quote and comment out the rest turns the query into one that matches the first user regardless of password:

```sql
-- Attacker supplies username:  admin' --
SELECT id, role FROM users WHERE username = 'admin' --' AND password = '...'
--                                                   ^ the password check is now a comment
```

A closely related form injects an always-true condition such as `OR '1'='1'` so the clause matches every row. The OWASP Testing Guide shows this classic shape, where crafted input makes "the WHERE condition always true" and the application authenticates without valid credentials. Either way, the attacker never knew a password; they rewrote the question so the password stopped mattering. That is a *tautology-based bypass*, and it is an attack on both [[confidentiality]] and [[authorization]] at once.

### UNION-based data extraction

Bypassing a login is only the beginning. The `UNION` operator appends the results of a second `SELECT` to the first, which lets an attacker read data from *other* tables through a query that was only meant to search one. UNION has one requirement: both selects must return the same number of columns. Attackers discover that number with `ORDER BY n`, increasing `n` until the query errors, as the OWASP Testing Guide describes. Suppose a product search runs:

```sql
-- VULNERABLE product search
SELECT name, price FROM products WHERE category = 'INPUT'
```

Once the attacker knows the query returns two columns, they inject a `UNION SELECT` that reads from the user table instead:

```sql
-- Attacker supplies category:  ' UNION SELECT username, password FROM users --
SELECT name, price FROM products WHERE category = ''
UNION SELECT username, password FROM users --'
```

The result set now contains every username and password alongside the (empty) product results. UNION extraction turns a harmless-looking search box into a data-exfiltration tool. The same technique can read database metadata to discover table and column names first, so the attacker rarely needs to guess.

### The fix: parameterized queries

Now rewrite the login so structure and data travel separately. In Python's `sqlite3`, placeholders are `?` and the values are passed as a second argument. The documentation warns directly against the vulnerable style, cautioning programmers to "beware of using Python's string operations to assemble queries, as they are vulnerable to SQL injection attacks," and to use parameter substitution instead:

```python
# SAFE: structure is fixed; username and password are bound as data
cur.execute(
    "SELECT id, role FROM users WHERE username = ? AND password = ?",
    (username, password),
)
```

In Node.js with node-postgres, placeholders are `$1`, `$2`, and the values are an array. Its docs stress that the query text and parameters "are passed to the PostgreSQL server" separately and that concatenating values into the text "can (and often does) lead to sql injection vulnerabilities":

```javascript
// SAFE: parameters are sent separately from the query text
await client.query(
  "SELECT id, role FROM users WHERE username = $1 AND password = $2",
  [username, password],
);
```

Feed the earlier attack strings into either version and nothing special happens: the database looks for a user whose name is literally `admin' --`, finds none, and returns no row. The input can no longer become grammar because the grammar was finalized before the input arrived. This is why OWASP says a parameterized query makes the database "always distinguish between code and data, regardless of what user input is supplied."

### What parameters cannot do: identifiers

Placeholders bind *values*, not *identifiers*. You cannot parameterize a table name, a column name, or the `ASC`/`DESC` sort direction, because those are part of the query's structure. If you let a user choose a sort column, the safe pattern is an **[[allowlist]]**: map the user's input against a fixed set of known-good identifiers and reject anything else.

```python
# SAFE identifier handling: the user's choice selects from a fixed set
SORT_COLUMNS = {"name": "name", "price": "price"}
column = SORT_COLUMNS.get(sort_key, "name")   # unknown input falls back, never flows through
direction = "DESC" if descending else "ASC"   # derived from a boolean, not from raw input
query = f"SELECT name, price FROM products ORDER BY {column} {direction}"
```

Here the user never controls the actual SQL text; their input only *selects* among values you wrote. OWASP recommends exactly this: when a value cannot be bound, "map ... input to ... legal values" and reject the rest. This is [[input-validation]] by allowlist, the positive cousin of trying to block bad input.

## Worked example

A fictional admin portal at `campus.test` has a login and a product-search page sharing one database. Walk the attack and the repair end to end.

1. **Confirm the flaw.** On the login, you enter a username crafted to comment out the password check. You are logged in as the first account without a password. The query logged by the app shows your input spliced into the middle of the SQL — proof that data became code.
2. **Escalate with UNION.** On the search page you find, via `ORDER BY`, that the query returns two columns, then inject a `UNION SELECT` that reads the users table. The page now lists account names and secrets in place of products. One input field exposed the whole table.
3. **Diagnose.** Both pages build SQL by concatenation. The root cause is identical in each: untrusted input is placed in the query text.
4. **Repair with parameters.** You rewrite both queries as parameterized statements, binding each user value. Re-running every attack string now returns nothing useful — the inputs are treated as literal values that match no rows.
5. **Harden further.** The search page also offers sorting, so you add a column allowlist for that identifier. And you change the application's database account to a least-privilege, read-only user for the search feature, so that even a missed bug could not modify or drop data.
6. **Prove it.** You re-run the full attack suite. Each previously successful attack now fails, and the legitimate login and search still work. That last check matters: a fix that also breaks normal use is not a fix.

## Defenses

- **Parameterized queries (the primary fix).** Use prepared statements with bound parameters for every query that includes a value. Its limit: it protects values, not identifiers, and a stored procedure that internally builds *dynamic* SQL from input can still be injectable — OWASP notes that stored procedures are safe only when "implemented safely," without unsafe dynamic SQL.
- **Allowlisting for identifiers.** Where you truly need a user-chosen table, column, or sort order, map the input to a fixed set of legal values. Its limit: it requires you to enumerate the legal values, which is a feature, not a bug — if you cannot enumerate them, the user should not be choosing them.
- **Least privilege for database accounts.** Give each application path its own [[least-privilege|least-privileged]] account: the login and search features need read-only access; nothing routine needs to drop tables or own the schema. Its limit: this reduces the *impact* of a successful injection but does not prevent it — a read-only account still allows data theft, so it is defense in depth, not a substitute for parameterization.
- **Input validation (supporting).** Validating that inputs match an expected shape shrinks the attack surface. Its limit: as with XSS, validation alone is not sufficient, because many legitimate values contain characters an attacker might also use.
- **Avoid escaping as the strategy.** Manually escaping quotes feels like a fix but is fragile. OWASP labels escaping all input "STRONGLY DISCOURAGED" and cannot guarantee it prevents all injection; the CISA/FBI alert calls sanitization techniques "brittle, difficult to enforce at scale, and frequently ... bypassed." Escaping also fails outright in numeric contexts, where there are no quotes to escape. Treat escaping as a last resort for legacy code, never as the plan.

## Common misconceptions

- **"Escaping quotes is enough."** It is fragile and context-dependent, and it does nothing in a numeric context like `WHERE id = INPUT`, where an attacker needs no quote at all. Parameterize instead.
- **"Only login forms are vulnerable."** Any query built from input is at risk: search boxes, filters, sort options, report parameters, and even values that arrive from other systems. The UNION example used a search box.
- **"Stored procedures are automatically safe."** Only if they do not build dynamic SQL from input internally. A stored procedure that concatenates input into an `EXECUTE` is just injection in a different place.
- **"An ORM means I can't have SQLi."** ORMs parameterize by default, but most expose raw-query or raw-fragment methods, and those reintroduce the risk exactly like concatenation.
- **"Least privilege prevents injection."** It limits the damage, which is valuable, but a read-only account still lets an attacker read data they should not. It is a containment layer, not the cure.
- **"Input validation can replace parameterized queries."** Validation narrows what gets through; parameterization removes the ability of input to change structure at all. You want both, with parameterization as the real defense.

## Try it in the lab

Open the [SQL injection lab](lab:sql-injection). It runs a genuine SQLite database compiled to WebAssembly inside your browser, so the attacks and the fix truly execute — nothing is simulated and nothing leaves your tab. You will bypass a fake login with a tautology, use a UNION attack to dump a hidden table, and watch each injected string spliced into the SQL in the evidence log. Then you will rewrite the vulnerable queries as parameterized statements, add an allowlist for the one identifier that cannot be bound, and re-run the entire attack suite to confirm every attack now fails while legitimate queries still work. Proving the fix by re-attacking is the habit to carry away: a defense you have not tried to break is only a hope.

## Go deeper

Graduate readers should start with the taxonomy. Halfond, Viegas, and Orso's "A Classification of SQL Injection Attacks and Countermeasures" (2006) catalogs the families beyond the two shown here — illegal/logically incorrect queries, piggy-backed queries, inference (including blind, boolean- and time-based) attacks, and alternate encodings — each with its own intent and detection story. Reading it alongside the OWASP Testing Guide turns "SQLi" from one trick into a structured space you can reason about, including the *blind* cases where the attacker sees no output and extracts data one bit at a time through timing or boolean responses.

For the theory of why parameterization is *correct* rather than merely effective, read Su and Wassermann's "The Essence of Command Injection Attacks in Web Applications" (POPL 2006), which formalizes an injection as input that alters the parse tree of the generated query and shows that keeping user input confined to leaf (value) positions provably prevents it — exactly what prepared statements enforce. Finally, treat SQLi as a *secure-by-design* problem, as the 2024 CISA/FBI alert frames it: the goal is not to catch injection at review time but to make the unsafe pattern structurally hard — through ORMs and query builders that parameterize by default, linters that flag string-built SQL, and least-privilege database roles enforced by policy. A strong capstone is to take the lab's schema, add a blind-injection channel, and then demonstrate that a parameterized rewrite closes it while a carefully written escaping routine still leaks under some encoding — a hands-on demonstration of why the field moved from escaping to parameterization.
