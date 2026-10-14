---
topicId: GRC-08
title: Responsible disclosure and research ethics
summary: How a vulnerability report should travel from the person who finds a flaw to the people who can fix it, what a vulnerability disclosure policy promises and asks, how coordinated disclosure handles severity and timing, and how research ethics and authorization limit what students and researchers may test.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Separate the question of whether testing was authorized from the question of how to report a finding, and explain why a careful report cannot authorize testing after the fact.
  - Draft a vulnerability disclosure policy with scope, authorization language, banned test methods, a reporting channel and the organization's commitments.
  - Plan a coordinated disclosure workflow from intake through triage, fix and publication, assigning roles and timelines and using CVSS as a severity input rather than a risk verdict.
  - Apply the Menlo principles, a stakeholder analysis and institutional review to decide whether a security study needs consent, review or a change of design.
prerequisites: [FND-07, GRC-02, GRC-04]
concepts: [responsible-disclosure, coordinated-vulnerability-disclosure, vulnerability-disclosure-policy, safe-harbor]
labs: []
keywords:
  - VDP
  - CVD
  - coordinated disclosure
  - responsible disclosure
  - vulnerability disclosure policy
  - safe harbor
  - bug bounty
  - security.txt
  - vulnerability handling
  - PSIRT
  - embargo
  - ISO/IEC 29147
  - ISO/IEC 30111
  - CVSS
  - CVSS v4.0
  - CVSS-BTE
  - BOD 20-01
  - CISA VDP template
  - Menlo Report
  - research ethics
  - ethics appendix
  - good-faith security research
sources:
  - title: Vulnerability Disclosure Policy Template
    url: https://www.cisa.gov/vulnerability-disclosure-policy-template
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: Vulnerability Disclosure Policy (U.S. Department of Commerce)
    url: https://www.commerce.gov/vulnerability-disclosure-policy
    publisher: U.S. Department of Commerce
  - title: 'ISO/IEC 29147:2018: Information technology — Security techniques — Vulnerability disclosure'
    url: https://www.iso.org/standard/72311.html
    publisher: International Organization for Standardization (ISO) and IEC
    license: All rights reserved
  - title: 'ISO/IEC 30111:2019: Information technology — Security techniques — Vulnerability handling processes'
    url: https://www.iso.org/standard/69725.html
    publisher: International Organization for Standardization (ISO) and IEC
    license: All rights reserved
  - title: Common Vulnerability Scoring System v4.0 Specification Document
    url: https://www.first.org/cvss/v4.0/specification-document
    publisher: FIRST (Forum of Incident Response and Security Teams)
  - title: "USENIX Security '26 Call for Papers (ethics guidelines)"
    url: https://www.usenix.org/conference/usenixsecurity26/call-for-papers
    publisher: USENIX Association
quiz:
  - question: While using the campus housing portal, bob mistypes a number in the URL and sees another student's room assignment. What should he do next?
    choices:
      - Try a few more numbers to confirm the flaw is real before reporting it.
      - Post a warning on social media so other students can protect themselves.
      - Stop, note what he did and when, and report it through the college's published channel without accessing any more records.
      - Download the record as proof, then report it.
    answer: 2
    explanation: One accidental view is enough to report. More probing or saving records would expose other students' data and could go beyond any authorization. The owner can reproduce the flaw with test accounts, and posting details before a fix would put every student at risk.
  - question: A vulnerability disclosure policy says good-faith research within its terms "will be considered authorized." What does that protect?
    choices:
      - Testing that follows the policy's scope and rules, on systems the publishing organization can authorize testing on.
      - Any testing of any system the organization uses, including vendors' systems.
      - Any action at all, as long as the researcher reports it afterward.
      - Testing anywhere in the world, because the policy overrides all laws.
    answer: 0
    explanation: An organization can authorize testing only of what it controls, and only on its own terms. Policies such as the Department of Commerce's list vendor-owned systems as out of scope, and banned methods stay banned. A policy cannot bind other parties or override the law.
  - question: A flaw has a CVSS v4.0 Base score in the High range. Which statement is most accurate?
    choices:
      - The organization's risk from the flaw is High everywhere.
      - The score describes the flaw's intrinsic severity; threat and environmental information, and the organization's own context, are still needed to judge risk.
      - The flaw must be under active attack.
      - The score means the flaw cannot be fixed.
    answer: 1
    explanation: FIRST describes the Base score as reflecting "the severity of a vulnerability according to its intrinsic characteristics," and recommends adding Threat and Environmental metrics for a more complete input to risk assessment. Severity is one input to a risk decision, not the decision.
  - question: A graduate student's study will send simulated phishing emails to students and measure who clicks. The campus IRB has approved it. According to USENIX Security's ethics guidelines, what is still required for a paper about it?
    choices:
      - Nothing; IRB approval settles every ethical question.
      - Only a statement that no laws were broken.
      - Proof that every participant clicked.
      - A stakeholder-based ethics analysis, because the guidelines state that "IRB approval is not a substitute for ethical analysis."
    answer: 3
    explanation: USENIX Security asks authors to consider all possible stakeholders, starting from the Menlo principles, and says IRB approval does not replace that analysis. Papers with missing or inadequate ethics statements may be desk rejected.
  - question: A researcher finds a flaw in an open-source library used by dozens of vendors' products. Why is coordination especially important here?
    choices:
      - Because open-source flaws never need fixing.
      - Because the first vendor to hear can keep the flaw secret forever.
      - Because a fix and an advisory need to reach every affected vendor before details go public, and a coordinator can help reach them all.
      - Because coordination lets the researcher avoid telling any vendor.
    answer: 2
    explanation: ISO/IEC 29147 notes that "coordinated vulnerability disclosure is especially important when multiple vendors are affected." USENIX Security's guidelines add that for widespread vulnerabilities, coordinating through a body such as CISA may be more ethical than, or an addition to, direct disclosure.
