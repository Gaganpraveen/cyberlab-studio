---
topicId: FND-02
title: Assets, threats, vulnerabilities, and risk
summary: Learn to pull a security scenario apart into the asset at stake, the weakness, the threat event, the impact, and what you do not know, and to combine them into a risk judgment you can defend.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Separate a scenario into its asset, vulnerability, threat source, threat event, impact, and uncertainty.
  - Explain how likelihood and impact combine into risk, and why a severity score alone is not a risk rating.
  - Write a precise risk statement that names its evidence and its assumptions.
  - Compare security controls by how they change likelihood, impact, and residual risk.
prerequisites: [FND-01]
concepts:
  - asset
  - threat
  - vulnerability
  - threat-actor
  - exploit
  - likelihood
  - impact
  - risk
  - residual-risk
  - security-control
keywords:
  - risk assessment
  - risk analysis
  - NIST SP 800-30
  - threat source
  - threat event
  - predisposing condition
  - risk matrix
  - risk statement
  - CVSS
  - CVSS v4.0
  - EPSS
  - KEV
  - known exploited vulnerabilities
  - BOD 22-01
  - Equifax breach
  - GAO-18-559
sources:
  - title: 'NIST SP 800-30 Rev. 1: Guide for Conducting Risk Assessments'
    url: https://csrc.nist.gov/pubs/sp/800/30/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-30
  - title: 'Data Protection: Actions Taken by Equifax and Federal Agencies in Response to the 2017 Breach (GAO-18-559)'
    url: https://www.gao.gov/products/gao-18-559
    publisher: U.S. Government Accountability Office
  - title: 'Common Vulnerability Scoring System v4.0: Specification Document'
    url: https://www.first.org/cvss/v4.0/specification-document
    publisher: FIRST (Forum of Incident Response and Security Teams)
  - title: 'Using EPSS (Exploit Prediction Scoring System)'
    url: https://www.first.org/epss/using-epss.html
    publisher: FIRST (Forum of Incident Response and Security Teams)
  - title: 'Known Exploited Vulnerabilities'
    url: https://www.cisa.gov/known-exploited-vulnerabilities
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: 'Computer Security (UC Berkeley CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: 'A clinic stores patient records on a server whose administrator password is "admin". Criminal groups are known to scan for such servers and sell stolen records. In this scenario, what is the vulnerability?'
    choices:
      - The patient records.
      - The criminal groups that scan for servers.
      - The default administrator password.
      - The sale of stolen records.
    answer: 2
    explanation: The vulnerability is the weakness a threat source could exploit, here the guessable password. The records are the asset, the criminal groups are the threat source, and the sale of records is part of the impact.
  - question: Which vulnerability should a team fix first?
    choices:
      - CVSS 9.8 on an isolated test server that holds no real data and is unreachable from any network.
      - CVSS 6.5 on the internet-facing payment page, with reliable reports of active exploitation.
      - Whichever has the higher CVSS score, since CVSS measures risk.
      - Neither, until both have been exploited at least once.
    answer: 1
    explanation: Risk depends on likelihood and impact in your environment. The payment page is reachable, is being attacked, and guards valuable data. CVSS Base scores describe a flaw's intrinsic severity; the CVSS specification itself places factors such as customers affected and monetary loss outside its scope.
  - question: In the Equifax breach, GAO reports that the databases were not segmented from each other. In risk terms, what did that mainly change?
    choices:
      - The impact, because one foothold let the attackers reach many more databases.
      - The likelihood that attackers would discover the web framework flaw.
      - Nothing, since the initial flaw was the only real problem.
      - The CVSS Base score of the web framework flaw.
    answer: 0
    explanation: The missing segmentation acted as a predisposing condition (some analysts would call it an architectural weakness). It did not make the first break-in more likely, but it increased how much harm followed once attackers were inside. Controls that limit impact matter even when prevention fails.
  - question: A team rates likelihood and impact from 1 to 5 and multiplies them. Why can the product mislead?
    choices:
      - Multiplication is too slow for large risk registers.
      - The ratings are rankings, not measurements, so the gaps between levels are not equal and equal products can hide very different risks.
      - Likelihood should be added to impact, never multiplied.
      - The product cannot exceed 25, which is too small a range.
    answer: 1
    explanation: Ordinal labels only say that one level is above another. A 5 for impact may be a hundred times worse than a 4, or barely worse. FIRST's EPSS guidance makes the same point when it warns against multiplying a probability by an ordinal score such as CVSS.
  - question: After patching the flaw, a manager reports that the portal's risk is now zero. What is the best response?
    choices:
      - Agree, because the vulnerability no longer exists.
      - Agree, but only if the patch was applied within 24 hours.
      - Disagree, because patches always introduce new vulnerabilities.
      - Disagree, because residual risk remains, for example from earlier compromise, other flaws, and other paths to the data.
    answer: 3
    explanation: Controls lower risk; they do not remove it. The team still does not know whether attackers got in before the patch, and other weaknesses and threat events remain. What is left is residual risk, which someone with authority must accept or reduce further.
