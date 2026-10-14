---
topicId: APP-01
title: SQL injection and parameterized queries
summary: Learn why pasting user input into SQL text lets data rewrite a query, how parameterized queries keep a query's structure fixed, and how to prove a fix with tests that run against a real database.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why concatenating input into SQL text lets data change the structure of a query.
  - Rewrite a vulnerable query in Python or Java using placeholders and bound parameters.
  - Use an allowlist for query parts that cannot be parameters, such as a sort column.
  - Write tests against a real database that show a fix blocks injection and still accepts legitimate input.
  - Describe how least privilege and second-order data flows change the impact and reach of an injection flaw.
prerequisites: [FND-03]
concepts: [sql-injection, parameterized-query, injection, second-order-injection, orm, cwe]
labs: [sql-injection]
keywords:
  - SQLi
  - CWE-89
  - A05:2025
  - prepared statement
  - bind variable
  - placeholder
  - second-order SQL injection
  - blind SQL injection
  - ORM
  - MOVEit
  - CVE-2023-34362
sources:
  - title: SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: "CWE-89: Improper Neutralization of Special Elements used in an SQL Command ('SQL Injection')"
    url: https://cwe.mitre.org/data/definitions/89.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 'Computer Security (CS 161 textbook), Chapter 17: SQL Injection'
    url: https://textbook.cs161.org/web/sqli.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Secure by Design Alert: Eliminating SQL Injection Vulnerabilities in Software'
    url: https://www.ic3.gov/Media/News/2024/240325.pdf
    publisher: CISA and FBI
  - title: '#StopRansomware: CL0P Ransomware Gang Exploits CVE-2023-34362 MOVEit Vulnerability (AA23-158A)'
    url: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a
    publisher: CISA and FBI
  - title: 'A05:2025 Injection (OWASP Top 10:2025)'
    url: https://top10.owasp.org/2025/A05_2025-Injection/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
quiz:
  - question: "A login query is rewritten to use a placeholder. Why does the input ' OR '1'='1 no longer sign anyone in?"
    choices:
      - The driver deletes every quote character before the query runs.
      - The database parses the statement before the value arrives, so the value can only fill a slot for data.
      - The input is encrypted on its way to the database, so the database cannot read it.
      - The database compares the input against a list of known attack strings and drops the request.
    answer: 1
    explanation: "With a parameterized query the statement's structure is fixed when it is prepared. The bound value is treated as one string, so the database looks for a user literally named ' OR '1'='1 and finds none. Nothing is removed, encrypted, or matched against a blocklist."
  - question: A report page lets the user choose which column to sort by. What is the correct way to put that choice into the SQL?
    choices:
      - Bind the column name as a parameter, like any other value.
      - Escape the column name with the driver's quoting function.
      - Map the user's choice to one of a few column names written in the code, and reject anything else.
      - Reject any input that contains a space or a semicolon.
    answer: 2
    explanation: Placeholders hold values, not identifiers such as column names, so binding does not work here. An allowlist that maps a user's word to a fixed string from the code means no user text ever reaches the SQL. Escaping identifiers is fragile, and rejecting a few characters is a blocklist that misses other inputs.
  - question: A signup form stores usernames with a parameterized INSERT. A nightly report later builds a query by concatenating usernames read back from the database. Which statement is correct?
    choices:
      - The report is injectable, because a stored username is still attacker-controlled text.
      - The report is safe, because the parameterized INSERT already neutralized the input.
      - The report is safe, because data that comes from your own database is trusted.
      - The report is injectable only if the usernames contain spaces.
    answer: 0
    explanation: This is second-order SQL injection. Parameterizing the INSERT stores the text exactly as typed, which is correct, but it does not make the text safe to paste into a different query later. Every query that uses the value must bind it as a parameter.
  - question: Which test gives genuine evidence that a fix for an order-lookup query works?
    choices:
      - A unit test with a mocked database that checks execute() was called exactly once.
      - A code review confirming that the function was renamed find_orders_safe.
      - A search of the code for the word SELECT next to a plus sign.
      - A test against a real in-memory database that checks a normal lookup, a name with an apostrophe, and an injection-style input.
    answer: 3
    explanation: Injection is about how the database parses the text it receives, so the evidence must come from a real database engine. The three inputs check that legitimate use still works, that real names with quotes work, and that crafted input is treated as data. A mock, a rename, or a text search cannot show any of that.
  - question: The application's database account can read the products table but has no access to the users table. An attacker finds an injectable product search. What does this least-privilege setup achieve?
    choices:
      - It removes the vulnerability, so the search no longer needs fixing.
      - It limits what the injected SQL can read or change, but the flaw still has to be fixed.
      - It stops injection entirely, because the database rejects quotes from restricted accounts.
      - Nothing, because injected SQL always runs with administrator rights.
    answer: 1
    explanation: Injected SQL runs with the privileges of the application's account. A narrow account shrinks the damage, keeping the users table out of reach, but the attacker can still read or alter whatever that account can, so the query must still be parameterized.
