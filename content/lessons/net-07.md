---
topicId: NET-07
title: Network segmentation and firewalls
summary: Learn how firewalls decide which traffic may cross a boundary, how segmentation divides a network into zones so one compromise does not reach everything, and how to test a rule set against approved traffic fixtures to catch shadowed rules and overly broad exceptions.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Compare stateless packet filters, stateful firewalls, and application proxies by what each can see and decide.
  - Predict how an ordered, first-match rule set with a default deny handles a given flow, and identify shadowed rules.
  - Design zones and an allowed-flow matrix that limit lateral movement for a small organization.
  - Test a rule set against approved traffic fixtures and explain each failure and its fix.
  - Explain what port scanning reveals about a network and how default-deny policies change the result.
prerequisites: [NET-01, NET-04, FND-04]
concepts: [firewall, stateful-firewall, network-segmentation, port-scanning, vpn]
keywords:
  - packet filter
  - stateless firewall
  - stateful inspection
  - connection tracking
  - application proxy
  - access control list
  - ACL
  - firewall rule set
  - default deny
  - implicit deny
  - first match
  - shadowed rule
  - DMZ
  - demilitarized zone
  - VLAN
  - microsegmentation
  - zero trust
  - east-west traffic
  - lateral movement
  - egress filtering
  - host-based firewall
  - nftables
  - port scan
  - network service discovery
  - T1046
  - M1030
  - NIST SP 800-41
  - NIST SP 800-207
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 35: Firewalls'
    url: https://textbook.cs161.org/network/firewalls.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'NIST SP 800-41 Rev. 1: Guidelines on Firewalls and Firewall Policy'
    url: https://csrc.nist.gov/pubs/sp/800/41/r1/final
    publisher: National Institute of Standards and Technology (NIST)
  - title: 'NIST SP 800-207: Zero Trust Architecture'
    url: https://csrc.nist.gov/pubs/sp/800/207/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-207
  - title: 'MITRE ATT&CK T1046: Network Service Discovery'
    url: https://attack.mitre.org/techniques/T1046/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: "A rule set reads, top to bottom: (1) allow guest -> any, tcp, any port; (2) deny guest -> db, tcp, any port; then a default deny. With first-match evaluation, what happens to a guest's connection to the database on port 5432?"
    choices:
      - It is denied by rule 2, because deny rules always take priority over allow rules.
      - It is denied by the default rule, because the database is never reachable from guests.
      - It is allowed by rule 1, which matches first, so rule 2 can never take effect.
      - It is allowed only if the guest has connected to the database before.
    answer: 2
    explanation: In a first-match rule set, the first rule whose conditions match decides. Rule 1 matches every guest TCP flow, so rule 2 is shadowed and never fires. A fixture that expects "guest reaches the db" to be denied exposes this kind of mistake.
  - question: A stateful firewall allows hosts on the office network to open TCP connections to port 443 on the Internet. Why do replies from web servers get back in without an explicit inbound rule?
    choices:
      - The firewall tracks each outgoing connection and admits packets that belong to it, while dropping inbound packets that match no tracked connection.
      - Web servers sign their replies, and the firewall checks the signatures.
      - Inbound traffic to port 443 is always allowed by convention.
      - The firewall cannot block inbound traffic at all; only outbound rules exist.
    answer: 0
    explanation: Connection tracking is what makes a firewall stateful. It records the flows that policy allowed and lets their return packets through, so a single outbound rule covers both directions, and unsolicited inbound packets are dropped by default.
  - question: An attacker phishes one employee laptop in a flat network where every host can reach every other host. What does segmentation change?
    choices:
      - Nothing, because once one host is compromised the whole network is lost.
      - It prevents phishing emails from being delivered.
      - It encrypts all traffic between zones automatically.
      - It limits which systems the laptop can reach, so the attacker must find another weakness to move toward the database or backups, and the attempts can be logged.
    answer: 3
    explanation: Segmentation does not stop the first compromise. It shrinks what that compromise can reach, forcing lateral movement through enforcement points that can block and log it.
  - question: An authorized scan of your own server finds that port 5432 gives no answer at all, while port 25 answers with a TCP reset. What is the best interpretation?
    choices:
      - Both ports are closed and equally safe.
      - Port 25 has nothing listening, while something, probably a firewall, silently dropped the probe to 5432; a database may still be listening there and reachable from other zones.
      - Port 5432 is definitely unused, because an open port always answers.
      - The server is down, because it did not answer every probe.
    answer: 1
    explanation: A reset means the host answered and nothing was listening. Silence usually means a filter dropped the probe, which says nothing about whether a service runs behind it. That is why scans from different zones can give different answers.
  - question: Which change best reduces the risk from a remote-access VPN that gives employees a full connection into the office network?
    choices:
      - Requiring a longer VPN password but leaving network access unchanged.
      - Placing VPN users in their own zone and allowing only the specific services each role needs, with authentication at each service.
      - Moving the VPN server inside the database zone so it is better protected.
      - Turning off logging for VPN traffic to improve performance.
    answer: 1
    explanation: A VPN protects traffic in transit but, by default, puts the remote device inside the perimeter. Treating VPN users as a zone with least-privilege flows, plus per-service authentication, limits what a stolen credential or infected laptop can reach.
