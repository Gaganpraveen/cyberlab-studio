---
topicId: OPS-04
title: Intrusion detection and prevention
summary: Learn how intrusion detection and prevention systems watch network traffic and hosts for attacks, how signature and anomaly methods differ, and how to weigh the evidence an alert provides against the cost of its false positives, especially when the system blocks traffic on its own.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish an IDS from an IPS, and network-based from host-based sensors, by placement and by what each can observe.
  - Compare signature-based, anomaly-based, and stateful protocol analysis detection and their typical failure modes.
  - Read a Suricata rule and explain which traffic it matches and what evidence its alert provides.
  - Estimate the cost of false positives and false negatives for alert-only and blocking deployments, and choose between them.
  - Explain how encryption, base rates, and failed attack attempts limit what an alert proves.
prerequisites: [NET-01, OPS-02]
concepts: [ids, ips, signature-based-detection, anomaly-based-detection]
labs: []
keywords:
  - IDS
  - IPS
  - IDPS
  - NIDS
  - HIDS
  - NIPS
  - intrusion detection system
  - intrusion prevention system
  - misuse detection
  - anomaly detection
  - specification-based detection
  - behavioral detection
  - stateful protocol analysis
  - Suricata
  - signature
  - rule action
  - inline mode
  - network tap
  - SPAN port
  - fail-open
  - fail-closed
  - virtual patching
  - NIST SP 800-94
  - DE.CM-01
sources:
  - title: 'NIST SP 800-94: Guide to Intrusion Detection and Prevention Systems (IDPS)'
    url: https://csrc.nist.gov/pubs/sp/800/94/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: 'Computer Security (CS 161 textbook), Chapter 36: Intrusion Detection'
    url: https://textbook.cs161.org/network/intrusion-detection.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Suricata documentation: Rules Format'
    url: https://docs.suricata.io/en/latest/rules/intro.html
    publisher: Open Information Security Foundation (OISF)
  - title: 'Suricata documentation: Meta Keywords'
    url: https://docs.suricata.io/en/latest/rules/meta.html
    publisher: Open Information Security Foundation (OISF)
  - title: 'Axelsson, "The base-rate fallacy and the difficulty of intrusion detection," ACM TISSEC 3(3), 2000'
    url: https://doi.org/10.1145/357830.357849
    publisher: ACM
  - title: The NIST Cybersecurity Framework (CSF) 2.0
    url: https://csrc.nist.gov/pubs/cswp/29/the-nist-cybersecurity-framework-csf-20/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-csf-2
quiz:
  - question: A network IDS watching a copy of traffic alerts on an exploit attempt against a web server. What does the alert, by itself, establish?
    choices:
      - The web server was compromised.
      - Traffic matching the signature crossed that link at that time; whether it succeeded needs host, application, and vulnerability evidence.
      - The IDS blocked the attack before it reached the server.
      - The source address is the attacker's own computer.
    answer: 1
    explanation: A passive sensor records attempts; it cannot block, and it does not see the server's internal effects. Many attempts are automated scans that fail. Source addresses can belong to rented servers, proxies, or other victims.
  - question: Why would a team run a new IPS signature in alert mode for a few weeks before switching it to drop?
    choices:
      - Drop mode cannot record anything about the traffic it blocks.
      - Alert mode inspects packets faster than drop mode.
      - To measure the signature's false positives on real traffic, because in drop mode every false positive blocks a legitimate user.
      - Signatures can only drop traffic after a restart.
    answer: 2
    explanation: Prevention turns each false positive into an outage for someone. Measuring first shows whether the expected cost of wrong blocks is lower than the expected cost of missed attacks.
  - question: According to NIST SP 800-94, what is a main weakness of anomaly-based detection?
    choices:
      - It often produces many false positives, and its profile of normal can absorb malicious activity present while it was learning.
      - It can only detect attacks that already have published signatures.
      - It cannot process traffic that uses TCP.
      - It never raises alerts on new kinds of attacks.
    answer: 0
    explanation: Anomaly detection flags deviations from a learned profile. Unusual is not the same as malicious, normal behavior drifts, and an attacker already present during training can become part of "normal."
  - question: Nearly all traffic to shop.example uses TLS. Where can the team still inspect the content of HTTP requests?
    choices:
      - On a passive sensor on the internet link, by reading the encrypted payload
      - Nowhere; encrypted traffic cannot be monitored at all
      - Only by asking customers to disable encryption
      - At the point where TLS is terminated, such as a load balancer or reverse proxy, or on the server itself
    answer: 3
    explanation: A sensor on the wire sees addresses, ports, timing, and some handshake metadata, but not the request. Content becomes visible where it is decrypted, which is also why host-based sensors and application logs matter.
  - question: A Suricata rule's header is alert http $EXTERNAL_NET any -> $HOME_NET any, and its options include flow:established,to_server. Which traffic can it match?
    choices:
      - Client requests from outside hosts to inside hosts on established connections
      - Server responses from inside hosts back to outside clients
      - Any HTTP traffic in either direction
      - Only traffic to port 80
    answer: 0
    explanation: The arrow sets the direction from $EXTERNAL_NET to $HOME_NET, and to_server limits matching to the client-to-server side of an established connection. The ports are any, so the rule is not limited to port 80.
