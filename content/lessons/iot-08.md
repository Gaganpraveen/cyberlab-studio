---
topicId: IOT-08
title: Physical access and hardware trust
summary: What changes when the attacker can touch the device, how tamper evidence, tamper resistance, and tamper response raise the cost of physical attacks, what secure elements, TPMs, and hardware security modules can and cannot promise, and how to map layered physical controls onto a fictional door-access system.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Describe what an attacker with physical access can do to a device, from using exposed ports to probing chips, and how the time, skill, and equipment required differ.
  - Distinguish tamper evidence, tamper resistance, and tamper response, and give an example of each.
  - Explain what secure elements, TPMs, and hardware security modules protect, and why they stop key extraction but not misuse through their own interfaces.
  - Map physical and hardware controls onto each component of a fictional system according to where it sits and who can reach it.
prerequisites: [IOT-04, SYS-07, SYS-08]
concepts:
  - tamper-resistance
  - hardware-security-module
  - secure-element
labs: []
keywords:
  - physical security
  - physical access
  - tamper evidence
  - tamper response
  - zeroization
  - FIPS 140-3
  - FIPS 140-2
  - ISO/IEC 19790
  - cryptographic module
  - security levels
  - HSM
  - secure element
  - TPM
  - debug port
  - microprobing
  - fault injection
  - power analysis
  - API attack
sources:
  - title: 'FIPS 140-3: Security Requirements for Cryptographic Modules'
    url: https://csrc.nist.gov/pubs/fips/140-3/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'FIPS 140-2: Security Requirements for Cryptographic Modules (superseded by FIPS 140-3)'
    url: https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.140-2.pdf
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'Security Engineering, 3rd edition, Chapter 18: Physical Tamper Resistance (Ross Anderson)'
    url: https://www.cl.cam.ac.uk/archive/rja14/Papers/SEv3-ch18.pdf
    publisher: Wiley (chapter freely available from the author)
    sourceId: anderson-security-engineering
  - title: 'NIST IR 8259A: IoT Device Cybersecurity Capability Core Baseline'
    url: https://csrc.nist.gov/pubs/ir/8259/a/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259a
quiz:
  - question: What does a tamper-evident seal on a device's enclosure actually provide?
    choices:
      - It prevents anyone from opening the enclosure.
      - It erases the device's keys when the enclosure is opened.
      - It shows afterward that the enclosure was opened, but only if someone inspects it.
      - It encrypts the data stored inside the device.
    answer: 2
    explanation: Evidence is not resistance or response. A seal makes tampering visible after the fact, so it helps only when inspections actually happen and someone acts on a broken seal.
  - question: Mallory pries an outdoor card reader off the wall at night and takes it home. Which design limits what she gains?
    choices:
      - The reader holds only its own revocable device key, has no power to unlock the door, and its removal trips an alarm handled by the controller inside.
      - The reader stores a copy of the whole credential database so that it keeps working offline.
      - Every reader shares the same key, so it can be replaced without configuration.
      - The reader's debug port is left enabled so technicians can diagnose it.
    answer: 0
    explanation: Keeping secrets and decisions on the protected side, and giving each device its own key, means a stolen reader yields one revocable key and no way to open doors. A shared key would expose every reader at once.
  - question: A bank's hardware security module zeroizes its keys if its case is opened. Which threat does that not address?
    choices:
      - A thief who drills into the case to reach the key memory
      - A technician who removes the lid to copy the key chips
      - A burglar who carries off the whole module and opens it at home
      - A programmer with access to the host who sends a sequence of legitimate commands that makes the module leak keys
    answer: 3
    explanation: Tamper response protects the key memory from physical extraction. Anderson describes API attacks, in which a programmer with host access sends commands that cause the module to leak PINs or keys. The interface needs its own design review.
  - question: In FIPS 140-2's description of the security levels, what physical protection does Level 3 add over Level 2?
    choices:
      - Nothing; the levels differ only in software requirements.
      - Strong enclosures and tamper response circuitry that immediately zeroizes plaintext secret and private keys, beyond Level 2's tamper evidence
      - Protection against temperature and voltage fluctuations, which is the main Level 3 requirement
      - Production-grade components, which Level 2 does not require
    answer: 1
    explanation: In FIPS 140-2's description, Level 2 requires evidence of tampering, Level 3 adds mechanisms meant to detect and respond to attempts at physical access, including zeroization, and Level 4 adds a complete envelope of protection and environmental protection.
  - question: A smart lock ships with its debug interface enabled, giving a full console to anyone who connects to pads on the circuit board. Which statement is correct?
    choices:
      - The pads are hidden inside the case, so the risk is negligible.
      - Debug interfaces are protected by the lock's Wi-Fi password.
      - Anyone who can open the case may gain control of the lock, so production devices should disable such interfaces or restrict them to authorized users.
      - The risk disappears once the firmware is signed.
    answer: 2
    explanation: NIST's device baseline asks that a device restrict logical access to its local and network interfaces to authorized entities only. A hidden but open console is obscurity, not access control, and signing protects updates rather than a live debug session.
