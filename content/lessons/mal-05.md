---
topicId: MAL-05
title: Botnets and coordinated demand
summary: Learn why many weak, compromised devices add up to an attack that can overwhelm well-defended services, how researchers measured and defenders dismantle botnets such as Mirai, and how a service operator tells a coordinated flood from a legitimate surge like registration day.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain, with simple arithmetic, why many individually weak devices directed together can exceed the capacity of a well-provisioned service.
  - Describe how researchers measured the Mirai botnet from several vantage points, and why counting IP addresses misstates a botnet's size.
  - Compare sinkholing, coordinated takedowns, owner notification, and secure-by-default device design as ways to dismantle botnets, including what each leaves unsolved.
  - Distinguish a coordinated flood from a legitimate surge using client and behavior signals, and choose controls that keep real users served.
  - Predict, then measure in the lab, how per-source rate limiting and added capacity change the share of real users served during a flood.
prerequisites: [FND-01, MAL-01, MAL-04]
concepts: [botnet, network-telescope, honeypot, botnet-takedown, flash-crowd]
labs: [ddos]
keywords:
  - bot
  - zombie
  - bot herder
  - IoT botnet
  - Mirai
  - DDoS
  - distributed denial of service
  - DDoS-for-hire
  - booter
  - stresser
  - flash crowd
  - Slashdot effect
  - traffic surge
  - network telescope
  - darknet
  - honeypot
  - sinkhole
  - takedown
  - default password
  - virtual waiting room
  - Dyn
  - Krebs on Security
  - T1584.005
  - T1498
  - T1499
  - NIST IR 8259A
sources:
  - title: 'Understanding the Mirai Botnet (Antonakakis et al., USENIX Security 2017)'
    url: https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/antonakakis
    publisher: USENIX Association
  - title: 'MITRE ATT&CK: Compromise Infrastructure: Botnet (T1584.005)'
    url: https://attack.mitre.org/techniques/T1584/005/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'MITRE ATT&CK: Network Denial of Service (T1498)'
    url: https://attack.mitre.org/techniques/T1498/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'Understanding and Responding to Distributed Denial-of-Service Attacks (CISA, FBI, and MS-ISAC)'
    url: https://cisa.gov/resources-tools/resources/understanding-and-responding-distributed-denial-service-attacks
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'NIST IR 8259A: IoT Device Cybersecurity Capability Core Baseline'
    url: https://csrc.nist.gov/pubs/ir/8259/a/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259a
  - title: 'Computer Security (CS 161 textbook), Chapter 34: Denial-of-Service (DoS)'
    url: https://textbook.cs161.org/network/dos.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: Each camera in a botnet can upload at most 2 megabits per second. Why can 50,000 of them overwhelm a service behind a 10 gigabit per second link?
    choices:
      - The cameras amplify each request through open DNS servers.
      - Their traffic adds up to 50,000 × 2 Mbit/s = 100 Gbit/s, ten times what the link can carry.
      - Cameras have faster network connections than servers do.
      - The service cannot block traffic that comes from cameras.
    answer: 1
    explanation: Each bot is weak, and the numbers make the capability. When the combined flood is larger than the target's link, filtering on the target's own side of the link comes too late, which is why ATT&CK's guidance for Network Denial of Service points to filtering upstream, in the provider's network.
  - question: Over two months, a network telescope sees scanning with one botnet's fingerprint from 1.5 million distinct IP addresses. Why should a researcher not report 1.5 million infected devices?
    choices:
      - Telescopes record only traffic that honeypots forward to them.
      - The scanning comes from the command-and-control servers, not from the bots.
      - Devices get new addresses over time and some devices share one address, so address counts can overcount and undercount devices; counting active sources in short windows is more reliable.
      - Every source address in telescope data is forged.
    answer: 2
    explanation: The Mirai researchers warned that raw address counts are a poor measure of botnet size because of DHCP churn. One camera that gets several addresses in a month is counted several times. Address translation errs the other way, since many devices behind one address count once.
  - question: Registration opens at 07:00 and requests to register.campus.example rise tenfold. Which observation best supports calling a second jump at 07:04 a coordinated flood rather than more students?
    choices:
      - The request rate at 07:04 is higher than last semester's peak.
      - Many of the 07:04 requests come from addresses in the same state as the campus.
      - Requests began rising exactly when registration opened.
      - Most of the new requests come from clients never seen before, carry no valid session, and ask for the same expensive page, while completed registrations fall.
    answer: 3
    explanation: Volume alone cannot separate a flood from a flash crowd, because both can exceed capacity. Who the clients are (known or new, logged in or not) and what they do (follow the registration flow or hammer one page, finish transactions or not) can. Each signal has innocent explanations, so the case rests on several together.
  - question: In the lab, capping each source at 2 requests per tick raises real users' share from 15 to 78 percent. Why might the same idea do little for a registration portal attacked by a large botnet?
    choices:
      - Thousands of bots can each stay under a per-address limit while their total still swamps the service, and the limit can block students who share one campus address.
      - Rate limits can count only encrypted requests.
      - Real web servers cannot count requests per source.
      - Large botnets send all of their traffic from a single address.
    answer: 0
    explanation: The lab's six bots each send 30 times a real user's traffic, so a per-source cap hits them hard. Spread the same load across thousands of bots and each looks like a quiet user, while address translation puts many real users behind one address. Priority for logged-in users and filtering upstream do better.
  - question: Researchers sinkhole every command-and-control domain of a Mirai-style botnet, and providers notify the owners. Six months later a new botnet recruits many of the same cameras. What is the most likely reason, and the most lasting fix?
    choices:
      - The sinkhole gave the cameras' addresses to the new operator, so sinkholes should not be used.
      - The new botnet reused the old domains after the registrars let them expire, so domains should be held forever.
      - The cameras still accept default passwords or run unpatched software, so the lasting fix is unique credentials, automatic updates, and remote access off by default, plus owners updating or retiring old devices.
      - Cameras cannot be secured at all, so they should never be connected to a network.
    answer: 2
    explanation: Sinkholes and takedowns remove an operator's control, not the weakness that let the devices in. The Mirai paper's recommendations (hardening, automatic updates, device identification, end-of-life planning) and the NIST IR 8259A device capabilities target that weakness directly.
