---
topicId: MAL-04
title: Command-and-control concepts
summary: Understand, from the defender's side, how compromised systems keep in touch with their operators (regular check-ins over web and DNS traffic, and resilient addressing such as domain generation algorithms) and how defenders detect and disrupt those channels.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain the roles of implant, controller, and channel, and why the channel is both the operator's dependency and the defender's opportunity.
  - Recognize beaconing in connection logs and measure how regular it is.
  - Describe the DNS and HTTPS indicators of command-and-control traffic and the logs that reveal them.
  - Compare blocking, sinkholing, and takedown as ways to disrupt a channel, including their side effects.
prerequisites: [MAL-01, NET-02, NET-05]
concepts: [command-and-control, beaconing, domain-generation-algorithm, sinkhole]
labs: []
keywords:
  - C2
  - C&C
  - CnC
  - beacon
  - callback
  - check-in
  - jitter
  - DGA
  - DNS sinkhole
  - NXDOMAIN
  - egress filtering
  - proxy logs
  - TA0011
  - T1071
  - T1071.001
  - T1071.004
  - T1568.002
  - T1573
  - T1090
  - T1102
sources:
  - title: 'MITRE ATT&CK: Command and Control (TA0011)'
    url: https://attack.mitre.org/tactics/TA0011/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Application Layer Protocol (T1071)'
    url: https://attack.mitre.org/techniques/T1071/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Dynamic Resolution: Domain Generation Algorithms (T1568.002)'
    url: https://attack.mitre.org/techniques/T1568/002/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'CISA Alert TA17-132A: Indicators Associated With WannaCry Ransomware'
    url: https://www.cisa.gov/ncas/alerts/TA17-132A
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Computer Security (CS 161 textbook), Chapter 38: Malware'
    url: https://textbook.cs161.org/network/malware.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: Why do most implants open outbound connections to their controller instead of waiting for the controller to connect to them?
    choices:
      - Outbound connections are always encrypted, and inbound ones are not.
      - Firewalls and address translation usually block unsolicited inbound connections to workstations, while outbound web and DNS traffic is usually allowed.
      - Controllers cannot send data to an implant.
      - Inbound connections would not appear in any log.
    answer: 1
    explanation: Victim networks rarely accept unsolicited inbound connections to ordinary computers, but they let those computers reach the web and DNS. Checking in from the inside rides on traffic the network already permits, which is also why defenders watch outbound traffic so closely.
  - question: A laptop has contacted the same rare domain 300 times in five hours, with 85 percent of the gaps between connections within 10 percent of 60 seconds. Which conclusion is best?
    choices:
      - It is certainly malware, so the laptop should be wiped immediately without further checks.
      - It is normal, because encrypted traffic cannot be malicious.
      - The domain must be a content delivery network.
      - The pattern is consistent with beaconing and deserves investigation, such as finding which process makes the connections and how many other hosts contact the domain.
    answer: 3
    explanation: Regular timing to a rare destination is a strong lead, but legitimate software also polls servers on schedules. The next steps are to identify the responsible process on the host and to check how common the destination is across the organization.
  - question: A responder sees a burst of DNS lookups for random-looking names, almost all answered NXDOMAIN, from a non-browser process. What does this most likely indicate?
    choices:
      - Software using a domain generation algorithm, trying many candidate names until it finds one the operator has registered.
      - A broken DNS server.
      - A user typing addresses incorrectly.
      - Normal operating-system updates.
    answer: 0
    explanation: ATT&CK's guidance for domain generation algorithms points to random-looking names, high rates of failed (NXDOMAIN) lookups, and unexpected processes. Most generated names were never registered, so most lookups fail.
  - question: Why did CISA advise administrators not to block the domain that WannaCry's dropper tried to contact?
    choices:
      - Blocking domains is illegal.
      - The domain belonged to a hospital.
      - When the dropper could connect to that domain it terminated, so blocking the domain would have let the malware continue.
      - Blocking would have slowed down the internet.
    answer: 2
    explanation: The dropper used the domain as a kill switch. Researchers registered it and later redirected its traffic to a monitored server, which greatly reduced the spread. Blocking it would have removed that protection, which shows why responders must understand a sample's network dependencies before cutting them.
  - question: What can a defender still learn from command-and-control traffic that is encrypted with TLS?
    choices:
      - Nothing, because encryption hides everything.
      - The full commands, because TLS does not encrypt application data.
      - Only the user's password.
      - Metadata such as the destination, the server name the client requests, connection timing, and the sizes of transfers.
    answer: 3
    explanation: TLS protects content, not the fact of communication. Destination addresses, the requested server name (usually visible in the TLS handshake), timing, and volume remain observable, and they are often enough to spot a beacon.
