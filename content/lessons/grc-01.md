---
topicId: GRC-01
title: Risk assessment and treatment
summary: How an organization identifies, rates and prioritizes cybersecurity risks, records them in a transparent risk register, and decides whether to accept, avoid, mitigate or transfer each one.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Describe a risk as a scenario that names the asset, threat event, vulnerability, likelihood and impact.
  - Rate a scenario against defined likelihood and impact scales and justify the rating with evidence and stated assumptions.
  - Choose among accept, avoid, mitigate and transfer for a given risk and explain what each response leaves behind.
  - Build a risk register entry with an owner, a response, a residual estimate and a review date.
  - Explain why multiplying ordinal ratings can mislead and how a transparent register guards against it.
prerequisites: [FND-02, FND-08]
concepts: [risk-assessment, risk-register, risk-treatment, risk-appetite, inherent-risk]
labs: []
keywords:
  - risk register
  - risk matrix
  - heat map
  - risk appetite
  - risk tolerance
  - inherent risk
  - residual risk
  - risk acceptance
  - risk owner
  - accept avoid mitigate transfer
  - NIST SP 800-30
  - NIST SP 800-37
  - RMF
  - NIST IR 8286
  - CSRR
  - ERM
  - ISO/IEC 27005
  - CSF 2.0
  - GV.RM-02
  - ID.RA-06
sources:
  - title: 'NIST SP 800-30 Rev. 1: Guide for Conducting Risk Assessments'
    url: https://csrc.nist.gov/pubs/sp/800/30/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-30
  - title: 'NIST IR 8286 Rev. 1: Integrating Cybersecurity and Enterprise Risk Management (ERM)'
    url: https://csrc.nist.gov/pubs/ir/8286/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-csf-2
  - title: 'NIST SP 800-37 Rev. 2: Risk Management Framework for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/37/r2/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'ISO/IEC 27005:2022: Guidance on managing information security risks'
    url: https://www.iso.org/standard/80585.html
    publisher: International Organization for Standardization (ISO) and IEC
    license: All rights reserved
quiz:
  - question: What most clearly separates a documented risk acceptance from simply ignoring a risk?
    choices:
      - The risk has no published vulnerability identifier yet.
      - The control that would reduce the risk costs more than the asset is worth.
      - A person with authority decides, records the reason and residual level, and sets a date to revisit it.
      - An auditor has reviewed the system in the past year.
    answer: 2
    explanation: Acceptance is a decision, not an absence of one. It needs an accountable owner, a stated reason within the organization's tolerance, and monitoring with an expiry date. Cost and audits can inform the decision but do not make it.
  - question: On a 1 to 5 scale, risk A has likelihood 5 and impact 2, and risk B has likelihood 2 and impact 5. Both multiply to 10. What is the best conclusion?
    choices:
      - The two risks are equally important and can share one treatment plan.
      - The product hides that A is a frequent nuisance and B a rare, severe event, which usually need different responses.
      - B is always more important, because impact outweighs likelihood.
      - The scale must be wrong, because two different risks can never tie.
    answer: 1
    explanation: The numbers on an ordinal scale record order, not size, so their product is not a measurement. Equal scores can hide very different risk shapes. A frequent nuisance might call for automation; a rare disaster might call for backups and a recovery plan.
  - question: A college buys cyber insurance that pays breach-notification costs. Which statement is accurate?
    choices:
      - The breach risk is eliminated, so it can be removed from the register.
      - The college no longer has to notify affected students.
      - Insurance lowers the likelihood that a breach occurs.
      - Part of the financial consequence is transferred, but the harm to students, legal duties and lost trust stay with the college.
    answer: 3
    explanation: Transfer shares some consequences with another party. It does not change the likelihood, and it cannot transfer non-financial harm such as lost trust. The risk stays on the register with its residual level.
  - question: SubmitIt's grade-tampering risk was rated High before the department added MFA and a weekly grade-change review, and Low afterward. What does the Low rating represent?
    choices:
      - Residual risk, which holds only if the new controls work as assumed.
      - Inherent risk, because the controls are now part of the system.
      - The department's risk appetite.
      - The likelihood alone, since impact cannot change.
    answer: 0
    explanation: Residual risk is what remains after a response. It rests on assumptions about the controls, so if MFA is bypassed or the review stops happening, the rating is wrong. Note that the review lowered impact, not just likelihood.
  - question: Which change does the most to make a risk register transparent?
    choices:
      - Replacing each rating with one overall score.
      - Removing low risks so the register stays short.
      - Recording the evidence and assumptions behind each rating, so others can check and challenge it.
      - Letting each team define its own rating scale.
    answer: 2
    explanation: Transparency means a reader can see why a rating was given. Evidence and assumptions let a newcomer find the weak points in the reasoning. Single scores and team-specific scales hide that reasoning, and deleting low risks hides what was considered.