---

## Why it matters

Most security controls assume the attacker is somewhere on the network. IoT devices break that assumption. They hang on walls, sit in parking lots and shared offices, travel through the mail, and are resold and thrown away, as lesson IOT-05 showed. Anyone who can touch a device may be able to open it, connect to its circuit board, read its memory chips, or measure its power consumption while it computes.

Physical access does not have to mean defeat, but it changes the question from "can the attacker reach the device?" to "what does the attacker gain once they hold it, and at what cost?" Ross Anderson's _Security Engineering_ frames the defender's goal as reducing "the street value of key material to zero," using devices from which the key cannot readily be extracted, or from which extraction would at least be obvious.

Design choices decide how much one captured device is worth. Anderson notes that pay-TV cards "often have a universal shared secret key, so a compromise enables an attacker to make lots of counterfeit cards." One compromised card is then enough to counterfeit many more. Per-device keys, from lesson IOT-05, shrink that loss to a single unit.

## The core idea

Physical attackers differ in time, skill, and equipment. A classic scheme from IBM, which Anderson describes as "now a bit dated" but still useful, separates "clever outsiders," "knowledgeable insiders," and "funded organizations." A passer-by with five minutes and a screwdriver is a very different threat from a laboratory with a month and specialist equipment.

Defenses against physical attack come in three kinds, together called [[tamper-resistance]] in the broad sense:

| Kind              | What it does                                         | Examples                                                       |
| ----------------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| Tamper evidence   | Makes tampering visible afterward                    | Seals, tamper-evident coatings, inspection logs                |
| Tamper resistance | Makes tampering slow, difficult, or expensive        | Strong enclosures, security screws, potting, chip shielding     |
| Tamper response   | Detects tampering and acts, often by erasing keys    | Lid switches, sensor meshes, zeroization circuits               |

No device is tamper-proof. Anderson writes that no known technology can make a smartcard resistant to "penetration by a skilled and determined attacker." The realistic goal is cost: for a well-defended card, an attack might mean "a year's delay, a budget of over a million dollars, and no certainty of success." Defenders win when extracting a secret costs more than it is worth, and when one success yields little.

That leads to the central design rule of this lesson: decide what an attacker gains if any given device falls into their hands, and make it small. Keep secrets out of devices that strangers can reach, give each device its own key, and keep security decisions on the protected side of the [[trust-boundary]].

## How it works

### What physical access allows

Physical attacks form a ladder. The cheap rungs need minutes; the expensive ones need a laboratory.

| Attack                              | Typical requirement                       | Main defense                                                  |
| ----------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| Use exposed ports or debug pads     | Minutes and a cable                       | Disable or lock debug interfaces in production                 |
| Read the flash memory chip directly | Hours and a chip reader                   | Encrypt stored data with a key held in a secure element        |
| Add or swap hardware                | Access during shipping, installation, or repair | Seals, inspection, and secure boot                        |
| Probe the chip's internal signals   | Laboratory equipment and expertise        | Secure elements with shielding and sensors                    |
| Inject faults (glitching)           | Equipment and expertise                   | Sensors and redundant checks in security hardware             |
| Measure power or emissions          | An oscilloscope and expertise             | Side-channel countermeasures in certified hardware            |

The first rung is the cheapest to attack and the easiest to fix. A serial console or debug interface left enabled in production may give anyone who opens the case full control. NIST's baseline of IoT device capabilities asks that a device "restrict logical access to its local and network interfaces" to authorized entities only, and a debug port is a local interface.

The upper rungs target the chip itself. Anderson explains that "the usual target of a probing attack is the processor's bus," that "faults can be injected into processors in many ways," for example with laser light or power transients, and that measuring a chip's power consumption can reveal its keys, a [[side-channel-attack]] known as power analysis. These attacks are why keys belong in hardware designed to resist them.

### Hardware that keeps keys

