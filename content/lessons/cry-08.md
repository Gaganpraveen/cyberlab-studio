---
topicId: CRY-08
title: Post-quantum migration fundamentals
summary: Learn which algorithms a large quantum computer would break and which it would not, why "harvest now, decrypt later" makes key establishment urgent, what the NIST post-quantum standards provide, and how hybrids, inventories, and crypto agility shape a realistic migration.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Explain the harvest-now-decrypt-later threat and why key establishment is migrated before signatures.
  - Classify common algorithms as quantum-vulnerable or not, and name the NIST post-quantum standard that replaces each vulnerable one.
  - Compare classical, post-quantum, and hybrid options on assumptions, message sizes, and compatibility.
  - Build a cryptographic inventory and rank systems by how long their data or signatures must stay trustworthy.
  - Describe design practices that give a system crypto agility without opening it to downgrade attacks.
prerequisites: [CRY-03, CRY-04, CRY-07]
concepts: [post-quantum-cryptography, harvest-now-decrypt-later, crypto-agility]
keywords:
  - PQC
  - post-quantum
  - quantum-safe
  - quantum-resistant
  - harvest now, decrypt later
  - HNDL
  - store now, decrypt later
  - CRQC
  - Shor's algorithm
  - Grover's algorithm
  - ML-KEM
  - Kyber
  - ML-DSA
  - Dilithium
  - SLH-DSA
  - SPHINCS+
  - FN-DSA
  - Falcon
  - HQC
  - LMS
  - XMSS
  - hybrid key exchange
  - X25519MLKEM768
  - crypto agility
  - cryptographic inventory
  - FIPS 203
  - FIPS 204
  - FIPS 205
  - FIPS 206
  - NIST IR 8547
  - NIST SP 800-208
  - NIST SP 800-56C
  - NSM-10
sources:
  - title: 'NIST IR 8547 (Initial Public Draft): Transition to Post-Quantum Cryptography Standards'
    url: https://csrc.nist.gov/pubs/ir/8547/ipd
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard'
    url: https://csrc.nist.gov/pubs/fips/203/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-fips-203
  - title: 'FIPS 204: Module-Lattice-Based Digital Signature Standard'
    url: https://csrc.nist.gov/pubs/fips/204/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: NIST Selects HQC as Fifth Algorithm for Post-Quantum Encryption
    url: https://www.nist.gov/news-events/news/2025/03/nist-selects-hqc-fifth-algorithm-post-quantum-encryption
    publisher: National Institute of Standards and Technology (NIST)
  - title: 'Post-quantum hybrid ECDHE-MLKEM Key Agreement for TLSv1.3 (Internet-Draft draft-ietf-tls-ecdhe-mlkem)'
    url: https://datatracker.ietf.org/doc/draft-ietf-tls-ecdhe-mlkem/
    publisher: IETF
  - title: 'Quantum-Readiness: Migration to Post-Quantum Cryptography (PQC)'
    url: https://www.cisa.gov/resources-tools/resources/quantum-readiness-migration-post-quantum-cryptography
    publisher: CISA, NSA, and NIST
