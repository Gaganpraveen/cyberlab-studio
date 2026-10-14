---
topicId: FND-06
title: Security architecture and defense in depth
summary: Learn how security architecture arranges layers of controls, why stacked layers protect less than simple multiplication suggests when they share causes of failure, and how zero trust and containment reduce that sharing.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Describe a system's security architecture as layers of controls placed at trust boundaries.
  - Explain why the chance that every layer fails is a simple product only when the layers fail independently.
  - Identify common-mode failures that let one cause defeat several layers at once.
  - Redesign a set of layers to reduce shared dependencies, and estimate the improvement honestly.
  - Explain how zero trust changes where access decisions are made.
prerequisites: [FND-03, FND-04, FND-05]
concepts:
  - defense-in-depth
  - common-mode-failure
  - zero-trust
  - security-control
keywords:
  - security architecture
  - defense in depth
  - layered security
  - common-mode failure
  - common-cause failure
  - correlated failure
  - single point of failure
  - zero trust
  - zero trust architecture
  - ZTA
  - NIST SP 800-207
  - policy decision point
  - policy enforcement point
  - segmentation
  - blast radius
  - MITRE D3FEND
sources:
  - title: 'NIST SP 800-207: Zero Trust Architecture'
    url: https://csrc.nist.gov/pubs/sp/800/207/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-207
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Data Protection: Actions Taken by Equifax and Federal Agencies in Response to the 2017 Breach (GAO-18-559)'
    url: https://www.gao.gov/products/gao-18-559
    publisher: U.S. Government Accountability Office
quiz:
  - question: Three layers each stop 90 percent of attacks of a certain kind. When is it correct to say all three together let through only 0.1 percent?
    choices:
      - Always, because probabilities of independent events multiply.
      - Only if the layers fail independently, so that one layer failing tells you nothing about whether the others fail.
      - Only if the layers come from the same vendor.
      - Never, because layers cannot be measured.
    answer: 1
    explanation: Multiplying the miss rates (0.1 × 0.1 × 0.1) assumes independence. Real layers often share credentials, administrators, code, or blind spots, so one cause can defeat several at once, and the true chance that all fail can be far higher.
  - question: The VPN, the single sign-on service, and the admin application all accept the same stolen session. What kind of failure is this?
    choices:
      - A false positive.
      - A denial of service.
      - A common-mode failure, because one cause defeats several layers at once.
      - A failure of least common mechanism in the database.
    answer: 2
    explanation: The three layers look separate but rest on one shared dependency, the session. An attacker who steals it passes all three. Giving one layer an independent check, such as a device certificate, breaks the shared cause.
  - question: Equifax had a tool for inspecting network traffic, but its certificate had expired months earlier, so encrypted traffic passed uninspected. Which architectural lesson fits best?
    choices:
      - Detection layers can fail silently, so a system should alert when a control stops working, not only when it sees an attack.
      - Network inspection is never useful.
      - Certificates should never expire.
      - The breach would have been prevented by adding a second identical inspection tool.
    answer: 0
    explanation: A layer that reports nothing may be broken rather than quiet. Monitoring the health of each control is part of the architecture. A second identical tool with the same certificate practice could share the same failure.
  - question: In a zero trust architecture, what replaces the assumption that requests from inside the corporate network are trustworthy?
    choices:
      - A stronger perimeter firewall.
      - A rule that only employees may use the network.
      - Encrypting the internal network so outsiders cannot read it.
      - A policy decision for each access to each resource, based on identity, device, and other context, enforced in front of the resource.
    answer: 3
    explanation: Zero trust grants no implicit trust because of network location. A policy decision point evaluates each access request, and a policy enforcement point in front of the resource carries out the decision.
---

## Why it matters

Defense in depth is often explained with multiplication. If a firewall, a login check, and a monitoring tool each stop 90 percent of attacks, the argument goes, an attacker gets past all three only one time in a thousand. That arithmetic is correct only if the three fail for unrelated reasons. In real systems they rarely do. They are configured by the same people, signed into with the same accounts, built on the same libraries, and blind to the same things.

