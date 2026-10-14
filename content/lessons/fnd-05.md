---
topicId: FND-05
title: Secure design principles
summary: Learn Saltzer and Schroeder's design principles and modern secure-by-design guidance, and practice applying least privilege, fail-safe behavior, and separation of duties to a real feature.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - State Saltzer and Schroeder's eight design principles and give a modern example of each.
  - Identify violations of least privilege, fail-safe defaults, complete mediation, and separation of duties in a design.
  - Rewrite fail-open code so that it fails closed and reports the failure.
  - Explain secure by design and secure by default, and the trade-offs that arise when principles conflict.
prerequisites: [FND-01, FND-03]
concepts:
  - least-privilege
  - fail-safe-defaults
  - complete-mediation
  - economy-of-mechanism
  - open-design
  - separation-of-duties
  - least-common-mechanism
  - psychological-acceptability
  - kerckhoffs-principle
  - secure-by-design
keywords:
  - Saltzer and Schroeder
  - design principles
  - principle of least privilege
  - PoLP
  - fail-safe defaults
  - fail closed
  - fail open
  - default deny
  - complete mediation
  - reference monitor
  - open design
  - separation of privilege
  - separation of duties
  - two-person rule
  - least common mechanism
  - psychological acceptability
  - Kerckhoffs's principle
  - Shannon's maxim
  - secure by design
  - secure by default
  - work factor
  - compromise recording
