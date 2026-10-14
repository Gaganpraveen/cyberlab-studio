---
topicId: NET-02
title: DNS resolution and trust
summary: Follow a DNS lookup from your laptop through a recursive resolver to the root, top-level-domain, and authoritative servers, see which answers each party simply trusts, and learn how cache poisoning exploits that trust and how DNSSEC and other defenses limit it.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Trace a DNS lookup through stub, recursive, root, TLD, and authoritative servers, explaining referrals, glue, and caching.
  - Identify the trust assumption made at each step of a lookup and what a forged answer would have to match.
  - Explain conceptually how off-path cache poisoning works and why Kaminsky's 2008 technique made it practical.
  - Evaluate source-port randomization, bailiwick checks, DNSSEC validation, and encrypted resolver connections, including what each one does not protect.
prerequisites: [NET-01]
concepts: [dns, recursive-resolver, authoritative-name-server, dns-cache-poisoning, dnssec]
labs: [recon-and-attack-surface, spoofing-and-mitm]
keywords:
  - Domain Name System
  - DNS resolution
  - stub resolver
  - recursive resolver
  - authoritative server
  - root server
  - TLD
  - referral
  - glue record
  - A record
  - AAAA record
  - NS record
  - TTL
  - DNS spoofing
  - cache poisoning
  - Kaminsky attack
  - CVE-2008-1447
  - VU#800113
  - bailiwick
  - source port randomization
  - DNSSEC
  - RRSIG
  - DNSKEY
  - DS record
  - NSEC
  - NSEC3
  - trust anchor
  - DNS over TLS
  - DNS over HTTPS
  - dig
  - nslookup
  - RFC 1034
  - RFC 4033
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 32: DNS'
    url: https://textbook.cs161.org/network/dns.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 33: DNSSEC'
    url: https://textbook.cs161.org/network/dnssec.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 1034: Domain Names - Concepts and Facilities'
    url: https://www.rfc-editor.org/info/rfc1034
    publisher: IETF (RFC Editor)
  - title: 'RFC 4033: DNS Security Introduction and Requirements'
    url: https://www.rfc-editor.org/rfc/rfc4033
    publisher: IETF (RFC Editor)
  - title: 'Vulnerability Note VU#800113: Multiple DNS implementations vulnerable to cache poisoning'
    url: https://www.kb.cert.org/vuls/id/800113
    publisher: CERT Coordination Center, Carnegie Mellon University
quiz:
  - question: Before 2008, losing a cache-poisoning race for a name usually forced the attacker to wait until the real record expired. What did Kaminsky's technique change?
    choices:
      - It forged DNSSEC signatures, so validating resolvers accepted the fake data.
      - "It let the attacker start a fresh race immediately by triggering lookups of new, nonexistent names, with each forged reply carrying records that redirect the whole zone."
      - It required the attacker to sit on the network path between the resolver and the authoritative server.
      - It exploited a memory-safety bug in one popular resolver, so patching that product was enough.
    answer: 1
    explanation: Each nonexistent name is a new, uncached question, so the attacker never waits for a TTL. The forged replies include in-bailiwick records for the zone itself, so one win poisons every name in it. That is why vendors shipped coordinated patches that randomize source ports.
  - question: After the 2008 patches, what must an off-path attacker's forged reply match for a resolver to accept it?
    choices:
      - A believable TTL, because resolvers reject records with unusual lifetimes.
      - A valid DNSSEC signature, even when the zone is unsigned.
      - The random 16-bit query ID and the randomized UDP source port of the outstanding query, plus the question it asked.
      - The server's MAC address, which resolvers check for every reply.
    answer: 2
    explanation: The ID gives about 16 bits of uncertainty and a randomized source port adds up to about 16 more, so a blind guess succeeds with roughly 1 chance in 2^32. An on-path attacker sees both values, so these defenses only work against off-path attackers.
  - question: A campus turns on DNSSEC validation in its recursive resolver. Which threat does that NOT address?
    choices:
      - An off-path attacker trying to cache a forged A record for a signed zone.
      - An answer from a signed zone that is altered in transit to the resolver.
      - A forged reply claiming that a name in a signed zone does not exist.
      - An observer on a coffee shop's Wi-Fi learning which names alice looks up.
    answer: 3
    explanation: RFC 4033 says DNSSEC "is not designed to provide confidentiality." It authenticates data from signed zones, including denials of existence, but lookups and answers still travel in the clear unless the channel is encrypted.
  - question: "Alice's laptop uses a validating resolver but does not validate signatures itself. Mallory controls the Wi-Fi network between alice and that resolver. What can mallory still do?"
    choices:
      - Forge replies to alice's laptop, even with the AD bit set, because the laptop trusts whatever appears to come from its resolver.
      - Nothing, because the resolver's DNSSEC validation also protects the last hop.
      - Only read the replies, because DNSSEC encrypts them.
      - Change records only for zones that are unsigned, because signed answers cannot be altered anywhere.
    answer: 0
    explanation: A non-validating stub relies on its resolver and on the channel to it. RFC 4033 says that channel needs its own integrity and authentication. Validating locally or using an authenticated, encrypted connection to the resolver closes the gap.
  - question: A resolver has been poisoned so that shop.example points to mallory's server. Alice types https://shop.example. What should stop her browser from sending her password to mallory?
    choices:
      - The DNS TTL, which makes poisoned records expire before they can be used.
      - TLS certificate validation, because mallory's server cannot present a valid certificate for shop.example unless a certificate authority wrongly issued one.
      - The TCP three-way handshake, which confirms the server's identity.
      - The IP header checksum, which would not match for a forged server.
    answer: 1
    explanation: DNS only tells the browser where to connect; TLS checks who answered. Unless the browser is shown a valid certificate for the name, it shows an error. Protocols without that check, and users who click through warnings, remain exposed.
