---
topicId: MAL-01
title: Malware behavior and taxonomy
summary: Learn to classify malicious software by how it spreads, what it does, how it hides, and how it is controlled, and see why one sample often earns several labels at once.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Distinguish viruses, worms, and trojans by how each one reaches a new host.
  - Classify a behavior report along four facets (propagation, payload, concealment, control) and cite the evidence for each label.
  - Map an observed behavior to a MITRE ATT&CK technique and explain why behavior labels are more reliable than family names.
  - Explain how each malware category changes the first decisions an incident responder makes.
prerequisites: [FND-01, FND-02]
concepts: [malware, virus, worm, trojan, ransomware, wiper, rootkit, spyware, keylogger]
labs: []
keywords:
  - malicious software
  - malicious code
  - trojan horse
  - blended attack
  - self-replicating code
  - malware family
  - malware classification
  - NIST SP 800-83
  - T1204
  - T1210
  - T1056.001
  - T1014
  - T1486
  - T1485
  - T1496
  - WannaCry
  - MS17-010
sources:
  - title: 'Computer Security (CS 161 textbook), Chapter 38: Malware'
    url: https://textbook.cs161.org/network/malware.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'NIST SP 800-83 Rev. 1: Guide to Malware Incident Prevention and Handling for Desktops and Laptops'
    url: https://csrc.nist.gov/pubs/sp/800/83/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: 'MITRE ATT&CK: Software (malware and tools)'
    url: https://attack.mitre.org/software/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: WannaCry (S0366)'
    url: https://attack.mitre.org/software/S0366/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'CISA Alert TA17-132A: Indicators Associated With WannaCry Ransomware'
    url: https://www.cisa.gov/ncas/alerts/TA17-132A
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'AVClass: A Tool for Massive Malware Labeling (RAID 2016, author copy)'
    url: https://software.imdea.org/%7Ejuanca/papers/avclass_raid16.pdf
    publisher: IMDEA Software Institute
quiz:
  - question: A program reaches new machines by exploiting a file-sharing service on each one, and no user ever opens a file. Which label describes how it propagates?
    choices:
      - A virus, because it makes copies of itself.
      - A worm, because it spreads between hosts without any user action.
      - A trojan, because it runs without the owner's permission.
      - A rootkit, because the users never see it run.
    answer: 1
    explanation: Worms are self-contained programs that spread on their own, typically by exploiting a network service. A virus needs a user to run an infected file, a trojan relies on tricking the user and does not replicate, and "rootkit" describes concealment, not spreading.
  - question: An app sold as a free photo editor installs a keylogger but never copies itself into other files or onto other computers. Which description fits best?
    choices:
      - A virus with a spyware payload.
      - A worm that installs spyware.
      - A rootkit, because the keylogger is hidden from the user.
      - A trojan that delivers spyware.
    answer: 3
    explanation: Deception plus no replication is the mark of a trojan, and recording keystrokes is a spyware payload. It is not a virus, because it infects no other file, and not a worm, because it does not spread to other hosts by itself.
  - question: Responders suspect a kernel-mode rootkit on a server. Why should they rely on a memory capture or an offline disk image instead of the server's own process and file listings?
    choices:
      - The rootkit may alter what the operating system reports, so tools running on the host can show a falsified view.
      - Rootkits encrypt the process list, so it cannot be read at all.
      - An offline image is always faster to collect than a process list.
      - Rootkits delete every log file as soon as they are installed.
    answer: 0
    explanation: A rootkit intercepts and changes the operating system functions that report on files, processes, and connections (ATT&CK T1014). Evidence gathered from outside the running system does not pass through those altered functions.
  - question: In the first hours of the WannaCry outbreak, why did its worm behavior matter more for containment than its ransomware behavior?
    choices:
      - Ransomware cannot be stopped once encryption starts, so only the worm part could be addressed.
      - Worms only infect patched systems, so backups were irrelevant.
      - It spread across networks without user action, so unpatched machines had to be patched or isolated before it reached them.
      - The ransom demand was too small to matter to most victims.
    answer: 2
    explanation: The ransomware facet tells responders to protect and restore data. The worm facet tells them that the damage grows every minute as the program reaches new unpatched hosts over SMBv1, so patching (MS17-010), isolating, and blocking SMB at network boundaries could not wait.
  - question: Two antivirus engines give the same file different family names. What is the most defensible conclusion?
    choices:
      - One of the engines is broken and should be replaced.
      - Family names are vendor-specific labels, so identify the file by its hash and classify it by its observed behavior.
      - The file must contain two different malware programs bundled together.
      - The file is probably harmless, because the engines disagree.
    answer: 1
    explanation: Vendors name families independently, and research such as AVClass documents how inconsistent those labels are. A cryptographic hash identifies the exact file, and behavior (what it does, how it spreads) is what drives the response.
