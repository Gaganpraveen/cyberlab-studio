---
topicId: IOT-07
title: Operational technology and safety boundaries
summary: Why securing the systems that run pumps, breakers, and production lines differs from securing office IT, why safety comes first and integrity and availability come before confidentiality, why legacy protocols and change control shape every defense, and how to assess a control-system risk scenario on paper without ever touching a real industrial system.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Define operational technology and name the main components of an industrial control system, including controllers, HMIs, SCADA, and safety instrumented systems.
  - Explain why OT security treats safety as the overarching priority and ranks integrity and availability ahead of confidentiality, and how long life cycles, legacy protocols, and change control limit the defenses that work.
  - Assess a fictional control-system scenario by starting from physical consequences, tracing attack paths, and judging whether safeguards are independent of the control system.
  - Recommend proportionate controls, such as segmentation, controlled remote access, and manual fallback, and state their limits.
prerequisites: [FND-03, NET-07, IOT-05]
concepts:
  - operational-technology
  - ics
  - scada
  - plc
  - safety-instrumented-system
labs: []
keywords:
  - OT
  - operational technology
  - ICS
  - industrial control system
  - SCADA
  - PLC
  - HMI
  - historian
  - engineering workstation
  - safety instrumented system
  - SIS
  - OT DMZ
  - remote access
  - management of change
  - NIST SP 800-82
  - ISA/IEC 62443
  - MITRE ATT&CK for ICS
  - C0028
  - T0822
  - T0831
  - BlackEnergy
  - KillDisk
  - Ukraine 2015
sources:
  - title: 'NIST SP 800-82 Rev. 3: Guide to Operational Technology (OT) Security'
    url: https://csrc.nist.gov/pubs/sp/800/82/r3/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-82
  - title: '2015 Ukraine Electric Power Attack (C0028), MITRE ATT&CK'
    url: https://attack.mitre.org/campaigns/C0028/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: ISA/IEC 62443 Series of Standards
    url: https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards
    publisher: International Society of Automation (ISA)
    license: All rights reserved
quiz:
  - question: Why does OT security usually rank integrity and availability above confidentiality, with safety over all three?
    choices:
      - Because OT data is never sensitive
      - Because a control system that stops or misbehaves can harm people, equipment, or the environment, while leaked process data usually cannot do that directly
      - Because encryption is illegal on industrial networks
      - Because OT systems are always air-gapped
    answer: 1
    explanation: OT systems monitor and control physical processes, so their failures have physical consequences. NIST's OT guide says OT security objectives typically prioritize integrity and availability, followed by confidentiality, and treats safety as an overarching priority.
  - question: A new analyst proposes running an aggressive vulnerability scan against the plant's controllers during production to find weaknesses quickly. What is the main problem?
    choices:
      - Scans are too slow to be useful.
      - Scanning is only a problem if the controllers are encrypted.
      - The scan results would be confidential.
      - Fragile or legacy devices may misbehave or stop under unexpected traffic, so the "test" could itself disrupt the physical process.
    answer: 3
    explanation: In OT, the defender's actions carry physical risk too. Discovery relies on inventories, documentation, and passive monitoring, and any active testing happens on test systems or in planned windows approved by operations and safety staff.
  - question: In the Riverbend scenario, which safeguard best limits harm if an attacker takes over the dosing controller?
    choices:
      - An independent safety system with its own analyzer that trips the dosing pump on high chlorine, plus manual lab sampling
      - An alarm on the HMI that the same compromised network delivers
      - A stronger password on the corporate email system
      - Encrypting the historian database
    answer: 0
    explanation: A safeguard helps only if the attack cannot defeat it at the same time as the control system. An independent safety system and a manual check do not depend on the compromised controller or its network.
  - question: Why can't a plant simply apply every security patch the week it is released, as an office IT team might?
    choices:
      - Industrial vendors never release patches.
      - Patches for OT systems are always malicious.
      - Changes to control systems need testing, vendor support, and planned outage windows, because an untested change can stop or destabilize a process that must run continuously.
      - Patching is illegal under NIST guidance.
    answer: 2
    explanation: Change control in OT treats every change as a potential safety and availability risk. Until a patch can be applied safely, compensating controls such as segmentation and monitoring reduce exposure.
  - question: Which statement about OT remote access is most accurate?
    choices:
      - Remote access should be permanent so vendors can respond instantly.
      - Remote access should pass through a controlled point, such as a jump host in an OT DMZ with multi-factor authentication, be enabled only when needed, and be monitored.
      - Remote access is safe if the plant uses a VPN, whatever the VPN connects to.
      - Remote access is never used in OT.
    answer: 1
    explanation: In the 2015 Ukraine attack, the attackers reached the control system's VPN with valid accounts taken from the Windows domain. Limiting where remote access lands, when it is open, who can use it, and what it can reach turns an open door into a supervised one.