quiz:
  - question: Why does NIST's draft transition plan prioritize post-quantum key establishment over post-quantum signatures?
    choices:
      - Post-quantum signature algorithms have not been standardized yet.
      - Recorded key exchanges can be broken years later to expose old traffic, while a signature only has to be unforgeable when it is verified.
      - Quantum computers cannot break signature algorithms.
      - Key establishment uses symmetric cryptography, which is easier to replace.
    answer: 1
    explanation: An attacker can store encrypted traffic today and decrypt it once a large quantum computer breaks the key exchange that protected it. A signature checked today cannot be forged retroactively, so signatures become urgent only before such a computer exists, and sooner for long-lived keys such as firmware roots. FIPS 204 and FIPS 205 standardized signatures in 2024, so availability is not the reason.
  - question: Which of these does NIST not expect to replace because of quantum computers?
    choices:
      - RSA-3072 key transport
      - ECDSA with P-256
      - X25519 key exchange
      - AES-256 encryption
    answer: 3
    explanation: Shor's algorithm breaks factoring and discrete-logarithm problems, which covers RSA, ECDSA, and X25519. Grover's algorithm only speeds up brute-force key search quadratically, and NIST's draft plan says it does not expect to transition away from its symmetric-key and hash standards.
  - question: A TLS connection uses the hybrid group X25519MLKEM768. What must an attacker break to recover the session keys?
    choices:
      - Both X25519 and ML-KEM-768, because the key schedule uses both shared secrets.
      - Either one, because the two secrets are alternatives.
      - Only ML-KEM-768, because its secret comes first in the concatenation.
      - Only X25519, because ML-KEM is used for authentication.
    answer: 0
    explanation: Both shared secrets feed the key derivation, so knowing one of them is not enough. This is why NIST's draft describes hybrids as designed to remain secure if at least one component is secure. The order of concatenation is a format detail, not a weakness.
  - question: shop.example considers switching its TLS certificate chain from Ed25519 to ML-DSA-44. What is the main compatibility cost?
    choices:
      - ML-DSA cannot appear in X.509 certificates.
      - Browsers would need quantum hardware to verify the chain.
      - The public keys and signatures in each handshake grow from a few hundred bytes to roughly ten kilobytes.
      - The session keys become weaker, because lattice signatures are less secure.
    answer: 2
    explanation: An ML-DSA-44 public key is 1,312 bytes and a signature is 2,420 bytes, against 32 and 64 bytes for Ed25519. A leaf and an intermediate certificate plus the CertificateVerify signature come to 9,884 bytes instead of 256, which costs bandwidth and can add latency on slow or constrained links.
  - question: Which design choice gives a system crypto agility?
    choices:
      - Hard-coding AES-256-GCM and RSA-2048 in a shared library so no one can misconfigure them.
      - Storing an algorithm identifier and key version with every ciphertext and signature, chosen through configuration and accepted only from an authenticated allowlist.
      - Removing version fields from messages to save space.
      - Accepting any algorithm a peer proposes, so that new ones work automatically.
    answer: 1
    explanation: Agility means algorithms can change through configuration while old data stays readable. Identifiers and key versions make that possible, and an authenticated allowlist keeps the flexibility from becoming a downgrade path. Hard-coding blocks change, and accepting anything invites downgrade.
---

## Why it matters

Almost every TLS connection, software update, and certificate today depends on RSA, Diffie-Hellman, or elliptic-curve cryptography. A large, fault-tolerant quantum computer running Shor's algorithm would break all of them, because it solves the factoring and discrete-logarithm problems they rest on. Nobody can say when such a machine, often called a cryptographically relevant quantum computer, will exist. Planning cannot wait for that answer, for two reasons.

First, recorded traffic does not expire. NIST's draft transition plan, NIST IR 8547, describes adversaries who "collect encrypted data now with the goal of decrypting it once quantum technology matures." That strategy is called [[harvest-now-decrypt-later]]. Medical records, legal files, and other secrets that must stay confidential for a decade are already at risk if their key exchange is quantum-vulnerable, because a copy taken today can be read later.

Second, migration is slow. Cryptography is buried in protocols, libraries, hardware security modules, smart cards, and devices that stay in service for years. The draft plan, which cites a national goal of mitigating as much quantum risk as feasible by 2035, proposes deprecating quantum-vulnerable public-key algorithms at the 112-bit security level after 2030 and disallowing quantum-vulnerable algorithms at every level after 2035. Changing everything in that window requires starting now.

## The core idea

Think of encrypted traffic as a time capsule. Whatever lock you choose today must still hold on the day someone tries to open it, possibly fifteen years from now. A lock that is strong today but will be easy to pick in 2040 does not protect a capsule that must stay sealed until 2041.

