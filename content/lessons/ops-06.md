---
topicId: OPS-06
title: Containment, eradication, and recovery
summary: Learn how responders stop an incident from spreading, remove every foothold the attacker left, and return systems to trusted operation, choosing actions that balance speed, evidence, and business impact, then practice planning them in a tabletop exercise.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 55
objectives:
  - Explain the goals of containment, eradication, and recovery, and map them to the Respond and Recover functions of the NIST CSF 2.0.
  - Choose containment actions by weighing ongoing harm, evidence preservation, business impact, reversibility, and the risk of alerting the intruder.
  - Plan eradication that removes every known foothold, including persistence mechanisms, stolen credentials and sessions, and the original entry path.
  - Define recovery steps and end criteria, including verifying backups before use and monitoring restored systems.
  - Run a tabletop exercise and record decisions, owners, reasons, and gaps in a decision log.
prerequisites: [OPS-05, FOR-01]
concepts: [incident-response, containment, eradication, incident-recovery, persistence, playbook]
labs: []
keywords:
  - incident handling
  - containment strategy
  - host isolation
  - network containment
  - quarantine
  - coordinated containment
  - remediation
  - rebuild
  - reimage
  - credential reset
  - token revocation
  - recovery criteria
  - restore point
  - decision log
  - incident commander
  - tabletop exercise
  - TTX
  - after action report
  - NIST SP 800-61 Rev. 3
  - NIST SP 800-184
  - NIST SP 800-84
  - RS.MI-01
  - RS.MI-02
  - RS.MA-05
  - RC.RP-03
  - RC.RP-06
  - TA0003
  - Executive Order 14028
sources:
  - title: 'NIST SP 800-61 Rev. 3: Incident Response Recommendations and Considerations for Cybersecurity Risk Management: A CSF 2.0 Community Profile'
    url: https://csrc.nist.gov/pubs/sp/800/61/r3/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-61
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
  - title: 'NIST SP 800-184: Guide for Cybersecurity Event Recovery'
    url: https://csrc.nist.gov/pubs/sp/800/184/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-184
  - title: 'NIST SP 800-84: Guide to Test, Training, and Exercise Programs for IT Plans and Capabilities'
    url: https://csrc.nist.gov/pubs/sp/800/84/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: Federal Government Cybersecurity Incident and Vulnerability Response Playbooks
    url: https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
    sourceId: cisa-incident-vulnerability-response-playbooks
  - title: 'MITRE ATT&CK: Enterprise tactics'
    url: https://attack.mitre.org/tactics/enterprise/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: A workstation shows signs of an active intrusion. The team wants to stop the intruder and keep the best evidence. What should it do first?
    choices:
      - Power the workstation off immediately so the intruder loses access to it.
      - Run a full antivirus scan and delete everything it flags as malicious.
      - Isolate it from the network, keep it powered on, and capture memory first.
      - Reimage it right away so its user can get back to work quickly.
    answer: 2
    explanation: Network isolation cuts off remote control and spread while keeping volatile evidence such as running processes and network connections. Powering off destroys memory contents, and deleting files or reimaging before collection destroys evidence the team needs to learn the scope.
  - question: An intruder holds two compromised accounts and a backdoor on one server, and no data appears to be leaving right now. Why would the team plan to act on all three at once instead of resetting one account immediately?
    choices:
      - Acting on one foothold can warn the intruder while other ways back in remain open.
      - Identity systems can only disable accounts in batches, so single resets fail.
      - NIST requires that containment wait until every foothold has been eradicated.
      - Acting at the same time guarantees that no evidence is lost or overwritten.
    answer: 0
    explanation: Coordinated containment closes every known path in one window, so the intruder cannot simply switch footholds. The trade-off reverses when harm is ongoing, such as data actively leaving; then the team contains immediately and accepts that the intruder will notice.
  - question: After a breach, the team resets the compromised user's password. What is most likely to let the intruder keep access?
    choices:
      - The firewall logs were exported before the reset, so they miss later events.
      - The new password is long, so the user may write it down somewhere.
      - The user was told about the reset by phone instead of by email.
      - Existing sessions and tokens, other compromised accounts, and persistence may still work.
    answer: 3
    explanation: A password reset does not by itself end existing sessions in every system, and it does nothing about other accounts, scheduled tasks, backdoors, or the original entry path. Eradication must find and remove every foothold.
  - question: Which restore decision best follows CSF 2.0 outcome RC.RP-03?
    choices:
      - Restore the newest backup, since it holds the most recent data and loses the least work.
      - Verify the backup's integrity and check it for the intruder's changes, then restore from a point before the compromise.
      - Restore any backup that the backup software reports as complete, since completion shows it is intact.
      - Restore whichever backup finishes fastest, since downtime is the biggest cost of an incident.
    answer: 1
    explanation: RC.RP-03 requires that "The integrity of backups and other restoration assets is verified before using them for restoration." The newest backup may contain the intruder's persistence or encrypted files. An older, verified restore point loses more recent data, a trade-off the team should make deliberately.
  - question: When should a team declare the end of incident recovery?
    choices:
      - As soon as the main service responds again and users can sign in
      - As soon as the attacker's IP address is blocked at the firewall
      - When predefined criteria are met, such as verified restoration, quiet monitoring, and completed records
      - When the after-action meeting is put on the calendar for next week
    answer: 2
    explanation: CSF 2.0 outcome RC.RP-06 says the end of recovery is declared based on criteria and that incident documentation is completed. A working service may still be compromised, and blocking one address does not show that the intruder is gone.
