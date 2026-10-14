---
topicId: GRC-07
title: Audit evidence and compliance limits
summary: What counts as evidence that a security control works, how audits, attestation reports and certificates gather and present it, and why a compliance claim says less than it seems until you check its criteria, scope, period and findings.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Break a compliance claim into its criteria, scope, period, evidence and findings, and say what the claim alone can and cannot support.
  - Rank evidence for a control by relevance, reliability, sufficiency and timeliness, and distinguish evidence of design from evidence of operation.
  - Design a sample test that starts from an independent population, and interpret exceptions without overstating what a small sample shows.
  - Read an assurance report or certificate for scope, period, opinion, exceptions, carved-out subservice organizations and the customer's own controls.
prerequisites: [GRC-02, GRC-06, FND-08]
concepts: [audit, compliance, soc-2-report]
labs: []
keywords:
  - audit
  - audit evidence
  - attestation
  - assurance
  - control assessment
  - control testing
  - sampling
  - population
  - exception
  - design versus operating effectiveness
  - SOC 2
  - SOC 3
  - trust services criteria
  - CUEC
  - complementary user entity controls
  - carve-out
  - subservice organization
  - bridge letter
  - ISO/IEC 27001 certification
  - ISMS
  - NIST SP 800-53A
  - checkbox compliance
sources:
  - title: 'NIST SP 800-53A Rev. 5: Assessing Security and Privacy Controls in Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/a/r5/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'SOC 2 Reporting on an Examination of Controls at a Service Organization Relevant to Security, Availability, Processing Integrity, Confidentiality, or Privacy'
    url: https://www.aicpa-cima.com/cpe-learning/publication/soc-2-reporting-on-an-examination-of-controls-at-a-service-organization-relevant-to-security-availability-processing-integrity-confidentiality-or-privacy
    publisher: AICPA & CIMA
  - title: SOC 2 Report Walkthrough
    url: https://www.aicpa-cima.com/cpe-learning/webcast/soc-2-report-walkthrough
    publisher: AICPA & CIMA
  - title: 'System and Organization Controls: SOC Suite of Services'
    url: https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2
    publisher: AICPA & CIMA
  - title: 'ISO/IEC 27001:2022: Information security management systems — Requirements'
    url: https://www.iso.org/standard/27001
    publisher: International Organization for Standardization (ISO) and IEC
    license: All rights reserved
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-csf-2
quiz:
  - question: A vendor's website says "SOC 2 compliant." What is the most useful first response?
    choices:
      - Accept it, because SOC 2 is a government certification.
      - Reject the vendor, because marketing claims are always false.
      - Ask for the report and check whether its system description covers the service you use, which date or period it covers, and what exceptions the examiner reported.
      - Ask the vendor to sign a statement that the claim is true.
    answer: 2
    explanation: '"SOC 2 compliant" compresses a CPA''s report into a slogan. The report shows which system was examined, for what date or period, and what the examiner found, and those details decide whether it is evidence for your question. A signed statement from the vendor adds nothing independent.'
  - question: Which item is the strongest evidence that departing staff lose SubmitIt access within one business day?
    choices:
      - A directory log of disable events, matched against a separation list that the auditor exported from the HR system, for a random sample across the whole term.
      - The access policy that requires it.
      - A screenshot of one disabled account.
      - The administrator's description of the process in an interview.
    answer: 0
    explanation: System-generated records, checked against a population from an independent source and sampled across the period, test whether the control operated. The policy shows intent, the interview shows understanding, and a screenshot shows one moment that may not be typical.
  - question: 'A cloud provider''s SOC 2 report lists a complementary user entity control: "Customers are responsible for reviewing their users'' access." What does this mean for a college that uses the service?'
    choices:
      - The provider reviews the college's users on the college's behalf.
      - The college can skip access reviews because the provider passed its examination.
      - The control is optional for every customer.
      - The provider's controls were examined on the assumption that customers do this review, so the college must perform it and keep its own evidence.
    answer: 3
    explanation: Complementary user entity controls are the customer's share of the work that the provider's control design relies on. If the college skips them, the report's conclusions do not extend to the college's use of the service.
  - question: An auditor samples 10 of 40 staff separations and finds one account that was disabled five business days late. What is the most defensible conclusion?
    choices:
      - The control fails exactly 10 percent of the time.
      - The control did not operate as required in at least one case, so the cause should be traced and fixed; a sample of 10 cannot pin down the true failure rate.
      - One exception is within tolerance, so the claim of compliance stands as written.
      - The sample was unlucky, so the test should be rerun until it passes.
    answer: 1
    explanation: A small sample shows whether and how a control fails; it is too small to estimate a precise rate. One real exception disproves "always within one business day," so the team traces the cause and fixes it rather than resampling for a cleaner result.
  - question: A vendor is "certified to ISO/IEC 27001:2022." Which statement is most accurate?
    choices:
      - A certification body found that the vendor's information security management system meets the standard's requirements for the scope on the certificate, so you still need to check that scope.
      - Every system the vendor runs has passed a penetration test.
      - The vendor can no longer be breached.
      - The certificate shows that using the vendor meets FERPA.
    answer: 0
    explanation: ISO/IEC 27001 sets requirements for the management system an organization uses to establish, implement, maintain and continually improve information security. Certification says that system met the requirements for a stated scope. It says nothing about systems outside that scope, and it does not promise freedom from breaches.
