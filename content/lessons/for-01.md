---
topicId: FOR-01
title: Evidence integrity and chain of custody
summary: >-
  How investigators copy digital evidence without changing it, show with cryptographic hashes that a
  copy is exact, and record every hand that touched it, along with what those records can and cannot
  prove.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Explain what matching hash values prove about a copy of digital evidence and what they leave unproven.
  - Choose between a bit-stream image and a logical copy for a scenario and justify the choice.
  - Record a chain-of-custody log that shows who held an item, when, where, and why, for every transfer.
  - Verify a copied file with SHA-256 and write down the result together with its limitations.
prerequisites: [FND-01, CRY-01]
concepts:
  - digital-evidence
  - chain-of-custody
  - forensic-image
  - write-blocker
  - logical-acquisition
  - evidence-authentication
  - tool-validation
labs: []
keywords:
  - chain of custody
  - CoC
  - evidence integrity
  - hash verification
  - SHA-256
  - write blocker
  - write blocking
  - forensic image
  - bit-stream image
  - disk imaging
  - dd image
  - logical acquisition
  - forensically sound
  - FRE 901
  - FRE 902
  - Rule 902(14)
  - NIST SP 800-86
  - RFC 3227
  - BCP 55
  - CFTT
  - SWGDE
sources:
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: 'SWGDE Best Practices for Computer Forensic Acquisitions (17-F-002, version 2.1)'
    url: https://www.swgde.org/documents/published-complete-listing/17-f-002-2-1/
    publisher: Scientific Working Group on Digital Evidence (SWGDE)
    license: All rights reserved (redistribution allowed under SWGDE terms)
  - title: 'RFC 3227: Guidelines for Evidence Collection and Archiving (BCP 55)'
    url: https://www.rfc-editor.org/rfc/rfc3227
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
  - title: 'Federal Rules of Evidence, Rule 901: Authenticating or Identifying Evidence'
    url: https://www.law.cornell.edu/rules/fre/rule_901
    publisher: Legal Information Institute, Cornell Law School
  - title: 'Federal Rules of Evidence, Rule 902: Evidence That Is Self-Authenticating'
    url: https://www.law.cornell.edu/rules/fre/rule_902
    publisher: Legal Information Institute, Cornell Law School
  - title: Computer Forensics Tool Testing Program (CFTT)
    url: https://www.nist.gov/itl/csd/secure-systems-and-applications/computer-forensics-tool-testing-program-cftt
    publisher: National Institute of Standards and Technology (NIST)
