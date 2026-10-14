---
topicId: IOT-02
title: Bluetooth and short-range trust
summary: What Bluetooth pairing proves and what it cannot, why legacy pairing and Just Works leave openings, and why deciding what a paired device may do, or whether it is really nearby, needs separate controls.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Explain how two devices' display and input capabilities select a Bluetooth association model, and whether that model resists an adversary in the middle.
  - Contrast LE legacy pairing with LE Secure Connections and explain why a recorded legacy pairing can expose the long-term key.
  - Separate the authentication that pairing provides from the authorization decision about what a paired device may do.
  - Explain why a relay attack defeats proximity-based trust even when every message is cryptographically valid, and name defenses against it.
  - Analyze a pairing and authorization scenario and recommend settings for it.
prerequisites: [IOT-01, CRY-03, IAM-01]
concepts:
  - bluetooth-pairing
  - ble
  - bluetooth-association-model
  - relay-attack
labs: []
keywords:
  - Bluetooth
  - Bluetooth Classic
  - BR/EDR
  - BLE
  - Bluetooth Low Energy
  - Secure Simple Pairing
  - SSP
  - LE Secure Connections
  - Secure Connections Only mode
  - LE legacy pairing
  - Just Works
  - Numeric Comparison
  - Passkey Entry
  - Out of Band
  - OOB
  - NFC
  - ECDH
  - P-256
  - link key
  - long-term key
  - LTK
  - bonding
  - bluesnarfing
  - bluebugging
  - Car Whisperer
  - NIST SP 800-121
  - relay attack
  - distance bounding
  - KNOB
  - CVE-2019-9506
sources:
  - title: 'NIST SP 800-121 Rev. 2 (Update 1): Guide to Bluetooth Security'
    url: https://csrc.nist.gov/pubs/sp/800/121/r2/upd1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: Bluetooth Security
    url: https://www.bluetooth.com/learn-about-bluetooth/key-attributes/bluetooth-security/
    publisher: Bluetooth SIG
  - title: 'Key Negotiation of Bluetooth (KNOB) attack (Antonioli, Tippenhauer, and Rasmussen, USENIX Security 2019)'
    url: https://knobattack.com/
    publisher: Daniele Antonioli, Nils Ole Tippenhauer, and Kasper Rasmussen
quiz:
  - question: Earbuds with no screen pair with alice's phone using Just Works over LE Secure Connections. Which statement is correct?
    choices:
      - Someone who only records the pairing cannot derive the key, but an active attacker in the middle during pairing would go unnoticed.
      - The link is not encrypted at all after Just Works pairing.
      - Just Works is as strong as Numeric Comparison when Secure Connections is used.
      - Anyone who recorded the pairing can compute the long-term key.
    answer: 0
    explanation: Secure Connections uses an elliptic-curve Diffie-Hellman exchange, so a passive recording does not reveal the key. Just Works has no step where a person checks that both devices saw the same exchange, so an attacker who runs a separate exchange with each device is not detected. That missing check is why NIST says Just Works provides no protection against an adversary in the middle.
  - question: Bob's older fitness band uses LE legacy pairing with Passkey Entry, and Mallory recorded the pairing. What is the risk?
    choices:
      - None, because no one can test a million six-digit passkeys offline.
      - The passkey carries at most about 20 bits of entropy, and a recording of legacy pairing lets an attacker determine the long-term key.
      - Mallory can replay the pairing but can never read the data.
      - Mallory learns the PIN that unlocks Bob's phone.
    answer: 1
    explanation: Legacy pairing derives keys from a temporary key without public-key cryptography. A six-digit passkey gives at most about 20 bits of entropy, which is small enough to search, so NIST considers legacy pairing broken against anyone who captures the pairing frames (out-of-band pairing with a full 128-bit key is the exception).
  - question: During Numeric Comparison pairing, alice's phone shows 482193 and her laptop shows 480193. What should she do?
    choices:
      - Accept, because a one-digit difference is probably a display glitch.
      - Accept on the phone and ignore the laptop's number.
      - Reject the pairing, because different numbers mean the devices did not compute the same values, which is what an adversary in the middle would cause.
      - Type the phone's number into the laptop to override the check.
    answer: 2
    explanation: The six-digit value is a check computed from the exchange each device saw. An attacker in the middle runs two different exchanges, so the two devices compute different values. The comparison is the only thing that detects this, so any mismatch means stop, move somewhere private, and pair again.
  - question: A smart lock lets any phone that has bonded with it unlock the door. Which change fixes the authorization flaw rather than the authentication flaw?
    choices:
      - Moving from legacy pairing to LE Secure Connections
      - Using the longest encryption key the chip supports
      - Making the lock non-discoverable after setup
      - Requiring the owner to approve each new phone in the app and limiting what each approved phone may do
    answer: 3
    explanation: Secure Connections and longer keys make pairing and the link stronger, which is authentication and confidentiality. They do not decide who may unlock. Owner approval, per-phone permissions, and revocation are authorization controls, and pairing alone never provides them.
  - question: A car unlocks when it receives a valid cryptographic response from the owner's phone. Mallory relays radio messages between the car in the driveway and the phone in the kitchen. Why does encryption not stop this?
    choices:
      - The relay neither decrypts nor changes anything; it only extends range, so what fails is the car's assumption that a valid response means the phone is close.
      - The relay breaks the encryption by replaying old messages.
      - Car unlocking never uses encryption.
      - The phone was never paired with the car.
    answer: 0
    explanation: Every relayed message is genuine and fresh, so cryptographic checks pass. The flaw is treating "I received a valid answer" as "the key is within a meter." Defenses must measure distance or presence directly, for example with tight round-trip timing or a required user action.