---

## Why it matters

Most of this course protects information. Operational technology protects things that move, heat, flow, and switch. NIST's guide to OT security describes it as "a broad range of programmable systems and devices that interact with the physical environment," systems that "detect or cause a direct change through the monitoring and/or control of devices, processes, and events." Its examples include industrial control systems, building automation, transportation systems, and physical access control.

When these systems fail, the consequences are physical: a water plant doses the wrong amount of a chemical, a substation opens a breaker, a production line runs a motor past its limits. People can be hurt, equipment destroyed, and communities left without power or clean water.

A well-documented attack on a power grid shows how this plays out. In December 2015, attackers disrupted substations in Ukraine's power grid. According to MITRE ATT&CK's account of the campaign, they reached the control system's VPN using valid accounts taken from the utilities' Windows domain, then used the operators' own HMI screens in the SCADA environment to open breakers, leaving thousands of businesses and households without power for around six hours. They also overwrote the firmware of serial-to-Ethernet gateways, used KillDisk malware to make devices needed for remote recovery unusable, scheduled backup power supplies to shut down servers, and hit the power companies' phone lines with a denial-of-service attack. Opening the breakers required no exotic exploit: the attackers used the operators' own interface.

That changes the rules for defenders as well as attackers. In office IT, a careless scan might crash a server and annoy its users. In OT, the same mistake can stop a process that must run continuously or leave it in an unsafe state. This lesson therefore teaches assessment on paper only.

> [!WARNING]
> Never scan, probe, log in to, or otherwise test a real industrial, utility, or building control system, including ones you find reachable from the internet. Even "harmless" testing can disrupt physical processes and put people at risk. Practice only on paper scenarios like the one in this lesson.

## The core idea

The term [[operational-technology]] (OT) covers the whole family. Within it, an [[ics]] (industrial control system) runs a physical process, built from a few common parts:

- **Controllers.** A [[plc]] (programmable logic controller) reads sensors and drives actuators, such as pumps and valves, in a fast loop.
- **Human-machine interface (HMI).** The screens operators use to watch the process and change setpoints.
- **Engineering workstation.** The computer that programs the controllers. Whoever controls it can change the process logic.
- **Historian.** A database of process measurements, often shared with business systems for reports.
- **Supervisory systems.** [[scada]] (supervisory control and data acquisition) systems monitor and control equipment spread over a wide area, such as pumping stations or substations.
- **Safety systems.** A [[safety-instrumented-system]] (SIS) watches for dangerous conditions with its own sensors and forces the process into a safe state, independently of normal control.

NIST's guide frames OT security around the systems' "unique performance, reliability, and safety requirements." It notes that "OT security objectives typically prioritize integrity and availability, followed by confidentiality," and that safety is "an overarching priority." These priorities differ from typical office IT in ways that shape every decision:

| Concern              | Typical office IT                          | Typical OT                                                  |
| -------------------- | ------------------------------------------ | ----------------------------------------------------------- |
| Priorities           | Often confidentiality first                | Safety over all; integrity and availability before confidentiality |
| Worst outcome        | Data breach or outage                      | Injury, environmental harm, equipment damage, lost services |
| Timing               | Delays are usually tolerable               | Control loops need speed, consistency, and synchronization  |
| Life cycle           | A few years                                | Long; equipment stays in service for many years             |
| Patching             | Frequent, mostly automated                 | Only after testing, and scheduled with operations           |
| Protocols            | Modern, authenticated, encrypted           | Often proprietary, designed for isolated networks           |
| Changes              | Change tickets for big changes             | Formal change management with hazard review for any change   |

Integrity in OT means something concrete: the command the controller executes and the reading the operator sees must be the real ones. NIST also stresses the timing demands of control, which can require "very high speed, consistency, regularity, and synchronization," so a security control that adds delay can itself cause a failure.

## How it works

### Zones and conduits

Control networks are often organized in layers, from the physical process at the bottom, through controllers and supervisory systems, up to the business network. The security idea is [[network-segmentation]]: group systems into zones by function and risk, and allow traffic between zones only through controlled conduits. A useful pattern places an _OT DMZ_ between the business network and the control network, holding the systems both sides need, such as a copy of the historian and a jump host for remote access. Nothing on the business network talks directly to a controller.

