---
topicId: OPS-01
title: Security logging and telemetry design
summary: Learn to decide which security events a system should record, which fields each record needs, what must never be written to a log, and how to move, protect, and retain logs so they can answer an investigator's questions.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Distinguish events, security logs, and telemetry, and name the main telemetry sources in an organization.
  - Select security-relevant events for a system by starting from the questions an investigation must answer.
  - Design a structured log record with when, where, who, what, and outcome fields and a UTC timestamp.
  - Identify data that must be excluded, masked, or pseudonymized in logs, and justify each choice.
  - Explain how forwarding, integrity protection, and retention decide what defenders can prove later.
prerequisites: [FND-01, FND-02]
concepts: [security-log, telemetry, log-retention, log-injection]
labs: [detection-rule-builder]
keywords:
  - logging
  - log management
  - audit log
  - audit trail
  - event logging
  - structured logging
  - log pipeline
  - log forwarding
  - time synchronization
  - UTC
  - ISO 8601
  - NIST SP 800-92
  - SP 800-92 Rev. 1
  - OMB M-21-31
  - PR.PS-04
  - DE.CM
  - CWE-117
  - CWE-532
  - T1685
  - T1070
sources:
  - title: 'NIST SP 800-92: Guide to Computer Security Log Management'
    url: https://csrc.nist.gov/pubs/sp/800/92/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-92
  - title: 'NIST SP 800-92 Rev. 1 (Initial Public Draft): Cybersecurity Log Management Planning Guide'
    url: https://csrc.nist.gov/pubs/sp/800/92/r1/ipd
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: Best Practices for Event Logging and Threat Detection
    url: https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection
    publisher: "Australian Signals Directorate's ACSC, with CISA, FBI, NSA, and international partners"
  - title: OWASP Logging Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'CISA and FBI Advisory AA23-193A: Enhanced Monitoring to Detect APT Activity Targeting Outlook Online'
    url: https://www.cisa.gov/sites/default/files/2023-07/aa23-193a_joint_csa_enhanced_monitoring_to_detect_apt_activity_targeting_outlook_online.pdf
    publisher: Cybersecurity and Infrastructure Security Agency (CISA) and FBI
    license: TLP:CLEAR (distribution not limited)
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
quiz:
  - question: The security team at shop.example wants to investigate suspected account takeovers. Which logging design supports that best?
    choices:
      - Log every HTTP request body in full, so nothing is ever missed.
      - Log sign-in, MFA, password-reset, and email-change events with a user ID, source IP, UTC time, and outcome.
      - Log only failed sign-ins, because successful ones are normal activity.
      - Keep logs only on each web server, so the evidence stays close to where it was created.
    answer: 1
    explanation: Start from the question. A takeover ends in a successful sign-in followed by account changes, so success events and change events matter as much as failures. Full request bodies capture passwords and card numbers, and logs that stay on the server can be deleted by whoever controls it.
  - question: A developer replaces customer email addresses in logs with their unkeyed SHA-256 hashes and calls the logs anonymous. What is the main problem?
    choices:
      - SHA-256 is too slow to run inside a logging pipeline.
      - Hashed values can no longer be matched across events.
      - Anyone with a list of candidate addresses can hash each one and find the matches, so the addresses are not really hidden.
      - Hashing breaks the log store's integrity checks.
    answer: 2
    explanation: Email addresses come from a guessable space, so an unkeyed hash can be reversed by hashing candidates. A keyed hash such as HMAC, with the key held outside the logging system, keeps the ability to correlate while blocking that guessing. Even then the value is pseudonymous personal data, not anonymous data.
  - question: For what looks like one session, web-01 logged 09:12:03 and the VPN gateway logged 13:12:05. What is the most likely cause, and the fix?
    choices:
      - The systems record local time in different zones or with unsynchronized clocks; record UTC in ISO 8601 from synchronized clocks.
      - The VPN gateway is under attack and should be blocked.
      - The central log store is dropping events and needs a longer retention period.
      - One of the logs has been tampered with and should be deleted.
    answer: 0
    explanation: A four-hour gap of almost exactly whole hours points to time zones (for example US Eastern daylight time versus UTC), not an attack. Correlation across sources only works when every record carries an unambiguous time from a synchronized clock.
  - question: An intruder gains administrator rights on a server and wants to hide what they did. Which design best preserves the evidence?
    choices:
      - Make local log files larger so they rotate less often.
      - Write logs in a binary format that is harder to read.
      - Compress and rotate the logs every hour.
      - Forward each event off the host within seconds to a store the server's administrators cannot change, and alert when the source goes quiet.
    answer: 3
    explanation: Whoever controls a host controls its local logs; MITRE ATT&CK documents adversaries clearing and disabling logs. Records already forwarded to a separately administered store survive, and a sudden silence from a source is itself a useful signal.
  - question: Why might an attacker put a line-break character into the username field of a login form whose failures are written to a plain-text log?
    choices:
      - To make the username long enough to bypass a length check.
      - To start a new line that looks like a separate, legitimate log entry and mislead investigators.
      - To make the log file unreadable by encrypting it.
      - To make the log store run out of retention space.
    answer: 1
    explanation: This is log injection (CWE-117). If input is written to a text log without neutralizing carriage returns and line feeds, the attacker controls what appears to be a whole new record. Encode or strip those characters, or use a structured format whose encoder escapes them.
