---
topicId: FOR-04
title: Memory-forensics concepts
summary: >-
  Why a computer's memory holds evidence that disks and logs never see, how investigators capture it
  from a running system, how analysis rebuilds processes and connections from raw bytes, and why
  memory findings are strong leads that still need corroboration.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain which kinds of evidence exist only in memory and why the order of volatility puts memory near the front.
  - Compare list walking and memory scanning, and use the difference to tell an exited process from a hidden one.
  - Interpret a synthetic process tree and connection list, separating normal entries from leads worth checking.
  - Describe how acquisition changes a live system and what a memory image's hash can and cannot show.
prerequisites: [FOR-01, SYS-01, MAL-01]
concepts: [memory-forensics, memory-image, memory-smear, process-tree, live-acquisition, order-of-volatility]
labs: []
keywords:
  - memory forensics
  - RAM analysis
  - memory dump
  - memory image
  - volatile data
  - order of volatility
  - live response
  - live acquisition
  - Volatility
  - Volatility 3
  - pslist
  - psscan
  - pstree
  - netscan
  - malfind
  - DKOM
  - fileless malware
  - memory smear
  - page file
  - hibernation file
  - RFC 3227
  - T1014
sources:
  - title: 'RFC 3227: Guidelines for Evidence Collection and Archiving (BCP 55)'
    url: https://www.rfc-editor.org/rfc/rfc3227
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
  - title: 'SWGDE Best Practices for Computer Forensic Acquisitions (17-F-002, version 2.1)'
    url: https://www.swgde.org/documents/published-complete-listing/17-f-002-2-1/
    publisher: Scientific Working Group on Digital Evidence (SWGDE)
    license: All rights reserved (redistribution allowed under SWGDE terms)
  - title: Volatility 3 documentation
    url: https://volatility3.readthedocs.io/en/latest/
    publisher: Volatility 3 project (Read the Docs)
  - title: 'MITRE ATT&CK T1014: Rootkit'
    url: https://attack.mitre.org/techniques/T1014/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: >-
      A responder finds a running laptop with full-disk encryption during an investigation. Why might
      capturing memory before shutdown matter more than usual?
    choices:
      - Encryption makes the disk image larger.
      - While the system is unlocked, decrypted data and the keys needed to read the disk may exist only in memory.
      - Memory capture is required before any disk can be imaged.
      - Shutting down an encrypted laptop erases the disk.
    answer: 1
    explanation: >-
      With full-disk encryption, a powered-off disk may be unreadable without the key. A live acquisition
      can capture the running system's state, which SWGDE notes may be the only opportunity to obtain
      data from an encrypted system.
  - question: >-
      A process appears in a memory scan but not in the kernel's active process list, and its record
      includes an exit time. What is the most likely explanation?
    choices:
      - The process finished normally, and its structure remained in memory after it was removed from the list.
      - A rootkit hid the process.
      - The memory image is corrupted.
      - The process is still running in another user's session.
    answer: 0
    explanation: >-
      Scanning finds structures anywhere in memory, including those of processes that have exited and
      been unlinked as a normal part of cleanup. An exit time points to that ordinary case. A scan-only
      process without an exit time deserves a closer look, because unlinking a live process is a hiding
      technique.
  - question: Which parent-child pair in a Windows process tree is the strongest lead worth investigating?
    choices:
      - explorer.exe starting a web browser.
      - services.exe starting svchost.exe.
      - A web browser starting one of its own helper processes.
      - A word processor starting a command shell.
    answer: 3
    explanation: >-
      The first three are ordinary relationships on a Windows system. A document editor launching a
      shell often accompanies malicious macros, although legitimate add-ins can do it too, so it is a
      lead to corroborate rather than a conclusion.
  - question: >-
      An examiner hashes a memory image immediately after capture. A colleague asks whether the hash
      proves the image matches the computer's memory. What is the best answer?
    choices:
      - Yes, because the hash was computed by a validated tool.
      - Yes, if the hash matches a second capture taken a minute later.
      - No; it shows only that the image file has not changed since it was hashed, because the running memory changed during and after capture and cannot be re-read for comparison.
      - No, because memory images cannot be hashed.
    answer: 2
    explanation: >-
      For a disk, the examiner can hash the source and the copy and compare them. Memory keeps
      changing, so there is no stable source to re-read. The hash protects the image from the moment it
      is computed, and the acquisition notes have to carry the rest of the argument.
  - question: Why does a memory analysis tool need structure definitions for the exact operating-system build?
    choices:
      - To decrypt the memory image.
      - Because the layout of kernel structures such as process records changes between versions, and the tool must know where each field sits to read it.
      - To identify which user owns the computer.
      - Because each build stores memory in a different file format.
    answer: 1
    explanation: >-
      Analysis rebuilds the kernel's bookkeeping from raw bytes. If the tool assumes the wrong layout,
      it reads the wrong offsets and produces garbage or, worse, plausible-looking errors. Tools such as
      Volatility use symbol information matched to the build.
