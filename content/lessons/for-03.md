---
topicId: FOR-03
title: Network forensics
summary: >-
  How investigators reconstruct network activity from packet captures, flow records, and device logs;
  how DHCP and NAT records tie an address to a host at a moment in time; what encryption hides and
  leaves visible; and how to correlate records kept on different clocks.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Compare full packet capture, flow records, and device logs by what each records, what it costs, and what it misses.
  - Attribute a connection to an internal host by chaining DHCP lease and NAT translation records within a time window.
  - Normalize records from sources with different time zones and clock errors to UTC before correlating them.
  - Separate what network metadata shows about an encrypted transfer from what it can only suggest.
prerequisites: [NET-01, NET-08, FOR-01]
concepts: [network-forensics, flow-record, network-address-translation, dhcp]
labs: []
keywords:
  - network forensics
  - packet capture
  - pcap
  - full packet capture
  - NetFlow
  - IPFIX
  - RFC 7011
  - flow data
  - 5-tuple
  - NAT
  - carrier-grade NAT
  - CGN
  - address sharing
  - DHCP lease
  - RFC 6302
  - BCP 162
  - DNS logs
  - firewall logs
  - TLS metadata
  - server name indication
  - SNI
  - log correlation
  - attribution
sources:
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: 'RFC 7011: Specification of the IP Flow Information Export (IPFIX) Protocol for the Exchange of Flow Information'
    url: https://www.rfc-editor.org/rfc/rfc7011
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 6302: Logging Recommendations for Internet-Facing Servers (BCP 162)'
    url: https://www.rfc-editor.org/rfc/rfc6302
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 3227: Guidelines for Evidence Collection and Archiving (BCP 55)'
    url: https://www.rfc-editor.org/rfc/rfc3227
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
quiz:
  - question: >-
      A cloud provider reports that an upload came from public address 198.51.100.7 at 04:46 UTC. Your
      office has 300 computers behind that single address. What record do you need to identify the
      computer?
    choices:
      - The office's DNS zone file.
      - A NAT translation log entry matching the outside address, the outside source port, and the time.
      - The provider's TLS certificate.
      - A full packet capture from the provider's network.
    answer: 1
    explanation: >-
      Behind address sharing, the public address alone names hundreds of possible hosts. The NAT log maps
      the outside address and port back to an inside address and port at a specific time, and a DHCP
      lease then maps that inside address to a device. This is why RFC 6302 asks servers to log source
      ports and accurate timestamps.
  - question: What does an IPFIX or NetFlow record of a TLS connection let an examiner establish?
    choices:
      - Which file was uploaded.
      - The username typed into the website.
      - Which endpoints talked, when, for how long, and how many packets and bytes moved in each direction.
      - Whether the content was malicious.
    answer: 2
    explanation: >-
      A flow record summarizes a set of packets sharing the same key, typically addresses, ports, and
      protocol, with timestamps and counts. It carries no payload, so questions about content need
      endpoint or server-side evidence.
  - question: >-
      The DHCP server logs local time (UTC-05:00) and the firewall logs UTC. An examiner lines them up as
      recorded. What is the most likely consequence?
    choices:
      - The examiner may attribute the connection to whichever device held the address five hours away from the true time.
      - Nothing, because DHCP leases last at least a day.
      - The firewall log becomes inadmissible.
      - The hashes of the log files stop matching.
    answer: 0
    explanation: >-
      An address belongs to a device only for the lease window. A five-hour error can land on a different
      lease and therefore a different device. Convert every source to UTC, and record the offset and its
      justification, before correlating.
  - question: Why is an IP address on its own weak evidence of which person was responsible for traffic?
    choices:
      - IP addresses are encrypted by TLS.
      - Addresses are shared, reassigned, and relayed through NAT, DHCP, VPNs, and proxies, and even a correct host attribution says nothing about who was using the host.
      - IP addresses change every second.
      - Courts do not accept network logs.
    answer: 1
    explanation: >-
      Each layer of address sharing or reassignment adds a time-bounded mapping that must be documented.
      Even when the chain leads correctly to one computer, identifying the person requires other
      evidence, such as logon records, physical access, or the account used.
  - question: An egress sensor recorded no packets for a connection that the firewall logged. What is the most careful first interpretation?
    choices:
      - The firewall log is fabricated.
      - The connection never happened.
      - The sensor may not have seen it, for example because of its placement, a capture filter, or dropped packets, so check its coverage and drop counters before concluding anything.
      - The traffic must have been encrypted.
    answer: 2
    explanation: >-
      Absence of evidence from one sensor is weak evidence of absence. Every capture has a vantage
      point, filters, and capacity limits, and a careful examiner documents them and looks for an
      independent source before treating a gap as meaningful.
