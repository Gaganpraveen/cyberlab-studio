---
topicId: HUM-07
title: Security culture and reporting
summary: How an organization's shared beliefs about security decide whether people report mistakes, suspicious messages, and incidents, and how to design a reporting and escalation process that is easy to use, fair to reporters, and closes the loop.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how psychological safety and an organization's response to earlier reports shape whether people report security problems.
  - Design a reporting route and an escalation matrix with fact-based triggers, named owners, response targets, and feedback to reporters.
  - Contrast a blameless post-incident review with a search for someone to blame, and explain the effect of each on future reporting.
  - Choose metrics for a reporting process and explain how each one could mislead.
prerequisites: [HUM-02, OPS-05]
concepts: [security-culture, psychological-safety]
keywords:
  - security culture
  - cyber security culture
  - reporting culture
  - psychological safety
  - speaking up
  - blameless culture
  - blameless postmortem
  - post-incident review
  - incident reporting
  - escalation matrix
  - escalation path
  - severity levels
  - near miss
  - report phishing button
  - NCSC cyber security culture principles
sources:
  - title: Cyber security culture principles
    url: https://www.ncsc.gov.uk/collection/cyber-security-culture-principles
    publisher: National Cyber Security Centre (UK)
  - title: 'Principle 2: Build the safety, trust and processes to encourage openness around security'
    url: https://www.ncsc.gov.uk/collection/cyber-security-culture-principles/principle-2
    publisher: National Cyber Security Centre (UK)
  - title: 'Postmortem Culture: Learning from Failure (Lunney and Lueder, Site Reliability Engineering, chapter 15)'
    url: https://sre.google/sre-book/postmortem-culture/
    publisher: Google and O'Reilly Media
    license: CC BY-NC-ND 4.0
  - title: 'Phishing attacks: defending your organisation'
    url: https://www.ncsc.gov.uk/guidance/phishing
    publisher: National Cyber Security Centre (UK)
  - title: 'Phishing in Organizations: Findings from a Large-Scale and Long-Term Study (Lain, Kostiainen, and Capkun, IEEE S&P 2022)'
    url: https://arxiv.org/abs/2112.07498
    publisher: arXiv (author preprint)
quiz:
  - question: Two weeks after a manager publicly reprimanded an employee who clicked a phishing link, phishing reports at a fictional company fell by half. What is the most likely explanation?
    choices:
      - The reprimand made everyone more careful, so fewer phishing emails reached inboxes.
      - Attackers happened to send fewer phishing emails during those two weeks.
      - Staff learned that speaking up carries a risk, so some stopped reporting while the problems continued.
      - The reprimand improved report accuracy, which is the only reporting metric that matters.
    answer: 2
    explanation: Reports measure what people choose to tell you, not how many attacks arrive. The NCSC warns that employees who fear for their jobs will not report mistakes, and the SRE book says a culture of blame keeps issues from coming to light. A drop in reports right after a punishment is a warning sign.
  - question: Which escalation trigger is best written?
    choices:
      - Escalate to High when a password was entered on an untrusted page or customer data left the organization.
      - Escalate to High when the reporter seems worried or upset about what happened.
      - Escalate every report from employees hired in the last three months.
      - Escalate whenever the analyst on duty has spare time to look into it.
    answer: 0
    explanation: Good triggers rest on facts about what happened, so different analysts reach the same decision. Triggers based on mood or workload are inconsistent, and triggers based on who the reporter is are unfair.
  - question: In a blameless review of a phishing incident, which question fits best?
    choices:
      - Who is responsible for the click, and what disciplinary action would fit the harm?
      - How can we make sure the person who clicked never clicks a link like this again?
      - Since the incident was contained quickly, is a review worth anyone's time at all?
      - Why did the email and page seem legitimate, and what change would stop the attack even when someone is fooled?
    answer: 3
    explanation: The SRE book says a blameless review focuses on contributing causes without indicting any individual and assumes people acted in good faith with the information they had. Fixes such as phishing-resistant sign-in protect everyone, including the next person who is fooled.
  - question: Which measure best indicates whether people feel safe reporting their own mistakes?
    choices:
      - The share of staff who completed this year's security awareness training on time.
      - How often people report their own slips, such as "I clicked," and how that changes after incidents.
      - The click rate in the most recent phishing simulation, compared with last quarter's.
      - The number of firewall rule changes the security team approved this quarter.
    answer: 1
    explanation: Self-reports are psychological safety in action. Training completion and click rates say nothing about whether someone who slips will admit it, and a fall in self-reports after a harsh response is an early warning.
  - question: An employee reports a suspicious email that turns out to be a harmless newsletter. What is the best response?
    choices:
      - Thank the employee, explain briefly why it was safe, and encourage them to keep reporting.
      - Ask the employee to check more carefully before reporting anything next time.
      - Close the report without replying, since the email was not a threat.
      - Enroll the employee in extra training on recognizing phishing emails.
    answer: 0
    explanation: The NCSC advises following up with reporters to thank them and give feedback on any action taken. A false alarm costs a few minutes; discouraging the reporter can cost the next real report.
