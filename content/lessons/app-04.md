---
topicId: APP-04
title: Path traversal and file access
summary: Learn how a file name from a request can climb out of its folder through dot-dot segments, absolute paths, or symbolic links, and how to prove that a file handler stays inside an allowlisted folder.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how dot-dot segments, absolute paths, and symbolic links let a constructed path escape a base folder.
  - Replace a vulnerable file read with an indirect reference, or with an allowlist plus a resolved-path containment check, in Python, Java, or Go.
  - Recognize unsafe path checks such as string-prefix comparison and joining a base folder with absolute input.
  - Build a temporary dataset and tests that prove a file reader stays inside its folder.
  - Describe the write-side risks of uploads and archive extraction and the controls that limit them.
prerequisites: [APP-02, SYS-04]
concepts: [path-traversal, symbolic-link, indirect-reference-map, canonicalization, allowlist]
keywords:
  - directory traversal
  - dot-dot-slash
  - CWE-22
  - CWE-23
  - CWE-36
  - realpath
  - getCanonicalPath
  - toRealPath
  - is_relative_to
  - os.Root
  - file upload
  - archive extraction
sources:
  - title: Path traversal (Web Security Academy)
    url: https://portswigger.net/web-security/file-path-traversal
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
  - title: "CWE-22: Improper Limitation of a Pathname to a Restricted Directory ('Path Traversal')"
    url: https://cwe.mitre.org/data/definitions/22.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 'CWE-180: Incorrect Behavior Order: Validate Before Canonicalize'
    url: https://cwe.mitre.org/data/definitions/180.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
    sourceId: cwe-top-25
  - title: Input Validation Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
quiz:
  - question: 'In Python, what file does open(os.path.join("/srv/reports", name)) open when name is "/etc/hosts"?'
    choices:
      - /srv/reports/etc/hosts, because join always keeps the base folder.
      - /etc/hosts, because joining with an absolute path discards everything before it.
      - Nothing, because os.path.join raises an error for absolute input.
      - /srv/reports/hosts, because join keeps only the last name.
    answer: 1
    explanation: os.path.join and pathlib both restart from an absolute component, so the base folder silently disappears. Java's Path.resolve and Node's path.resolve behave the same way. Never let raw input reach a join without validation and a containment check.
  - question: A reader checks resolved.startswith("/srv/reports") using plain string comparison. Which path wrongly passes?
    choices:
      - /srv/reports/may.csv
      - /etc/passwd
      - /srv/reports_old/x.csv
      - /srv/secret.txt
    answer: 2
    explanation: As strings, /srv/reports_old/x.csv starts with /srv/reports, although it is a different folder. Compare whole path components instead, for example with Python's is_relative_to on resolved paths or Java's Path.startsWith.
  - question: The allowlist [a-z0-9_-]+\.csv accepts link.csv, a symbolic link inside the reports folder that points to a file outside it. Which control stops the read?
    choices:
      - Resolving the path, following links, and checking that the result is still inside the folder.
      - Checking that the name ends in .csv.
      - Deleting every ../ from the name before opening it.
      - Decoding the name a second time before checking it.
    answer: 0
    explanation: The name is perfectly well formed; the escape happens when the file system follows the link. Only a check on the fully resolved path, or an operating-system API that refuses to leave the folder, catches it. This is why PortSwigger recommends two layers.
  - question: What is the most robust design for a "download report" feature?
    choices:
      - Strip ../ and leading slashes from the requested name.
      - Keep a denylist of sensitive file names such as passwd.
      - Offer only a drop-down list in the browser, so users cannot type a name.
      - Accept a report id and map it to a file path chosen by the server, so input never becomes a path.
    answer: 3
    explanation: With an indirect reference, the user picks from known reports and the server alone builds the path. Stripping sequences and denylists miss variants, and a browser drop-down is bypassed by sending the request directly.
  - question: A reader resolves and checks a path, then opens it. Other users can write into the reports folder. Why can this still fail?
    choices:
      - Python caches resolved paths, so the check always uses stale data.
      - The file can be swapped for a link between the check and the open, a time-of-check to time-of-use race.
      - Path.resolve returns a random result when files change.
      - Symbolic links only exist on Windows, so the check is skipped on Linux.
    answer: 1
    explanation: A separate check and use leave a window in which the file system can change. Keep untrusted writers out of the folder, and prefer APIs that enforce containment at open time, such as Go's os.Root.