---

## Why it matters

Once an incident is declared, acting quickly is usually right, but how a team acts decides whether the incident ends or quietly continues. Three mistakes are common. A team powers off or wipes a compromised machine before anyone captures its memory, destroying the best record of what ran on it. It resets one stolen password while the intruder still holds a second account, a live session, or a backdoor. Or it restores from backups that already contain the intruder's changes, and the incident starts over.

NIST's [SP 800-61 Rev. 3](https://csrc.nist.gov/pubs/sp/800/61/r3/final) maps the older "containment, eradication, and recovery" phase onto two functions of the [[nist-csf]] 2.0: Respond, "Actions regarding a detected cybersecurity incident are taken," and Recover, "Assets and operations affected by a cybersecurity incident are restored."

## The core idea

[[incident-response]] is the organized work of handling incidents: detecting and analyzing them, limiting the damage, removing the cause, restoring operations, and learning from the result. After [triage](lesson:OPS-05), three goals take over, and they overlap.

- **[[containment|Containment]]** keeps the incident from growing. In SP 800-61 Rev. 3's words, "Containment refers to preventing the expansion of an incident." It buys time; it does not remove the intruder.
- **[[eradication|Eradication]]** removes the intruder's footholds and the cause: malware, unauthorized accounts, stolen credentials, the weakness they came in through, and any [[persistence]] mechanism, meaning anything that lets an intruder return after a reboot or a password change. [[mitre-attack|MITRE ATT&CK]] sums up the persistence tactic (TA0003) as "The adversary is trying to maintain their foothold."
- **[[incident-recovery|Recovery]]** restores systems and data to normal, trusted operation and confirms that they stay that way.

Think of a burst pipe. You close the main valve first (containment), which stops the flood but also your water, so it cannot last forever. You replace the broken pipe and check the others for the same flaw (eradication). Then you turn the water back on and watch for new leaks (recovery). Unlike pipes, intruders fight back: they can notice the response and change tactics, so order and timing matter.

The lesson assumes an **incident commander** leads the response, coordinating responders and owning decisions, and that the organization has [[playbook|playbooks]]: pre-approved procedures for specific incident types that say what to do, in what order, and who may authorize each step. Real responses loop: finding a new compromised host sends the team back to scoping and containment.

## How it works

### Containment: choose actions, not reflexes

Each containment action has a cost:

| Action                                                | What it stops                     | Cost and risk                           | Effect on evidence                |
| ----------------------------------------------------- | --------------------------------- | --------------------------------------- | --------------------------------- |
| Disable an account; revoke its sessions and tokens    | Use of that identity              | The user cannot work; intruder may notice | Little                           |
| Isolate a host through its endpoint agent or switch port | Remote control of the host and spread from it | Its user or service is offline | Keeps memory if the host stays on |
| Block an address or domain at the firewall or proxy   | Traffic to known infrastructure   | Attackers can switch infrastructure     | None                              |
| Power off a host                                      | Everything on it                  | Outage                                  | Destroys memory contents          |