---

## Why it matters

Almost every application keeps its important data in a database: accounts, orders, grades, medical records. The application talks to that database in SQL, a language with its own grammar of keywords, quotes, and operators. [[sql-injection|SQL injection]] happens when a program builds a SQL statement by pasting user input into the statement's text, so that a crafted input changes what the statement means. MITRE catalogs the weakness as [[cwe|CWE]]-89, and it ranked second on the [2025 CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html) list of the most dangerous software weaknesses. The OWASP Top 10:2025 covers it under A05:2025, Injection.

The damage is real and recent. In a June 2023 joint advisory, CISA and the FBI reported that the CL0P ransomware gang had exploited a previously unknown SQL injection flaw, CVE-2023-34362, in MOVEit Transfer, a managed file transfer product. The advisory says that exploitation began around May 27, 2023, and that the attackers installed a web shell (a malicious script that lets an intruder run commands through the web server) on internet-facing servers and used it to steal data from the underlying databases. In March 2024 the two agencies issued a Secure by Design alert that asks software makers to eliminate this entire class of defect. The alert observes that SQL injection has been called an "unforgivable" vulnerability since at least 2007, and it names the fix: parameterized queries with prepared statements.

That is the encouraging part of this lesson. SQL injection is serious, but it is one of the few major vulnerability classes with a simple, reliable fix that every mainstream language already supports.

> [!ETHICS] Only test systems you own or have written permission to test.

## The core idea

Start with three assumptions. First, an attacker controls some value the application uses: a form field, a URL parameter, a cookie, an HTTP header, a JSON property, or a value someone stored earlier. Second, the application builds SQL text from that value. Third, the database runs whatever statement it receives, with the privileges of the application's database account.

A SQL statement is a small program. When an application glues user input into the program's source text, the database cannot tell which characters the developer wrote and which ones came from the user. If the input contains SQL's own syntax, such as a quote that ends a string, it stops being data and becomes part of the program. This is the general pattern of [[injection]]: data crosses into a context where an interpreter reads it as code. The CS 161 textbook treats SQL injection as a special case of code injection for exactly this reason.

An analogy helps. Picture an assistant who reads a form letter aloud and carries out every instruction in it. The letter says "Refund the order for ____." If the blank holds "alice, and also refund every other order," the assistant cannot tell where the customer's name ended. A [[parameterized-query|parameterized query]], also called a prepared statement, fixes the letter's wording first and passes the name in a sealed envelope. Whatever the envelope says, it is only ever a name.

## How it works

### The input becomes part of the program

Here is a lookup function for the support portal of the fictional store `shop.example`. It builds its SQL with a Python f-string, a string literal that splices in the values of expressions written inside braces.

```python
import sqlite3

def find_orders(conn: sqlite3.Connection, customer: str) -> list[tuple]:
    # VULNERABLE: the customer name is pasted into the SQL text.
    sql = f"SELECT id, item, total FROM orders WHERE customer = '{customer}'"
    return conn.execute(sql).fetchall()
```

Compare the text the database receives for a normal name and for a classic illustrative input:

