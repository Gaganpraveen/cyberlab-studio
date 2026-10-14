---
topicId: OPS-03
title: SIEM querying and correlation concepts
summary: Learn how a SIEM turns raw logs from many sources into normalized, searchable events, how to write queries that filter, aggregate, and join them, and how correlation links events across sources and time to reveal an attack that no single event shows.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Describe the SIEM pipeline from collection and parsing through normalization, enrichment, storage, search, and correlation.
  - Write queries that filter, aggregate, and join normalized events to answer an investigative question.
  - Design a correlation rule that links events by key fields within a time window.
  - Build a UTC timeline from a small multi-source event collection and state which conclusions it supports.
  - Recognize pitfalls such as mismatched user names, local timestamps, shared IP addresses, and missing sources.
prerequisites: [OPS-01, OPS-02]
concepts: [siem, event-correlation]
labs: []
keywords:
  - security information and event management
  - log analytics
  - log search
  - query language
  - SQL
  - parsing
  - log normalization
  - field mapping
  - enrichment
  - aggregation
  - pivoting
  - timeline
  - correlation rule
  - correlation search
  - Sigma correlations
  - value_count
  - event_count
  - DE.AE-03
  - RS.AN-06
  - T1110
  - T1110.003
  - DET0463
sources:
  - title: 'NIST SP 800-92: Guide to Computer Security Log Management'
    url: https://csrc.nist.gov/pubs/sp/800/92/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-92
  - title: 'Sigma documentation: Correlations'
    url: https://sigmahq.io/docs/meta/correlations.html
    publisher: SigmaHQ
  - title: 'MITRE ATT&CK: Brute Force (T1110)'
    url: https://attack.mitre.org/techniques/T1110/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK detection strategy DET0463: Brute Force Authentication Failures with Multi-Platform Log Correlation'
    url: https://attack.mitre.org/detectionstrategies/DET0463/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
  - title: Best Practices for Event Logging and Threat Detection
    url: https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection
    publisher: "Australian Signals Directorate's ACSC, with CISA, FBI, NSA, and international partners"
quiz:
  - question: The identity provider logs alice@corp.example, the VPN logs ALICE, and endpoints log CORP\alice. A join on the raw user field across these sources returns nothing. What is the best fix?
    choices:
      - Normalize identities at ingestion into one user field, such as alice, and join on that.
      - Drop the VPN logs, since they disagree with the other sources.
      - Search only one source at a time.
      - Widen the query's time window until results appear.
    answer: 0
    explanation: Normalization converts each field to one representation so that events from different sources can be compared. Without it, correlation silently fails, and an empty result looks like evidence of nothing.
  - question: Which query result best indicates password spraying rather than guessing against one account?
    choices:
      - One user with 300 failed sign-ins from many addresses
      - One source address with failed sign-ins against 40 different users, one or two attempts each
      - Ten successful sign-ins by one user from the office network
      - One failed sign-in followed by a password reset
    answer: 1
    explanation: Spraying tries one or a few common passwords against many accounts to stay under lockout limits, so the signal is many distinct users per source, not many attempts per user. That is why a distinct-count (value count) aggregation fits it.
  - question: A correlation rule alerts when 10 or more distinct users fail to sign in from one IP address within 10 minutes. It fires every morning for 198.51.100.1, the campus network's shared outbound address. What is the best response?
    choices:
      - Block 198.51.100.1 at the firewall.
      - Delete the rule, because per-address correlation never works.
      - Treat the address as a known shared egress point, enrich events with that fact, and tune the rule for it while keeping the rule for other addresses.
      - Raise the threshold to 1,000 distinct users for every address.
    answer: 2
    explanation: Many people behind one shared address look like one noisy source. Enrichment and a documented, narrow exception fix this case without blinding the rule everywhere, which a global threshold change would do.
  - question: An analyst's query for activity from a suspicious address over the past month returns no rows. What should they check before concluding there was no activity?
    choices:
      - Whether the SIEM's dashboard colors are configured correctly
      - Whether the address appears on a public blocklist
      - Nothing; an empty result proves absence.
      - Whether the relevant sources were actually sending data for that period and whether the address field was parsed under the expected name
    answer: 3
    explanation: An empty result can mean no activity, no data, or a parsing or naming mismatch. Confirm source coverage and field mapping first, and record the check in the case notes.
---

## Why it matters

Attacks leave fragments in different places. A phishing message sits in the mail gateway's log, a sign-in in the identity provider's, a new process in an endpoint's, and an upload in the web proxy's. No single source tells the whole story, and an analyst who opens each system's console separately will miss the connections. A [[siem]] (security information and event management system) brings these records into one searchable store and runs rules across them. The [[nist-csf]] 2.0 names this outcome directly: DE.AE-03, "Information is correlated from multiple sources."

