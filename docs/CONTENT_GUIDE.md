# Content authoring guide

Lessons, glossary terms, library sources and the attack index are plain text
files under [`/content`](../content). Instructors can edit them without
touching application code, including from GitHub's web editor (every lesson
page has an "Edit on GitHub" link). A test validates every file, so a mistake
shows up as a clear error instead of a broken page.

| Folder              | What it holds                                                 |
| ------------------- | ------------------------------------------------------------- |
| `content/lessons/`  | One Markdown file per catalog topic                           |
| `content/glossary/` | Term definitions (YAML), one file per domain                  |
| `content/library/`  | Textbooks, standards and references (YAML), mapped to topics  |
| `content/coverage/` | The attack index: attack types mapped to topics and standards |

## Lessons

One Markdown file per topic: `content/lessons/<topic-id-lowercase>.md`, for
example `content/lessons/app-01.md`. The topic id must exist in the catalog
(`src/content/catalogData.ts`), and the lesson `title` is the catalog title.

### Frontmatter

```yaml
---
topicId: APP-01
title: SQL injection and parameterized queries
summary: One or two sentences on what the learner will understand.
level: intro # intro | intermediate | advanced
status: draft # draft | reviewed  (only an instructor sets "reviewed")
version: 1
updated: 2026-10-14
estimatedMinutes: 25 # honest reading + exercise time
objectives: # 3 to 5, each starting with a verb a student can demonstrate
  - Explain why building SQL with string concatenation is unsafe.
  - Rewrite a vulnerable query using parameters.
prerequisites: [FND-02] # other topic ids that help first
concepts: [sql-injection, parameterized-query] # glossary ids this lesson teaches
labs: [sql-injection] # lab ids, only for labs that exist in the registry
keywords: [SQLi, CWE-89, injection] # extra search words
sources: # 3 to 6 verified sources
  - title: OWASP SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series # optional: id in content/library
quiz: # 4 or 5 questions
  - question: Why do parameterized queries stop SQL injection?
    choices:
      - They encrypt the input.
      - The database receives the query structure and the data separately.
      - They remove quote characters.
    answer: 1 # zero-based index of the correct choice
    explanation: The query text is fixed before any input arrives, so input can never change its structure.
---
```

### Body structure

Use these `##` headings, in this order. They build the on-page table of
contents, and the test checks that each one is present.

1. `## Why it matters`: a concrete framing in two or three short paragraphs.
   Real incidents only when well documented, and cited.
2. `## The core idea`: the intuition in plain language, with an analogy if one
   genuinely helps. State the assumptions before the mechanism.
3. `## How it works`: the mechanism, with code, protocol fields, a table or a
   sequence diagram. Use `###` subheadings for parts.
4. `## Worked example`: one complete, step-by-step example with fictional
   names (`shop.example`, `192.0.2.10`, user `alice`).
5. `## Defenses`: what prevents, detects or limits it, and the limits of each
   defense. Topics that are not about an attack or weakness (governance,
   research methods) use `## In practice` instead.
6. `## Common misconceptions`: a short list of things people get wrong, each
   with the correction.
7. `## Try it in the lab` when the topic has a lab (link it with
   `[the lab](lab:<id>)`), otherwise `## Try it yourself`: a safe exercise a
   student can do on paper, in their own browser's developer tools, or against
   their own machine.
8. `## Key takeaways`: three to five bullets.
9. `## Go deeper` (optional, recommended): an extension for graduate
   students: papers, standards and open questions, each cited.

Aim for 1,500 to 2,500 words of explanation, about the depth of a good
textbook section: precise enough for a graduate student, clear enough for a
first-year undergraduate.

### Writing rules

- **Original writing.** Explain in your own words. Never paste text from a
  textbook or website. Short quotations need quotation marks and a citation.
- **Cite real sources only.** Every source must be a real page you have
  opened and checked. Never invent a citation, statistic, quote, CVE number,
  or incident. Prefer open sources: the CS 161 textbook, OWASP, NIST, MITRE,
  IETF RFCs, MDN, CISA. See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for what
  each access tier allows.
- **Drafts are labeled.** AI-assisted lessons start as `status: draft`. Only
  the instructor changes a lesson to `reviewed`, after checking it.
- **American English**, plain words, short sentences, active voice. Define a
  term the first time it appears, and link it to the glossary.
- **Accessibility.** Give every code block a language, describe every
  diagram's meaning in the text around it, and never rely on color alone.