---

## Why it matters

Almost every connection starts with a name. Before alice's browser can reach `shop.example`, something must turn that name into an address, and whoever controls that answer controls where her traffic goes. The [[dns|Domain Name System (DNS)]] does this translation for the whole Internet, and for most of its history it has accepted answers that merely look right.

In July 2008, the CERT Coordination Center published Vulnerability Note VU#800113 (CVE-2008-1447), "Multiple DNS implementations vulnerable to cache poisoning." It credits Dan Kaminsky with showing how effective and practical the attack had become, and vendors released patches that randomize the network ports resolvers send queries from. The note is blunt that this was a stopgap: without protocol changes, port randomization cannot completely prevent cache poisoning, and it quotes the Internet Systems Consortium's view that signing zones with DNSSEC and validating in resolvers is the only full solution.

This lesson traces a lookup step by step and asks, at each step, who trusts whom and why. That habit transfers to every protocol in this domain.

## The core idea

DNS is a distributed database run by many organizations. Responsibility is delegated by name: the root zone knows which servers run each top-level domain (TLD), the `example` TLD knows which servers run `shop.example`, and `shop.example`'s own servers hold its records. A server that holds the official data for a zone is an [[authoritative-name-server]].

Three roles take part in a lookup:

- The **stub resolver** is a small library on alice's laptop. It asks one server, usually the one her network assigned, and believes the answer.
- The **[[recursive-resolver]]**, run by her campus, ISP, or a public provider, does the legwork. It follows referrals from the root down to the authoritative servers and caches what it learns.
- **Authoritative servers** answer from their own zone data, or refer the resolver to the zone below.

The analogy is a reference librarian. You ask one librarian (your resolver), who calls the main library (the root), which refers them to a branch (the TLD), which refers them to the department that keeps the record (the authoritative server). You never see those calls; you see only what your librarian tells you, and you trust it.

State the assumptions plainly. Classic DNS runs over UDP and signs nothing. A resolver accepts a reply because it matches the question it asked, not because anyone proved where the reply came from. And a cached answer is reused for every client until its time to live (TTL) runs out, so one bad answer can mislead thousands of users.

## How it works

### Records and messages

Each piece of DNS data is a resource record with a name, a type, a class (almost always `IN`), a TTL in seconds, and data:

| Type  | Maps                       | Example                                               |
| ----- | -------------------------- | ----------------------------------------------------- |
| A     | Name to IPv4 address       | `www.shop.example. 3600 IN A 203.0.113.80`            |
| AAAA  | Name to IPv6 address       | `www.shop.example. 3600 IN AAAA 2001:db8::80`         |
| NS    | Zone to its name servers   | `shop.example. 86400 IN NS ns1.shop.example.`         |
| CNAME | Alias to a canonical name  | `store.shop.example. 3600 IN CNAME www.shop.example.` |
| MX    | Domain to its mail servers | `shop.example. 3600 IN MX 10 mail.shop.example.`      |

