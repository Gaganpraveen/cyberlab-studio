# Contributing to CyberLab Studio

Thanks for helping build a safer way to teach security. This guide covers how
to set up, the bar for a change, and the two most important rules — lab safety
and honest content.

## Getting set up

```bash
npm install
npm run dev
```

Before opening a pull request, run the same checks CI runs:

```bash
npm run check   # format:check is run separately in CI; see below
npm run format  # fix formatting
```

CI runs `format:check`, `lint`, `typecheck`, `test`, and `build`. A pull
request needs all of them green.

## Ground rules for labs

These are not style preferences — they are what keeps the project safe to use
in a classroom.

1. **A lab's target exists only in the student's browser.** Attacks run against
   in-memory databases, sandboxed iframes, or deterministic simulations. Never
   add code that accepts a real URL, IP, hostname, or credential as a target,
   and never make a network request to carry out an attack.
2. **Use reserved names.** Examples use the `.test` / `.example` domains and the
   documentation IP ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`).
3. **Label what is real.** A lab that actually executes a mechanism (Web Crypto,
   sql.js, a sandboxed iframe) is marked `mode: 'real'`; a model is marked
   `mode: 'simulation'`. Don't dress a simulation up as the real thing.
4. **Keep the engine pure and tested.** Put a lab's logic in a dependency-light
   TypeScript engine with unit tests, separate from its React UI. The grader
   that verifies a student's defense must be a real check, not a hard-coded
   pass. See [docs/LAB_GUIDE.md](docs/LAB_GUIDE.md).

## Ground rules for content

- Lessons are **original writing**. Do not paste from commercial textbooks.
- **Cite only sources you verified**, with working links. No invented
  citations. New lessons start with `status: draft` until an instructor reviews
  them.
- Write in clear US English and include the ethics/authorization note on
  attack topics. See [docs/CONTENT_GUIDE.md](docs/CONTENT_GUIDE.md).

## Pull requests

- Keep each PR focused. Describe the before/after a reader would see.
- Add or update tests for anything with logic.
- By contributing, you agree your code is licensed MIT and your content under
  `content/` is licensed CC BY-SA 4.0, matching the rest of the project.

## Reporting problems

Open an issue for bugs and ideas. For anything security-sensitive, follow
[SECURITY.md](SECURITY.md) instead of filing a public issue.
