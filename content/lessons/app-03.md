---
topicId: APP-03
title: Command injection boundaries
summary: Learn how a shell turns pasted input into extra commands, why starting programs from an argument list closes that hole, what argument injection still leaves open, and how to review and repair a command wrapper.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Explain how a shell parses a command line and why pasting input into it creates command injection.
  - Rewrite a shell-based call as an argument list without a shell, in Python and JavaScript.
  - Prevent argument injection with allowlist validation and the end-of-options marker.
  - Review a command wrapper against a checklist and replace the external program with a library call where possible.
  - Describe how least privilege, timeouts, and sandboxing limit the damage of a command that misbehaves.
prerequisites: [APP-01, APP-02, SYS-04]
concepts: [command-injection, metacharacter, argument-vector, argument-injection, injection]
keywords:
  - OS command injection
  - shell injection
  - CWE-78
  - CWE-77
  - A05:2025
  - shell=True
  - subprocess
  - child_process
  - execFile
  - argument injection
  - blind command injection
sources:
  - title: OS command injection (Web Security Academy)
    url: https://portswigger.net/web-security/os-command-injection
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
  - title: OS Command Injection Defense Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/OS_Command_Injection_Defense_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: "CWE-78: Improper Neutralization of Special Elements used in an OS Command ('OS Command Injection')"
    url: https://cwe.mitre.org/data/definitions/78.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
    sourceId: cwe-top-25
  - title: 'A05:2025 Injection (OWASP Top 10:2025)'
    url: https://top10.owasp.org/2025/A05_2025-Injection/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
quiz:
  - question: In which call can a user-supplied name add a second command?
    choices:
      - 'subprocess.run(["grep", "-F", "--", name, "orders.log"])'
      - 'subprocess.run(f"grep -F {name} orders.log", shell=True)'
      - "execFile('grep', ['-F', '--', name, 'orders.log'])"
      - socket.getaddrinfo(name, None)
    answer: 1
    explanation: Only the second call hands a single string to a shell, which parses separators such as ; in the name. The argument lists pass the name as one argument without any shell, and getaddrinfo starts no program at all.
  - question: A wrapper starts a program from an argument list, with no shell. A user submits a value that begins with a dash. Why can this still misbehave?
    choices:
      - Python adds a shell automatically whenever an argument starts with a dash.
      - The operating system splits the value on spaces into several commands.
      - The program itself may read the value as an option instead of a file name or host.
      - The dash makes the value run as a separate command.
    answer: 2
    explanation: Removing the shell removes command separators, but the program still parses its own arguments. Many programs treat any argument that starts with - as an option. Validate that values cannot start with a dash, and put -- before them where the program supports it.
  - question: An internal page runs nslookup through a shell to show a hostname's addresses. What is the strongest repair?
    choices:
      - Escape shell metacharacters in the hostname with a quoting function.
      - Add ; and | to a denylist of forbidden characters.
      - Keep the shell call but run it as a non-root user.
      - Validate the hostname and resolve it with a library call such as getaddrinfo, so no command line exists.
    answer: 3
    explanation: The most reliable fix removes the boundary entirely. With a library call there is no shell, no external program, and no option parsing. Escaping and denylists are error-prone, and a low-privilege account only limits the damage.
  - question: A vulnerable wrapper never shows command output to the user. Which statement is correct?
    choices:
      - An attacker can still learn that injected commands ran, through side effects such as time delays, created files, or network lookups.
      - The flaw is harmless, because the attacker cannot see any results.
      - Blind command injection only affects Windows servers.
      - Shells refuse to run a command whose output is discarded.
    answer: 0
    explanation: This is blind command injection. Injected commands still run with the application's privileges, and their effects can be observed indirectly, for example through a deliberate delay. Missing output hides the flaw from casual testing, not from attackers.
  - question: Why should a command wrapper also run as a dedicated low-privilege account with a timeout?
    choices:
      - Because a low-privilege account cannot be the target of injection.
      - Because it limits what a misbehaving or injected command can reach and how long it runs, as a second layer.
      - Because it makes escaping unnecessary.
      - Because it makes shell=True safe to use.
    answer: 1
    explanation: Least privilege and resource limits are defense in depth. They shrink the damage if something goes wrong, but the command line must still be built without a shell and with validated arguments.
---

## Why it matters