---

## Why it matters

When something goes wrong, the first questions are always the same: who did it, from where, when, to what, and did it work? A system can answer those questions only if someone decided, in advance, to record the right events with the right details. Logging is a design decision made long before the incident it is supposed to explain.

In mid-June 2023, a US federal civilian agency noticed `MailItemsAccessed` events in its Microsoft 365 audit logs that came from an application identifier that did not normally read mail in its environment. That anomaly led defenders to an intrusion into cloud email by an advanced persistent threat actor. The joint advisory from CISA and the FBI credits the discovery to enhanced logging of exactly those events and to the agency's baseline of normal activity. It urges organizations to enable audit logging and recommends a premium audit tier that, at the time, required G5 or E5 licensing ([AA23-193A](https://www.cisa.gov/sites/default/files/2023-07/aa23-193a_joint_csa_enhanced_monitoring_to_detect_apt_activity_targeting_outlook_online.pdf)). An organization without those records had nothing comparable to search.

The opposite failure is just as real. A log that captures passwords, session tokens, or card numbers turns a monitoring system into a store of secrets; MITRE's weakness list names it CWE-532, "Insertion of Sensitive Information into Log File." Good telemetry design sits between these two failures: record enough to answer the questions, and nothing that would cause harm if the logs leaked.

## The core idea

An **event** is anything observable that happens on a system or network: a sign-in, a process starting, a firewall dropping a packet. A [[security-log]] is a time-ordered record of security-relevant events, written by an operating system, application, network device, or security tool. [[telemetry]] is the broader stream of data that systems send out for monitoring: log records, plus network flow summaries, endpoint sensor events, and health metrics. NIST's draft revision of its log management guide defines log management as "the process for generating, transmitting, storing, accessing, and disposing of log data" ([SP 800-92 Rev. 1 draft](https://csrc.nist.gov/pubs/sp/800/92/r1/ipd)). Each of those five verbs is a design choice.

An analogy helps. A building's visitor book does not stop a burglar, but it lets you answer who came in, when, and through which door. A book that records only the weather is useless, and one that asks every visitor to write down the alarm code is dangerous. The design question is never "what can we record?" It is "what will we need to show later, and to whom?"

Three assumptions shape every design:

1. **Logs are written by systems an attacker may control.** An intruder with administrator rights on a host can change or delete that host's local logs.
2. **Clocks disagree.** Systems run in different time zones and their clocks drift, so timestamps are only comparable if they are made comparable.
3. **Storage and attention are limited.** Every event costs money to move, store, and search, and every noisy event costs analyst time.

The method follows from these. List the questions, choose the events that answer them, define the fields each event needs, strip what must not be kept, then protect the pipeline and keep the data for a deliberate period. The [[nist-csf]] 2.0 states the goal as outcome PR.PS-04, "Log records are generated and made available for continuous monitoring," which feeds the Detect function's continuous monitoring category (DE.CM).

