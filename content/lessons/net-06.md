---
topicId: NET-06
title: Routing and BGP security
summary: Learn how autonomous systems announce and choose routes with BGP, why a network can attract traffic for addresses it does not hold, and how prefix filtering, RPKI route origin validation, session protection, and monitoring narrow that trust, including what each defense assumes.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how BGP announcements propagate between autonomous systems and how routers choose among competing routes.
  - Distinguish same-prefix, more-specific, and forged-origin hijacks, and predict which traffic each one attracts.
  - Apply RPKI route origin validation to classify routes as valid, invalid, or not found.
  - Evaluate the assumptions behind prefix filtering, origin validation, session protection, and monitoring, including the attacks each leaves open.
prerequisites: [NET-01, CRY-04]
concepts: [bgp, autonomous-system, bgp-hijacking, rpki]
keywords:
  - Border Gateway Protocol
  - BGP-4
  - autonomous system number
  - ASN
  - IP prefix
  - CIDR
  - longest prefix match
  - AS_PATH
  - UPDATE message
  - prefix hijack
  - route hijack
  - route leak
  - more-specific prefix
  - forged origin
  - Resource Public Key Infrastructure
  - ROA
  - route origin authorization
  - route origin validation
  - ROV
  - maxLength
  - TCP-AO
  - GTSM
  - maximum-prefix limit
  - RFC 4271
  - RFC 6811
  - RFC 7454
  - BCP 194
  - Pakistan Telecom
  - YouTube hijack
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 29: IP Routing: BGP'
    url: https://textbook.cs161.org/network/bgp.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 4271: A Border Gateway Protocol 4 (BGP-4)'
    url: https://www.rfc-editor.org/rfc/rfc4271
    publisher: IETF (RFC Editor)
  - title: 'RFC 6811: BGP Prefix Origin Validation'
    url: https://www.rfc-editor.org/rfc/rfc6811
    publisher: IETF (RFC Editor)
  - title: 'RFC 7454 (BCP 194): BGP Operations and Security'
    url: https://www.rfc-editor.org/rfc/rfc7454
    publisher: IETF (RFC Editor)
  - title: What Is BGP Hijacking?
    url: https://www.cloudflare.com/learning/security/glossary/bgp-hijacking/
    publisher: Cloudflare, Inc. (Learning Center)
  - title: 'YouTube Hijacking: A RIPE NCC RIS case study'
    url: https://www.ripe.net/publications/news/industry-developments/youtube-hijacking-a-ripe-ncc-ris-case-study/
    publisher: RIPE NCC