Three kinds of hardware hold keys for others, and lessons IOT-04 and SYS-07 introduced the first two:

- A **[[secure-element]]** is a separate chip with its own processor and storage. Keys live inside it, operations happen inside it, and it is designed to resist probing, glitching, and power analysis.
- A **[[tpm]]** (trusted platform module) is a standardized security chip used in PCs and some embedded boards for keys and boot measurements.
- A **[[hardware-security-module]]** (HSM) protects an organization's most valuable keys, such as a certificate authority's root or the firmware-signing key from lesson IOT-06. Anderson describes HSMs as "microcomputers encased in robust metal enclosures, with encryption hardware and special key memory," memory that is erased if the enclosure is opened. Banks have long used them to protect customers' PINs.

All three share the limit you met with keystores in lesson IOT-04: they stop keys from being copied, not from being used. Anderson describes attacks on HSMs in which a programmer with access to the host "could send the security module a series of commands that would cause it to leak PINs or keys." The metal case was never opened; the interface was the weak point. Hardware trust needs a carefully designed interface as much as a strong enclosure.

### Measuring physical protection: FIPS 140

How can a buyer compare the physical protection of two modules? For the US federal government, the yardstick is FIPS 140. Its current version, FIPS 140-3, published in 2019, superseded FIPS 140-2; it "shall be used in designing and implementing cryptographic modules" for federal agencies, and it "provides four increasing, qualitative levels of security," with physical security among the areas it covers. FIPS 140-3 builds on the international standard ISO/IEC 19790, so its detailed requirements may differ from its predecessor's, but the freely available text of FIPS 140-2 still shows the idea behind climbing the levels:

- **Level 1** requires production-grade components.
- **Level 2** adds tamper evidence, such as tamper-evident coatings or seals.
- **Level 3** adds mechanisms intended to detect and respond to physical access, which may include strong enclosures and circuitry that "shall immediately zeroize all plaintext secret and private keys" and other critical security parameters when tampering is detected.
- **Level 4** provides "a complete envelope of protection around the cryptographic module" and adds protection against, or testing for, temperature and voltage outside the normal range. With environmental failure protection, the module must "monitor and correctly respond to fluctuations in the operating temperature and voltage," which targets attacks that push a chip outside its normal operating conditions.

A certificate is evidence about a defined module, not about a whole product. Anderson recounts a case in which "the FIPS certificate referred only to the hardware, and we found vulnerabilities in the software." Read what was tested, at which level, and in which configuration.

## Worked example

Northgate, a fictional university at `northgate.example`, is installing a new door-access system. Alice must map physical controls onto its design. The system has four parts:

- A **card reader** on the outside wall of each secured room.
- A **door controller** inside the room, which drives the lock.
- A **building panel** in a locked network closet, connecting the controllers to the server.
- An **access server** at `access.northgate.example` in the data center, with an HSM holding the key that signs controller firmware.

**Step 1: Place each component and its attacker.** For every part, alice records who can reach it, for how long, and what it holds:

| Component        | Who can reach it, and for how long | What it holds                        | Physical controls                                           | Hardware trust                     |
| ---------------- | ---------------------------------- | ------------------------------------ | ----------------------------------------------------------- | ---------------------------------- |
| Card reader      | Anyone outside; minutes, at night  | Its own device key only              | Security screws, tamper switch reporting to the controller | Device key in a secure element     |
| Door controller  | Staff and contractors; hours       | Lock decision, credential cache      | Mounted inside the room, sealed case, debug interface disabled | Secure element, secure boot     |
| Building panel   | Facilities staff; hours            | Network link to all controllers      | Locked closet with an access log, seals checked monthly     | Secure boot                        |
| Access server    | Administrators; ongoing            | Credential database, signing key     | Data-center access control, two-person rule for signing     | HSM with tamper response           |

**Step 2: Keep decisions on the protected side.** The reader on the public side of the wall must never be able to unlock the door on its own. It only passes card data to the controller over an authenticated link. If mallory pries the reader off, the controller inside notices and keeps the door locked:

```sequence
title: A forced reader stays locked out
participant R as Outside reader
participant C as Door controller (inside)
participant S as access.northgate.example
note R: mallory pries the reader off the wall
R -> C: Tamper switch opens
C -> S: Tamper alarm for door 2-114
C -x R: Unlock requests from this reader refused until it is reinstalled
S --> C: Reader's device key revoked; security staff notified
note C: The lock decision stays inside the room
```

