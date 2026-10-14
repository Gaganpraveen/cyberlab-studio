---
topicId: SYS-07
title: Secure boot and platform trust
summary: Learn how a chain of trust runs from an immutable root of trust through firmware, bootloader and kernel, how secure boot (verify and block) differs from measured boot (measure and report) with a TPM, and how to trace who must sign, verify, revoke and update at each stage.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how a chain of trust extends from a root of trust through each boot stage, and what each stage checks before handing over control.
  - Distinguish secure boot from measured boot, and explain how a TPM's registers support sealing and remote attestation.
  - Trace, in a model of a boot chain, who signs each component, who verifies it, with which key, and what happens when a check fails.
  - Identify where platform trust breaks, including signed but vulnerable code, leaked keys, missing revocations, rollback and physical attacks.
  - Check the secure boot state of your own computer and interpret the result.
prerequisites: [CRY-01, CRY-04, SYS-05]
concepts: [secure-boot, root-of-trust, measured-boot, tpm]
labs: []
keywords:
  - secure boot
  - UEFI Secure Boot
  - verified boot
  - Android Verified Boot
  - AVB
  - dm-verity
  - trusted boot
  - measured boot
  - chain of trust
  - root of trust
  - RoT
  - TPM
  - Trusted Platform Module
  - PCR
  - platform configuration register
  - remote attestation
  - sealing
  - bootkit
  - platform key
  - KEK
  - db
  - dbx
  - rollback protection
  - NIST SP 800-193
  - platform firmware resiliency
sources:
  - title: 'NIST SP 800-193: Platform Firmware Resiliency Guidelines'
    url: https://csrc.nist.gov/pubs/sp/800/193/final
    publisher: National Institute of Standards and Technology
  - title: Secure the Windows boot process
    url: https://learn.microsoft.com/en-us/windows/security/operating-system-security/system-security/secure-the-windows-10-boot-process
    publisher: Microsoft
  - title: Windows Secure Boot Key Creation and Management Guidance
    url: https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/windows-secure-boot-key-creation-and-management-guidance
    publisher: Microsoft
  - title: Verified Boot (Android Open Source Project)
    url: https://source.android.com/docs/security/features/verifiedboot
    publisher: Android Open Source Project
  - title: 'Boot process for iPad and iPhone devices (Apple Platform Security)'
    url: https://support.apple.com/guide/security/boot-process-for-iphone-and-ipad-devices-secb3000f149/web
    publisher: Apple Inc.
  - title: 'MIT 6.5660 Computer Systems Security, Lecture 4: Trusted hardware (lecture notes)'
    url: https://css.csail.mit.edu/6.858/2026/lec/l04-tpm.txt
    publisher: Massachusetts Institute of Technology
    license: CC BY 3.0 US (course website license badge)
    sourceId: mit-6566-computer-systems-security
