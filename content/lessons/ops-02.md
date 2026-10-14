---
topicId: OPS-02
title: Detection rules and alert quality
summary: Learn how detection rules turn log events into alerts, how to write a portable rule in the Sigma format, and how to measure and improve alert quality by testing rules against labeled synthetic positives and negatives.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how a detection rule turns log events into alerts, and classify outcomes as true or false positives and negatives.
  - Write a Sigma rule with a log source, selections, a filter, and a condition for a fictional log sample.
  - Compute precision and recall for a rule tested against a labeled synthetic event set.
  - Use the base-rate fallacy to explain why a tiny false-positive rate can still bury analysts in false alarms.
  - Propose a tuning change and judge its effect on both precision and recall.
prerequisites: [OPS-01, FND-08]
concepts: [detection-rule, sigma-rule, false-positive, false-negative, alert-fatigue, precision, recall]
labs: []
keywords:
  - detection engineering
  - detection as code
  - analytic
  - SIEM rule
  - correlation search
  - use case
  - true positive
  - true negative
  - benign positive
  - false alarm
  - confusion matrix
  - detection rate
  - true positive rate
  - false positive rate
  - positive predictive value
  - base rate
  - rule tuning
  - Sigma
  - sigma-cli
  - pySigma
  - T1505.003
  - DET0394
sources:
  - title: 'Sigma documentation: Rules'
    url: https://sigmahq.io/docs/basics/rules.html
    publisher: SigmaHQ
  - title: Sigma Rules Specification
    url: https://sigmahq.io/sigma-specification/specification/sigma-rules-specification.html
    publisher: SigmaHQ
  - title: 'Sigma documentation: Getting Started (converting rules with sigma-cli)'
    url: https://sigmahq.io/docs/guide/getting-started.html
    publisher: SigmaHQ
  - title: 'MITRE ATT&CK: Server Software Component: Web Shell (T1505.003)'
    url: https://attack.mitre.org/techniques/T1505/003/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK detection strategy DET0394: Web Shell Detection via Server Behavior and File Execution Chains'
    url: https://attack.mitre.org/detectionstrategies/DET0394/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'Axelsson, "The base-rate fallacy and the difficulty of intrusion detection," ACM TISSEC 3(3), 2000'
    url: https://doi.org/10.1145/357830.357849
    publisher: ACM
quiz:
  - question: A rule raised 40 alerts last month. Analysts confirmed 10 as real attacks, and a later investigation found 5 more attacks the rule never flagged. What are its precision and recall?
    choices:
      - Precision 0.25, recall about 0.67
      - Precision 0.67, recall 0.25
      - Precision 0.25, recall 0.33
      - Precision 0.75, recall about 0.67
    answer: 0
    explanation: Precision is true positives over all alerts, 10/40 = 0.25. Recall is true positives over all real attacks, 10/(10+5), about 0.67. The two answer different questions, which is why the swapped answer is tempting.
  - question: A rule is evaluated against 10 million benign events a day and has a false-positive rate of 0.1%. About two real attacks a day reach it, and it catches both. Roughly what fraction of its alerts are real?
    choices:
      - About 99.9%, because the false-positive rate is only 0.1%
      - About 50%
      - About 0.02%, because roughly 10,000 false alarms arrive alongside 2 real ones
      - It cannot be estimated without the rule's code
    answer: 2
    explanation: 0.1% of 10 million is 10,000 false alarms a day, so precision is about 2/10,002. This is the base-rate fallacy that Axelsson applied to intrusion detection; when attacks are rare, the false-positive rate dominates.
  - question: In a Sigma rule, a selection is a map with two keys, ParentImage|endswith and Image|endswith, and each key has a list of two values. When does the selection match?
    choices:
      - When any one of the four values matches
      - Only when all four values match
      - When the parent matches either parent value and the image matches either image value
      - When the parent and image fields are equal to each other
    answer: 2
    explanation: In Sigma, keys in the same map are joined with AND, and the values in a list are joined with OR. So the event needs one matching parent and one matching image.
  - question: To silence noise from a legitimate report script, an engineer adds the filter CommandLine|contains 'reports'. What is the main risk?
    choices:
      - It makes the rule slower to run.
      - It creates a blind spot, because any malicious command line that happens to contain "reports" is silently ignored.
      - It changes the rule's ATT&CK tag.
      - Sigma does not allow filters on command lines.
    answer: 1
    explanation: Broad substring filters remove more than the known-benign activity. Filter on exact, documented values (the full command line or path) with an owner and a review date, and rerun the positive test cases after every change.
  - question: A new rule scores precision 1.0 and recall 1.0 on ten test events its author wrote. What is the best conclusion?
    choices:
      - The rule is ready to page analysts at the highest severity.
      - The rule should be deleted, because perfect scores mean the test is broken.
      - Recall is meaningless for detection rules, so only precision matters.
      - The result is encouraging but weak; test against real benign activity and positives the author did not write before trusting it.
    answer: 3
    explanation: A small test set written by the rule's author shares the author's blind spots. Replay real benign data to estimate false-positive volume, add positives from exercises and past incidents, and keep measuring after deployment.
