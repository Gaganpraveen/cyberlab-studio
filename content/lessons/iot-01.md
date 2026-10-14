---
topicId: IOT-01
title: Wireless security fundamentals
summary: How Wi-Fi turns a shared radio channel into a protected link, what WPA2 and WPA3 actually authenticate, and which assumption offline guessing, evil twins, deauthentication, and KRACK each break.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Describe what an attacker within radio range can receive, transmit, replay, and impersonate, and explain how that changes the threat model compared with a wired network.
  - Trace the WPA2 four-way handshake and explain how it derives fresh session keys from a pairwise master key and two nonces.
  - Explain why a recorded WPA2-Personal handshake allows offline password guessing and how WPA3's SAE removes that option.
  - Match evil-twin, deauthentication, and key reinstallation attacks to the assumption each one breaks, and name a defense and its limit for each.
  - Audit your own router's Wi-Fi settings for WPA3, Protected Management Frames, and WPS.
prerequisites: [NET-01, NET-03, CRY-02, CRY-05]
concepts:
  - wpa2
  - wpa3
  - four-way-handshake
  - sae
  - protected-management-frames
  - evil-twin
  - deauthentication-attack
  - key-reinstallation-attack
  - wps
labs: []
keywords:
  - Wi-Fi
  - WLAN
  - IEEE 802.11
  - WPA2-Personal
  - WPA2-Enterprise
  - WPA3-Personal
  - WPA3-Enterprise
  - PSK
  - PMK
  - PTK
  - GTK
  - MIC
  - CCMP
  - SAE
  - Dragonfly
  - SAE-PK
  - Transition Disable
  - PMF
  - IEEE 802.11w
  - 802.1X
  - EAP
  - evil twin
  - rogue access point
  - CAPEC-615
  - CWE-300
  - deauthentication
  - KRACK
  - CVE-2017-13077
  - CWE-323
  - Dragonblood
  - CVE-2019-9494
  - WPS
  - CVE-2011-5053
  - Wi-Fi Enhanced Open
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 28: Wireless Local Networks: WPA2'
    url: https://textbook.cs161.org/network/wpa.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: Wi-Fi CERTIFIED WPA3 Technology Overview (January 2021)
    url: https://www.wi-fi.org/system/files/Wi-Fi_CERTIFIED_WPA3_Technology_Overview_202101.pdf
    publisher: Wi-Fi Alliance
    license: All rights reserved
  - title: WPA3 and Wi-Fi Enhanced Open Deployment and Implementation Guide, Version 1.1
    url: https://www.wi-fi.org/system/files/WPA3%20and%20Wi-Fi%20Enhanced%20Open%20Deployment%20Guide%20v1.1.pdf
    publisher: Wi-Fi Alliance
  - title: 'KRACK Attacks: Breaking WPA2 (Vanhoef and Piessens, ACM CCS 2017)'
    url: https://www.krackattacks.com/
    publisher: Mathy Vanhoef, imec-DistriNet, KU Leuven
  - title: 'Dragonblood: Analyzing the Dragonfly Handshake of WPA3 and EAP-pwd (Vanhoef and Ronen, IEEE S&P 2020)'
    url: https://wpa3.mathyvanhoef.com/
    publisher: Mathy Vanhoef and Eyal Ronen
  - title: 'VU#723755: WiFi Protected Setup (WPS) PIN brute force vulnerability'
    url: https://www.kb.cert.org/vuls/id/723755
    publisher: CERT Coordination Center, Carnegie Mellon University
