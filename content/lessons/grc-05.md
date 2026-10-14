---
topicId: GRC-05
title: Business continuity and disaster recovery
summary: How an organization decides which services must return first and how much data it can afford to lose, expresses those decisions as recovery objectives, and tests its plans and their hidden assumptions before a real disruption does.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish business continuity, disaster recovery and incident response, and say which plan covers which problem.
  - Derive the maximum tolerable downtime, RTO and RPO for a service from a business impact analysis, and check them against its dependencies.
  - Estimate restore time from data size and throughput, and judge whether a backup design can meet a stated RPO.
  - Run a tabletop exercise that exposes recovery assumptions, and turn its findings into plan changes.
prerequisites: [GRC-01, FND-01]
concepts: [business-continuity, disaster-recovery, rto, rpo, business-impact-analysis, tabletop-exercise]
labs: []
keywords:
  - BC
  - DR
  - BCP
  - DRP
  - COOP
  - ISCP
  - contingency planning
  - BIA
  - MTD
  - maximum tolerable downtime
  - recovery time objective
  - recovery point objective
  - backup
  - restore test
  - immutable backup
  - alternate site
  - hot site
  - warm site
  - cold site
  - tabletop exercise
  - NIST SP 800-34
  - CP family
  - RC.RP-03
  - PR.DS-11
sources:
  - title: 'NIST SP 800-34 Rev. 1: Contingency Planning Guide for Federal Information Systems'
    url: https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-csf-2
  - title: 'NIST SP 800-53 Rev. 5: Security and Privacy Controls for Information Systems and Organizations'
    url: https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-53
quiz:
  - question: SubmitIt's database is replicated in real time to a second server. Ransomware encrypts the primary database. What happens to the replica?
    choices:
      - It is safe, because replication is a form of backup.
      - It is safe, because ransomware cannot cross servers.
      - It is restored automatically from the primary.
      - The encrypted data is likely copied to the replica too, so replication protects against hardware failure but not against corruption.
    answer: 3
    explanation: Replication copies every change, including bad ones, within seconds. It shortens recovery from hardware failure, but recovering from corruption or ransomware needs earlier, separate copies that the attacker cannot reach.
  - question: A service has a maximum tolerable downtime of 8 hours. Why should its RTO be set below 8 hours?
    choices:
      - Because after the system is restored, staff still need time to verify data and catch up on work before the outage becomes intolerable.
      - Because auditors require RTOs to be half the MTD.
      - Because RTO measures data loss, not time.
      - It should not; RTO and MTD should always be equal.
    answer: 0
    explanation: NIST SP 800-34 notes that the RTO must normally be shorter than the MTD. Restoring the system is not the end of recovery; checking data and reprocessing work must also fit within the tolerable outage.
  - question: Nightly backups run at 1 a.m. The system fails at 11 p.m. What is the worst-case data loss, and what RPO does this design support?
    choices:
      - One hour; an RPO of 1 hour.
      - About 22 hours of changes; it supports an RPO of 24 hours, not less.
      - Nothing, because the backup is recent.
      - It depends only on how fast the restore is.
    answer: 1
    explanation: Everything written since the last good backup is lost. With one backup a day, the worst case approaches 24 hours, so a 1-hour RPO would need more frequent backups or replication combined with point-in-time copies.
  - question: During a tabletop exercise, the team learns that the only person who knows the backup console password is on a flight. What is the best response?
    choices:
      - Note that the exercise failed and move on.
      - Blame the administrator for traveling.
      - Record it as a finding, then add stored break-glass credentials, a second trained person and a test of both to the plan.
      - Remove the backup console from the plan.
    answer: 2
    explanation: Tabletop exercises exist to surface hidden assumptions, such as one person holding a critical secret. Findings become tracked plan changes, and the change itself should be tested at the next exercise.
  - question: Which statement best distinguishes business continuity from disaster recovery?
    choices:
      - They are two names for the same plan.
      - Business continuity keeps essential processes going, by any means; disaster recovery restores the technology after a major disruption.
      - Disaster recovery covers people; business continuity covers only data.
      - Business continuity applies only to natural disasters.
    answer: 1
    explanation: A continuity plan may keep work going manually or through a fallback while systems are down. A disaster recovery plan restores systems, often at an alternate site. They work together but answer different questions.
