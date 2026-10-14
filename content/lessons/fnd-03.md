---
topicId: FND-03
title: Threat modeling and trust boundaries
summary: Learn to draw a system as a data-flow diagram, mark where trust changes, find threats with STRIDE and attack trees, and justify every trust assumption you make.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Draw a data-flow diagram of a system and mark its trust boundaries.
  - State the trust assumption at each boundary crossing and judge whether it is justified.
  - Apply STRIDE to the elements of a data-flow diagram and name a mitigation for each threat found.
  - Build an attack tree with AND and OR nodes and use it to find the mitigation that removes the most attack paths.
prerequisites: [FND-01, FND-02]
concepts:
  - threat-model
  - trust-boundary
  - data-flow-diagram
  - stride
  - attack-tree
keywords:
  - threat modeling
  - STRIDE
  - spoofing
  - tampering
  - repudiation
  - information disclosure
  - denial of service
  - elevation of privilege
  - attack tree
  - data-flow diagram
  - DFD
  - trust boundary
  - four-question framework
  - Threat Modeling Manifesto
  - Microsoft Threat Modeling Tool
sources:
  - title: 'OWASP Threat Modeling Cheat Sheet'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'Threats: Microsoft Threat Modeling Tool'
    url: https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
    publisher: Microsoft
  - title: 'Attack Trees (Bruce Schneier, Dr. Dobb''s Journal, December 1999)'
    url: https://www.schneier.com/academic/archives/1999/12/attack_trees.html
    publisher: Bruce Schneier (schneier.com)
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: The course portal accepts a nightly grade file from the learning management system because "it arrives over the campus network." What is wrong with this trust assumption?
    choices:
      - Nothing, because traffic on the campus network is already trusted.
      - Network location says nothing about who produced the file or whether its contents are correct, so the import job must authenticate the source and validate each row.
      - The file should be emailed instead, because email is authenticated.
      - The assumption is fine as long as the file is in CSV format.
    answer: 1
    explanation: The file crosses a trust boundary between two systems with different owners. Anyone who can write to the export folder or the network path can change it. Trust has to rest on evidence, such as a verified signature and per-row authorization checks, not on where the bytes came from.
  - question: A student changes a hidden form field from student_id=alice to student_id=bob and submits an assignment as Bob. Which STRIDE category fits best, and which property is violated?
    choices:
      - Spoofing, violating authentication, because the request claims to be from Bob without proving it.
      - Repudiation, violating non-repudiation.
      - Denial of service, violating availability.
      - Information disclosure, violating confidentiality.
    answer: 0
    explanation: The attacker makes the portal accept an identity they did not prove. Tampering is also involved, since a request was modified, but the harm is that the server trusted a claimed identity from the untrusted side of the boundary. The fix is to take identity only from the authenticated session.
  - question: 'In an attack tree, the node "Corrupt the nightly import" is an AND node with two children: "gain write access to the export folder" and "the import job accepts unsigned files." The team makes the import job reject unsigned files. What happens to that node?'
    choices:
      - It stays possible, because the attacker can still get write access to the folder.
      - It becomes possible only for attackers with special equipment.
      - It becomes impossible, because an AND node needs every child to be possible.
      - Its cost is halved, because one of two children was removed.
    answer: 2
    explanation: An AND node requires all of its children. Making one child impossible cuts the whole branch, which is why mitigations on AND branches can be very efficient. An OR node would stay possible as long as any child remained possible.
  - question: Why does STRIDE work better as a prompt than as a complete list of threats?
    choices:
      - Because it covers only network attacks.
      - Because it was replaced by attack trees.
      - Because its categories are only defined for databases.
      - Because it groups threats by the property they violate, and some harms, such as abuse by fully authorized users or privacy harms, can slip between the categories.
    answer: 3
    explanation: STRIDE helps analysts ask one question per category at each element. It does not guarantee coverage. Teams combine it with attack trees, abuse cases, and knowledge of real attacks, and they revisit the model as the design changes.
---

## Why it matters

