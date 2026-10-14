---
topicId: NET-08
title: Packet analysis and Wireshark concepts
summary: Learn how packet captures are recorded and decoded, how capture filters differ from Wireshark display filters, and how to filter a synthetic capture to explain a flow from a DNS lookup through TCP and TLS, within the legal and ethical limits on capturing traffic.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish capture filters from display filters and choose the right one for a task.
  - Write display filters that isolate protocols, hosts, conversations, and specific TCP, DNS, and TLS events.
  - Reconstruct and explain a flow from a DNS lookup through a TCP connection and TLS handshake to teardown using a synthetic capture.
  - Explain what a capture reveals even when traffic is encrypted, and apply the authorization and data-handling limits on capturing.
prerequisites: [NET-01, NET-04, NET-05]
concepts: [packet-capture, display-filter, network-forensics]
keywords:
  - Wireshark
  - tshark
  - tcpdump
  - pcap
  - pcapng
  - libpcap
  - capture filter
  - display filter
  - dissector
  - protocol analyzer
  - packet sniffer
  - network sniffing
  - promiscuous mode
  - port mirroring
  - SPAN port
  - traffic mirroring
  - TCP stream
  - retransmission
  - NXDOMAIN
  - SNI
  - T1040
  - NIST SP 800-86
sources:
  - title: 'Wireshark User’s Guide, 6.4: Building Display Filter Expressions'
    url: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
    publisher: Wireshark
  - title: 'Wireshark User’s Guide, 4.10: Filtering while capturing'
    url: https://www.wireshark.org/docs/wsug_html_chunked/ChCapCaptureFilterSection.html
    publisher: Wireshark
  - title: 'Wireshark Display Filter Reference: Transmission Control Protocol'
    url: https://www.wireshark.org/docs/dfref/t/tcp.html
    publisher: Wireshark
  - title: 'Wireshark Display Filter Reference: Transport Layer Security'
    url: https://www.wireshark.org/docs/dfref/t/tls.html
    publisher: Wireshark
  - title: 'NIST SP 800-86: Guide to Integrating Forensic Techniques into Incident Response'
    url: https://csrc.nist.gov/pubs/sp/800/86/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-86
  - title: 'MITRE ATT&CK T1040: Network Sniffing'
    url: https://attack.mitre.org/techniques/T1040/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: An analyst captured an hour of traffic with no capture filter, then applied the display filter dns. What happened to the packets that are no longer shown?
    choices:
      - They were deleted from the capture file to save space.
      - They are still in the capture; clearing the filter shows them again.
      - They were never recorded, because display filters run during capture.
      - They were moved to a separate file named after the filter.
    answer: 1
    explanation: Display filters only control which recorded packets are displayed. Capture filters are the ones that decide what is recorded at all, and packets they exclude can never be recovered from that capture.
  - question: Which display filter shows only the first packet of each new TCP connection attempt, the client's SYN?
    choices:
      - tcp.flags.syn == 1
      - tcp.port == 443
      - tcp.flags.syn == 1 && tcp.flags.ack == 0
      - tcp.flags.ack == 1
    answer: 2
    explanation: Both the client's SYN and the server's SYN-ACK have the SYN flag set; only the SYN has the ACK flag clear. Combining the two field tests isolates connection attempts, which is useful for spotting scans and SYN floods.
  - question: "In a capture of alice's HTTPS visit, the payload after the handshake is encrypted. Which of these can an analyst still learn from the capture alone?"
    choices:
      - The site's name from the ClientHello's server name field, plus addresses, ports, timing, and sizes.
      - The URL path and the contents of the page alice loaded.
      - Alice's password, because TLS does not encrypt form fields.
      - Nothing at all, because TLS encrypts every byte of every packet.
    answer: 0
    explanation: TLS protects application data, not the metadata around it. In a standard handshake the server name travels in the clear, and the IP and TCP headers, packet sizes, and timing are always visible. The URL path and page content are inside the encrypted records.
  - question: A security team wants a week-long capture of DNS traffic from one subnet, and policy says to collect no more than necessary. What should they use?
    choices:
      - A display filter, because it keeps the file small.
      - No filter, then delete the unneeded packets by hand later.
      - A display filter applied after a full capture of all traffic.
      - A capture filter such as udp port 53 and net 192.0.2.0/24, so only matching packets are ever recorded.
    answer: 3
    explanation: Capture filters, written in the libpcap filter language, discard non-matching packets before they are written, which limits both file size and the personal data collected. Display filters cannot help with either, because they act on packets already recorded.
  - question: The display filter tcp.analysis.retransmission highlights several packets in one connection. What is the most reasonable first interpretation?
    choices:
      - The connection is under attack, because retransmissions only happen during spoofing.
      - The server is refusing the connection.
      - Some segments were probably lost or delayed and were sent again; look for a pattern before suspecting anything else.
      - The client is using an outdated version of TLS.
    answer: 2
    explanation: Wireshark marks a segment as a suspected retransmission when it repeats data already sent. Loss and congestion are the usual causes, so the analyst checks timing and which direction is affected before drawing conclusions.