The ISA/IEC 62443 series, which ISA describes as consensus-based cybersecurity standards for automation and control systems, addresses asset owners, automation product suppliers, and integrators, and treats security as a shared responsibility among them. That matters in OT, where no single party builds, runs, and maintains a whole plant.

Segmentation matters because some OT devices cannot defend themselves. They may run old operating systems that cannot be patched without the vendor, and may accept commands from anything that can reach them.

### Legacy protocols and trusted networks

NIST recalls that OT systems originally "were isolated, ran proprietary control protocols." A protocol designed for an isolated network had little reason to check who sent a command, and a device that does not authenticate commands acts on any well-formed message that reaches it, whether it says "change the setpoint" or "stop the pump." Where such protocols now run over Ethernet and IP, the old assumption of a closed network travels with them, and the network boundary becomes the main protection.

Replacing such equipment is slow, because controllers are expensive, woven into running processes, and kept for what NIST calls "the typical long life cycles of these systems." Defenders therefore compensate around them: restrict which hosts may talk to each controller, watch the traffic for unexpected commands, and protect the engineering workstation that holds the authority to reprogram everything.

### Change control and patching

In OT, every change is a potential safety event. A patch, a new firewall rule, or an updated controller program can alter timing or behavior in a process that runs around the clock. The answer is formal change management: each change is described, reviewed for hazards by operations and safety engineers, tested on a non-production system where possible, approved, scheduled, and accompanied by a rollback plan. Backups of controller programs and configurations are part of the same discipline, because a known-good copy is the fastest route back after a mistake or an attack.

NIST's guidance is to deploy security patches "in as expeditious a manner as possible after testing them." Testing and scheduling take time, so compensating controls such as segmentation and monitoring carry much of the load while a fix waits.

### Safety systems and independence

A safety instrumented system is a separate layer, with its own sensors, logic, and final elements such as trip valves, that acts when the process crosses a dangerous limit. NIST describes an SIS as "composed of one or more safety instrumented functions (SIFs)," each guarding against one hazard, and notes that such systems are "typically found in chemical, refinery, and nuclear processes." Its value comes from independence: it should keep working even if the basic control system fails or is compromised. Security has to protect that independence. An SIS connected to the same network, managed from the same workstation, or configured with the same credentials as the control system may fail together with it.

## Worked example

Riverbend Water, a fictional utility at `riverbend-water.example`, treats drinking water. A PLC controls a pump that doses chlorine based on readings from an analyzer. Operators watch the process on an HMI in the control room. Riverbend wants two changes: give its pump vendor, `pumpco.example`, remote access to diagnose problems, and send historian data to the business network for monthly reports. Alice, an OT security analyst, assesses the proposal on paper. The plant's current layout:

```text
Business zone        office PCs, email, reporting server
   | (proposed) historian data, remote vendor access
Control zone         HMI, engineering workstation, historian
   |
Process zone         dosing PLC, chlorine analyzer, dosing pump
Safety layer         SIS with its own analyzer and pump trip; manual lab sampling each shift
```

**Step 1: Start from consequences, not vulnerabilities.** Alice asks what physical harm the process could cause. Too much chlorine could harm public health; too little could let pathogens through; a pump driven beyond its limits could fail. These outcomes set the stakes for everything else.

**Step 2: Trace the paths to the controller.** The vendor's remote access, as proposed, would land directly on the control network. The reporting link would connect the business network to the historian, which sits beside the HMI. A USB drive used on the engineering workstation is a third path, and an insider a fourth.

**Step 3: Test the safeguards for independence.** If an attacker took over the dosing PLC, would anything still stop an overdose? The SIS has its own analyzer and trips the pump on high chlorine, and lab staff sample the water every shift. Alice checks that the SIS is not reachable from the control network and is not programmed from the same engineering workstation. One gap appears: the HMI alarm for high chlorine travels over the same network as the PLC, so it would fail along with it. She notes it as useful but not independent.

**Step 4: Recommend controls with their limits.**

