---
topicId: HUM-02
title: Phishing education and measurement
summary: What the evidence says about phishing training and simulations, how to rate a simulated email's difficulty with the NIST Phish Scale, why click rate alone misleads, and how to run exercises ethically, without shaming anyone.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Compare common phishing learning tasks and state the evidence for and the limits of each.
  - Rate a simulated phishing email's detection difficulty using the cue and premise-alignment components of the NIST Phish Scale.
  - Explain why a click rate cannot be compared across campaigns without accounting for difficulty and audience.
  - Choose metrics, such as reporting rate and time to first report, that reflect the behaviors an organization needs.
  - Evaluate a simulation program against ethical requirements for notice, non-punitive treatment, and data handling.
prerequisites: [HUM-01, FND-08]
concepts: [security-awareness, phishing-simulation, embedded-training, phish-scale]
labs: [email-phishing-investigator]
keywords:
  - phishing simulation
  - phishing test
  - simulated phishing
  - security awareness training
  - SAT
  - embedded training
  - click rate
  - reporting rate
  - report button
  - Phish Scale
  - NIST TN 2276
  - NIST SP 800-50
  - CPLP
  - premise alignment
sources:
  - title: 'NIST Technical Note 2276: NIST Phish Scale User Guide'
    url: https://nvlpubs.nist.gov/nistpubs/TechnicalNotes/NIST.TN.2276.pdf
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'Phishing in Organizations: Findings from a Large-Scale and Long-Term Study (Lain, Kostiainen, and Capkun, IEEE S&P 2022)'
    url: https://arxiv.org/abs/2112.07498
    publisher: arXiv (author preprint)
  - title: 'NIST SP 800-50 Rev. 1: Building a Cybersecurity and Privacy Learning Program'
    url: https://csrc.nist.gov/pubs/sp/800/50/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'Phishing attacks: defending your organisation'
    url: https://www.ncsc.gov.uk/guidance/phishing
    publisher: National Cyber Security Centre (UK)
quiz:
  - question: A department's click rate fell from 18% in the spring simulation to 6% in the fall simulation. What should you establish before crediting the training?
    choices:
      - Whether the same employees opened both emails.
      - Whether the fall email went out on a Friday, when fewer people read mail.
      - Whether the two emails were of comparable difficulty for that department, for example by rating both with the Phish Scale.
      - Whether the click rate in other companies also fell.
    answer: 2
    explanation: A click rate is a joint property of the people and the email. An easier email, with more cues or a premise that does not fit the department's work, produces fewer clicks even if nobody learned anything. Compare campaigns of similar rated difficulty sent to the same audience.
  - question: In Lain, Kostiainen, and Capkun's 15-month study of more than 14,000 employees, what did they find about embedded training, the page shown right after someone clicks a simulated phish?
    choices:
      - It did not make employees more resilient, and trained employees clicked and took dangerous actions more often.
      - It cut clicks by more than half within three months.
      - It worked only when combined with detailed warnings.
      - It had no measurable effect on clicks but doubled reporting.
    answer: 0
    explanation: The study found no resilience benefit from embedded training and higher click and dangerous-action rates in the trained group, which is why the authors call for caution. Warnings and crowd-sourced reporting, by contrast, helped.
  - question: Why is time to first report often a more useful program metric than the overall click rate?
    choices:
      - It is easier to compute from mail-server logs.
      - It shows which employees are the most careful.
      - It does not depend on the content of the simulated email.
      - It measures how soon the security team could start removing a real campaign from inboxes, which limits how many people are exposed.
    answer: 3
    explanation: Some people will click any well-made phish. What protects the organization is how quickly someone reports it, because one early report lets the security team pull the message and block the link for everyone. Time to first report still varies with the email, so rate difficulty here too.
  - question: Which plan for a simulation program follows NIST SP 800-50 Rev. 1 and the UK NCSC guidance?
    choices:
      - Keep the program secret, and email each clicker's manager after every campaign.
      - Tell employees that exercises happen on a random basis, involve the legal team in the design, and never call out individuals.
      - Require anyone who clicks twice to repeat annual training before regaining email access.
      - Use lures announcing fake pay raises, since those produce the most clicks.
    answer: 1
    explanation: SP 800-50 Rev. 1 says exercises should not be punitive, no employee should be called out, employees should know exercises occur at random, and legal should review the design. NCSC warns that blame does not work and that people who fear for their jobs stop reporting.
  - question: An email with few cues whose premise closely matches the payroll team's daily work was clicked by 30% of payroll staff. What is the best interpretation?
    choices:
      - Payroll staff are careless and should be singled out for retraining.
      - The simulation was invalid and its results should be discarded.
      - The Phish Scale would rate this email very difficult for payroll, so a high click rate is expected; strengthen process controls and reporting rather than blaming the team.
      - Phishing training does not work for finance staff.
    answer: 2
    explanation: Few cues plus strong premise alignment is the Phish Scale's hardest combination. A high click rate on such an email says more about the email than about the people, and it points to controls, such as verification steps in payroll workflows, that work even when someone is fooled.
