# Content authoring guide

Lessons, glossary terms, and library sources are plain text files under
[`/content`](../content). Instructors can edit them without touching
application code. A test validates every file, so a mistake shows up as a
clear error instead of a broken page.

## Lessons

One Markdown file per topic: `content/lessons/<topic-id-lowercase>.md`, for
example `content/lessons/app-01.md`. The topic id must exist in the catalog
(`src/content/catalogData.ts`).

### Frontmatter

```yaml
---
topicId: APP-01
title: SQL injection and parameterized queries
summary: One sentence that says what the learner will understand.
level: intro # intro | intermediate | advanced
status: draft # draft | reviewed  (only an instructor sets "reviewed")
version: 1
updated: 2026-10-14
estimatedMinutes: 20
objectives:
  - Explain why building SQL with string concatenation is unsafe.
  - Rewrite a vulnerable query using parameters.
prerequisites: [FND-01] # topic ids
concepts: [sql-injection, parameterized-query] # glossary ids
labs: [sql-injection] # lab ids
sources:
  - title: OWASP SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
quiz:
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

Use `##` headings in this order. They build the on-page table of contents.

1. `## Why it matters`: a concrete, real-world framing in two or three
   short paragraphs.
2. `## The core idea`: the intuition, with plain-language analogies.
3. `## How it works`: the mechanism, with code, protocol fields, or
   diagrams in fenced code blocks.
4. `## Worked example`: one complete, step-by-step example.
5. `## Defenses`: what actually prevents or detects it, and the limits of
   each defense.
6. `## Common misconceptions`: a short list of things people get wrong.
7. `## Try it in the lab`: what to do in the linked lab (use `lab:<id>`
   links).
8. `## Go deeper`: an optional extension for graduate students (papers,
   standards, open questions).

### Writing rules

- **Original writing.** Explain in your own words. Never paste text from a
  textbook. Short quotations need quotation marks and a citation.
- **Cite real sources only.** Every source must be a real page you have
  checked. Never invent a citation, a statistic, or an incident.
- **Drafts are labeled.** AI-assisted lessons start as `status: draft`. Only
  the instructor changes a lesson to `reviewed`, after checking it.
- **American English**, plain words, short sentences, active voice. Define a
  term the first time it appears.
- **Ethics.** Lessons that teach an attack include an authorization
  reminder:

  ```markdown
  > [!ETHICS] Only test systems you own or have written permission to test.
  ```

- **Accessibility.** Give every code block a language (` ```sql `), describe
  diagrams in text, and never rely on color alone.

### Markdown features

| Write                                                                          | Renders as                                        |
| ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `[[sql-injection]]`                                                            | An inline glossary term with a definition popover |
| `[[parameterized-query\|parameters]]`                                          | The same, with custom link text                   |
| `[the lab](lab:sql-injection)`                                                 | A link to a lab                                   |
| `[XSS](lesson:WEB-05)`                                                         | A link to another lesson                          |
| `> [!NOTE]`, `[!TIP]`, `[!WARNING]`, `[!IMPORTANT]`, `[!CAUTION]`, `[!ETHICS]` | Callout boxes                                     |
| Fenced code with a language                                                    | Syntax-highlighted code                           |
| GitHub-style tables                                                            | Tables                                            |

## Glossary

YAML files in `content/glossary/`. Any number of files; they are merged.
Ids must be unique across all files.

```yaml
- id: parameterized-query
  term: Parameterized query
  aliases: [prepared statement, bind variables]
  short: A query whose structure is fixed in advance, with user data sent separately as parameters.
  long: Optional longer explanation in Markdown.
  related: [sql-injection]
  topicId: APP-01
```

## Library

`content/library/sources.yaml` lists textbooks, standards, and open
references with verified editions and licenses. See
[KNOWLEDGE_BASE.md](KNOWLEDGE_BASE.md) for what the app may do with each
access tier (open, free, paid).

## Checking your changes

```bash
npm run test        # validates every lesson, glossary and library file
npm run dev         # preview at http://localhost:5173
```