---

## Why it matters

Malware that steals files, encrypts them, or joins an attack on command needs a way to receive orders and return results. MITRE ATT&CK summarizes the goal in one sentence: "The adversary is trying to communicate with compromised systems to control them." That communication link is [[command-and-control]], usually shortened to C2.

For defenders, C2 is often the most visible part of an intrusion. A program can hide its files and its processes, but if it needs instructions, it must talk across the network, usually many times. Every conversation passes through equipment the defender controls: the organization's DNS resolver, its web proxy, its firewall.

Understanding a sample's network dependencies can also give defenders unusual leverage. CISA's alert on WannaCry describes a dropper that tried to connect to a hard-coded domain and terminated if the connection succeeded. When researchers registered that domain, the malware's ability to spread "was greatly reduced," and CISA told administrators not to block it. One check, understood correctly, slowed a global outbreak.

## The core idea

A C2 system has three parts. The **implant** is the malicious program on the victim's machine. The **controller** is the server the operator uses to issue tasks and collect results. The **channel** is how the two talk.

This lesson makes four assumptions:

1. The victim network blocks most unsolicited inbound connections, but allows outbound web and DNS traffic, because people need them to work.
2. The defender runs the network's DNS resolvers, proxies, and logs, and can see traffic metadata (destination, timing, size) even when the content is encrypted.
3. The operator wants to stay reachable even when individual servers or domains are blocked.
4. Detection here is probabilistic. Legitimate software also talks to servers on schedules.

The first assumption explains the basic design. Because the controller usually cannot reach the implant, the implant reaches out. It checks in, asks whether there is work, and goes quiet until the next check-in. Picture an undercover agent who cannot receive calls and so phones headquarters from a pay phone at set times. Headquarters never calls the agent, but the regularity of the calls is exactly what an observer would notice.

## How it works

### The check-in loop

The diagram below models a generic check-in over HTTPS, the pattern ATT&CK describes under Application Layer Protocol (T1071). It is a conceptual model for defenders, not a design for building anything. Every step leaves a record in a log the defender controls.

```sequence
title: A generic HTTPS check-in, seen by the defender
participant H as Infected laptop
participant D as Company DNS resolver
participant P as Web proxy
participant C as C2 server 203.0.113.7
H -> D: Look up telemetry.cdn-update.test
D --> H: 203.0.113.7 (resolver log entry)
H -> P: HTTPS check-in (proxy log entry)
P -> C: Forwarded check-in
C --> P: Reply: no task
P --> H: Reply delivered
note H: Waits about 60 seconds, then repeats
H -> P: Next check-in gets a task; results uploaded
note: Each step adds a line to DNS or proxy logs
```

The laptop first resolves the controller's name through the company [[recursive-resolver]], then sends a small request through the proxy. Most replies say there is nothing to do. Occasionally a reply carries a task, and the next request carries the results, so it is larger than usual.

### Beaconing: regular timing as a signal

The periodic check-ins are called [[beaconing]]. The operator sets the interval, which can range from seconds, for hands-on control, to hours or days, for quiet long-term access. Some implants add random variation, called jitter, to the interval, so detection looks at the overall distribution of gaps instead of demanding exact equality.

Useful signals, best used in combination:

- **Regularity.** Many connections from one host to one destination, with gaps clustered around a typical value.
- **Consistency.** Requests and replies of nearly the same size, with occasional larger transfers when tasks and results move.
- **Rarity.** A destination contacted by one or two hosts in the whole organization, or first seen recently.
- **Context.** Connections that continue at night when the user is away, or that come from a process that does not normally use the network. ATT&CK's detection guidance for T1071 highlights exactly this: protocols used by processes that do not normally use them, and regular, beacon-like timing.

Every signal has innocent explanations. Update checkers, mail clients, chat applications, and telemetry agents all poll servers on schedules. Beaconing analysis therefore ranks leads for a human, and it must keep its [[false-positive]] rate low enough to avoid [[alert-fatigue]].

### Channels and what defenders can see

ATT&CK's Command and Control tactic lists 18 techniques. These are among the most common:

| Channel                                   | ATT&CK technique                    | What a defender can usually observe                                          |
| ----------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| Web protocols (HTTP, HTTPS)               | T1071.001 Web Protocols             | Destination, requested server name, timing, sizes; content only if TLS is inspected |
| DNS                                       | T1071.004 DNS                       | Query names (sometimes long, encoded-looking labels), record types, volumes  |
| Legitimate web services                   | T1102 Web Service                   | Traffic to popular sites; needs process context to stand out                 |
| Encrypted channels                        | T1573 Encrypted Channel             | Metadata only: encryption hides content, not the conversation                |
| Proxies and anonymity networks            | T1090 Proxy                         | Connections to relays; WannaCry used Tor for C2, a multi-hop proxy           |

