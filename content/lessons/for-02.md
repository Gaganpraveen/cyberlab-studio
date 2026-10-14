---
topicId: FOR-02
title: Filesystem artifacts and metadata
summary: >-
  How file systems separate names, metadata, and content; what modification, access, change, and
  birth timestamps really record; why deleted files linger in unallocated and slack space; and how to
  read these artifacts from an image without overstating what they prove.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish a file's name entry, metadata record, and content blocks, and explain what deletion does to each.
  - Interpret modification, access, change, and birth timestamps on ext4, NTFS, and FAT, including what each does not record.
  - Identify a file's real type from its signature instead of its extension.
  - Explain how known-file hash sets reduce review effort and why a match does not mean a file is harmless.
  - Predict how copying, moving, and editing a file change its timestamps, and test the prediction with stat.
prerequisites: [FOR-01, SYS-04]
concepts:
  - file-system-metadata
  - mac-times
  - inode
  - master-file-table
  - unallocated-space
  - slack-space
  - file-carving
  - file-signature
  - known-file-filtering
labs: [steganography-studio]
keywords:
  - MAC times
  - MACB
  - mtime
  - atime
  - ctime
  - crtime
  - birth time
  - timestamps
  - inode
  - MFT
  - $STANDARD_INFORMATION
  - $FILE_NAME
  - FAT32
  - ext4
  - NTFS
  - deleted file recovery
  - unallocated space
  - slack space
  - file carving
  - file signature
  - magic number
  - NSRL
  - RDS
  - The Sleuth Kit
  - TSK
  - fls
  - istat
  - CFReDS
sources:
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: File System Forensic Analysis (Brian Carrier)
    url: https://www.informit.com/store/file-system-forensic-analysis-9780321268174
    publisher: Addison-Wesley Professional (Pearson)
    license: All rights reserved
    sourceId: carrier-file-system-forensic-analysis
  - title: National Software Reference Library (NSRL)
    url: https://www.nist.gov/itl/csd/secure-systems-and-applications/national-software-reference-library-nsrl
    publisher: National Institute of Standards and Technology (NIST)
  - title: Computer Forensic Reference Data Sets (CFReDS)
    url: https://www.nist.gov/itl/csd/secure-systems-and-applications/computer-forensics-tool-testing-program-cftt/cfreds
    publisher: National Institute of Standards and Technology (NIST)
  - title: Computer Forensics Tool Testing Program (CFTT)
    url: https://www.nist.gov/itl/csd/secure-systems-and-applications/computer-forensics-tool-testing-program-cftt
    publisher: National Institute of Standards and Technology (NIST)