quiz:
  - question: Why must the first stage of a chain of trust, such as a boot ROM, be immutable or tightly protected?
    choices:
      - Read-only memory runs faster than flash memory, so boot is quicker.
      - The operating system verifies the boot ROM after it starts, so any change would be caught anyway.
      - Nothing runs before it to check it, so if an attacker could change it, it could approve anything and every later check would be subverted.
      - The TPM can only measure code stored in read-only memory.
    answer: 2
    explanation: The root of trust is trusted without verification. That is why NIST says roots of trust need to be secure by design, typically immutable, and why Apple calls its boot ROM "implicitly trusted." Everything after it inherits its trustworthiness.
  - question: A kiosk boots an older, genuinely signed bootloader that has a known flaw. Which statement is true?
    choices:
      - Secure boot rejects it, because firmware refuses all software older than the current version.
      - Secure boot accepts it unless its hash or certificate has been added to the forbidden database (dbx), but measured boot records a different hash, so remote attestation can flag the kiosk.
      - Measured boot blocks it, because the TPM refuses to extend unknown hashes.
      - Neither notices, because signatures cover only the kernel.
    answer: 1
    explanation: A signature proves who released the code and that it is unmodified, not that it is safe. Revocation through dbx, or rollback protection, is needed to refuse it. Measured boot never blocks, but the hash it records no longer matches the expected value.
  - question: Why can malware that starts after boot not simply erase the record of what booted?
    choices:
      - The TPM encrypts its records with the user's password.
      - The firmware removes the operating system's access to the disk.
      - Measured boot uploads the record to a server before the operating system runs.
      - Software can only extend a PCR, combining its old value with a new measurement through a hash, and PCRs reset only when the whole computer resets.
    answer: 3
    explanation: Extending computes a new value from the old one, so later software can add measurements but cannot steer a PCR back to the expected value without breaking the hash function. Only a full reset returns PCRs to zero, and then the boot is measured again from the start.
  - question: The kiosk maker's firmware-signing key leaks. Which response actually restores trust in the kiosks?
    choices:
      - Revoke the leaked key and move to a new one that the root of trust accepts, which works only if the root supports key revocation or rotation; otherwise the hardware must be replaced.
      - Re-flash the current firmware on every kiosk.
      - Ask the operating-system vendor to sign a new bootloader.
      - Turn on measured boot, which blocks firmware signed with a leaked key.
    answer: 0
    explanation: Anything signed with the leaked key will pass the boot ROM's check, so reinstalling good firmware does not stop an attacker from installing bad firmware later. Measurements are taken by the firmware itself, so malicious firmware can report good values. The key must be revoked at the root.
  - question: Confirm-SecureBootUEFI returns True on your laptop. What does that tell you?
    choices:
      - The laptop cannot be infected by malware.
      - The disk is encrypted with a key stored in the TPM.
      - The firmware enforces signature checks on boot components, but it says nothing about bugs in signed software, missing revocations or attacks after the operating system starts.
      - The TPM has verified the kernel.
    answer: 2
    explanation: True means Secure Boot is enabled on this UEFI computer. Its protection covers the boot path and depends on the trusted and revoked lists being current. Disk encryption, runtime security and the TPM are separate questions.
---

## Why it matters

The first code a computer runs controls everything after it. Malware that starts before the operating system, called a bootkit, can tamper with the kernel and the security software before they get a chance to look. Microsoft's guide to the Windows boot process puts it plainly: operating-system defenses "protect you only after Windows starts," and "bootkits specifically, are capable of starting before Windows." A boot-level [[rootkit]] survives reinstalling applications and hides from tools that run later.

Firmware is also a target for destruction. NIST SP 800-193, the federal guideline on platform firmware resiliency, warns that a successful attack on firmware "could render a system inoperable, perhaps permanently." It organizes its advice around three goals: protect firmware from unauthorized changes, detect changes that happen anyway, and recover rapidly and securely.

Platform trust is the set of mechanisms that let a device, and the people who rely on it, know that what booted is what was intended: a [[root-of-trust]], [[secure-boot]], [[measured-boot]] with a [[tpm]], and signed updates. Each mechanism passes trust from one component to the next. This lesson traces who verifies what, and where the chain can break.

## The core idea

State the assumptions first. An attacker may be able to write to the disk or to rewritable flash memory, for example with administrator rights, a malicious update or a few minutes with a USB stick. The attacker cannot change code in read-only memory or keys fixed into the chip, cannot forge a [[digital-signature]] without the private key, and does not have the signers' private keys. Real attacks on boot security break one of these assumptions.

A chain of trust works like a relay of inspections: each stage checks the next before handing over control, so trust flows forward one link at a time. The first link cannot be checked by anything before it, so it must be trustworthy by construction. NIST describes a root of trust as "typically just the first element in a Chain of Trust" and says roots "need to be secure by design." Apple's boot ROM is a concrete example: "This immutable code, known as the hardware root of trust, is laid down during chip fabrication and is implicitly trusted."

The chain can be used in two ways:

- **Secure boot** checks a signature at every link and refuses to run anything that fails. It enforces.
- **Measured boot** records a [[hash-function|hash]] of every link in a TPM (Trusted Platform Module) before running it. It blocks nothing, but the software it describes cannot erase the record, so the record can be checked later.

## How it works

### Who verifies whom

Names differ between platforms, but the shape of the chain is the same.