---

## Why it matters

Over a long enough time, every service is disrupted. Disks fail, power goes out, a cloud region has an outage, a pipe bursts above the server room, or [[ransomware]] encrypts a server. Whether the disruption becomes a crisis depends on decisions made long before it: which services come back first, how much data the organization can afford to lose, and whether anyone has ever tried the recovery for real.

For a college, the stakes are concrete. If the assignment portal fails during finals week, students cannot submit work, deadlines slip and grades are questioned. If the lab file server loses a semester of coursework, there is no way to recreate it. [[business-continuity|Business continuity]] and [[disaster-recovery|disaster recovery]] planning turn those fears into stated objectives, matching strategies and tested procedures.

Ransomware has made this a security topic, not just an operations one. A reliable, tested, attacker-resistant [[backup]] is often the difference between restoring service and having no good options. That is why NIST CSF 2.0 includes outcomes such as "Backups of data are created, protected, maintained, and tested" (PR.DS-11) and "The integrity of backups and other restoration assets is verified before using them for restoration" (RC.RP-03).

## The core idea

Start with the assumptions. Disruptions will happen. You cannot restore everything at once, because people, bandwidth and money are limited. So you decide in advance what matters most, how quickly it must return, and how much loss is tolerable.

Three plans answer three different questions. Business continuity keeps essential processes going during a disruption, by any means, including paper forms and fallback systems. Disaster recovery restores technology after a major disruption, often at an alternate site. [[incident-response|Incident response]] contains and investigates an attack ([OPS-06](lesson:OPS-06)). NIST SP 800-34 Rev. 1 distinguishes several such plans, including a business continuity plan, a disaster recovery plan, a cyber incident response plan and an information system contingency plan for recovering an individual system.

Three numbers come out of planning. Think of writing a term paper:

- **Recovery point objective ([[rpo]]):** how much work you can afford to lose. If your editor autosaves every ten minutes, you lose at most ten minutes of writing.
- **Recovery time objective ([[rto]]):** how quickly you must be writing again after your laptop dies, for example by borrowing a laptop and opening the cloud copy.
- **Maximum tolerable downtime (MTD):** the longest outage you can survive, all things considered. If the paper is due in six hours and needs four more hours of work, you can tolerate at most two hours of downtime.

SP 800-34 defines MTD as the total outage time the system owner is willing to accept, considering all impacts, and RTO as the longest a system resource can stay unavailable before the impact becomes unacceptable. It adds that the RTO must normally be shorter than the MTD, because reprocessing and catch-up work also have to fit inside the tolerable outage. RPO is about data, not time down: the point in time to which data can be recovered.

## How it works

### The contingency planning process

SP 800-34 lays out seven steps:

1. Develop a contingency planning policy statement, which gives the effort authority.
2. Conduct the [[business-impact-analysis|business impact analysis (BIA)]].
3. Identify preventive controls that reduce the effects of disruptions.
4. Create contingency strategies.
5. Develop an information system contingency plan.
6. Ensure plan testing, training and exercises.
7. Ensure plan maintenance, keeping the plan a living document.

In the SP 800-53 catalog, this work lives in the Contingency Planning (CP) family.

### The business impact analysis

The BIA asks, for each business process: what happens as an outage grows from an hour to a day to a week? Impacts usually grow over time, so the BIA finds the point where they become intolerable, which is the MTD. It then identifies the systems and resources each process needs, including the less obvious ones: single sign-on, DNS, network links, encryption keys and the people who know how things work. The output is a recovery priority list. A service's real recovery time can be no better than that of anything it depends on, unless a workaround exists.

### Strategies and their limits

| Strategy | Helps meet | Cost | Does not protect against |
| --- | --- | --- | --- |
| Nightly backups to separate storage | RPO of about a day | Low | Losing up to a day of changes |
| Frequent snapshots with offline or immutable copies | RPO of minutes to hours, even after ransomware | Moderate | Slow restores if copies are far away |
| Real-time replication | Short RTO after hardware failure | Moderate to high | Corruption and encryption, which replicate too |
| Alternate site (cold, warm, hot or mirrored) | RTO from weeks down to near zero | Rises with readiness | Region-wide events, if both sites share them |
| Manual or fallback process | Continuity while systems are down | Low to moderate | Long outages, because workarounds tire people out |