## How it works

### Telemetry sources

No single source answers every question. An identity log shows that alice signed in; only the endpoint log shows what ran afterward, and only the network log shows where data went.

| Source                    | Example events                                              | Question it answers                         |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| Identity and sign-in      | Sign-in success and failure, MFA prompts, password resets   | Who authenticated, from where, and how?     |
| Endpoints and servers     | Process creation with command line, logons, new services    | What ran on this machine, and who ran it?   |
| Network                   | Firewall decisions, DNS queries, proxy requests, flow data  | Which hosts talked, and how much?           |
| Applications              | Admin actions, access-control denials, data exports         | What did the user do inside the app?        |
| Cloud control plane       | API calls that create users, change policies, share storage | Who changed the infrastructure?             |
| Security tools            | Intrusion detection alerts, endpoint and antivirus alerts   | What did our sensors already flag?          |

### Choosing events

The OWASP Logging Cheat Sheet gives a strong default list for applications: authentication successes and failures, authorization (access-control) failures, session management failures such as invalid tokens, input validation failures, application errors and startup or shutdown, and higher-risk actions such as privilege changes, administrator activity, and access to sensitive data. Two points are easy to miss. Success events matter as much as failures, because an account takeover ends with a successful sign-in. And changes to security settings themselves, such as removing MFA or turning off logging, deserve their own events.

### Designing the record

OWASP frames each record as answering when, where, who, and what:

- **When:** the time the event happened, in Coordinated Universal Time (UTC), in ISO 8601 format with milliseconds, such as `2026-10-14T13:12:03.418Z`, from a clock synchronized to a trusted time source. The joint guidance led by the Australian Signals Directorate (ASD), with CISA, the FBI, and the NSA, recommends exactly this. Also record when the collector received the event, so delays become visible.
- **Where:** host, service, application, and environment (production or test).
- **Who:** a stable internal user ID rather than a display name, the source IP address, and a request or session reference that links related events without exposing the session secret.
- **What:** event type, action, target object, outcome (success or failure), and a reason code.

Write records as structured key-value data, often JSON, instead of free-text sentences; the joint guidance also prefers key-value pairs. Named fields parse reliably, can be searched by name, and are escaped by the encoder.

### Keeping secrets out

| Data                                                        | Handling                                                  |
| ----------------------------------------------------------- | --------------------------------------------------------- |
| Passwords, including failed attempts                        | Never log                                                 |
| Session IDs, access tokens, API keys, password-reset links  | Never log; log a token ID or keyed hash instead           |
| Encryption keys and database connection strings             | Never log                                                 |
| Payment card and bank account numbers                       | Never log; at most the last four digits                   |
| Email addresses, names, and other personal data             | Only when the purpose requires it; prefer internal IDs    |
| Full request and response bodies                            | Not by default; they mix every item above                 |

To link events about the same value without storing the value, use a keyed hash such as an [[hmac]], with the key held outside the logging system. A plain hash of an email address is not anonymous: anyone with a list of candidate addresses can hash each one and look for matches. Even keyed values are pseudonymous personal data, so access and retention rules still apply. Recording only what a stated purpose needs is [[data-minimization]].

### Moving, protecting, and keeping logs

```sequence
title: A failed sign-in becomes a protected log record
participant U as alice
participant L as login.shop.example
participant F as Log forwarder
participant C as Central log store
U -> L: POST /login (wrong password)
L --> U: 401 Unauthorized
note L: Writes JSON event, no password, UTC time
L -> F: auth.login outcome=failure
F -> C: Batch over TLS, with sequence numbers
C --> F: Acknowledged, stored append-only
note C: Searchable 12 months, archived 18 more
```

The diagram follows one event. The login service writes a structured record without the password, a forwarder ships it within seconds over an encrypted channel, and the central store keeps it where the web servers cannot edit it. Sequence numbers let the store notice missing batches.

