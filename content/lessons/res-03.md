---
topicId: RES-03
title: Reproducibility and artifact packaging
summary: Package a security experiment so someone else can rerun it, with pinned versions, recorded seeds, a clear data-rights statement, and run instructions that map each claim to a command, in the form that artifact-evaluation committees review.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 60
objectives:
  - Distinguish repeatability, reproducibility and replicability using ACM's definitions.
  - Record the code version, dependencies, platform, configuration and random seeds that an experiment depends on.
  - Write a data statement that covers provenance, rights, personal data and what can and cannot be shared.
  - Write run instructions that map each claim in a paper to a command, an expected result and a run time.
  - Explain what the Artifacts Available, Functional and Results Reproduced badges each require.
prerequisites: [RES-02]
concepts: [reproducibility, research-artifact, artifact-evaluation]
labs: []
keywords:
  - artifact evaluation
  - AE
  - ACM badges
  - Artifacts Available
  - Artifacts Functional
  - Artifacts Reusable
  - Results Reproduced
  - Results Replicated
  - repeatability
  - replicability
  - random seed
  - lockfile
  - dependency pinning
  - container
  - DOI
  - Zenodo
  - open science
  - artifact appendix
  - data statement
sources:
  - title: Artifact Review and Badging, Version 1.1
    url: https://www.acm.org/publications/policies/artifact-review-and-badging-current
    publisher: Association for Computing Machinery (ACM)
  - title: "USENIX Security '26 Call for Artifacts"
    url: https://www.usenix.org/conference/usenixsecurity26/call-for-artifacts
    publisher: USENIX Association
  - title: USENIX Security 2026 artifact badges
    url: https://secartifacts.github.io/usenixsec2026/badges
    publisher: Security Research Artifacts (secartifacts.github.io)
  - title: "USENIX Security '26 Artifact Appendix template"
    url: https://secartifacts.github.io/usenixsec2026/appendix/usenix-security-26-appendix.pdf
    publisher: Security Research Artifacts (secartifacts.github.io)
  - title: 'SoK: Benchmarking Flaws in Systems Security (IEEE EuroS&P 2019)'
    url: https://trustworthy.systems/publications/full_text/vanderKouwe_HABG_19.pdf
    publisher: Trustworthy Systems group, UNSW Sydney (authors' copy)
quiz:
  - question: An independent team downloads a paper's code and data, follows the README, and gets the paper's main results within a small tolerance. Under ACM's version 1.1 terms, what has been shown?
    choices:
      - Repeatability, because the same artifacts were used.
      - Reproducibility, because a different team used the authors' setup and artifacts.
      - Replicability, because a different team got the result.
      - Nothing, because the numbers were not identical.
    answer: 1
    explanation: ACM separates the team and the setup. Same team and same setup is repeatability. A different team with the same setup, usually the authors' artifacts, is reproducibility. A different team with an independently built setup is replicability. Results only need to agree within a tolerance that keeps the main claims intact.
  - question: Which change does the most to let an evaluator rerun a machine-learning experiment and get comparable numbers?
    choices:
      - Uploading a PDF of the results.
      - Removing the random seed so every run is fresh.
      - Pinning every dependency version, recording the seeds and the code commit, and listing the hardware used.
      - Linking to the latest version of each library's documentation.
    answer: 2
    explanation: Library updates, different seeds and different hardware all change results. Missing platform details and missing software versions are both on van der Kouwe et al.'s list of benchmarking flaws. Recording all of them, ideally automatically with every run, is what makes a rerun meaningful.
  - question: For the USENIX Security 2026 Artifacts Available badge, why is a link to a GitHub repository not enough?
    choices:
      - The badge requires a permanent public archive with a stable reference or DOI, and a code-hosting repository can be changed or deleted.
      - GitHub does not allow research code.
      - The badge requires the artifact to pass a full reproduction first.
      - Reviewers cannot open GitHub links.
    answer: 0
    explanation: The badge is about long-term availability, not hosting. A repository can be rewritten or removed, so USENIX asks for an archive such as Zenodo that gives the exact version a stable reference. You can keep developing on GitHub and archive tagged releases.
  - question: A study's dataset contains employees' email and cannot be released. What is the best artifact plan?
    choices:
      - Release nothing, since the results cannot be reproduced anyway.
      - Release the email after deleting the names.
      - Release the code, a synthetic sample with the same format, checksums of the restricted files, and per-message scores without content, and explain the restriction in the artifact description.
      - Release the trained model instead, because it contains no email.
    answer: 2
    explanation: USENIX asks authors to share every part that can be shared and to explain what is withheld and why. Deleting names rarely removes all personal data, and a trained model can memorize its training data, so neither is a safe shortcut. Code, a schema-matched synthetic sample and content-free outputs still let others check the analysis.
  - question: Why should an artifact's README include the expected result and run time for each experiment?
    choices:
      - Evaluators are paid by the hour.
      - It lets an evaluator plan the run and judge whether a rerun matches the paper, within the stated tolerance.
      - Badges are awarded only to fast experiments.
      - It replaces the need to share code.
    answer: 1
    explanation: Without an expected result, an evaluator cannot tell success from failure, and without a time estimate they cannot plan a ten-hour run. The USENIX Security 2026 Artifact Appendix asks for each experiment's human and compute time and how to read its results.
---

## Why it matters

A result that only its authors can produce is hard to trust and impossible to build on. If a detector's 91% recall depends on a library version nobody recorded, a random seed nobody saved, or a manual step nobody wrote down, then the next researcher cannot tell whether a different number means a better method or a different setup. The first person to suffer is usually the author, six months later, when a reviewer asks for one more experiment.

Security venues now check for this. Under the open science policy of USENIX Security 2026, authors must share their research artifacts at submission time, artifact availability is verified for accepted papers, and the call for artifacts warns that conditionally accepted papers that do not openly share their artifacts, without a satisfactory reason, will be rejected. Committees also offer to check that artifacts run and reproduce the main results. In their survey of systems-security papers, van der Kouwe et al. listed missing platform specifications and missing software versions among their 22 benchmarking flaws, because a measurement without its setup cannot be checked.

## The core idea

ACM's Artifact Review and Badging policy, version 1.1 (2020), defines three levels of "doing it again":

| Term            | Team      | Setup                         | Example                                                       |
| --------------- | --------- | ----------------------------- | ------------------------------------------------------------- |
| Repeatability   | Same      | Same                          | You rerun your own detector evaluation next month             |
| Reproducibility | Different | Same (the authors' artifacts) | An evaluation committee reruns your package                   |
| Replicability   | Different | Developed independently       | Another lab rebuilds the detector from the paper and tests it |

Version 1.1 swapped the meanings of "reproduced" and "replicated" from the earlier version to match the terms used by NISO and the wider scientific community, so older papers may use the words the other way around. [[reproducibility|Reproducibility]], in the current sense, is what an artifact package makes possible.

A [[research-artifact|research artifact]] is, in ACM's terms, a digital object created for a study or produced by it: software, scripts, input data, raw results and analysis scripts. Packaging is the work of making those objects usable by a stranger.

Think of a recipe written for someone in another country. It names exact ingredients and amounts, the oven temperature and the timing, shows a photo of the expected result, and says which ingredient you will have to buy yourself because it cannot be shipped. An artifact does the same for an experiment.

Two assumptions keep expectations realistic. Results only need to agree within a tolerance that keeps the paper's main claims intact; ACM and USENIX both say exact matches are not required. And evaluators may not have your hardware, so the package must say what is needed and, where possible, offer a smaller run that works on ordinary machines.

## How it works

### Record what the result depends on

| Item          | Why it matters                               | How to record it                                               |
| ------------- | -------------------------------------------- | -------------------------------------------------------------- |
| Code version  | Code changes between runs                    | Commit hash and release tag, saved with every result           |
| Dependencies  | Library updates change behavior and numbers  | Exact pins in a lockfile; [[container-image]] pinned by digest |
| Platform      | Timing, memory and some numeric results vary | CPU, memory, GPU, operating system and kernel version          |
| Configuration | Parameters decide the outcome                | One config file per experiment, under version control          |
| Random seeds  | Training, sampling and simulation are random | Every seed, per run, saved with the results                    |
| Data snapshot | Datasets change or get corrected             | Version name and a SHA-256 checksum of each file               |
| Raw outputs   | Others may want a different analysis         | Per-item scores and logs saved before aggregation              |

The cheapest way to get this right is to have the experiment record it automatically at the start of every run:

```python
import hashlib
import json
import platform
import random
import subprocess
import sys
from importlib import metadata


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def record_run(seed, data_path, packages, out="results/run-metadata.json"):
    """Seed the standard RNG and save what is needed to rerun this exact run."""
    random.seed(seed)  # also pass `seed` to every library that draws random numbers
    commit = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True)
    info = {
        "seed": seed,
        "command": sys.argv,
        "git_commit": commit.stdout.strip() or "not a git checkout",
        "python": platform.python_version(),
        "platform": platform.platform(),
        "packages": {name: metadata.version(name) for name in packages},
        "data_sha256": sha256(data_path),
    }
    with open(out, "w") as f:
        json.dump(info, f, indent=2)
    return info
```

A fixed seed makes one run repeatable; it does not make the result reliable. Some randomness also escapes seeding, such as thread scheduling, some GPU operations and network timing. Run several seeds and report the spread, as the lesson on [experimental design](lesson:RES-02) recommends.

### State the data rights

Security data are often sensitive: traffic captures hold personal data, malware samples can do harm, and corporate logs belong to someone else. Every artifact needs a short data statement that answers five questions. Where did the data come from? Who owns it, and under what license or agreement? Did people consent, or what approval covered its use? Does it contain personal data? What can be redistributed, and what cannot?

USENIX Security 2026 allows restricted access only for sensitive artifacts, and asks that the rest, such as source code, still be shared publicly. When data cannot be released, share what you can: the code, a synthetic sample with the same format, a schema, checksums so that anyone who obtains the data can confirm it matches, outputs that contain no sensitive content, and instructions for requesting access.

### Write run instructions that map claims to commands

The USENIX Security 2026 Artifact Appendix is a good model even outside that venue. Its required sections are:

1. **Abstract:** a short description of the artifact.
2. **Description and requirements:** security, privacy and ethical concerns for evaluators; how to access the artifact; hardware and software dependencies; benchmarks or datasets.
3. **Set-up:** installation, plus a basic test that confirms everything works.
4. **Evaluation workflow:** the paper's major claims, numbered C1, C2 and so on, and the experiments that support them, E1, E2 and so on, each with preparation, execution and results steps and an estimate of human and compute time.
5. **Version** information, with optional notes on reusability.

The claim list is the heart of the package. Every number in the paper should trace to an experiment, and every experiment to a command.

### Know what the badges check

| ACM badge (v1.1)                | What it requires                                                                             | USENIX Security 2026                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Artifacts Available             | Deposited in a public archival repository with a DOI or similar; personal pages do not count | Required for accepted papers; GitHub and GitLab not accepted          |
| Artifacts Evaluated: Functional | Documented, consistent with the paper, complete and exercisable                              | Artifacts Functional                                                  |
| Artifacts Evaluated: Reusable   | Functional, and documented and structured well enough for others to reuse                    | No separate badge                                                     |
| Results Reproduced              | Another team obtains the main results, using the authors' artifacts at least in part         | Results Reproduced, within a tolerance that validates the main claims |
| Results Replicated              | Another team obtains the main results without the authors' artifacts                         | No separate badge                                                     |

[[artifact-evaluation|Artifact evaluation]] committees usually award these after the paper is accepted, in a separate review of the package. USENIX recommends archives such as Zenodo, FigShare, Dryad and Software Heritage for availability.

## Worked example

The fictional `bank.example` phishing study from the [experimental design](lesson:RES-02) lesson is ready to publish. Its data are employee email, which cannot leave the bank. Here is how the team packaged it.

**Layout.** The package has one obvious entry point and no manual steps:

```text
phish-eval/
├── README.md             artifact-appendix headings, quick start, claims table
├── DATA.md               data statement: provenance, rights, what is withheld
├── LICENSE               license for the code
├── environment/
│   ├── Dockerfile        base image pinned by digest, not by a moving tag
│   └── requirements.txt  every package pinned with ==
├── configs/              one file per experiment (e1.yaml, e2.yaml, ...)
├── data/
│   ├── synthetic/        5,000 generated messages in the real schema
│   └── SHA256SUMS        checksums of the restricted dataset files
├── src/phisheval/        detectors, baselines and the evaluation code
├── scripts/
│   ├── smoke_test.sh     basic test, about 5 minutes on a laptop
│   └── run_all.sh        every experiment, in paper order
└── results/              per-message scores (random ids, no content) and run metadata
```

**Data statement (DATA.md, abridged).** Provenance: archived employee mail, January to September, used under the bank's written approval. Rights: owned by `bank.example`; contains personal data of employees and outside senders; may not be redistributed. Shared: code, configurations, the synthetic sample, checksums, and per-message scores with random identifiers and labels. Withheld: message content, headers, and the trained model weights, because a model can memorize parts of its training data. Access: qualified researchers may apply through the bank's data-use agreement.

**Claims table (README, abridged).**

| Claim                                                | Experiment | Command                 | Expected result                        | Time               |
| ---------------------------------------------------- | ---------- | ----------------------- | -------------------------------------- | ------------------ |
| C1: A beats the current filter by at least 10 points | E1         | `scripts/run_all.sh e1` | Table 3; recall gap within ±1.5 points | 2 compute-hours    |
| C2: B catches at least 25% of look-alikes A misses   | E2         | `scripts/run_all.sh e2` | Table 4; share within ±2 points        | 20 compute-minutes |
| C3: Results hold across five training seeds          | E3         | `scripts/run_all.sh e3` | Figure 5; spread under 1 point         | 10 compute-hours   |

**Two paths for evaluators.** Anyone can run the smoke test and all three experiments on the synthetic sample, which checks that the code is complete and exercisable. With the bank's approval, an evaluator can run them on the restricted data inside the bank's environment and compare against Tables 3 and 4. Anyone can recompute every metric and confidence interval in the paper from the shared per-message scores.

**What the package still cannot show.** Results on the synthetic sample will not match the paper's numbers, and the README says so. That is an honest limit, stated in advance, rather than a failed reproduction.

## In practice

- **Package from day one.** Script every step, including figure generation, so the final package is the same code you used.
- **Test on a clean machine.** A fresh virtual machine or container exposes the dependency you forgot you installed.
- **Offer a short run and a full run.** A quick check that takes minutes lets evaluators find problems before they commit hours.
- **License deliberately.** Choose a license for the code and a separate one for any data you may share, and do not relicense data you do not own.
- **Warn about risky components.** If an artifact runs malware samples, disables protections or sends network traffic, say so in the security and ethics section and explain how to run it in isolation.
- **Stay reachable.** USENIX asks that at least one author be available to answer evaluators' questions about setup problems.

## Common misconceptions

- **"My code is on GitHub, so it is available."** A repository can change or disappear. Archive the exact version with a stable identifier and cite that.
- **"A container makes it reproducible."** Only if the base image is pinned, nothing is downloaded at build time from a moving source, and data and hardware needs are documented.
- **"Reproduced means identical numbers."** Both ACM and USENIX ask for agreement within a tolerance that preserves the main claims.
- **"A fixed seed makes the result trustworthy."** It makes one run repeatable. Trust comes from showing the result across several seeds.
- **"If the data cannot be shared, there is no artifact."** Code, synthetic samples, schemas, checksums and content-free outputs still let others check most of the work.

## Try it yourself

Package a small experiment of your own, or the rule evaluation from the [homograph lab](lab:homograph), whose twelve fictional `.test` names you may share freely.

1. Create a folder layout like the one above and a README with the five Artifact Appendix headings.
2. Pin your dependencies, and add the `record_run` function so every run saves its seed, commit, versions and data checksum.
3. Write a data statement that answers the five data-rights questions, even if the answers are short.
4. Write a claims table with at least two claims, each mapped to a command, an expected result with a tolerance, and a run time.
5. Give the package to a classmate with a fresh environment and 30 minutes. Write down every question they had to ask you; each one is a missing line in your README.

## Key takeaways

- ACM's terms: repeatability is same team and setup, reproducibility is a different team with the same setup, and replicability is a different team with an independent setup.
- Record code version, pinned dependencies, platform, configuration, seeds and data checksums automatically with every run.
- Every artifact needs a data statement, and sensitive data call for sharing everything else plus a clear explanation of what is withheld.
- Map each claim to a command, an expected result, a tolerance and a run time; that map is what evaluators work from.

## Go deeper

- Read ACM's full [Artifact Review and Badging policy](https://www.acm.org/publications/policies/artifact-review-and-badging-current), including how badges can be awarded after publication and how proprietary components are handled.
- The [USENIX Security '26 Call for Artifacts](https://www.usenix.org/conference/usenixsecurity26/call-for-artifacts) gives the evaluation timeline and the rules for restricted artifacts.
- Open question: some artifacts, such as working attack code against unpatched systems, could cause harm if released. USENIX allows exceptions when authors explain them. Where should the line fall between openness and preventing misuse, and who should decide?
