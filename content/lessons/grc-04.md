---
topicId: GRC-04
title: Student-data governance and institutional review
summary: How FERPA and the federal rules for human subjects research shape what a security course may collect, share and publish about students, and how to recognize when an activity needs review before it starts.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Decide whether a record a course creates is likely an education record under FERPA, and name the office that makes the final call.
  - Explain the school-official exception and the conditions under which a vendor can receive education records.
  - Apply the Common Rule definitions of research and human subject to a classroom activity.
  - Identify which approvals a planned security exercise or study needs, without claiming legal certainty.
  - Redesign a course activity so that it collects less student data and needs fewer approvals.
prerequisites: [GRC-03, FND-07]
concepts: [ferpa, education-record, irb]
labs: []
keywords:
  - FERPA
  - education records
  - directory information
  - school official exception
  - legitimate educational interest
  - eligible student
  - 34 CFR Part 99
  - 20 U.S.C. 1232g
  - Common Rule
  - 45 CFR 46
  - OHRP
  - IRB
  - institutional review board
  - human subjects research
  - exempt research
  - informed consent
  - student privacy
  - not legal advice
sources:
  - title: 'FERPA (Student Privacy Policy Office, US Department of Education)'
    url: https://studentprivacy.ed.gov/ferpa
    publisher: US Department of Education
  - title: 'Federal Policy for the Protection of Human Subjects (Common Rule), 45 CFR 46'
    url: https://www.hhs.gov/ohrp/regulations-and-policy/regulations/45-cfr-46/index.html
    publisher: US Department of Health and Human Services, Office for Human Research Protections (OHRP)
  - title: '45 CFR Part 46: Protection of Human Subjects'
    url: https://www.ecfr.gov/current/title-45/subtitle-A/subchapter-A/part-46
    publisher: Office of the Federal Register (eCFR)
quiz:
  - question: A professor wants to post the class CTF leaderboard, which counts toward grades, on a public course page with each student's full name. What is the best first step?
    choices:
      - Post it, because names are always directory information.
      - Post it, because CTF scores are not records.
      - Ask the registrar's office how FERPA applies, and meanwhile plan to use handles that students choose.
      - Post it only after removing the lowest scores.
    answer: 2
    explanation: Scores that count toward grades are likely part of education records, and directory information is limited to information not generally considered harmful or an invasion of privacy if disclosed. The registrar or FERPA officer makes the call. Student-chosen handles avoid the disclosure question entirely.
  - question: An instructor uses data from a classroom phishing exercise only to teach the class, and never plans to publish. Later she wants to present the results at a conference. Why does that change matter?
    choices:
      - It does not matter, because the data already exists.
      - Presenting results to contribute to generalizable knowledge can turn the activity into research, which needs an IRB determination, ideally before any data is collected.
      - Conferences require FERPA consent forms but not IRB review.
      - Only federally funded instructors ever need IRB review.
    answer: 1
    explanation: Under the Common Rule, research is a systematic investigation designed to contribute to generalizable knowledge. Intent to publish is a strong signal. The IRB office decides how to proceed, which is easier when it is consulted before data collection.
  - question: A cloud lab vendor will store students' graded lab work. Which condition is part of the FERPA school-official exception for outside parties?
    choices:
      - The vendor is under the institution's direct control with respect to the use and maintenance of the records.
      - The vendor is based in the United States.
      - The vendor has a SOC 2 report.
      - The vendor promises never to be breached.
    answer: 0
    explanation: An outside party can be a school official if it performs a service the institution would otherwise use employees for, is under the institution's direct control over use and maintenance of the records, and follows FERPA's limits on use and redisclosure. Location and audit reports may matter for other reasons, but they are not the test.
  - question: Under the Common Rule definitions, which activity is most likely to involve a human subject?
    choices:
      - Measuring the speed of an encryption library on a lab server.
      - Reading published statistics about password reuse.
      - Testing a firewall rule against a virtual machine in an isolated lab.
      - A student researcher surveying classmates about how they store passwords, for a paper.
    answer: 3
    explanation: A human subject is a living individual about whom an investigator, professional or student, obtains information through interaction or obtains identifiable private information. A survey of classmates for a paper fits. The other activities involve no information about living individuals.
  - question: Which statement about a lesson like this one is accurate?
    choices:
      - It certifies that an activity complies with FERPA.
      - It replaces the IRB's determination for exempt research.
      - It explains concepts for teaching; the registrar, IRB office and counsel decide how the rules apply.
      - It applies only to students under 18.
    answer: 2
    explanation: These rules are applied by designated offices with authority and current guidance. A course can teach students to recognize when to ask, and what to bring, but it cannot make the determination for them.
---

## Why it matters

> [!IMPORTANT] This lesson explains concepts for teaching. It is not legal advice. Your institution's registrar or privacy office, institutional review board (IRB) and legal counsel decide how these rules apply to a specific activity.

Security courses produce a surprising amount of student data. Lab platforms log every command, capture-the-flag (CTF) games rank students, phishing-awareness exercises record who clicked, and surveys ask how students manage passwords. Instructors and student researchers often want to publish what they learn. Two federal regimes can apply to that data, for different reasons. [[ferpa|FERPA]] protects the privacy of student education records. The Common Rule protects people who take part in research, through review by an [[irb|institutional review board (IRB)]].

