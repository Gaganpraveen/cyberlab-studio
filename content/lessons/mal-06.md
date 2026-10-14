---
topicId: MAL-06
title: Denial-of-service and resource exhaustion
summary: Treat denial of service as a capacity problem. Calculate what happens when requests arrive faster than a service can serve them, find the scarce resource at each layer, and weigh what each defense, from rate limits and SYN cookies to upstream scrubbing and source-address validation, removes, absorbs, and costs.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Calculate utilization, queue growth, waiting time, and the share of legitimate requests served when arrivals exceed a service's capacity.
  - Identify the scarce resource behind a denial-of-service technique (bandwidth, connection state, or application work) and where a defense must run to protect it.
  - Explain how SYN cookies and source-address validation work, and state the costs and limits that RFC 4987 and BCP 38 give for each.
  - Compare rate limiting, caching, load shedding, autoscaling, and upstream scrubbing by what each changes in a capacity model and what it costs.
  - List the monitoring signals and incident-plan decisions a team needs in place before a denial-of-service event.
prerequisites: [FND-01, NET-01, NET-04, APP-08, MAL-05]
concepts:
  - dos-attack
  - ddos-attack
  - amplification-attack
  - utilization
  - load-shedding
  - graceful-degradation
  - autoscaling
  - content-delivery-network
  - traffic-scrubbing
  - ingress-filtering
  - syn-cookies
labs: [ddos]
keywords:
  - DoS
  - DDoS
  - denial of service
  - distributed denial of service
  - resource exhaustion
  - availability engineering
  - capacity planning
  - queueing model
  - headroom
  - goodput
  - flash crowd
  - load shedding
  - graceful degradation
  - autoscaling
  - quota
  - SYN flood
  - SYN backlog
  - half-open connection
  - DDoS scrubbing
  - DDoS mitigation service
  - CDN
  - source address validation
  - BCP 38
  - RFC 2827
  - RFC 4987
  - volumetric attack
  - protocol attack
  - application-layer attack
  - TA0040
  - T1498
  - T1498.001
  - T1498.002
  - T1499
  - T1499.001
  - T1499.002
  - T1499.003
  - T1499.004
  - M1037
  - CWE-400
