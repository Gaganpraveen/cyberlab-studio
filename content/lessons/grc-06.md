---
topicId: GRC-06
title: Third-party and vendor risk
summary: How a college finds the vendors it depends on, ranks them by the data, access and availability they carry, checks vendor claims against evidence and observed data flows, and turns the results into contract terms, monitoring and an exit plan.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Map the data flows of a vendor service, including the vendor's own subprocessors, and mark where institutional data crosses each boundary.
  - Rank vendors into review tiers by the data they hold, the access they have and the impact of their failure.
  - Evaluate a vendor questionnaire by separating claims from evidence and writing specific follow-up questions.
  - Turn review findings into contract terms, controls on the institution's side, monitoring triggers and an exit plan.
prerequisites: [GRC-01, GRC-03, CLD-01]
concepts: [third-party-risk, subprocessor]
labs: []
keywords:
  - TPRM
  - third-party risk management
  - vendor risk management
  - vendor security review
  - supplier risk
  - C-SCRM
  - supply chain risk management
  - HECVAT
  - security questionnaire
  - SOC 2
  - subprocessor
  - fourth party
  - due diligence
  - data flow review
  - NIST SP 800-161
  - GV.SC
  - SA family
  - SR family
  - MOVEit
  - CVE-2023-34362
sources:
  - title: 'NIST SP 800-161 Rev. 1: Cybersecurity Supply Chain Risk Management Practices for Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-csf-2
  - title: 'NIST SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-53
  - title: 'SOC 2 Reporting on an Examination of Controls at a Service Organization Relevant to Security, Availability, Processing Integrity, Confidentiality, or Privacy'
    url: https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy
    publisher: AICPA & CIMA
  - title: Higher Education Community Vendor Assessment Toolkit (HECVAT)
    url: https://www.educause.edu/higher-education-community-vendor-assessment-toolkit
    publisher: EDUCAUSE
    license: Copyright EDUCAUSE; free for colleges, universities and vendors under its stated terms
  - title: '#StopRansomware: CL0P Ransomware Gang Exploits CVE-2023-34362 MOVEit Vulnerability (AA23-158A)'
    url: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a
    publisher: Cybersecurity and Infrastructure Security Agency (CISA) and Federal Bureau of Investigation (FBI)
quiz:
  - question: A vendor's questionnaire answer says "All customer data is encrypted at rest." How should a reviewer treat it?
    choices:
      - As verified evidence, because the vendor signed the questionnaire.
      - As a claim to check, for example against an independent report whose scope covers the service, plus a follow-up on which data stores it covers and who controls the keys.
      - As irrelevant, because encryption at rest never matters for cloud services.
      - As proof that using the vendor meets FERPA.
    answer: 1
    explanation: Questionnaire answers are self-reported claims. They are good for finding gaps and starting conversations, but their weight depends on the evidence behind them. Encryption at rest also says nothing about who can use the keys, so specific follow-up questions matter.
  - question: LabCloud lists two subprocessors, but a data-flow review shows its web app sending student emails to an analytics provider that is not on the list. What does this finding most directly show?
    choices:
      - Nothing important, because analytics data is never personal data.
      - That LabCloud's SOC 2 report must be fraudulent.
      - That the department should stop using cloud services altogether.
      - That the vendor's disclosures are incomplete, since student data reaches a party the college never reviewed, so disclosure and minimization should be required before approval.
    answer: 3
    explanation: A data-flow review checks what actually happens, not what the questionnaire says. An undisclosed subprocessor means data leaves the boundary the college agreed to. The response is contractual (a complete subprocessor list and notice of changes) and technical (remove identifiers from analytics), not abandoning cloud services.
  - question: Why should a small IT security team tier its vendors before reviewing them?
    choices:
      - To spend review effort in proportion to risk, so a service that holds graded work and connects to campus sign-on gets a deeper review than a font library.
      - Because federal law requires exactly three vendor tiers.
      - So that low-tier vendors never need any terms of use checked.
      - Because tiering replaces due diligence.
    answer: 0
    explanation: CSF 2.0 asks that suppliers be "known and prioritized by criticality" (GV.SC-04). Tiers based on data, access and availability impact let a small team focus on the relationships that could hurt most. Lower tiers still get a lighter review, not none.
  - question: A vendor's SOC 2 report covers its "LabCloud Platform." The course plans to use AutoGrade, an add-on the vendor acquired last year that the report's system description does not include. What should the reviewer conclude?
    choices:
      - The report covers everything the vendor sells, so nothing more is needed.
      - SOC 2 reports cover only physical security, so the add-on is irrelevant.
      - The report is not evidence about AutoGrade, so the reviewer should seek other evidence, add compensating controls, or limit how AutoGrade is used.
      - The vendor must be hiding something, so the review should end immediately.
    answer: 2
    explanation: An examination report speaks only to the system it describes. When the service you will use falls outside that description, the report is not evidence for it, though it may still say something about the vendor's general practices. Scope is the first thing to check in any assurance report.
  - question: Which contract term best addresses the end of a vendor relationship, as CSF 2.0's GV.SC-10 asks?
    choices:
      - A statement that the vendor takes security seriously.
      - A clause requiring the vendor to return data in a usable format and to delete all copies, including at its subprocessors, within a set time, with written confirmation.
      - An automatic renewal clause, so the relationship never ends.
      - A clause that prevents the college from switching vendors.
    answer: 1
    explanation: Risk does not end when the contract does. Copies may persist at the vendor and its subprocessors, and accounts or tokens may stay active. GV.SC-10 calls for plans to cover "activities that occur after the conclusion of a partnership or service agreement," and the college should also revoke the vendor's access on its own side.
