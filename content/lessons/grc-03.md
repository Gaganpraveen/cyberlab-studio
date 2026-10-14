---
topicId: GRC-03
title: Privacy engineering and data minimization
summary: Why privacy risk can arise even when a system is perfectly secure, and how privacy engineering reduces it by collecting, keeping and sharing only the personal data a stated purpose needs.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish privacy risk from cybersecurity risk and give an example of each.
  - Build a data inventory that ties every personal data element to a purpose, an audience and a retention period.
  - Apply minimization techniques, from not collecting to aggregating, to a toy architecture and state what risk each leaves.
  - Explain why hashing or pseudonymizing an identifier does not make data anonymous.
  - Write testable privacy requirements, such as a retention rule that a query can check.
prerequisites: [GRC-01, GRC-02, FND-01]
concepts: [data-minimization, privacy-by-design, pii, de-identification]
labs: []
keywords:
  - privacy engineering
  - data minimization
  - privacy by design
  - privacy by default
  - PII
  - personal data
  - pseudonymization
  - anonymization
  - de-identification
  - re-identification
  - quasi-identifier
  - data inventory
  - data mapping
  - retention schedule
  - NIST Privacy Framework
  - NIST IR 8062
  - predictability manageability disassociability
  - problematic data action
  - privacy impact assessment
  - PIA
sources:
  - title: 'NIST Privacy Framework: A Tool for Improving Privacy through Enterprise Risk Management, Version 1.0'
    url: https://www.nist.gov/privacy-framework/privacy-framework
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-privacy-framework
  - title: 'NIST IR 8062: An Introduction to Privacy Engineering and Risk Management in Federal Systems'
    url: https://csrc.nist.gov/pubs/ir/8062/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'NIST SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-53
  - title: 'NIST SP 800-53B: Control Baselines for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
quiz:
  - question: A study-room booking app is fully patched, encrypts its database and has never been breached. It records every student's home address, which it never uses. Which statement is most accurate?
    choices:
      - There is no privacy risk, because the data is secure.
      - The app has a privacy risk that security controls do not remove, since the collection itself has no purpose and adds harm if anything goes wrong.
      - The only fix is stronger encryption.
      - Privacy risk exists only after a breach has happened.
    answer: 1
    explanation: Privacy risk comes from processing, not only from attacks. Collecting data with no purpose creates exposure in breaches, records requests and misuse, and the cheapest fix is to stop collecting it. Encryption protects confidentiality but does not answer whether the data should exist.
  - question: Student ID numbers at a college are eight digits. A team replaces each ID with its SHA-256 hash and calls the data anonymous. What is the problem?
    choices:
      - SHA-256 is too slow for large tables.
      - Hashes are longer than IDs, so storage costs rise.
      - Anyone can hash all 100 million possible IDs and match them, so the hashes are just another identifier.
      - Hashing is reversible with the right key.
    answer: 2
    explanation: A hash hides an identifier only when the input space is too large to enumerate. Eight digits give 100 million possibilities, which a laptop can hash quickly. The result is pseudonymous at best, and linkable across datasets that use the same hash.
  - question: Which change best serves the privacy engineering objective of disassociability for a room-booking service?
    choices:
      - Storing bookings under a per-application identifier from single sign-on instead of the student's campus ID and name.
      - Publishing a longer privacy notice.
      - Letting students download a copy of their bookings.
      - Encrypting backups with a stronger key.
    answer: 0
    explanation: Disassociability means processing data without tying it to individuals beyond what the system needs. A per-application identifier lets the service work while keeping names and campus IDs out of its database. The notice serves predictability, downloads serve manageability, and encryption serves confidentiality.
  - question: A department deletes booking rows after 30 days, but nightly database backups are kept for a year. What does this mean for its retention promise?
    choices:
      - The promise is met, because backups do not count as records.
      - The promise is met as long as the backups are encrypted.
      - Retention should be shortened to one day to compensate.
      - The data still exists for up to a year, so the promise must cover backups too, through shorter backup retention or a documented exception.
    answer: 3
    explanation: Minimization covers every copy, including backups, logs, exports and caches. A retention rule that ignores backups overstates what has been deleted. Either align backup retention or state the exception honestly.
  - question: Why is "we might need it later" a weak reason to collect a data element?
    choices:
      - It ties collection to no stated purpose, so the data adds risk now for a benefit nobody can describe.
      - Future needs are always met by buying data from vendors.
      - It is illegal to plan for future needs.
      - Storage is too expensive to keep extra fields.
    answer: 0
    explanation: Purpose specification is the anchor of minimization. Speculative fields enlarge breach impact, records requests and misuse risk today. If a real need appears later, the team can justify and add collection then.