Querying is the core investigative skill. An analyst turns a question ("did anyone else sign in from this address?") into a precise query, runs it, and reads the result skeptically. The same skill, made automatic, becomes a correlation rule that watches for a multi-step pattern around the clock.

## The core idea

Think of a detective's evidence board. Witnesses (log sources) speak different languages and wear different watches, so before their statements can be compared, each must be translated into one language and placed on one clock. Then the detective pins related statements together with string: same person, same car, same street, within the same hour. In a SIEM, translation is **normalization**, the common clock is UTC, and the string is **correlation** on shared keys such as user, host, IP address, and session.

NIST SP 800-92 gives precise meanings. Log normalization means "each log data field is converted to a particular data representation and categorized consistently," and [[event-correlation]] is "finding relationships between two or more log entries," most often by rules that match on values such as timestamps, IP addresses, and event types.

Three assumptions shape every investigation:

1. **Sources disagree on format.** One system writes `alice@corp.example`, another `ALICE`, a third `CORP\alice`. One logs UTC, another local time.
2. **Data arrives late or not at all.** Collectors fall behind, agents stop, and some systems were never connected.
3. **Keys are ambiguous.** Many users can share one IP address behind a network address translator or VPN, and one user can appear from many addresses.

## How it works

### The SIEM pipeline

| Stage         | What happens                                                    | Example                                                  |
| ------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Collection    | Agents, forwarders, syslog, or API pulls bring logs in          | The VPN gateway sends syslog over TLS                    |
| Parsing       | Fields are extracted from raw text or JSON                      | `user=ALICE` becomes a field named `user`                |
| Normalization | Fields get common names, types, and formats                     | `ALICE` becomes `alice`; local time becomes UTC          |
| Enrichment    | Context is added from other data                                | Host criticality, owner, "known office address" flag     |
| Storage       | Events are indexed and kept for a retention period              | 90 days hot, then archive                                |
| Search and correlation | Analysts query; rules run on schedule or on arrival     | "10+ distinct users failing from one address in 10 min"  |

SP 800-92 also lists supporting functions such as filtering (suppressing entries unlikely to be useful), aggregation (folding repeated entries into one with a count), and integrity checking with message digests. It describes two collection styles: agent-based, where software on each host filters and normalizes before sending, and agentless, where the SIEM pulls logs or hosts push them without a local agent.

### Query building blocks

SIEM products use different query languages, but most queries combine the same five operations: **filter** rows, **project** fields, **aggregate** with counts and distinct counts, **join** or correlate across sources, and **sort** by time. This lesson writes queries in standard SQL over one normalized table, `events(ts, source, action, outcome, user_name, src_ip, host, detail)`, because SQL is widely taught and its semantics are precise. Product languages express the same ideas with different syntax.

Correlating two sources, or two kinds of event, is a join on a shared key plus a time condition. Standard SQL writes the window with interval arithmetic:

```sql
-- Standard SQL: a success that follows a failure from the same address within 15 minutes
SELECT f.src_ip, f.user_name AS failed_user, s.user_name AS successful_user, s.ts
FROM events AS f
JOIN events AS s
  ON s.src_ip = f.src_ip
 AND s.ts BETWEEN f.ts AND f.ts + INTERVAL '15' MINUTE
WHERE f.action = 'auth.login' AND f.outcome = 'failure'
  AND s.action = 'auth.login' AND s.outcome = 'success';
```

Joins multiply rows. Forty failures followed by one success produce forty result rows for a single pattern, and a busy shared address can produce millions. Aggregate first, as the worked example below does with a subquery, then join the smaller result.

A good query is bounded in time, filters before it aggregates or joins, and returns only the fields needed. A query is also evidence: CSF 2.0 outcome RS.AN-06 asks that "Actions performed during an investigation are recorded," so analysts paste each query and its result into the case notes.

### Correlation rules

