---
topicId: NET-03
title: ARP and local-network trust
summary: Learn how ARP maps IPv4 addresses to hardware addresses on a local network, why any device on the link can answer for any address, and how to recognize ARP spoofing and weigh the switch, host, and cryptographic defenses that limit it.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 25
objectives:
  - Explain how an ARP request and reply map an IPv4 address to a MAC address, and why ARP works only within one local network.
  - Identify the trust assumptions in ARP processing that let any device on the link change another host's ARP cache.
  - Interpret ARP tables and a short capture to recognize signs of ARP spoofing and rule out benign explanations.
  - Evaluate defenses such as DHCP snooping with dynamic ARP inspection, static entries, client isolation, monitoring, and end-to-end encryption, including the limits of each.
prerequisites: [NET-01]
concepts: [arp, mac-address, arp-spoofing, adversary-in-the-middle]
keywords:
  - Address Resolution Protocol
  - ARP cache
  - ARP table
  - gratuitous ARP
  - ARP poisoning
  - ARP cache poisoning
  - MAC address
  - broadcast domain
  - LAN
  - dynamic ARP inspection
  - DAI
  - DHCP snooping
  - DHCP spoofing
  - rogue DHCP server
  - static ARP entry
  - client isolation
  - VLAN
  - arpwatch
  - Neighbor Discovery
  - NDP
  - router advertisement
  - man-in-the-middle
  - RFC 826
  - RFC 3756
  - T1557
  - T1557.002
  - T1557.003
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 26: Wired Local Networks: ARP'
    url: https://textbook.cs161.org/network/arp.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 826: An Ethernet Address Resolution Protocol'
    url: https://www.rfc-editor.org/rfc/rfc826
    publisher: IETF (RFC Editor)
  - title: 'RFC 3756: IPv6 Neighbor Discovery (ND) Trust Models and Threats'
    url: https://www.rfc-editor.org/rfc/rfc3756
    publisher: IETF (RFC Editor)
  - title: 'MITRE ATT&CK T1557.002: Adversary-in-the-Middle: ARP Cache Poisoning'
    url: https://attack.mitre.org/techniques/T1557/002/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK T1557.003: Adversary-in-the-Middle: DHCP Spoofing'
    url: https://attack.mitre.org/techniques/T1557/003/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: Mallory can poison the ARP cache of a laptop on the same Wi-Fi network, but not the cache of a laptop on another continent. Why?
    choices:
      - ARP messages are not routed; they travel only within one local network, so the sender must be on the same link as the victim.
      - Routers on the Internet verify ARP signatures, but home routers do not.
      - ARP replies are encrypted with a key that only devices on the same network share.
      - Distant laptops do not use ARP because they use IPv6 instead.
    answer: 0
    explanation: ARP runs directly over the link layer to map addresses for the next hop, and routers do not forward it. An attacker therefore needs a presence on the victim's link, for example by joining the same Wi-Fi network or compromising a machine on it.
  - question: "A host already has the entry 192.0.2.1 -> 00:00:5e:00:53:01. It receives an ARP message it never asked for, whose sender fields say 192.0.2.1 is at 00:00:5e:00:53:66. What does the classic RFC 826 algorithm do?"
    choices:
      - It discards the message, because replies are accepted only after a matching request.
      - It updates the existing entry to the new MAC address, because nothing in ARP proves who owns an address.
      - It asks the gateway to confirm with a signed reply before changing anything.
      - It keeps both MAC addresses and alternates frames between them.
    answer: 1
    explanation: RFC 826 updates an existing entry whenever an ARP packet's sender address matches it, before it even looks at the opcode. Operating systems differ in details, but none can verify ownership, because ARP carries no authentication at all.
  - question: "In alice's ARP table, the gateway 192.0.2.1 and the host 192.0.2.66 now map to the same MAC address, 00:00:5e:00:53:66. What is the best next step?"
    choices:
      - Ignore it; ARP tables always map several addresses to one MAC address.
      - Send ARP messages back to 192.0.2.66 to restore the right mapping for everyone.
      - Save the evidence (tables, timestamps, a capture) and report it to the network's operators, who can locate the device's switch port or access point.
      - Conclude that the DNS resolver has been poisoned and change DNS servers.
    answer: 2
    explanation: One device claiming the gateway's address is a classic sign of ARP spoofing, though a benign change is possible. Operators can confirm it from switch or wireless logs. Sending your own ARP traffic would itself be spoofing on a network you do not run.
  - question: What does a switch feature such as dynamic ARP inspection check?
    choices:
      - That every ARP message is signed by the device that owns the address.
      - That ARP messages are encrypted before they leave a port.
      - That no more than one ARP request is sent per second on the network.
      - "That each ARP message's IP and MAC addresses match bindings the switch already trusts, such as those it recorded from DHCP, and it drops messages that do not."
    answer: 3
    explanation: With DHCP snooping, the switch records which address the DHCP server gave to which device; ARP inspection then drops ARP messages that contradict those records. Nothing is signed or encrypted. Its limits are configuration and coverage, since devices with manually set addresses need manual entries and only links through such a switch are checked.
  - question: Mallory has used ARP spoofing to get between alice and the gateway, but alice's browser connects to https://shop.example with full certificate validation. What can mallory still do?
    choices:
      - Read alice's password, because TLS does not protect traffic that passes through an attacker.
      - See which IP addresses alice talks to, how much, and when, and delay or drop her traffic.
      - Change the prices on the pages alice sees without any warning.
      - Nothing at all, because TLS also stops ARP spoofing.
    answer: 1
    explanation: TLS keeps content confidential and makes tampering detectable, so mallory is reduced to an observer of metadata who can also block traffic. ARP spoofing itself still succeeds; TLS limits what it gains.