- **Forward quickly.** Records that leave the host before an intruder arrives survive the intrusion. Local buffering covers network outages.
- **Protect integrity.** [[mitre-attack]] documents adversaries clearing Windows event logs (T1685.005) and disabling or modifying cloud logs (T1685.002) under its Defense Impairment tactic, and deleting selected artifacts under Indicator Removal (T1070). Store logs centrally under separate administration, restrict and monitor who can read them, prefer append-only storage, and alert when a source goes quiet. A gap is evidence too.
- **Neutralize [[log-injection]].** If an application writes user input straight into a text log, an attacker can include a line break and forge what looks like a separate record (CWE-117, "Improper Output Neutralization for Logs"). Encode or strip carriage returns and line feeds, or let a JSON encoder escape them.
- **Retain on purpose.** [[log-retention]] is how long each class of log is kept searchable, then archived, then deleted. The joint guidance warns that default retention periods are often too short, because intrusions can stay hidden for many months. The CISA and FBI advisory notes that OMB memorandum M-21-31 requires federal agencies to keep Microsoft 365 audit logs like those in the 2023 case for at least 12 months in active storage and 18 more months in cold storage. Deleting on schedule is also a privacy control.

## Worked example

The security team at shop.example wants to detect and investigate account takeover and administrator abuse on its storefront. It works through five steps.

**Step 1: write the questions.** Is someone guessing passwords across many accounts? Did an attacker sign in as a customer and change the email address or MFA settings? Did an administrator grant themselves extra privileges or export customer data?

**Step 2: choose events.** Each event earns its place by answering a question.

| Candidate event                       | Decision                    | Reason                                    |
| ------------------------------------- | --------------------------- | ----------------------------------------- |
| `auth.login` success and failure      | Keep                        | Password guessing and takeover            |
| `auth.mfa.change` (add, remove)       | Keep                        | Attackers change MFA to keep access       |
| `account.email.change`                | Keep                        | A common step before a password reset     |
| `admin.role.change`                   | Keep                        | Privilege abuse                           |
| `admin.export`                        | Keep, with a record count   | Shows the export without copying the data |
| Product page views                    | Drop from the security log  | High volume, little security value        |
| Load balancer health checks           | Summarize per hour          | Noise                                     |
| Full request bodies                   | Drop                        | Contain passwords and card numbers        |

**Step 3: fix the record.** The current log line is a liability:

```text
Oct 14 09:12:03 web1 login failed user=alice@mail.example pass=Winter2026! sid=5f2a9c71e0 from 203.0.113.45
```

It uses local time with no year or time zone, includes the attempted password and a live session ID, identifies the user by email address, and is free text. The redesigned record:

```json
{
  "ts": "2026-10-14T13:12:03.418Z",
  "received": "2026-10-14T13:12:04.002Z",
  "event": "auth.login",
  "outcome": "failure",
  "reason": "bad_password",
  "user_id": "u-1042",
  "src_ip": "203.0.113.45",
  "request_id": "req-8c41d2",
  "host": "web-01.shop.example",
  "service": "login",
  "schema": "auth-v2"
}
```

The local 09:12:03 was US Eastern daylight time, so it becomes 13:12:03 UTC. When the typed username matches no account, the service logs `user_id: null` plus a keyed hash of the typed text. Repeated attempts can still be counted, but nothing a user typed by mistake (such as their password) is stored.

**Step 4: plan the pipeline and retention.** A forwarder ships events over TLS within seconds. The web servers can append to the central store but cannot read, change, or delete it; only the security team can search it. Records stay searchable for 12 months, sit in an archive for 18 more, then are deleted. The team writes this schedule down with its legal and privacy staff.

**Step 5: test it.** In a test environment, the team signs in with a known wrong password, confirms that the event arrives with every field and a UTC time, and then searches the raw pipeline for that test password to prove it never appears. A health check alerts if the login service sends no events for 15 minutes during business hours.

## In practice

