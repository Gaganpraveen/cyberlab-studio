---
topicId: HUM-03
title: Security warnings and decision making
summary: Why some security warnings work and others are clicked through, how to reason about the human in the loop step by step, and how to design and test a warning people can understand and act on, with their consent.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Trace a warning through each step of Cranor's human-in-the-loop framework and name where it can fail.
  - Interpret field data on browser warning click-through rates and identify design factors that explain the differences.
  - Distinguish active warnings from passive indicators, and explain how habituation and false alarms erode both.
  - Rewrite a security warning so it states the risk, the consequence, and one safe action in plain language.
  - Design a consented comprehension test that compares two warning drafts and state its limits.
prerequisites: [NET-05, HUM-01]
concepts: [security-warning, human-in-the-loop, habituation]
keywords:
  - security warning
  - browser warning
  - interstitial
  - certificate warning
  - SSL warning
  - TLS error
  - click-through rate
  - warning fatigue
  - habituation
  - opinionated design
  - human in the loop
  - HSTS
  - RFC 6797
  - Alice in Warningland
sources:
  - title: 'Alice in Warningland: A Large-Scale Field Study of Browser Security Warning Effectiveness (Akhawe and Felt, USENIX Security 2013)'
    url: https://www.usenix.org/conference/usenixsecurity13/technical-sessions/presentation/akhawe
    publisher: USENIX Association
  - title: 'Improving SSL Warnings: Comprehension and Adherence (Felt et al., CHI 2015)'
    url: https://research.google/pubs/improving-ssl-warnings-comprehension-and-adherence/
    publisher: Google Research
  - title: "A Framework for Reasoning About the Human in the Loop (Cranor, UPSEC '08)"
    url: https://www.usenix.org/legacy/event/upsec08/tech/full_papers/cranor/cranor.pdf
    publisher: USENIX Association
  - title: 'RFC 6797: HTTP Strict Transport Security (HSTS)'
    url: https://www.rfc-editor.org/rfc/rfc6797
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'Phishing in Organizations: Findings from a Large-Scale and Long-Term Study (Lain, Kostiainen, and Capkun, IEEE S&P 2022)'
    url: https://arxiv.org/abs/2112.07498
    publisher: arXiv (author preprint)
  - title: 'badssl.com: test subdomains for TLS and certificate errors'
    url: https://badssl.com/
    publisher: badssl.com (source hosted by the Chromium project on GitHub)
quiz:
  - question: In Akhawe and Felt's field study, users clicked through Chrome's certificate warning 70.2% of the time and Firefox's about a third of the time. Adding confirmation clicks seemed the obvious explanation. What did the authors conclude about extra clicks?
    choices:
      - Extra clicks fully explained the gap, so every warning should require three clicks.
      - Their data suggested designers should not rely on extra clicks to deter users, since extra clicks did not lower Chrome's other warning rates and most Firefox users who started bypassing finished.
      - Extra clicks made users angry, which raised click-through rates.
      - Firefox users were more technical, so clicks did not matter.
    answer: 1
    explanation: The authors found that most Firefox users who took the first bypass steps also took the last one, and pointed instead to factors such as non-bypassable errors on HSTS and pinned sites, remembered exceptions, and warning frequency.
  - question: According to Cranor's framework, which failure is most likely when an organization's internal sites routinely show certificate errors that staff are told to ignore?
    choices:
      - Communication impediment from environmental stimuli, because the office is noisy.
      - A capabilities failure, because staff cannot read the warning text.
      - A knowledge-transfer failure, because the warning is shown in a different language.
      - Habituation, so staff stop responding to the warning even when it signals a real attack.
    answer: 3
    explanation: Each harmless warning teaches people that the warning can be ignored. When a real attack produces the same warning, the trained response is to click through. Fixing the certificates removes the false alarms.
  - question: Felt and colleagues redesigned Chrome's certificate warning. Which result did they report?
    choices:
      - Users finally understood certificate errors, but adherence did not change.
      - The new warning was less effective than the old one and was withdrawn.
      - Nearly 30% more users chose to remain safe, credited to opinionated design, although the authors said they failed to make a well-understood warning.
      - Detailed technical explanations doubled comprehension.
    answer: 2
    explanation: Comprehension and adherence are different goals. Visual cues that make the safe choice prominent raised adherence even though most users still did not understand certificate errors.
  - question: Why does RFC 6797 (HSTS) tell browsers not to offer a "proceed anyway" option for certificate errors on a Known HSTS Host?
    choices:
      - Because the site has declared that it is always reachable over valid HTTPS, so an error almost certainly signals a problem, and the system can decide without asking the user.
      - Because users always choose correctly when given the option.
      - Because HSTS encrypts the warning page itself.
      - Because certificate errors cannot happen on HSTS sites.
    answer: 0
    explanation: When the system has enough information to decide, it should decide. HSTS turns an uncertain judgment into a policy the site set in advance, which removes the decision from the user entirely.
  - question: You want to know whether staff understand a new email warning. Which study design is both informative and ethical?
    choices:
      - Send real-looking phishing to staff without telling anyone, and count clicks.
      - Show consenting volunteers mockups of each draft, ask them to explain the risk and choose an action, and compare drafts.
      - Ask the two most security-aware engineers which draft they prefer.
      - Deploy both drafts and punish anyone who ignores them.
    answer: 1
    explanation: A consented comprehension test with mockups measures what you want to learn, understanding and intended action, without deceiving anyone. Field telemetry can later measure real behavior in aggregate, with notice and privacy protections.