---

## Why it matters

NIST's guide to malware incidents puts it bluntly: "Malware is the most common external threat to most hosts." When a team finds a suspicious program, what that program can do drives every decision that follows: whether to pull a machine off the network, reset passwords, or protect the backups.

The WannaCry outbreak of May 12, 2017, shows why one label is not enough. It is remembered as ransomware, and it was: it encrypted files and demanded payment in Bitcoin. But CISA's alert and MITRE ATT&CK both describe a second, more urgent property. WannaCry spread by itself, exploiting a vulnerability in the Windows SMBv1 file-sharing service that Microsoft had patched in its MS17-010 update on March 14, 2017. CISA cited "reports of tens of thousands of infections in over 150 countries." A team that read only "ransomware" would think about restoring files. A team that also read "worm" would patch or isolate every unpatched Windows machine at once.

Names are a second trap. Antivirus vendors name malware families independently, and one large study starts from the observation that "AV labels are well-known to be inconsistent." This lesson therefore builds a taxonomy from observable behavior, so you can classify a sample even when nobody agrees on its name.

## The core idea

[[malware|Malware]] (malicious software) is software deliberately designed to act against the people who own or use a computer: to steal information (an attack on [[confidentiality]]), alter it ([[integrity]]), or deny access to it ([[availability]]). The CS 161 textbook puts it more simply: malware is attacker code that runs on victim computers.

This lesson makes three assumptions:

1. We classify by behavior that we observed or that a trusted report documents, not by a vendor's name or an attacker's claims.
2. Programs combine behaviors, so labels describe facets of a program, not mutually exclusive boxes.
3. Intent matters at the edges. The same remote-administration feature is a legitimate IT tool when the owner installs it and a backdoor when an intruder does.

A useful analogy is delivery and cargo. "Truck" says how something travels, not what it carries. Likewise, "worm" describes malware's delivery and "ransomware" its cargo. Two more questions complete the picture, giving four facets:

1. **Propagation:** how does it reach a new host?
2. **Payload:** what does it do once it runs?
3. **Concealment:** how does it avoid being noticed?
4. **Control:** does a remote operator direct it?

## How it works

### Propagation: viruses, worms, and trojans

A [[virus]] inserts copies of itself into other programs, documents, or boot records, and spreads when a user runs or opens an infected file. The CS 161 textbook draws the key line: a virus "requires some user action to propagate." NIST SP 800-83 separates compiled viruses (file infectors and boot-sector viruses) from interpreted ones, such as macro viruses written in an office suite's macro language.

A [[worm]] is a self-contained program that copies itself to other hosts without user action, usually by exploiting a [[vulnerability]] in a network service. Inside a network, ATT&CK describes this behavior as Exploitation of Remote Services (T1210) and lists WannaCry's SMBv1 exploit as an example.

A [[trojan]] (short for Trojan horse) does not replicate at all. It relies on deception: it looks like something useful, such as a game, an invoice, or a free utility, so that the user runs it. ATT&CK files this under User Execution (T1204), which usually follows [[social-engineering]] such as [[phishing]]. Trojans often deliver other malware once they run.