---

## Why it matters

A college's computing reaches far beyond its own data center. The learning management system, email, video calls, payments, and the free polling app an instructor signed up for last week all run on someone else's computers and staff. Each relationship hands an outside organization some mix of student data, access to campus systems, and a service the college cannot work without. [[third-party-risk|Third-party risk]] is the risk that comes with that reliance.

Outsourcing moves the work, not the consequences. If a vendor loses student records, students will look to the college, and the college keeps duties for the data: under FERPA, a vendor may hold education records only under conditions the institution sets and enforces ([GRC-04](lesson:GRC-04)).

Vendors depend on suppliers of their own, so a weakness several links away can still reach you. According to a joint CISA and FBI advisory, in May 2023 the CL0P ransomware gang exploited a previously unknown SQL injection vulnerability, CVE-2023-34362, in MOVEit Transfer, a managed file transfer product from Progress Software. The actors installed a web shell and stole data from the product's underlying databases. File transfer tools sit exactly where organizations exchange data with partners, so an institution's data can be exposed through a product it never installed, if a vendor used that product to handle the data. NIST CSF 2.0 gives this whole area its own category in the Govern Function: cybersecurity supply chain risk management (GV.SC).

## The core idea

Think about hiring a dog walker. Before handing over a key, you check references. You give a key to the front door, not to the safe. You agree on rules, such as when they come and who else may enter. You notice if they start sending a friend instead. And when the arrangement ends, you get the key back. Vendor risk management is the same cycle at institutional scale: know whom you depend on, check before committing, limit what you hand over, put expectations in writing, keep watching, and close out cleanly.

Two assumptions shape everything else. First, third parties cannot be avoided: even a college that built every service itself would still buy hardware, software and network links. Second, you cannot inspect most vendors directly. Decisions therefore rest on proportionate effort and imperfect evidence, and someone with authority must accept the [[residual-risk]] that remains ([GRC-01](lesson:GRC-01)).

Risk reaches you through four channels:

| Channel | What the vendor gets | College example | Main property at stake |
| --- | --- | --- | --- |
| Data | Copies of institutional data | Rosters and graded work in a lab platform | Confidentiality |
| Access | A path into your systems | An API token for the LMS, or a remote support account | Integrity |
| Dependence | A service you cannot run without | The assignment portal during finals week | Availability |
| Their suppliers | Parties you never chose that touch your data or service | The vendor's hosting, email and analytics providers | All three |

The last row deserves a name. A [[subprocessor]] is a vendor's own supplier that handles your data on the vendor's behalf; some people call it a fourth party. Your contract is with the vendor, but your data also lives with its subprocessors.