Encryption with [[tls]] hides content but leaves a lot visible: who talked to whom, when, how often, and how much. The requested server name usually travels in the clear in the TLS handshake. DNS-based C2 hides inside lookups, so it shows up as unusual names, unusual record types, or high query volumes to one domain. Channels built on popular cloud services are the hardest to spot, because the destination itself is ordinary.

### Staying reachable: dynamic resolution

A hard-coded IP address is easy to block. A domain name is better for the operator, who can point it at a new server. A [[domain-generation-algorithm]] (DGA, ATT&CK T1568.002) goes further: the implant and the operator derive the same long list of candidate domain names, often changing with the date, and the operator registers only one or a few of them. ATT&CK notes that with thousands of possible names, defenders struggle to block, track, or take over the channel. DGAs also serve as fallback channels when a primary server disappears.

DGAs have a weakness, though: most generated names were never registered, so most lookups fail. ATT&CK's detection guidance points to random-looking names, high rates of failed (NXDOMAIN) lookups, and lookups made by unexpected processes.

## Worked example

The security team at `shop.example` reviews web-proxy logs for Alice's laptop, `192.0.2.41`. Here is a short excerpt, as comma-separated values:

```text
time,client,destination,bytes_out,bytes_in
09:00:03,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:01:02,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:01:15,192.0.2.41,www.bank.example,2210,84120
09:01:16,192.0.2.41,static.bank.example,1730,215800
09:02:04,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:03:01,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:03:40,192.0.2.41,updates.os-vendor.example,1980,15230
09:04:03,192.0.2.41,telemetry.cdn-update.test,1420,6918
09:04:05,192.0.2.41,telemetry.cdn-update.test,20354,4870
09:05:02,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:06:01,192.0.2.41,telemetry.cdn-update.test,1420,4870
09:07:03,192.0.2.41,telemetry.cdn-update.test,1420,4870
```

**Step 1: measure regularity.** An analyst groups connections by client and destination and measures the gaps between them. A plain average is fragile, because one extra connection (the burst at 09:04:05) creates a two-second gap. The median and the share of gaps near it are more robust:

```python
import csv
import statistics
import sys
from collections import defaultdict
from datetime import datetime

# Group connection times by (client, destination).
times = defaultdict(list)
with open(sys.argv[1], newline="") as f:
    for row in csv.DictReader(f):
        times[(row["client"], row["destination"])].append(
            datetime.strptime(row["time"], "%H:%M:%S"))

for (client, dest), ts in sorted(times.items()):
    gaps = [(b - a).total_seconds() for a, b in zip(ts, ts[1:])]
    if len(gaps) < 3:
        continue  # too few connections to judge regularity
    median = statistics.median(gaps)
    near = sum(abs(g - median) <= 0.1 * median for g in gaps) / len(gaps)
    print(f"{client} -> {dest}: {len(ts)} connections, "
          f"median gap {median:.0f} s, {near:.0%} of gaps within 10% of it")
```

Run on the excerpt, it prints one line:

```text
192.0.2.41 -> telemetry.cdn-update.test: 9 connections, median gap 59 s, 88% of gaps within 10% of it
```

**Step 2: read sizes.** Most check-ins send 1,420 bytes and receive 4,870 bytes. At 09:04:03 the reply is larger (6,918 bytes), and two seconds later the laptop sends 20,354 bytes. That fits the pattern of a task arriving and results going out.

**Step 3: add context.** The proxy's daily summary shows that `updates.os-vendor.example` was contacted by 409 of the company's 412 laptops, while `telemetry.cdn-update.test` was contacted only by Alice's laptop and was first seen the day before. Regular plus rare plus recent makes a strong lead. Regular plus common, as with the update service, does not.

**Step 4: confirm on the host.** The team uses endpoint telemetry to find which process opens these connections. It is not a browser, and the program arrived as an email attachment. This matches the trojan in [Malware behavior and taxonomy](lesson:MAL-01).

**Step 5: disrupt, in the right order.** The team first preserves the logs. It then has its DNS resolver answer `telemetry.cdn-update.test` with an internal [[sinkhole]] address, so any other infected machine reveals itself by connecting there. Finally, it isolates and rebuilds Alice's laptop and blocks the domain at the proxy.

## Defenses

