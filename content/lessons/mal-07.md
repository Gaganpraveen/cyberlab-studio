---
topicId: MAL-07
title: Ransomware resilience and recovery
summary: Learn, from the defender's side, how to make ransomware survivable with backups the attacker cannot reach or change, protected backup credentials, restores tested against recovery objectives, segmentation that limits spread, a practiced response plan, and an informed process for the question of paying.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 60
objectives:
  - Design a backup plan that applies the 3-2-1 rule and keeps at least one offline or immutable copy that production credentials cannot change or delete.
  - Explain how ransomware attacks recovery itself (ATT&CK T1486 and T1490) and match each behavior to a control that keeps restoration possible.
  - Judge whether a backup design meets a service's RPO and RTO, using restore tests, restore-time arithmetic, and the time an intrusion began.
  - Sequence the response to a ransomware incident, from isolation and evidence preservation to a verified restore in dependency order.
  - Summarize US government guidance on ransom payment and identify the facts leadership needs before deciding.
prerequisites: [MAL-01, GRC-05, OPS-06]
concepts: [ransomware, backup, 3-2-1-backup-rule, immutable-backup, golden-image, double-extortion, lateral-movement]
labs: []
keywords:
  - ransomware recovery
  - ransomware resilience
  - cyber resilience
  - 3-2-1 rule
  - 3-2-1 backup
  - offline backup
  - air-gapped backup
  - immutable backup
  - immutable storage
  - object lock
  - WORM storage
  - golden image
  - backup credentials
  - restore test
  - recovery drill
  - RTO
  - RPO
  - double extortion
  - data extortion
  - ransom payment
  - OFAC
  - sanctions
  - IC3
  - '#StopRansomware'
  - NIST IR 8374
  - NIST SP 800-184
  - PR.DS-11
  - PR.AA-05
  - RC.RP-03
  - DE.AE-04
  - CPG 2.R
  - TA0040
  - TA0008
  - T1486
  - T1490
  - T1485
  - M1053
  - M1018
  - WannaCry
  - MS17-010
sources:
  - title: '#StopRansomware Guide'
    url: https://www.cisa.gov/stopransomware/ransomware-guide
    publisher: CISA, MS-ISAC, NSA, and FBI
    sourceId: cisa-stopransomware-guide
  - title: 'NIST IR 8374 Rev. 1: Ransomware Risk Management: A Cybersecurity Framework 2.0 Community Profile'
    url: https://csrc.nist.gov/pubs/ir/8374/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-ir-8374
  - title: 'MITRE ATT&CK: Data Encrypted for Impact (T1486)'
    url: https://attack.mitre.org/techniques/T1486/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Inhibit System Recovery (T1490)'
    url: https://attack.mitre.org/techniques/T1490/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'CISA Alert TA17-132A: Indicators Associated With WannaCry Ransomware'
    url: https://www.cisa.gov/ncas/alerts/TA17-132A
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Updated Advisory on Potential Sanctions Risks for Facilitating Ransomware Payments (September 21, 2021)'
    url: https://ofac.treasury.gov/media/912981/download
    publisher: US Department of the Treasury, Office of Foreign Assets Control (OFAC)