NIST SP 800-161 Rev. 1 applies this thinking, as cybersecurity supply chain risk management (C-SCRM), to products as well as services. Acquired technology may contain malicious functionality, be counterfeit, or be vulnerable through poor development or manufacturing practices, and buyers have limited visibility into how it is built and deployed. This lesson focuses on services; [CLD-06](lesson:CLD-06) covers software dependencies.

## How it works

The CSF 2.0 GV.SC outcomes trace a lifecycle. The table pairs each stage with its CSF wording.

| Stage | CSF 2.0 outcome | At a college |
| --- | --- | --- |
| Know and rank | GV.SC-04: "Suppliers are known and prioritized by criticality" | A vendor inventory with a tier for each vendor |
| Check before signing | GV.SC-06: due diligence "to reduce risks before entering into formal supplier or other third-party relationships" | Security and privacy review before the purchase order |
| Write it down | GV.SC-05: requirements "integrated into contracts and other types of agreements" | Data use, breach notice and subprocessor terms |
| Keep watching | GV.SC-07: risks "monitored over the course of the relationship" | Yearly evidence refresh and re-review on triggers |
| Plan for bad days | GV.SC-08: suppliers "included in incident planning, response, and recovery activities" | Vendor contacts in the incident plan |
| Close out | GV.SC-10: provisions for "activities that occur after the conclusion of a partnership or service agreement" | Data return, deletion and access removal |

### Inventory and tiering

You cannot manage a vendor you do not know about. Procurement records catch purchases, but free sign-ups and credit card subscriptions slip past them. Other places to look include the list of applications connected to campus [[sso|single sign-on]], the [[oauth|OAuth]] grants that let third-party apps read campus accounts, and expense reports.

Tiering then sets how deep each review goes. One workable scheme:

| Tier | Typical signs | Review depth |
| --- | --- | --- |
| 1, critical | Sensitive data at scale, such as education records; a link to campus sign-on or the network; or a short RTO | Full questionnaire, independent evidence, data-flow review, negotiated contract terms, yearly re-review |
| 2, moderate | Limited personal data, such as names and emails, or a service people can do without for a few days | Short questionnaire, evidence on request, standard contract terms |
| 3, low | No institutional data and no access, such as a font or a public dataset | Inventory entry and a terms-of-use check |

Availability ties tiering to the business impact analysis in [GRC-05](lesson:GRC-05): a vendor that runs a service with a four-hour RTO is a Tier 1 dependency even if it holds little data.

### Due diligence: claims and evidence

Most reviews start with a questionnaire. EDUCAUSE publishes one built for colleges, the Higher Education Community Vendor Assessment Toolkit (HECVAT), which it describes as "a tool designed to help college and university professionals more easily measure vendor risk." Vendors fill it in to describe their cybersecurity, privacy, IT accessibility and compliance practices, and EDUCAUSE offers it to colleges at no cost. When many colleges accept the same form, a vendor can answer it once rather than once per customer.

Every answer in a questionnaire is a claim. Its weight depends on the evidence behind it, roughly from weakest to strongest:

1. **Self-attestation:** the vendor says so ("Yes, data is encrypted at rest").
2. **Documentation:** a policy, an architecture description or a subprocessor list.
3. **Independent attestation:** a report from an outside examiner, such as a [[soc-2-report|SOC 2 report]], or a certification such as ISO/IEC 27001.
4. **Your own observation:** a check of the configuration you will actually use, such as confirming that administrator sign-in goes through campus SSO with [[mfa|MFA]].

In a SOC 2 engagement, a CPA examines a service organization's description of its system and the controls in it relevant to security, availability, processing integrity, confidentiality or privacy. The AICPA notes that customers and business partners often ask service organizations for these reports. Two questions decide how much a report tells you: does its system description include the service you are buying, and what did the examiner find? An excellent report on the wrong system is not evidence about your service. [GRC-07](lesson:GRC-07) covers how to read one closely.

### Data-flow review

A questionnaire tells you what the vendor believes; a data-flow review shows what actually moves. Trace every path institutional data takes: what goes in through integrations, uploads and sign-in, where it is stored, which subprocessors receive it, and what comes back. Then compare the result with the vendor's answers. Mismatches, such as a tracking service missing from the subprocessor list, are often the most useful findings.

> [!CAUTION]
> Watching your own browser's traffic while you use a service normally is ordinary use. Scanning or probing the vendor's servers is security testing and needs the vendor's written permission ([FND-07](lesson:FND-07)).

