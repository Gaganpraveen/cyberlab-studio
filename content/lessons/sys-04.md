---
topicId: SYS-04
title: Operating-system permissions
summary: Learn how an operating system decides whether a process may read, write or run a file, from user and group identities and permission bits to set-user-ID programs and Linux capabilities, and how to design and test a least-privilege permission model.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Read a file's owner, group and permission bits with ls -l, and a process's identity with id, then predict whether an access will succeed.
  - Apply the kernel's owner, group and other rule, including cases where an owner has fewer rights than everyone else.
  - Explain how set-user-ID programs and Linux capabilities grant privilege, and why flaws in them lead to privilege escalation.
  - Design a least-privilege permission model for a fictional service and test it against required and forbidden actions.
prerequisites: [FND-05, IAM-01]
concepts: [setuid, privilege-escalation]
labs: [os-permissions]
keywords:
  - file permissions
  - permission bits
  - mode bits
  - rwx
  - chmod
  - chown
  - umask
  - UID
  - GID
  - effective user ID
  - set-user-ID
  - SUID
  - setgid
  - sticky bit
  - root
  - superuser
  - Linux capabilities
  - CAP_DAC_OVERRIDE
  - CAP_NET_BIND_SERVICE
  - discretionary access control
  - DAC
  - POSIX ACL
  - CWE-269
  - CWE-250
sources:
  - title: 'credentials(7): Linux manual page'
    url: https://man7.org/linux/man-pages/man7/credentials.7.html
    publisher: Linux man-pages project (man7.org)
  - title: 'path_resolution(7): Linux manual page'
    url: https://man7.org/linux/man-pages/man7/path_resolution.7.html
    publisher: Linux man-pages project (man7.org)
  - title: 'capabilities(7): Linux manual page'
    url: https://man7.org/linux/man-pages/man7/capabilities.7.html
    publisher: Linux man-pages project (man7.org)
  - title: 'CWE-269: Improper Privilege Management'
    url: https://cwe.mitre.org/data/definitions/269.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
quiz:
  - question: 'A file shows ----r--r-- 1 alice staff report.txt. Who can read it with cat?'
    choices:
      - Only alice, because she owns it.
      - Everyone, including alice, because the group and other classes allow reading.
      - Every user except alice (and root), because alice falls in the owner class, which has no permissions.
      - Nobody, because the owner bits come first and deny everyone.
    answer: 2
    explanation: The kernel picks exactly one class for each process. alice matches the owner class, so only the owner bits apply to her, and they are empty. Members of staff use the group bits and everyone else uses the other bits, which both allow reading. Root bypasses the check.
  - question: Why is /usr/bin/passwd a set-user-ID root program, and why does that make it security-critical?
    choices:
      - It runs with root's effective user ID so it can update the root-owned password database, so any flaw in how it handles a user's input can hand that user root's power.
      - It runs as the calling user so it cannot damage other accounts, which makes it harmless.
      - Set-user-ID encrypts the program so that only root can read it.
      - It lets root run the program as any other user to test their passwords.
    answer: 0
    explanation: Set-user-ID makes the process take the file owner's effective identity, here root. An unprivileged user controls the program's arguments, environment and input, while the program holds root's rights. That combination is why set-user-ID programs are a classic source of privilege escalation.
  - question: A web server must listen on port 443 and do nothing else that needs privilege. Which setup best follows least privilege on Linux?
    choices:
      - Run the whole server as root, since only root can use low ports.
      - Make the server binary set-user-ID root.
      - Add the server's account to the administrators' sudo group.
      - Run it under its own unprivileged account that holds only CAP_NET_BIND_SERVICE.
    answer: 3
    explanation: Linux splits root's powers into capabilities. CAP_NET_BIND_SERVICE allows binding ports below 1024 and nothing more, so a compromise of the server yields an unprivileged account instead of root. The other choices all give the server far more power than its job needs.
  - question: In the flawed draft, alice can edit export.sh, which the scheduler runs nightly as the orders service account. Why is that a privilege-escalation path?
    choices:
      - It is not, because alice still cannot read db.conf with her own account.
      - Whatever alice writes into the script will run with the orders account's rights, including reading db.conf.
      - It lets alice change the script's owner to root.
      - Editing a script automatically makes it set-user-ID.
    answer: 1
    explanation: Privileged code that runs something an unprivileged user can modify lends its privileges to that user. alice, and anyone in the dev group, can act as orders by editing the script. The fix is to make the script writable only by root.
  - question: 'bob can read export files in a directory shown as drwxr-s--- orders support, and bob is in the support group. Can bob delete a file there?'
    choices:
      - Yes, because he can read the file.
      - Yes, because the setgid bit gives group members full control.
      - No, because deleting a file needs write and search permission on the directory, and the group has only read and search.
      - No, because only root can delete files on Linux.
    answer: 2
    explanation: Deleting or renaming changes the directory, not the file, so the directory's permissions decide. The group class here has r-x plus setgid, so bob can list and open files but not remove them. The setgid bit only makes new files inherit the support group.