A correlation rule automates a multi-event pattern. Sigma defines several correlation types in a `correlation` section that references ordinary base rules ([Sigma correlations](https://sigmahq.io/docs/meta/correlations.html)):

- `event_count`: at least N matching events in a time window, grouped by fields such as user.
- `value_count`: at least N distinct values of a field, such as distinct users per source address.
- `temporal`: events from several base rules all occur within the window, in any order.
- `temporal_ordered`: the same, but in the listed order.

Correlation rules have `type`, `rules`, `group-by` (with a hyphen), `timespan` (such as `10m`), and a `condition` like `gte: 10`. The documentation notes that only some backends support correlations. ATT&CK's detection strategy for Brute Force (T1110), DET0463, describes the classic case, many failed logons followed by a success, and lists the time window and failure threshold as "mutable elements" each environment must tune.

## Worked example

At 14:20 UTC on October 14, 2026, the identity provider at corp.example flags a burst of failed sign-ins. The analyst has a small collection from four sources. Raw samples show the format problem immediately:

```text
idp:      {"time":"2026-10-14T14:03:41.512Z","type":"signin","result":"success","upn":"alice@corp.example","ip":"203.0.113.66","mfa":"push_approved"}
vpn:      Oct 14 09:05:10 vpn-gw01 session start user=ALICE src=203.0.113.66 assigned=198.51.100.25
endpoint: 2026-10-14T14:07:30.004Z host=ws-01.corp.example event=logon type=remote user=CORP\alice src=198.51.100.25
```

**Step 1: normalize.** The VPN gateway logs US Central daylight time (UTC−5), so 09:05:10 becomes 14:05:10 UTC. All three user formats become `alice`.

**Step 2: test the spraying hypothesis.** [[password-spraying]] (ATT&CK T1110.003) tries one or a few passwords against many accounts, so the signal is many distinct users per source.

```sql
-- Standard SQL: sources of failed sign-ins against many distinct accounts
SELECT src_ip,
       COUNT(*) AS failures,
       COUNT(DISTINCT user_name) AS distinct_users,
       MIN(ts) AS first_seen,
       MAX(ts) AS last_seen
FROM events
WHERE source = 'idp' AND action = 'auth.login' AND outcome = 'failure'
  AND ts >= TIMESTAMP '2026-10-14 13:00:00'
GROUP BY src_ip
HAVING COUNT(DISTINCT user_name) >= 10
ORDER BY distinct_users DESC;
```

One row comes back: `203.0.113.66`, 43 failures across 41 users between 14:00:05 and 14:03:20.

**Step 3: did any attempt succeed?**

```sql
SELECT ts, user_name, src_ip, detail
FROM events
WHERE source = 'idp' AND action = 'auth.login' AND outcome = 'success'
  AND src_ip IN (
    SELECT src_ip FROM events
    WHERE source = 'idp' AND action = 'auth.login' AND outcome = 'failure'
    GROUP BY src_ip
    HAVING COUNT(DISTINCT user_name) >= 10
  );
```

One success: alice at 14:03:41, with the detail "MFA push approved after two denied pushes." That pattern fits [[mfa-fatigue]], although alice may also have approved by mistake.

**Step 4: pivot and build the timeline.** The analyst queries everything for `alice`, and for the VPN address she was assigned, from 14:00 to 15:00, ordered by `ts`.

| Time (UTC) | Source   | Event                                                                  |
| ---------- | -------- | ---------------------------------------------------------------------- |
| 12:58:02   | idp      | alice signs in from 192.0.2.44 (office address), MFA approved          |
| 14:00:05   | idp      | First of 43 failed sign-ins from 203.0.113.66 against 41 accounts      |
| 14:03:41   | idp      | alice succeeds from 203.0.113.66 after two denied MFA pushes           |
| 14:05:10   | vpn      | ALICE connects from 203.0.113.66 and is assigned 198.51.100.25         |
| 14:07:30   | endpoint | Remote logon to ws-01.corp.example as alice from 198.51.100.25         |
| 14:09:02   | endpoint | An archive tool compresses the finance share into a temporary file     |
| 14:12:44   | proxy    | ws-01 uploads 48 MB to files.storage-share.example                     |

**Step 5: state conclusions with their strength.** Strongly supported: a spraying run from 203.0.113.66 obtained a working sign-in for alice, and the same address then used her VPN access. Supported but not proven: the archive and upload were the intruder's, since they followed the remote logon within minutes, but the analyst has not yet confirmed that the uploaded file was the archive. Unknown: whether other sprayed accounts were compromised another way, and what else left the network, because the proxy logs cover only part of the network. These gaps go in the case notes.

**Step 6: automate the pattern.** A Sigma correlation turns Step 2 into a standing rule. The base rule and the correlation sit in one file, separated by `---`:

```yaml
title: Failed sign-in at the corp.example identity provider
name: corp_idp_failed_signin
status: experimental
logsource:
  product: corpidp
  service: signin
detection:
  selection: # normalized field names from Step 1
    action: auth.login
    outcome: failure
  condition: selection
level: low
---
title: Password spraying from one source address
id: a0879f23-3e9a-40a3-834a-f0c166b56e47
status: experimental
correlation:
  type: value_count
  rules:
    - corp_idp_failed_signin
  group-by:
    - src_ip
  timespan: 10m
  condition:
    field: user_name
    gte: 10
tags:
  - attack.credential-access
  - attack.t1110.003
level: high
```

## In practice

- **Normalize early and once.** Agree on field names, formats, and an identity mapping (account, email, and directory names for the same person) at ingestion, not in every query.
- **Enrich with context.** Flags such as "known office address," "shared campus egress," and "critical server" turn raw matches into triage-ready alerts and support narrow, documented exceptions.
- **Mind time.** Store UTC, track ingestion delay, and remember that late events can fall outside a correlation window that has already closed.
- **Check coverage before trusting silence.** Confirm that each source was sending data for the period, and list missing sources in the case notes. The joint logging guidance lists centralized log access and correlation among its four key factors for effective logging.
- **Know the limits.** A SIEM sees only what it ingests, correlation is only as reliable as its keys, and ingestion and search cost money, which pushes teams to drop data they may later need.

## Common misconceptions

- **"The SIEM will find the attack."** It finds only what its rules and an analyst's queries look for, over the data it receives.
- **"No results means nothing happened."** It can also mean no data, a parsing failure, or a field under a different name.
- **"One IP address means one person."** Network address translation, VPNs, proxies, and cloud services put many people behind one address and one person behind many.
- **"Longer correlation windows are always safer."** Long windows cost more and join unrelated events; short ones miss slow attacks. Choose and tune the window per pattern.
- **"Joining on the raw user name is fine."** The same person appears under several formats; normalize identities first.

## Try it yourself

The fictional company corp.example collected these eight events, most of them about bob. The mail audit log uses US Central daylight time (UTC−5); the others use UTC.

```text
idp:  {"time":"2026-10-15T08:01:12Z","upn":"bob@corp.example","result":"success","ip":"192.0.2.31","geo":"Chicago, US"}
idp:  {"time":"2026-10-15T08:05:30Z","upn":"alice@corp.example","result":"success","ip":"192.0.2.40","geo":"Chicago, US"}
idp:  {"time":"2026-10-15T08:18:55Z","upn":"bob@corp.example","result":"failure","ip":"203.0.113.140","geo":"Lisbon, PT"}
idp:  {"time":"2026-10-15T08:19:40Z","upn":"bob@corp.example","result":"success","ip":"203.0.113.140","geo":"Lisbon, PT"}
mail: 10/15/2026 03:24:05 AM mailbox_rule_created user=BOB rule_name="." action=forward to=bob.archive@freemail.example
mail: 10/15/2026 03:25:41 AM mailbox_login user=BOB client=imap src=203.0.113.140
mail: 10/15/2026 03:31:02 AM mailbox_login user=ALICE client=web src=192.0.2.40
endpoint: 2026-10-15T08:30:00Z host=ws-07.corp.example event=logon type=interactive user=CORP\bob
```

1. Normalize the events into one table with UTC time, a lowercase short user name, source, action, and IP address.
2. Write a standard SQL query over your table that finds users who signed in successfully from two different IP addresses within 30 minutes.
3. Build bob's timeline. Which events support "someone else used bob's account"? Which innocent explanations remain, and what evidence would rule them out?
4. Write a Sigma correlation rule that would catch the mailbox forwarding pattern in the future, and predict one source of false positives.

Hint: this pattern, a mailbox rule that quietly forwards mail, is common in [[business-email-compromise]].

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- A SIEM's value comes from normalization: common field names, one identity per person, and UTC time across every source.
- Most investigative queries filter, project, aggregate, join, and sort; bound them in time and record them as evidence.
- Correlation links events by shared keys within a time window; Sigma writes counts, distinct counts, and sequences in a portable format, though backend support varies.
- Pivot from one finding to the next (address to user, user to host, host to process) and build a UTC timeline.
- State each conclusion with its strength, and treat missing data as a finding, not as proof of innocence.

## Go deeper

- NIST [SP 800-92](https://csrc.nist.gov/pubs/sp/800/92/final), Section 3, describes the log management functions and SIEM architectures this lesson summarizes. Which of its functions do modern cloud-scale log platforms still perform, and which have changed?
- The [Sigma correlations documentation](https://sigmahq.io/docs/meta/correlations.html) notes uneven backend support for ordered correlations. Why is "A then B within 10 minutes" harder to evaluate over streaming data than a simple count?
- Open question: how should a SIEM represent uncertainty in identity resolution, for example when a shared account or a reassigned VPN address breaks the link between an event and a person?
