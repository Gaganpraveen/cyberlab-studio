---
topicId: FND-01
title: Security goals and properties
summary: Learn the properties security tries to protect, from the classic CIA triad to authenticity, accountability, non-repudiation, and assurance, and how to state a requirement precisely.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 22
objectives:
  - Define confidentiality, integrity, and availability and give an example of losing each.
  - Explain how authenticity, non-repudiation, and accountability extend the CIA triad.
  - Write a precise security requirement that names the property, the asset, and the impact of a loss.
  - Describe what assurance means and why a security claim needs evidence.
prerequisites: []
concepts: [cia-triad, confidentiality, integrity, availability, authenticity, non-repudiation, accountability, assurance]
labs: []
sources:
  - title: FIPS 199, Standards for Security Categorization of Federal Information and Information Systems
    url: https://csrc.nist.gov/pubs/fips/199/final
    publisher: NIST
  - title: NIST Computer Security Resource Center Glossary, Non-repudiation
    url: https://csrc.nist.gov/glossary/term/non_repudiation
    publisher: NIST
  - title: NIST Computer Security Resource Center Glossary, Assurance
    url: https://csrc.nist.gov/glossary/term/assurance
    publisher: NIST
  - title: Saltzer and Schroeder, The Protection of Information in Computer Systems (Basic Principles)
    url: https://web.mit.edu/Saltzer/www/publications/protection/Basic.html
    publisher: Proceedings of the IEEE
  - title: UC Berkeley CS 161 Textbook, Security Principles
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley
quiz:
  - question: A university posts its public course catalog on a web server. The catalog is meant for everyone, but students rely on it being correct and reachable during registration. Which properties matter most here?
    choices:
      - Confidentiality and non-repudiation
      - Integrity and availability
      - Confidentiality only
      - None, because the data is public
    answer: 1
    explanation: Public data has little confidentiality need, but it must be accurate (integrity) and reachable when students register (availability). FIPS 199 uses exactly this kind of reasoning when it rates public web content.
  - question: What does non-repudiation provide that authentication alone does not?
    choices:
      - It encrypts the message so outsiders cannot read it.
      - It proves the message arrived on time.
      - It produces evidence a party cannot credibly deny later.
      - It guarantees the server stays online.
    answer: 2
    explanation: Authentication checks who you are now; non-repudiation leaves durable evidence of an action so the actor cannot plausibly disclaim it afterward.
  - question: A system uses the "high-water mark" rule from FIPS 199 for a database holding both public notices (low impact) and exam answer keys (high confidentiality impact). What is the system's confidentiality rating?
    choices:
      - Low, because most of the data is public
      - The average of the two
      - High, because that is the highest value among the data types
      - It cannot be rated
    answer: 2
    explanation: The high-water mark takes the highest impact value across all information types in the system, so one high-confidentiality data type raises the system's confidentiality rating to high.
  - question: Which statement best describes assurance?
    choices:
      - A promise from a vendor that software is secure
      - Grounds for justified confidence, backed by evidence, that a security claim holds
      - The same thing as availability
      - A legal guarantee against all attacks
    answer: 1
    explanation: Assurance is justified confidence built from credible evidence (tests, analysis, review), not a marketing promise or a guarantee. A claim without evidence is not assurance.
  - question: Why is the CIA triad described as a starting point rather than a complete checklist?
    choices:
      - Because confidentiality is obsolete
      - Because many real requirements also need authenticity, accountability, and non-repudiation
      - Because availability is only about hardware
      - Because integrity and availability mean the same thing
    answer: 1
    explanation: The triad captures three core goals, but real systems routinely need to verify origins (authenticity), trace actions (accountability), and prevent denial of actions (non-repudiation).
---

## Why it matters

Before you can defend a system, you have to say what "secure" means for it. That sounds obvious, yet most confused security arguments come from skipping this step. Someone says a design is "secure" without saying secure *against what* or *for whom*. A precise goal turns a vague worry into something you can design for, test, and measure.

Security goals also force trade-offs into the open. Locking a system down can make it unusable; keeping it always available can make it easy to tamper with. When you name the exact property you care about for a specific asset, you can reason about which controls are worth their cost and which protections you are quietly giving up.

This vocabulary runs through every other topic in this course. When you study a [homograph attack](lesson:WEB-01), you are watching an attack on *authenticity*: a site that is not what it appears to be. When you study [SQL injection](lesson:APP-01), you are watching attacks on confidentiality and integrity at once. Learning the properties first gives you a stable set of words for the rest of the labs.

