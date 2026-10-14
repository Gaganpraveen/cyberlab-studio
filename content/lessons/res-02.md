---
topicId: RES-02
title: Experimental design and baselines
summary: Turn a security question into a controlled experiment, with a falsifiable hypothesis, a control condition and fair baselines, a sealed test set, a fixed analysis plan, and an explicit list of threats to validity and ethical safeguards.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 55
objectives:
  - Write a falsifiable hypothesis that names the system, the comparison, the measure and the conditions.
  - Choose a control condition, baselines and ablations, and justify what each comparison shows.
  - Design data splits and a tuning procedure that avoid data snooping and test-set reuse.
  - Identify threats to internal, external, construct and conclusion validity in an experiment plan and propose a mitigation for each.
  - Plan ethical safeguards for an experiment that involves people or production data, starting from the Menlo Report's principles.
prerequisites: [RES-01, FND-08]
concepts: [hypothesis, baseline, control-group, ablation-study, data-snooping, sampling-bias, threats-to-validity, menlo-report]
labs: []
keywords:
  - experimental design
  - design of experiments
  - DOE
  - controlled experiment
  - independent variable
  - dependent variable
  - confounding variable
  - randomization
  - blocking
  - replication
  - A/B test
  - held-out test set
  - temporal split
  - preregistration
  - benchmarking flaws
  - benchmarking crimes
  - IRB
  - Menlo Report
  - Belmont Report
