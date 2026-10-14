---
topicId: IOT-06
title: Firmware update and signing
summary: How a device decides whether to install new firmware, using a signed manifest that answers whether an update is authentic, meant for this device, and newer than what it has, and how fallback images and well-guarded signing keys keep the update channel from becoming the easiest way to take over a device.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why firmware updates must be protected end to end, on the image and its manifest, rather than only by a secure download channel.
  - Trace the checks a device performs on a signed manifest and payload, and name the threat each check stops.
  - Distinguish an attacker's rollback to old, validly signed firmware from a vendor's authorized rollback, and explain how a monotonic sequence number allows one and blocks the other.
  - Evaluate an update workflow for failure recovery and signing-key protection.
prerequisites: [IOT-05, CRY-04, SYS-07]
concepts:
  - firmware
  - firmware-signing
  - ota-update
  - rollback-protection
labs: []
keywords:
  - firmware update
  - OTA
  - over-the-air update
  - signed firmware
  - manifest
  - SUIT
  - RFC 9019
  - RFC 9124
  - sequence number
  - anti-rollback
  - rollback attack
  - downgrade
  - A/B update
  - bootloader
  - trust anchor
  - signing key
  - NIST IR 8259A
sources:
  - title: 'RFC 9019: A Firmware Update Architecture for Internet of Things'
    url: https://www.rfc-editor.org/rfc/rfc9019.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9019-iot-firmware-update-architecture
  - title: 'RFC 9124: A Manifest Information Model for Firmware Updates in Internet of Things (IoT) Devices'
    url: https://www.rfc-editor.org/rfc/rfc9124.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'NIST IR 8259A: IoT Device Cybersecurity Capability Core Baseline'
    url: https://csrc.nist.gov/pubs/ir/8259/a/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259a
  - title: 'NIST IR 8259 Rev. 1: Foundational Cybersecurity Activities for IoT Product Manufacturers'
    url: https://csrc.nist.gov/pubs/ir/8259/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259
quiz:
  - question: A thermostat downloads its updates over HTTPS from a content delivery network. Why does it still need to verify a signature on the manifest?
    choices:
      - HTTPS hides the firmware version, so the device cannot tell which update it received.
      - HTTPS protects only the connection; a compromised mirror, cache, or update server could still serve a modified image, so the protection has to travel with the image and its manifest.
      - Signatures make the download faster.
      - It does not; HTTPS already proves who wrote the firmware.
    answer: 1
    explanation: Transport security authenticates the server at the other end of one connection, not the author of the bytes. RFC 9019 relies on protection applied to the manifest and image themselves, so the device can verify the author no matter how the update reached it.
  - question: An attacker replays CozyHome's genuine, validly signed manifest for firmware 2.1.0, which has a known flaw, to a thermostat running 2.4.1. Which check stops it?
    choices:
      - The signature check, because the attacker sent the manifest
      - The payload digest check
      - The device class check
      - The sequence number check, because the old manifest's number is lower than the one the device already accepted
    answer: 3
    explanation: The old manifest and image are authentic, so the signature and digest both verify. RFC 9124 calls this an old but valid manifest and requires devices to reject manifests whose sequence numbers are smaller than one already on the device.
  - question: CozyHome discovers that release 2.4.1 drains batteries and wants every thermostat back on 2.3.9. How can it do that without weakening rollback protection?
    choices:
      - Sign a new manifest for the 2.3.9 image with a sequence number higher than 2.4.1's.
      - Ask owners to reset the stored sequence number.
      - Re-send the original 2.3.9 manifest with its old sequence number.
      - Turn off signature checking for one week.
    answer: 0
    explanation: The sequence number orders the vendor's authorizations, not firmware versions. RFC 9124 notes that a version can be rolled back by issuing a new manifest for the old firmware with a later sequence number, which only the holder of the signing key can do.
  - question: Why does a device keep its previous firmware image until the new one has booted and passed a health check?
    choices:
      - To let users choose their favorite version
      - To speed up the download
      - So that a failed or interrupted update does not leave the device unable to run, since the bootloader can fall back to the old image
      - Because the signature check needs both images present
    answer: 2
    explanation: RFC 9019 requires that devices survive disruptions such as a power failure during an update and describes keeping the old image as a backup. A dual-slot design lets the bootloader return to a known-good image instead of bricking the device.
  - question: Which statement about a valid signature on a firmware image is correct?
    choices:
      - It proves the image contains no vulnerabilities.
      - It proves who authorized the image and that the image was not modified afterward, but not that the image is safe or newer.
      - It proves the image was downloaded over a secure channel.
      - It proves the device's owner approved the update.
    answer: 1
    explanation: A signature binds the image to the signing key. If the vendor's build or signing process is compromised, malicious code can carry a valid signature, and a genuine old image remains validly signed forever, which is why devices also check sequence numbers.