---

## Why it matters

A log store without detection is a library nobody reads. A [[detection-rule]] is the bridge from [[telemetry]] to action: it decides which events become alerts that a person must look at. A mature team can run hundreds of rules, so the quality of each one decides how much of the team's day goes to real problems.

Every rule makes two kinds of mistakes. It can stay silent during an attack (a [[false-negative]]) or fire on harmless activity (a [[false-positive]]). Both cost something. A missed web shell can give an intruder months of access. A rule that fires five hundred times a day on routine activity teaches analysts to dismiss it, which is [[alert-fatigue]], and the one real alert drowns in the noise.

The arithmetic is harsh because attacks are rare. In a well-known paper, Stefan Axelsson applied the [[base-rate-fallacy]] to intrusion detection and argued that the false-alarm rate, more than the detection rate, limits how useful a detector can be ([Axelsson, 2000](https://doi.org/10.1145/357830.357849)). Alert quality therefore has to be measured, not assumed.

## The core idea

A detection rule is a precise, testable statement: "When events in this log source match this pattern, raise an alert with this severity and context." Writing one is like writing a small program with a specification you can test: given labeled inputs, the rule must fire on the attacks and stay quiet on everything else.

Every evaluated event lands in one of the four cells of a [[confusion-matrix]]:

|                      | Rule fires                      | Rule stays silent              |
| -------------------- | ------------------------------- | ------------------------------ |
| **Malicious event**  | True positive (TP)              | False negative (FN): a miss    |
| **Benign event**     | False positive (FP): false alarm | True negative (TN)             |

Two ratios summarize a rule:

- **[[precision]]** = TP / (TP + FP): of the alerts raised, what fraction were real? Low precision wastes analyst time.
- **[[recall]]** = TP / (TP + FN): of the real attacks, what fraction raised an alert? Recall is also called the detection rate or true positive rate.

The [[false-positive-rate]], FP / (FP + TN), describes how often the rule misfires per benign event. A smoke detector is a good analogy. One that sounds every time someone makes toast soon has its battery removed; one that never sounds is decoration. Tuning means moving between those failures on purpose.

Measuring requires ground truth, and real labeled attacks are scarce. So detection engineers build test sets: **synthetic positives** (log events that reproduce the attack behavior, written by hand or captured in a lab) and **negatives** (realistic benign activity, ideally sampled from production). One caution applies throughout this lesson: precision measured on a test set depends on that set's mix of attacks and benign events, not on the real world's.

## How it works

### Sigma rules

A [[sigma-rule]] describes a detection in an open, YAML-based format that is independent of any particular [[siem]]. Tools such as sigma-cli, built on the pySigma library, convert a rule into a specific SIEM's query language through a backend, while a processing pipeline maps Sigma's field names to that SIEM's names ([Getting Started](https://sigmahq.io/docs/guide/getting-started.html)). Write the logic once, then deploy it on whatever platform the organization runs.

The specification requires three things: a `title`, a `logsource` that scopes which logs to search (by `category`, `product`, and `service`), and a `detection` section that ends in a `condition`. Optional metadata makes a rule maintainable: a UUID `id`, a `status` (`stable`, `test`, `experimental`, `deprecated`, or `unsupported`), a `description`, `references`, `tags` that map to frameworks such as [[mitre-attack]], a `falsepositives` list of known benign triggers, and a `level` (`informational`, `low`, `medium`, `high`, or `critical`).

Detection logic is built from named searches:

```yaml
detection:
  selection:
    ParentImage|endswith: # a list of values: OR
      - '\w3wp.exe'
      - '\httpd.exe'
    Image|endswith: '\cmd.exe' # a second key in the same map: AND
  filter_known:
    CommandLine: 'cmd.exe /c C:\apps\reports\nightly-export.bat'
  condition: selection and not filter_known
```

Keys in one map are joined with AND, and the values in a list with OR. Modifiers after a pipe change how a value matches: `endswith`, `startswith`, and `contains` act as wildcard shortcuts, `all` turns a list into AND, `cidr` matches IP ranges, and `re` applies a regular expression. String matching is case-insensitive by default, and `*` and `?` work as wildcards. The condition combines searches with `and`, `or`, `not`, parentheses, and quantifiers such as `1 of selection_*`.

### Measuring a rule

Treat rules like code. Each rule lives in version control with its test events: positives that must match and negatives that must not. Every change reruns the tests, so a tuning edit that silently breaks recall is caught before it ships. After deployment, analysts record a verdict for every alert, which gives a running estimate of production precision and alert volume per rule.

Some alerts are correct about the behavior but harmless in context, such as an administrator testing the rule. Some teams record these as **benign positives**, separate from false positives. A benign positive suggests better context or an exception; a false positive suggests the rule logic is wrong.

### The base-rate problem

Base rates explain why tuning matters so much. Suppose a fictional company's servers produce 50 million process events a day, and on a bad day 5 of them are malicious. A rule with perfect recall and a false-positive rate of 0.01% fires about 50,000,000 × 0.0001 = 5,000 times on benign events. Its precision is 5 / 5,005, about 0.1%. Fewer than one alert in a thousand is real.

To reach 50% precision, false positives must fall to about 5 a day, a false-positive rate near 1 in 10 million. No rule achieves that by being clever about the attack alone. It gets there by being narrow: it runs only on the log source where the behavior can occur (process creation on web servers, not every event), and it excludes documented benign cases. Narrowing the population a rule sees is the most powerful tuning move.

### Behavior versus indicators

A rule that matches one known-bad [[indicator-of-compromise|indicator]], such as a file hash or IP address, is precise but brittle; the attacker changes the value and the rule goes blind. A rule that matches behavior, such as a web server starting a command shell, survives those changes but needs tuning, because legitimate software sometimes behaves the same way. Mature rule sets use both, and route each by confidence: high-precision rules page someone, while lower-precision rules feed dashboards or [[threat-hunting]] queues.

## Worked example

The team monitoring `web-01.corp.example` and `web-02.corp.example` wants to detect web shells, ATT&CK technique T1505.003 (Persistence). A web shell is a script an attacker plants on a web server to run commands through it. ATT&CK's detection strategy DET0394 suggests watching for web server processes such as `w3wp.exe` (Microsoft IIS) spawning `cmd.exe` or `powershell.exe`, using process creation events (Sysmon event 1). One event in the fictional log sample looks like this:

```text
2026-10-14T13:05:22.871Z host=web-01.corp.example event=process_creation user="IIS APPPOOL\shop" parent=C:\Windows\System32\inetsrv\w3wp.exe image=C:\Windows\System32\cmd.exe cmdline="cmd.exe /c whoami"
```

**Step 1: build a labeled test set.** The team writes ten synthetic events. Paths are shortened to file names.

| #   | Host   | Parent       | Child            | Command line (shortened)                | Label     |
| --- | ------ | ------------ | ---------------- | --------------------------------------- | --------- |
| 1   | web-01 | w3wp.exe     | cmd.exe          | `cmd.exe /c whoami`                     | Malicious |
| 2   | web-01 | w3wp.exe     | powershell.exe   | `powershell.exe -c Get-ChildItem C:\`   | Malicious |
| 3   | web-02 | w3wp.exe     | cmd.exe          | `cmd.exe /c net user`                   | Malicious |
| 4   | web-02 | httpd.exe    | cmd.exe          | `cmd.exe /c ipconfig /all`              | Malicious |
| 5   | web-01 | w3wp.exe     | cmd.exe          | `cmd.exe /c C:\apps\reports\nightly-export.bat` | Benign (report feature) |
| 6   | web-02 | w3wp.exe     | cmd.exe          | `cmd.exe /c C:\apps\reports\nightly-export.bat` | Benign (report feature) |
| 7   | web-01 | explorer.exe | cmd.exe          | `cmd.exe` (bob at the console)          | Benign    |
| 8   | web-02 | services.exe | svchost.exe      | `svchost.exe -k netsvcs`                | Benign    |
| 9   | web-01 | w3wp.exe     | thumbnailer.exe  | `C:\apps\shop\thumbnailer.exe`          | Benign (app helper) |
| 10  | web-02 | w3wp.exe     | rundll32.exe     | `rundll32.exe` loading a file from a temp folder | Malicious |

**Step 2: write version 1.**

```yaml
title: Command shell started by a web server process
id: 4cf607e0-b35f-48cb-a50e-062ca4233f37
status: experimental
description: Detects cmd.exe or PowerShell started by a web server worker process, a common sign of a web shell. Fictional CyberLab example.
references:
  - https://attack.mitre.org/techniques/T1505/003/
author: CyberLab Studio
date: 2026-10-14
tags:
  - attack.persistence
  - attack.t1505.003
logsource:
  category: process_creation
  product: windows
detection:
  selection_parent:
    ParentImage|endswith:
      - '\w3wp.exe'
      - '\httpd.exe'
  selection_child:
    Image|endswith:
      - '\cmd.exe'
      - '\powershell.exe'
  condition: selection_parent and selection_child
falsepositives:
  - Web applications that legitimately run scripts or helper programs
level: high
```

It fires on events 1 to 6. Events 5 and 6 are false positives, and event 10 is a miss because `rundll32.exe` is not on the child list.

**Step 3: tune.** Version 2 adds the exact report command line as a filter (`condition: selection_parent and selection_child and not filter_reports`). Version 3 inverts the logic: alert on any child of a web server process except a short, documented list of expected children (the report script and `thumbnailer.exe`).

| Version | TP  | FP  | FN  | TN  | Precision | Recall |
| ------- | --- | --- | --- | --- | --------- | ------ |
| 1       | 4   | 2   | 1   | 3   | 0.67      | 0.80   |
| 2       | 4   | 0   | 1   | 5   | 1.00      | 0.80   |
| 3       | 5   | 0   | 0   | 5   | 1.00      | 1.00   |

**Step 4: distrust the perfect score.** Version 3 looks flawless, but the team wrote both the rule and its ten test events, so the test shares the team's blind spots. Version 3 will also fire whenever developers add a new helper program, so its precision depends on change management. Before raising it to `high`, the team replays a week of real web server child processes to count would-be false positives, and asks the red team to produce new positives in a lab. Only then do they choose between version 2 (fewer alerts, a known gap) and version 3 (better coverage, more upkeep).

**Step 5: check the translation.** A converted rule must keep Sigma's meaning. Here is version 2 written by hand in standard SQL over a fictional table whose collector has already extracted file names:

```sql
-- Version 2, hand-translated to standard SQL (fictional process_events table).
-- In standard SQL, a backslash inside a string literal is an ordinary character.
SELECT ts, host, user_name, parent_name, process_name, command_line
FROM process_events
WHERE LOWER(parent_name) IN ('w3wp.exe', 'httpd.exe')
  AND LOWER(process_name) IN ('cmd.exe', 'powershell.exe')
  AND NOT (LOWER(command_line) = 'cmd.exe /c c:\apps\reports\nightly-export.bat');
```

The `LOWER` calls matter: Sigma matches case-insensitively, but equality in many SQL databases is case-sensitive, so a careless translation would quietly lower recall.

## In practice

- **Detection as code.** Keep rules, test events, and ATT&CK tags in version control, require review, and run the tests on every change. Tags also show which techniques have no coverage at all.
- **Exceptions with owners.** Every filter should name its reason, owner, and review date, and match exact values. ATT&CK's detection strategies list "mutable elements," such as time windows, failure thresholds, and which processes count as web servers, that each environment must tune for itself.
- **Route by confidence.** Page someone only for high-precision rules. Send lower-confidence rules to a queue or a hunting dashboard, and group repeated alerts about the same host into one case.
- **Context in the alert.** An alert should carry the host, user, parent process, command line, the rule's description and ATT&CK tag, and a link to the response steps, so the first analyst does not have to start from zero.
- **Limits.** A rule sees only what was logged. Testing with synthetic data can show that a rule fires on the cases you imagined, never that no other attack exists. Software updates change paths and behavior, so rules decay unless they are retested.

## Common misconceptions

- **"A rule with 99.99% accuracy is excellent."** Accuracy counts true negatives, which dominate when attacks are rare. A rule that never fires can score 99.99%. Report precision, recall, and alert volume.
- **"More rules mean better detection."** Each noisy rule consumes attention. Past a point, extra alerts lower the chance that the real one gets investigated.
- **"False positives are harmless."** They cost analyst time, delay real cases, and train people to dismiss the rule.
- **"Passing its tests means the rule works."** Tests cover only the cases someone thought of. Keep adding positives from incidents and exercises, and keep measuring in production.
- **"Precision and recall can both be maximized by tuning."** Most tuning trades one for the other. Narrowing a rule raises precision and risks recall; broadening it does the reverse.

## Try it yourself

The fictional admin console at `admin.shop.example` writes JSON audit events like this one:

```json
{ "ts": "2026-10-14T15:02:11.204Z", "event": "admin.role.change", "actor": "mallory", "target_user": "mallory", "target_role": "admin", "src_ip": "203.0.113.50" }
```

The staff network is `198.51.100.0/24`. Here are eight labeled events (L = should alert):

| #   | Actor         | Event               | Target role | Source IP      | Label |
| --- | ------------- | ------------------- | ----------- | -------------- | ----- |
| 1   | bob           | `admin.role.change` | admin       | 198.51.100.7   | No (approved change) |
| 2   | mallory       | `admin.role.change` | admin       | 203.0.113.50   | L     |
| 3   | alice         | `admin.role.change` | support     | 198.51.100.12  | No    |
| 4   | svc-provision | `admin.role.change` | admin       | 192.0.2.10     | No (provisioning server) |
| 5   | mallory       | `auth.login`        |             | 203.0.113.50   | No (not a role change) |
| 6   | alice         | `admin.role.change` | admin       | 203.0.113.77   | L (stolen session) |
| 7   | bob           | `admin.role.change` | admin       | 198.51.100.7   | L (bob's laptop was compromised) |
| 8   | svc-provision | `admin.role.change` | admin       | 192.0.2.10     | No (provisioning server) |

1. Write a Sigma rule (use `logsource: product: shopadmin`) that alerts when anyone grants the `admin` role from outside the staff network. Use the `cidr` modifier in a filter.
2. Evaluate it on the eight events, fill in the confusion matrix, and compute precision and recall.
3. Add one tuning change, recompute both numbers, and write two sentences on what the change costs.
4. Event 7 comes from the staff network. Which other telemetry from the lesson on logging design ([OPS-01](lesson:OPS-01)) could help catch it?

Check yourself: the straightforward rule should give precision 0.50 and recall about 0.67.

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- A detection rule is a testable claim about which events deserve a human's attention; judge it by precision, recall, and alert volume, not accuracy.
- Sigma describes a rule once in YAML (log source, selections, condition) and converts it to many SIEM query languages.
- Because attacks are rare, even a tiny false-positive rate can produce thousands of false alarms; narrowing what a rule sees is the strongest fix.
- Test every rule against labeled positives and negatives, rerun the tests after each change, and distrust perfect scores on small, self-written test sets.
- Every exception needs an exact match, an owner, and a review date.

## Go deeper

- Axelsson's [base-rate paper](https://doi.org/10.1145/357830.357849) frames detection with Bayes' theorem. Rework this lesson's base-rate example for a rule that sees only 1,000 events a day. What happens to precision, and what does that say about scoping?
- ATT&CK's [detection strategy DET0394](https://attack.mitre.org/detectionstrategies/DET0394/) splits web shell detection into Windows, Linux, and macOS analytics, each with its own log sources and tunable elements. Compare its Windows analytic with the rule in this lesson.
- Open question: how should a team estimate recall when it cannot know how many attacks it missed? Consider purple-team exercises, replayed incidents, and their selection biases.