### Contracts, controls and monitoring

Findings become requirements on both sides of the relationship. In the contract: data used only to provide the service, a defined breach notification window, a complete subprocessor list with advance notice of changes, updated evidence each year, cooperation during incidents, and return and deletion of data at the end. On the college's side: send only the fields the vendor needs ([[data-minimization]], [GRC-03](lesson:GRC-03)), give each integration its own narrowly scoped credentials, require campus SSO and MFA for vendor administrator accounts, and log vendor access. In the SP 800-53 catalog, control language for this work sits mainly in the System and Services Acquisition (SA) and Supply Chain Risk Management (SR) families.

Monitoring means more than a yearly questionnaire. Re-review when something changes: a breach at the vendor, an acquisition, a new feature or subprocessor, a change in the data you send, or a renewal, the next point where you can change the terms.

## Worked example

The Computer Science department wants LabCloud (labcloud.example), a hosted virtual lab platform, for a 300-student networking course. The vendor returned a questionnaire, its SOC 2 report and an integration guide. alice from IT security leads the review.

**Step 1: Tier.** LabCloud will hold rosters and graded work, which are likely education records, and it connects to the LMS and to campus SSO. It is Tier 1, so the privacy office joins the review.

**Step 2: Map the data flow.** alice builds the diagram below from the integration guide, the LMS integration settings and her own browser's developer tools on a test account. It shows six flows: roster data in, sign-in assertions in, storage at the hosting provider, email through a mail provider, usage events to an analytics provider, and grades back to the LMS. Five match the vendor's documentation. The analytics flow does not.

```sequence
title: LabCloud data flows as observed
participant LMS as Campus LMS
participant SSO as Campus sign-on
participant LC as labcloud.example
participant HOST as cloudhost.example
participant MAIL as mailer.example
participant MET as metrics.example
LMS -> LC: Roster sync: name, email, student ID
SSO -> LC: Sign-in assertion via student browser
LC -> HOST: Store lab images and graded work
LC -> MAIL: Lab-ready email to student address
LC -> MET: Usage events tagged with student email
LC --> LMS: Lab grades to the gradebook
note MET: Not on LabCloud's subprocessor list
```

**Step 3: Compare answers with evidence.** Here is an excerpt of the vendor's questionnaire:

```text
LabCloud security questionnaire (excerpt), answered by the vendor

Q2.1  Is institutional data encrypted at rest?         Yes.
Q2.4  Is MFA required for staff production access?     Yes.
Q3.2  List all subprocessors that receive data.        cloudhost.example,
                                                       mailer.example
Q4.1  Do you have a current SOC 2 report?              Yes, attached.
Q5.3  When will you notify customers of a breach?      Promptly.
Q6.2  What happens to data when the contract ends?     Deleted on request.
Q7.1  Which roster fields does the integration need?   All available fields.
```

alice records five findings:

| # | Finding | Evidence | Response |
| --- | --- | --- | --- |
| F1 | Student emails reach metrics.example, which Q3.2 omits | Observed data flow | Vendor removes identifiers or lists the provider; contract requires a complete subprocessor list and notice of changes |
| F2 | The SOC 2 system description covers the "LabCloud Platform" but not AutoGrade, a grading add-on the course wants | Report's system description | Ask for other evidence on AutoGrade; until then, keep grades of record in the LMS |
| F3 | "Promptly" is not a commitment | Q5.3 | Negotiate a specific notification window and named contacts |
| F4 | The roster sync sends student ID numbers that LabCloud never uses | Q7.1 and LMS settings | Send name, email and an opaque LMS identifier only |
| F5 | Deletion happens only on request, with no deadline or confirmation | Q6.2 | Return of data, deletion at LabCloud and its subprocessors within a set period, and written confirmation |

The SOC 2 report supports the encryption and MFA answers for the platform, so alice accepts them until renewal.

**Step 4: Decide and record.** The department chair, as risk owner, approves LabCloud with conditions: F1, F3, F4 and F5 must be resolved before the course opens, and F2 limits how AutoGrade is used. alice records the residual risk in the department's [[risk-register]] with a review at contract renewal, and adds LabCloud's security contact to the incident plan.

