---
topicId: FOR-07
title: Browser and endpoint artifacts
summary: >-
  What browsers and operating systems record as a side effect of everyday use, how to collect those
  records without changing them or exposing unrelated personal data, and how to link logon, process,
  command, device, and browser records to an account rather than automatically to a person.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Identify which browser and endpoint artifacts answer questions about logons, program execution, typed commands, connected devices, and web activity.
  - Correlate Windows logon and process-creation events through the Logon ID and converted process IDs.
  - Collect a browser history database with its write-ahead log and query only a working copy.
  - Explain why an artifact attributes activity to an account, profile, or device rather than to a person.
  - Scope an evidence collection so that it excludes unrelated personal data.
prerequisites: [FOR-02, FOR-04, FOR-05]
concepts: [browser-artifact, logon-session, write-ahead-log]
labs: []
keywords:
  - browser forensics
  - browsing history
  - web history
  - places.sqlite
  - SQLite
  - write-ahead log
  - WAL
  - endpoint artifacts
  - Windows Security log
  - event ID 4624
  - event ID 4688
  - logon type
  - Logon ID
  - process creation auditing
  - PSReadLine
  - ConsoleHost_history.txt
  - PowerShell history
  - USB device history
  - filter team
  - data minimization
sources:
  - title: '4624(S): An account was successfully logged on'
    url: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4624
    publisher: Microsoft Learn
  - title: '4688(S): A new process has been created'
    url: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4688
    publisher: Microsoft Learn
  - title: Set-PSReadLineOption
    url: https://learn.microsoft.com/en-us/powershell/module/psreadline/set-psreadlineoption
    publisher: Microsoft Learn
  - title: 'Profiles: Where Firefox stores your bookmarks, passwords and other user data'
    url: https://support.mozilla.org/en-US/kb/profiles-where-firefox-stores-user-data
    publisher: Mozilla Support
    license: Creative Commons license (version not stated on the page)
  - title: Write-Ahead Logging
    url: https://www.sqlite.org/wal.html
    publisher: SQLite project
  - title: 'SWGDE Considerations for Focused Collection of Digital Evidence (14-F-003, version 2.0)'
    url: https://www.swgde.org/documents/published-complete-listing/14-f-003-2-0/
    publisher: Scientific Working Group on Digital Evidence (SWGDE)
    license: All rights reserved (redistribution allowed under SWGDE terms)
quiz:
  - question: >-
      A 4688 event for powershell.exe shows New Process ID 0x1394 and Logon ID 0x3A41F2. Your memory
      analysis lists powershell.exe with PID 5012. What can you conclude?
    choices:
      - Nothing, because event logs and memory tools number processes in unrelated ways.
      - 0x1394 is 5012 in decimal, so the records likely describe the same process if the creation times also agree, and the Logon ID leads to the 4624 event that names the account.
      - The person who typed the PowerShell commands is identified by the Logon ID.
      - The process ran with administrator rights.
    answer: 1
    explanation: >-
      Event 4688 writes process IDs in hexadecimal, while most memory tools print decimal. After
      conversion the IDs match, but Windows reuses process IDs, so a sound link also requires matching
      creation times. The Logon ID identifies a logon session, which a 4624 event ties to an account,
      not to a person.
  - question: >-
      You copy only places.sqlite out of a running browser's profile, and your query shows none of the
      visits from the last few minutes. What is the most likely reason?
    choices:
      - The browser encrypts recent history until it closes.
      - Recent visits are never saved to disk.
      - The visits are present, but your query used the wrong epoch.
      - Recent changes were still in the database's write-ahead log, a separate -wal file that you did not copy.
    answer: 3
    explanation: >-
      In write-ahead log mode, SQLite appends new changes to a companion -wal file and moves them into
      the main database later, at a checkpoint. Collect the database with its -wal and -shm files, or
      image the disk, and query only a working copy, because opening the database can itself trigger a
      checkpoint that changes it.
  - question: >-
      A user's PowerShell history file contains the line `.\syncup.exe push E:\customers.zip`. What does
      that line establish on its own?
    choices:
      - That a command with this text was entered at an interactive PowerShell prompt in that user profile at some time, but not when, by whom, or whether it succeeded.
      - The exact time the command ran, because each line is timestamped.
      - That the account owner typed the command.
      - That the upload succeeded.
    answer: 0
    explanation: >-
      PSReadLine saves typed commands as plain lines with no timestamps, so timing must come from
      other evidence, such as process-creation events or the file's own modification time. The file
      belongs to a profile, not a person, a command line says nothing about the command's result, and
      because the file is plain text that anyone with access can edit, even its contents need
      corroboration.
  - question: >-
      The authorization covers a workstation's activity during one night related to a data upload. The
      user's browser profile holds years of history, including visits to medical sites. What is the
      best practice?
    choices:
      - Collect and review the entire history, because more data is always better.
      - Delete the personal entries from the original profile before imaging it.
      - Preserve the original, but extract only the authorized window and subject, with withheld entries counted and documented by someone outside the case.
      - Skip the browser entirely to avoid privacy problems.
    answer: 2
    explanation: >-
      Altering the original would destroy evidence, and ignoring the browser could miss key facts.
      Preservation and minimization work together: keep the original intact, limit what the case
      examiner sees to what the authorization covers, and document what was withheld and why, so the
      process can be reviewed later.
  - question: >-
      A 4624 event with Logon Type 7 for SHOP\mallory appears at 04:36:52 UTC. What does it show?
    choices:
      - That mallory was physically present at the workstation.
      - That a locked workstation was unlocked with the credentials of mallory's account, which shows the account was used at that time, not who used it.
      - That someone logged on over the network from another computer.
      - That a Remote Desktop session started.
    answer: 1
    explanation: >-
      Microsoft documents logon type 7 as an unlock of the workstation, type 3 as a network logon, and
      type 10 as Remote Desktop. An unlock requires the account's credential at that moment, so it is
      good evidence that someone holding that credential unlocked the session at that time, but
      identifying the person takes other evidence, such as badge records or who knew the password.