---

## Why it matters

Security teams cannot see much of what goes wrong. They learn about a convincing [[phishing]] email, a file shared with the wrong person, a lost laptop, or a stranger in a restricted area mainly because someone chose to tell them. In a 15-month field study of 14,733 employees at one company, Daniele Lain, Kari Kostiainen, and Srdjan Capkun found that employees who reported suspicious emails detected new phishing campaigns quickly: on average about 10% of reports arrived within 5 minutes. Each of those reports was a decision to speak up.

Whether people make that decision depends on what they expect to happen next. The UK National Cyber Security Centre (NCSC) warns that "Employees who are afraid for their jobs will not report mistakes." Google's book on site reliability engineering (SRE) makes the same point about engineering failures: where finger pointing and shaming prevail, "people will not bring issues to light for fear of punishment." Punishment also teaches more than the person punished. Colleagues see what happens and may decide that speaking up is not worth the risk.

That makes culture a security control. It decides how quickly an organization learns that something is wrong, and so how much damage is done before anyone acts.

## The core idea

[[security-culture|Security culture]] is the set of shared beliefs, norms, and habits that shape how people in an organization think and act about security, including what they expect to happen when they raise a problem. Policies say what people should do; culture is what they do when nobody is checking. [[security-awareness|Security awareness]] training, covered in the lesson on [phishing education](lesson:HUM-02), teaches people what to report. Culture decides whether they report it.

The foundation of reporting is [[psychological-safety]], which the NCSC, quoting Professor Amy C. Edmondson, describes as the "belief that one will not be punished or humiliated for speaking up with ideas, questions, concerns or mistakes."

Three assumptions guide the design of a reporting process:

1. **People will make mistakes, and they will see things the security team cannot.** The question is not whether problems happen but whether you hear about them.
2. **People report when reporting is easy, safe, and worthwhile.** Every barrier, whether a confusing form, a cold reply, or no visible result, costs some reports.
3. **The response to each report is the real policy.** People judge what will happen to them by what happened to the last person who spoke up, whatever the handbook says.

Safety-critical fields offer a useful analogy. The SRE book notes: "Blameless culture originated in the healthcare and avionics industries where mistakes can be fatal." In those fields, a near miss, an error caught before it caused harm, is a cheap lesson when it is reported and studied. One that is hidden waits to happen again with worse luck.

## How it works

### Culture principles

In 2025 the NCSC published six cyber security culture principles. Their titles, lightly shortened, appear below. The right-hand column is this lesson's reading of what each means for reporting, not NCSC text.

| NCSC principle                                          | What it implies for reporting                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1. Frame cyber security as an enabler                    | Reporting is part of doing the job well, not an admission of failure           |
| 2. Build the safety, trust and processes to encourage openness | People can admit mistakes and raise concerns without punishment or humiliation |
| 3. Embrace change                                        | Reports feed improvements as threats and tools change                          |
| 4. Social norms promote secure behaviours                | People see colleagues report and get thanked for it                            |
| 5. Leaders take responsibility for their impact on culture | Leaders mention their own slips and thank reporters in public                |
| 6. Well-maintained, accessible rules and guidelines      | People know what to report and where, because the guidance is short and current |

Principle 2 matters most for reporting. It states that "Incidents are investigated with a view to learn and improve, not to blame" and that "People involved in an incident are treated fairly, with no punishment for innocent mistakes."

### The reporting loop

A reporting process is a loop, not a mailbox. Each step either rewards the reporter or teaches them not to bother:

1. **Notice.** Someone sees something odd: a strange email, a door propped open, a mistake of their own.
2. **Report.** They use a route that is quick and obvious. The NCSC suggests routes "such as help desks, reporting portals or local security experts," and warns: "These routes should be tested to reduce any friction that may cause people to give up and avoid future contact."
3. **Acknowledge.** The reporter learns at once that the report arrived and what happens next.
4. **Triage.** Someone decides how serious the report is and who owns it, a step called [[triage]].
5. **Act.** The owner contains, fixes, or closes the issue, escalating when needed.
6. **Close the loop.** The NCSC advises: "Follow up with reporters to thank them and provide feedback on any action taken."
7. **Learn.** Patterns across reports and reviews lead to changes in systems, processes, and guidance.