---

## Why it matters

Every IT team has more weaknesses than time or money to fix them. A college department might run an aging web server, a lab of shared workstations and a dozen cloud services, each with open issues. Without a method, the loudest complaint or the latest headline sets the order of work. [[risk-assessment|Risk assessment]] replaces that with an explicit argument: which harmful events are plausible, how bad each would be, and which deserve attention first.

Assessment alone changes nothing. [[risk-treatment|Risk treatment]] turns the ranked list into decisions with named owners: fix this, stop doing that, insure against the other, and live with the rest on purpose. The [[risk-register]] records those decisions, so after an incident it can answer the first two questions: "did we know?" and "what did we decide, and why?"

These ideas are central to US practice. Among the outcomes in the [[nist-csf|NIST Cybersecurity Framework (CSF) 2.0]] are risk appetite and risk tolerance statements that are established, communicated and maintained (GV.RM-02), and risk responses that are chosen, prioritized, planned, tracked and communicated (ID.RA-06). Federal agencies apply the same ideas through the Risk Management Framework (RMF) in NIST SP 800-37.

## The core idea

Start with the assumptions. Risk concerns events that have not happened yet, so it is an estimate made under uncertainty, never a measurement, and only as good as its evidence. It is also relative: the same weakness matters more on a server that holds grades than on a lab printer, so every assessment is anchored to the organization's mission.

NIST SP 800-30 treats [[risk]] as a function of two things: the [[likelihood]] that a threat event occurs and causes harm, and the [[impact]], meaning how much harm results if it does. A risk is therefore a scenario, not a single fact. A [[threat]] source carries out an event that exploits a [[vulnerability]] in an [[asset]] and produces an adverse impact. "Our server is unpatched" is a vulnerability. "An outside attacker exploits the unpatched framework on the grading server and alters final grades" is a risk you can rate and treat.

Think of a weather forecast. A 70 percent chance of rain is a likelihood. Whether you carry an umbrella depends on the impact (a soaked suit before an interview, or damp gym clothes) and on how much discomfort you will accept. For an organization, that last quantity is its [[risk-appetite]]: the amount and type of risk it is willing to take to meet its objectives. Its narrower partner, risk tolerance, is a specific, measurable limit, such as "no outage longer than four hours during finals week."

[[inherent-risk|Inherent risk]] usually means the level before controls are counted; some registers record "current risk" with existing controls instead, so say which one you use. [[residual-risk|Residual risk]] is what remains after a response, assuming the controls work as intended. Treatment aims to bring residual risk within appetite. It rarely reaches zero.

## How it works

### The four steps of an assessment

SP 800-30 places assessment inside a cycle taken from NIST SP 800-39: frame the risk (set assumptions, constraints, appetite and priorities), assess it, respond to it, and monitor it. It applies at three tiers: the organization, a mission or business process ("can we keep grading fair?"), and an information system. The assessment itself has four steps.