sources:
  - title: 'RFC 4987: TCP SYN Flooding Attacks and Common Mitigations'
    url: https://www.rfc-editor.org/rfc/rfc4987
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 2827 (BCP 38): Network Ingress Filtering: Defeating Denial of Service Attacks which employ IP Source Address Spoofing'
    url: https://www.rfc-editor.org/rfc/rfc2827
    publisher: IETF (RFC Editor)
    license: Copyright (C) The Internet Society (2000)
  - title: Understanding and Responding to Distributed Denial-of-Service Attacks
    url: https://cisa.gov/resources-tools/resources/understanding-and-responding-distributed-denial-service-attacks
    publisher: CISA, FBI, and MS-ISAC (joint guide)
  - title: 'MITRE ATT&CK: Network Denial of Service (T1498)'
    url: https://attack.mitre.org/techniques/T1498/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Endpoint Denial of Service (T1499)'
    url: https://attack.mitre.org/techniques/T1499/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'Computer Security (CS 161 textbook), Chapter 34: Denial-of-Service (DoS)'
    url: https://textbook.cs161.org/network/dos.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: A service completes 200 requests per second. During a flood it receives 1,000 requests per second, 100 of them from real users, and it cannot tell the two apart. About what share of the real users' requests does it serve?
    choices:
      - 10 percent, because real users send 10 percent of the traffic.
      - 20 percent, because every request has the same 200-in-1,000 chance of being served.
      - 100 percent, because the service is still running.
      - 0 percent, because a flood blocks every request.
    answer: 1
    explanation: With no way to tell requests apart, capacity is shared in proportion to arrivals. Real users send 10 percent of the requests, so they receive 10 percent of the 200 completions, which is 20 per second, or 20 percent of their 100 requests. In general the share served is μ/λ, here 200/1,000. The service is up, but mostly serving the flood.
  - question: During an overload, an engineer doubles a request queue from 500 to 1,000 slots. The service completes 100 requests per second, and clients give up after 2 seconds. What is the main effect?
    choices:
      - The service completes twice as many requests per second.
      - The flood stops, because the queue can no longer fill.
      - Waits get shorter, because more requests can wait their turn.
      - Drops start a little later, but a request at the back now waits about 10 seconds instead of 5, far past the timeout, so the extra queued work is wasted.
    answer: 3
    explanation: A queue adds waiting room, not capacity. While arrivals exceed the service rate, the bigger queue still fills, only later, and the worst wait (B/μ) doubles from 5 to 10 seconds. Both are beyond the 2-second timeout, so the service spends its capacity answering clients that have left. Shedding load early with a short queue protects goodput instead.
  - question: A flood fills the network link between campus.example and its Internet provider. Why can't the firewall on the campus side of that link solve the problem?
    choices:
      - The firewall sits behind the full link, so attack and legitimate packets are already competing for the same bandwidth before any filter runs; the filtering has to happen upstream.
      - Firewalls cannot read source addresses.
      - Firewalls only stop application-layer attacks.
      - The flood is encrypted, so the firewall cannot see it.
    answer: 0
    explanation: The scarce resource is the link itself, and dropping packets after they have crossed it frees nothing. ATT&CK's mitigation for Network Denial of Service (T1498) says floods that exceed link capacity typically need interception upstream, by the Internet service provider, a CDN, or a DoS mitigation service.
  - question: What does a server using SYN cookies store about a new connection between sending its SYN-ACK and receiving the final ACK, and what is the main price RFC 4987 names?
    choices:
      - A full connection record; the price is extra memory for every connection.
      - Only the client's IP address; the price is a slower handshake for every client.
      - Nothing, because it encodes the connection's details in the sequence number of its SYN-ACK; the main price is losing TCP options, above all window scaling.
      - A copy of the client's certificate; the price is the processor time spent on encryption.
    answer: 2
    explanation: RFC 4987 says SYN cookies "allocate no state at all for connections in SYN-RECEIVED" and rebuild that state from the acknowledgment number in the final ACK, so a forged SYN uses no backlog slot. The RFC calls disabling window scaling "the largest price" and notes that common schemes are incompatible with some TCP options.
  - question: Arrivals at a service triple. The new traffic comes from thousands of new addresses, each sending about one request per second, below the per-client rate limit. What is the best response?
    choices:
      - Tighten the per-client limit to one request per minute for everyone.
      - Treat it as a possible DDoS or a flash crowd. Switch on planned degraded modes and caching, scale within budget, bring in the CDN or scrubbing provider, and look for behavior that separates bots from people.
      - Do nothing, because every client is under the rate limit.
      - Block every address that sent a request in the last minute.
    answer: 1
    explanation: Per-client limits work when each abusive client sends far more than a person. ATT&CK notes that in a large botnet each system "only needs to send out a small amount of traffic," which makes the flood hard to separate from legitimate clients, and a flash crowd of real users looks the same. Tightening limits or mass blocking would finish the attacker's job. Layered defenses that cut the cost per request, add capacity, and filter upstream fit this case.
---

## Why it matters

Most attacks in this course steal secrets or change data. A [[dos-attack|denial-of-service (DoS) attack]] does neither. The CS 161 textbook describes it as an attack "designed to cause a machine or a piece of software to be unavailable," and [[mitre-attack|MITRE ATT&CK]] gives the goal as degrading or blocking "the availability of targeted resources to users." Students cannot submit an exam and customers cannot pay: a failure of [[availability]], the A in the [[cia-triad]].

Often no vulnerability is needed. Every service has finite capacity, and an attack only needs to exhaust "the part of the system with the least resources" (CS 161). A [[ddos-attack|distributed denial-of-service (DDoS) attack]] spreads the demand across many machines, often a [[botnet]]. Overload looks the same whether an attacker or a [[flash-crowd|flash crowd]] on registration day at `campus.example` causes it, so this lesson treats denial of service as availability engineering: measure capacity, find the scarce resource, and decide in advance what to protect and what to drop.

## The core idea

Picture a campus help desk. Its staff can serve a fixed number of visitors per hour, the **service rate** μ (mu). Visitors come at an **arrival rate** λ (lambda), and ρ = λ/μ is the desk's [[utilization]]. While ρ stays below 1, the line stays short. Once visitors arrive faster than the staff can serve them, the line and the wait grow every hour, and when the room is full, newcomers are turned away.

The model assumes that:

1. Every service has a finite service rate at its scarcest resource: link bandwidth, a connection table, or processor time.
2. The service cannot cheaply tell legitimate requests from attack requests as they arrive. If it could, filtering would solve the problem.
3. Queues, buffers, and tables have limits.
4. Clients give up after a timeout, so a late answer is as useless as none.

The attacker then has one lever: demand relative to capacity at the bottleneck. The defender has four: remove bad demand, make each request cheaper, add capacity, and choose which requests to drop.