> [!NOTE]
> This lesson is about defining goals, not attacking anything. It has no lab. The later web and application lessons put these goals to work against contained, in-browser targets.

## The core idea

The oldest and most useful model is the [[cia-triad|CIA triad]]: [[confidentiality]], [[integrity]], and [[availability]]. Think of a paper exam locked in a professor's office.

- **Confidentiality** is keeping the answer key secret. A loss of confidentiality is an unauthorized *disclosure*: someone reads what they should not.
- **Integrity** is making sure nobody changes the grades after they are recorded. A loss of integrity is an unauthorized *modification* or destruction: a value is altered, perhaps without anyone noticing.
- **Availability** is being able to get the records when the registrar needs them. A loss of availability is a *disruption*: the data or system is not reachable or usable in time.

These three map cleanly onto a classic observation by Jerome Saltzer and Michael Schroeder in their 1975 paper on information protection. They grouped security violations into three kinds: unauthorized information *release*, unauthorized information *modification*, and unauthorized *denial of use*. Those are confidentiality, integrity, and availability described from the attacker's side.

The triad is a starting point, not a finish line. Three more properties show up constantly:

- **[[authenticity]]** is the property of being genuine and verifiable. When your browser shows a bank's real site rather than a look-alike, that is authenticity. It depends on [[authentication]], the act of checking a claimed identity.
- **[[non-repudiation]]** means an actor cannot credibly deny a genuine action later. If you digitally sign a contract, you should not be able to claim afterward that you never signed it.
- **[[accountability]]** means actions can be traced uniquely to the entity that took them, which is what makes audit logs and after-the-fact investigation possible.

## How it works

The most widely used way to write these goals down comes from the U.S. government standard FIPS 199. It defines the three objectives almost exactly as above, citing federal law. Confidentiality is "preserving authorized restrictions on information access and disclosure." Integrity is "guarding against improper information modification or destruction," and it explicitly "includes ensuring information non-repudiation and authenticity." Availability is "ensuring timely and reliable access to and use of information."

Notice that FIPS 199 folds authenticity and non-repudiation *into* integrity. That is a modeling choice, not a law of nature. Other frameworks list them separately because it is often clearer to reason about "is this message genuine?" apart from "has this stored record been altered?" Both views are defensible. What matters is that you decide which properties a particular asset needs and say so.

FIPS 199 then adds a second dimension: how bad would a loss be? It defines three impact levels by the adverse effect a loss would have on operations, assets, or individuals:

- **Low** = a *limited* adverse effect.
- **Moderate** = a *serious* adverse effect.
- **High** = a *severe or catastrophic* adverse effect.

Combining a property with an impact level gives a compact requirement. FIPS 199 writes the security category (SC) of an information type as a triple:

```text
SC information type = {(confidentiality, impact),
                       (integrity, impact),
                       (availability, impact)}
```

Its own example for public information on a web server is:

```text
SC public information = {(confidentiality, NA),
                         (integrity, MODERATE),
                         (availability, MODERATE)}
```

Confidentiality is "not applicable" because the data is meant to be public, while integrity and availability still matter. This is a concrete, teachable way to say "secure": name each property and the cost of losing it.

When one system holds several kinds of information, FIPS 199 uses a **high-water mark**: the system takes "the highest values (i.e., high water mark) from among those security categories" of the data types it holds. A single high-confidentiality data type raises the whole system's confidentiality rating. That is a conservative rule, and it is one reason mixing sensitive and public data in one place has consequences.

## Worked example

Suppose a fictional campus service at `grades.campus.test` stores exam scores. Walk through each property as a requirement, not a slogan.

**Confidentiality.** Only the enrolled student and authorized staff may read a score. A loss would be a classmate reading someone else's grade. On the FIPS 199 scale this is at least moderate, because disclosure seriously affects an individual. The control that enforces it is [[authorization]]: the server must check *who is asking* before it answers. Related storage protections, such as [[encryption]] of the database, reduce what an attacker gains if they get the raw files.

**Integrity.** A score, once recorded, must not change except through an authorized path. A loss would be a student editing their own grade. Integrity controls include access control and tamper-evidence such as a [[hash-function|cryptographic hash]] or audit trail that would reveal a change. Here authenticity matters too: the server must be sure an "update grade" request genuinely came from an instructor, not from a forged request.

**Availability.** During the one-week grade-appeal window, the service must respond. A loss would be the site going down for that week. The impact might be moderate: serious inconvenience and missed deadlines, but not catastrophic. Controls include capacity planning and backups.

