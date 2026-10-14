---
topicId: NET-01
title: TCP/IP and packet anatomy
summary: See how application data is wrapped in transport, IP, and link-layer headers, what the security-relevant fields mean, and why no field in those headers proves who sent a packet.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Describe how encapsulation wraps application data in transport, network, and link-layer headers, and say which headers change at each hop.
  - Identify the addresses, ports, protocol number, TTL, and TCP flags in a decoded packet.
  - Contrast the guarantees TCP and UDP give an application, and explain why forging a TCP connection is harder than forging a UDP datagram.
  - Explain why a source address is a claim rather than proof, and evaluate defenses such as ingress filtering and cryptographic authentication.
prerequisites: [FND-01]
concepts: [packet, encapsulation, ip-address, port, tcp, udp]
keywords:
  - TCP/IP
  - OSI model
  - protocol stack
  - IPv4
  - IPv6
  - header
  - frame
  - segment
  - datagram
  - five-tuple
  - TTL
  - hop limit
  - IP spoofing
  - ingress filtering
  - BCP 38
  - RFC 791
  - RFC 8200
  - RFC 9293
  - RFC 768
  - RFC 2827
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 25: Introduction to Networking'
    url: https://textbook.cs161.org/network/intro.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 791: Internet Protocol'
    url: https://www.rfc-editor.org/rfc/rfc0791
    publisher: IETF (RFC Editor)
  - title: 'RFC 8200: Internet Protocol, Version 6 (IPv6) Specification'
    url: https://rfc-editor.org/rfc/rfc8200.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 9293: Transmission Control Protocol (TCP)'
    url: https://rfc-editor.org/rfc/rfc9293.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 768: User Datagram Protocol'
    url: https://www.rfc-editor.org/rfc/rfc768
    publisher: IETF (RFC Editor)
  - title: 'RFC 2827 (BCP 38): Network Ingress Filtering: Defeating Denial of Service Attacks which employ IP Source Address Spoofing'
    url: https://www.rfc-editor.org/rfc/rfc2827
    publisher: IETF (RFC Editor)
quiz:
  - question: "Alice's packet to shop.example crosses her home router on its way to the Internet. Which parts of it does the router normally change?"
    choices:
      - The destination IP address, so the packet reaches the next router.
      - The TCP destination port, so the next network knows which service to use.
      - The link-layer (Ethernet) source and destination addresses, plus the IPv4 TTL and header checksum.
      - The TCP sequence number, so the server can tell which hop the packet came through.
    answer: 2
    explanation: Link-layer headers only describe one hop, so the router builds a new frame for the next link. It also decrements the TTL and recomputes the IPv4 header checksum. IP addresses and ports travel end to end unless the router performs network address translation.
  - question: An off-path attacker can easily forge the source address of a single UDP datagram. Why is it much harder to open a TCP connection that appears to come from someone else's address?
    choices:
      - Routers check TCP source addresses against a registry but do not check UDP.
      - "The server's SYN-ACK goes to the forged address, so the attacker never sees the server's initial sequence number needed to complete the handshake."
      - TCP encrypts the source address so that it cannot be changed in transit.
      - The TCP checksum is a cryptographic signature that only the real sender can compute.
    answer: 1
    explanation: Nothing authenticates the TCP source address, but the handshake requires the client to acknowledge a sequence number that the server sent to the claimed address. A blind attacker would have to guess it, and RFC 9293 tells implementations to make it unpredictable. A UDP request needs no such round trip.
  - question: "A firewall rule allows inbound TCP port 443 \"because that's HTTPS.\" What is wrong with that reasoning?"
    choices:
      - Nothing; the operating system refuses to run anything but HTTPS on port 443.
      - TCP does not use port numbers, so the rule has no effect.
      - HTTPS only runs over UDP, so the rule allows the wrong protocol.
      - Port numbers are conventions; any program can listen on 443, so the rule allows whatever service is actually there.
    answer: 3
    explanation: Ports are registered by convention, not enforced. A rule that allows port 443 allows any protocol spoken on that port, which is why firewall policies should be written per destination host and service, and why some firewalls inspect the application protocol too.
  - question: The IPv4 header checksum of a packet you captured is correct. What does that tell you?
    choices:
      - Probably that the header was not damaged by accident since the last device that computed the checksum.
      - That an attacker has not modified the packet.
      - That the source address is genuine.
      - That the payload is encrypted.
    answer: 0
    explanation: Checksums detect accidental corruption. Every router recomputes the IPv4 checksum after decrementing the TTL, and an attacker who edits a field can recompute it just as easily. Detecting deliberate changes takes a keyed message authentication code or a signature.
  - question: Alice browses https://shop.example over TLS on a coffee shop's Wi-Fi. What can an on-path observer on that network still learn?
    choices:
      - Her password for shop.example.
      - The contents of the pages she reads.
      - The server's IP address and port, plus the sizes and timing of her packets.
      - The session cookie her browser sends.
    answer: 2
    explanation: TLS encrypts and authenticates the payload, so passwords, page contents, and cookies are protected. IP and TCP headers are outside the encryption, so addresses, ports, packet sizes, and timing remain visible to every network the traffic crosses.