---

## Why it matters

Every time a program opens a file, sends a signal or binds a network port, the operating system decides whether to allow it. Those decisions are often the last line of defense. Suppose an attacker exploits a bug in a web application and can now run code as the application's account. What happens next depends almost entirely on operating-system permissions. Can that account read the database password? Can it modify a script that an administrator's job runs later?

MITRE catalogs mistakes in this area as CWE-269, Improper Privilege Management: assigning, changing, tracking or checking privileges incorrectly, so that an actor ends up with more control than intended. MITRE also points out that privilege escalation describes an impact, not a root cause. Permission flaws seldom make headlines on their own. Instead they turn a small foothold into a [[privilege-escalation|privilege escalation]], and a privilege escalation into full control of the system.

This lesson explains how a Unix-like kernel, Linux in the examples, makes its decision. It then has you design and test a permission model for a fictional service so that each account can do its job and nothing more.

## The core idea

Every access involves three things: a **subject** (a running process, acting for some user), an **object** (a file, directory or other resource) and an **operation** (read, write or execute). The [[kernel]] compares the subject's identity with the object's permissions on every access. That is the principle of [[complete-mediation]] built into the operating system.

Think of an office building. Your badge says who you are and which teams you belong to, and each door has its own rule about whose badge opens it. The badge reader does not care how important you are; it checks the badge against that door's rule, every time.

Three assumptions matter:

1. **The kernel is correct and uncompromised.** If an attacker controls the kernel, permissions mean nothing.
2. **Identities are accurate.** If an attacker runs code as alice, the kernel gives that code alice's rights.
3. **The superuser is special.** On traditional Unix systems, root (user ID 0) bypasses most permission checks, so the goal is to need root as rarely as possible.

The design goal is [[least-privilege]]: give each account and each process exactly the rights its job needs. Unix file permissions are *discretionary*: the owner of a file decides who else may use it.

## How it works

### Who is asking: process credentials

Users and groups have numeric identifiers: a user ID (UID) and one or more group IDs (GIDs). Run `id` to see yours. As the credentials(7) manual page describes, a Linux process carries several of them:

- the **real** UID and GID, identifying who owns the process;
- the **effective** UID and GID, which decide its permissions for things such as sending signals and using shared memory;
- a **saved set-user-ID** and **saved set-group-ID**, which let a set-user-ID program switch its privilege off and back on;
- on Linux, a **filesystem** UID and GID, which decide file access and normally equal the effective IDs;
- a list of **supplementary groups**, which also count in permission checks.

A child process inherits its parent's credentials. Everything you start from your shell runs as you, which is exactly why a malicious program you run can read your files.

### What is protected: owner, group and mode

Every file has an owner, a group and nine permission bits, which `ls -l` shows as three sets of `rwx`:

```text
-rw-r----- 1 orders support 2048 Oct 14 02:00 daily-orders.csv
```

| Part of the line | Value     | Meaning                                           |
| ---------------- | --------- | ------------------------------------------------- |
| First character  | `-`       | File type: `-` is a regular file, `d` a directory |
| Characters 2-4   | `rw-`     | Owner may read and write                          |
| Characters 5-7   | `r--`     | Group members may read                            |
| Characters 8-10  | `---`     | Everyone else has no access                       |
| Third field      | `orders`  | The owner                                         |
| Fourth field     | `support` | The group                                         |