1. **Prepare.** State the purpose, scope, assumptions, constraints and information sources, and the risk model: which factors you will rate, on what scales.
2. **Conduct.** Identify threat sources and events. Identify vulnerabilities and predisposing conditions, circumstances such as running everything on one server that make harm more or less likely. Then determine likelihood and the magnitude of impact, and combine them into a level of risk.
3. **Communicate.** Give the results to the people who decide, in a form they can act on.
4. **Maintain.** Keep the assessment current. SP 800-30 stresses that assessments are not one-time activities, because threats, systems and missions change.

### Rating scales

An assessment is quantitative when it uses numbers whose ratios mean something (a probability of 0.1 per year, a loss of $40,000), qualitative when it uses labeled levels such as low, moderate and high, and semi-quantitative when it uses bins or representative numbers that have meaning only inside that assessment. Good data on cyber events is scarce, so the last two are common.

A scale is useful only if two people would give a scenario the same level, which takes anchors: concrete descriptions of what each level means here. "High impact" means nothing until you say for whom, and how bad.

Ratings are then combined, often in a matrix of likelihood against impact. The matrix is a policy choice: it encodes how much the organization fears rare disasters compared with frequent nuisances. Be careful with arithmetic on labels. If "likelihood 5, impact 2" and "likelihood 2, impact 5" both multiply to 10, the score calls them equal, yet one is a frequent annoyance and the other a rare catastrophe, and they need different responses. Numbers on an ordinal scale record order, not size.

### Four ways to respond

| Response | What it does | Example | What it leaves behind |
| --- | --- | --- | --- |
| Accept | Keeps the risk because it is within tolerance, and monitors it | Short outages outside deadline weeks | The whole risk, as a documented choice |
| Avoid | Stops the activity that creates the risk | Retire a custom app instead of patching it | The lost benefit, plus risks of the replacement |
| Mitigate | Applies [[security-control|security controls]] that lower likelihood, impact or both | Require [[mfa]] for staff logins | Residual risk, and the chance the control fails |
| Transfer | Shifts part of the consequences to another party by insurance or contract | Insurance that pays breach-notification costs | Most non-financial harm, such as lost trust |

These names follow NIST IR 8286 Rev. 1, which notes that some consequences, such as lost customer trust, cannot be transferred. SP 800-30 also lists sharing. ISO/IEC 27005:2022 gives comparable guidance for organizations that run an ISO/IEC 27001 management system.

### The risk register

A risk register is the working record of identified risks and the decisions made about them. NIST IR 8286 Rev. 1 proposes a notional template whose fields fall into four groups:

- **Identification:** an ID, a priority, a risk description and a risk category.
- **Current assessment:** likelihood, impact, and an exposure rating that combines them.
- **Response:** the response type, its cost, and a description of the planned action.
- **Accountability:** the risk owner and the current status.

The risk owner is the person with authority to accept the risk and fund its treatment, usually a manager rather than the technician who runs the system. For transparency, this lesson adds four columns the NIST template leaves implicit: the evidence behind each rating, the assumptions made, the expected residual level, and the next review date. Then a newcomer can see why each decision was made, and challenge it.

## Worked example

The Computer Science department runs SubmitIt, an assignment-submission service at `submit.college.test` on one virtual machine at `192.0.2.20`. Students such as bob upload their work. Teaching assistants (TAs) such as alice download it and enter grades, which sync to the registrar every night. The chair wants a risk register before finals.

**Step 1: frame and prepare.** The chair sets the appetite: low for threats to grade integrity or student privacy, moderate for brief outages outside deadline weeks. The tolerance: during finals week, students must be able to submit within four hours of any failure. Grades are education records protected by [[ferpa]] ([GRC-04](lesson:GRC-04)), so altering or disclosing them is high impact. The scope is SubmitIt and its accounts for the next twelve months. To stay small, it uses three levels, not the five in SP 800-30's sample scales.

| Level | Likelihood in the next 12 months | Impact on teaching and fair grading |
| --- | --- | --- |
| High | Expected: seen here before, or widely exploited | Many students' grades or work lost or altered, records disclosed, or submission down over four hours in finals |
| Moderate | Plausible: seen at comparable services | One course misses a deadline, or limited non-sensitive data exposed |
| Low | Unlikely: needs an unusual chain of events | A short outage outside deadline weeks |

