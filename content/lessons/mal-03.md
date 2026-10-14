---
topicId: MAL-03
title: Dynamic-analysis methodology
summary: Learn how analysts run suspicious programs safely, using isolated virtual machines, snapshots, and simulated networks under clear legal and ethical rules, and practice reading the trace a run produces with a benign program.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Design an isolated analysis environment and justify each containment control it uses.
  - Describe the steps of a dynamic-analysis run, from authorization and snapshot to revert and report.
  - Interpret a system-call trace of a benign program and classify each observed action.
  - Explain why a quiet run in a sandbox does not prove that a file is safe.
prerequisites: [MAL-01, MAL-02, SYS-05, FND-07]
concepts: [dynamic-analysis, malware-sandbox, vm-snapshot]
labs: []
keywords:
  - behavioral analysis
  - detonation
  - analysis VM
  - virtual machine
  - snapshot
  - host-only network
  - simulated network
  - fake DNS
  - system call trace
  - strace
  - Process Monitor
  - sandbox evasion
  - NIST SP 800-83
sources:
  - title: 'NIST SP 800-83 Rev. 1: Guide to Malware Incident Prevention and Handling for Desktops and Laptops'
    url: https://csrc.nist.gov/pubs/sp/800/83/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: 'Computer Security (CS 161 textbook), Chapter 38: Malware'
    url: https://textbook.cs161.org/network/malware.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Practical Malware Analysis: The Hands-On Guide to Dissecting Malicious Software'
    url: https://www.nostarch.com/malware.htm
    publisher: No Starch Press
    license: All rights reserved
    sourceId: sikorski-honig-practical-malware-analysis
  - title: 'CISA Alert TA17-132A: Indicators Associated With WannaCry Ransomware'
    url: https://www.cisa.gov/ncas/alerts/TA17-132A
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'MITRE ATT&CK: Boot or Logon Autostart Execution (T1547)'
    url: https://attack.mitre.org/techniques/T1547/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: Why do analysts revert an analysis virtual machine to a clean snapshot before every run?
    choices:
      - To make the sample run faster.
      - So that changes left by an earlier run cannot contaminate the next run's results or carry an infection forward.
      - Because a snapshot hides the virtual machine from the sample.
      - Because reverting a snapshot automatically collects all of the evidence.
    answer: 1
    explanation: A clean starting state makes runs comparable and repeatable, and it discards any infection. Reverting also destroys anything not yet exported, so evidence must be collected before the revert.
  - question: An analyst wants to see which domain a sample contacts, without letting any traffic reach the internet. Which setup fits best?
    choices:
      - Connect the virtual machine directly to the campus network.
      - Disable the network adapter entirely and rely on the sample's error messages.
      - Run the sample on the analyst's own laptop with a firewall enabled.
      - Use an isolated network with simulated services, such as a fake DNS server that logs every query and answers with a lab address.
    answer: 3
    explanation: Simulated services let the sample reveal its network behavior (the names it looks up and the requests it makes) while nothing leaves the lab. Disabling the network is safer still, but it hides that behavior, and the other options put real systems at risk.
  - question: A suspicious file runs for five minutes in a sandbox and does nothing visible. What is the most defensible conclusion?
    choices:
      - No behavior was observed under these conditions, which might reflect evasion, a delay, or a missing trigger, so the file is not proven safe.
      - The file is benign and can be released to users.
      - The sandbox is broken and should be rebuilt.
      - The file must be a document, because programs always do something.
    answer: 0
    explanation: Samples can check for analysis environments, wait longer than the run, or need a trigger such as user input or a command from a server. A quiet run narrows the question; it does not close it.
  - question: In a system-call trace, a program reads /etc/resolv.conf and then tries to connect to port 53 on the resolver's address, and the attempt fails with "Network is unreachable." What does this show?
    choices:
      - The program is ransomware.
      - The program is trying to resolve a domain name, and the lab's isolation stopped the lookup from leaving the machine.
      - The program has deleted the DNS configuration.
      - The analysis tools crashed.
    answer: 1
    explanation: Reading the resolver configuration and contacting port 53 is how a program begins a DNS lookup. The failure shows that containment worked, but it also means the analyst has not yet learned which name was requested.
  - question: Why do containment and realism pull against each other in dynamic analysis?
    choices:
      - Because realistic environments are always slower.
      - Because virtual machines cannot run real operating systems.
      - Because the more an environment resembles a real, connected system, the more behavior a sample shows, but the greater the risk that it spreads or harms others.
      - Because realism only matters for static analysis.
    answer: 2
    explanation: A sample may stay quiet without internet access, user activity, or a real-looking machine. Giving it those things reveals more behavior but increases the chance of escape or harm to third parties, so every access decision needs explicit approval and safeguards.