quiz:
  - question: >-
      Bob hashes a seized USB drive with SHA-256 before imaging it, then hashes the image, and the
      two values match. What does the match establish?
    choices:
      - Nobody altered the drive's contents before it was seized.
      - The image is a byte-for-byte copy of what the drive returned when it was read.
      - The files on the drive were created by the drive's owner.
      - The drive has no hidden or unreadable areas.
    answer: 1
    explanation: >-
      A hash comparison shows that two byte sequences are identical. It cannot reach back before the
      moment of hashing, say anything about authorship, or cover sectors the tool could not read.
      Those questions need custody records, file-system evidence, and the imaging tool's error log.
  - question: When is a targeted logical copy a better choice than a full bit-stream image?
    choices:
      - You need to recover a document that was deleted from a laptop's drive last week.
      - You suspect fragments of an old file remain in the slack space of a USB stick.
      - Your authorization covers one employee's mailbox on a mail server shared by thousands of other people.
      - The device is small enough to image in a few minutes.
    answer: 2
    explanation: >-
      Deleted files and slack space lie outside what a logical copy sees, so the first two cases call
      for an image. When authorization covers only part of a shared system, imaging everything would
      collect data you have no right to. A scoped logical collection, documented and hashed, fits the
      authorization.
  - question: >-
      A custody log shows a seized phone leaving the responder at 18:00 and arriving at the lab at
      09:00 the next day, with no entry in between. What is the best description of the problem?
    choices:
      - Nobody can show from the record who had the phone overnight, so the other side can fairly argue it was altered or swapped; the gap must be investigated and disclosed.
      - The hash taken at the lab will not match, so the evidence is unusable.
      - Nothing, because custody records matter only after an image has been made.
      - The lab should fill in the missing entry from memory so the log is complete.
    answer: 0
    explanation: >-
      A custody gap is a hole in the account of who could have touched the item. A hash computed at
      the lab protects the data only from then on, so it cannot close the gap. Filling in the log
      from memory would make the record misleading; the honest fix is to find out what happened,
      document it, and disclose it.
  - question: Your lab receives a new version of its disk-imaging tool. What should happen before it is used on case evidence?
    choices:
      - Nothing, because the vendor has already tested it.
      - Try it once on real evidence and compare the result with the old tool's.
      - Change hash algorithms, because a new tool needs new hashes.
      - Test it against reference data with known contents, record the results and limitations, and approve it under the lab's procedures.
    answer: 3
    explanation: >-
      Validation shows that this version produces accurate results under the conditions you will use
      it in, which is the kind of evidence about a process that Rule 901(b)(9) describes. Programs
      such as NIST CFTT publish test methods and reports that labs can build on. Experimenting on
      real evidence puts the evidence itself at risk.
  - question: An old procedure tells examiners to record only MD5 hashes. What is the best update, and why?
    choices:
      - Keep MD5 alone, because collisions never matter once a file has been hashed.
      - Record SHA-256, optionally alongside MD5 for older tools, because MD5 collisions can be manufactured and a current NIST-approved algorithm resists forgery.
      - Replace hashes with CRC32 checksums, which are faster to compute.
      - Encrypt each image instead, because encryption also proves integrity.
    answer: 1
    explanation: >-
      Matching the MD5 of an existing file is still impractical, but practical collisions let a
      prepared adversary create two different files with the same MD5 in advance. SHA-256 avoids
      that argument. CRC32 detects accidents, not deliberate changes, and encryption protects
      confidentiality, not integrity by itself.
---

## Why it matters

Suppose the security team at shop.example finds a USB flash drive in a shared workstation the morning after an alert that customer records were exported. Months later, a disciplinary panel or a court will ask two things about any file you say was on that drive: is it exactly what the drive held, and could anyone have changed it since? If you cannot answer both with records made at the time, your strongest finding may be set aside or given little weight.

Digital evidence is unusually fragile. Plugging a drive into an ordinary computer lets the operating system write to it, booting a seized laptop adds log entries, and copying a file gives the copy at least some new timestamps. None of these changes is visible, and a perfect copy looks exactly like the original unless you measured the original first. The discipline therefore rests on two habits: measure data so that any change can be detected, and document everything that happens to it.

In United States federal courts, Federal Rule of Evidence 901 requires the party offering an item to produce evidence "sufficient to support a finding that the item is what the proponent claims it is," a step called [[evidence-authentication|authentication]]. Rule 902(14), added in 2017, lets data copied from a device be authenticated by a qualified person's certification of "a process of digital identification," and the committee note explains that this ordinarily means comparing hash values. Many investigations never reach a courtroom, but you rarely know at the start which ones will. NIST's forensics guide is blunt: "If it is unclear whether or not evidence needs to be preserved, by default it generally should be preserved."

> [!NOTE] This lesson describes U.S. federal rules as background for technical practice. It is not legal advice, and other jurisdictions differ.

## The core idea

[[digital-evidence|Digital evidence]] is information stored or transmitted in digital form that may help prove or disprove a claim. Handling it well comes down to three questions, each answered by a different tool:

1. **Is this copy exactly what the original held?** A cryptographic [[hash-function|hash]], recorded at acquisition and recomputed later, answers this.
2. **Could anyone have changed or swapped it?** The [[chain-of-custody|chain of custody]], an unbroken record of who had the item, when, where, and why, answers this.
3. **Did the method itself change or miss anything?** [[write-blocker|Write blocking]], [[tool-validation|validated tools]], and notes detailed enough for another examiner to repeat the work answer this.

