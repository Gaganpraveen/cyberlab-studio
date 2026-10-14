---
topicId: MAL-02
title: Static analysis of benign teaching artifacts
summary: Practice the first steps of static malware analysis (hashing, identifying a file's real type, reading header fields, extracting strings, and writing a YARA rule) on harmless files you create yourself or that ship with your operating system.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Compute SHA-256 hashes to identify a file exactly, and explain why the same program can still have many different hashes.
  - Identify a file's real type from its magic number and header fields instead of its name.
  - Extract printable strings, including UTF-16 strings, and separate meaningful leads from noise.
  - Write and test a YARA rule that matches a benign marker, and measure its false positives on ordinary files.
prerequisites: [MAL-01, CRY-01]
concepts: [static-analysis, magic-number, yara-rule, eicar-test-file]
labs: []
keywords:
  - basic static analysis
  - static malware analysis
  - file hash
  - SHA-256
  - file signature
  - magic bytes
  - Portable Executable
  - PE header
  - ELF header
  - strings
  - YARA
  - YARA-X
  - EICAR
  - triage
sources:
  - title: 'YARA documentation: Writing YARA rules'
    url: https://yara.readthedocs.io/en/stable/writingrules.html
    publisher: VirusTotal
  - title: YARA-X is stable
    url: https://virustotal.github.io/yara-x/blog/yara-x-is-stable/
    publisher: VirusTotal
  - title: Anti Malware Testfile
    url: https://www.eicar.org/download-anti-malware-testfile/
    publisher: European Institute for Computer Antivirus Research (EICAR)
  - title: PE Format
    url: https://learn.microsoft.com/en-us/windows/win32/debug/pe-format
    publisher: Microsoft
  - title: 'CISA Alert TA17-132A: Indicators Associated With WannaCry Ransomware'
    url: https://www.cisa.gov/ncas/alerts/TA17-132A
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Practical Malware Analysis: The Hands-On Guide to Dissecting Malicious Software'
    url: https://www.nostarch.com/malware.htm
    publisher: No Starch Press
    license: All rights reserved
    sourceId: sikorski-honig-practical-malware-analysis
quiz:
  - question: An email attachment is named report.pdf, but its first two bytes are 4D 5A ("MZ"). What should an analyst conclude?
    choices:
      - It is a PDF document, because the extension says so.
      - It is probably a Windows executable disguised with a document name, so it should be handled as a program.
      - It is a corrupted PDF that should simply be deleted.
      - Nothing, because the first bytes of a file are random.
    answer: 1
    explanation: The extension is only part of the name. "MZ" is the signature at the start of Windows executables, while a real PDF begins with "%PDF-". When the name and the content disagree, trust the content, and treat the mismatch itself as a warning sign.
  - question: A colleague recompiles an unchanged source file and finds that the new binary's SHA-256 hash differs from the old one. What is the best explanation?
    choices:
      - SHA-256 is unreliable and should be replaced with MD5.
      - The compiler must have inserted malware.
      - Hash functions give random output on each run.
      - The build changed some bytes, such as an embedded timestamp, and a hash changes completely when any byte changes.
    answer: 3
    explanation: A cryptographic hash identifies exact bytes. Builds often embed timestamps or other varying data, so the same program can produce many hashes. That is why hash matching finds only exact copies and why analysts also use patterns such as YARA rules.
  - question: Running strings on a file prints almost nothing readable, and most of the file looks like random bytes. What is the most defensible next step?
    choices:
      - Treat the content as possibly compressed or encrypted, and plan a safe dynamic analysis.
      - Mark the file as clean, because it contains no suspicious text.
      - Mark the file as malicious, because all malware lacks strings.
      - Rename the file so the operating system will open it.
    answer: 0
    explanation: Compressed or encrypted content looks random and hides readable text. That is a reason for closer inspection, not a verdict either way. Running the file in a controlled environment can reveal what static inspection cannot.
  - question: A YARA rule whose only condition is the string "https://" matched 317 of 699 ordinary programs in a test. What does this show?
    choices:
      - Nearly half of those programs are malware.
      - The rule has a false-negative problem.
      - The rule is too broad, so it produces false positives, and it needs more distinctive strings or structural conditions.
      - YARA cannot scan program files.
    answer: 2
    explanation: A string that appears in many legitimate programs cannot separate the target from benign files. Every match on an ordinary program is a false positive. Better rules combine several distinctive strings with checks such as file size or header values, and are tested against known-good files.
  - question: Why do antivirus products detect the EICAR test file even though it is harmless?
    choices:
      - Because it secretly contains a small virus.
      - Because vendors agreed to treat this agreed-upon test string as if it were malware, so people can check that detection works without real malware.
      - Because any short text file looks suspicious to antivirus software.
      - Because it deletes files when opened.
    answer: 1
    explanation: EICAR and CARO created the test file so that anti-malware software can be tested safely. It is printable ASCII text with no viral code, and products are expected to react to it as if it were a virus.
---

## Why it matters

When responders find a suspicious file, the safest first questions are the ones they can answer without running it. Which exact file is this? What kind of file is it really? What does it say about itself? Does it match anything we already know? Answering them is called [[static-analysis|static analysis]], and it is the usual first stage of a malware investigation. It is quick, it needs no special lab, and it never gives the file a chance to act.

Its results also travel. During the 2017 WannaCry outbreak, CISA published an alert listing indicators of the malware and a YARA rule describing it, so defenders everywhere could check their own systems for the same files without ever handling a live sample.

In this course you practice only on benign teaching artifacts: the EICAR test file concept, a harmless script you write yourself, and ordinary programs that ship with your operating system. The techniques are the ones analysts use on real samples. Only the risk is removed.

## The core idea

Static analysis means examining a file without executing it. Its counterpart, [[dynamic-analysis|dynamic analysis]], runs the file in a controlled environment and watches what it does; [Dynamic-analysis methodology](lesson:MAL-03) covers it. Static analysis rests on three assumptions:

1. You hold a copy of the file and will not execute it.
2. Anything in the file may have been put there to mislead: the name, the extension, timestamps, even the text inside.
3. The results are evidence and leads, not verdicts.

Think of a mailroom handling a suspicious package. Staff record its tracking number, compare the label with what the X-ray shows, read any writing on it, and check it against a watch list, all without opening it. Each check maps to a technique:

| Question                        | Technique                        | Typical tools                                   |
| ------------------------------- | -------------------------------- | ----------------------------------------------- |
| Which exact file is this?       | Cryptographic hash               | `sha256sum`, `shasum -a 256`, `Get-FileHash`    |
| What kind of file is it really? | Magic number and header fields   | `file`, `readelf`, `Format-Hex`                 |
| What does it say about itself?  | Printable strings                | `strings`                                       |
| Does it match known patterns?   | YARA rules                       | `yara`                                          |

## How it works

### Identity: cryptographic hashes

A [[hash-function|cryptographic hash]] such as SHA-256 maps a file of any size to a fixed 256-bit value. Changing a single bit changes the result completely, and nobody knows how to find two different files with the same SHA-256 hash. A hash is therefore a precise name for a file. Analysts record it first, use it to look up earlier reports, and share it as an [[indicator-of-compromise]] without sharing the file. Older reports often list MD5 or SHA-1 hashes. Practical collision attacks exist against both, so use them only as lookup keys for old data, never as proof that two files are identical.

Hashes are also brittle. They identify exact bytes, not behavior. Recompiling the same source code, changing an embedded timestamp, or appending one byte all produce a new hash, as the worked example shows. A hash match is strong evidence of identity, but the absence of a match proves nothing.

### Type: magic numbers and header fields

A file's extension is just part of its name. Its real type is determined by its contents, and most formats begin with a fixed byte pattern called a [[magic-number|magic number]]:

| Format                                  | First bytes (hex)         | As text    |
| --------------------------------------- | ------------------------- | ---------- |
| Windows executable (Portable Executable) | `4D 5A`                  | `MZ`       |
| Linux executable (ELF)                  | `7F 45 4C 46`             | `.ELF`     |
| PDF document                            | `25 50 44 46 2D`          | `%PDF-`    |
| ZIP archive (also `.docx` and `.jar`)   | `50 4B 03 04`             | `PK..`     |
| PNG image                               | `89 50 4E 47 0D 0A 1A 0A` | `.PNG....` |

The `file` command identifies types by matching patterns like these. YARA's documentation uses the same idea in a rule condition: `uint16(0) == 0x5A4D` is true for files that begin with "MZ". The bytes are `4D 5A`, but `uint16` reads them little-endian, so the integer is `0x5A4D`.

After the magic number, a header describes how the rest of the file is laid out. Microsoft's PE Format specification defines the header of Windows programs:

- **MS-DOS stub.** A tiny legacy program at the start of the file. At offset `0x3C` it stores the file offset of the PE signature, the four bytes `50 45 00 00` ("PE" and two zero bytes).
- **COFF file header.** Twenty bytes, starting with `Machine` (`0x8664` for x64, `0xAA64` for ARM64, `0x14C` for Intel 386), `NumberOfSections`, and `TimeDateStamp`, which the specification defines as seconds since January 1, 1970, recording when the file was created. Build tools write that value, and some write a non-time value there, so treat it as a claim, not a fact.
- **Optional header.** Despite its name, every program has one. Its `Magic` field is `0x10B` for 32-bit (PE32) or `0x20B` for 64-bit (PE32+) programs. `AddressOfEntryPoint` says where execution starts, and `Subsystem` says whether the program is a graphical (2) or console (3) application.
- **Section table and data directories.** Sections hold code, data, and resources such as icons and version information. The import table lists the libraries and functions the program expects Windows to supply, which hints at what it can do. The specification warns that section names are not reliable guides to their contents.

Linux programs use the ELF format, with the same kind of header. Here is part of `readelf -h /bin/ls` on one Linux system:

```text
ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Entry point address:               0x6d30
```

Every field is a claim to check against the others. A file named `.pdf` with an "MZ" header, or a "calculator" whose imports include network functions, deserves a closer look.

### Content: printable strings

The `strings` tool prints every run of printable characters at least a minimum length long (GNU `strings` defaults to 4). Programs carry a lot of text: usage and error messages, file paths, URLs and domain names, configuration keys, imported function names, and version details. Each is a lead. The mechanism is simple enough to write yourself:

```python
import re
import sys

data = open(sys.argv[1], "rb").read()
for match in re.finditer(rb"[\x20-\x7e]{6,}", data):  # 6+ printable ASCII bytes
    print(f"{match.start():#08x}  {match.group().decode('ascii')}")
```

Two cautions apply. First, Windows software often stores text as UTF-16, with two bytes per character, which default `strings` output misses. GNU `strings -e l` reads 16-bit little-endian text, and YARA strings take a `wide` modifier for the same reason. Second, strings are cheap to plant and easy to hide. Text can be stored encoded or built only at run time, and some samples compress or encrypt their real code (packing). Compressed or encrypted bytes look random, with entropy near the maximum of 8 bits per byte, and contain few readable strings. A file with almost no strings is not clean. It is a candidate for dynamic analysis.

### Matching: YARA rules

A [[yara-rule|YARA rule]] describes a family of files with patterns and a Boolean condition. A rule has a name, an optional `meta` section of notes for humans, an optional `strings` section, and a required `condition`. The documentation lists text strings with modifiers such as `nocase`, `wide`, `ascii`, and `fullword`, hex strings with wildcards, and regular expressions. Conditions can count matches, check their positions, and test properties such as `filesize`. The original YARA is now in maintenance mode. VirusTotal declared its successor, YARA-X, stable with version 1.0.0 on June 4, 2025, and future development happens there; its rules keep a familiar syntax.

Rule quality is measured in errors. A [[false-positive]] (matching a benign file) wastes analysts' time, and a [[false-negative]] (missing a target) gives false comfort. Strings found in many programs make rules noisy, and strings that change with every build make them brittle. Good rules combine several distinctive strings with structural checks and are tested against a collection of known-good files before use. Antivirus signatures are patterns of this kind, maintained at scale.

### The EICAR test file

The [[eicar-test-file|EICAR test file]] lets people check that anti-malware software responds correctly without using real malware. EICAR and CARO, two antivirus research organizations, created it. It is a 68-character string of printable ASCII that contains no viral code, and antivirus products deliberately treat it as if it were a virus. A conforming test file starts with the string and may be followed only by whitespace, up to 128 bytes in total. EICAR also publishes the file inside a ZIP archive and a nested ZIP, to test whether scanners look inside archives. This lesson does not reproduce the string. Use it only on a machine where your instructor has approved it, and expect your scanner to quarantine it: that is the test passing.

## Worked example

Bob writes a harmless Python script to practice on. It prints two lines and contains a unique marker string:

```python
#!/usr/bin/env python3
"""A harmless teaching script for CyberLab static-analysis practice."""

MARKER = "CYBERLAB-TEACHING-SAMPLE-7F3A"


def main() -> None:
    print("Hello from a harmless teaching script")
    print("Questions? See https://shop.example/help")


if __name__ == "__main__":
    main()
```

**Step 1: hash it.** Bob saves the script as `hello_lab.py`, then saves a copy as `hello_lab_v2.py` with one added exclamation mark. The two files differ by one byte, yet their hashes share no visible pattern:

```bash
$ sha256sum hello_lab.py hello_lab_v2.py
f3d872269c114e67eaedb08b79afeb23587d2acd99cd5e74feaf6390469cc5d3  hello_lab.py
561af488990815de39c5f1fd8af600fc69562efac0cfbc9069f16762b2c7367e  hello_lab_v2.py
```

**Step 2: make a binary and identify it.** Compiling the script to Python bytecode gives a harmless binary file. `file` recognizes it from its magic number and decodes its header:

```bash
$ python3 -m py_compile hello_lab.py
$ file __pycache__/hello_lab.cpython-313.pyc
__pycache__/hello_lab.cpython-313.pyc: Byte-compiled Python module for CPython 3.12 or newer, timestamp-based, .py timestamp: Wed Oct 14 05:21:50 2026 UTC, .py size: 304 bytes
```

The header records the source file's modification time. When Bob touched the source file and compiled again, the code was identical but four header bytes changed, and so did the hash (`3f4cdc09…` became `d39250be…`). This is the brittleness of hashes in miniature.

**Step 3: extract strings.** Running `strings -n 6` (or the Python snippet above) on the bytecode shows the docstring, the marker, both messages, the URL, and names from the code such as `MARKER` and `__main__`. Some lines carry stray characters, such as `zA` before the docstring. Those are bytes from the file's internal structure that happen to fall in the printable range. Learning to ignore that noise is part of the skill.

**Step 4: write a YARA rule.** Bob writes a rule that needs both his marker and his greeting, inside a small file:

```text
rule CyberLab_Teaching_Marker
{
    meta:
        description = "Matches the harmless marker in a CyberLab teaching script"
        author = "bob"
        date = "2026-10-14"

    strings:
        $marker = "CYBERLAB-TEACHING-SAMPLE-7F3A" ascii wide
        $greeting = "harmless teaching script" nocase

    condition:
        filesize < 10KB and $marker and $greeting
}
```

**Step 5: test for misses and false alarms.** For comparison, he also writes a deliberately broad rule whose only condition is the string `https://`. Scanning his files and the 699 ordinary programs in `/usr/bin` on one Linux system gave:

| Files scanned                           | Marker rule                     | Broad rule  |
| --------------------------------------- | ------------------------------- | ----------- |
| `hello_lab.py`                          | Match (marker at byte offset 106) | Match     |
| `hello_lab_v2.py` (one byte changed)    | Match                           | Match       |
| `hello_lab.cpython-313.pyc`             | Match (marker at byte offset 163) | Match     |
| 699 programs in `/usr/bin`              | 0 matches                       | 317 matches |

The hash changed between versions, but the rule still matched, which is the advantage of patterns over hashes. The broad rule's 317 matches are all false positives. A rule is only as good as its strings.

## In practice

Analysts run these steps as a fixed triage routine: hash, look up, identify the type, read the headers, extract strings, scan with rules, then decide whether dynamic analysis is needed. A few habits make the results trustworthy:

- **Work on copies and record hashes before and after.** If the hash of your working copy changes, you changed the evidence.
- **Note tool versions.** `file`, `strings`, and YARA interpret formats through databases and parsers that change between releases.
- **Treat uploads as publication.** Submitting a file to a public scanning service shares it with that service, and the file may contain someone's confidential data. Check policy before uploading anything that is not a public sample.
- **Write down what you did not check.** A short list of open questions is more useful to the next analyst than a confident guess.

Static analysis has hard limits. It cannot see behavior that appears only at run time, such as code downloaded later or decrypted in memory. Packing defeats string extraction. Headers, timestamps, and strings can all be forged. Hashes find only exact copies, and YARA rules decay as attackers change their code. These limits are why the next lesson adds dynamic analysis.

## Common misconceptions

- **"The extension tells you the file type."** The contents do. Check the magic number and header, and treat a mismatch as a warning sign.
- **"No suspicious strings means the file is safe."** Text may be encoded, built at run time, or packed away. Few strings means "look closer."
- **"No hash match means the file is new or benign."** A hash finds only exact copies. Unknown is not the same as benign.
- **"A YARA match proves it is malware."** A match proves that a pattern was found. What it means depends on how well the rule was written and tested.
- **"The header timestamp says when the malware was built."** Build tools write that field, and it can be forged or meaningless.
- **"The EICAR file is a virus."** It is harmless text by design, which is exactly why it is safe for testing.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. Use only files you created yourself or ordinary programs that came with your operating system, and never modify system files.

1. **Hash your own artifact.** Write a short harmless script with a unique marker string. Compute its SHA-256 hash (`sha256sum` on Linux, `shasum -a 256` on macOS, `Get-FileHash` in PowerShell). Change one character, hash it again, and compare.
2. **Read a real header.** On Linux, run `file /bin/ls` and `readelf -h /bin/ls`. On Windows, run `Format-Hex -Path C:\Windows\System32\notepad.exe | Select-Object -First 20` in PowerShell, find `MZ` at offset 0, and read the four bytes at offset `0x3C` (little-endian) to locate the `PE` signature. On macOS, run `file /bin/ls`. Record the machine type and whether the program is 32-bit or 64-bit.
3. **Extract strings.** Run `strings` (or the Python snippet above) on that system program. Pick five strings that reveal something about the program, and explain what each one tells you.
4. **Write and test a rule.** Write a YARA rule for your marker. Test it against your script, an edited copy, and a folder of ordinary files. Then write a deliberately broad rule and count its false positives. If you cannot install YARA, write the rules on paper and predict the results.
5. **Optional, with your instructor's approval:** on a lab virtual machine, download the EICAR test file from EICAR's site and confirm that the installed antivirus detects it.

## Key takeaways

- Static analysis examines a file without running it. It is the safe first stage of an investigation and produces leads, not verdicts.
- A SHA-256 hash names exact bytes. One changed byte, or a new build, gives a new hash.
- Magic numbers and headers reveal a file's real type and declared properties. Extensions and timestamps are claims.
- Strings are cheap leads that can be planted or hidden. Few strings is a reason to look closer.
- YARA rules match patterns across variants. Test every rule against known-good files to measure its false positives.

## Go deeper

- **The PE specification.** Microsoft's PE Format page documents the import table, sections, and data directories. Compare the imports of two system programs and explain their differences.
- **Rule engineering.** Read the YARA documentation on hex strings, wildcards, and the `xor` and `base64` modifiers, then follow YARA-X's development. Open question: how should a team measure a rule set's precision and recall when it lacks a labeled collection of malicious samples?
- **Method.** _Practical Malware Analysis_ (Sikorski and Honig) teaches static analysis in depth. Its tools date from 2012, but its method is still standard.