Many applications call other programs to do part of their work: resize an image, convert a document, compress a folder, check a network host. If an application builds the command line for such a program by pasting user input into a string and hands that string to a system shell, the input can change the command. That is [[command-injection|OS command injection]], also called shell injection. MITRE catalogs it as [[cwe|CWE]]-78, which ranked ninth on the 2025 CWE Top 25; the more general command injection weakness, CWE-77, ranked 23rd. The OWASP Top 10:2025 groups it with SQL injection under A05:2025, Injection.

The stakes are higher than for most injection flaws. Injected SQL is bounded by what the database account can reach. An injected shell command runs arbitrary programs with the operating-system privileges of the application. PortSwigger's Web Security Academy notes that this can let an attacker fully compromise the application and all its data, and can give a foothold for attacking other systems in the organization.

The good news mirrors SQL injection: the fix is structural. Programs can be started without a shell, with every argument passed separately, and often no external program is needed at all.

> [!ETHICS] Only test systems you own or have written permission to test.

## The core idea

Start with the assumptions. The application runs under some operating-system account. One of its features starts an external program. At least one piece of that program's command line, such as a hostname, a file name, or an option, comes from input, directly or from stored data.

A Unix shell such as `/bin/sh` is an interpreter for a small programming language. When code calls `system()`, or a library function with a "use the shell" option, it hands one string to the shell, and the shell parses it: it splits it into words, interprets quotes, expands variables and wildcards, and treats characters such as `;`, `|`, and `&` as instructions to run more commands. Characters with special meaning to an interpreter are called [[metacharacter|metacharacters]]. Any input inside the string is parsed exactly like the developer's text. This is the same structure as SQL injection: data crosses into an interpreter's code, the general pattern of [[injection]].

The way out is to skip the interpreter. The operating system starts a program from an [[argument-vector|argument vector]], a list of separate strings. When the application builds that list itself, nothing parses it, and a value such as `shop.example; whoami` reaches the program as one odd-looking argument. Think of the difference between dictating a to-do list over the phone, where the listener decides where each item ends, and filling in a printed form with one labeled box per item.

## How it works

### The shell parses everything you give it

This Python wrapper, for an internal diagnostics page at `shop.example`, shows the addresses a hostname resolves to by running `nslookup`:

```python
import subprocess

def lookup(host: str) -> str:
    # VULNERABLE: the host is pasted into a command line that a shell parses.
    cmd = f"nslookup {host}"
    return subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=5).stdout
```

For `shop.example`, the shell runs `nslookup` with one argument. For the illustrative input `shop.example; whoami`, the shell sees a command separator and runs two programs, `nslookup shop.example` and then `whoami`, which prints the name of the account the server runs as. The table summarizes the shell features that make this possible. It describes the grammar of the language, which is why no list of "bad characters" can be complete.

| Shell feature              | Examples          | What the shell does                                       |
| -------------------------- | ----------------- | --------------------------------------------------------- |
| Separators and conditionals | `;` `&&` `\|\|` newline | Runs another command after this one                  |
| Pipes                      | `\|`              | Feeds this command's output into another command          |
| Command substitution       | `$( )`, backticks | Runs a command and pastes its output into the line        |
| Redirection                | `>` `<`           | Reads from or writes to files                             |
| Expansion                  | `$VAR` `*` `~`    | Replaces text with variable values or matching file names |
| Quoting                    | `'` `"` `\`       | Changes how every rule above applies                      |

If the input lands inside quotes, an attacker first closes the quoted string, just as in SQL injection. Shells differ, and Windows `cmd.exe` follows rules of its own, so escaping is shell-specific and easy to get wrong. PortSwigger's advice is direct: never attempt to sanitize input by escaping shell metacharacters.

### Argument vectors: no shell, no parsing

The diagram contrasts the two ways of starting the same program with the same input. In the first, the app hands a string to `/bin/sh`, which starts two programs. In the second, the app starts `nslookup` directly with an argument list, so the odd value is just a hostname that does not exist.

```sequence
title: The same input with and without a shell
participant A as App
participant Sh as /bin/sh
participant N as nslookup
participant W as whoami
A -> Sh: "nslookup shop.example; whoami"
Sh -> N: argv: nslookup, shop.example
Sh -> W: argv: whoami (the injected command)
note: Fixed: the app starts the program itself
A -> N: argv: nslookup, "shop.example; whoami"
N --> A: Lookup fails; nothing else runs
```

In Python, pass a list and leave `shell` at its default of `False`. In Node.js, `exec` runs its string through a shell, while `execFile` starts the program directly with an array of arguments:

```python
# FIXED: no shell; the host is exactly one argument.
result = subprocess.run(["nslookup", host], capture_output=True, text=True, timeout=5)
```

```javascript
import { exec, execFile } from 'node:child_process';