```text
customer = alice
SELECT id, item, total FROM orders WHERE customer = 'alice'

customer = ' OR '1'='1
SELECT id, item, total FROM orders WHERE customer = '' OR '1'='1'
```

In the second statement, the input's first quote ends the string literal early. The words that follow are parsed as SQL, adding a condition that is true for every row, and the closing quote the developer wrote now completes the attacker's `'1'`. The structure of the query changed from one comparison into an OR of two comparisons, and the lookup returns every customer's orders. A related trick uses SQL's comment marker, `--`, to make the database ignore the rest of the statement, which is how a login check such as `AND password = '...'` can disappear.

The same code also fails honest users. A customer named `o'brien` produces `WHERE customer = 'o'brien'`, which is a syntax error. An apostrophe that causes a database error is a strong clue that a program builds SQL from text.

### What injected SQL can do

| Form         | What the attacker sees                       | Typical effect                                                  |
| ------------ | -------------------------------------------- | --------------------------------------------------------------- |
| In-band      | Query results appear in the page             | Rows from other tables are appended to the expected results     |
| Error-based  | Database error messages                      | Errors reveal table names, structure, or data                   |
| Blind        | Only a true or false difference, or a delay  | Data is inferred one small fact at a time                       |
| Second-order | Nothing at first; the input is stored safely | A later query that concatenates the stored value is the one hit |

The ceiling on the damage is the database account. Injected SQL runs with the application's privileges, so it can read every table that account can read and change every row that account can change. Whether a single call can run several statements depends on the driver, but even one SELECT can expose far more than the feature was meant to show.

### Why parameters work

A parameterized query sends the statement's structure and its values separately. The diagram below shows the two phases: the database prepares the statement, with a `?` placeholder where a value belongs, and only afterward receives the value.

```sequence
title: A parameterized query keeps structure and data apart
participant A as App (shop.example)
participant D as Database
A -> D: Prepare: SELECT … WHERE customer = ?
note D: Parse and plan the statement now
D --> A: Statement ready, one placeholder
A -> D: Execute with value: ' OR '1'='1
note D: The value fills the slot as one string
D --> A: 0 rows (no customer has that name)
```

Because parsing finishes before any value arrives, the value can only ever occupy the slot reserved for a value. No character inside it can end a string or add a clause. Some client libraries implement placeholders by quoting values inside the driver rather than sending them separately. The application code looks the same, and the separation is then maintained by a well-tested library instead of hand-written string handling.

The repaired Python function changes two lines:

```python
def find_orders(conn: sqlite3.Connection, customer: str) -> list[tuple]:
    # FIXED: the SQL text is a constant; the value travels separately.
    sql = "SELECT id, item, total FROM orders WHERE customer = ?"
    return conn.execute(sql, (customer,)).fetchall()
```

The same fix in Java uses JDBC's `PreparedStatement`:

```java
// VULNERABLE: string concatenation builds the statement.
ResultSet findOrdersVulnerable(Connection conn, String customer) throws SQLException {
    String sql = "SELECT id, item, total FROM orders WHERE customer = '" + customer + "'";
    return conn.createStatement().executeQuery(sql);
}

// FIXED: a constant statement with a placeholder, and a bound value.
ResultSet findOrders(Connection conn, String customer) throws SQLException {
    PreparedStatement ps = conn.prepareStatement(
        "SELECT id, item, total FROM orders WHERE customer = ?");
    ps.setString(1, customer);
    return ps.executeQuery();
}
```