quiz:
  - question: Mallory records the four-way handshake when bob's phone joins a WPA2-Personal network. Which change would stop her from testing password guesses offline against recordings like that one?
    choices:
      - Changing the passphrase to a different short dictionary word
      - Turning on MAC address filtering at the access point
      - Moving the network to WPA3-Personal (SAE) only mode
      - Enabling WPS PIN setup for new devices
    answer: 2
    explanation: The recording holds both nonces, both MAC addresses, and a MIC, so for each guess Mallory can derive the key and check the MIC with no access point involved. A new short word is just as guessable, MAC filtering does not touch the recording, and WPS adds a weakness. With SAE, a recorded exchange gives no offline test; every guess needs a live attempt the access point can notice.
  - question: A café prints its WPA2-Personal password on the menu. Against whom does Wi-Fi encryption protect alice's traffic there?
    choices:
      - Everyone, because each client gets its own session key
      - People who do not know the password, but not another customer who knows it and recorded her handshake
      - Nobody, because WPA2 does not encrypt data frames
      - Only the café owner, who manages the access point
    answer: 1
    explanation: The session key (PTK) is computed from the shared master key plus values sent in the clear. A customer who knows the password and captured alice's handshake can derive her PTK and decrypt her frames. Per-client keys help only against people who do not know the shared secret.
  - question: A network runs WPA2/WPA3 transition mode. Which attack does WPA3's Transition Disable indication defend against?
    choices:
      - A look-alike network that offers only WPA2, luring WPA3-capable clients into a handshake that can be attacked offline
      - Jamming of the radio channel by a nearby transmitter
      - Replaying message 3 of the four-way handshake to reset packet numbers
      - Guessing the eight-digit WPS PIN in two halves
    answer: 0
    explanation: Transition mode accepts WPA2 for older clients, so a twin can advertise WPA2 only and downgrade a WPA3 client. Transition Disable tells clients the network supports the stronger mode, and they then refuse the weaker one for that network. Jamming is physical, message 3 replay is KRACK (fixed by patching), and WPS is a separate setup feature.
  - question: When KRACK was published, bob suggested changing the home Wi-Fi password. Why would that not help?
    choices:
      - KRACK recovers any new password within minutes, so changing it buys nothing.
      - KRACK targets the router's administrator password, not the Wi-Fi password.
      - Changing the password helps only on WPA2-Enterprise networks.
      - KRACK never learns or uses the password; it makes a device reinstall a key and reuse nonces, so the fix is a software update.
    answer: 3
    explanation: The attack replays handshake messages so a key already in use is installed again, resetting the nonce. The password is irrelevant to that flaw, which is why the researchers stress that changing it neither prevents nor mitigates the attack. Patching clients and, where relevant, access points fixes it.
  - question: Which statement about Protected Management Frames (PMF) is correct?
    choices:
      - PMF prevents every denial-of-service attack on Wi-Fi, including jamming.
      - PMF lets associated devices detect and ignore forged deauthenticate and disassociate frames, but cannot stop radio jamming.
      - PMF hides the network name from devices that are not connected.
      - PMF is optional in WPA3-only networks.
    answer: 1
    explanation: PMF adds integrity protection to management frames once keys exist, so forged disconnect messages are ignored. Jamming attacks the radio itself, below any cryptography. WPA3 requires PMF; only transition mode leaves it merely capable so that older clients can join.
---

## Why it matters

Laptops, phones, and most smart devices reach the network over Wi-Fi. Attacking a wired network means reaching a cable or a switch port. Attacking a wireless one only means being within radio range, and the KRACK researchers note that special antennas can stretch that range to several miles in ideal conditions. Anyone nearby can receive every frame a device sends and can transmit frames that claim to come from the access point.

Wi-Fi security has needed repair several times. In 2011, CERT/CC reported that the PIN method of Wi-Fi Protected Setup falls to at most 11,000 guesses. In 2017, the KRACK attacks tricked WPA2 implementations into reusing nonces. In 2019, the Dragonblood research described downgrade paths and side-channel leaks affecting WPA3's password handshake. None of these was fixed by choosing a better password. Each broke an assumption that designers or implementers had treated as safe.

## The core idea

Wi-Fi security protects one hop: the radio link between a client device (a _station_) and an _access point_ (AP). Past the AP, frames cross the wired network with no Wi-Fi protection, so protection that must last from alice's laptop all the way to `bank.example` comes from [[tls|TLS]] or a [[vpn|VPN]].

The [[threat-model]] starts from what an attacker in radio range can do:

- **receive** every frame and record it for unhurried analysis later;
- **transmit** any frame, copying another device's hardware (MAC) address, the network name (SSID), or the AP's address;
- **replay** frames recorded earlier; and
- **jam** the channel. No cryptography prevents jamming, because it attacks the radio itself.

The basic model assumes the attacker lacks the network's secret, which fails on a café network whose password is printed on the menu.

A Wi-Fi security protocol therefore has four jobs: [[authentication|authenticate]] the client and the network to each other, derive fresh keys for every session, encrypt and integrity-protect every data frame, and reject replays. For each attack in this lesson, name the assumption it breaks:

| Attack                     | Assumption it breaks                               |
| -------------------------- | -------------------------------------------------- |
| Offline password guessing  | The shared secret is too hard to guess             |
| Evil twin                  | The network you joined is the one you meant        |
| Deauthentication           | Control messages really come from the access point |
| Key reinstallation (KRACK) | A [[nonce]] is never reused under the same key     |

## How it works

### Personal and Enterprise modes

