---
topicId: FOR-05
title: Timeline reconstruction
summary: >-
  How investigators merge timestamps from file systems, logs, memory, and network records into one
  ordered account of events, why every timestamp needs an explicit time zone and clock assumption, and
  how to test which conclusions depend on those assumptions.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Identify the format, epoch, precision, time zone, and producing clock of a timestamp before using it.
  - Normalize timestamps from mixed sources to UTC, recording each conversion and assumption next to the raw value.
  - Build a merged timeline from a fictional log set and order its events correctly.
  - Test whether a timeline conclusion survives a change in a time-zone or clock-skew assumption.
  - Recognize inconsistencies that suggest clock problems or timestamp tampering.
prerequisites: [FOR-02, FOR-03]
concepts: [timeline-analysis, utc, clock-skew, timestomping]
labs: []
keywords:
  - timeline analysis
  - timeline reconstruction
  - super timeline
  - time zone
  - UTC offset
  - daylight saving time
  - DST
  - clock skew
  - clock drift
  - NTP
  - Unix epoch
  - FILETIME
  - ISO 8601
  - RFC 3339
  - RFC 9557
  - mactime
  - body file
  - plaso
  - log2timeline
  - timestomping
  - T1070.006
sources:
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: 'RFC 3227: Guidelines for Evidence Collection and Archiving (BCP 55)'
    url: https://www.rfc-editor.org/rfc/rfc3227
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
  - title: 'RFC 3339: Date and Time on the Internet: Timestamps'
    url: https://www.rfc-editor.org/rfc/rfc3339
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
  - title: 'RFC 9557: Date and Time on the Internet: Timestamps with Additional Information'
    url: https://www.rfc-editor.org/rfc/rfc9557
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 6302: Logging Recommendations for Internet-Facing Servers (BCP 162)'
    url: https://www.rfc-editor.org/rfc/rfc6302
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'MITRE ATT&CK T1070.006: Indicator Removal: Timestomp'
    url: https://attack.mitre.org/techniques/T1070/006/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: >-
      A FAT32 USB drive shows a file created at 23:41:16 on October 3, written by a computer set to US
      Central Time. Which UTC time is correct?
    choices:
      - 2026-10-03 23:41:16 UTC, because file systems store UTC.
      - 2026-10-04 05:41:16 UTC, because Central Time is UTC-06:00.
      - 2026-10-04 04:41:16 UTC, because Central Time observes daylight saving time in early October and is UTC-05:00.
      - It cannot be converted at all.
    answer: 2
    explanation: >-
      FAT32 stores local time with no offset, so the examiner must apply the writing computer's zone rules
      for that date. In early October US Central Time is on daylight time, UTC-05:00. Using the standard
      offset of UTC-06:00 would shift the event an hour later, enough to reverse its order relative to
      nearby events.
  - question: >-
      A firewall's clock was measured 90 seconds fast when its logs were collected. Its log shows a
      connection at 14:03:38 UTC. What should the timeline show, and how?
    choices:
      - 14:03:38, because logs must not be changed.
      - 14:02:08, with the raw value and the 90-second correction recorded beside it.
      - 14:05:08, because a fast clock must be corrected forward.
      - Nothing, because skewed logs cannot be used.
    answer: 1
    explanation: >-
      A fast clock records times later than the truth, so you subtract the measured error. The raw value
      stays in the record and the correction is documented, so anyone can check or undo it. The
      correction is also an assumption: skew measured at collection may differ from skew at the time of
      the event.
  - question: >-
      An NTFS file's $STANDARD_INFORMATION creation time is two years earlier than its $FILE_NAME creation
      time, and the operating system was installed last month. What is the best interpretation?
    choices:
      - The $STANDARD_INFORMATION times may have been altered, so look for corroborating records before trusting either set.
      - The file is two years old.
      - The file system is corrupted and the image must be discarded.
      - The $FILE_NAME time is always wrong.
    answer: 0
    explanation: >-
      Ordinary programs can rewrite the $STANDARD_INFORMATION times more easily than the $FILE_NAME
      times, and a creation time that predates the system itself is a classic sign of timestomping.
      There can be innocent explanations, such as files extracted from archives with preserved times,
      so the examiner corroborates with logs and other artifacts.
  - question: Why should a timeline keep the raw timestamp next to the normalized UTC value?
    choices:
      - Raw values are required by file systems.
      - So that the timeline sorts faster.
      - Because UTC values are less precise.
      - So that every conversion can be checked, repeated, or redone if an assumption about zone or skew turns out to be wrong.
    answer: 3
    explanation: >-
      Normalization depends on assumptions about zones, daylight saving rules, and clock errors. Keeping
      the raw value, the assumption, and the result together makes the timeline reproducible and lets a
      reviewer see exactly which conclusions depend on which assumptions.