---

## Why it matters

The network evidence in [Network forensics](lesson:FOR-03) showed that workstation W-17 sent about 700 KB to an outside storage service. It could not say which program sent it, or whether a person or malicious software was in control. Those answers live in the computer's memory: every running process with its command line, open and recently closed network connections, loaded code, decrypted data, and encryption keys. Some malicious code runs only in memory and never writes a file at all.

All of it disappears when the power goes off. RFC 3227 places the process table and memory near the top of its order of volatility and states the rule plainly: "Don't shutdown until you've completed evidence collection." Encryption raises the stakes further. SWGDE's acquisition guidance notes that a live acquisition "may be the only opportunity" to obtain data from an encrypted system, because a powered-off encrypted disk may be unreadable without keys that existed only in memory.

Memory is also among the hardest evidence to interpret. It is copied from a running system that keeps changing during the copy, the copying itself changes the system, and every finding is rebuilt from raw bytes by software that must understand the exact operating system version.

## The core idea

A [[memory-image]] is a file holding a copy of a computer's physical memory. [[memory-forensics|Memory forensics]] rebuilds the operating system's own bookkeeping from that copy. The [[kernel]] keeps tables of processes, threads, open files, network connections, and loaded modules, and analysis tools find and decode those structures.

An analogy helps. Imagine photographing every page in a busy office in one sweep while people keep working. The photos do not show a single instant, because pages photographed later may have changed. You can find the official registers, but also loose papers in drawers that are no longer listed anywhere. And you cannot read anything until you know the office's filing conventions.

Analysis tools use two complementary strategies:

1. **List walking** follows the pointers the kernel itself uses, such as its list of active processes. It shows what the operating system considers current.
2. **Scanning** searches all of memory for byte patterns that look like those structures. It also finds things no longer linked: exited processes, closed connections, and objects that malicious code deliberately unlinked to hide them.

Comparing the two views is a standard check. Three assumptions sit under every finding. The tool has structure definitions that match the exact operating system build. The image is somewhat inconsistent, an effect called [[memory-smear]], because memory changed while it was being copied. And the image is incomplete, because [[virtual-memory]] lets the operating system move inactive pages out to a page or swap file on disk.

## How it works

### Acquiring memory

Collection follows the [[order-of-volatility|order of volatility]]. RFC 3227's example list runs from registers and cache, through the routing table, ARP cache, process table, kernel statistics, and memory, to temporary file systems, disk, remote logs, physical configuration, and archival media. SWGDE similarly recommends collecting volatile data in a general order that starts with running processes and ends with storage media.

| Method                           | How it works                                                                                     | Trade-offs                                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Software tool on the live system | A validated acquisition tool, run from trusted external media, copies memory to external storage | The tool occupies memory and changes the system; needs administrator rights; a compromised kernel can interfere |
| Virtual machine snapshot         | The hypervisor saves the guest's memory to a file                                                | Changes the guest very little; available only for virtual machines                                              |
| Files the system already wrote   | Hibernation files, page or swap files, and crash dumps                                           | Written at an earlier time and partial; may be compressed or encrypted                                          |

Every [[live-acquisition]] changes the system it captures, so the responder documents each command, when it ran, and why the change was necessary. RFC 3227's warning, "Don't trust the programs on the system," is the reason tools run from trusted external media rather than from the suspect machine.

Hash the image as soon as it is written. Unlike a disk, memory cannot be re-read to confirm the copy, because it kept changing. The hash shows that the file has not changed since that moment; the acquisition notes carry the rest of the argument.

