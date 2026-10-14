---
topicId: GRC-02
title: Policies, standards, and controls
summary: How a governance requirement travels from a policy statement through standards and procedures to specific security controls, the people who operate them, and the evidence that shows they work.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish a policy, a standard, a procedure and a guideline by purpose, approver and level of detail.
  - Rewrite a vague policy statement as testable requirements with measurable parameters.
  - Map a requirement to a NIST CSF 2.0 outcome and to NIST SP 800-53 controls.
  - Assign an operational owner and name the evidence that would show each control works.
  - Explain how baselines, tailoring and inherited controls change what one system must implement.
prerequisites: [GRC-01, FND-05]
concepts: [security-framework, nist-csf, control-baseline, common-control]
labs: []
keywords:
  - policy hierarchy
  - policy vs standard vs procedure
  - guideline
  - control catalog
  - control family
  - control enhancement
  - organization-defined parameter
  - ODP
  - tailoring
  - overlay
  - inherited control
  - traceability matrix
  - RACI
  - ISMS
  - NIST SP 800-53
  - NIST SP 800-53B
  - AC-1
  - AC-2
  - ISO/IEC 27001
  - CSF 2.0
  - GV.PO-01
  - PR.AA-05
sources:
  - title: 'NIST SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-53
  - title: 'NIST SP 800-53B: Control Baselines for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final
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
  - title: 'ISO/IEC 27001:2022: Information security management systems — Requirements'
    url: https://www.iso.org/standard/27001
    publisher: International Organization for Standardization (ISO) and IEC
    license: All rights reserved
quiz:
  - question: A college policy says staff accounts are "removed promptly" after someone leaves. What should the supporting standard add?
    choices:
      - A measurable parameter, such as "disabled within one business day of the separation date."
      - The reasons the college values security.
      - A list of every system the college owns.
      - A reminder that the policy is mandatory.
    answer: 0
    explanation: A standard turns intent into something testable. "Promptly" cannot be checked; "within one business day of the separation date" can be compared against logs. Values and inventories belong elsewhere.
  - question: Why does NIST CSF 2.0 not tell you which specific controls to deploy?
    choices:
      - It is out of date and will be replaced by SP 800-53.
      - It applies only to federal agencies, which choose controls separately.
      - It describes outcomes and deliberately leaves the how to each organization, pointing to catalogs such as SP 800-53.
      - It assumes every organization already holds an ISO/IEC 27001 certificate.
    answer: 2
    explanation: CSF 2.0 says it does not prescribe how outcomes should be achieved. That lets very different organizations use the same outcomes, and they pick controls from catalogs suited to their size and risk.
  - question: SubmitIt relies on campus single sign-on, run by central IT, for multi-factor authentication. Which statement about this inherited control is most accurate?
    choices:
      - The department no longer needs to think about authentication at all.
      - The department relies on central IT's implementation and evidence, so it should document the inheritance and know who owns the control.
      - Inherited controls do not count toward any requirement.
      - The department must build its own MFA system as well.
    answer: 1
    explanation: A common control is implemented once and inherited by many systems. The protection and the failure modes are both inherited, so a system's documentation should say what it inherits, from whom, and where the evidence lives.
  - question: 'In SP 800-53, AC-2 says to review accounts at an "[Assignment: organization-defined frequency]". Where should the actual frequency be set?'
    choices:
      - Nowhere; the auditor decides during the audit.
      - In the policy statement signed by the college president.
      - In each system administrator's personal notes.
      - In an organizational standard, such as "every term," that the control owner then follows.
    answer: 3
    explanation: Organization-defined parameters are placeholders the organization fills in. A standard is the natural home, because it is mandatory and specific but can change more easily than a policy.
  - question: A termly access review at the CS department lists only people known to HR. Student TAs are hired by the department and never appear in HR records. What does this reveal?
    choices:
      - Nothing, because the policy already says access is removed promptly.
      - A coverage gap. The disable trigger depends on a data source that misses a whole group of users, so a control that does not depend on HR, such as automatic expiry at term end, is needed.
      - That TAs should be exempt from the access policy.
      - That the review should happen less often.
    answer: 1
    explanation: Mapping a requirement to its control and data sources exposes assumptions. Here the control works only for users that HR knows about. Time-limited TA roles close the gap without relying on HR.
