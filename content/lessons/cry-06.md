---
topicId: CRY-06
title: Randomness, nonces, and key lifecycle
summary: Learn where cryptographic randomness comes from, which values must be unpredictable and which only unique, what happens when a nonce repeats, and how keys are generated, stored, rotated, and destroyed over their lifetime.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish a CSPRNG from a general-purpose PRNG and choose the right API for keys, tokens, salts, and nonces.
  - Classify a value as needing uniqueness, unpredictability, or secrecy, and generate it accordingly.
  - Explain what an attacker gains from a repeated AES-GCM nonce or a predictable token.
  - Find and fix randomness, nonce, and key-handling mistakes in a small code sample.
  - Describe the stages of a key's lifecycle and plan rotation with key versions and envelope encryption.
prerequisites: [CRY-02, CRY-05]
concepts: [csprng, entropy, nonce]
keywords:
  - CSPRNG
  - CSRNG
  - DRBG
  - PRNG
  - random number generator
  - seed
  - Mersenne Twister
  - os.urandom
  - secrets module
  - getRandomValues
  - Math.random
  - IV
  - initialization vector
  - nonce reuse
  - key management
  - key rotation
  - cryptoperiod
  - key versioning
  - KMS
  - HSM
  - envelope encryption
  - DEK
  - KEK
  - key wrapping
  - NIST SP 800-90A
  - NIST SP 800-57
  - CWE-323
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 9: Pseudorandom Number Generators'
    url: https://textbook.cs161.org/crypto/prng.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'NIST SP 800-90A Rev. 1: Recommendation for Random Number Generation Using Deterministic Random Bit Generators'
    url: https://csrc.nist.gov/pubs/sp/800/90/a/r1/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'NIST SP 800-57 Part 1 Rev. 5: Recommendation for Key Management: Part 1, General'
    url: https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'secrets: Generate secure random numbers for managing secrets (Python documentation)'
    url: https://docs.python.org/3/library/secrets.html
    publisher: Python Software Foundation
  - title: OWASP Cryptographic Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC'
    url: https://csrc.nist.gov/pubs/sp/800/38/d/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
quiz:
  - question: Which call should generate a password-reset token in Python?
    choices:
      - "`random.getrandbits(128)` after seeding with the current time"
      - '`uuid.uuid1()`'
      - '`hashlib.sha256(email + timestamp).hexdigest()`'
      - '`secrets.token_urlsafe(32)`'
    answer: 3
    explanation: The `secrets` module draws from the operating system's CSPRNG. The `random` module is built for simulation and is predictable, a time seed narrows the search to a few candidates, version 1 UUIDs are built from a timestamp and node id rather than randomness, and hashing guessable inputs produces a guessable output.
  - question: A service encrypts every message under one AES-GCM key with the same fixed nonce. What can an attacker who collects two ciphertexts learn?
    choices:
      - Nothing, because GCM is authenticated encryption.
      - The XOR of the two plaintexts, which reveals one if the other is known, and possibly enough to forge messages.
      - The key itself, immediately.
      - Only the lengths of the messages.
    answer: 1
    explanation: GCM encrypts in counter mode, so the same key and nonce produce the same keystream, and XORing the ciphertexts cancels it. SP 800-38D also warns that a repeated IV can let an attacker recover the authentication subkey and forge messages.
  - question: Which of these values must be unpredictable, not just unique?
    choices:
      - A CBC initialization vector.
      - An AES-GCM nonce.
      - A record sequence number.
      - A key version label such as `v3`.
    answer: 0
    explanation: CBC needs an IV the attacker cannot predict before the message is encrypted. A GCM nonce only has to be unique for the key, so a counter is fine, and sequence numbers and labels are public by design.
  - question: Why should the encryption key and the MAC key differ, even when both come from one master secret?
    choices:
      - Because one key would be too short for both jobs.
      - Because HMAC cannot accept AES keys.
      - So that a weakness or leak in one use cannot be turned against the other, and each key can be managed on its own.
      - Because deriving several keys from one secret is forbidden.
    answer: 2
    explanation: Key separation limits the damage of any single failure. Deriving independent subkeys with HKDF and distinct labels is the standard, approved way to get several keys from one master secret.
  - question: A data-encryption key has reached the end of its cryptoperiod. What should happen to it?
    choices:
      - Delete it at once, even if backups still need it.
      - Keep using it to encrypt new data, but log a warning.
      - Publish it so auditors can check old data.
      - Stop encrypting with it, keep it only to decrypt existing data until that data is re-encrypted, then destroy it.
    answer: 3
    explanation: Rotation means new data gets a new key. The old key moves to a decrypt-only state so existing ciphertexts stay readable, and it is destroyed once nothing depends on it. Deleting it too early destroys data; keeping it active defeats the point of rotation.