---

## Why it matters

A [[firewall]] decides what may pass based mostly on addresses, ports, and connection state. Many attacks travel over paths the firewall must allow, such as HTTPS to a public web server. An intrusion detection system looks at what actually crosses those allowed paths and raises an alert when it sees signs of an attack; an intrusion prevention system sits in the path and can drop the traffic itself. Both serve the [[nist-csf]] 2.0 outcome DE.CM-01, "Networks and network services are monitored to find potentially adverse events."

That difference turns a technical choice into a risk decision. When an alert-only sensor misfires, an analyst loses a few minutes. When a blocking sensor misfires, a customer's checkout fails, a partner's integration breaks, or a hospital's device loses its connection. Deciding which detections may block, and which may only alert, means pricing both kinds of error.

The arithmetic from the lesson on [detection rules](lesson:OPS-02) applies with full force. A sensor on a busy link inspects billions of packets a day, nearly all benign, so the [[base-rate-fallacy]] that Axelsson described for intrusion detection makes even rare misfires add up to a steady stream of false alarms.

## The core idea

An [[ids]] (intrusion detection system) monitors traffic or host activity and reports suspected attacks. An [[ips]] (intrusion prevention system) does the same from a position where it can also act, usually by dropping packets or resetting connections. NIST groups both under the name IDPS.

Airport security is a fair analogy. The X-ray operator compares bag contents with known shapes of dangerous items (signatures). A behavior detection officer looks for passengers acting unlike typical travelers (anomalies). The gate agent can stop someone from boarding (prevention). An X-ray that alarms on every belt buckle backs up the line until people stop paying attention; a gate that wrongly stops passengers costs flights and goodwill.

Every IDPS design rests on four assumptions, and each can fail:

1. **The sensor sees the traffic.** It must be placed where the traffic flows, keep up with the volume, and see the content, which encryption may hide.
2. **The detection logic knows what to look for.** Signatures need a known pattern; anomaly detection needs a stable picture of normal.
3. **An alert means something happened.** Most alerts record attempts, and many attempts fail.
4. **The cost of blocking is understood.** Prevention is only safe when a wrong block is cheaper than a missed attack.

## How it works

### Where sensors sit

| Sensor                          | Placement                                     | Sees                                         | Misses                                         |
| ------------------------------- | --------------------------------------------- | -------------------------------------------- | ---------------------------------------------- |
| Network IDS (passive)           | Copy of traffic from a network tap or SPAN port | Packets on that link, in both directions   | Encrypted payloads; traffic that avoids the link |
| Network IPS (inline)            | In the traffic path                           | The same, and it can drop or reset           | The same; adds latency and a point of failure  |
| Host-based IDS                  | Software on a server or endpoint              | Processes, files, logs, decrypted activity   | Other hosts; can be disabled by an intruder with admin rights |

The CS 161 textbook also counts log analysis as a detector type: reading the logs that servers already write is cheap and avoids many parsing problems, but it does not work in real time. A passive sensor cannot break traffic, but it can only alert. An inline sensor can block, but when it fails or overloads, the network either stops (fail-closed) or passes traffic uninspected (fail-open). Neither is free.

### Detection methods

[[signature-based-detection]] and [[anomaly-based-detection]] are two of the three detection methodologies NIST SP 800-94 describes; the third is stateful protocol analysis:

| Method                     | How it decides                                                             | Strength                                  | Typical failure                              |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Signature-based            | Compares observed events with patterns of known threats                    | Precise, explainable alerts               | Largely blind to new threats and variants    |
| Anomaly-based              | Compares observed events with a profile of normal activity                 | Can flag attacks no one has seen before   | Many false positives; a profile can absorb malicious activity during training |
| Stateful protocol analysis | Compares traffic with vendor profiles of accepted behavior for each protocol state | Catches protocol misuse and odd sequences | Resource-intensive; misses attacks that stay within accepted protocol behavior |

The CS 161 textbook adds two more styles: specification-based detection, where developers write down allowed behavior by hand, and behavioral detection, which looks for signs of compromise, such as a server program unexpectedly starting a shell, like the web shell rule in [OPS-02](lesson:OPS-02). In practice products mix several methods. Signatures dominate alerting because their alerts are explainable; anomaly scores more often feed triage and hunting. SP 800-94 also states the trade-off plainly: no sensor eliminates both [[false-positive|false positives]] and [[false-negative|false negatives]], reducing one usually increases the other, and many organizations accept more false positives to miss fewer attacks, which costs analysis time.

### Anatomy of a Suricata rule

Suricata, an open-source network IDS and IPS, uses rules with three parts: an **action**, a **header**, and **options**. Here is an original rule for the fictional shop.example, which received reports of path traversal probes against its `/download` endpoint:

```text
alert http $EXTERNAL_NET any -> $HOME_NET any (msg:"CyberLab example: path traversal probe on /download"; flow:established,to_server; http.uri; content:"/download"; content:"../"; classtype:web-application-attack; sid:1000001; rev:1;)
```

- **Action** `alert`: record an alert. Other actions include `pass`, `reject`, and `drop`, which can block traffic only when the sensor runs inline.
- **Header**: protocol `http`, source `$EXTERNAL_NET` and any port, direction `->`, and destination `$HOME_NET` and any port. Variables come from the sensor's configuration.
- **Options**, each `keyword:value;`: `msg` is the alert text; `flow:established,to_server` limits matching to client-to-server traffic in an established connection; `http.uri` points the following `content` matches at the normalized request URI; `sid` and `rev` identify the rule and its revision; `classtype` classifies the rule and its alerts.

The alert this rule produces says that a request with that URI was sent. It does not say the server was vulnerable or that the request succeeded. A network sensor must also interpret traffic the way the destination does. If the two disagree, for example about how a URL is decoded, the sensor can miss what the server acts on, which is one reason sensors normalize HTTP before matching and one more reason host evidence matters.

### What an alert proves

An IDS alert is evidence of an attempt, from a given address, at a given time, matching a given pattern. Whether it matters depends on context that the sensor usually lacks: Is the target running the vulnerable software? Did the server answer with data or an error? Did the host then do something unusual? The strongest cases combine a network alert (attempt) with host evidence (effect), such as the web server process behavior from the lesson on detection rules.

### Encryption

Most web traffic is encrypted with [[tls]], so a sensor on the wire sees addresses, ports, timing, and some handshake metadata, but not the request itself. Teams respond by inspecting traffic where it is decrypted anyway, such as at a load balancer or reverse proxy, and by relying more on host-based sensors and application logs.

## Worked example

shop.example has already patched the path traversal flaw in `/download`, but automated scanners keep probing it. Over one week, the team replays the endpoint's 14 million requests through the sensor and labels what the rule above matches:

- 140 matches are scanner probes. All failed, because the endpoint is patched.
- 70 matches come from a partner's misconfigured inventory client, which sends relative paths such as `../catalog/item.json` in harmless requests.
- Host logs show no file reads outside the web root, so no attempt succeeded.

The team prices three deployments, assuming 10 analyst minutes per alert.

| Option                                  | Alerts per week | Analyst time | Legitimate requests blocked | Attacks stopped |
| --------------------------------------- | --------------- | ------------ | --------------------------- | --------------- |
| A: network rule, alert only             | 210             | 35 hours     | 0                           | 0 (none needed) |
| B: network rule, `drop` in inline mode  | 210 (a drop also alerts) | Near zero if blocked probes close automatically | 70 partner requests | 140 (all would have failed) |
| C: host rule on file reads outside the web root | 0       | 0            | 0                           | Alerts only on success |

The rule's precision is 140/210, about 0.67, but even its true positives have almost no value here: they report failed probes against a patched endpoint. Option A spends 35 analyst hours a week confirming that. Option B saves that time but breaks a partner's integration 70 times a week to stop attacks that could not work. Option C costs almost nothing and fires only on the evidence that matters.