Worm outbreaks grow the way epidemics do, and the CS 161 textbook describes them with the models biologists use for infectious disease. In the simplest such model, N hosts are vulnerable, I of them are infected, and β is the rate at which one infected host reaches vulnerable hosts:

```text
dI/dt = β · I · (1 − I/N)
```

The factor (1 − I/N) is the share of vulnerable hosts not yet infected. Early in an outbreak, I is tiny compared with N, so the growth rate is about β · I and the count grows exponentially. As I approaches N, most contacts reach hosts that are already infected, and growth levels off. The result is an S-shaped (logistic) curve. The model also shows defenders where to push: patching shrinks N, blocking scanning traffic lowers β, and both help most in the early exponential phase.

### Payload: what it does once it runs

- [[ransomware|Ransomware]] encrypts data and withholds the key to extort the victim, an attack on availability (ATT&CK T1486, Data Encrypted for Impact).
- A [[wiper]] destroys or overwrites data so that it cannot be recovered (T1485, Data Destruction). ATT&CK notes that encryption becomes destruction when the key is never saved, so a ransom note does not prove recovery is possible.
- [[spyware|Spyware]] covertly collects information such as files, screenshots, or browsing activity. A [[keylogger]] records keystrokes, usually to capture passwords (T1056.001, Keylogging).
- A backdoor or bot gives a remote operator control of the machine. Many bots under one operator form a [[botnet]], the subject of [Botnets and coordinated demand](lesson:MAL-05).
- Resource hijacking (T1496) spends the victim's processors, bandwidth, or cloud account on the attacker's work, such as cryptocurrency mining.

### Concealment: rootkits

A [[rootkit]] hides programs, files, network connections, and other components by intercepting and altering the operating system functions that report system information (ATT&CK T1014). A user-mode rootkit tampers with programs or libraries; a kernel-mode rootkit tampers with the [[kernel]], the core of the operating system. For defenders, this means tools running on the infected host may lie. Trustworthy evidence comes from outside the running system: a [[memory-forensics|memory capture]], an offline [[forensic-image|disk image]], or a network sensor.

### Control: autonomous or remotely directed

A classic worm is fire-and-forget: it carries everything it needs. Other malware contacts a [[command-and-control]] (C2) server for instructions or updates, or to upload stolen data, often at regular intervals, a pattern called [[beaconing]]. ATT&CK files much of this under Application Layer Protocol (T1071), because C2 traffic often hides inside ordinary web or DNS traffic. [Command-and-control concepts](lesson:MAL-04) covers how defenders spot it.

### Malware versus tools

Taxonomies also differ at their edges. ATT&CK sorts software into two types. Malware is software "intended to be used for malicious purposes by adversaries." A tool is software that "could be used by a defender, pen tester, red teamer, or an adversary," such as a network scanner. NIST SP 800-83 files keystroke loggers and rootkits under "attacker tools," which some other mechanism must install, rather than under forms of malware. Each view fits its purpose, so check which taxonomy a report uses.

### The taxonomy at a glance

| Label         | Facet       | Defining behavior                                       | Example ATT&CK technique                |
| ------------- | ----------- | ------------------------------------------------------- | --------------------------------------- |
| Virus         | Propagation | Infects other files; spreads when a user runs them      | None specific (ATT&CK models behaviors) |
| Worm          | Propagation | Copies itself to other hosts without user action        | T1210 Exploitation of Remote Services   |
| Trojan        | Propagation | Poses as useful software; relies on the user to run it  | T1204 User Execution                    |
| Ransomware    | Payload     | Encrypts data and demands payment for the key           | T1486 Data Encrypted for Impact         |
| Wiper         | Payload     | Destroys data with no recovery path                     | T1485 Data Destruction                  |
| Spyware       | Payload     | Covertly collects data, including keystrokes            | T1056.001 Keylogging                    |
| Cryptominer   | Payload     | Spends the victim's computing resources                 | T1496 Resource Hijacking                |
| Rootkit       | Concealment | Alters what the operating system reports                | T1014 Rootkit                           |
| Bot, backdoor | Control     | Accepts commands from a remote operator                 | T1071 Application Layer Protocol        |

