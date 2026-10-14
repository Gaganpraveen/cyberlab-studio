---
topicId: OPS-07
title: Threat hunting and hypothesis testing
summary: Learn to search proactively for intruders that detection rules missed by writing a defensible, falsifiable hypothesis, checking that the data can answer it, testing it against logs, and turning the result into an incident, a detection rule, or a logging fix.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish threat hunting from alert-driven detection, and explain why hunts based on behavior outlast sweeps for indicators.
  - Write a defensible hunt hypothesis that names a behavior, its scope and time window, the data source, the expected observable, and what would refute it.
  - Check data coverage, then test a hypothesis with stack counting, baselines, and pivots while avoiding data snooping.
  - Report a hunt's outcome as supported, not supported, or inconclusive, with the limits of the data examined.
  - Turn a hunt's result into an incident, a detection rule, or a logging improvement.
prerequisites: [OPS-03, OPS-06, RES-02]
concepts: [threat-hunting, ttp, living-off-the-land, indicator-of-compromise, mitre-attack]
labs: []
keywords:
  - threat hunting
  - cyber threat hunting
  - hunt hypothesis
  - hypothesis-driven hunting
  - TTP-based hunting
  - indicator sweep
  - stack counting
  - long-tail analysis
  - baselining
  - pivoting
  - coefficient of variation
  - beaconing
  - living off the land
  - LOTL
  - hunt log
  - T1053.005
  - TA0003
  - TA0011
  - DE.AE-02
  - DE.AE-07
  - Sigma
sources:
  - title: Best Practices for Event Logging and Threat Detection
    url: https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection
    publisher: "Australian Signals Directorate's ACSC, with CISA, FBI, NSA, and international partners"
  - title: 'MITRE ATT&CK: Scheduled Task/Job: Scheduled Task (T1053.005)'
    url: https://attack.mitre.org/techniques/T1053/005/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Detection strategies'
    url: https://attack.mitre.org/detectionstrategies/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
  - title: 'Sigma documentation: Value modifiers'
    url: https://sigmahq.io/docs/basics/modifiers.html
    publisher: SigmaHQ
quiz:
  - question: Which of these is a defensible hunt hypothesis?
    choices:
      - Attackers might be hiding somewhere in our network, so we should look everywhere.
      - If an intruder created scheduled tasks last week, process logs will show tasks running scripts from Temp folders that no known software explains.
      - We should look through last month's proxy logs for anything that seems unusual.
      - Our detection rules are probably good enough, so there is nothing left to hunt.
    answer: 1
    explanation: A defensible hypothesis names a behavior, a scope and time window, the data that would show it, and an expected observable that differs from benign activity. That also tells you what would refute it. The other choices cannot be tested or decide the answer in advance.
  - question: A hunt query over endpoint logs returns no matches. What should the hunter check before reporting that the behavior did not occur?
    choices:
      - Whether the same query returns matches when it is run a second time
      - Whether the threat intelligence feed has been updated since the hunt began
      - Whether the SIEM license covers ad hoc hunting queries
      - Whether the hosts and dates in scope actually sent the needed events, with the fields parsed
    answer: 3
    explanation: A query over missing or unparsed data also returns nothing, which looks exactly like a negative result. Coverage comes first, and the report must state which hosts and dates the conclusion covers.
  - question: Why do hunts that target behavior tend to stay useful longer than sweeps for specific indicators such as a file hash or IP address?
    choices:
      - Behavior-based hunts never produce false positives, so their results need no triage.
      - Indicator feeds are always months out of date by the time they are published.
      - Attackers can change a hash or address cheaply, but changing how they reach a goal costs more.
      - Hash and address lookups are too slow to run across a whole SIEM.
    answer: 2
    explanation: An indicator matches one artifact, and a recompiled file or new server defeats it. A behavior, such as creating a scheduled task that runs a script from a temporary folder, survives those changes, although it also matches more benign activity that must be triaged.
  - question: A hunter notices an odd pattern while browsing data, changes the hypothesis to fit it, and reports the hypothesis as confirmed by the same data. What is the main problem?
    choices:
      - The data was snooped, so the "confirmation" is circular; the revised hypothesis should be tested on a different time window or data set.
      - Hypotheses may never be changed once written.
      - The hunter should have used a larger time window to get a stronger match.
      - The pattern must be malicious because it is unusual.
    answer: 0
    explanation: Fitting a hypothesis to the data and then testing it on the same data guarantees a match. Writing the hypothesis and thresholds first, and testing new ideas on fresh data, keeps the result meaningful.
  - question: Which outcome best describes a hunt that found no evidence on 431 hosts with complete logging, but could not test 19 lab hosts that do not send process events?
    choices:
      - Supported, because absence of evidence is evidence of compromise
      - Not supported for the whole organization
      - Not supported on the 431 covered hosts, and inconclusive on the 19 lab hosts, with a logging fix as a follow-up
      - Invalid, because a hunt must cover every host to count
    answer: 2
    explanation: A hunt can show presence, but it can only show absence within the data it examined. Stating the outcome per scope keeps the report honest, and the data gap becomes an improvement item.