**Control the exits.** Send outbound web traffic through proxies, require hosts to use the company's DNS resolvers instead of outside ones, and block protocols and ports the business does not need. Every rule narrows the channels an implant can use and makes the remaining ones easier to log.

**Log what C2 must touch.** DNS query logs, proxy logs, and [[flow-record|flow records]] reveal beacons, especially when they are kept long enough to show patterns over days. Slow beacons that check in a few times a day are invisible in a one-hour window.

**Hunt with several signals.** Combine regularity, rarity, newly observed domains, DGA-like names with failed lookups, and unusual processes making network connections. Matching against published indicators of known C2 servers also helps, but those indicators go stale quickly. Proactive [[threat-hunting]] with these signals finds what alerts miss.

**Disrupt deliberately.** There are three main options:

| Option    | How it works                                                             | Side effects and limits                                                       |
| --------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Block     | Deny the domain or address at the resolver, proxy, or firewall           | Fast, but the operator can move, and DGAs offer many replacement names        |
| Sinkhole  | Answer the C2 name with an address the defenders control                 | Cuts control and reveals infected hosts; within one network it needs only the company resolver |
| Takedown  | Registrars, hosting providers, and law enforcement seize the servers or domains | Can disable a whole operation, but takes coordination and time         |

Before cutting any channel, ask what the malware does when it loses contact. WannaCry ran its payload when its check failed, so blocking its domain would have helped the attacker. ATT&CK notes that a local DNS sinkhole can counter DGA-based C2 more cheaply than registering domains in advance.

**Know the limits.** Encrypted channels hide content. Channels built on popular cloud services blend into normal traffic. Long, jittered intervals defeat short observation windows. Because legitimate polling is far more common than malicious beaconing, even an accurate detector can bury analysts in false alarms; forgetting this is the [[base-rate-fallacy]].

## Common misconceptions

- **"Encrypted traffic cannot be analyzed."** Encryption hides content, not destinations, timing, or volume, and those are often enough to find a beacon.
- **"Blocking the C2 domain always helps."** Know what the malware does when contact fails, and remember that DGAs supply replacement names. Sinkholing often reveals more.
- **"Regular traffic means malware."** Much legitimate software polls on schedules. Regularity is a lead to combine with rarity and process context.
- **"C2 needs exotic protocols."** ATT&CK's Application Layer Protocol technique describes C2 hidden in ordinary web, DNS, and mail traffic, chosen precisely because it blends in.
- **"Once the C2 server is gone, the hosts are safe."** The implant still runs and may have fallback channels. Infected hosts still need cleanup.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. This exercise uses fictional logs and paper models only. Never build or run command-and-control software.

1. **Model the conversation.** On paper, draw a state machine for a non-deployable model of an implant and controller with four states: sleeping, checking in, running a task, and reporting results. For each transition, write the log line it would create (DNS, proxy, or endpoint) and one detection idea.
2. **Measure a beacon.** Copy the worked example's log into a spreadsheet or run the script on it. Then add a second fictional client that polls `updates.os-vendor.example` exactly every 3,600 seconds. Does your measure flag it? What extra information keeps it from becoming a false positive?
3. **Spot generated names.** Sort these fictional names into "looks generated" and "looks human-chosen," then find one name in each group you could be wrong about: `kq3vx9zt1m.test`, `www.shop.example`, `xj4a0pl2wq.test`, `a1b2c3d4.cdn-provider.example`, `mail.bank.example`, `vqzr7hd0ka.test`.
4. **Plan a disruption.** For the worked example, write the order in which you would preserve evidence, sinkhole, contain, and block, and justify each step.

## Key takeaways

- C2 links an implant to its controller. Implants usually check in from the inside, because outbound web and DNS traffic is allowed.
- Beaconing is detectable through regularity, consistent sizes, rare destinations, and unusual processes, but legitimate polling looks similar.
- Encryption hides content, not metadata, and C2 usually hides inside ordinary web and DNS traffic.
- Domain generation algorithms keep operators reachable, but they produce random-looking names and many failed lookups.
- Disrupt deliberately: preserve evidence, understand what the malware does when contact fails, and prefer sinkholing when it reveals other infected hosts.

## Go deeper

- **The ATT&CK catalog.** Read the detection sections of three Command and Control techniques beyond T1071, such as Web Service (T1102) and Protocol Tunneling (T1572), and compare the data sources each one needs.
- **Why bots fall under central control.** The CS 161 malware chapter defines a botnet as machines "under centralized control." [Botnets and coordinated demand](lesson:MAL-05) shows what that control enables at scale.
- **Open question.** As more C2 moves into popular cloud services and encrypted DNS, which signals survive? Consider what a defender can still measure when both the destination and the content look ordinary.