A good report asks little of the reporter: what they saw, when, what they did (for example, "I clicked" or "I entered my password"), and how to reach them. Do not make people classify the problem first. Someone forced to choose between "phishing," "spam," and "malware" may give up, and the security team is better placed to decide anyway.

### Escalation

Escalation moves a report to people with more authority or expertise when the stakes require it. A written escalation matrix makes those decisions fast and consistent, and three rules make it fair:

- **Trigger on facts, not people.** "A password was entered on an untrusted page" is a trigger. "The reporter seemed nervous" and "new hires make more mistakes" are not.
- **Escalate when unsure.** Downgrading a report later costs minutes; under-reacting to a real incident can cost far more.
- **Name owners and time targets.** Every level needs a person or rota who answers, and a target for the first response.

When a report turns out to be a [[security-incident]], the organization's [[incident-response]] plan takes over.

### Blameless review

After a significant report or incident, a [[post-incident-review]] asks what happened and how to prevent a repeat. The SRE book sets the standard: a truly blameless postmortem "must focus on identifying the contributing causes of the incident without indicting any individual or team for bad or inappropriate behavior," and it "assumes that everyone involved in an incident had good intentions and did the right thing with the information they had."

In practice, that means replacing "Who did this?" with questions such as "Why did this action make sense at the time?" and "What made the mistake easy and the attack hard to spot?" The answers often point at systems: a login page that a fake can imitate, a payment process with no second check, a policy nobody could find.

Blameless does not mean anything goes. Deliberate harm, such as sabotage or theft, is handled through a separate, fair process like the one in the lesson on [insider risk](lesson:HUM-06). What a blameless culture promises is narrower and more important: honest mistakes and good-faith reports are never punished.

### Measuring the reporting process

Measure the loop, not just the attacks. Each metric below can mislead when read alone.

| Metric                             | What it shows                                  | How it can mislead                                                            |
| ---------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Time to acknowledge                | Whether reporters hear back quickly            | An instant automatic reply can hide days of silence before a person responds  |
| Share of reporters told the outcome | Whether the loop actually closes              | Easy to inflate with generic messages that say nothing                        |
| Report volume                      | Willingness to speak up                        | A rise may mean more trust, not more attacks; a fall may mean fear or friction |
| Self-reported mistakes             | Psychological safety in action                 | Low numbers look good but may mean mistakes are being hidden                  |
| Repeat contributing causes         | Whether review actions are done and work       | Depends on how consistently reviews record causes                             |

## Worked example

> [!NOTE]
> shop.example, its staff, and every event below are fictional.

**Setting.** shop.example, an online retailer with 400 staff, wants a reporting and escalation process that people will actually use. It writes the matrix below. The time targets are the company's own choices, not an industry standard.

| Level    | Example triggers (facts, not people)                                                  | Owner                             | First response           | Who is told                                       |
| -------- | ------------------------------------------------------------------------------------- | --------------------------------- | ------------------------ | ------------------------------------------------- |
| Low      | Suspicious email reported, nothing clicked; spam                                      | Security mailbox rota             | Same business day        | Reporter                                          |
| Medium   | Link clicked but nothing entered; encrypted laptop lost; internal email to the wrong colleague | On-duty analyst          | Within 4 hours           | Reporter; manager if action is needed             |
| High     | Password entered on an untrusted page; malware alert; customer data sent outside the company | On-duty analyst and incident lead | Within 30 minutes | Incident lead, system owner, privacy lead for data |
| Critical | Signs that an account is being misused now; ransomware; many customers' data exposed  | Incident lead                     | Immediately, at any hour | Leadership, legal, and privacy, as the incident plan sets out |

**The report.** On a Tuesday morning, Bob in accounts payable opens an email that appears to come from a supplier, follows a link to what looks like the finance portal, and types his password. The page shows an error, and Bob notices the address was wrong. He presses the "Report suspicious email" button and adds: "I entered my password. Sorry."

```sequence
title: A reported phishing click at shop.example (fictional)
participant B as Bob
participant R as Report button
participant S as Security analyst
participant L as Incident lead
B -> R: Report: "I entered my password"
R --> B: Thanks, and what happens next
R -> S: Report with the original email attached
note S: Matrix says High: password entered
S -> L: Escalates within 30 minutes
note S: Reset password, end sessions, pull the email
L --> S: No misuse found; contained
S --> B: Personal thanks and the outcome
```