---

## Why it matters

Picture the review after a hypothetical incident at a college: a former teaching assistant's account, still active months after graduation, was used to download a class roster. The college has a policy that says access is removed when it is no longer needed, and everyone agrees with that sentence. Nobody can say who was supposed to remove the account, how quickly, or how anyone would have noticed that it was missed. The policy existed. The control did not.

The gap between written intent and operating safeguards is the subject of this lesson. Governance documents reduce risk only when each requirement is specific enough to test, is carried out by a named control, is operated by a named person, and leaves evidence. Auditors, incident reviewers and accreditors all ask the same thing: "show me." [[compliance|Compliance]] programs are built from exactly this traceability.

Frameworks help but do not do the work. Among the outcomes in [[nist-csf|NIST CSF 2.0]] are a cybersecurity policy that is "established ... communicated and enforced" (GV.PO-01) and access permissions that are "defined in a policy, managed, enforced, and reviewed" (PR.AA-05). Catalogs such as NIST SP 800-53 supply controls that achieve such outcomes. Neither writes your requirements or runs your controls.

## The core idea

Start with three assumptions: the organization has leaders with authority to set direction, staff who operate systems, and outside requirements from laws, contracts and frameworks. Its documents then form a ladder from intent to action. Names vary between organizations, but the progression does not.

| Document | Answers | Typical approver | Example |
| --- | --- | --- | --- |
| Policy | What we require, and why | Senior leadership | Access is granted on need and removed promptly when the need ends |
| Standard | Exactly what the policy means, measurably | Security office or IT governance | Staff accounts are disabled within one business day of separation |
| Procedure | Who does what, step by step | System or operations manager | On a separation ticket, the identity team disables the account and records the ticket number |
| Guideline | Recommended, optional practice | Any expert team | Prefer group roles to individual grants |

A [[security-policy]] is short and stable. Standards change as technology does, and procedures change most often. Policies, standards and procedures are mandatory for the people they address; guidelines are advice.

[[security-control|Security controls]] are the safeguards that make a requirement true in operation. They may be technical (an automated job that disables accounts), procedural (a termly access review) or physical (a badge reader). Each control has an owner who operates it and keeps the evidence that it ran.

A building code is a useful analogy. The code says exits must stay visible in a power failure (policy and standard). Facilities staff test the emergency lights on a schedule (procedure). The battery-backed sign is the control, and the test log is the evidence. An inspector reads the log and also walks the halls, because a log can be wrong.

Three related terms are easy to mix up. A [[security-framework]] organizes a program around outcomes or practices, as CSF 2.0 does. A control catalog, such as SP 800-53, is a library of specific safeguards. A [[control-baseline]] is a starting selection from a catalog, sized to a system's impact level.

## How it works

### Outcomes, catalogs and management systems

CSF 2.0 lists outcomes in six Functions (Govern, Identify, Protect, Detect, Respond, Recover) and states plainly that it "does not prescribe how outcomes should be achieved." SP 800-53 Rev. 5 supplies the how: a catalog of security and privacy controls in 20 families, from Access Control (AC) to Supply Chain Risk Management (SR). ISO/IEC 27001:2022 takes a third angle. It sets requirements for an information security management system (ISMS), the management process that establishes, implements, maintains and continually improves security, and organizations can be certified against it by accredited certification bodies.

### Anatomy of an SP 800-53 control

Each control has a base statement, a discussion, related controls, optional control enhancements and references. Enhancements add functionality or specificity, or increase the strength of the base control, and they always require the base control too.

Many statements contain organization-defined parameters in brackets. For example, control AC-2 (Account Management) asks the organization to "Review accounts for compliance with account management requirements [Assignment: organization-defined frequency]." The catalog leaves the blank; your standard fills it in ("every term"). AC-2 also asks the organization to notify account managers within a defined time "when users are terminated or transferred" and to "Align account management processes with personnel termination and transfer processes."

The catalog even treats the document ladder as a control. AC-1, Policy and Procedures, asks for a documented access control policy and procedures, an official who manages them, and regular review.

