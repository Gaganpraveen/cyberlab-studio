---
topicId: RES-06
title: Secure-system design capstone
summary: A capstone guide for designing, prototyping and defending the security architecture of a fictional system, with a project brief, milestones, deliverables, an assessment rubric, a worked sample, and project ideas built on CyberLab's labs.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Scope a fictional system by naming its assets, stakeholders, trust boundaries and the attackers it must resist.
  - Derive prioritized security requirements from a threat model and trace each one to a design decision.
  - Justify each security control against at least one alternative, including its cost and its failure modes.
  - Build an assurance case that links each top-level security claim to evidence and to the assumptions it rests on.
  - Defend the design in a review by answering attacker-minded questions and stating residual risk honestly.
prerequisites: [FND-03, FND-05, FND-06, RES-02, RES-05]
concepts: [assurance-case, threat-model, residual-risk]
labs: []
keywords:
  - capstone
  - security architecture
  - design review
  - threat modeling
  - data-flow diagram
  - security requirements
  - assurance case
  - claims, arguments and evidence
  - design rationale
  - architecture decision record
  - residual risk
  - OWASP ASVS
  - NIST SP 800-160
  - systems security engineering
sources:
  - title: 'NIST SP 800-160 Vol. 1 Rev. 1: Engineering Trustworthy Secure Systems'
    url: https://csrc.nist.gov/pubs/sp/800/160/v1/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'Security Engineering: A Guide to Building Dependable Distributed Systems, 3rd ed. (Ch. 27 Secure Systems Development; Ch. 28 Assurance and Sustainability)'
    url: https://www.cl.cam.ac.uk/archive/rja14/book.html
    publisher: Ross Anderson (author's site; Wiley)
    license: All rights reserved
    sourceId: anderson-security-engineering
  - title: OWASP Application Security Verification Standard (ASVS)
    url: https://owasp.org/www-project-application-security-verification-standard/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-asvs
  - title: Artifact Review and Badging, Version 1.1
    url: https://www.acm.org/publications/policies/artifact-review-and-badging-current
    publisher: Association for Computing Machinery (ACM)
  - title: The TLA+ Home Page
    url: https://lamport.org/tla/tla.html
    publisher: Leslie Lamport
quiz:
  - question: A team's design document lists "use TLS everywhere" and "hash passwords" but never says which threats these controls address. What is the most important missing piece?
    choices:
      - A longer list of controls.
      - A traceable link from each threat to the requirement it creates and the control that meets it, with a reason for the choice.
      - Vendor names for each control.
      - A larger prototype.
    answer: 1
    explanation: A list of good practices is not a design argument. Reviewers need to see which threat each control answers, what alternatives were considered, and what remains if the control fails. That traceability is also what makes the assurance case possible.
  - question: In an assurance case, a claim reads "Only a student can change their own registration." Which item is evidence for it, rather than another claim?
    choices:
      - "The API enforces object-level authorization."
      - "Sessions are protected."
      - A test suite in which bob's valid session tries to change alice's registration and receives 403, run on every build.
      - "We follow least privilege."
    answer: 2
    explanation: Claims say what is true; evidence shows it. A repeatable test with named accounts and an expected result is evidence. The other options are sub-claims or principles that still need their own evidence.
  - question: During the design defense, a reviewer asks what happens if the token-signing key leaks. Which answer is strongest?
    choices:
      - It cannot leak, because it is stored on the server.
      - We would notice eventually.
      - Signing keys are outside the scope of a student project.
      - Tokens expire in 15 minutes, keys rotate monthly and can be revoked at once, and verifiers reject unknown key ids; a leak still allows forgery until rotation, which we accept and monitor.
    answer: 3
    explanation: A strong answer limits the damage, explains detection and recovery, and states the residual risk plainly. Claiming a failure cannot happen, or waving it out of scope, is what a design review is meant to catch.
  - question: Why does the brief require at least one alternative for each major control?
    choices:
      - Comparing alternatives shows the choice was reasoned, exposes trade-offs such as cost and usability, and tells future maintainers when to revisit it.
      - Reviewers grade by the number of controls.
      - The alternative must also be implemented.
      - Alternatives are required by law.
    answer: 0
    explanation: A decision record that names what was rejected and why lets a reader judge the trade-off and notice when its assumptions change. It is design rationale, not extra implementation work.
---

## Why it matters

Security failures in real systems are often design failures: a trust boundary nobody drew, an assumption nobody wrote down, or a control that protects the wrong thing. Finding these late is expensive, which is why NIST SP 800-160 treats security as an engineering discipline that runs through a system's whole life cycle, and describes the confidence you can place in a system as resting on claims-driven, evidence-based arguments. Ross Anderson's *Security Engineering* gives the same topics, secure systems development and assurance, their own chapters.

A design capstone gives you practice in exactly that work. You will design a fictional system, build its security-critical path, and then defend it in front of reviewers who are trying to break it. The skill being assessed is not knowing the most controls. It is making a case: here is what we protect, from whom, how, how we know it works, and what is left over.

## The core idea

Treat the design as an argument with three layers:

1. **What could go wrong.** A [[threat-model|threat model]] names the assets, the attackers and their capabilities, the entry points and the trust boundaries, which are the places where data or control passes between parts that trust each other differently.
2. **What the design does about it.** Each important threat produces a requirement, and each requirement is met by a design decision with a stated reason and at least one rejected alternative.
3. **Why we believe it works.** An [[assurance-case|assurance case]] links each top-level security claim to sub-claims, then to evidence such as tests, analyses, reviews or proofs, and lists the assumptions each link depends on.

Building inspections are a fair analogy. An inspector does not accept "the wiring is safe"; they want the plan, the code requirement each part meets, and the test results, plus a note of anything not inspected. Your design review works the same way.

Assume from the start that some controls will fail. The parts of the design that limit the damage of a failure, and the [[residual-risk|residual risk]] you accept on purpose, are as much a part of the argument as the controls themselves.

## How it works

### The project brief

Design, prototype and defend the security architecture of a fictional system, working alone or in teams of two to four. Your design must:

- Use only fictional names, such as `campus.test`, `shop.example` or `bank.example`, fictional users such as alice, bob and mallory, and documentation addresses such as `192.0.2.0/24`.
- Run entirely on your own machine, in containers you control, or in CyberLab's labs. Use no real personal data.
- Include a working prototype of the **security-critical path**, the few flows whose failure would matter most, rather than a complete product.
- Produce evidence for every top-level security claim, and state the assumptions behind it.

> [!ETHICS] Only test systems you own or have written permission to test.

### Milestones

| Week | Milestone                     | Due                                                                        | Feedback                    |
| ---- | ----------------------------- | -------------------------------------------------------------------------- | --------------------------- |
| 1-2  | M1 Proposal                   | One page: system, users, assets, stakeholders, scope and non-goals         | Instructor approves scope   |
| 3-4  | M2 Threat model               | Data-flow diagram with trust boundaries, threats, prioritized requirements | Peer review by another team |
| 5-6  | M3 Architecture review        | Components, key flows as sequence diagrams, controls with alternatives     | Design review meeting       |
| 7-8  | M4 Prototype and evidence     | Critical path built; tests, lab checks, optional formal model              | Instructor check-in         |
| 9-10 | M5 Assurance case and defense | Final report, assurance case, artifact package, live defense               | Graded with the rubric      |

### Deliverables

- **Design document** (8 to 12 pages): system overview, assets, threat model, requirements, architecture, decisions with alternatives, and residual risks. The OWASP Application Security Verification Standard (ASVS) is a good source of concrete, testable requirements for web systems.
- **Diagrams:** a data-flow diagram with trust boundaries, and a sequence diagram for each security-critical flow.
- **Decision records:** one short entry per major decision, giving the context, the options considered, the choice and its consequences.
- **Assurance case:** the top three to five claims, each traced to sub-claims, evidence and assumptions.
- **Prototype and artifact package:** code, tests and a README that lets someone else rerun your evidence, following the [reproducibility and artifact packaging](lesson:RES-03) lesson. Aim for what ACM's badging policy calls functional: documented, consistent with the report, complete and exercisable.
- **Defense:** a 15-minute presentation, 15 minutes of questions, and a written response to the review comments within a week.

### Assessment rubric

| Criterion (weight)                      | Excellent                                                                                       | Adequate                                                | Insufficient                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------- |
| Threat model and assumptions (20%)      | Assets, attackers, capabilities and trust boundaries explicit; assumptions listed and justified | Main threats identified; some assumptions implicit      | Generic threat list not tied to this system    |
| Requirements and design rationale (20%) | Every major control traced to a threat, with alternatives and trade-offs                        | Most controls traced; few alternatives                  | Controls listed without reasons                |
| Evidence and assurance case (25%)       | Each top claim backed by repeatable evidence; gaps and assumptions stated                       | Evidence for most claims; some claims rest on assertion | Claims without evidence                        |
| Prototype and artifact quality (15%)    | Critical path works; tests and evidence rerun from the README                                   | Works with help; partial instructions                   | Does not run, or evidence cannot be reproduced |
| Residual risk and limitations (10%)     | Failure modes, detection, recovery and accepted risks stated precisely                          | Some limitations named                                  | Claims the design has no weaknesses            |
| Communication and defense (10%)         | Clear document and talk; answers reviewers with evidence; revises the design when warranted     | Clear, but some answers vague                           | Unclear; defensive or evasive answers          |

## Worked example

This abridged sample shows what a strong submission looks like for a fictional course-registration portal at `campus.test`. Students sign in, add and drop sections, and see their schedules; registrars manage sections.

**Scope and assets.** Assets: registration records, student accounts, the registrar's administrative functions, and section capacity, since a full section is a real cost to students who get shut out. Non-goals: payments and grades, which live in other systems. Attackers: an outside attacker with no account; a student such as mallory who has a valid account and wants a seat or another student's information; and a stolen-session attacker who holds a valid token.

**Threats and decisions (excerpt).**

| Threat                                  | Requirement                                           | Decision (alternative rejected)                                                                        |
| --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Injection through the search box        | No user input can change query structure              | [[parameterized-query]] for every query (rejected: input filtering, which cannot be shown complete)    |
| Offline cracking after a database leak  | Stolen password data must be slow to attack           | Salted, slow password hashing (rejected: a fast hash such as SHA-256, which is cheap to guess against) |
| mallory edits bob's registration        | Every change is authorized against the record's owner | Object-level check in the API layer (rejected: hiding record ids in the user interface)                |
| Stolen or forged session token          | Tokens are short-lived, verifiable and revocable      | Signed tokens, 15-minute expiry, key ids, refresh with rotation (rejected: long-lived tokens)          |
| Bots grab seats when registration opens | Fair access under load                                | Per-account rate limits and a queue (rejected: CAPTCHA alone, which hurts accessibility)               |

**Critical flow.** The sequence diagram shows sign-in followed by an add-section request, with the checks the design relies on:

```sequence
title: Adding a section at campus.test
participant B as Alice's browser
participant A as Auth service
participant R as Registration API
participant D as Database
B -> A: POST /login (alice, password)
A --> B: Signed session token (expires in 15 min)
B -> R: POST /sections/CS101-02/enroll + token
note R: Verify signature, key id, expiry
R -> D: Parameterized insert for alice only
D --> R: Seat reserved
R --> B: 200 OK, enrolled
B -x R: Same call with bob's id: 403 Forbidden
```

**Assurance case (one claim, abridged).**

- **C1:** A student can change only their own registration.
  - **C1.1:** Every request is authenticated with a valid, unexpired token. *Evidence:* verifier unit tests for wrong signature, expired token, unknown key id and an unsigned token; the token checks from the [JWT lab](lab:jwt) rerun against the prototype's verifier. *Assumption:* the signing key is stored only in the auth service.
  - **C1.2:** Every change is checked against the record's owner. *Evidence:* an integration test in which bob's valid session tries to change alice's record and receives 403, run on every build; a code review of all write endpoints. *Assumption:* no endpoint bypasses the API layer.
  - **C1.3:** No input can alter query structure. *Evidence:* all queries use parameters, confirmed by a code search for string-built SQL; the login test inputs from the [SQL injection lab](lab:sql-injection) all fail against the prototype. *Assumption:* no code path, including stored procedures and reporting scripts, builds SQL from strings.

**Defense question and answer.** *"What if the signing key leaks?"* "Tokens expire in 15 minutes and keys rotate monthly. Verifiers reject unknown key ids, so revoking a key ends all its tokens at once. Until we notice and rotate, an attacker can forge tokens; we accept that risk, alert on token use from unusual networks, and list it as residual risk R3."

## In practice

- **Scope ruthlessly.** A small system defended well beats a large one defended vaguely. Build the critical path first; everything else can be a stub.
- **Hold real design reviews.** At M3, another team reads your design for a week and arrives with written questions. Rotate the attacker role so everyone practices both sides of the review.
- **Write decisions down when you make them.** A short decision record written in week 5 is far more credible than rationale reconstructed in week 10.
- **Use the labs as test harnesses.** CyberLab's labs give safe, fictional test inputs. Rerunning a lab's checks against your own prototype is evidence; claiming "we did the lab" is not.
- **Consider a formal model for one tricky flow.** If your design has a concurrency-sensitive step, such as seat reservation or token refresh, a small model in TLA+ or in the Python checker from the [formal modeling](lesson:RES-05) lesson makes strong evidence.
- **Plan for failure.** For each critical control, say how you would detect its failure and recover.

## Common misconceptions

- **"More controls make a better design."** Controls that answer no stated threat add cost and complexity. Reviewers reward traceability, not volume.
- **"A diagram is the architecture."** A diagram without trust boundaries, data classifications and the reasons behind each boundary is decoration.
- **"Passing the lab means the system is secure."** A lab check is evidence for one claim under one set of inputs. The assurance case shows what else is needed.
- **"Admitting residual risk loses points."** The rubric rewards precise statements of what remains. A design that claims no weaknesses fails that criterion.
- **"The defense is about winning arguments."** It is about evidence. When a reviewer finds a real gap, the strongest response is to acknowledge it and show how the design changes.

## Try it yourself

Choose one of these project ideas, or propose your own fictional system, and complete milestone M1: a one-page proposal naming the users, assets, stakeholders, attackers, scope and non-goals.

1. **Course registration at `campus.test`.** Accounts, sessions and object-level authorization. Use the [SQL injection lab](lab:sql-injection), the [password cracking lab](lab:password-cracking) and the [JWT lab](lab:jwt) as evidence harnesses.
2. **Product reviews at `shop.example`.** User-generated content shown to other users, so output encoding, a Content Security Policy and safe rich text. Use [the lab](lab:xss) for cross-site scripting checks.
3. **A link-safety service for `bank.example` employee mail.** Flags look-alike domains before users click. Use the [homograph lab](lab:homograph) dataset as a starting point for tests, and plan a larger, independently labeled test set.
4. **A public status API at `status.example`.** Stays available for real users during floods of automated requests, using rate limits, caching and graceful degradation. Use the [DDoS simulator lab](lab:ddos) to explore rate-limit settings.
5. **A token service for `campus.test` microservices.** Issues and verifies tokens, rotates keys and revokes sessions. Use the [JWT lab](lab:jwt), and model token refresh as a state machine.
6. **(Graduate) A password-reset service with a verified core.** Build the reset flow and check its token lifecycle with a model checker, including expiry and concurrent requests.

For your proposal, also list the two flows you expect to be security-critical and the one assumption you are least sure about.

## Key takeaways

- A secure design is an argument: threats lead to requirements, requirements to reasoned decisions, and decisions to evidence.
- Build and prove the security-critical path first; stubs are fine elsewhere.
- An assurance case makes gaps visible by tying each claim to evidence and stated assumptions.
- Residual risk, failure detection and recovery belong in the design, and stating them precisely is a strength.

## Go deeper

- NIST's systems security engineering guidance, including its principles for trustworthy secure design: [SP 800-160 Vol. 1 Rev. 1](https://csrc.nist.gov/pubs/sp/800/160/v1/r1/final) (2022).
- Anderson's chapters on secure systems development and on assurance discuss why projects fail and how evidence is built: [Security Engineering](https://www.cl.cam.ac.uk/archive/rja14/book.html), 3rd ed.
- The [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) turns broad goals into specific, testable requirements, which makes it useful when writing M2.
- Open question: assurance cases are persuasive documents written by the people who built the system. How should reviewers check an assurance case for the evidence that is missing rather than the evidence that is present?