---

## Why it matters

On a coffee shop's Wi-Fi, a dorm's Ethernet, or an office floor, your laptop shares a link with strangers. To send any packet beyond that link, it must hand the frame to the router, and to do that it must learn the router's hardware address. It asks with the [[arp|Address Resolution Protocol (ARP)]], a 1982 design that assumes everyone on the link is honest. A device that lies in ARP can make itself the destination for traffic meant for the router, and so become an [[adversary-in-the-middle]] without touching the router, the ISP, or DNS.

MITRE ATT&CK lists ARP cache poisoning (T1557.002) as a sub-technique of Adversary-in-the-Middle (T1557). Defenders therefore care about who can plug into a switch port or join a Wi-Fi network: on most local networks, being present is enough to be believed.

## The core idea

IP addresses get a packet across networks; [[mac-address|MAC addresses]] get a frame across one link (see [TCP/IP and packet anatomy](lesson:NET-01)). When alice's laptop at 192.0.2.10 sends a packet to the Internet, its routing table says to send it through the gateway at 192.0.2.1, so the laptop needs that gateway's MAC address.

Picture a crowded room. You call out, "Who is Pat? Pat, please wave," and you believe whoever waves. ARP works the same way: broadcast a question, believe the answer, remember it for a while.

The trust assumptions, stated plainly:

1. **Everyone on the link is honest.** Any device can answer for any IP address.
2. **Answers are not authenticated.** ARP carries no signatures, keys, or secrets.
3. **Caches learn from ARP traffic,** including, on many systems, messages nobody asked for.
4. **The attacker must be local.** ARP is never routed, so an attacker needs a presence on the same link, either their own device or a compromised one.

## How it works

### The ARP message

RFC 826 defines a small message carried directly in a link-layer frame with EtherType 0x0806, not inside IP. For Ethernet and IPv4 it is 28 bytes:

| Field                   | Size    | In alice's request          |
| ----------------------- | ------- | --------------------------- |
| Hardware type           | 2 bytes | 1 (Ethernet)                |
| Protocol type           | 2 bytes | 0x0800 (IPv4)               |
| Hardware address length | 1 byte  | 6                           |
| Protocol address length | 1 byte  | 4                           |
| Opcode                  | 2 bytes | 1 (request); a reply uses 2 |
| Sender hardware address | 6 bytes | 00:00:5e:00:53:0a           |
| Sender protocol address | 4 bytes | 192.0.2.10                  |
| Target hardware address | 6 bytes | 00:00:00:00:00:00 (unknown) |
| Target protocol address | 4 bytes | 192.0.2.1                   |

