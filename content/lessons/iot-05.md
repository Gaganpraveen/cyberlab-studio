---
topicId: IOT-05
title: IoT device identity and lifecycle
summary: How a connected device gets a unique, provable identity at the factory, becomes bound to an owner at setup, stays trustworthy through updates, and is safely handed over or retired, and why skipping any one of these steps leaves a device that someone else can control.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish a device identifier from a device credential, and explain why unique per-device credentials matter more than secret serial numbers or shared defaults.
  - Describe how onboarding turns a manufacturer-issued identity into an owner-bound one, and what proof of possession the owner should supply.
  - Model a device's lifecycle from manufacture through onboarding, operation, transfer, and retirement, stating which credentials and data are created or destroyed at each step.
  - Evaluate a resale or disposal plan for gaps that leave the previous owner, or the next one, with access they should not have.
prerequisites: [FND-02, CRY-04, IAM-02]
concepts:
  - iot-device
  - device-onboarding
  - default-credentials
labs: []
keywords:
  - IoT
  - Internet of Things
  - device identity
  - provisioning
  - onboarding
  - default password
  - factory reset
  - decommissioning
  - end of support
  - support period
  - NIST IR 8259
  - NIST IR 8259A
  - ETSI EN 303 645
  - Mirai
sources:
  - title: 'NIST IR 8259 Rev. 1: Foundational Cybersecurity Activities for IoT Product Manufacturers'
    url: https://csrc.nist.gov/pubs/ir/8259/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259
  - title: 'NIST IR 8259A: IoT Device Cybersecurity Capability Core Baseline'
    url: https://csrc.nist.gov/pubs/ir/8259/a/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-ir-8259a
  - title: 'Understanding the Mirai Botnet (Antonakakis et al., USENIX Security 2017)'
    url: https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/antonakakis
    publisher: USENIX Association
  - title: 'ETSI EN 303 645 V3.1.3 (2024-09): Cyber Security for Consumer Internet of Things: Baseline Requirements'
    url: https://www.etsi.org/deliver/etsi_en/303600_303699/303645/03.01.03_60/en_303645v030103p.pdf
    publisher: European Telecommunications Standards Institute (ETSI)
    license: All rights reserved
quiz:
  - question: Which of these lets a thermostat prove that it really is the unit with serial number 0042?
    choices:
      - The serial number printed on its label
      - The network hardware (MAC) address it broadcasts
      - A private key, held only by that unit, whose public key the manufacturer certified for serial 0042
      - The model number shown in the companion app
    answer: 2
    explanation: The serial number, MAC address, and model number are identifiers. They are public, so anyone can copy them. Only a secret that the device alone holds, checked against a certificate the manufacturer signed, proves that the device owns the identifier.
  - question: A camera model ships with the same administrator password on every unit. Why is this worse than giving each unit a different weak password?
    choices:
      - One leak of the shared password opens every unit whose owner never changed it, so an attack scales across the whole product line.
      - Shared passwords are always shorter than unique ones.
      - The camera cannot connect to Wi-Fi while it uses a default password.
      - It is not worse; both cases are equally easy to attack at scale.
    answer: 0
    explanation: A shared default turns one discovery into access to every unchanged unit, and automated scanners can find those units across the internet. Unique per-unit passwords still need to be strong, but an attacker who guesses one learns nothing about the others.
  - question: Why does a good onboarding design ask the owner to scan a claim code printed inside the device's battery cover?
    choices:
      - The code encrypts the home Wi-Fi password.
      - The code replaces the device's factory certificate.
      - The code lets the device skip software updates during setup.
      - The code shows that the person claiming the device has physical access to it, so a remote attacker cannot claim it first.
    answer: 3
    explanation: The factory certificate proves what the device is; the claim code proves who is holding it. Requiring both, within a short setup window, binds the device to the person who actually has it.
  - question: Bob factory-resets his thermostat before selling it but forgets to remove it from his account. Which design keeps him from controlling it after the sale?
    choices:
      - Hide the device from bob's app once it goes offline for a day.
      - Accept a new owner's claim only after a fresh reset, and revoke the previous account binding and operational credential when that claim succeeds.
      - Let the device accept commands from any account that has ever owned it.
      - Ask the buyer to change the device's serial number.
    answer: 1
    explanation: Transfer has a device side and a service side. Tying the new claim to a fresh reset, and revoking the old binding when the claim succeeds, completes the service side even when the seller forgets.
  - question: During a factory reset before resale, which item should the thermostat keep?
    choices:
      - The previous owner's Wi-Fi password
      - The previous owner's schedule and occupancy history
      - Its factory key pair and the manufacturer's certificate for it
      - The operational credential issued to the previous owner's deployment
    answer: 2
    explanation: The factory identity belongs to the device, not to any owner, and the next owner needs it to onboard. Everything tied to the previous owner, including data, network secrets, and the operational credential, must be erased.