| Proposal or path   | Recommendation                                                                                   | Limit                                         |
| ------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| Vendor access      | Jump host in a new OT DMZ, multi-factor authentication, enabled per session by operators, recorded, read-only by default | A trusted vendor account can still be misused |
| Reporting link     | Historian copy in the DMZ, with data flowing out only; no business-zone connection to the control zone | Adds a system to maintain                     |
| Engineering workstation | Removable media controls, change management for every logic change, offline backups of PLC programs | Slows urgent fixes                            |
| Detection          | Passive monitoring of control traffic for unexpected commands                                    | Detects, but does not prevent                 |
| Recovery           | Rehearsed manual operation of dosing, and a response plan written with operations and safety staff | Needs trained people on shift                 |

**Step 5: State what must not happen.** Alice's report says that no one will run active scans on the production network, and that every change in the plan will go through Riverbend's change management process, with testing on a non-production system first.

The assessment never touched a live system. It relied on drawings, interviews, and the plant's own documentation, which is how OT assessments should begin.

## Defenses

- **Segment into zones and conduits, with an OT DMZ.** Limit: segmentation erodes as exceptions accumulate, so rules need regular review.
- **Control remote access.** Route it through a monitored jump host with multi-factor authentication, and open it only when needed. The 2015 Ukraine attackers entered through remote access with stolen valid accounts. Limit: an authorized account can still be stolen or misused.
- **Protect the safety layer's independence.** Keep safety systems on separate networks and workstations with separate credentials. Limit: independence costs money and is easily eroded by convenience.
- **Know your assets and watch the traffic.** Keep an inventory and use passive monitoring to spot unexpected commands. Limit: monitoring detects; it does not prevent.
- **Manage every change and back up controller logic.** Limit: formal change control slows urgent fixes.
- **Plan for manual operation.** Practice running critical functions without the control system. Limit: it needs trained staff and may not scale to every process.
- **Patch on a risk-based schedule.** Test and apply vendor-approved patches in planned windows, and compensate in the meantime. Limit: some devices may never receive patches.

## Common misconceptions

- **"Industrial systems are air-gapped."** Remote access, reporting links, and removable media can connect them to the outside world, as the Ukraine attack's use of a control-system VPN showed.
- **"IT security tools can be dropped straight in."** Active scans and automatic patching can disrupt fragile devices and running processes.
- **"Confidentiality comes first, as in IT."** In OT, safety comes first, and integrity and availability usually rank ahead of confidentiality.
- **"The safety system makes cyberattacks harmless."** Only if it is truly independent, and attackers may target it too.
- **"Testing a real plant shows what is really there."** Testing a live process can cause the harm security is meant to prevent. Use documentation, interviews, passive data, and test systems.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

These exercises are on paper. Do not connect to, scan, or interact with any real control system.

1. **Assess a greenhouse.** Hillside Farm (`hillside-farm.example`) runs a fictional greenhouse whose controller manages heaters and irrigation. A tablet app lets the owner, bob, adjust temperatures from anywhere through the controller vendor's cloud service, and a mechanical thermostat cuts power to the heaters above 40 °C. Following alice's steps, list the physical consequences, the paths to the controller, which safeguards are independent, and three proportionate controls with their limits.
2. **Rank the priorities.** For the greenhouse controller and for the farm's online shop, rank confidentiality, integrity, and availability, and explain why the rankings differ.
3. **Write a change request.** Draft the request for updating the greenhouse controller's firmware: what changes, the hazards, how it will be tested, who approves it, when it happens, and how to roll it back.

## Key takeaways

- Operational technology monitors and controls physical processes, so its failures are physical: harm to people, equipment, the environment, and services.
- OT security puts safety first and ranks integrity and availability ahead of confidentiality, and long life cycles, legacy protocols, and formal change control shape which defenses are practical.
- Assess OT risk from physical consequences backward, and ask whether each safeguard would survive the same attack as the control system.
- Segmentation, controlled remote access, independent safety systems, change management, and manual fallback carry most of the defense.
- Never test real industrial systems; assessments start with documentation, interviews, and paper scenarios.

## Go deeper

- [NIST SP 800-82 Rev. 3](https://csrc.nist.gov/pubs/sp/800/82/r3/final) is the main US guide to OT security, and an initial public draft of Revision 4 was released for comment in September 2026. Compare its recommended architecture with the Riverbend layout, and list what Riverbend would still need.
- The [ISA/IEC 62443 series](https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards) includes ISA-62443-3-3, "System security requirements and security levels." How would you choose a target security level for Riverbend's dosing zone, and who should decide?
- Open question: safety engineering and security engineering both analyze hazards, but they assume different causes, random failure versus an intelligent adversary. How should a plant combine the two analyses without double-counting or missing risks?