[[wpa2|WPA2]] and [[wpa3|WPA3]] are Wi-Fi Alliance security certifications, each in two forms. In **Personal** mode everyone shares one passphrase. WPA2-Personal turns it into a pre-shared key (PSK) with PBKDF2, a deliberately slow [[key-derivation-function]] that also takes the network name as input, and the PSK serves as the _pairwise master key_ (PMK). In **Enterprise** mode each user logs in to an authentication server (IEEE 802.1X with EAP), typically over a TLS connection, and that login produces a fresh PMK for that user alone, which the server shares with the AP.

### The four-way handshake

The long-lived PMK never encrypts traffic directly. Each time a client joins, the [[four-way-handshake]] mixes it with fresh randomness, as the diagram shows.

```sequence
title: WPA2 four-way handshake (both sides already hold the PMK)
participant C as Client (alice-laptop)
participant AP as Access point
AP -> C: Message 1: ANonce
note C: Derive PTK from PMK, both nonces, both MACs
C -> AP: Message 2: SNonce + MIC
note AP: Derive the same PTK and check the MIC
AP -> C: Message 3: encrypted group key (GTK) + MIC
C -> AP: Message 4: acknowledgment
note: Both sides install keys; packet numbers start
```

The AP sends a random _ANonce_. The client picks an _SNonce_ and derives the _pairwise transient key_ (PTK) from the PMK, both nonces, and both MAC addresses. It returns the SNonce with a _message integrity code_ (MIC), Wi-Fi's name for a [[mac|message authentication code]], keyed with part of the PTK. The AP derives the same PTK, checks the MIC (proof that the client knows the PMK), and sends the encrypted _group temporal key_ (GTK) that all clients share for broadcast frames. After the acknowledgment, both sides install the keys.

Data frames are then protected with AES-CCMP, an [[aead|authenticated encryption]] scheme. Every frame carries a packet number that must never repeat under the same key, and the receiver drops any frame whose number is not higher than the last one it accepted, which defeats a simple [[replay-attack]].

### Why a recorded WPA2-Personal handshake is risky

Both nonces and both MAC addresses travel in the clear. The only secret input to the PTK is the PMK, which in Personal mode depends only on the passphrase and the network name. Two consequences follow:

1. **Offline guessing.** From a recording of messages 1 and 2, an attacker computes the PSK, PTK, and MIC for each candidate passphrase and compares. No AP is involved, so nothing limits the attempts except the cost of PBKDF2. This [[brute-force-attack]] beats passphrases with low [[entropy]], such as a common word plus a year.
2. **Insiders can decrypt.** Anyone who knows the passphrase and records another client's handshake can derive that client's PTK and read its traffic. On a café network with a posted password, WPA2 protects customers from passers-by, not from each other.

### SAE: what WPA3-Personal changes

WPA3-Personal replaces the PSK with [[sae|Simultaneous Authentication of Equals]] (SAE), a password-authenticated key exchange based on the Dragonfly handshake. Each side mixes the password with fresh secret randomness in a [[diffie-hellman]]-style exchange of _commit_ and _confirm_ messages, and the shared result becomes the PMK for the usual four-way handshake. Two properties follow:

- **No offline guessing.** According to the Wi-Fi Alliance, the only way to find the password is through repeated active attacks, each testing a single guess, which an AP can notice and throttle.
- **[[forward-secrecy|Forward secrecy]].** The PMK depends on per-session randomness, so learning the password later does not decrypt earlier recordings.

SAE does not stop online guessing of a weak password, and anyone who knows the password can still join.

### Management frames and deauthentication

Unless a network uses the protection described below, the deauthenticate and disassociate _management frames_ that end a connection carry no authentication, so anyone can forge a disconnect that appears to come from the AP. A [[deauthentication-attack]] uses such frames for [[dos-attack|denial of service]] or as a stepping stone: the reconnecting client hands the attacker a fresh handshake to record, or joins a look-alike network.

[[protected-management-frames|Protected Management Frames]] (PMF), based on the IEEE 802.11w amendment, integrity-protect these frames after association, so forged disconnects are detected and ignored. Every WPA3 connection uses PMF, and WPA3-only networks reject clients without it. PMF cannot stop jamming, though, and WPA2/WPA3 transition mode marks PMF only as "capable," so older clients may connect unprotected.

### Evil twins and downgrades

Any device can advertise any network name. An [[evil-twin]] copies a legitimate one so that devices join it, putting its operator in an [[adversary-in-the-middle]] position. How far it gets depends on the mode:

- **Open networks:** nothing distinguishes the real AP. Wi-Fi Enhanced Open encrypts password-free networks but does not authenticate them, so it does not help here.
- **WPA2-Personal:** anyone with the passphrase can run a twin that completes the handshake. Without it, a twin can still collect a client's half of a handshake and guess offline.
- **Enterprise:** a twin fails against clients that validate the authentication server's certificate (the deployment guide's protection against malicious networks) and succeeds against clients that skip the check.
- **WPA3 transition mode:** Dragonblood showed that a twin offering only WPA2 can lure a WPA3-capable client into a WPA2 handshake and reopen offline guessing. WPA3's _Transition Disable_ indication tells clients the network supports the stronger mode, so they refuse the weaker one from then on.
- **SAE-PK:** this optional WPA3 feature for public hotspots encodes a fingerprint of the AP's public key in the password. The AP proves it holds the private key with a [[digital-signature]], so a customer who knows the password still cannot impersonate the café.

### Key reinstallation (KRACK)

CCMP is safe only if a packet number never repeats under one key. The [[key-reinstallation-attack]] (KRACK) breaks that rule without learning any key. An attacker positioned between client and AP collects and replays retransmissions of message 3, and a vulnerable client reinstalls the PTK it is already using, resetting its packet number and replay counter. Reused nonces mean reused keystream, so the attacker can decrypt frames, and with TKIP or GCMP also forge them. Some Linux and Android versions even installed an all-zero key.

The handshake had formal security proofs. As the KRACK authors explain, those proofs covered key secrecy and message authenticity but did not model when a key is installed. Changing the password does nothing; software updates to clients and, for some features, access points fixed the flaw.

### Wi-Fi Protected Setup (WPS)

[[wps|WPS]] lets a device join by entering an eight-digit PIN. CERT/CC found that the AP's responses reveal whether the PIN's first half is right, and the last digit is a checksum, so at most 10^4 + 10^3 = 11,000 guesses are needed instead of 10^8. Many APs had no lockout, and a recovered PIN yields the network password. CERT/CC's workaround is to disable WPS.

## Worked example

The shop at `shop.example` runs a staff network named `shop-staff` on WPA2-Personal with the passphrase `Summer2026` and PMF disabled. Bob's phone is connected, and Mallory sits in the parking lot with a laptop. Alice maintains the network. She traces the flow below, in which a forged disconnect yields a recorded handshake, then reruns it against new settings.

```sequence
title: Forced reconnect on WPA2-Personal without PMF
participant M as Mallory (in range)
participant P as Bob's phone
participant AP as shop-staff AP
M -> P: Forged deauthenticate "from" the AP
note P: No PMF, so the phone accepts it and drops off
P -> AP: Rejoins: four-way handshake, messages 1 to 4
note M: Records the handshake from the air
note: Mallory tests passphrase guesses offline
note: After the switch to WPA3 with PMF required
M -x P: Forged deauthenticate is detected and ignored
```

**Step 1: List what the recording contains.** The ANonce, the SNonce, both MAC addresses, and the MICs. Only the PMK is missing, and it depends on nothing but `Summer2026` and `shop-staff`.

**Step 2: Judge the offline risk.** A season plus a year is exactly what guessing lists try early, and nothing limits Mallory's attempts, so Alice should assume it will fall.

**Step 3: Consider an insider.** If Mallory is a former employee who still knows the passphrase, Bob's recorded handshake lets her derive his PTK and decrypt his frames. On WPA2-Personal, rotating the passphrase when staff leave is a real control.

**Step 4: Reconfigure and rerun.** Alice switches to WPA3-Personal only mode with PMF required, sets a long random passphrase, and turns WPS off. Now the forged deauthenticate is ignored, a recorded SAE exchange gives Mallory nothing to test offline, and even someone who knows the passphrase cannot decrypt recorded sessions. That person can still join and attack from inside, for example with [[arp-spoofing]], so the passphrase still needs protecting.

**Step 5: Handle the leftovers.** An old receipt printer supports only WPA2. Rather than keep the whole network in transition mode, Alice gives the printer its own WPA2 network that can reach only the point-of-sale system.

| What Mallory has     | WPA2-Personal, no PMF                       | WPA3-Personal only, PMF required           |
| -------------------- | ------------------------------------------- | ------------------------------------------ |
| A radio in range     | Can force reconnects with forged frames     | Forged frames ignored; jamming still works |
| A recorded handshake | Can test passphrase guesses offline         | Cannot test guesses offline                |
| The passphrase       | Can decrypt other clients' recorded traffic | Can join, but cannot decrypt recordings    |