### Rebuilding processes

Tools such as the open-source Volatility framework need structure definitions, which Volatility 3 calls symbol tables, matched to the operating system build, because kernel structures change layout between versions.

On Windows, each process structure records a process ID, its parent's ID, a name, and a creation time kept by the kernel, plus an exit time once the process ends. Two views of the same data answer different questions:

- A process found by both list walking and scanning is ordinarily running.
- A process found only by scanning, with an exit time, usually just finished and has not yet been overwritten.
- A process found only by scanning, without an exit time, may have been unlinked from the active list while still running, a technique some [[rootkit|rootkits]] use to hide from tools that trust the kernel's list. MITRE ATT&CK describes rootkits as hiding programs, files, and network connections by intercepting and modifying operating-system functions (technique T1014).

The [[process-tree]] arranges processes by parent. Most relationships on a system are routine, so unusual parents stand out: a word processor starting a command shell, or a Windows service host process started by something other than the service manager. Some malicious code can forge its recorded parent, so treat the tree as strong evidence to corroborate, not as proof.

### Beyond processes

The same approach recovers command lines, loaded libraries, open handles, and network connections, including recently closed ones found by scanning. Analysts also look for injected code: memory regions that are executable but not backed by any file on disk. That heuristic flags legitimate software too, such as just-in-time compilers in browsers and runtimes, so every hit is a [[false-positive|possible false positive]] until examined. Memory can also be searched with [[yara-rule|YARA rules]] or for strings such as URLs, and it may contain encryption keys, which is why live capture matters for encrypted systems.

## Worked example

At 10:05 UTC on October 4, before W-17 was shut down, a responder captured its memory with a validated tool run from an external drive, wrote the image to that drive, hashed it, and logged each command. Bob's simplified results from the process list, a process scan, and the process tree are below.

| PID  | Parent | Name             | Created (UTC)       | Exited (UTC)        | In active list | Found by scan |
| ---- | ------ | ---------------- | ------------------- | ------------------- | -------------- | ------------- |
| 712  | 604    | `services.exe`   | 2026-10-03 22:01:58 | none                | Yes            | Yes           |
| 3120 | 2984   | `explorer.exe`   | 2026-10-03 22:03:41 | none                | Yes            | Yes           |
| 6644 | 3120   | `svchost.exe`    | 2026-10-04 04:12:09 | none                | No             | Yes           |
| 5012 | 3120   | `powershell.exe` | 2026-10-04 04:44:51 | none                | Yes            | Yes           |
| 5230 | 5012   | `syncup.exe`     | 2026-10-04 04:46:05 | 2026-10-04 04:47:33 | No             | Yes           |

A connection scan adds one more record: a closed TCP connection from 192.0.2.57 port 51544 to 203.0.113.50 port 443, owned by PID 5230. The injected-code check reports one executable region with no backing file inside PID 6644, and that process has no command-line arguments.

Bob reads the rows one at a time.

1. **`syncup.exe` (5230) is very likely the program that made the upload.** Its connection has the same addresses and ports as the sensor's record, it started four seconds before that connection, and it exited two seconds after the flow ended. Three independent sources line up.
2. **Its absence from the active list is normal.** It has an exit time, so it simply finished; scanning found its leftover structure.
3. **`svchost.exe` (6644) is a lead, not a conclusion.** It was found only by scanning, yet has no exit time. Its parent is `explorer.exe`, while service hosts are normally started by `services.exe`. It has no arguments, and it contains an executable region not backed by a file. Each point alone has innocent explanations; together they justify treating 6644 as suspected [[malware]] hiding by unlinking, pending analysis of the extracted region and a search of the disk for how it started.
4. **Two explanations now compete.** Either someone at W-17 opened PowerShell and ran `syncup.exe`, or code in process 6644 drove PowerShell. The memory image alone cannot decide. The next checks are the user account that owned process 5012, PowerShell's command history on disk, and logon records, the subject of [Browser and endpoint artifacts](lesson:FOR-07).

## In practice