The team keeps the network rule at low severity, aggregated into one daily summary per source address, for context and hunting. It makes option C the paging alert. And it writes down when it would choose option B: if a similar flaw appeared in an unpatched endpoint, a temporary `drop` rule (often called **virtual patching**) would be worth the risk of blocking some legitimate requests until the patch shipped, provided the partner's client was fixed or exempted first.

## In practice

- **Tune to the environment.** Disable signatures for software you do not run; they add false positives and processing load without adding coverage.
- **Promote from alert to block.** Run a new rule in alert mode, measure its false positives on real traffic, and allow `drop` only for high-precision rules that protect something important.
- **Watch the sensor itself.** An overloaded sensor drops packets and goes partly blind. Monitor its packet-drop counters as you would monitor a log source going quiet.
- **Enrich alerts with asset context.** Knowing which hosts run which software and patch level turns "attempt seen" into "attempt against a vulnerable host," the difference between noise and an incident.
- **Combine network and host evidence.** Network sensors see attempts across many hosts at once; host sensors see effects. Use both.
- **Know the limits.** Signatures lag behind new attacks, anomaly baselines drift, encryption hides content, and anything that avoids the sensor's link is invisible to it.

## Common misconceptions

- **"An IDS alert means we were breached."** Most alerts record attempts, and many fail. Check whether the target was vulnerable and whether anything happened next.
- **"An IPS is an IDS with blocking, so turn blocking on everywhere."** Every false positive then becomes an outage for someone. Block only when the expected cost of a miss exceeds the expected cost of wrong blocks.
- **"Anomaly detection finds unknown attacks without signatures, so it is better."** It can find novel behavior, but unusual is not the same as malicious, and normal behavior keeps changing.
- **"Encryption makes network sensors useless."** They still see who talks to whom, when, and how much, and traffic can be inspected where it is decrypted.
- **"More signatures mean better coverage."** Irrelevant signatures add noise and load. Coverage comes from rules that match the systems and threats you actually have.

## Try it yourself

**Part 1: read the rule.** Assume `$HOME_NET` is `192.0.2.0/24`, where shop.example's servers live, and `$EXTERNAL_NET` is everything else. For the Suricata rule in this lesson, decide whether each fictional event would match, and explain why:

1. A request from 203.0.113.9 to shop.example: `GET /download?file=../../config.ini`
2. A request from 203.0.113.9: `GET /search?q=../../config.ini`
3. A response from shop.example back to 203.0.113.9 whose body contains `../`
4. A request from an internal host, 192.0.2.20, to an outside server: `GET /download?file=../x`

**Part 2: price the deployment.** A fictional campus network sees 50 million inbound connections a day. A new signature for an actively exploited flaw has an estimated false-positive rate of 1 in 10 million connections and catches 95% of exploitation attempts. Scanning produces about 400 attempts a day, and 12 campus servers still run the vulnerable version.

1. How many false positives a day should the team expect, and how many attempts would be missed?
2. If each alert costs 10 analyst minutes, what does alert-only mode cost per day?
3. In drop mode, what happens to a false positive? Who is affected, and how would you find out?
4. Recommend alert or drop for the next two weeks, and say what would change your mind once the servers are patched.

> [!ETHICS] Only test systems you own or have written permission to test.

## Key takeaways

- An IDS watches and alerts; an IPS sits in the path and can block, which turns every false positive into an outage.
- Signature-based detection is precise but blind to new variants; anomaly-based detection can find the new but misfires more; most systems mix methods.
- A network alert is evidence of an attempt. Pair it with asset context and host evidence before treating it as an incident.
- Price both errors: analyst time for false alarms, outages for wrong blocks, and harm for misses. Then choose alert or block per rule.
- Encryption, sensor overload, and placement limit what any sensor can see.

## Go deeper

- Axelsson's [base-rate paper](https://doi.org/10.1145/357830.357849) applies Bayes' theorem to intrusion detection. Use it to explain why anomaly detectors are usually deployed as triage aids rather than paging alerts.
- NIST SP 800-94 is dated (2007) in its product details but still clear on IDPS components, placement, and detection methods. Which of its assumptions about network visibility has encryption changed most?
- Open question: how should an organization decide, rule by rule, when automatic blocking is justified? Consider expected cost, reversibility of a wrong block, and who bears each error.