---

## Why it matters

Browsers, mail clients, and operating systems interrupt people with warnings every day: this site may be phishing, this download may be malware, this connection's certificate is invalid. A [[security-warning]] is a control that works only if a person notices it, understands it, and chooses the safe option.

For years, conventional wisdom held that people ignore warnings. A large field study complicates that view. Devdatta Akhawe and Adrienne Porter Felt analyzed more than 25 million warning impressions collected through opt-in telemetry in Firefox and Chrome and published the results at USENIX Security 2013. Users continued past Firefox's malware and phishing warnings 7.2% and 9.1% of the time, and past Chrome's 23.2% and 18.0% of the time. For certificate warnings, the rates were 33.0% in Firefox (measured on its beta channel) and 70.2% in Chrome. The threats were similar, but the outcomes were not. The authors concluded that "browser security warnings can be effective security mechanisms in practice, but their effectiveness varies widely," and that a warning's user experience strongly affects behavior.

So warnings are neither useless nor automatic. They are designed artifacts, and their designers decide how much risk to hand to users and how much trust each false alarm spends.

## The core idea

A warning exists because a system faces a decision it cannot make alone. The browser sees a certificate for the wrong name, but it cannot tell an attacker from a misconfigured server, so it asks the person. That makes the person a component of the security system, which is the idea behind [[human-in-the-loop]] security.

Lorrie Faith Cranor's framework (2008) treats that human component the way an engineer treats any other: identify the task, ask whether it can be automated, find the ways it can fail, and mitigate them. She defines the communication this lesson is about precisely: "Warnings are communications that alert users to take immediate action to avoid a hazard."

Three assumptions must hold for a warning to be worth showing:

1. **The system truly cannot decide.** If it knows the answer, as with known malware or a site that has declared it must always use valid [[tls|TLS]], it should act without asking.
2. **A safe option exists, and the person can take it.** A warning that blocks someone's only way to do their job invites a click-through.
3. **Warnings are rare and usually right.** A smoke alarm that sounds every time someone makes toast soon has its battery removed. Each [[false-positive]] teaches people that the warning can be ignored.

## How it works

### Where a human in the loop can fail

Cranor's framework breaks the path from warning to behavior into steps. Each step is a place to look for failure.

| Step                         | Question to ask                                       | Typical failure                                          |
| ---------------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Communication                | Is a warning the right kind of message at all?        | A quiet status icon used where a hazard needs action     |
| Impediments                  | What competes with or interferes with it?             | Other pop-ups, a busy task, or an attacker's fake dialog |
| Attention switch             | Will the person notice it?                            | A banner identical to one seen on every message          |
| Attention maintenance        | Will they read enough of it?                          | A wall of text that is skimmed                           |
| Comprehension                | Do they understand the risk?                          | Jargon such as "certificate authority invalid"           |
| Knowledge acquisition        | Do they know what to do?                              | No clear safe action                                     |
| Retention and transfer       | Will they recognize the situation next time?          | Lessons tied to one screen that do not generalize        |
| Personal variables, intentions, capabilities | Do they believe it, care, and have the means to act? | A deadline makes reaching the site matter more   |
| Behavior                     | Do they do the right thing?                           | Clicking through by habit                                |