---

## Why it matters

Logs record what a program chose to write down; a [[packet-capture|packet capture]] records what actually crossed the wire at the point where it was taken. When a connection fails, an alert fires, or an incident needs reconstructing, analysts reach for captures, and NIST SP 800-86 lists network traffic among the main data sources for forensics, alongside files, operating systems, and applications. Captures are also how you can check the earlier lessons in this domain for yourself: the ARP request, the DNS answer, the three-way handshake, and the TLS ClientHello are all visible in a capture of your own traffic.

The same capability is an attack technique. MITRE ATT&CK lists Network Sniffing (T1040): adversaries capture traffic, for example by putting an interface into promiscuous mode or using a switch's mirror port (a SPAN port), to collect credentials sent over unencrypted protocols and to learn about the network, such as its addresses, hostnames, and running services. That is why captures are sensitive data, and why capturing traffic you are not authorized to collect can violate policy and law.

## The core idea

A capture is a recording, and analysis is asking it questions. Think of a security camera system: the camera's settings decide what is recorded at all, and search tools decide which recorded footage you look at. Wireshark makes the same split. Capture filters decide which packets are recorded, and [[display-filter|display filters]] decide which recorded packets are shown.

The assumptions behind any capture:

1. **You see only what reaches your capture point.** A switch forwards a frame only toward its destination once it has learned where that is, so a laptop normally sees its own traffic and broadcasts, not its neighbors' conversations.
2. **A capture can be incomplete.** Packets excluded by a capture filter are gone for good, and a capture can miss packets when it cannot keep up.
3. **Encryption hides content, not metadata.** Addresses, ports, sizes, timing, and usually the server's name remain visible.
4. **You are authorized.** Capture only traffic you own or have written permission to collect.

## How it works

### From wire to fields

Capture software, often called a packet sniffer, copies each frame that reaches an interface, with a timestamp, into a file, usually in the pcap or pcapng format. A protocol analyzer such as Wireshark then runs dissectors, decoders for each protocol, which peel the layers apart as described in [TCP/IP and packet anatomy](lesson:NET-01) and give every field a name, such as `ip.src`, `tcp.flags.syn`, or `dns.qry.name`. Those names are the vocabulary of display filters, and Wireshark's Display Filter Reference lists them for each protocol it supports.

### Capture filters and display filters

|                   | Capture filter                                    | Display filter                                 |
| ----------------- | ------------------------------------------------- | ---------------------------------------------- |
| Decides           | Which packets are recorded                        | Which recorded packets are shown               |
| Language          | The libpcap filter language, also used by tcpdump | Wireshark's display filter language            |
| Example           | `tcp port 443 and host 192.0.2.10`                | `tcp.port == 443 && ip.addr == 192.0.2.10`     |
| Can change later? | No: packets it excluded were never saved          | Yes: clear the filter and every packet returns |
| Use it to         | Keep files small and collect only what you may    | Ask questions of a capture                     |

### Display filter building blocks