---

## Why it matters

Every topic in this domain is written in the vocabulary of packet headers. A firewall rule reads "allow TCP to port 443 on 203.0.113.80." An incident report says "the traffic came from 198.51.100.7." To write, test, or doubt such sentences, you need to know what each header field is, who writes it, and who, if anyone, checks it.

The uncomfortable answer to "who checks it" is usually nobody. The Internet's core protocols were built to deliver packets between cooperating machines, not to prove facts about them. As the UC Berkeley CS 161 textbook puts it, "the Internet design has not guaranteed any correctness or security." The source address on a packet is filled in by the sender. Attackers have long used this to hide the origin of floods and to make innocent servers send replies to a victim. The IETF's main countermeasure, ingress filtering, was published as Best Current Practice 38 in May 2000, and it only helps where networks deploy it.

This lesson builds the model the rest of the domain uses: layers, [[encapsulation]], and the fields that matter for security.

## The core idea

Picture nested envelopes. A browser writes a request. The transport layer, usually [[tcp|TCP]] or [[udp|UDP]], puts it in an envelope labeled with [[port|port numbers]], which name the sending and receiving programs. The network layer puts that inside another envelope, labeled with [[ip-address|IP addresses]] that name the source and destination computers anywhere on the Internet. The link layer wraps everything once more with [[mac-address|MAC addresses]] for just the next hop, such as your laptop's link to a Wi-Fi router. Each layer adds its header in front of what the layer above handed it, and the receiver removes headers starting from the lowest layer. The bundle in flight is a [[packet]].

| Layer (OSI number) | Delivers                                       | Addressed by                              | Unit                          | Examples         |
| ------------------ | ---------------------------------------------- | ----------------------------------------- | ----------------------------- | ---------------- |
| Application (7)    | Messages between programs                      | Names, URLs                               | Message                       | HTTP, DNS, SMTP  |
| Transport (4)      | Data between two programs                      | Port (16 bits)                            | Segment (TCP), datagram (UDP) | TCP, UDP         |
| Network (3)        | Packets between any two hosts, hop by hop      | IP address (32 bits in IPv4, 128 in IPv6) | Packet                        | IPv4, IPv6, ICMP |
| Link (2)           | Frames to a neighbor on the same local network | MAC address (48 bits)                     | Frame                         | Ethernet, Wi-Fi  |

Security people still say "layer 2" or "layer 7" using these OSI numbers, even though the Internet's stack has fewer layers than OSI's seven.

Three assumptions frame everything that follows:

1. **Best effort only.** In the CS 161 textbook's words, IP "only guarantees best-effort delivery." Packets can be lost, duplicated, delayed, or reordered, and anything stronger is built by higher layers.
2. **No field is authenticated.** Whoever builds a packet chooses every value in every header, including the source address. Nothing in IPv4, IPv6, TCP, or UDP proves those values are true. Faking them is a form of [[spoofing]].
3. **Attackers differ by position.** An _off-path_ attacker cannot see a connection's packets but can send packets of its own. An _on-path_ attacker can read packets as they pass. An _in-path_ attacker, an [[adversary-in-the-middle]], can read, modify, and drop them. All three can forge headers.

The question to ask of any field is: who wrote this value, and what would stop someone else from writing a different one?

## How it works

### Encapsulation on the wire

When alice's browser sends an HTTPS request over Ethernet, the bytes on the wire are laid out like this:

```text
+-----------------+-------------+--------------+-------------------------------+
| Ethernet header | IPv4 header | TCP header   | TLS record (encrypted HTTP)   |
| 14 bytes        | 20-60 bytes | 20-60 bytes  | variable                      |
+-----------------+-------------+--------------+-------------------------------+
  next hop only     end to end    end to end     end to end, opaque to the path
```

