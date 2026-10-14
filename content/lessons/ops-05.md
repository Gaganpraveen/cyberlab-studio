---
topicId: OPS-05
title: Triage and incident classification
summary: Learn how responders decide quickly whether an alert is a real incident, what kind of incident it is, and how urgently it needs attention, using impact-based criteria and a severity matrix while recording what is still uncertain.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish events, adverse events, and incidents, and apply an organization's incident criteria to declare one.
  - Triage an alert by validating it, scoping it, and assigning an incident category.
  - Rate severity with a matrix built from functional impact, information impact, and recoverability, and set priority from severity and urgency.
  - Record confidence, assumptions, and open questions with each classification, and revise it as evidence arrives.
  - Explain why incidents are prioritized by impact instead of being handled first come, first served.
prerequisites: [OPS-03, FND-02]
concepts: [security-incident, triage, incident-severity]
labs: []
keywords:
  - incident triage
  - incident classification
  - incident categorization
  - incident declaration
  - prioritization
  - severity matrix
  - priority
  - urgency
  - functional impact
  - information impact
  - recoverability
  - attack vector
  - escalation
  - adverse event
  - NIST SP 800-61 Rev. 3
  - SP 800-61r3
  - DE.AE-08
  - RS.MA-02
  - RS.MA-03
  - RS.AN-08
  - NCISS
  - Cyber Incident Severity Schema
sources:
  - title: 'NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile'
    url: https://csrc.nist.gov/pubs/sp/800/61/r3/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-61
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
  - title: Federal Incident Notification Guidelines
    url: https://www.cisa.gov/federal-incident-notification-guidelines
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
quiz:
  - question: Under the NIST SP 800-61 Rev. 3 vocabulary, which statement is correct?
    choices:
      - Every event is an incident until proven otherwise.
      - A power failure can be an adverse event without being a cybersecurity incident.
      - An incident requires confirmed data theft.
      - Adverse events are only events caused by attackers.
    answer: 1
    explanation: An event is any observable occurrence involving computing assets; an adverse event is one with a negative consequence regardless of cause, including power failures; an incident jeopardizes confidentiality, integrity, or availability without lawful authority, or violates law or security policy. Further analysis decides whether an adverse event is an incident.
  - question: Three incidents arrive in this order. Which should the team work on first?
    choices:
      - The first one to arrive, since fairness requires first come, first served
      - A phishing message that two users clicked, with no sign that credentials were entered
      - An account compromise in which the intruder may still be connected to a server holding finance data
      - A slow marketing website, because customers can see it
    answer: 2
    explanation: SP 800-61 Rev. 3 says incidents should not be handled first come, first served. The possibly active intruder near sensitive data has the highest potential impact and the most urgency, because every minute of delay can increase the damage.
  - question: Facts are still unclear an hour into an incident. What is the best way to classify it?
    choices:
      - Assign the severity the evidence supports now, note the plausible worst case as potential severity, record confidence and open questions, and set a time to reassess.
      - Wait to assign any severity until the investigation is complete.
      - Always assign the highest severity, since it is safest.
      - Assign the lowest severity until damage is proven.
    answer: 0
    explanation: Classification is a decision under uncertainty, and waiting is also a decision. Recording current and potential severity, confidence, and a reassessment time keeps the response proportionate and makes later changes traceable.
  - question: Using CISA's federal impact categories, how would you describe a case where the team believes data may have been taken but has not confirmed what, if anything, was lost?
    choices:
      - Information impact of "No Impact"
      - Recoverability of "Not Recoverable"
      - Functional impact of "Denial of Critical Services/Loss of Control"
      - Information impact of "Suspected but Not Identified"
    answer: 3
    explanation: CISA separates functional impact (effect on services), information impact (effect on data), and recoverability (what recovery takes). "Suspected but Not Identified" records exactly this uncertainty about data, and can be revised as facts emerge.
---