---

## Why it matters

Many networks still match a description of firewalled networks by Bill Cheswick that the CS 161 textbook repeats: a "crunchy outer coating, with a soft, chewy center." The Internet edge is guarded, but inside, every machine can reach every other. In such a network, an attacker who phishes one laptop can talk directly to the database, the backup server, and the administrators' machines. Moving from one compromised machine to the next is called lateral movement, and a flat network makes it easy.

[[network-segmentation|Network segmentation]] divides a network into zones with controlled paths between them, and [[firewall|firewalls]] enforce which paths exist. Done well, segmentation turns one compromised laptop into a contained incident. Done poorly, with a forgotten "temporary" rule that allows everything, it gives a false sense of safety.

Attackers find their way around a network with [[port-scanning|port scanning]]: probing addresses and ports to see which services answer. MITRE ATT&CK catalogs this as Network Service Discovery (T1046), and its listed mitigations are this lesson's subject: close unnecessary ports and services, detect and block scans, and segment the network to protect critical servers. Defenders scan their own networks, with authorization, for the same reason: every reachable service is part of the [[attack-surface]].

## The core idea

Think of an office building. A guard in the lobby checks badges at the entrance, but if every internal door is propped open, one visitor who slips past the lobby can walk into the server room. Segmentation adds doors between departments; firewall rules are the list, posted at each door, of who may pass and why.

The assumptions behind that picture:

1. **Traffic between zones passes through an enforcement point.** A machine with a second network card, an unmanaged wireless access point, or a forgotten tunnel can bypass the door entirely.
2. **Header fields identify traffic well enough.** Rules match on addresses, protocols, and ports. Source addresses can be forged (see [TCP/IP and packet anatomy](lesson:NET-01)) and port numbers are conventions, so these are approximations of "who" and "what."
3. **Allowed traffic is trusted.** A firewall that permits HTTPS to the web server also passes any attack carried inside that HTTPS.
4. **The rules are correct and current.** Order matters, exceptions pile up, and nobody notices a rule that is too broad until it is tested.

## How it works

### Kinds of firewalls

- A **stateless packet filter** judges each packet on its own by its addresses, protocol, and ports. It is fast, but it cannot tell a reply from an unsolicited packet without extra rules.
- A [[stateful-firewall|stateful firewall]] tracks connections, using the TCP states from [TCP connection state](lesson:NET-04). One rule such as "office hosts may connect out to port 443" admits the replies automatically, and inbound packets that belong to no tracked connection are dropped. Tracking costs memory, so the CS 161 textbook warns that per-connection state must stay small.
- An **application proxy** ends the client's connection and opens its own to the server, so it can inspect the application protocol itself. It must understand every protocol it mediates, and it can become a performance bottleneck.

Firewalls sit at zone boundaries (network firewalls) and on individual machines (host firewalls); using both is a form of defense in depth.