---

## Why it matters

A smart thermostat, a doorbell camera, or a classroom projector is a small computer that joins a network and then runs for years with nobody watching it. NIST observes that IoT products are "frequently expected to be in service for decades." Over that span a device is set up, updated, perhaps sold, and eventually thrown away, and each of those moments changes who should be able to control it. Most of them happen once, often on a device with no screen or keyboard, so mistakes go unnoticed.

The damage is not limited to the owner. In late 2016 the Mirai botnet, made up mostly of embedded and IoT devices, grew to a peak of about 600,000 infections. The researchers who studied it stressed how simply those devices were infected, and warned that "novice malicious techniques can compromise enough low-end devices to threaten even some of the best-defended targets." A device whose secret is the same as every other unit off the production line is exactly that kind of target: whoever learns the shared secret controls them all.

## The core idea

An [[iot-device|IoT device]] needs answers to three questions throughout its life:

1. **What is this device?** A model, a unique serial number, and a secret that proves the device really is that unit.
2. **Who may control it?** The owner, established at setup and changed at resale or retirement.
3. **Is it still trustworthy?** Whether its software is current and still supported.

The first question hides an important distinction. An _identifier_ is a name, such as a serial number or a network hardware address, that is printed on the box or broadcast on the network. A _credential_ is a secret, such as a private key, that only the device holds and that lets it prove it owns the identifier. NIST's baseline of device capabilities starts here: the device "can be uniquely identified logically and physically." Identifiers are public by design; only a credential makes impersonation hard.

[[default-credentials|Default credentials]] break the second question. If every unit ships with the same administrator password, ownership belongs to whoever logs in first, and that may be a [[botnet]] scanning the internet. The European consumer IoT standard ETSI EN 303 645 (version 3.1.3, 2024) titles its first group of security provisions "No universal default passwords" and requires that "all consumer IoT device passwords shall be unique per device or defined by the user."

The lifecycle ties the answers together:

| Stage       | What should change                                     | What goes wrong if it is skipped                         |
| ----------- | ------------------------------------------------------ | -------------------------------------------------------- |
| Manufacture | The unit gets its own key pair and factory certificate | Shared secrets: one leak compromises every unit          |
| Onboarding  | The device is bound to an owner and a network          | Someone else claims the device first                     |
| Operation   | Software is updated; security state is reported        | Known flaws stay exploitable                             |
| Transfer    | The old owner's access ends; the new owner's begins    | The previous owner can still control or watch the device |
| Retirement  | Owner data and credentials are erased; support ends    | Data leaks from discarded devices; unpatched units linger |

## How it works

### Identity at manufacture

The strongest pattern gives each unit its own key pair, generated inside the device, ideally inside a [[secure-element]] so the private key never leaves the chip. The manufacturer then signs a [[certificate]] that binds the public key to the unit's serial number. Anyone who trusts the manufacturer's [[certificate-authority]] can send the device a fresh challenge, check the signature that comes back, and know they are talking to serial 0042 rather than a copy.

The weak pattern is a secret shared by every unit: the same password, the same API key, or the same private key baked into the firmware image. Extract it from one device, perhaps by reading its flash memory, and you can impersonate every device of that model. Per-device keys turn that into a much smaller loss: one stolen key exposes one unit, whose certificate the manufacturer can revoke.

### Onboarding: from identity to ownership

The factory identity says what a device is, not whom it belongs to. [[device-onboarding|Device onboarding]], often called provisioning, creates that binding. A sound design asks the device to prove its identity with its factory credential, and asks the would-be owner to prove physical possession, for example by scanning a claim code printed inside the battery cover.

