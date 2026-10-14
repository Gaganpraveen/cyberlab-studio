---
topicId: FND-07
title: Ethics, authorization, and lab scope
summary: Understand why authorization is the line between security work and a crime, how rules of engagement and responsible disclosure keep testing safe, and why every lab in this course is contained.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 24
objectives:
  - Explain why authorization, not technique, separates legitimate testing from an offense.
  - Describe at a high level what the U.S. Computer Fraud and Abuse Act prohibits.
  - List the elements a rules-of-engagement document should fix before testing begins.
  - Outline a responsible-disclosure process and why coordination matters.
  - Explain the design choices that make the course labs safe to run.
prerequisites: [FND-01]
concepts: [authorization, responsible-disclosure, cfaa, rules-of-engagement, penetration-testing, threat-actor]
labs: []
sources:
  - title: U.S. Department of Justice, Justice Manual 9-48.000 (Computer Fraud policy)
    url: https://www.justice.gov/jm/jm-9-48000-computer-fraud
    publisher: U.S. Department of Justice
  - title: 18 U.S.C. 1030, Fraud and related activity in connection with computers
    url: https://www.govinfo.gov/content/pkg/USCODE-2023-title18/pdf/USCODE-2023-title18-partI-chap47-sec1030.pdf
    publisher: U.S. Government Publishing Office
  - title: Van Buren v. United States, 593 U.S. 374 (2021), opinion of the Court
    url: https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf
    publisher: Supreme Court of the United States
  - title: CISA Coordinated Vulnerability Disclosure (CVD) Process
    url: https://www.cisa.gov/coordinated-vulnerability-disclosure-process
    publisher: Cybersecurity and Infrastructure Security Agency
  - title: NIST SP 800-115, Technical Guide to Information Security Testing and Assessment
    url: https://csrc.nist.gov/pubs/sp/800/115/final
    publisher: NIST
  - title: CISA Vulnerability Disclosure Policy Template
    url: https://www.cisa.gov/vulnerability-disclosure-policy-template
    publisher: Cybersecurity and Infrastructure Security Agency
quiz:
  - question: Two people run the exact same port scan. One has signed permission from the system owner; the other does not. What distinguishes them under the law and professional ethics?
    choices:
      - The tools they used
      - Authorization
      - How many ports they scanned
      - Whether the scan succeeded
    answer: 1
    explanation: Legitimacy turns on authorization, not technique. The same action can be authorized testing or an offense depending on whether the owner permitted it.
  - question: After Van Buren v. United States (2021), "exceeds authorized access" under the CFAA is best understood as
    choices:
      - Violating any website's terms of service
      - Using access you have for a purpose the owner dislikes
      - Entering areas of a computer that are off limits to you
      - Any use of automated tools
    answer: 2
    explanation: The Supreme Court read the clause narrowly as a "gates-up-or-down" question about accessing off-limits areas, not about misusing access you already legitimately have.
  - question: Which item does NOT belong in a rules-of-engagement document?
    choices:
      - The exact systems and times that are in scope
      - An emergency contact and stop condition
      - A promise that no system will ever be affected
      - What to do if sensitive data is discovered
    answer: 2
    explanation: Realistic testing can affect systems, so the ROE plans for that with contacts and stop conditions. It cannot honestly promise zero impact.
  - question: In coordinated vulnerability disclosure, why is the researcher asked to wait before publishing?
    choices:
      - To let the vendor build and ship a fix so users are not exposed
      - Because publishing is illegal
      - To give the researcher time to sell the bug
      - There is no reason to wait
    answer: 0
    explanation: Coordination gives the people who can fix the flaw time to remediate before details are public, reducing harm to users. It is about timing and harm reduction, not secrecy forever.
  - question: Why do the labs in this course run entirely inside your own browser against toy targets?
    choices:
      - To make them load faster
      - So the skills cannot be practiced
      - So that doing the exercise never touches a system you are not authorized to test
      - Because real systems are boring
    answer: 2
    explanation: Containment means the attack and defense are genuine but the target exists only in your tab, so completing the exercise is always authorized and harms no one.
---

## Why it matters

Almost every technique in this course is dual-use. The same knowledge that lets you *recognize* a phishing site lets you *build* one; the same query that *extracts* data can *protect* it once you understand it. The field does not manage this by hiding the techniques. It manages it with a single bright line: **authorization**. Running a scan, sending a crafted request, or probing a login is defensive work when the system owner has permitted it and reckless or criminal when they have not. The action can be identical. The permission is what changes.

Getting this wrong has real consequences: expulsion, civil lawsuits, and criminal charges. It also damages the people who rely on the system you touched. Learning where the line is, and how professionals stay on the right side of it, is not legal boilerplate you skip to reach the "real" material. It *is* the real material, and it is why this course exists as a set of contained labs rather than a list of live targets.

> [!ETHICS]
> Only test systems you own or have explicit, written permission to test. Curiosity is not authorization, a public login page is not an invitation, and "I was just looking" is not a defense. If you are unsure whether something is in scope, assume it is not and ask first.