Notice where the most serious finding came from: not from anything the vendor supplied, but from one observation the college made itself.

## In practice

- **Match effort to risk.** Tier first. A 300-question review of a font vendor wastes time that a Tier 1 review needs.
- **Review before signing.** Due diligence belongs before the contract (GV.SC-06). After signature, changes are harder to win.
- **Minimize what you send.** Data a vendor never receives cannot leak from the vendor or its subprocessors.
- **Plan for the vendor's bad day.** Put vendor contacts and notification paths into incident and continuity plans, and include a vendor outage in a [[tabletop-exercise]] ([GRC-05](lesson:GRC-05)).
- **Limits.** You can rarely inspect a large provider yourself, questionnaires are self-reported, and audit reports look backward at a past date or period. Many vendors also rely on the same few cloud and identity providers, so a single failure can hit several of your vendors at once.

## Common misconceptions

- **"It's the vendor's problem now."** Contracts divide duties; they do not move the consequences. The college still answers to students for their data, wherever it is stored.
- **"A SOC 2 report means the vendor is secure."** It is an examination of a described system. Check that the description covers your service, and read what the examiner found.
- **"Free tools have no vendor risk."** A free tool is still a vendor, usually with no negotiated contract and with standard terms the vendor can change.
- **"We approved them, so we're done."** Vendors change owners, add features and subprocessors, and suffer breaches. Monitoring lasts as long as the relationship (GV.SC-07).
- **"The questionnaire is the review."** It is the start of one. Answers are claims to compare with evidence and with the data flows you can observe.

## Try it yourself

On paper, review a fictional vendor. An instructor wants QuizSpark (quizspark.example), a classroom polling app, for a 200-student course. Here are its questionnaire answers:

```text
QuizSpark vendor questionnaire (excerpt)

Data collected        Student name, campus email, poll responses,
                      optional profile photo, device location "for attendance"
Sign-in               Email and password; campus SSO on the Enterprise plan
Subprocessors         "Major cloud providers"
Security testing      "We take security seriously."
Retention             "Data is kept to improve our services."
Breach notification   "As required by law."
Evidence              SOC 2 report under NDA, Enterprise plan only
```

1. **Tier it.** Choose a tier and justify it in two sentences, considering the data, the access, and what happens if QuizSpark is down during class.
2. **Draw the data flow.** Sketch a sequence diagram from the course LMS and the students' phones to QuizSpark and its subprocessors. Mark every unknown with a question mark.
3. **Separate claims from evidence.** Label each answer as a claim, documentation or independent evidence, and write one specific follow-up question for it. For example: "Name each subprocessor that receives student data and where it stores that data."
4. **Minimize.** Which fields could the course do without, and what setup changes would send less data?
5. **Write three contract clauses** that answer your strongest concerns.
6. **Decide.** Approve, approve with conditions, or decline. Write a one-line risk register entry with the residual risk and its owner, plus one exit step for the end of term.

## Key takeaways

- Third-party risk enters through the data you share, the access you grant, the services you depend on, and your vendors' own suppliers.
- Tier vendors by data, access and availability impact so that review effort follows risk.
- Questionnaire answers are claims: weigh them against independent evidence whose scope covers your service, and against data flows you observe yourself.
- Turn findings into contract terms, minimization and access controls on your side, monitoring triggers and an exit plan.
- Outsourcing moves the work, not the accountability, so someone with authority must accept the residual risk.

## Go deeper

- [NIST SP 800-161 Rev. 1](https://csrc.nist.gov/pubs/sp/800/161/r1/upd1/final) describes a multilevel approach to C-SCRM and includes an SCRM assessment scoping questionnaire (Table 26). Compare its questions with the HECVAT's: what does each ask that the other leaves out?
- Version 4 of the [HECVAT](https://www.educause.edu/higher-education-community-vendor-assessment-toolkit) added questions on privacy and AI. Pick three of its AI questions and decide what evidence would support each answer.
- [CISA and FBI advisory AA23-158A](https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-158a) describes the MOVEit Transfer campaign. Which controls in this lesson would limit a college's exposure through a vendor that ran the product?
- Open question: when most of your vendors depend on the same few providers, which you cannot assess, how should a college measure and limit that shared exposure?