```sequence
title: Onboarding a thermostat with proof of possession
participant P as bob's phone app
participant T as CozyTherm T2
participant C as cloud.cozyhome.example
note T: Setup mode stays open for 10 minutes after the button press
P -> T: Home Wi-Fi details, over a short-range setup link
T -> C: I am serial 0042 (proved with the factory key)
C --> T: Factory certificate valid; waiting for a claim
P -> C: Claim serial 0042 with the code from inside the cover
C --> P: Device bound to bob's account
C -> T: Operational credential for this deployment
note C: A second claim for serial 0042 is refused while bob owns it
```

The device now holds two credentials with different jobs. The factory credential says "I am unit 0042, made by CozyHome" and never changes. The operational credential says "I am bob's thermostat" and lasts only as long as bob owns it.

Setup is also a window of exposure. A device whose setup link stays open indefinitely lets anyone in radio range try to configure it, so the setup mode should open only after a physical action, such as a button press, and close on a timer.

### Operation: updates and state

Once deployed, a device is only as trustworthy as its software. NIST's baseline says the device's software "can be updated by authorized entities only using a secure and configurable mechanism," and among the elements of that capability is the ability to "verify and authenticate any update before installing it." An [[ota-update|over-the-air (OTA) update]] channel that checks a signature before installing is the usual way to meet it, and lesson IOT-06 covers how. The same baseline asks that a device be able to report its cybersecurity state to authorized entities, so its owner can tell whether it needs attention.

How long updates continue is a decision the manufacturer makes before the product is sold. NIST IR 8259 Rev. 1, its guidance for manufacturers, asks them to work out expectations about product lifespan and to communicate "lifespan and support expectations" to customers. ETSI EN 303 645 makes this a requirement for consumer devices: "The manufacturer shall publish, in an accessible way that is clear and transparent to the user, the defined support period."

### Transfer and retirement

A change of owner has two sides, and both must happen:

- **On the device,** a factory reset erases the owner's data (schedules, occupancy history, the Wi-Fi password) and the operational credential, but keeps the factory identity so the next owner can onboard it.
- **In the service,** the binding to the old owner's account is removed and the old operational credential is revoked, the device equivalent of [[deprovisioning]] a departing employee.

If only the device side happens, the service may still tie the serial number to the old owner's account, so once the new owner brings the device back online, the old owner may be able to see or control it. If only the service side happens, the next owner may read the previous owner's data off the device. NIST lists data protection "throughout the lifecycle including at disposal" among customers' needs, and ETSI EN 303 645 requires that users be able to erase their data from a consumer device "in a simple manner."

End of support is a lifecycle event as well. NIST notes that some software components may stop being maintained, "creating an end-of-life for the IoT product," even though the device's basic function may continue. A thermostat that still heats the house but no longer receives security fixes should be replaced or, at minimum, moved to an isolated part of the network through [[network-segmentation]].

## Worked example

CozyHome sells the fictional CozyTherm T2 thermostat through `cozyhome.example`. Alice, a security engineer, reviews the design by modeling the lifecycle as a set of transitions. For each one she records who authorizes it, which credentials are created or destroyed, and which data must be erased:

```yaml
# Lifecycle model for the fictional CozyTherm T2 (cozyhome.example)
manufacture:
  authorized_by: CozyHome factory station
  creates: [device key pair inside the secure element, factory certificate for the serial]
  forbids: [shared passwords, shared keys in the firmware image]
onboard:
  authorized_by: holder of the claim code, during a 10-minute setup window
  creates: [account binding, operational credential, home Wi-Fi settings]
update:
  authorized_by: CozyHome release signing key
  requires: [signature verified on the device before install]
transfer:
  authorized_by: current owner (release in the app) or physical reset plus a new claim
  destroys: [account binding, operational credential, schedules, occupancy history, Wi-Fi settings]
  keeps: [device key pair, factory certificate]
retire:
  authorized_by: owner
  destroys: [everything listed under transfer]
  informs: [end-of-support date published at sale]
```

**Step 1: Check identity.** Alice confirms that each unit generates its key pair inside its secure element at the factory and that the firmware image contains no shared secrets. She asks what an attacker gains by extracting one unit's key: the ability to impersonate that single serial number, which CozyHome can revoke, and nothing about any other unit.

**Step 2: Check onboarding.** Claiming requires the code inside the battery cover, so a remote attacker cannot claim a device. The setup window closes after 10 minutes, and a second claim for a serial that already has an owner is refused unless the device reports a fresh factory reset, so nobody can pull a thermostat out of its owner's account from afar.