---

## Why it matters

Most privacy harm in campus systems does not need an attacker. A booking app asks for a date of birth it never uses, a help-desk form copies student IDs into a spreadsheet that lives forever, and an analytics script on a course page sends every click to a third party. Each system works exactly as built, and each creates risk for the people whose data it holds.

Every data element you collect becomes something you must protect, explain, produce when someone asks for their records, and report if it leaks. Data you never collect cannot be breached, subpoenaed or misused. That makes data minimization unusual among controls. It lowers the [[impact]] of many risks at once, it removes the [[likelihood]] of misuse entirely for data that is never collected, and it shrinks the scope of laws such as [[ferpa]] that attach duties to the records you hold ([GRC-04](lesson:GRC-04)).

Privacy engineering treats these choices as design requirements with owners and tests, not as a privacy page written after launch. NIST supports this work with the Privacy Framework (Version 1.0), a voluntary tool for improving privacy through enterprise risk management, and with NIST IR 8062, which set out the basis for a common vocabulary in privacy engineering.

## The core idea

Start by separating privacy from security. Security asks whether unauthorized parties can read, change or disrupt data. Privacy asks whether a given processing of personal data should happen at all, in what form, and with what effect on the people involved. A system can be perfectly secure and still harm privacy, for example by tracking students' locations more precisely than any purpose needs.

NIST IR 8062 pictures security and privacy as overlapping domains. Security risk concerns unauthorized activity and losses of confidentiality, integrity or availability. Privacy risk can also arise from processing that is fully authorized: a data action that causes a problem for individuals, which IR 8062 calls a problematic data action. Its examples of such problems include embarrassment or distress, economic loss, discrimination and stigma, and a chilling effect on ordinary behavior. The overlap holds events that are both, such as a breach of student records.

NIST IR 8062 gives privacy engineering three objectives. You can think of them as privacy's counterpart to the [[cia-triad]]:

- **Predictability:** people, owners and operators can rely on accurate assumptions about what happens to personal data.
- **Manageability:** personal data can be administered at a fine grain, including correction, deletion and selective disclosure.
- **Disassociability:** data or events can be processed without being tied to individuals or devices beyond what the system's operation needs.

Two principles turn these objectives into design habits. [[data-minimization|Data minimization]] means collecting, using, keeping and sharing only the [[pii|personally identifiable information (PII)]] that a stated purpose needs. [[privacy-by-design|Privacy by design]] means making those decisions at design time, and making the protective choice the default rather than an option users must find.

A coat check is a good model of disassociability. The attendant hands you a numbered ticket and returns your coat when you show it, without ever learning your name. The service works, and the record it keeps links to a token, not to you.

## How it works

### Start from purpose: the data inventory

Minimization begins with an inventory. For every data element, record the purpose it serves, who can see it, where it is stored and copied, how long it is kept, and who it is shared with. An element with no purpose is a candidate for deletion. An element with a purpose still needs the least precise, shortest-lived form that serves it. The inventory is also where IR 8062's risk model starts, because each data action the system performs is assessed for the problems it could cause.

### A ladder of minimization techniques

| Technique | What it does | Campus example | What remains |
| --- | --- | --- | --- |
| Do not collect | Remove the field or the flow | No date of birth for room booking | A future purpose must be justified anew |
| Coarsen | Keep a less precise value | Class year, not birth date; building, not GPS point | Combinations can still single people out |
| Use and discard | Process transiently, store only the result | Check eligibility, store "eligible: yes" | Logs may capture the input |
| Pseudonymize | Replace identifiers with tokens, key held elsewhere | Per-application identifier from single sign-on | Whoever holds the key can re-identify |
| Aggregate | Keep counts instead of rows | Hourly room-usage totals | Very small counts can reveal individuals |
| Limit retention | Delete on a schedule | Bookings deleted after 30 days | Backups and exports keep copies |
| Limit access and sharing | Fewer people and processors see it | No third-party analytics script | Authorized insiders remain |