**Triage and action.** Alice, the on-duty analyst, rates the report High because a password was entered on an untrusted page. She resets Bob's password, ends his active sessions, checks recent sign-ins to his account for unfamiliar activity, removes the same email from the 37 other inboxes that received it, and blocks the link. The incident lead finds no sign the password was used, and the incident is closed as contained.

**Closing the loop.** Alice calls Bob to thank him and explain what was done. The weekly staff note says: "A colleague's quick report let us remove a fake supplier email from 37 inboxes before anyone else entered a password. Thank you." It does not name Bob.

**The blameless review.** The review asks why the attack worked, not who failed:

- The email copied the supplier's real invoice format, so nothing in it looked unusual to someone who handles invoices all day.
- The finance portal accepted a password alone, so a stolen password was enough.
- The fake page's address was the only clue, and it was easy to miss on a busy morning.

The actions have owners and dates: move the finance portal to phishing-resistant sign-in with [[passkey|passkeys]], label email from outside the company, and confirm any change to a supplier's bank details through [[out-of-band-verification]], calling a number already on file, as in the lesson on [social-engineering mechanisms](lesson:HUM-01). "Retrain Bob" is not on the list. He did the most useful thing anyone in his position could have done.

## In practice

- **Make the first report effortless.** Offer one button in the mail client, one phone number for urgent problems, and no required categories.
- **Answer every report.** Acknowledge at once, tell people the outcome, and thank them even when the report was a false alarm.
- **Never punish good-faith reports.** Keep reviews separate from performance management, and say so in writing.
- **Let leaders go first.** Managers who mention their own near misses and praise reporters show that speaking up is safe. The NCSC's fifth principle asks leaders to take responsibility for the impact they have on security culture.
- **Test the route.** The NCSC advises testing reporting routes for friction. Check regularly that the button works, that reports reach a person, and that replies go out.
- **Watch for warning signs.** Reports drop after a disciplinary case, people quietly message a friend in IT instead of using the route, or someone says, "I didn't want to bother anyone."

Culture has limits. It cannot replace technical controls: even the best reporting culture still needs phishing-resistant authentication, good logging, and backups. A small team can also be swamped by reports, so group duplicates automatically and say so in the acknowledgement rather than discouraging people from reporting.

## Common misconceptions

- **"Punishing mistakes makes people careful."** It mostly makes them quiet. The mistakes continue; the reports stop.
- **"No reports means no problems."** Silence can mean friction, fear, or a mailbox nobody monitors.
- **"Security culture means posters and annual training."** Culture shows in what happens after someone speaks up.
- **"Blameless means nobody is accountable."** Blameless reviews give every fix an owner and a deadline, and deliberate misconduct goes through a separate, fair process.
- **"Only confirmed incidents are worth reporting."** False alarms and near misses are cheap lessons, and every answered report keeps the route open for the one that matters.

## Try it yourself

Design a reporting and escalation process on paper for the fictional Harbor Food Bank (harbor.example), a nonprofit with 6 staff and 40 volunteers who share laptops and a donor database.

1. **Routes.** Choose one route for urgent reports and one for everything else. Write the automatic acknowledgement, in at most 60 words, that thanks the reporter and says what happens next.
2. **Matrix.** Write three or four levels with triggers stated as facts, an owner for each level (the food bank has no security team), and a first-response target.
3. **Promise.** Write a two-sentence no-blame statement for volunteers, and one sentence on how deliberate misuse is handled instead.
4. **Walk-through.** Run three fictional reports through your process and record the level, the first action, and the feedback the reporter receives:
   - a volunteer forwards a "your password expires today" email without clicking;
   - the treasurer realizes she emailed the donor spreadsheet to the wrong address;
   - a laptop with saved logins is stolen from a car.
5. **Metrics.** Pick three measures for the first six months, and for each write one sentence on how it could mislead.

## Key takeaways

- Security teams learn about many mistakes and attacks only because someone chose to speak up; culture decides whether people do.
- Psychological safety, the belief that speaking up will not bring punishment or humiliation, is the foundation of reporting.
- A reporting process is a loop: easy routes, quick acknowledgement, fact-based triage and escalation, action, feedback to the reporter, and learning.
- Blameless reviews look for contributing causes in systems rather than people to blame, and honest mistakes and good-faith reports are never punished.
- Measure the loop itself, and treat a fall in reports as a possible warning sign rather than proof of safety.

## Go deeper

- Read the NCSC's six culture principles and the implementation suggestions under Principle 2. Which three could a small organization adopt this month?
- Read the SRE book's chapter on postmortem culture. Which of its triggers for writing a postmortem would make sense for security events, and what would you add?
- Open question: how should an organization keep its no-blame promise when an honest mistake seriously harms customers?