Many serious security flaws are design flaws, and you can find them on a whiteboard before anyone writes code. A portal that decides who you are from a form field, an internal service that accepts any request from the local network, and an import job that loads whatever file appears in a folder are all mistakes about trust. No amount of careful coding fixes a design that trusts the wrong thing.

Threat modeling is the discipline of finding those mistakes on purpose. A [[threat-model]] describes who might attack a system, what they want, and what they can do. The process of building one is often framed with four questions from the Threat Modeling Manifesto, as quoted by OWASP: "What are we working on?", "What can go wrong?", "What are we going to do about it?", and "Did we do a good enough job?" ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html)).

Timing matters too. The CS 161 textbook warns that security retrofitted after the architecture is fixed is much harder than security designed in from the start ([CS 161, Chapter 1](https://textbook.cs161.org/principles/principles.html)). A threat model is cheapest when it can still change the design.

## The core idea

A [[trust-boundary]] is a place in a system where data or commands pass between parts that are trusted to different degrees: different owners, different privileges, or different assumptions about who controls them. A browser and a server sit on opposite sides of one. So do your code and a partner's service, or a web application and its database.

Think of airport security. Everyone past the checkpoint is assumed to have been screened, so the gates do not screen again. The checkpoint is the trust boundary. If a service door lets people skip it, every assumption on the inside quietly becomes false.

Three assumptions frame the method:

1. **Attackers know your design.** CS 161 tells you to assume the attacker knows the system they are attacking. Hidden fields and obscure URLs are not protections.
2. **Anything on the untrusted side can be forged.** A user controls every byte their browser sends, including hidden form fields, cookies, and headers.
3. **Trust is a decision, and every trusted part is a liability.** The components you rely on for security form the trusted computing base, and CS 161 advises keeping it small. Each time you trust something, write down why.

## How it works

### Step 1: draw a data-flow diagram

A [[data-flow-diagram]] (DFD) shows how data moves through a system. OWASP calls DFDs "arguably the most common approach" to system modeling. They use four element types plus boundaries:

| Element         | Drawn as         | Examples                                           |
| --------------- | ---------------- | -------------------------------------------------- |
| External entity | `[box]`          | A user's browser, a partner's service              |
| Process         | `(circle)`       | A web application, a nightly import job            |
| Data store      | `[= store =]`    | A database, a file share, a queue                  |
| Data flow       | arrow, numbered  | An HTTPS request, a SQL query, a file transfer     |
| Trust boundary  | double line `══` | Internet to data center, one owner to another      |

### Step 2: mark boundaries and write trust assumptions

Every flow that crosses a boundary gets a written assumption, such as "the portal trusts login assertions from the campus single sign-on service," and a justification, such as "because it verifies the assertion's signature, issuer, audience, and expiry." An assumption with no justification is a finding.

### Step 3: find threats with STRIDE

[[stride|STRIDE]] is a mnemonic for six threat categories, each the violation of a property you met in [FND-01](lesson:FND-01). The category meanings follow Microsoft's Threat Modeling Tool documentation ([Microsoft](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)), and the mapping to properties follows OWASP.

| Category                   | Violates        | Ask at each element                              |
| -------------------------- | --------------- | ------------------------------------------------ |
| **S**poofing               | Authentication  | Can someone pretend to be another user or system? |
| **T**ampering              | Integrity       | Can data or code be changed without permission?  |
| **R**epudiation            | Non-repudiation | Could someone deny an action we cannot prove?    |
| **I**nformation disclosure | Confidentiality | Can someone read what they should not?           |
| **D**enial of service      | Availability    | Can someone make this unusable for others?       |
| **E**levation of privilege | Authorization   | Can someone gain rights they were not given?     |

Walk the diagram element by element and ask the questions that make sense for it. A data flow, for example, can be altered, read, or blocked, so tampering, disclosure, and denial of service apply to it directly.

### Step 4: go deep with attack trees

An [[attack-tree]] starts from one attacker goal at the root and breaks it into the ways to reach it ([Schneier, 1999](https://www.schneier.com/academic/archives/1999/12/attack_trees.html)). Children of an **OR** node are alternatives, and any one is enough. Children of an **AND** node are steps that must all succeed. You label leaves, for example possible or impossible, and propagate the labels upward: an OR node is possible if any child is, and an AND node only if all children are. With costs, an OR node takes its cheapest child and an AND node sums its children. OWASP recommends attack trees for "a high-value attacker goal or multi-step attack."

### Step 5: decide and check

For each threat, OWASP lists four responses: mitigate it, eliminate the feature that causes it, transfer responsibility to another party, or accept it. Then ask the fourth question: did we do a good enough job?

## Worked example

The fictional course portal, portal.college.example, lets students view grades and submit work, and lets instructors enter grades. Users sign in through the campus single sign-on (SSO) service at sso.college.example. Each night, an import job loads grades exported by the learning management system (LMS) at lms.college.example. The portal also sends notification emails through an outside provider.

**Draw the DFD and mark the boundaries.**

```text
 [Browser: alice, bob, instructors]
        │ (1) HTTPS: pages, submissions, grade edits
 ═══════╪═══════ TB1: internet | portal zone ═══════
        ▼
 (Portal web app) ◀═(2) assertion via browser═ TB2 ═ [Campus SSO]
   │        │
   │        └═(6) notification═ TB4 ═▶ [Email provider]
   │ (3) SQL
   ▼
 [= Grades DB =] ◀─(5) SQL─ (Import job) ◀═(4) CSV═ TB3 ═ [LMS]
```

The diagram shows browsers sending requests (flow 1) across the internet boundary TB1 to the portal, which queries the grades database (flow 3). Login assertions arrive from the SSO service (flow 2) across TB2. The import job receives the LMS export (flow 4) across TB3 and writes to the database (flow 5). Notifications leave through the email provider (flow 6) across TB4.

**Write and judge the trust assumptions.**

| Crossing | Assumption                                      | Justified?                                                     |
| -------- | ----------------------------------------------- | -------------------------------------------------------------- |
| TB1      | A request is from the student it names          | No. Take identity from the session, never from request fields  |
| TB2      | An assertion identifies the signed-in user      | Yes, if the portal verifies signature, issuer, audience, expiry |
| TB3      | The nightly file contains correct grades        | No. Nothing proves who wrote it; require a signed export and check each row |
| TB4      | The email provider cannot change grades         | Yes, data only flows out, but emails can disclose grades       |

The sign-in flow shows a well-justified crossing of TB2. Because alice's browser carries the assertion, anyone controlling that browser could edit it, so the portal checks it before trusting it:

```sequence
title: Crossing trust boundary TB2 at sign-in
participant B as Browser
participant P as portal.college.example
participant S as sso.college.example
B -> P: GET /grades (no session yet)
P --> B: Redirect to the campus SSO
B -> S: Sign in as alice (password and MFA)
S --> B: Assertion signed by SSO, audience: portal
B -> P: POST the assertion
note P: Verify signature, issuer, audience, expiry
P --> B: Session cookie for alice
B -x P: Edited assertion (name changed): rejected
```

**Apply STRIDE to the elements.**

| Element           | Threat                                                                 | Mitigation                                                  |
| ----------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| Flow 1            | **S**: mallory changes a hidden field to submit work as bob            | Derive identity from the authenticated session              |
| Flow 4            | **T**: someone edits the CSV on its way to the import job              | Signed exports, verified before import                      |
| Portal web app    | **R**: an instructor denies changing a grade                           | Append-only log of who, when, old value, new value          |
| Grades DB         | **I**: a [[sql-injection]] flaw dumps every grade                      | A [[parameterized-query]] for every query, least-privilege account |
| Portal web app    | **D**: a flood of logins during registration week                      | Rate limiting, capacity planning                            |
| Import job        | **E**: a crafted row sets grades for a course the uploader does not teach | Check each row's course against the uploader's rights    |

**Build an attack tree for the highest-value goal.**

```text
GOAL: Change alice's final grade without authorization            [OR]
├── 1. Act as an authorized instructor                              [OR]
│   ├── 1.1 Phish an instructor's password and MFA code             possible
│   └── 1.2 Steal an active instructor session cookie               possible only if XSS exists
├── 2. Abuse the portal's own logic                                 [OR]
│   ├── 2.1 Change the course id in a grade-update request          possible: no server check yet
│   └── 2.2 SQL injection in the grade search                       impossible: parameterized queries
└── 3. Corrupt the nightly import                                   [AND]
    ├── 3.1 Gain write access to the LMS export folder              possible
    └── 3.2 Import job accepts unsigned files                       possible today
```

Branch 2.1 needs no special skill, so it is fixed first with a server-side authorization check. Branch 3 is an AND node, so requiring signed exports (making 3.2 impossible) removes the whole branch. Branch 1 remains, which tells the team that phishing-resistant sign-in and session protections deserve attention next.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

**Check at every boundary crossing.** Authenticate the source, authorize the action, and validate the data with [[input-validation]]. Limit: validation catches malformed data, not data that is well formed but wrong, such as a plausible grade typed into the wrong row.

**Never treat location as identity.** "Inside the network" is not evidence. Require each request to prove who sent it, an idea developed in [FND-06](lesson:FND-06). Limit: strong authentication between services adds keys and certificates that must be managed.

**Keep the trusted part small.** Fewer trusted components mean fewer things that must be perfect. Give each process [[least-privilege]] access across its boundary, for example a database account for the import job that can write only grades. Limit: some trust, such as in the SSO service and the operating system, cannot be avoided.

**Log at the boundaries.** Records of who crossed, when, and what changed address repudiation and help investigations. Limit: logs must themselves be protected from tampering.

**Keep the model alive.** Revisit the diagram whenever a component, data flow, or partner changes, and review the threat model in design reviews. Limit: a model only finds threats someone imagines, and it drifts from reality if nobody updates it.

## Common misconceptions

- **"Threat modeling needs special tools or an expert."** A whiteboard and the four questions are enough to start. Tools help keep diagrams current.
- **"Trust boundaries are network boundaries."** They mark changes in owner, privilege, or assumption. A boundary can separate two processes on one machine.
- **"STRIDE is a complete list of threats."** It is a prompt. Harms such as misuse by fully authorized users can slip between its categories.
- **"Hidden fields and obscure URLs are safe because users cannot see them."** Users control everything their browser sends.
- **"Attack trees need precise numbers."** Even possible and impossible labels show which mitigation cuts the most paths.
- **"A threat model is finished at launch."** Systems change, and so must the model.

## Try it yourself

On paper, threat-model the fictional campus food-ordering service at order.college.example. Students order from a phone app that calls an API. The API stores orders in a database, charges cards through an outside payment processor at pay.example, and sends tickets to kitchen tablets on the dining hall's network.

1. Draw a data-flow diagram with numbered flows. Mark every trust boundary.
2. Write the trust assumption for each boundary crossing and decide whether it is justified. Rewrite the unjustified ones as requirements.
3. Apply STRIDE to the API and to the flow between the API and the kitchen tablets. Give one threat and one mitigation per category that applies.
4. Build an attack tree for the goal "get food without paying." Use at least one AND node, and label each leaf possible or impossible.
5. Find the single mitigation that makes the most leaves or branches impossible, and explain why.

## Key takeaways

- A threat model answers four questions: what are we working on, what can go wrong, what will we do about it, and did we do a good enough job.
- Trust boundaries mark where owners, privileges, or assumptions change, and every crossing needs a justified trust assumption.
- STRIDE turns "what can go wrong" into six questions, one per violated property, asked at each element of a data-flow diagram.
- Attack trees decompose a goal into AND and OR paths, showing which mitigation removes the most routes.
- Network location is never evidence of identity, and a threat model must change when the system does.

## Go deeper

- Schneier's original article ([Schneier, 1999](https://www.schneier.com/academic/archives/1999/12/attack_trees.html)) shows how labels such as cost and special equipment combine in a tree, and how changing one leaf changes the cheapest attack.
- The [OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html) compares modeling approaches and response options. Open question: how can a threat model stay in sync with code that changes every day, and can parts of it be checked automatically?
