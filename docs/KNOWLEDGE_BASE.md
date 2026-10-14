# Knowledge base: library sources and access tiers

[`content/library/sources.yaml`](../content/library/sources.yaml) is the
course reading list, mapped to curriculum domains and topics and loaded by
`src/content/library.ts`. A source's `access` tier decides what CyberLab may
do with it, including whether a future AI tutor may add it to its index.

Last full verification: 2026-10-14. 70 sources: 36 open, 14 free, 20 paid.

## Entry conventions

- `id` is stable kebab-case with no edition or year, so links survive.
- `year` is the copyright year printed for a book ("Published 20 June 2025
  © 2026" is 2026), or the publication year for standards and online material.
- `url` is the publisher's product page or the official page, `https` only,
  never a pirated copy or unofficial PDF. `verifiedFrom` is the page actually
  opened. `isbn` is ISBN-13 digits in quotes, print edition when one exists.
- `topics` lists only topics the source covers in depth. Omit any optional
  field you cannot verify. Never guess.
- Order: by `kind` (textbook, book, course-notes, standard, framework, guide,
  reference), then by importance for a US intro or undergraduate course.

## Access tiers

| Tier   | Link           | Quote             | Adapt into lessons | Tutor index        |
| ------ | -------------- | ----------------- | ------------------ | ------------------ |
| `open` | Yes            | Yes, attributed   | Under its license  | Yes                |
| `free` | Yes            | Short, attributed | No                 | No                 |
| `paid` | Publisher page | No                | No                 | Local-only, future |

**open**: openly licensed, for example CC BY-SA 4.0, CC BY, Apache 2.0, US
Government works, or the MITRE and IETF terms. May be linked, quoted with
attribution, adapted under the license terms, and later ingested into the
tutor index. Each indexed chunk keeps its source `id`, title, URL, license,
and attribution line.

**free**: free to read, all rights reserved (no license stated, or terms that
bar redistribution). Link and short attributed quotes only. Never copy its
text into `content/`, cache it, or ingest it.

**paid**: recommended reading with a publisher link only. No excerpts, scans,
uploads, or chapter summaries. In a future local-only mode, an instructor may
use a personally owned copy privately on their own machine. That copy and its
index never leave the machine: they are never committed, uploaded, synced,
shared, or redistributed.

## Licenses that need care

- **CC BY-NC-SA 4.0** (`seed-labs`): `content/` is CC BY-SA 4.0 and cannot
  absorb non-commercial terms. Link and quote only; index it only in a
  separately tagged, non-commercial index that is off by default.
- **CC BY-NC-ND 4.0** (`rosulek-joy-of-cryptography`): no shared adaptations, so `free`.
- **IETF RFCs**: verbatim copies and attributed excerpts only; never alter RFC
  text. Code components are Revised BSD. RFC 3492 (2003) carries the Internet
  Society notice; keep it with any copy.
- **Unicode**: UTS #39 and #46 text is under the Unicode Terms of Use (no
  public redistribution), so both are `free`. Their data files, such as
  `confusables.txt`, use the Unicode License v3; labs may bundle them once
  that notice is added to `NOTICE`.
- **NIST**: works by NIST employees are not subject to US copyright, and NIST
  grants reprint and derivative rights abroad. Cite the publication, add
  "Republished courtesy of the National Institute of Standards and
  Technology.", and skip material marked as third-party. Some listed
  publications have non-NIST co-authors; if anyone asserts rights, move that
  entry to `free`.
- **MITRE** (ATT&CK, CWE, CAPEC, D3FEND): royalty-free license; every copy,
  indexed chunks included, must carry MITRE's copyright designation and the
  license text. ATLAS data is Apache 2.0 from `mitre-atlas/atlas-data`.
- **CC BY 3.0 US** (`mit-6566-computer-systems-security`): the course site's
  license badge covers its notes; the assigned papers are link-only.
- **MDN**: CC BY-SA 2.5 or later (reuse under 4.0); credit "Mozilla Contributors".
- **OWASP Top 10:2025**: some page footers say CC BY 3.0, but the About page
  and repository say CC BY-SA 4.0. Follow CC BY-SA 4.0.