quiz:
  - question: >-
      On an ext4 file system, alice runs chmod on a report but does not edit it. Which timestamp
      changes?
    choices:
      - Modification time (mtime), because the file was changed.
      - Birth time, because the permissions are new.
      - Change time (ctime), because the inode's metadata changed.
      - None, because only content edits update timestamps.
    answer: 2
    explanation: >-
      On Unix-like file systems, ctime records the last change to the inode, such as new permissions,
      a new owner, or a rename. The content did not change, so mtime stays the same. Reading ctime as
      creation time is a classic mistake.
  - question: >-
      A file on a USB drive shows a modification time of 23:38 and a creation time of 23:40 on the
      same evening. Which explanation is most consistent with these values?
    choices:
      - The file was copied onto the drive at about 23:40 from a version last edited at 23:38.
      - The drive's clock ran two minutes fast.
      - The file must have been tampered with, because a file cannot be modified before it exists.
      - The file was deleted and recovered.
    answer: 0
    explanation: >-
      Copy operations commonly keep the source's modification time but give the new copy a fresh
      creation time on the destination. A modification time earlier than the creation time is
      therefore a typical sign of a copy. It is consistent with copying, not proof of it, so the
      examiner looks for corroborating evidence.
  - question: Why can deleted files often be recovered from a hard disk image?
    choices:
      - Operating systems keep a hidden backup of every deleted file.
      - Deletion usually removes the name and marks the space as free, but the content stays until new data overwrites it.
      - Deleted files move to slack space, where they are protected.
      - Write blockers restore deleted files during imaging.
    answer: 1
    explanation: >-
      Deletion changes bookkeeping: the name entry and metadata record are marked unused and the
      blocks return to unallocated space. Until something reuses those blocks, the old bytes are
      still on the disk. Solid-state drives are an exception, because they may erase freed blocks
      soon after deletion.
  - question: >-
      An examiner removes every file whose hash appears in the NSRL Reference Data Set from review.
      What is the main risk?
    choices:
      - NSRL hashes are encrypted and cannot be compared.
      - The NSRL only lists illegal content.
      - Removing known files makes the image's hash change.
      - Known is not the same as harmless; the set includes some tools, such as hacking scripts, that may matter to the case.
    answer: 3
    explanation: >-
      The NSRL describes its data as signatures of known, traceable software, and it states that some
      entries may be considered malicious, such as steganography tools. Filtering out known files saves
      time, but the examiner should still flag known tools that are relevant to the case.
  - question: A file named holiday.jpg begins with the bytes 25 50 44 46 (%PDF). What should the examiner conclude?
    choices:
      - The file is a corrupted JPEG image.
      - The file's content is most likely a PDF document whose name or extension was changed, which is worth noting.
      - The file is encrypted.
      - Nothing, because the extension is what defines a file's type.
    answer: 1
    explanation: >-
      A file signature identifies the format from the content itself. A mismatch between signature and
      extension is a lead worth recording, because it may show an attempt to hide a document, although
      there can be innocent explanations too.
---

## Why it matters

Return to the toy case from [the previous lesson](lesson:FOR-01): a verified image of a USB drive found in a shop.example workstation. Hashing proved the image is exact. Now the investigation needs answers the hash cannot give. Which files are on the drive? Were any deleted? When did each file arrive, and was it created there or copied from somewhere else? Every one of those answers comes from the file system's own records, not from the files' contents.

Those records are rich, but they are easy to misread. On Linux, ctime does not mean creation time. Access times often do not change when someone opens a file. A copy can look older than the moment it was made. NIST SP 800-86 warns that recorded file times can be wrong because the computer's clock was wrong, because the time was not recorded with the precision the examiner expected, or because an attacker altered it. An examiner who knows the rules of each file system can read these artifacts precisely; one who does not can state, with confidence, something false.

## The core idea

A file system is a small database that the operating system keeps on a storage device. It stores three kinds of things, usually in separate places:

1. **Names**: directory entries that map a human-readable name to a metadata record.
2. **Metadata**: one record per file holding its size, owner, permissions, timestamps, and where its content lives. This is the [[file-system-metadata]].
3. **Content**: the data units (blocks or clusters) that hold the file's bytes.

Brian Carrier's model of file-system analysis, widely used in the field, adds two more categories: data about the file system as a whole, such as its size and block size, and application-level structures layered on top, such as a journal.

Think of a library. The catalog card is the name entry, the circulation record is the metadata, and the book on the shelf is the content. Throwing away the card does not remove the book; it only makes the book hard to find. Eventually a new book takes its shelf space. Deleting a file works the same way.

The key assumption is that every file system, operating system version, and configuration has its own rules for when it updates each record. Before you interpret a single timestamp, identify the file system and, where possible, the operating system that wrote it.

## How it works

### Metadata records on three common file systems

- **ext4 (Linux)** stores metadata in an [[inode]], a numbered record holding the owner, permissions, size, timestamps, and the locations of the file's blocks. The name lives only in the directory entry that points to the inode, so one inode can have several names (hard links).
- **NTFS (Windows)** keeps one record per file in the [[master-file-table|Master File Table (MFT)]]. Each record holds attributes: `$STANDARD_INFORMATION` with four timestamps, `$FILE_NAME` with the name, the parent directory, and a second set of four timestamps, and `$DATA` with the content. A small file's content can sit inside the MFT record itself.
- **FAT32 (common on removable media)** puts the name, start cluster, size, and timestamps together in a directory entry, and a separate file allocation table tracks which clusters belong to each file. Long names are stored in extra directory entries next to a short 8.3 name such as `CUSTOM~1.ZIP`.