Each header says what comes next, which is how receivers, firewalls, and Wireshark parse the rest. Ethernet's EtherType holds 0x0800 for IPv4, 0x86DD for IPv6, or 0x0806 for ARP. The IPv4 Protocol field (IPv6's Next Header) holds 6 for TCP, 17 for UDP, or 1 for ICMP. Port numbers then hint, by convention only, at the application.

### The IPv4 header

RFC 791 (1981) defines the IPv4 header. These are the fields that matter most for security:

| Field                                  | Size             | Purpose                                                      | Security note                                                   |
| -------------------------------------- | ---------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Version, IHL                           | 4 + 4 bits       | IP version; header length in 32-bit words (5 means 20 bytes) | Parsers must check lengths before trusting them                 |
| Total length                           | 16 bits          | Header plus payload, in bytes                                | Must match what actually arrived                                |
| Identification, flags, fragment offset | 16 + 3 + 13 bits | Split a packet into fragments and reassemble it              | Inspection devices must reassemble the way the destination will |
| Time to live (TTL)                     | 8 bits           | Each router decrements it; at zero the packet is discarded   | Stops routing loops; traceroute is built on it                  |
| Protocol                               | 8 bits           | What the payload is (6 TCP, 17 UDP, 1 ICMP)                  | Firewall rules match on it                                      |
| Header checksum                        | 16 bits          | Detects accidental damage to the header                      | Not a security check: anyone can recompute it                   |
| Source address                         | 32 bits          | The sender, as claimed by the sender                         | IP never verifies it                                            |
| Destination address                    | 32 bits          | Where routers forward the packet                             | Routers forward on this field; replies go to the source field   |

RFC 791 defines TTL in seconds, but because every router must decrease it by at least one, in practice it is a hop count; IPv6 renamed it Hop Limit. IP options, such as source routing, are rare today, and many networks reject source-routed packets at their borders.

### IPv6 in brief

IPv6 (RFC 8200) uses a fixed 40-byte header: version, traffic class, flow label, payload length, next header, hop limit, and 128-bit source and destination addresses. It has no header checksum, and routers never fragment IPv6 packets; only the source may. Optional features move into extension headers chained through Next Header fields, so a firewall must walk the chain to find the transport header. The trust model does not change: an IPv6 source address is exactly as unauthenticated as an IPv4 one.

### Ports, UDP, and TCP

A port is a 16-bit number that names an endpoint on a host. Servers listen on conventional ports that IANA registers, such as 53 for DNS and 443 for HTTPS, while a client usually sends from a temporary, or _ephemeral_, port that its operating system picks. The protocol, source address, source port, destination address, and destination port form the _five-tuple_ that identifies a flow; firewalls and packet analyzers track traffic by it.

UDP (RFC 768) adds just 8 bytes: source port, destination port, length, and checksum. RFC 768 says plainly that "delivery and duplicate protection are not guaranteed." Each datagram stands alone, so one forged datagram is a complete request. That is why small UDP queries with forged source addresses are a common ingredient of reflection floods, in which servers send their replies to a victim (see [[amplification-attack|amplification attacks]]).

TCP (RFC 9293) turns unreliable packets into a reliable, ordered byte stream:

| Field                         | Size              | Purpose                                                  |
| ----------------------------- | ----------------- | -------------------------------------------------------- |
| Source port, destination port | 16 + 16 bits      | Which programs are talking                               |
| Sequence number               | 32 bits           | Position of this segment's first byte in the stream      |
| Acknowledgment number         | 32 bits           | The next byte the sender expects to receive              |
| Data offset                   | 4 bits            | TCP header length in 32-bit words (20 to 60 bytes)       |
| Control bits (flags)          | 8 bits            | CWR, ECE, URG, ACK, PSH, RST, SYN, FIN                   |
| Window                        | 16 bits           | How much more data the receiver will accept              |
| Checksum                      | 16 bits           | Detects corruption of header, data, and key IP fields    |
| Urgent pointer, options       | 16 bits, variable | Urgent data (rare); options such as maximum segment size |

Before any data flows, the two sides run the [[three-way-handshake]]: SYN, SYN-ACK, ACK. Each side picks an initial sequence number, and RFC 9293 directs implementations to derive it from a secret-keyed pseudorandom function so that outsiders cannot predict it. The payoff: the server's SYN-ACK goes to whatever source address the SYN carried, so a forger never sees the server's sequence number and cannot send a valid final ACK without guessing it. TCP is therefore much harder to spoof than UDP, though it is not authenticated either; the lesson on [TCP connection state](lesson:NET-04) explores what remains possible.