## Why it matters

A security team that receives hundreds of alerts a day cannot investigate every one in depth, and it should not work through them in arrival order. NIST is blunt about this: "Because of resource limitations, incidents should not be handled on a first-come, first-served basis" ([SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final)). [[triage]] decides what gets attention first and how much.

Both directions of error are expensive. Classify too low, and an intruder keeps working: the spraying case in the lesson on [SIEM querying](lesson:OPS-03) looked like routine failed sign-ins until someone noticed the one success, the VPN session, and the upload. Classify too high, and the team pulls people off other work, alarms executives, and teaches everyone that "critical" does not mean much.

Classification also starts clocks. US federal agencies must notify CISA within one hour of an incident's identification by their top-level security team ([CISA guidelines](https://www.cisa.gov/federal-incident-notification-guidelines)), and many organizations have contractual or legal notification duties. Responders need a shared, defensible way to say what kind of incident this is and how bad it is, quickly, while the facts are still incomplete.

## The core idea

Precise words help. NIST SP 800-61 Rev. 3 defines an **event** as "any observable occurrence that involves computing assets," and an **adverse event** as one "associated with a negative consequence regardless of cause," which includes natural disasters and power failures as well as attacks. A [[security-incident]] is narrower. The definition NIST uses comes from FISMA: "an occurrence that actually or imminently jeopardizes, without lawful authority, the integrity, confidentiality, or availability of information or an information system; or constitutes a violation or imminent threat of violation of law, security policies, security procedures, or acceptable use policies." Most events are not adverse, and most adverse events are not incidents; NIST notes that further analysis is often needed to tell. The [[nist-csf]] 2.0 asks organizations to decide this with written rules: DE.AE-08, "Incidents are declared when adverse events meet the defined incident criteria."

The word triage comes from emergency medicine, where staff sort patients by urgency before anyone has a full diagnosis. The goal is not the final answer. It is the right next action for each case, in the right order. Security triage answers four questions:

1. **Is it real?** Validate the alert.
2. **What is it?** Assign a category.
3. **How bad, and how urgent?** Rate severity and set priority.
4. **What do we not know yet?** Record the uncertainty, and when to look again.

Two terms are easy to blur. [[incident-severity]] measures impact: how much harm the incident is doing or could do. **Priority** is the order of work, which also depends on urgency (is the attacker still active, is it spreading?) and on available people. A severe incident that is fully contained can wait an hour; a medium one that is spreading cannot.

## How it works

### Validate

Start with the alert itself. Does the rule have a history of false positives? Is the data complete and correctly parsed? Is there a benign explanation, such as a change ticket, a maintenance window, or an authorized test? Is there corroborating evidence in another source? The CSF 2.0 phrases this step as RS.MA-02, "Incident reports are triaged and validated." Every closed false positive should go back to the rule's owner, as described in the lesson on [detection rules](lesson:OPS-02).

### Categorize

The category says what kind of incident this is, which selects the response plan and the people. SP 800-61 Rev. 3 gives examples such as data breach, ransomware, account takeover, and denial of service. CISA's federal guidelines add an attack vector taxonomy for reporting: Web, Email/Phishing, External/Removable Media, Impersonation/Spoofing, Improper Usage, Loss or Theft of Equipment, Attrition, Other, and Unknown. One incident can change category as facts emerge; an "account takeover" can become a "data breach."

### Rate severity

SP 800-61 Rev. 3 lists risk factors for prioritizing, including asset criticality, the functional impact of the incident, the data impact, and recoverability. CISA's federal guidelines turn three of these into category scales for reporting:

| Dimension          | Question it answers             | CISA's categories, in the order the guidelines list them                                                                                                                                                                      |
| ------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional impact  | How much are services affected? | No impact; no impact to services; minimal impact to non-critical services; minimal impact to critical services; significant impact to non-critical services; denial of non-critical services; significant impact to critical services; denial of critical services or loss of control |
| Information impact | What happened to the data?      | No impact; suspected but not identified; privacy data breach; proprietary information breach; destruction of non-critical systems; critical systems data breach; core credential compromise; destruction of critical system |
| Recoverability     | What will recovery take?        | Regular (existing resources); supplemented (extra resources); extended (outside help, unpredictable time); not recoverable                                                                                                   |

An organization usually condenses these into a small matrix of its own. CISA's National Cyber Incident Scoring System (NCISS) uses priority levels from Baseline through Low, Medium, High, and Severe to Emergency.

### Record uncertainty

Early classifications are estimates, and the record should say so. A useful triage note separates what is known, what is assumed, and what is unknown; gives a confidence level; distinguishes **current severity** (what the evidence supports now) from **potential severity** (the plausible worst case); and sets a time for the next reassessment. CSF 2.0 outcome RS.AN-08, "An incident's magnitude is estimated and validated," describes this cycle of estimating and then checking.

### Escalate

Severity levels should map to actions decided in advance: who is paged, who is informed, which notification clocks start, and how often updates go out. CSF 2.0 calls for incidents to be "escalated or elevated as needed" (RS.MA-04), and SP 800-61 Rev. 3 adds that the status of each incident should be tracked.

## Worked example

At 14:25 UTC, the corp.example security team has four open items. Its written matrix (fictional) is:

| Level        | Functional impact                                              | Information impact                                                           | Recoverability                          |
| ------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------- |
| 1 (Critical) | A critical service is unavailable, or a critical system is out of our control | Confirmed theft or destruction of regulated or highly sensitive data, or core credentials compromised | Not recoverable, or needs outside help |
| 2 (High)     | A critical service is significantly degraded, or a non-critical one is unavailable | Suspected theft of sensitive data, or a privileged account compromised   | Needs extra resources                   |
| 3 (Medium)   | A non-critical service is degraded                             | A regular user's credentials possibly exposed, or internal data exposed       | Predictable with existing resources     |
| 4 (Low)      | No impact on services                                          | No data affected                                                             | Nothing to recover                      |

Severity is the most severe level reached in any column. Priority starts at the severity and moves up one step if the activity may be ongoing or spreading.

| Item | What is known                                                                                  | Category                       | Severity now | Potential | Priority |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------ | ------------ | --------- | -------- |
| A    | Spraying led to alice's sign-in, a VPN session, a remote logon to ws-01, and a 48 MB upload from a finance share | Account takeover; possible data breach | 2 (suspected theft) | 1 | 1 |
| B    | Antivirus quarantined a malicious attachment on ws-14; no sign it ran                          | Adverse event, not yet an incident | 4         | 3         | 4        |
| C    | Marketing website slow under a traffic flood; checkout runs elsewhere and is fine              | Denial of service              | 3            | 3         | 2        |
| D    | Phishing message reported; 2 of 30 recipients clicked; proxy logs show no form submissions     | Phishing                       | 3            | 2         | 3        |

Item A comes first: it is the most severe, and the intruder may still be connected. Item C is ongoing, which moves it ahead of D, but the team resets the two clickers' sessions within the hour, a cheap step that limits D's potential. Item B stays in the queue as an adverse event; if any sign of execution appears, it becomes an incident.

The analyst records item A like this:

```text
Incident:      INC-2026-0142              Opened: 2026-10-14T14:25Z   Owner: bob
Category:      Account takeover (alice); possible data breach
Functional:    No service impact observed                             -> 4
Information:   Suspected theft: 48 MB uploaded from finance share     -> 2
Recoverability: Regular                                                -> 3
Severity now:  2 (High)    Potential: 1 (Critical) if upload held regulated data
Priority:      1 (intruder may still hold a VPN session)
Confidence:    High that an outsider used alice's account; low on what was uploaded
Assumptions:   The archive tool output and the upload are the same data
Open questions: Contents of upload? Other sprayed accounts compromised? Session still open?
Next review:   15:25Z, or sooner on new evidence
```