A DNS message has a header with a 16-bit ID that pairs replies with queries, flag bits, and four sections: question, answer, authority, and additional. Queries usually travel over UDP to port 53.

### A lookup, step by step

Here is a lookup for `www.shop.example` when the resolver's cache is empty. (The `example` TLD is reserved for documentation, so these servers are fictional.)

```sequence
title: Resolving www.shop.example with an empty cache
participant L as Alice's laptop (stub)
participant R as Recursive resolver
participant Root as Root server
participant T as .example TLD server
participant A as ns1.shop.example
L -> R: Query A www.shop.example
R -> Root: Query A www.shop.example
Root --> R: Referral: try the .example servers
R -> T: Query A www.shop.example
T --> R: Referral: NS ns1.shop.example, plus glue
R -> A: Query A www.shop.example
A --> R: Answer 203.0.113.80, TTL 3600
R --> L: Answer 203.0.113.80 (now cached)
```

The root and the TLD do not know the answer; they send **referrals**, NS records naming the servers for the next zone down. The TLD's referral also carries an A record for `ns1.shop.example`. That address is called **glue**: the name server sits inside the zone it serves, so without the parent's help the resolver could never find it. Finally, `ns1.shop.example` answers with authority. The resolver caches every record for its TTL, so the next query for any name in `shop.example` skips the root and the TLD entirely.

### What a resolver checks

Without DNSSEC, a resolver accepts a reply that:

1. arrives at the UDP port the query was sent from, from the address the query was sent to;
2. carries the same 16-bit ID and the same question; and
3. contains only records in the responding server's **bailiwick**, meaning names inside the zone that server is responsible for. The `shop.example` servers may supply records about `shop.example`, but not about `bank.example`.

None of these checks proves origin. The sender's address can be forged, as you saw in [TCP/IP and packet anatomy](lesson:NET-01), so the only secrets are the ID and the source port, and anyone who can see the query can copy both. As the CS 161 textbook puts it: "Against an on-path attacker, DNS is completely insecure."

### Cache poisoning, conceptually

[[dns-cache-poisoning|DNS cache poisoning]] is the off-path version of the attack. Mallory cannot see the resolver's query, so she must get the resolver to ask a question, then deliver a forged reply that matches it before the real one arrives. If one guess matches, the resolver caches her data and serves it to every client until the TTL expires.

```sequence
title: An off-path poisoning race that fails (conceptual)
participant M as Mallory
participant R as Recursive resolver
participant A as ns1.shop.example
M -> R: Triggers a lookup of a fresh name in shop.example
R -> A: Query with a random ID and random source port
M -> R: Forged replies, each guessing the ID and port
note R: A forgery must match before the real reply lands
A --> R: Real reply arrives first
R -x M: Non-matching forgeries are discarded
note: A matching forgery would be cached for its TTL
```

Before 2008, each failed race left the real answer cached, so mallory had to wait for its TTL to expire before trying the same name again. Kaminsky's insight removed the wait. Every lookup of a new, nonexistent name in the zone is a fresh race, and each forged reply can carry extra records, within bailiwick, that name a different server for the whole zone. One win poisons all of `shop.example`. Attackers do not even need their own access to the resolver: a web page that loads images from many invented names makes the victim's own browser trigger the lookups.

The emergency fix made the guess harder. With a random 16-bit ID and a randomized 16-bit source port, a blind guess succeeds with roughly 1 chance in 2^32 instead of 1 in 2^16. That raises the cost a lot but proves nothing, which is why the long-term answer is cryptographic.

### DNSSEC: signing the data

[[dnssec|DNSSEC]] adds signatures, so a validating resolver can check that data came from the zone's owner and was not altered. Each zone publishes its public keys in DNSKEY records and signs each set of records with an RRSIG record. The parent zone vouches for the child's key with a DS record, a hash of that key, which the parent signs in turn. The chain ends at the root key, a **trust anchor** configured in every validating resolver.

| Record                          | Held in              | Vouches for                      |
| ------------------------------- | -------------------- | -------------------------------- |
| Root DNSKEY (trust anchor)      | Validator's settings | Signatures made by the root zone |
| DS for `example`                | Root zone            | The `example` TLD's key          |
| DS for `shop.example`           | `example` TLD zone   | The `shop.example` key           |
| RRSIG over `www.shop.example` A | `shop.example` zone  | The answer 203.0.113.80          |