---

## Why it matters

Static analysis reads what a file says about itself. [[dynamic-analysis|Dynamic analysis]] watches what it does. Some facts appear only at run time: the domain a program contacts after decoding it, the files it creates, whether it arranges to start again after a reboot. That is why analysis methods such as those in _Practical Malware Analysis_ pair basic static analysis with basic dynamic analysis from the start.

Running hostile code is also the one step that can make an investigation worse. A careless run can infect the analyst's network, attack outside systems, or leak data. Safe dynamic analysis is therefore mostly a matter of method (authorization, isolation, and a repeatable procedure) rather than of any particular tool.

The environment also shapes the results. CISA's WannaCry alert describes a check in the malware's dropper: it tried to connect to a hard-coded domain and terminated if the connection succeeded. Researchers who registered that domain greatly reduced the outbreak's spread. The same logic means that an analysis network which answered every request would have watched the dropper simply exit. What you observe depends on the world you build around the sample.

## The core idea

Dynamic analysis runs a program in a controlled environment and records its effects on the system. Two goals pull against each other. **Containment** means nothing escapes. **Realism** means the program behaves as it would on a real victim's machine. Almost every design choice trades one for the other.

The method rests on four assumptions:

1. The sample is hostile. It may try to spread, destroy data, or detect that it is being watched.
2. The analyst's real machine and network are valuable and must be protected.
3. Third parties must never be harmed. No traffic from the lab may reach real victims.
4. Every run must be repeatable, so that others can check the results.

A useful analogy is a biosafety laboratory. Work happens in a sealed room, instruments record everything, the room is decontaminated after each experiment, and written rules say who may work there and what may leave. An analysis lab has the same parts: an isolated machine, monitors, snapshot reverts, and an authorization policy.

> [!IMPORTANT] In this course you will never run real malware. You will practice the full method on benign programs, which teaches the same skills without the risk.

## How it works

### Rules before tools

Professional malware labs operate under written authorization that names who approved the work, which samples and systems are in scope, and what network access is allowed. These are the lab's [[rules-of-engagement]]. Laws such as the US Computer Fraud and Abuse Act ([[cfaa]]) prohibit unauthorized access to other people's computers, and a sample that escapes the lab can harm people who never agreed to take part. Labs also forbid sharing samples outside approved channels, analyzing personal devices, and running anything on production systems. [Ethics, authorization, and lab scope](lesson:FND-07) covers authorization in depth.

### Building an isolated environment

Analysts usually run samples inside a virtual machine (VM), a complete simulated computer running on a host that the analyst controls. Before the first run they take a [[vm-snapshot|snapshot]], a saved copy of the VM's entire state that can be restored in seconds. A [[malware-sandbox]] automates the same idea: it runs a sample in an instrumented environment and produces a behavior report. NIST SP 800-83 notes that a sandbox can be reset to a known good state each time it starts, which is exactly what a snapshot provides. (The general operating-system [[sandbox]] that confines everyday programs is a related but different idea.)

Each containment control blocks a specific risk and costs something:

| Control                                              | What it prevents                                  | What it costs                                      |
| ---------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------- |
| Dedicated analysis VM on a host you control          | Damage to your real computer                      | Some samples detect virtual machines               |
| No network, or a host-only network                   | Spreading, attacks on others, data leaks          | Network behavior stays hidden                      |
| Simulated services (fake DNS and web servers)        | The same, while showing names and requests        | Fake answers can change what the sample does       |
| Shared folders, clipboard, and drag-and-drop disabled | Leaks between the VM and the host                | File transfer is less convenient                   |
| Clean snapshot restored before every run             | Contamination carried from run to run             | Reverting destroys evidence not yet exported       |
| Monitoring from outside the VM (network capture)     | A sample tampering with its own evidence          | More setup and storage                             |

The simulated network deserves a closer look. A fake DNS server answers every lookup with a lab address and logs the name that was requested. A fake web server accepts connections and records each request. The sample believes it is online, and the analyst learns what it tried to reach, while a firewall drops anything aimed at the real internet:

```sequence
title: One run in an isolated analysis lab
participant A as Analyst
participant V as Analysis VM
participant N as Simulated network
participant I as Internet
A -> V: Restore clean snapshot, start monitors
A -> V: Copy in and run the sample
V -> N: DNS query for sync.shop.example
N --> V: Answer with lab address 192.0.2.80
V -> N: HTTPS connection to 192.0.2.80
note N: Fake services log the name and the request
V -x I: Packets to the real internet are dropped
A -> V: Export logs and hashes, then restore snapshot
```

