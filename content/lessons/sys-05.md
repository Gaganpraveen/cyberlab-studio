---
topicId: SYS-05
title: Process isolation and sandboxing
summary: Learn how virtual memory, the kernel and system calls keep processes apart, how sandboxes such as seccomp filters and Chromium's broker design take away even more rights, and how to compare processes, containers and virtual machines as trust boundaries with real limitations.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how virtual memory, processor privilege modes and system calls isolate processes from each other and from the kernel.
  - Describe how a broker-and-target sandbox splits privilege, using Chromium's design as the example.
  - Compare processes, sandboxed processes, containers and virtual machines by what they share and what an escape requires.
  - Identify the trust boundaries in a system design and state the limitations of each.
  - Observe sandboxing on your own machine by reading a process's seccomp status and running a program in seccomp strict mode.
prerequisites: [SYS-01, SYS-04, FND-03]
concepts: [process-isolation, sandbox, kernel, system-call]
labs: []
keywords:
  - isolation
  - sandboxing
  - privilege separation
  - least privilege
  - trust boundary
  - user mode
  - kernel mode
  - system call
  - syscall
  - seccomp
  - seccomp-bpf
  - Linux namespaces
  - containers
  - virtual machine
  - hypervisor
  - broker process
  - restricted token
  - sandbox escape
  - confused deputy
  - Chromium sandbox
  - Android application sandbox
sources:
  - title: 'seccomp(2): Linux manual page'
    url: https://man7.org/linux/man-pages/man2/seccomp.2.html
    publisher: Linux man-pages project (man7.org)
  - title: 'namespaces(7): Linux manual page'
    url: https://man7.org/linux/man-pages/man7/namespaces.7.html
    publisher: Linux man-pages project (man7.org)
  - title: Sandbox (Chromium design document)
    url: https://chromium.googlesource.com/chromium/src/+/main/docs/design/sandbox.md
    publisher: The Chromium Authors
  - title: Application Sandbox (Android Open Source Project)
    url: https://source.android.com/docs/security/app-sandbox
    publisher: Android Open Source Project
  - title: 'The Case for Memory Safe Roadmaps'
    url: https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps
    publisher: CISA, NSA, FBI and international partners
    license: No explicit license found (marked TLP:CLEAR)
quiz:
  - question: What stops one ordinary process from reading another process's memory directly?
    choices:
      - Each process encrypts its own memory with a separate key.
      - The kernel gives each process its own page tables, and the processor translates every access through them, so another process's memory has no address in its space.
      - The C compiler inserts checks that refuse to dereference other processes' pointers.
      - Processes take turns using memory, so they never run at the same time.
    answer: 1
    explanation: Isolation between processes comes from virtual memory. A process can only name addresses in its own mappings, which the kernel controls and the hardware enforces. To reach anything else, it must make a system call, and the kernel checks it.
  - question: In Chromium's sandbox design, why can a compromised renderer not simply open the user's documents?
    choices:
      - The renderer is written in a memory-safe language.
      - The operating system hides the user's documents from every program.
      - The renderer has no network access, so stolen files could not leave anyway.
      - The renderer runs with a heavily restricted token and must ask the broker, which applies the target's policy before acting on its behalf.
    answer: 3
    explanation: The design assumes sandboxed code is malicious. Its restricted token makes almost every resource unreachable directly, and permitted actions go through the broker, which checks each request against policy. The broker is therefore the code that must be most careful.
  - question: Which statement best compares a container with a virtual machine as an isolation boundary?
    choices:
      - Containers share the host's kernel, so a kernel flaw or risky configuration can cross the boundary, while a virtual machine runs its own kernel behind a hypervisor.
      - Containers and virtual machines are equally isolated, because both use namespaces.
      - Virtual machines share the host kernel, while containers each run their own kernel.
      - Containers cannot be escaped, because namespaces hide the host completely.
    answer: 0
    explanation: Namespaces, control groups and seccomp limit what a containerized process can see and do, but every container still calls into the same host kernel. A virtual machine's guest has its own kernel, and an escape generally needs a flaw in the hypervisor, a smaller and more tightly specified interface.
  - question: In the worked example, why does the web application still validate the thumbnail that the sandboxed preview worker returns?
    choices:
      - Because PNG files are always malformed.
      - Because the sandbox encrypts its output, which must be decrypted first.
      - Because the worker may have been compromised by a malicious PDF, so its output is untrusted data crossing into a more privileged process.
      - Because seccomp corrupts data written through pipes.
    answer: 2
    explanation: A trust boundary runs in both directions. The sandbox protects the web application only if the application treats everything the worker sends back as attacker-controlled. Otherwise the attacker can use the worker's output to attack the privileged side.
  - question: A seccomp filter allows the open system call. Why can it not restrict which file names may be opened?
    choices:
      - Because seccomp only works for programs written in C.
      - Because the filter sees system-call numbers and raw argument values, and a file name is passed as a pointer to memory the filter does not read.
      - Because file names are encrypted by the kernel.
      - Because open is always allowed by the kernel, whatever the filter says.
    answer: 1
    explanation: A seccomp filter inspects the call number and the register values of the arguments. A path is a pointer to a string in the process's memory, which could even change after the check, so path-based policy belongs in a broker, in file permissions or in a mandatory access control system instead.