// VULNERABLE: exec() hands the whole string to a shell.
exec(`nslookup ${host}`, (err, stdout) => show(stdout));

// FIXED: execFile() starts nslookup directly; host is one array element.
execFile('nslookup', [host], { timeout: 5000 }, (err, stdout) => show(stdout));
```

Running both Node versions with `shop.example; echo INJECTED` in place of a real lookup shows the difference: `exec` prints `INJECTED` on a line of its own, while `execFile` passes the whole value through as one argument. Beware of options that turn the shell back on, such as Node's `shell: true`.

### Argument injection: the program parses too

Removing the shell removes separators, pipes, and substitution, but the program still parses its own arguments. Many command-line programs treat any argument that begins with a dash as an option, and GNU tools accept options even after other arguments. That gap is [[argument-injection]]. Here is a harmless demonstration with `ls`, in a wrapper that shows details for one report file:

```python
# VULNERABLE: name = "-a" is read as an option, so ls also lists hidden files.
subprocess.run(["ls", "-l", name], cwd="reports")

# FIXED: validate the name, then mark the end of options with "--".
if not re.fullmatch(r"[a-z0-9_]+\.txt", name):
    raise ValueError("unexpected report name")
subprocess.run(["ls", "-l", "--", name], cwd="reports")
```

Programs that follow the usual convention treat everything after `--` as operands, never as options. Some options of common tools write files or start other programs, so argument injection can be as serious as shell injection. Some programs are themselves interpreters: `sh -c`, `python -c`, or `ssh` with a remote command, which joins its arguments into a string that the remote shell parses. Passing input to them recreates the original problem even inside an argument list.

### The rest of the boundary

The command line is not the only input a child process receives. Never let input choose which program runs; name it in code, ideally by absolute path. Pass a minimal environment, since environment variables such as `PATH` change what a program does. Set a timeout and limit how much output you read. Run the program under a dedicated low-privilege account, or inside a [[sandbox]] or container, so that a mistake is contained.

## Worked example

The activity: review and repair a non-production command wrapper. The `lookup` function above powers a staff-only diagnostics page that is not yet in production. Before it is exposed to more staff, you review it.

**Step 1: apply a review checklist.**

| Question                                       | Finding for `lookup`                                  |
| ---------------------------------------------- | ----------------------------------------------------- |
| Does a shell parse the command?                | Yes: `shell=True` with an f-string                    |
| Can input add commands or choose the program?  | Yes, through separators and substitution              |
| Can input become an option?                    | Yes, a value that starts with `-`                     |
| Is each argument validated against an allowlist? | No                                                  |
| What privileges and limits apply?              | The web application's account; 5-second timeout; unbounded output |

**Step 2: confirm the finding safely.** In a local copy, replace `nslookup` with `echo` and pass `shop.example; echo INJECTED`. A second line reading `INJECTED` proves that the separator took effect. Use only harmless marker commands like this one.

**Step 3: remove the external program.** The page only needs addresses, and the standard library can resolve names without starting any process:

```python
import re
import socket

LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
HOSTNAME = re.compile(rf"{LABEL}(?:\.{LABEL})+")

def lookup(host: str) -> list[str]:
    host = host.strip().lower().rstrip(".")          # canonicalize first (see APP-02)
    if len(host) > 253 or not HOSTNAME.fullmatch(host):
        raise ValueError("expected a hostname such as shop.example")
    infos = socket.getaddrinfo(host, None, proto=socket.IPPROTO_TCP)
    return sorted({info[4][0] for info in infos})
