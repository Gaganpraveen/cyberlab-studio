---
topicId: FOR-08
title: Forensic reporting and uncertainty
summary: >-
  How to write forensic findings that keep observations, inferences, and opinions apart, express the
  strength of evidence without overstating it, give alternative explanations due consideration, and
  state limitations so that readers and reviewers can test every conclusion.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Distinguish observations, inferences, and opinions, and label each in written findings.
  - Organize a forensic report with the parts reviewers expect, from the request and items to limitations and review.
  - Express the strength of evidence by comparing competing hypotheses, without claiming certainty.
  - Identify alternative explanations and sources of bias, and describe how to test and mitigate them.
  - Write limitation and absence-of-evidence statements that say what was examined and what remains unknown.
prerequisites: [FOR-05, FOR-07, OPS-07]
concepts: [forensic-report, likelihood-ratio, confirmation-bias]
labs: []
keywords:
  - forensic report
  - examination report
  - expert report
  - report writing
  - findings
  - observation
  - inference
  - opinion
  - evaluative reporting
  - strength of evidence
  - likelihood ratio
  - verbal scale
  - alternative explanations
  - competing hypotheses
  - confirmation bias
  - technical review
  - error mitigation
  - systematic error
  - transposed conditional
  - prosecutor's fallacy
  - FRE 702
  - Federal Rule of Evidence 702
  - expert testimony
  - SWGDE 18-Q-002
  - SWGDE 12-Q-001
  - NIST SP 800-86
  - RFC 3227
sources:
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: 'SWGDE Requirements for Report Writing in Digital and Multimedia Forensics (18-Q-002, version 1.0)'
    url: https://www.swgde.org/documents/published-complete-listing/18-q-002-swgde-requirements-for-report-writing-in-digital-and-multimedia-forensics/
    publisher: Scientific Working Group on Digital Evidence (SWGDE)
    license: All rights reserved (redistribution allowed under SWGDE terms)
  - title: 'SWGDE Establishing Confidence in Digital and Multimedia Evidence Forensic Results by Error Mitigation Analysis (12-Q-001, version 2.0)'
    url: https://www.swgde.org/documents/published-complete-listing/12-q-001-swgde-establishing-confidence-in-digital-and-multimedia-evidence-forensic-results-by-error-mitigation-analysis/
    publisher: Scientific Working Group on Digital Evidence (SWGDE)
    license: All rights reserved (redistribution allowed under SWGDE terms)
  - title: 'Federal Rules of Evidence, Rule 702: Testimony by Expert Witnesses'
    url: https://www.law.cornell.edu/rules/fre/rule_702
    publisher: Legal Information Institute, Cornell Law School
  - title: 'RFC 3227: Guidelines for Evidence Collection and Archiving (BCP 55)'
    url: https://www.rfc-editor.org/rfc/rfc3227
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
quiz:
  - question: >-
      A report states: "syncup.exe was the program that uploaded the data." The examiner based this on
      matching addresses, ports, and times in the memory image and the network sensor's records. Which
      layer does the statement belong to?
    choices:
      - Observation, because the program appears in the memory image.
      - Opinion, because only an expert could reach it.
      - Inference, because it is reasoned from several observations and rests on assumptions, such as the two clocks agreeing.
      - None, because it is a legal conclusion.
    answer: 2
    explanation: >-
      No single record says that syncup.exe made the upload; the conclusion comes from linking records
      that match. That makes it an inference, which the report should tie to its observations and to the
      assumptions it needs, so a reader can check each step.
  - question: Which sentence expresses an evaluative opinion most appropriately?
    choices:
      - '"The findings are much more probable if a person at the keyboard performed the upload than if malware performed it unattended, and they do not show which person."'
      - '"Mallory definitely uploaded the file."'
      - '"The evidence is consistent with mallory uploading the file."'
      - '"It is 99 percent certain that mallory is guilty."'
    answer: 0
    explanation: >-
      The first sentence compares explanations and states the limit of what the records show. The second
      claims certainty and names a person where the records name an account. "Consistent with" only says
      nothing contradicts the idea, and many explanations may be consistent. The last mixes an
      unsupported number with guilt, which is not a forensic question.
  - question: Why should an examiner usually avoid writing "the probability that H1 is true is 95 percent"?
    choices:
      - Courts never allow probabilities.
      - Digital evidence is always certain, so probabilities are unnecessary.
      - Forensic tools cannot compute probabilities.
      - That probability also depends on information beyond the examined evidence, while the examiner can speak to how strongly the observations favor one hypothesis over another.
    answer: 3
    explanation: >-
      The probability of a hypothesis depends on prior information, such as other facts of the case,
      that the examiner may not have and that decision-makers weigh. Turning "these records would be
      unlikely if H2 were true" into "H2 is unlikely" is the transposed conditional, a relative of the
      base-rate fallacy.
  - question: A draft report says, "No evidence of data exfiltration was found." What should a reviewer ask first?
    choices:
      - Nothing; the statement is clear.
      - Which sources were examined, for what, over which period, and with what limitations, because absence from the examined sources is not proof that the activity did not happen.
      - Whether the examiner holds a certification.
      - Whether the report has an executive summary.
    answer: 1
    explanation: >-
      A statement about absence is only as strong as the search behind it. Logs may have rolled over,
      collection may have been scoped narrowly, or the activity may have used a channel no one examined.
      The report should say what was searched and how, and avoid loaded words such as exfiltration
      unless the facts support them.
  - question: According to SWGDE's error mitigation analysis, why do digital forensic reports often describe mitigation steps instead of a single error rate?
    choices:
      - Digital forensic tools do not make errors.
      - Error rates are confidential to tool vendors.
      - Digital forensics is far more prone to systematic errors, such as a software flaw that fails the same way on certain data, than to random ones, so testing, a second method, review, and documentation are the meaningful safeguards.
      - Courts prohibit error rates in digital cases.
    answer: 2
    explanation: >-
      A random error rate summarizes chance variation, but a parser bug triggered by one file format
      fails every time it meets that format. SWGDE therefore recommends identifying likely error
      sources, applying mitigations such as tool testing and verification by a second method, and
      stating the limitations that remain.