### Request and reply

The request goes to the broadcast address, ff:ff:ff:ff:ff:ff, so every device on the link receives it. Only the owner of the target address replies, directly to the asker.

```sequence
title: Alice's laptop finds the gateway's MAC address
participant A as Alice's laptop 192.0.2.10
participant N as Other hosts on the link
participant G as Gateway 192.0.2.1
A -> N: Broadcast: who has 192.0.2.1? Tell 192.0.2.10
A -> G: The same broadcast frame reaches the gateway
note N: Not their address, so they stay silent
G --> A: Reply: 192.0.2.1 is at 00:00:5e:00:53:01
note A: Caches 192.0.2.1 = 00:00:5e:00:53:01
A -> G: Frames for the Internet now go to that MAC
```

The gateway also learns something: because the request's sender fields name alice's laptop, the gateway records her mapping too, so it can send replies without asking.

### How a cache is updated

RFC 826's receiving algorithm is short, and its order matters. When a host receives an ARP packet, it first checks whether the sender's IP address is already in its table, and if so, it overwrites the stored MAC address with the one in the packet. Only then does it check whether it is the target, add the sender if it was not already listed, and finally look at the opcode to decide whether to reply.

Three consequences follow. Nothing checks that the sender actually owns the address it claims. Any ARP packet that names an address can rewrite that address's entry, not just replies to the host's own requests. And unsolicited "gratuitous" announcements, which hosts also send for legitimate reasons such as announcing a changed address, travel through the same unauthenticated path. Operating systems add their own rules, but none can verify ownership. Because the real gateway's own ARP messages rewrite the entry by the same rule, and entries expire, an attacker must keep repeating forged messages to keep a cache poisoned.

### ARP spoofing, conceptually

In [[arp-spoofing|ARP spoofing]], mallory, on the same Wi-Fi network at 192.0.2.66 with MAC address 00:00:5e:00:53:66, tells alice's laptop that the gateway's address belongs to her MAC address, and tells the gateway that alice's address belongs to her MAC address. She can race to answer alice's broadcast before the gateway does, or simply send replies nobody asked for. As the CS 161 textbook puts it, "Any received ARP replies are always cached, even if no broadcast request ... was ever made." Both victims then send their frames to mallory.

```sequence
title: ARP spoofing puts mallory in the path (conceptual)
participant A as Alice 192.0.2.10
participant M as Mallory 192.0.2.66
participant G as Gateway 192.0.2.1
M -> A: Unsolicited: 192.0.2.1 is at mallory's MAC
M -> G: Unsolicited: 192.0.2.10 is at mallory's MAC
note: Both caches now point at mallory's MAC address
A -> M: Frames meant for the gateway
M -> G: Forwarded, possibly read or altered first
G -> M: Replies meant for alice
M -> A: Forwarded back to alice
```

If mallory forwards the frames, alice's connections keep working, slightly slower, while mallory reads and can alter anything not protected by encryption. If she does not forward them, alice's traffic simply stops, a local denial of service.

### Neighbors that trust the same way

ARP is not the only local protocol that believes whoever answers. [[dhcp|DHCP]] gives a newly joined device its address, gateway, and DNS server, and a rogue DHCP server on the link can answer first with settings of its own choosing, such as a DNS server it controls (ATT&CK T1557.003, DHCP Spoofing). IPv6 does ARP's job with Neighbor Discovery, whose Neighbor Solicitation and Neighbor Advertisement messages fill a neighbor cache. RFC 3756 describes how forged advertisements can send packets for legitimate hosts and routers to the wrong link-layer address, and how forged Router Advertisements let an attacker masquerade as the local router. Treat "local network" as a trust boundary in both IP versions.