The 2017 Equifax breach shows how a layer can fail without anyone noticing. Equifax had a tool for inspecting network traffic, but a certificate it relied on had expired about ten months before the breach. A misconfiguration let encrypted traffic pass without being inspected, so the attackers ran commands and removed data over encrypted connections without detection ([GAO-18-559](https://www.gao.gov/products/gao-18-559)). On paper, the inspection layer existed. In practice, it was off.

Security architecture is the discipline of arranging controls so that one failure stays small. That requires asking a harder question than "how many layers do we have?": "what single event could defeat several of them at once?"

## The core idea

A system's security architecture is the arrangement of its components, its [[trust-boundary|trust boundaries]], and the [[security-control|controls]] placed at them, together with the reasoning about how those controls work together. [[defense-in-depth|Defense in depth]] stacks several controls so an attacker must defeat all of them. CS 161 puts it simply: "Layering multiple simple defensive strategies together can make security stronger," while warning about diminishing returns ([CS 161, Chapter 1](https://textbook.cs161.org/principles/principles.html)).

The catch is the word "independent." A [[common-mode-failure]] is a single cause that defeats several layers at once. Three locks keyed alike are one lock. Three layers that all trust the same administrator account are, against someone who steals that account, one layer.

Two assumptions guide the analysis:

1. **Every layer fails sometimes.** Software has bugs, configurations drift, people make mistakes, and certificates expire.
2. **Attackers adapt.** An attacker who has passed one layer has learned something and gained a foothold, so the next layer's failure is conditional on the first. Independence has to be argued for each pair of layers, never assumed.

## How it works

### Layers and their jobs

Layers sit at different places and do different jobs. A healthy architecture has controls that prevent, detect, and contain.

| Layer             | Example controls                               | Typical job        |
| ----------------- | ---------------------------------------------- | ------------------ |
| Identity          | Single sign-on, multi-factor authentication    | Prevent            |
| Network           | Segmentation, filtering, private networks      | Prevent, contain   |
| Host and device   | Patching, device certificates, endpoint tools  | Prevent, detect    |
| Application       | Authorization checks, input validation         | Prevent            |
| Data              | Encryption at rest, backups, least-privilege accounts | Contain, recover |
| Monitoring        | Logs, alerts, health checks on the controls    | Detect             |
| People and process | Reviews, two-person approval, incident response | Prevent, respond |

### When multiplication works, and when it does not

Suppose the probability that each of four layers misses an attack is 0.1. If they fail independently, the chance all four miss is 0.1 × 0.1 × 0.1 × 0.1 = 0.0001, or one in ten thousand. Now add one shared cause, for example a single administrator account that can switch off every layer, which an attacker obtains 2 percent of the time. The numbers below are illustrative assumptions, not measurements:

```python
# Illustrative numbers only: each layer misses a given attack 10% of the time.
p_miss = [0.10, 0.10, 0.10, 0.10]

independent = 1.0
for p in p_miss:
    independent *= p
print(f"all four miss, if independent: {independent:.6f}")  # 0.000100

# A shared cause defeats all four at once with probability p_common.
p_common = 0.02
correlated = p_common + (1 - p_common) * independent
print(f"all four miss, with a 2% shared cause: {correlated:.6f}")  # 0.020098
```

The shared cause makes total failure about 200 times more likely than the independent estimate, and it dominates the result: the four layers together are now barely better than the one shared account. Improving the strongest layer would barely help. Removing the shared cause would.

### Where shared causes hide

- **Shared identity.** The VPN, the cloud console, and the application all accept the same sign-on session.
- **Shared administrators.** One account or team can change every layer, including the monitoring that would notice the change.
- **Shared code.** A filter and the application behind it parse input with the same library, so a parser flaw slips through both.
- **Shared blind spots.** Every layer inspects traffic it can read, and the attack arrives encrypted, as at Equifax.
- **Shared processes.** The same template, made by the same person, configures every firewall, so one mistake is copied everywhere.
- **Shared dependencies.** Every layer relies on the same directory, time source, or name service.

### Detection layers combine differently

Detectors trade missed attacks against false alarms. If either of two detectors can raise an alarm, fewer attacks are missed, but false alarms add up. If both must agree, false alarms drop, but more attacks slip through. CS 161 works through exactly this trade-off. When choosing how to combine detectors, decide which kind of error costs more.

### Zero trust: deciding at every request

Traditional networks trusted whatever was inside the perimeter, which made the perimeter a single point of failure. [[zero-trust|Zero trust]] drops that assumption. NIST's definition holds that "there is no implicit trust granted to assets or user accounts" based solely on their physical or network location ([NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final)). In a typical design, a policy enforcement point in front of each resource asks a policy decision point whether to allow each access, based on identity, device, and other context.

```sequence
title: One request under zero trust
participant U as alice's laptop
participant E as Enforcement point
participant D as Decision point
participant R as admin.shop.example
U -> E: GET /refunds (session, device certificate)
E -> D: May alice, on this device, read /refunds?
note D: Check identity, device health, role, time
D --> E: Allow, for this session only
E -> R: Forward the request
R --> E: 200 OK
E --> U: Refund list
U -x E: Same session from an unknown device: denied
```

In the diagram, alice's request reaches the enforcement point, which asks the decision point whether this user, on this device, may have this access now. The answer applies to this session on this device, so when the same session token shows up from an unknown device, the enforcement point asks again and the answer is no. Location on the network never enters the decision.

### Containment

Some layers exist to limit damage after others fail. Segmentation keeps a foothold in one system from reaching the rest. Equifax's databases were not segmented from each other, so attackers who entered through one system reached additional databases of personal information. Least-privilege accounts, encrypted secrets, and tested backups play the same role: they make the second step expensive.

## Worked example

The fictional retailer shop.example protects its admin panel at admin.shop.example with four layers, and the security team wants to know how much protection they really add.

**Step 1: list the layers and what each depends on.**

| Layer                      | Works only if                                   | Shares a cause with      |
| -------------------------- | ----------------------------------------------- | ------------------------ |
| L1: VPN                    | Single sign-on succeeds for a real staff member | L2 (same sign-on)        |
| L2: Sign-on with push MFA  | The password and the push approval are genuine  | L1                       |
| L3: Admin role check       | Sign-on issues the correct role claim           | L1, L2 (same identity system) |
| L4: Alert on large refunds | The rule is on and logs keep arriving           | Anyone who can edit alert rules |

**Step 2: find the common causes.** Two stand out. First, a stolen sign-on session passes L1, L2, and L3 at once. Second, one account, `it-admin`, can change VPN rules, sign-on policy, role assignments, and alert rules, so whoever controls it can disable all four layers, including the alert that would report the change.

**Step 3: estimate honestly.** If the team naively assumed four independent layers that each miss 10 percent of attacks, they would claim a one-in-ten-thousand failure rate. With shared causes like these, the calculation above shows the real figure is dominated by how often the shared causes occur. The team cannot measure that probability precisely, so they write it as an assumption and focus on removing the causes.

**Step 4: break the shared causes.**

- L1 now also requires a device certificate issued only to company laptops, a check that a stolen session cannot pass.
- L2 moves to phishing-resistant sign-in with a [[passkey]] or hardware key, which a fake login page cannot capture.
- Role changes for L3 need approval from a second person, applying [[separation-of-duties]].
- L4 moves to a separate monitoring account owned by a different team, logs go to storage that cannot be edited, and an alert fires if logs stop arriving.
- `it-admin` is split into separate roles per layer, and an emergency account with a hardware key is kept offline.

**Step 5: re-examine.** No single stolen session or account now defeats more than one layer. The layers still are not perfectly independent, since they share the same building, vendors, and staff, but the largest shared causes are gone. The team records the remaining assumptions instead of claiming a precise number.

## In practice

**Draw dependencies, not just layers.** For each control, list what must be true for it to work: which accounts, services, keys, and people it relies on. Shared entries are candidates for common-mode failure.

**Prefer different kinds of layers.** A device check, a passkey, and an authorization rule fail for different reasons. Two firewalls with the same rules fail together. Diversity adds complexity, though, which pulls against [[economy-of-mechanism]].

**Monitor the monitors.** Alert when a control stops reporting, when a certificate nears expiry, or when a security setting changes. Silence is not evidence of safety.

**Design for containment.** Assume some layer will fail and limit what follows: segment networks, give each service [[least-privilege]] access, and keep backups out of reach of the systems they protect.

**Test layers separately and together.** A layer that is never tested on its own is an assumption, not a control. Exercises that simulate a stolen session or a disabled layer show whether the others still hold, but run them only on systems you are authorized to test.

**Use catalogs as checklists.** Frameworks of defensive techniques, such as MITRE D3FEND, help you see whether you have only prevention or also detection, isolation, and recovery.

## Common misconceptions

- **"More layers always mean more security."** Each layer adds code, configuration, and sometimes privileged access. A layer that shares a failure cause with the others adds little.
- **"Three 90 percent layers give 99.9 percent."** Only if they fail independently, which must be argued, not assumed.
- **"Inside the network is safe."** A perimeter is one layer. Once it is crossed, a flat network gives the attacker everything.
- **"No alerts means no attacks."** A detection layer can be broken, as Equifax's expired certificate shows.
- **"Defense in depth means buying more products."** It is about placement, diversity, and independence of controls, including people and processes.

## Try it yourself

On paper, analyze the fictional grade database behind portal.college.example. It is protected by four layers: (1) the database accepts connections only from the portal's private network; (2) the portal requires campus sign-on with MFA; (3) the portal checks that the user is the instructor of record before a grade change; (4) a nightly job compares grades with the registrar's records and reports differences.

1. For each layer, write what it depends on: accounts, services, keys, people, and data sources.
2. Find every shared dependency. Which single event would defeat two or more layers?
3. Pick an illustrative miss rate for each layer and a probability for your worst shared cause. Compute the naive and the correlated chance that every layer fails, by hand or with the Python snippet above on your own computer.
4. Propose the one change that removes the most important shared cause, and explain why it helps more than strengthening any single layer.
5. Write two sentences, for a non-technical reader, explaining why the layers are worth less together than their individual numbers suggest.

## Key takeaways

- Security architecture places controls at trust boundaries so that prevention, detection, and containment back each other up.
- Multiplying layer failure rates is valid only for independent layers; shared causes can dominate the result.
- Look for shared identities, administrators, code, blind spots, processes, and dependencies.
- Zero trust removes network location as a reason for trust and decides each access at an enforcement point.
- Monitor the health of controls, design for containment, and state your independence assumptions.

## Go deeper

- [NIST SP 800-207](https://csrc.nist.gov/pubs/sp/800/207/final), *Zero Trust Architecture* (August 2020), defines zero trust and zero trust architecture. Compare its assumptions with the layers in this lesson's worked example.
- [GAO-18-559](https://www.gao.gov/products/gao-18-559) can be read as an architecture case study: map each failed factor to a layer and ask which layers shared causes. Open question: how can an organization estimate how correlated its controls are, using data from tests and incidents rather than intuition?