SP 800-34 describes a spectrum of alternate sites. A cold site has space and infrastructure but no installed equipment. A warm site is partially equipped. A hot site is equipped and staffed to support the system. A mirrored site is fully redundant, with real-time mirroring, and costs the most.

### Restore math

An RTO is a promise; restore capability is a measurement. Before trusting a backup design, estimate the restore time from the data volume and the effective throughput you will really get, then add the time to rebuild and check the system.

```text
Data to restore:          600 GB  = 4,800 gigabits
Link to backup storage:   1 Gb/s  nominal, about 0.3 Gb/s effective
Transfer time:            4,800 / 0.3 = 16,000 s  = about 4.4 hours
Rebuild VM and configure:                           1.0 hour
Integrity checks and spot tests:                    0.5 hour
Estimated restore time:                       about 5.9 hours
```

If the RTO is four hours, this design does not meet it, however good the backups are. Options include keeping a local copy, restoring the most important data first, or a warm standby.

### Restoring safely

Restoring from a backup that is itself infected or corrupted repeats the disaster. CSF 2.0's outcome RC.RP-03 asks that backup integrity be verified before restoration. The sequence below shows that check placed before the restore. The administrator retrieves the newest snapshot that predates the incident, scans and checks it on an isolated machine, and only then restores it to a clean server.

```sequence
title: Restoring SubmitIt after ransomware
participant ADM as Administrator
participant BK as Immutable backup store
participant ISO as Isolated check host
participant NEW as Clean rebuilt server
ADM -> BK: Request newest snapshot before the incident
BK --> ADM: Snapshot from 01:00, hash recorded at backup
ADM -> ISO: Verify hash and scan for malware
ISO --> ADM: Hash matches, scan clean
ADM -> NEW: Restore snapshot, rotate all credentials
NEW --> ADM: Service up, spot checks pass
note: Data written after 01:00 is lost; compare with the RPO
```

### Testing: from discussion to drill

Plans fail in predictable ways: a backup nobody ever restored, a password only one person knows, a runbook on the wiki that went down with everything else. Testing ranges from a [[tabletop-exercise]], where people talk through a scenario and the facilitator adds new developments ("injects"), to a functional restore drill on real systems, to a full failover. Tabletops are cheap and find assumption failures; drills measure real times. A sound program uses both, and records findings as tracked actions.

## Worked example

The Computer Science department runs three services. Its BIA, done with faculty and students, produces these targets.

| Service | Impact as an outage grows | MTD | RTO | RPO | Strategy |
| --- | --- | --- | --- | --- | --- |
| SubmitIt (assignment submission) | Minor for hours; severe after 4 hours in finals week | 8 hours in finals | 4 hours | 1 hour | Hourly snapshots, immutable copy, LMS fallback |
| Lab file server (coursework) | Work stops in the lab; lost coursework cannot be recreated | 2 days | 1 day | 24 hours | Nightly backup, offline weekly copy |
| Course website (static pages) | Inconvenient; content also lives in version control | 1 week | 3 days | 1 week | Rebuild from the repository |

Then the dependency check: SubmitIt logins go through campus single sign-on, which central IT runs with an RTO of 8 hours. SubmitIt cannot really recover in 4 hours if sign-on is down for 8. The department records the gap. The LMS fallback, which uses a separate sign-in path, becomes part of the continuity plan rather than a nice extra.

**The tabletop.** Six people meet for an hour: the department chair, the SubmitIt administrator, a TA, a student representative, someone from central IT, and a facilitator. The scenario: ransomware encrypts the department's virtualization host at 2 a.m. on the Tuesday of finals week.