```

The validation pattern follows the shape of DNS labels: letters, digits, and inner hyphens, at most 63 characters per label. A label cannot start with a hyphen, so no accepted value can be read as an option.

**Step 4: if the tool's own output is required,** keep the validation and start the program from an argument list: a fixed absolute path, no shell, a minimal environment, a timeout, and a cap on how much output you return.

**Step 5: re-test with the agreed inputs.**

| Input                          | Original wrapper              | Repaired wrapper                       |
| ------------------------------ | ----------------------------- | -------------------------------------- |
| `shop.example`                 | Runs the lookup               | Returns the addresses                  |
| `shop.example; echo INJECTED`  | Runs a second command         | Rejected: not a hostname               |
| `-v`                           | Passed to nslookup as an option | Rejected: not a hostname             |
| `shop..example`                | Passed through                | Rejected: empty label                  |

One question remains after the repair: should staff be able to look up any name at all? A feature that contacts destinations chosen by users needs a destination policy, the subject of [server-side request forgery](lesson:APP-05).

## Defenses

| Defense                                       | What it does                                         | Limits                                                         |
| --------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| Use a library instead of a program            | No command line, no shell, no option parsing         | A library may not exist for every task                         |
| Argument list without a shell                 | Each value is exactly one argument                   | The program still parses options; interpreter programs re-open the hole |
| Fixed program, absolute path, minimal environment | Input cannot choose what runs                    | Paths differ between platforms                                 |
| Allowlist validation of every argument        | Rejects unexpected formats, including leading dashes | Needs a precise format per argument                            |
| End-of-options marker `--`                    | Later values are operands, not options               | Works only for programs that follow the convention             |
| Least privilege, sandbox, timeouts, output caps | Contains a command that misbehaves                 | Limits impact; does not remove the flaw                        |
| Escaping metacharacters                       | Quotes special characters for one shell              | Shell-specific and error-prone; a last resort                  |

PortSwigger's guidance ranks these the same way: never call out to operating-system commands from application-layer code when a safer platform API exists; if you must, validate input strongly, for example against an allowlist of permitted values or a strictly numeric or alphanumeric format; and do not rely on escaping. OWASP's OS Command Injection Defense Cheat Sheet agrees that "The primary defense is to avoid calling OS commands directly," prefers mechanisms that enforce the separation between data and command, and adds: "For commands that support it, use `--` to end option parsing." The OWASP Top 10 states the general principle for every kind of injection: keep data separate from commands and queries. For detection, log every process the application starts and alert when a web server process starts a shell, since a healthy web application rarely needs to.

## Common misconceptions

- **"Quoting the input makes it safe."** Quoting rules depend on the shell and the context, and one mistake is enough. Avoid the shell instead.
- **"Without `shell=True`, any argument is safe."** The program still parses options, and interpreter programs such as `sh -c` or `ssh` parse their arguments as code.
- **"Only the command name is dangerous."** Arguments, file names, environment variables, and the working directory all shape what a process does.
- **"No output means no risk."** Blind command injection is confirmed through side effects such as delays or network lookups.
- **"A non-root account makes it harmless."** It limits damage, but the attacker still acts with every right that account has, including reading the application's data.

## Try it yourself

Work in a new, empty folder on your own machine, and run only `echo` and `ls`.

1. **Classify on paper.** For each call, decide whether user input `v` can add a command, become an option, or neither: `os.system("echo " + v)`; `subprocess.run(["echo", v])`; `subprocess.run(["ls", v])`; `subprocess.run(["ls", "--", v])`; `subprocess.run(["sh", "-c", "echo " + v])`; Node's `execFile('echo', [v])`.
2. **Check your answers.** Write the vulnerable `lookup` with `echo` in place of `nslookup`, then the argument-list version. Call both with `shop.example`, then with `shop.example; echo INJECTED`, and compare the output.
3. **See argument injection.** Create a folder `reports` holding an empty file `may.txt` and an empty hidden file `.draft`. Inside that folder, compare `["ls", "-l", "may.txt"]`, `["ls", "-l", "-a"]`, and `["ls", "-l", "--", "-a"]`. Explain each result in one sentence.

## Key takeaways

- A shell is an interpreter: pasting input into a command line lets data become commands.
- Start programs from an argument list with no shell, and prefer a library call that needs no program at all.
- Without a shell, the program still parses options; validate arguments and use `--` where supported.
- Never let input choose the program, and treat interpreter programs such as `sh -c` and `ssh` as shells.
- Least privilege, sandboxing, timeouts, and process logging limit and reveal damage, but do not fix the flaw.

## Go deeper

- Su and Wassermann's ["The Essence of Command Injection Attacks in Web Applications"](https://www.cs.ucdavis.edu/~su/publications/popl06.pdf) (POPL 2006) defines injection as input that changes the intended syntactic structure of a command. Apply that definition to a shell command line: which positions in a POSIX shell grammar could input safely occupy?
- On Windows, a new process receives one command-line string, and each program splits it into arguments itself, so an argument list in your code is joined back into a string by your language runtime. Research how your runtime builds that string and when it falls back to `cmd.exe`, and what that means for the guarantees described in this lesson.
- Open question: AI agents increasingly run shell commands that a model writes. When the model, not the developer, composes the command line, what boundary replaces the argument list? Compare sandboxing, command allowlists, and human approval, as discussed in [agent permissions and tool boundaries](lesson:AI-04).