---

## Why it matters

Students who learn security start noticing flaws, sometimes by accident. A changed number in a URL shows another student's record. A misconfigured server answers when it should not. What happens next matters more than the discovery. A careful private report gets the flaw fixed. Probing further, saving data or posting details can hurt the people whose data is exposed and can lead to discipline or prosecution under laws such as the [[cfaa|CFAA]] ([FND-07](lesson:FND-07)).

Organizations need a front door for these reports. Without a published channel and published promises, a finder does not know whom to tell or whether the reply will be thanks or a legal threat. CISA publishes a vulnerability disclosure policy template to help US federal agencies align their policies with Binding Operational Directive 20-01. The Department of Commerce's policy, for example, says that "efforts made in good faith to comply with this policy during all security research will be considered authorized."

Researchers face a further question: even when a study is legal, is it right? Major venues expect an answer: the USENIX Security call for papers says that "IRB approval is not a substitute for ethical analysis," and papers with missing or inadequate ethics statements may be desk rejected.

## The core idea

Keep two questions apart:

1. **Was I authorized to do what I did?** Authorization comes before testing, from someone who controls the system: written [[rules-of-engagement]], a lab assignment on lab systems, or a disclosure policy that covers the system.
2. **How do I report what I found?** Privately, through the owner's channel, with enough detail to fix it, and without exposing anyone further.

A careful report cannot make unauthorized testing authorized after the fact. A disclosure policy can answer the first question in advance, for the systems it covers.

Think of noticing that a building's side door is unlocked. You tell the building manager. You do not walk through and photograph the offices to prove your point, and you do not post a picture of the open door while it is still open.

[[responsible-disclosure|Responsible disclosure]] names this habit of reporting privately and allowing time for a fix. The newer, more neutral term is [[coordinated-vulnerability-disclosure|coordinated vulnerability disclosure (CVD)]]: the finder, the organization that can fix the flaw, and sometimes a neutral coordinator work together so that a fix is ready before details go public. Two international standards describe the vendor's side. ISO/IEC 29147 gives guidelines on receiving vulnerability reports and on disclosing remediation information, and it notes that "coordinated vulnerability disclosure is especially important when multiple vendors are affected." ISO/IEC 30111 covers the steps in between: how vendors "process and remediate reported potential vulnerabilities." ISO lists both as current but due for revision.

A [[vulnerability-disclosure-policy|vulnerability disclosure policy (VDP)]] is the organization's public statement of scope, rules and promises. Its most important clause is usually the [[safe-harbor|safe harbor]]: a promise that good-faith research within the policy's terms is authorized and will not lead to legal action by the organization. A VDP that pays rewards for qualifying reports is usually called a bug bounty.

## How it works

### What a VDP contains

CISA's template is a good model because its structure answers a finder's questions in order. Its main sections, with what each does:

| Template section | What it settles | Example from CISA or Commerce |
| --- | --- | --- |
| Authorization | Whether good-faith research is authorized | "we will consider your research to be authorized"; no legal action recommended or pursued |
| Guidelines | How to behave while testing | Avoid privacy violations and disruption; if you meet sensitive data, "stop your test, notify us immediately" |
| Test methods | What is banned | Denial of service, social engineering, physical testing |
| Scope | Which systems are covered | Named public systems; vendor-owned systems out of scope |
| Reporting a vulnerability | Channel and content | Location, potential impact and reproduction steps; anonymous reports accepted |
| What you can expect from us | The organization's commitments | Acknowledge within 3 business days; open dialogue; reporter's name shared only with permission |