- **Protocols.** A protocol name alone, such as `dns`, `arp`, or `tls`, shows packets that contain that protocol.
- **Field comparisons.** `ip.addr == 192.0.2.10`, `tcp.port == 443`, and `dns.flags.rcode == 3` compare a field with a value.
- **Logic.** `and` (or `&&`), `or` (or `||`), and `not` (or `!`) combine tests.
- **Sets and text.** `tcp.port in {80, 443, 8080}` tests membership in a set; `contains` and `matches` (a regular expression) test text.

One subtlety trips people up. Some fields, such as `ip.addr` and `tcp.port`, stand for either the source or the destination, so a packet carries two values. `ip.addr == 192.0.2.10` is true if either one matches. For `!=`, Wireshark's guide notes that the meaning changed in version 3.6: it now means "all not equal," so `ip.addr != 192.0.2.10` hides every packet to or from that address. The `!==` operator gives the older "any not equal" meaning, which matches almost every packet. Older tutorials that warn about `!=` describe the pre-3.6 behavior.

### Conversations and analysis

Wireshark treats each TCP connection as a TCP stream and gives it an index, so `tcp.stream == 0` shows the first connection in a capture, from its SYN to its last ACK. Its TCP analysis also marks events such as suspected retransmissions, which `tcp.analysis.retransmission` selects. Views that show a whole stream at once, or list every conversation in a capture, build on the same idea.

## Worked example

The activity for this topic is to filter synthetic captures and explain an observed flow. Alice's laptop, 192.0.2.10, opened `https://www.shop.example`. Her resolver is 198.51.100.53, and the server is 203.0.113.80. The capture below is synthetic and shortened, laid out like Wireshark's packet list:

```text
No.  Time      Source             Destination        Proto    Len   Info
  1  0.000000  00:00:5e:00:53:0a  Broadcast          ARP       42   Who has 192.0.2.1? Tell 192.0.2.10
  2  0.001204  00:00:5e:00:53:01  00:00:5e:00:53:0a  ARP       60   192.0.2.1 is at 00:00:5e:00:53:01
  3  0.001530  192.0.2.10         198.51.100.53      DNS       77   Standard query 0x1a2b A wwww.shop.example
  4  0.019874  198.51.100.53      192.0.2.10         DNS      128   Standard query response 0x1a2b No such name A wwww.shop.example SOA ns1.shop.example
  5  2.402117  192.0.2.10         198.51.100.53      DNS       76   Standard query 0x3c4d A www.shop.example
  6  2.420560  198.51.100.53      192.0.2.10         DNS       92   Standard query response 0x3c4d A www.shop.example A 203.0.113.80
  7  2.421002  192.0.2.10         203.0.113.80       TCP       74   51544 → 443 [SYN] Seq=0 Win=64240 Len=0 MSS=1460
  8  2.449311  203.0.113.80       192.0.2.10         TCP       74   443 → 51544 [SYN, ACK] Seq=0 Ack=1 Win=65160 Len=0 MSS=1460
  9  2.449402  192.0.2.10         203.0.113.80       TCP       66   51544 → 443 [ACK] Seq=1 Ack=1
 10  2.450120  192.0.2.10         203.0.113.80       TLSv1.3  583   Client Hello (SNI=www.shop.example)
 11  2.478890  203.0.113.80       192.0.2.10         TCP       66   443 → 51544 [ACK] Seq=1 Ack=518
 12  2.480305  203.0.113.80       192.0.2.10         TLSv1.3 1514   Server Hello, Change Cipher Spec, Application Data
 13  2.481022  192.0.2.10         203.0.113.80       TLSv1.3  130   Change Cipher Spec, Application Data
 14  2.481460  192.0.2.10         203.0.113.80       TLSv1.3  380   Application Data
 15  2.713580  192.0.2.10         203.0.113.80       TCP      380   [TCP Retransmission] 51544 → 443 [PSH, ACK] Len=314
 16  2.742105  203.0.113.80       192.0.2.10         TLSv1.3 1514   Application Data
 17  2.742390  192.0.2.10         203.0.113.80       TCP       66   51544 → 443 [ACK]
 18  7.744210  192.0.2.10         203.0.113.80       TCP       66   51544 → 443 [FIN, ACK]
 19  7.772380  203.0.113.80       192.0.2.10         TCP       66   443 → 51544 [FIN, ACK]
 20  7.772441  192.0.2.10         203.0.113.80       TCP       66   51544 → 443 [ACK]
```