---

## Why it matters

[Detection rules](lesson:OPS-02) catch what someone anticipated and wrote down. Intruders who use the same tools administrators use, or who arrive in a way no rule describes, can work for a long time without raising an alert. Joint [guidance on event logging](https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection) led by the Australian Signals Directorate, with CISA, the FBI, the NSA, and other partners, addresses intruders who [[living-off-the-land|live off the land]], relying on tools already built into the systems they compromise. Its recommendations for detecting them include baselining how legitimate tools are normally used, auditing process creation and command lines, behavioral analytics, and proactive threat hunting. Its case study describes how the Volt Typhoon group abused built-in Windows tools such as ntdsutil.exe, WMIC, and netsh.

Hunting also answers the question every incident leaves behind: did we get everything? In the [previous lesson](lesson:OPS-06), corp.example swept every host for one scheduled task's exact name and script hash and found it only on ws-01. A sweep like that finds copies, not variations. This lesson shows how to look for the variations.

## The core idea

[[threat-hunting]] is a proactive search through telemetry for attacker activity that existing detections missed. Alert-driven work, such as [triage](lesson:OPS-05), waits for a rule to fire. A hunter starts from a [[hypothesis]], a specific and testable statement about what an intruder would have done and what the logs would show if they did, and runs the experiment.

The scientific framing matters because it makes the result interpretable. A defensible hunt hypothesis:

- **has a basis**: an incident finding, threat intelligence, a [[mitre-attack|MITRE ATT&CK]] technique, or a deviation from a baseline;
- **is specific**: it names the behavior, the systems in scope, and the time window;
- **is testable**: the needed data exists, covers the scope, and is retained long enough;
- **is falsifiable**: it says what you would see if it were false;
- **is proportionate**: it reads only the data the question needs.

Good hunts target [[ttp|TTPs]] (tactics, techniques, and procedures: what an attacker is trying to achieve and how) rather than only single [[indicator-of-compromise|indicators of compromise]]. An indicator, such as a file hash or an IP address, is cheap for an attacker to change: recompile the file or rent a new server. Changing how they achieve a goal, such as how they keep a foothold, costs them more. Behavior is also noisier, because administrators and software do many of the same things, so a behavioral hunt always ends in triage.

Two limits frame everything that follows. A hunt can show that something happened, but it can show absence only within the data it examined. And intruders who live off the land look most like normal administration, which is exactly why a baseline of normal matters.

## How it works

### Where hypotheses come from

- **Incidents.** What an intruder did once, they may have done elsewhere. The ws-01 task suggests a hypothesis about other tasks.
- **Threat intelligence.** Reports on what other intruders do suggest what to look for. CSF 2.0 outcome DE.AE-07 reads "Cyber threat intelligence and other contextual information are integrated into the analysis."
- **ATT&CK.** Each technique page describes how a behavior works, and ATT&CK's [detection strategies](https://attack.mitre.org/detectionstrategies/) "serve as containers that organize multiple platform-specific analytics into cohesive detection methodologies." Each analytic lists the log sources it needs and the "mutable elements," such as time windows and thresholds, that you tune to your environment.
- **Baselines.** A deviation from normal, such as an administration tool run by an account that never ran it before, is a lead to explain.

### Write it down before you look

A one-page template keeps a hunt honest:

```text
Hypothesis:  If <behavior> happened in <scope> during <time window>,
             then <data source> will show <observable>,
             which benign activity rarely produces because <reason>.
Refuted if:  <what you would see instead>, given <coverage>
Data needed: <sources, fields, retention>
Basis:       <incident, intelligence, or ATT&CK id>
Owner:       <hunter>            Timebox: <hours>
```