### What the timestamps record

SP 800-86 defines the modification time as "the last time a file was changed in any way" and the access time as "the last time any access was performed on a file." Together with change and birth times, these are the [[mac-times|MAC times]], often written MACB.

| Letter | ext4 (inode)                  | NTFS (`$STANDARD_INFORMATION`)      | Common trap                                             |
| ------ | ----------------------------- | ----------------------------------- | ------------------------------------------------------- |
| M      | Content last modified (mtime) | Content last modified               | Copy tools may keep the source's value                  |
| A      | Content last accessed (atime) | Content last accessed               | Often updated lazily or not at all                      |
| C      | Inode last changed (ctime)    | MFT record last changed             | Not creation time; permission changes and renames count |
| B      | Inode created (crtime)        | File created, as Windows reports it | A copy gets a new birth time on the destination         |

Several details decide what a value can support:

- **Access times are unreliable by design.** Updating a timestamp on every read costs a disk write, so Linux commonly mounts with `relatime`, which updates atime only when it is older than mtime or ctime, or more than a day old. Windows can delay or disable last-access updates, and its default has changed between versions. Backup, indexing, and antivirus software can also touch files.
- **Copies are new files.** SP 800-86 notes that when a file is copied to a system, "the creation time will become the time the file was copied." Many copy tools keep the modification time, so a fresh copy can show a modification time earlier than its creation time.
- **Precision and time zone vary.** NTFS and ext4 record times in UTC with sub-second precision. FAT32 records local time with no time zone at all, its modification time has two-second granularity, and its access field is a date only. A FAT32 timestamp means little until you establish the time zone of the computer that wrote it.
- **NTFS keeps two sets.** Ordinary programs can rewrite the `$STANDARD_INFORMATION` times through standard interfaces, while the `$FILE_NAME` times are maintained by the file system itself. Disagreement between the two sets is a reason to look closer, a theme picked up in [Timeline reconstruction](lesson:FOR-05).

### Deleted files, unallocated space, and slack

Deleting a file normally changes bookkeeping, not content. The name entry is marked unused, the metadata record is marked free, and the data units return to [[unallocated-space]]. SP 800-86 describes the result: the file "is still stored on the media but is no longer enumerated by the OS," and the operating system may overwrite any part of it at any time. How much survives depends on the file system. Some leave the metadata record pointing at the old blocks until it is reused; others clear those pointers on deletion, so the content can be found only by searching raw space. Solid-state drives add a further limit, because they may erase freed blocks soon after deletion.

[[slack-space|Slack space]] is the unused tail of a file's last block. If a 1,000-byte file occupies a 4,096-byte cluster, the remaining 3,096 bytes may still hold leftovers of whatever was stored there before.

When metadata is gone, [[file-carving]] recovers files by recognizing their content. Many formats begin with a fixed [[file-signature]] (also called a magic number), and some also end with one:

| Format | Signature at the start (hex) | As text  |
| ------ | ---------------------------- | -------- |
| JPEG   | `FF D8 FF`                   | (binary) |
| PNG    | `89 50 4E 47 0D 0A 1A 0A`    | `.PNG`   |
| PDF    | `25 50 44 46`                | `%PDF`   |
| ZIP    | `50 4B 03 04`                | `PK..`   |

Carving finds content without names or timestamps, and it struggles with fragmented or compressed files, so every carved result needs checking. Signatures also expose renamed files: a "photo" whose content starts with `%PDF` is a document.

### Known-file filtering

