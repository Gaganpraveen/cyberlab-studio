---
topicId: RES-01
title: Reading and comparing security papers
summary: Read a security paper as an argument, extract its claims, methods, assumptions and limitations, and compare two papers fairly even when their headline numbers are not directly comparable.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 70
objectives:
  - Summarize a paper after a first pass by answering Keshav's five Cs and stating its threat model in one sentence.
  - Extract a paper's main claims and match each one to the evidence, method and assumptions that support it.
  - Identify limitations a paper states and limitations it leaves out, such as an unrealistic base rate or a missing baseline.
  - Compare two papers on a fixed set of axes and explain when their headline numbers cannot be compared.
prerequisites: [FND-03, FND-08]
concepts: [systematization-of-knowledge, threats-to-validity, baseline, threat-model]
labs: []
keywords:
  - three-pass method
  - five Cs
  - how to read a paper
  - literature review
  - literature survey
  - related work
  - SoK
  - systematization of knowledge
  - claims and evidence
  - reading log
  - paper comparison matrix
  - IEEE S&P
  - USENIX Security
  - ACM CCS
  - NDSS
sources:
  - title: How to Read a Paper (version of February 17, 2016)
    url: https://svr-sk818-web.cl.cam.ac.uk/keshav/papers/07/paper-reading.pdf
    publisher: S. Keshav (author's copy; first published in ACM SIGCOMM Computer Communication Review, July 2007)
  - title: 'Outside the Closed World: On Using Machine Learning for Network Intrusion Detection (IEEE S&P 2010)'
    url: https://www1.icsi.berkeley.edu/pubs/networking/outsidethe10.pdf
    publisher: International Computer Science Institute (authors' copy)
  - title: "Dos and Don'ts of Machine Learning in Computer Security (USENIX Security 2022)"
    url: https://www.usenix.org/conference/usenixsecurity22/presentation/arp
    publisher: USENIX Association
  - title: 'SoK: Benchmarking Flaws in Systems Security (IEEE EuroS&P 2019)'
    url: https://trustworthy.systems/publications/abstracts/vanderKouwe_HABG_19.abstract
    publisher: Trustworthy Systems group, UNSW Sydney (publication page)
  - title: IEEE Symposium on Security and Privacy 2026, Call for Papers
    url: https://sp2026.ieee-security.org/cfpapers.html
    publisher: IEEE Symposium on Security and Privacy
quiz:
  - question: After a first pass, you still cannot tell what kind of attacker a defense paper assumes. What is the most useful next step?
    choices:
      - Stop reading, because a paper without an obvious threat model must be wrong.
      - Assume the strongest attacker you can imagine and judge the paper against that.
      - Write "threat model unclear" as an open question and look for it in the design and evaluation sections during the second pass.
      - Borrow the threat model from a related paper in the same area.
    answer: 2
    explanation: The first pass is for orientation, not judgment. An unclear threat model is a finding to carry into the second pass, where the design and evaluation usually reveal what the attacker can and cannot do. If it is still missing after a careful read, that becomes a stated weakness. Substituting your own or another paper's threat model judges the authors against a claim they never made.
  - question: Paper A reports 99.2% accuracy on a dataset that is half phishing and half benign. Paper B reports catching 91% of phishing URLs at a 0.05% false-positive rate on data with one phishing URL per 1,000 benign ones. What can you conclude?
    choices:
      - A is better, because 99.2 is larger than 91.
      - The numbers are not directly comparable; you need A's detection and false-positive rates measured on comparable data.
      - B is better, because any false-positive rate below 1% is good enough.
      - They are equally good, because both exceed 90%.
    answer: 1
    explanation: Accuracy on balanced data hides how many false alarms a detector raises when benign traffic dominates. B reports the two rates that matter at a stated base rate; A reports a single number on unrealistic data. The honest comparison is "not comparable as published", followed by what extra information would make it comparable.
  - question: A detector is trained and tested on a random split of URLs collected during one month. Why might the test score overstate how well it would work after deployment?
    choices:
      - The training set can hold URLs from the same campaigns, and from later dates, than the test URLs, which a deployed detector would never have seen.
      - Random splits always make a detector look worse than it is.
      - One month of data is too little to train any classifier.
      - Splitting URLs into separate sets is impossible.
    answer: 0
    explanation: This is data snooping. At deployment the detector only knows the past, and new campaigns look different. A random split lets near-duplicate URLs and future information leak into training. A split by time, with whole campaigns kept on one side, is closer to reality.
  - question: What distinguishes a Systematization of Knowledge (SoK) paper at IEEE S&P from an ordinary survey?
    choices:
      - It must present a new attack.
      - It must be shorter than a research paper.
      - It must include a user study.
      - It must add insight, such as a new taxonomy or strong evidence against a long-held belief, rather than only summarize prior papers.
    answer: 3
    explanation: The IEEE S&P call for papers says SoK papers are judged on their treatment of existing work and their value to the community, and that surveys without such insight are not appropriate. An SoK is therefore a good place to start in a new area, but it is still an argument to check, not a neutral list.
  - question: During a third pass you redo a paper's calculation and find that its advantage over the baseline holds only if attacks are as common as benign events, which the paper never states. Where does this belong in your notes?
    choices:
      - Nowhere, because the authors did not make that claim.
      - In the contributions column, because you discovered it.
      - In the limitations column, as an unstated assumption that narrows the claim.
      - In the clarity column only, because it is a writing problem.
    answer: 2
    explanation: An unstated assumption that the result depends on is a limitation of the claim, whether or not the authors noticed it. Recording it next to the claim it narrows is what makes the claim table useful later, for example when you compare papers or design your own experiment.
---

## Why it matters

Security papers shape what gets built, deployed and taught. A headline such as "our detector catches 99% of attacks" travels quickly, while the conditions behind it (which data, which attacker, which comparison) stay in the evaluation section. Reading a paper well means recovering those conditions before you repeat the number, build on it, or cite it in your own work.

The cost of skipping that step is well documented. In 2010, Robin Sommer and Vern Paxson observed that machine-learning anomaly detection was widely studied in academic intrusion-detection research but rarely deployed by operators, who relied mostly on signature-based systems. Their explanation pointed to ways intrusion detection differs from domains where machine learning succeeds, such as a much higher cost of errors, and to evaluation problems: scarce and outdated public datasets, and ground truth that was hard to establish. The paper received the symposium's [Test of Time award in 2020](https://www.ieee-security.org/TC/SP2020/awards.html). Twelve years later, Arp and colleagues described ten pitfalls of machine learning in security, including [[sampling-bias|sampling bias]], [[data-snooping|data snooping]] and the [[base-rate-fallacy|base-rate fallacy]], and found them widespread in a study of 30 papers from top-tier venues.

None of this means papers are untrustworthy. It means a paper is an argument made by people who want to persuade you, and reading it is an active skill. This lesson gives you a method for that skill and a way to compare papers whose numbers look comparable but are not.

## The core idea

Treat every paper as a chain: **claims** rest on **evidence**, evidence comes from a **method**, and the method rests on **assumptions**. Reading means rebuilding that chain and testing each link. A strong paper makes the chain easy to follow; a weak one leaves links implicit, and the missing links are usually where the limitations hide.

Think of the paper as a lawyer's brief and yourself as the judge. The brief is written to win, cites the evidence that helps, and is most convincing where it is most specific. The judge asks what was actually shown, under what conditions, and what the other side would say.

Two assumptions frame the method. First, your purpose sets the depth: deciding whether a paper is relevant takes minutes, reviewing it takes hours, and building on it may take days. Second, you cannot verify everything, so you spend effort where a wrong assumption would most change the conclusion.

Claims come in recognizable kinds, and each kind needs a different kind of evidence:

| Kind of claim | Example                                                     | Evidence that would support it                        |
| ------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Existence     | "Attack X works against design Y."                          | A demonstration under a stated threat model           |
| Performance   | "Detector D catches 90% of attacks at 0.1% false positives" | Measurements on realistic data, with uncertainty      |
| Comparison    | "D is better than the state of the art."                    | Fair baselines run on the same data                   |
| Generality    | "D works across networks."                                  | Several independent datasets or environments          |
| Security      | "No attacker with capability C can do X."                   | A proof or model check, plus a justified threat model |

## How it works

S. Keshav's three-pass method, first published in 2007 and revised since, is a practical way to spend reading time well. Each pass builds on the previous one, and you can stop after any pass.

### Pass 1: orientation and the five Cs

Spend five to ten minutes on the title, abstract, introduction, section headings, conclusions and references. Glance at any math without working through it. Then answer Keshav's five Cs:

1. **Category.** What kind of paper is it: attack, defense, measurement study, user study, formal analysis, or survey?
2. **Context.** Which earlier papers and ideas does it build on?
3. **Correctness.** Do the assumptions look valid at first sight?
4. **Contributions.** What does it claim to add?
5. **Clarity.** Is it well written?

For security papers add a sixth item: the [[threat-model|threat model]] in one sentence, naming who the attacker is, what they can do, and what they want. If you cannot write that sentence yet, write it as an open question.

### Pass 2: the claim-evidence table

Keshav budgets up to an hour for an experienced reader. Read carefully but skip proofs, and look hard at figures: are the axes labeled, are there error bars, is a difference large compared to its uncertainty? Build a table with one row per main claim:

| Claim | Evidence (section, figure) | Method | Assumptions | Limitations (stated / not stated) |
| ----- | -------------------------- | ------ | ----------- | --------------------------------- |

Fill the last column honestly. Authors list the limitations they noticed and chose to share; the others are yours to find.

### Pass 3: virtual re-implementation

The key to the third pass, in Keshav's words, is to "virtually re-implement the paper": accept the authors' assumptions, rebuild the work in your head or on paper, and compare your version with theirs. In security this usually means three things. Redo the arithmetic, for example by turning a reported false-positive rate into an alert count at a realistic base rate. Check that the comparison is fair, meaning the same data, tuning effort and metric for every system. And ask whether the code and data were released as a [[research-artifact|research artifact]] that someone could rerun. Keshav notes this pass can take many hours for beginners.

### Questions that expose common weaknesses

The pitfalls cataloged by Arp et al. and by Sommer and Paxson turn into questions you can ask of any empirical paper:

- **Data.** Does the dataset represent the deployment setting, or was it collected in a way that over-represents easy cases (sampling bias)?
- **Separation.** Could information from the test set, or from the future, have reached training or tuning (data snooping)?
- **Ground truth.** How were labels obtained, and were they established independently of the system being tested?
- **Baselines.** Is there a simple, well-understood [[baseline]], including a non-machine-learning one, run by the authors on the same data?
- **Metrics.** Do the metrics fit the problem? For rare events, [[precision]] and the [[false-positive-rate|false-positive rate]] matter more than accuracy.
- **Setting.** Was the system tested only in a lab, and does the paper discuss what changes in practice?
- **Adversary.** Does the evaluation consider an attacker who knows the defense and adapts to it?

Each question the paper cannot answer well is a [[threats-to-validity|threat to validity]]: a reason the conclusion might not hold. It is not proof that the conclusion is wrong.

### Comparing papers

To compare papers, fix the axes before you look at the results: problem and threat model, data source and time span, class ratio, split method, metrics, baselines, uncertainty reporting, artifacts, and stated limitations. Then fill a matrix. Where two papers differ on data, base rate or metric, the honest entry is "not comparable as published", followed by what would make them comparable.

Paper type matters too. A [[systematization-of-knowledge|Systematization of Knowledge (SoK)]] paper organizes an area. IEEE S&P judges SoK submissions on their treatment of existing work and their value to the community, and its call for papers says surveys without such insight are not appropriate. An SoK is often the best first read in a new area, but its taxonomy is still an argument.

## Worked example

Two fictional papers propose phishing-URL detectors. Neither exists; the numbers are invented for teaching.

- **Paper A** classifies URLs from their characters. On 20,000 URLs collected in one month (10,000 phishing, 10,000 benign), with 10-fold cross-validation, it reports **99.2% accuracy** and says it "outperforms prior work".
- **Paper B** uses hosting features such as domain age and certificate details. It trains on January to June data from the mail gateway of the fictional `bank.example`, tests on July to September, with one phishing URL per 1,000 benign URLs, and reports **91% of phishing caught at a 0.05% false-positive rate**. It compares against a blocklist and a character-based baseline that it runs itself.

**Step 1: first pass.** Both are defense papers about [[phishing]] with similar contributions. Threat model: an attacker who sends phishing links to a bank's customers. Neither states whether the attacker knows the detector, so that becomes an open question.

**Step 2: claim-evidence table for Paper A.**

| Claim                  | Evidence                         | Assumptions                                                        | Limitations not stated                                                  |
| ---------------------- | -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 99.2% accuracy         | Cross-validation table           | Half of all URLs are phishing; URLs from one month are independent | Base rate is unrealistic; random folds mix URLs from the same campaigns |
| Outperforms prior work | Numbers quoted from other papers | Other papers' datasets are comparable to this one                  | No baseline was run on the same data                                    |

**Step 3: re-derive.** Paper A gives only accuracy, so suppose its 99.2% comes from catching 99.0% of phishing with a 0.6% false-positive rate (the average of 99.0% and 99.4% is 99.2%). At Paper B's base rate, take 1,000 phishing URLs and 1,000,000 benign ones:

| Detector | Phishing caught    | False alarms              | Share of alerts that are phishing (precision) |
| -------- | ------------------ | ------------------------- | --------------------------------------------- |
| A        | 0.99 × 1,000 = 990 | 0.006 × 1,000,000 = 6,000 | 990 / 6,990 ≈ 14%                             |
| B        | 0.91 × 1,000 = 910 | 0.0005 × 1,000,000 = 500  | 910 / 1,410 ≈ 65%                             |

The split of A's accuracy into two rates was an assumption, and another split gives a different answer. That is itself the finding: Paper A does not report enough to be compared.

**Step 4: comparison matrix (abridged).**

| Axis              | Paper A             | Paper B                       |
| ----------------- | ------------------- | ----------------------------- |
| Data              | One month, balanced | Nine months, one organization |
| Split             | Random folds        | By time                       |
| Base rate         | 1:1                 | 1:1,000                       |
| Baselines         | None run            | Blocklist and character-based |
| Uncertainty       | None reported       | None reported                 |
| Adaptive attacker | Not discussed       | Not discussed                 |

**Step 5: conclusion.** "Paper B's evaluation is closer to deployment: it splits by time, uses a realistic base rate and runs its own baselines. Paper A's accuracy cannot be compared with B's results without its false-positive rate on comparable data. Both papers omit confidence intervals and an attacker who adapts, and B's data from a single organization limits how far its results generalize."

## In practice

- **Keep a reading log.** One entry per paper: citation, five Cs, threat-model sentence, claim table, and a two-sentence verdict. Logs make literature reviews and related-work sections far easier.
- **Survey an area systematically.** Keshav suggests finding three to five recent, highly cited papers, reading their related-work sections, noting shared citations and recurring authors, and scanning recent proceedings of the venues where those authors publish. In security, the four venues most often called "top tier" are IEEE S&P, USENIX Security, ACM CCS and NDSS.
- **Look beyond the PDF.** Check for released artifacts, errata, later papers that reproduce or contradict the result, and any public review. IEEE S&P 2026 publishes a short meta-review with each accepted paper, listing reasons for acceptance and remaining concerns.
- **Separate preprints from reviewed work.** A preprint has not been through [[peer-review|peer review]]. A reviewed paper has passed a filter, not a verification: reviewers rarely rerun experiments.
- **Run reading groups with roles.** One student presents, one argues against the paper, and one checks whether the results could be reproduced.

## Common misconceptions

- **"Peer reviewed means correct."** Reviewers judge plausibility, novelty and clarity with limited time and usually without rerunning anything. Treat a published result as filtered, not verified.
- **"The bigger number wins."** Numbers compare only when data, base rate, metric and protocol match. Otherwise the right answer is "not comparable".
- **"The abstract states the result."** The abstract states the best case. The conditions are in the evaluation section.
- **"The limitations section lists the limitations."** It lists the ones the authors chose to share. Your claim table should hold the rest.
- **"Old papers are obsolete."** Datasets and attacks age quickly; arguments age slowly. The base-rate argument in intrusion detection dates from 1999 and still applies.

## Try it yourself

Pick two open-access papers that address the same problem; USENIX Security papers are free to read. Sommer and Paxson (2010) with Arp et al. (2022) is a good pairing: both examine how machine learning is evaluated in security, twelve years apart.

1. Do a first pass on each paper, no more than ten minutes each, and write the five Cs and a one-sentence threat model.
2. For one paper, build a claim-evidence table with at least four claims. Mark each limitation as "stated" or "not stated".
3. Choose six to eight comparison axes **before** rereading the results, then fill the matrix for both papers.
4. Write a 150-word comparison that ends with one sentence on what cannot be compared and why.
5. Swap with a classmate and check each other's tables against the papers. Every disagreement is either a reading error or a place where the paper is ambiguous; note which.

> [!TIP]
> If a third-pass calculation needs a number the paper does not report, write down the assumption you made and try a second plausible value. If the conclusion flips, the paper does not support it.

## Key takeaways

- A paper is an argument: claims rest on evidence, evidence on methods, and methods on assumptions. Rebuild the chain and test each link.
- Use passes: the five Cs in minutes, a claim-evidence table in about an hour, and a virtual re-implementation when you depend on the result.
- Most weaknesses in empirical security papers show up in a few places: data, data separation, ground truth, baselines, metrics, setting and adversary.
- Compare papers on axes chosen in advance, and say "not comparable as published" when data, base rates or metrics differ.

## Go deeper

- Keshav's paper includes a short method for literature surveys and a list of related reading: [How to Read a Paper](https://svr-sk818-web.cl.cam.ac.uk/keshav/papers/07/paper-reading.pdf).
- Arp et al.'s project page summarizes all ten pitfalls with recommendations and links to supplementary material: [dodo-mlsec.org](https://dodo-mlsec.org/).
- van der Kouwe et al. surveyed 50 systems-defense papers from the top four security venues and found benchmarking flaws averaging about five per paper: [SoK: Benchmarking Flaws in Systems Security](https://trustworthy.systems/publications/abstracts/vanderKouwe_HABG_19.abstract) (IEEE EuroS&P 2019).
- Open question: shared benchmark datasets make papers comparable but can drift away from real deployments, while private operational data is realistic but hard to share. How should a field balance comparability against realism?