Signed denial records (NSEC or NSEC3) let a zone prove that a name does not exist, which blocks forged "no such name" replies. NSEC has a side effect: each record names two existing neighbors, so an observer can walk the chain and list the zone, a privacy cost that NSEC3's hashed names reduce but do not eliminate.

DNSSEC's limits matter as much as its strengths. RFC 4033 states that "DNSSEC is not designed to provide confidentiality" and that it "provides no protection against denial of service attacks." It also leaves the last hop to the stub exposed: a stub that does not validate must trust its resolver and the channel to it, reading the resolver's AD (authenticated data) flag as a hint rather than proof.

## Worked example

Alice's laptop, at 192.0.2.10 on campus, looks up `www.shop.example`. Its network settings name the campus resolver, 198.51.100.53. Here is what a lookup tool would show, simplified:

```text
$ dig www.shop.example A
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 19231
;; flags: qr rd ra ad; QUERY: 1, ANSWER: 1, AUTHORITY: 0, ADDITIONAL: 1

;; QUESTION SECTION:
;www.shop.example.          IN  A

;; ANSWER SECTION:
www.shop.example.   3600    IN  A   203.0.113.80

;; SERVER: 198.51.100.53#53(198.51.100.53) (UDP)
```

Read it field by field. `status: NOERROR` means the name exists. In the flags, `qr` marks a response, `rd` says the laptop asked for recursion, `ra` says the resolver offers it, and `ad` says the resolver claims to have validated the answer with DNSSEC. The TTL of 3600 means the resolver may reuse this answer for an hour. The `SERVER` line names the only party the laptop actually heard from.

Now trace the lookup's trust assumptions, step by step:

| Step | Exchange                       | What the asker checks            | What the asker must trust                                   |
| ---- | ------------------------------ | -------------------------------- | ----------------------------------------------------------- |
| 1    | Laptop asks campus resolver    | ID and port match                | The resolver is honest, and so is the network path to it    |
| 2    | Resolver asks a root server    | ID, port, question, bailiwick    | Its built-in list of root server addresses                  |
| 3    | Resolver follows TLD referral  | ID, port, question, bailiwick    | The root's referral and the TLD's answer                    |
| 4    | Resolver asks ns1.shop.example | ID, port, question, bailiwick    | The TLD's referral and glue, and the shop.example operators |
| 5    | Later clients hit the cache    | Nothing; the TTL has not expired | That the cached data was correct when it was stored         |

Two observations follow. First, alice's laptop trusts the resolver completely; an attacker who controls the Wi-Fi network between them never has to touch the rest of DNS. Second, every later client inherits step 5, which is why poisoning a busy resolver pays off.

With DNSSEC, steps 2 to 5 change from "it matched" to "the signatures chain up to the root key," but only if `shop.example` is signed and the resolver validates. Step 1 does not change unless the laptop validates for itself or reaches the resolver over an authenticated, encrypted connection. And if the domain owner's registrar account is stolen and the attacker replaces the DS record, validation dutifully succeeds for the attacker's data.

## Defenses

- **Randomize IDs and source ports.** This forces an off-path attacker to guess about 32 bits per attempt. Limits: an on-path attacker sees both values, and CERT notes that address-translating devices that rewrite ports can reduce the benefit.
- **Enforce bailiwick.** Resolvers should discard records outside the responding server's zone. Limit: Kaminsky-style forgeries stay within bailiwick.
- **Do not run open resolvers.** CERT also recommends restricting recursion to your own clients and filtering spoofed addresses at the network edge. Limit: an attacker on your network, or a web page in your users' browsers, can still trigger lookups.
- **Sign zones and validate.** DNSSEC gives data origin authentication and integrity for signed zones. Limits: it needs both signed zones and validating resolvers, offers no confidentiality, and mistakes in key management cause validation failures that look like outages.
- **Protect the last hop.** Validate on the device, or reach a trusted resolver over DNS over TLS or DNS over HTTPS, which encrypt that channel and, when the resolver's certificate is checked, authenticate it. Limit: you still trust the resolver operator with your answers and your lookup history.
- **Authenticate the destination too.** For HTTPS, [[tls|TLS]] certificate validation catches most redirections caused by poisoned DNS, because the attacker's server cannot present a valid certificate for the name. Limit: this protects only protocols that check certificates, and only users who do not click through warnings (see [TLS and certificate validation](lesson:NET-05)).

## Common misconceptions