---

## Why it matters

Most readers of a forensic report will never see the evidence. A manager deciding whether to suspend an employee, a lawyer weighing charges, or a judge ruling on admissibility depends on the examiner's words. If those words overstate the evidence, someone may be blamed wrongly; if they are vague, careful work is wasted. The report is where an examination becomes something other people can check.

Courts expect that discipline. Under Federal Rule of Evidence 702, an expert may testify, in the form of an opinion or otherwise, if the party offering the testimony shows the court that it is "more likely than not" that, among other things, the opinion "reflects a reliable application of the principles and methods to the facts of the case." The committee note on the rule's 2023 amendment adds that forensic experts "should avoid assertions of absolute or one hundred percent certainty" when the methodology is "subjective and thus potentially subject to error." The same discipline serves internal investigations, where a finding can end a career just as surely as a verdict.

## The core idea

Every statement in a findings section belongs to one of three layers, and a good report keeps them visibly apart.

- **Observation:** what the evidence shows, with its source, stated so that another examiner could check it against the same item. "W-17's Security log contains event 4624, logon type 7, for SHOP\mallory at 04:36:52 UTC."
- **Inference:** a conclusion reasoned from one or more observations, resting on stated assumptions. "Someone holding mallory's credentials unlocked W-17 at 04:36:52," which assumes the log is genuine and W-17's clock was correct.
- **Opinion:** an evaluation that weighs inferences against competing explanations using the examiner's expertise. "The findings provide strong support for activity by a person at W-17's keyboard rather than by unattended malware."