---

## Why it matters

Every device ships with bugs, so every device needs a way to receive fixes. NIST's baseline of IoT device capabilities includes software update for exactly this reason. The update channel is also the most powerful interface a device has. RFC 9124, the IETF's model for firmware update manifests, puts it bluntly: an attacker who can install their own firmware "has complete control of the device." That control can survive reboots and factory resets, because the attacker's code is now the device's code.

Updates also fail in ordinary ways. Power drops halfway through writing flash, a download is truncated, or a new release crashes on hardware the vendor did not test. RFC 9019, the IETF's architecture for IoT firmware updates, states that devices "must not fail when a disruption, such as a power failure" occurs during an update. A secure update design has to stop attackers and survive accidents at the same time.

## The core idea

A device has to answer two separate questions about any update: can I get the bytes, and should I run them? Delivery, through an update server, a content delivery network, or a phone app relaying the file over Bluetooth, answers the first. Only cryptography should answer the second.

The tool is a signed _manifest_: a small document that describes a [[firmware]] image and that the vendor signs with a private key. RFC 9019 explains that "the manifest contains metadata about the firmware image" and is "protected against modification." The device holds a matching public key, a _trust anchor_, installed before any update arrives. Because the protection is attached to the manifest and image themselves, the security does not depend on the path the bytes took. RFC 9019 calls these "end-to-end security mechanisms."

With a verified manifest in hand, the device asks four questions, and the manifest fields from RFC 9124 answer them:

| Question                         | Manifest field                        | Threat it stops (RFC 9124 name)                            |
| -------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| Is it authentic?                 | Signature                             | Attacker-built firmware (THREAT.IMG.NON_AUTH)              |
| Is it for me?                    | Vendor ID and class ID                | Valid firmware for the wrong device (THREAT.IMG.INCOMPATIBLE) |
| Is it newer than what I trust?   | Monotonic sequence number             | Old but valid manifest and firmware (THREAT.IMG.EXPIRED)   |
| Is this the image described?     | Payload digest and size               | An image swapped or corrupted after signing                 |

Two more questions sit outside the manifest: will the device survive if the new image fails, and is the signing key itself safe?

## How it works

### Verifying the manifest and the payload

In the IETF design, [[firmware-signing]] covers the manifest rather than the image directly. The manifest carries a cryptographic [[hash-function|hash]] of the image, called the payload digest, along with its size. Verifying the signature authenticates the manifest; recomputing the digest over the downloaded image ties the image to that authenticated manifest. RFC 9124 makes the signature, the sequence number, the payload digest, and the size required elements, and recommends vendor and class identifiers. Its requirement is simple: "Devices MUST only apply firmware that is intended for them."

The order of checks matters. The device should verify the signature before acting on any other field, because until then every field is attacker-controlled input. Only after the signature verifies does it compare the class, the sequence number, and finally the digest of the downloaded payload. An [[ota-update|over-the-air update]] that skips any one of these checks reopens the threat that check was meant to stop.

The trust anchor deserves the same care as the checks. RFC 9019 says a trust anchor store "must resist modification against unauthorized insertion, deletion, and modification." If an attacker can add their own public key to the device, they can sign anything.

### Rollback: refusing old updates without trapping the device

A signature cannot stop one attack. Suppose firmware 2.1.0 had a serious flaw that 2.4.1 fixed. The 2.1.0 manifest and image are genuine, and they verify perfectly. An attacker who replays them could reinstall the flaw. RFC 9124 lists this threat as an attacker who "sends an old, but valid, manifest with an old, but valid, firmware image to a device."

[[rollback-protection|Rollback protection]] stops it with a counter. Every manifest carries a sequence number that only increases, the device remembers the highest one it has accepted, and it must "reject manifests with sequence numbers smaller than any onboard sequence number." This is the firmware version of the freshness checks that stop a [[replay-attack]].

Vendors sometimes need to go back on purpose, for example when a release turns out to be broken. NIST's baseline lists the ability to roll back to a previous version, by authorized entities, as part of the update capability. RFC 9124 reconciles the two needs with one observation about the sequence number: "This is not a firmware version field." It orders the vendor's authorizations, not the firmware's age. "A firmware version may be rolled back by creating a new manifest for the old firmware version with a later sequence number." The vendor can deliberately re-release old firmware under a fresh signature; an attacker without the signing key cannot.

The stored counter must resist tampering just like the trust anchor. If an attacker can reset it, rollback protection disappears.

### Surviving a failed update