---

## Why it matters

Every key, nonce, salt, and session token in this domain comes from a random number generator. If an attacker can predict those values, the strongest cipher no longer matters: a predictable reset token is a login, and a predictable key is a plaintext. Randomness failures are especially dangerous because the output still looks random. Nothing crashes, and tests pass.

Keys also have lives. A key that is written into source code, never rotated, copied into every environment, or still active after the person who held it has left becomes a standing liability. The OWASP Cryptographic Storage Cheat Sheet treats key management as a formal process covering generation, storage, distribution, deployment, rotation, and decommissioning, and NIST SP 800-57 is the standard US reference for it.

This lesson covers three things that most cryptographic designs assume and rarely enforce: values that are unpredictable, nonces that never repeat, and keys that are handled safely from creation to destruction.

## The core idea

Cryptographic randomness means **unpredictable to the attacker**, not merely random-looking. A generator can pass statistical tests and still be predictable to someone who knows how it works. The standard design is a [[csprng]], a deterministic algorithm seeded with enough [[entropy]] (true unpredictability, gathered from hardware events) that its outputs cannot be predicted, even by someone who has seen earlier outputs.

Different values need different properties, and confusing them causes bugs:

| Value                        | Must be unique? | Must be unpredictable? | Must be secret? | Generate with                         |
| ---------------------------- | --------------- | ---------------------- | --------------- | ------------------------------------- |
| Symmetric or private key     | Yes             | Yes                    | Yes             | CSPRNG, ideally inside a KMS or HSM   |
| Session or reset token       | Yes             | Yes                    | Yes             | CSPRNG, at least 128 bits             |
| AES-GCM nonce                | Yes, per key    | No                     | No              | Counter, or 96 random bits within limits |
| CBC initialization vector    | Yes             | Yes                    | No              | CSPRNG                                |
| Password salt                | Yes             | Preferably             | No              | CSPRNG                                |
| ECDSA per-signature value    | Yes             | Yes                    | Yes             | The signing library, never your code  |

A [[nonce]] is a "number used once." The word describes the only guarantee many nonces need: under a given key, a value must never appear twice.

## How it works

### Where good randomness comes from

Operating systems collect entropy from hardware sources and feed it into a kernel generator built as a deterministic random bit generator (DRBG), the kind of construction NIST SP 800-90A specifies. Applications should ask the operating system for randomness rather than build their own:

- Python: the `secrets` module, or `os.urandom`.
- Browsers: `crypto.getRandomValues()` and the Web Crypto API.
- Node.js: `crypto.randomBytes()`.

General-purpose generators are a different tool. Python's documentation says its `random` module is designed for modeling and simulation, not security or cryptography, and [calls the Mersenne Twister behind it](https://docs.python.org/3/library/random.html) completely deterministic and unsuitable for cryptographic purposes. JavaScript's `Math.random()` is similarly unsuitable, and OWASP lists it as unsafe. The CS 161 textbook explains the design goal for a secure generator: an attacker who sees outputs cannot tell them apart from truly random bits or predict future ones.

Seeding is the other failure point. A generator seeded with the time, a process id, or a counter has only as many possible states as those inputs, and an attacker can try them all. Freshly booted devices and cloned virtual machines can also start with too little entropy or with identical state.

### What a repeated nonce costs

In counter mode, the same key and nonce produce the same keystream. Two ciphertexts encrypted that way satisfy `C1 XOR C2 = P1 XOR P2`, so the keystream cancels out. If the attacker knows or guesses either plaintext, the other follows. AES-GCM encrypts in counter mode, so it inherits this problem, and NIST SP 800-38D adds that even one repeated IV may let an attacker recover the authentication subkey and forge messages.