---

## Why it matters

Software will always contain bugs, including the memory-safety bugs in [SYS-01](lesson:SYS-01) through [SYS-03](lesson:SYS-03). Isolation decides how far the damage spreads. A web browser parses untrusted pages from anywhere on the internet, so modern browsers do that work in sandboxed processes: a compromised renderer still cannot read the user's files directly. Mobile platforms take the same approach for every app: Android, for example, runs each app under its own user identity in a kernel-enforced application sandbox.

Isolation is not a cure, though. CISA and its partners, while recommending sandboxing for code that cannot yet move to memory-safe languages, note that it adds complexity and that sandbox escapes do occur. Knowing what a boundary actually separates, and what it still shares, is the skill this lesson builds.

## The core idea

An isolation boundary has two parts: a **wall** that code on one side cannot cross directly, and a **mediator** that checks every request to cross. For processes, the wall is [[virtual-memory|virtual memory]] and the mediator is the [[kernel]]. For a browser sandbox, the wall is a set of operating-system restrictions and the mediator is a privileged broker process.

Think of a bank. Customers never walk into the vault; they pass requests through a teller's window, and the teller decides what to hand back. That only works if the teller checks every request and the vault has no hidden door.

Isolation applies [[least-privilege]] to running code. **Privilege separation** splits one program into parts with different privileges: the part that handles untrusted input gets the fewest rights, and a small, carefully written part keeps the rest.

Two assumptions underlie every boundary in this lesson:

1. **The mediator is correct.** A bug in the kernel, broker or hypervisor can open the wall from the inside.
2. **The sides share nothing the attacker can use.** Anything shared, such as a kernel, files, a network or even processor caches ([SYS-08](lesson:SYS-08)), is a potential path across.

## How it works

### The process boundary

Every process runs in its own virtual address space, set up by the kernel and enforced by the processor. Application code also runs in an unprivileged processor mode, in which it cannot change page tables, talk to devices or touch kernel memory. To do anything beyond computing on its own memory, such as opening a file, sending a packet or starting a program, a process makes a [[system-call]]: a controlled entry into the kernel, which checks the request, for example against file permissions ([SYS-04](lesson:SYS-04)), and then carries it out or refuses.

This gives [[process-isolation]] its shape. Processes cannot touch each other's memory, and every effect on the outside world passes through the kernel. The system-call interface is therefore the kernel's [[attack-surface]]: hundreds of entry points, reachable by any process, that must all handle hostile input correctly.

Process isolation between two programs run by the *same* user is weaker. The kernel generally lets a user debug, signal and inspect their own processes, and both processes can read and write all of that user's files. Sandboxes exist to take away those remaining rights.

### Sandboxes: removing rights a process does not need

A [[sandbox]] runs code with fewer rights than its user has. On Linux, sandboxes combine several kernel features:

- **[[seccomp]] filters.** The seccomp(2) system call restricts which system calls a process may make. In *strict* mode only `read`, `write`, `_exit` and `sigreturn` remain, and any other call kills the thread, or the whole process if it has only one thread. In *filter* mode a small BPF program decides for each call whether to allow it, return an error, kill the process, or report it. The manual page recommends allow-lists over deny-lists. A filter sees the call number and the raw argument values only, so it cannot inspect a string that an argument points to.
- **[[linux-namespace|Namespaces]].** A namespace gives a process its own view of a global resource. The namespaces(7) page lists types for mount points, process IDs, network interfaces and user IDs, among others. A process in a new mount and network namespace can see only the files and network that its creator chose to give it.
- **Dropped privileges.** The sandboxed process runs as an unprivileged user with no [[linux-capability|capabilities]] and with the `no_new_privs` flag set, so it cannot regain privilege by running a set-user-ID program. Installing a seccomp filter requires that flag or `CAP_SYS_ADMIN`.
- **Mandatory access control.** Policies such as SELinux restrict even what a process's own user could normally do.

Platforms package these ideas. Android's application sandbox assigns each app its own user ID and runs it in its own process, so apps are separated by the same kernel-enforced rules that separate users. Android layers SELinux policy and seccomp filters on top.

### Privilege separation: the broker pattern

Chromium's sandbox design shows privilege separation in a large program. The design document describes two kinds of process on Windows. The **broker**, which is always the browser process, holds the user's normal rights, defines each target's policy and performs permitted actions on its behalf. The **targets**, such as the renderers that parse web pages, run with a restricted token: nearly all of its security identifiers are set to deny-only, it holds no privileges, and its integrity level is Untrusted. A job object adds limits, for example on creating child processes and reading the clipboard, and an invisible alternate desktop keeps targets away from the user's windows.

The design states its threat model bluntly: assume the sandboxed code is malicious. A renderer that wants something outside its sandbox must ask the broker over inter-process communication, and the broker decides. The sequence below shows a fictional renderer of a page from `shop.example`. The user chooses a file to upload, and the broker hands the renderer access to that one file only.

```sequence
title: A sandboxed renderer asks its broker for access
participant R as Renderer (sandboxed)
participant K as Operating system
participant B as Browser (broker)
R -x K: Open alice's documents folder: access denied
note B: alice picks invoice.pdf in the upload dialog
R -> B: Please give me the file alice chose
note B: Policy check: alice chose this file
B --> R: A handle to invoice.pdf only
R -> B: Also give me alice's saved passwords
B -x R: Refused: not allowed by the policy
```

The broker is now the most security-critical code in the browser. If it can be talked into acting on a request it should refuse, the sandbox is bypassed without any operating-system bug. A privileged program tricked into misusing its authority for a less privileged caller is called a *confused deputy*.

### Comparing boundaries

| Boundary                 | Wall and mediator                                   | Still shared                       | An escape usually needs                              | Relative cost   |
| ------------------------ | --------------------------------------------------- | ---------------------------------- | ---------------------------------------------------- | --------------- |
| Process, same user       | Virtual memory; kernel                              | Kernel, all of the user's files    | Nothing beyond the user's own rights                 | Low             |
| Sandboxed process        | Virtual memory plus seccomp, namespaces or a broker | Kernel, whatever the policy allows | A kernel bug or a broker or policy flaw              | Low to moderate |
| [[container\|Container]] | Namespaces, control groups, seccomp; host kernel    | The host kernel                    | A kernel or runtime bug, or risky settings           | Moderate        |
| Virtual machine          | Hardware virtualization; hypervisor                 | Hypervisor, physical hardware      | A hypervisor bug (side channels can still leak data) | Higher          |
| Separate machine         | Physical separation; the network                    | The network                        | A bug reachable over the network                     | Highest         |

Read the table as trade-offs, not a ranking to maximize: each step down shares less but costs more in memory, start-up time and operational effort. The Chromium design adds a warning that applies to every row: emulation and virtual machines do not provide security by themselves. A boundary is only as good as its configuration and the correctness of its mediator.

### What isolation does not stop