---

## Why it matters

Most organizations answer [[phishing]] with training and simulated campaigns, then report one number, the click rate, to leadership. The evidence says both the method and the number deserve skepticism.

Daniele Lain, Kari Kostiainen, and Srdjan Capkun ran a 15-month field study with 14,733 employees of one company, published at the IEEE Symposium on Security and Privacy in 2022. They found that [[embedded-training]], the common practice of showing a training page right after someone clicks a simulated phish, did not make employees more resilient. Employees who received it clicked, and took dangerous actions such as entering credentials, more often than those who did not. The same study found that warnings on suspicious emails reduced clicks, and that employees reporting suspicious messages detected new campaigns quickly.

Measurement adds its own traps. A click rate that falls between campaigns may mean people learned, or only that the second email was easier. And a program that shames people who click teaches them to hide mistakes, which is the opposite of what a security team needs.

## The core idea

[[security-awareness|Security awareness]] work aims at a short list of behaviors: notice a suspicious request, pause, verify through a trusted channel, and report. Measurement asks whether those behaviors happen. Three assumptions shape everything else:

1. **Some phishing will reach people and some will be clicked.** The UK National Cyber Security Centre (NCSC) puts it bluntly: "Some phishing attacks will always get through, so you should plan for incidents."
2. **A simulated email's result depends on how hard that email is for that audience.** The same message is a different test for a warehouse worker than for an accountant.
3. **How the organization treats people who click decides whether they report next time.**

A fire drill is a useful analogy. Everyone knows drills happen, though not when. Nobody is fired for being slow on the stairs. The drill measures how fast the building empties and which exits jam, then fixes the exits. A well-run [[phishing-simulation]] has the same shape: the program is announced, the organization's response is measured, and the findings improve processes and tools rather than rank people.

## How it works

### Learning tasks and what the evidence says

The table compares common tasks. "Evidence" means published findings, not vendor claims.

| Learning task                              | What it builds                                  | Evidence and limits                                                                     |
| ------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| Awareness module or briefing               | Knowledge of common lures and how to report     | Knowing what to do does not guarantee doing it under time pressure                       |
| Labeled cue-spotting exercises             | Recognition of cues in examples                 | Real attacks can carry few cues, and few-cue emails are harder to detect                 |
| Simulation with embedded training          | A "teachable moment" right after a click        | No resilience gain in the Lain et al. field study; trained employees clicked more        |
| Simulation with reporting feedback         | The reporting habit, and trust that it matters  | Practices the behavior you want; the NCSC stresses quick feedback to reporters           |
| Warnings in the mail client                | Help at the moment of decision                  | Reduced clicks in the same study; detailed text did no better than short text            |
| Verification drills for risky workflows    | The procedure that stops fraud when a person is fooled | Needs a real procedure, such as a payment-change callback, to practice           |

The authors of the field study draw a cautious conclusion: "We call for caution in the deployment of methods like embedded phishing exercises and training." One study at one company does not settle the question, but it shifts the burden of proof onto anyone who claims a method works.

### Rating difficulty with the NIST Phish Scale

NIST's [[phish-scale|Phish Scale]], described in NIST Technical Note 2276 (2023), rates how hard a phishing email is for a person to detect. It has two components.

- **Cues.** Observable features of the email, grouped into five types: errors, technical indicators, visual presentation, language and content, and common tactics. The guide lists 23 cues. A total of 1 to 8 is "Few," 9 to 14 is "Some," and 15 or more is "Many." Fewer cues mean a harder email.
- **Premise alignment.** How closely the email's story matches the recipient's work roles and responsibilities. Five elements are each scored from 0 to 8. The rating is the sum of the first four minus the fifth, which accounts for training or warnings the audience has already received about this kind of message. A total of 10 or less is "Weak," 11 to 17 is "Medium," and 18 or more is "Strong."

The two components combine into a detection difficulty rating:

| Cues | Strong alignment | Medium alignment     | Weak alignment                 |
| ---- | ---------------- | -------------------- | ------------------------------ |
| Few  | Very difficult   | Very difficult       | Moderately difficult           |
| Some | Very difficult   | Moderately difficult | Moderately to least difficult  |
| Many | Moderately difficult | Moderately difficult | Least difficult            |

The guide's point is interpretive. A high click rate on a very difficult email is expected. A high click rate on a least difficult email may indicate that the audience needs different or additional training. Because premise alignment depends on the recipient, the same email can be very difficult for one team and easy for another.