### Baselines, tailoring and inheritance

Nobody implements the whole catalog. SP 800-53B provides three security baselines, one for each system impact level (low, moderate, high), and a privacy baseline that applies regardless of impact level. Organizations then tailor a baseline to the system, and communities can publish overlays that adjust baselines for a technology or environment.

Some controls are implemented once and inherited by many systems. SP 800-37 calls these [[common-control|common controls]]. Campus single sign-on with MFA and the physical security of a data center are typical examples. A system that inherits a control relies on someone else's implementation and evidence, so its documentation should say what it inherits and from whom.

### Traceability from requirement to evidence

The thread that ties everything together is a traceability record: requirement, source, control, parameter, owner, frequency and evidence. The sequence below shows the evidence a well-built account-removal control leaves behind. HR records a separation, the identity system disables the directory account and removes the application role, and each step writes a record that a reviewer can later sample.

```sequence
title: Separation to disabled account, with evidence
participant HR as HR system
participant IDM as Identity team
participant DIR as Campus directory
participant APP as SubmitIt
participant REV as Term reviewer
HR -> IDM: Separation recorded for a staff member
IDM -> DIR: Disable the account
DIR --> IDM: Disabled, time stamp logged
IDM -> APP: Remove the person's SubmitIt roles
APP --> IDM: Role removed, change logged
note: Evidence: ticket, directory log, role log
REV -> IDM: Sample this term's separations
IDM --> REV: Separation dates beside disable times
```

## Worked example

The college's fictional Access Policy, section 4.2, says: "Access to college information systems is granted on the basis of need and removed promptly when the need ends." The CS department must show how SubmitIt (`submit.college.test`, the service from [GRC-01](lesson:GRC-01)) meets it.

**Step 1: split the statement into testable requirements.**

- 4.2a: The data owner approves access before it is granted.
- 4.2b: Access is removed within a defined time after a person leaves or changes role.
- 4.2c: Access is reviewed on a defined schedule.

**Step 2: set parameters in a standard.** Staff accounts are disabled within one business day of the separation date. TA roles expire 14 days after the term ends, to allow for grade appeals. The system owner reviews all SubmitIt roles each term.

**Step 3: map to the framework and the catalog.** All three requirements support CSF outcome PR.AA-05. Requirement 4.2a falls under AC-2, which also covers approving account requests. Requirement 4.2b maps to AC-2's notification and alignment items, and 4.2c to its review item, with "every term" as the parameter. The section 4.2 document itself, and its review cycle, are covered by AC-1.

**Step 4: assign owners and evidence.**

| Requirement | Control | Responsible | Accountable | Evidence |
| --- | --- | --- | --- | --- |
| 4.2a | Role requests approved in a ticket | TA coordinator | Department chair | Approved tickets, sampled each term |
| 4.2b | Automated disable on HR separation | Identity team | Director of identity services | Disable log matched to the HR separation list |
| 4.2b | TA roles expire after the term | SubmitIt administrator | Department chair | Role list on day 15 after term end |
| 4.2c | Termly role review | SubmitIt administrator | Department chair | Signed review with removals noted |

**Step 5: test the mapping.** For each control, ask: "If this failed silently, which evidence would show it?" The question exposes a gap. At this college, student TAs are appointed by the department and do not appear in the HR system, so the automated disable never fires for them. The time-limited TA role closes the gap, because it does not depend on HR at all. That is why the table has two controls for requirement 4.2b.

The finished record for 4.2b looks like this:

```yaml
requirement: '4.2b'
statement: Access is removed within a defined time after a person leaves or changes role.
sources: [Access Policy 4.2, CSF 2.0 PR.AA-05, SP 800-53 AC-2]
parameters:
  staff_disable: 1 business day after the HR separation date
  ta_role_expiry: 14 days after the last day of term
controls:
  - id: C-17
    description: Directory account disabled automatically from the HR separation feed
    type: technical, preventive
    owner: Identity team
    inherited_by: [SubmitIt, course LMS, lab file server]
    evidence: Disable log joined to the HR separation list; exceptions listed
  - id: C-18
    description: SubmitIt TA roles carry an expiry date set at assignment
    type: technical, preventive
    owner: SubmitIt administrator
    evidence: Role export on day 15 after term end shows no active TA roles
review: Each term by the department chair; findings go to the risk register
```