The techniques stack. A system might stop collecting some fields, pseudonymize the rest, aggregate for reporting and delete the raw rows quickly.

### De-identification is harder than it looks

[[de-identification|De-identification]] removes or transforms identifiers so that data is no longer reasonably linkable to a person. The difficulty is that identity leaks through combinations. Fields that look harmless alone, such as major, class year and residence hall, can together single out one student. These are called quasi-identifiers, and joining them with another dataset is a linkage attack.

Pseudonymization is not anonymization. A token that stays the same over time lets anyone holding two datasets link them, and a [[hash-function|hash]] of a small identifier space is reversible by brute force: hash every possible value and compare. Aggregation helps but must suppress or blur small counts. Formal methods such as [[differential-privacy]] add calibrated noise to give a provable bound on what any output reveals about one person.

### Privacy by default

Defaults decide what most people experience, because few change them. Optional fields should start empty and be clearly optional. Retention should default to the shortest period that serves the purpose. A short, honest [[privacy-notice]] supports predictability by telling people what is collected and why. In control catalogs, SP 800-53 Rev. 5 devotes a family to PII Processing and Transparency (PT), and SP 800-53B adds a privacy baseline that applies whatever a system's impact level.

## Worked example

The library is launching StudyRoom, a booking service at `rooms.college.test`. Its purposes are to let students book rooms, to contact a booker if a room is left damaged, and to report room usage to the library each semester. The first design collects everything the developers could think of.

```sql
-- First design: one table holds everything, kept forever
CREATE TABLE bookings (
  id            INTEGER PRIMARY KEY,
  student_id    TEXT,      -- 8-digit campus ID
  full_name     TEXT,
  date_of_birth DATE,
  phone         TEXT,
  home_address  TEXT,
  major         TEXT,
  room          TEXT,
  starts_at     TIMESTAMP,
  client_ip     TEXT,
  user_agent    TEXT
);
-- Every page also loads a third-party analytics script.
```

**Step 1: inventory against purpose.**

| Element | Purpose it serves | Decision |
| --- | --- | --- |
| Campus ID, full name | Identify the booker | Replace with a per-application identifier from single sign-on |
| Date of birth, home address, major | None | Do not collect |
| Phone | Contact after damage | Do not store; staff look it up in the directory, under its own access rules, only when needed |
| Room, start time | Core service | Keep for 30 days, then delete |
| Client IP, user agent | Abuse investigation | Keep in web logs for 14 days; not in the bookings table |
| Analytics script | None stated | Remove; usage reports come from aggregates |

**Step 2: redesign the data flow.** The sequence below shows the new flow. Single sign-on tells StudyRoom only a stable per-application identifier, the database stores bookings under that identifier, the third-party tracker is gone, and a nightly job keeps hourly counts before old rows are deleted.

```sequence
title: StudyRoom after minimization
participant S as Student browser
participant IDP as Campus SSO
participant APP as rooms.college.test
participant DB as Bookings database
participant AN as Third-party analytics
S -> IDP: Sign in
IDP --> APP: Per-application identifier, no name
S -> APP: Book Room 3, 2 to 4 p.m.
APP -> DB: Store identifier, room, time
APP -x AN: Analytics script removed
note DB: Nightly: count by hour, delete rows over 30 days
```

**Step 3: rewrite the schema.**

```diff
- student_id TEXT, full_name TEXT, date_of_birth DATE,
- phone TEXT, home_address TEXT, major TEXT,
- client_ip TEXT, user_agent TEXT,
+ user_ref TEXT NOT NULL,     -- per-application SSO identifier
  room TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
+ delete_after TIMESTAMP NOT NULL  -- starts_at + 30 days
+ -- separate table: hourly_usage(room, hour, bookings)
```