| Stage                    | Verified by                      | Using                                                       | If the check fails         |
| ------------------------ | -------------------------------- | ----------------------------------------------------------- | -------------------------- |
| Boot ROM                 | Nothing: it is the root of trust | Immutable code and a key fixed in the chip                  | Not applicable             |
| Bootloader               | Boot ROM or [[firmware]]         | The vendor's public key, or certificates in a firmware list | Not started; recovery mode |
| Kernel                   | Bootloader                       | The operating-system vendor's key                           | Not loaded                 |
| Drivers and system files | Kernel                           | A code-signing policy, or a hash tree over a partition      | Not loaded, or reads fail  |

Each platform fills in the details:

- **Apple.** The boot ROM "contains the Apple Root certificate authority (CA) public key" and verifies iBoot, which verifies the kernel, in a chain "in which each step checks that the next is signed by Apple." If a stage fails, the device stops in a recovery mode and must be restored from a computer. The Secure Enclave runs its own secure boot.
- **Windows on UEFI PCs.** The firmware starts the bootloader only if it was signed with a trusted certificate or a user manually approved it. Microsoft calls the next steps Trusted Boot: the bootloader verifies the kernel, and the kernel verifies the boot drivers and startup files, including an early-launch anti-malware driver that vets the remaining boot drivers.
- **Android.** Verified Boot "establishes a full chain of trust, starting from a hardware-protected root of trust to the bootloader," then to the boot partition and partitions such as `system` and `vendor`, which the dm-verity kernel feature checks as they are read. Since Android 7.0 the check is strict: a device that fails it does not boot.

### The UEFI keys