---

## Why it matters

When an intruder wipes a laptop, the laptop's own records may be gone. The network often remembers anyway. The firewall logged the connection, the DNS resolver logged the name lookup, and the flow collector logged how many bytes moved, all on systems the intruder never touched. RFC 3227's order of volatility accordingly lists "remote logging and monitoring data that is relevant to the system in question" among the evidence to collect. Network records are frequently the only independent witnesses to what a host did.

They are also easy to misread. An IP address is not a computer, and a computer is not a person. Addresses are leased, shared behind translation devices, and relayed through VPNs and proxies, and every mapping between them is valid only for a window of time. RFC 6302 was written because IPv4 address sharing meant that an address alone no longer identified a subscriber. Encryption adds a second limit: for most modern traffic the network sees who talked to whom, when, and how much, but not what was said.

## The core idea

[[network-forensics|Network forensics]] is the capture, recording, and analysis of network activity to reconstruct what happened and to tie it to specific hosts. Its evidence comes in two broad kinds. Content evidence is a [[packet-capture]] holding the actual bytes. Metadata evidence is summaries and logs: [[flow-record|flow records]], protocol logs, and the decisions of devices such as firewalls and DNS resolvers. Most investigations rely mainly on metadata, because content is costly to keep, rarely kept for long, and usually encrypted.

An analogy: a flow record is like a phone company's call record, listing who called whom, when, and for how long, while a packet capture is like a recording of the call. Most of the time the investigator has only call records, and a careful one never claims to know what was said.

The central technique is correlation. One event, such as an upload, leaves separate traces in several places, and the examiner joins them on shared keys: addresses, ports, protocol, and a time window. Three assumptions must be checked first. Each sensor sees only the traffic that passes its vantage point. Each log records what its device believed, which may include a forged address. And each source keeps its own clock, so every timestamp must be put on one scale before comparison.

## How it works

### Sources of network evidence

| Source                                             | What it records                                                                               | Storage cost | Blind spots                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| Full packet capture                                | Every byte of each packet seen, with capture timestamps                                       | Very high    | Encrypted payloads; packets outside the sensor's view or dropped under load |
| Flow records (NetFlow, IPFIX)                      | One summary per flow: addresses, ports, protocol, start and end times, packet and byte counts | Low          | No content; sampled collection can miss short flows                         |
| Sensor protocol logs                               | Parsed details such as DNS queries, HTTP requests, and TLS server names                       | Moderate     | Only protocols the sensor understands; nothing inside encryption            |
| Device logs (firewall, NAT, DHCP, DNS, VPN, proxy) | Each device's own decisions: allows, denies, translations, leases, lookups                    | Low          | Only what the device was configured to log, for as long as it is kept       |

RFC 7011, the IPFIX standard, defines a flow as "a set of packets or frames passing an Observation Point in the network during a certain time interval," commonly keyed by the 5-tuple of source and destination addresses, source and destination ports, and transport protocol. The record carries counts and timestamps, not payload.

### From address to host

Attribution is a chain of time-bounded mappings, and each link needs its own record.

- **[[dhcp|DHCP]] leases** map an internal [[ip-address]] to a device's hardware (MAC) address and hostname, for the duration of the lease.
- **[[network-address-translation|Network address translation (NAT)]]** maps an inside address and [[port]] to a shared outside address and port. Anyone outside, such as a cloud provider or a victim, sees only the shared address. RFC 6302 therefore recommends that Internet-facing servers log the source port as well as the address, with timestamps "in UTC, accurate to the second, from a traceable time source."
- **VPNs and proxies** add further mappings, each with its own logs.

A completed [[tcp|TCP]] handshake makes it unlikely that a distant attacker forged the source address, because the replies had to reach that address. A device on the same local network can still impersonate another, for example through [[arp-spoofing]], so attribution on a shared segment needs corroboration.

