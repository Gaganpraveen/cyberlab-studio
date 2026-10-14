---
topicId: HUM-06
title: Insider risk and organizational context
summary: What insider threats are, including unintentional ones, how organizational conditions shape insider risk, and how to assess an alert fairly by separating evidence from assumptions and refusing unfair inferences.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish unintentional, intentional, collusive, and third-party insider threats with examples.
  - Separate the evidence in an insider-risk case from assumptions and from unfair inferences.
  - Explain, with a base-rate calculation, why most insider-risk alerts are false alarms.
  - Describe a fair, multidisciplinary process for assessing and managing insider risk that protects both the organization and its people.
prerequisites: [FND-02, OPS-05]
concepts: [insider-threat, user-activity-monitoring]
keywords:
  - insider threat
  - insider risk
  - insider risk management
  - IRM
  - unintentional insider
  - negligent insider
  - malicious insider
  - collusive threat
  - third-party insider
  - data exfiltration
  - user activity monitoring
  - UAM
  - UEBA
  - insider threat program
  - CERT Common Sense Guide
sources:
  - title: Insider Threat Mitigation Guide
    url: https://www.cisa.gov/resources-tools/resources/insider-threat-mitigation-guide
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: Defining Insider Threats
    url: https://www.cisa.gov/topics/physical-security/insider-threat-mitigation/defining-insider-threats
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Common Sense Guide to Mitigating Insider Threats, Seventh Edition (2022)'
    url: https://www.sei.cmu.edu/library/common-sense-guide-to-mitigating-insider-threats-seventh-edition/
    publisher: Carnegie Mellon University Software Engineering Institute (CERT Division)
quiz:
  - question: Which of these is an unintentional insider threat in CISA's terms?
    choices:
      - An employee sells VPN access to a criminal group.
      - A vendor's technician uses a maintenance account to steal data.
      - An employee who knows the data-handling policy copies customer files to a personal drive to work from home.
      - A departing engineer copies source code for a new employer.
    answer: 2
    explanation: CISA describes negligent insiders as people familiar with security policies who ignore them, creating risk without intending harm. The other choices are collusive, third-party, and intentional threats.
  - question: An insider-risk ticket contains these statements. Which one is evidence?
    choices:
      - Server logs show account bob downloaded 3.2 GB from the design share at 23:40.
      - Bob seemed upset after his performance review.
      - Bob is probably leaving for a competitor.
      - Bob works late, which is suspicious.
    answer: 0
    explanation: The log entry is an observation from a source whose integrity can be checked. The others are a secondhand impression, a speculation, and an unfair inference that treats a normal work pattern as guilt.
  - question: A detector flags every real data thief but also 5% of innocent employees. In a company of 2,000 with 2 real cases, what follows?
    choices:
      - About 95% of flagged people are guilty, so flagged people should lose access immediately.
      - The detector is useless and should be switched off.
      - The flags are reliable because the detector misses no real cases.
      - Only about 2 of roughly 102 flagged people are real cases, so each alert needs context and corroboration before any action.
    answer: 3
    explanation: About 100 innocent people are flagged alongside the 2 real cases, so a flagged person is a real case only about 2% of the time. That is the base-rate fallacy in action, and it is why assessment comes before management.
  - question: Which response to an unusual-download alert follows a fair process?
    choices:
      - Confront the employee publicly so others are deterred.
      - Record the facts, ask the manager one need-to-know question about the work, and escalate to a multidisciplinary team only on defined evidence.
      - Search the employee's personal social media for signs of disloyalty.
      - Suspend the account first and investigate later.
    answer: 1
    explanation: Recording facts without conclusions, gathering business context through a narrow question, and escalating on written criteria protect both the organization and an employee who is most likely innocent.
  - question: Why does an insider-risk program built on profiles of personal traits backfire?
    choices:
      - Profiles are too expensive to compute.
      - Traits are always private, so profiles are empty.
      - Traits predict behavior poorly when real cases are rare, they direct suspicion at people for who they are, and they erode the trust that makes people report problems.
      - Profiles work well, but only for contractors.
    answer: 2
    explanation: Low base rates make weak indicators produce mostly false alarms, profiles based on who someone is are discriminatory, and a workforce that feels watched and judged reports less.
---

## Why it matters

Most security controls watch the boundary between outsiders and the organization. An insider is already inside: an employee, contractor, or partner with legitimate access. The Cybersecurity and Infrastructure Security Agency (CISA) defines an [[insider-threat]] as "the threat that an insider will use their authorized access, intentionally or unintentionally," to harm the organization's mission, people, facilities, information, or systems. Because an insider's harmful actions use the same accounts and permissions as their daily work, they can look exactly like normal activity.

Two words in that definition matter most. "Unintentionally" means the category includes the employee who emails a spreadsheet to the wrong person or who ignores a policy to meet a deadline, not just the rare saboteur. And "authorized access" means the organization itself decides how much harm any one person could do, through the access it grants and the conditions it creates.