TCP and UDP checksums also cover a "pseudo-header" that includes the IP addresses, which catches misdelivered segments. Like the IPv4 header checksum, they detect accidents, not attacks: an attacker who changes a field simply recomputes the checksum. Detecting deliberate changes takes a keyed [[mac|message authentication code]], which, despite the shared abbreviation, has nothing to do with a MAC address.

## Worked example

Alice's laptop fetches `https://shop.example/`. Her network uses the documentation addresses below, and the decodes are synthetic and simplified, in the style Wireshark uses.

| Device                   | IP address    | MAC address          |
| ------------------------ | ------------- | -------------------- |
| Alice's laptop           | 192.0.2.10    | 00:00:5e:00:53:0a    |
| Default gateway (router) | 192.0.2.1     | 00:00:5e:00:53:01    |
| Campus DNS resolver      | 198.51.100.53 | (on another network) |
| shop.example web server  | 203.0.113.80  | (on another network) |

**Step 1: Look up the name over UDP.** The laptop asks its [[dns|DNS]] resolver for the address of `shop.example`:

```text
Frame 1: 72 bytes
Ethernet II, Src: 00:00:5e:00:53:0a, Dst: 00:00:5e:00:53:01, Type: IPv4 (0x0800)
Internet Protocol Version 4, Src: 192.0.2.10, Dst: 198.51.100.53
    Header Length: 20 bytes, Total Length: 58, Time to Live: 64, Protocol: UDP (17)
User Datagram Protocol, Src Port: 52114, Dst Port: 53, Length: 38
Domain Name System (query): A shop.example
```

Notice the two destinations: the Ethernet destination is the router's MAC address, because the router is the next hop toward the resolver's network, while the IP destination is the resolver itself. The sizes nest exactly: a 30-byte DNS message plus the 8-byte UDP header is 38 bytes; adding the 20-byte IPv4 header gives 58; adding the 14-byte Ethernet header gives a 72-byte frame.

**Step 2: Open a TCP connection.** The resolver answers 203.0.113.80, and the laptop sends a SYN:

```text
Frame 3: 74 bytes
Ethernet II, Src: 00:00:5e:00:53:0a, Dst: 00:00:5e:00:53:01, Type: IPv4 (0x0800)
Internet Protocol Version 4, Src: 192.0.2.10, Dst: 203.0.113.80
    Header Length: 20 bytes, Total Length: 60, Flags: Don't fragment
    Time to Live: 64, Protocol: TCP (6)
Transmission Control Protocol, Src Port: 51544, Dst Port: 443, Seq: 0, Len: 0
    Header Length: 40 bytes, Flags: 0x002 (SYN), Window: 64240
    Options: MSS 1460, SACK permitted, Timestamps, Window scale
```

The flow's five-tuple is (TCP, 192.0.2.10, 51544, 203.0.113.80, 443): an ephemeral client port and the server's listening port. `Seq: 0` is a relative number Wireshark shows for readability; the real initial sequence number is a large, unpredictable value. The TCP header is 40 bytes because of its options, and there is no payload yet.

**Step 3: Cross the router.** The router accepts the frame because it carries the router's MAC address. It discards the Ethernet header, decrements the TTL from 64 to 63, recomputes the IPv4 header checksum, looks up 203.0.113.80 in its routing table, and wraps the packet in a new link-layer header for the next link. The IP addresses and ports do not change. (A router doing [[network-address-translation|network address translation]], or NAT, would also rewrite the source address and port; we set NAT aside.)

**Step 4: Read the reply.** The server's SYN-ACK arrives from 203.0.113.80 port 443 to 192.0.2.10 port 51544 with a TTL of 52. If the server started at 64, the reply crossed 12 routers. Starting values vary by operating system (64 and 128 are common), so the TTL hints at path length and platform but proves neither.

**Step 5: Ask the security question.** Suppose mallory, elsewhere on the Internet, sends the same SYN with the forged source address 192.0.2.10. The SYN-ACK goes to alice's laptop, which never opened that connection and typically answers with a reset (RST); mallory never learns the server's initial sequence number. If mallory instead forges a single UDP DNS query with alice's address, no handshake is needed: the resolver simply sends its answer to alice. The same forged field has very different consequences in the two protocols.

