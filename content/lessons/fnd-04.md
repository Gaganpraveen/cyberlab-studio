---
topicId: FND-04
title: Attack surfaces and exposure
summary: Learn to list every way into and out of a system, judge how exposed each one is, and tell the exposure a product needs from the exposure it could simply remove.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Enumerate the entry points, exit points, and valuable data that make up a system's attack surface.
  - Rate the exposure of an entry point by who can reach it, from where, and with what prerequisites.
  - Compare two designs and identify which exposure is necessary and which is avoidable.
  - Choose controls that remove, restrict, or harden exposure, and state the limits of each.
prerequisites: [FND-02, FND-03]
concepts:
  - attack-surface
  - exposure
keywords:
  - attack surface
  - attack surface analysis
  - attack surface reduction
  - exposure
  - entry point
  - exit point
  - internet-facing
  - management interface
  - relative attack surface quotient
  - RASQ
  - listening port
  - 0.0.0.0
  - localhost
sources:
  - title: 'OWASP Attack Surface Analysis Cheat Sheet'
    url: https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'Measuring Relative Attack Surfaces (Michael Howard, Jon Pincus, and Jeannette M. Wing)'
    url: https://www.cs.cmu.edu/~wing/publications/Howard-Wing03.pdf
    publisher: Carnegie Mellon University (author's publication page)
  - title: 'Data Protection: Actions Taken by Equifax and Federal Agencies in Response to the 2017 Breach (GAO-18-559)'
    url: https://www.gao.gov/products/gao-18-559
    publisher: U.S. Government Accountability Office
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: 'A debug page at shop.example/debug/vars is not linked from anywhere on the site. Why is it still part of the attack surface?'
    choices:
      - It is not part of the attack surface, because attackers can only reach pages that are linked.
      - It is part of the attack surface only if a search engine has indexed it.
      - Anyone who can send it a request can reach it, and attackers routinely guess and scan for paths like this, so being unlinked is not a control.
      - It is part of the attack surface only while a developer is logged in.
    answer: 2
    explanation: The attack surface is every point where an attacker could get in or get data out, whether or not it is advertised. Secrecy of a path is obscurity, not protection. The fix is to remove the endpoint from production builds.
  - question: Which change reduces exposure the most for an administration panel that only five staff members use?
    choices:
      - Moving the panel so it is reachable only through the staff VPN and single sign-on with multi-factor authentication.
      - Renaming the panel's URL from /admin to a long random string.
      - Adding a banner that warns unauthorized users to stay away.
      - Increasing the minimum password length on the panel from 8 to 10 characters.
    answer: 0
    explanation: Restricting reach removes the panel from the view of almost every attacker on the internet, and it adds strong authentication in front of it. A random URL is obscurity, a banner is not a control, and a longer password helps only against guessing while leaving the panel reachable by everyone.
  - question: A store must accept orders from anyone on the internet. What does attack surface analysis suggest for this entry point?
    choices:
      - Remove it, since every entry point is avoidable exposure.
      - Keep it, recognize it as necessary exposure, and harden it with validation, rate limiting, least privilege, and monitoring.
      - Hide it behind a long random URL so that only customers can find it.
      - Ignore it, since the risk of a public page is already accepted by the business.
    answer: 1
    explanation: Some exposure is the product itself. The goal is not zero surface, but no avoidable surface, plus extra care for the entry points that must stay open.
  - question: Howard, Pincus, and Wing compare the attack surfaces of two versions of a system instead of giving each an absolute security score. Why?
    choices:
      - Because absolute scores are illegal to publish.
      - Because relative comparisons need no data at all.
      - Because a larger attack surface always means more vulnerabilities.
      - Because analysts can rank relative opportunities for attack more reliably than they can assign absolute scores or attack probabilities.
    answer: 3
    explanation: Counting attack opportunities in two versions shows whether a change made things better or worse, without pretending to know the probability of attack. A smaller surface means fewer opportunities, not a guarantee of fewer flaws.
---

## Why it matters

Every feature is also a door. A login form, a file upload, an API, an admin page, a debug endpoint, an open database port, and a partner integration are each a place where an attacker can try something. Each one runs code, and that code may contain flaws nobody has found yet. The more doors a system has, and the more of them face the open internet, the more chances an attacker gets.

Attackers find exposed doors quickly. In the 2017 Equifax breach, a flaw in the Apache Struts framework was announced publicly, and two days later someone scanned Equifax's systems and got into its internet-facing online dispute portal ([GAO-18-559](https://www.gao.gov/products/gao-18-559)). The portal had a legitimate reason to be public, but its exposure meant that the first scan to find the flaw found Equifax too.

Shrinking the attack surface is one of the few defenses that works against flaws you do not know about yet. Code that an attacker cannot reach cannot be exploited remotely, however buggy it is. As one paper on the subject puts it, "one way to improve system security is to reduce its attack surface" ([Howard, Pincus, and Wing](https://www.cs.cmu.edu/~wing/publications/Howard-Wing03.pdf)).

## The core idea

The [[attack-surface]] is, in OWASP's words, "all of the different points where an attacker could get into a system, and where they could get data out" ([OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html)). OWASP also counts the code that protects those points, such as authentication and validation, and the valuable data behind them.

[[exposure|Exposure]] describes how reachable each point is: who can reach it, from where, and what they need first. A login page open to the whole internet is highly exposed. The same page reachable only from the office network, after a VPN sign-in, is far less exposed, even though its code is identical.

Think of a building. Its surface is every door, window, loading dock, mail slot, and roof hatch. Bricking up a door nobody uses removes surface. Adding a badge reader to the staff entrance reduces exposure. The front door must stay open during business hours, because that is how customers get in, so it gets a guard instead.

Three assumptions drive the analysis:

1. **Anything reachable will be found.** Scanning and guessing are cheap, so "unlinked" or "undocumented" does not mean "unreachable."
2. **Every entry point may hide an unknown flaw.** You cannot count on the code behind a door being perfect.
3. **Attackers know the design.** CS 161's version of this principle tells you to assume the attacker knows the system they are attacking ([CS 161, Chapter 1](https://textbook.cs161.org/principles/principles.html)).

## How it works

### Enumerate the surface

OWASP suggests listing every path for data and commands into and out of the system: user interface forms, HTTP headers and cookies, APIs, files, databases and other storage, messages, and runtime arguments. Then group them, for example:

- login and authentication entry points
- administration interfaces
- search and inquiry functions
- data entry forms
- business workflows
- transactional interfaces and APIs
- operational command and monitoring interfaces
- interfaces with other applications and systems

Counting the members of each group, then reviewing a sample of each, keeps a large system manageable.

### Rate the exposure of each point

Several dimensions decide how exposed an entry point is:

| Dimension             | Lower exposure                         | Higher exposure                               |
| --------------------- | -------------------------------------- | --------------------------------------------- |
| Reach                 | Only the same machine (localhost)      | The entire internet                           |
| Prerequisites         | Admin account with MFA, on the VPN     | None: anonymous access                        |
| Privilege of the code | Runs as an unprivileged, sandboxed user | Runs with administrator rights               |
| Data behind it        | Nothing sensitive                      | Secrets, credentials, personal data           |
| Complexity            | A simple, well-tested form             | File parsing, custom protocols, legacy code   |

OWASP singles out remote entry points and anything allowing "anonymous, public access" for priority, and flags internet-facing code, files from outside the network, legacy interfaces, custom APIs, and security code itself as high-risk areas.

### Measure and compare

Howard, Pincus, and Wing describe an attack surface along three dimensions: targets and enablers, channels and protocols, and access rights. They count opportunities for attack, which they call attackability, rather than known bugs. Their key move is to compare versions of the same system. Analysts can rank relative risks more reliably than they can assign absolute scores or attack probabilities, so "version 2 exposes fewer anonymous channels than version 1" is a claim you can defend.

### Necessary and avoidable exposure

Some exposure is the product. A store must take orders from strangers, and a public website must answer anyone. Other exposure serves no user at all: admin panels on the internet, debug endpoints left in production, databases listening on every network interface, sample applications, unused features, and data you never needed to keep. The goal is not zero surface. It is **no avoidable surface**, and extra care for what must stay open.

### The surface keeps changing

Every release can add surface. OWASP recommends reviewing it incrementally by asking "What has changed?" and "What holes could you have opened?" New technologies, new user roles, changes to authentication or access control, and new external integrations deserve a fuller review than a change that follows an existing pattern.

## Worked example

The fictional retailer shop.example is choosing between two designs for its order system. Design A puts everything on one server at 203.0.113.10. Design B splits the system and limits who can reach each part.

**Step 1: list the entry points and their exposure.**

| Entry point           | Design A                         | Design B                                  | Avoidable in A? |
| --------------------- | -------------------------------- | ----------------------------------------- | --------------- |
| Storefront, checkout  | Internet, anonymous              | Internet, anonymous                       | No, it is the product |
| Customer login API    | Internet, anonymous              | Internet, anonymous, rate limited         | No              |
| Review photo upload   | Internet, any customer           | Internet, any customer; parsed in a sandbox | No, but riskier |
| Admin panel `/admin`  | Internet, password only          | Staff VPN plus SSO with MFA               | Yes             |
| Database port 5432    | Internet, password only          | Private network only                      | Yes             |
| `/debug/vars`         | Internet, anonymous              | Not in production builds                  | Yes             |
| Remote shell (SSH)    | Internet, password login         | Only from one hardened jump host, keys only | Yes           |
| Nightly backup files  | In the public web folder         | Encrypted, private storage                | Yes             |

**Step 2: count relative exposure.** Design A has four entry points that anyone on the internet can reach without signing in (storefront, login, debug page, backups), and three more guarded only by a password. Design B has two anonymous entry points, both of which the business needs. Following Howard and his coauthors, this is a relative claim: B offers fewer opportunities than A. It does not say B is secure.

**Step 3: fix the avoidable exposure at the source.** One avoidable item is a configuration line. In Design A the database container publishes its port on every interface of the host; in Design B it has no published port and sits on an internal network that only the application can reach.

```diff
 services:
   db:
     image: postgres:16
-    ports:
-      - '5432:5432'        # published on every interface of the host
+    networks: [backend]    # reachable only by containers on 'backend'
   app:
     image: shop-app:2.3    # fictional application image
+    networks: [frontend, backend]
+networks:
+  backend:
+    internal: true         # no route to or from outside the host
```

**Step 4: harden what must stay.** The storefront, login API, and photo upload remain exposed in both designs, so they get the most scrutiny: input validation, rate limiting on login, size and type limits on uploads, a sandboxed image parser, and monitoring. Design B also puts the upload parser, a complex piece of code that handles files from outside, in a separate low-privilege worker, so a parser flaw does not hand over the database.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

**Remove what nobody needs.** Delete unused features, endpoints, sample apps, accounts, open ports, and stored data. OWASP lists removing unused features, limiting user levels, and not storing unneeded confidential data among the ways to shrink the surface. Limit: you can only remove what you know exists, so this depends on an accurate inventory.

**Restrict reach.** Bind services to localhost or a private network, filter traffic, and put administrative interfaces behind a VPN or an identity-aware gateway. Limit: an internal network is not trustworthy by itself. Equifax's attackers went from the portal to databases inside the network ([GAO-18-559](https://www.gao.gov/products/gao-18-559)), and [FND-06](lesson:FND-06) covers why location should not imply trust.

**Authenticate before complex code runs.** Put strong authentication in front of admin tools and risky parsers, so anonymous attackers never reach them. Limit: the authentication code is itself part of the surface, and credentials can be phished.

**Shrink privilege behind each door.** Run each entry point's code with [[least-privilege]] and isolate risky components in a [[sandbox]]. Limit: isolation can be escaped, and permissions tend to grow over time.

**Harden the necessary surface.** Validate input, apply [[rate-limiting]], patch quickly, and watch the exposed points closely. Limit: hardening lowers the chance a flaw is reachable or exploitable, but it cannot guarantee there is none.

**Measure your own exposure continuously.** Keep an inventory, review the surface at every release, and check from the outside what is reachable, but only on systems you are authorized to test. Limit: a check shows what is reachable from where it runs, not from everywhere.

## Common misconceptions

- **"If it is not linked, attackers will not find it."** Scanners and guessing find unlinked paths. Secrecy of a location is not a control.
- **"Attack surface means open ports."** It also includes APIs, file parsers, admin interfaces, integrations, dependencies, and the stored data behind them.
- **"Internal means unreachable."** A compromised machine or an insider can reach internal services.
- **"A smaller surface means the system is secure."** One reachable flaw is enough. Surface reduction complements fixing flaws; it does not replace it.
- **"Adding a security product always shrinks the surface."** Security tools run code too, often with high privileges, and OWASP counts security code among the high-risk areas.

## Try it yourself

**Part 1, on paper.** A college library offers course readings at reserves.college.example. Design A runs the website, the database, a scanner upload folder for staff, and a remote desktop service for the librarian on one internet-facing server. Design B keeps only the website public, moves staff uploads behind the campus SSO, and allows remote access only through the campus VPN.

1. List every entry point and exit point in each design.
2. Rate each one by reach, prerequisites, privilege, and data behind it.
3. Mark each entry point in Design A as necessary or avoidable exposure.
4. Write one sentence comparing the two designs, as a relative claim.

**Part 2, on your own computer.** List the network services listening on your own machine, and note which accept connections only from the machine itself (`127.0.0.1` or `::1`) and which listen on every interface (`0.0.0.0` or `::`).

```bash
# Linux: listening TCP sockets and the programs that own them
ss -tlnp
# macOS: the same view with lsof
lsof -nP -iTCP -sTCP:LISTEN
```

```powershell
# Windows PowerShell
Get-NetTCPConnection -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess
```

For each service listening on every interface, ask whether you need it reachable from other machines. Do not scan other people's machines or networks; this exercise is about your own computer only.

## Key takeaways

- The attack surface is every way into and out of a system, plus the code that guards those ways and the data behind them.
- Exposure is about reach and prerequisites: who can get to a point, from where, and with what.
- Some exposure is the product. The goal is no avoidable exposure, plus extra hardening for what must stay open.
- Compare designs and versions relatively; counting opportunities is more defensible than claiming an absolute score.
- Every release can add surface, so review it incrementally.

## Go deeper

- [Howard, Pincus, and Wing](https://www.cs.cmu.edu/~wing/publications/Howard-Wing03.pdf) define attack surface along targets and enablers, channels and protocols, and access rights, and show how to compare versions of a system.
- The [OWASP Attack Surface Analysis Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Attack_Surface_Analysis_Cheat_Sheet.html) gives questions for incremental review at each release. Open question: how should an attack surface metric weight entry points that differ greatly in complexity and privilege, without inventing false precision?