---

## Why it matters

On September 21, 2016, the security news site Krebs on Security was hit by what researchers later called "an unprecedented 623 Gbps DDoS attack," a [[ddos-attack|distributed denial-of-service]] flood. It came from Mirai, a [[botnet]] of mostly security cameras, digital video recorders (DVRs), and home routers, which peaked at about 600,000 infected devices. On October 21, Mirai attacks on Dyn, a [[dns|DNS]] provider for many large websites, disrupted access to sites such as GitHub, Netflix, Reddit, and Twitter.

None of this took advanced skill. The university and industry researchers who reconstructed Mirai's history concluded that its emergence was "primarily based on the absence of security best practices in the IoT space."

Operators face a second problem: at first glance, a botnet flood looks like the morning a college's course registration opens. Telling the two apart while keeping students served is the operator's half of this topic.

## The core idea

A [[botnet]] is a set of compromised devices, called bots, that one operator directs remotely through [[command-and-control]] (C2), the subject of [Command-and-control concepts](lesson:MAL-04). MITRE ATT&CK describes building one (T1584.005): "Adversaries may compromise numerous third-party systems to form a botnet that can be used during targeting." The bots belong to third parties, who are neither attacker nor target and rarely notice.

This lesson assumes that:

1. Each bot is weak, with little bandwidth or computing power.
2. Every service has finite capacity: bandwidth, connections, processor time.
3. Legitimate demand also spikes.
4. No single party (owner, provider, target, or researcher) sees the whole botnet.

The first two assumptions give the central arithmetic: total demand is the number of bots times what each sends. One camera uploading at 1 megabit per second (Mbit/s) is harmless, but 100,000 of them send 100 gigabits per second (Gbit/s), ten times a 10 Gbit/s campus link. The flood's target is [[availability]].

Picture a crowd at a doorway: each person is small and polite, yet together they block the door. A [[flash-crowd]] is the same crowd with good intentions, such as students arriving the minute registration opens. The difference lies in who is in the crowd and what they do, which an operator can measure.

## How it works

### How devices end up in a botnet

Three weaknesses explain most of Mirai's recruits:

- **Unchanged default passwords.** Many [[iot-device|IoT devices]] shipped with [[default-credentials]] shared by every unit and accepted remote logins from the internet. The original Mirai needed no software bug; the paper reports hosts "initially compromised via a simple dictionary attack" using a short, fixed list of default usernames and passwords.
- **Unpatched, exposed services.** In late November 2016, a variant added an exploit for a [[vulnerability]] in a remote-management service on some home routers. The paper links it to an outage at Deutsche Telekom and to the botnet's peak.
- **Nobody watching.** Many such devices lack screens, rarely get [[firmware]] updates, and keep working while infected. ATT&CK's examples even include a botnet of end-of-life small-office routers.