RFC 9019 states that "an IoT device needs a recovery strategy in case the firmware update/invocation process fails." One option RFC 9019 describes is a second firmware slot. The device writes the new image to the inactive slot, the bootloader verifies it and boots it, and the old image stays "on the device as a backup" until the new one proves itself. If the new image fails to boot or fails a health check, the bootloader selects the old one. This works hand in hand with [[secure-boot]], which checks the image again at every startup against a [[root-of-trust]], so an image that was tampered with in flash after installation is caught too.

Fallback and rollback protection interact. One way to reconcile them is to commit the new sequence number only after the new image boots and passes its health check, so a failed update can still return to the previous image.

### Guarding the signing key

Everything above rests on one private key. RFC 9124 lists key exposure as a threat and recommends that signing keys "be stored in a manner that is inaccessible to networked devices." Ways to meet it include keeping the key in a [[hardware-security-module]], requiring approval before anything is signed, and planning how to rotate keys and replace trust anchors on devices if a key is ever compromised.

A signature proves who authorized an image, not that the image is safe. If attackers compromise the vendor's build system, their code is signed along with everything else, which is why firmware signing is one part of securing the [[software-supply-chain]], not all of it.

## Worked example

CozyHome's CozyTherm T2 (from lesson IOT-05) runs firmware 2.4.1 and has accepted manifests up to sequence number 42. Alice validates the update workflow on a toy model before CozyHome ships it. A manifest looks like this:

```json
{
  "manifest_version": 1,
  "sequence_number": 42,
  "vendor_id": "cozyhome.example",
  "class_id": "cozyhome.example/cozytherm-t2",
  "firmware_version": "2.4.1",
  "size": 482304,
  "payload_sha256": "<64 hex digits of the image's SHA-256 digest>",
  "payload_uri": "https://updates.cozyhome.example/t2/2.4.1.bin"
}
```

Her toy verifier performs the checks in order and refuses at the first failure:

```python
import hashlib
import hmac
import json

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

DEVICE_CLASS = "cozyhome.example/cozytherm-t2"


def check_update(manifest_bytes: bytes, signature: bytes, payload: bytes,
                 trust_anchor: Ed25519PublicKey, stored_sequence: int) -> dict:
    # 1. Authentic? Nothing in the manifest is trusted before this passes.
    try:
        trust_anchor.verify(signature, manifest_bytes)
    except InvalidSignature:
        raise ValueError("rejected: signature does not verify") from None
    manifest = json.loads(manifest_bytes)
    # 2. Meant for this kind of device?
    if manifest["class_id"] != DEVICE_CLASS:
        raise ValueError("rejected: firmware is for another device class")
    # 3. A newer authorization than any already accepted?
    if manifest["sequence_number"] <= stored_sequence:
        raise ValueError("rejected: sequence number is not newer")
    # 4. Exactly the image the manifest describes?
    if len(payload) != manifest["size"]:
        raise ValueError("rejected: payload size mismatch")
    digest = hashlib.sha256(payload).hexdigest()
    if not hmac.compare_digest(digest, manifest["payload_sha256"]):
        raise ValueError("rejected: payload digest mismatch")
    return manifest  # caller writes the payload to the inactive slot
```

The toy leaves out parts of a real design, such as expiration times, delta updates, and key rotation, but it captures the decision. Alice runs five candidate updates through it, each against a T2 that has accepted sequence 42:

| Candidate                                                            | Result   | Stopped by          |
| -------------------------------------------------------------------- | -------- | ------------------- |
| 2.5.0, sequence 43, T2 class, correct digest, valid signature        | Accepted | None                |
| The genuine 2.1.0 manifest, sequence 37, replayed by mallory         | Rejected | Sequence check      |
| Genuine manifest for the T3 model, sequence 51                       | Rejected | Class check         |
| The genuine 2.5.0 manifest, but the mirror serves a modified image   | Rejected | Digest check        |
| Manifest edited by mallory to claim sequence 99                      | Rejected | Signature check     |

**Step 1: Install the good update.** The 2.5.0 manifest passes all four checks. The thermostat writes the image to its inactive slot and reboots into it, and the bootloader verifies it again.

```sequence
title: Installing a signed update with fallback
participant S as updates.cozyhome.example
participant T as CozyTherm T2
participant B as T2 bootloader
S -> T: Manifest (sequence 43) and signature
note T: Verify signature, class, and sequence first
T -> S: Fetch the payload named in the manifest
S --> T: Firmware image 2.5.0
note T: Check size and SHA-256 digest
T -> B: Image written to slot B; reboot into it
B --> T: Image re-verified; 2.5.0 running
note T: Health check passes; commit sequence 43
note B: If the health check fails, boot slot A again
```