---

## Why it matters

Ask a vendor about security and you will often hear a compliance claim: "We're SOC 2 compliant," "We're FERPA compliant," "We're ISO 27001 certified." Ask your own IT team and you may hear "We comply with the access policy." Each can be true while leaving you exposed. The report behind it may cover a different system, a period that ended months ago, or controls that failed in testing. The policy may be followed for staff but not for student workers.

[[compliance|Compliance]] means conforming to a stated set of requirements. An [[audit]] gathers evidence about whether that is so, for a defined scope and period. This lesson teaches you to unpack a claim into its parts: which requirements, which systems, which dates, what evidence, and what the examiner found. You need it to approve vendors ([GRC-06](lesson:GRC-06)), to answer auditors, and to know which controls you can trust.

The accounting profession worries about the same gap. The AICPA, whose guides are written for the CPAs who perform SOC examinations, says on its SOC page that SOC services "should be thoroughly evaluated by service organizations and CPA firms," and links to an article titled "Promises of 'fast and easy' threaten SOC credibility."

## The core idea

Think of a restaurant inspection certificate on the wall. It tells you that an inspector checked this kitchen against the health code on a particular date and found it acceptable. It says nothing about the owner's second location, about last night, or about problems the inspector noted. For those, you read the inspection report.

Every assurance statement has the same anatomy:

| Part | Question to ask | Example |
| --- | --- | --- |
| Criteria | Measured against what? | Access Policy 4.2, ISO/IEC 27001, the trust services criteria |
| Scope | Which systems, sites and services? | SubmitIt production, or only the vendor's hosting platform |
| Period | On what date, or over what period? | The fall term; the year ending in June |
| Evidence | What did the examiner look at, and how much? | A random sample of 10 separations |
| Findings | What was found, including exceptions? | One account disabled five business days late |
| Examiner | How independent was the examiner? | The team itself, internal audit, a CPA firm or a certification body |

A compliance claim is what remains when the last five rows are removed. Evidence is what lets you put them back.

Two distinctions shape every evaluation. **Design versus operation:** a well-designed control can still fail in daily use, so a policy or a configuration screenshot (design) is not evidence that the control ran every time it should have (operation). **Point in time versus period:** a check on one day shows the control worked that day; evidence spread across months shows it kept working. The AICPA's description of its SOC 2 guide refers to "the design, operation, and effectiveness of controls," and the same distinction applies to any audit.

One assumption underlies all of it: no audit examines everything. Evidence is a sample, so a clean result means the examiner found no failures in what they looked at, not that none exist. That is why [[assurance]] is a matter of degree.

## How it works

### Collecting evidence

Assessors gather evidence in three basic ways: they examine documents and records, interview the people who run a control, and test the control by watching it work or by triggering it. NIST SP 800-53A Rev. 5 provides "a methodology and set of procedures for conducting assessments of security and privacy controls" for the controls in the SP 800-53 catalog.

Evidence for one control, ordered roughly from weakest to strongest:

| Evidence | What it shows | Main limit |
| --- | --- | --- |
| Policy or standard | The requirement and intended design | Nothing about operation |
| Interview | That people understand the process | Describes the process as it should run |
| Screenshot | One moment in one system | Easy to stage, crop or misdate |
| Ticket or signed review | That a person performed a step | Can be completed after the fact |
| System log matched to an independent list | That the control ran, case by case, across the period | Only as good as the log's completeness and protection |
| Reperformance by the assessor | That the control works now | One instance, under test conditions |

Four questions judge any piece of evidence. Is it **relevant**: does it address the stated requirement? Is it **reliable**: produced by a system rather than typed by the person being audited, and protected from editing? Is it **sufficient**: enough cases, spread across the period? And is it **timely**: does it cover the period the claim is about?

### Populations and samples

To test whether a control operated, an assessor starts from the population: every event that should have triggered the control, such as every staff separation last term. The population must come from a source independent of the control. If the identity team supplies the list of accounts it disabled, the accounts it missed are not on the list; the HR system's separation records are a better source.