Signatures have an analogous trap. ECDSA needs a fresh, secret, uniformly random value for every signature. Two signatures that share it give an attacker two equations in two unknowns, enough to solve for the private key. Use a library that generates this value correctly, or a scheme such as Ed25519 that derives it deterministically.

### Keys have a lifecycle

NIST SP 800-57 Part 1 describes keys moving through states over a defined **cryptoperiod**, the time a key is authorized for use. In practice, the stages look like this:

1. **Generation.** Use a CSPRNG, ideally inside a key management service (KMS) or [[hardware-security-module]] (HSM), so the key never exists in plain form on an ordinary server.
2. **Storage.** Keep keys out of source code and version control. OWASP also advises against environment variables, and recommends storing keys apart from the data they protect.
3. **Distribution.** Move keys only wrapped (encrypted) under another key, over authenticated channels.
4. **Use.** One key per purpose. Derive separate subkeys for encryption and authentication rather than reusing one key for both.
5. **Rotation.** Introduce a new key version when the cryptoperiod ends, when usage limits approach (such as 2^32 random-nonce encryptions for one GCM key), or on any suspicion of compromise.
6. **Retirement and destruction.** A retired key decrypts old data only, until that data is re-encrypted; then it is destroyed.

**Envelope encryption** makes rotation practical. A data encryption key (DEK) encrypts the data, and a key encryption key (KEK), held in the KMS, encrypts the DEK. Rotating the KEK means rewrapping small DEKs, not re-encrypting every record. OWASP notes that the KEK should be at least as strong as the DEK.

## Worked example

Find the misuse in this deliberately small module from a fictional shop.example service. It has at least five problems; try to spot them before reading on.

```python
import hashlib
import random
import time

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

KEY = bytes.fromhex("00112233445566778899aabbccddeeff")   # (1)
NONCE = b"\x00" * 12                                       # (2)

def reset_token(user_id: int) -> str:
    random.seed(int(time.time()))                          # (3)
    return f"{random.getrandbits(64):016x}"                # (4)

def encrypt_note(note: bytes) -> bytes:
    return AESGCM(KEY).encrypt(NONCE, note, None)          # (2)

def sign_receipt(receipt: bytes) -> str:
    return hashlib.sha256(KEY + receipt).hexdigest()       # (5)
```

| #   | Problem                                                  | What an attacker gains                                                    | Fix                                                        |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | Hard-coded key in source                                  | Anyone with the repository or a copy of the app has the key forever       | Load it from a KMS or secrets manager; version it          |
| 2   | Fixed nonce for every message                             | XOR of plaintexts, and possible GCM forgeries                             | A fresh 12-byte nonce per message, stored with the ciphertext |
| 3   | Seeded with the current second                            | Knowing roughly when a reset was requested leaves only a few seeds to try | Do not seed; use the OS CSPRNG                             |
| 4   | Mersenne Twister and only 64 bits                         | A predictable generator and a short token                                 | `secrets.token_urlsafe(32)`                                |
| 5   | The encryption key reused as a MAC key, in `SHA-256(key + message)` | Key reuse across purposes, and a construction open to length extension | A separate subkey, used with HMAC                          |

Problem 3 deserves a closer look, because the output looks random:

```sequence
title: Predicting a time-seeded reset token
participant M as Mallory
participant S as shop.example
M -> S: Request a password reset for alice
note S: Seeds random with the current second, emails a token
note M: Knows the request time to within a few seconds
M -> S: Submit tokens computed from each candidate second
S --> M: One candidate matches: account taken over
```

Here is the repaired module. The master key comes from a key service at startup; `load_key_from_kms` stands in for that call.