### Safety rules for attack topics

CyberLab teaches how attacks work so students can recognize, prevent and
detect them. Lessons explain at the level of a university textbook:

- Explain mechanisms conceptually, with short illustrative snippets against
  fictional targets (`.example` and `.test` domains, documentation IP ranges
  such as `192.0.2.0/24`). Show the vulnerable pattern next to the fix.
- Do not include working exploit chains, weaponized payloads, malware code,
  detection- or filter-evasion techniques, or step-by-step instructions for
  attacking real systems or products.
- Every lesson that teaches an attack includes the authorization reminder:

  ```markdown
  > [!ETHICS] Only test systems you own or have written permission to test.
  ```

### Markdown features

| Write                                                                          | Renders as                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `[[sql-injection]]`                                                            | An inline glossary term with a definition popover |
| `[[parameterized-query\|parameters]]`                                          | The same, with custom link text                   |
| `[the lab](lab:sql-injection)`                                                 | A link to a lab                                   |
| `[XSS](lesson:WEB-05)`                                                         | A link to another lesson                          |
| `> [!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`, `[!ETHICS]` | Callout boxes                                     |
| A fenced `sequence` block (below)                                              | An animated sequence diagram                      |
| Fenced code with a language                                                    | Syntax-highlighted code                           |
| GitHub-style tables                                                            | Tables                                            |

Link a glossary term at its first meaningful use in a section, not every time
it appears.

Code languages: `bash`, `c`, `cpp`, `css`, `diff`, `dockerfile`, `go`,
`html`, `http`, `ini`, `java`, `javascript`, `json`, `powershell`, `python`,
`rust`, `sql`, `text`, `typescript`, `xml`, `yaml`.

#### Sequence diagrams

Protocols and attack flows read best as sequence diagrams:

````markdown
```sequence
title: Logging in with a session cookie
participant B as Browser
participant S as shop.example
B -> S: POST /login (alice, password)
S --> B: 302 Found, Set-Cookie: session=7f3c…
note B: The browser stores the cookie for shop.example
B -> S: GET /orders (Cookie: session=7f3c…)
S --> B: 200 OK, Alice's orders
B -x S: Request without the cookie is refused
```
````

- `participant <id> as <Label>` declares a participant (optional; they are
  created on first use, in order). Ids are single words.
- `A -> B: text` is a request, `A --> B: text` a reply, and `A -x B: text` a
  message that is blocked or rejected.
- `note: text` spans the diagram; `note A: text` sits over one participant.
- Keep labels short (under about 50 characters) and use 3 to 10 steps.

## Glossary

YAML files in `content/glossary/`, one per domain (for example
`content/glossary/net.yaml`). They are merged, and ids must be unique across
all files: search the folder for `id: <your-id>` before adding a term, and
link to an existing term instead of redefining it.

```yaml
- id: parameterized-query
  term: Parameterized query
  aliases: [prepared statement, bind variables]
  short: A query whose structure is fixed in advance, with user data sent separately as parameters.
  long: Optional longer explanation in Markdown. It may link [[sql-injection]].
  related: [sql-injection]
  topicId: APP-01
```

`short` is one sentence that stands on its own in a hover card. `topicId` is
the topic that teaches the term best.

## Library

`content/library/*.yaml` lists textbooks, standards and open references with
verified editions and licenses, mapped to topics. A source can point at the
chapters that cover each topic:

```yaml
sections:
  - title: 'Ch. 5: Database and Data Center Security'
    topics: [APP-01]
```

See [KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for the entry conventions and what
the app may do with each access tier (open, free, paid).

## Attack index

`content/coverage/attacks.yaml` is the A-to-Z of attack types, mapped to the
topics that teach them and to standard identifiers:

```yaml
- id: sql-injection
  name: SQL injection
  aliases: [SQLi]
  category: injection
  summary: Input is concatenated into a SQL query, so it can change the query's structure.
  defenses: [Parameterized queries, Least-privilege database accounts]
  topics: [APP-01, APP-02]
  labs: [sql-injection]
  attack: [T1190] # MITRE ATT&CK technique ids
  cwe: [CWE-89]
  capec: [CAPEC-66]
  owasp: ['A05:2025']
```

## Checking your changes

```bash
npm run test                                       # validate every content file
npx vitest run tests/unit/content.test.ts -t app-01.md   # one lesson
npm run dev                                        # preview at http://localhost:5173
```