Now ask it questions, one display filter at a time:

| Display filter                       | Frames shown | What it tells you                                                    |
| ------------------------------------ | ------------ | -------------------------------------------------------------------- |
| `arp or dns`                         | 1 to 6       | The laptop found its gateway's MAC address, then looked up names     |
| `dns.flags.rcode == 3`               | 4            | One lookup failed with NXDOMAIN ("No such name"): a typo, `wwww`     |
| `dns.qry.name == "www.shop.example"` | 5, 6         | The corrected lookup returned 203.0.113.80 in about 18 ms            |
| `tcp.flags.syn == 1`                 | 7, 8         | The handshake began; SYN to SYN-ACK took about 28 ms, one round trip |
| `tls.handshake.type == 1`            | 10           | The ClientHello names `www.shop.example` in its server name field    |
| `tcp.analysis.retransmission`        | 15           | Alice's laptop sent the data of frame 14 again about 230 ms later    |
| `tcp.stream == 0`                    | 7 to 20      | The whole connection, from SYN to the final ACK                      |

**Step 1: Explain the setup.** Frames 1 and 2 are ARP: the resolver is on another network, so the laptop first needs its gateway's MAC address (see [ARP and local-network trust](lesson:NET-03)). Frame 2 is 60 bytes because Ethernet pads short frames to a minimum size; frame 1 was recorded on its way out, before padding. Frames 3 and 4 show a failed lookup for a mistyped name; frames 5 and 6 show the corrected one (see [DNS resolution and trust](lesson:NET-02)).

**Step 2: Explain the connection.** Frames 7 to 9 are the three-way handshake, and 18 to 20 the teardown, with the client closing first, so alice's laptop will hold the connection in TIME-WAIT (see [TCP connection state](lesson:NET-04)). Because the capture was taken at the client, the 28 ms between frames 7 and 8 is a good estimate of the round-trip time.

**Step 3: Explain the TLS exchange.** Frame 10 is the ClientHello; its Server Name Indication (SNI) field, `tls.handshake.extensions_server_name`, reads `www.shop.example`. Frame 12 carries the ServerHello, after which the rest of the handshake and all application data are encrypted, so Wireshark can only label those records "Application Data" (see [TLS and certificate validation](lesson:NET-05)).

**Step 4: Explain the anomaly.** Frame 15 repeats the data of frame 14 about 230 ms later. The capture was taken on alice's laptop, so the original did leave it; most likely that segment, or the acknowledgment for it, was lost on the way, and her TCP stack sent the data again when no acknowledgment arrived in time. The server's response arrived one round trip after the retransmission, which fits the original having been lost. One retransmission in an otherwise healthy connection is ordinary; many of them, or many connections affected at once, deserve a closer look.

**Step 5: Summarize what was and was not visible.** The analyst learned the names alice looked up, the server she reached, the timing, and the amount of data. The URL path and the page contents stayed inside encrypted records.

```sequence
title: The observed flow, reconstructed from the capture
participant A as Alice 192.0.2.10
participant R as Resolver 198.51.100.53
participant S as www.shop.example 203.0.113.80
A -> R: Query A www.shop.example (frame 5)
R --> A: Answer 203.0.113.80 (frame 6)
A -> S: SYN (frame 7)
S --> A: SYN-ACK (frame 8)
A -> S: ACK, then ClientHello with SNI (frames 9, 10)
S --> A: ServerHello, then encrypted records (frame 12)
A -x S: Encrypted request (frame 14), probably lost
A -> S: Same request, retransmitted (frame 15)
S --> A: Encrypted response (frame 16)
note: Teardown: FIN, FIN, final ACK (frames 18 to 20)
```

## Defenses

Defending against sniffing and handling your own captures responsibly go together. The first four defenses follow the mitigations and detections ATT&CK lists for T1040:

- **Encrypt traffic in transit.** TLS, SSH, and VPNs keep captured content unreadable. Limit: metadata such as addresses, timing, and server names remains, and ATT&CK notes that where TLS ends at a load balancer, mirrored traffic behind it is often cleartext.
- **Use multi-factor authentication.** [[mfa|MFA]] means a password captured from an unencrypted protocol is not enough on its own. Limit: a captured session cookie may still work.
- **Segment the network.** Fewer devices share broadcast and multicast traffic, so a sniffer on one segment sees less. Limit: an attacker who redirects traffic, as with [[arp-spoofing|ARP spoofing]], can still see it.
- **Control and watch capture capabilities.** Restrict who can create port mirrors or cloud traffic mirrors, and alert when capture tools run, interfaces enter promiscuous mode, or new mirroring sessions appear. Limit: administrators capture traffic for legitimate troubleshooting too, so alerts need context to tell the two apart.
- **Treat captures as sensitive evidence.** Get written authorization before capturing, use capture filters to collect only what the task needs, store and delete files under policy, and record who collected what and when (see [[chain-of-custody]]). NIST SP 800-86 devotes a section to legal considerations in collecting network data. Limit: collecting less can mean missing the packet you later need.

## Common misconceptions

- **"A display filter makes the capture smaller."** It changes only what you see. Capture filters decide what is recorded.
- **"Wireshark shows everything on my network."** It shows what reached your interface; on a switched network that is mostly your own traffic.
- **"Encrypted traffic tells an analyst nothing."** DNS lookups, addresses, ports, timing, sizes, and usually the server name remain visible.
- **"`ip.addr != x` matches almost everything."** That was true before Wireshark 3.6. Today `!=` means all not equal, and `!==` has the old meaning.
- **"Retransmissions mean an attack."** They usually mean loss or congestion. Look for a pattern before suspecting anything else.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Capture only your own traffic, on your own computer and a network you own or administer. Do not capture on shared networks such as campus or public Wi-Fi unless you have written permission. On a work or school computer, ask first: security teams often alert on capture tools, because attackers use them too.

1. In Wireshark, start a capture on your active interface, open `https://example.com` in your browser, and stop the capture after the page loads.
2. Apply these display filters in turn and write down what each shows: `dns`, `tcp.flags.syn == 1 && tcp.flags.ack == 0`, `tls.handshake.type == 1`, and `tcp.stream == N` for the stream that carried the page.
3. In the ClientHello, find the server name field. Then measure the time from the SYN to the SYN-ACK and, if the server answers `ping`, compare it with the round-trip time that `ping` reports.
4. Save the capture and query it from the command line with tshark, which reads the file without capturing anything new:

```bash
tshark -r mycapture.pcapng -Y "dns" -T fields -e dns.qry.name -e dns.flags.rcode -e dns.a
```

5. Paper exercise: for the worked example, write a capture filter that would have recorded only alice's DNS traffic, and a display filter that finds every failed lookup in a week of such captures.

## Key takeaways

- A packet capture records what crossed the wire at one capture point; you can only analyze what reached it.
- Capture filters, in the libpcap language, decide what is recorded, and packets they exclude are gone for good; display filters only choose what is shown.
- Display filters work on named fields from Wireshark's dissectors, such as `tcp.flags.syn`, `dns.flags.rcode`, and `tls.handshake.type`, combined with logical operators.
- Reconstructing a flow means reading it layer by layer (ARP, DNS, the TCP handshake, the TLS handshake, the data, and the teardown) and then explaining anomalies such as retransmissions.
- Captures are sensitive: encryption limits what sniffers learn, and analysts need authorization and careful data handling.

## Go deeper

- The Wireshark User's Guide section on [display filter expressions](https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html) covers operators such as `===` and `!==`, field slices, and functions. Open question: a week of full captures from a busy network can be enormous; when do summaries such as [[flow-record|flow records]] answer the question instead, and what do they lose?
- [NIST SP 800-86](https://csrc.nist.gov/pubs/sp/800/86/final) describes how network traffic fits into a forensic process, including legal considerations and technical issues in collecting it. Discussion: how would you write a capture policy for a campus network that supports troubleshooting without becoming surveillance?