## How it works

### Arrivals, service, and queues

With λ requests arriving and μ completed per second at the bottleneck, a deterministic model (identical requests, perfectly steady arrivals) has two regimes:

| Utilization | What happens                                                                             | Wait for a new request                |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------- |
| ρ ≤ 1       | Every request is served; μ − λ is spare capacity, or **headroom**                        | About one service time                |
| ρ > 1       | The queue grows by λ − μ per second up to its limit B; after that, the excess is dropped | Up to B/μ at the back of a full queue |

- **Overload is a rate problem.** A queue of B slots fills in B/(λ − μ) seconds. Doubling B only delays the first drop, and it doubles the worst wait.
- **Late is lost.** If B/μ exceeds the client's timeout, capacity goes to requests whose senders have left. What counts is **goodput**, the useful responses delivered in time.
- **Everyone shares the loss.** If capacity is shared in proportion to arrivals, every request has the same chance, μ/λ, of being served.

Real arrivals are bursty, so waits climb steeply as ρ nears 1, which is why operators keep headroom.

### Where the scarce resource sits

ATT&CK separates Network Denial of Service (T1498), which works by "exhausting the network bandwidth services rely on," from Endpoint Denial of Service (T1499), which denies service "without saturating the network." The bottleneck's layer decides where a defense must run. The rows line up roughly with the three types in a joint CISA, FBI, and MS-ISAC guide: volumetric attacks that use up bandwidth, protocol attacks, and application attacks.

| Scarce resource                                                    | ATT&CK | Where the defense must run                                               |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------ |
| Bandwidth of the links into a site                                 | T1498  | Upstream, because filters behind a full link act too late                |
| Connection state, such as the TCP backlog of half-open connections | T1499  | At the host or edge device, by keeping less state                        |
| Application work: processor time, memory, database queries         | T1499  | In the application, with per-client and per-operation limits and caching |

Connection state shows why the smallest resource matters. A TCP server keeps a record of each half-open connection until the [[three-way-handshake]] completes or times out. RFC 4987 explains that a [[syn-flood]] aims to "exhaust the backlog of half-open connections associated with a port number." Bandwidth and processors can sit idle while new connections are refused. [TCP connection state](lesson:NET-04) covers the backlog in detail.

### Cheap to ask, expensive to answer