quiz:
  - question: The owner of 203.0.113.0/24 announces it with AS_PATH 64502 64501. Mallory's network announces 203.0.113.0/25 with the longer path 64510 64511. Where do routers that accept both routes send packets for 203.0.113.80?
    choices:
      - To the owner, because its AS path is shorter.
      - To mallory's network, because forwarding uses the most specific matching prefix, whatever the path length.
      - To whichever announcement arrived first, because BGP keeps the oldest route.
      - Half to each network, because BGP balances load across competing origins.
    answer: 1
    explanation: Path length only breaks ties between routes for the same prefix. A /25 and a /24 are different prefixes, and a router forwards each packet by the longest prefix that contains the destination, so the /25 attracts traffic for 203.0.113.0 through 203.0.113.127 wherever it is accepted.
  - question: "A ROA says AS64501 may originate 203.0.113.0/24 with a maximum length of 24. A router receives 203.0.113.0/24 with AS_PATH 64511 64501. What is its origin validation state?"
    choices:
      - Invalid, because AS64511 is not named in the ROA.
      - Not found, because the path contains an AS that has no ROA.
      - Valid, because only the origin, the rightmost AS, is checked, and it matches.
      - Invalid, because a valid route must come directly from the origin AS.
    answer: 2
    explanation: Origin validation compares the prefix and the origin AS with the ROA and ignores the rest of the path. A forged path that ends in the legitimate origin therefore validates, which is why origin validation alone cannot stop a forged-origin hijack.
  - question: In the 2008 YouTube incident, Pakistan Telecom's route spread worldwide because its upstream provider passed it on. Which control at that provider would most directly have stopped it?
    choices:
      - Cryptographic authentication of the BGP session with Pakistan Telecom.
      - A higher local preference for routes learned from Pakistan Telecom.
      - Running traceroute toward YouTube's addresses every few minutes.
      - A filter that accepts from Pakistan Telecom only the prefixes it is authorized to originate.
    answer: 3
    explanation: RFC 7454 recommends accepting from each customer only that customer's own prefixes. A /24 out of YouTube's block was not Pakistan Telecom's to announce, so such a filter would have stopped it at the first hop. Session authentication proves who sent an announcement, not whether it is true.
  - question: Two neighboring networks protect their BGP session with a cryptographic authentication option. What does that guarantee?
    choices:
      - That every route received over the session was originated by its legitimate holder.
      - That the messages came from the configured neighbor and were not altered in transit.
      - That traffic forwarded along the session's routes is encrypted.
      - That neither network can announce a prefix it does not hold.
    answer: 1
    explanation: Session protection defends the TCP connection between the two routers, for example against forged resets or injected messages. It says nothing about whether the neighbor's announcements are correct; that needs filtering and validation.
  - question: A network enforces route origin validation by dropping invalid routes. Which statement about the protection it gets is correct?
    choices:
      - It is protected only for prefixes whose holders published ROAs; routes in the not-found state are still accepted.
      - It is protected from all hijacks, because every route on the Internet must have a ROA.
      - It no longer needs prefix filters, because ROV checks the full AS path.
      - Its outgoing traffic is encrypted by the RPKI certificates.
    answer: 0
    explanation: ROV can judge only prefixes that have ROAs, and not-found routes are normally accepted so that unsigned address space keeps working. It also checks only the origin, so filtering and monitoring remain necessary.
---

## Why it matters

When alice opens `shop.example`, her packets may cross several networks run by different organizations before they reach the server. No central authority plans that path. Each network, called an [[autonomous-system|autonomous system (AS)]], tells its neighbors which blocks of IP addresses it can deliver to, using the [[bgp|Border Gateway Protocol (BGP)]]. Neighbors pass those announcements on, and every router builds its forwarding table from what it has been told.

That design scales to the whole Internet, and, in the CS 161 textbook's words, it "operates on trust, assuming that all ASs are effectively honest." Base BGP does not check whether the network announcing a block of addresses is entitled to it. A network that announces someone else's addresses, by mistake or on purpose, can attract their traffic. That is a [[bgp-hijacking|BGP hijack]], and the result can be an outage, interception, or impersonation.

The best-documented hijack was a mistake with global reach. On Sunday, 24 February 2008, Pakistan Telecom, trying to block YouTube inside Pakistan, began announcing a /24 prefix carved out of YouTube's /22. Its upstream provider, PCCW Global, passed the route on, and because a /24 is more specific than a /22, YouTube traffic from much of the Internet went to Pakistan instead. YouTube responded about 80 minutes later by announcing the same /24 and then two /25s, and PCCW Global withdrew Pakistan Telecom's routes a little over two hours after the hijack began, according to the RIPE NCC's case study built from its routing data.

## The core idea

Imagine post offices that tell neighboring post offices which streets they deliver to. Each office believes what it hears, passes it on, and, when two claims overlap, follows the more specific one. An office that falsely claims "I deliver to Main Street" receives Main Street's mail, even though another office legitimately serves the whole town.

BGP's trust assumptions:

1. **Announcements are believed unless a filter says otherwise.** The base protocol has no check that an AS may originate a prefix.
2. **More specific wins.** Forwarding follows the longest matching prefix, whatever path it took.
3. **Sessions authenticate neighbors, not truth.** BGP runs over TCP between configured neighbors; protecting that connection proves who sent a message, not whether it is correct.
4. **Policy chooses routes.** Each AS picks routes according to its own policy and preferences, not according to who owns the addresses.

## How it works

### Prefixes, AS numbers, and announcements

An IP prefix such as 203.0.113.0/24 names a block of addresses: the first 24 bits are fixed, so it covers the 256 addresses from 203.0.113.0 to 203.0.113.255. A /25 is half of that block. Each AS has a number; this lesson uses numbers reserved for documentation, such as AS64501.

