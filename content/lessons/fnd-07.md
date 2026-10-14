---
topicId: FND-07
title: Ethics, authorization, and lab scope
summary: Learn what makes security testing authorized, how to write down scope and rules of engagement, what U.S. computer crime law means in plain terms, how to report a flaw responsibly, and the rules every CyberLab lab follows.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Explain why authorization, not intent or technique, separates security testing from an attack.
  - Identify who can authorize testing of a given system and what a written authorization must contain.
  - Write a scope and rules of engagement for a small engagement, including stop conditions.
  - Summarize in plain terms what the CFAA prohibits, how Van Buren and the 2022 Justice Department policy affect it, and their limits.
  - Describe responsible disclosure and apply CyberLab's lab rules.
prerequisites: [FND-01, FND-02]
concepts:
  - authorization
  - rules-of-engagement
  - testing-scope
  - cfaa
  - good-faith-security-research
  - responsible-disclosure
  - penetration-testing
keywords:
  - ethics
  - authorization
  - written permission
  - scope
  - rules of engagement
  - ROE
  - Computer Fraud and Abuse Act
  - CFAA
  - 18 U.S.C. 1030
  - exceeds authorized access
  - Van Buren v. United States
  - good-faith security research
  - Justice Department CFAA policy 2022
  - responsible disclosure
  - coordinated vulnerability disclosure
  - security.txt
  - RFC 9116
  - NIST SP 800-115
  - lab rules
sources:
  - title: '18 U.S. Code § 1030: Fraud and related activity in connection with computers (Computer Fraud and Abuse Act)'
    url: https://www.law.cornell.edu/uscode/text/18/1030
    publisher: Legal Information Institute, Cornell Law School
  - title: 'Van Buren v. United States, No. 19-783 (U.S. Supreme Court, June 3, 2021), opinion of the Court'
    url: https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf
    publisher: Supreme Court of the United States
  - title: 'Department of Justice Announces New Policy for Charging Cases under the Computer Fraud and Abuse Act (May 19, 2022)'
    url: https://www.justice.gov/opa/pr/department-justice-announces-new-policy-charging-cases-under-computer-fraud-and-abuse-act
    publisher: U.S. Department of Justice, Office of Public Affairs
  - title: 'NIST SP 800-115: Technical Guide to Information Security Testing and Assessment'
    url: https://csrc.nist.gov/pubs/sp/800/115/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'RFC 9116: A File Format to Aid in Security Vulnerability Disclosure'
    url: https://www.rfc-editor.org/rfc/rfc9116
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 6761: Special-Use Domain Names'
    url: https://www.rfc-editor.org/info/rfc6761
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-6761-special-use-domains
quiz:
  - question: "A friend runs a band's website on a commercial hosting service and says, \"Sure, go ahead and test it.\" What is still missing before you test?"
    choices:
      - Nothing, because the friend gave permission.
      - A written scope from someone who controls the site, plus confirmation that the hosting provider's terms allow the testing.
      - A VPN, so the test cannot be traced.
      - An automated scanner, so the test is thorough.
    answer: 1
    explanation: Permission must come from someone with authority over the system, and it should be written and specific. The site runs on someone else's servers, so the provider's terms matter too. Hiding the test or adding tools does not create authorization.
  - question: Under Van Buren v. United States, which situation best fits "exceeds authorized access"?
    choices:
      - An employee who may use a customer database looks up a record for a personal reason.
      - A visitor reads a page that the site makes available to everyone.
      - An employee whose account opens only the sales folder uses a flaw to open the payroll folder.
      - A student attacks the fictional target inside a CyberLab lab.
    answer: 2
    explanation: The Court held that the phrase covers obtaining information from areas of a computer that are off limits to you, a gates-up-or-down question. Misusing information you were entitled to reach is not covered by that phrase, though it may still break policies, contracts, or other laws. The lab target is built to be attacked.
  - question: What does the Justice Department's May 2022 CFAA charging policy do?
    choices:
      - It tells federal prosecutors that good-faith security research, narrowly defined, should not be charged under the CFAA.
      - It makes all security research legal in every U.S. state.
      - It allows researchers to demand payment for vulnerability reports.
      - It replaces the CFAA with a new statute.
    answer: 0
    explanation: The policy guides federal prosecutors. It defines good-faith research narrowly and says claiming to do research is not a free pass for bad-faith conduct such as extortion. It does not bind state prosecutors or civil lawsuits, and it is not legal advice for any particular situation.
  - question: During an authorized test, alice unexpectedly sees real member records. What should she do?
    choices:
      - Download a sample so the report has proof.
      - Keep testing, but avoid that page from now on.
      - Post a warning on social media so members can protect themselves.
      - Stop, write down what happened, and contact the person listed in the rules of engagement.
    answer: 3
    explanation: Unexpected real data is a classic stop condition. Collecting or publicizing it causes harm and may exceed the authorization. The owner needs to know at once so they can respond.
  - question: Which activity follows CyberLab's lab rules?
    choices:
      - Typing a real website's address into a lab as the target.
      - Trying a technique from a lab on a campus server after finishing the lab.
      - Attacking the fictional target that a lab creates inside your own browser tab.
      - Scanning a roommate's laptop with only their spoken permission.
    answer: 2
    explanation: Labs only target fictional systems that run inside the browser, and they do not accept real targets. Techniques practiced in labs must never be pointed at real hosts without written permission from someone entitled to give it.