- **Bugs in the mediator.** The Chromium document notes that operating-system flaws that bypass security checks could let sandboxed code escape, and that sandboxed code cannot practically be stopped from calling system services.
- **Overly generous policy.** A sandbox that may read the whole home directory protects little.
- **Abuse of what is allowed.** A sandboxed process can still misuse the resources it was given, consume CPU and memory, and send malicious data back to its broker.
- **Shared hardware.** Side channels can leak information across process boundaries, and in some cases across virtual machines ([SYS-08](lesson:SYS-08)).

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

The `shop.example` back office lets staff upload supplier invoices as PDF files and shows a thumbnail of each one. The thumbnail is drawn by a fast but memory-unsafe C library. Assume that a malicious PDF can eventually exploit it. The question is where to run the library, and what an attacker gains in each design.

| Design                                                                        | Trust boundary between parser and secrets | What a parser exploit yields                                                            | Main limitation                                           |
| ----------------------------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| A. Parse inside the web application, running as the `orders` account          | None                                      | Everything `orders` can do: read `db.conf`, use the network, alter data                 | One bug compromises the application                       |
| B. Separate worker process running as a dedicated `preview` account           | Process boundary and file permissions     | Whatever `preview` can reach: files readable by "other", the network, every system call | Shares the kernel; broad system-call surface              |
| C. Worker B, plus a seccomp allow-list filter; input and output through pipes | Process boundary plus system-call filter  | Only the calls on the list: reading and writing its pipes, managing its memory, exiting | Kernel bugs in those calls; output is attacker-controlled |
| D. Worker C inside a small virtual machine with no network                    | Hypervisor                                | A sandbox inside a guest kernel with nothing of value                                   | Highest cost and operational complexity                   |

**Step 1: draw the boundaries.** In design A the untrusted PDF and the database password live in the same process, so there is no boundary to defend. Design B adds a process boundary, but the `preview` account still has a full set of system calls and can read any world-readable file.

**Step 2: shrink the interface.** In design C the parent process starts the worker and connects it with two pipes. Before reading any input, the worker installs a seccomp allow-list filter: reading and writing the descriptors it already has, requesting and releasing memory, and exiting. Opening `db.conf`, connecting to the network or starting a program is not on the list, so any attempt kills the worker at once. Strict mode would be simpler, but it is too tight for most real libraries, which need to request memory from the kernel.

**Step 3: treat the way back as untrusted.** The parent reads the thumbnail from the worker, but a compromised worker controls those bytes. The parent therefore checks the image's size and format before using it, and applies a time limit so a stalled worker cannot hang the request. A boundary protects the privileged side only if that side distrusts what crosses it.

**Step 4: decide.** Design C removes almost everything an attacker could reach, at low cost, and is a sensible default. Design D is worth its cost for files from anonymous internet users, or when several customers share servers. In every design the library still needs patching, because isolation limits a bug's reach without removing it.

## Defenses

- **Separate privilege by risk.** Put code that parses untrusted input in its own process with its own unprivileged identity. *Limits:* the split only helps if the privileged side keeps very little code and validates every request.
- **Shrink the interface.** Use allow-list seccomp filters, minimal namespaces and narrow inter-process messages. *Limits:* filters cannot inspect pointer arguments, and the calls that remain are still kernel attack surface.
- **Drop privileges early and permanently.** Switch to an unprivileged account, drop all capabilities and set `no_new_privs` before handling input. *Limits:* this protects nothing that the remaining rights can still reach.
- **Validate everything that crosses back.** Treat a sandboxed component's output as untrusted [[input-validation|input]], and guard the broker against confused-deputy requests. *Limits:* complex message formats are themselves hard to parse safely.
- **Choose the boundary by risk.** Use virtual machines or separate hosts for multi-tenant or highly exposed workloads. *Limits:* stronger boundaries cost more, and none removes the need to patch.
- **Keep the mediators patched and monitored.** Updates close escape routes, and unexpected crashes or seccomp kills in sandboxed processes may signal an attack. *Limits:* unknown flaws remain, which is why isolation is one layer of [[defense-in-depth]].

## Common misconceptions