A full laptop image holds tens of thousands of operating-system and application files, often far more, that nobody needs to read. NIST's National Software Reference Library (NSRL) publishes a Reference Data Set, which it describes as "a collection of digital signatures of known, traceable software applications." Matching the image's file hashes against it removes known files from review, an approach called [[known-file-filtering]]. Known is not the same as harmless: NIST notes that the set includes hash values "which may be considered malicious," such as steganography tools and hacking scripts. Labs also keep hash sets of known contraband or known malware to flag files rather than hide them.

## Worked example

Bob examines the working copy of image `E1` from case 2026-0142 with The Sleuth Kit, an open-source command-line toolkit that Brian Carrier created. He first confirms that the working copy's SHA-256 still matches the value recorded at acquisition, then works only on that copy.

```bash
mmls E1-work.raw                          # partition table: one FAT32 partition at sector 2048
fsstat -o 2048 E1-work.raw                # file-system type, volume label, cluster size
fls -r -o 2048 E1-work.raw                # every name, recursively; deleted entries are marked *
istat -o 2048 E1-work.raw 9               # metadata for the entry at metadata address 9
icat -o 2048 E1-work.raw 9 > recovered.zip  # content found through that entry
```

His simplified notes from `fls` and `istat` are below. The times are as stored, in the unknown local time of whichever computer wrote them.

| Entry                                      | Status    | Size   | Created             | Modified            | Accessed   |
| ------------------------------------------ | --------- | ------ | ------------------- | ------------------- | ---------- |
| `notes.txt`                                | Allocated | 1.2 KB | 2026-09-28 10:02:14 | 2026-09-28 10:05:30 | 2026-10-03 |
| `customers_2026-09.csv`                    | Allocated | 2.1 MB | 2026-10-03 23:40:58 | 2026-10-03 23:38:12 | 2026-10-03 |
| `_USTOM~1.ZIP` (long name `customers.zip`) | Deleted   | 640 KB | 2026-10-03 23:41:16 | 2026-10-03 23:41:16 | 2026-10-03 |

Bob works through what each row supports.

1. **The CSV was probably copied, not created, on the drive.** Its modification time precedes its creation time by about three minutes, the usual mark of a copy that kept the source's modification time.
2. **A ZIP file existed and was deleted.** FAT marks a deleted directory entry by overwriting the first byte of its short name, which tools typically display as `_`, while the long-name entries beside it still spell `customers.zip`. FAT records no deletion time, so these entries cannot say when the file was deleted.
3. **The recovered content is what it claims to be.** `recovered.zip` begins with `50 4B 03 04`, opens without errors, and lists one file, `customers_2026-09.csv`, of the same size as the allocated CSV. Recovery through the entry worked here because the file was stored in one contiguous run; a fragmented file would have needed carving and more caution.
4. **The times need a time zone before they mean anything.** FAT32 stored local time. Workstation W-17's settings show US Central Time, which in October is five hours behind UTC, so 23:40:58 local becomes 04:40:58 UTC on October 4, about four and a half hours before alice found the drive. Bob records that conversion, and the assumption that the drive was last written by W-17, as explicit assumptions.

What Bob cannot say matters as much. The timestamps come from the clock of the computer that wrote them, so he must check W-17's clock against a reference before relying on them. Nothing on the drive identifies who was at the keyboard. Those questions move to other evidence, such as logon records and the workstation's own file system.

## In practice

- **Identify before you interpret.** Record the file-system type, its version where known, and the operating system that most likely wrote it. Timestamp behavior depends on all three.
- **Corroborate every important timestamp.** Look for a second, independent record of the same event, such as a log entry, an application's own internal date, or the other NTFS timestamp set.
- **Use hash sets as filters, not verdicts.** Filtering known files speeds review, but tools in the NSRL can still matter, and a file missing from every set is merely unknown, not suspicious.
- **Validate recovery and carving tools.** NIST's tool-testing program has specifications for deleted-file recovery and file carving because tools differ in what they find and in the false results they produce.
- **Practice on simulated evidence.** NIST's Computer Forensic Reference Data Sets (CFReDS) offer "documented sets of simulated digital evidence," so students and labs can rehearse without touching anyone's personal data.