The assessor then selects a sample, ideally at random, and checks each case against the requirement. Each failure is an exception. A small sample shows whether and how a control fails; it does not measure the failure rate precisely. One failure in 10 does not mean a 10 percent failure rate, but it does prove the claim "always within one business day" false, and it gives you a case to trace to its root cause ([FND-08](lesson:FND-08) covers measurement uncertainty).

Stronger still is a daily job that compares HR's list with active accounts and alerts on any mismatch: the control then produces its own evidence, for the whole population.

### Reports, certificates and claims

Outside assurance usually arrives in one of three forms.

**Attestation reports.** In a [[soc-2-report|SOC 2]] examination, a CPA examines a service organization's description of its system and its controls relevant to security, availability, processing integrity, confidentiality or privacy, using the AICPA's 2017 trust services criteria and 2018 description criteria. AICPA training for report readers lists elements worth checking, including the type of opinion, exceptions found in testing, bridge letters, how controls at subservice organizations are reported (inclusive or carve-out), and complementary user entity controls (CUECs).

- When a subservice organization, such as a data center the provider rents, is *carved out*, its controls sit outside the examination.
- *CUECs* are controls the report expects the customer to operate, such as reviewing its own users' access. Skip them, and the report's conclusions do not extend to your use of the service.
- A *bridge letter* is a statement from the provider's management about the time between the end of the report period and now. No auditor examined it.

The AICPA describes SOC 3 reports as general-use reports on the same five categories.

**Certificates.** ISO/IEC 27001:2022 sets requirements for an information security management system (ISMS): the process an organization uses to establish, implement, maintain and continually improve information security. Certification is voluntary and is issued by certification bodies that an accreditation body has accredited. ISO asks that certificates be cited in full, as in "certified to ISO/IEC 27001:2022." A certificate shows that the management system met the standard's requirements for the scope on the certificate. It does not list which controls work, or how well.

**Self-declared compliance.** "FERPA compliant" and "aligned with NIST" are claims, not attestations, unless someone independent examined them. Under FERPA, the institution keeps the main duties for education records, so a vendor's claim does not settle the question ([GRC-04](lesson:GRC-04)). CSF 2.0 states that it "does not prescribe how outcomes should be achieved," so a claim to comply with it means little until someone names the outcomes, the target profile and the evidence for each.

### Why compliance has limits

Compliance is valuable. It sets a floor, forces documentation and ownership, brings in outside eyes, and gives customers contractual leverage. It also has built-in limits:

- **Scope can be drawn narrowly.** An organization may examine its best-run service and leave the risky one out.
- **Requirements lag threats.** A standard written years ago may not ask about the technique used against you this year.
- **Sampling misses rare failures.** A control that fails once a semester may pass every sample.
- **What gets checked gets optimized.** When paperwork is what auditors read, effort drifts toward producing paperwork.

## Worked example

The registrar asks internal audit whether SubmitIt, the assignment service from [GRC-01](lesson:GRC-01) and [GRC-02](lesson:GRC-02), meets Access Policy 4.2b: access is removed within a defined time after a person leaves or changes role. The SubmitIt team answers in one sentence: "SubmitIt complies with Access Policy 4.2, and it runs on a SOC 2-examined hosting platform." bob, the auditor, turns the claim into testable parts.

**Step 1: Fix the criteria, scope and period.** Under the department's standard, staff accounts are disabled within one business day of the separation date, and TA roles expire 14 days after the term ends. Scope: SubmitIt production accounts. Period: the fall term.

**Step 2: Sort what the team provided.**

| Item | Claim or evidence? | What it supports |
| --- | --- | --- |
| The team's sentence | Claim | Nothing by itself |
| Access Policy 4.2 and the standard | Evidence of design | The requirement exists and is measurable |
| Screenshot of the disable job's settings | Evidence of design, one moment | The job existed on the day of the screenshot |
| Disable log joined to the HR separation list | Evidence of operation | Case-by-case results across the term |
| Hosting provider's SOC 2 report | Independent evidence, for another scope | The provider's infrastructure controls |

**Step 3: Test the staff control.** bob exports the term's 40 staff separations from the HR system himself, picks 10 at random, and looks up each disable event in the directory log.

```text
Test:        Access Policy 4.2b, staff accounts disabled within 1 business day
Population:  40 staff separations, fall term (exported by audit from HR)
Sample:      10, chosen at random

ID     Separated      Disabled       Business days   Result
S-03   Mon, week 2    Mon, week 2    0               Pass
S-08   Thu, week 3    Fri, week 3    1               Pass
S-11   Fri, week 4    Mon, week 5    1               Pass
S-14   Wed, week 5    Wed, week 5    0               Pass
S-17   Tue, week 6    Tue, week 7    5               Exception
S-21   Mon, week 8    Tue, week 8    1               Pass
S-26   Thu, week 9    Thu, week 9    0               Pass
S-30   Tue, week 11   Wed, week 11   1               Pass
S-35   Fri, week 13   Mon, week 14   1               Pass
S-39   Wed, week 15   Wed, week 15   0               Pass
```