sources:
  - title: 'The Protection of Information in Computer Systems (Jerome H. Saltzer and Michael D. Schroeder, 1975)'
    url: https://web.mit.edu/Saltzer/www/publications/protection/
    publisher: Massachusetts Institute of Technology (J. H. Saltzer's web copy)
    license: Copyright 1975 J. H. Saltzer
  - title: 'Secure by Design'
    url: https://www.cisa.gov/securebydesign
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 5: Introduction to Cryptography'
    url: https://textbook.cs161.org/crypto/intro.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: An authorization call times out, and the code's exception handler returns "allowed" so that customers are not kept waiting. Which principle does this violate most directly?
    choices:
      - Open design
      - Least common mechanism
      - Fail-safe defaults
      - Economy of mechanism
    answer: 2
    explanation: Fail-safe defaults base access on explicit permission, so a failure should leave the system in the safe state, which for access control means denied. Here a failure grants access. The fix is to deny, queue the request, and alert someone.
  - question: The "Approve refund" button is hidden from support agents, but the API endpoint behind it never checks the caller's role. Which principle is violated?
    choices:
      - Complete mediation, because the server does not check authority on every access.
      - Psychological acceptability, because hidden buttons confuse users.
      - Separation of privilege, because only one key is needed.
      - Open design, because the button's existence is a secret.
    answer: 0
    explanation: Complete mediation requires that every access to every object be checked for authority. Hiding a button changes the interface, not the rules. Anyone who sends the request directly bypasses the hidden control, so the check must happen on the server for every request.
  - question: A company encrypts payroll files with an algorithm it invented and keeps the algorithm secret. What does Kerckhoffs's principle say about this?
    choices:
      - It is good practice, because attackers cannot attack what they cannot see.
      - The system should stay secure even if attackers learn everything except the key, so security must not depend on the algorithm staying secret.
      - It is acceptable as long as the key is also kept secret.
      - It only matters for military systems.
    answer: 1
    explanation: Designs leak through reverse engineering, former employees, and stolen code, and a secret design cannot be reviewed by outside experts. Keys can be changed when exposed; designs cannot. Use a well-studied public algorithm and protect the key.
  - question: A bank requires two people to approve any transfer over $10,000, but approvals often take two days. What risk does this create?
    choices:
      - None, because separation of duties always improves security.
      - The bank violates least privilege by requiring two people.
      - The second approver now has too little privilege to do the job.
      - Staff may work around the delay, for example by sharing an approver's login, which defeats both separation of duties and accountability.
    answer: 3
    explanation: Psychological acceptability matters. A control that is too slow or painful invites workarounds that leave the system weaker than a lighter control people actually follow. Make the second approval fast, for example with a queue and notifications.
  - question: What does it mean for a product to be secure by default, in CISA's description?
    choices:
      - It is secure to use out of the box, with little to no configuration changes.
      - It ships with every security feature turned off, so customers can choose.
      - It has passed a government certification.
      - Its source code is published so anyone can review it.
    answer: 0
    explanation: Secure by default puts the work on the manufacturer instead of the customer. Settings such as multi-factor authentication should be on from the start, rather than left for each customer to discover and configure.
---

## Why it matters

Bugs are fixed one at a time. Design principles prevent whole families of them, or limit the damage when one slips through. A single error handler that grants access when something breaks can turn an outage into a breach. A single service account with administrator rights can turn a small bug into a total compromise. Neither mistake is a typo; both are design decisions, and both are avoidable.

The principles in this lesson are old and still current. Jerome Saltzer and Michael Schroeder published them in 1975 in "The Protection of Information in Computer Systems" ([Saltzer and Schroeder](https://web.mit.edu/Saltzer/www/publications/protection/)). Today, the U.S. Cybersecurity and Infrastructure Security Agency (CISA) asks technology makers to build products "where the security of the customers is a core business requirement" ([CISA](https://www.cisa.gov/securebydesign)). The vocabulary changed; the ideas did not.

## The core idea

A design principle is a rule of thumb that makes certain mistakes less likely or less harmful. Principles do not prove a system secure. Treat each one as a warning sign: a design that violates a principle deserves a closer look and a written reason.

The principles share one assumption: **parts of the system will fail**. Code has bugs, accounts get stolen, services go down, and people make mistakes. Good design keeps those failures small and safe.

Think of a hotel's key cards. Your card opens only your room and only during your stay (least privilege). A card the lock does not recognize opens nothing (fail-safe defaults). Every door checks every card, every time (complete mediation). The lock design is public, but each card's code is secret (open design). And the master key needs a manager and a security officer together (separation of privilege).

## How it works

### Saltzer and Schroeder's eight principles

Saltzer and Schroeder list eight principles in Section I.A.3 of their paper. The quotations below are their opening statements; the right-hand columns are modern illustrations.

| Principle                        | Their statement                                                   | Today                                        | A violation                                   |
| -------------------------------- | ----------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------- |
| [[economy-of-mechanism]]         | "Keep the design as simple and small as possible."                | One small, reviewed authorization module     | Permission checks scattered across 40 files   |
| [[fail-safe-defaults]]           | "Base access decisions on permission rather than exclusion."      | Default deny, allowlists                     | An error handler that returns "allowed"       |
| [[complete-mediation]]           | "Every access to every object must be checked for authority."     | Server-side checks on every request          | Checking roles only in the user interface     |
| [[open-design]]                  | "The design should not be secret."                                | Public algorithms, secret keys               | A homemade, secret cipher                     |
| Separation of privilege          | A mechanism needing two keys is more robust than one needing one  | Two-person approval, multi-factor sign-in    | One admin can move money alone                |
| [[least-privilege]]              | Every program and user should operate with the least privileges needed | Scoped tokens, per-service accounts     | A web app connected as the database superuser |
| [[least-common-mechanism]]       | Minimize mechanism "common to more than one user"                 | Per-tenant isolation                         | A shared temporary folder that leaks files    |
| [[psychological-acceptability]]  | The human interface should be "designed for ease of use"          | Password managers, passkeys, good defaults   | Rules so painful that people share passwords  |

The authors add two more principles from physical security that, in their words, "apply only imperfectly to computer systems": **work factor** (compare the cost of defeating a mechanism with an attacker's resources) and **compromise recording** (reliably record that a compromise happened, even if you cannot prevent it).

CS 161 restates several of these for modern systems ([CS 161, Chapter 1](https://textbook.cs161.org/principles/principles.html)). Least privilege means giving a program what it "legitimately needs to do its job—but nothing more." Complete mediation is usually implemented with a single reference monitor that cannot be bypassed. And the components that must be correct for security to hold, the trusted computing base, should be kept small, which is economy of mechanism in practice.

### Open design and Kerckhoffs's principle

[[kerckhoffs-principle|Kerckhoffs's principle]] is open design applied to cryptography: "Cryptosystems should remain secure even when the attacker knows all internal details of the system," so "the key should be the only thing that must be kept secret" ([CS 161, Chapter 5](https://textbook.cs161.org/crypto/intro.html)). Designs leak through reverse engineering, departing employees, and stolen code, and they cannot be changed quickly. Keys can.

### Separation of privilege and separation of duties

Saltzer and Schroeder's version is mechanical: require two keys, or two conditions, before acting. Organizations apply the same idea to people as [[separation-of-duties]]: no single person can complete a sensitive action alone. CS 161 illustrates it with a launch procedure that requires two officers acting together. In business, the person who requests a payment should not be the person who approves it.

### Failing safely

Every check can fail: a policy server times out, a configuration file is missing, a response is malformed. Fail-safe defaults answer the question "what happens then?" For access decisions, the safe answer is to deny. CS 161 uses default-deny firewalls as its example. Note that "safe" depends on the decision: an emergency exit door should unlock during a fire, because there life safety outweighs access control. Decide the safe state for each mechanism on purpose.

### Secure by design and secure by default

Modern guidance moves responsibility from customers to makers. CISA describes [[secure-by-design|secure-by-design]] products as those where customer security is "a core business requirement," and secure-by-default products as "secure to use out of the box, with little to no configuration changes." It gives multi-factor authentication as an example of a protection that should come built in, and it says every technology provider must take ownership of security at the executive level ([CISA](https://www.cisa.gov/securebydesign)).

## Worked example

The fictional retailer shop.example lets support agents issue refunds. The current design has three problems. The refund service connects to the database as its owner. If the policy service that checks permissions does not answer, the code approves the refund anyway. And any agent can refund any amount, including to an account they control. Fix it principle by principle.

**Step 1: least privilege.** Give the refund service its own database role that can do exactly one job.

```sql
-- Before: the service connects as the database owner and can read or change anything.
-- After: a dedicated role that can read orders and record refunds, nothing else.
CREATE ROLE refund_svc LOGIN;
GRANT SELECT ON orders TO refund_svc;
GRANT INSERT ON refunds TO refund_svc;
```

A bug in the refund code can now, at worst, insert refund rows. It cannot read passwords, drop tables, or change prices.

**Step 2: fail-safe defaults.** Here is the vulnerable pattern, which fails open:

```python
# Vulnerable: if the policy service is down or slow, every refund is approved.
def may_refund(agent, order, amount):
    try:
        return policy.check(agent, "refund", order, amount)
    except Exception:
        return True  # "don't keep customers waiting"
```

And the fix, which fails closed and makes the failure visible:

```python
# Fixed: permission must be explicit, and failure means "not now".
def may_refund(agent, order, amount):
    try:
        return policy.check(agent, "refund", order, amount) is True
    except PolicyUnavailable:
        log.warning("policy service unavailable; refund for order %s queued", order.id)
        return False  # deny for now; the request waits in a review queue
```

Two details matter. Comparing with `is True` means that an unexpected answer, such as `None` or an error object, does not count as permission. Catching only `PolicyUnavailable` means that a programming error is not silently converted into a decision.

**Step 3: separation of duties.** Refunds over $200 need a second person, and nobody approves their own request.

```python
def approve(refund, approver):
    if approver.id == refund.requested_by:
        raise PermissionError("requester cannot approve their own refund")
    if refund.amount > 200 and not approver.has_role("refund-approver"):
        raise PermissionError("refunds over $200 need a refund approver")
    refund.approved_by = approver.id  # recorded for accountability
```

**Step 4: complete mediation.** The checks above run on the server for every refund request, not only when the agent's screen shows a button. An agent who calls the API directly meets the same rules.

**Step 5: psychological acceptability.** If second approvals take two days, agents will be tempted to share an approver's login, which defeats both separation of duties and accountability. The team adds an approval queue with notifications, so most approvals take minutes.

| Principle               | Before                                 | After                                        |
| ----------------------- | -------------------------------------- | -------------------------------------------- |
| Least privilege         | Service connects as the database owner | `refund_svc` can only read orders and insert refunds |
| Fail-safe defaults      | Timeout approves the refund            | Timeout denies, queues, and logs              |
| Separation of duties    | One agent requests and approves        | Over $200 needs a different approver          |
| Complete mediation      | Rules enforced in the user interface   | Rules enforced on every server request        |
| Psychological acceptability | Slow approvals invite workarounds  | Fast queue with notifications                 |

## In practice

**Principles conflict, so decide explicitly.** Least privilege can collide with psychological acceptability: too many permission prompts teach people to click "yes" without reading. Fail-safe defaults can collide with availability, as the refund queue shows. Economy of mechanism pulls against adding more layers of defense. Write down which principle won and why.

**Use the principles in design reviews.** For each feature, ask: What privileges does each component hold, and could they be smaller? What happens when each check fails? Is every access checked on the server? Can one person, or one stolen account, complete a sensitive action alone?

**Watch for privilege creep.** Permissions are easy to grant and rarely taken away. Review accounts and service roles regularly and remove what is unused, a practice that connects to [[deprovisioning]].

**Ship safe defaults.** Following CISA's secure-by-default idea, make the safe configuration the one a customer gets without doing anything. A setting that is secure only after reading a manual is, for most customers, not secure.

## Common misconceptions

- **"Least privilege is about user accounts."** It applies equally to services, API tokens, containers, build pipelines, and scripts.
- **"Open design means you must publish your source code."** It means security must not depend on the design staying secret. Publishing is optional; the keys must stay secret either way.
- **"Fail-safe means the service stays up."** It means failing into the safe state. For access control that is usually deny, even if users are inconvenienced.
- **"Checking permission at login is complete mediation."** Permissions change, and one check at login cannot catch a revoked role or a request for a different object. Check every access.
- **"Separation of duties is just bureaucracy."** It stops a single insider or a single stolen account from completing fraud alone, provided the process is fast enough that people do not route around it.
- **"Following the principles makes a system secure."** They reduce whole classes of failure, but they do not replace threat modeling and testing.

## Try it yourself

On paper, review this fictional design for a payroll export at bank.example. For each statement, name the principle it violates, propose a fix, and note any trade-off your fix creates.

1. The payroll service uses one cloud credential with full administrator rights "to keep deployment simple."
2. If the employee directory lookup fails, the export includes every employee "so nobody goes unpaid."
3. The same payroll clerk can add a new employee and approve that employee's first payment.
4. The "Approve" button is hidden for clerks, but the API behind it does not check roles.
5. Payroll files are encrypted with an in-house algorithm whose details are kept secret.
6. Approvers must type a 30-character password for each of the roughly 200 items they approve every day.

Then choose one statement where two principles pull in different directions, and explain which you would favor and why.

Check your mapping: (1) least privilege, (2) fail-safe defaults, (3) separation of duties, (4) complete mediation, (5) open design and Kerckhoffs's principle, (6) psychological acceptability.

## Key takeaways

- Saltzer and Schroeder's eight principles from 1975 still describe how to keep failures small: simple mechanisms, default deny, check every access, no secret designs, two keys, least privilege, little shared mechanism, and usable protection.
- Fail-safe code denies when a check fails, treats only an explicit "yes" as permission, and makes the failure visible.
- Separation of duties keeps any single person or stolen account from completing a sensitive action alone.
- Secure by design and secure by default move responsibility from customers to the makers of a product.
- Principles conflict; good designs record which one won and why.

## Go deeper

- Read Section I.A.3 of [Saltzer and Schroeder](https://web.mit.edu/Saltzer/www/publications/protection/), then the rest of the paper, which compares list-based and ticket-based (capability) protection, an argument that still shapes operating systems and cloud permissions.
- CISA's [Secure by Design](https://www.cisa.gov/securebydesign) materials describe what manufacturers should change in their development and defaults. Open question: how can a team measure whether a system actually follows least privilege, for example by comparing granted permissions with the permissions that are really used?