---

## Why it matters

Bluetooth connects headphones, keyboards, phones, cars, fitness trackers, medical sensors, and door locks. Its short range invites a shortcut in reasoning: if a device is close, it must be the one I meant, and it must be friendly. Both halves of that shortcut have failed. NIST's Guide to Bluetooth Security records early attacks such as Car Whisperer, which used the standard, non-random passkey of hands-free car kits to send or receive audio, and bluesnarfing, which pulled data from older phones through a firmware flaw. It also concludes that the original pairing method for Bluetooth Low Energy gives no protection against an eavesdropper who records the pairing.

The most important moment in a Bluetooth relationship is pairing, when two devices that have never met agree on a key. Whatever happens then lasts as long as the devices remember each other. This lesson shows what pairing proves, what it cannot prove, and why deciding what a paired device may do is a separate question.

## The core idea

Every Bluetooth connection has to answer three questions:

1. **Who is the other device?** Pairing [[authentication|authenticates]] the two devices to each other, but only as strongly as its method allows.
2. **Can anyone else read or change our traffic?** Keys created during pairing encrypt and integrity-protect the link.
3. **What may that device do?** This is [[authorization]], and pairing does not answer it. A paired headset, car kit, or keyboard gains access to services, and each one is a separate decision.

Two devices meeting for the first time share no secret, and no [[certificate-authority]] vouches for a pair of earbuds. So pairing creates a secret over the air with a key-agreement protocol and leans on the person holding the devices to confirm that the right two devices took part. A user comparing two six-digit numbers is part of the protocol: their eyes are a channel the attacker cannot reach.

The [[threat-model]] for this lesson assumes an attacker within radio range who can record everything, transmit, and impersonate either device during pairing. The attacker cannot see both screens or change what the user types. Range is not much comfort, because better antennas stretch it.

## How it works

### Two radios, two key types

Bluetooth comes in two forms. Classic Bluetooth (BR/EDR) has long carried audio and file transfers. [[ble|Bluetooth Low Energy]] (LE), added in version 4.0, serves low-power sensors and accessories. [[bluetooth-pairing|Pairing]] creates shared secret keys, and _bonding_ stores them so the devices can reconnect later without pairing again. The stored key is the _link key_ in BR/EDR and the _long-term key_ (LTK) in LE. NIST stresses that a link key should never leave the device or travel over the air, and warns that keys stored carelessly can be read or modified.

### Association models

How pairing authenticates depends on what each device can show and accept. The combination selects a [[bluetooth-association-model]]:

| Model              | What the user does                                         | Resists an adversary in the middle?                  |
| ------------------ | ---------------------------------------------------------- | ---------------------------------------------------- |
| Numeric Comparison | Confirms both devices show the same six-digit number       | Yes                                                  |
| Passkey Entry      | Types the six digits shown on one device into the other    | Yes, if the passkey is random for each pairing       |
| Out of Band (OOB)  | Moves pairing data over another channel, such as NFC       | Yes, if that channel resists eavesdropping and tampering |
| Just Works         | Nothing; used when a device has no screen or keyboard      | No                                                   |

The six digits are not the key. As NIST notes, the displayed number is not used for key generation; it is a short check value computed from the exchange each device saw. Every model except Just Works produces an authenticated key.

### Legacy pairing versus Secure Connections

Before Bluetooth 4.2, LE devices could only use _legacy pairing_, which has no public-key step. Both sides derive keys from a temporary key that is all zeros under Just Works and at most a six-digit passkey, about 20 bits of [[entropy]], under Passkey Entry. NIST therefore concludes that, apart from OOB with a full 128-bit temporary key, legacy pairing "should be considered broken": an attacker who captures the pairing frames can determine the resulting LTK.