### Metrics and how each misleads

The guide observes that click and reporting rates on their own "provide a single point of insight." Use several measures, and read each against the email's difficulty.

| Metric                   | What it measures                                  | How it misleads                                                              |
| ------------------------ | ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Click rate               | Share of recipients who clicked                   | Moves with email difficulty; easy to "improve" by sending easier emails       |
| Dangerous-action rate    | Share who entered credentials or opened a payload | Closer to harm, but tooling may miss or overcount actions                    |
| Reporting rate           | Share who reported the email                      | Rises if people report everything, so read it with report accuracy            |
| Time to first report     | Minutes until the first report arrives            | One fast reporter can hide a slow organization; also track later reports       |
| Report accuracy          | Share of all reports that were really phishing    | Raising it by discouraging "unnecessary" reports suppresses reporting        |

Reporting turns employees into a distributed sensor. In the field study, 4,260 of the 14,733 participants reported at least one email, and on average about 10% of reports arrived within 5 minutes and 30% to 40% within 30 minutes. Reports were correct about 68% of the time on average. The diagram shows why speed matters more than perfection: one early report protects everyone who has not yet opened the message.

```sequence
title: Crowd-sourced detection of a real campaign (fictional)
participant M as Mallory
participant E as Employees at shop.example
participant S as Security team
M -> E: Phishing email reaches 300 inboxes
E -> S: First reports arrive within minutes
note S: Reports are grouped into one campaign
S -> E: Message removed from every inbox
S --> E: Reporters thanked and told what was done
M -x E: Later clicks reach a blocked link
```

### The ethics of simulated phishing

A simulation deceives employees on purpose, so it needs the same care as any deception: a clear purpose, a fair process, and limits.

- **Notice.** NIST SP 800-50 Rev. 1 says employees should be told that the organization conducts phishing exercises on a random basis, and that the legal team should help design and review them. The program is announced even though individual emails are not.
- **No shaming.** The same publication says these activities "should not be punitive, nor should any employee be called out for their response." The NCSC adds that "blaming users for clicking on links doesn't work," that "Employees who are afraid for their jobs will not report mistakes," and that punishing people for clicking emails you sent "starts to resemble entrapment."
- **Fair lures.** Avoid premises that promise real benefits, such as a raise, or exploit real distress. They teach people to distrust genuine messages from their employer and erode the trust that reporting depends on.
- **Data handling.** Individual results are sensitive personnel data. Report aggregates, restrict access, and use individual data only to offer support.
- **Research is different.** The Lain et al. study was approved by the company's chief information security officer. Employees were not told about the study, so as not to change their behavior, and there was no informed consent or debriefing. The authors judged the scientific value worth the costs. At a US university, research with human participants normally goes to an institutional review board ([[irb|IRB]]), which decides whether consent may be waived, and reasonable people still debate where that line belongs.

## Worked example

> [!NOTE]
> The organization, the email, and every number below are fictional.

**Setting.** The security team at shop.example, an online retailer with 400 staff, sent a quarterly simulation titled "Delivery exception: confirm the pickup address." Two proposals for the program are on the table.

- **Proposal A:** keep the monthly click rate as the headline metric, auto-enroll every clicker in a training module, and send managers a list of repeat clickers.
- **Proposal B:** rate every simulation with the Phish Scale, track reporting rate and time to first report, thank reporters within the hour, and name no individuals.

**Step 1: Collect results by audience.**

| Group     | Recipients | Clicked  | Entered credentials | Reported  |
| --------- | ---------- | -------- | ------------------- | --------- |
| Warehouse | 100        | 24 (24%) | 10 (10%)            | 18 (18%)  |
| Office    | 300        | 21 (7%)  | 6 (2%)              | 81 (27%)  |
| Total     | 400        | 45 (11%) | 16 (4%)             | 99 (25%)  |

The first report arrived 3 minutes after sending.

**Step 2: Rate difficulty for each audience.** The team counts 6 cues, so the cue category is Few. Warehouse staff handle delivery exceptions every day, so premise alignment for them is Strong. Office staff rarely do, so their alignment is Weak. From the table, the email is very difficult for the warehouse and moderately difficult for the office.

**Step 3: Interpret.** The warehouse's 24% click rate on a very difficult email is not evidence of careless people. It shows that this premise fits their workflow, which is exactly what an attacker would exploit. The fix is a control in that workflow: address changes for pickups are confirmed through the carrier's portal, never through a link in an email. For trend tracking, the office's 7% should be compared with earlier office results on emails that were also rated moderately difficult.

**Step 4: Look past clicks.** A quarter of staff reported the email, and the first report came in 3 minutes. Had the campaign been real, the team could have removed it from inboxes before most people opened it. That is the number to grow.