---

## Why it matters

The same keystrokes can be a graded assignment or a federal crime. Sending a crafted login request to a lab target you were told to break is practice. Sending it to a real company's website is an attack, even if your intentions are good and nothing breaks. What separates the two is not the technique or your motive. It is **authorization**: permission from someone entitled to give it, for a defined scope.

This lesson is the one every CyberLab student reads before using any lab. It explains how authorization works, how professionals write it down, what U.S. federal law says in plain terms, how to report a flaw you stumble on, and the rules the CyberLab labs are built around.

> [!IMPORTANT]
> This lesson explains the law for general education. It is not legal advice. Laws differ between states and countries and change over time. If you are unsure whether something is allowed, do not do it, and ask your instructor or a lawyer first.

## The core idea

[[authorization|Authorization]] in security testing means permission, from someone with authority over a system, to perform specific actions against it during a specific time. Three tests decide whether you have it:

1. **Is the person entitled to grant it?** The owner of the system, or someone the owner has empowered, can authorize testing. A friend who uses a website, or a club officer whose site runs on a university server, usually cannot.
2. **Is it specific?** Authorization covers named systems, named activities, and a time window. Anything outside that [[testing-scope|scope]] is unauthorized, even on the same network.
3. **Is it written?** Memories differ and people leave. A written, dated authorization protects you, the owner, and anyone who has to decide later what was agreed.

Think of a locksmith. Hired by you to test your front door, a locksmith who picks your lock is doing a job. The same locksmith picking your neighbor's lock "to show them it is weak" is breaking in, however helpful the motive.

Ethics goes beyond permission. Even fully authorized, a tester should avoid harm, touch as little real data as possible, protect what they see, and report honestly. If anything is unclear, the default answer is "not authorized."

## How it works

### Who can authorize, and what it must say

Authorization must come from whoever controls the system and the data on it. Several parties can be involved: a website might belong to a student club, run on servers managed by campus IT, and send payments through an outside processor. Testing the processor is out of scope unless the processor itself agrees, and the club alone may not be able to authorize testing of campus servers.

Written authorization should name:

- the **systems** in scope, and those explicitly out of scope
- the **activities** allowed and forbidden, such as "manual testing of forms; no automated scanning; no denial of service"
- the **time window** and time zone
- **contacts**, including someone reachable during testing
- **data handling** rules: what you may view, what you must not copy, and when you delete test data
- **stop conditions**: when to halt and call the contact
- how **findings are reported**, and who may see the report

### Scope and rules of engagement

Professional testers call this document the [[rules-of-engagement]]. NIST's technical guide to security testing, SP 800-115, treats legal and policy considerations as part of planning a test, and its Appendix B is a template for writing rules of engagement ([NIST SP 800-115](https://csrc.nist.gov/pubs/sp/800/115/final)). [[penetration-testing|Penetration testing]] without written authorization is not penetration testing; it is unauthorized access with a report attached.

### U.S. law in plain terms