---

## Why it matters

Most investigative questions come down to order. Was the file copied before or after the upload? Did the suspicious process start before the user logged on, or after? A timeline answers them by merging every timestamped record, from file-system [[mac-times|MAC times]], [[security-log|logs]], memory, network sensors, and applications, into one sequence. [[timeline-analysis|Timeline analysis]] is where the separate artifacts from the earlier lessons finally become an account of what happened.

It is also where small errors become wrong conclusions. NIST SP 800-86 warns that file times may be inaccurate because a clock was wrong or never synchronized "with an authoritative time source," because times were not recorded with the expected precision, or because an attacker altered them. Add time zones that are recorded in some sources and missing from others, daylight saving rules, and different units and epochs, and it becomes easy to put events in an order that never happened. An hour's error in the case you have followed so far would reverse the order of two key events, as the worked example shows.

## The core idea

Every timestamp is a claim made by a particular clock, written in a particular format. Before you use one, answer five questions:

1. **Format and epoch.** Is it text, or a count of units since a starting point, such as seconds since 1970 or 100-nanosecond intervals since 1601?
2. **Precision.** Is it recorded to the nanosecond, the second, two seconds, or only the day?
3. **Time zone.** Is it [[utc|UTC]], local time with a stated offset, or local time with no offset at all?
4. **Clock.** Which device's clock produced it, and how far was that clock from true time, its [[clock-skew]]?
5. **Meaning.** Which event does it actually record? A copied file's modification time records an edit on another machine, not the copy.

Then convert everything to UTC, keep the raw value beside the converted one, and write every assumption down. The analogy is merging the diaries of travelers who each wrote the local time without saying which city they were in: you cannot order their entries until you work out where each one was.

## How it works

### How common sources store time

| Source                  | How time is stored                                    | Zone                      | Typical precision    |
| ----------------------- | ----------------------------------------------------- | ------------------------- | -------------------- |
| NTFS file times         | Count of 100-nanosecond intervals since 1601-01-01    | UTC                       | 100 ns               |
| ext4 file times         | Seconds since 1970-01-01, plus nanoseconds            | UTC                       | 1 ns                 |
| FAT32 file times        | Local date and time fields                            | None recorded             | 2 s for modification |
| Unix epoch logs         | Seconds or milliseconds since 1970-01-01              | UTC                       | 1 s or 1 ms          |
| RFC 3339 text           | `2026-10-04T04:46:09Z` or `2026-10-03T23:46:09-05:00` | Explicit offset           | As written           |
| Traditional syslog text | `Oct  4 04:46:09`                                     | Not recorded, and no year | 1 s                  |

RFC 3339 profiles ISO 8601 for Internet timestamps and makes the offset part of the value. Its 2024 update, RFC 9557, settles a subtle point: `Z` now means the time is known in UTC but the local offset is not, while `+00:00` says UTC is the preferred reference. RFC 9557 also lets a timestamp carry a time-zone name in brackets, as in `2026-10-03T23:41:16-05:00[America/Chicago]`, so the zone's rules travel with the value. RFC 6302 recommends UTC for server logs because offset information can be lost as records pass from one organization to another.

### Normalizing to UTC

Normalization is a sequence of documented steps.

- **Decode the format.** Convert counts from their epoch and unit into a date and time.
- **Apply the right offset for that date.** A zone is a set of rules, not a fixed number. US Central Time is UTC-05:00 during daylight saving time and UTC-06:00 otherwise. When daylight time ends on November 1, 2026, local times from 01:00 to 01:59 occur twice, so a local timestamp in that hour is ambiguous without other evidence.
- **Correct measured skew.** RFC 3227 asks collectors to record the extent of each system's clock drift and to note, for each timestamp, whether it is UTC or local. If a clock was measured fast, subtract the error; if slow, add it. Skew measured at collection is an assumption about skew at the time of the event.
- **Record everything.** Keep the raw value, the conversion, the corrected UTC value, and a short note on the assumption in separate columns.