- **"DNSSEC encrypts DNS."** It signs data; it does not hide it. Lookups remain visible unless the transport is encrypted.
- **"A random 16-bit ID makes forgery impractical."** There are only 65,536 IDs. Kaminsky showed that attackers can retry quickly, which is why source ports had to be randomized too.
- **"DNS over HTTPS makes answers trustworthy."** It protects the channel to your resolver, not the origin of the data. A lying or poisoned resolver still lies over HTTPS.
- **"HTTPS makes DNS attacks irrelevant."** TLS catches a wrong server for HTTPS connections, but email routing, plain HTTP, and many internal tools act on DNS answers without such checks.
- **"A short TTL is a security control."** TTL controls caching. A short TTL limits how long a poisoned answer lives, but it also gives attackers more chances to race.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

Both labs are fictional and send no queries.

1. **Map the names.** On the **OSINT** tab of [the Recon and Attack Surface lab](lab:recon-and-attack-surface), investigate **DNS enumeration**: public records reveal a website, a mail gateway, and a VPN gateway. Which record type from How it works points to each? Then investigate the **Certificate transparency log**. It names an admin host that public DNS never listed and shows the flag for "Find the leaked subdomain": leaving a name out of DNS does not hide it.
2. **Poison the cache.** On the **DNS** tab of [the Spoofing and On-Path Attacks lab](lab:spoofing-and-mitm), the resolver's cache maps `bank.example.test` to 192.0.2.200. Click **Poison cache**: the entry now points to the attacker's 192.0.2.66, and the flag for "Poison the resolver" appears.
3. **Validate.** Click **Enable DNSSEC**, then **Poison cache** again: the forgery fails validation and the honest answer stands, which solves "Validate with DNSSEC".
4. **Fill the gaps.** In the lab, the forgery never loses a race, and the DNSSEC switch assumes the zone is signed. What must an off-path forgery match after 2008, and what would the switch do for an unsigned zone?

**Without the lab.** Run these ordinary lookups on your own computer, through your own network's resolver.

```bash
# Linux and macOS (dig is in the bind-utils or dnsutils package)
dig example.com A
dig example.com A            # run again: has the TTL dropped?
dig +trace example.com A     # do the referrals yourself, starting at the root
dig +dnssec example.com A    # ask for signatures as well

# Windows (PowerShell)
Resolve-DnsName example.com
Resolve-DnsName example.com -DnssecOk
```

1. Find the `SERVER` line: which resolver does your computer trust, and who runs it?
2. Compare the first two TTLs; the drop shows the resolver answering from its cache.
3. In the `+trace` output, label the root, TLD, and authoritative steps, and find the NS records that act as referrals. If the trace fails, your network may block outside queries, itself a control worth noticing.
4. In the `+dnssec` output, find RRSIG records and the `ad` flag. RRSIG without `ad` suggests your resolver does not validate.
5. On paper, redraw the worked example's trust table for your lookup, marking the one step DNSSEC alone cannot protect.

## Key takeaways

- A lookup passes from a stub resolver to a recursive resolver, which follows referrals from the root to the TLD to the authoritative servers and caches each answer for its TTL.
- Classic DNS accepts any reply that matches the question, ID, and port; it proves nothing about origin, and it is completely insecure against an on-path attacker.
- Cache poisoning wins by racing a forged reply into a resolver's cache. Kaminsky's 2008 technique made the race repeatable; randomized ports only made it harder.
- DNSSEC authenticates data from signed zones up to the root trust anchor, but it provides no confidentiality and leaves the stub-to-resolver hop to other protections.
- Defense comes in layers: unpredictable queries, closed resolvers, validation, a protected last hop, and TLS above it all.

## Go deeper

- [RFC 4033](https://www.rfc-editor.org/rfc/rfc4033), Sections 3 and 4, explains the services DNSSEC adds and how a stub resolver should treat its resolver's claims. Open question: should every device validate for itself, given the cost and the outages that misconfigured zones cause?
- The [CS 161 DNSSEC chapter](https://textbook.cs161.org/network/dnssec.html) explains the NSEC zone-walking problem and why NSEC3 only partly solves it. Discussion: how should a protocol balance authenticated denial against the privacy of a zone's names?
- [VU#800113](https://www.kb.cert.org/vuls/id/800113) notes that network devices that rewrite ports can reduce the benefit of source-port randomization. Discussion: how often do middleboxes quietly weaken protections that end hosts deploy?