quiz:
  - question: An intruder has stolen the password of an account that administers every server in the department's directory. Which copy of the file server's data is most likely to survive?
    choices:
      - Hourly snapshots stored on the file server's own disks, kept for two days.
      - Nightly backups on a storage appliance that is joined to the same directory and accepts the same administrator account.
      - A real-time replica on a second server in another building, kept in sync within seconds.
      - A copy in immutable storage with a 30-day lock, managed through a separate account protected by phishing-resistant MFA.
    answer: 3
    explanation: ATT&CK's Inhibit System Recovery (T1490) describes deleting snapshots and backups that can be reached from the compromised network. The snapshots and the appliance fall to the stolen password, and the replica copies the encrypted files as quickly as it copied the good ones. The locked copy refuses deletion until its retention ends, and the separate account keeps the intruder away from its settings.
  - question: Logs show the intruder first signed in on Tuesday at 23:00, and encryption started on Friday at 02:00. Backups run nightly at 01:00. Which restore plan is most defensible?
    choices:
      - Start from the Tuesday 01:00 copy, the last one before the intrusion, and check later copies before using them.
      - Restore Friday's 01:00 backup, since it was taken before encryption started and loses the least work.
      - Restore Thursday's 01:00 backup, leaving a full day before encryption as a safety margin.
      - Restore the newest backup whose files all open without errors on a test machine.
    answer: 0
    explanation: Copies taken after Tuesday 23:00 may contain the intruder's tools or changes even when every file opens normally, so they stay suspect until checked; CSF 2.0 outcome RC.RP-03 asks that backups be verified before they are used. Starting from the last copy before the intrusion puts the worst-case data loss at about three days, which is why the RPO must be counted from the newest copy you can trust.
  - question: A backup console has reported "success" every night for a year. What does a restore test show that the nightly report does not?
    choices:
      - Nothing more, because a job that reports success has already proved that every file can be restored.
      - Whether each nightly job finished inside its scheduled window and copied every selected folder.
      - Whether the data comes back complete and intact, with the staff and credentials available in a crisis, within the RTO.
      - Whether an intruder had already copied the data out of the network before the backup ran.
    answer: 2
    explanation: A job report says data was written, not that it can be restored, and it already shows job timing. CISA advises scheduled recovery tests that verify backup integrity and show the team can restore data fully and partially. Timing the test turns the RTO from a promise into a measurement and exposes missing passwords, keys, and slow links before an incident does. No restore test can show whether data was stolen.
  - question: "At 02:00, monitoring shows files on several department servers being renamed and encrypted. Which first action matches the #StopRansomware Guide's response checklist?"
    choices:
      - Restore the newest backups at once, so the outage stays within the RTO.
      - Isolate the affected systems, at the switch level if several are hit, and coordinate by phone.
      - Power off every server in the department, backup servers included, to stop the spread.
      - Email all staff a warning, then reply to the ransom note to learn what was taken.
    answer: 1
    explanation: The checklist starts by determining which systems are affected and isolating them immediately, at the switch level when several are involved, using out-of-band communication such as phone calls so an intruder who can read email is not tipped off. Powering down is the fallback for a device that cannot be disconnected, and it destroys memory evidence. Restoring before the intruder's access is removed risks reinfecting the restored systems.
  - question: A college's leadership asks whether paying the ransom would end the incident. Which answer best reflects US government guidance?
    choices:
      - Yes, because ransomware groups protect their reputations by deleting stolen data and leaving once paid.
      - Yes, when no clean backup meets the RPO, because federal guidance then recommends paying.
      - No, because paying any ransom is illegal for every US organization in every case.
      - No. The FBI does not support paying, data may not come back, and OFAC warns of sanctions risk.
    answer: 3
    explanation: The FBI says paying does not guarantee any data will come back. OFAC's 2021 advisory says the US government strongly discourages paying ransom or extortion demands and describes sanctions liability as strict, so a payer can be held liable even without knowing the recipient was sanctioned. Because OFAC's concern is payments that reach sanctioned persons, whether a given payment is lawful is a question for legal counsel. Either way, paying cannot unpublish stolen data or remove the intruder.
---

## Why it matters

[[ransomware|Ransomware]] holds an organization's own data hostage. MITRE ATT&CK calls the core behavior Data Encrypted for Impact (T1486): adversaries encrypt "data on target systems or on large numbers of systems in a network to interrupt availability" and withhold the key. NIST IR 8374 Rev. 1, NIST's guide to managing ransomware risk, describes the victim's choice: "pay the ransom and hope the attackers keep their word to restore access and not disclose data," or "do not pay the ransom and attempt to restore operations themselves."

Resilience is the work, done long before an incident, that makes the second choice fast and dependable. Attackers aim at recovery itself: the #StopRansomware Guide, from CISA, the Multi-State Information Sharing and Analysis Center (MS-ISAC), the NSA, and the FBI, warns that many variants try to find and delete or encrypt accessible backups. Some groups also steal data first and threaten to publish it, which no backup can undo.

## The core idea

A spare key on the same keyring is not a spare: a thief who takes the keyring takes it too. A [[backup]] that a stolen administrator password can delete is a spare on the same keyring.