```python
import hashlib
import hmac
import os
import secrets

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def subkey(master: bytes, purpose: bytes) -> bytes:
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None, info=purpose).derive(master)

MASTER = load_key_from_kms("shop-notes-master", version=3)   # never in source code
ENC_KEY = subkey(MASTER, b"shop.example notes encryption v3")
MAC_KEY = subkey(MASTER, b"shop.example receipts mac v3")

def reset_token() -> str:
    return secrets.token_urlsafe(32)                    # 256 bits from the OS CSPRNG

def encrypt_note(note_id: bytes, note: bytes) -> bytes:
    nonce = os.urandom(12)                              # fresh for every message
    return b"v3" + nonce + AESGCM(ENC_KEY).encrypt(nonce, note, note_id)

def sign_receipt(receipt: bytes) -> str:
    return hmac.new(MAC_KEY, receipt, hashlib.sha256).hexdigest()
```

Notice three details. The `v3` prefix records which key version encrypted each note, so a later key can be introduced without breaking old notes. The note id is passed as associated data, so a ciphertext cannot be moved to a different note. Encryption and MAC keys are derived separately, so neither use can weaken the other.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Use the operating system's CSPRNG** through `secrets`, `os.urandom`, `crypto.getRandomValues()`, or `crypto.randomBytes()`. Ban `random` and `Math.random()` for security values in code review and linters.
- **Size tokens generously**: at least 128 bits for anything an attacker could guess online, and 256 bits costs nothing extra.
- **Make nonce uniqueness structural.** Prefer APIs that generate nonces for you, use counters where state is reliable, and stay well inside per-key limits when nonces are random.
- **Never handle signature randomness yourself.** Use library signing functions, or deterministic schemes such as Ed25519.
- **Manage keys as a process**: generate and store them in a KMS or HSM, separate them by purpose and environment, version them, rotate on schedule and on suspicion, and log their use.
- **Use envelope encryption** so that rotating a master key means rewrapping data keys, not re-encrypting everything.

These defenses have limits. A KMS protects key material, but anyone who can call it with the application's credentials can still decrypt, so access to the KMS needs the same care as the keys themselves.

## Common misconceptions

- **"If it looks random, it is random enough."** Predictability, not appearance, is what matters. Statistical tests cannot detect a time seed.
- **"Nonces must be secret."** Most nonces travel in the clear. What matters is the property each one needs: uniqueness, unpredictability, or both.
- **"Hashing a timestamp makes it unpredictable."** Hashing does not add entropy. The attacker hashes the same few candidate inputs.
- **"Rotation means deleting the old key."** Old keys stay available for decryption until existing data is re-encrypted; deleting them early destroys data.
- **"Environment variables are a safe place for keys."** They leak into logs, crash reports, and child processes. Use a secrets manager or KMS.

## Try it yourself

Use Python on your own machine.

1. Run the flawed `reset_token` twice within the same second and compare the outputs. Then explain, in two sentences, how many guesses an attacker needs if they know the request time to within a minute.
2. Using the flawed `encrypt_note`, encrypt two different 17-byte notes and XOR the two ciphertexts. Compare the result with the XOR of the plaintexts.
3. Fill in the table in "The core idea" for three more values: an API key for a partner, an OAuth `state` parameter, and a TLS record sequence number.
4. Design a rotation plan for `ENC_KEY`: what triggers a rotation, how a reader finds the right key for an old note, and when version 2 can finally be destroyed.

## Key takeaways

- Cryptographic randomness means unpredictable to the attacker; get it from the operating system's CSPRNG.
- Decide what each value needs: uniqueness, unpredictability, secrecy, or a combination.
- A repeated AES-GCM nonce leaks plaintext relationships and can enable forgeries; a repeated ECDSA nonce leaks the private key.
- Keys need a managed lifecycle: generation, protected storage, single purpose, versioned rotation, decrypt-only retirement, and destruction.
- Envelope encryption and key versions make rotation routine instead of risky.

## Go deeper

- [NIST SP 800-90A Rev. 1](https://csrc.nist.gov/pubs/sp/800/90/a/r1/final) specifies approved DRBG designs built from hash functions or block ciphers, and NIST has published a draft Rev. 2. Read how it treats reseeding and prediction resistance.
- [NIST SP 800-57 Part 1 Rev. 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final) discusses key states and suggested cryptoperiods. Compare its guidance with your cloud provider's key-rotation defaults.
- Open question: virtual machine snapshots and container images can duplicate a generator's state. How would you detect, or design around, two machines that start from identical state?