```bash
# Convert a Unix epoch value to UTC and to US Central Time (GNU date on Linux)
date -u -d @1791089169
TZ=America/Chicago date -d @1791089169
# macOS equivalents: date -u -r 1791089169   and   TZ=America/Chicago date -r 1791089169
```

### Building the timeline

For file systems, The Sleuth Kit writes metadata for every file into a "body file" with `fls -m`, and its `mactime` tool sorts that file into a timeline, with an option to set the output time zone. Multi-source tools such as plaso (log2timeline) extract events from many artifact types into a single "super timeline." Either way, the output is large. Analysts anchor the work with pivot events whose times are trusted, such as a record from an NTP-synchronized network sensor, then filter to windows around those pivots and widen as needed.

### Checking consistency and tampering

A sound timeline also looks for events that cannot be right:

- **Effects before causes**, such as a file opened before it was created, or a firewall entry logged before the DNS lookup that preceded it.
- **Disagreement between sources** that should agree, such as file times against log entries for the same action.
- **Disagreement inside one source**, such as NTFS `$STANDARD_INFORMATION` times that differ sharply from the `$FILE_NAME` times, or times that predate the operating system's installation.

These can come from clock changes, conversion mistakes, or [[timestomping]], the deliberate alteration of timestamps that MITRE ATT&CK lists as technique T1070.006. ATT&CK also notes that adversaries may alter both NTFS timestamp sets to defeat comparisons between them, so a match between the sets is not proof of innocence either. Each inconsistency is a question to resolve with independent evidence, not an automatic finding of tampering.

## Worked example

Bob merges the evidence from case 2026-0142. He first checks each clock. The DNS resolver and egress sensor use NTP. The firewall read 2 seconds fast at collection. W-17's clock was within one second of the reference when its memory was captured. The building's door controller, a new source, read 6 minutes 20 seconds slow when bob checked it on October 6. The USB drive's FAT32 times are local and were most likely written by W-17, whose settings show US Central Time with daylight saving.

| UTC (normalized)    | Source          | Event                                                 | Raw value and conversion                                 |
| ------------------- | --------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| 2026-10-04 04:12:09 | Memory          | `svchost.exe` (6644) starts, parent `explorer.exe`    | Kernel time, UTC                                         |
| 2026-10-04 04:40:58 | USB drive       | `customers_2026-09.csv` created on the drive          | 23:40:58 local, plus 5 h (daylight time assumed)         |
| 2026-10-04 04:41:16 | USB drive       | `customers.zip` created (later deleted)               | 23:41:16 local, plus 5 h (daylight time assumed)         |
| 2026-10-04 04:44:51 | Memory          | `powershell.exe` (5012) starts, parent `explorer.exe` | Kernel time, UTC                                         |
| 2026-10-04 04:46:05 | Memory          | `syncup.exe` (5230) starts, parent `powershell.exe`   | Kernel time, UTC                                         |
| 2026-10-04 04:46:07 | DNS             | `files.storage.test` resolved for 192.0.2.57          | UTC, NTP-synchronized                                    |
| 2026-10-04 04:46:09 | Sensor          | TLS connection opens; 702,113 bytes out in 82 s       | Epoch 1791089169; firewall agrees after a 2 s correction |
| 2026-10-04 04:47:33 | Memory          | `syncup.exe` exits                                    | Kernel time, UTC                                         |
| 2026-10-04 05:04:30 | Door controller | Badge "mallory" exits the building                    | 23:58:10 local, plus 6 min 20 s skew, plus 5 h           |
| 2026-10-04 09:12:00 | Alice's notes   | USB drive found in W-17                               | Written in UTC                                           |

**Reading the sequence.** The file was copied to the drive and zipped, and less than four minutes later PowerShell started; `syncup.exe` followed and uploaded about 700 KB. Seventeen minutes after the upload ended, the badge assigned to mallory left the building.

**Testing the key assumption.** Suppose bob had applied a fixed "Central is UTC-06:00" rule. The CSV copy and the ZIP would move to 05:40:58 and 05:41:16 UTC, nearly an hour after the upload ended, and the ZIP could not have been the uploaded file. The conclusion "the ZIP was written about five minutes before the upload" therefore rests on the daylight-time offset. Bob supports it with W-17's time-zone setting and the date, which falls before daylight time ends, and he records it as an explicit assumption. Conclusions that rest only on NTP-synchronized sources, such as the order of the DNS lookup and the connection, do not depend on it.