A real sample usually takes labels from several rows: WannaCry was a worm (propagation) carrying ransomware (payload). NIST adds a related term, blended attack, for malware that "uses multiple infection or transmission methods," and already judged in 2013 that "many, if not most" instances of malware were blended.

## Worked example

Alice, an accountant at `shop.example`, reports that an "invoice" she opened did nothing. The security team copies the file into an isolated analysis environment with a simulated network and produces this report. Everything in it is fictional.

```text
Sample:  invoice-7731.pdf.exe  (attachment in an email to alice@shop.example)
Run in:  isolated analysis VM, simulated network, 10-minute observation

[00:00] invoice-7731.pdf.exe starts and shows an empty "PDF viewer" window
[00:02] Writes a copy of itself to the user's profile folder as updater.exe
[00:02] Configures updater.exe to start at every logon
[00:03] Records keystrokes typed into web browser windows
[00:03] Appends the captured keystrokes to a file in the profile folder
[00:05] DNS query for telemetry.cdn-update.test
[00:05] HTTPS POST to telemetry.cdn-update.test (1.2 KB sent)
[00:06] Repeats the HTTPS POST every 60 seconds (plus or minus 3 seconds)
[10:00] End: no connections to other local hosts, no other files modified,
        process visible in the process list throughout
```

Work through the four facets, citing evidence for each label.

1. **Propagation.** The file arrived as an email attachment, and its double extension (`.pdf.exe`) makes an executable look like a document. It ran only because Alice opened it. That is a trojan, delivered by phishing (ATT&CK T1566.001, Spearphishing Attachment, then T1204.002, Malicious File). Copying itself to `updater.exe` is not replication in the virus sense, because no other file was infected, and no other host was contacted, so nothing here suggests a worm.
2. **Payload.** Keystroke capture makes it a keylogger, a kind of spyware. The target is confidentiality, especially passwords typed into browsers.
3. **Concealment.** Apart from the disguise, none was observed. The process stayed visible, and nothing suggested tampering with the operating system's reports.
4. **Control.** Regular HTTPS posts to a single domain at about 60-second intervals look like beaconing to a C2 server. Because the posts follow the keystroke capture, they probably carry the stolen keystrokes out (exfiltration).
5. **Persistence.** It also arranges to start at every logon (ATT&CK T1547, Boot or Logon Autostart Execution). Ending the running process will not remove it.

The resulting label is a sentence, not a word: *a trojan that installs a keylogger, persists across logons, and sends captured keystrokes to an HTTPS command-and-control server.* Each part maps to a decision. The keylogger means Alice's passwords must be changed from a clean device. The C2 domain is an [[indicator-of-compromise]], so the team searches DNS and proxy logs for other machines contacting it. Persistence means the laptop needs rebuilding, not just a reboot.

Note what the report cannot tell you. Ten minutes in a simulated network is a small window, and a sample that did not spread here may spread under other conditions. Absence of evidence is not evidence of absence.

## Defenses

Each facet points to its own defenses:

| Facet       | Prevent                                                                    | Detect or limit                                                  |
| ----------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Propagation | Patch quickly and disable unused services (worms); filter attachments and train users (trojans) | Use [[network-segmentation]] so one infection cannot reach every host |
| Payload     | Keep an offline, tested [[backup]] of critical data (ransomware, wipers)   | Require [[mfa]], so a captured password alone is not enough      |
| Concealment | Verify boot integrity with [[secure-boot]]                                 | Collect evidence from outside the suspect host                   |
| Control     | Restrict outbound traffic to what the business needs                       | Monitor DNS and proxy logs for beaconing                         |

Every defense has limits. Traditional [[antivirus]] software matches signatures, which are patterns taken from known samples. The CS 161 textbook explains why this is an arms race: attackers can study the defenses and change their code until it is no longer recognized, and perfectly separating malicious from benign code is impossible in general, because a perfect detector would solve the halting problem.