| Weak hypothesis                        | Problem                              | Defensible version                                                                                                                   |
| -------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| "Attackers might be in our network."   | Cannot be tested or refuted          | "If an intruder created scheduled tasks on Windows hosts from October 13 to 20, process logs will show tasks that run scripts from Temp or AppData folders." |
| "Look for anything odd in proxy logs." | No expected observable               | "A host with a hidden implant will contact a destination that at most three hosts visit, at very regular intervals."                  |
| "Search for 203.0.113.80."             | Tests one indicator, not a behavior  | Keep it as a quick sweep, but pair it with a behavioral hypothesis.                                                                  |

Writing first also protects against [[data-snooping]]. If you browse the data, notice a pattern, and then "confirm" it on the same data, the match is guaranteed. Fix the hypothesis and thresholds in advance; if the data suggests a new idea, record it and test it on a different time window.

### Test it

1. **Check coverage.** Which hosts and dates actually sent the needed events, with the fields parsed? A query over missing data returns nothing, which looks exactly like a negative result.
2. **Query and stack count.** Group matching events by their key fields and count how many hosts share each value. Common values are usually software and routine administration; the rare end of the list (the long tail) is where to look first.
3. **Compare with a baseline.** Check each rare value against history, inventories, and change tickets. Most rare things are still benign, and forgetting that is the [[base-rate-fallacy]], so expect to explain many candidates.
4. **Pivot.** For each unexplained candidate, ask what else that host or account did, as in the [SIEM lesson](lesson:OPS-03), and look for independent evidence in a second source.

### Report the outcome

| Outcome       | Meaning                                              | What follows                                              |
| ------------- | ---------------------------------------------------- | --------------------------------------------------------- |
| Supported     | Evidence of the behavior that baselines do not explain | Declare or reopen an incident ([containment](lesson:OPS-06)) |
| Not supported | No evidence, on stated hosts and dates with complete data | Document the baseline; consider a detection rule        |
| Inconclusive  | The data cannot answer the question                  | Fix the logging gap, then hunt again                       |

Every hunt should leave something behind: an incident, a new [[detection-rule]], a documented baseline, or a logging fix. CSF 2.0 outcome ID.IM-03 captures the habit: "Improvements are identified from execution of operational processes, procedures, and activities."

## Worked example

On October 20, 2026, bob hunts for persistence the corp.example eradication might have missed.

**Step 1: hypothesis.** Written before any query:

```text
Hypothesis:  If the INC-2026-0142 intruder created other scheduled tasks
             (ATT&CK T1053.005) on Windows hosts from Oct 13 to Oct 20, then
             endpoint process events will show schtasks.exe creating tasks
             that run scripts from Temp or AppData folders, and the host will
             contact a destination few other hosts visit, at regular intervals.
Refuted if:  Every such task creation matches the known vendor updater or an
             approved change, on hosts with complete process logging.
Data needed: Endpoint process events with command lines; proxy logs.
Basis:       The ws-01 task (every 30 minutes, script in a Temp folder).
Owner:       bob                 Timebox: 6 hours
```

ATT&CK lists Scheduled Task under the Execution, Persistence, and Privilege Escalation tactics, and notes that tasks can also be scheduled on remote systems.

**Step 2: coverage.** Process events with command lines arrive from 431 of 450 Windows hosts; 19 lab hosts send none. The lab network also bypasses the web proxy. Both gaps go into the hunt log before any query runs.

**Step 3: query.** The SIEM stores events in PostgreSQL:

```sql
-- PostgreSQL: task creations whose command line points into Temp or AppData
SELECT host, user_name, parent_image, command_line, ts
FROM process_events
WHERE ts >= TIMESTAMPTZ '2026-10-13 00:00:00+00'
  AND ts <  TIMESTAMPTZ '2026-10-21 00:00:00+00'
  AND lower(image) LIKE '%schtasks.exe'
  AND lower(command_line) LIKE '%/create%'
  AND (lower(command_line) LIKE '%temp%' OR lower(command_line) LIKE '%appdata%');
```

**Step 4: stack count and baseline.** Forty-one events come back. Grouping by the task's action shows:

| Task action (shortened)              | Hosts | Account    | Explanation                                    |
| ------------------------------------ | ----- | ---------- | ---------------------------------------------- |
| `...\Temp\vendor-updater\setup.exe`  | 38    | SYSTEM     | Matches change ticket CHG-2291, a vendor rollout |
| `...\AppData\Local\Temp\inv.ps1`     | 2     | erin.adm   | Approved inventory script on two servers       |
| `...\AppData\Local\Temp\sync.ps1`    | 1     | svc-backup | None: ws-19, October 14 at 14:18 UTC           |