### What encryption leaves visible

[[tls|TLS]] hides content, but not the fact of communication. The network still sees endpoints, timing, packet sizes and byte counts, the preceding DNS lookups unless DNS is also encrypted, and, in most connections, the server name the client sent at the start of the TLS handshake. The questions shift from "what was sent?" to "who talked to whom, when, and how much?", and content questions move to endpoint or server-side evidence.

### Preserving network evidence

Network evidence follows the same rules as disk evidence from [Evidence integrity and chain of custody](lesson:FOR-01): hash every capture file and log export when you collect it, record custody, and work on copies. Record the context that later interpretation depends on: where the sensor sat, which interface and capture filter it used, whether the capture tool reported dropped packets, and each source's time zone and measured clock error. RFC 3227 asks collectors to "record the extent of the system's clock drift," and device logs rotate, so export them early.

## Worked example

Case 2026-0142 continues. The USB drive held a deleted `customers.zip` written at 04:41:16 UTC (see [Filesystem artifacts and metadata](lesson:FOR-02)). Did the export also leave the network? Bob collects four sources and notes each clock:

- **DNS resolver log**: UTC, synchronized with NTP.
- **Firewall NAT log**: UTC, but its clock read 2 seconds fast against the lab's reference when bob collected the log.
- **Egress sensor connection log**: UTC, as Unix epoch seconds.
- **DHCP server log**: local time, US Central, which is UTC-05:00 in October.

The diagram shows how one connection left traces in three of those places; each note says which record it produced.

```sequence
title: One upload, several records
participant W as W-17 (192.0.2.57)
participant D as DNS resolver
participant F as Firewall (NAT)
participant S as 203.0.113.50
W -> D: Query files.storage.test, type A
D --> W: 203.0.113.50
note D: DNS log entry, 04:46:07 UTC
W -> F: TCP from port 51544 to 443, TLS ClientHello
F -> S: Rewritten as 198.51.100.7, port 40112
note F: NAT log: inside and outside address and port
S --> W: TLS handshake completes (via NAT)
W -> S: About 700 KB of encrypted data
note: Egress sensor logs one connection, 82 seconds long
```

After converting every record to UTC, bob's correlation table reads:

| UTC (normalized)    | Source   | Record (simplified)                                                               | Conversion                      |
| ------------------- | -------- | --------------------------------------------------------------------------------- | ------------------------------- |
| 2026-10-03 22:02:10 | DHCP     | 192.0.2.57 leased to MAC 00:00:5e:00:53:2a, host W-17, 24 hours                   | Logged 17:02:10 local, plus 5 h |
| 2026-10-04 04:46:07 | DNS      | 192.0.2.57 asked for files.storage.test, answer 203.0.113.50                      | None                            |
| 2026-10-04 04:46:09 | Sensor   | 192.0.2.57:51544 to 203.0.113.50:443, TCP, TLS, 82 s, 702,113 bytes out, 5,120 in | Epoch 1791089169                |
| 2026-10-04 04:46:09 | Firewall | 192.0.2.57:51544 translated to 198.51.100.7:40112, to 203.0.113.50:443            | Logged 04:46:11, minus 2 s      |

Bob separates what each step shows.

1. **Observed:** the DHCP lease places 192.0.2.57 at W-17 throughout the window, and no release or reassignment appears in the log.
2. **Observed:** two seconds after resolving `files.storage.test`, W-17 opened a TLS connection to the answer's address and sent about 700 KB in 82 seconds.
3. **Observed:** the firewall translated that connection to 198.51.100.7, port 40112, which is all the storage service would ever see. Without the NAT log, the service's records could not be tied to W-17.
4. **Inferred:** the deleted ZIP was 640 KB, and the upload began about five minutes after it was written. The volume is consistent with sending that file plus protocol overhead, but encryption prevents the network evidence from showing what was sent. Bob writes this as an inference and lists what would test it: the storage service's records for that account, or upload artifacts on W-17 itself.

Network evidence cannot say who was at W-17's keyboard, or whether a person or malware started the transfer. Those questions belong to endpoint evidence, covered in [Browser and endpoint artifacts](lesson:FOR-07).

## In practice