Getting this wrong has real costs. Students can be embarrassed or harmed when their records are exposed. Research data gathered without the review it needed may be unpublishable. And instructors who assume an activity is fine, without asking, put both their students and their institution at risk. The skill this lesson builds is not making legal determinations. It is recognizing when an activity needs one, knowing whom to ask, and arriving with a clear description of the data.

## The core idea

Start with the assumptions. The institution receives funds under US Department of Education programs, so FERPA applies to it. Some of its research is federally supported, and like many colleges it has an IRB that reviews research involving people. Both regimes turn on definitions, so the core skill is classifying an activity correctly.

**FERPA asks: is this an education record, and is this disclosure permitted?** An [[education-record]] is, in general, a record directly related to a student and maintained by the institution or by a party acting for it. At a college, FERPA's rights belong to the student. Students can inspect their records, ask for corrections, and must generally consent before personally identifiable information from those records is disclosed, unless an exception applies.

**The Common Rule asks: is this research involving human subjects?** Research means a systematic investigation designed to develop or contribute to generalizable knowledge. A human subject is a living individual about whom an investigator, explicitly including a student investigator, obtains information through intervention or interaction, or obtains identifiable private information. If both are true, the institution's IRB process, not the investigator alone, determines what review applies.

The two questions are independent. A class gradebook involves FERPA but is not research. A survey of strangers at a conference may be research but involves no education records. A study of last year's lab logs can involve both.

## How it works

### FERPA in a security course

- **What counts.** Grades, graded submissions, and records a course keeps about identifiable students, such as lab activity logs tied to student accounts, are likely education records. Some records are excluded, such as an instructor's private notes kept only for their own use. The registrar or FERPA officer decides close cases.
- **Directory information.** An institution may designate information that would not generally be considered harmful or an invasion of privacy if disclosed, such as name and enrollment status, as directory information. It can disclose that without consent after notifying students and letting them opt out. Social Security numbers never qualify, and a student ID or user ID qualifies only if it cannot be used to reach education records without a password or other authentication factor. Students who opted out must be treated accordingly.
- **School officials.** Instructors and teaching assistants may access records in which they have a legitimate educational interest. The institution must use reasonable methods, such as role-based access controls, to keep school officials to the records they need. That is a FERPA requirement that security teams implement.
- **Vendors.** An outside party, such as a cloud lab provider, can receive education records as a school official if it performs a service the institution would otherwise use employees for, is under the institution's direct control over the use and maintenance of the records, and follows FERPA's limits on using and redisclosing them. Contracts carry these terms; [GRC-06](lesson:GRC-06) covers vendor review.
- **De-identified data.** Records can be released without consent once all personally identifiable information is removed, if the institution reasonably determines that students cannot be identified, considering other reasonably available information. In a class of 18, that bar is high ([GRC-03](lesson:GRC-03)).

### Human subjects research and the IRB

The decision path has a fixed order:

1. **Is it research?** Teaching a class is not, in itself, research. Designing an activity to produce generalizable findings, for example for publication, often is.
2. **Does it involve human subjects?** Interacting with people (surveys, interviews, experiments) or obtaining identifiable private information about them (logs, recordings) both count.
3. **Which review applies?** At most institutions the IRB office decides whether the project is not human subjects research, exempt, or needs expedited or full-board review. One exemption category covers research in established educational settings that involves normal educational practices unlikely to harm students' learning, but whether a project fits is the IRB's determination.

Security research raises particular IRB questions. Deception, such as phishing people who have not agreed in advance, needs a justification the IRB accepts, and IRBs usually expect a debriefing afterward. Capturing real network traffic can sweep in identifiable private information about people who never agreed to take part.

### Who to ask

| Situation | Main question | Ask first |
| --- | --- | --- |
| Posting CTF scores with names | FERPA disclosure | Registrar or FERPA officer |
| A cloud lab vendor storing student work | FERPA school-official terms, vendor security | Privacy office, IT security, procurement |
| Surveying students for a paper | Human subjects research | IRB office |
| Analyzing last term's lab logs for a paper | Both | IRB office and registrar |
| A phishing exercise for teaching only | Campus IT policy; records of who clicked | IT security office and department chair |
| Capturing traffic in a lab | Scope and consent | Instructor; keep captures inside the isolated lab network |

> [!ETHICS] Only test systems you own or have written permission to test. A classroom exercise that sends simulated phishing or captures traffic needs the same written scope as any other test.

## Worked example

Professor alice is planning her Network Security course at `college.test`. Her draft syllabus has four activities. She works through each one before the term starts.

**Activity 1: a phishing-awareness exercise.** Her draft has students send simulated phishing email to each other and record who clicks.

- *Data:* each student's click or no-click result, tied to their name.
- *FERPA:* if results are graded or kept in course records, they are likely education records.
- *Research:* not research if used only for teaching.
- *Redesign:* students opt in. The exercise targets fictional personas in the course mail system at `mail.lab.test`, not real inboxes, and results are reported only in aggregate. The campus IT security office confirms the exercise does not conflict with its own phishing program.