There is a second risk: the insider-risk program itself. Monitoring employees, interpreting their behavior, and acting on suspicion can harm innocent people, erode trust, and invite bias. A program that cannot tell evidence from assumption will be both unfair and ineffective.

## The core idea

Insider risk comes from the combination of access, opportunity, and either intent or error, inside a particular organizational context. Three assumptions guide a fair assessment:

1. **Most unusual activity has an innocent explanation.** Deadlines, new projects, and travel all change how people work.
2. **The organization shapes the risk.** Excess privileges, slow removal of access after someone leaves, unclear rules, and stressful or unfair conditions all raise it.
3. **Every judgment must keep observation separate from interpretation.** An alert is a reason to gather evidence, not evidence of wrongdoing.

Medical screening is a useful analogy. A positive result on a screening test for a rare condition is usually a false alarm, so a good clinician confirms with further tests before treating, and never treats a patient differently because of who they are rather than what the tests show.

## How it works

### Types of insider threat

CISA distinguishes several types, summarized here in the agency's terms:

| Type                          | Description                                                                   | Fictional example                                         |
| ----------------------------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| Unintentional: negligence     | Familiar with security policies but ignores them, creating risk              | Bob stores customer files on a personal drive to work from home |
| Unintentional: accidental     | Mistakenly causes an unintended risk                                          | Alice emails a payroll file to the wrong "Alex"           |
| Intentional (malicious)       | Harms the organization for personal gain or to act on a grievance            | A departing engineer copies source code for a new employer |
| Collusive                     | One or more insiders collaborate with an external threat actor               | An employee sells VPN access to a criminal group          |
| Third-party                   | Contractors or vendors who are not formal members but have been granted access | A vendor's technician misuses a maintenance account     |

CISA also lists the forms harm can take: violence, espionage, sabotage, theft, and cyber acts that combine them through technology.

### The mitigation cycle

CISA's _Insider Threat Mitigation Guide_ organizes a program around four activities: defining the threat, detecting and identifying it, assessing it, and managing it. In practice:

- **Define.** Decide which assets matter, such as customer data, source code, and payment systems, and what harm to them would look like.
- **Detect and identify.** Collect signals, both technical (unusual downloads, access outside a person's role) and behavioral (threats, repeated policy violations), within clear legal and policy limits. Collecting such signals is called [[user-activity-monitoring]].
- **Assess.** Gather context and corroborating evidence before drawing any conclusion.
- **Manage.** Respond in proportion to the evidence, from closing a false alarm to changing access, supporting the person, or involving HR and legal staff.

### Evidence, assumption, and unfair inference

The central skill is sorting what a case file says into three kinds of statement:

- **Evidence** is what was observed or measured, such as a log entry or a file record, ideally from a source whose integrity you can check.
- **An assumption** is an interpretation that might be true but has not been shown, such as "he is unhappy" or "she plans to leave."
- **An unfair inference** draws a conclusion from something that is not evidence of the behavior at all, such as a person's national origin, religion, family ties, health, or a normal work pattern like staying late.

Unfair inferences are not only wrong; they are harmful. They direct suspicion at people for who they are, they make investigators see what they expect, and they waste attention that real evidence deserves.

### Why most alerts are false alarms

Base rates explain why an alert alone proves little. The numbers below are fictional but realistic in shape. shop.example has 2,000 employees, and suppose 2 of them are actually stealing data this year. A detector catches every real case but also flags 5% of innocent employees, about 100 people.

```text
Real cases flagged:        2
Innocent people flagged: 100   (5% of 1,998)
Chance a flagged person is a real case: 2 / 102 = about 2%
```

Even with a detector this sensitive, about 98 of every 100 flagged people did nothing wrong. Ignoring this is the [[base-rate-fallacy]], and it is why the assessment step, with context and corroboration, cannot be skipped.

## Worked example

> [!NOTE]
> shop.example, Bob, and every detail of this case are fictional.

**The alert.** The monitoring system raises an alert: account `bob` downloaded 3.2 GB from the design share at 23:40, nine times his 30-day average. Before the alert reaches an analyst, a colleague adds notes to the ticket.

**Step 1: Sort the case file.**

| Statement in the file                                       | Category                  | Reasoning                                                         |
| ----------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| Account `bob` downloaded 3.2 GB from the design share at 23:40 | Evidence                | From server logs; confirm the logs are intact and the session was Bob's |
| The volume is nine times his 30-day average                 | Evidence (derived)        | A calculation; depends on the baseline period chosen             |
| "Bob seemed upset after his performance review"            | Assumption                | A secondhand impression, not observed behavior                    |
| "He's probably leaving for a competitor"                    | Assumption                | Speculation with no supporting record                             |
| "He works late, which is suspicious"                        | Unfair inference          | A normal work pattern treated as guilt                            |
| "His spouse works at a competitor"                          | Unfair inference          | A family relationship is not evidence of any act                  |
| "He moved here from another country"                        | Unfair inference          | Irrelevant to behavior; using it is discriminatory                |

The analyst removes the assumptions and inferences from the working record and keeps the two pieces of evidence.

**Step 2: Gather context.** The analyst asks Bob's manager one narrow question, sharing only what the manager needs to know.

```sequence
title: Assessing an insider-risk alert (fictional)
participant D as Monitoring system
participant A as Analyst
participant M as Bob's manager
participant T as Insider risk team
D -> A: Alert: unusual download volume by bob
note A: Record facts only; no conclusions yet
A -> M: Is a large design download expected this week?
M --> A: Yes, a client presentation is due tomorrow
A -> D: Closes alert as explained; notes the context
A -x T: No escalation; nothing added to Bob's record
```

**Step 3: Decide.** The files match Bob's assigned client project, and the timing matches the deadline. The alert is closed as explained, and nothing is added to Bob's record.

**Step 4: Ask what would have changed the answer.** The analyst writes down the evidence that would justify escalation: files unrelated to Bob's projects, copies sent to a personal cloud account, or a download right after a resignation notice. Any of those would go to the insider-risk team, which brings in HR and legal staff, preserves the evidence, follows written policy, and gives Bob a chance to explain before any decision.

## In practice

- **Reduce what any one person can do.** Apply [[least-privilege]] and [[separation-of-duties]], review access regularly, and remove access promptly when people change roles or leave, as in [[deprovisioning]].
- **Design for the unintentional insider.** Clear data-handling rules, safe tools for sharing files, and training that explains why the rules exist make the safe way to work the easy way.
- **Monitor transparently and proportionately.** Tell employees what is monitored and why, collect only what the defined risks require, restrict who can see the data, and have legal staff review the program.
- **Assess as a team.** The CERT Division's guide, built on more than 3,000 insider cases, addresses managers, HR, legal counsel, and IT staff as well as security teams, because each sees part of the picture. A written process with documented thresholds protects against individual bias.
- **Attend to the workplace.** CISA's description of malicious insiders includes people acting on a grudge. Fair treatment, supportive managers, and safe ways to raise grievances address grievances before they turn into harm, and they make people more willing to report concerns.

Every one of these has limits. Monitoring will never catch a careful insider who stays within normal patterns, and too much of it damages the trust that makes people report problems. That is why access design and organizational culture carry as much weight as detection.

## Common misconceptions

- **"Insider threat means malicious employees."** CISA's definition includes unintentional harm, such as mistakes and ignored policies, and harm by contractors and partners.
- **"More monitoring means more security."** Without context and corroboration, more monitoring mostly means more false alarms and less trust.
- **"Behavioral profiles can predict who will attack."** Indicators are weak predictors when the base rate is low, and profiles built on personal traits invite discrimination.
- **"An alert is evidence."** An alert is a reason to look for evidence. Many innocent explanations fit the same data.
- **"Insider risk is a job for the security team alone."** Assessment and response need HR, legal, and management, working under written policy.

## Try it yourself

This is a paper exercise about a fictional case. Do not apply it to real colleagues or classmates.

> [!NOTE]
> Case file, Fernwood College (fictional). Account `alice` in the registrar's office exported 4,800 student records on a Saturday. Notes added to the ticket: "Alice has been stressed lately." "Alice recently bought an expensive car." "The export ran from an IP address at her home ISP." "Alice is in a union dispute with the college." "Exports of this size happen each term before grade reports are due."

1. Sort each statement into evidence, assumption, unfair inference, or context.
2. Write the single question you would ask first, and name who you would ask.
3. Using the base-rate example above, explain in two sentences why one alert cannot justify action against Alice.
4. List two pieces of evidence that would justify escalation, and two that would close the case.
5. Draft a one-paragraph rule for when an alert is escalated to the insider-risk team, written so that it could not be triggered by a personal characteristic.

## Key takeaways

- Insider threats include unintentional and third-party harm, not just malicious employees.
- The organization's access design and working conditions shape insider risk as much as individual intent does.
- Separate evidence from assumptions, and reject inferences drawn from who a person is rather than what they did.
- Low base rates mean most alerts are false alarms, so assessment with context must come before any action.
- Fair, transparent, multidisciplinary processes protect people and make the program more effective.

## Go deeper

- Read CISA's _Insider Threat Mitigation Guide_ and map its four activities onto a program at an organization you know. Where would the privacy review sit?
- The seventh edition (2022) of the CERT Division's _Common Sense Guide to Mitigating Insider Threats_ presents 22 best practices. Classify them: which address the organization's own conditions, and which address individual behavior?
- Open question: what level of monitoring is proportionate for a university, whose staff and students expect academic freedom and privacy? Who should decide?