- **Curricula** (`csec2017`, `acm-cs2023`): all rights reserved, but use for
  developing educational materials is permitted. Map coverage; never copy text.
- **Unverified** (`cs50-cybersecurity`): link only until its license is recorded.

## Attribution rules

- Credit with TASL: title, author, source link, and license with its link.
  For adapted text, also say what changed ("Adapted from ...; condensed and
  reworded.").
- In lesson frontmatter, list the source with `title`, `url`, `publisher`,
  `license`, and `sourceId` set to the library `id`.
- Quotes take quotation marks and a citation. From `free` sources, keep them
  to a sentence or two, and only where the exact wording matters.
- Tutor answers built on indexed text show each source's title, link, and license.
- **ShareAlike.** Lesson text adapted from a CC BY-SA source must stay
  CC BY-SA 4.0. Keep it in `content/`, never in MIT-licensed files such as
  `src/`, lab code, or UI strings. Add no restrictions, such as DRM or extra
  terms, to pages that show it. Anyone who reuses those lessons inherits
  ShareAlike. Never mix CC BY-SA and CC BY-NC-SA text in one passage.
- Explaining an idea in your own words is not adaptation. A close paraphrase
  that follows a source's structure or examples is; attribute it as adapted.

## Adding the course's assigned textbook

1. Open the publisher's product page for the exact edition the course uses,
   and copy the title, authors, edition, copyright year, and print ISBN-13.
2. Search `sources.yaml` for the title. If it is listed, update `edition`,
   `year`, `isbn`, and `verifiedFrom` and keep the `id`. Otherwise add an
   entry at the top of the textbook section:

   ```yaml
   - id: author-short-title
     title: 'Full Title: Subtitle'
     authors: [First Author, Second Author]
     edition: '3rd'
     year: 2026
     publisher: 'Publisher'
     url: 'https://<publisher product page>'
     isbn: '<13 digits>'
     kind: textbook
     access: paid
     license: 'All rights reserved'
     level: [undergrad]
     domains: [FND, NET]
     topics: [FND-01, NET-05]
     why: 'Assigned textbook for <COURSE> (<term>); chapters 1-8 follow the schedule.'
     use: 'Recommended reading only: link to the publisher page; no quotes, uploads, or ingestion.'
     verifiedFrom: 'https://<publisher product page>'
   ```

3. Use `access: open` only if the publisher states an open license. A free
   PDF is not an open license.
4. Map only topics with a chapter or major section in the book, and list each
   topic's domain in `domains`.
5. Never commit the book's files, scans, or excerpts; a personal copy stays
   outside the repository. Then run `npm run test`, which checks the schema,
   unique ids, `https` URLs, and that every domain and topic id exists.

## Re-verifying each term

When textbook orders are due, open each `url` and confirm the edition,
copyright year, and ISBN, then search for a newer edition. Update `edition`,
`year`, `isbn`, and `verifiedFrom` together, and keep the `id`. For NIST,
read the CSRC page's status and document history; for RFCs, the "Obsoleted
by" and "Updated by" lines. Check OWASP, MITRE (ATT&CK ships about twice a
year), Unicode (each September), and CompTIA for new releases. Confirm every
`open` license still applies; if one changes, update the entry and remove
that source's chunks from the tutor index. Then update the verification date
here and in the YAML header.

Watch list as of 2026-10-14: Security+ V8 (SY0-801) launches November 17,
2026, and English SY0-701 retires June 11, 2027. Still drafts: NIST Privacy
Framework 1.1, SP 800-218 Rev. 1 (SSDF 1.2), and NIST IR 8547. The AI RMF is
under revision, OWASP WSTG v5 is in development, and FIPS 203 has a planned
correction. Shostack's _Threat Modeling_, 2nd ed. (Wiley), is listed for
February 2027. Verified but not yet listed: RFC 9700 (OAuth 2.0 Security BCP)
and Nelson et al., _Guide to Computer Forensics and Investigations_, 7th ed.
