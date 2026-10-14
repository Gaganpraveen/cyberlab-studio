---
topicId: FND-08
title: Security measurement and uncertainty
summary: Learn to separate evidence, assumptions, metrics, and unsupported claims, see why detectors and dashboards mislead when base rates are ignored, and report security numbers with honest uncertainty.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Classify statements in a security report as evidence, assumptions, metrics, or unsupported claims.
  - Calculate a detector's precision from its error rates and the base rate, and explain why precision changes with traffic volume.
  - Compute and interpret a confidence interval for a measured rate, including the case of zero events.
  - Evaluate whether a security metric is a sound proxy for the goal it claims to track.
  - Rewrite a misleading security claim as an honest statement of evidence, method, and uncertainty.
prerequisites: [FND-01, FND-02]
concepts:
  - security-metric
  - proxy-metric
  - base-rate-fallacy
  - precision
  - recall
  - false-positive
  - false-negative
  - confidence-interval
  - calibration
keywords:
  - security metrics
  - security measures
  - measurement
  - uncertainty
  - evidence
  - assumptions
  - unsupported claims
  - base rate
  - base-rate neglect
  - Bayes' theorem
  - positive predictive value
  - true positive rate
  - false positive rate
  - false alarm
  - accuracy paradox
  - confidence interval
  - Wilson score interval
  - rule of three
  - calibration
  - Goodhart's law
  - proxy metric
  - NIST SP 800-55
  - NIST SP 800-30
  - EPSS
sources:
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 36: Intrusion Detection'
    url: https://textbook.cs161.org/network/intrusion-detection.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'NIST SP 800-55 Vol. 1: Measurement Guide for Information Security, Volume 1: Identifying and Selecting Measures (December 2024)'
    url: https://csrc.nist.gov/pubs/sp/800/55/v1/final
    publisher: National Institute of Standards and Technology (NIST)
  - title: 'NIST SP 800-30 Rev. 1: Guide for Conducting Risk Assessments'
    url: https://csrc.nist.gov/pubs/sp/800/30/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-30
  - title: 'Using EPSS (Exploit Prediction Scoring System)'
    url: https://www.first.org/epss/using-epss.html
    publisher: FIRST (Forum of Incident Response and Security Teams)
  - title: 'Data Protection: Actions Taken by Equifax and Federal Agencies in Response to the 2017 Breach (GAO-18-559)'
    url: https://www.gao.gov/products/gao-18-559
    publisher: U.S. Government Accountability Office
quiz:
  - question: An intrusion detector misses 2% of attacks and flags 0.1% of benign requests. A site receives 10 million requests a day, 5 of them attacks. About what share of the detector's alerts are real attacks?
    choices:
      - About 98%, because it catches 98% of attacks.
      - About 99.9%, because it flags only 0.1% of benign requests.
      - About 0.05%, because roughly 10,000 false alarms bury about 5 real ones.
      - It cannot be estimated without knowing who the attackers are.
    answer: 2
    explanation: Expect about 4.9 true alerts (98% of 5) and about 10,000 false alarms (0.1% of 9,999,995 benign requests), so precision is about 4.9 out of 10,005 alerts, or 0.05%. The detector's error rates did not change; the rarity of attacks did the damage. Ignoring that is the base-rate fallacy.
  - question: A vendor's slide says, "Our AI stops 99.9% of threats." It gives no test method, data set, or definition of a threat. How should you classify the statement?
    choices:
      - An unsupported claim, because it offers no method or evidence that anyone could check.
      - Evidence, because it gives a specific number.
      - A metric, because it is a percentage.
      - An assumption, safe to adopt until someone disproves it.
    answer: 0
    explanation: A number is not evidence by itself. To become a metric, the claim needs a definition of a threat, the traffic it was measured on, a method, and data someone else could check. Ask for the denominator, the false-positive rate, and who ran the test.
  - question: In a phishing simulation, 12 of 400 staff clicked (3.0%). Next quarter, with a different email, 8 of 400 clicked (2.0%). The 95% confidence intervals are about 1.7% to 5.2% and 1.0% to 3.9%. What is the most defensible conclusion?
    choices:
      - Training cut the click rate by a third.
      - Training made no difference, because the intervals overlap.
      - Simulations cannot measure anything, so the numbers should be dropped.
      - These data cannot tell whether behavior changed, because the drop is within chance and the email changed too.
    answer: 3
    explanation: The intervals overlap heavily, so chance alone could explain the drop, and a different email may have been easier or harder to spot. Overlap does not prove there was no effect either; it means these samples cannot distinguish. Keep the method fixed and keep measuring.
  - question: A dashboard shows zero detected intrusions this year. Which question best tests whether that number means the network is safe?
    choices:
      - How many intrusions did last year's dashboard show?
      - Did the detection tools see the traffic they were meant to inspect, and were they tested with known, authorized test events?
      - How much did the detection tools cost?
      - Is zero lower than the industry average?
    answer: 1
    explanation: A count of detected intrusions measures the detectors as much as the network. At Equifax, an expired certificate let encrypted traffic pass uninspected, and the attack lasted about 76 days before it was discovered. Check coverage and test detection before trusting a zero.
  - question: A team is rewarded for closing vulnerability tickets within 30 days. Its on-time closure rate jumps from 60% to 95%, mostly because tickets are now closed as "risk accepted." What went wrong?
    choices:
      - Nothing, because 95% is better than 60%.
      - The 30-day window was too long.
      - The metric became a target, so people improved the number instead of the outcome.
      - Ticket systems cannot record security work.
    answer: 2
    explanation: Closing a ticket as accepted risk moves the number as easily as fixing the flaw. Once a proxy becomes a target it can be gamed, an effect often called Goodhart's law. Pair the speed metric with quality checks, such as verified fixes and a sample audit of accepted risks.