Six questions guide the choice. Is harm ongoing? Will the action destroy evidence needed to scope the incident? (Following the [[order-of-volatility]], capture short-lived evidence first; [memory forensics](lesson:FOR-04) explains what powering off loses.) Who loses service, and for how long? Does it close every known path or just one? Can it be undone quickly? Will the intruder notice?

SP 800-61 Rev. 3 suggests ways to contain faster: automatic quarantine of malware or of compromised endpoints, providers authorized in advance to contain incidents such as large [[ddos-attack|DDoS attacks]], and handlers free to choose containment actions themselves. Automation inherits the [[false-positive]] problem from [intrusion prevention](lesson:OPS-04): an automatic block on a false alarm is an outage you caused.

### Contain once, together

When an intruder holds several footholds, piecemeal action is risky. Resetting one password warns an intruder who still has a backdoor, and they may hide deeper, switch to footholds you have not found, or destroy data. The usual remedy is **coordinated containment**: scope quickly, then act on every known foothold in one planned window.

Hence the central tension: every minute spent scoping is a minute the intruder keeps working. SP 800-61 Rev. 3 notes that some organizations redirect an attacker to a sandbox to gather more evidence, which delays containment. It advises discussing that strategy with the legal department first and warns, "The intentional delay can be dangerous because an attacker could escalate unauthorized access or compromise other systems." A practical rule: when harm is ongoing, such as data leaving or encryption spreading, contain immediately and accept that the intruder will notice. Otherwise, take a short, timeboxed scoping pass first.

Either way, preserve evidence and record every action. CSF 2.0 outcome RS.AN-06 asks that investigation actions be recorded with "the records' integrity and provenance" preserved, the response side of [[chain-of-custody]]. Logs can roll over within days, so export them early.

### Eradication: remove every foothold

SP 800-61 Rev. 3 recommends that responders "Identify all affected hosts and services within the organization," and notes that eradication may require eliminating "persistence mechanisms and entry points." That means four jobs:

1. **Find everything.** Search every system for the [[indicator-of-compromise|indicators]] and behaviors found so far, and look back further than the first alert. This is where [threat hunting](lesson:OPS-07) pays off.
2. **Remove persistence.** Scheduled tasks, services, startup entries, new accounts, web shells, and mailbox forwarding rules all let an intruder return.
3. **Invalidate credentials.** Reset compromised passwords, revoke existing [[session|sessions]] and [[refresh-token|refresh tokens]] (which some systems keep valid after a password change), and rotate any secret the intruder could have read, such as a [[service-account]] password in a script.
4. **Close the entry path.** Patch the vulnerability, fix the misconfiguration, or strengthen the authentication that failed.

**Rebuild or clean?** You can rarely prove a cleaned system is clean, especially after an intruder had administrative control, so rebuilding from a known-good image after evidence is captured is the safer choice. SP 800-61 Rev. 3 lists restoring from clean backups and rebuilding systems among recovery actions, and notes that against highly sophisticated threat actors, replacing hardware may be necessary.

### Recovery: restore trust, not just service

Recovery begins when written criteria say it may (CSF 2.0 outcome RS.MA-05, "The criteria for initiating incident recovery are applied"). The Recover outcomes then work as a checklist: select, scope, prioritize, and perform recovery actions, critical services first (RC.RP-02); verify backups before using them (RC.RP-03); verify restored assets and confirm normal operation (RC.RP-05); communicate progress to stakeholders (RC.CO-03); and declare the end of recovery based on criteria, with documentation completed (RC.RP-06).

The restore point is a trade-off. An older backup is more likely to be clean but loses more recent work, the [[rpo]] question from [ransomware resilience](lesson:MAL-07); the newest may bring back the intruder's persistence. SP 800-61 Rev. 3 also says to "remediate the root causes of the incident before production use" and to monitor restored systems.

### Playbooks and decision rights