The matrix is fixed before any rating:

| Likelihood / Impact | Low | Moderate | High |
| --- | --- | --- | --- |
| High | Moderate | High | High |
| Moderate | Low | Moderate | High |
| Low | Low | Low | Moderate |

**Step 2: identify, rate and respond.** The administrator and the chair write each risk as a full scenario, rate it, and compare it with the appetite.

- **R1, grade tampering.** An outside attacker replays passwords leaked from other sites against SubmitIt's password-only login ([[credential-stuffing]]), signs in as a TA, and changes grades. Last term's logs show bursts of failed logins from many addresses. High and high give High, far above appetite, so the department **mitigates**. Campus single sign-on with MFA lowers likelihood to Low. A weekly grade-change review, reconciled with the registrar before grades are final, lowers impact to Moderate, because tampering would be caught and reversed. Residual: Low.
- **R2, lost submissions.** The virtual machine fails, or [[ransomware]] encrypts it, during finals week, and the only [[backup]] sits on a second disk of the same machine. Moderate and high give High. **Mitigate** with daily backups copied to off-host storage the machine cannot overwrite, a restore test each term, and a fallback to the campus learning management system (LMS). Residual: Moderate, which the chair accepts in writing until January, since the fallback lets students submit even if a restore takes a day ([GRC-05](lesson:GRC-05) sets recovery targets).
- **R3, unpatched framework.** The web framework reached end of life last year and gets no security fixes. Moderate and high give High. **Avoid:** retire the custom upload page at the end of term and use the LMS assignment tool, which central IT patches. Avoidance creates a new dependency, so the register gains R5, "LMS outage or breach," a third-party risk for [GRC-06](lesson:GRC-06).
- **R4, short outage.** The single network link fails for a few hours outside deadline weeks. Moderate and low give Low, within appetite, so the risk is **accepted**, with an uptime alert as monitoring.

**Step 3: record.** The summary register reads:

| ID | Scenario | Current level | Response | Residual | Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Leaked passwords used to change grades | High | Mitigate: MFA, grade-change review | Low | Chair | Due Oct 31 |
| R2 | Failure or ransomware loses finals work | High | Mitigate: off-host backups, LMS fallback | Moderate, accepted | Chair | Planned |
| R3 | End-of-life framework | High | Avoid: move to LMS | New risk R5 | Chair | Approved |
| R4 | Short off-peak network outage | Low | Accept: uptime alert | Low | Administrator | Accepted |

The full entry for R1 shows the transparency fields:

```yaml
id: R1
priority: 1
category: Integrity of education records
description: >
  An outside attacker replays passwords leaked from other sites against
  SubmitIt's password-only login, signs in as a TA, and changes grades.
asset: Course grades in SubmitIt (submit.college.test, 192.0.2.20)
threat_source: External attacker using leaked credential lists
vulnerability: Password-only login with no limit on failed attempts
evidence:
  - Bursts of failed logins from many addresses in last term's logs
  - Credential stuffing against password-only logins is widespread
assumptions:
  - Some TAs reuse passwords from other sites, like any user group
  - No alert exists today for unusual grade changes
current: { likelihood: High, impact: High, level: High }
response:
  type: Mitigate
  actions:
    - Move SubmitIt logins to campus SSO with MFA
    - Log every grade change, review weekly, reconcile before grades are final
  cost: About 40 staff hours; the SSO service is already licensed
  control_owner: Lab systems administrator
residual_target: { likelihood: Low, impact: Moderate, level: Low }
risk_owner: CS department chair
status: In progress, due 2026-10-31
next_review: 2027-01-15
```

The evidence and assumptions make this entry transparent: if the failed-login bursts turn out to come from a misconfigured campus scanner, everyone can see which rating to revisit.

## In practice