**Activity 2: a CTF with a public leaderboard.** Scores count for 10 percent of the grade.

- *FERPA:* scores tied to names are likely education records, and the college does not treat grades as directory information.
- *Redesign:* students pick handles, and the mapping from handle to student stays in the gradebook. Alice confirms the approach with the registrar.

**Activity 3: a password-habits survey.** She hopes to present the results at a teaching workshop.

- *Research:* a systematic survey designed for presentation is likely research with human subjects. She is also the students' instructor, so the power imbalance matters.
- *Plan:* she submits the survey, consent text and data plan to the IRB office before the term. A colleague collects the responses and holds them until final grades are submitted, and alice receives only a de-identified data set. The survey never asks for passwords.

**Activity 4: VM logs at a cloud lab provider, `labs.example`.**

- *FERPA:* logs tied to student accounts are likely education records held by a vendor.
- *Plan:* procurement and the privacy office check that the contract puts the vendor under the college's direct control over use and redisclosure. Logs are deleted 30 days after the term ends.

Alice's approval tracker:

```text
Activity            Education records?  Research?   Approvals and owners                     Status
Phishing exercise   Likely (results)    No          IT security office; department chair     Redesigned, approved
CTF leaderboard     Likely (scores)     No          Registrar confirms handle approach       Confirmed
Password survey     No                  Likely yes  IRB determination before collection      Submitted
Cloud lab logs      Likely (logs)       No          Privacy office and procurement (vendor)  Contract under review
```

Notice what the tracker does not say. It never claims "FERPA compliant" or "IRB exempt." It records questions, owners and determinations made by the people with the authority to make them.

## In practice

- **Ask early.** Reviews take time. Send questions before the syllabus is final, not the week before an exercise.
- **Separate teaching from research.** If you might publish, design consent and review before collecting anything. Data collected only for teaching is harder to repurpose later.
- **Minimize by design.** Handles, aggregates, fictional personas and short retention remove most FERPA questions before anyone has to answer them.
- **Keep the paper trail.** File the registrar's guidance and the IRB's determination letter with the course materials, and match them to the activity as actually run.
- **Mind the power imbalance.** Students may feel unable to refuse their own instructor. Give them a real way to opt out without penalty.
- **Limits.** Federal rules are a floor. State laws, institutional policy and funder terms can add requirements, and rules and guidance change, so check current official sources.

## Common misconceptions

- **"FERPA forbids sharing anything about students."** FERPA has many exceptions, including directory information and school officials with a legitimate educational interest. The point is to know which one applies.
- **"Class exercises never need IRB review."** An exercise designed to produce findings for publication can be research, even if it also teaches.
- **"Student projects are not research."** The Common Rule's definition of a human subject explicitly covers student investigators.
- **"Exempt means nobody reviews it."** The exemption categories are applied under institutional procedures, usually by the IRB office, and ethical expectations still apply.
- **"The vendor says it is FERPA compliant, so we are covered."** FERPA's duties fall on the institution. A vendor's claim does not replace the contract terms and review the institution needs.

## Try it yourself

On paper, identify approval needs for a fictional plan. The Cybersecurity Club at `college.test` and its faculty advisor propose the following for next semester:

1. A "hall of fame" web page that lists members' names next to course grades in security classes.
2. A study, for a student conference, of how quickly club members patch their personal laptops, using a monitoring agent members install.
3. Packet captures of the club's own isolated lab network, kept to grade a forensics exercise.
4. A shared spreadsheet of members' student ID numbers, phone numbers and lab account names, kept on a personal cloud drive.
5. A tabletop exercise in which members role-play an incident at a fictional company, with no data collected.

For each item, record: the data involved; whether education records are likely involved; whether the item is likely research with human subjects; which office you would ask; and one redesign that reduces the data or the approvals needed. Then write the short question you would send to the IRB office about item 2. Describe the activity and the data plan, and do not answer the question yourself.

## Key takeaways

- FERPA asks whether a record is an education record and whether a disclosure is permitted; the Common Rule asks whether an activity is research involving human subjects.
- The two questions are independent, so an activity can involve one, both or neither.
- Vendors receive education records only under conditions the institution sets and enforces, usually in the contract.
- A design aimed at generalizable knowledge, often signaled by plans to publish, is what turns a teaching activity into research.
- Recognize, describe and ask. The registrar, IRB and counsel make the determinations.

## Go deeper

- The [OHRP page on 45 CFR 46](https://www.hhs.gov/ohrp/regulations-and-policy/regulations/45-cfr-46/index.html) explains the subparts and the revised Common Rule and links the regulation text and decision charts. Compare the regulation's definition of research with how your field decides what is publishable.
- The [Student Privacy Policy Office's FERPA page](https://studentprivacy.ed.gov/ferpa) presents the FERPA regulations. Read §99.31 and list every condition an outside contractor must meet to receive records as a school official.
- Open question: security education depends on realistic exercises, yet realism often means deception or monitoring. Where should a department draw the line between teaching and studying its own students?