Neighboring routers, called peers, hold a BGP session over TCP port 179 and exchange UPDATE messages (RFC 4271). An UPDATE announces reachable prefixes with attributes, most importantly AS_PATH, the list of ASes the route has passed through, and can withdraw routes that are no longer available. When a router passes a route to a peer in another AS, it adds its own AS number to the front of the path, so the rightmost number is the origin.

```sequence
title: AS64501 announces shop.example's prefix
participant O as AS64501 (owner)
participant T as AS64502 (transit)
participant A as AS64503 (alice's ISP)
O -> T: UPDATE 203.0.113.0/24, AS_PATH 64501
note T: Accepts per policy and prepends 64502
T -> A: UPDATE 203.0.113.0/24, AS_PATH 64502 64501
note A: Installs a route toward AS64502
A -> T: Alice's packets for 203.0.113.80
T -> O: Delivered to the owner's network
```

The first half of the diagram is the control plane, announcements flowing outward from the owner; the second half is the data plane, packets flowing back along the path that the announcement created.

### Choosing among routes

A router may hear several routes for the same prefix. RFC 4271's decision process first gives each route a degree of preference from local policy, carried for example in the LOCAL_PREF attribute, so an operator can favor some neighbors over others. Among otherwise equal choices, as the CS 161 textbook puts it, an AS "will generally select the shortest path." Forwarding is a separate step: for each packet, the router uses the most specific prefix in its table that contains the destination. A /25 therefore beats a /24 no matter how long its path is, which is why announcing a smaller range of addresses is such an effective way to hijack.

### Hijacks and leaks

Hijacks differ in what they announce:

| Variant              | Mallory's network (AS64511) announces | Who sends it traffic                                          |
| -------------------- | ------------------------------------- | ------------------------------------------------------------- |
| Same-prefix hijack   | 203.0.113.0/24, AS_PATH 64511         | Networks that prefer her route, typically those closer to her |
| More-specific hijack | 203.0.113.0/25, AS_PATH 64511         | Every network that accepts the /25                            |
| Forged-origin hijack | 203.0.113.0/24, AS_PATH 64511 64501   | Networks that prefer her route; the path looks legitimate     |

A route leak is different: an AS passes on routes it should have kept, for example re-announcing routes learned from one provider to another provider, so traffic detours through a network never meant to carry it.

What happens to attracted traffic depends on the intent. It can be dropped, an outage. It can be inspected and passed on toward the real destination, an interception. Or the hijacker can answer as if it were the destination.

```sequence
title: A more-specific hijack (conceptual)
participant M as AS64511 (mallory)
participant T as AS64502 (transit)
participant A as AS64503 (alice's ISP)
participant O as AS64501 (owner)
M -> T: UPDATE 203.0.113.0/25, AS_PATH 64511
T -> A: UPDATE 203.0.113.0/25, AS_PATH 64502 64511
note A: The /25 is more specific than the /24
A -> T: Alice's packets for 203.0.113.80
T -> M: Delivered to mallory's network
M -x O: The owner never sees this traffic
```

### Route origin validation with RPKI

The [[rpki|Resource Public Key Infrastructure (RPKI)]] adds what BGP lacks: a verifiable record of who may originate what. Holders of IP address blocks publish signed objects called Route Origin Authorizations (ROAs), such as "AS64501 may originate 203.0.113.0/24, up to a length of /24." Validators fetch and check these objects with [[digital-signature|digital signatures]] and hand routers the validated results.

RFC 6811 then gives each route a state by comparing its prefix and origin AS with those results:

| State    | Condition                                                                              |
| -------- | -------------------------------------------------------------------------------------- |
| Valid    | A ROA covers the prefix, names the route's origin AS, and allows the prefix's length   |
| Invalid  | At least one ROA covers the prefix, but none matches both the origin AS and the length |
| NotFound | No ROA covers the prefix                                                               |

What to do with each state is local policy: RFC 6811 mentions dropping invalid routes or giving them lower preference, and RFC 7454 recommends discarding invalid routes, on top of filtering rather than instead of it. RFC 6811 is candid about the limits. It offers no path validation, so an attacker can put the legitimate origin AS at the end of a forged announcement; its authors describe it as more a protection against misconfiguration than security in the strong sense; and if attackers could tamper with the validation data, dropping invalid routes could itself cause outages.