An analogy helps. A hash is a tamper-evident seal on the bytes that anyone can re-check, and the custody log is the sign-out sheet for the evidence locker. An intact seal tells you nothing about what was in the bag before it was sealed, and a sign-out sheet with a missing day invites the question of where the bag was.

Three assumptions sit underneath all of this. First, a hash protects data only from the moment it is computed, not before. Second, the hash function must resist deliberate forgery, which today means SHA-256 or another current algorithm rather than MD5 or SHA-1, both of which have practical collision attacks. Third, records are only as trustworthy as the people and moments that produced them, so notes are written as the work happens, by the person doing it.

## How it works

NIST SP 800-86 divides the forensic process into four phases: collection, examination, analysis, and reporting. [[integrity|Integrity]] and custody are established during collection and must hold through the other three.

### Identify and preserve

Before touching anything, record the scene: photographs, labels, serial numbers, whether each device is on, and what any screen shows. Then decide how to collect. A running computer holds memory contents, network connections, and decrypted data that vanish at shutdown, so live collection follows the [[order-of-volatility|order of volatility]], most fleeting data first (see [Memory-forensics concepts](lesson:FOR-04)). Full-disk encryption raises the stakes. SWGDE's acquisition guidance notes that a live acquisition "may be the only opportunity" to obtain data from an encrypted system, and it advises against physically removing the storage media when the encryption is bound to the computer's [[tpm|TPM]].

RFC 3227, the IETF's evidence-collection practice, adds rules that still hold: do not trust the programs on the system you are examining, minimize changes to the data as you collect it, and record the difference between the system clock and [[utc|UTC]].

### Acquire: images and logical copies

A [[forensic-image]], also called a bit-stream image, is a sector-by-sector copy of a storage device. A [[logical-acquisition|logical copy]] collects only the files and folders that the file system presents. SP 800-86 states the difference precisely: a logical backup "does not capture other data that may be present on the media," while bit-stream imaging copies everything "including free space and slack space."

|                 | Bit-stream image                                                           | Logical copy                                              |
| --------------- | -------------------------------------------------------------------------- | --------------------------------------------------------- |
| Captures        | Every readable sector, including [[unallocated-space]] and [[slack-space]] | Selected files and folders, as the file system shows them |
| Deleted data    | Often recoverable until overwritten                                        | Usually lost                                              |
| Cost            | The whole device; slower and larger                                        | Only what you select                                      |
| Typical sources | Laptops, USB drives, virtual-machine disks                                 | Cloud accounts, mail servers, shared file servers         |
| Main risk       | Collecting far more personal data than the case needs                      | Missing data that nobody knew to request                  |

Images are stored either as raw files, a byte-for-byte copy often called dd format, or in forensic container formats that add case notes, compression, and stored hashes. Either way, the examiner works on copies and keeps the original, or a master image, untouched.

A [[write-blocker]] is a hardware device or software layer that passes read commands to a storage device and blocks write commands. Hardware blockers sit physically between the drive and the examiner's workstation; software blockers run on the workstation itself. SP 800-86 stresses that blocking must be "toggled on for all connected devices." Know its limit: a write blocker governs only what the host sends. It cannot stop a solid-state drive's own controller from erasing blocks that the operating system had already marked as unused, which is one reason two acquisitions of the same SSD can produce different hashes.

### Verify with hashes

Hash verification follows a fixed rhythm. SP 800-86 says to compute and record the digest of the original media before imaging, compute the digest of the copy and compare the two, and then hash the original again to confirm that imaging did not alter it. SP 800-86 dates from 2006 and names MD5 and SHA-1. Current SWGDE guidance asks for "a NIST-approved hash algorithm," so modern procedures record SHA-256, sometimes alongside MD5 for compatibility with older tools.

Be exact about what a match proves. Identical SHA-256 values mean the two byte sequences are identical, with overwhelming probability. They do not show that the original content is genuine, who created it, or what happened before acquisition. They also do not show that the image covers areas the tool could not read: SWGDE notes that verification may not cover damaged sectors or hidden drive areas such as a Host Protected Area. A mismatch, in turn, means only that the bytes differ. Failing media, a live system that kept changing, the wrong device, a tool defect, or tampering can all cause one, so the examiner documents and explains a mismatch instead of discarding it.