## Worked example

Alice tells the campus help desk that her connection felt slow and that her browser showed a certificate warning for `shop.example`, which she did not click through. The help desk asks for two snapshots of her ARP table and a short capture from her own laptop. Everything below is synthetic.

```text
10:00  $ ip neigh show
192.0.2.1  dev wlan0 lladdr 00:00:5e:00:53:01 REACHABLE
192.0.2.66 dev wlan0 lladdr 00:00:5e:00:53:66 STALE

10:05  $ ip neigh show
192.0.2.1  dev wlan0 lladdr 00:00:5e:00:53:66 REACHABLE
192.0.2.66 dev wlan0 lladdr 00:00:5e:00:53:66 STALE
```

```text
No.  Time    Source              Destination         Info
 12  3.101   00:00:5e:00:53:0a   ff:ff:ff:ff:ff:ff   Who has 192.0.2.1? Tell 192.0.2.10
 13  3.102   00:00:5e:00:53:01   00:00:5e:00:53:0a   192.0.2.1 is at 00:00:5e:00:53:01
 40  9.870   00:00:5e:00:53:66   00:00:5e:00:53:0a   192.0.2.1 is at 00:00:5e:00:53:66
 41  11.871  00:00:5e:00:53:66   00:00:5e:00:53:0a   192.0.2.1 is at 00:00:5e:00:53:66
 42  13.871  00:00:5e:00:53:66   00:00:5e:00:53:0a   192.0.2.1 is at 00:00:5e:00:53:66
```

**Step 1: Find what changed.** Between 10:00 and 10:05, the gateway's entry changed from ...:01 to ...:66.

**Step 2: Correlate.** The new MAC address is the one already listed for 192.0.2.66, so one device now claims two addresses, one of them the gateway's.

**Step 3: Read the capture.** Frames 12 and 13 are a normal request and reply. Frames 40 to 42 are replies that answer no request, all from the same device, repeated about every two seconds. Repetition is what an attacker needs to keep a cache entry from expiring or being corrected by the real gateway.

**Step 4: Rule out benign explanations.** Ask the operators whether the gateway was replaced or failed over to a backup, and whether 192.0.2.66 is one of their devices. A backup router could hold its own address and take over the gateway's, so the shared MAC address alone is not proof. What makes this suspicious is the combination: replies nobody requested, repeated every two seconds, addressed to alice rather than broadcast, seconds after the real gateway answered normally in frame 13. ATT&CK's detection guidance for T1557.002 flags the same signs: several IP addresses resolving to one MAC address, and unsolicited ARP replies.

**Step 5: Connect the symptoms.** Frames detouring through another device explain the slowness. The certificate warning is what you would expect if mallory tried to intercept HTTPS: she could redirect the traffic but could not present a valid certificate for `shop.example`, so alice's browser refused.

**Step 6: Respond appropriately.** The evidence supports likely ARP spoofing. Alice should not probe or "fight back" against 192.0.2.66; she should send her notes, timestamps, and capture to the network operators, who can find which switch port or access point that MAC address uses. Meanwhile she can move to a trusted network or a VPN.

## Defenses

> [!ETHICS] Only test systems you own or have written permission to test.