The diagram shows the order that matters: restore and monitor first, run second, collect evidence before restoring again, and keep the internet out of reach throughout.

### What to observe

A run produces evidence in five areas:

- **Processes:** which programs start, which program started them, and with what command lines.
- **Files:** what is created, modified, or deleted, with hashes of anything new.
- **Configuration:** changes to the Windows registry, startup folders, services, or scheduled tasks. Changes that make a program start automatically are persistence; ATT&CK describes one family of them as Boot or Logon Autostart Execution (T1547).
- **Network:** DNS lookups, connection attempts, and request contents, recorded by the simulated services and by a [[packet-capture]].
- **Memory:** decoded strings or code that exist only while the program runs, captured for [[memory-forensics]].

Much of this evidence comes from system calls, the requests a program makes to the operating system to open a file, start a process, or connect a socket. Because a program must ask the [[kernel]] for nearly everything it does, tracing system calls gives a precise log of its interactions. On Linux, `strace` records them. On Windows, Microsoft's Sysinternals Process Monitor records file, registry, process, and network activity.

### The run cycle

1. **Plan.** Write down the question the run should answer, such as "Does it persist?" or "What does it contact?"
2. **Prepare.** Restore the clean snapshot and confirm that isolation works, for example that no route reaches the internet.
3. **Record a baseline.** Run the clean VM for the same length of time and record its normal background activity, so that you can subtract the noise later.
4. **Run.** Start the monitors, then the sample. Interact if needed, for example by clicking through a dialog, and observe for a fixed period.
5. **Collect.** Export traces, captures, lists of new files with their hashes, and screenshots.
6. **Restore.** Revert the VM to the clean snapshot. Never reuse a VM that ran a sample.
7. **Report.** Compare the run with the baseline, describe each behavior with its evidence, list indicators, and state what remains unknown.

### Limits

The CS 161 textbook notes that malware can defeat behavioral analysis by delaying its actions or by detecting analysis environments, such as debuggers or sandboxes, and then behaving innocently. Other samples need a trigger that the lab never supplies: a particular date, user activity, a configuration found only on the target network, or an instruction from a server that never arrives. A run also explores just one path through the program. A quiet run therefore means "no behavior observed under these conditions," never "benign."

## Worked example

Bob's instructor hands the class a lab program called `inventory_sync.py` and asks one question: what does it do when it runs? The program is benign, but the class treats it like an unknown sample. They run it on an isolated lab machine named `lab-vm-01` with no network at all, where the configured DNS resolver, `192.0.2.53`, is unreachable. They record its system calls with `strace`. Here is an excerpt of the real trace, with Python's start-up activity and a few repeated lines removed and long arguments shortened:

```text
25290 05:34:59.677309 mkdir("/home/alice/.cache", 0777) = 0
25290 05:34:59.677550 mkdir("/home/alice/.cache/inventory_sync", 0777) = 0
25291 05:34:59.685162 execve("/usr/bin/hostname", ["hostname"], ...) = 0
25291 05:34:59.690927 +++ exited with 0 +++
25290 05:34:59.692011 openat(AT_FDCWD, "/home/alice/.cache/inventory_sync/sync.log", O_WRONLY|O_CREAT|O_TRUNC|O_CLOEXEC, 0666) = 3
25290 05:34:59.700836 openat(AT_FDCWD, "/etc/resolv.conf", O_RDONLY|O_CLOEXEC) = 3
25290 05:34:59.701526 openat(AT_FDCWD, "/etc/hosts", O_RDONLY|O_CLOEXEC) = 3
25290 05:34:59.702547 connect(3, {sa_family=AF_INET, sin_port=htons(53), sin_addr=inet_addr("192.0.2.53")}, 16) = -1 ENETUNREACH (Network is unreachable)
25290 05:34:59.703371 openat(AT_FDCWD, "/home/alice/.cache/inventory_sync/sync.log", O_WRONLY|O_CREAT|O_APPEND|O_CLOEXEC, 0666) = 3
25290 05:34:59.714593 +++ exited with 0 +++
```

Each line shows a process ID, a timestamp, a system call with its arguments, and the result. Read it in order:

1. **Files.** The program creates a folder in the user's cache directory. Ordinary programs do this too, but it is a change to record.
2. **Processes.** A child process (ID 25291) runs `hostname`, so the program collects the machine's name.
3. **Files again.** It creates `sync.log`. The flags `O_CREAT|O_TRUNC` mean "create the file, or empty it if it exists."
4. **Network intent.** Reading `/etc/resolv.conf` and `/etc/hosts` and then contacting port 53 at the resolver's address is the start of a DNS lookup. The call fails with `ENETUNREACH`, which shows that containment worked.
5. **Exit.** The program appends to its log and exits with status 0.