[PortSwigger's guidance](https://portswigger.net/web-security/sql-injection) states the rule strictly: the query string must be a hard-coded constant that never contains variable data from any origin. The one pattern below that varies the SQL text keeps to the spirit of that rule, because the only text that varies is chosen from constants in the code.

### Places parameters cannot go

Placeholders stand for values. They cannot stand for identifiers such as table or column names, or for keywords such as `ASC` and `DESC`. When users must choose those, map their choice to strings written in your code and reject everything else, which is an [[allowlist]]:

```python
SORT_COLUMNS = {"date": "created_at", "total": "total"}  # user word -> SQL written by us

def list_orders(conn, customer: str, sort: str, descending: bool) -> list[tuple]:
    column = SORT_COLUMNS.get(sort)
    if column is None:
        raise ValueError("unsupported sort key")
    direction = "DESC" if descending else "ASC"
    sql = f"SELECT id, item, total FROM orders WHERE customer = ? ORDER BY {column} {direction}"
    return conn.execute(sql, (customer,)).fetchall()
```

This f-string is safe because every piece it inserts was written by the developer; the user's text only selects among them. The same reasoning covers a variable-length `IN (...)` list: generate one `?` per item and bind the items. One more subtlety: a bound value used with `LIKE` is still a pattern, so a user's `%` or `_` acts as a wildcard. That is not injection, but if a search should be literal, escape those characters and declare an `ESCAPE` character.

## Worked example

A code review at `shop.example` flagged `find_orders`. Your task is to repair it and prove the repair with genuine tests, meaning tests that run the real query against a real database engine. Injection is about how the database parses text, so a mocked database that only records "execute was called" cannot tell a broken query from a fixed one.

**Step 1: build a small, real database.** Python's built-in `sqlite3` module can create one in memory, so the tests need no server and leave nothing behind. Note that the seed data includes a customer whose name contains an apostrophe.

```python
def make_db() -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:")
    conn.executescript("""
        CREATE TABLE orders (id INTEGER PRIMARY KEY, customer TEXT, item TEXT, total REAL);
        INSERT INTO orders (customer, item, total) VALUES
          ('alice',    'Hoodie',  38.00),
          ('bob',      'Bottle',  18.50),
          ('o''brien', 'Goggles', 12.00);
    """)
    return conn
```

**Step 2: write tests that describe correct behavior,** not the current behavior.

```python
def test_customer_sees_only_their_orders():
    assert find_orders(make_db(), "alice") == [(1, "Hoodie", 38.0)]

def test_apostrophe_in_a_real_name_works():
    assert find_orders(make_db(), "o'brien") == [(3, "Goggles", 12.0)]

def test_injection_style_input_is_just_an_unknown_name():
    assert find_orders(make_db(), "' OR '1'='1") == []
```

**Step 3: run the tests against the vulnerable function.** Running them (with `pytest`, or by calling each function) gives these results:

| Test                       | Vulnerable version                       | Repaired version             |
| -------------------------- | ---------------------------------------- | ---------------------------- |
| Alice sees her orders      | Pass                                     | Pass                         |
| Apostrophe in a real name  | Error: `near "brien": syntax error`      | Pass: one row, the goggles   |
| Injection-style input      | Fail: returns all three customers' rows  | Pass: zero rows              |

The failures are the evidence. The second test shows that the code mixes data into SQL syntax, and the third shows that the mixing changes which rows come back.

**Step 4: repair the function** by replacing the f-string with a placeholder and a bound value, as in the fixed version above.

**Step 5: re-run every test.** All three pass, and the second one shows that the fix also repaired a functional bug for real customers. Keep the tests in the project's test suite so a future edit that reintroduces concatenation fails the build. Finally, search the rest of the code for SQL built with `+`, `%`, `.format`, or f-strings, because one fixed query says nothing about its neighbors.

## Defenses

| Defense                               | What it does                                                    | Limits                                                                   |
| ------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Parameterized queries                 | Fixes the structure before data arrives                         | Protects only the values you bind; any concatenated part stays exposed   |
| Allowlists for identifiers            | Maps user choices to SQL written in the code                    | Must be kept in step with the schema                                     |
| Safe query APIs (ORM, query builder)  | Generates parameterized SQL by default                          | Raw-SQL escape hatches and string-built filters reintroduce the flaw     |
| Input validation                      | Rejects values with the wrong shape, such as a non-numeric id   | Cannot reject legitimate text such as o'brien, so it is never the fix    |
| Least-privilege database accounts     | Limits what injected SQL can read or change                     | Everything the account can reach is still exposed                        |
| Monitoring and filters                | Alerts on spikes in database syntax errors; blocks known shapes | Filters can frequently be bypassed; they buy time, not safety            |
| Escaping                              | Marks quotes as literal characters                              | Fragile, and one forgotten call is a hole; a last resort for legacy code |

The OWASP SQL Injection Prevention Cheat Sheet ranks prepared statements first, properly constructed stored procedures second, and allowlist input validation third, and it labels escaping all user input "strongly discouraged." Stored procedures are safe only when they do not build dynamic SQL inside the procedure. An [[orm|object-relational mapper (ORM)]], a library that maps database rows to program objects, parameterizes for you until someone passes it a string assembled from input. [[input-validation|Input validation]] and [[least-privilege|least privilege]] are valuable [[defense-in-depth|defense in depth]], but neither stops the injection itself. The CISA and FBI alert makes the same point about sanitization: it can stop some attacks, but such techniques are brittle and can frequently be bypassed.

## Common misconceptions

- **"Escaping quotes is enough."** Escaping must be correct for every query and every edge case, and one missed call is a hole. Parameters remove the need to get it right by hand.
- **"Data from our own database is safe."** Stored values are still user input. [[second-order-injection|Second-order injection]] happens when a value stored safely is later pasted into another query.
- **"We use an ORM, so we are immune."** ORMs offer raw-query features, and string-built filter expressions are injectable just like hand-written SQL.
- **"Only login forms are at risk."** Any input that reaches a query counts: search boxes, sort options, cookies, headers, JSON fields, and file names.
- **"A web application firewall fixes it."** Filters match patterns and can be evaded. They are a stopgap while the code is fixed, never the fix.
- **"Parameterize everything, including table names."** Placeholders cannot hold identifiers. Use an allowlist for those parts.

## Try it in the lab

In [the lab](lab:sql-injection), you work with a fictional campus store whose login form and product search run on a real SQLite database compiled to WebAssembly, entirely inside your browser tab. In vulnerable mode, the lab shows the exact SQL each request runs, so you can watch a crafted input change a query's structure and see how much of the database a single injectable search exposes. You then switch the login to its parameterized version and run an automated battery of legitimate and malicious inputs. The lab grades your fix from real query results: the one legitimate login must succeed, and every injection attempt must fail. The lab is still being built, so its screens may differ from this description.

**Without the lab.** Copy `make_db`, both versions of `find_orders`, and the three tests from the worked example into one file on your own machine. Rename the two versions `find_orders_vulnerable` and `find_orders_fixed`, run each test against each version, and print the SQL text the vulnerable version builds. Then add a fourth test of your own, such as a customer name with a semicolon, and predict the result before you run it. Python's [`sqlite3` documentation](https://docs.python.org/3/library/sqlite3.html) explains both of its placeholder styles, `?` and `:name`, and warns against assembling queries with string operations.

## Key takeaways

- SQL injection happens when input is pasted into SQL text, so data can change the structure of the statement.
- Parameterized queries fix the structure before any value arrives; they are the primary defense, and every mainstream language supports them.
- Identifiers and keywords cannot be parameters; choose them from an allowlist written in the code.
- Prove a fix with tests against a real database, including a legitimate name with an apostrophe and an injection-style input.
- Least privilege, validation, and monitoring limit damage and buy time, but only parameterization removes the flaw.

## Go deeper

- Zhendong Su and Gary Wassermann, ["The Essence of Command Injection Attacks in Web Applications"](https://www.cs.ucdavis.edu/~su/publications/popl06.pdf) (POPL 2006), give a formal definition: an attack occurs when user input changes the intended syntactic structure of a query. Their checker tracks input through string operations and blocks queries whose parse tree places input outside the permitted forms. Compare that definition with the parse-before-bind guarantee of prepared statements.
- The same PortSwigger overview covers second-order injection and injection through JSON and XML inputs. Consider how a taint-tracking static analyzer would follow a value from an HTTP request, into a database row, and back out into a later query.
- Open question: applications increasingly let a [large language model](lesson:AI-01) write SQL from a user's request. Parameterization no longer separates code from data when the model writes the code. What combination of read-only accounts, query allowlists, and review would you require before running such queries?