_LE Secure Connections_, added in Bluetooth 4.2, fixes the passive problem with an elliptic-curve [[diffie-hellman]] exchange on the P-256 curve. A recording no longer reveals the key, and each device computes the LTK itself instead of receiving it. Whether an active attacker is stopped still depends on the association model. The diagram shows Numeric Comparison between two devices that both have screens.

```sequence
title: LE Secure Connections with Numeric Comparison (simplified)
participant P as alice's phone
participant L as alice's laptop
P -> L: Pairing request with my I/O capabilities
L --> P: Pairing response with my I/O capabilities
P -> L: ECDH public key (P-256)
L --> P: ECDH public key (P-256)
note: Each side computes the shared secret and a check value
note: Both screens show 482193; alice taps Confirm on each
P -> L: Key confirmation; each side derives the LTK itself
```

Classic Bluetooth has a similar Secure Connections feature. A device in _Secure Connections Only_ mode refuses connections from devices that lack it, trading backward compatibility for a guaranteed floor.

### An adversary in the middle at pairing time

Mallory can try to sit between the two devices during pairing, running one key exchange with the phone while pretending to be the laptop and another with the laptop while pretending to be the phone. Each exchange succeeds on its own. Under Just Works nothing compares them, so both pairings complete and Mallory can read and alter everything that passes through her. Under Numeric Comparison, each device computes its check value from the keys it actually saw. Because the two devices saw different keys, they almost certainly display different numbers, and alice rejects the pairing.

```sequence
title: Adversary in the middle during pairing (conceptual)
participant P as alice's phone
participant M as Mallory
participant L as alice's laptop
P -> M: Public key A (phone believes M is the laptop)
M -> L: Public key M2 (laptop believes M is the phone)
note: Just Works: no check, so both pairings complete
note: Numeric Comparison: phone shows 104553, laptop 870211
P -x M: alice sees the mismatch and cancels
```

That defense works only if the user really compares the numbers. A confirmation button that people tap without looking turns Numeric Comparison back into Just Works.

### Pairing is not authorization

A paired device can use whatever services the other side offers unless something else says no. NIST calls one failure mode _authentication abuse_: an authenticated remote device using a Bluetooth service without the owner's knowledge. A paired keyboard can type into any app, and a car kit may ask for contacts and call history. NIST recommends disabling profiles and services you do not need, and notes that application developers can layer their own user authentication on top. For a smart lock, "bonded" should never mean "may unlock." The owner should approve each phone, permissions should be specific, and revoking one phone should not require resetting the lock.

### Weak spots after pairing

NIST's table of known vulnerabilities includes several that matter after pairing. The encryption key length is negotiable, and only Secure Connections Only mode insists on full 128-bit strength. The KNOB attack (2019, CVE-2019-9506) showed why that matters: the negotiation was not integrity-protected, so a nearby attacker could push two devices, even previously paired ones, to agree on a key with 1 byte of entropy and then brute-force it in real time. Mutual authentication may not always happen when already-paired devices reconnect. Static passkeys, such as the same code printed in every manual, make adversary-in-the-middle attacks easier. Vendors fix such flaws in firmware, and the Bluetooth SIG runs a security response program for flaws in the specifications themselves.

### Proximity is not authentication: relay attacks

Many products treat "I can hear your device" as "you are standing here," for example a car that unlocks when the owner's phone is near. A [[relay-attack]] forwards radio messages between two genuine devices that are far apart, such as a car in the driveway and a phone on the kitchen counter, using two attacker radios linked over a longer channel. Every message is genuine and fresh, so cryptography notices nothing; the relay only extends range. Received signal strength proves nothing either, because the attacker can retransmit at any power. Defenses must measure the property that matters. A required user action, such as pressing a button or unlocking the phone, proves presence. Tight round-trip timing, called _distance bounding_, works because no signal travels faster than light, so a relay's extra path adds delay that a precise enough measurement can detect.

## Worked example

Alice is asked to review three products for a campus housing office. For each she identifies the association model, the main risk, and a fix.

**Scenario A: earbuds.** Alice's new earbuds have no screen, so they pair with Just Works over LE Secure Connections. A passive recording reveals nothing, but an attacker in the middle during the few seconds of pairing would go unnoticed. The impact is limited to audio. Her advice: pair at home rather than in a crowded café, pair once, and remove the bond if the earbuds are lost.

**Scenario B: fitness band.** Bob's older band uses LE legacy pairing with Passkey Entry, and the vendor prints the same passkey, `123456`, in every manual. That is two problems: the static passkey makes impersonation easier, and legacy pairing lets anyone who recorded it compute the LTK and read Bob's health data. Her advice: install a firmware update that adds Secure Connections, if the vendor offers one. If not, pair only in private and treat the link as readable.

