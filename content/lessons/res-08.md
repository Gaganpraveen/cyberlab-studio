---
topicId: RES-08
title: Research communication and peer review
summary: Write security results so that every claim carries its evidence and its scope, understand how peer review works at major security venues, and respond to critique with evidence, concessions and concrete changes.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 50
objectives:
  - Rewrite an overclaiming result so that its wording, denominators, intervals and scope match the evidence.
  - Write limitations that each name a threat to validity, the claim it affects, and what would remove it.
  - Describe how a submission moves through review at USENIX Security and IEEE S&P, including anonymization, rebuttal, decisions and required statements.
  - Respond to reviewer critique by classifying each point and answering it with evidence, a concession or a narrower claim.
  - Write a specific, answerable review of another team's report.
prerequisites: [RES-01, RES-02, RES-04]
concepts: [peer-review, rebuttal, double-blind-review, threats-to-validity, menlo-report]
labs: []
keywords:
  - research communication
  - scientific writing
  - limitations section
  - overclaiming
  - calibrated claims
  - peer review
  - rebuttal
  - author response
  - shepherding
  - meta-review
  - double-blind review
  - program committee
  - ethics considerations
  - open science
  - Menlo Report
sources:
  - title: "USENIX Security '26 Call for Papers"
    url: https://www.usenix.org/conference/usenixsecurity26/call-for-papers
    publisher: USENIX Association
  - title: IEEE Symposium on Security and Privacy 2026, Call for Papers
    url: https://sp2026.ieee-security.org/cfpapers.html
    publisher: IEEE Symposium on Security and Privacy
  - title: 'Ethical Frameworks and Computer Security Trolley Problems: Foundations for Conversations (USENIX Security 2023)'
    url: https://www.usenix.org/conference/usenixsecurity23/presentation/kohno
    publisher: USENIX Association
  - title: American Statistical Association Releases Statement on Statistical Significance and P-Values (March 7, 2016)
    url: https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf
    publisher: American Statistical Association
  - title: How to Read a Paper (version of February 17, 2016)
    url: https://svr-sk818-web.cl.cam.ac.uk/keshav/papers/07/paper-reading.pdf
    publisher: S. Keshav (author's copy; first published in ACM SIGCOMM Computer Communication Review, July 2007)
quiz:
  - question: A draft abstract says "Detector E catches 82% of phishing domains." Which revision is limitation-aware?
    choices:
      - E catches the vast majority of phishing domains.
      - E catches 82% of phishing domains with high statistical confidence.
      - On our 200-name test set covering three imitation categories, E caught 164 names (82%, 95% CI 76% to 87%); other imitation types and real traffic were not tested.
      - E achieves 82% accuracy, outperforming prior work.
    answer: 2
    explanation: The revision gives the denominator, the interval and the scope, so a reader can see how far the number reaches. The other choices drop the test set's limits, add confidence the data do not provide, or swap recall for accuracy, and each claims more than the evidence supports.
  - question: A reviewer writes that E's 7% false-positive rate makes it unusable. The 7% was measured on 200 deliberately hard benign names; on 5,000 background names E flagged 3. What is the best rebuttal?
    choices:
      - Point to the background result with its interval, explain what the hard-negative set measures, and concede that precision on real traffic remains unmeasured.
      - Say nothing, because the reviewer misread the paper and the committee will notice.
      - Tell the committee that the reviewer lacks expertise in detection.
      - Delete the hard-negative results so the issue cannot come up again.
    answer: 0
    explanation: The comment mixes a misreading with a valid core. A good response corrects the misreading with evidence and concedes the valid part. Silence lets the misreading stand, attacking the reviewer persuades no one, and deleting unfavorable results is selective reporting.
  - question: Your paper is accepted on shepherd approval at a venue where shepherding lasts at most two weeks. Which promise from your rebuttal was unwise?
    choices:
      - We will add the paired confidence interval to Table 2.
      - We will collect and label a new test set of real traffic.
      - We will state in the introduction that our results cover open rule sets only.
      - We will explain in Section 4 who built the hard negatives.
    answer: 1
    explanation: Building and labeling a credible test set takes weeks, as the evaluation capstone showed, so this promise cannot be kept in the shepherding window. Narrow the claim instead and list the new data as future work. The other promises are small, concrete edits the team can deliver.
  - question: Which review comment is most constructive?
    choices:
      - The evaluation is weak.
      - Reject. The authors do not understand detection.
      - The authors should cite more related work.
      - Table 2 reports recall only on synthetic names. How were they generated, and do any overlap with the development set? Overlap would inflate recall.
    answer: 3
    explanation: A constructive comment points to specific evidence, says why it matters, and asks something the authors can answer or fix. Vague verdicts give authors nothing to act on, and comments about the people rather than the paper break review norms.
  - question: Which limitation statement is most useful to a reader?
    choices:
      - Like all studies, ours has limitations, and results may not generalize.
      - Further work is needed to confirm these results.
      - One team built all 200 imitation names in three categories, so recall on other kinds of imitation is unknown; a test set built by a second team would address this.
      - Our dataset is small, but we believe the results are robust.
    answer: 2
    explanation: A useful limitation names the specific threat, the claim it affects and what would remove it. Generic caveats do not tell the reader which result to discount or by how much, and "we believe" adds confidence without adding evidence.
---

## Why it matters

A result helps no one until other people can read, check and use it. In security, those readers include engineers who deploy a defense because a paper's numbers looked good, and researchers who build on a claim without rerunning it. When a claim outruns its evidence, they pay: a detector reported as 99% accurate on balanced data can still bury analysts in false alarms, as the [metrics](lesson:RES-04) lesson showed. This domain's guiding rule applies here most of all: never present toy evidence as general proof.

[[peer-review|Peer review]] is the field's main quality filter, and you will play both roles: author and reviewer. The major venues have also made parts of research communication mandatory. USENIX Security '26 requires an "Ethical Considerations" appendix and an "Open Science" appendix of up to one page each, and IEEE S&P 2026 requires every paper to end with an "Ethics considerations" section.

## The core idea

Treat every claim in a report as a triple: the **claim**, the **evidence** that supports it, and the **scope** within which it holds, meaning the data, setting and attacker that the evidence covers. A limitation-aware report states all three, so a reader can see how far a result reaches. Peer review tests that argument: reviewers look for claims that outrun their evidence, and authors answer with more evidence, corrections or narrower claims.

The words themselves should match the strength of the evidence. "Proves" and "guarantees" belong to proofs under stated assumptions, as in the [formal methods](lesson:RES-05) lesson. "Shows" fits a controlled experiment reported with its uncertainty. "Suggests" or "is consistent with" fits small or observational studies. Most overclaims are fixed not by deleting a result but by adding a denominator, a [[confidence-interval|confidence interval]] or a scope.

| Overclaim                            | What is wrong                                      | Calibrated version                                                                              |
| ------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| "E detects 82% of phishing domains." | The test set is not all phishing                   | "E detected 164 of 200 imitation names in our test set (82%, 95% CI 76% to 87%)."               |
| "E outperforms S."                   | Hides the uncertainty and where the gain came from | "E's recall was 8 points higher (95% CI 2 to 14), entirely from one-letter typosquats."         |
| "S has no false positives."          | Zero observed is not a zero rate                   | "S flagged none of 5,000 synthetic background names, consistent with a rate up to about 0.06%." |
| "Our filter stops SQL injection."    | Testing cannot show completeness                   | "Our filter blocked all 40 attack inputs in our suite; we make no claim about other inputs."    |
| "A significant improvement."         | Significance says nothing about size               | "An improvement of 8 percentage points (95% CI 2 to 14, p ≈ 0.009)."                            |

## How it works

### The anatomy of a security paper

Most security papers share a shape: an abstract; an introduction that states the problem, the [[threat-model|threat model]] and a numbered list of contributions; background; design; evaluation; a discussion of limitations; related work; and the statements the venue requires. Overclaiming concentrates in the abstract and the contributions list, because they are written last, read first and compressed hardest.

Make every contribution checkable: "we show X, on data Y, under assumption Z," with a pointer to the supporting experiment. An artifact's list of major claims and experiments, as in the [reproducibility](lesson:RES-03) lesson, is the same map.

### Writing limitations that inform

A limitations section earns trust when it is specific. Compare two versions:

- **Vague:** "Our dataset may not be representative, and results may not generalize."
- **Specific:** "All 200 imitation names were built by one team in the three categories the lab teaches, so recall on other kinds of imitation is unknown. A test set built by a second team would address this."

Organize limitations by [[threats-to-validity|threats to validity]], introduced in the [experimental design](lesson:RES-02) lesson:

- **Internal validity:** could something other than the system explain the result, such as a bug, data leakage or unequal tuning?
- **Construct validity:** does the measure capture the property you claim? Recall on constructed names is not the same as protecting users.
- **External validity:** does the result transfer to other data, settings and attackers, including attackers who adapt to the defense?

For each item, state four things: the limitation, which claim it affects (and in which direction, if known), what you did to reduce it, and what would remove it.

### Reporting numbers honestly

Report denominators, intervals and base rates, not bare percentages. Report every comparison you planned, including those that came out against you, and label any analysis invented after seeing the data as exploratory. The American Statistical Association's statement on [[p-value|p-values]] puts two of its six principles plainly: "Proper inference requires full reporting and transparency," and a p-value "does not measure the size of an effect or the importance of a result." A reader who sees only "significant" learns little; a reader who sees "8 points, 95% CI 2 to 14" can decide whether 8 points matters to them.

### How review works at security venues

Details differ by venue and change every year, so always read the current call for papers. The flow below is simplified from USENIX Security '26.

```sequence
title: Review flow (simplified from USENIX Security '26)
participant A as Authors
participant C as PC chairs
participant R as Reviewers
A -> C: Anonymized paper + required appendices
C -> R: Assign reviewers without conflicts of interest
R --> C: Independent reviews
C --> A: Early reject, or reviews to answer
A -> R: Rebuttal: corrections, answers, planned changes
note R: Discussion and a shared recommendation
R --> C: Recommendation
C --> A: Accept, accept on shepherd approval, or reject
A -> R: Revision, checked by a shepherd
```

Both venues use [[double-blind-review|double-blind review]]: a submission must not reveal its authors, authors cite their own earlier work in the third person, and papers that are not properly anonymized may be rejected without review. A **shepherd** is a committee member who checks that an accepted paper makes the changes the reviewers required, and a **meta-review** summarizes the reviewers' joint assessment.

| Stage               | USENIX Security '26                                                                                      | IEEE S&P 2026                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Author response     | A [[rebuttal]] period in each cycle, for example April 16 to 23, 2026                                    | An interactive rebuttal for papers that reach the second round of reviewing                 |
| Decisions           | Accept, accept on shepherd approval, or reject; no major revisions, and at most two weeks of shepherding | Accept or reject, with no conditional acceptance                                            |
| Required statements | "Ethical Considerations" and "Open Science" appendices; artifacts shared at submission                   | An "Ethics considerations" section; an "LLM usage considerations" section if LLMs were used |
| After acceptance    | Acceptance depends on the artifacts staying publicly available                                           | A meta-review of under 500 words in the final paper; authors may respond in under 500 words |

The USENIX Security '26 ethics appendix expects a stakeholder-based analysis that starts from the [[menlo-report|Menlo Report]]'s principles, covers harms and mitigations, and explains the decision to proceed and publish. The call states that "[[irb|IRB]] approval is not a substitute for ethical analysis," and missing or inadequate ethics statements can lead to desk rejection.

### Responding to critique

A routine helps:

1. **Wait, then list.** Read every review, wait a day, and list each distinct point, merging duplicates across reviewers.
2. **Classify each point.** Is it a factual misunderstanding, a valid problem you can fix now, a valid problem you cannot fix in time, or a disagreement about value or framing?
3. **Answer the decisive points first.** Lead with what could change the outcome.
4. **Answer with evidence.** Point to a section, table or number, and say how any new number was computed.
5. **Concede plainly, and narrow what you cannot fix.** "The reviewer is right; we have narrowed the claim and added this limitation" persuades more than a defensive paragraph.
6. **Promise only what you can deliver.** With at most two weeks of shepherding at USENIX Security '26, a promise to collect new data is not credible.
7. **Stay anonymous and courteous.** The rebuttal is still part of a double-blind process; argue about the paper, never the reviewer.

Reviewing is the same skill from the other side. Read the submission as in the [reading](lesson:RES-01) lesson, including Keshav's third pass, in which you "virtually re-implement the paper." Then write a summary in your own words, the main strengths, the weaknesses separated into fatal and fixable, and specific questions the authors can answer. Treat what you review as confidential.

## Worked example

Alice and Bob finished the look-alike detector comparison from the [evaluation capstone](lesson:RES-07) and drafted their report.

**Abstract, first draft:** "We show that edit-distance detection outperforms skeleton-based detection, catching 82% of phishing domains with negligible false positives."

**Revised:** "On a 200-name test set built by an independent team in three imitation categories, edit-distance detector E caught 164 names (82%, 95% CI 76% to 87%) and skeleton-based detector S caught 148 (74%, 68% to 80%). E's paired advantage of 8 points (95% CI 2 to 14) came entirely from one-letter typosquats; S caught more homograph swaps, and neither caught hyphenated look-alikes. On 200 deliberately hard benign names, E flagged 7% and S 1%; on 5,000 synthetic background names, E flagged 3 and S none. We did not measure precision on real traffic."

The revision is longer, and that is the point: every number now carries its denominator, interval and scope.

**Limitations (excerpt).** "Internal: our harness first preprocessed inputs for E only; peer artifact review found this, and all reported numbers come from the corrected harness. Construct: recall on constructed names measures coverage of three imitation categories, not protection of users. External: one team built every imitation name and the background names come from a word list, so recall on other kinds of imitation and precision on real traffic are unknown; a second team's test set and an approved sample of real traffic would address both."

**Review (fictional Reviewer B), excerpt.**

1. "The recall intervals in Table 2 overlap, so the claimed advantage of E is not supported."
2. "A 7% false-positive rate makes E unusable. The paper should recommend S."
3. "The test set was designed by students who knew both detectors, which may bias the comparison."
4. "Please compare against a commercial phishing filter."

**Response.**

| Point                    | Type                | Response                                                                                                                                                                                                         | Change                              |
| ------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1. Overlapping intervals | Misunderstanding    | Both detectors saw the same names, so the right test is paired: on the 34 names where they disagree, McNemar's exact test gives p ≈ 0.009, with a paired 95% interval of 2 to 14 points.                         | Add the paired interval to Table 2  |
| 2. 7% false positives    | Partly valid        | The 7% comes from deliberately hard names; on 5,000 background names E flagged 3 (0.06%, 95% CI 0.02% to 0.18%). We agree precision on real traffic is unmeasured and recommend neither detector for deployment. | Remove "negligible false positives" |
| 3. Biased test set       | Valid               | Another team built the set before any detector ran on it, but that team knew the categories and both designs, which could favor detectors built for them.                                                        | New threat-to-validity item         |
| 4. Commercial filter     | Valid, not feasible | We have no license to test a commercial filter in this course.                                                                                                                                                   | Scope sentence: open rule sets only |

Point 2 corrects a misreading while conceding its valid core; point 4 narrows the claim rather than promising an experiment the team cannot run.

## In practice

- **Write limitations early.** Draft threats to validity while you plan the experiment; you will design around some of them.
- **Keep a claim-to-evidence map.** Every sentence in the abstract should point to a table, figure or section.
- **Ask for a hostile review before you submit.** A colleague who writes the review you fear gives you time to fix the problem.
- **Follow the call for papers exactly.** Anonymization, page limits and required sections are checked, and failures can mean rejection without review.
- **Disclose before you publish.** If the work found vulnerabilities in real products, follow [[coordinated-vulnerability-disclosure|coordinated vulnerability disclosure]] and describe it in the ethics section. USENIX Security '26 expects disclosure before submission unless there are convincing reasons for delay.
- **Use ethics frameworks as vocabulary.** Kohno, Acar and Loh show that consequentialist and deontological frameworks can disagree about the same security dilemma, and offer scenarios to help researchers and committees discuss such disagreements.

## Common misconceptions

- **"Stating limitations weakens a paper."** Reviewers find limitations anyway. Stating them precisely shows that you understand your evidence and moves the discussion from whether you noticed to how much to discount.
- **"A rebuttal is where you prove the reviewers wrong."** Its job is to correct factual errors, answer questions and commit to changes. Concessions paired with concrete changes persuade more than argument.
- **"Accepted means verified."** Reviewers judge the paper as written, usually without rerunning anything. Artifact evaluation and independent reproduction are separate checks.
- **"IRB approval covers the ethics section."** An IRB reviews research with human subjects under its own rules; USENIX Security '26 still asks for an ethical analysis of the work.

## Try it yourself

Use your own capstone results if you have them. Otherwise, use this fictional study of two configurations of a token verifier, V1 and V2, tested against 60 tokens built from the [JWT lab](lab:jwt): 20 valid, 20 expired or malformed, and 20 forged with the two methods the lab teaches. Both rejected every expired or malformed token. V1 accepted 2 forged tokens and rejected 1 valid token; V2 accepted no forged tokens and rejected 3 valid tokens.

1. **Rewrite three overclaims:** (a) "V2 is secure against token forgery." (b) "V2 has no false acceptances." (c) "V2 is significantly better than V1."
2. **Write a limitations paragraph** with one internal, one construct and one external threat, each tied to a claim and to what would remove it.
3. **Respond to three review comments** in at most 400 words, using the four-column table from the worked example: "The token suite was written by the students who configured V2." "Sixty tokens cannot support any conclusion." "The paper ignores timing side channels in signature verification."
4. **Swap responses with a classmate.** Which of their promises would you hold them to, and could each be kept within two weeks?

Check your work: for (a), say what was tested, such as "V2 rejected all 20 forged tokens in our suite, which used two forgery methods; we make no claim about other methods." For (b), accepting none of 20 forged tokens is consistent with a true forgery-acceptance rate up to about 16% (the upper end of a 95% Wilson interval). For (c), the difference rests on 2 forged tokens, and McNemar's exact test on them gives p = 0.5; report the counts and note that V2 also rejected more valid tokens. For the timing comment, a scope statement is the honest answer: the study tested acceptance decisions, not side channels.

## Key takeaways

- Every claim needs its evidence and its scope, in words that match the strength of the evidence.
- Specific limitations tied to the claims they affect build trust; generic caveats do not.
- Read the current call for papers: anonymization, required statements, rebuttal and decision rules vary by venue and year.
- In a rebuttal, correct misreadings with evidence, concede valid points, narrow what you cannot fix, and promise only what you can deliver.
- Review others as you would want to be reviewed: specifically, answerably, and about the paper.

## Go deeper

- The [USENIX Security '26 Call for Papers](https://www.usenix.org/conference/usenixsecurity26/call-for-papers) has detailed ethics guidelines and links to example ethics appendices.
- Kohno, Acar and Loh, [Ethical Frameworks and Computer Security Trolley Problems](https://www.usenix.org/conference/usenixsecurity23/presentation/kohno), for structuring the ethics discussion in a paper.
- The [IEEE S&P 2026 Call for Papers](https://sp2026.ieee-security.org/cfpapers.html) shows a second venue's process, including meta-reviews published with accepted papers.
- Open question: published meta-reviews make part of the review conversation public. What would you want a reader to learn from your paper's meta-review, and how would that change your limitations section?