1. *Inject 1 (2:15 a.m.):* monitoring alerts on mass file changes. Who is called, and how? The team finds the on-call list lives on the department wiki, hosted on the encrypted host. **Finding:** keep a printed and an off-site copy of contacts and runbooks.
2. *Inject 2 (6:00 a.m.):* the backup console needs a password known only to the administrator, who is on a flight. **Finding:** break-glass credentials in a sealed, logged store, and a second trained person.
3. *Inject 3 (8:00 a.m.):* the newest clean snapshot is from 1 a.m., but restore math shows about 6 hours. **Finding:** the 4-hour RTO is not met, and the team waited too long to switch students to the LMS fallback. The plan now says to activate the fallback as soon as a restore is expected to exceed the RTO, and the department adds a local snapshot copy to cut the transfer time.
4. *Inject 4 (noon):* a student says work submitted at 1:30 a.m. is gone. **Finding:** the RPO worked as designed. Exam announcements should tell students to keep their own copy and to resubmit through the fallback.

After the exercise, each finding gets an owner and a date in the [[risk-register]], the plan is updated, and the next exercise includes a real restore drill to measure the new times.

## In practice

- **Map dependencies first.** Directory, sign-on, DNS, network, keys and people often decide the real recovery time.
- **Keep the plan reachable.** Store contacts and runbooks somewhere that survives the disaster: printed, off-site, or on a separate platform.
- **Separate the backups.** Use credentials and storage the production environment cannot alter, plus an offline or immutable copy. [MAL-07](lesson:MAL-07) covers ransomware resilience.
- **Measure, do not assume.** Time real restores and record them beside each RTO.
- **Cross-train.** A plan that depends on one person depends on that person's vacation schedule.
- **Exercise without blame.** The goal is to find weak assumptions, not to grade people.
- **Revisit after change.** New systems, new vendors and staff turnover all invalidate parts of a plan.
- **Limits.** Plans are written for imagined scenarios, and real events combine failures in new ways. Regional disasters can also affect the staff who must carry out the plan.

## Common misconceptions

- **"Replication is a backup."** Replication copies corruption and encryption as fast as it copies good data.
- **"Our RTO is four hours, so we can recover in four hours."** An RTO is a target. Only a measured restore shows whether it can be met.
- **"We have backups, so we are fine."** Untested backups fail through missing files, unknown passwords, corrupted media, or slow transfers.
- **"The cloud provider handles disaster recovery."** Providers keep their infrastructure running, but customers usually remain responsible for their own data, configurations and recovery design ([CLD-01](lesson:CLD-01)).
- **"A tabletop exercise is a test of people's memory."** It tests the plan and its assumptions. People are allowed to say "I don't know"; that is a finding.

## Try it yourself

On paper, set recovery objectives for the Room 214 lab from [GRC-01](lesson:GRC-01), then test them.

1. **List four services:** lab logins (which depend on the campus directory), the lab file server, printing, and the StudyRoom booking service from [GRC-03](lesson:GRC-03).
2. **Run a mini BIA.** For each service, describe the impact after 1 hour, 1 day and 1 week, during a normal week and during finals.
3. **Set the numbers.** Choose an MTD, an RTO below it, and an RPO for each service, and justify every value in one sentence.
4. **Check dependencies.** Find at least one service whose RTO is limited by something it depends on, and propose a workaround.
5. **Do the restore math.** The file server holds 900 GB, and the backup link delivers 0.5 Gb/s in practice. Is your RTO achievable? If not, change the strategy or the objective, and explain why.
6. **Run a 20-minute tabletop** with a classmate as facilitator. Scenario: a burst pipe floods the lab's network closet on the last Monday of term. The facilitator adds three injects of their own. Record every assumption that failed and the plan change it leads to.

## Key takeaways

- Business continuity keeps work going; disaster recovery restores technology; incident response handles attacks.
- A business impact analysis sets the MTD, and the RTO must normally sit below it; the RPO sets how much data loss is acceptable.
- Dependencies, not the system itself, often limit how fast a service can really recover.
- Restore capability is measured, not assumed: do the math, then run the drill.
- Tabletop exercises surface hidden assumptions cheaply; every finding needs an owner and a retest.

## Go deeper

- [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) includes a BIA template and contingency plan templates for low, moderate and high impact systems. Fill in the BIA template for one real service you use.
- [CSF 2.0](https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final) places recovery in the Recover Function, with categories for incident recovery plan execution and recovery communication. Compare its outcomes with the seven SP 800-34 steps.
- Open question: when many institutions depend on the same few cloud and identity providers, one provider's outage becomes everyone's disaster at once. How should a college plan for a dependency it cannot control or test?