**Scenario C: smart lock.** The fictional `lockco.example` lock pairs with Just Works, lets any bonded phone unlock, and unlocks automatically when a bonded phone comes near. Alice finds three separate failures. Authentication is weak, because Just Works allows an attacker in the middle during setup. Authorization is missing, because bonding equals permission to unlock. Proximity is trusted, so a relay can open the door while the owner is across campus, if one attacker radio is near the owner's phone and another is near the door. Her advice addresses each layer separately:

1. Pair using OOB through an NFC tag mounted inside the door, so only someone already indoors can start pairing.
2. Require the owner to approve each phone in the app, grant each phone specific rights, and let any one phone be revoked.
3. Require a tap on an unlocked phone to open the door, and log every unlock.

| Scenario    | Association model        | Main risk                                  | Fix                                             |
| ----------- | ------------------------ | ------------------------------------------ | ----------------------------------------------- |
| Earbuds     | Just Works, Secure Conn. | Undetected attacker during pairing         | Pair in private; remove lost devices            |
| Fitness band | Legacy Passkey Entry    | Recorded pairing reveals the LTK           | Firmware with Secure Connections                |
| Smart lock  | Just Works               | Weak pairing, no authorization, relay      | OOB pairing, owner approval, user action        |

The pattern generalizes: name the layer each weakness lives in, because a fix at one layer rarely repairs another.

## Defenses

- **Use Secure Connections, and Secure Connections Only mode when every device supports it.** Limit: older devices may lose the ability to connect.
- **Choose an association model with protection against an adversary in the middle.** Prefer Numeric Comparison, Passkey Entry with a fresh random passkey, or OOB. Limit: devices with no screen or keyboard fall back to Just Works unless they offer OOB.
- **Pair rarely, briefly, and in private.** NIST recommends pairing as infrequently as possible, ideally in a physically secure area, and staying discoverable only for the minimum time. Limit: this relies on user habits.
- **Turn off what you do not use.** Disable unneeded profiles and services, and turn Bluetooth off when it is not needed. Limit: many accessories need it on constantly.
- **Authorize separately from pairing.** Give each paired device only the services it needs, and add application-level authorization for sensitive actions such as unlocking. Limit: it adds setup steps that vendors are tempted to skip.
- **Patch firmware and remove stale bonds.** Limit: cheap accessories may never receive updates.
- **Do not trust proximity alone.** Require user action or distance bounding for anything that unlocks or pays. Limit: precise ranging needs hardware support on both devices.

## Common misconceptions

- **"Short range means only people nearby can attack."** Antennas extend range, and a relay extends it as far as the attacker's link reaches.
- **"Encryption is on, so Just Works is fine."** Encryption with an unauthenticated key protects against eavesdroppers, not against an attacker who sits in the middle during pairing.
- **"Comparing the numbers is a formality."** It is the step that detects an adversary in the middle. Skipping it removes the protection.
- **"A paired device is a trusted device."** Pairing proves which device you connected to, not that it should read your contacts or open your door.
- **"Strong signal means the device is close."** Signal strength can be manufactured. Only timing or user action proves presence.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Use only your own devices, and never try to pair with or connect to anyone else's.

1. **Audit your bonds.** Open the Bluetooth settings on your own phone and laptop and list every remembered device. Remove any you no longer use or do not recognize.
2. **Watch a pairing prompt.** Pair two of your own devices that both have screens, such as a phone and a laptop. Record what you see: matching six-digit numbers on both (Numeric Comparison), a number to type (Passkey Entry), or no check at all (Just Works). Then pair a screenless accessory and compare.
3. **Spot the authorization questions.** When you pair a headset, car, or watch, note any separate prompts, such as access to contacts or notifications. Decide which ones the device actually needs.
4. **Threat-model on paper.** For a fictional campus building that unlocks doors with students' phones over BLE, choose the association model for enrollment, write who approves and revokes each phone, and explain how the design resists a relay attack.

## Key takeaways

- Pairing turns a key agreement into authentication only when a person or a second channel confirms the right two devices took part. Just Works skips that confirmation.
- LE legacy pairing should be considered broken against anyone who records it. LE Secure Connections stops passive eavesdropping, and the association model decides whether it also stops an attacker in the middle.
- Pairing answers "which device?" and never "what may it do?" Authorization needs its own controls.
- Relay attacks defeat proximity checks without breaking any cryptography. Only user action or precise timing proves presence.

## Go deeper

- Read the vulnerability table and threat list in Section 4 of [NIST SP 800-121 Rev. 2](https://csrc.nist.gov/pubs/sp/800/121/r2/upd1/final), and sort each item by the question it breaks: who, privacy, or permission.
- Usable security of pairing is an open research area: how do you pair two devices that have no screens, without asking users to perform a check they will skip?
- Distance bounding must also stop a dishonest device that answers before the challenge arrives in order to seem closer. Work out on paper why the challenge must be unpredictable for the timing to mean anything.