The same letters mean different things for files and directories:

| Bit | On a regular file   | On a directory                                           |
| --- | ------------------- | -------------------------------------------------------- |
| `r` | Read the contents   | List the names of the entries                            |
| `w` | Change the contents | Create, delete or rename entries (together with `x`)     |
| `x` | Run it as a program | Search: use the directory in a path to reach its entries |

Two consequences surprise many people. Deleting a file changes its directory, so it needs write and search permission on the directory, not on the file. And opening `/srv/shop/config/db.conf` needs search permission on every directory along that path.

### The decision rule

The path_resolution(7) manual page gives the order in which Linux decides:

1. If the process holds the relevant privilege, for example because it runs as root, most checks are bypassed. Even then, a file can only be run if at least one of its execute bits is set.
2. Otherwise, if the process's filesystem UID equals the file's owner, the **owner** bits decide.
3. Otherwise, if the process's filesystem GID or one of its supplementary groups equals the file's group, the **group** bits decide.
4. Otherwise, the **other** bits decide.

Exactly one class applies. If you own a file whose owner bits are empty, you are denied even when the group and other bits allow access. The sequence below shows two processes opening the same configuration file, which has mode `rw-r-----`, owner `root` and group `orders`.

```sequence
title: The kernel checks one class per access
participant B as bob's process
participant K as Kernel
participant O as orders service
B -> K: open db.conf for reading
note K: bob: not root, not owner, not in group orders
K -x B: Denied (other bits: ---)
O -> K: open db.conf for reading
note K: orders is in group orders: group bits r--
K --> O: Allowed: file descriptor returned
```

### Borrowing privilege: set-user-ID programs

Some ordinary tasks need privilege. Changing your password means updating a password database that only root may write. Unix solves this with the [[setuid|set-user-ID]] bit. When a program file with this bit is executed, the new process takes the file owner's UID as its effective UID. In `ls -l` the bit appears as an `s` in the owner's execute position:

```text
-rwsr-xr-x 1 root root   64152 May 30  2024 /usr/bin/passwd
-rw-r----- 1 root shadow  1379 Oct  3 05:42 /etc/shadow
```

The price is that a set-user-ID root program runs with root's power while processing input chosen by an unprivileged user: its arguments, its environment and the files it reads. Any flaw in that handling can become a privilege escalation, so every such program belongs to the system's most trusted code. The related set-group-ID bit does the same for the group, and on a directory it makes new files inherit the directory's group, which is useful for shared folders.

### Splitting root: Linux capabilities

The capabilities(7) page explains that traditional Unix has only two kinds of process: privileged ones (effective UID 0), which bypass kernel permission checks, and unprivileged ones, which are checked in full. Linux divides root's privileges into separate units called [[linux-capability|capabilities]], which can be enabled and disabled independently:

| Capability             | What it allows                                        |
| ---------------------- | ----------------------------------------------------- |
| `CAP_NET_BIND_SERVICE` | Bind to network ports below 1024                      |
| `CAP_DAC_OVERRIDE`     | Bypass file read, write and execute permission checks |
| `CAP_CHOWN`            | Change the owner and group of any file                |
| `CAP_SYS_ADMIN`        | A very broad set of administrative operations         |

A web server that only needs port 443 can run as an unprivileged account holding `CAP_NET_BIND_SERVICE` alone. The manual page calls `CAP_SYS_ADMIN` overloaded, and its notes for kernel developers call it "the new root": granting it gives away much of root's power.

### Beyond mode bits

Nine bits cannot express every policy, such as "alice and the backup account may read this, nobody else." Linux file systems support POSIX [[access-control-list|access control lists]], managed with `getfacl` and `setfacl`, which add entries for named users and groups. Windows protects files and other objects with access control lists checked against the user and group identifiers in each process's access token. The model differs in detail, but the questions are the same: who is asking, what do they want, and what does the object allow?

### How privilege escalation happens

Most operating-system privilege escalations fall into a few categories, which also make a good audit checklist:

- **Privileged code trusts something a less privileged user can change**, such as a script, configuration file or directory that a root-owned job uses.
- **A privileged program mishandles untrusted input**, such as a set-user-ID program or a root service with a memory-safety bug ([SYS-02](lesson:SYS-02)).
- **Grants are broader than needed**, such as services running as root, unnecessary capabilities, or secrets readable by everyone.
- **The kernel itself has a flaw**, which no file permission can stop.

## Worked example

The `shop.example` store runs a nightly export. The **orders** [[service-account|service account]] runs the web application and, through the scheduler, the script `export.sh`, which writes order reports for the support team. Developer **alice** (group `dev`) maintains the script, and support agent **bob** (group `support`) reads the reports.

**Step 1: write the requirements, including the forbidden actions.**

| Id  | Requirement                                                                     |
| --- | ------------------------------------------------------------------------------- |
| R1  | orders can read the database password in `config/db.conf`.                      |
| R2  | No one else except root can read `db.conf`.                                     |
| R3  | orders can create report files in `exports/`.                                   |
| R4  | bob can read the reports but cannot change or delete them.                      |
| R5  | No one except root can change `export.sh`, because it runs with orders' rights. |
| R6  | alice can read `export.sh` to review it.                                        |

**Step 2: test the first draft.** A teammate proposes:

```text
-rw-r--r--  root   orders   /srv/shop/config/db.conf
-rwxrwxr-x  alice  dev      /srv/shop/bin/export.sh
drwxrwxrwx  orders orders   /srv/shop/exports
```

Walk each requirement through the decision rule:

- **R2 fails.** bob is neither the owner nor in group `orders`, so the other bits apply, and they include `r`. Any account on the system, including a compromised one, can read the password.
- **R5 fails.** alice owns the script and the `dev` group can write it. Whatever she writes runs as orders, so alice, and anyone who compromises any `dev` account, can act as the service account and read `db.conf`. This is the classic "privileged code runs something a user can change" escalation.
- **R4 fails.** The directory is writable by everyone, so any user can delete or replace reports, and bob could plant a fake one.

**Step 3: repair the model.**

```text
drwxr-x---  root   orders   /srv/shop/config
-rw-r-----  root   orders   /srv/shop/config/db.conf
-rwxr-xr-x  root   root     /srv/shop/bin/export.sh
drwxr-s---  orders support  /srv/shop/exports
```

The `s` on `exports` is the set-group-ID bit, so new reports belong to group `support`. The export job also runs with a `umask` of `027`, which strips write from the group and everything from others, so each new report is created as `-rw-r----- orders support`.

**Step 4: retest every requirement.**

| Id  | Actor and action                  | Class that applies | Bits                        | Result                           |
| --- | --------------------------------- | ------------------ | --------------------------- | -------------------------------- |
| R1  | orders reads `db.conf`            | group (`orders`)   | `r--`                       | Allowed                          |
| R2  | bob reads `db.conf`               | other              | `---`                       | Denied, at the directory already |
| R3  | orders creates a report           | owner of `exports` | `rwx`                       | Allowed                          |
| R4  | bob reads, then deletes, a report | group (`support`)  | file `r--`, directory `r-x` | Read allowed; delete denied      |
| R5  | alice edits `export.sh`           | other              | `r-x`                       | Denied                           |
| R6  | alice reads `export.sh`           | other              | `r-x`                       | Allowed                          |

Every required action is allowed and every forbidden one is denied. Root still bypasses all of this, which is one more reason to keep the number of root jobs small.

## Defenses

- **Separate accounts by job.** Give every service its own unprivileged account and keep group membership minimal. *Limits:* accounts still share whatever the "other" bits allow, so sensitive files need restrictive modes too.
- **Make restrictive settings the default.** A `umask` such as `027` or `077`, and directories that deny "other" by default, apply [[fail-safe-defaults]]. *Limits:* a single later `chmod` can undo them, so audit periodically.
- **Avoid running as root.** Grant individual capabilities instead of root, and drop privileges as soon as start-up work is done. *Limits:* broad capabilities such as `CAP_SYS_ADMIN` are nearly as dangerous as root.
- **Minimize and audit set-user-ID programs.** Keep an inventory of set-user-ID files, remove those you do not need, and patch the rest promptly. *Limits:* the ones you must keep remain high-value targets.
- **Protect everything privileged code trusts.** Scripts, configuration files, libraries and every directory on their paths should be writable only by the privileged owner. *Limits:* the trusted set is easy to underestimate, so trace what each privileged job reads and runs.
- **Add mandatory controls where needed.** Systems such as SELinux and AppArmor enforce a system-wide policy that even a file's owner cannot override, and sandboxes restrict processes further ([SYS-05](lesson:SYS-05)). *Limits:* they add complexity and still depend on a correct kernel.