- **"A sandbox makes vulnerable code safe."** It limits what an exploit can reach. The bug is still there, and sandbox escapes do happen.
- **"Containers isolate as strongly as virtual machines."** Every container shares the host kernel, so one kernel flaw can affect them all.
- **"Running a program as a different user isolates it completely."** It still shares the kernel, the network and every file that "other" may read.
- **"The broker is trustworthy, so it is safe."** The broker is the most critical code precisely because sandboxed code can send it anything. It must check every request.
- **"A process that cannot open files can do no harm."** It can still misuse the descriptors it was given, exhaust resources, attack the kernel through its allowed calls, and send malicious data back.

## Try it yourself

Use a Linux machine, Windows Subsystem for Linux, or a virtual machine you control.

1. Run `grep -E 'NoNewPrivs|Seccomp' /proc/self/status`. A `Seccomp` value of `0` means no seccomp sandbox, `1` means strict mode and `2` means filter mode. Your shell most likely shows `0`.
2. If a Chromium-based browser is running, list a few of its processes with `pgrep -a chrome` (or `pgrep -a chromium`) and read the same line for some of them, for example `grep Seccomp /proc/<pid>/status` with a process ID from the list. Renderer processes typically report filter mode. Which processes are not sandboxed, and why might that be?
3. Run `ls -l /proc/self/ns`. Each entry names a namespace and an identifier. Processes in the same namespace show the same identifier; a process inside a container shows different ones.
4. Build and run this small program, which sandboxes itself in seccomp strict mode and then tries to open a file:

```c
/* strict.c: put this process in seccomp strict mode, then try to open a file. */
#include <fcntl.h>
#include <linux/seccomp.h>
#include <stdio.h>
#include <sys/prctl.h>
#include <sys/syscall.h>
#include <unistd.h>

static void say(const char *msg, size_t len) {
    write(STDOUT_FILENO, msg, len);          /* write(2) stays allowed */
}

int main(void) {
    printf("before: opening a file is allowed\n");
    fflush(stdout);
    if (prctl(PR_SET_SECCOMP, SECCOMP_MODE_STRICT) != 0) {
        perror("prctl");
        return 1;
    }
    say("inside: write still works\n", 26);
    int fd = open("/etc/hostname", O_RDONLY);  /* not on the list: the kernel kills us */
    say("never printed\n", 14);
    (void)fd;
    syscall(SYS_exit, 0);                       /* exit(2) is allowed; exit_group(2) is not */
}
```

   Compile it with `gcc -Wall -Wextra strict.c -o strict` and run `./strict; echo "exit status: $?"`. The shell reports `Killed` and exit status 137 (128 plus signal 9, SIGKILL), and the third message never appears. Notice why the program prints through `write` and ends with a raw `exit` call: ordinary `printf` and `return` would need system calls that strict mode forbids.

5. On paper, draw the trust boundaries for one feature you use, such as a document previewer in your email client. For each boundary, name the mediator, what is still shared, and what an attacker would need to cross it.

## Key takeaways

- Processes are isolated by virtual memory and by a kernel that mediates every system call, which makes the system-call interface the kernel's attack surface.
- Sandboxes remove rights a process does not need, using tools such as seccomp filters, namespaces, dropped privileges and broker processes.
- Privilege separation puts untrusted input in a low-privilege process and keeps a small, careful broker that validates every request.
- Processes, containers and virtual machines differ in what they share: a container shares the host kernel, while a virtual machine has its own.
- Every boundary has limits: mediator bugs, generous policies, shared hardware and untrusted data flowing back. Isolation contains bugs but does not remove them.

## Go deeper

- The [Chromium sandbox design document](https://chromium.googlesource.com/chromium/src/+/main/docs/design/sandbox.md) lists its design principles and known limitations. Which limitations apply to the worked example's design C?
- The [seccomp(2)](https://man7.org/linux/man-pages/man2/seccomp.2.html) page explains filter actions, the `no_new_privs` requirement and several pitfalls of writing filters. Why does it recommend allow-lists?
- Android's [application sandbox](https://source.android.com/docs/security/app-sandbox) added layers on top of Linux user IDs across releases. Which of them could a desktop application adopt?