## In practice

- **Write requirements a test could fail.** "Within one business day" can be checked against logs; "promptly" cannot.
- **Keep layers in their lanes.** Short, stable policies; specific standards; procedures owned by the people who perform them. Putting a 14-day number in a policy forces a leadership vote to change it.
- **One accountable owner per control.** Shared ownership usually means no ownership. Publish who owns what.
- **Manage exceptions.** An exception should be time-limited, assessed for risk, approved by the risk owner, and paired with a compensating safeguard where possible. This is the acceptance process from [GRC-01](lesson:GRC-01).
- **Map once, reuse often.** One well-documented control can serve a CSF outcome, an SP 800-53 control and an ISO/IEC 27001 requirement. NIST publishes mappings among these, linked from the SP 800-53 page.
- **Review on a cycle.** One CSF 2.0 outcome is policy that is "reviewed, updated, communicated, and enforced" as requirements, threats and technology change (GV.PO-02).
- **Know the limits.** Documents do not execute, controls drift as systems change, and evidence can be produced without the control really working. Spot checks of the real system, not only the paperwork, guard against all three.

## Common misconceptions

- **"Our policy covers it."** A policy states intent. Only a control with an owner and evidence covers anything.
- **"Adopting CSF 2.0 means deploying its controls."** CSF lists outcomes, not controls; you choose controls from a catalog.
- **"More controls means more security."** Every control costs effort and can fail. Baselines and tailoring exist to match controls to risk.
- **"An inherited control is someone else's problem."** You inherit its failures along with its protection, so know its owner and its evidence.
- **"An ISO/IEC 27001 certificate means every control is in place."** Certification says a management system meets the standard's requirements for a stated scope; [GRC-07](lesson:GRC-07) explores what such claims do and do not show.

## Try it yourself

On paper, map this policy statement for the Room 214 computer lab from [GRC-01](lesson:GRC-01) to controls: "College computers are protected against malicious software and kept up to date with security fixes."

1. **Split it** into at least three testable requirements.
2. **Set parameters** in a short standard: for example, how many days after release a critical security update must be installed. Justify each number.
3. **Map** each requirement to a CSF 2.0 outcome, such as PR.PS-02 ("Software is maintained, replaced, and removed commensurate with risk") or DE.CM-09 (monitoring hardware and software for adverse events). Then find a matching control in the Configuration Management (CM) or System and Information Integrity (SI) family of SP 800-53, and note which parameter it leaves for you.
4. **Assign** a responsible role, an accountable role, and the evidence for each control.
5. **Test the mapping.** Find one device or user group your controls miss, such as instructor laptops plugged into lab ports, and add a control or a documented exception.

```text
Req ID | Requirement | Parameter | CSF outcome | SP 800-53 control | Responsible | Accountable | Evidence | Gap found
```

## Key takeaways

- Policies state intent, standards make it measurable, procedures say who does what, and guidelines advise.
- A requirement is real only when a named control, a named owner and retained evidence stand behind it.
- CSF 2.0 lists outcomes; SP 800-53 supplies controls, with organization-defined parameters that your standards fill in.
- Baselines and tailoring size the control set to a system, and inherited controls must be documented, not assumed.
- Testing the mapping ("what evidence would show this failed?") finds coverage gaps before an incident does.

## Go deeper

- [SP 800-53B](https://csrc.nist.gov/pubs/sp/800/53/b/upd1/final) explains the working assumptions behind each baseline and how to build overlays for a community or technology. Compare its moderate baseline with what a small department could actually operate.
- The [SP 800-53 Rev. 5 page](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final) links NIST's mappings to the CSF and the Privacy Framework, a crosswalk to ISO/IEC 27001:2022, and a machine-readable version of the catalog. Pick one control and trace it through each mapping.
- Open question: as more controls become code (configuration checks, policy engines), how should evidence of a control's effectiveness change, and who audits the code that produces it?