The exception traces to a late HR entry. S-17's separation was recorded four business days after the person left, and the job disabled the account one business day after the entry. The control worked on the data it received, but the standard counts from the actual separation date.

**Step 4: Test the TA control.** On day 15 after the term, bob compares SubmitIt's role list with the department's TA roster. Two of 18 TA roles are still active; both came from a bulk import that left the expiry date blank.

**Step 5: Read the SOC 2 report for what it covers.** Its system description covers the provider's data centers, infrastructure change management and backups. Its CUECs state that customers manage their own application users. Account removal in SubmitIt is the department's job, and the report offers no evidence about it. The report period also ended four months ago; a bridge letter from the provider's management covers the gap.

**Step 6: Replace the claim with an evidence-based statement.**

> In the fall term, 9 of 10 sampled staff separations were disabled within one business day; one took five business days because the separation was recorded late in HR. Two of 18 TA roles had no expiry date and stayed active after the term. The hosting provider's SOC 2 report does not cover SubmitIt account management. Requirements 4.2a and 4.2c were not tested.

The findings go into the [[risk-register]] with owners: HR sets a target for recording separations, the bulk import now requires an expiry date, and a new weekly job compares active SubmitIt roles with HR and the TA roster, which makes next term's evidence continuous instead of sampled.

## In practice

- **Ask "show me," then ask "for what scope and period?"** A claim without both is not yet evidence.
- **Pull populations yourself** from a source independent of the people who run the control.
- **Prefer evidence the control produces,** such as logs and automated reconciliations, over evidence people assemble for the audit.
- **Protect the evidence.** Keep [[security-log|logs]] where the people being audited cannot edit them.
- **Trace every exception to a root cause,** without blame.
- **Limits.** Assessors can be misled by staged or selective evidence, and even careful audits sample. Treat a clean audit as one input, alongside incidents, test results and changes in threats.

## Common misconceptions

- **"Compliant means secure."** Compliance shows conformance to particular requirements, for a scope and period. Compliant organizations can still be breached, and good security work often goes beyond any checklist.
- **"SOC 2 certified."** A SOC 2 report is a CPA's examination report, not a certificate. Its value lies in the details: system, period, opinion and exceptions.
- **"A screenshot proves the control works."** It shows one moment that someone chose to capture.
- **"No findings means no problems."** It means no problems in what was examined.
- **"The provider's report covers our use of the service."** Only for what is in its scope, and only if you operate the complementary user entity controls it assumes.

## Try it yourself

On paper, sort and strengthen the evidence below, all about the Room 214 lab from [GRC-01](lesson:GRC-01) and [GRC-05](lesson:GRC-05). For each item: (a) label it a compliance claim or control evidence; (b) name the requirement it could support, with its scope and period; (c) rate it weak, moderate or strong, and say why; and (d) write the evidence request that would make it stronger.

1. A sticker on the lab door: "This lab complies with campus security policy."
2. A spreadsheet the lab administrator fills in each month, with "patched: yes" next to each machine.
3. An export generated by the patch management tool, listing every lab machine and the date each update was installed.
4. A cloud backup provider's SOC 2 report for January to June of last year, with one exception in change management and a CUEC requiring customers to review user access quarterly.
5. A vendor questionnaire answer: "We comply with the NIST Cybersecurity Framework."
6. A video of the administrator restoring a file from backup during last month's drill.

Then design a sample test for item 3 against the requirement "critical updates are installed within 14 days of release." Define the population and an independent source for it, choose a sample size and a selection method, and state what one exception would and would not let you conclude.

## Key takeaways

- A compliance claim is a conclusion with its criteria, scope, period, evidence and findings removed; put them back before relying on it.
- Evidence of design is not evidence of operation, and one moment is not a period.
- Strong evidence is relevant, reliable, sufficient and timely: system-generated, checked against an independent population, and spread across the period.
- Read assurance reports for scope, period, opinion, exceptions, carve-outs and the controls left to the customer.
- Compliance sets a floor. Narrow scopes, sampling and backward-looking evidence mean a clean audit is never a guarantee.

## Go deeper

- [NIST SP 800-53A Rev. 5](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final) contains assessment procedures for the SP 800-53 controls. Read the procedure for AC-2 (Account Management) and list the evidence it would ask for in this lesson's worked example.
- Take the reader elements from the AICPA's [SOC 2 Report Walkthrough](https://www.aicpa-cima.com/cpe-learning/webcast/soc-2-report-walkthrough) listing to a SOC 3 report that a large provider publishes. Which elements can you check, and which are missing?
- Open question: tools that collect evidence automatically from configuration interfaces every day promise "continuous compliance." When does that raise assurance, and when does it just produce paperwork faster?