Many delays are not technical. They come from unanswered questions, such as who may take the payroll server offline at 2 a.m. Playbooks answer them in advance. CISA developed standard [incident and vulnerability response playbooks](https://www.cisa.gov/resources-tools/resources/federal-government-cybersecurity-incident-and-vulnerability-response-playbooks) for US federal civilian agencies under Section 6 of Executive Order 14028. The fictional excerpt below shows typical parts.

```yaml
# Fictional playbook excerpt for corp.example (illustrative, not a standard format)
playbook: account-takeover
trigger: Confirmed sign-in by someone other than the account owner
decision_owner: incident commander
pre_authorized: # responders may act without asking
  - revoke the account's sessions and refresh tokens
  - disable the account
  - isolate affected workstations, keeping them powered on
needs_approval: # incident commander plus the system owner
  - isolate production servers
  - disable executive or service accounts
collect_first:
  - identity provider, VPN, and proxy logs for the past 30 days
  - memory image of each isolated host, then a disk image
notify: [system owner, legal, privacy office]
recovery_criteria:
  - all known footholds removed and the entry path closed
  - no activity matching known indicators for 24 hours
```

Response stays on systems you own or administer. Breaking into an attacker's server, sometimes called hacking back, can itself be unauthorized access under laws such as the [[cfaa]], and the server may belong to an innocent victim. Report it to law enforcement and the hosting provider instead.

## Worked example

At 15:20 UTC on October 14, 2026, corp.example's INC-2026-0142 is rated critical (see [triage](lesson:OPS-05)): a password-spraying run gave an intruder alice's account, a VPN session, a remote logon to ws-01.corp.example, and a 48 MB upload that most likely held payroll records. The incident commander, erin, runs a decision meeting with bob (analyst), the IT operations lead, and the privacy officer, while a data collector keeps the decision log.

**Step 1: scope or contain?** The VPN session from 203.0.113.66 is still connected, and regulated data has probably left already. Harm may be ongoing, so erin decides to contain at 15:35, after a ten-minute evidence pass in which bob exports 30 days of identity provider, VPN, and proxy logs.

**Step 2: contain together.** At 15:35, four actions start at once, as the diagram shows: disable alice and revoke her sessions and tokens, end the VPN session, isolate ws-01 while keeping it powered on, and block 203.0.113.66 and the upload site at the firewall and proxy. The intruder's attempt to reconnect as alice then fails.

```sequence
title: Coordinated containment at 15:35 UTC
participant IC as Incident commander
participant IdP as Identity provider
participant VPN as VPN gateway
participant EP as Endpoint agent on ws-01
participant X as Intruder at 203.0.113.66
note IC: Plan approved; all actions start together
IC -> IdP: Disable alice, revoke sessions and tokens
IC -> VPN: End the session from 203.0.113.66
IC -> EP: Isolate ws-01, keep it powered on
EP --> IC: Isolated; memory capture starting
X -x VPN: Reconnect as alice is refused
note IC: Each action and its time go in the decision log
```

**Step 3: first inject.** At 16:05, analysis of ws-01 reveals a scheduled task, created at 14:10 under alice's account, that runs a script every 30 minutes and contacts 203.0.113.80. The team blocks that address and hunts every host for the task name and script hash, finding them nowhere else. Once the disk image is taken, erin chooses to rebuild ws-01 rather than delete the task and hope nothing else changed.

**Step 4: second inject.** At 16:30, bob reruns the spraying query from the [SIEM lesson](lesson:OPS-03) over 30 days instead of one. It finds a smaller run from 203.0.113.70 on October 13 and one more success: dave, at 22:14 UTC, followed by mailbox access. The team contains dave's account at once and checks his mailbox for forwarding rules. The intruder may have noticed alice's containment first, a risk erin accepted and logged in Step 1.

**Step 5: eradicate.** The team resets alice's and dave's passwords, revokes their tokens, re-registers their [[mfa]] methods, rotates a service account password that the intruder could have read in a script on the finance share, and rebuilds ws-01. To close the entry path, it requires a stronger multi-factor method for VPN sign-ins and adds detection rules for spraying and for repeated denied push prompts, the [[mfa-fatigue]] pattern alice faced.

**Step 6: recover.** On October 16, with the playbook's criteria met, ws-01 returns from the standard image, and alice's files come from the 02:00 UTC backup taken on October 14, before her compromise; she redoes that morning's work. Alerts watch for the known addresses, the task, and every sign-in by alice or dave for 30 days. Recovery will be declared over after 14 quiet days and a completed record, while legal and privacy staff handle breach notification separately.

Part of the decision log:

| Time (UTC) | Decision                               | Owner         | Reason                                    | Evidence kept           |
| ---------- | -------------------------------------- | ------------- | ----------------------------------------- | ----------------------- |
| 15:30      | Contain in one window at 15:35         | erin          | Session open; regulated data likely gone  | Approval recorded       |
| 15:35      | Isolate ws-01; do not power off        | IT operations | Keep memory for analysis                  | Memory image and hash   |
| 16:05      | Rebuild ws-01 instead of cleaning it   | erin          | Cannot prove what else changed            | Disk image taken first  |
| 16:30      | Widen scope to 30 days; contain dave   | bob           | Second compromised account                | Query and results saved |

**Step 7: record the gaps.** The first queries covered only one day, nobody knew at first who could approve isolating a finance workstation, and a service account password lived in a script. Each gap gets an owner and a due date and feeds the [post-incident review](lesson:OPS-08).

## In practice

- **Write playbooks with decision rights.** Pre-authorize cheap, reversible actions, name who approves the rest, keep after-hours contacts current, and confirm in advance that tools such as endpoint isolation actually work.
- **Assume the intruder may be watching.** If email or chat may be compromised, coordinate on a separate channel.
- **Exercise the plan.** NIST [SP 800-84](https://csrc.nist.gov/pubs/sp/800/84/final) describes a [[tabletop-exercise]] as a discussion-based session in which personnel meet "to discuss their roles during an emergency and their responses to a particular emergency situation," with a facilitator, a data collector, and an after action report of recommendations. CSF 2.0 outcome ID.IM-02 closes the loop: "Improvements are identified from security tests and exercises."
- **Know the limits.** Playbooks cannot foresee every case, and coordinated containment fails if the scope was incomplete; that is why monitoring continues after recovery.

## Common misconceptions

- **"Containment means pulling the plug."** Powering off destroys memory evidence. Network isolation usually stops the intruder and keeps the evidence.
- **"Changing the password kicks the intruder out."** Sessions, tokens, other accounts, and persistence mechanisms can survive a password change.
- **"Deleting the malware is eradication."** Without removing every foothold and closing the entry path, the intruder returns.
- **"Restore from the newest backup."** It may contain the intruder's changes; verify it and choose a pre-compromise restore point.
- **"Recovery is done when the service is back."** It ends when written criteria are met, including verification, monitoring, and documentation.

## Try it yourself

Run a 30-minute paper tabletop on a fictional ransomware incident at `campus.example`. With three to five classmates, assign a facilitator who reveals each inject, an incident commander, an IT operations lead, a communications lead, and a data collector who keeps the decision log; alone, play every role in writing. It is the Friday before midterm week.

| Time         | Inject                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------- |
| 17:30        | The registrar's office reports that files on its shared drive now end in `.locked`, with a ransom note in each folder. |
| 17:45        | The endpoint console shows the same renaming starting on a share on backup-01.campus.example.                      |
| 18:10        | A student newspaper reporter emails to ask whether student records were stolen.                                     |
| 18:40        | The newest backup known to be clean is Tuesday's offline copy; Wednesday's and Thursday's online copies are encrypted. |
| Monday 08:00 | Classes resume, and the learning management system must be up for online quizzes.                                   |

For each inject, decide what to contain now, how, and at what cost; what evidence to preserve first; who must approve and who must be told, remembering that student records fall under [[ferpa]]; and what you would need to learn to change your plan.

Then write a decision log of at least six entries (time, decision, owner, reason, evidence kept), an eradication checklist, a recovery plan that orders services by dependency, end criteria, and three gaps for the after action report, each with an owner.

Check your work: did you isolate rather than power off, protect Tuesday's offline backup first, and state the data loss your restore point implies? Did anyone answer the reporter without the "approved methods and messaging" that CSF 2.0 outcome RC.CO-04 expects?

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- Containment stops the incident from growing, eradication removes every foothold and the entry path, and recovery restores trusted operation. The three overlap and loop.
- Weigh ongoing harm, evidence, business impact, completeness, reversibility, and tipping off the intruder; isolate instead of powering off.
- Act on all known footholds together when you can, and immediately when harm is ongoing.
- Verify backups before restoring, fix root causes before production use, monitor restored systems, and end recovery by written criteria.
- Playbooks and exercises turn these decisions into practiced, pre-authorized steps.

## Go deeper

- NIST [SP 800-184](https://csrc.nist.gov/pubs/sp/800/184/final) treats recovery as its own discipline, with recovery playbooks, testing, and metrics. Which recovery metrics would you report to leadership after INC-2026-0142?
- Open question: how long should heightened monitoring last after recovery, and what evidence would justify ending it sooner or later?
