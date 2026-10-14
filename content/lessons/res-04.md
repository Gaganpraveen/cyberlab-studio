---
topicId: RES-04
title: Security metrics and statistical interpretation
summary: Interpret detection and defense results honestly by choosing the right denominators, accounting for base rates, attaching confidence intervals, reporting effect sizes, and avoiding the statistical mistakes that make security results look stronger than they are.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 55
objectives:
  - Compute recall, false-positive rate, precision and accuracy from a confusion matrix and name the denominator of each.
  - Predict a detector's precision and daily alert count at a realistic base rate from its recall and false-positive rate.
  - Compute and interpret a 95% Wilson confidence interval for a measured rate.
  - Report the difference between two defenses as an effect size with its uncertainty, using a paired analysis when both saw the same cases.
  - Identify common statistical mistakes in security evaluations and propose a better practice for each.
prerequisites: [FND-08, RES-02]
concepts: [confusion-matrix, base-rate-fallacy, false-positive-rate, confidence-interval, statistical-significance, p-value, effect-size]
labs: []
keywords:
  - base rate
  - prevalence
  - precision
  - recall
  - true positive rate
  - TPR
  - FPR
  - specificity
  - positive predictive value
  - Bayes' theorem
  - accuracy paradox
  - precision-recall curve
  - ROC curve
  - Wilson score interval
  - rule of three
  - McNemar's test
  - Fisher's exact test
  - multiple comparisons
  - p-hacking
  - statistical power
  - percentage points