### Rules and how they are evaluated

A rule names an action and the traffic it applies to: source, destination, protocol, and port. Most firewalls evaluate rules from top to bottom, and the first rule that matches decides. A final default rule denies anything no earlier rule allowed. This default deny is the network version of [[least-privilege]]: traffic is allowed only when someone has decided it should be. The CS 161 textbook calls default deny "usually a much safer bet" than default allow, because a forgotten rule then breaks a feature, which people notice, instead of silently leaving a hole.

First-match evaluation creates a classic mistake. A rule is **shadowed** when an earlier rule matches every packet it would match, so it can never fire. In the rule set below, rule 4 was added as a temporary exception for a vendor on the guest network, and it silently overrides rule 6:

| No. | Action | Source   | Destination | Protocol | Port |
| --- | ------ | -------- | ----------- | -------- | ---- |
| 1   | allow  | internet | web         | tcp      | 443  |
| 2   | allow  | web      | app         | tcp      | 8443 |
| 3   | allow  | admin    | app         | tcp      | 22   |
| 4   | allow  | guest    | any         | tcp      | any  |
| 5   | allow  | app      | db          | tcp      | 5432 |
| 6   | deny   | guest    | db          | tcp      | any  |
| 7   | allow  | admin    | db          | tcp      | 22   |
| -   | deny   | any      | any         | any      | any  |

### Designing zones

Segmentation starts from the data and the flows, not from the hardware. For a small online shop, the zones might be: the Internet; a demilitarized zone (DMZ) for public web servers; an application zone; a database zone; administrators' workstations; and guest Wi-Fi. An allowed-flow matrix then lists, for each pair of zones, which connections may be opened and on which ports. Everything else is denied.

Traffic between internal systems is often called east-west traffic, as opposed to north-south traffic that crosses the Internet edge. VLANs (see [ARP and local-network trust](lesson:NET-03)) separate zones at the link layer; routers or firewalls between VLANs enforce the matrix.

Segmentation still trusts whatever sits inside a zone. [[zero-trust|Zero trust]] architecture, described in NIST SP 800-207, pushes further: it "assumes there is no implicit trust granted to assets or user accounts based solely on their physical or network location." Each request is authenticated and authorized on its own, and enforcement can move down to individual workloads, sometimes called microsegmentation. A [[vpn|virtual private network (VPN)]] needs care in this picture: it protects traffic between a remote device and the network, but by default it places that device inside the perimeter, so VPN users deserve a zone of their own with narrow flows.

### Port scanning, conceptually

A port scan sends connection attempts to many ports and judges each by the reply. The sequence below shows what an authorized scan of a host behind a stateful firewall with a default deny might see.

```sequence
title: How a host and firewall answer probes (conceptual)
participant S as Authorized scanner
participant F as Firewall
participant H as Host 192.0.2.10
S -> H: SYN to port 443 (allowed by policy)
H --> S: SYN-ACK: open, a service is listening
S -> H: SYN to port 25 (allowed by policy)
H --> S: RST: closed, nothing is listening
S -> F: SYN to port 5432 (not allowed)
F -x S: Dropped by the default deny: no answer
```

An open port means a service accepts connections; a closed port answers with a reset; a filtered port gives no answer, usually because a firewall dropped the probe. A default deny therefore hides services rather than removing them: the database on port 5432 may still answer probes from a zone the policy allows.

## Worked example

The activity for this topic is to test a rule set against approved traffic fixtures. A fixture is a small, approved example of traffic with the verdict the policy says it must get, like a unit test for the firewall. This Python sketch evaluates the rule set above, first match wins, with a default deny:

```python
import ipaddress

ZONES = {  # the fictional shop.example data center
    "web":   "203.0.113.0/28",    # public web servers (DMZ)
    "app":   "192.0.2.0/26",      # application servers
    "db":    "192.0.2.64/27",     # databases
    "admin": "192.0.2.96/28",     # administrators' workstations
    "guest": "192.0.2.128/26",    # guest Wi-Fi
}

RULES = [  # evaluated top to bottom; the first match decides
    ("allow", "internet", "web",   "tcp", 443),
    ("allow", "web",      "app",   "tcp", 8443),
    ("allow", "admin",    "app",   "tcp", 22),
    ("allow", "guest",    "any",   "tcp", "any"),  # "temporary" vendor rule
    ("allow", "app",      "db",    "tcp", 5432),
    ("deny",  "guest",    "db",    "tcp", "any"),
    ("allow", "admin",    "db",    "tcp", 22),
]


def in_zone(addr, zone):
    ip = ipaddress.ip_address(addr)
    if zone == "any":
        return True
    if zone == "internet":   # anything outside our own zones
        return not any(ip in ipaddress.ip_network(n) for n in ZONES.values())
    return ip in ipaddress.ip_network(ZONES[zone])


def decide(src, dst, proto, port):
    for number, (action, src_zone, dst_zone, rule_proto, rule_port) in enumerate(RULES, 1):
        if (in_zone(src, src_zone) and in_zone(dst, dst_zone)
                and rule_proto == proto and rule_port in ("any", port)):
            return action, number
    return "deny", "default"
```

**Step 1: Write the fixtures.** Each one names a flow the security team has approved or forbidden. Five must be allowed, and three, from the Internet, the web tier, and the guest network to the database, must be denied:

```python
FIXTURES = [  # (description, (source, destination, protocol, port), expected)
    ("alice browses the shop",      ("198.51.100.23", "203.0.113.5", "tcp", 443),  "allow"),
    ("web tier calls the app tier", ("203.0.113.5", "192.0.2.10", "tcp", 8443),    "allow"),
    ("app tier queries the db",     ("192.0.2.10", "192.0.2.70", "tcp", 5432),     "allow"),
    ("admin manages the db host",   ("192.0.2.100", "192.0.2.70", "tcp", 22),      "allow"),
    ("guest browses the web",       ("192.0.2.150", "198.51.100.80", "tcp", 443),  "allow"),
    ("internet reaches the db",     ("198.51.100.23", "192.0.2.70", "tcp", 5432),  "deny"),
    ("web tier reaches the db",     ("203.0.113.5", "192.0.2.70", "tcp", 5432),    "deny"),
    ("guest reaches the db",        ("192.0.2.150", "192.0.2.70", "tcp", 5432),    "deny"),
]

failures = 0
for name, flow, expected in FIXTURES:
    action, rule = decide(*flow)
    failures += action != expected
    status = "ok  " if action == expected else "FAIL"
    print(f"{status} {name:28} expected {expected:5} got {action:5} (rule {rule})")
print(f"{failures} failing fixture(s)")
```

**Step 2: Run them.**

```text
ok   alice browses the shop       expected allow got allow (rule 1)
ok   web tier calls the app tier  expected allow got allow (rule 2)
ok   app tier queries the db      expected allow got allow (rule 5)
ok   admin manages the db host    expected allow got allow (rule 7)
ok   guest browses the web        expected allow got allow (rule 4)
ok   internet reaches the db      expected deny  got deny  (rule default)
ok   web tier reaches the db      expected deny  got deny  (rule default)
FAIL guest reaches the db         expected deny  got allow (rule 4)
1 failing fixture(s)
```

**Step 3: Diagnose.** The failing fixture names the rule that decided it: rule 4, the vendor exception. Because rule 4 matches every TCP flow from the guest network, rule 6 is shadowed. Notice that the fixtures that passed did not prove the rule set safe; only a fixture for a forbidden flow exposed the problem.

**Step 4: Fix narrowly.** Replace rule 4 with what the vendor actually needed, `("allow", "guest", "internet", "tcp", 443)`, and rerun. All eight fixtures pass, and the guest-to-database flow is now denied by rule 6.

**Step 5: Keep the fixtures.** Store them with the rule set and run them on every change, so the next "temporary" exception fails a test instead of opening the database.

## Defenses

> [!ETHICS] Only test systems you own or have written permission to test.