- **Synchronize clocks and log in UTC.** RFC 6302 prefers UTC because offset information can be lost as records pass between organizations. Still measure and record each device's error at collection time.
- **Log the mappings, not just the traffic.** Keep NAT translations with ports, DHCP leases, and VPN sessions at least as long as flow data, or the flows cannot be attributed later.
- **Collect broadly, capture narrowly.** Flows are cheap and useful for months; full content is costly, sensitive, and mostly encrypted. A common pattern keeps flows widely and full packets only at chosen points for short periods.
- **Document coverage.** Record sensor placement, capture filters, sampling rates, and drop counters, since every gap in coverage limits what an absence can mean.
- **Respect authorization and privacy.** Capturing traffic can expose other people's personal data and communications. Capture only under an authorized monitoring policy, minimize what you keep, and treat captures as sensitive evidence.

## Common misconceptions

- **"An IP address identifies a computer."** It identifies an interface during a time window, through layers of DHCP, NAT, VPNs, and proxies that each need their own records.
- **"Encrypted traffic has no forensic value."** Endpoints, timing, volumes, DNS lookups, and usually the TLS server name remain visible.
- **"Flow records show what was sent."** They show how much moved, between whom, and when. Content needs other evidence.
- **"If the sensor saw nothing, nothing happened."** A sensor sees only its vantage point and may drop packets under load.
- **"Logs from different devices line up as recorded."** Time zones and clock errors must be corrected first, and the corrections documented.

## Try it yourself

> [!ETHICS] Capture or examine traffic only on networks and devices you own or are authorized to monitor.

Correlate this fictional log set from shop.example on paper or in a spreadsheet.

```text
# dhcp.log  (server local time, US Central, UTC-05:00 in October)
2026-10-05 08:15:02 DHCPACK     192.0.2.61 to 00:00:5e:00:53:11 (LAPTOP-22)  lease 86400 s
2026-10-05 09:11:50 DHCPRELEASE 192.0.2.61 from 00:00:5e:00:53:11 (LAPTOP-22)
2026-10-05 09:12:05 DHCPACK     192.0.2.61 to 00:00:5e:00:53:7c (KIOSK-2) lease 3600 s
# dns.log  (UTC)
2026-10-05T14:10:31Z 192.0.2.61 query updates.vendor.test A -> 203.0.113.80
# firewall.log  (UTC; clock measured 3 s slow at collection)
2026-10-05T14:10:30Z NAT tcp 192.0.2.61:50211 -> 198.51.100.7:41007 -> 203.0.113.80:443
# flows.csv  (start in Unix epoch seconds, src, sport, dst, dport, proto, duration s, bytes out, bytes in)
1791209433,192.0.2.61,50211,203.0.113.80,443,tcp,45,1840221,14002
```

1. Convert every record to UTC and write down each offset or correction and why you applied it.
2. Which device held 192.0.2.61 when the connection started? What would you have concluded if you had read the DHCP times as UTC?
3. Before correction, the firewall entry appears to precede the DNS lookup. Does the correction resolve that?
4. Which record ties what the vendor would see, 198.51.100.7 port 41007, back to the internal host?
5. Write three sentences: one observation, one inference, and the evidence that would confirm or refute the inference.

Optional, on your own computer and a network you control, such as your home network: capture your traffic with Wireshark while you load `https://example.com`, then find the DNS query and the server name in the TLS ClientHello. List three things you cannot see.

## Key takeaways

- Network records are independent witnesses that often survive when an endpoint's own records do not.
- Flow records and logs show who, when, and how much; packet captures add content only when it is not encrypted.
- Attribution is a chain of time-bounded mappings, from NAT and DHCP to a device, and each link needs a record.
- Normalize every source to UTC, correct measured clock errors, and document each correction before correlating.
- Write the gap between what metadata shows and what it only suggests explicitly into your notes.

## Go deeper

- Read RFC 6302's short rationale for logging source ports, then consider what an investigator outside your organization can and cannot learn from your servers' logs: [RFC 6302](https://www.rfc-editor.org/rfc/rfc6302).
- Read the IPFIX terminology section of [RFC 7011](https://www.rfc-editor.org/rfc/rfc7011) and explain how sampled flow export would change the claims in the worked example.
- Open question: as DNS lookups and TLS server names are increasingly encrypted, which network-level evidence will remain, and how should monitoring policies change?