---

## Why it matters

The memory and network evidence in case 2026-0142 showed what W-17 did: a program named `syncup.exe` uploaded about 700 KB to an outside server. It could not say whose session the program ran in, or whether anyone was at the keyboard. Those questions are answered by the records that operating systems and applications keep about everyday use: logon events, process-creation records, command histories, lists of connected devices, and browser history. These records exist for convenience and administration, not for investigators, so they are rich but uneven.

They are also among the most personal data a computer holds. A browsing history can reveal health conditions, money troubles, and relationships that have nothing to do with the case. Collecting everything because it is easy invades privacy and can exceed the examiner's authorization. Good endpoint forensics combines two skills: knowing where each artifact lives and what it can prove, and collecting only what the case requires.

## The core idea

In forensics, an artifact is a trace that software leaves as a side effect of activity. A [[browser-artifact|browser artifact]] is one kept by a web browser, such as history, download records, cookies, or cached pages. Endpoint artifacts are kept by the operating system and other applications. For each one, ask three questions:

1. **What creates it?** Know which activity writes the record, and which innocent activity could write the same thing.
2. **What does it attribute activity to?** Almost always an account, a browser profile, or a device, never directly a person.
3. **How long does it last, and what changes it?** Logs roll over, histories can be cleared, and some records exist only if a setting was turned on.

The second question causes the most mistakes. An event naming mallory shows that mallory's account was used. Linking the account to a person takes other evidence, such as who knew the password, badge records, or camera footage. A hotel's door log works the same way: it shows which key card opened the room, not who was holding it.

Scope belongs to the core idea too. The authorization for a case, whether a warrant, a signed consent, or an organization's investigation policy, limits which data may be examined. In practice that means [[data-minimization|minimizing]] the collection to the relevant time window, devices, and accounts, and keeping unrelated [[pii|personal information]] out of the examiner's view where possible.

## How it works

### Browser artifacts

A browser keeps a profile folder for each user, and often several profiles per user, holding history, bookmarks, cookies, cached files, saved form entries, and session state. Most of these are SQLite databases. Firefox keeps bookmarks, the list of downloaded files, and browsing history in a file named `places.sqlite`. Chromium-based browsers such as Chrome and Edge keep history in a database file named `History` inside each profile folder. A history database typically lists each URL with its title and visit count, plus a record of every visit with its time and how it began, such as following a link or typing the address. Download records add the source URL, the saved path, the size, and start and end times.

Three details trip up beginners:

- **Time formats.** Browsers store times as counts from an epoch. Firefox counts microseconds since January 1, 1970, UTC, while Chromium counts microseconds since January 1, 1601, UTC. Decoding with the wrong epoch gives dates centuries off, so check what your tool assumed (see [Timeline reconstruction](lesson:FOR-05)).
- **Uncommitted changes.** In [[write-ahead-log|write-ahead log]] (WAL) mode, SQLite appends new changes to a companion file whose name ends in `-wal` and moves them into the main database later, at a checkpoint. When the last connection closes, SQLite normally runs a final checkpoint and deletes the WAL file. So copying only the main file from a running browser can miss the newest records, and opening a copied database can change it. Collect the database with its `-wal` and `-shm` files, or take a [[forensic-image|forensic image]], and query only a working copy.
- **Gaps.** Private browsing modes avoid saving history, users clear it, and old records expire. A missing visit shows only that this profile holds no record of it; the visit may still appear in DNS, proxy, or server logs.

### Endpoint artifacts

| Question                        | Example artifacts on Windows                                                                | Attributes activity to                         | Caveats                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------ |
| Who logged on, and how?         | Security log event 4624, with a logon type and a Logon ID                                   | An account and a logon session                 | Requires logon auditing; old events are overwritten                      |
| What ran?                       | Security log event 4688 (process creation); program-execution traces such as Prefetch files | An account, through the Logon ID, and a parent | Recorded only if process-creation auditing is on; command lines optional |
| What was typed?                 | PowerShell's history file; shell history files on Linux and macOS                           | A user profile                                 | Often no timestamps; easy to delete or turn off                          |
| Which devices were connected?   | Device installation logs and registry entries naming vendor, product, and serial number     | Usually the computer                           | First and last connection times need careful interpretation              |
| What was browsed or downloaded? | Browser history, download records, cookies, and cache                                       | A browser profile                              | Private modes, clearing, and expiry                                      |

The Windows [[security-log|Security log]] is central. Event 4624 records a successful logon and its logon type: 2 is an interactive logon at the machine, 3 a network logon, 7 the unlocking of a locked workstation, and 10 a Remote Desktop logon. Each logon starts a [[logon-session|logon session]] identified by a hexadecimal Logon ID, which Microsoft's documentation suggests using to correlate a logon with other events that carry the same ID. Event 4688 records each new process with the creating account's Logon ID, the new process ID, and the creator's process ID, both in hexadecimal. Its command-line field is empty by default and filled only if a separate policy setting is enabled.

PowerShell's line editor, PSReadLine, saves commands typed at the interactive prompt to a per-user text file. By default it saves each command as soon as the command runs, for the standard console to `ConsoleHost_history.txt` in the user's `AppData\Roaming\Microsoft\Windows\PowerShell\PSReadLine` folder. The file is plain text, typically one command per line, with no timestamps, so dating its lines depends on other evidence.

### Linking records

Artifacts become powerful when shared keys connect them. The Logon ID joins logon and process events. Process IDs join event logs to [[memory-forensics|memory analysis]] once converted from hexadecimal. File paths join download records to command lines, and a serial number joins a device record to the physical drive in the evidence bag. Each link should rest on at least two matching facts, such as an ID and a time, because Windows can reuse a process ID once the process has exited. This is [[event-correlation|event correlation]] applied to a single machine.

## Worked example

During the [[live-acquisition|live response]] on October 4, a responder collected W-17's Security log, mallory's browser profile, and mallory's user folder, hashing each item. The case authorization covers activity related to the upload between 21:00 UTC on October 3 and 06:00 UTC on October 4. A second examiner, who is not working the case, prepared a privacy-safe collection for bob:

| Item | Source                        | Preparation                                                                    |
| ---- | ----------------------------- | ------------------------------------------------------------------------------ |
| E7-1 | Security log                  | Logon and process-creation events inside the window, times converted to UTC    |
| E7-2 | Browser history and downloads | Entries inside the window; personal entries replaced by a count and a reason   |
| E7-3 | PowerShell history file       | Whole file, because it has no times to filter by; checked for personal content |
| E7-4 | Device records                | USB storage devices connected inside the window                                |

The excerpts below are fictional and simplified.

