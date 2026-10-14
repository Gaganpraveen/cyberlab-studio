<div align="center">

# CyberLab Studio

**Learn cybersecurity by doing it — safely, in your browser.**

A teaching platform that pairs clear, cited lessons with hands-on labs where
students run real attack-and-defense exercises against targets that exist only
inside their own browser tab. Built for undergraduate and graduate courses.

[![CI](https://github.com/Gaganpraveen/cyberlab-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/Gaganpraveen/cyberlab-studio/actions/workflows/ci.yml)
[![Deploy](https://github.com/Gaganpraveen/cyberlab-studio/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/Gaganpraveen/cyberlab-studio/actions/workflows/deploy-pages.yml)
[![Code license: MIT](https://img.shields.io/badge/code-MIT-blue.svg)](LICENSE)
[![Content license: CC BY-SA 4.0](https://img.shields.io/badge/content-CC%20BY--SA%204.0-lightgrey.svg)](content/LICENSE.md)

</div>

## What it is

CyberLab Studio brings four things that normally live in separate tools into one
place:

- **Lessons** in the spirit of a good textbook or GeeksforGeeks article — the
  intuition, the mechanism, a worked example, common misconceptions, and
  sources you can check.
- **A linked glossary** so every term is one hover away from its definition,
  Wikipedia-style.
- **Graded challenges** with hints and automated checks, in the spirit of
  LeetCode / HackerRank.
- **Hands-on labs** where you carry out an attack end to end, watch what it
  does, build the defense, and re-run the attack to prove the defense holds.

The whole V1 is a static web app. There is no backend, no account, and no data
leaves your browser — which is exactly what makes the labs safe to run in a
classroom.

## The safety model (read this first)

Every lab runs **entirely inside the student's own browser tab**. Attacks only
ever reach fictional targets that the lab itself creates in memory:

- A real SQLite database compiled to WebAssembly, seeded with a made-up store.
- Sandboxed `<iframe>`s with no access to anything outside themselves.
- Deterministic, seeded simulations for systems you can't safely run for real
  (networks, availability under load, operating-system behavior).

Labs **never** accept a real URL, IP address, hostname, or credential as a
target, and the app makes no outbound network requests to carry out an attack.
Example names use the reserved `.test` / `.example` domains and the
documentation IP ranges. This is a tool for **understanding and defending**,
not for attacking anyone.

## Features

- **A topic map and coverage map**: 16 areas × 8 topics (128 in all), each
  with a lesson, its labs, mapped readings and the attack types it teaches.
  The coverage map shows at a glance how far each area is covered.
- **Lessons** with objectives, worked examples, animated protocol diagrams,
  a self-check quiz and cited sources. Every lesson starts as a draft until an
  instructor reviews it.
- **Attacks A to Z**: an index of 147 attack types in 15 categories, each
  linked to its lessons and labs and to its MITRE ATT&CK, CWE, CAPEC and
  OWASP identifiers.
- **A library** of textbooks, standards and open references, mapped down to
  the chapter for each topic, and a glossary of every term the lessons use.
- A calm, warm dark theme (with a light theme), a `Ctrl`/`Cmd`+`K` search
  palette, resizable lab panels, and a presenter mode for projectors.
- Built for accessibility: keyboard-navigable, reduced-motion aware, and
  checked against WCAG 2.2 AA.
- Progress saved in your browser, with export and import so nothing is tied to
  a server.
- **Desktop apps** for Windows, macOS and Linux with everything built in, for
  classrooms without reliable internet.

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix UI · hash-based routing
(works on static hosting, desktop, and offline). Labs use the WHATWG URL API,
Web Crypto, [sql.js](https://sql.js.org/), and sandboxed iframes — no attack
ever touches the network.

## Getting started

```bash
npm install
npm run dev        # start the dev server
```

Open the URL it prints. To build and preview the production bundle:

```bash
npm run build
npm run preview
```

### Scripts

| Script                  | What it does                                       |
| ----------------------- | -------------------------------------------------- |
| `npm run dev`           | Start the Vite dev server                          |
| `npm run build`         | Type-check and build to `dist/`                    |
| `npm run preview`       | Serve the production build locally                 |
| `npm run typecheck`     | `tsc --noEmit`                                     |
| `npm run lint`          | ESLint                                             |
| `npm run format`        | Format with Prettier                               |
| `npm run test`          | Run unit tests (Vitest)                            |
| `npm run test:e2e`      | Run end-to-end + accessibility tests               |
| `npm run check`         | Typecheck, lint, test, and build (CI parity)       |
| `npm run desktop:dev`   | Run the desktop app against the dev server         |
| `npm run desktop:build` | Build desktop installers for this computer         |
| `npm run desktop:icons` | Regenerate app icons from `src-tauri/app-icon.svg` |

## Project structure

```
content/          Lessons (Markdown); glossary, library and attack index (YAML) — CC BY-SA 4.0
docs/             Content- and lab-authoring guides
public/           Static assets
src/
  app/            App shell and router
  components/     Shared UI (design system, markdown renderer)
  content/        Catalog, schemas, and loaders for content
  features/       Pages (home, learn, labs, challenges, ...)
  labs/           One folder per lab: pure engine + tests + UI
  lib/            Storage, settings, progress, small utilities
src-tauri/        Desktop app (Tauri): window, icons, installer settings
tests/            Unit and end-to-end tests
```

Each lab keeps its **logic** (a pure, dependency-light TypeScript engine) apart
from its **UI**, and the engine is covered by deterministic tests — so a lab's
correctness never depends on the interface.

## Content and curriculum

Lessons are **original writing**, drafted from openly licensed or free sources
and citing each one. We do not copy commercial textbooks. Sources include the
UC Berkeley CS 161 textbook, OWASP, NIST publications, and MITRE ATT&CK; see
`NOTICE` for attribution and `docs/CONTENT_GUIDE.md` for how lessons are
written and reviewed. Every lesson starts as a `draft` until an instructor
reviews it.

## Deployment

- **Website:** pushed to `main`, the app deploys to GitHub Pages automatically
  (`.github/workflows/deploy-pages.yml`). Enable Pages once in
  **Settings → Pages → Build and deployment → GitHub Actions**.
- **Desktop apps:** pushing a version tag (`vX.Y.Z`), or running the
  **Desktop apps** workflow with _release_ ticked, builds Windows, macOS
  (universal) and Linux installers with [Tauri](https://tauri.app/) and
  attaches them to a draft GitHub Release for a maintainer to publish
  (`.github/workflows/desktop.yml`). Pull requests that change `src-tauri/`
  build the installers too and keep them with the run. The builds are not yet
  code-signed, so the release notes tell students how to open them the first
  time. To build locally you need [Rust](https://rustup.rs/) and the
  [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your
  system, then `npm run desktop:build`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md), [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md),
and [SECURITY.md](SECURITY.md).

## License

- **Code:** [MIT](LICENSE).
- **Educational content** under `content/`:
  [CC BY-SA 4.0](content/LICENSE.md).

## Responsible use

CyberLab Studio teaches offensive techniques so they can be understood and
defended against, within self-contained exercises. Use what you learn only
where you have explicit authorization. The labs are designed so there is
nothing here to point at a real system in the first place.