- **Default deny with narrow rules.** Allow only flows someone has approved, with specific zones, protocols, and ports. Limit: it requires knowing what traffic is needed, and broad exceptions creep in under pressure.
- **Segment by sensitivity.** Put databases, backups, and administrative systems in their own zones, reachable only from the systems that need them. Limit: every exception adds complexity that must be maintained.
- **Filter outbound traffic too.** [[egress-filtering|Egress filtering]] limits where a compromised host can send data or receive commands. Limit: attackers can hide in allowed protocols such as HTTPS or DNS.
- **Test and review the rules.** Run fixtures on every change, look for shadowed and unused rules, and log both denied and allowed flows. Limit: tests only check the cases someone thought to write.
- **Authenticate inside the network as well.** Host firewalls and per-service authentication keep a breach of one zone from being a breach of everything. Limit: more places to configure and manage.
- **Minimize what is exposed.** Close unused services, and scan your own address ranges, with authorization, to compare what is reachable with what the policy says. Limit: a scan is a snapshot, and detecting other people's scans does not stop exploitation.

## Common misconceptions

- **"We have a firewall, so we are protected."** A firewall only filters traffic that passes through it, and it passes attacks inside allowed traffic.
- **"Everything inside the network can be trusted."** Compromised laptops, insiders, and VPN users are all inside. Treat internal traffic with suspicion too.
- **"NAT is a firewall."** [[network-address-translation|Network address translation]] drops unsolicited inbound connections only because no mapping exists for them. Port forwarding deliberately opens paths through it, and NAT provides no policy at all for outbound or internal traffic.
- **"Rule order does not matter."** With first-match evaluation, an early broad rule overrides everything after it.
- **"A filtered port means nothing is there."** It means a filter dropped the probe; the service may be reachable from another zone.

## Try it yourself

Use only your own computer. Do not scan hosts or networks you do not own, including your school's or employer's, without written permission.

```bash
# Which services on your machine accept connections?
ss -tlnu                               # Linux
netstat -an | grep LISTEN              # macOS
Get-NetTCPConnection -State Listen     # Windows PowerShell

# Is your host firewall on, and what does it do by default?
sudo nft list ruleset                  # Linux with nftables (read-only listing)
/usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate   # macOS
Get-NetFirewallProfile | Format-Table Name, Enabled, DefaultInboundAction   # Windows
```

1. List the services listening on your machine. For each, decide whether it needs to accept connections from other machines, and whether your host firewall would allow them.
2. Copy the toy evaluator and the fixtures from the worked example. Add a fixture: a guest opens `https://shop.example` at 203.0.113.5. Predict the verdict, run it, and fix the rule set without reopening the database.
3. Write a function that reports shadowed rules: rules whose zones, protocol, and port are all covered by an earlier rule.
4. Paper exercise: draw zones and an allowed-flow matrix for a home network with laptops, phones, a smart TV, and a guest network. Which flows would you deny that are allowed today?

## Key takeaways

- Firewalls enforce a policy at a boundary; segmentation decides where the boundaries are, so one compromise does not reach everything.
- Stateless filters judge packets alone, stateful firewalls track connections, and application proxies inspect the protocol itself.
- Ordered rule sets are evaluated first match wins, with a default deny; an early broad rule can shadow later ones.
- Testing a rule set against approved fixtures, including flows that must be denied, catches mistakes before attackers do.
- A firewall only controls traffic that passes through it, and it trusts whatever it allows.

## Go deeper

- NIST SP 800-41 Rev. 1, [Guidelines on Firewalls and Firewall Policy](https://csrc.nist.gov/pubs/sp/800/41/r1/final), compares firewall technologies and gives recommendations for planning, testing, and managing firewall policy. Open question: once a rule set grows to thousands of entries, how could you prove that a change cannot open a forbidden flow, rather than only testing examples?
- NIST SP 800-207, [Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final), describes how to move enforcement from network perimeters to users, assets, and resources. Discussion: which rules in the worked example would survive in a zero trust design, and which would turn into per-request authorization?
