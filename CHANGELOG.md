# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project aims
to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Project foundation: React 19 + TypeScript + Vite, Tailwind CSS v4 dark/light
  theme, hash routing, command palette, and the 128-topic catalog with a
  searchable topic map.
- Reference lab: Unicode homograph investigation (character inspector,
  Punycode decoding, and a build-your-own detection rule with a confusion
  matrix).
- Reference lab: SQL injection attack-and-fix, using a real in-browser SQLite
  database (sql.js), with a parameterized-query defense and an automated
  grading battery. Covered by deterministic unit tests.
- Lesson and lab authoring guides, content and lab schemas, and the glossary
  and library loaders.
- Repository engineering: MIT code license, CC BY-SA 4.0 content license,
  NOTICE, CI (format, lint, type-check, test, build), and a GitHub Pages
  deployment workflow.
- Lessons for the curriculum, written from open textbooks and standards, each
  with objectives, a worked example, a quiz and cited sources, and marked as a
  draft until an instructor reviews it. Animated sequence diagrams for
  protocol flows.
- Attacks A to Z: 147 attack types in 15 categories with their lessons, labs
  and MITRE ATT&CK, CWE, CAPEC and OWASP identifiers.
- The library: textbooks, standards and open references mapped to topics down
  to the chapter, with access and license labels.
- The glossary, labs, challenges, progress, settings and about pages.
- A coverage map of all 128 topics by lessons, labs, readings and attack types.
- Desktop apps for Windows, macOS and Linux (Tauri), built by a release
  workflow. External links open in the system browser.

### Changed

- The first download is about a third of its former size: lesson bodies, the
  search index and the Markdown renderer load on demand.
- Search ranks whole-word matches first.

[Unreleased]: https://github.com/Gaganpraveen/cyberlab-studio/commits/build/v1