The analysis rests on three assumptions: a quantum computer capable of breaking today's public-key algorithms may eventually be built, attackers can store traffic cheaply in the meantime, and replacing cryptography across an organization takes years. Under those assumptions, the threat depends on the job each algorithm does:

| Job                  | Typical algorithms today        | Effect of a large quantum computer        | Replacement                                    | Urgency                           |
| -------------------- | ------------------------------- | ----------------------------------------- | ---------------------------------------------- | --------------------------------- |
| Key establishment    | RSA key transport, (EC)DH, X25519 | Broken: recorded sessions can be decrypted | ML-KEM, usually in a hybrid                    | Now, because of harvesting        |
| Digital signatures   | RSA, ECDSA, Ed25519             | Broken: signatures can be forged          | ML-DSA, SLH-DSA, stateful hash-based schemes    | Before such a computer exists; long-lived keys first |
| Symmetric encryption | AES                             | Brute force sped up only quadratically    | Keep, with keys of at least 128 bits           | No quantum-driven change          |
| Hashing and MACs     | SHA-2, SHA-3, HMAC              | No transition expected by NIST            | Keep                                           | No quantum-driven change          |

A simple timing test captures the urgency. Let X be how long data must stay secret, Y how long your migration will take, and Z how long until a quantum computer could break the key exchange. If X + Y is greater than Z, some data you send before the migration finishes will still need protection when it can be read. You cannot know Z, but you can estimate X and Y, and NIST's 2035 horizon gives a planning date.

## How it works

### What breaks and what survives

Shor's algorithm makes factoring and discrete logarithms efficient on a large quantum computer, so making RSA or elliptic-curve keys somewhat longer does not restore safety. Grover's algorithm is different: it speeds up brute-force search only quadratically. In its draft plan, NIST says it does not expect to transition away from its symmetric-key and hash standards, and that symmetric algorithms with at least 128 bits of classical security are believed to meet at least its lowest post-quantum security category. In practice, AES, SHA-2, SHA-3, HMAC, and the password-hashing functions from [Password hashing and key derivation](lesson:CRY-05) are not where the quantum risk lies.

[[post-quantum-cryptography|Post-quantum cryptography]] replaces only the public-key parts. It runs on ordinary computers, which distinguishes it from quantum key distribution, a different technology that needs special hardware.

### The NIST standards

NIST published three post-quantum standards on August 13, 2024, and has announced more:

| Standard              | Algorithm         | Job                  | Mathematical basis      | Status and notes                                                    |
| --------------------- | ----------------- | -------------------- | ----------------------- | ------------------------------------------------------------------- |
| FIPS 203              | ML-KEM            | Key encapsulation    | Module lattices         | Final; the only approved post-quantum key-establishment scheme in NIST's draft plan |
| FIPS 204              | ML-DSA-44, -65, -87 | Signatures         | Module lattices         | Final; sizes in the next table                                      |
| FIPS 205              | SLH-DSA           | Signatures           | Hash functions (from SPHINCS+) | Final; relies only on hash functions, a conservative assumption |
| SP 800-208            | LMS, XMSS         | Signatures           | Hash functions          | Stateful: the signer must track which one-time keys it has used     |
| Planned FIPS 206      | FN-DSA            | Signatures           | Lattices (from FALCON)  | In March 2025, NIST said a draft would follow shortly               |
| HQC (selected in 2025) | HQC              | Key encapsulation    | Error-correcting codes  | A backup to ML-KEM; NIST expected a final standard in 2027          |

ML-KEM is a [[key-encapsulation-mechanism]]: instead of both sides contributing a share as in Diffie-Hellman, one side encapsulates a fresh secret to the other's public key, as described in [Public-key encryption and key agreement](lesson:CRY-03). NIST chose HQC because it "is based on different math than ML-KEM," which could matter if a weakness were found in ML-KEM. NIST also advised organizations to keep migrating to the 2024 standards rather than wait for later ones.

### Size is the compatibility cost