## Common misconceptions

- **"If everyone can read a file, its owner can too."** Exactly one class applies. An owner with empty owner bits is denied.
- **"Deleting a file needs write permission on the file."** It needs write and search permission on the directory, because deletion changes the directory.
- **"A set-user-ID program runs as the user who starts it."** It runs with the file owner's effective identity, which is the whole point and the whole risk.
- **"`chmod 777` is a harmless way to fix a permission error."** It lets every account, and every compromised process, change or replace the file. Find the one class that needs access and grant only that.
- **"Permissions protect files from root."** Root bypasses ordinary permission checks. Protecting data from administrators takes other controls, such as encryption with keys they do not hold.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

In [the lab](lab:os-permissions), you are `lowpriv`, an ordinary user outside the owner and group of each fictional system file, so the other bits decide.

1. **Spot the risky modes.** `/opt/backup/run.sh` is `777` and runs nightly as root; `/etc/shadow` is `644`. Answer "Read the octal."
2. **Escalate.** Click **Overwrite & trigger root cron**, the worked example's R5 failure with root in place of orders, and **cat /etc/shadow**, the R2 failure. Each reveals a flag.
3. **Repair.** Predict whether `604` would protect the hashes. In the **chmod** column, set `755` on the script and `640` on `/etc/shadow`. Both attacks now fail.
4. **Name the special bit** in `/usr/bin/checkpw` (`-rwsr-xr-x`, `4755`).

**Without the lab.** Work as your normal user; root bypasses the checks.

1. Run `id` and `ls -l /etc/passwd /etc/shadow /usr/bin/passwd`, and explain each mode, including the `s` on `passwd`.
2. In a scratch directory, create `notes.txt` and try `cat notes.txt` after `chmod 640`, `044` and `404` on it. Why does `044` lock you, the owner, out?
3. Make a directory `box` holding `inside.txt` and run `chmod 600 box`. `ls box` lists the name, but `cat box/inside.txt` fails without search (`x`) permission. Restore it with `chmod 700 box`.
4. Run `grep Cap /proc/self/status`: a normal user's `CapEff` is all zeros.
5. On paper, add a `backup` account to the worked example that must read the reports but never `db.conf`. Propose the smallest change, then retest every requirement.

## Key takeaways

- The kernel checks every access by comparing a process's credentials with the object's owner, group and permission bits.
- Exactly one class (owner, group or other) applies to each access, and directories need search permission along the whole path.
- Set-user-ID programs and capabilities lend privilege to code that handles untrusted input, which makes them prime places for privilege escalation.
- Least privilege means separate accounts, restrictive defaults, minimal capabilities and nothing writable that privileged code trusts.
- Test a permission model against what must be allowed and what must be denied, one actor and action at a time.

## Go deeper

- The [path_resolution(7)](https://man7.org/linux/man-pages/man7/path_resolution.7.html) page describes every step of resolving a path, including symbolic links and the permission checks at each directory. Which steps could an attacker influence if a directory on the path were writable?
- The [capabilities(7)](https://man7.org/linux/man-pages/man7/capabilities.7.html) page defines the permitted, effective, inheritable, bounding and ambient sets and how they change across program execution. Why did Linux need so many sets to make capabilities usable?
- MITRE's [CWE-269](https://cwe.mitre.org/data/definitions/269.html) lists more specific children, such as CWE-250 (Execution with Unnecessary Privileges) and CWE-266 (Incorrect Privilege Assignment). Which of them, if any, describes each flaw in the worked example's first draft, and where in CWE would you look for a better fit?