sources:
  - title: "Dos and Don'ts of Machine Learning in Computer Security (USENIX Security 2022)"
    url: https://www.usenix.org/conference/usenixsecurity22/presentation/arp
    publisher: USENIX Association
  - title: 'SoK: Benchmarking Flaws in Systems Security (IEEE EuroS&P 2019)'
    url: https://trustworthy.systems/publications/full_text/vanderKouwe_HABG_19.pdf
    publisher: Trustworthy Systems group, UNSW Sydney (authors' copy)
  - title: 'NIST/SEMATECH e-Handbook of Statistical Methods, 5.3.3.1: Completely randomized designs'
    url: https://www.itl.nist.gov/div898/handbook/pri/section3/pri331.htm
    publisher: National Institute of Standards and Technology (NIST) and SEMATECH
  - title: 'Outside the Closed World: On Using Machine Learning for Network Intrusion Detection (IEEE S&P 2010)'
    url: https://www1.icsi.berkeley.edu/pubs/networking/outsidethe10.pdf
    publisher: International Computer Science Institute (authors' copy)
  - title: "USENIX Security '26 Call for Papers (ethics guidelines and open science policy)"
    url: https://www.usenix.org/conference/usenixsecurity26/call-for-papers
    publisher: USENIX Association
quiz:
  - question: Which hypothesis is ready to be tested?
    choices:
      - Our phishing defense is effective.
      - Machine learning improves email security.
      - On July to September mail, Defense A catches at least 10 percentage points more phishing than the current filter at a false-positive rate of at most 0.1%.
      - Defense A will probably work well in most organizations.
    answer: 2
    explanation: A testable hypothesis names the system, the comparison, the measure, the threshold and the conditions, so the data could clearly contradict it. The other statements are too vague to fail, which means no experiment could support them either.
  - question: A team tunes its detector's threshold until the test-set results look best, then reports those test-set results. What is the main problem?
    choices:
      - The test set has become part of tuning, so the reported numbers are optimistic and no longer measure performance on unseen data.
      - Thresholds should never be tuned.
      - The test set is too small for any threshold.
      - Nothing, as long as the same threshold is used for all baselines.
    answer: 0
    explanation: Every decision made by looking at test results leaks information from the test set into the system. Tune on a separate validation set, then touch the sealed test set once, for the final measurement.
  - question: A new defense is rolled out in the engineering department, which also had security training that month, and phishing clicks fall. Which threat to validity is most serious?
    choices:
      - Construct validity, because clicks are not a real measure.
      - Conclusion validity, because no p-value was computed.
      - External validity, because other banks might differ.
      - Internal validity, because the training is a confounder that could explain the drop on its own.
    answer: 3
    explanation: The defense and the training changed together in the same group, so the design cannot tell which one caused the effect. Random assignment of users to the defense, within each department, would separate the two.
  - question: Why should an evaluation include a simple, well-understood baseline even when a strong state-of-the-art method is also compared?
    choices:
      - Simple baselines always win, so they make the paper look honest.
      - It shows whether the new method's complexity buys anything; sometimes a simple or non-learning method does as well.
      - Reviewers require exactly one simple baseline.
      - Simple baselines need no tuning, so they save time.
    answer: 1
    explanation: Arp et al. found cases where simple methods matched or beat complex ones, and Sommer and Paxson advise checking whether non-machine-learning approaches work equally well. A simple baseline sets the floor the new method must clear to justify its cost.
  - question: Your study will replay archived employee email through two filters. The institution's review board says the study does not need its review. What should you still do?
    choices:
      - Nothing more; the board's decision settles the ethics.
      - Publish the archived email so others can reproduce the study.
      - Do a stakeholder-based ethics analysis, minimize who sees message content, and get the data owner's written approval.
      - Ask employees to forward their email to the research team.
    answer: 2
    explanation: USENIX Security's ethics guidelines say review-board approval is not a substitute for ethical analysis. Employees are stakeholders even in an offline replay, so the plan should limit access to content, secure the data, and have the organization's written approval.
---

## Why it matters

Nearly every security result is a comparison: a new defense against the current one, a detector against the state of the art, a configuration against the default. If the comparison is not controlled, the measured difference may come from the data, the tuning effort, a lucky random seed or the mix of attacks in the test set, rather than from the idea being tested. Good experimental design separates those explanations before any data are collected, when it is cheap. After the data are in, most design flaws cannot be repaired.

Flawed comparisons are common even in strong venues. van der Kouwe and colleagues read 50 systems-defense papers from the four top security conferences and defined 22 kinds of benchmarking flaws. Papers averaged about five flaws each, and only one paper in the sample had none. Typical flaws included evaluating against no proper baseline, comparing a system only against the authors' own earlier work, using the same dataset to calibrate and to validate, and reporting numbers with no indication of their variability. Arp et al. found related problems in machine-learning security papers, such as [[sampling-bias|sampling bias]], [[data-snooping|data snooping]], parameters chosen by looking at the test set, and weak baselines.

## The core idea

A controlled experiment changes one thing on purpose, keeps everything else fixed or randomized, and measures what happens. The thing you change is the **independent variable**; in the language of the NIST/SEMATECH statistics handbook it is a *factor*, and its settings are *levels*, such as "Defense A", "Defense B" and "current filter". What you measure is the **dependent variable**, or *response*, such as the share of phishing caught. Everything else that could affect the response must be held constant, randomized or measured.

A **confounding variable** is one that changes along with the independent variable and also affects the response. If a new filter is installed in the same month as a security-awareness campaign, any drop in phishing clicks has two possible causes, and the experiment cannot separate them.

Clinical trials are a useful analogy. A new drug is compared with the current standard treatment, not with nothing. Patients are assigned at random, outcomes are defined before the trial starts, and the analysis plan is written down in advance. Security experiments follow the same logic.

Three assumptions sit underneath every design and should be stated: that the environment can be controlled (for example, a testbed or a replay of recorded traffic), that the measured response captures the property you care about, and that the data resemble the setting where the conclusion will be used.

## How it works

### Start from a falsifiable hypothesis

A [[hypothesis]] is a specific statement that the experiment could prove wrong. "Our detector is effective" cannot fail, so it cannot be supported either. A usable version names the system, the comparison, the measure, the threshold and the conditions: "On mail received from July to September, Defense A catches at least 10 percentage points more phishing than the current filter, at a false-positive rate no higher than 0.1%." Write it down, with the date, before running anything.

### Choose comparisons that each answer a question

Each comparison earns its place by answering a distinct question:

| Comparison                           | Question it answers                       | Example                                       |
| ------------------------------------ | ----------------------------------------- | --------------------------------------------- |
| Control (status quo)                 | Is it better than what we already have?   | The current mail filter                       |
| Trivial floor                        | Does the metric reward anything real?     | Flag every message that contains a link       |
| Simple, well-understood method       | Is the added complexity worth its cost?   | A domain blocklist, or a logistic regression  |
| State of the art, rerun on your data | Is it new?                                | The strongest published method you can obtain |
| Ablations                            | Which component produces the improvement? | Defense B without its look-alike rule         |

The control condition plays the role of a [[control-group|control group]]: it receives everything except the treatment. A [[baseline]] is any reference point the new method is measured against. An [[ablation-study|ablation study]] removes one component at a time to show what each contributes, which van der Kouwe et al. call testing the elements of a solution incrementally. For a defense that adds runtime overhead, they note that the proper baseline is usually the unmodified system with default settings.

Fairness rules apply to every comparison. Run baselines on the same data, with the same preprocessing and a comparable tuning budget. Numbers copied from another paper's table are not a baseline, because that paper used different data and a different protocol. Sommer and Paxson add two checks: reproduce a baseline system's published results before comparing against it, and ask whether a simple non-machine-learning approach would work equally well.

### Separate training, tuning and testing

Split the data three ways: a training set to build the system, a validation set to choose thresholds and settings, and a test set that stays sealed until the final measurement. Each time you look at test results and change something, the test set leaks into the design, and the final number becomes optimistic.

Security data need two more precautions. First, split by time: train on older data and test on newer data, because attackers change and a deployed system only knows the past. A random split of time-ordered data lets future information into training, which is a form of data snooping. Second, keep related samples together. Messages from one phishing campaign, or samples from one malware family, should land on one side of the split, or the test measures memory rather than generalization.

Finally, decide the class ratio. Test at a realistic base rate, or report rates that let readers recompute results for one. The lesson on [metrics and statistics](lesson:RES-04) shows why.

### Control nuisance factors: randomize, block, replicate

- **Randomize.** When you assign users, machines or runs to conditions, let a random number generator decide. The NIST/SEMATECH handbook describes a *completely randomized design*, in which the levels of the factor are assigned to experimental units at random and the run order is random too. Randomization balances, on average, the factors you did not think to measure.
- **Block.** If a known nuisance factor matters, such as department or operating system, group units by it and randomize within each group. This is a *randomized block design*.
- **Replicate.** Repeat each condition with different random seeds, data samples or runs, and report the spread. A single run cannot show whether a difference is larger than the noise.
- **Blind.** People who label results should not know which system produced them.

### Fix the analysis plan in advance

Before the experiment, record the primary metric, the decision threshold, the statistical test, the number of runs and the sample size. Recording this plan with a date before the data exist, ideally in a public registry or at least with an advisor, is called **preregistration**. It does not forbid exploration; it separates the planned test from exploratory findings, which should be labeled as such. The lesson on [metrics and statistics](lesson:RES-04) covers [[statistical-significance|significance]] and [[confidence-interval|confidence intervals]].

### List threats to validity

[[threats-to-validity|Threats to validity]] are reasons the conclusion could be wrong. Name them during design, when you can still do something about them:

| Type       | Question                                | Security example                                   | Mitigation                                            |
| ---------- | --------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Internal   | Did the treatment cause the difference? | A training campaign coincides with the new filter  | Randomize assignment; change one factor at a time     |
| External   | Does the result hold elsewhere?         | Data from one bank's mail only                     | Test a second environment, or state the limit plainly |
| Construct  | Does the measure capture the goal?      | "Messages flagged" counts alerts, not harm avoided | Measure phishing caught and false alarms separately   |
| Conclusion | Is the inference sound?                 | One run per condition, no variability reported     | Replicate; report confidence intervals                |

### Plan for ethics from the start

Experiments that involve people, their data or live systems need an ethics plan. The [[menlo-report|Menlo Report]] adapts the principles of human-subjects research to computer security and other information technology research. USENIX Security asks authors to identify every stakeholder and analyze the effects on each, starting from the Menlo principles: respect for persons, beneficence, justice, and respect for law and public interest. Its guidelines also say that approval from an [[irb|institutional review board]] does not replace that analysis. Studies that deceive participants, such as a [[phishing-simulation|phishing simulation]], need particular care, and the lesson on [student-data governance and institutional review](lesson:GRC-04) covers the review process.

## Worked example

The security team at the fictional `bank.example` must choose between two fictional phishing defenses for employee mail:

- **Defense A** is a machine-learning classifier at the mail gateway.
- **Defense B** checks each link at delivery time and flags domains that imitate the bank's protected names, using a [[confusable-skeleton|confusable skeleton]] comparison for look-alike characters and an edit-distance check for typos.

The team will replay archived, labeled mail from January to September through each condition in an isolated environment. Here is the plan they wrote before running anything:

```yaml
question: Which defense, or combination, should bank.example deploy for employee mail?
hypotheses:
  H1: On Jul-Sep mail, A catches >= 10 points more phishing than the current filter at FPR <= 0.1%.
  H2: Of the look-alike-domain phishing that A misses, B catches at least 25%.
independent_variable:
  levels: [current filter, flag-all-links, blocklist, A, B, A+B, A without URL features, B without look-alike rule]
dependent_variables:
  primary: recall on phishing at FPR <= 0.1%
  secondary: [false-positive rate, alerts per 1000 messages, precision at the observed base rate]
data:
  source: archived employee mail, Jan-Sep (fictional), including mail the current filter quarantined
  labels: incident reports, plus two analysts who label a random sample of all mail; disagreements counted
  split: train Jan-May, tune Jun, test Jul-Sep (sealed); each campaign assigned by first-seen date
tuning: thresholds chosen on June only; every system gets the same tuning budget
replication: A trained 5 times with different seeds; report mean, spread and 95% intervals
analysis: preregistered; paired comparison on the same test messages; exploratory results labeled as such
threats:
  - internal: the current filter also produced some labels, which favors it; mitigated by the random-sample labeling
  - external: one organization's mail; stated as a limit
  - construct: alerts are not harm avoided; recall and false alarms reported separately
ethics:
  approval: written approval from the bank's privacy officer and data owner
  minimization: analysts see only messages that are sampled or flagged; content never leaves the environment
  people: no employee is contacted or deceived; a live phishing simulation would need a separate review
```

Each line answers a question a skeptical reader would ask. **The flag-all-links floor** shows how much recall can be bought with false alarms alone. **The two ablations** test whether each defense's key idea is what helps. **Splitting by month** keeps the future out of training, and assigning each campaign by first-seen date stops one campaign from appearing on both sides. **Keeping quarantined mail** matters because an archive of delivered mail alone would hide everything the current filter caught. **The labeling plan** addresses [[sampling-bias|sampling bias]]: incident reports only contain phishing that someone noticed or that the current filter caught, so labels drawn only from them would favor the current filter and hide phishing that every system missed. Independent labels from a random sample give better [[ground-truth|ground truth]]. **The paired comparison** uses the fact that every system sees the same messages, which makes the comparison more sensitive than comparing two independent samples.

The plan also states what it cannot show. It says nothing about other organizations, nothing about an attacker who adapts after B is deployed, and nothing about how employees respond to warnings, which would need a separate user study.

## In practice

- **Pilot first.** Run the whole pipeline on a small sample to catch measurement bugs before the real run.
- **Use testbeds and replays.** Recorded traffic or mail replayed in an isolated environment gives control without touching live systems. Running experiments on systems you do not own needs written authorization.
- **Version everything.** Record code versions, seeds and data snapshots so the experiment can be repeated; see [reproducibility and artifact packaging](lesson:RES-03).
- **Log deviations.** If the plan changes, record what changed and why, and report it.
- **Be honest about observational data.** When you cannot assign the treatment, for example when you analyze incidents after the fact, you can show association, not causation. Say so.

> [!NOTE]
> Changing a production system for an experiment, even a mail filter, affects real people. Get written approval from the system's owner and keep a rollback plan.

## Common misconceptions

- **"A baseline is optional when the result is strong."** Without a reference point, "strong" has no meaning. A 90% detection rate is poor if a blocklist reaches 95% at the same false-positive rate.
- **"Quoting another paper's numbers is a fair comparison."** Different data and protocols make those numbers incomparable. Rerun the method on your data, or say you could not.
- **"A random split is always safe."** For time-ordered or clustered security data, it leaks the future and near-duplicates into training.
- **"More data fixes bias."** A large biased sample gives a precise wrong answer. Fix how data are collected, not only how much.
- **"Looking at the test set once more is harmless."** Every look that changes a decision turns the test set into tuning data.
- **"Review-board approval means the study is ethical."** It is one check. A stakeholder-based analysis is still the researcher's job.

## Try it yourself

Plan, on paper, a controlled experiment that compares two detection rule sets for look-alike domains. The [homograph lab](lab:homograph) provides a twelve-name labeled dataset and a rule builder you can use as the development set.

1. Write one primary hypothesis that names the systems, measure, threshold and conditions.
2. List the conditions: a control, a trivial floor, a simple baseline and at least one ablation. Justify each in one sentence.
3. Explain why the lab's twelve names can serve as a development set but not as the test set, and describe how you would build a larger, independently labeled test set of fictional `.test` names.
4. Fill a threats-to-validity table with one entry for each of the four types.
5. Write your analysis plan: primary metric, number of runs, and what result would make you reject the hypothesis.
6. Trade plans with a classmate. For each condition in their plan, ask "what question does this answer?" Remove any condition that answers none.

## Key takeaways

- A controlled experiment changes one factor, holds or randomizes the rest, and measures a response chosen in advance.
- Every comparison should answer a question: control, trivial floor, simple baseline, state of the art and ablations each answer a different one.
- Split security data by time, keep related samples together, tune on validation data, and open the test set once.
- Name threats to validity and ethical risks during design, when they can still be fixed.

## Go deeper

- van der Kouwe et al. give the full list of 22 benchmarking flaws with recommendations, a useful pre-submission checklist: [SoK: Benchmarking Flaws in Systems Security](https://trustworthy.systems/publications/full_text/vanderKouwe_HABG_19.pdf) (IEEE EuroS&P 2019).
- Arp et al. pair each of their ten pitfalls with recommendations: [Dos and Don'ts of Machine Learning in Computer Security](https://www.usenix.org/conference/usenixsecurity22/presentation/arp) (USENIX Security 2022).
- The NIST/SEMATECH handbook's section on choosing an experimental design covers completely randomized, randomized block and factorial designs: [section 5.3](https://www.itl.nist.gov/div898/handbook/pri/section3/pri3.htm).
- Open question: an adaptive attacker changes behavior after a defense ships, so a test on past data measures the defense against yesterday's attacks. How can an evaluation estimate robustness to adaptation without publishing a recipe for evasion?