Post-quantum keys, ciphertexts, and signatures are much larger than their elliptic-curve counterparts. The figures below come from FIPS 204 and the TLS hybrid specification; the X25519 and Ed25519 sizes are the familiar 32-byte keys and 64-byte signatures:

| Algorithm                 | Public key or share (bytes) | Ciphertext or signature (bytes) |
| ------------------------- | --------------------------- | ------------------------------- |
| X25519                    | 32                          | 32 (the reply share)            |
| ML-KEM-768                | 1,184                       | 1,088                           |
| X25519MLKEM768 in TLS     | 1,216 (client)              | 1,120 (server)                  |
| Ed25519                   | 32                          | 64                              |
| ML-DSA-44                 | 1,312                       | 2,420                           |
| ML-DSA-65                 | 1,952                       | 3,309                           |

Larger messages strain systems built around old assumptions. A ClientHello carrying a 1,216-byte key share can exceed what fits in one 1,500-byte Ethernet frame, so software that assumed a one-packet handshake can fail. Fixed-size database columns, certificate size limits, smart-card memory, and bootloader space all need checking.

### Hybrid key exchange

A hybrid combines a classical algorithm with a post-quantum one and derives the session key from both shared secrets. NIST's draft explains that hybrids "are typically designed to remain secure if at least one of the component algorithms is secure," and expects them to be temporary, followed later by a move to post-quantum-only tools. The hedge matters because ML-KEM implementations are young, while X25519 has years of scrutiny behind it.

In TLS 1.3, the IETF hybrid specification defines groups such as X25519MLKEM768. The client sends an X25519 share and an ML-KEM-768 encapsulation key together; the server returns its X25519 share and an ML-KEM ciphertext; and the shared secret is the ML-KEM secret concatenated with the X25519 secret. At the time of writing, the IETF has approved the document and it awaits publication as an RFC. Because the group choice is part of the authenticated handshake transcript, the downgrade protections from [Cryptographic protocol composition](lesson:CRY-07) cover it, as long as the authentication algorithms are still unbroken.

This sketch shows the idea with the `cryptography` package:

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.mlkem import MLKEM768PrivateKey
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

# Client: one classical and one post-quantum key pair
c_x25519, c_mlkem = X25519PrivateKey.generate(), MLKEM768PrivateKey.generate()

# Server: its own X25519 share, plus an ML-KEM encapsulation to the client's key
s_x25519 = X25519PrivateKey.generate()
ss_kem, kem_ciphertext = c_mlkem.public_key().encapsulate()
ss_ecdh = s_x25519.exchange(c_x25519.public_key())

# Client: recovers both secrets from what the server sent back
assert c_mlkem.decapsulate(kem_ciphertext) == ss_kem
assert c_x25519.exchange(s_x25519.public_key()) == ss_ecdh

# Both sides derive the key from both secrets; an attacker must break both
key = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
           info=b"shop.example hybrid demo v1").derive(ss_kem + ss_ecdh)