- **Grow from use cases.** Pick a handful of detection and investigation questions, list the events each needs, and add sources when a question cannot be answered. In ATT&CK, each technique links to detection strategies, which group analytics and name the kinds of log data they need. That makes it a useful checklist for coverage gaps.
- **Treat the pipeline as a target.** The joint guidance warns that log stores and SIEMs are attractive targets and should be hardened, with logs encrypted in transit and access restricted ([[least-privilege]]).
- **Manage cost deliberately.** Filter or summarize noisy events before the expensive search tier, and keep a cheaper raw copy for forensics where possible.
- **Test logging like code.** Automated tests can assert that each important action emits its event and that known test secrets never appear in output.
- **Know the limits.** Logs show what systems recorded, not what happened. An intruder using built-in administration tools produces normal-looking events. Encryption hides traffic content from network sensors. And anything not forwarded before a host is wiped is gone.

## Common misconceptions

- **"Log everything and sort it out later."** Unfiltered logging is expensive, buries useful signals, and copies secrets and personal data into one more place to protect. Choose events from questions.
- **"If it is in the logs, someone will notice."** Logging is not monitoring. Without detection rules and review, logs help only after someone else reports the problem.
- **"Local timestamps are fine."** Mixed time zones and drifting clocks scramble the order of events across systems. Record UTC from synchronized clocks.
- **"Hashing personal data makes the logs anonymous."** Unkeyed hashes of guessable values can be reversed by trying candidates, and even keyed hashes are pseudonyms, not anonymity.
- **"Logs are an objective record."** Whoever controls a host can alter its local logs, and applications can be tricked into writing forged lines. Forward early, protect integrity, and neutralize input.

## Try it in the lab

In [the lab](lab:detection-rule-builder) you tick clauses to build a detection rule that flags exactly the three of nine labeled events in which a compromised service account downloads data at night from abroad. Every rule that does so must test the hour, yet the Hour column has no date or time zone. Which other fields from Designing the record do the events lack?

> [!ETHICS] Only test systems you own or have written permission to test.

**Without the lab.** At the fictional `registrar.example` portal, students add and drop classes and staff override enrollment caps. Its student records fall under [[ferpa]], so minimization matters.

1. Decide keep, drop, or summarize for each event, naming the question it answers: sign-in success; sign-in failure; course search; add or drop; staff cap override; grade change; roster export; catalog page views; password reset request; mailing-address change.
2. Rewrite this line as a structured record in UTC (the portal runs on US Central daylight time), removing or transforming every sensitive field, and explain each change:

   ```text
   10/14/2026 08:41:17 override by staff bob ssn=000-00-0000 student=Alice Smith course=CS-101 cap 40->45 token=eyJhbGciOi from 198.51.100.23
   ```

3. Justify different retention periods for sign-in events and grade changes.
4. Write a health check that reveals when the portal stops sending logs.

On a computer you own, check whether your latest sign-in record (Windows Event Viewer's Security log, or `last` on Linux and macOS) uses UTC or local time, and which when, where, who, and what fields it has.

## Key takeaways

- Start from the questions an investigation must answer; the events and sources follow from them.
- Every record needs when (UTC, synchronized), where, who, what, and outcome, as structured fields.
- Never log secrets, minimize personal data, and use keyed hashes when you need to correlate without storing a value.
- Forward events off the host quickly, protect their integrity, and treat a silent source as a warning.
- Retain logs long enough for slow discoveries, then delete them on a written schedule.

## Go deeper

- NIST's [SP 800-92 Rev. 1 draft](https://csrc.nist.gov/pubs/sp/800/92/r1/ipd) recasts log management as a planning playbook informed by OMB M-21-31. As of October 2026 it is still an initial public draft, so the 2006 [SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final) remains the final version.
- The [joint event logging guidance](https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection) has detailed sections on detecting "living off the land" techniques and on time synchronization between IT and operational technology networks.
- Schneier and Kelsey, ["Secure audit logs to support computer forensics"](https://doi.org/10.1145/317087.317089) (ACM TISSEC, 1999), designs a log that a later attacker cannot read or undetectably alter for entries written before the compromise. How do such forward-secure schemes compare with simply forwarding logs off the host?
- Open question: how should an organization measure logging coverage, and weigh forensic value against the privacy cost of keeping more data for longer?