## Defenses

- **Use WPA3, and leave transition mode when you can.** The Wi-Fi Alliance deployment guide calls transition modes a stopgap until every client supports the stronger mode and does not allow them in the 6 GHz band. Limit: some older devices support only WPA2, so isolate them rather than weaken the whole network.
- **Require PMF.** It stops forged disconnects. Limit: it cannot stop jamming.
- **Use a long random passphrase and rotate it when people leave.** Online guessing, sharing, and WPA2 fallback remain even with SAE. A [[password-manager]] makes long passphrases practical.
- **Prefer Enterprise authentication in organizations.** Per-user credentials can be revoked one at a time, and WPA3-Enterprise offers a 192-bit mode for high-assurance networks. Limit: clients must validate the server's certificate and name, or a twin can harvest their login attempts.
- **Disable WPS.** CERT/CC knew of no practical fix for the PIN design. Limit: vendors label the setting differently (for example "router PIN" or "external registrar"), so check that it stays off.
- **Patch clients and access points.** KRACK and the Dragonblood findings were fixed in software; unpatched devices keep the flaws.
- **Do not rely on the link alone.** Use TLS or a VPN for sensitive traffic, and put guest and smart-home devices on their own network. That is [[defense-in-depth]] and [[network-segmentation]] applied to radio.

## Common misconceptions

- **"MAC address filtering keeps attackers off the network."** MAC addresses travel unencrypted in frame headers, and a device can be set to use any address, so filtering stops accidents, not attackers.
- **"Changing the Wi-Fi password fixes KRACK."** The attack never learns or uses the password. Only software updates fix it.
- **"WPA3 makes any password safe."** SAE stops offline guessing, but not online guessing, shared passwords, or a downgrade to WPA2 in transition mode.
- **"Wi-Fi encryption protects my data all the way to the website."** It covers only the radio hop. TLS protects the rest of the path.
- **"Enterprise Wi-Fi is immune to evil twins."** Only clients that validate the authentication server's certificate are protected.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

These tasks touch only settings you control, or use paper. Do not capture other people's traffic or transmit test frames.

1. **Audit your own router.** In its admin page or app (or with its owner), record the security modes offered (WPA2-Personal, WPA3-Personal, transition), the PMF options (often Disabled, Capable, Required), whether WPS is on, and the firmware version and any available update. If you do not use WPS, turn it off and recheck after a reboot. On networks you do not administer, such as a dorm network, change nothing.
2. **Check your devices.** On your own phone or laptop, note the security type reported for your home network. If every device supports WPA3, consider WPA3-only mode; otherwise, consider a separate network for the holdouts.
3. **Redraw the handshake.** From memory, draw the four messages. Circle each value sent in the clear, star each secret, and write what an eavesdropper who knows the passphrase can compute.
4. **Compare café designs.** For a fictional `cafe.example`, compare an open network, WPA2-Personal with the password on the menu, and WPA3-Personal with SAE-PK. For each, decide whether a customer who records the air can read another customer's traffic, and whether a customer can run a convincing twin.

## Key takeaways

- Wi-Fi protects one radio hop, where attackers can listen, transmit, replay, and jam, so it must authenticate both sides and make every session key fresh.
- A recorded WPA2-Personal handshake allows offline guessing, and anyone with the passphrase can decrypt sessions whose handshake they recorded. SAE removes both problems but cannot rescue a guessable or widely shared password.
- Evil twins exploit unauthenticated network names. Enterprise certificate validation, SAE-PK, and Transition Disable each close part of that gap.
- PMF stops forged disconnects, not jamming. KRACK shows that a proven design can still fail when its state machine lets a step repeat.
- Turn off WPS, patch clients and access points, and use TLS end to end.

## Go deeper

- The KRACK paper, "Key Reinstallation Attacks: Forcing Nonce Reuse in WPA2" (Vanhoef and Piessens, ACM CCS 2017), linked from [krackattacks.com](https://www.krackattacks.com/), argues that formal models must cover state such as key installation, not only message secrecy.
- The [Dragonblood paper](https://wpa3.mathyvanhoef.com/) (IEEE S&P 2020) shows how timing and cache side channels in SAE's password encoding can leak information about the password. Compare the Hash-to-Element method that IEEE 802.11-2020 added to SAE.
- Open question: SAE-PK works only if users get the password from a trustworthy place, such as a sign on the wall. How could a device authenticate a network it has never seen?