Now separate what the trace proves from what it hides. It proves the program wanted a network name, but not which one, because no packet left the VM. Two cheap follow-ups answer that. Reading the dropped log file shows `sync failed: [Errno -3] Temporary failure in name resolution`, and the static strings of the program contain `sync.shop.example` (the technique from [Static analysis of benign teaching artifacts](lesson:MAL-02)). A rerun with a simulated DNS server would show the query directly. The trace also shows no persistence: nothing was written to a startup location. The class's report reads: *creates a cache folder and log, records the host name, attempts a DNS lookup (blocked); no persistence observed in a single run.* Only then does the instructor reveal the source code, and the class checks every claim against it.

## In practice

Many organizations run automated malware sandboxes that detonate suspicious attachments and produce behavior reports like the one in [Malware behavior and taxonomy](lesson:MAL-01). Analysts use those reports for triage and run manual sessions, like the one above, when a sample matters enough to justify the time.

Good practice in either case:

- **Alternate static and dynamic work.** A domain found in a trace becomes a string to search for; an unexplained string becomes a reason for another run.
- **Change one condition at a time.** If a sample is quiet, rerun it with a simulated network, a longer window, or simulated user activity, and note which change produced new behavior.
- **Collect before you revert.** Export traces, captures, and file hashes, and record them in the report so others can verify them.
- **Report uncertainty.** State the run's duration, the network mode, and what could not be observed.

Even a well-built lab has limits. Monitoring tools can be visible to the sample, VM software has had bugs that let code escape to the host, and a misconfigured network can quietly let traffic out. Layer the controls: isolate the network, keep the host patched, and test the isolation before each session.

## Common misconceptions

- **"A virtual machine makes it completely safe."** Isolation fails through shared folders, misconfigured networks, and occasional VM software bugs. Use several controls, not one.
- **"If nothing happened, the file is benign."** Samples can wait, detect the lab, or need a trigger. A quiet run is an incomplete result.
- **"Dynamic analysis replaces static analysis."** Each finds what the other misses, and analysts move back and forth between them.
- **"Internet access always gives better results."** It may reveal more, but it risks harm to others and needs explicit approval and safeguards. Simulated services are the default.
- **"A snapshot preserves the evidence."** Restoring a snapshot erases everything since it was taken. Export first.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. Observe only benign programs that you wrote or that your instructor provides, preferably inside a virtual machine with networking disabled. Never run real malware for coursework.

1. **Interpret the approved trace.** Using the excerpt in the worked example, list every behavior with its evidence line, and mark each one as file, process, configuration, or network activity. Which single line would most worry you if the program were unknown, and why?
2. **Trace your own benign program.** Write a short script that creates a file, starts one child process (such as `hostname`), and tries to connect to `sync.shop.example`. On Linux, run `strace -f -e trace=execve,mkdir,openat,connect -o trace.txt python3 yourscript.py`. On Windows, run it while Process Monitor is filtered to your script's process name. Find each behavior in the trace.
3. **Record a baseline.** Trace a script that only prints one line. Compare its trace with step 2's, and estimate how much of a real trace is noise from the language runtime.
4. **Plan a lab on paper.** Write a one-page plan for an analysis VM: who authorizes it, the network mode, snapshot policy, how evidence leaves the VM, and what is never allowed. Trade plans with a classmate and look for a path by which something could escape.

## Key takeaways

- Dynamic analysis observes behavior at run time. It is powerful and risky, so method matters more than tools.
- Containment and realism pull against each other. Isolated VMs, snapshots, and simulated network services balance them.
- Follow a fixed cycle: plan, prepare, baseline, run, collect, restore, report.
- System-call traces show file, process, and network activity precisely, including attempts that containment blocked.
- A quiet run is not a clean verdict. Evasion, delays, and missing triggers all look like "nothing happened."

## Go deeper

- **Method.** _Practical Malware Analysis_ covers building a safe virtual analysis environment, basic dynamic analysis, and the anti-VM techniques that limit it.
- **Why perfect analysis is impossible.** The CS 161 malware chapter explains why behavioral detection can be evaded and connects perfect detection to the halting problem. Consider what that implies for automated sandboxes that must decide within minutes.
- **Environment-dependent behavior.** CISA's WannaCry alert documents the domain check that stopped the dropper and why administrators were told not to block that domain. Open question: how should a research lab decide when a sample may contact the real internet, and what safeguards make that defensible?