A medical chart works the same way: "temperature 39.4 °C" is an observation, "fever" an inference, and "probably a viral infection" an opinion. Readers can challenge an opinion only if they can trace it back through the inferences to the observations, and the layers make that trace possible. Each layer fails in its own way: observations can be misread, inferences can rest on false assumptions, and opinions can ignore alternatives.

The examiner also keeps to questions the evidence can answer. Whether mallory is guilty, or whether an upload was authorized, is for the people who decide the case. The [[forensic-report|forensic report]] says what the records show and how strongly.

## How it works

### What a report contains

The table follows SWGDE's minimum requirements for digital forensic reports (18-Q-002), with a limitations part added.

| Part        | Contents                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Header      | Title, organization, case identifier, report date, page numbers                                                     |
| Request     | Requester, date, purpose and scope, and the authority, such as consent, a warrant, or a contract                    |
| Items       | Each item with unique identifiers, such as a serial number or hash value, and when it was received                  |
| Methods     | An overview of the processes performed, with any deviation from standard procedures disclosed                       |
| Results     | Findings in language that, in SWGDE's words, "a layperson can understand," with observations and inferences labeled |
| Opinions    | Each opinion documented with its basis                                                                              |
| Limitations | What was not examined, what could not be determined, and what rests on assumptions                                  |
| Disposition | What happened to original and derived items, and who authorized the report                                          |

NIST SP 800-86 adds factors that shape the writing: alternative explanations, the audience, and actionable information, such as a new source of evidence worth collecting.

### Expressing strength without overstating

Three habits keep confidence honest.

1. **Compare explanations instead of judging one.** For each observation, ask how expected it would be if each explanation were true. The ratio of those two probabilities is the [[likelihood-ratio|likelihood ratio]]. An observation far more expected under H1 than under H2 supports H1 over H2; one equally expected under both does not discriminate, however striking it looks.
2. **Report strength, not the probability of guilt.** How probable a hypothesis is overall also depends on information beyond the examined evidence. Turning "these records would be unlikely if malware acted alone" into "it is unlikely that malware acted alone" is the transposed conditional, a relative of the [[base-rate-fallacy|base-rate fallacy]]. Examiners speak to the first statement and leave the second to the decision-makers.
3. **Define your words.** "Consistent with" says only that an observation does not contradict an explanation, and many explanations may be consistent with it. If a report uses a verbal scale, it defines the scale. One example:

| Phrase                | Meaning in this report                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| Does not discriminate | The observations are about equally expected under each explanation                                             |
| Weak support          | Somewhat more expected under one explanation                                                                   |
| Moderate support      | Clearly more expected under one explanation                                                                    |
| Strong support        | Much more expected under one explanation; the other needs coincidences or steps for which there is no evidence |

Error belongs in the same discussion. SWGDE's error mitigation document observes that digital forensics "is far more prone to systematic than random errors": a tool that mishandles a format fails the same way every time, so a single error rate often means little. Reports therefore describe how errors were mitigated, through validated tools, verification by a second method, documentation, and review by another qualified examiner, and they say where mitigation falls short.

### Alternatives and bias

SP 800-86 is direct: "When an event has two or more plausible explanations, each should be given due consideration in the reporting process." RFC 3227 asks the same of evidence, which must be "Complete: It must tell the whole story and not just a particular perspective."

The main obstacle is [[confirmation-bias|confirmation bias]], the tendency to seek, interpret, and remember information in ways that support what one already believes. An examiner told early that the user is a disgruntled employee may read every ambiguous record as guilt. The countermeasures are procedural: write down competing [[hypothesis|hypotheses]] before analysis, test each observation against all of them, look deliberately for evidence that would refute the favored one, keep irrelevant context away from the examiner, and have a technical review, a form of [[peer-review|peer review]] in which another qualified examiner checks the reasoning, not just the format.

Absence needs the same care. "No PowerShell history line created the ZIP" is an observation. "PowerShell was not used to create the ZIP" is an inference that assumes the history is complete and unedited.

## Worked example

Bob's first draft of the findings for case 2026-0142 read like this:

> Mallory stole the customer database. She logged in, exported the customers from the admin site, copied them to her USB drive, and uploaded them with syncup.exe. The malware is unrelated. The logs prove it.

His technical reviewer marked six problems. "Mallory" names a person where the records name an account. "Stole" asserts intent and lack of authorization, which are not forensic questions. "Her USB drive" assumes ownership of a drive labeled SHOP-BACKUP. "Customer database" overstates a 2.1 MB report. "Unrelated" dismisses an alternative that no one tested. "Prove" claims a certainty the records cannot give.

The rewrite separates the layers. Each observation names the item it came from; the E7 items are described in [Browser and endpoint artifacts](lesson:FOR-07).

**Observations**

1. W-17's Security log records an interactive logon for SHOP\mallory at 22:03:30 UTC on October 3, with Logon ID 0x3A41F2, and an unlock for the same account at 04:36:52 UTC on October 4. (E7-1)
2. In that logon session, `powershell.exe` (PID 5012) started at 04:44:51 and `syncup.exe` (PID 5230) at 04:46:05. The command line of `syncup.exe` names `E:\customers.zip` and `files.storage.test`. (E7-1, memory image)
3. The egress sensor recorded 702,113 bytes sent from 192.0.2.57 to 203.0.113.50 in 82 seconds starting at 04:46:09. Between 04:30 and 04:50 it recorded no connection from that address to any destination other than shop.example's own servers and 203.0.113.50. (Sensor records)
4. The browser profile of mallory's account records a download of `customers_2026-09.csv` from `admin.shop.example`, completed at 04:38:12. E1 holds a file with that name and modified time, and a deleted `customers.zip` that contains it. (E7-2, E1)
5. Word started at 04:11:47 with `invoice-4471.docm`, the name of an attachment delivered by email at 04:05:33. At 04:12:09 a program named `svchost.exe` started from the account's `AppData\Roaming` folder; its memory holds executable code not backed by a file. (Mail export, E7-1, memory image)

**Inferences**

- **I1.** The upload was very likely made by `syncup.exe` and consisted of `customers.zip`, based on observations 2 to 4: the addresses, ports, and times match, and the volume fits the 640 KB file plus protocol overhead. This assumes the sensor and W-17 clocks agree within a second, as checked.
- **I2.** Someone using mallory's credentials was interacting with W-17 from 04:36:52 until at least 04:47:41, when the history file was last modified, based on observation 1, the typed browser addresses, the PowerShell launch from `explorer.exe`, and the history lines.
- **I3.** Process 6644 is probably malicious and probably came from the attachment, based on observation 5. Analysis of its code is pending.

**Evaluation.** Bob compares two explanations. H1: a person at W-17's keyboard, using mallory's credentials, performed the export and upload. H2: code in process 6644, or a remote operator working through it, performed them.

| Observation                                                         | If H1 (person at the keyboard)             | If H2 (malware or remote operator)                           |
| ------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------ |
| Unlock with mallory's credentials 80 s before the export            | Expected                                   | Requires a stolen credential used through the malware        |
| Typed addresses, interactive console, matching history lines        | Expected                                   | Requires simulated input or remote control                   |
| No outside connection except to the storage service, 04:30 to 04:50 | Expected                                   | Hard to explain for a remote operator needing a live channel |
| `svchost.exe` (6644) running since 04:12:09                         | Possible; malware and a person can coexist | Expected                                                     |

**Opinion.** "In my opinion, the findings provide strong support for H1 over H2. They do not discriminate between mallory and another person who knew mallory's credentials, and the badge record does not settle that question. Whether the upload was authorized or deliberate is outside the scope of this report."

**What would change it.** "This opinion would weaken if analysis of process 6644 showed remote-control or input-simulation capabilities, or if the admin portal's own logs showed the report was requested from a different address."

**Limitations.** The Security log and history file come from a host that ran suspected [[malware]], and corroboration from the admin portal's logs is pending. The door controller's clock correction was measured two days after the event. How the ZIP was created is undetermined. A filter examiner withheld fourteen browser entries as unrelated personal activity, and bob did not review them.