### Document custody

RFC 3227 lists what a custody record must answer: where, when, and by whom the evidence was discovered and collected; where, when, and by whom it was handled or examined; who had custody during each period; and when and how each transfer happened, including shipping numbers. In practice that means a log entry for every hand-off, sealed and labeled evidence bags with tamper-evident tape, and locked storage with its own access log.

Alongside the custody log, the examiner keeps contemporaneous notes. SWGDE lists what an acquisition record should capture: identifiers, hash values, the tool and its version, the date and time with time zone, and any errors.

### Validate tools

An image is only as trustworthy as the tool that made it. NIST's Computer Forensics Tool Testing (CFTT) program writes specifications and test methods for tool categories such as disk imaging, hardware and software write blocking, deleted-file recovery, and file carving, and it makes test reports public. Labs validate each tool version against data with known contents before using it in casework and record its known limitations. That record supports the kind of showing Rule 901(b)(9) describes: evidence "describing a process or system and showing that it produces an accurate result."

## Worked example

Here is a complete toy case with fictional people and items. Alice, the shop.example security lead, finds a USB flash drive in workstation W-17 at 09:12 UTC on October 4, 2026. Bob, the examiner, images it two days later.

**Step 1: Seize and record.** Alice photographs the drive in place and notes the time. She does not open it. She places it in evidence bag EB-5531, seals the bag, signs across the seal, and locks it in the security office safe.

**Step 2: Transfer.** On October 6, alice signs the bag over to bob, who confirms that the seal is intact before accepting it.

**Step 3: Acquire.** Bob connects the drive through a hardware write blocker that the lab validated in September, images it to `E1.raw`, and has the tool hash the source before and after imaging.

```text
Case 2026-0142 | Item E1 | USB flash drive, label "SHOP-BACKUP", serial TEST-7781
Examiner: bob   Witness: alice   Workstation: FWS-02 via hardware write blocker WB-3
Start 2026-10-06 14:05 UTC   End 2026-10-06 14:31 UTC   Read errors: none reported
Source SHA-256, before imaging: dd13e28edb3440a04a45ad79ea6127de495d317eb4bb6d535a370d63948774f4
Image E1.raw SHA-256:           dd13e28edb3440a04a45ad79ea6127de495d317eb4bb6d535a370d63948774f4
Source SHA-256, after imaging:  dd13e28edb3440a04a45ad79ea6127de495d317eb4bb6d535a370d63948774f4
```

**Step 4: Preserve the master.** Bob writes `E1.raw` to write-once storage as the master image, makes a working copy, and hashes the working copy. All examination happens on the working copy. A separate log tracks the image files: where each copy is stored and who opened it.

**Step 5: Log custody.** The custody log for the physical drive now reads:

| #   | Time (UTC)       | Released by       | Received by   | Purpose                        | Seal check               |
| --- | ---------------- | ----------------- | ------------- | ------------------------------ | ------------------------ |
| 1   | 2026-10-04 09:12 | Found at W-17     | alice         | Seizure, photographed in place | Bag EB-5531 sealed 09:20 |
| 2   | 2026-10-04 09:25 | alice             | Security safe | Storage                        | Intact                   |
| 3   | 2026-10-06 13:40 | alice (from safe) | bob           | Imaging                        | Intact                   |
| 4   | 2026-10-06 14:45 | bob               | Evidence room | Long-term storage              | Resealed in bag EB-5532  |

**Step 6: Re-verify before reporting.** Three weeks later, before writing the report, bob hashes the working copy again and gets the same value, a check any later reader can repeat.

**Step 7: State the limits.** Bob's notes say what the record supports and what it does not. It supports the claim that `E1.raw` is an exact copy of what the drive returned on October 6. It cannot show who copied files onto the drive or when; that question needs file-system and timeline evidence (see [Filesystem artifacts and metadata](lesson:FOR-02)). The notes also record that between 09:12 and 09:20 on October 4 the drive was outside a sealed bag but under alice's direct observation. Writing that down is what makes the rest of the record credible.