The framework is useful because it turns "users are careless" into a specific, fixable diagnosis.

### Active warnings, passive indicators, and habituation

An **active warning** interrupts the task and requires a choice, like a full-page interstitial. A **passive indicator** displays status without blocking, like the address bar or a lock icon. Passive indicators are easy to miss, so they suit status, not hazards.

Both suffer from [[habituation]], the fading of a response to a stimulus that is seen again and again. Akhawe and Felt could not measure repeat visits directly, but they found that more frequent error types were clicked through faster and more often, which they described as consistent with warning fatigue. Their advice to practitioners: "limit the number of warnings that users encounter." The same dynamic in security operations is called [[alert-fatigue]].

### What explained the browser differences

The authors tested the obvious explanation, that Firefox required three clicks to bypass a certificate warning while Chrome required one, and doubted that it was the main cause. Extra clicks did not lower click-through on Chrome's malware and phishing warnings, and 84% of Firefox users who took the first two bypass steps also took the third. They concluded that designers "should not rely on extra clicks to deter users." Other factors mattered more:

- **Non-bypassable errors.** Chrome refused bypass on sites using HTTP Strict Transport Security (HSTS) preloading or certificate pinning, so about 20% of its certificate warnings could not be bypassed, compared with about 1% in Firefox.
- **Remembered exceptions.** Firefox remembered a user's exception by default, so repeat visitors to a broken site saw fewer warnings, which makes a direct comparison difficult.
- **Appearance and wording.** Firefox's warning used the word "untrusted" and an image of a police officer, which the authors thought contributed but did not fully explain the gap.

### Designing for comprehension and adherence

In 2015, Felt and colleagues at Google redesigned Chrome's certificate warning with two goals: comprehension (people understand the risk) and adherence (people choose the safe option). They wrote that an ideal warning "would empower users to make informed decisions and, failing that, guide confused users to safety." The new warning raised adherence: "nearly 30% more total users chose to remain safe." They credited **opinionated design**, which "promotes safety with visual cues," such as a prominent safe button and a less prominent path onward. They were also candid: "We ultimately failed at our goal of a well-understood warning." Adherence can improve even when understanding does not.

The diagram shows both ideas. The browser cannot tell why the certificate is wrong, so it warns with the safe choice highlighted. If the site had declared HSTS, the browser would not have asked at all.

```sequence
title: A certificate warning with an opinionated default
participant U as Alice
participant B as Browser
participant S as Server answering for bank.example
U -> B: Opens https://bank.example
B -> S: TLS handshake
S --> B: Certificate issued for a different name
note B: Cannot tell an attack from a misconfiguration
B --> U: Full-page warning, "Back to safety" highlighted
U -> B: Chooses "Back to safety"
B -x S: Connection abandoned, nothing sent
```

## Worked example

> [!NOTE]
> Fernwood College, its staff, and the results below are fictional.

**The decision.** Fernwood College's IT team wants a warning on emails that come from outside the college but use the display name of an internal office, a common phishing pattern. The safe action is to avoid signing in from the message and to report it.

**Two drafts.**

```text
Draft A
WARNING: Header anomaly. Display name does not correspond to the
envelope sender domain (external origin). Proceed with caution.

Draft B
This message says it is from "Fernwood IT," but it was sent from
outside Fernwood. Fernwood IT will never ask you to sign in from an
email link. Use the Report button to send it to the security team.
```

**Step 1: Walk each draft through the framework.** Draft A is accurate, since the display name really does not match the sending domain, but accuracy is not the same as being understood.

| Step                  | Draft A                                  | Draft B                                    |
| --------------------- | ---------------------------------------- | ------------------------------------------ |
| Attention switch      | Generic capital letters                  | Names the office being imitated            |
| Comprehension         | Needs knowledge of email headers         | States the mismatch in plain words         |
| Knowledge acquisition | "Proceed with caution" is not an action  | One concrete action: Report                |
| Intentions            | No reason to believe it                  | Explains what the real office never does   |