At 15:10 UTC, file server logs show the archive held payroll records with Social Security numbers, and its size matches the 48 MB upload. The team now judges theft of regulated data likely, though not yet certain, so it applies level 1 for information impact and severity becomes 1 (Critical). The analyst updates the record, notes who changed it, when, and why, and the escalation steps for level 1 begin: incident commander, legal and privacy staff, and leadership.

## In practice

- **Write the criteria first.** Incident criteria, the severity matrix, and escalation steps belong in the response plan, with worked examples, before the first incident.
- **Keep severity and priority separate.** Severity describes impact; priority orders the work. Mixing them makes contained high-impact incidents crowd out spreading medium ones.
- **Act on potential severity when delay is costly.** Cheap, reversible steps, such as resetting a session, can start before the facts are complete.
- **Timebox reassessment.** Every open incident carries a "next review" time.
- **Protect the record.** SP 800-61 Rev. 3 recommends safeguarding the confidentiality and integrity of incident response records, which may later serve as evidence.
- **Know the limits.** Matrices simplify. Harms such as lost trust are hard to score, early estimates are often wrong, and two analysts can rate the same case differently, so review classifications together and calibrate.

## Common misconceptions

- **"Every alert is an incident."** Most alerts are events or adverse events. An incident meets defined criteria, and declaring one starts work and sometimes legal clocks.
- **"First come, first served is fair."** It is fair to tickets, not to the organization. Order work by impact and urgency.
- **"We should wait for the facts before assigning severity."** Waiting is a decision too. Classify now, state your confidence, and revise.
- **"Low severity stays low."** Many serious incidents start as minor ones; reassess as evidence arrives.
- **"The severity score is objective."** It is a structured judgment. Record the reasoning so others can check and challenge it.

## Try it yourself

Use the corp.example matrix above to triage five fictional incidents at the university `campus.example`, where student records fall under [[ferpa]].

1. The learning management system returns errors on its sign-in page during finals week. An unexplained configuration change was made at 02:10.
2. A registrar's office laptop was left on a train. Whether its disk was encrypted is unknown.
3. An IDS reports [[sql-injection]] attempts against the alumni donation site, and some requests received normal 200 responses.
4. A student reports a changed grade. The audit log shows the change came from a teaching assistant's account at 03:00.
5. Cryptocurrency-mining software is found on a research lab server that holds no sensitive data.

For each, write a triage note with category, the three impact levels, current and potential severity, priority, confidence, assumptions, open questions, and the next review time. Then order the five. Finally, apply two new facts and reclassify: device management confirms the laptop was encrypted, and the teaching assistant was asleep at 03:00 and had reused their password on a breached website. With a partner, run it as a short tabletop: one person reveals facts every few minutes, and the other must say what changes and why.

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- Events, adverse events, and incidents are different; declare an incident when written criteria are met.
- Triage answers four questions: is it real, what is it, how bad and how urgent, and what do we not know yet.
- Rate severity on separate dimensions (service impact, data impact, recoverability), and set priority from severity plus urgency.
- Record current and potential severity, confidence, assumptions, and a reassessment time; change the record openly as facts arrive.
- Never handle incidents first come, first served.

## Go deeper

- NIST [SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) maps triage, categorization, prioritization, and escalation onto CSF 2.0 outcomes RS.MA-02 to RS.MA-04. Compare that mapping with the four-phase life cycle of the superseded Rev. 2: what changed about where triage sits?
- CISA's [federal incident notification guidelines](https://www.cisa.gov/federal-incident-notification-guidelines) separate functional impact, information impact, and recoverability. Design a weighting that combines them into one number, then argue whether a single number helps or hides information.
- Open question: how should a team measure the consistency of severity ratings across analysts, and what level of disagreement is acceptable?