```text
E7-1  Security log, W-17 (UTC)
2026-10-03 22:03:30  4624  Type 2 (interactive)  SHOP\mallory  Logon ID 0x3A41F2
2026-10-04 04:11:47  4688  PID 0x1F40  WINWORD.EXE  creator 0xC30  Logon ID 0x3A41F2
                     cmd: WINWORD.EXE "C:\Users\mallory\Downloads\invoice-4471.docm"
2026-10-04 04:12:09  4688  PID 0x19F4  C:\Users\mallory\AppData\Roaming\svchost.exe
                     creator 0xC30  Logon ID 0x3A41F2  (no arguments)
2026-10-04 04:36:52  4624  Type 7 (unlock)  SHOP\mallory
2026-10-04 04:44:51  4688  PID 0x1394  powershell.exe  creator 0xC30  Logon ID 0x3A41F2
                     (no arguments)
2026-10-04 04:46:05  4688  PID 0x146E  syncup.exe  creator 0x1394  Logon ID 0x3A41F2
                     cmd: "C:\Users\mallory\Downloads\syncup.exe" push E:\customers.zip
                          --server files.storage.test

E7-3  ConsoleHost_history.txt (mallory), modified 2026-10-04 04:47:41 UTC, last 3 lines
cd ~\Downloads
.\syncup.exe push E:\customers.zip --server files.storage.test
Remove-Item E:\customers.zip

E7-4  USB storage device, serial TEST-7781, most recently connected 2026-10-04 04:39:47 UTC
```

| Time (UTC)                | E7-2 browser record  | Detail                                                                              |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------- |
| 2026-10-03 22:10 to 23:52 | 14 visits            | Withheld by the filter examiner: personal, unrelated to the case                    |
| 2026-10-04 04:37:31       | Visit, address typed | `https://admin.shop.example/reports`                                                |
| 2026-10-04 04:38:12       | Download completed   | Customer report saved as `C:\Users\mallory\Downloads\customers_2026-09.csv`, 2.1 MB |
| 2026-10-04 04:42:58       | Visit, address typed | `https://files.storage.test/`                                                       |
| 2026-10-04 04:43:26       | Download completed   | `syncup.exe` from `files.storage.test`, saved to `C:\Users\mallory\Downloads`       |

Bob works through the questions left open by earlier evidence.

1. **Whose session ran PowerShell?** In decimal, 0x1394 is 5012, 0x146E is 5230, 0x19F4 is 6644, and 0xC30 is 3120, the PIDs from the memory analysis, and the creation times of 6644, 5012, and 5230 agree to the second. These processes all carry Logon ID 0x3A41F2, the session of mallory's interactive logon at 22:03:30. PowerShell and `syncup.exe` ran in mallory's logon session.
2. **Was someone at the keyboard?** At 04:36:52 the locked workstation was unlocked with mallory's credentials. Less than a minute later the browser recorded a typed address, and another followed at 04:42:58. PowerShell then started from `explorer.exe` with no arguments, consistent with a launch from the Start menu or a shortcut, and the history file shows the upload command entered at the prompt, with the same arguments as the 4688 command line. Together these point to interactive use rather than an unattended script, although software that imitates a user's keystrokes could leave similar traces.
3. **Where did the data come from?** The browser saved `customers_2026-09.csv` from the shop's admin portal at 04:38:12, the same modified time the copy on E1 carries. The drive with serial TEST-7781 was connected at 04:39:47, about a minute before the CSV appeared on it. The last history line removed `customers.zip` from the drive, consistent with the deleted entry found on E1.
4. **Was the attachment opened?** As far as these records go, yes. Word started at 04:11:47 with `invoice-4471.docm` from the Downloads folder on its command line. Twenty-two seconds later, a program named `svchost.exe` started from mallory's profile folder, although the genuine service host runs from `C:\Windows\System32`. The timing supports the attachment as the source of process 6644, but the recorded creator is `explorer.exe`, not Word, so that link remains an inference.

Bob also records what the collection does not show. No history line created the ZIP, which appeared on E1 at 04:41:16, before PowerShell 5012 started; it was probably made with another tool, unless history lines were removed. No logged process names 6644 as its creator. Every record names an account, a profile, or a device; none shows who sat at W-17. The logs also come from a machine that ran suspected [[malware]], so bob plans to check them against independent sources, such as the admin portal's server logs and the door controller, before relying on them. Weighing these findings against the competing explanations is the work of the report (see [Forensic reporting and uncertainty](lesson:FOR-08)).

## In practice

- **Settle authorization and scope first.** Write down which devices, accounts, time windows, and data types the case covers, and use a filter examiner or automated filtering to keep personal content out of view. SWGDE's guidance on focused collection requires every scoping decision to be documented and warns that a narrow collection "may inadvertently exclude exculpatory evidence," so derive the criteria from the investigative questions, not from a favored theory.
- **Preserve raw sources, not only tool reports.** Keep the log files, profile folders, and databases themselves, so anyone can re-check a finding.
- **Collect early and record settings.** Logs roll over and browsers expire history. Note which audit policies were enabled, because a missing event means little if the policy was off.
- **Validate parsers.** Artifact formats change between software versions, so practice [[tool-validation|tool validation]]: test each parser against data whose contents you already know.
- **Corroborate off the host.** Server logs, proxy records, and badge systems are harder for an intruder on the endpoint to alter.