- **Separate the roles.** The assessor estimates, the risk owner decides, and the control owner implements. The person who runs a system should not be the only one rating its risks, and should never accept them alone. In the RMF, a senior official, the authorizing official, decides whether a federal system may operate.
- **Calibrate the raters.** Have two people rate each scenario independently and discuss differences, which usually expose a hidden assumption.
- **Make acceptance real.** An acceptance names the person, the residual level, the reason and an expiry date. A CSF 2.0 outcome is that changes and exceptions are managed, assessed for risk impact, recorded and tracked (ID.RA-07).
- **Keep it alive.** Review on a schedule and whenever something changes: a new system, an incident, a new kind of attack, or more sensitive data.
- **Connect it upward.** A department register should feed the institution's enterprise risk management (ERM), so leaders see cybersecurity risk beside financial and safety risk, as the NIST IR 8286 series describes.
- **Know the limits.** A register lists only the risks people thought of and treats them as independent, even when one event triggers several. Ratings built on thin evidence should say so.

## Common misconceptions

- **"A vulnerability is a risk."** A vulnerability is one ingredient. Without a plausible threat and a meaningful impact, a severe-looking flaw can be low risk, and a modest flaw on a critical asset can be high risk.
- **"A risk score is a measurement."** Labels like "High" and products like 4 × 5 are judgments in a convenient format. Use them to rank and discuss, and keep the evidence beside them.
- **"Accepting a risk means ignoring it."** Acceptance is a documented decision by someone with authority, within stated tolerance, monitored and revisited.
- **"Insurance or a contract makes the risk go away."** Transfer shifts part of the financial consequences. The data is still yours, the students are still affected, and legal duties usually stay with the institution.
- **"The register is finished when the audit passes."** A register that is not updated describes last year's system and last year's threats.

## Try it yourself

On paper, build a small, transparent risk register for a fictional college computer lab. Room 214 at `college.test` has 30 shared workstations on `198.51.100.0/24`, a file server for coursework, a shared printer, a badge reader on the door, and logins from the campus directory. It is open until midnight, and student workers staff the desk.

1. **Frame.** Write a one-sentence appetite statement and one measurable tolerance, such as how long the lab may be down in the last week of term.
2. **Define scales.** Write anchors for three likelihood and three impact levels, and draw your matrix before rating anything.
3. **Identify five scenarios.** Write each as a sentence naming the threat source, event, vulnerability or predisposing condition, asset and harm. Include one non-malicious scenario, such as a failed disk.
4. **Rate and justify.** Record likelihood, impact and level, with your evidence and at least one assumption.
5. **Treat.** Choose a response for each, using at least three of the four types, and say what each leaves behind.
6. **Record.** Fill in the columns below. Name every owner by role, not by person.
7. **Challenge.** Swap registers with a classmate. Each of you picks the least convincing rating and writes one question whose answer would change it.

```text
ID | Scenario | Evidence | Assumptions | L | I | Level | Response | Action | Residual | Risk owner | Review date
```

## Key takeaways

- A risk is a scenario (threat, vulnerability, asset, impact) rated by likelihood and impact under uncertainty.
- Fix the scales and combination rule before rating, and record the evidence and assumptions behind each rating.
- Each risk gets one of four responses, accept, avoid, mitigate or transfer, and each leaves something behind.
- Residual risk depends on controls working as assumed, so an acceptance needs an owner, a reason and an expiry date.
- A register is a living decision record, not an audit artifact.

## Go deeper

- [NIST IR 8286A Rev. 1](https://csrc.nist.gov/pubs/ir/8286/a/r1/final) (2025) adds detail on identifying and estimating risk, gives examples of risk appetite and tolerance, and describes documenting risk scenarios to support an enterprise risk register.
- Louis Anthony (Tony) Cox showed that risk matrices can rate quantitatively smaller risks above larger ones and can lump very different risks into one cell: ["What's Wrong with Risk Matrices?"](https://ideas.repec.org/a/wly/riskan/v28y2008i2p497-512.html), _Risk Analysis_ 28(2), 2008.
- Open question: how should an institution roll many correlated risks, where one event triggers several entries, into one honest picture for leaders?