Classification has limits too. NIST SP 800-83 observes that the classic categories are "considerably less useful than they used to be" for incident handling, because one set of procedures now covers nearly all malware incidents, and it tells organizations to avoid "expending substantial time and resources" categorizing each one. The facets in this lesson are not a filing exercise. Within that one procedure, they set priorities and scope: how fast to contain, which credentials to reset, whether the backups are at risk. Classify far enough to make the next decision, then act.

## Common misconceptions

- **"Virus" means any malware.** In everyday speech, yes. Technically, a virus is one propagation method: it infects other files and needs a user to run them.
- **A trojan is a kind of virus.** A trojan does not replicate. It spreads only as far as people can be tricked into running it.
- **Each sample has exactly one category.** Most real malware combines facets. WannaCry was both a worm and ransomware.
- **If antivirus names it, we know what it does.** Family names vary between vendors and can be wrong. Recorded behavior is what drives the response.
- **A rootkit is just another payload.** A rootkit attacks the defender's view of the system, so the host's own reports cannot be trusted.
- **Malware always needs a software vulnerability.** Many infections exploit people instead, by persuading a user to run a file.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. This exercise uses written descriptions only. Never download live malware samples for coursework.

Classify each fictional description below on paper or in a spreadsheet, with one row per description and five columns: propagation, payload, concealment, control, and a responder's first question. Write "unknown" where the description gives no evidence.

- **A.** A spreadsheet arrives by email at `bank.example`. When opened with macros enabled, it adds its macro code to every other spreadsheet in the user's documents folder.
- **B.** Lab servers in `198.51.100.0/24` restart unexpectedly, one after another. After each restart, the server starts connecting to random addresses on the port its own file-sharing service uses.
- **C.** A "free VPN" app installed by `bob` uploads his contact list and a screenshot to `vpn-free.test` once an hour.
- **D.** Every document on a file server is replaced by an unreadable copy with a new extension, a payment demand appears in each folder, and the server's local recovery snapshots are deleted.
- **E.** The endpoint agent on a workstation shows nothing unusual, but a network sensor sees the workstation sending traffic to `203.0.113.50` that no visible process accounts for.
- **F.** A cloud bill triples, and the account's virtual machines run at full processor load on a process no one deployed.

Then find the [MITRE ATT&CK](https://attack.mitre.org/) technique that best matches one behavior in D, and compare its description with your label.

Suggested answers: A is a macro virus with an unknown payload. B behaves like a worm. C is a trojan carrying spyware, with hourly beaconing. D is ransomware that also inhibits recovery (T1490, Inhibit System Recovery). E suggests concealment, possibly a rootkit, so trust the network sensor over the host. F is resource hijacking (T1496). If you asked "what else can it reach?" for B and "are the backups safe?" for D, you are thinking like a responder.

## Key takeaways

- Classify malware along four facets: propagation, payload, concealment, and control. One sample usually earns labels from several of them.
- A virus needs a user to run an infected file, a worm spreads by itself, and a trojan tricks the user and never replicates.
- Rootkits matter beyond their payload, because they make the infected host's own reports untrustworthy.
- Family names are inconsistent between vendors. Hashes identify files, and observed behavior, mapped to ATT&CK techniques, describes them.
- Classify far enough to choose the next response action. The label exists to drive a decision.

## Go deeper

- **Labeling at scale.** Sebastián and colleagues' AVClass (RAID 2016) normalizes the labels that dozens of antivirus engines assign, drops generic words, and picks a family name by plurality vote, evaluated on about 8.9 million samples. Open question: how can researchers build trustworthy ground truth for malware families when every label source is noisy?
- **Limits of detection.** The CS 161 malware chapter links perfect detection to the halting problem and explains polymorphic and metamorphic code, which looks different in every copy. Consider why that pushes defenders toward allowing known-good software rather than only detecting known-bad software.
- **Behavior over names.** ATT&CK Software pages, such as WannaCry (S0366), list the techniques each family has been observed using. Compare a family's popular label with that list.