---

## Why it matters

In March 2017, the U.S. government's computer emergency readiness team (US-CERT) publicly warned about a flaw in the Apache Struts web framework that let an attacker run commands on affected systems. Two days later, someone scanned Equifax's systems and got into its online dispute portal, which ran on Struts. In mid-May, attackers began pulling data out. They worked for about 76 days before Equifax noticed, and the breach exposed personal information about at least 145.5 million people ([GAO-18-559](https://www.gao.gov/products/gao-18-559)).

It is tempting to say the risk was "the Struts bug." The Government Accountability Office's account is more useful. It lists four factors: the vulnerable software was not identified on the portal during patching, an expired certificate kept a monitoring tool from inspecting encrypted traffic, the databases were not segmented from each other, and the attackers found credentials stored unencrypted that let them query more databases. Only one of those is the original flaw. The rest decided how far the attackers got and how long they stayed.

Security teams face thousands of published flaws and cannot fix everything at once. Deciding what to fix first means separating what is valuable, what is weak, what could happen, how bad it would be, and what you still do not know. This lesson gives you the vocabulary and a method to do that.

## The core idea

[[risk|Risk]] is not a thing you find in a system. It is a judgment about a possible event: what could happen, to what, how likely it is, and how much it would hurt. NIST describes risk as a function of the likelihood of a threat event and the adverse impact if it occurs ([NIST SP 800-30 Rev. 1](https://csrc.nist.gov/pubs/sp/800/30/r1/final)). To make that judgment, separate the parts:

| Term                 | Meaning                                                                       | In the Equifax case                              |
| -------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------ |
| [[asset]]            | Something of value that must be protected                                     | Personal data of millions of consumers           |
| [[threat]]           | Any circumstance or event that could cause harm                               | Data theft through a public-facing portal        |
| Threat source        | Who or what causes the event; for attacks, a [[threat-actor]]                 | Attackers scanning for the newly announced flaw  |
| Threat event         | The specific thing that happens                                               | Exploiting the flaw, then querying databases     |
| [[vulnerability]]    | A weakness a threat source could exploit                                      | Unpatched Struts on the dispute portal           |
| Predisposing condition | A condition that makes harm more or less likely or severe                   | Unsegmented databases, unencrypted credentials   |
| [[impact]]           | The magnitude of harm if the event occurs                                     | Exposure of at least 145.5 million people's data |
| [[likelihood]]       | How probable the event and its harm are over a stated period                  | High once the flaw was public and the portal reachable |

An [[exploit]] is the technique that turns a vulnerability into an effect. A vulnerability with no threat that can reach it, guarding nothing of value, is a low risk. A modest weakness in front of a valuable, exposed asset can be a high one.

Think of a house. The jewelry is the asset, an unlatched window is the vulnerability, a burglar working the neighborhood is the threat source, and climbing through the window is the threat event. A locked safe for the jewelry does not fix the window, but it limits the impact. And you never know exactly how many burglars are out there, which is the uncertainty.

Two assumptions keep this honest. A risk is always relative to a time period ("in the next year") and to a stakeholder, since the same breach costs a company money and costs its customers their privacy. And threats are not only attackers: NIST's list of threat sources also includes human errors, structural failures of equipment and software, and natural and man-made disasters.

## How it works

### From threat to harm

SP 800-30's model reads as a chain. A threat source initiates a threat event. The event exploits a vulnerability, in the presence of predisposing conditions and whatever controls are in place. If it succeeds, it causes an adverse impact. Risk combines the likelihood of that chain with the size of the impact.

```text
threat source ──initiates──▶ threat event ──exploits──▶ vulnerability
                                                          │  shaped by predisposing
                                                          │  conditions and controls
                                                          ▼
                                                   adverse impact
risk = f(likelihood of the chain, magnitude of the impact)
```

### Estimating likelihood

SP 800-30 splits likelihood into two parts: how likely the event is to be initiated (or to occur, for non-adversarial threats), and how likely it is to cause harm once it does. For adversaries, it bases the first part on their intent, capability, and targeting. Evidence helps:

- **Exploitation in the wild.** CISA's Known Exploited Vulnerabilities (KEV) catalog lists flaws with reliable evidence of active exploitation and a clear remediation, and CISA recommends using it to prioritize fixes ([CISA](https://www.cisa.gov/known-exploited-vulnerabilities)).
- **Predicted exploitation.** The Exploit Prediction Scoring System (EPSS) estimates the probability that exploitation activity against a published flaw will be observed in the next 30 days. FIRST describes it as "not a 'severity' score and not a complete risk score," only the likelihood side, and advises treating any flaw already in KEV as actively exploited whatever its EPSS score ([FIRST](https://www.first.org/epss/using-epss.html)).
- **Exposure.** Whether a threat source can reach the weakness at all, the subject of [attack surfaces and exposure](lesson:FND-04).

### Estimating impact

Impact is the harm to operations, assets, and individuals, rated with the LOW, MODERATE, and HIGH levels from [FND-01](lesson:FND-01). It depends on the asset and on predisposing conditions. Equifax's unsegmented databases did not make the first break-in more likely, but they made its impact far larger.

### Severity is not risk

The Common Vulnerability Scoring System (CVSS) rates a flaw from 0.0 to 10.0. Its specification says the Base score "reflects the severity of a vulnerability according to its intrinsic characteristics," and that factors such as regulatory requirements, the number of customers affected, and monetary losses "are outside the scope of CVSS" ([CVSS v4.0](https://www.first.org/cvss/v4.0/specification-document)). It recommends enriching Base scores with Threat and Environmental metrics. A CVSS 9.8 is a statement about the flaw, not about your risk.

### Combining likelihood and impact

Many teams use qualitative levels. SP 800-30 uses five, from very low to very high, plus semi-quantitative ranges such as 0 to 100. A simple illustrative matrix:

| Likelihood ↓ / Impact → | Low      | Moderate | High      |
| ----------------------- | -------- | -------- | --------- |
| High                    | Moderate | High     | Very high |
| Moderate                | Low      | Moderate | High      |
| Low                     | Very low | Low      | Moderate  |

Matrices are a communication tool, not a calculation. Their labels are rankings, so arithmetic on them misleads. FIRST warns: "Do not multiply an EPSS score by an ordinal (such as CVSS)."

### Uncertainty

SP 800-30 states that uncertainty "is inherent in the evaluation of risk," because of limited knowledge of future threats, undiscovered vulnerabilities, and unrecognized dependencies. Honest assessments separate what is known, what is assumed, and what is unknown, and express estimates as ranges where possible.

### Controls and residual risk

A [[security-control]] lowers likelihood (patching, removing exposure), lowers impact (segmentation, encryption, [[least-privilege]]), or improves detection and response. Whatever remains is [[residual-risk]]. SP 800-30 lists the possible responses as acceptance, avoidance, mitigation, sharing, or transfer. A defense should also be proportionate: as CS 161 puts it, "there is no point putting a $100 lock on a $1 item" ([CS 161, Chapter 1](https://textbook.cs161.org/principles/principles.html)).

## Worked example

The fictional retailer shop.example runs a support portal at support.shop.example. A junior analyst files this report:

```text
Risk: CRITICAL. Hackers could hack the support portal (CVSS 9.8).
```

It names a score and a scary verb, but not the asset, the event, the evidence, or the unknowns. Rewrite it step by step.

**Step 1: assets.** The portal stores about 40,000 support tickets containing customer names, email addresses, and order histories. It also holds a database password that can read the full orders database.

**Step 2: weaknesses.** The portal runs version 4.2 of the fictional FrameworkX, and the vendor's advisory says that version allows remote code execution. Two predisposing conditions make it worse: the portal is reachable from the whole internet, which raises the likelihood, and its database password can read far more than the portal needs, which raises the impact.

**Step 3: threat source and event.** Opportunistic criminals scan the internet for newly announced flaws. The event: they exploit the flaw, run code on the portal server, read the tickets and the stored password, then query the orders database.

**Step 4: impact.** Confidentiality: HIGH, because customer data would be disclosed and could fuel convincing phishing. Integrity: MODERATE, because altered tickets could mislead staff. Availability: LOW.

**Step 5: likelihood.** HIGH. The flaw appears in a public catalog of actively exploited vulnerabilities, and the portal is exposed to everyone.

**Step 6: uncertainty.** The team does not know whether the flaw was exploited before today, and the 40,000 figure is an estimate.

The rewritten statement:

```text
Opportunistic attackers (threat source) could exploit the remote code
execution flaw in FrameworkX 4.2 (vulnerability) on the internet-facing
support portal to read about 40,000 support tickets and the portal's
database password, then query the orders database (threat event).
Impact: HIGH for confidentiality (customer names, emails, order history).
Likelihood: HIGH, because exploitation is publicly reported and the portal
is reachable from anywhere. Unknown: whether the flaw was already
exploited. Assumed: the password is not used anywhere else.
```

**Step 7: compare treatments.**

| Treatment                                   | Changes            | Residual risk and its limits                         |
| ------------------------------------------- | ------------------ | ---------------------------------------------------- |
| Patch FrameworkX today                      | Likelihood ↓       | Low, unless the portal was already compromised       |
| Allow the portal only from the staff VPN    | Likelihood ↓       | Lower, but an infected staff laptop still reaches it |
| Give the portal a read-only, tickets-only password | Impact ↓    | The orders database is safe; tickets still exposed   |
| Alert on unusual queries and data volumes   | Detection ↑        | Shortens the attack, does not prevent it             |
| Accept the risk                             | Nothing            | Only an owner with authority may decide this         |

The team patches today, reviews logs for signs of earlier exploitation, and schedules the password change and the VPN restriction. They record what remains and who accepted it.

## Defenses

**Know your assets and software.** You cannot patch what you do not know you run. Equifax's first factor was that the vulnerable framework was not identified on the portal, partly because the alert went to an out-of-date list of recipients ([GAO-18-559](https://www.gao.gov/products/gao-18-559)). Limit: inventories go stale unless they are updated automatically.

**Prioritize by risk, not by score.** Combine exploitation evidence (KEV), predicted exploitation (EPSS), exposure, and asset value. Limit: every signal can be wrong or late, and a flaw can be exploited before it appears in any catalog.

**Reduce likelihood.** Patch, remove unneeded exposure, and fix weaknesses at their source. Limit: patches take time to test, and some systems cannot be patched quickly.

**Reduce impact.** Segment networks, use least-privilege credentials, encrypt stored secrets, and keep data you do not need out of reach. Limit: these controls rarely stop the first step, so they must be paired with prevention.

**Detect and respond.** Monitor for abnormal behavior and keep monitoring tools working. Equifax's expired certificate shows that a detection control can fail silently. Limit: detection only helps if someone acts on it.

**Decide explicitly.** Record each risk, its owner, and the chosen response. Limit: accepting a risk does not make it smaller, and transferring it, for example through insurance, does not undo harm to customers.

## Common misconceptions

- **"The vulnerability is the risk."** A weakness is one input. Risk also depends on who can reach it, what it protects, and how bad the harm would be.
- **"A CVSS 9.8 means critical risk for us."** CVSS Base scores describe the flaw, not your exposure or your losses.
- **"A threat means a hacker."** Errors, equipment failures, and floods destroy data too, and a risk assessment must include them.
- **"It has never happened, so the likelihood is low."** You may simply not have detected it. Equifax's attackers worked for about 76 days unnoticed.
- **"Multiplying 1-to-5 ratings gives a risk number."** It gives a ranking that looks like a measurement, and it can order risks wrongly.
- **"After the fix, the risk is zero."** Residual risk always remains, and someone must own it.

## Try it yourself

On paper, analyze three fictional scenarios. For each, separate the asset, the vulnerability, any predisposing conditions, the threat source, the threat event, the impact, the likelihood with its evidence, and the uncertainty.

1. The mobile app for bank.example keeps a user's session token unencrypted in shared storage on the phone, where other apps on a compromised phone could read it.
2. The registrar at college.example keeps the only copy of student transcripts on one server in a basement room that flooded twice in ten years.
3. A marketing employee at shop.example has administrator rights in the email platform and reuses a password from a site that was breached last year.

Then:

- Write one precise risk statement for each scenario, using the format from the worked example.
- Rank the three, and explain which input (likelihood, impact, or uncertainty) drove your ranking.
- Propose one control for each and describe the residual risk that remains.

Notice that scenario 2 has no attacker at all. If your list of threat sources only contained people, revisit it.

## Key takeaways

- Separate the asset, the vulnerability, the threat source and event, the impact, and the uncertainty before you judge anything.
- Risk combines the likelihood of a threat event with the size of its impact, for a stated period and stakeholder.
- Severity scores such as CVSS describe a flaw; exploitation evidence, exposure, and asset value turn that into risk.
- Controls reduce likelihood or impact, or speed up detection, but residual risk always remains and needs an owner.
- State your evidence, your assumptions, and what you do not know.

## Go deeper

- [NIST SP 800-30 Rev. 1](https://csrc.nist.gov/pubs/sp/800/30/r1/final) has appendices on threat sources, threat events, vulnerabilities and predisposing conditions, likelihood, impact, and risk determination, each with example assessment scales. Its Section 2.3.2 compares quantitative, qualitative, and semi-quantitative approaches.
- FIRST's [EPSS guidance](https://www.first.org/epss/using-epss.html) explains why a calibrated probability should not be mixed arithmetically with an ordinal severity score. Open question: how should a program combine a probability of exploitation with impact estimates that are themselves ordinal?
- [GAO-18-559](https://www.gao.gov/products/gao-18-559) is a short, readable case study. Map each of its four factors to likelihood, impact, or detection.