## In practice

- **Write the procedure before the incident.** Decide which tools, hash algorithm, forms, and storage you will use, and train people on them.
- **Separate the master from working copies.** Keep the master image read-only, restrict and log access to it, and do all analysis on copies you can re-create.
- **Collect what the authorization covers.** A bit-stream image captures everything, including other people's personal data. Scope the collection to what the warrant, policy, or contract permits, and say so in your notes.
- **Handle cloud sources honestly.** You usually cannot image a provider's disks. Export through the provider's interfaces, hash what you receive, and record the account, interface, and time range.
- **Expect every safeguard to have limits.** Hashes detect change but do not explain it, custody logs are only as good as the people filling them in, and tool validation covers only the tested features of the tested version.

## Common misconceptions

- **"Matching hashes prove the evidence is authentic."** They prove that the copy equals the source at the time both were hashed. Authenticity also depends on where the source came from and how it was handled.
- **"A write blocker makes any acquisition forensically sound."** It blocks host writes only, and only on devices where it is switched on. Live systems, SSD internals, and unreadable areas need separate attention.
- **"Chain of custody is only for physical exhibits."** Image files move between people and systems too. Record who copied them, where they are stored, and who can open them.
- **"MD5 is fine because nobody can forge my particular file."** Matching an existing file's MD5 is still impractical, but collisions let someone prepare two different files with the same hash in advance. Use SHA-256.
- **"A gap in the custody log makes the evidence worthless."** Not automatically, but the gap must be disclosed and explained, and it gives the other side a fair argument.

## Try it yourself

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

Use a file you create yourself, never personal data.

1. Create a folder named `toy-case` containing a short text file, `notes.txt`, with one line of text.
2. Hash the file:

```bash
# Linux
sha256sum toy-case/notes.txt
# macOS
shasum -a 256 toy-case/notes.txt
# Windows PowerShell: Get-FileHash -Algorithm SHA256 toy-case\notes.txt
```

3. Copy the file to another folder or to a USB stick you own, and hash the copy. The two values should match.
4. Run `stat` on the original and on the copy (on macOS, `stat -x`; in PowerShell, `Get-Item` piped to `Format-List *Time*`). The content hashes match, yet some timestamps differ. Keep this result for [the next lesson](lesson:FOR-02).
5. Make a second copy, change one character in it, and hash it. Notice that the new value shares no visible pattern with the old one.
6. Write a one-page record: a description of the item, the hashes with the tool name and version, a custody table for every move you made, and three sentences on what your record does not prove.

Check yourself: could a classmate repeat your work from your notes alone, and does your limitations paragraph name at least one question a hash cannot answer?

## Key takeaways

- Integrity and custody answer different questions: hashes show that a copy is exact, and custody records show who could have changed it.
- A hash protects data only from the moment it is computed, so record it at acquisition, using a current algorithm such as SHA-256.
- Bit-stream images capture everything readable, including deleted data; logical copies are smaller and better scoped but miss what nobody asked for.
- Write blockers, validated tools, and contemporaneous notes make the method itself defensible.
- Write down the limits of your record; disclosed limits make the rest of it credible.

## Go deeper

- Read the 2017 committee notes to [Federal Rule of Evidence 902](https://www.law.cornell.edu/rules/fre/rule_902) on why hash values let copied data be authenticated by certification, and what a certification leaves open to challenge.
- Compare [RFC 3227](https://www.rfc-editor.org/rfc/rfc3227) (2002) with [SWGDE's acquisition guidance](https://www.swgde.org/documents/published-complete-listing/17-f-002-2-1/) (version 2.1, 2025). Which assumptions changed with full-disk encryption, solid-state drives, and cloud services?
- Browse the test reports linked from [NIST CFTT](https://www.nist.gov/itl/csd/secure-systems-and-applications/computer-forensics-tool-testing-program-cftt). An open research question: how should a lab validate collection from sources, such as cloud accounts, whose contents change between any two collections?