**Step 2: Plan a consented comprehension test.** The team recruits 12 staff volunteers. Each signs a consent form explaining that the study compares the wording of email warnings, that participation is voluntary, and that no real phishing will be sent. Volunteers see mockups of each draft in random order and answer two questions: "In your own words, what is the risk?" and "What would you do next?" Two raters score the answers independently.

**Step 3: Read the results.**

| Draft | Explained the risk correctly | Chose the safe action |
| ----- | ---------------------------- | --------------------- |
| A     | 4 of 12                      | 5 of 12               |
| B     | 10 of 12                     | 11 of 12              |

**Step 4: State the limits.** Twelve people in a quiet room are not a busy inbox. The test measures comprehension and intent, not behavior, and it cannot show habituation, which develops over weeks. The team therefore plans a four-week pilot with staff told in advance about the new banner, tracking only aggregate report rates. They also remember a field result from a large phishing study: detailed email warnings did no better than short ones, so the lesson is not "write more," but "be specific and give one action."

## In practice

- **Decide before you warn.** Block known-malicious content without asking. For your own websites, deploy HSTS: RFC 6797 says that for a Known HSTS Host, the browser "MUST terminate the connection" on certificate errors and that "the user should not be presented with a dialog giving her the option to proceed."
- **Keep warnings rare and right.** Fix the root causes of false alarms, such as expired certificates on internal sites, instead of telling staff to click through.
- **Make the safe choice obvious.** Use visual hierarchy to promote it, as opinionated design does, and do not count on extra confirmation clicks.
- **Write for the person, not the protocol.** Say what happened, what could go wrong, and the one thing to do, in words a first-year student would understand.
- **Test with consent, then measure in the field.** Akhawe and Felt recommend "a renewed emphasis on field techniques" for studying warnings. Lab studies with consenting participants check comprehension; privacy-preserving telemetry checks behavior at scale.

The limit of any warning is the user's situation. If someone must reach a broken site to do their job, the fix is the site, not the wording.

## Common misconceptions

- **"Users ignore warnings anyway."** Field data show click-through rates from about 7% to about 70%, depending on the warning and its design.
- **"An extra confirmation click deters unsafe choices."** The field data suggested otherwise: people who start bypassing usually finish.
- **"Longer warnings explain more, so they work better."** In a large field study of email warnings, detailed text did no better than short text.
- **"If people understand a warning, they will comply."** Comprehension and adherence are separate. Deadlines and goals shape behavior, and adherence can improve without full understanding.
- **"The lock icon means the site is trustworthy."** It means the connection is encrypted to the named domain. A phishing site can have a perfectly valid [[certificate]].

## Try it yourself

This exercise uses your own browser and a public test site built for this purpose. Do not click through the warning.

1. In your browser, open `https://expired.badssl.com/`, a test page with a deliberately expired certificate. Repeat with `https://wrong.host.badssl.com/` and `https://self-signed.badssl.com/`.
2. Record each warning's headline, explanation, buttons, and which button is visually emphasized. Is the path onward hidden behind an "Advanced" link?
3. Walk one warning through the framework table above. At which step would a first-year student most likely fail?
4. Rewrite that warning in at most 50 words, stating the risk, the consequence, and one safe action.
5. If two friends agree to help, show them the original and your rewrite (as screenshots) and ask: "What is the risk, and what would you do?" Tell them in advance what you are testing; no deception is needed.

## Key takeaways

- A warning hands a decision to a person; first ask whether the system can make that decision itself.
- Field data show that warning effectiveness varies widely with design, from about 7% to about 70% click-through.
- Habituation and false alarms drain warnings of meaning, so keep them rare and accurate.
- Opinionated design, which visually promotes the safe choice, raised adherence even when comprehension stayed low.
- Test warnings with consenting participants for comprehension, then measure behavior in the field in aggregate.

## Go deeper

- Read Cranor's framework and apply all four of its steps (task identification, task automation, failure identification, failure mitigation) to a warning in a tool you use daily.
- Akhawe and Felt's data come from opt-in telemetry, which the authors note is not a random sample. How might that bias the rates, and in which direction?
- Open question: Felt and colleagues could raise adherence but not comprehension. Is a warning that people obey without understanding good enough, and for which decisions?