## Common misconceptions

- **"The log says mallory, so mallory did it."** It says mallory's account was used.
- **"No history means nothing happened."** Private modes, clearing, expiry, and disabled settings all leave gaps.
- **"Opening the database is harmless."** Opening a SQLite file can run a checkpoint that merges its write-ahead log and changes the file.
- **"A process ID identifies a process."** Windows reuses process IDs, so match on creation time as well.
- **"More data is always better."** Collecting beyond the authorization creates legal and ethical problems and buries the relevant records.

## Try it yourself

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

**Part 1: a privacy-safe browser profile.** Use a new, empty profile, so no real browsing history is involved.

1. In Firefox, open `about:profiles`, create a profile named `forensics-test`, and launch it.
2. In that profile only, type `https://example.com` into the address bar, then follow the link on that page. Type the address of one more page, such as this course's site. Note the times. Then open `about:support` and note the profile folder listed under Application Basics.
3. Close every window of the test profile so that Firefox closes its databases. Copy `places.sqlite`, plus `places.sqlite-wal` if one exists, from that folder into a working folder, and hash the originals and the copies with `sha256sum` (or `shasum -a 256` on macOS).
4. Query the working copy with the `sqlite3` command-line tool (preinstalled on macOS and many Linux systems, and downloadable for Windows from sqlite.org), then hash the copy again:

```bash
sqlite3 places.sqlite "SELECT datetime(v.visit_date/1000000, 'unixepoch') AS utc, v.visit_type, p.url
  FROM moz_historyvisits v JOIN moz_places p ON p.id = v.place_id ORDER BY v.visit_date;"
```

In the output, `visit_type` 1 marks a followed link and 2 a typed address. Do the types and times match your notes once converted to your time zone? Did the query change the copy's hash, and does any `-wal` copy still exist?

In Chrome or Edge, repeat the visits in a new profile, open `chrome://version` or `edge://version` to find its profile path, and copy the file named `History` after closing the browser:

```bash
sqlite3 History "SELECT datetime(v.visit_time/1000000 - 11644473600, 'unixepoch') AS utc, u.url
  FROM visits v JOIN urls u ON u.id = v.url ORDER BY v.visit_time;"
```

**Part 2: a prepared collection.** This fictional extract comes from host LAB-PC-3.

```text
2026-11-09 13:58:02  4624  Type 2   LAB\alice  Logon ID 0x51C08
2026-11-09 14:20:40  4624  Type 10  LAB\bob    Logon ID 0x7A3E1  source 198.51.100.23
2026-11-09 14:21:15  4688  PID 0x1A0C  cmd.exe       creator 0x1D88  Logon ID 0x7A3E1
2026-11-09 14:21:30  4688  PID 0x0F5C  robocopy.exe  creator 0x1A0C  Logon ID 0x7A3E1
2026-11-09 14:35:10  4688  PID 0x22B8  notepad.exe   creator 0x0D40  Logon ID 0x51C08
```

1. Which account started `robocopy.exe`, and how did that account log on?
2. Convert 0x1A0C and 0x0F5C to decimal.
3. No event shows process 0x1D88 being created. Give two possible reasons.
4. Write two sentences about who ran `robocopy.exe`: one stating what the records show, and one stating what they cannot show.

## Key takeaways

- Browsers and operating systems record activity for their own purposes; know what creates each artifact and what can change it.
- Artifacts attribute activity to accounts, profiles, and devices, not to people.
- Link records through shared keys such as Logon IDs, converted process IDs, paths, and serial numbers, and confirm each link with time.
- Copy SQLite databases with their write-ahead logs and query only working copies.
- Scope each collection to the authorization, and keep unrelated personal data out of view.

## Go deeper

- Read Microsoft's documentation for [event 4688](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/event-4688) and list the fields that would help distinguish a process started by a person from one started by a service.
- Look up `-HistorySaveStyle` in [Set-PSReadLineOption](https://learn.microsoft.com/en-us/powershell/module/psreadline/set-psreadlineoption). Which setting leaves no history file, and how should an examiner interpret the file's absence?
- Open question: as browsers sync history across devices and keep more of it in the cloud, which records should an examiner request from the provider instead of the endpoint, and how should privacy limits apply there?