Mirai's bots also searched for new victims themselves, as a [[worm]] does, so the botnet reached about 65,000 infections in its first 20 hours. [IoT device identity and lifecycle](lesson:IOT-05) covers the device side.

### What a botnet is used for

The best-known use is a [[ddos-attack]], a denial of service from many machines at once. CISA, the FBI, and MS-ISAC group DDoS techniques as volumetric (fill the link), protocol (exhaust connection state, like a [[syn-flood]]), and application (exhaust the application). ATT&CK files bandwidth floods under Network Denial of Service (T1498) and server or application exhaustion under Endpoint Denial of Service (T1499). About a third of the 15,194 Mirai attacks the researchers recorded targeted the application layer, where requests can resemble real use.

The researchers judged that the Dyn attack was probably aimed at gaming infrastructure that used Dyn, so the wider outage was a side effect: an attack on someone else can take you down through a shared provider. ATT&CK also lists botnets used for password spraying and as relays that hide an intruder's origin, and notes that attackers can rent one from a "booter" or "stresser" (DDoS-for-hire) service.

### Measuring a botnet

No single vantage point shows a whole botnet, so the researchers combined several:

| Vantage point                                                                  | What it showed                                             | Blind spot                                     |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------- |
| [[network-telescope|Network telescope]] (4.7 million unused addresses, Merit Network) | Devices searching for victims, recognized by a fingerprint | Searching, not attacks; addresses, not devices |
| [[honeypot|Honeypots]] (decoy devices)                                         | Malware samples, which revealed C2 domains                 | Only what reaches the decoys                   |
| Internet-wide scans (Censys)                                                   | Device types and makers, from banners (text hosts display) | Most banners named no device                   |
| DNS records                                                                    | C2 domains, grouped into separate operations               | Infrastructure, not bots                       |
| Akamai's monitoring of known C2 servers                                        | 15,194 attacks on 5,046 victims                            | Only known C2 servers                          |
| Attack logs (Akamai, Google, Dyn)                                              | Addresses that sent attack traffic                         | Only attacks on sites they served              |

Most infected devices the researchers could identify were cameras, DVRs, and consumer routers from many vendors. On September 21, 2016, more than 40 percent of infections were in Brazil, Colombia, and Vietnam, far from the targets.

The researchers cautioned that "the raw count of IP addresses seen scanning over time is a poor metric of botnet size due to DHCP churn": devices get new addresses from their providers' [[dhcp|DHCP]] servers, so one camera can appear as many addresses in a month. They counted hosts active in short windows instead. [[network-address-translation|Address translation]] errs the other way, hiding many devices behind one address.

### Dismantling a botnet

This sinkhole-and-notify flow uses a fictional C2 domain:

```sequence
title: Sinkhole and notify, seen by the defenders
participant R as Researchers
participant G as Domain registrar
participant B as Infected camera
participant S as Sinkhole
participant I as Owner's ISP
participant O as Owner
R -> G: Evidence: c2.cam-update.test is C2
G --> R: Domain now points to the sinkhole
B -> S: Check-in (address and time logged)
note B: The operator's orders no longer arrive
S -> I: Infected addresses with timestamps
I -> O: Notice: your camera is infected
O -> B: New password, firmware update
note: Unfixed, the camera can be recruited again
```

The registrar points the C2 domain at a [[sinkhole]] that defenders run. Bots reach it instead of the operator, cutting control, and each check-in reveals an infected address and time for the provider to match to a subscriber. A [[botnet-takedown]] coordinates such actions across registrars, hosting providers, and law enforcement at once, so the operator cannot simply move.

Two limits remain. Mirai's author published its source code on September 30, 2016, and the researchers traced 33 independent C2 clusters, so stopping one operator could not stop Mirai. And removing control leaves the weakness: a camera that still accepts its factory password can join the next botnet. The paper therefore recommends notifying owners out of band, for example by email, and notes that this needs more than technology.

### Flood or flash crowd?

A server under load sees requests, not intentions. These signals help:

| Signal              | Flash crowd (registration day)                        | Coordinated flood                                   |
| ------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Timing              | Matches a known event, such as registration at 07:00  | Matches no event, or hits the worst moment          |
| Who the clients are | Mostly known users with accounts and earlier visits   | Mostly first-time addresses from networks worldwide |
| Authentication      | Most requests carry a valid session                   | Few or none do                                      |
| What they request   | The normal flow: log in, search, add a course, submit | One page or endpoint, often the most expensive      |
| Outcome             | Completions rise with traffic until capacity runs out | Traffic rises while completions fall                |

None is proof: students run auto-refresh scripts, news stories bring newcomers, and attackers can drive real browsers on compromised computers. Combine signals, compare with past registration days, and expect some [[false-positive|false positives]].

## Worked example

`register.campus.example` serves a fictional college. Registration for 10,000 students opens at 07:00; students were told to log in beforehand. The servers handle 600 requests per second, and 1,500 on-campus students share four addresses (`198.51.100.10` to `198.51.100.13`) through address translation.

The portal's [[telemetry]] gives per-minute summaries ("clients" are distinct source addresses, "new" means unseen for 30 days, "session" means a valid login session):

```text
time   req/s  clients  new  session  top path         enrolled/min
06:58     40    1,700   3%      91%  /login      22%             0
07:00    430    8,300   4%      89%  /cart/add   31%           620
07:02    450    8,500   4%      89%  /cart/add   30%           640
07:04  2,850   20,500  60%      14%  /search     86%           135
07:06  2,850   20,600  60%      14%  /search     86%           135
```

**Step 1: the 07:00 rise.** It matches the announced opening, clients are known (4 percent new), most requests carry sessions, the top path is the course cart, and enrollments climb: a flash crowd the service can handle.

**Step 2: the 07:04 jump.** Nothing was announced. About 12,000 new addresses appear, sessions fall to 14 percent of requests, one expensive page takes 86 percent, and enrollments fall while requests rise more than sixfold. Together these indicate a flood of about 2,400 requests per second.

**Step 3: estimate the damage.** When demand exceeds capacity and the server shares it in proportion to demand, as the lab's model does:

```text
share served = capacity / (legitimate + flood) = 600 / (450 + 2,400) ≈ 21%
```

Enrollments falling to about a fifth agree.

**Step 4: test a per-address limit.** The flood's 12,000 addresses send 0.2 requests per second each, so a limit of 1 per second per address never touches a bot. It hits students instead: at 0.045 requests per second each (450 across 10,000), on-campus students send about 17 per second through each shared address, and the limit would refuse about 94 percent of their requests.

**Step 5: prioritize known users.** The CS 161 textbook's defenses against application-level denial of service include identifying users, isolating them, and giving each a quota. So the operator reserves 520 requests per second for valid sessions and 80 for everything else, including the login page. All 400 session requests per second get through; the other pool's 50 legitimate and 2,400 flood requests share 80 slots, so only about 3 percent do. Real users' share rises from 21 to about 89 percent, but students who skipped logging in early stay locked out.

**Step 6: follow up.** The operator has its DDoS mitigation provider filter the flood upstream, preserves the logs, and reports the addresses with timestamps to the source networks' abuse contacts so owners can be notified.

## Defenses

**Device makers.** The Mirai paper's recommendations start with the device: [[secure-by-design|secure-by-default]] hardening (network services closed unless needed), automatic updates, a way to identify a device's model and firmware version, and a plan for end-of-life devices. NIST IR 8259A lists baseline capabilities that buyers can ask for: device identification, device configuration, data protection, logical access to interfaces, software update, and cybersecurity state awareness. Unique credentials and signed [[ota-update|over-the-air updates]] close the doors Mirai used. Limit: millions of older devices remain.

**Owners and campus IT.** Change default passwords, update, keep administration interfaces off the internet, retire unsupported devices, and use [[egress-filtering]] so cameras reach their recorder but not the whole internet. Limit: owners often do not know what they own.

**Providers and researchers.** Building a botnet happens outside any target's network, where ATT&CK says it "cannot be easily mitigated with preventive controls." Providers can notify and quarantine subscribers seen in sinkhole and telescope data, and researchers supply that data and coordinate takedowns. Limit: notices help only if owners act.

**Service operators** cannot fix the bots, so they plan for the flood:

| Control                                                     | What it does                              | Limits                                                                       |
| ----------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Upstream filtering (provider or DDoS mitigation service)    | Removes flood traffic before your link    | Arrange it in advance; ATT&CK says floods bigger than your link usually need it |
| Priority for known users                                    | Reserves capacity for logged-in users     | Login and public pages stay exposed; stolen accounts get through             |
| [[rate-limiting|Rate limits]] per account or session        | Caps each client's share                  | Per-address limits miss quiet bots and punish shared addresses               |
| Virtual waiting room                                        | Admits visitors at a sustainable rate     | Bots can wait in line too                                                    |
| Spare capacity and caching                                  | Absorbs surges and small floods           | Costs money; attackers can add bots                                          |
| [[captcha|CAPTCHA]] for suspicious clients                  | Adds a cost for automated clients         | Excludes some disabled users; software or paid humans can solve some         |

ATT&CK also advises a [[business-continuity]] plan, since outside help takes time. The CS 161 textbook warns that no defense can completely eliminate DDoS; the goal is to keep real users served and recover quickly.

## Common misconceptions

- **"A botnet needs powerful computers."** Mirai was mostly cameras, DVRs, and routers. Numbers made it dangerous.
- **"A traffic spike means an attack."** Registration day causes flash crowds. Check who the clients are and what they do.
- **"Rate limiting stops DDoS."** Per-source limits work only when each source is far louder than a real user, as in the lab.
- **"Taking down the C2 servers ends the botnet."** It ends one operator's control; the devices stay vulnerable, and Mirai's published code spawned many operators.
- **"My camera isn't worth hacking."** Its bandwidth and address are the prize, and the harm lands on others.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test. The lab is a bounded simulation that sends no network traffic. Never flood or stress-test a real service, including your own college's portal, without written permission.

[The lab](lab:ddos) models a fictional service that serves 30 requests per tick and queues up to 90. Twenty-four real users send 24 to 29 requests per tick in total (26.5 on average); from tick 16 to tick 39 of 48, six bots each add 30. The **Simulate** tab has a defense switch (**None**, **Rate limit**, **Scale up**), a **Run simulation** button, four results (**Users served (attack)**, **Legit requests dropped**, **Bot requests served**, **Peak queue**), and a chart of real users served per tick, with the flood shaded.

1. **Watch it fall over.** Run with None. Real users' share falls from 100 to about 15 percent during the flood and recovers as the queue drains. The results show 15 percent served, 535 legitimate requests dropped, and 675 bot requests served, which solves the "Watch it fall over" challenge.
2. **Predict, then test.** Apply the worked example's formula. Rate limit caps each bot at 2 per tick: 30 / (26.5 + 12) ≈ 78 percent. Scale up triples capacity: 90 / (26.5 + 180) ≈ 44 percent. Run both and compare with the lab's 78 and 43 percent.
3. **Compare costs.** On the **Compare** tab, scaling served 1,884 bot requests and rate limiting 241: scaling pays for the flood; rate limiting removes it.
4. **Answer** the "Which pillar" and "Name the D" challenges, and read the evidence log your runs produced.
5. **Break the model.** The cap works because each bot sends 30 times a user's traffic. What would a cap of 2 do if 180 bots sent one request each, and which signal from the flood-or-flash-crowd table would you use instead?

**Without the lab.** Put the same model in a spreadsheet, one row per case:

```text
flood demand = bots × MIN(requests per bot, cap)
share served = MIN(1, capacity / (legitimate demand + flood demand))
```

Reproduce the lab's three cases (about 15, 78, and 44 percent), add 180 bots at 1 request each and the worked example, and find the per-bot rate below which a cap of 2 stops helping.

## Key takeaways

- A botnet turns many weak devices into one large capability: total demand is bots times what each sends.
- Mirai grew through default passwords and, later, unpatched exposed services. Secure-by-default devices are the lasting fix.
- Measuring a botnet takes several vantage points; address counts mislead because addresses change and are shared.
- Sinkholes and takedowns remove control, not the weakness, so dismantling botnets is shared work.
- Floods and flash crowds both exceed capacity. Tell them apart by who the clients are and what they do, and layer controls to protect real users.

## Go deeper

- **Recommendations versus capabilities.** Map the six recommendations in Section 7 of the Mirai paper onto the six capabilities in NIST IR 8259A. Which can a device meet alone?
- **Measurement without scanning.** How would you size a botnet whose bots never scan? Which of the paper's vantage points still work?
- **Who pays?** Infected-camera owners lose little while targets lose a lot, and ATT&CK places botnet building outside any target's defenses. What policy would change the incentives?