## Common misconceptions

- **"ctime is the creation time."** On Unix-like systems it is the inode change time. Birth time is a separate field, available only on file systems and tools that support it.
- **"The access time shows when someone last opened the file."** Access updates are often delayed, skipped, or disabled, and software can touch files without a person doing anything.
- **"Deleting a file erases it."** Usually only the bookkeeping changes. Content survives until it is overwritten, except where solid-state drives erase freed blocks.
- **"The extension tells you what a file is."** The extension is part of the name and anyone can change it. The signature in the content is far more reliable.
- **"Timestamps are facts."** They are values written by a clock that may be wrong, through rules that vary, and they can be edited. Treat them as evidence to corroborate.

## Try it in the lab

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

[The lab](lab:steganography-studio) shows metadata of another kind: [[document-metadata|EXIF-style fields]] that an image carries inside its own content, not in the file system's records. On the **Metadata** tab, read the eight fields, then click **Inspect image metadata** to mark the four that leak: a GPS latitude and longitude that pin the capture location, an Artist field with an author name and an internal badge number, and a UserComment holding a staging backup key. Answer "Name the location leak" and submit the flag from "Read the leaked metadata." Then apply this lesson. If the image were copied to another drive, which of these values would travel with it, and which file-system times would change? Like a FAT32 time, the DateTimeOriginal value carries no time zone; what would you need before putting it on a timeline? (The lab's other tab, LSB steganography, goes with [Encoding, hashing, and encryption](lesson:CRY-01).)

**Without the lab.** Work in a new, empty folder on your own computer. Predict each result before you run the command, then compare.

```bash
mkdir meta-lab && cd meta-lab
echo "first line" > a.txt
stat a.txt                    # note Access, Modify, Change, and Birth (if shown)
cat a.txt; stat a.txt         # did Access change?
chmod 600 a.txt; stat a.txt   # which time moved: Modify or Change?
cp a.txt b.txt; cp -p a.txt c.txt
stat b.txt c.txt              # which times did each copy keep?
mv c.txt d.txt; stat d.txt    # a rename on the same file system
touch -t 202001011200 b.txt; stat b.txt   # what can touch rewrite, and what can it not?
printf 'just text' > photo.jpg; file photo.jpg
```

On macOS, use `stat -x` and `stat -f '%SB'` for the birth time. On Windows, compare `CreationTime`, `LastWriteTime`, and `LastAccessTime` from `Get-Item a.txt | Format-List *Time*` after copying a file in File Explorer.

Write a short table of every prediction you got wrong and why. Then answer: which single timestamp would be hardest for an ordinary user to fake, and what would they need to change to fake it anyway?

If your instructor provides a prepared, simulated image such as one from CFReDS, list it with `fls -r`, pick one deleted and one allocated entry, and record their metadata with `istat`, stating the file system and time zone assumptions you made.

## Key takeaways

- File systems keep names, metadata, and content separately; deletion usually removes the bookkeeping, not the bytes.
- M, A, C, and B times each answer a different question, and ctime on Unix-like systems is not creation time.
- Copies are new files: a creation time later than the modification time often marks a copy.
- FAT32 stores local time without a zone, so convert only under a stated assumption about the writing computer.
- Signatures reveal real file types, and known-file hash sets speed review without proving anything is harmless.

## Go deeper

- Carrier's [File System Forensic Analysis](https://www.informit.com/store/file-system-forensic-analysis-9780321268174) explains FAT, NTFS, and Ext2/Ext3 structures byte by byte and introduces the five-category analysis model used above.
- Read the specifications for deleted-file recovery and file carving on the [NIST CFTT site](https://www.nist.gov/itl/csd/secure-systems-and-applications/computer-forensics-tool-testing-program-cftt) and compare how they define a correct result.
- Open question: on solid-state and flash storage, wear leveling and early erasure of freed blocks make recovery unpredictable. How should an examiner report the absence of deleted data on such media?