The main U.S. federal computer crime law is the [[cfaa|Computer Fraud and Abuse Act]] (CFAA), at 18 U.S.C. § 1030. In plain terms, among other things, it makes it a crime to intentionally access a computer **without authorization**, or to **exceed authorized access**, and thereby obtain information, including information from any "protected computer." The law defines that term to include any computer "used in or affecting interstate or foreign commerce or communication" ([18 U.S.C. § 1030](https://www.law.cornell.edu/uscode/text/18/1030)), and in Van Buren, discussed below, the Supreme Court said the prohibition now covers, at a minimum, information from computers that connect to the internet. Other parts of the law cover intentionally causing damage, trafficking in passwords, and extortion, and the law lets people who suffer damage or loss sue in civil court under certain conditions.

Two developments shape how the law applies to security work:

- **Van Buren v. United States (2021).** A Georgia police sergeant used his valid credentials to search a state license-plate database in exchange for money, in what turned out to be an FBI sting. On June 3, 2021, the Supreme Court held, 6 to 3, that a person exceeds authorized access when they enter a computer with authorization but then obtain information in areas of it "such as files, folders, or databases—that are off limits to him," not when they have an improper reason for using information they were entitled to reach. The Court called this a "gates-up-or-down inquiry," and in a footnote it left open whether the gates must be technical barriers or can be limits written in contracts or policies ([Van Buren](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf)).
- **The Justice Department's 2022 charging policy.** On May 19, 2022, the U.S. Department of Justice announced a policy telling federal prosecutors that [[good-faith-security-research]] should not be charged under the CFAA. It defines such research narrowly, as "accessing a computer solely for purposes of good-faith testing, investigation, and/or correction of a security flaw or vulnerability," carried out in a way designed to avoid harm, with the information used mainly to promote security or safety ([Justice Department](https://www.justice.gov/opa/pr/department-justice-announces-new-policy-charging-cases-under-computer-fraud-and-abuse-act)).

Neither development is a shield. Van Buren narrowed one phrase; access without any authorization is still covered. As a Justice Department charging policy, the 2022 policy guides federal prosecutors. It does not bind state prosecutors, civil lawsuits, or other countries, and the department stated that "claiming to be conducting security research is not a free pass for those acting in bad faith," citing the example of finding flaws in devices in order to extort their owners. Universities also have acceptable-use policies that can lead to discipline even when no law is broken.

### Responsible disclosure

If you find a flaw, whether during an authorized test or by accident while using a site normally, [[responsible-disclosure]] means reporting it privately to the people who can fix it and giving them reasonable time before anything is published. Many organizations publish a [[vulnerability-disclosure-policy]] that says how to report and what researchers may do. Some also publish a `security.txt` file at `/.well-known/security.txt`, a format described in [RFC 9116](https://www.rfc-editor.org/rfc/rfc9116), in which the `Contact` and `Expires` fields are required. A fictional example:

```text
Contact: mailto:security@college.example
Expires: 2027-06-30T23:59:59Z
Policy: https://college.example/security/disclosure-policy
Preferred-Languages: en
```

```sequence
title: Reporting a flaw responsibly
participant R as Student (reporter)
participant O as Owner's security contact
R -> O: Private report: what, where, how to reproduce
O --> R: Acknowledged, case number assigned
note O: Owner confirms and fixes the flaw
O --> R: Fix deployed
R -> O: Propose a date for any public write-up
O --> R: Agreed; reporter credited
```

In the diagram, the reporter tells only the owner, the owner confirms and fixes, and publication happens later and by agreement. While waiting, do not keep exploring, do not share the details, and do not access or keep anyone's data.

### CyberLab's lab rules

CyberLab's labs are built so that following the rules is easy:

1. **Labs only target fictional systems that run inside your browser tab.** Each lab creates its own target in memory: a real SQLite database compiled to WebAssembly, a sandboxed frame, or a deterministic simulation of a system that cannot safely run for real.
2. **Labs never accept a real target.** You cannot enter a real URL, hostname, IP address, or credential as a target. Labs work offline and make no network requests to carry out an attack.
3. **Examples use reserved names.** Names under `.test` and `.example` are reserved by [RFC 6761](https://www.rfc-editor.org/info/rfc6761), building on RFC 2606, and documentation address ranges such as `192.0.2.0/24` are reserved by RFC 5737, so examples can never point at someone's real system.
4. **Never point tools at real hosts.** Techniques you practice here are for systems you own or have written permission to test. Do not try them on campus systems, employers' systems, or any site on the internet, even "just to see."
5. **Simulations are labeled.** A lab tells you when it is a deterministic simulation rather than real execution, so you know what its numbers mean.

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

alice, a member of the campus security club, wants to check the club's website at club.college.example for [[xss|cross-site scripting]] before a recruiting event.

**Step 1: find the owner.** The club writes the content, but the site runs on a server operated by campus IT, alongside other departments' sites. The club president cannot authorize testing of that server. alice writes to the IT security office and copies the club's faculty advisor.

**Step 2: agree on a written scope.** IT approves a narrow test and records it:

```yaml
engagement: club website review, fall 2026 (fictional)
authorized_by: Campus IT Security Office, approval ticket SEC-2026-0114
tester: alice (student, campus security club)
in_scope:
  - https://club.college.example/ (club pages and forms only)
out_of_scope:
  - every other college.example host, including the campus sign-on service
  - other users' accounts and any real member data
allowed:
  - manual testing of the club's forms, using test accounts created for this review
  - viewing page source and using the browser's developer tools
not_allowed:
  - automated scanners, load testing, or denial of service
  - phishing or any other social engineering
window: 2026-10-20 to 2026-10-31, 09:00 to 17:00 US Eastern Time
contacts:
  primary: it-security@college.example
  urgent: soc@college.example (staffed around the clock)
stop_conditions:
  - any real member data appears
  - errors or slowdowns on the site
  - anything outside scope, including flaws in shared university software
reporting: written report to IT Security within five days; delete test data afterward
```

**Step 3: test inside the lines.** Using her own test account, alice finds that the club's "join" form echoes her input back into the page without encoding it. She confirms the flaw with a harmless marker string and stops. She does not try to read anyone's cookies, and she does not test other sites on the server, even though the server banner suggests they run the same software.

**Step 4: report.** Her report gives the page, the steps to reproduce with the harmless string, the likely impact, and a suggested fix ([[output-encoding|output encoding]]). She mentions the shared software only as an observation for IT, because testing it was out of scope.

**Step 5: close out.** alice deletes her test accounts and notes. After the fix, she asks IT whether she may present the finding at a club meeting, and does so only with their agreement.

## In practice

**Get it in writing before you start, every time.** An email from the system owner that lists scope, window, and contacts is far better than a hallway conversation.

**When in doubt, stop and ask.** Stop conditions exist because surprises happen. Real data, an unexpected system, or a service slowdown means halt, write down what happened, and call the contact.

**Collect the minimum.** Prove a flaw with the least access possible: a harmless marker, not a copy of a database. Data you never collected cannot leak.

**Use the front door for reports.** Look for a disclosure policy, a bug bounty page, or a `security.txt` file. If none exists, contact the organization's security or IT team, or ask your instructor for help.

**Practice where practice is allowed.** CyberLab labs, deliberately vulnerable training systems you run on your own machine, and environments your instructor provides are built for this. Everything else needs explicit permission.

## Common misconceptions

- **"If it is publicly reachable, I may test it."** Being able to reach a system is not permission to probe it. Public websites are open for normal use, not for security testing.
- **"Scanning is harmless, so it does not count."** Scans can disrupt fragile systems, often violate terms of service, and look like the first step of an attack to the people monitoring a network. Without permission, do not scan.
- **"My friend runs the site, so they can say yes."** Only someone with authority over the system and its hosting can authorize testing.
- **"Good intentions protect me."** Intent does not create authorization. The 2022 policy is a federal charging policy, not a law; its definition of good faith is narrow, and it does not bind states, civil lawsuits, or other countries.
- **"Van Buren made it legal to do anything my account can reach."** The decision narrowed one phrase of the CFAA and left open whether limits in contracts or policies count. Access without authorization is still covered, and other laws, contracts, and school rules still apply.
- **"In a lab I can point the tool anywhere."** CyberLab labs have no real targets by design. Outside the labs, never point tools at real hosts.

## Try it yourself

On paper, work through three tasks.

1. **Classify each scenario** as authorized, unauthorized, or unclear, and say what would make it authorized:
   - (a) Your instructor gives you a written exercise against a virtual machine running on your own laptop.
   - (b) You notice that changing a number in a URL on shop.example shows another customer's order, and you try ten more numbers to be sure.
   - (c) Your roommate asks you to test their personal blog, which runs on a commercial hosting service.
   - (d) An employer's job posting invites applicants to "find a bug in our site" but has no written rules.
2. **Write a scope and rules of engagement** for scenario (c). Include in-scope and out-of-scope systems, allowed and forbidden activities, a time window, contacts, data handling, stop conditions, and reporting. Note what the hosting provider's own terms might require.
3. **Draft a disclosure email** for scenario (b), assuming you stopped after the first accidental view. Say what you saw, how to reproduce it with your own account, and what you did not do.

For (b), notice that trying ten more numbers turns an accidental discovery into deliberate access to other people's data. The right move after the first view is to stop and report.

## Key takeaways

- Authorization, from someone entitled to give it and for a defined scope, separates testing from attacking. Intent does not.
- Write down scope and rules of engagement before any test, including stop conditions and data handling.
- The CFAA prohibits access without authorization and exceeding authorized access; Van Buren narrowed the second phrase, and the 2022 Justice Department policy is prosecutorial guidance, not a shield. This is not legal advice.
- Report flaws privately to the owner, prove them with minimal access, and publish only by agreement.
- CyberLab labs target only fictional systems inside your browser. Never point tools at real hosts.

## Go deeper

- The lesson [Responsible disclosure and research ethics](lesson:GRC-08) goes further into disclosure workflows and research ethics.
- Read the majority and dissenting opinions in Van Buren and compare how each would treat access limits set by written policy rather than by technical barriers.
- Compare the Justice Department's definition of good-faith security research with your institution's acceptable-use policy. Open question: how should law and policy treat research on systems whose owners publish no disclosure policy at all?