---

## Why it matters

Applications constantly turn requests into file names: download a monthly report, show a product image, load a template or a language file, save an upload, unpack an archive. [[path-traversal|Path traversal]], also called directory traversal, happens when input that becomes part of a file path leads the program outside the folder it meant to use. MITRE catalogs the weakness as [[cwe|CWE]]-22, "Improper Limitation of a Pathname to a Restricted Directory," and it ranked sixth on the 2025 CWE Top 25.

PortSwigger's Web Security Academy lists what a successful read can expose: application source code and data, credentials for back-end systems, and sensitive operating-system files. When the vulnerable code writes files instead of reading them, an attacker may be able to change the application's data or behavior and ultimately take full control of the server.

The bug is easy to write because file paths look like plain strings. They are not. A path is a small instruction that the operating system interprets when the file is opened, and some of its instructions say "go up a level," "start from the root," or "continue somewhere else."

> [!ETHICS] Only test systems you own or have written permission to test.

## The core idea

Start with the assumptions. The application owns a base folder, say `/srv/reports`. It builds a path from that base and a name taken from the request. The operating system resolves the path when the file is opened and checks permissions against the application's account, not the user's.

The file system interprets three things in a path that matter here. A `..` segment means "the parent folder." A leading `/` (or a drive letter such as `C:\` on Windows) means "start from the root, ignoring everything before." A [[symbolic-link|symbolic link]] is a file whose content is another path, which the system follows automatically. Any of them can carry a constructed path out of the base folder, so the illustrative name `../../etc/passwd` reaches a system file rather than a report.

There are two sound strategies. The best is to never let input become a path: the user picks a report by id, and the server maps the id to a file it chose, an [[indirect-reference-map|indirect reference map]]. When a name must come from input, use two layers, as both PortSwigger and MITRE recommend: validate the name against an [[allowlist]], then [[canonicalization|canonicalize]] the full path and confirm that it is still inside the base folder. A library's closed stacks work the first way: patrons fill in a catalog number, never a set of directions through the building.

## How it works

### How a constructed path escapes

| Escape route        | Illustrative name               | What happens                                                    |
| ------------------- | ------------------------------- | --------------------------------------------------------------- |
| Dot-dot segments    | `../../etc/passwd`              | Each `..` climbs one folder above the base                      |
| Absolute path       | `/etc/passwd`                   | Many join functions discard the base folder entirely            |
| Symbolic link       | `link.csv`, a link to `../secret.txt` | The name looks harmless; the file system follows the link |
| Encoded separators  | `..%2F` arriving in a URL       | Decoded once by the framework; see [canonicalization](lesson:APP-02) |
| Platform syntax     | `..\` or `C:\` on Windows       | Windows also accepts backslashes and drive letters              |

The absolute-path row surprises many developers. In Python, `os.path.join("/srv/reports", "/etc/passwd")` returns `/etc/passwd`, and `pathlib` behaves the same way. Java's `Path.resolve` and Node's `path.resolve` also return the absolute argument. Node's `path.join` keeps the base, but then normalizes `..` segments, so `path.join("/srv/reports", "../../etc/passwd")` is `/etc/passwd`.

### The vulnerable pattern and its repair

```python
import os
import re
from pathlib import Path

def read_report_vulnerable(base: Path, name: str) -> str:
    # VULNERABLE: the request decides the path; nothing keeps it inside base.
    return open(os.path.join(base, name)).read()

REPORT_NAME = re.compile(r"[a-z0-9_-]{1,64}\.csv")

def read_report(base: Path, name: str) -> str:
    # Layer 1: the name must look like a report file name and nothing more.
    if not REPORT_NAME.fullmatch(name):
        raise PermissionError("unexpected report name")
    # Layer 2: resolve the final path, following links, and require containment.
    root = base.resolve()
    target = (root / name).resolve()
    if not target.is_relative_to(root):
        raise PermissionError("outside the reports folder")
    return target.read_text()
```

The allowlist rejects separators, `..`, absolute paths, and odd names in one step. `resolve()` turns the path into an absolute path with every `..` and symbolic link resolved, which is the canonical form required by CWE-180's rule: canonicalize first, then check. `is_relative_to` compares whole path components.

### Why string-prefix checks fail

A check written as `str(target).startswith("/srv/reports")` accepts `/srv/reports_old/x.csv`, because the strings share a prefix even though the folders differ. The same check on a path that was never resolved also accepts `/srv/reports/../secret.txt`. In Java, `Path.startsWith` compares components, while `String.startsWith` compares characters:

```java
// VULNERABLE: a character-prefix test on a path that was never resolved.
Path target = base.resolve(name);
if (!target.toString().startsWith(base.toString())) throw new SecurityException("outside");

// FIXED: resolve links, normalize, and compare path components.
Path root = base.toRealPath();
Path real = root.resolve(name).normalize().toRealPath();   // follows symbolic links
if (!real.startsWith(root)) throw new SecurityException("outside the reports folder");
```

Go 1.24 added `os.Root`, which opens files relative to a directory and refuses any name that would leave it, including `..`, absolute paths, and symbolic links that point outside:

```go
root, err := os.OpenRoot("/srv/reports")
if err != nil {
	return err
}
defer root.Close()
f, err := root.Open(name) // "../secret.txt" fails: path escapes from parent
```

### Check, then use: the race in between

Resolving a path and then opening it are two separate steps. If anyone who is not trusted can write into the folder, they might replace a checked file with a link in the moment between those steps, a [[toctou|time-of-check to time-of-use (TOCTOU)]] race. Keep untrusted writers out of directories you serve, and prefer APIs that enforce containment at the moment of opening, such as `os.Root`.

### Writes are worse: uploads and archives

Saving files raises the stakes, because a traversal can overwrite code or configuration. OWASP's Input Validation Cheat Sheet says to treat an uploaded file's name and content type as untrusted metadata, and notes that "an allowed extension alone does not establish safe content." Store uploads under names the server generates, such as random identifiers, and keep the original name only as data. Archive formats carry their own file names, so an entry named with `..` segments or an absolute path can land outside the extraction folder. Check every entry's resolved destination before writing it, or use your archive library's safe-extraction options.

## Worked example

The activity: test allowlisted file handling in a temporary dataset. A temporary directory gives you a throwaway file system to attack, so the tests touch nothing real. Build a dataset with one legitimate report, a secret next to the reports folder, a sibling folder whose name shares a prefix, and a symbolic link that leaves the folder:

```python
import tempfile
from pathlib import Path

def make_dataset(tmp: Path) -> Path:
    reports = tmp / "reports"
    reports.mkdir()
    (reports / "may.csv").write_text("month,total\nmay,120\n")
    (tmp / "secret.txt").write_text("not for users\n")
    (tmp / "reports_old").mkdir()
    (tmp / "reports_old" / "x.csv").write_text("old data\n")
    (reports / "link.csv").symlink_to(tmp / "secret.txt")   # a link that leaves the folder
    return reports

with tempfile.TemporaryDirectory() as tmp:
    reports = make_dataset(Path(tmp))
    print(read_report(reports, "may.csv"))
```

Running both readers against the same agreed inputs gives these results:

| Input                          | Vulnerable reader                    | Repaired reader        | Layer that stopped it |
| ------------------------------ | ------------------------------------ | ---------------------- | --------------------- |
| `may.csv`                      | Returns the report                   | Returns the report     | (allowed)             |
| `../secret.txt`                | Returns the secret                   | Rejected               | Name allowlist        |
| Absolute path to `secret.txt`  | Returns the secret                   | Rejected               | Name allowlist        |
| `../reports_old/x.csv`         | Returns the old data                 | Rejected               | Name allowlist        |
| `link.csv`                     | Returns the secret through the link  | Rejected               | Containment check     |
| `"may.csv\x00.png"`            | Error: embedded null byte            | Rejected               | Name allowlist        |
| `nope.csv`                     | Error that reveals the full path     | Same error             | (the handler's job)   |

Two lessons come out of the table. First, each layer covers a blind spot of the other: the allowlist accepted `link.csv`, which only the containment check caught, while the containment check alone would happily serve a stray file inside the folder, such as a hidden `.env`, that the allowlist refuses. Second, error handling is part of the design. Both readers raise a not-found error that names the server's full path, which leaks information, so the request handler should log the detail and return a plain "not found."

Turn each row into an automated test, and run the suite on every change. If the feature can switch to report ids mapped to server-chosen paths, none of the attack rows can even be expressed, because the user no longer sends a name.

## Defenses

| Defense                                         | What it does                                            | Limits                                                         |
| ----------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------- |
| Indirect reference map                          | Input selects an id; the server chooses the path        | Needs a table of known files                                   |
| Allowlisted file names                          | Rejects separators, `..`, absolute paths, and odd names | Names that pass can still be links                             |
| Resolve, then check containment by component    | Catches `..`, absolute paths, and link escapes          | Separate check and use leave a race window                     |
| Containment at open time (`os.Root`, directory handles) | The operating system refuses to leave the folder | Platform- and language-specific                                |
| Least privilege, chroot, or a container         | The account cannot read what it does not need           | Files the account needs remain exposed                         |
| Server-generated names for uploads and checked archive entries | Prevents writes outside the folder         | Every write path must use it                                   |
| Generic errors and logging                      | Hides internal paths; reveals probing                   | Detection, not prevention                                      |

CWE-22 lists the same core mitigations: accept only file names that match a strict allowlist, canonicalize with a built-in function such as `realpath()` in C before validating, map fixed ids to actual files, and run with least privilege inside a confinement mechanism such as chroot, AppArmor, or SELinux. These controls are [[defense-in-depth|defense in depth]]: an allowlist or an indirect reference keeps bad names out, and containment and [[least-privilege|least privilege]] limit what a mistake can reach.

## Common misconceptions

- **"Removing `../` from the input fixes it."** Deleting sequences can leave new ones behind, and it does nothing about absolute paths, encodings, or links. Reject instead of repairing.
- **"A `startsWith` check on the path is enough."** A character prefix accepts sibling folders, and an unresolved path still contains `..` and links. Compare resolved paths by component.
- **"Joining with the base folder keeps me inside it."** In Python, Java, and Node's `resolve`, an absolute argument replaces the base.
- **"Requiring a `.csv` extension makes the name safe."** The extension says nothing about where the path leads or what the file contains.
- **"Only reads are dangerous."** Writes from uploads, archive extraction, and export features can overwrite code and configuration.

## Try it yourself

Use Python 3.9 or later on your own machine; everything runs inside a temporary directory that is deleted afterward.

1. Copy `make_dataset`, `read_report_vulnerable`, and `read_report` into one file. Before running, predict each row of the results table, then check your predictions.
2. Write a third reader that keeps only the containment check, without the allowlist. Which rows still pass, and which new name inside the folder would it serve that the full version refuses?
3. Add two inputs of your own, such as a name with a trailing space or an uppercase `MAY.CSV`, and explain each outcome.
4. If you have Go 1.24 or later, rebuild the reader with `os.OpenRoot` and `root.Open`, and run the same inputs against it.

## Key takeaways

- A path is interpreted at open time: `..`, absolute paths, and symbolic links can all carry it outside the base folder.
- Best: never let input become a path; map ids to server-chosen files.
- Otherwise use two layers: an allowlist on the name, then a component-wise containment check on the fully resolved path.
- String-prefix checks and joins with absolute input are classic traps; test for them explicitly.
- Treat writes, uploads, and archive extraction as part of the same problem, and run with least privilege.

## Go deeper

- CWE-22 has two children, CWE-23 (relative path traversal) and CWE-36 (absolute path traversal). Map each row of the worked example's table to one of them, and identify which rows neither covers.
- Check-then-open designs leave a race window. Study how Linux's `openat2` system call can restrict path resolution to stay beneath a directory, and how Go's `os.Root` builds on directory handles, then compare their guarantees with the resolve-and-check approach in this lesson.
- Open question: file systems that compare names without regard to case, or that treat different Unicode spellings of a name as one file, can make two distinct strings open the same file. How should an allowlist and a uniqueness check be written for such a file system, given the lessons of [canonicalization](lesson:APP-02)?