sources:
  - title: "Dos and Don'ts of Machine Learning in Computer Security (USENIX Security 2022)"
    url: https://www.usenix.org/conference/usenixsecurity22/presentation/arp
    publisher: USENIX Association
  - title: 'Outside the Closed World: On Using Machine Learning for Network Intrusion Detection (IEEE S&P 2010)'
    url: https://www1.icsi.berkeley.edu/pubs/networking/outsidethe10.pdf
    publisher: International Computer Science Institute (authors' copy)
  - title: 'NIST/SEMATECH e-Handbook of Statistical Methods, 7.2.4.1: Confidence intervals (for a proportion)'
    url: https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm
    publisher: National Institute of Standards and Technology (NIST) and SEMATECH
  - title: American Statistical Association Releases Statement on Statistical Significance and P-Values (March 7, 2016)
    url: https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf
    publisher: American Statistical Association
  - title: 'SoK: Benchmarking Flaws in Systems Security (IEEE EuroS&P 2019)'
    url: https://trustworthy.systems/publications/full_text/vanderKouwe_HABG_19.pdf
    publisher: Trustworthy Systems group, UNSW Sydney (authors' copy)
quiz:
  - question: A detector catches 99% of attacks and flags 1% of benign events. One event in 10,000 is an attack. About what share of its alerts are real attacks?
    choices:
      - About 99%
      - About 50%
      - About 10%
      - About 1%
    answer: 3
    explanation: Per million events there are 100 attacks, of which 99 are flagged, and 999,900 benign events, of which about 9,999 are flagged. So about 99 of 10,098 alerts are real, roughly 1%. When attacks are rare, the false-positive rate, not the detection rate, decides how useful the alerts are.
  - question: Why can accuracy rank a detector below a "detector" that never raises an alert?
    choices:
      - Accuracy rewards false positives.
      - When benign events dominate, saying "benign" every time is almost always right, so accuracy mostly measures the base rate.
      - Accuracy is computed only on attacks.
      - Accuracy cannot be computed without a threshold.
    answer: 1
    explanation: At a base rate of 0.01%, labeling everything benign scores 99.99% accuracy while catching nothing. A useful detector that misses some attacks and raises some false alarms can score lower. Report recall, the false-positive rate and precision with the base rate instead.
  - question: A detector caught 90 of 100 attacks in a test. Which statement is best supported?
    choices:
      - Its recall is exactly 90%.
      - Its recall is between 89% and 91%.
      - Its recall is 90%, with a 95% interval of roughly 83% to 94%; more attack samples would narrow it.
      - Nothing can be said, because 100 attacks is too few.
    answer: 2
    explanation: 90/100 is an estimate. The 95% Wilson interval is about 82.6% to 94.5%. One hundred attacks is a usable sample, but the interval is wide, which matters when comparing detectors whose recall differs by a few points.
  - question: Detectors B and C were run on the same 100 attacks. B caught 9 attacks C missed, C caught 4 that B missed, and they agreed on the rest. What is the right analysis?
    choices:
      - Compare the two recall rates with a test for two independent samples.
      - Use a paired analysis such as McNemar's test, which uses only the 13 attacks where they disagreed.
      - Average the two recall rates.
      - No analysis is needed, because B caught more.
    answer: 1
    explanation: The same attacks were used for both detectors, so the data are paired. McNemar's test asks whether 9 versus 4 disagreements is more lopsided than chance would make it. Here the exact p-value is about 0.27, so the data do not show that B is better, even though it caught 5 more attacks.
  - question: A team tests 20 rule variants against the same baseline at the 0.05 level and reports only the one with p = 0.03. What is the problem?
    choices:
      - With 20 tests and no real effects, the chance of at least one p below 0.05 is about 64%, so a single small p-value is weak evidence.
      - A p-value of 0.03 means a 97% chance the rule is better.
      - The 0.05 level is too strict for security work.
      - Nothing, since 0.03 is below 0.05.
    answer: 0
    explanation: Each test has a 5% chance of a false alarm, and 1 − 0.95^20 ≈ 0.64. Report every variant tested, fix the primary comparison in advance, or adjust the threshold for the number of tests. A p-value is also never the probability that the hypothesis is true.
---

## Why it matters

Security evaluations end in numbers, and numbers drive decisions about what to deploy, buy and publish. The same detector, on the same data, can honestly be described as "99% accurate" and as "wrong 99 times out of 100 when it raises an alert". Which statement you lead with depends on which denominator you choose, and only one of them tells an analyst what Monday morning will look like.

This problem has a long history in intrusion detection. Summarizing Axelsson's 1999 analysis, Sommer and Paxson wrote that "even a very small rate of false positives can quickly render an NIDS unusable", where an NIDS is a network intrusion detection system. Two decades later, Arp et al. still found the [[base-rate-fallacy|base-rate fallacy]] among the common pitfalls in machine-learning security papers, with a simple illustration: a 1% false-positive rate at a 1:100 ratio of attacks to benign samples produces 100 false positives for every 99 true positives.

A second problem is uncertainty. A recall measured on 100 attacks, or a false-positive rate measured on a few dozen benign samples, is an estimate with a wide margin. van der Kouwe et al. list "no indication of significance of data" among their benchmarking flaws: reporting numbers without their variability.

## The core idea

Every rate is a fraction, so always ask: **out of what?**

- [[recall|Recall]] is out of real attacks: of the attacks that happened, how many did we flag?
- The [[false-positive-rate|false-positive rate]] is out of benign events: of the harmless events, how many did we flag?
- [[precision|Precision]] is out of alerts: of the alerts we raised, how many were real?
- Accuracy is out of everything.

The **base rate** (or prevalence) is the share of events that really are attacks. Recall and the false-positive rate describe the detector and do not change with the base rate. Precision describes the detector in a particular environment and changes a great deal with it.

A smoke alarm makes the point. Suppose it never misses a fire but also sounds whenever toast burns. In a home where a fire happens once a decade and toast burns every week, almost every alarm is toast, even though the alarm is excellent at detecting fires.

These calculations rest on assumptions worth stating: that the labels ([[ground-truth|ground truth]]) are correct, that the test data resemble deployment, and that the events counted are independent of one another. The last assumption often fails in security, where one attack can produce thousands of related packets or log lines.

## How it works

### The confusion matrix and its denominators

A [[confusion-matrix|confusion matrix]] counts the four possible outcomes:

|                  | Alert               | No alert            |
| ---------------- | ------------------- | ------------------- |
| **Real attack**  | True positive (TP)  | False negative (FN) |
| **Benign event** | False positive (FP) | True negative (TN)  |

A [[false-positive|false positive]] is an alert on harmless activity, and a [[false-negative|false negative]] is an attack that raised no alert.

Every common metric is a ratio of these cells:

```text
recall (true positive rate)  = TP / (TP + FN)        out of real attacks
false-positive rate          = FP / (FP + TN)        out of benign events
precision                    = TP / (TP + FP)        out of alerts
accuracy                     = (TP + TN) / (all)     out of everything
```

Publish the four raw counts, not only the rates. With the counts, a reader can recompute any metric and see the base rate directly.

### Base rates and Bayes' theorem

Write the base rate as *p*. Bayes' theorem connects precision to the two detector properties and the environment:

```text
precision = (recall × p) / (recall × p + FPR × (1 − p))
```

Hold a detector fixed at 99% recall and a 1% false-positive rate, and change only the base rate:

| Share of events that are attacks | Precision |
| -------------------------------- | --------- |
| 50% (balanced test set)          | 99.0%     |
| 10%                              | 91.7%     |
| 1%                               | 50.0%     |
| 0.1%                             | 9.0%      |
| 0.01%                            | 0.98%     |

When *p* is small, the false-alarm term FPR × (1 − *p*) dominates the denominator. A detector only produces mostly-true alerts when its false-positive rate is about as small as the base rate or smaller. This is why Arp et al. recommend precision-recall curves for rare-class problems, ROC curves only over the range of false-positive rates that is workable in practice, and discussing false positives in terms of analyst workload.

### Confidence intervals for rates

A rate measured on a sample would come out differently on another sample. A 95% [[confidence-interval|confidence interval]] is produced by a method that, over many repeated samples, covers the true rate close to 95% of the time. For proportions, the NIST/SEMATECH handbook recommends the Wilson score interval over the familiar normal approximation, p̂ ± 1.96 × √(p̂(1 − p̂)/n), whose limits can fall outside 0 to 1. For 99 detections out of 100 attacks the normal approximation gives an upper limit of 100.95%, which is impossible; Wilson gives 94.6% to 99.8%.

```python
from math import sqrt

def wilson(k, n, z=1.96):
    """95% Wilson score interval for k successes out of n trials."""
    p = k / n
    denom = 1 + z**2 / n
    center = (p + z**2 / (2 * n)) / denom
    half = z * sqrt(p * (1 - p) / n + z**2 / (4 * n**2)) / denom
    return center - half, center + half

def precision_at(recall, fpr, base_rate):
    """Share of alerts that are real when a fraction base_rate of events are attacks."""
    hits = recall * base_rate
    false_alarms = fpr * (1 - base_rate)
    return hits / (hits + false_alarms)

print(wilson(90, 100))                  # about (0.826, 0.945)
print(precision_at(0.99, 0.01, 1e-4))   # about 0.0098
print(precision_at(0.90, 1e-4, 1e-4))   # about 0.474
```

When you observe **zero** events, the interval still has an upper end. If none of *n* benign samples was flagged, the false-positive rates consistent with that at 95% confidence (one-sided) satisfy (1 − FPR)ⁿ ≥ 0.05, which gives an upper bound of about 3/*n*. This "rule of three" means that zero false positives on 1,000 benign samples still allows a rate as high as 0.3%.

### Effect sizes, p-values and significance

When comparing two defenses, the first number to report is the **[[effect-size|effect size]]**: how big the difference is. For rates, the simplest is the absolute difference in percentage points. Relative differences can mislead on their own: a false-alarm rate falling from 2% to 1% is a 1-point drop and also a 50% drop. van der Kouwe et al. flag "relative numbers only" as a benchmarking flaw.

A **[[p-value|p-value]]** is the probability of data at least as extreme as yours if a stated model, usually "no difference", were true. A result is called **statistically significant** when the p-value falls below a threshold chosen in advance, often 0.05; see [[statistical-significance]]. The American Statistical Association's 2016 statement sets out six principles. Among them: p-values do not measure the probability that the studied hypothesis is true, conclusions should not rest only on whether a p-value passes a threshold, and statistical significance does not measure the size or importance of an effect. Report the effect size and its confidence interval, and treat the test as one piece of evidence.

**Statistical power** is the probability that a study detects an effect of a given size when it exists. Small attack samples have low power. To detect an improvement in recall from 85% to 90% with 80% power at the 0.05 level, comparing two independent samples, you need about 690 attacks per detector. A **paired** design, in which both detectors see the same attacks, usually needs fewer: attacks that both detectors handle the same way cancel out, and only the disagreements carry information. McNemar's test is the standard tool for this.

### Common statistical mistakes

| Mistake                                               | Why it misleads                                                   | Better practice                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| Accuracy on imbalanced data                           | "Always benign" scores near 100%                                  | Report recall, false-positive rate and precision with the base rate |
| Precision from a balanced test set                    | It does not transfer to a rare-attack deployment                  | Recompute precision at a realistic base rate                        |
| Point estimates only                                  | Noise looks like signal                                           | Confidence intervals; spread across seeds and runs                  |
| Counting dependent events as independent              | Thousands of packets from one attack inflate the sample size      | Count at the level that matters, such as sessions or campaigns      |
| Many tests, one reported                              | False discoveries become likely                                   | Fix the primary test in advance; report all tests or adjust         |
| "Not significant" read as "no effect"                 | A small study can miss a real effect                              | Show the interval for the difference                                |
| "Significant" read as "important"                     | With huge samples, trivial differences become significant         | State the smallest difference that would matter, before testing     |
| Unpaired test on paired data                          | It throws away information and loses power                        | McNemar's test or a paired bootstrap                                |
| Judging a difference by whether two intervals overlap | Two 95% intervals can overlap while the difference is significant | Compute an interval for the difference itself                       |

## Worked example

The security team at the fictional `bank.example` replays one day of recorded network sessions, 1,000,000 in all, in an isolated test environment. Mixed in are 100 attack sessions from an authorized red-team exercise, so the [[ground-truth|ground truth]] is known and the base rate is 1 in 10,000 (0.01%). Two candidate intrusion detectors are evaluated. The team's analysts can triage about 200 alerts a day.

**Step 1: confusion matrices.**

| Detector | TP  | FN  | FP    | TN      |
| -------- | --- | --- | ----- | ------- |
| A        | 99  | 1   | 9,999 | 989,901 |
| B        | 90  | 10  | 100   | 999,800 |

**Step 2: metrics.**

| Metric              | A      | B       | Never alert      |
| ------------------- | ------ | ------- | ---------------- |
| Recall              | 99.0%  | 90.0%   | 0%               |
| False-positive rate | 1.0%   | 0.010%  | 0%               |
| Precision           | 0.98%  | 47.4%   | none (no alerts) |
| Accuracy            | 99.0%  | 99.989% | 99.990%          |
| Alerts per day      | 10,098 | 190     | 0                |

Accuracy ranks the useless "never alert" option first. Detector A's 99% recall looks best, but its alerts are 99% noise and arrive fifty times faster than the team can triage them. Detector B misses 10 of 100 attacks, yet nearly half of its 190 daily alerts are real, and the team can review them all.

**Step 3: uncertainty.** B's recall rests on only 100 attacks: the 95% Wilson interval for 90/100 is about 82.6% to 94.5%. Its false-positive rate rests on 999,900 benign sessions, so its interval is tight, about 0.0082% to 0.0122%, or roughly 82 to 122 false alarms a day. That tight interval assumes independent sessions, though. Sessions from one day share hosts and habits, and an unusual backup job could double the false alarms. The team therefore repeats the measurement on several more days and reports the day-to-day spread. They also note an external-validity limit: 100 sessions from one red team may not represent real attackers.

**Step 4: compare with the current detector.** The current detector, C, caught 85 of the same 100 attacks. B's recall is 5 percentage points higher. Because both detectors saw the same attacks, the comparison is paired: B caught 9 attacks that C missed, C caught 4 that B missed, and they agreed on the other 87. McNemar's exact test on 9 versus 4 gives p ≈ 0.27, and an approximate 95% interval for the paired difference is −2 to +12 points. The data are consistent with B being slightly worse, the same, or substantially better.

**Step 5: write the result honestly.** "On one day of replayed traffic containing 100 red-team attack sessions (base rate 0.01%), Detector B caught 90 (95% CI 83% to 94%) and raised 100 false alarms among 999,900 benign sessions (false-positive rate 0.010%), for about 190 alerts a day, 47% of them real. B caught 5 more attacks than the current detector, a difference this sample cannot distinguish from chance (McNemar exact p = 0.27). Showing an improvement of that size would take several hundred more labeled attacks."

## In practice

- **Lead with counts.** Publish the confusion matrix, the base rate and the unit of analysis (event, session, host, campaign).
- **Translate rates into workload.** Alerts per day and the share that are real are what operators feel. Arp et al. recommend discussing false positives relative to the base rate for exactly this reason.
- **Choose curves that fit rare events.** Prefer precision-recall curves, and show ROC curves only over a workable false-positive range.
- **Resample the right unit.** For complex metrics, bootstrap by resampling whole days, hosts or campaigns, not individual packets.
- **Fix the primary metric in advance.** Decide which number answers the research question before you see results, as the [experimental design](lesson:RES-02) lesson describes.

## Common misconceptions

- **"99% accurate means 99% of its alerts are right."** That is precision, and it depends on the base rate. Accuracy says almost nothing when attacks are rare.
- **"p = 0.04 means a 96% chance the defense works."** A p-value is computed assuming no effect; it is not the probability that a hypothesis is true.
- **"A 95% interval means a 95% chance that this particular interval holds the true value."** The 95% describes the method across repeated samples. In practice, treat the interval as the range of values the data do not rule out.
- **"Zero false positives in testing means a zero false-positive rate."** Zero out of 1,000 still allows about 0.3%, which at a million events a day is thousands of alerts.
- **"If two intervals overlap, the difference is not significant."** Intervals can overlap while the difference is significant. Test or estimate the difference directly.

## Try it yourself

Use the Python functions above, a spreadsheet, or a calculator.

1. A fictional detector has 95% recall and a 0.5% false-positive rate. Compute its precision when attacks are 10%, 1% and 0.1% of events.
2. Open the [homograph lab](lab:homograph) and build a rule set. Record its confusion matrix on the twelve names (six suspicious, six benign). Suppose it catches all six suspicious names with no false positives. Compute the 95% Wilson interval for its recall and for its false-positive rate, and explain what this says about the lab's twelve names as evidence.
3. Two fictional phishing filters, X and Y, were run on the same 200 phishing emails. Both caught 150, only X caught 20, only Y caught 8, and neither caught 22. Compute each filter's recall, the difference in percentage points, and McNemar's exact p-value from the 20 and 8 disagreements. Then compare the result with a test that wrongly treats the two recall rates as independent samples.

> [!TIP]
> Check your answers. (1) About 95.5%, 65.7% and 16.0%. (2) Recall 6/6 gives about 61% to 100%; a false-positive rate of 0/6 gives about 0% to 39%, so a perfect score on twelve names is consistent with a weak detector. (3) X 85%, Y 79%, a difference of 6 points; McNemar's exact p ≈ 0.036, while an unpaired Fisher's exact test gives p ≈ 0.15. The paired analysis is the right one, and it is more sensitive.

## Key takeaways

- Ask "out of what?" for every rate: recall is out of attacks, the false-positive rate out of benign events, precision out of alerts.
- Precision collapses at low base rates, so report base rates and alert workload, not accuracy.
- Every measured rate needs an interval; few attacks or few benign samples mean wide intervals.
- Report effect sizes with intervals, use paired analyses for paired data, and treat a p-value as one piece of evidence, not a verdict.

## Go deeper

- The ASA's [statement on p-values](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf) lists its six principles in plain language; it is short and worth reading in full.
- The NIST/SEMATECH handbook gives the Wilson interval formulas and discusses exact binomial methods for very small samples: [7.2.4.1 Confidence intervals](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm).
- Arp et al. discuss the base-rate fallacy and performance measures with examples from published systems: [Dos and Don'ts of Machine Learning in Computer Security](https://www.usenix.org/conference/usenixsecurity22/presentation/arp).
- Open question: real labels are noisy. How should an evaluation report precision and recall when some of its ground truth is wrong, and how much label noise can a comparison tolerate before its conclusion flips?