**Step 4: write testable requirements.** "No booking row is older than 30 days" is checked by a scheduled query that must return zero rows. "The bookings table holds no name, campus ID or contact data" is checked against the schema in each release. "Hourly totals below five are reported as 'fewer than 5'" protects the semester report.

**Step 5: compare the breach impact.** A stolen copy of the first design reveals names, birth dates, home addresses and every booking ever made. A stolen copy of the second reveals opaque identifiers and a month of room times. Identifying anyone would also require the SSO provider's records. The risk did not vanish, but its impact dropped sharply.

## In practice

- **Review at design time.** Many institutions run a privacy impact assessment (PIA) before launch. It is cheapest when the schema is still a whiteboard sketch.
- **Cover every copy.** Minimization applies to logs, backups, analytics, exports, test databases and spreadsheets, not just the main table. Use synthetic data for testing instead of copies of real records.
- **Balance against security needs.** Incident response wants logs, and minimization wants less data. Settle the conflict explicitly with a short retention period and narrow access, and write the decision down.
- **Treat "anonymous" as a claim that needs evidence.** Before calling a dataset anonymous, ask what other data an attacker could join to it.
- **Watch purpose creep.** A dataset collected for room booking should not quietly become an attendance tracker. A new purpose deserves a new review.
- **Limits.** Minimization cannot fix a purpose that is itself harmful, and too little data can hurt accessibility or fairness checks. Some harms come from inferences drawn from data that looked innocent.

## Common misconceptions

- **"Privacy is part of security, so secure systems are private."** Security protects data from unauthorized use; privacy also questions authorized use.
- **"If it is encrypted, collecting it is harmless."** Encryption protects data while it is stored or sent, not while the application uses it. The data can still be misused by authorized users, demanded in legal processes, or decrypted by a compromised application.
- **"Hashing an ID makes it anonymous."** Small identifier spaces can be enumerated, and a stable hash is a linkable identifier.
- **"We might need it later."** Speculative collection is a common source of over-collection. Collect when the need exists and can be stated.
- **"Deleting the row deletes the data."** Backups, logs, replicas and exports keep copies until their own retention ends.

## Try it yourself

On paper, reduce unnecessary collection in this toy architecture. The Room 214 lab from [GRC-01](lesson:GRC-01) adds a check-in kiosk. Students swipe their ID card. The kiosk stores the card number, name and ID photo, the time in and out, the workstation used, and a webcam snapshot. It emails a daily spreadsheet to three staff members and keeps everything indefinitely. The stated purposes are to staff the desk based on occupancy, to admit only enrolled students after 10 p.m., and to find who used a workstation if it is damaged.

1. **Inventory.** List every data element and copy, including the spreadsheet emails.
2. **Tie to purpose.** Mark each element with the purpose it serves, or "none."
3. **Minimize.** Choose a technique from the ladder for each element and state what risk remains.
4. **Redraw.** Sketch the new data flow, and write a retention rule for each store, including the email copies.
5. **Test.** Write two requirements that a check could confirm, such as a query or a schema review.
6. **Explain.** Draft a two-sentence notice for the kiosk screen that tells students what is kept and for how long.

## Key takeaways

- Privacy risk comes from data processing itself, so a secure system can still create privacy harm.
- Tie every data element to a purpose, then keep the least precise, shortest-lived form that serves it.
- Pseudonymized or hashed identifiers are still linkable. De-identification needs evidence, not labels.
- Minimization covers every copy: logs, backups, exports and test data.
- Testable requirements, such as a retention query that must return nothing, make privacy part of engineering.

## Go deeper

- [NIST IR 8062](https://csrc.nist.gov/pubs/ir/8062/final) defines the three privacy engineering objectives and a privacy risk model built on data actions that can cause problems for individuals. Compare its objectives with the CIA triad.
- The [NIST Privacy Framework](https://www.nist.gov/privacy-framework/privacy-framework) Version 1.0 (2020) is the current final version; a Version 1.1 draft was released for public comment in April 2025 and has not yet been finalized. Its resource repository collects crosswalks, profiles and tools.
- Open question: how should an institution measure re-identification risk for a dataset it shares with researchers, when it cannot know every dataset the recipient might join?