## In practice

- **Keep contemporaneous notes.** RFC 3227 tells examiners to "Keep detailed notes" and to "Be prepared to testify (perhaps years later)" about every action and its time; the report draws on those notes.
- **Write for the audience.** Lead with a plain-language summary, and put hashes, tool versions, and event extracts in appendices.
- **Make the work repeatable.** Name tools and versions and describe steps well enough that another examiner could reach the same observations (see [[reproducibility]]).
- **Get two reviews.** A technical review tests the reasoning; an administrative review checks completeness and consistency.
- **Amend in the open.** SWGDE requires a changed report to be reissued with the edits identified and explained, referring to the original.

## Common misconceptions

- **"A strong report sounds certain."** The committee note on Rule 702 warns forensic experts against claims of absolute certainty when their method is subjective and potentially subject to error. Strength comes from basis, alternatives, and stated limits.
- **"'Consistent with' is a finding."** It says only that nothing contradicts the explanation. Say how well the observation discriminates.
- **"Alternatives weaken my conclusion."** A conclusion that survived serious alternatives is more credible, not less.
- **"The examiner should say who is guilty."** Intent, authorization, and guilt belong to the decision-makers.
- **"No evidence found means it did not happen."** State what was searched, how, and over what period.

## Try it yourself

> [!NOTE] Everything below is fictional. When you write about real evidence, follow your organization's privacy and disclosure rules.

Write a one-page findings section for this evidence set.

```text
Case 2026-0217. Host LAB-PC-3. All times UTC.
Security log, LAB-PC-3
  2026-11-09 14:20:40  4624  Type 10 (Remote Desktop)  LAB\bob  Logon ID 0x7A3E1  source 198.51.100.23
  2026-11-09 14:21:30  4688  robocopy.exe  creator cmd.exe  Logon ID 0x7A3E1
                       cmd: robocopy D:\projects \\nas.lab.test\exports\bob /E
VPN concentrator (NTP-synchronized)
  2026-11-09 14:18:02  user bob  assigned 198.51.100.23  client 203.0.113.140
File server nas.lab.test (clock measured 40 s slow on 2026-11-10)
  2026-11-09 14:20:55  write  \exports\bob\  1,204 files  from LAB-PC-3
Help desk ticket 4417
  2026-11-08 09:30  bob reports that a visitor may have seen him type his password
```

1. List at least four observations, each with its source.
2. Write two inferences, naming the observations and assumptions each rests on. Use the file server's clock correction in one of them.
3. State two competing explanations, and name one record you would request to tell them apart.
4. Write one opinion using this lesson's example scale, a sentence saying what would change it, and a short limitations paragraph.
5. Trade reports with a classmate and label each of their sentences as observation, inference, or opinion. Where you disagree, decide whether the sentence needs rewriting.

## Key takeaways

- Keep observations, inferences, and opinions in separate, labeled layers, each traceable to the one below it.
- Tie every observation to an item and every inference to its assumptions.
- Express strength by comparing explanations, define the words you use, and never claim certainty.
- Give each plausible alternative due consideration, and counter confirmation bias with procedure and review.
- State limitations and what was searched, so readers know what remains unknown.

## Go deeper

- Read SWGDE's [error mitigation analysis](https://www.swgde.org/documents/published-complete-listing/12-q-001-swgde-establishing-confidence-in-digital-and-multimedia-evidence-forensic-results-by-error-mitigation-analysis/) and name one systematic error that could affect a timeline conclusion, with a mitigation.
- Compare items (a) through (d) of [Rule 702](https://www.law.cornell.edu/rules/fre/rule_702) with the parts of a report. Which part helps demonstrate each?
- Open question: should digital forensic reports express the strength of evidence in numbers when, as SWGDE notes, meaningful error rates are hard to establish for techniques such as deleted-file recovery?