### A small routing model

The activity for this topic is to analyze a small routing model and its defensive assumptions. This Python sketch combines route selection with origin validation. It is a teaching toy: it collapses policy into "most specific prefix, then shortest path" and sends no traffic.

```python
import ipaddress

# Signed origin statements (ROAs): which AS may originate which prefix.
ROAS = [{"prefix": "203.0.113.0/24", "max_length": 24, "origin": 64501}]


def rov_state(route):
    """Route origin validation in the style of RFC 6811."""
    net = ipaddress.ip_network(route["prefix"])
    origin = route["as_path"][-1]           # the rightmost AS originated it
    covering = [r for r in ROAS
                if net.subnet_of(ipaddress.ip_network(r["prefix"]))]
    if not covering:
        return "not-found"
    for roa in covering:
        if roa["origin"] == origin and net.prefixlen <= roa["max_length"]:
            return "valid"
    return "invalid"


def best_route(dest, routes, drop_invalid=False):
    """Longest matching prefix wins; ties go to the shortest AS path."""
    addr = ipaddress.ip_address(dest)
    usable = [r for r in routes
              if addr in ipaddress.ip_network(r["prefix"])
              and not (drop_invalid and rov_state(r) == "invalid")]
    usable.sort(key=lambda r: (-ipaddress.ip_network(r["prefix"]).prefixlen,
                               len(r["as_path"])))
    return usable[0] if usable else None
```

## Worked example

Alice's ISP, AS64503, wants to know which of its routing defenses would protect her traffic to `shop.example` at 203.0.113.80. Run `best_route("203.0.113.80", routes)` for four sets of routes, once with `drop_invalid=False` and once with `drop_invalid=True`:

| Scenario         | Routes AS64503 hears                                | Without ROV | ROV state of mallory's route | With ROV |
| ---------------- | --------------------------------------------------- | ----------- | ---------------------------- | -------- |
| 1. Normal        | /24 via 64502 64501                                 | Owner       | (none)                       | Owner    |
| 2. Same prefix   | Owner's route, plus /24 via 64511                   | Mallory     | invalid                      | Owner    |
| 3. More specific | Owner's route, plus /25 via 64510 64511             | Mallory     | invalid                      | Owner    |
| 4. Forged origin | /24 via 64504 64502 64501, plus /24 via 64511 64501 | Mallory     | valid                        | Mallory  |

**Step 1: Read scenario 2.** Mallory's path (one AS) is shorter than the owner's (two), so without validation her route wins. Her origin, 64511, is not in the ROA, so it is invalid and dropped.

**Step 2: Read scenario 3.** The /25 wins on specificity even though its path is longer. It is invalid twice over: wrong origin, and a length of 25 exceeds the ROA's maximum of 24.

**Step 3: Read scenario 4.** Mallory claims to be a neighbor of AS64501. The rightmost AS matches the ROA, so origin validation says valid, and her shorter path wins. ROV never examines the rest of the path.

**Step 4: List the defensive assumptions.** The protection in scenarios 2 and 3 holds only if (a) the owner published a ROA, (b) its maximum length is tight, (c) AS64503 or a network upstream of it drops invalid routes, and (d) its validator has current data. Break (b): if the owner had allowed lengths up to /25 "for flexibility," a forged-origin /25 (path 64511 64501) would be valid and would beat the /24 everywhere it was accepted.

**Step 5: Note what the toy leaves out.** Real networks apply local policy before path length, and no network hears every route. RFC 7454 also notes the common practice that IPv4 prefixes longer than /24 are generally neither announced nor accepted, so a real more-specific hijack carves /24s out of a larger block. The toy's lesson is about assumptions, not about predicting the real Internet.

## Defenses

> [!ETHICS] Only test systems you own or have written permission to test.