**Step 2: Check the rejections.** Each rejected candidate fails at a different check, and each check maps to one row of the threat table. The edited manifest fails the very first check, because changing any byte breaks the signature, so mallory's claimed sequence number is never even read.

**Step 3: Test an authorized rollback.** CozyHome finds that 2.5.0 drains batteries and decides to return the fleet to 2.4.1. Re-sending the old 2.4.1 manifest (sequence 42) fails the sequence check, as it should. Instead, CozyHome signs a new manifest for the 2.4.1 image with sequence 44. It passes every check, and the fleet rolls back without weakening rollback protection.

**Step 4: Review the key.** The signing key lives in an HSM at CozyHome, and two engineers must approve each release. Alice adds one finding: the T2 has no documented way to replace its trust anchor, so a compromised key would leave every unit trusting the attacker. CozyHome adds a signed trust-anchor update to the design.

## Defenses

- **Sign manifests and verify them on the device before installing.** Limit: a signature proves origin and integrity, not quality.
- **Check the device class and refuse older sequence numbers.** Limit: the stored counter and trust anchor must resist tampering, or an attacker with physical access can reset them.
- **Keep a fallback image and commit only after a health check.** Limit: two slots need more flash memory, which adds cost.
- **Verify again at boot.** Secure boot catches images modified after installation. Limit: it depends on a root of trust that cannot itself be updated by an attacker.
- **Protect and rotate signing keys.** Use an HSM, require approval for each signature, and give devices a way to replace trust anchors. Limit: an insider with signing rights can still sign a malicious image.
- **Deliver over TLS as well.** Transport security adds privacy and blocks some interference. Limit: it protects one connection, not the image, so it complements signatures rather than replacing them.
- **Plan support honestly.** NIST's guidance for manufacturers asks them to consider "how readily software updates can be reverted if a problem occurs." Limit: plans need testing on real failure cases.

## Common misconceptions

- **"Downloading over HTTPS makes the update safe."** HTTPS authenticates a server, not the author of the image. The manifest signature does that.
- **"A signed update is a safe update."** Old images stay validly signed forever, and a compromised build system produces signed malware.
- **"Rollback protection means we can never go back."** A vendor rolls back by signing a new manifest for the old image with a higher sequence number.
- **"The firmware version number prevents rollback."** Versions describe the software; the sequence number orders authorizations, and only the latter is enforced.
- **"If an update fails, the user can just reinstall it."** Many devices have no screen or recovery menu, so the device itself must be able to fall back.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Use only your own devices and made-up data. Do not modify or reflash any device's firmware.

1. **Check your own devices.** For your phone, home router, or another connected device you own, find the update settings. Note whether updates install automatically, when the last one arrived, and whether the vendor publishes release notes.
2. **Run the verifier on paper.** The T2 has accepted sequence 44. Decide what alice's verifier does with each candidate, and which check stops it: (a) firmware 2.6.0 with sequence 40 and a valid signature; (b) sequence 45 for the T2 with no signature; (c) sequence 45 for the T2, valid signature, correct size, wrong digest; (d) sequence 46 for the T2 with every field correct.
3. **Extend the toy (optional).** If you know Python, add an expiration time to the manifest and reject expired manifests. Run it only on your own computer with keys and images you generate yourself.
4. **Design question.** Where should the T2 store its sequence counter and trust anchor, and what could an attacker with the device on their workbench do if those were ordinary flash memory? Compare your answer with lesson IOT-08.

## Key takeaways

- The update channel is the most powerful interface on a device, so the device, not the network, must decide whether to run an image.
- A signed manifest lets the device check that an update is authentic, meant for it, newer than what it trusts, and exactly the image described.
- Monotonic sequence numbers block replays of old, valid firmware while still letting the vendor roll back by signing a new manifest.
- Fallback images and verification at boot keep failed or tampered updates from bricking or capturing the device.
- Everything depends on the signing key: guard it in hardware, require approvals, and plan how devices will replace a compromised trust anchor.

## Go deeper

- [RFC 9019](https://www.rfc-editor.org/rfc/rfc9019.html) describes the roles in an update system, from the author who creates an image to the firmware consumer on the device. Map each role to a person or system at CozyHome, and decide which compromise would hurt most.
- [RFC 9124](https://www.rfc-editor.org/rfc/rfc9124.html) lists threats and requirements in detail. Pick two threats this lesson did not cover, such as unapproved updates or manifest overrides, and explain how you would test for each.
- Open question: a device that has been offline for two years comes back online. Its stored sequence number is far behind, and its trust anchor may have been rotated. How should it catch up safely?