## The core idea

Think of authorization as a gate. The owner of a system decides which gates are open to you. Walking through an open gate is allowed; forcing a closed one is not, no matter how easy it is to force. [[authentication]] tells the system who you are; [[authorization]] decides which gates you may pass. Security testing is the practice of checking those gates *with permission* so weaknesses are found by a friend before a [[threat-actor]] finds them.

Two practices make dual-use work defensible:

- **[[penetration-testing|Authorized testing]]** is scoped, permissioned, and documented in advance. The tester and owner agree on exactly what may be touched, when, and how, in a document called the [[rules-of-engagement|rules of engagement]].
- **[[responsible-disclosure|Responsible disclosure]]** governs what happens when you find a flaw in someone else's system: you report it privately to those who can fix it and give them reasonable time before any public release.

Both are really about *consent and harm reduction*. They let security work happen without turning the practitioner into one of the threats they study.

## How it works

### The law, at a high level

In the United States, the main federal anti-hacking statute is the **[[cfaa|Computer Fraud and Abuse Act]]**, codified at 18 U.S.C. 1030. The following is a plain-language overview of a complex statute; it is background for making good decisions, **not legal advice**, and laws differ by country and change over time. For an actual situation, consult a qualified attorney.

At a high level, 18 U.S.C. 1030 makes it an offense to intentionally access a computer "without authorization" or in a way that "exceeds authorized access," and thereby to obtain information, cause damage, or commit certain frauds. The statute defines "exceeds authorized access" as accessing a computer with authorization and using that access "to obtain or alter information in the computer that the accesser is not entitled so to obtain or alter." It reaches any "protected computer," which the law defines broadly as a computer "used in or affecting interstate or foreign commerce" — in practice, essentially any internet-connected computer. It also covers attempts and conspiracies, and it creates a civil cause of action, so a system owner can sue for damage or loss, not only rely on prosecutors.

A crucial clarification came from the Supreme Court in *Van Buren v. United States* (2021). The Court read "exceeds authorized access" narrowly: it applies when someone "accesses a computer with authorization but then obtains information located in particular areas of the computer — such as files, folders, or databases — that are off limits to him." The Court described this as a "gates-up-or-down inquiry." In plain terms, the clause is about entering areas you were not allowed into, not about misusing access you legitimately have. The Court expressly did *not* decide whether the line is drawn only by technical barriers or also by written policies, leaving that open in a footnote.

The U.S. Department of Justice has its own charging policy for the CFAA (Justice Manual section 9-48.000, updated in 2022). It directs federal prosecutors to decline charges for conduct that is genuine "good faith security research," which it defines as accessing a computer "solely for purposes of good-faith testing, investigation, and/or correction of a security flaw or vulnerability," carried out to avoid harm and to improve security. Critically, the same policy says breaking a website's terms of service alone is not a basis for an "exceeds authorized access" charge. Two cautions, though: this is *internal guidance for prosecutors*, which the Department states is "not intended to ... create a right or benefit" you can rely on in court, and it does not bind state prosecutors. All fifty states also have their own computer-crime statutes. The lesson here is not "research is always safe"; it is that authorization is the hinge on which everything turns.

### Rules of engagement

Authorized testing starts with a written **[[rules-of-engagement|rules of engagement]]** (ROE) document, agreed before any testing. NIST SP 800-115, the federal guide to security testing, frames testing as something done only after "management approval is finalized and documented," precisely because the work is intrusive. The same guide is candid that active testing "can impact systems or networks" and that "the potential exists for unexpected system halts and other denial of service conditions." That honesty is why the ROE exists: you plan for impact instead of pretending there is none.

A good ROE fixes, in writing:

```text
- Scope:       which hosts, apps, accounts, and data are in (and out of) bounds
- Timing:      when testing may run, and any blackout windows
- Methods:     techniques permitted and techniques forbidden
- Data:        what to do if real or sensitive data is encountered (stop, do not copy)
- Contacts:    who to reach, and the stop condition that halts testing immediately
- Authority:   named sign-off from someone who can actually grant permission
```

CISA's Vulnerability Disclosure Policy template shows the same ideas from the owner's side. It pairs an authorization statement ("if you make a good faith effort to comply with this policy ... we will consider your research to be authorized") with firm limits: use an exploit "only to the extent necessary to confirm a vulnerability's presence," do not exfiltrate data, stop and report if you encounter sensitive data, and avoid prohibited methods such as denial-of-service, social engineering, and physical attacks. Notice that both documents define the edges of permission precisely. That precision is what keeps a tester inside the open gates.

### Responsible disclosure

When a researcher finds a flaw in a system they do not own, **[[responsible-disclosure|responsible disclosure]]** (also called coordinated vulnerability disclosure) governs what happens next. CISA, which coordinates disclosure for many products, describes its role as working with vendors to "coordinate the remediation and public disclosure of newly identified ... vulnerabilities," with the goal that the vendor, coordinator, and reporter disclose together so users get actionable fixes. The process runs through collection, analysis, mitigation, and finally disclosure. Coordination is not indefinite silence: CISA notes it "may disclose vulnerabilities as early as 45 days after the initial attempt to contact the vendor," even without a patch, if the vendor is unresponsive. Many organizations publish a contact for reports, increasingly via a standardized `security.txt` file (RFC 9116) at a well-known location on their site.