## Defenses

- **Never treat an address as identity.** Authenticate endpoints cryptographically, with TLS, SSH, or IPsec. Address allowlists are one layer of [[defense-in-depth]], not authentication. Limit: anything that can send from an allowed address, such as a compromised machine inside the allowed network, passes them.
- **Filter forged sources at the edge.** BCP 38 (RFC 2827) asks networks to drop packets arriving from a customer whose source addresses fall outside the prefixes assigned to that customer, and to log the drops. Its authors are frank about the limits: the method "does absolutely nothing to protect against flooding attacks which originate from valid prefixes," and an attacker can still forge other addresses inside its own allowed range. The filter also protects other networks rather than the one that installs it, so operators have weak incentives to deploy it.
- **Encrypt and authenticate the payload.** [[tls|TLS]] lets endpoints detect any modification by an in-path attacker and hides content from on-path observers. Limit: IP addresses, ports, packet sizes, and timing stay outside the encryption, visible to every network on the path, and an in-path attacker can still drop traffic.
- **Parse strictly where you inspect.** Firewalls and intrusion detection systems should reassemble fragments and walk IPv6 extension headers the way end hosts do, and drop packets whose length fields do not add up, so the inspector sees what the destination will. Limit: this costs processing and can break unusual but legitimate traffic.

## Common misconceptions

- **"The source address tells you who sent a packet."** It tells you who the sender claims to be. Only the return path constrains it, and an attacker who does not need replies can write any address.
- **"Port 443 means HTTPS."** Ports are conventions. Any program can listen on any port, so a firewall that allows port 443 allows whatever is spoken there.
- **"The checksum protects against tampering."** Checksums catch accidental corruption. An attacker recomputes them instantly; integrity against adversaries needs a keyed MAC or a digital signature.
- **"TCP is reliable, so it is secure."** Reliability means recovering from loss and reordering. TCP has no authentication or encryption of its own.
- **"Encryption hides everything about my traffic."** TLS hides the payload, not the addresses, ports, sizes, and timing.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Work only on your own computer and on a network you are allowed to use. These commands read information or send ordinary traffic; none forge anything.

```bash
# Linux
ip addr show          # your interfaces, IP addresses, and MAC addresses
ss -tun               # current TCP and UDP connections (five-tuples)
traceroute example.com

# macOS
ifconfig
netstat -an -p tcp
traceroute example.com

# Windows (Command Prompt or PowerShell)
ipconfig /all
netstat -an
tracert example.com
```

1. Find your own IP address and MAC address. An address starting with 10. or 192.168. is private; the rest of the Internet sees your router's public address instead.
2. Open a web page, then list your connections. Pick one in the ESTABLISHED state to port 443 and write down its five-tuple. Open a second tab to the same site. Which part of the five-tuple changes? (Usually the local, ephemeral port.)
3. Run the traceroute. Each numbered line is a router that discarded one of your probes when its TTL reached zero and sent back an ICMP "time exceeded" message. What might `* * *` mean? (No answer arrived, perhaps because it was filtered or rate-limited.)
4. Optional: in Wireshark, capture on your own machine while loading a page, select a TCP SYN, and expand each layer to find the fields from the tables above. Captures contain your browsing data, so do not share them.

## Key takeaways

- Each layer wraps the layer above in its own header. Link-layer headers change at every hop, while IP addresses and ports normally travel end to end.
- Every header field is written by the sender. Nothing in IPv4, IPv6, TCP, or UDP authenticates the source address or any other field.
- TCP's handshake forces a forger to see or guess the server's reply, so spoofed TCP connections are hard; a single forged UDP datagram needs no reply at all.
- Even encrypted traffic exposes addresses, ports, sizes, and timing to the networks it crosses.

## Go deeper

- Steven M. Bellovin, ["A Look Back at 'Security Problems in the TCP/IP Protocol Suite'"](https://www.cs.columbia.edu/~smb/papers/acsac-ipext.pdf) reprints his 1989 analysis of sequence-number guessing, source routing, routing attacks, and address-based authentication, with commentary, fifteen years on, about what happened next.
- CAIDA's [Spoofer project](https://www.caida.org/projects/spoofer/) measures whether networks let packets with forged source addresses out. Open question: since anti-spoofing filters mainly protect other networks, what mix of measurement, peer pressure, and regulation could make source-address validation universal?