**Step 5: Choose a proposal.** The evidence favors Proposal B. Proposal A's headline metric rewards sending easier emails, its automatic training resembles the embedded training that showed no benefit in the field study, and its manager lists conflict with SP 800-50 Rev. 1's rule against calling out individuals and with the NCSC's warning that fear stops reporting.

## In practice

- **Treat training as one layer.** The NCSC recommends layered defenses: make it hard for phishing to reach users, help users identify and report it, limit the harm of emails that get through, and respond quickly. Its case study concludes that relying on any single layer would have missed some attacks.
- **Make reporting one click, and close the loop.** The NCSC asks whether the reporting process is "clear, simple and quick to use" and advises telling reporters what action was taken.
- **Compare like with like.** Rate every simulation, and compare results only across emails of similar difficulty sent to similar audiences.
- **Watch small numbers.** In a team of 20, one extra click moves the rate by 5 percentage points. Track trends over several campaigns before drawing conclusions, as the lesson on [measurement and uncertainty](lesson:FND-08) explains.
- **Support people who struggle.** The NCSC advises: "Don't reprimand users who are struggling to recognise phishing emails." Offer help, and look for workflow fixes.

The limit of every simulation program is that it measures responses to the emails you chose to send. Real attackers pick premises you never tested, which is why process controls and phishing-resistant authentication matter as much as practice.

## Common misconceptions

- **"A falling click rate proves the program works."** Without comparable difficulty and audience, a falling rate may only mean the emails got easier.
- **"Embedded training is standard, so it must help."** In a large, long-term field study, it brought no gain and was associated with more clicks.
- **"Naming repeat clickers motivates them."** Fear suppresses reporting, and NIST guidance says no one should be called out.
- **"Simulations must be secret to be valid."** The program can be announced while individual emails stay unannounced, as NIST recommends.
- **"Someone who clicked has failed."** A person who clicks and then reports at once has given the security team exactly what it needs. Celebrate the report.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test. Never send simulated phishing to classmates, friends, or coworkers: real programs need organizational authorization, legal review, and announced policies.

[The lab](lab:email-phishing-investigator) is practice in judging messages on evidence, not a phishing simulation: nothing is sent to anyone. You triage three fictional messages in an abuse mailbox, reading each one's SPF, DKIM, and DMARC results, sender headers, and links, then press **Report as phishing** or **Mark as safe**. The scoreboard counts correct verdicts, false positives, and missed phish.

1. **Count cues first.** Before pressing **Reveal red flags**, count each message's cues, as the worked example does. Which could a recipient see without reading headers?
2. **Judge evidence, not tone.** Two messages pass all three checks; only one is safe. What gives the [[display-name-spoofing|display-name spoof]] away, and why is the overdue invoice's urgency no proof of phishing?
3. **Read it as a measurement.** If an employee reported the invoice, which metric in the metrics table falls, and how should the security team respond?

**Without the lab.** On paper:

1. **Rate two emails.** For the fictional payment-change and mailbox-deactivation emails in [social-engineering mechanisms](lesson:HUM-01), count the visible cues using the cue list in NIST TN 2276 and place each total in Few, Some, or Many. Judge premise alignment (Weak, Medium, or Strong) for an accounts-payable clerk and a first-year student, then look up each difficulty.
2. **Read the numbers fairly.** Compute the worked example's click rate without the warehouse group, and explain why the overall rate is a poor headline number here.
3. **Design a dashboard.** Choose four metrics for a quarterly report to leadership, with one sentence on what each shows and one on how it could mislead.
4. **Write an ethics checklist.** List at least six requirements a simulation program must meet before launch, covering notice, legal review, lure choice, data access, support for people who click, and acknowledging reports.

## Key takeaways

- Phishing education should target behaviors (pause, verify, report), and its measures should track those behaviors, not just clicks.
- A click rate is a property of the email and the audience together; rate difficulty with the Phish Scale before comparing campaigns.
- Reporting rate and time to first report measure the organization's ability to catch real campaigns early.
- In a large field study, embedded training brought no benefit while warnings and crowd-sourced reporting helped.
- Ethical programs are announced, non-punitive, legally reviewed, and careful with individual data.

## Go deeper

- Read the methodology and ethics discussion in Lain, Kostiainen, and Capkun. Was running the study without informed consent justified? What design would have preserved realism while respecting participants?
- The Phish Scale depends on human judgment, especially for premise alignment. How would you test whether two raters give the same email the same rating, and what would you do if they disagree?
- NIST SP 800-50 Rev. 1 asks programs to measure behavior change over time. Sketch a longitudinal design that separates the effect of training from changes in email difficulty and staff turnover.