**Marking the limits.** The door controller's skew was measured two days after the event and assumed constant, so its time carries a margin of a few minutes at least. A badge record shows that a badge passed a door, not who carried it or who was at W-17's keyboard. And `svchost.exe` (6644) started 28 minutes before the copy, an ordering that keeps the malware explanation from [Memory-forensics concepts](lesson:FOR-04) open. The timeline shows sequence and proximity, not cause or identity.

## In practice

- **Inventory clocks before events.** List every source with its format, zone, synchronization status, and measured skew, and say where each figure came from.
- **Normalize once, transparently.** Use a single conversion step that keeps raw values, and never overwrite the original records.
- **Anchor on trusted sources.** Begin with NTP-synchronized, independent records and test weaker sources against them.
- **Run sensitivity checks.** For each important conclusion, ask which zone or skew assumption it depends on, and how wrong that assumption would have to be to reverse it.
- **Treat contradictions as leads.** An impossible ordering points to a conversion error, a clock problem, or tampering; find out which before you report.

## Common misconceptions

- **"All timestamps are stored in UTC."** Many are, but FAT32, traditional syslog, and many application logs record local time, often without saying which.
- **"A time zone is a fixed offset."** Zones are rules that change with daylight saving time and, occasionally, with law. Apply the rule in effect on the event's date.
- **"Correcting a log's skew is tampering."** Changing the original would be. Recording the raw value and a documented correction beside it is analysis.
- **"If two sources agree, their clocks were right."** They may share an error, such as one upstream time server, or have been converted the same wrong way.
- **"An odd timestamp proves timestomping."** Copies, archive extraction, and clock changes also produce odd values. Corroborate first.

## Try it yourself

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

Build a timeline from this fictional log set for a shop.example server, `web1`, whose operating system is set to UTC.

```text
# web1 auth.log (traditional syslog; server zone UTC)
Oct  5 14:02:11 web1 sshd[2211]: Accepted publickey for deploy from 203.0.113.9 port 50122
# firewall.log (UTC; clock measured 90 s fast at collection)
2026-10-05T14:03:38Z ALLOW tcp 203.0.113.9:50122 -> 192.0.2.20:22
# web1 access.log (Common Log Format, offset included)
203.0.113.9 - - [05/Oct/2026:09:05:40 -0500] "GET /admin/export HTTP/1.1" 200 51200
# app.log (Unix epoch milliseconds)
1791209141123 export_started user=deploy rows=1830
# USB drive E2, FAT32 file times (writer's zone unknown)
export.csv  created 2026-10-05 09:09:12
# lobby camera DVR (local US Central; clock measured 4 min fast)
2026-10-05 09:16:30 motion: front door
```

1. Make a table with columns for source, raw value, conversion, UTC value, and assumption. Convert all six records.
2. Sort the events. Before you corrected it, did the firewall entry come before or after the SSH login it should precede?
3. The syslog line has neither a year nor a zone. Which assumptions did you make, and how could you confirm them?
4. Under which zone assumption for the USB drive does `export.csv` appear before the export even started? What does that suggest about the writer's zone?
5. Name one conclusion that holds under every reasonable assumption and one that depends on a single assumption.

On your own computer, run `date` and `date -u` (or `Get-Date` and `(Get-Date).ToUniversalTime()` in PowerShell) and write down your offset from UTC today. When does it next change?

## Key takeaways

- A timeline turns separate artifacts into an ordered account, so its errors become errors in the story.
- Before using a timestamp, know its format, epoch, precision, zone, producing clock, and the event it really records.
- Convert to UTC with the zone rule for that date, correct measured skew, and keep raw values and assumptions beside the results.
- Test important conclusions against plausible changes in zone and skew assumptions.
- Contradictions point to conversion errors, clock problems, or tampering, and each needs independent evidence to resolve.

## Go deeper

- Read [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339) and its update [RFC 9557](https://www.rfc-editor.org/rfc/rfc9557), then design a timeline column scheme that preserves the difference between UTC, a known offset, a named zone, and an unknown offset.
- Compare how RFC 3227 and [RFC 6302](https://www.rfc-editor.org/rfc/rfc6302) treat clock accuracy. What would a minimum clock-evidence checklist for your organization contain?
- Open question: timestamps in cloud services are produced by many distributed clocks. How should an examiner state the uncertainty of an ordering when two events are recorded less than a second apart by different systems?