**Step 3: Trace the transfer path.** Bob sells his T2 online. Alice traces the two mistakes he might make. If bob resets the thermostat but forgets to release it in the app, the buyer's claim, accepted only after the reset, replaces bob's binding and revokes his operational credential, so bob loses access automatically. If bob releases it in the app but forgets to reset it, the service queues a wipe that the thermostat performs when it next connects, and refuses a new claim until the wipe is confirmed. Either way, the buyer never sees bob's occupancy history, which would reveal when his home is empty.

**Step 4: Check retirement and support.** The product page states the end-of-support date at the time of sale. Alice adds a "Retire this device" action to the app that performs the transfer steps and reminds the owner that the device will receive no fixes after that date.

The model turns vague promises into checkable statements. Every arrow in the lifecycle has someone who authorizes it and a list of credentials and data it creates or destroys. Any arrow without that list is where a gap hides.

## Defenses

- **Give every unit its own credentials and ship no universal default password.** Limit: a unique password printed on a label is only as safe as the label.
- **Protect device keys in hardware.** A secure element keeps the private key from being copied even if the firmware is read out. Limit: it adds cost, and it does not stop an attacker from using the key while they control the device (see IOT-08).
- **Require proof of possession at onboarding and keep setup windows short.** Limit: anyone with brief physical access, such as a shop employee, could copy a claim code.
- **Authenticate updates and publish how long they will last.** Limit: support periods end, and devices often outlive them.
- **Make transfer and retirement complete on both sides.** Tie new claims to a fresh reset and revoke old credentials automatically. Limit: devices that never reconnect cannot confirm a wipe.
- **Keep an inventory.** NIST lists the need to "maintain a current, accurate inventory of all IoT products and their relevant characteristics throughout the products' lifecycles." Record each device's owner, location, software version, and end-of-support date. Limit: inventories decay unless someone owns them.
- **Isolate what cannot be fixed.** Put unsupported or untrusted devices on their own network segment. Limit: isolation reduces exposure but does not fix the device.

## Common misconceptions

- **"A serial number or MAC address securely identifies the device."** Identifiers are public. Identity needs a secret only the device holds.
- **"Changing the default password is the user's job."** Relying on every owner to change it leaves each unchanged unit exposed, so secure products avoid shared defaults entirely.
- **"A factory reset makes a device safe to sell."** Only if the service also removes the old owner's binding and credentials.
- **"Reset should erase every key on the device."** The factory identity must survive so the next owner can onboard. Only owner-specific credentials and data go.
- **"If it still works, it is still supported."** Security support can end years before the hardware fails.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Work only with devices you own, and do not reset or unpair anything you are still using without a plan to set it up again.

1. **Inventory your own devices.** List every connected device in your home or room: model, which account it is bound to, how you set it up, whether its password is unique, and whether it updates automatically.
2. **Find a support period.** For one device, look for the manufacturer's published support or update period. Note whether you could find it at all, and what you would do when it ends.
3. **Model a lifecycle on paper.** Using alice's YAML model as a template, write the lifecycle of a fictional DoorPal smart lock sold by `doorpal.example`. For each transition, state who authorizes it, which credentials and data are created or destroyed, and what goes wrong if the step is skipped. Pay special attention to transfer: who else might still hold an unlock credential?
4. **Write a resale checklist.** Turn your model into a five-step checklist that a non-technical seller could follow, and mark which steps the manufacturer could automate.

## Key takeaways

- An identifier names a device; a credential proves it. Each unit needs its own credential, ideally a hardware-protected key with a manufacturer certificate.
- Shared default passwords make every unit of a model one compromise away from all the others.
- Onboarding binds a device to its owner by combining the device's factory credential with the owner's proof of physical possession.
- Transfer and retirement must happen on both the device and the service, erasing owner data and credentials while keeping the factory identity.
- Support periods end; know when, and replace or isolate devices that stop receiving fixes.

## Go deeper

- [NIST IR 8259A](https://csrc.nist.gov/pubs/ir/8259/a/final) defines six baseline device capabilities. Pick a device you own and judge, from its documentation alone, which of the six it provides.
- [NIST IR 8259 Rev. 1](https://csrc.nist.gov/pubs/ir/8259/r1/final) splits manufacturer activities into those before and after a product is sold. Which lifecycle failures in this lesson come from decisions made before sale?
- Open question: what should happen to a device when its manufacturer goes out of business and the cloud service behind onboarding and updates shuts down?