CS 161 describes attacks that "rely on asymmetry," where "a small amount of input from the attack results in a large amount of consumed resources." A search across a large table, a login with deliberately slow [[password-hashing]], or a regular expression open to [[redos]] has its own small μ, and the most expensive operation becomes the bottleneck. Volume can also be borrowed: in an [[amplification-attack]] (ATT&CK's Reflection Amplification, T1498.002), third-party services send large replies to small requests forged to carry the victim's address, which works only where networks let forged packets out.

## Worked example

`search.shop.example` has four workers. A search takes 40 ms of worker time, so each worker completes 25 searches per second and μ = 100 per second. The queue holds 500 searches, and the shop's pages give up on a search after 2 seconds. Normally, real users send λ = 60 searches per second, so ρ = 0.6, with 40 per second of headroom.

**Step 1: the flood.** At 14:00, monitoring shows 400 extra searches per second from 40 addresses in `203.0.113.0/24`, about 10 per second each; no real user sends more than one. Now λ = 460 and ρ = 4.6. The queue grows by 360 per second, fills in about 1.4 seconds (500/360), and from then on 360 searches per second are dropped.

**Step 2: who is served, and when.** The queue cannot tell users from bots, so users get 60/460 of the 100 completions per second: about 13 per second, or 22 percent of their searches. But a search at the back of the full queue waits 500/100 = 5 seconds, past the timeout, so almost every answer reaches a page that has given up. The workers run flat out while goodput is near zero.

**Step 3: defend and recompute.** The team adds three changes in turn; this model reproduces each row of the table:

```python
def steady_state(users, bots, mu, queue_limit, timeout):
    """Deterministic overload model: capacity is shared in proportion to arrivals."""
    lam = users + bots
    share = min(1.0, mu / lam)                    # chance that a given request is served
    wait = queue_limit / mu if lam > mu else 0.0  # delay at the back of a full queue
    in_time = users * share if wait <= timeout else 0.0
    return lam / mu, wait, in_time


for change, args in [
    ("none", (60, 400, 100, 500, 2)),
    ("cap queue", (60, 400, 100, 100, 2)),
    ("rate limit", (60, 80, 100, 100, 2)),
    ("8 workers", (60, 80, 200, 100, 2)),
]:
    rho, wait, in_time = steady_state(*args)
    print(f"{change:10}  rho={rho:.1f}  wait={wait:.1f} s  answered in time={in_time:.0f}/s")
```

| Change                            | λ (users + bots) | μ   | ρ   | Real searches answered in time    |
| --------------------------------- | ---------------- | --- | --- | --------------------------------- |
| None                              | 60 + 400 = 460   | 100 | 4.6 | Almost none (5 s waits)           |
| Cap the queue at 100              | 460              | 100 | 4.6 | About 13/s (22%), waits about 1 s |
| Limit each client to 2 searches/s | 60 + 80 = 140    | 100 | 1.4 | About 43/s (71%)                  |
| Scale out to 8 workers            | 140              | 200 | 0.7 | All 60/s                          |

The queue cap adds no capacity, but accepted searches now finish in about a second, and rejected users get an immediate error. The per-client limit, set well above any person's rate, cuts each bot from 10 to 2 searches per second, removing 80 percent of the bot load. Eight workers restore headroom but still serve 80 bot searches per second, the price of not telling bots from people.

**Step 4: price the alternative.** Without the limit, keeping up with 460 searches per second takes at least 19 workers (460/25 = 18.4), almost five times the normal fleet, and 87 percent of their work serves bots. Scaling absorbs a flood; filtering removes it.

## Defenses

Each defense moves one variable in the model, and each has a cost.

**Rate limits and quotas remove bad demand.** [[rate-limiting|Rate limiting]] caps how fast one client may send, and a quota caps how much it may consume. They must run before the expensive work. Key them by account or API key where possible, since per-address limits also hit everyone who shares an address through [[network-address-translation]]. The hard limit is scale: ATT&CK notes that in a large botnet each system "only needs to send out a small amount of traffic," which is hard to separate from legitimate clients. [API rate, quota, and business-logic controls](lesson:APP-08) shows how to build one.

**SYN cookies remove per-connection state.** With [[syn-cookies]], a server can "allocate no state at all for connections in SYN-RECEIVED" (RFC 4987). It encodes what it needs "into the sequence number transmitted on the SYN-ACK" and rebuilds the state only when the client's final ACK echoes that number back. In the diagram, a forged SYN and Alice's genuine one get the same reply, but only Alice's becomes a connection:

```sequence
title: SYN cookies keep no state until the client answers
participant M as Forged SYNs
participant S as shop.example
participant X as 198.51.100.7
participant A as Alice 192.0.2.10
M -> S: SYN claiming to come from 198.51.100.7
note S: Stores nothing; the cookie is its sequence number
S --> X: SYN-ACK carrying the cookie
note X: Never sent a SYN, so sends no ACK
A -> S: SYN
S --> A: SYN-ACK carrying the cookie
A -> S: ACK that echoes the cookie
note S: Cookie checks out: create the connection now
```

The price, in the RFC's words: "The largest price to be paid for using SYN cookies is in the disabling of the window scaling option," and common schemes "are incompatible with some TCP options." (Window scaling lets fast connections keep more data in flight.) Cookies protect only the half-open table, not bandwidth or connections that complete the handshake.

**Caching and CDNs make requests cheaper and add capacity.** A cache answers a repeated request without redoing the work. A [[content-delivery-network|content delivery network (CDN)]] puts caches in many locations with far more capacity than one site, so it absorbs much of a flood before it reaches the origin server. Searches, logins, and personalized pages still reach the origin, which should accept traffic only from the CDN so its address is not a side door.

**Load shedding and graceful degradation choose who is dropped.** [[load-shedding|Load shedding]] rejects excess work early and cheaply, as in step 3, instead of letting it wait until the client has left. [[graceful-degradation|Graceful degradation]] decides what to give up: serve static pages, pause recommendations, and reserve capacity for logins and checkout. Set and test these priorities in advance, and have clients wait longer after each failure, because immediate retries multiply the arrival rate.

**Autoscaling raises μ, at a price.** [[autoscaling|Autoscaling]] adds servers as load rises. It copes with [[flash-crowd|flash crowds]], but it also serves attack traffic, so the bill grows with the attack. CS 161 warns that overprovisioning "can be pretty expensive and usually can still be circumvented." New capacity takes time to start, quotas and budgets cap it, and it cannot fix a shared database or a full link. Set a maximum, alert on spending, and pair scaling with filtering.

**Upstream scrubbing filters where capacity is larger.** Once a flood fills a site's own links, nothing at the site can help. ATT&CK says such floods typically need interception upstream, by the hosting Internet service provider, a CDN, or a DoS mitigation specialist. [[traffic-scrubbing|Traffic scrubbing]] routes incoming traffic through a provider with much larger capacity, which drops attack traffic and forwards the rest. It costs a contract, trust in a provider that sees your traffic, possible extra delay, and a switch-over that must be rehearsed.

**Source-address validation stops forged sources near their origin.** [[ingress-filtering|Ingress filtering]], the Best Current Practice in BCP 38 (RFC 2827), has a provider accept a customer's traffic only from source addresses within the prefixes assigned to that customer, which also makes attacks from filtered networks traceable. Its authors admit it "does absolutely nothing to protect against flooding attacks which originate from valid prefixes," and it cannot stop a customer from forging another address inside its own range. Most of the benefit goes to other networks, and RFC 4987 warns that "global deployment of filters is neither guaranteed nor likely." Filter your own edge, and do not count on others.

**Monitoring and an incident plan turn this into action.** Watch the model's variables: arrivals by client and operation, queue depth, latency, timeouts, link utilization, and connection-table use. A growing queue with steady arrivals points to a slow dependency. Rising arrivals from a few clients point to abuse; rising arrivals from many new clients, to a DDoS or a flash crowd. ATT&CK's detection guidance for T1499 adds host saturation: processes exhausting CPU or memory, repeated out-of-memory kills, and services that keep restarting. Write the [[incident-response]] [[playbook]] in advance: who declares a DoS incident, how to reach the provider and the scrubbing service, how to divert traffic, which degraded modes to switch on, and how to tell users. ATT&CK's mitigation advice also calls for disaster recovery and [[business-continuity]] plans. Rehearse in a [[tabletop-exercise]].

## Common misconceptions

- **"A bigger queue makes a service sturdier."** It adds waiting, not capacity, and past the timeout, queued work is wasted.
- **"Busy servers are serving users."** Utilization can be 100 percent while goodput is near zero.
- **"Blocking the attacking addresses ends it."** Many sources, forged addresses, or a full link defeat blocking at the site.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test. The lab is a deterministic model that sends no network traffic.

[The lab](lab:ddos), the Botnet and DDoS Simulator, is a seeded model of one fictional service. Each tick, 24 to 29 real requests arrive, the service can complete 30, and at most 90 requests can wait. From tick 16 through tick 39 of 48, six bots send 30 requests each per tick. You pick a defense (None, Rate limit, or Scale up) and press **Run simulation**.

1. **Predict.** Rate limit caps each source at 2 requests per tick; Scale up triples capacity. For each defense, compute ρ during the flood and the share μ/λ of real requests you expect served.
2. **Baseline.** Run with None. The chart of real users served per tick drops in the shaded flood window. Record its four results, from users served during the attack to peak queue. This solves "Watch it fall over."
3. **Defend.** Run Rate limit (this solves "Throttle the bots"), then Scale up, and check your predictions. Why does the peak queue still hit its limit under rate limiting? Which run served the most bot requests?
4. **Recover.** After the flood, two runs take a few ticks to recover and one recovers at once. Use the queue to explain why.
5. **Compare.** Open the Compare tab and answer the remaining challenges. Then explain in two sentences what kind of flood defeats per-source limits and which defense you would use instead.

**Without the lab.** In a spreadsheet or on paper, step the worked example through 30 seconds, with the flood from second 5 to second 15. Use columns for user and bot arrivals, admitted, served, queue, dropped, and wait (queue ÷ μ), and mark each row where the wait exceeds the timeout. Add one defense at a time and see which rows change. Then find the fewest workers that keep ρ below 0.8, with and without the rate limit.

## Key takeaways

- Denial of service is a capacity problem: past the bottleneck's service rate, the queue grows by λ − μ, waits climb, and the excess is dropped, whoever sent it.
- Find the scarce resource first. Full links need upstream help, connection state needs less state per connection, and application work needs limits and caching.
- Late is lost, so shed load early and degrade gracefully.
- Every defense has a cost or a limit. Layer them, and write the plan, with provider contacts, before an attack.

## Go deeper

- **Rank the mitigations.** RFC 4987 compares eight; firewalls and proxies, it says, move "the problem away from end hosts to become the firewall's or proxy's problem." Rank all eight by their cost to legitimate clients.
- **Who pays?** CS 161 suggests proof-of-work to make "the DoS attack more expensive for the attacker." What does it cost a student on an old phone, compared with a [[captcha]]?