On PCs, the firmware keeps its trust decisions in four variables, which Linux users can list with `mokutil --pk`, `--kek`, `--db` and `--dbx` (see the [mokutil manual](https://manpages.ubuntu.com/manpages/noble/man1/mokutil.1.html)). Microsoft's key-management guidance describes them:

| Variable                 | What it holds                                                                          | Typically managed by     |
| ------------------------ | -------------------------------------------------------------------------------------- | ------------------------ |
| Platform key (PK)        | The key that ties the platform owner to the firmware; it authorizes changes to the KEK | The device maker         |
| Key exchange keys (KEK)  | Keys that authorize updates to db and dbx                                              | Operating-system vendors |
| Signature database (db)  | Certificates for trusted firmware components and operating-system loaders              | Updated with a KEK       |
| Forbidden database (dbx) | Hashes of malicious and vulnerable components, and compromised keys and certificates   | Updated with a KEK       |

Anything signed by any certificate in db will boot unless dbx forbids it, so db's size is part of the [[attack-surface]]. Microsoft notes that its third-party UEFI certificate authority "signs the bootloaders for all Linux distributions," so trusting it widens what can boot, and its Secured-core PCs distrust that authority by default.

### Measured boot and the TPM

A TPM holds platform configuration registers (PCRs). Software cannot write a PCR directly; it can only extend one, which replaces its value with the hash of the old value joined to a new measurement. The MIT 6.5660 lecture notes write this as `PCRn = SHA1(PCRn || m)` and add that PCR values "get reset to zero only when the entire computer is reset." Later software can add measurements, but it cannot steer a PCR back to an earlier value. Note that the TPM only stores what it is given: firmware and bootloaders take the measurements, so the first measuring code is part of the root of trust.

The record supports two uses:

- **Sealing.** The TPM encrypts a secret so that it is released only if the PCRs hold chosen values. Disk encryption uses this: the MIT notes describe BitLocker's key as sealed to a PCR measurement, so a machine booted from a different system cannot unseal it.
- **Remote attestation.** The TPM signs a report of its PCRs, called a quote, with a key that never leaves the chip, over a fresh [[nonce]] from the verifier so an old quote cannot be replayed. Microsoft describes a health server that reads the signed log and decides whether to grant the device access to "either a limited quarantine network or to the full network."

### Where the chain breaks

- **Signed but vulnerable.** A signature proves origin and integrity, not safety. An old signed component with a known flaw still verifies until it is listed in dbx. Android adds rollback protection, which "helps to prevent a possible exploit from becoming persistent," and NIST asks that update mechanisms prevent unauthorized updates to "an earlier authentic version."
- **Key compromise.** If a signing key leaks, attacker code becomes trusted. Microsoft's guidance favors keeping keys in a [[hardware-security-module]], warns against its test-key methods in production, and its logo test checks that "The PK is not a known, test PK."
- **Revocation lag.** A dbx update protects only devices that install it.
- **Settings.** On most PCs an administrator can turn Secure Boot off in the firmware setup screen.
- **Physical access.** The MIT notes list attacks on the "interconnect between CPU and TPM" and cases where a TPM "did not reset synchronously with the CPU." Their model assumes the adversary does not tamper with the CPU, the TPM or the link between them.
- **After boot.** Secure boot covers the boot path only. A later kernel exploit is outside its reach.

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

The activity: trace verification responsibilities in a model. shop.example runs self-checkout kiosks. A chip vendor makes the processor with its boot ROM, a kiosk maker writes the firmware, an operating-system vendor supplies the bootloader and kernel, shop.example writes the checkout app, and shop.example's IT team runs an attestation server, attest.shop.example.

**Step 1: list every verification arrow and its owners.**

| Component    | Signed by    | Verified by                  | Trust anchor               | Who revokes or updates                          |
| ------------ | ------------ | ---------------------------- | -------------------------- | ----------------------------------------------- |
| Boot ROM     | Not signed   | Nobody                       | Fixed in the chip          | Chip vendor; a flaw needs new hardware          |
| Firmware     | Kiosk maker  | Boot ROM                     | Key hash fixed in the chip | Kiosk maker, with signed, versioned updates     |
| Bootloader   | OS vendor    | Firmware                     | Certificate in db          | OS vendor publishes dbx entries; owner installs |
| Kernel       | OS vendor    | Bootloader                   | Key inside the bootloader  | OS vendor                                       |
| Checkout app | shop.example | Kernel's code-signing policy | shop.example's certificate | shop.example                                    |
| Boot record  | TPM          | attest.shop.example          | The TPM's attestation key  | shop.example IT keeps known-good values current |

**Step 2: add attestation.** Each morning, a kiosk proves what it booted before it may join the payment network.

```sequence
title: A kiosk proves what it booted
participant K as Kiosk firmware and OS
participant T as TPM
participant V as attest.shop.example
K -> T: Extend PCR with bootloader hash
K -> T: Extend PCR with kernel hash
V -> K: Challenge with a fresh nonce
K -> T: Quote PCRs over the nonce
T --> K: Quote signed by the TPM's key
K -> V: Quote and boot log
note V: Compare PCRs with known-good values
V --> K: Payment network, or quarantine
```

**Step 3: trace four failures through the model.**

1. mallory, a contractor with brief access to a kiosk's USB port, replaces the bootloader with a modified copy. The firmware's signature check fails, and the kiosk refuses to boot. The design works.
2. mallory instead installs an older, genuinely signed bootloader with a known flaw. Secure boot accepts it unless the operating-system vendor has published a dbx entry and shop.example has installed it. Measured boot records an unexpected hash, so attest.shop.example quarantines the kiosk, provided its known-good list is current.
3. The kiosk maker's firmware-signing key leaks. The boot ROM accepts attacker-signed firmware, and because firmware takes the measurements, malicious firmware can report the values a good one would. Attestation cannot help. Only revoking the key at the root restores trust, and if the boot ROM cannot revoke keys, the kiosks need new chips.
4. An administrator turns Secure Boot off to run an unsigned boot tool. Nothing stops the boot, but the unsigned code's hash differs, so attestation flags the kiosk.

**Step 4: draw conclusions.** Every arrow in the table needs a key that someone protects and a revocation path that someone operates. The weakest arrow here is the firmware key: the boot ROM trusts whatever it signs, and nothing later can detect its misuse, so the kiosk maker's key protection decides the security of every kiosk. Whoever owns each row should be named in a contract or a runbook.

## Defenses

NIST's three goals organize the defenses:

- **Protect.** Keep Secure Boot on and the firmware setup screen password-protected. Trust as few signers as the device needs, as Secured-core PCs do with the third-party authority. Vendors keep signing keys in hardware security modules and build rollback protection into updates. Limit: signature checks cannot catch a flawed component that a trusted signer signed.
- **Detect.** Use measured boot with remote attestation for fleets, and seal disk keys to PCRs. Limit: a verifier is only as good as its list of known-good values, and compromised firmware can lie about its own measurements.
- **Recover.** Keep a signed recovery path, as Apple's recovery mode and NIST's root of trust for recovery provide. Limit: recovery must itself refuse old vulnerable images.
- **Stay current.** Install firmware and dbx updates. Limit: revocations protect only devices that receive them.

## Common misconceptions

- **"Secure boot makes my computer malware-proof."** It checks the boot path. Malware that arrives after the operating system starts is a separate problem.
- **"The TPM checks the bootloader."** The TPM is passive. Firmware and loaders measure; the TPM records, seals and signs.
- **"Signed means safe."** A signature shows who released code and that nobody changed it. Vulnerable signed code needs revocation and rollback protection.
- **"Secure boot encrypts my disk."** Disk encryption is separate, although it can keep its key sealed in the TPM.
- **"Linux requires turning Secure Boot off."** Microsoft notes that its third-party certificate authority signs the bootloaders for Linux distributions, so they boot with Secure Boot on wherever the firmware trusts that authority.

## Try it yourself

1. Check your own secure boot state.
   - **Windows:** run `msinfo32` and read Secure Boot State under System Summary, or run [`Confirm-SecureBootUEFI`](https://learn.microsoft.com/en-us/powershell/module/secureboot/confirm-securebootuefi) in an administrator PowerShell. It returns `True` or `False`, or prints `Cmdlet not supported on this platform.` on a computer without UEFI Secure Boot.
   - **Linux:** run `mokutil --sb-state`, then `mokutil --db` and read who issued the certificates your firmware trusts.
   - **Mac or phone:** read how Apple's or Android's documentation, cited above, describes your device's chain.
2. Check for a TPM: on Windows run `tpm.msc`; on Linux run `ls /sys/class/tpm`, which lists `tpm0` if the kernel found one.
3. Run this toy model of measured boot. It uses SHA-256, but the extend rule is the same as in the MIT notes:

   ```python
   # pcr.py: a toy model of measured boot. Real TPMs do this in hardware.
   import hashlib

   def extend(pcr, component):
       measurement = hashlib.sha256(component).digest()   # measure the next stage
       return hashlib.sha256(pcr + measurement).digest()  # new = H(old || measurement)

   def boot(stages):
       pcr = bytes(32)                                    # PCRs start at zero on reset
       for stage in stages:
           pcr = extend(pcr, stage)
       return pcr.hex()[:16]                              # first 16 hex digits

   good = [b"firmware 1.4", b"bootloader 2.1", b"kernel 6.8"]
   print("expected:   ", boot(good))
   print("same again: ", boot(good))
   print("new kernel: ", boot([b"firmware 1.4", b"bootloader 2.1", b"kernel 6.9"]))
   print("reordered:  ", boot([b"bootloader 2.1", b"firmware 1.4", b"kernel 6.8"]))
   ```

   Run `python3 pcr.py`. The first two lines match, and changing one stage or the order changes the result. Explain why a bootkit that ran after the firmware could not make the final value match the expected one.
4. On paper, fill in Step 1's table for your own laptop or phone: who made the boot ROM and firmware, who signs your bootloader and kernel, where revocations come from, and when you last installed a firmware update.

## Key takeaways

- Trust flows forward: each boot stage verifies the next, starting from a root of trust that nothing verifies, so the root must be immutable or tightly protected.
- Secure boot enforces by refusing unsigned code; measured boot records hashes in TPM registers that can only be extended, which enables sealing and remote attestation.
- A signature proves origin, not safety, so revocation, rollback protection and key protection are part of the system, and each needs an owner.
- Platform trust covers the boot path and rests on stated assumptions about hardware and keys; it does not stop attacks after the operating system starts.

## Go deeper

- [NIST SP 800-193](https://csrc.nist.gov/pubs/sp/800/193/final) separates roots of trust for update, detection and recovery. Which of the three does your phone have, and which component provides each?
- The [MIT 6.5660 trusted-hardware notes](https://css.csail.mit.edu/6.858/2026/lec/l04-tpm.txt) discuss attacks on the link between processor and TPM. How would you change the kiosk design if mallory could open the case?
- Compare UEFI's key hierarchy with how devices verify updates in [Firmware update and signing](lesson:IOT-06). Where do rollback counters live in each, and who can reset them?
- Attestation needs a list of known-good measurements for every firmware and kernel version in a fleet. How would you build and maintain one, and what happens when it is wrong?