---

## Why it matters

Sooner or later someone asks a security team, "Are we more secure than last year?" The answer usually arrives as numbers: attacks blocked, systems patched, phishing click rates. Numbers feel objective. But a number can be precise and still wrong, correctly computed and still irrelevant, or meaningless without a sense of how much it could vary.

In the 2017 Equifax breach, a digital certificate on a traffic inspection tool had expired about 10 months before the breach, and a misconfiguration allowed "encrypted traffic to pass through the network without being inspected." The attackers ran commands and removed data over encrypted connections, and the attack lasted about 76 days before it was discovered ([GAO-18-559](https://www.gao.gov/products/gao-18-559)). Any count of alerts from that tool measured its blindness, not the network's safety.

Even formal risk assessments, NIST warns, "are often not precise instruments of measurement"; they reflect the limits of the method, the quality and subjectivity of the data, and the assessors' expertise ([NIST SP 800-30 Rev. 1](https://csrc.nist.gov/pubs/sp/800/30/r1/final)). This lesson teaches you to ask what a security number supports, how wrong it might be, and how to report it honestly.

## The core idea

Every statement in a security report is one of four kinds, and each calls for a different question. Suppose the fictional shop.example reports on [[mfa|multi-factor authentication]] (MFA) for its staff:

| Kind              | What it is                                                                   | Example                                                                     | Your next question                                  |
| ----------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- |
| Evidence          | An observation with a known source, scope, and date that others can re-check | "September 30 identity-system export: MFA enforced on 412 of 430 staff accounts." | Can I see the source?                               |
| Assumption        | Something taken as true here without being checked                           | "The identity system holds every staff account."                            | What if it is false?                                |
| Metric            | A defined quantity computed from evidence by a stated method                 | "MFA coverage: 95.8% (412 of 430), measured monthly."                       | What are the numerator, denominator, and source?    |
| Unsupported claim | An assertion with no evidence or method behind it                            | "Our accounts are basically unhackable."                                    | What evidence would change your mind?               |

A [[security-metric]] inherits every assumption beneath it. If 30 contractor accounts without MFA live in a separate system, the 95.8% is computed correctly and still overstates coverage: the true figure is 412 of 460, or 89.6%. The arithmetic was fine; the denominator was not.

The central rule follows: **a measurement worth reporting has three parts: the value, how it was obtained, and how far off it might be.** Without the last two, the first cannot be interpreted.

## How it works

### Metrics are proxies

What we care about, the chance and cost of a damaging incident, is rarely measurable directly, so we measure stand-ins called [[proxy-metric|proxy metrics]]. A good proxy has a clear link to [[likelihood]] or [[impact]] and a known denominator; a weak one is easy to count but loosely connected to the goal. NIST's SP 800-55 Volume 1 (December 2024) guides organizations in developing, prioritizing, and evaluating such measures, and in using them to judge whether existing policies, procedures, and controls are adequate ([NIST SP 800-55 Vol. 1](https://csrc.nist.gov/pubs/sp/800/55/v1/final)).

| Weak metric                    | Why it misleads                                                   | Stronger alternative                                                               |
| ------------------------------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Attacks blocked per month      | Counts internet noise the defender does not control; ignores what got through | Known exploited flaws left open over 14 days on internet-facing services |
| Training completion rate       | Measures attendance, not behavior                                 | Share of simulated phishing emails reported, and how fast, with a fixed method     |
| Total open vulnerabilities     | Rises when scanning improves; mixes trivial and critical flaws    | Open known exploited flaws on exposed systems, by age, with scanner coverage stated |
| Percent of controls documented | Counts paperwork, not working controls                            | Results of tests that exercise the control, such as a timed restore from backup    |

A proxy also changes once people are rewarded for it. If a team must close vulnerability tickets within 30 days, closing them as "risk accepted" moves the number as well as fixing the flaw does. This is often called Goodhart's law: once a measure becomes a target, people optimize the number rather than the goal.

### Detectors and base rates

A detector, such as an intrusion detection rule, a spam filter, or a fraud model, labels each event as malicious or benign, and it can be wrong in two ways. In the words of CS 161, a [[false-positive]] "occurs when there is no attack, but the detector incorrectly reports that there is an attack"; a [[false-negative]] is the reverse, a missed attack ([CS 161, Chapter 36](https://textbook.cs161.org/network/intrusion-detection.html)). Three rates describe what a detector does:

- [[recall]], or detection rate: the share of real attacks that raise an alert;
- the [[false-positive-rate]]: the share of benign events that raise an alert;
- [[precision]]: the share of alerts that are real attacks.

Recall and the false-positive rate mostly describe the detector. Precision does not, because it also depends on the **base rate**, the share of events that are attacks. CS 161 makes the point with a detector whose false positive rate is 0.1% and whose false negative rate is 2%, so it catches 98% of attacks:

|                                        | 1,000 requests a day | 10 million requests a day |
| -------------------------------------- | -------------------- | ------------------------- |
| Attacks per day                        | 5                    | 5                         |
| Attacks detected (98%)                 | about 4.9            | about 4.9                 |
| False alarms (0.1% of benign requests) | about 1              | about 10,000              |
| Precision                              | about 83%            | about 0.05%               |

At the busy site, roughly one alert in 2,000 is real. As the textbook says, "nothing has changed about the detector." Only the base rate changed. The general relationship is Bayes' theorem:

```text
precision = (recall × base rate) / (recall × base rate + false-positive rate × (1 − base rate))
```

The [[base-rate-fallacy]] is judging a detector, or a single alert, by its error rates while ignoring how rare attacks are. It also explains why **accuracy**, the share of all events labeled correctly, is a poor yardstick for rare events. At the busy site, the real detector is about 99.9% accurate. A "detector" that never raises an alert is right on 9,999,995 of 10 million requests, 99.99995% accurate, and catches nothing.

Detectors also trade one error for the other: "In general, as one error rate decreases, the other error rate will increase." The right setting depends on the cost of each error. CS 161 contrasts a missed fire, which costs the building, with a false fire alarm, which costs an hour with the fire department. False alarms in security cost analysts' time and breed [[alert-fatigue]].

### Confidence and uncertainty

A rate measured on one sample would differ a little on another. A [[confidence-interval]] is a range computed by a method that, over many repeated samples, would contain the true value a stated share of the time, usually 95%. It covers only sampling variation, not every source of error.

Suppose a phishing simulation at shop.example finds that 12 of 400 staff clicked (3.0%). The next quarter, using a different email, 8 of 400 click (2.0%). A headline might say "clicks down by a third." The intervals tell a more honest story:

```python
from math import sqrt

def wilson(k, n, z=1.96):
    """Approximate 95% confidence interval for a proportion k/n (Wilson score)."""
    p = k / n
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    half = z * sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return center - half, center + half

for k, n in [(12, 400), (8, 400)]:
    lo, hi = wilson(k, n)
    print(f"{k}/{n} = {k/n:.1%}, 95% CI {lo:.1%} to {hi:.1%}")

# Zero events in n trials: exact one-sided 95% upper bound (about 3/n)
n = 200
print(f"0/{n}: the true rate could still be as high as {1 - 0.05 ** (1 / n):.1%}")
```

```text
12/400 = 3.0%, 95% CI 1.7% to 5.2%
8/400 = 2.0%, 95% CI 1.0% to 3.9%
0/200: the true rate could still be as high as 1.5%
```

The intervals overlap heavily, so chance alone could explain the drop; a formal test of the difference agrees. That does not prove training failed either: these samples simply cannot tell. And because the second email was different, the two numbers may not measure the same thing, a [[threats-to-validity|threat to validity]] that no arithmetic removes.

Zero needs special care. "No one in finance clicked any of 200 test emails" does not mean the click rate is zero. The data are consistent with a true rate as high as about 1.5% (a 95% upper bound), roughly 3 divided by the number of trials, a shortcut known as the rule of three.

Sampling error is only the computable part of uncertainty. The larger errors are often systematic: logs missing from some systems, test data unlike real attacks ([[sampling-bias]]), or a metric that misses the goal. SP 800-30 states that uncertainty "is inherent in the evaluation of risk" and notes that it can be communicated through qualitative results, ranges of values, or visual representations ([NIST SP 800-30 Rev. 1](https://csrc.nist.gov/pubs/sp/800/30/r1/final)).

### Probabilities you can check

Prefer likelihoods stated as probabilities with a named event and time window, because those can be checked later. The Exploit Prediction Scoring System (EPSS), for example, gives "the estimated likelihood that exploitation activity for a given vulnerability will be observed" in the next 30 days, as seen across its data partners ([FIRST](https://www.first.org/epss/using-epss.html)). Such scores are well calibrated if, among flaws scored around 0.10, about 10% show exploitation activity within the window. That property, [[calibration]], cannot even be tested for a rating of "high." And as FIRST notes, "EPSS does not know what is in your environment."

### Reporting honestly

An honest report states the claim, the evidence and method behind it, its uncertainty, and the assumptions that would change it. Compare:

```text
Before: Phishing risk down 33% this quarter thanks to training!

After:  Simulated phishing clicks went from 12 of 400 staff in Q2
        (3.0%, 95% CI 1.7% to 5.2%) to 8 of 400 in Q3 (2.0%, 1.0% to 3.9%).
        Q3 used a different email, so the rates are not directly
        comparable, and the change is within chance variation. We cannot
        yet say whether training changed behavior. Next quarter we will keep
        the email difficulty fixed and also track how many staff report it.
```

The rewrite is longer, but every sentence in it can be checked.

## Worked example

The fictional bank.example sends its board this quarterly summary:

```text
Q3 security summary, bank.example (fictional)
1. Our email gateway blocked 1.4 million threats this quarter.
2. The new login-anomaly detector is 99.9% accurate.
3. 38 of 40 internet-facing servers had every known exploited flaw
   patched within 14 days (vulnerability scan of September 30).
4. All customer data is encrypted at rest.
5. We had zero security incidents.
6. Our overall risk score improved from 64 to 58.
```

Sort each statement into evidence, assumption, metric, or unsupported claim, then ask what is missing.

**1. "Blocked 1.4 million threats."** A metric in form, but a weak proxy. "Threat" is undefined, the count follows what attackers send, and it says nothing about malicious emails that got through (false negatives) or legitimate mail wrongly blocked (false positives). Better: results from sending known, harmless test messages through the gateway.

**2. "99.9% accurate."** An unsupported claim as written: no definition, no test data, no base rate. Suppose, for illustration, 2,000,000 logins a day, 20 of them account takeovers, and a detector that catches 90% of takeovers while flagging 0.1% of normal logins. It raises about 18 true alerts and about 2,000 false ones, a precision just under 1%, and it is still about 99.9% accurate. Ask for recall, the false-positive rate, the base rate, and how each was measured.

**3. "38 of 40 servers..."** The strongest item: evidence (a dated scan) turned into a metric with a numerator, a denominator, and a time window. Its hidden assumption is that the server inventory is complete and the scanner reached every server. Ask how the list of 40 was built and what is wrong with the other 2.

**4. "All customer data is encrypted at rest."** Possibly true, but unsupported here. Evidence would be configuration exports for every data store, which assumes the list of stores is complete. Ask how many were checked.

**5. "Zero security incidents."** Evidence about detection and reporting, presented as evidence about attacks; it assumes detection works. Ask when detection was last tested with authorized test events and what share of systems send logs. Remember Equifax's blind inspection tool.

**6. "Risk score from 64 to 58."** Metric-shaped, but the method is unstated. A 6-point change on a 0-to-100 scoring scale may reflect a different assessor or formula rather than less risk, and as [FND-02](lesson:FND-02) showed, such scores rank more than they measure. Until the method is shown, treat it as unsupported.

A revised summary keeps what the evidence supports and labels the rest (all numbers fictional):

```text
Q3 security summary, bank.example (fictional), revised
Measured
- 38 of 40 internet-facing servers in the asset inventory had all known
  exploited flaws patched within 14 days (scan of September 30). The other 2
  run a vendor appliance awaiting a fix; they are reachable only via VPN.
- No incidents were declared. Detection was tested once (authorized
  exercise): 3 of 4 test events were detected, so missed attacks are possible.
Estimated
- Login-anomaly detector: caught 9 of 10 simulated takeovers in testing;
  it raises about 2,000 alerts a day. Assuming about 20 real takeover
  attempts a day, precision is just under 1%. Tuning is planned before
  analysts rely on it.
Not yet supported
- Encryption at rest: confirmed for 11 of 13 data stores; 2 under review.
Withdrawn until methods are documented
- Gateway "threats blocked" count and the overall risk score.
```

Some samples are tiny: "3 of 4 detected" has a 95% interval of about 30% to 95%, and "9 of 10" about 60% to 98%. Reporting counts, not "75%" or "90%," keeps that uncertainty visible.

## In practice

**Define every metric completely.** Record the decision it informs, its numerator, denominator, data source, time window, owner, and known blind spots. If no decision would change when the number changes, stop collecting it.

**Report counts with rates.** Give intervals for rates and an upper bound when the count is zero.

**Judge detectors at your own base rate.** Ask vendors for recall and the false-positive rate on stated data, then compute precision and false alarms per day at your volume. Never accept accuracy alone.

**Test the instruments.** Run authorized test events through detection, check what share of systems actually send logs, and alert when a sensor goes quiet. A silent sensor and a quiet network look the same on a dashboard.

**Watch the incentives.** Pair speed with quality, audit a sample of "closed" items, and change targets that people have learned to game.

**Keep assumptions next to the numbers.** List them in the report and revisit them each period.

## Common misconceptions

- **"A precise number is an accurate number."** A risk score of 73.42 has four significant figures and may mean nothing at all.
- **"99% accurate means 99% of alerts are real."** Accuracy counts every correct "benign" label. When attacks are rare, a detector can be highly accurate and still have very low precision.
- **"Zero incidents means zero attacks."** It means zero detected and declared. Its value depends on whether detection was working and tested.
- **"More data fixes everything."** More data shrinks sampling error. It does not fix biased data, missing logs, or a metric that measures the wrong thing.

## Try it yourself

On paper, or with the Python snippet above on your own machine, analyze this fictional monthly note from shop.example:

```text
a. "The firewall blocked 220,000 attacks this month."
b. "The endpoint agent reports disk encryption on 1,182 of 1,240 laptops
   (export of October 1)."
c. "Every company laptop is enrolled in the endpoint agent."
d. "Our checkout has bank-grade security."
e. "Median time to remove access for departing staff: 1 day
   (31 departures; HR and identity system logs)."
f. "Our new fraud model is 99.5% accurate."
g. "No customer accounts were taken over this month."
h. "Phishing reports rose from 123 of 300 staff to 141 of 300
   (same email difficulty both months)."
```

1. Label each statement as evidence, assumption, metric, or unsupported claim. For each metric, write its numerator, denominator, data source, and time window. Name the assumption that statement (b) depends on.
2. The fraud model sees 500,000 checkouts a day, 50 of them fraudulent. It catches 95% of fraud and flags 0.5% of legitimate checkouts. Compute the expected true alerts, false alarms, and precision. What false-positive rate would it need for half of its alerts to be real?
3. Compute 95% intervals for statement (h) and decide what you can honestly say. Then suppose an audit of 150 laptops in the finance department finds none unencrypted: what is the 95% upper bound on the unencrypted rate there?
4. Rewrite the note as an honest summary in the style of the revised bank.example report.

Check your work: task 2 gives about 47.5 true alerts and 2,500 false alarms a day (precision near 2%), and half the alerts would be real only at a false-positive rate near 0.01%. Task 3 gives intervals of about 35.6% to 46.6% and 41.4% to 52.7%, so the rise is suggestive but not established, and a zero-count bound of about 2%.

## Key takeaways

- Sort every security statement into evidence, assumption, metric, or unsupported claim, and ask the matching question.
- A metric is a proxy: check its link to the goal, its denominator, and the incentives around it.
- Precision depends on the base rate. Judge detectors by recall, false-positive rate, and precision at your own volume, never by accuracy alone.
- Report rates with counts and confidence intervals, and give an upper bound for zero counts. Systematic errors do not shrink with more data.
- An honest report states the value, how it was obtained, how far off it might be, and what it assumes.

## Go deeper

- [Detection rules and alert quality](lesson:OPS-02) applies these ideas to detection rules, [Security metrics and statistical interpretation](lesson:RES-04) to research results, and [Phishing education and measurement](lesson:HUM-02) to phishing simulations.
- Open question: how should an organization measure the attacks it never detected? Compare authorized red-team exercises, notifications from outside parties, and sampling-based audits as evidence about false negatives.