Start from three assumptions:

1. By the time encryption starts, the intruder may hold administrator rights and may have been inside for some time. Whatever those credentials can change, assume the intruder can change too.
2. Payment is not a recovery plan. It does not guarantee the data comes back, cannot undo data theft, and is useless when data was destroyed outright (ATT&CK's Data Destruction, T1485, the behavior of a [[wiper]]).
3. People, bandwidth, and time are limited, so recovery must be prioritized and measured.

Resilience therefore has four parts: a copy out of the attacker's reach, restores proven against the [[rto]] and the [[rpo]], limits on spread, and decisions made in advance.

## How it works

### What ransomware does to recovery

Two ATT&CK Impact techniques (tactic TA0040), plus the data theft that often precedes them, matter most for recovery:

| Behavior | What it involves | Consequence for recovery |
| --- | --- | --- |
| Data Encrypted for Impact (T1486) | Encrypting files on one system or many and withholding the key | Any copy the intruder can write to may be encrypted |
| Inhibit System Recovery (T1490) | Deleting or disabling recovery features such as snapshots, backup catalogs, recovery settings, and network-reachable or cloud-synced backups | The quick ways back may be gone |
| Data theft before encryption | Copying data out, then threatening to publish it; the #StopRansomware Guide calls the combination [[double-extortion]] | Backups restore availability, not [[confidentiality]] |

Whatever is reachable and writable from the compromised environment is part of the target.

### The 3-2-1 rule, hardened for ransomware

CISA's [backup guidance](https://www.cisa.gov/audiences/small-and-medium-businesses/secure-your-business/back-up-business-data) calls the [[3-2-1-backup-rule|3-2-1 rule]] "a trusted guideline": keep **3** copies of important files, on **2** types of storage media, with **1** copy off-site. The rule assumes that failures are independent, but an intruder with administrator rights is one cause that can reach every copy those rights can change, a [[common-mode-failure]]. So at least one copy must sit out of reach:

- **Offline:** disconnected when not in use. Among the #StopRansomware Guide's backup recommendations: "Maintain offline, encrypted backups of critical data."
- **Immutable:** an [[immutable-backup|immutable copy]] stays online but refuses changes and deletion until its retention period ends. IR 8374 suggests storing data "in an immutable format," while the #StopRansomware Guide advises using immutable storage "with caution," since misconfiguration can be costly.

| Copy | Survives a stolen administrator password? | Typical restore speed |
| --- | --- | --- |
| Snapshots on the same server | No: deleted (T1490) | Fastest |
| Real-time replica on a second server | No: it copies the encryption | Fast |
| Backup server that accepts the same administrator accounts | No: same password, same reach | Fast |
| Immutable copy with separate administrator accounts | Yes, until the lock expires | Moderate |
| Offline copy, disconnected when the attack began | Yes | Slowest |

In the diagram, only the separately administered store survives the stolen password.

```sequence
title: One stolen password, three kinds of copy
participant I as Intruder with directory admin password
participant F as File server
participant B as Backup server (trusts directory)
participant V as Immutable store (separate admin)
I -> F: Encrypt shared files (T1486)
I -> F: Delete local snapshots (T1490)
I -> B: Sign in as directory admin, delete backups
B --> I: Deleted: same password, same reach
I -x V: Delete copies or shorten the lock
note V: Refused: locked until retention ends
note: Recovery starts from V, after verification
```

Retention matters too, because copies made after the intrusion began may hold the intruder's tools. CISA advises being able to "roll back data at least seven days if needed."

### Protecting the backup system

A backup system can read nearly everything and delete every copy, so guard it closely.

- **Separate identities.** ATT&CK advises: "Limit the user accounts that have access to backups to only those required" (M1018). Use dedicated backup administrator accounts, and keep backup agents' [[service-account|service accounts]] from deleting copies.
- **Strong sign-in, two approvers.** Require phishing-resistant [[mfa]] for the backup console, and a second person to delete copies or shorten retention. That is [[separation-of-duties]], which CSF 2.0 outcome PR.AA-05 pairs with [[least-privilege]].
- **Isolation.** ATT&CK's Data Backup mitigation (M1053) advises copying cloud backups "to other accounts or regions to isolate them from the original copies." Keep backup keys and restore runbooks off the systems they protect.
- **Monitoring.** Alert on deleted jobs, shortened retention, and unusual console sign-ins.

### Restore testing against RTO and RPO

Ransomware changes how the [GRC-05](lesson:GRC-05) objectives are measured. The RPO counts from the newest copy you can *trust*: if the intrusion began three days before the encryption, nightly backups may still cost three days. The RTO must include rebuilding clean systems, verifying copies, and restoring in dependency order.

Only tests show whether the numbers hold. CISA asks for scheduled recovery tests that verify integrity and show the team can restore data "both fully and partially." Mix frequent spot restores, checked against recorded hashes, with occasional timed full restores into an isolated network, and record every problem, such as a missing password.

Restore order follows dependencies: NIST [SP 800-184](https://csrc.nist.gov/pubs/sp/800/184/final) notes that identity and authentication services often must return before file and messaging services. Rebuild systems from [[golden-image|golden images]], which the #StopRansomware Guide recommends keeping current; restore onto a clean network; and verify data before using it, as CSF 2.0 outcome RC.RP-03 asks.

### Segmentation that limits spread

ATT&CK sums up [[lateral-movement]] (tactic TA0008) as "The adversary is trying to move through your environment." [[network-segmentation|Network segmentation]] ([NET-07](lesson:NET-07)) puts controlled boundaries in that path. The #StopRansomware Guide says it "can help contain the impact of any intrusion." It also shrinks recovery: fewer encrypted systems mean less to restore, and a backup zone reachable only from a few administration workstations stays off the intruder's path.

### Case study: WannaCry

CISA's alert TA17-132A describes the outbreak of May 12, 2017, with reports of "tens of thousands of infections in over 150 countries." WannaCry spread through a Windows SMBv1 vulnerability that Microsoft had patched in MS17-010 on March 14, 2017, and ATT&CK lists it under both T1486 and T1490. The alert's advice reads like a resilience checklist: patch, or else disable SMBv1 and block SMB at network boundaries; segment networks; apply least privilege; and keep tested backups in a separate location not readily reachable from the local network.

### Responding to a ransomware incident

These steps condense the #StopRansomware Guide's checklist into the phases of [OPS-06](lesson:OPS-06); step 2 is our addition:

1. **Isolate** affected systems at once, at the switch if several are hit; power down only devices you cannot disconnect. Coordinate out of band, such as by phone ([[containment]]).
2. **Protect the way back:** confirm the offline and immutable copies are intact, and keep them disconnected.
3. **Preserve evidence:** a [[forensic-image|system image]] and a [[memory-image|memory capture]] from a sample of affected devices.
4. **Report** to CISA, an FBI field office, or the FBI's Internet Crime Complaint Center (IC3), and ask law enforcement whether a decryptor exists.
5. **Eradicate:** find the entry point and compromised accounts, reset passwords, remove [[persistence]], and check for data theft ([[eradication]]).
6. **Rebuild and restore** by priority from verified backups, without reinfecting clean systems.
7. **Close** by established criteria, then hold a [[post-incident-review]].

### The payment decision

IR 8374 notes that understanding an event's impact can support "a cost-benefit analysis when deciding if a ransom should be paid" (CSF 2.0 outcome DE.AE-04). US government guidance weighs heavily against paying:

- The [FBI](https://www.fbi.gov/how-we-can-help-you/scams-and-safety/common-frauds-and-scams/ransomware) "does not support paying a ransom in response to a ransomware attack," warning that payment does not guarantee data recovery and encourages more attacks.
- The Treasury Department's Office of Foreign Assets Control (OFAC), which administers US sanctions, states that "The U.S. government strongly discourages all private companies and citizens from paying ransom or extortion demands." A payment that reaches a sanctioned person can violate sanctions under strict liability, even if the payer did not know. OFAC counts offline backups, incident response plans, and prompt reporting to and cooperation with law enforcement as significant mitigating factors.

The decision belongs to leadership, advised by legal counsel and law enforcement; this lesson does not cover negotiation. Leadership needs five answers: whether a verified copy from before the intrusion exists, whether measured restore times fit the tolerable outage in the [[business-impact-analysis]], whether data was stolen, whether a payment could reach a sanctioned party, and who may decide. Resilience work answers the first two in advance; for the last, IR 8374 advises an exercised response and recovery plan "with defined roles and strategies for decision making." With backups out of reach, verified, and fast, an organization can decline to pay without betting on an attacker's word.

## Worked example

The Biology department at `campus.example` keeps 250 GB of lab notebooks and grant drafts on `files.bio.campus.example`, with an RPO and an RTO of 24 hours. Its backup plan before and after a review (`-` lines removed, `+` added):

```diff
 service: bio-shared-drive (250 GB)
 objectives: { rpo: 24h, rto: 24h }
 copies:
   - hourly snapshots on files.bio.campus.example, kept 2 days
-  - nightly backup to nas.bio.campus.example, joined to the campus
-    directory, so any directory administrator can delete it
-  - monthly USB copy, kept in the server room
+  - nightly backup to backup.bio.campus.example, not joined to the
+    directory; its own admin accounts with phishing-resistant MFA
+  - nightly copy to immutable cloud storage, locked 30 days, in a
+    separate cloud account; deleting copies needs two approvers
+  - weekly offline copy on removable media, stored in another building
 restore_tests:
-  - none recorded
+  - monthly: restore 3 random folders, check hashes against the manifest
+  - twice a year: full restore into an isolated network, timed
```

**Step 1: test the old plan against the threat.** It has four copies on two kinds of media but none off-site, and one stolen password takes three: the live data, the snapshots (T1490), and the NAS. The offline USB copy survives but sits in the server room, up to a month old.

**Step 2: check the RPO.** Nightly immutable copies lose at most a day if the newest can be trusted. After an intrusion unnoticed for days, the 30-day lock still reaches back; the two-day snapshots would not.

**Step 3: check the RTO.**

```text
Data to restore:                     250 GB = 2,000 gigabits
Effective download rate from cloud:  0.25 Gb/s
Transfer time:                       2,000 / 0.25 = 8,000 s, about 2.2 hours
Rebuild the server from its golden image:          1.5 hours
Verify hashes and scan on an isolated host:        1.0 hour
Restore path total:                          about 4.7 hours
Campus sign-on (central IT), its RTO:              8 hours
Drive usable after:                the later of the two, about 8 hours
```

The restore fits the 24-hour RTO, but if campus sign-on is also down, the drive stays useless until sign-on returns.

**Step 4: replay an incident.** In a [[tabletop-exercise]], the team replays a fictional timeline. An intruder signs in with a stolen staff password on Wednesday at 22:40; early Saturday the drive is encrypted and its snapshots deleted, but the backup server and the cloud account hold. Copies made after 22:40 are suspect, so the team rebuilds from the golden image, restores Wednesday's 01:00 immutable copy, and checks later copies on an isolated host before recovering newer files. Worst case: about three days of lost work.

Before trusting any copy, the team checks it against a manifest of SHA-256 [[hash-function|hashes]] recorded when the copy was made:

```python
import hashlib
import json
import sys
from pathlib import Path


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manifest(folder):
    root = Path(folder)
    return {str(p.relative_to(root)): sha256(p)
            for p in sorted(root.rglob("*")) if p.is_file()}


mode, folder, manifest_file = sys.argv[1:4]
if mode == "record":  # when the copy is made
    Path(manifest_file).write_text(json.dumps(manifest(folder), indent=2))
else:  # "check": before trusting a copy for a restore
    expected = json.loads(Path(manifest_file).read_text())
    actual = manifest(folder)
    for name in sorted(expected.keys() | actual.keys()):
        if name not in actual:
            print("MISSING   ", name)
        elif name not in expected:
            print("UNEXPECTED", name)
        elif actual[name] != expected[name]:
            print("CHANGED   ", name)
    print(f"Checked {len(actual)} files against {len(expected)} recorded.")
```

Matching hashes show that a copy is unchanged since its manifest was recorded, not that it was clean then, so the team also scans each copy and stores the manifests where the intruder cannot rewrite them.

## Defenses

Defenses come in layers, from patching to [[edr|endpoint detection and response]] (EDR) to backups, each with limits.

| Layer | Controls | Limits |
| --- | --- | --- |
| Keep intruders out | Prompt patching; phishing-resistant MFA; no internet-exposed remote desktop without compensating controls | Phishing and unknown vulnerabilities still succeed |
| Limit spread | Segmentation; separate administrator accounts; least privilege | User error bridges segments, and one administrator account crosses many |
| Detect early | EDR alerts on mass file changes and deleted snapshots; backup-job monitoring | Encryption can be fast, and alerts at night need someone on call |
| Keep a way back | Offline and immutable copies, golden images, restore tests | Locks expire, and restores take time |
| Be ready to decide | A response plan approved by leadership, with offline copies; regular tabletop exercises | Plans go stale, and exercises test only imagined scenarios |

Backups cannot help with stolen data. Against double extortion, hold less sensitive data ([[data-minimization]]), restrict and watch outbound transfers ([[egress-filtering]]), and have legal counsel and breach-notification procedures ready.

## Common misconceptions

- **"We have backups, so we're safe."** Reachable backups are part of the target (T1490), and no backup undoes data theft.
- **"Immutable means safe forever."** A lock lasts only for its retention period, and only while the accounts that control retention stay protected.
- **"Restore the newest copy."** It may hold the intruder's tools. Start from the newest copy you can verify, and count the RPO from there.
- **"Paying gets everything back."** Payment guarantees nothing, cannot unpublish stolen data, and can create sanctions risk.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. Use only toy files you created, on your own machine. Never run real ransomware or download malware samples.

**Part 1: a toy restore (about 20 minutes).**

1. Create a folder `toy-dept` with about 20 short text files of made-up notes (no real personal data). Copy it to a second drive and to a USB stick you then unplug. Save the worked example's script as `manifest.py` and record a manifest outside the folder:

   ```bash
   python3 manifest.py record toy-dept manifest.json
   ```

2. Add one file and edit another, as new work. Then damage the working folder by hand, not with a program: overwrite three files with `XXXX`, rename one to end in `.locked`, and delete one. If a copy syncs automatically, see whether the damage spread.
3. Check each copy with `python3 manifest.py check <folder> manifest.json`, restore from one that passes, and time it. Record what was lost (your real RPO) and the time taken (your measured RTO).

**Part 2: a department plan (about 15 minutes).** The fictional Music department at `campus.example` runs a 120 GB shared drive, a room-booking service, a website in version control, and a 3 TB archive of concert recordings. In a spreadsheet, list each asset's RPO, RTO, copies (where, what medium, offline or immutable), who can delete each copy, and restore order. Which copies survive a stolen directory administrator password? Which asset is hardest to restore in time?

**Part 3: a decision brief (about 10 minutes).** In half a page, list what leadership must know before deciding about payment, the US government guidance that applies, and whom to consult. Leave out negotiation.

Check your work: every asset needs a copy beyond the administrator's reach, RPOs should count from the last trustworthy copy, and the brief should cover reporting and sanctions.

## Key takeaways

- Ransomware attacks recovery as well as data: ATT&CK's T1490 describes deleting the snapshots and backups defenders rely on.
- Follow the 3-2-1 rule, with at least one offline or immutable copy whose credentials production systems never use.
- Only a timed, verified restore proves a backup. Count the RPO from the last copy you can trust.
- Segmentation and least privilege shrink both the damage and the restore.
- Settle in advance who decides about payment. US government guidance discourages paying, and no payment undoes data theft.

## Go deeper

- **The ransomware profile.** Table 1 of [NIST IR 8374 Rev. 1](https://csrc.nist.gov/pubs/ir/8374/r1/final) explains how selected CSF 2.0 outcomes, such as PR.DS-11 for backups, apply to ransomware. Map five of them to your department.
- **Recovery metrics.** [NIST SP 800-184](https://csrc.nist.gov/pubs/sp/800/184/final) proposes metrics such as the share of restorations from backup completed on time. Which would you report, and how would you keep them honest?
- **Open question.** Intrusions can go unnoticed for unknown periods, and storage costs grow with retention. How long should an immutable lock be?