- **DHCP snooping and dynamic ARP inspection.** A managed switch can record which address the DHCP server gave to which device (DHCP snooping), block DHCP offers from unexpected servers, and drop ARP messages that contradict its records (dynamic ARP inspection). Limits: devices with manually set addresses need manual entries, a misconfiguration can cut off legitimate hosts, and only links through such switches are checked.
- **Control who joins the link.** Network access control, such as 802.1X on wired ports and per-user credentials on Wi-Fi, keeps strangers off the network. Limit: a legitimate member or a compromised machine is still inside.
- **Shrink and isolate the link.** VLANs split one physical network into smaller virtual ones, and many Wi-Fi systems can stop clients from sending frames to each other at all. Fewer neighbors means fewer devices that can lie to you (see [network segmentation](lesson:NET-07)). Limit: devices that legitimately need to talk directly lose that ability.
- **Pin critical mappings.** A static ARP entry for the gateway on a sensitive host cannot be overwritten by forged messages, and ATT&CK also suggests turning off cache updates from gratuitous ARP where the system allows it. Limits: static entries may be infeasible on large networks, and they break when hardware changes.
- **Monitor bindings.** Tools such as arpwatch, and network [[ids|intrusion detection systems]], track IP-to-MAC pairings and alert on suspicious changes. Limit: hardware swaps and failovers trigger alerts too, so someone must investigate.
- **Encrypt end to end, and heed warnings.** [[tls|TLS]], SSH, and VPNs keep content confidential and make tampering detectable even if ARP is poisoned. ATT&CK also recommends training users to be suspicious of certificate errors, because an interceptor may present its own certificate. Limits: the attacker still sees metadata and can drop traffic, and applications that skip certificate checks gain nothing.

## Common misconceptions

- **"ARP spoofing needs access to the router."** It needs only a presence on the same link.
- **"Switches prevent ARP spoofing."** An ordinary switch forwards ARP like any other frame. Only switches with ARP inspection turned on check it.
- **"Wi-Fi encryption stops it."** [[wpa2|WPA2]] and [[wpa3|WPA3]] protect each device's link from outsiders, but mallory, as an authenticated member of the same network, can still send ARP messages through the access point.
- **"HTTPS makes ARP spoofing harmless."** HTTPS limits the damage to metadata and blocking, and only when certificates are validated; plaintext protocols on the same network are fully exposed.
- **"An ARP change always means an attack."** Hardware swaps and address reassignments change mappings too. Look for the pattern: unsolicited, repeated claims to an important address by a device that also holds another one.

## Try it yourself

Do these on your own computer only. Viewing your own tables is harmless. Do not send ARP messages, run spoofing tools, or capture traffic on networks you do not own or administer.

```bash
# Linux
ip route show default        # your gateway's IP address
ip neigh show                # your ARP (neighbor) table

# macOS
netstat -rn | grep default
arp -a

# Windows (PowerShell)
Get-NetRoute -DestinationPrefix 0.0.0.0/0
Get-NetNeighbor -AddressFamily IPv4
```

1. Find your default gateway's IP address, then find its MAC address in your ARP table. On a network you own, compare it with the MAC address your router's admin page shows for its local interface.
2. Note which other devices appear in the table and in which state. Why do only devices on your own link appear, never websites you visited?
3. Optional, on your own machine: capture in Wireshark, apply the display filter `arp`, then open a page. If no ARP appears, your cache already held the gateway's entry; wait a few minutes and try again. Identify the request, the reply, and the sender and target fields from the table above.
4. Paper exercise: in the worked example, suppose frame 13 had never appeared and the 10:00 snapshot already showed ...:66 for the gateway. What extra evidence would you want before concluding that the gateway itself had not simply been replaced?

## Key takeaways

- ARP maps an IPv4 address to a MAC address on one link by broadcasting a question and believing the answer.
- RFC 826 updates cached entries from any ARP packet that names an address, and nothing proves the sender owns that address.
- ARP spoofing lets any device on the link redirect a victim's frames through itself, turning it into an adversary-in-the-middle; rogue DHCP servers and forged IPv6 Neighbor Discovery messages exploit the same local trust.
- Evidence of spoofing is a pattern: one MAC address claiming the gateway's address, unsolicited and repeated, alongside another address of its own.
- Switch inspection, access control, isolation, and monitoring shrink the risk; end-to-end encryption limits what a successful attacker gains.

## Go deeper

- Read the "Packet Reception" section of [RFC 826](https://www.rfc-editor.org/rfc/rfc826) and find the line that updates an existing entry before the opcode is examined. Open question: could address resolution on a shared link be authenticated without forcing every device to manage keys?
- MITRE ATT&CK's [T1557.002 page](https://attack.mitre.org/techniques/T1557/002/) lists procedure examples, mitigations, and detection ideas. Compare its detection advice with the evidence pattern in the worked example.