For the authorization section, CISA "strongly encourages keeping this language as-is." The template also asks reporters to give the organization "a reasonable amount of time to resolve the issue before you disclose it publicly," without fixing a number. Commerce's policy is more specific: it commits to confirming a vulnerability within 15 business days where appropriate and to patching within 90 days or less, and it asks researchers to keep details confidential for up to 90 calendar days after it notifies them.

Safe harbor has limits. An organization can authorize testing only of systems it controls, and Commerce, for example, excludes systems owned by vendors. If a third party takes legal action against a researcher, the CISA template promises only that the agency "will make this authorization known." The [[good-faith-security-research|Justice Department's 2022 charging policy]], covered in FND-07, guides federal prosecutors but does not bind state prosecutors or civil lawsuits.

### The coordinated disclosure workflow

The sequence below shows a report moving through a college's intake process. The finder reports through the published channel, the security office acknowledges and triages, the system owner fixes and verifies, and only then does the finder learn the outcome and agree on any publication.

```sequence
title: Coordinated disclosure at a college
participant FIN as Finder
participant SEC as Security office
participant OWN as System owner
participant PRV as Privacy office
FIN -> SEC: Report through the published channel
SEC --> FIN: Acknowledged within 3 business days
SEC -> OWN: Reproduce with test accounts, rate severity
SEC -> PRV: Student records may have been exposed
OWN --> SEC: Fix deployed and verified
SEC --> FIN: Outcome, thanks, credit if wanted
note: Details stay private until the fix is verified
```

**Triage and severity.** The security office reproduces the report safely, identifies affected systems, and rates severity. The Common Vulnerability Scoring System (CVSS) v4.0 from FIRST has four metric groups: Base, Threat, Environmental and Supplemental. FIRST describes the Base score as reflecting "the severity of a vulnerability according to its intrinsic characteristics" and recommends adding Threat and Environmental metrics to get "a more comprehensive input to risk assessment." Scores are named by what they include, such as CVSS-B for Base only or CVSS-BTE for all three scored groups. The optional rating scale runs from Low (0.1 to 3.9) through Medium and High to Critical (9.0 to 10.0). Severity feeds the risk decision from [GRC-01](lesson:GRC-01); it does not replace it.

**Timing.** Publishing too early exposes users before a fix exists; never publishing lets a slow vendor leave users exposed indefinitely. CVD settles this with an agreed publication date, and many finders also set a deadline after which details may go public even without a fix. When a flaw sits in a component that many vendors use, a coordinator can notify them all under the same timeline. USENIX Security's guidelines say that for widespread vulnerabilities, coordinating through a body such as CISA may be more ethical than, or an addition to, direct disclosure.

> [!ETHICS] Only test systems you own or have written permission to test.

### Research ethics beyond the law

Legal authorization is necessary but not sufficient. The [[menlo-report|Menlo Report]] adapts human-subjects ethics to information and communication technology research with four principles: respect for persons, beneficence, justice, and respect for law and public interest. USENIX Security asks authors to "consider all possible stakeholders," expects researchers "to disclose vulnerabilities as soon as they are discovered," and asks papers to state to whom they disclosed and with what outcome.

Some studies also need an [[irb|institutional review board]]. A study that measures how students respond to simulated phishing is likely human subjects research, so the review process in [GRC-04](lesson:GRC-04) applies. A scan that collects data about real users may too. IRB review answers whether the study protects its participants; the stakeholder analysis also asks about system owners, bystanders and the public.

## Worked example

bob, a student in a web security course, is checking his room assignment on housing.college.test. He mistypes one digit of the number in the URL, and another student's name and room appear. This is a [[bola|broken object-level authorization]] flaw: the server never checks that the record belongs to the signed-in user. bob closes the page. Here is how he and the college handle it.

**Step 1: Stop and record.** bob does not try other numbers, save the page or tell friends. He writes down what he did, the time, and the URL pattern, using only his own account.

**Step 2: Find the front door.** The college's security page and its security.txt file, a small text file at a standard web address that names security contacts ([FND-07](lesson:FND-07)), point to a VDP. The policy covers housing.college.test, authorizes good-faith research within its terms, and says to stop at the first sign of other people's data. bob already has. Nothing more needs testing, because the college can reproduce the flaw with its own test accounts.

**Step 3: Write the report.** A good report is short, specific and honest about what the finder did and did not do.

```text
To:       security@college.test (per the college disclosure policy)
Subject:  Housing portal shows other students' room assignments

Summary:  The room assignment page returns any student's record when
          the number in the URL is changed.
Where:    https://housing.college.test/assignment?id=<number>
Steps:    1. Signed in as bob and opened my own assignment page.
          2. Mistyped one digit of the id. Another student's name and
             room appeared. I closed the page.
Impact:   Any signed-in student could probably view others' records.
Not done: I did not try other ids, save the record, or share it.
When:     October 9, about 14:20
Contact:  bob@college.test
```

**Step 4: Intake and triage.** The security office acknowledges the report within three business days, as its policy promises. The housing system's owner reproduces the flaw with two test accounts. Because the flaw exposes student records to every signed-in user, the team treats it as urgent, records a CVSS-BTE vector to document its reasoning, and brings in the privacy office.

**Step 5: Fix and look back.** The owner adds a check that each requested record belongs to the signed-in student, then verifies that the check holds. The team also searches access logs for other users who requested records that were not theirs, since bob may not have been the first. The privacy office decides what follow-up the exposure requires.

**Step 6: Close the loop.** The security office tells bob the flaw is fixed, thanks him, and asks whether he wants to be credited. bob asks his instructor whether he may describe the case in a class report. The college agrees, provided the write-up leaves out details that would identify the other student.

## In practice

- **Publish the front door.** Post a VDP and a security.txt file, staff the inbox, and meet the response times you promise.
- **Make the safe harbor real.** Agree on the authorization wording with legal counsel before publishing, and keep it plain.
- **Scope honestly.** List the systems you control, exclude vendors' systems you cannot authorize, and tell finders where to report vendor issues ([GRC-06](lesson:GRC-06)).
- **Track every report** in a ticket system with owners, severity and dates, and measure time to acknowledge and time to fix.
- **For researchers:** test only in scope, take the minimum access needed to show a flaw, stop at sensitive data, keep notes, and never ask for payment in exchange for silence.
- **Limits.** A VDP binds only the organization that publishes it. It cannot authorize testing of other parties' systems, and laws outside the United States differ.

## Common misconceptions

- **"If I report it politely, the testing was legal."** Authorization comes before testing. A good report helps everyone, but it does not authorize what came before it.
- **"A VDP lets me test anything the organization uses."** Only the systems in its scope, by the methods it allows. Vendor-hosted services are often out of scope.
- **"Public disclosure is always irresponsible."** Publication after a fix, or after an agreed deadline, is part of coordinated disclosure, and it tells users to update.
- **"A high CVSS score means high risk for us."** CVSS Base scores describe intrinsic severity; your exposure and context decide the risk.
- **"IRB approval means the study is ethical."** It is one review with a defined scope. Stakeholder analysis still matters.

## Try it yourself

On paper, draft a VDP for the fictional Department of Computer Science at college.test, using the CISA template's sections.

1. **Authorization.** Write a safe harbor clause in plain language. State what it covers and what it cannot cover.
2. **Scope.** In scope: cs.college.test and submit.college.test. Out of scope: the campus LMS, run by a vendor, and labcloud.example from [GRC-06](lesson:GRC-06). Say where finders should send reports about out-of-scope systems.
3. **Guidelines and test methods.** List at least five banned methods, and say what a finder must do on meeting student data.
4. **Reporting.** Name the channel, the information wanted, and whether anonymous reports are accepted.
5. **Commitments.** Set acknowledgment, triage and fix targets that a small department could really meet, and a disclosure timeline. Justify each number.
6. **Workflow.** Draw a sequence diagram of intake, triage, fix and closure, naming who does each step and when the privacy office joins.

Then test your draft against three cases, and revise it wherever it gives no clear answer:

- A student reports an exposed administrator page on submit.college.test.
- A researcher reports a flaw in LabCloud that affects the department's courses.
- A graduate student wants to scan every campus web server for a research paper.

## Key takeaways

- Authorization comes before testing; a careful report cannot authorize it afterward.
- A VDP gives finders scope, rules, a channel and promises, and its safe harbor covers only what the organization controls.
- Coordinated disclosure keeps details private until a fix is ready or an agreed deadline passes, with coordinators for flaws that span vendors.
- CVSS rates intrinsic severity; risk still depends on threat, environment and context.
- Ethical research weighs every stakeholder; legal permission and IRB approval are necessary but not sufficient.

## Go deeper

- Compare the [CISA template](https://www.cisa.gov/vulnerability-disclosure-policy-template) with the [Department of Commerce policy](https://www.commerce.gov/vulnerability-disclosure-policy). List every commitment Commerce added or made more specific, and decide which a college could adopt.
- [ISO/IEC 29147](https://www.iso.org/standard/72311.html) and [ISO/IEC 30111](https://www.iso.org/standard/69725.html) split the vendor's work between talking to the outside world and handling reports inside. Sketch which roles in a college would own each half.
- Open question: should a university offer safe harbor to students who find flaws in campus systems in good faith, even outside a course, and how could it do so without encouraging testing of systems that hold other students' data?