The 38-host and 2-host rows match the baseline. The last row does not: a backup [[service-account]] has no reason to create tasks on a workstation. Its raw event, with the command line shortened, reads:

```text
2026-10-14T14:18:07.311Z host=ws-19.corp.example event=process_create user=CORP\svc-backup
  parent=C:\Windows\System32\cmd.exe image=C:\Windows\System32\schtasks.exe
  cmd="schtasks.exe /create ... C:\Users\svc-backup\AppData\Local\Temp\sync.ps1 ..."
```

**Step 5: pivot and corroborate.** Logon events on ws-19 show a network logon as svc-backup from ws-01 at 14:16 UTC on October 14, while the intruder controlled ws-01. That service account's password was in the script on the finance share. A second, independent source checks the [[beaconing]] part of the hypothesis:

```sql
-- PostgreSQL: regularity of connections to destinations seen from 3 or fewer hosts
WITH rare AS (
  SELECT dest_domain
  FROM proxy_events
  WHERE ts >= TIMESTAMPTZ '2026-10-13 00:00:00+00'
  GROUP BY dest_domain
  HAVING COUNT(DISTINCT src_host) <= 3
),
gaps AS (
  SELECT p.src_host, p.dest_domain,
         EXTRACT(EPOCH FROM p.ts - LAG(p.ts) OVER (
           PARTITION BY p.src_host, p.dest_domain ORDER BY p.ts)) AS gap_s
  FROM proxy_events p
  JOIN rare r ON r.dest_domain = p.dest_domain
  WHERE p.ts >= TIMESTAMPTZ '2026-10-13 00:00:00+00'
)
SELECT src_host, dest_domain,
       COUNT(gap_s) AS n_gaps,
       ROUND(AVG(gap_s)) AS mean_gap_s,
       ROUND((STDDEV_SAMP(gap_s) / AVG(gap_s))::numeric, 3) AS cv
FROM gaps
WHERE gap_s IS NOT NULL
GROUP BY src_host, dest_domain
HAVING COUNT(gap_s) >= 20
ORDER BY cv;
```

The coefficient of variation (`cv`) is the standard deviation of the gaps divided by their mean; near 0 means clockwork regularity. The top rows are a print server's status checks every 300 seconds, a licensed design tool's hourly license check on three engineering workstations (both in the asset inventory), and ws-19 contacting cdn-img.example every 1,800 seconds (cv 0.021) since 14:20 on October 14. No other host visits that domain, and the 30-minute cadence matches the ws-01 task.

**Step 6: outcome and follow-up.** Supported on the 431 covered hosts; inconclusive on the 19 lab hosts. INC-2026-0142 is reopened, and the team contains and rebuilds ws-19 as in the [previous lesson](lesson:OPS-06). The original sweep missed ws-19 because its task had a different name and hash, and changing the svc-backup password did not stop it, because the task was set to run as SYSTEM, an option ATT&CK describes. The hunt leaves three things behind: an incident update, a request to enable command-line auditing and proxy routing in the lab, and a [[sigma-rule]] for the behavior:

```yaml
title: Scheduled task created with an action in a Temp or AppData folder
id: 52bef03d-f195-46da-a001-0b6e7bf272e7
status: experimental
description: schtasks.exe creates a task whose command line points into a Temp or AppData folder, the persistence pattern found in hunt HUNT-2026-07 (fictional).
references:
  - https://attack.mitre.org/techniques/T1053/005/
date: 2026-10-20
tags:
  - attack.persistence
  - attack.t1053.005
logsource:
  category: process_creation
  product: windows
detection:
  selection:
    Image|endswith: '\schtasks.exe'
    CommandLine|contains: '/create'
  user_writable:
    CommandLine|contains:
      - '\AppData\'
      - '\Temp\'
  filter_known_updater:
    CommandLine|contains: '\Temp\vendor-updater\'
  condition: selection and user_writable and not filter_known_updater
falsepositives:
  - Installers and updaters that stage tasks in temporary folders
level: medium
```

The hunt's labeled results double as test cases: the rule matches the ws-19 event and the two approved inventory events, and the filter excludes the 38 updater events. Its [[precision]] on that week is one true alert in three, acceptable for a medium-level rule that analysts can triage in minutes.

## In practice

