---
topicId: FND-01
title: Security goals and properties
summary: Learn what confidentiality, integrity, availability, and the properties beyond them precisely mean, and how to turn a vague wish for "security" into requirements you can classify, rate, and test.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 25
objectives:
  - Define confidentiality, integrity, and availability, and give a concrete violation of each for a given system.
  - Distinguish authenticity, non-repudiation, and accountability from each other and from the CIA triad.
  - Classify written requirements by the goal they protect, and rewrite vague requirements so a test could fail them.
  - Rate the impact of losing each goal with the FIPS 199 levels and derive a system's security category.
  - Explain what assurance is and name evidence that increases it.
prerequisites: []
concepts:
  - cia-triad
  - confidentiality
  - integrity
  - availability
  - authenticity
  - non-repudiation
  - accountability
  - assurance
  - security-policy
keywords:
  - CIA triad
  - information security
  - security objectives
  - security requirements
  - FIPS 199
  - security categorization
  - impact level
  - high water mark
  - NIST SP 800-12
  - 44 U.S.C. 3552
  - FISMA
  - nonrepudiation
  - information assurance
sources:
  - title: 'NIST SP 800-12 Rev. 1: An Introduction to Information Security'
    url: https://csrc.nist.gov/pubs/sp/800/12/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'FIPS 199: Standards for Security Categorization of Federal Information and Information Systems'
    url: https://csrc.nist.gov/pubs/fips/199/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: '44 U.S. Code § 3552: Definitions (Federal Information Security Modernization Act of 2014)'
    url: https://www.law.cornell.edu/uscode/text/44/3552
    publisher: Legal Information Institute, Cornell Law School
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 5: Introduction to Cryptography'
    url: https://textbook.cs161.org/crypto/intro.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security in the Real World (Butler W. Lampson, ACSAC 2000)'
    url: https://bwlampson.site/64-SecurityInRealWorld/WebPage.html
    publisher: Butler W. Lampson (author's site)
  - title: 'Hyperproperties (Michael R. Clarkson and Fred B. Schneider, technical report)'
    url: https://ecommons.cornell.edu/bitstream/1813/11660/4/hyperproperties-tr.pdf
    publisher: Cornell University (eCommons)
quiz:
  - question: Bob and the grading server share a secret MAC key. Bob later denies sending a grade-change request that carries a valid tag. Why can't the tag settle the dispute?
    choices:
      - Anyone who has seen one valid tag can forge new ones.
      - The server holds the same key, so it could have produced the tag itself.
      - MACs protect confidentiality, not integrity.
      - The tag proves the request was sent, but not when it was sent.
    answer: 1
    explanation: A MAC shows that someone holding the key produced the message. Both Bob and the server hold it, so a third party cannot tell which of them did. Non-repudiation needs evidence only one party could have produced, such as a digital signature made with Bob's private key.
  - question: 'FIPS 199 rates public information on a web server as {(confidentiality, NA), (integrity, MODERATE), (availability, MODERATE)}. What does the NA tell you?'
    choices:
      - The information is meant to be public, so its disclosure causes no harm; NA is allowed only for confidentiality.
      - Nobody has assessed confidentiality yet, so it must be rated before launch.
      - HTTPS already guarantees confidentiality, so it does not need a rating.
      - Confidentiality matters so much that it cannot be put on the LOW to HIGH scale.
    answer: 0
    explanation: Not applicable means no harm follows from disclosure, which is true only of information meant to be public. Integrity and availability still matter, since defacing or knocking out a public site hurts. FIPS 199 permits NA only for confidentiality.
  - question: A system holds three information types whose integrity ratings are LOW, MODERATE, and HIGH. Under FIPS 199, what is the system's integrity rating, and why?
    choices:
      - LOW, because a system is only as strong as its weakest part.
      - MODERATE, because the ratings are averaged across information types.
      - HIGH, because the system must protect the most sensitive information it holds.
      - It depends on which information type has the most records.
    answer: 2
    explanation: FIPS 199 uses the high water mark. For each goal, the system takes the highest rating of any information type it holds, because a compromise of the system can reach that information. Volume and averages do not lower the rating.
  - question: Which of these is an assurance requirement rather than a requirement for one of the other goals?
    choices:
      - Only the instructor of record can change a final grade.
      - Every grade change records the account that made it, the old value, and the new value.
      - The grade page answers 99.9 percent of requests during finals week.
      - Before each term, an independent reviewer tries to change grades as a student and records the results.
    answer: 3
    explanation: The first three state what the system must do (integrity, accountability, availability). The fourth produces evidence that the integrity requirement actually holds. Assurance is about justified confidence, so assurance requirements name an activity and the evidence it produces.
  - question: An attacker on the network cannot read an encrypted grade record but can alter the ciphertext so that it decrypts to a different grade. Which goal failed?
    choices:
      - Confidentiality, because any change to ciphertext means the encryption was broken.
      - Integrity, because encryption hid the data but did nothing to stop or detect the change.
      - None, because the attacker never learned the original grade.
      - Availability, because the correct record can no longer be used.
    answer: 1
    explanation: Hiding content and protecting it from modification are different goals. Some encryption modes let an attacker make predictable changes to the plaintext without reading it. Integrity needs its own mechanism, such as a MAC or authenticated encryption.
---

## Why it matters

Ask ten people what it means for a system to be "secure" and you will get ten answers. A registrar worries that someone will read student records. An instructor worries that someone will quietly change a grade. A student worries that the exam site will crash ten minutes into a timed final. All three are security failures, but they are different failures, caused by different threats and fixed with different tools. Encrypting the database does nothing for the crashed exam, and adding servers does nothing for the altered grade.

Security goals give these worries precise names, so a team can say exactly what must be protected, from whom, and how badly a failure would hurt. The vocabulary is not only academic. The Federal Information Security Modernization Act of 2014 defines information security as protecting information and systems in order to provide integrity, confidentiality, and availability ([44 U.S.C. § 3552](https://www.law.cornell.edu/uscode/text/44/3552)). NIST's [FIPS 199](https://csrc.nist.gov/pubs/fips/199/final) builds a system of impact ratings on the same three words. Auditors, engineers, and lawyers all speak this language.

This lesson defines each goal carefully, adds the properties the classic triad leaves out, and shows how to turn "make it secure" into requirements you can classify, rate, and test.

## The core idea

Butler Lampson split computer security into three questions: what is the system supposed to do, how does it do it, and does it really work? In security, he notes, these are called **policy**, **mechanism**, and **assurance** ([Lampson, 2000](https://bwlampson.site/64-SecurityInRealWorld/WebPage.html)). A [[security-policy]] states what is and is not allowed, for example "only the instructor of record may change a final grade." A mechanism, such as an access check in the grading code, enforces the policy. Assurance is your evidence that the mechanism enforces the policy in practice.

Security goals are the categories that policies fall into. The [[cia-triad]] names the three classic ones:

- [[confidentiality|Confidentiality]]: information is not disclosed to anyone the policy does not allow to see it.
- [[integrity|Integrity]]: information and systems are not changed or destroyed in ways the policy does not allow.
- [[availability|Availability]]: authorized users get timely, reliable access when they need it.

Two assumptions sit underneath every goal. First, there is an adversary, a [[threat-actor]] who tries to violate the policy on purpose, so a goal is about resisting intent and not only accidents. Second, "authorized" means "allowed by the policy." A goal has no precise meaning until someone writes down who may do what. A system can perfectly enforce a bad policy, for example one that lets every student read every grade.

Think of a bank vault. Confidentiality is about who can look inside, integrity is about whether the contents are what they should be, and availability is whether the vault opens during business hours. A vault that never opens is very confidential and very useless. Real designs trade the goals against each other, which is why naming them matters.

## How it works

### Confidentiality

[FIPS 199](https://csrc.nist.gov/pubs/fips/199/final) defines a loss of confidentiality as "the unauthorized disclosure of information." Disclosure is broader than reading a file. Metadata (who messaged whom, and when), error messages that reveal whether an account exists, and inferences from aggregate statistics can all leak protected information. Typical mechanisms are [[authorization]] checks and [[encryption]]. Confidentiality overlaps with privacy but is narrower: privacy also asks whether personal data should be collected at all and how authorized people may use it.

### Integrity

A loss of integrity is "the unauthorized modification or destruction of information." Integrity covers data, such as a grade or a balance, and systems, meaning the code and configuration that process the data. Mechanisms either prevent improper changes (access control) or detect them (a [[mac]] or a [[digital-signature]]). A plain [[hash-function]] stored next to the data catches accidental corruption, but an attacker who can change the data can usually recompute the hash as well. Encryption alone is not an integrity mechanism either: with some encryption modes, an attacker can alter ciphertext so that it decrypts to predictably different plaintext, without ever reading it.

### Availability

A loss of availability is "the disruption of access to or use of information or an information system." Attackers target availability on purpose with [[dos-attack|denial-of-service attacks]] and [[ransomware]], but failed disks, bad deployments, and expired certificates break it too. Mechanisms include redundancy, capacity planning, rate limiting, and tested backups. Availability is always tied to a time requirement. An exam portal that is down for an hour on a quiet Sunday and one that is down during the final suffer the same outage with very different consequences.

### Beyond the triad

Several more properties come up constantly. The federal statute even folds two of them into its definition of integrity, which "includes ensuring information nonrepudiation and authenticity" ([44 U.S.C. § 3552](https://www.law.cornell.edu/uscode/text/44/3552)).

| Property            | Question it answers                                                     | Typical mechanism or evidence               |
| ------------------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| [[authenticity]]    | Did this data really come from the claimed source?                      | [[authentication]], MACs, signatures        |
| [[non-repudiation]] | Can we show a third party who acted, even if that person denies it?     | Digital signatures, independently kept logs |
| [[accountability]]  | Can each action be traced to the single entity that took it?            | Individual accounts, protected audit logs   |

The distinctions matter. Two parties who share a secret key can authenticate messages to each other, but the shared key cannot give non-repudiation: either party could have computed the tag, so a judge cannot tell which one wrote the message ([CS 161, Chapter 5](https://textbook.cs161.org/crypto/intro.html)). Non-repudiation needs evidence that only one party could have produced. Accountability rests on [[authentication]], since shared accounts break it, and on [[security-log|logs]] that the people being held accountable cannot edit.

### Assurance

[[assurance|Assurance]] is different in kind. It is not a property of the data but a measure of your confidence. NIST describes information assurance as the degree of confidence that security measures protect and defend information and systems, and adds that it "is not, however, an absolute guarantee" ([NIST SP 800-12 Rev. 1](https://csrc.nist.gov/pubs/sp/800/12/r1/final), Chapter 7). Confidence comes from evidence: design reviews, testing, independent evaluation, and ongoing audits and monitoring. NIST groups these into design and implementation assurance and operational assurance. An assurance requirement therefore names an activity and the evidence it produces.

### Rating impact

FIPS 199 asks, for each type of information, how bad losing each goal would be:

- **LOW**: a limited adverse effect on operations, assets, or individuals.
- **MODERATE**: a serious adverse effect.
- **HIGH**: a severe or catastrophic adverse effect.

The result is written as a security category (SC). Only confidentiality may be rated not applicable (NA), for information meant to be public. The second line below is FIPS 199's own example for public information on a web server: nobody minds who reads it, but defacement and outages still hurt.

```text
SC information type = {(confidentiality, impact), (integrity, impact), (availability, impact)}
SC public information = {(confidentiality, NA), (integrity, MODERATE), (availability, MODERATE)}
```

For a whole system, FIPS 199 takes the highest rating for each goal across all the information types the system holds, a rule it calls the high water mark.

## Worked example

A university runs a fictional online exam service, exams.college.example, where instructors post timed exams and students take them. The provost asks your team to "make it secure." Work through it in five steps.

**Step 1: list the information types.** The service holds exam questions and answer keys, student submissions, final grades, and the public course calendar.

**Step 2: write each wish as who may do what, and when.** "Protect the exams" becomes "only the course's instructors can read an exam before it opens."

**Step 3: classify each requirement.**

| #   | Requirement                                                                                  | Goal            |
| --- | -------------------------------------------------------------------------------------------- | --------------- |
| R1  | Only the course's instructors can read an exam before it opens.                              | Confidentiality |
| R2  | After the deadline, no one can change a saved submission.                                    | Integrity       |
| R3  | While an exam is open, 99 percent of page loads finish within 3 seconds.                     | Availability    |
| R4  | Every grade change records who made it, when, the old and new values, and the reason.        | Accountability  |
| R5  | Each submission gets a signed receipt that a third party, such as the registrar, can verify. | Non-repudiation |
| R6  | Each term, an independent tester confirms that autosave survives a browser crash.            | Assurance       |

R5 is non-repudiation rather than plain authenticity because its evidence must convince someone outside the exchange. It protects the student as well as the school: if a submission goes missing, the school cannot deny having received it. Notice also that R1 expires. Once the exam closes and the key is released, confidentiality of the questions stops mattering.

**Step 4: rate the impact for each information type.** Ratings are judgments, so record a reason with each one.

```text
SC course calendar = {(confidentiality, NA),       (integrity, LOW),      (availability, LOW)}
SC exam questions  = {(confidentiality, MODERATE), (integrity, MODERATE), (availability, MODERATE)}
SC submissions     = {(confidentiality, MODERATE), (integrity, MODERATE), (availability, MODERATE)}
SC final grades    = {(confidentiality, MODERATE), (integrity, HIGH),     (availability, LOW)}
```

Final-grade integrity is HIGH because silent changes could affect graduation and financial aid for many students and might go unnoticed for months. Final-grade availability is LOW because a day's delay in viewing grades is a nuisance rather than a serious harm. A careful team would flag one exception: the days before grade deadlines.

**Step 5: compute the system's category.** Take the highest value for each goal:

```text
SC exam service = {(confidentiality, MODERATE), (integrity, HIGH), (availability, MODERATE)}
```

The service must protect integrity at the HIGH level, even though most of its information is MODERATE. That one line tells the team where to spend first: strict change control and tamper-evident logs for grades come before, say, encrypting the course calendar.

## In practice

**Write requirements that a test could fail.** "The system shall be secure" cannot be verified. "Only instructors of record can change a final grade, and every change is logged" can be tested by trying to change a grade as a student and then reading the log.

**Expect trade-offs.** Goals pull against each other. Encrypting backups protects confidentiality, but losing the key turns it into an availability disaster. Locking an account after a few wrong passwords protects confidentiality, but it lets an attacker lock real users out on purpose. Detailed logging serves accountability but creates a new store of sensitive data. Choosing among these is a [[risk]] decision, the subject of [the next lesson](lesson:FND-02).

**Trace every control to a goal.** Each [[security-control]] should serve a stated goal. A control that serves no goal is a cost without a reason, and a goal with no control is a gap.

**Know the limits of the triad.** It does not mention physical safety, privacy beyond disclosure, or misuse by people who are fully authorized. Treat it as a checklist to start from, not a complete theory of security.

## Common misconceptions

- **"Encryption protects integrity."** Encryption hides content. By itself it neither stops nor reliably detects tampering. Use a MAC, a signature, or authenticated encryption ([[aead]]).
- **"A hash proves who sent the file."** Anyone can recompute an unkeyed hash. Authenticity needs a secret key or a private key, or a hash value obtained from a separate trusted source.
- **"Availability is an operations problem, not a security one."** Attackers go after availability on purpose, and the federal definition of information security includes it.
- **"Confidential means private."** Confidentiality controls who can see data. Privacy also asks whether the data should be collected and how it may be used.
- **"A system is either secure or not."** Security is relative to a policy and a [[threat-model]], and assurance is a degree of confidence, never a guarantee.

## Try it yourself

On paper, analyze a fictional room-booking service at rooms.college.example, where students reserve study rooms and staff manage the list of rooms.

1. Classify each requirement as confidentiality, integrity, availability, authenticity, non-repudiation, accountability, or assurance.
   - (a) Students can see that a room is taken, but not who booked it.
   - (b) Only staff can add or remove rooms.
   - (c) Booking keeps working during finals week, when demand triples.
   - (d) Each cancellation records the account that made it.
   - (e) Students can check that a booking confirmation email really came from the service.
   - (f) Before launch, a reviewer confirms that one student cannot cancel another student's booking.
2. Rewrite "Bookings must be safe" as two or more requirements that a test could fail.
3. Write a FIPS 199 security category for the booking records, with a one-sentence reason for each rating.
4. Name one trade-off between two of your requirements, and say which you would favor.

Check your answers to step 1: (a) confidentiality, (b) integrity, (c) availability, (d) accountability, (e) authenticity, (f) assurance. In step 3, any rating is defensible if its reason names a concrete harm and how serious it would be.

## Key takeaways

- Confidentiality, integrity, and availability name three different ways a policy can be violated, and each needs its own mechanisms.
- Authenticity, non-repudiation, and accountability extend the triad. Non-repudiation requires evidence a third party can check.
- Assurance is justified confidence built from evidence. It is not a property of data, and it is never a guarantee.
- FIPS 199 rates the loss of each goal as LOW, MODERATE, or HIGH, and a system takes the highest rating for each goal.
- A good requirement says who may do what, and when, so that a test could fail it.

## Go deeper

- Lampson's paper ([Lampson, 2000](https://bwlampson.site/64-SecurityInRealWorld/WebPage.html)) frames security as policy, mechanism, and assurance, and argues that practical security depends on knowing exactly who is trusted for what.
- Confidentiality is harder to state formally than it looks. Noninterference, the requirement that secret inputs never affect public outputs, cannot be checked by examining one execution at a time. Clarkson and Schneider call such policies hyperproperties, which are properties of sets of executions ([Clarkson and Schneider, 2009](https://ecommons.cornell.edu/bitstream/1813/11660/4/hyperproperties-tr.pdf)). An open question: which hyperproperties can be monitored or verified efficiently in real systems?
- [NIST SP 800-12 Rev. 1](https://csrc.nist.gov/pubs/sp/800/12/r1/final) and [FIPS 199](https://csrc.nist.gov/pubs/fips/199/final) show how U.S. federal agencies turn these goals into categorization and assurance programs.