- **Decide in advance when to capture memory.** Write down the triggers, such as a suspected compromise or an unlocked encrypted system, so responders do not improvise under pressure.
- **Use validated tools from trusted media.** Write output to external storage, never to the suspect disk, and record the tool, version, start and end times, the system clock against a reference, and the output hash.
- **Expect smear and gaps.** Avoid strong claims built on a single structure, and treat garbled or contradictory structures as acquisition artifacts until shown otherwise.
- **Corroborate across evidence types.** Memory supplies processes, connections, and precise times; disk supplies persistence and history; network records show effects outside the host.
- **Protect what you capture.** A memory image can contain passwords, messages, and other people's personal data, so restrict access and scope the analysis to the questions you are authorized to answer.

## Common misconceptions

- **"A memory image is a snapshot of one instant."** Acquisition takes time on a running system, so different parts of the image reflect slightly different moments.
- **"If a process is not in the process list, it never ran."** It may have exited, or it may be hidden. Scanning finds both, and the exit time helps tell them apart.
- **"A process found only by scanning is malware."** Most are ordinary processes that finished. A scan-only process without an exit time is the unusual case.
- **"Capturing memory does not change the system."** The acquisition tool itself loads into memory, runs, and writes output. Document the change instead of denying it.
- **"A matching hash proves the memory image is accurate."** It proves only that the file is unchanged since it was hashed.

## Try it yourself

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

**Part 1: your own process tree.** On your own computer, list processes with parent IDs and start times:

```bash
# Linux
ps -eo pid,ppid,lstart,comm --sort=start_time | tail -n 25
# macOS
ps -axo pid,ppid,lstart,comm | tail -n 25
# Windows PowerShell:
# Get-CimInstance Win32_Process | Select-Object ProcessId, ParentProcessId, Name, CreationDate
```

Draw the chain from your terminal or browser up to the first process. Note that `ps` asks the running operating system for its list, which is list walking. What could a compromised kernel hide from it, and how would scanning a memory image get around that?

**Part 2: interpret synthetic evidence.** This simplified listing comes from a fictional memory image:

| PID  | Parent | Name           | Created (UTC) | Exited (UTC) | In active list | Found by scan |
| ---- | ------ | -------------- | ------------- | ------------ | -------------- | ------------- |
| 1204 | 1172   | `explorer.exe` | 09:58:30      | none         | Yes            | Yes           |
| 1880 | 1204   | `chrome.exe`   | 10:02:11      | none         | Yes            | Yes           |
| 2216 | 1880   | `chrome.exe`   | 10:02:12      | none         | Yes            | Yes           |
| 3904 | 1204   | `WINWORD.EXE`  | 10:15:40      | none         | Yes            | Yes           |
| 4120 | 3904   | `cmd.exe`      | 10:16:02      | 10:16:03     | No             | Yes           |
| 5100 | 1204   | `notepad.exe`  | 10:20:00      | 10:25:00     | No             | Yes           |

For each row, label it routine or a lead and give your reason. Which single fact would you check first for process 4120, and why does its one-second lifetime not make it less interesting?

## Key takeaways

- Memory holds evidence found nowhere else: running and recently ended processes, connections, injected code, decrypted data, and keys.
- Capture before shutdown when it matters, with validated tools from trusted media, and document how acquisition changed the system.
- List walking shows what the kernel reports; scanning also finds exited and hidden objects, and comparing the two is a core check.
- Unusual parents, unbacked executable regions, and scan-only processes without exit times are leads, not verdicts.
- Corroborate memory findings with disk and network evidence before drawing conclusions.

## Go deeper

- Work through the Windows tutorial in the [Volatility 3 documentation](https://volatility3.readthedocs.io/en/latest/) with a practice image your instructor provides, and compare the `windows.pslist` and `windows.pstree` views of the same processes. For depth, the course library lists _The Art of Memory Forensics_ by Ligh, Case, Levy, and Walters (Wiley, 2014), written by Volatility developers.
- Compare RFC 3227's order of volatility with the order in [SWGDE's acquisition guidance](https://www.swgde.org/documents/published-complete-listing/17-f-002-2-1/). Where do they differ, and why might cloud virtual machines change the answer?
- Open question: memory encryption and virtualization-based isolation are spreading in modern hardware and operating systems. Which memory evidence will remain obtainable, and how should acquisition be validated when a tool's view may be restricted?