- **Keep a hunt log.** Record the hypothesis, data, coverage, queries, results, outcome, and follow-ups, so another analyst can repeat or challenge the hunt.
- **Timebox.** Decide in advance how long a hunt may run, and report what you could not finish.
- **Hunt with authorization, and minimize.** Hunting reads employee activity. Follow policy, query only what the hypothesis needs ([[data-minimization]]), and restrict access to results.
- **Fix the data, not just the hunt.** Inconclusive outcomes point at logging gaps, such as missing command lines, which the ASD-led guidance recommends auditing.
- **Know the limits.** Hunts depend on data quality and the hunter's knowledge, behavior that mimics administration is hard to separate from it, and timing analysis misses implants that check in rarely or irregularly.

## Common misconceptions

- **"Threat hunting means searching for indicators from a feed."** Indicator sweeps are quick and useful, but hunting tests hypotheses about behavior.
- **"No results means no intruder."** Only within the hosts, dates, and fields actually examined. Check coverage first.
- **"A hunt that finds nothing was wasted."** A documented negative, a baseline, and a logging fix all have value.
- **"Browsing data until something looks odd is hunting."** Without a prior hypothesis, chance patterns look like findings, and you cannot judge them.
- **"Rare means malicious."** Most rare things are benign; the baseline and the pivot decide.

## Try it yourself

Test this hypothesis against the curated, fictional logs below: "If the intruder used the svc-backup account beyond the logon to ws-19 already found, authentication logs from October 13 to 15 will show other svc-backup logons that do not match its baseline." The 60-day baseline: svc-backup logs on only from backup-01 to fs-01 and fs-02, between 01:00 and 03:00 UTC, as a network logon. Logon events from the 19 lab hosts are not collected.

| #   | Time (UTC)       | Target    | Source    | Type        | Result  |
| --- | ---------------- | --------- | --------- | ----------- | ------- |
| 1   | Oct 13 01:05     | fs-01     | backup-01 | network     | success |
| 2   | Oct 13 01:07     | fs-02     | backup-01 | network     | success |
| 3   | Oct 14 01:04     | fs-01     | backup-01 | network     | success |
| 4   | Oct 14 14:16     | ws-19     | ws-01     | network     | success |
| 5   | Oct 14 14:31     | fs-02     | ws-19     | network     | success |
| 6   | Oct 14 14:33     | dc-01     | ws-19     | network     | failure |
| 7   | Oct 14 18:40     | backup-01 | console   | interactive | success |
| 8   | Oct 15 01:05     | fs-01     | backup-01 | network     | failure |
| 9   | Oct 15 01:20     | fs-01     | backup-01 | network     | success |

Change ticket CHG-2304 says an administrator signed in to backup-01 as svc-backup at 18:40 on October 14 to test the account's new password with the backup software.

1. Rewrite the hypothesis in the template, including what would refute it.
2. Label each row as baseline, explained deviation, or unexplained deviation, and say why.
3. State the outcome with its scope, and list what the team should do next.
4. Explain rows 8 and 9. What do they teach about rotating credentials during eradication?
5. Write a Sigma rule for these normalized fields (`account`, `src_host`, `dest_host`, `logon_type`), with a made-up log source such as `product: corpauth`, that alerts when svc-backup logs on from any source other than backup-01. Which rows would it match, and which of those are false positives?

Check yourself: rows 4 to 6 are unexplained, and row 6, an attempt on a domain controller, widens the scope; row 7 is explained by the ticket; your rule should match rows 4 to 7, with row 7 a false positive.

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- Threat hunting starts from a written, falsifiable hypothesis about behavior, not from browsing data.
- Check coverage before trusting a negative result, and report outcomes per scope: supported, not supported, or inconclusive.
- Stack counting, baselines, and pivots separate the rare-but-benign from the rare-and-malicious.
- Hunts on behavior outlast indicator sweeps, at the price of more triage.
- Every hunt should leave an incident, a detection rule, a baseline, or a logging fix behind.

## Go deeper

- Browse ATT&CK's [detection strategies](https://attack.mitre.org/detectionstrategies/) for one technique and turn its analytics and mutable elements into two hunt hypotheses for corp.example.
- The ASD-led [event logging guidance](https://www.cyber.gov.au/business-government/detecting-responding-to-threats/event-logging/best-practices-event-logging-threat-detection) recommends baselining legitimate use of built-in tools. How would you build that baseline without it absorbing an intruder who was already present?
- Open question: how should a hunting program measure its value, given that a good hunt can legitimately find nothing?