**Step 3: Limit what one stolen device yields.** If mallory takes the reader home and extracts its key, she gains one revoked key and no ability to open any door. If every reader shared one key, she would gain all of them.

**Step 4: Match evidence, resistance, and response to the attacker.** The reader faces a quick, opportunistic attacker, so resistance (security screws) and response (the tamper switch) matter most. The closet faces slower insiders, so evidence (seals and an access log) works if someone actually checks it. The HSM guards the most valuable key, so it gets tamper response and a certified module.

**Step 5: Add the procedures.** Hardware alone is not enough. Alice adds an inventory of every reader and controller by serial number, inspection of seals on a schedule, a record of who handles devices sent for repair, and a disposal rule: erase or destroy each device's secure element before it leaves the university.

## Defenses

- **Design first: keep secrets and decisions out of reach.** Limit: devices that authenticate themselves must hold at least one key.
- **Give every device its own key.** Limit: the captured device itself is still lost and must be revoked.
- **Close local interfaces.** Disable debug interfaces in production or require authentication for them. Limit: technicians need some path for repairs, which must itself be controlled.
- **Hold keys in a secure element, TPM, or HSM.** Limit: these stop extraction, not misuse through their own interfaces.
- **Layer evidence, resistance, and response.** Limit: evidence needs inspection, and a response that erases keys can be triggered on purpose to cause a denial of service.
- **Choose certified modules carefully.** Read the certificate's level and boundary. Limit: certification covers what was tested, not the whole product.
- **Run the procedures.** Inventory, scheduled inspection, chain of custody for repairs, and secure disposal. Limit: procedures depend on people following them.

## Common misconceptions

- **"Physical access means game over."** It means the defender must plan for it. Per-device keys, protected hardware, and decisions kept on the protected side limit what a captured device yields.
- **"Tamper-evident means tamper-proof."** Evidence shows tampering afterward and helps only if someone checks.
- **"A FIPS-validated module makes the whole product secure."** The certificate covers a defined module, at a stated level, in a stated configuration.
- **"Keys in hardware cannot be misused."** Hardware stops keys from being copied; anyone who can drive the interface can still use them.
- **"Hidden debug pads are safe because nobody knows about them."** Anyone who opens one unit can find them. Disable or lock them.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Examine devices from the outside only. Do not open, probe, or modify any device, including your own; mains power and lithium batteries can cause injury.

1. **The five-minute attacker.** Choose a device you own, such as a home router or smart speaker. Without opening it, list every physical interface: ports, buttons, reset holes, and labels showing passwords or setup codes. For each, write what someone alone with the device for five minutes could do, and which kind of control (evidence, resistance, or response) would help.
2. **Map a system on paper.** ParkWise, a fictional parking company at `parkwise.example`, runs an outdoor payment kiosk, a gate controller in a locked roadside cabinet, and a cloud payment service. Build alice's table for it, then draw the sequence of events when someone forces open the kiosk.
3. **Classify controls.** Sort these into evidence, resistance, response, or more than one: a holographic seal, a tamper switch, epoxy potting over a circuit board, a locked cabinet, a camera, a zeroization circuit, security screws, an inspection log, a disabled debug interface, and a secure element.

## Key takeaways

- Physical access changes the question to what an attacker gains from a captured device and at what cost, so design to make that gain small.
- Tamper evidence shows tampering, tamper resistance slows it, and tamper response reacts to it, usually by erasing keys; no device is tamper-proof.
- Secure elements, TPMs, and HSMs keep keys from being copied, but anyone who can drive their interface can still use the keys.
- Certification levels such as those in FIPS 140 describe a tested module, not a whole product.
- Keep secrets and decisions on the protected side, give every device its own key, close local interfaces, and back the hardware with procedures.

## Go deeper

- Anderson's [chapter on physical tamper resistance](https://www.cl.cam.ac.uk/archive/rja14/Papers/SEv3-ch18.pdf) describes attacks on HSM interfaces in detail. Explain why the interface failed before the enclosure, and how you would review the Northgate HSM's interface.
- [FIPS 140-3](https://csrc.nist.gov/pubs/fips/140-3/final) builds on the international standard ISO/IEC 19790. Find a validated module's public security policy on NIST's Cryptographic Module Validation Program site and identify its physical security level and module boundary.
- Open question: tamper response that erases keys protects secrets but can be triggered deliberately to disable a device. How would you balance secrecy and availability for a door controller, where a disabled device might lock people in or out?