- **Filter announcements at the edge.** RFC 7454 recommends accepting from each customer only the customer's own prefixes and discarding everything else, which stops a mistaken or malicious announcement at its first hop. Maximum-prefix limits shut a session down if a neighbor suddenly sends far more routes than expected. Limits: filters are only as good as the records behind them, and they must be maintained.
- **Publish ROAs and enforce origin validation.** Owners publish ROAs with tight maximum lengths; networks drop invalid routes. Limits: unsigned prefixes stay unprotected, networks that do not enforce still accept invalid routes, and forged-origin paths pass.
- **Protect sessions.** The TCP Authentication Option (or the older MD5 option) authenticates the TCP connection between neighbors against spoofed resets and injected packets, and the TTL security check rejects packets from routers that are not directly connected (RFC 7454). Limit: this proves who spoke, not that what they said is true.
- **Monitor.** Networks and researchers watch BGP updates, so an owner can be alerted when its prefixes appear with a new origin or as more-specifics. Limit: detection is not prevention; the fix still needs other networks to act.
- **Rely on end-to-end authentication.** A hijacker who attracts traffic for `shop.example` cannot complete a [[tls|TLS]] handshake as the site without a certificate for it, so browsers that validate certificates refuse the connection. Limits: the outage and metadata exposure remain, and unencrypted protocols are exposed.

## Common misconceptions

- **"Hijacks are always attacks."** Accidental hijacks are common, and the defenses are the same.
- **"RPKI encrypts or signs BGP messages."** Origin validation checks announcements against signed ROAs; the BGP messages themselves are unchanged and unsigned.
- **"ROV stops all hijacks."** It stops wrong-origin announcements where it is enforced, and only for prefixes with ROAs. Forged paths and leaks need other defenses.
- **"A secured BGP session means secure routing."** The session can be perfectly authenticated while the neighbor passes on false routes.
- **"Only the hijacker's neighbors are affected."** An announcement that nobody filters can spread across the whole Internet, as the 2008 YouTube outage showed.

## Try it yourself

Use only your own computer, your own traffic, and the toy model.

```bash
# Show the networks your own packets cross (Windows: tracert example.com)
traceroute example.com

# Look up who holds the address block of a hop or of your public address
whois 203.0.113.80        # replace with a real hop address from your output
```

1. Run `traceroute` to a site you use. Where does your ISP's network end and the next network begin? Traceroute shows only the forward path, and some routers do not answer, so treat gaps as unknown rather than as evidence.
2. Use `whois` on one hop address. Which organization holds the block, and which registry answered?
3. Copy the toy model to your computer and reproduce the worked example's table, including the loose-maximum-length case from Step 4. Then look for a ROA setting that would let the owner announce two /25s itself in an emergency, as YouTube did in 2008, without also making a forged-origin /25 valid. What does your answer say about the limits of origin validation?
4. Paper exercise: add a fifth scenario in which AS64503 hears the owner's route from two providers and mallory's leak from a third. Which defense from the list above would catch a leak, and which would not?

## Key takeaways

- BGP lets each autonomous system announce prefixes and pass on its neighbors' routes; base BGP never checks who may originate a prefix.
- Routers forward by the most specific matching prefix, so a more-specific announcement attracts traffic wherever it is accepted.
- RPKI route origin validation drops announcements whose origin AS or length a ROA does not allow, but it ignores the rest of the AS path.
- Every routing defense rests on assumptions: accurate filters, published ROAs with tight maximum lengths, enforcement by other networks, and someone watching.
- End-to-end authentication such as TLS limits what a hijacker gains, but not the outage.

## Go deeper

- RFC 6811's [security considerations](https://www.rfc-editor.org/rfc/rfc6811) explain what origin validation does not protect against. Open question: what would it take for networks to validate entire AS paths, and why is that so much harder than validating origins?
- The RIPE NCC's [YouTube hijacking case study](https://www.ripe.net/publications/news/industry-developments/youtube-hijacking-a-ripe-ncc-ris-case-study/) gives a timeline of the event, to the minute, built from its route collectors. Exercise: for each event in the timeline, name the network that could have stopped the hijack at that point and the control it would have needed.
- In ["A Look Back at 'Security Problems in the TCP/IP Protocol Suite'"](https://www.cs.columbia.edu/~smb/papers/acsac-ipext.pdf), Steven M. Bellovin reflects on how routing attacks went from theoretical in 1989 to observed in practice.