print(len(c_mlkem.public_key().public_bytes_raw()), len(kem_ciphertext), len(key))  # 1184 1088 32
```

It is a teaching sketch, not a protocol. Real systems feed both secrets into a specified key schedule bound to the handshake transcript, so use your TLS library's hybrid group rather than inventing a combiner.

### Inventory and crypto agility

You cannot migrate what you cannot find. A joint CISA, NSA, and NIST factsheet recommends that organizations establish a quantum-readiness roadmap, prepare a cryptographic inventory, and engage their technology vendors about post-quantum plans. A useful inventory row records the system, the job the cryptography does, the algorithm and key size, the library or vendor, the protocol, how long the protected data or signatures must stay trustworthy, and an owner. Sources include code searches for cryptographic API calls, scans of your own TLS endpoints, certificate and key-management inventories, and software bills of materials.

[[crypto-agility|Crypto agility]] is the ability to change algorithms, parameters, and keys without redesigning the system. It comes from algorithm identifiers and key versions in protocols and stored data, configuration instead of hard-coded choices, automated certificate and key rotation, and room in formats for larger keys. NIST's draft notes that protocols supporting multiple sets of algorithms let parties negotiate which to use. Negotiation needs the safeguards from the protocol composition lesson: authenticate it, allow only approved choices, and retire old ones.

## Worked example

The activity for this topic is to review standards-linked migration trade-offs and compatibility. shop.example has inventoried five systems; in 2026 its team must decide what to change first.

**Step 1: build the inventory.**

| System                                   | Cryptography today                                   | Quantum exposure                       | Must stay trustworthy |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------- | --------------------- |
| A. Customer website (TLS 1.3)            | X25519 key exchange, ECDSA P-256 certificates         | Key exchange can be harvested          | A few years (order data) |
| B. Nightly offsite backups               | AES-256-GCM data keys wrapped with an RSA-2048 key    | Key wrapping can be harvested          | 10 years or more (customer records) |
| C. Firmware signing for store terminals  | ECDSA P-256 root key built into the terminals' boot ROM | Signatures forgeable once a quantum computer exists | 12 years (device service life) |
| D. Database encryption at rest           | AES-256-GCM, keys held in a KMS                       | Symmetric only                         | Not applicable        |
| E. Password storage                      | Argon2id                                              | None                                   | Not applicable        |

**Step 2: apply the timing test.** For B, records backed up in 2026 must stay secret until at least 2036 (X is 10 years), and the team estimates two years to migrate (Y is 2). X + Y is 12 years, which runs past NIST's proposed 2035 cutoff, about 9 years away, so B is already late. For C, terminals bought in 2027 will run until 2039, and a key in boot ROM cannot be changed by a software update. Hardware ordered now must verify a post-quantum signature. For A, harvesting is a moderate risk, but the fix is cheap.

```sequence
title: Harvest now, decrypt later against system B
participant S as shop.example
participant P as Backup provider
participant M as Mallory
S -> P: Backup, data key wrapped with RSA-2048
M -> P: Obtains a copy of the backup in 2026
P --> M: Ciphertext and wrapped data key
note M: Stores the copy until a quantum computer exists
note M: Unwraps the data key and reads the records
note: Fix: wrap data keys with ML-KEM before upload
```

The diagram shows why B ranks highest: the attacker's work happens years after the copy is taken, so nothing done later protects backups made today with quantum-vulnerable key wrapping.

**Step 3: weigh the compatibility costs.** For A, enabling X25519MLKEM768 alongside X25519 adds 1,184 bytes to the client's first message and 1,088 bytes to the server's reply, 2,272 bytes per handshake, and clients without hybrid support keep using X25519. Certificates are a different story. Counting only public keys and signatures in a leaf certificate, an intermediate certificate, and the CertificateVerify message:

| Signature algorithm | Calculation                                | Bytes per handshake |
| ------------------- | ------------------------------------------ | ------------------- |
| Ed25519             | 32 + 64 + 32 + 64 + 64                     | 256                 |
| ML-DSA-44           | 1,312 + 2,420 + 1,312 + 2,420 + 2,420      | 9,884               |
| ML-DSA-65           | 1,952 + 3,309 + 1,952 + 3,309 + 3,309      | 13,831              |

Certificates also depend on certificate authorities and every client that validates them, so they move with the whole ecosystem.

**Step 4: decide.**

1. **B, now:** wrap new backup data keys with ML-KEM in a hybrid, and rewrap older backups that must stay secret past 2035, accepting that any copy already taken stays exposed.
2. **A, now:** turn on the hybrid group in the TLS library, monitor handshake failures, and keep ECDSA certificates until clients and certificate authorities support post-quantum ones.
3. **C, at the next hardware purchase:** require terminals that verify ML-DSA or a stateful hash-based signature, and sign firmware with both the old and new keys during the transition.
4. **D and E:** no quantum-driven change. Confirm that the KMS's own key transport is on its vendor's post-quantum roadmap.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Inventory first.** Find every use of public-key cryptography, including the ones inside vendors' products, and record its job and lifetime.
- **Migrate key establishment early**, starting with data that must stay secret longest. Prefer hybrids where your libraries support them.
- **Plan signatures by key lifetime.** Firmware roots, code-signing keys, and long-lived certificate authorities need post-quantum support before devices that trust them ship.
- **Build agility**: algorithm identifiers, key versions, configuration, automated rotation, and room for larger keys, combined with authenticated, allowlisted negotiation.
- **Engage vendors** about their post-quantum roadmaps, and put requirements into contracts and purchases.
- **Keep symmetric keys at 128 bits or more**; no quantum-driven change is needed for AES, SHA-2, or SHA-3.

These defenses have limits. Post-quantum implementations are young, so bugs and side channels are likely, which is one reason to use hybrids. Standards are still moving: NIST IR 8547 remains a draft, and NIST had flagged corrections to FIPS 203 and FIPS 204 for future updates. And no defense helps data that has already been harvested.

## Common misconceptions

- **"Quantum computers will break all encryption."** They threaten public-key algorithms. AES and SHA-2 survive with adequate key and output sizes.
- **"We can wait until a quantum computer exists."** Harvested traffic is decrypted later, and migrations take years.
- **"Forward secrecy protects recorded traffic."** It protects against later theft of long-term keys. A quantum computer attacks each recorded ephemeral exchange directly.
- **"Post-quantum cryptography needs quantum hardware."** It runs on ordinary computers. Quantum key distribution is a different technology.
- **"Longer RSA keys solve the problem."** Shor's algorithm runs in time polynomial in the key size, so longer keys buy little; only a change of algorithm helps.

## Try it yourself

Use Python on your own machine with a recent `cryptography` release that includes ML-KEM and ML-DSA (version 50.0.1 does).

1. Run the hybrid sketch, then have the server sign the handshake bytes (both public values and `kem_ciphertext`) with ML-DSA-65, as a CertificateVerify message would (`MLDSA65PrivateKey.generate()`, then `sign` and `verify`). Print every size and compare the totals with an X25519 and Ed25519 version.
2. Change one byte of `kem_ciphertext` before decapsulation and observe the result. ML-KEM returns a different secret instead of raising an error, so the mismatch shows up only when the derived keys disagree. Explain why a protocol must confirm the key, as TLS does with its Finished message.
3. Inventory a fictional course platform at `courses.test` with five systems of your choice, including one with a 15-year data lifetime and one embedded device. Apply the X + Y > Z test and rank them.
4. For each system, note which date in NIST's draft plan applies to it: deprecation after 2030 for 112-bit algorithms, or disallowance after 2035.

## Key takeaways

- A large quantum computer would break RSA, Diffie-Hellman, and elliptic-curve cryptography, but not AES or SHA-2 with adequate sizes.
- Harvest now, decrypt later makes key establishment urgent today for any data that must stay secret for years.
- NIST's standards are ML-KEM (FIPS 203), ML-DSA (FIPS 204), and SLH-DSA (FIPS 205), with FN-DSA and HQC to follow; hybrids hedge during the transition.
- Post-quantum objects are much larger, so compatibility testing is a large part of migration.
- Inventory and crypto agility turn migration from an emergency into routine maintenance.

## Go deeper

- [NIST IR 8547](https://csrc.nist.gov/pubs/ir/8547/ipd) proposes the transition timeline in its Section 4 tables. Check whether a final version has replaced the draft, and compare its dates with your organization's plans.
- [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) defines SLH-DSA. Compare its security assumption with ML-DSA's, and decide where each fits.
- Boneh and Shoup, [A Graduate Course in Applied Cryptography](https://toc.cryptobook.us/) (version 0.6), Chapter 17, covers post-quantum cryptography from lattices.
- Open question: a terminal's boot ROM can verify only the algorithm it was built with. How would you move a fleet of such devices to post-quantum signatures without bricking the ones already deployed?