## Worked example

A student, Priya, notices that a fictional campus portal at `campus.test` seems to show another student's schedule when she edits a number in the URL. What should she do?

1. **Stop and do not dig further.** She has likely crossed into data that is off limits, exactly the "off-limits areas" the *Van Buren* Court described. Continuing to enumerate other students' records would turn a discovery into unauthorized access. She copies nothing.
2. **Record just enough.** She writes down the single observation and the time, without collecting anyone's personal data.
3. **Find the right contact.** She looks for a security contact or a `security.txt` file, or emails the IT/security office. If the school has a disclosure policy, she follows it.
4. **Report privately and clearly.** She describes what she saw and how to reproduce it, and offers to help verify a fix. She does not post it publicly or to a group chat.
5. **Wait and coordinate.** She gives the team reasonable time to fix the flaw before telling anyone else.

Priya never needed to "exploit" the issue to do the right thing. Confirming a flaw exists is different from mining it for data, and the ethical path and the safe-from-liability path are the same path here.

Contrast this with the course labs. When you break a login in the [SQL injection lab](lab:sql-injection) or inject script in the [XSS sandbox](lab:xss), you are performing the real technique, but against a toy system that lives only in your browser tab. There is no owner to ask because the target is yours, and nothing you do leaves your machine.

## Defenses

The "defense" here is a set of guardrails that keep learning and testing from becoming harm. Each has limits.

- **Explicit scope and the ROE.** The strongest guardrail is a written agreement about what is permitted. Its limit: a vague or verbal scope is almost worse than none, because everyone remembers it differently. Insist on specifics and a named authority.
- **Contained environments.** The course labs apply [[least-privilege|least privilege]] and isolation: markup you supply runs in a sandboxed frame that cannot reach the app, databases run as a local engine in your browser, and no lab makes outbound network requests to a target you choose. Its limit: containment constrains *what you can practice on*, by design, so the lab can only model part of a real system.
- **Responsible disclosure.** Private reporting plus a coordination window reduces the exposure window for users. Its limit: it depends on a responsive owner, which is why coordinators and published timelines exist as a backstop.
- **Professional norms.** Codes of conduct from bodies such as the ACM tell computing professionals to access systems only when authorized or compelled by a clear public good. Their limit: norms guide judgment but do not substitute for the law or for explicit permission.

These overlap on purpose. If one guardrail is unclear in a given situation, the others should still keep you from causing harm. That is [defense in depth](lesson:FND-01) applied to your own conduct.

## Common misconceptions

- **"If the system let me in, I was authorized."** A gate being easy to open is not the same as the owner opening it for you. The *Van Buren* framing is about whether an area was off limits, not about how hard it was to reach.
- **"It's fine as long as I don't cause damage."** Many offenses turn on *access*, not damage. Reading data you were not entitled to read can be enough.
- **"Terms of service violations are hacking."** The DOJ's 2022 policy specifically says a terms-of-service violation alone is not a basis for an "exceeds authorized access" charge, and professionals should still not rely on breaking rules as a strategy.
- **"Responsible disclosure means never going public."** It means coordinating *timing* to reduce harm, not permanent secrecy. Published windows (such as 45 days for an unresponsive vendor) exist for exactly this.
- **"Bug bounty programs authorize anything."** They authorize what their scope says and nothing more. Read the policy; out-of-scope testing is still unauthorized.
- **"This is all U.S. law, so it doesn't apply to me."** Other countries have their own, sometimes stricter, computer-crime laws, and actions can cross borders. The principle — get permission — is universal even where the statutes differ.

## Go deeper

Graduate readers should connect three literatures. First, read the full text of 18 U.S.C. 1030 next to the *Van Buren* opinion and ask what the Court deliberately left unresolved: footnote 8 declines to say whether authorization is set only by "technological (or code-based) limitations" or also by "limits contained in contracts or policies." That open question drives ongoing debate about scraping, account sharing, and research, and it is a good lens for reading current cases.

Second, situate computing ethics in research ethics generally. The Menlo Report (an effort launched by the U.S. Department of Homeland Security's Science and Technology Directorate) adapts the Belmont Report's principles for information and communication technology research, articulating four: respect for persons, beneficence, justice, and respect for law and public interest. Compare these with institutional review board (IRB) requirements and ask when security research involving human data needs review.

Third, study disclosure as a coordination problem with real economic and safety stakes. Compare models — full disclosure, coordinated disclosure, and vendor-managed bounty programs — and the standards that support them, from RFC 9116's `security.txt` to NIST SP 800-115's testing methodology. A worthwhile exercise: draft a one-page ROE and a matching disclosure policy for one of this course's fictional systems, then trade with a classmate and try to find a case your scope failed to cover. The gaps you discover are exactly the ambiguities that cause real-world disputes.
