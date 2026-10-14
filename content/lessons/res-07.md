---
topicId: RES-07
title: Detection/defense evaluation capstone
summary: A capstone guide for comparing two or more detection or defense implementations against evidence that was reviewed before the results were known, with a project brief, milestones, deliverables, an assessment rubric, a worked sample, and project ideas built on CyberLab's labs.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Turn a comparison between two implementations into a preregistered evaluation plan that peers review before any results are seen.
  - Build a labeled test set with independent labelers, measure their agreement, and state what the set does and does not represent.
  - Compare implementations fairly, with baselines, equal tuning effort, ablations and a paired analysis on the same test items.
  - Report each metric with its uncertainty and translate the results into operational terms at a stated base rate.
  - Reproduce another team's results from their artifact and write a constructive review of what you found.
prerequisites: [RES-02, RES-03, RES-04, OPS-02]
concepts: [ground-truth, baseline, confusion-matrix, reproducibility]
labs: []
keywords:
  - capstone
  - detection evaluation
  - defense evaluation
  - comparative evaluation
  - preregistration
  - ground truth
  - labeling
  - inter-rater agreement
  - Cohen's kappa
  - hard negatives
  - McNemar's test
  - ablation
  - artifact review
  - adaptive adversary
  - look-alike domains
sources:
  - title: "Dos and Don'ts of Machine Learning in Computer Security (USENIX Security 2022)"
    url: https://www.usenix.org/conference/usenixsecurity22/presentation/arp
    publisher: USENIX Association
  - title: 'Outside the Closed World: On Using Machine Learning for Network Intrusion Detection (IEEE S&P 2010)'
    url: https://www1.icsi.berkeley.edu/pubs/networking/outsidethe10.pdf
    publisher: International Computer Science Institute (authors' copy)
  - title: 'SoK: Benchmarking Flaws in Systems Security (IEEE EuroS&P 2019)'
    url: https://trustworthy.systems/publications/full_text/vanderKouwe_HABG_19.pdf
    publisher: Trustworthy Systems group, UNSW Sydney (authors' copy)
  - title: 'NIST/SEMATECH e-Handbook of Statistical Methods, 7.2.4.1: Confidence intervals (for a proportion)'
    url: https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm
    publisher: National Institute of Standards and Technology (NIST) and SEMATECH
  - title: "USENIX Security '26 Call for Artifacts"
    url: https://www.usenix.org/conference/usenixsecurity26/call-for-artifacts
    publisher: USENIX Association
quiz:
  - question: Why must the evaluation plan be reviewed and frozen before the team sees any test results?
    choices:
      - Reviewers need something to grade early in the term.
      - So that metrics, thresholds and comparisons cannot be chosen after the fact to favor one implementation.
      - Because the test set cannot be built until the plan exists.
      - Freezing the plan makes the results statistically significant.
    answer: 1
    explanation: Once results are visible, it is easy, often unconsciously, to pick the metric, threshold or subset that tells the preferred story. A reviewed, dated plan separates the planned comparison from later exploration, which can still be reported if it is labeled as exploratory.
  - question: A team labels its test set by running implementation S and treating S's alerts as the attacks. What is wrong?
    choices:
      - Nothing, if S is the stronger implementation.
      - The labels are too expensive to produce this way.
      - The ground truth now depends on one of the systems being evaluated, so the comparison is circular and favors S.
      - Labels must always come from a public dataset.
    answer: 2
    explanation: Ground truth has to be established independently of the systems under test, as Sommer and Paxson stress. Otherwise S agrees with the labels by construction, and anything S misses is labeled benign, so its misses are invisible.
  - question: Implementation E catches 164 of 200 imitation domains and S catches 148; their 95% intervals overlap. Both ran on the same 200 names. What should the team do?
    choices:
      - Conclude there is no difference, because the intervals overlap.
      - Run a paired analysis on the names where they disagree, because overlapping intervals for each rate do not settle whether the difference is real.
      - Average the two recall rates and report one number.
      - Discard the result and collect a new test set.
    answer: 1
    explanation: Overlapping intervals for two separate rates are not a test of their difference. Because both implementations saw the same names, McNemar's test on the disagreements is the right tool. In the worked example, E caught 25 names that S missed and S caught 9 that E missed, giving p ≈ 0.009.
  - question: A curated benign set made of near-miss names, such as campos.test, gives implementation E a 7% false-positive rate. Why might E's false-positive rate on ordinary traffic be much lower?
    choices:
      - Curated near-miss names are deliberately hard negatives, so they over-represent exactly the names E struggles with.
      - Real traffic contains no benign names.
      - False-positive rates never depend on the data.
      - Larger datasets always have lower rates.
    answer: 0
    explanation: Hard negatives stress-test a detector, which is useful, but they are not a sample of real traffic. Report the false-positive rate separately on hard negatives and on a background sample, and say which one supports which claim.
  - question: During artifact review, another team runs one of your implementations outside your test harness, gets answers that differ from the ones the harness recorded, and traces the gap to a normalization step that the harness applied to only one implementation. What is the best response?
    choices:
      - Argue that the reviewers ran the artifact incorrectly.
      - Remove the normalization step from the report.
      - Ask the reviewers to retract their finding.
      - Thank them, fix the harness so both implementations get identical preprocessing, rerun everything, and report the change and its effect.
    answer: 3
    explanation: Finding this kind of unequal treatment is exactly why evidence is reviewed. van der Kouwe et al. list unfair benchmarking of competitors among their benchmarking flaws. Fixing it openly makes the final result stronger and more credible.
---

## Why it matters

Most security products and papers claim that one implementation detects or prevents more than another. Those claims are easy to make and easy to get wrong. Sommer and Paxson, writing about intrusion detection, insist that ground truth be collected "via a mechanism orthogonal (unrelated) to how the detector works" and that researchers examine false positives by hand to understand why they happen. Arp et al. describe ten pitfalls of machine learning in security, among them sampling bias, inappropriate baselines and the base-rate fallacy, and their study of 30 papers from top-tier venues found such pitfalls widespread. van der Kouwe et al. list, among their benchmarking flaws, not testing false positives and negatives at all and benchmarking competitors unfairly.

CyberLab's own [homograph lab](lab:homograph) illustrates the scale problem. A good rule set there can classify all twelve of its labeled names correctly, and the lab itself calls its dataset "a teaching baseline, not proof of a production detector." A perfect score on its six suspicious names is consistent with a true detection rate as low as about 61% (the lower end of a 95% Wilson interval).

This capstone asks you to do the evaluation properly: compare implementations on evidence that was planned, labeled and checked by other people before you knew which implementation would win.

## The core idea

"Reviewed evidence" means three separate reviews, each placed before the step it protects:

1. **The plan is reviewed before results exist.** Hypotheses, metrics, baselines and the analysis are written down, reviewed by peers and the instructor, and frozen. This blocks choosing the flattering metric after the fact.
2. **The [[ground-truth|ground truth]] is reviewed before it is used.** At least two people label the test set independently, without seeing any system's output, their agreement is measured, and disagreements are resolved by a written rule.
3. **The results are reviewed before they are reported.** Another team reruns your artifact and checks that the numbers come out the same, a small version of a conference's [[artifact-evaluation|artifact evaluation]].

The pattern resembles a well-run clinical trial, in which the protocol is registered before patients enroll and outcomes are judged by assessors who do not know which treatment each patient received.

The assumptions to state are familiar from the earlier lessons in this domain: the test set represents the setting the claim is about, the labels are correct, the implementations get equal treatment, and the attacker does not adapt beyond what the test set contains. The last assumption is never fully true, so the report must say what an adaptive attacker would change.

## How it works

### The project brief

Choose two or more implementations of the same defense or detector, at least one of which you build or configure yourself, and compare them for a stated deployment setting. Include at least one simple [[baseline]] and one [[ablation-study|ablation]]. All data must be fictional, synthetic or properly licensed, and every system under test must run on your own machine, in containers you control, or in CyberLab's labs.

> [!ETHICS] Only test systems you own or have written permission to test.

### Milestones

| Week | Milestone             | Due                                                                        | Reviewed by                      |
| ---- | --------------------- | -------------------------------------------------------------------------- | -------------------------------- |
| 1-2  | M1 Question           | Implementations, deployment setting, the claim you will test               | Instructor                       |
| 3-4  | M2 Evaluation plan    | Hypotheses, data, splits, metrics, baselines, analysis, threats, ethics    | Peer team and instructor; frozen |
| 5-6  | M3 Ground truth       | Labeled test set, labeling guide, agreement report, data statement         | Second labeler and instructor    |
| 7-8  | M4 Runs               | All systems and baselines run; test set opened once; raw outputs saved     | Instructor check-in              |
| 9    | M5 Artifact review    | Another team reproduces your key results from your artifact; you do theirs | Peer team                        |
| 10   | M6 Report and defense | Limitation-aware report, response to the artifact review, presentation     | Graded with the rubric           |

### Deliverables

- **Evaluation plan** with the review comments and your responses, dated before M4.
- **Labeled test set** or the scripts that generate it, with a labeling guide, an agreement report and a data statement.
- **Implementations, baselines and artifact package**, following the [reproducibility](lesson:RES-03) lesson.
- **Results:** a [[confusion-matrix|confusion matrix]] for every system, metrics with confidence intervals, a paired comparison, ablations, and an operational translation such as alerts per week at a stated base rate, as in the [metrics](lesson:RES-04) lesson.
- **Report** (6 to 10 pages) with threats to validity and limitations, written as in the [research communication](lesson:RES-08) lesson.
- **Artifact review** of another team's project, one to two pages.

### Assessment rubric

| Criterion (weight)                        | Excellent                                                                                          | Adequate                                        | Insufficient                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------- |
| Question and plan (15%)                   | Precise hypotheses; plan reviewed and frozen; deviations logged and justified                      | Plan written before runs, but vague in places   | Plan written after results, or missing             |
| Ground truth and data (20%)               | Independent labelers, agreement reported, data statement, clear account of what the data represent | Labels checked by a second person               | Labels from one person or from a system under test |
| Fair comparison (20%)                     | Equal tuning and preprocessing; simple baseline; ablations; same test items for every system       | Baseline present; minor imbalances acknowledged | Unequal treatment, or no baseline                  |
| Analysis and interpretation (20%)         | Intervals, paired tests, effect sizes, base-rate translation; conclusions match the evidence       | Intervals reported; some overreach              | Point estimates only; claims exceed the data       |
| Reproducibility and artifact review (15%) | Peers reproduce key results; your review of their work is specific and constructive                | Reproduced with help; review is general         | Not reproducible; review missing                   |
| Limitations and communication (10%)       | Threats to validity, adaptive attackers and the setting's limits stated precisely                  | Some limitations named                          | Limitations missing or generic                     |

### Labeling and agreement

Write a labeling guide before labeling: what counts as suspicious, with examples and edge cases. Two labelers then work independently and never see which system flagged which item. Report raw agreement and a chance-corrected measure such as **Cohen's kappa**, κ = (pₒ − pₑ) / (1 − pₑ), where pₒ is the share of items on which they agreed and pₑ is the agreement expected by chance from each labeler's label frequencies. A kappa near 1 means strong agreement beyond chance; a kappa near 0 means no better than chance. Resolve disagreements with a rule you wrote in advance, such as discussion followed by a third labeler, and report how many items needed it.

## Worked example

A team compares two fictional look-alike-domain detectors that protect the fictional `campus.test`:

- **S** flags a name whose [[confusable-skeleton|confusable skeleton]] matches the protected name, plus any name whose [[registrable-domain|registrable domain]] differs while the protected name appears as a subdomain.
- **E** flags a name within two character edits (insertions, deletions or substitutions) of the protected name, plus the same registrable-domain check.
- **Baseline:** "flag every non-ASCII name", the over-eager starting rule in the homograph lab.

**Plan (M2).** Primary hypothesis: E's [[recall]] on imitation names exceeds S's, tested with a two-sided McNemar exact test at the 0.05 level. Secondary measures: [[false-positive-rate|false-positive rates]] on two benign sets, and recall by category. The lab's twelve names are the development set only. The plan was reviewed by a peer team, which asked for the second benign set described below, and then frozen.

**Ground truth (M3).** Another team built the test set: 200 fictional imitation names in the lab's three categories (100 [[homograph-attack|homograph]] swaps, 50 ASCII [[typosquatting|typosquats]] and 50 misleading subdomains), 200 **hard negatives** (benign names that resemble the protected one, such as the fictional `campos.test`, plus benign internationalized names), and 5,000 **background** benign names generated from a word list. The typosquats include one-letter changes such as `cempus.test` and hyphenated names such as `mail-campus.test`, which imitates the real `mail.campus.test`. Two other students, following the written guide and without seeing any detector's output, labeled the 400 hand-built names independently and agreed on 388 (97%). With each labeler's label frequencies, chance agreement was about 50%, so Cohen's kappa was about 0.94. The 12 disagreements were resolved by discussion with a third student.

**Results (M4).** Every system saw the same names. Intervals are 95% Wilson intervals, except where no false positives occurred, where the rule of three gives a one-sided 95% upper bound.

| Measure                               | S                           | E                           | Baseline                    |
| ------------------------------------- | --------------------------- | --------------------------- | --------------------------- |
| Recall, all imitations (200)          | 148 (74.0%, 67.5% to 79.6%) | 164 (82.0%, 76.1% to 86.7%) | 100 (50.0%, 43.1% to 56.9%) |
| Homograph swaps (100)                 | 98                          | 90                          | 100                         |
| Typosquats (50)                       | 0                           | 24                          | 0                           |
| Misleading subdomains (50)            | 50                          | 50                          | 0                           |
| False positives, hard negatives (200) | 2 (1.0%, 0.3% to 3.6%)      | 14 (7.0%, 4.2% to 11.4%)    | 31 (15.5%, 11.1% to 21.2%)  |
| False positives, background (5,000)   | 0 (at most about 0.06%)     | 3 (0.06%, 0.02% to 0.18%)   | 0 (at most about 0.06%)     |

**Paired comparison.** S and E both caught 139 imitations; only S caught 9, only E caught 25, and 27 escaped both. McNemar's exact test on 25 versus 9 gives p ≈ 0.009, and an approximate 95% interval for E's advantage is 2 to 14 percentage points. Notice that the two recall intervals in the table overlap, yet the paired analysis shows that, if the two detectors were equally good, a split as lopsided as 25 to 9 would be rare. This is why the [metrics](lesson:RES-04) lesson warns against judging differences by whether intervals overlap.

**Ablation.** With the shared registrable-domain check removed, both systems lost all 50 misleading-subdomain names, which shows that this component, not the skeleton or edit-distance logic, handles that whole category.

**Artifact review (M5).** The reviewing team reran the artifact and got the same table. They then ran S on its own, outside the test harness, for a sample of homograph names and got answers that differed from the harness's saved outputs. They traced the gap to the harness, which lowercased and normalized every name before passing it to E but passed names to S unchanged. The team fixed the harness so both systems received identical input, reran everything, and reported the change; the table shows the corrected numbers.

**Interpretation.** E catches more imitations overall, and all of its gain comes from typosquats: it caught the 24 one-letter changes but none of the 26 hyphenated names, which differ from the protected name by more than two edits. No system caught those 26, a gap worth reporting in its own right. S catches more homograph swaps and rarely flags benign look-alikes. The baseline is a useful warning: it catches every homograph swap but flags every benign internationalized name in the hard-negative set. Neither detector dominates, so which to deploy depends on the cost of a false alarm compared with a miss, at the real base rate. Zero background false positives for S still allows a rate up to about 0.06%, and 5,000 synthetic names are not real traffic, so precision at deployment remains unmeasured. The test set contains only the three categories the lab teaches, so an attacker who uses another kind of imitation is outside what was evaluated. These limits go in the report alongside the strengths.

## In practice

- **Budget most of the time for data.** Building and labeling a credible test set usually takes longer than building the detectors.
- **Use hard negatives and background data for different claims.** Hard negatives show where a system breaks; a background sample estimates everyday false alarms.
- **Treat every system equally.** Same inputs, same preprocessing, same tuning budget, and the same opportunity to be fixed when a bug is found.
- **Keep raw outputs.** Save every system's decision on every test item, so reviewers can recompute any metric or test.
- **Report the attacker you did not test.** Describe, at the level of categories, what an adaptive attacker could try next and why your test set does not cover it, without publishing a recipe for it.
- **Be a generous artifact reviewer.** Report what you ran, what matched, what did not, and the smallest change that would fix each problem.

## Common misconceptions

- **"Our labels came from the best available detector, so they are good enough."** Labels from a system under test make the evaluation circular. Ground truth must be independent.
- **"A larger test set fixes everything."** Size narrows intervals but does not fix a set that represents the wrong setting or the wrong attackers.
- **"The implementation with the higher number wins."** Only if the difference is larger than the uncertainty, holds on paired data, and survives the costs of its false alarms.
- **"Passing on a test set proves a filter is complete."** Testing shows that a defense stops the inputs you tried. For defenses such as input filters, an argument about why no other input gets through matters as much as the score.
- **"Artifact review is a formality."** In the worked example it found an unequal-preprocessing bug that changed a headline number.

## Try it yourself

Pick one project idea and complete milestone M1: a one-page question naming the implementations, the deployment setting, the claim you will test, and the baseline.

1. **Look-alike domain detectors for `campus.test`.** Compare two rule sets, as in the worked example, using the [homograph lab](lab:homograph) for development.
2. **Two SQL injection defenses.** Using the fake login in the [SQL injection lab](lab:sql-injection), compare a [[parameterized-query|parameterized query]] with a pattern-matching input filter on a reviewed set of attack inputs and legitimate names such as O'Brien. Report both blocked attacks and broken legitimate logins, and explain what testing cannot show about the filter.
3. **Cross-site scripting defenses for a comment page.** Using the toy comment page in [the lab](lab:xss) as the model, compare output encoding with an HTML sanitizer on a reviewed set of comments. Measure whether any script runs and how much legitimate formatting survives.
4. **Rate-limit and filter settings.** In the [DDoS simulator lab](lab:ddos), compare two or more settings by legitimate requests served and attack traffic dropped, across several random seeds.
5. **Password storage settings.** In the [password cracking lab](lab:password-cracking), compare a fast unsalted hash with salted, slow key derivation by guesses per second on your own machine. Report the hardware and the run-to-run spread.
6. **JWT verifiers.** Compare two verifier configurations against a reviewed suite of valid, expired, malformed and forged tokens built from the [JWT lab](lab:jwt). Count both wrongly accepted and wrongly rejected tokens.

## Key takeaways

- Comparisons are only as good as the evidence: review and freeze the plan, label ground truth independently, and have another team reproduce the results.
- Use the same test items for every system and analyze the comparison as paired data.
- Report every metric with its interval, separate hard-negative and background false-positive rates, and translate results to a stated base rate.
- State what the test set does not contain, including the attacker who adapts, alongside what the results show.

## Go deeper

- Arp et al. give recommendations for each pitfall, including baselines, performance measures and lab-only evaluation: [Dos and Don'ts of Machine Learning in Computer Security](https://www.usenix.org/conference/usenixsecurity22/presentation/arp).
- Sommer and Paxson's section on evaluation remains a compact checklist for detector studies: [Outside the Closed World](https://www1.icsi.berkeley.edu/pubs/networking/outsidethe10.pdf).
- The [USENIX Security '26 Call for Artifacts](https://www.usenix.org/conference/usenixsecurity26/call-for-artifacts) shows how a conference organizes artifact review, which the M5 peer review imitates.
- Open question: an evaluation against yesterday's attacks cannot measure robustness to tomorrow's. What evidence, short of a full adaptive-attack study, would make you trust a detector's claims about attackers who adapt?