**Accountability and non-repudiation.** Every grade change should be attributable to a named staff account and logged, so a disputed change can be traced ([[accountability]]). If the system requires instructors to sign each change, an instructor cannot later deny having made one ([[non-repudiation]]).

Written out, the requirement for the grade record might read: confidentiality moderate, integrity high, availability moderate, with per-change accountability. That single line tells a designer what to build and a reviewer what to check, and it will differ from the requirement for the public catalog at `campus.test`, which needs almost no confidentiality but still needs integrity and availability.

## Defenses

Each property is upheld by different controls, and each control has limits. Stating the goal is only half the job; the other half is honest about how far a control actually gets you.

- **Confidentiality** is served by access control and [[encryption]]. The limit: encryption protects data at rest or in transit, but once an authorized program decrypts it, a flaw in that program can still leak it. Encryption does not fix a broken [[authorization]] check.
- **Integrity** is served by access control, input handling, and hashes or signatures that make tampering detectable. The limit: a hash tells you *that* something changed, not *who* changed it or whether the change was legitimate.
- **Availability** is served by redundancy, capacity, backups, and rate limiting. The limit: you cannot make availability infinite, and some defenses for confidentiality (locking everything down) work against it.
- **Authenticity and non-repudiation** are served by authentication and digital signatures. The limit: a signature only means as much as the key management behind it. If a private key is stolen, the signatures it produces are still cryptographically valid.

This is where **[[assurance]]** enters. Assurance is "grounds for justified confidence that a [security or privacy] claim has been or will be achieved." It is the difference between saying "this is secure" and showing evidence: tests, code review, analysis, and documented reasoning. A claim with no evidence behind it is not a weak form of assurance; it is simply a claim. Much of professional security work is really about producing enough evidence to justify confidence, and about being clear when that evidence is thin.

A related idea from Saltzer and Schroeder, and echoed in the [UC Berkeley CS 161 principles](lesson:FND-07), is to prefer **[[least-privilege|least privilege]]** and layered defenses: assume any one control can fail, and arrange things so a single failure does limited damage. We return to that idea throughout the course.

## Common misconceptions

- **"Secure means confidential."** Confidentiality is one goal of several. A ransomware incident that scrambles files you can still read is an integrity and availability disaster with no confidentiality loss at all.
- **"The CIA triad is the whole story."** It is a useful core, but authenticity, accountability, and non-repudiation are first-class goals in most real systems. Treat the triad as the floor, not the ceiling.
- **"Authentication and authorization are the same."** Authentication asks *who are you?*; authorization asks *what are you allowed to do?* A system can authenticate you correctly and still authorize you incorrectly. See [Authentication versus authorization](lesson:IAM-01).
- **"Integrity means the data is true."** Integrity means the data has not been altered through an unauthorized path since it was recorded. A correctly recorded but factually wrong value still has integrity in the security sense.
- **"Encryption guarantees integrity."** Not by itself. Plain encryption can hide data while still allowing an attacker to tamper with the ciphertext; detecting modification needs its own mechanism. See [Encoding, hashing, and encryption](lesson:CRY-01).
- **"More security is always better."** Every control has a cost, and some trade against each other. The point of naming goals and impacts is to spend effort where a loss would actually hurt.

## Go deeper

For graduate readers, three threads are worth pulling.

First, read FIPS 199 alongside its companion FIPS 200 and the control catalog in NIST SP 800-53, then notice how the abstract properties in this lesson become concrete, auditable controls. Ask where the "high-water mark" rule is too blunt. Real systems often decompose into components with different categorizations rather than rating one monolith at its most sensitive data.

Second, study how the field has tried to make properties formal. Confidentiality and integrity have precise lattice-based models (Bell-LaPadula for confidentiality, Biba for integrity) in which "no read up" and "no write down" are mathematical rules rather than slogans. These models expose the awkward fact that strict confidentiality and strict integrity push information flow in opposite directions, which is why real policies are hybrids.

Third, treat **assurance** as the hard problem it is. The modern framing in NIST SP 800-160 Volume 1, *Engineering Trustworthy Secure Systems*, is that security is a property of a whole system and must be engineered in, with evidence, from the start, not bolted on. A useful exercise: pick any claim you might make about one of the labs in this course ("the sandbox cannot touch the parent page") and write down exactly what evidence would justify confidence in it, and what would undermine that evidence. That habit, separating a claim from its support, is the core of security measurement, and it is the subject of later foundations topics.
