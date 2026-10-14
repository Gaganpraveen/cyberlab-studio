---
topicId: CRY-01
title: Encoding, hashing, and encryption
summary: Tell encoding, hashing, and encryption apart by whether they use a key, whether they can be reversed, and what each guarantees, then choose the right primitive for a stated requirement.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Distinguish encoding, hashing, and encryption by key use, reversibility, and the security property each provides.
  - Explain preimage, second-preimage, and collision resistance, and name a use that depends on each.
  - Choose a primitive (encoding, hash, MAC, signature, authenticated encryption, or password hash) for a stated requirement and justify the choice.
  - Identify misuses such as Base64 "encryption" or fast unsalted password hashes and propose a fix.
prerequisites: [FND-01]
concepts: [encoding, hash-function, encryption, plaintext, ciphertext, mac]
labs: [password-cracking]
keywords:
  - Base64
  - base64url
  - hex
  - checksum
  - digest
  - fingerprint
  - one-way function
  - SHA-256
  - SHA-2
  - SHA-3
  - MD5
  - SHA-1
  - RFC 4648
  - FIPS 180-4
  - FIPS 202
  - CWE-261
  - CWE-327
  - CWE-328
  - A04:2025 Cryptographic Failures
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 5: Introduction to Cryptography'
    url: https://textbook.cs161.org/crypto/intro.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 7: Cryptographic Hashes'
    url: https://textbook.cs161.org/crypto/hashes.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 4648: The Base16, Base32, and Base64 Data Encodings'
    url: https://www.rfc-editor.org/rfc/rfc4648
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement
  - title: Hash Functions (NIST Computer Security Resource Center project page)
    url: https://csrc.nist.gov/projects/hash-functions
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: OWASP Cryptographic Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: A Graduate Course in Applied Cryptography (Version 0.6)
    url: https://toc.cryptobook.us/
    publisher: Dan Boneh and Victor Shoup
    sourceId: boneh-shoup-applied-cryptography
quiz:
  - question: A developer stores partner API keys in the database as Base64 "so they are not in plaintext." What does this protect against?
    choices:
      - Anyone who reads the database, because Base64 needs a key to reverse.
      - Nothing that matters; Base64 is a keyless, public encoding, so anyone who reads the field can decode it.
      - Tampering, because a changed Base64 string no longer decodes.
      - Offline guessing, because Base64 is a one-way function.
    answer: 1
    explanation: Encoding changes how bytes are written, not who can read them. The algorithm is public and uses no key, so decoding takes one function call. RFC 4648 says base encoding provides no computational confidentiality. The keys need encryption with a separately stored key, or better, a secrets manager.
  - question: The download page for a desktop app shows the app's SHA-256 digest, served from the same mirror as the app. Mallory takes over the mirror. Which statement is correct?
    choices:
      - Users are safe, because SHA-256 is collision resistant.
      - Users are safe if they compare every character of the digest.
      - The digest still catches accidental corruption, but Mallory can replace both the file and the digest; a signature checked with a public key obtained another way would catch her.
      - Users are safe only if the digest is written in Base64 instead of hex.
    answer: 2
    explanation: A hash is unkeyed, so anyone can compute the digest of a modified file. It protects integrity only when the digest arrives over a channel the attacker cannot change. A digital signature moves the trust to a private key Mallory does not have.
  - question: shop.example must keep saved shipping addresses unreadable to anyone who steals a database backup, while the warehouse app must still read them. Which choice fits?
    choices:
      - Authenticated encryption such as AES-GCM, with the key held in a key manager rather than in the backup.
      - SHA-256 with a per-row salt.
      - Base64url, because it is safe to put in URLs.
      - An HMAC of each address.
    answer: 0
    explanation: The warehouse needs the original back, so the transformation must be reversible, but only by key holders. That is encryption. A hash or HMAC is one-way, so nobody could read the address, and Base64 hides nothing. Keeping the key out of the backup is what makes the encryption matter.
  - question: pay.example sends payment webhooks to shop.example, and the two companies share a secret key. Which primitive best lets shop.example reject forged webhooks?
    choices:
      - A SHA-256 digest of the body, sent in a header.
      - Base64 encoding of the body.
      - Encrypting the body with a fresh random key that is sent along with it.
      - An HMAC-SHA256 tag over the body, computed with the shared key and checked with a constant-time comparison.
    answer: 3
    explanation: Detecting forgery needs a secret that the forger lacks. A bare digest or an encoding can be recomputed by anyone, and a key sent with the message protects nothing. A MAC such as HMAC uses the shared key, so only the two companies can produce a valid tag.
  - question: An attacker prepares two different contracts with the same MD5 digest, so a signature over one also verifies for the other. Which hash property is being broken?
    choices:
      - Preimage resistance
      - Collision resistance
      - Second-preimage resistance
      - Determinism
    answer: 1
    explanation: The attacker chooses both inputs, which is exactly a collision. Second-preimage resistance is about matching a specific input someone else chose, and preimage resistance is about inverting a given digest. Signatures sign a digest, so they need collision resistance.
---

## Why it matters

"Encoded," "hashed," and "encrypted" sound alike, and they get swapped in code reviews, bug reports, and even product documentation. A team that believes Base64 hides an API key, or that encryption alone stops tampering, ships a system whose protection exists only on paper. The Base64 specification itself, RFC 4648, warns that base encoding "does not provide any computational confidentiality" and notes that people have exposed passwords by assuming otherwise.

These mistakes rarely need clever cryptanalysis to exploit. The attacker decodes a Base64 string, looks a fast hash up in a table of common passwords, or edits a ciphertext that nothing authenticates. MITRE's weakness catalog has entries for exactly these patterns, such as [CWE-261](https://cwe.mitre.org/data/definitions/261.html) (a password hidden with a trivial encoding) and CWE-328 (use of a weak hash), and the OWASP Top 10:2025 groups them under A04, Cryptographic Failures.

This lesson gives you a short test for any requirement: does the job need a key, does anyone need the original back, and what must the attacker be unable to do? Later lessons go deep on each primitive; here the goal is to choose the right one.

## The core idea

Start with the standard assumption, [[kerckhoffs-principle|Kerckhoffs's principle]]: the attacker knows every algorithm you use, and only the keys are secret. As the CS 161 textbook puts it, "The key should be the only thing that must be kept secret." A useful consequence follows. Any transformation that uses no secret key protects nothing from someone who knows the algorithm, because they can run it themselves.

With that assumption, three questions separate the three families:

1. **Does it use a secret key?**
2. **Can the output be turned back into the input, and by whom?**
3. **What does it promise?** Nothing, a fingerprint, or secrecy.

|                  | Encoding                         | Hashing                                         | Encryption                                 |
| ---------------- | -------------------------------- | ----------------------------------------------- | ------------------------------------------ |
| Secret key?      | No                               | No                                              | Yes                                        |
| Reversible?      | Yes, by anyone                   | No, it is one-way                               | Yes, but only with the key                 |
| Output size      | Grows with the input             | Fixed, for example 256 bits                     | About the input size, plus a small overhead |
| What it promises | Data survives text-only channels | Equal inputs give equal outputs, and collisions are infeasible to find | Confidentiality from anyone without the key |
| Examples         | Base64, hex, percent-encoding    | SHA-256, SHA3-256                               | AES-GCM, ChaCha20-Poly1305                 |

An analogy helps. [[encoding|Encoding]] is like writing a message in Morse code: anyone with the chart can read it. A [[hash-function|hash]] is like a fingerprint: it identifies a person, but you cannot rebuild the person from it. [[encryption|Encryption]] is like a locked safe: everyone can see the safe, but only key holders can open it.

Two keyed tools complete the toolbox. A [[mac]] lets parties who share a key detect tampering, and a [[digital-signature]] lets anyone verify that the holder of a private key produced a message. Finally, passwords need their own tool, [[password-hashing]], because people choose them from a small, guessable space.

## How it works

### Encoding: a change of representation

URLs, JSON, email, and HTTP headers carry only text or reserve certain characters, so encodings exist to carry arbitrary bytes through them. Base64 reads input three bytes (24 bits) at a time and writes four characters from a 64-character alphabet, each standing for 6 bits, so the output is about a third larger than the input. A short final group is padded with `=`. The base64url variant swaps `+` and `/` for `-` and `_` so the result is safe in URLs. Hex writes each byte as two characters from `0-9a-f`.

```python
import base64

token = base64.b64encode(b"alice:correct horse")
print(token)                    # b'YWxpY2U6Y29ycmVjdCBob3JzZQ=='
print(base64.b64decode(token))  # b'alice:correct horse'  (no key needed)
```

This is exactly how HTTP Basic authentication sends a user name and password, which is why [RFC 7617](https://rfc-editor.org/rfc/rfc7617) says Basic authentication should not protect sensitive information without HTTPS. When a "secret" field ends in `=` or contains only hex digits, decode it before trusting it: if readable text comes out, it was never protected.

### Hashing: a fixed-size fingerprint

A cryptographic hash function maps an input of any length to a fixed-length digest. SHA-256 produces 256 bits, usually written as 64 hex characters. It is deterministic and unkeyed, so anyone can compute it. A tiny change to the input changes the output beyond recognition:

```python
import hashlib

print(hashlib.sha256(b"transfer 100 to bob").hexdigest())
# 75b79cfda6fb32768bca896cfc3fcff96e6dd92c04cbbe894a28774d7902bfab
print(hashlib.sha256(b"transfer 900 to bob").hexdigest())
# 7654b974bec8906ba6edcfa6aab07bdf8ac47e1b5a4101f06b25dab834bafb41
```

Security is defined by three tasks that should be infeasible for an attacker:

| Property                    | The attacker must...                                       | Who relies on it                               |
| --------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Preimage resistance         | Find any input that produces a given digest                | Systems that store a digest instead of a secret |
| Second-preimage resistance  | Find a different input with the same digest as a given one | Checking a file against a published digest     |
| Collision resistance        | Find any two different inputs with the same digest         | Digital signatures, which sign a digest        |

Collisions must exist, since there are far more possible inputs than outputs. The requirement is that nobody can find one. Because of the birthday paradox, a generic search for a collision in an n-bit hash takes about `2^(n/2)` evaluations, so SHA-256 offers roughly 128-bit collision resistance. MD5 has been broken for many years, and the first public SHA-1 collision appeared in 2017. For new designs, use SHA-2 (FIPS 180-4) or SHA-3 (FIPS 202). NIST deprecated SHA-1 in 2011, disallowed it for digital signatures at the end of 2013, and plans to retire its remaining uses by December 31, 2030.

Two limits matter in practice. First, one-way does not mean unguessable. If inputs come from a small set, such as passwords, PINs, or phone numbers, an attacker hashes every candidate and compares. Websites that claim to "decrypt" MD5 are lookup tables of precomputed guesses. Second, a hash alone does not protect against an active attacker. If Mallory can change a file, she can change the digest printed next to it. A digest helps only when it reaches you over a channel she cannot modify.

### Encryption: secrecy that needs a key

Encryption turns [[plaintext]] into [[ciphertext]] using a key, and decryption reverses it. In [[symmetric-encryption]], the same secret key does both jobs. In [[public-key-cryptography]], anyone can encrypt with a public key, but only the holder of the matching private key can decrypt. The goal is confidentiality: without the key, the ciphertext should reveal nothing about the plaintext except roughly its length. A secure scheme also uses fresh randomness or a never-repeated nonce, so encrypting the same message twice gives different ciphertexts; otherwise an observer could tell when you repeat yourself.

Encryption by itself does not stop tampering. With unauthenticated modes such as CTR, flipping a bit in the ciphertext flips the same bit in the decrypted plaintext, and nothing complains. Modern code uses [[aead|authenticated encryption]], which refuses to decrypt anything that was changed:

```python
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

key = AESGCM.generate_key(bit_length=256)  # keep in a key manager, never in code
box = AESGCM(key)
nonce = os.urandom(12)                     # 96-bit nonce; never reuse one with this key
ct = box.encrypt(nonce, b"ship to 12 Elm St", b"order-1042")
print(box.decrypt(nonce, ct, b"order-1042"))  # b'ship to 12 Elm St'
```

The ciphertext is 16 bytes longer than the plaintext because AES-GCM appends an authentication tag. Change any byte and `decrypt` raises `InvalidTag` instead of returning altered data.

### Keyed fingerprints: MACs and signatures

Unless a digest travels over a channel the attacker cannot touch, integrity against an active attacker needs a secret the attacker lacks. A message authentication code (MAC) is a short tag computed from the message and a shared secret key. [[hmac|HMAC]] builds one from a hash such as SHA-256. Only key holders can compute a valid tag, so a forged message fails the check:

```python
import hashlib
import hmac

def valid_webhook(body: bytes, received_tag: str, key: bytes) -> bool:
    expected = hmac.new(key, body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, received_tag)  # constant-time comparison
```

A digital signature is computed with a private key and verified with the matching public key. Anyone can verify it, but only the key owner can create it. MACs are faster and simpler; signatures work between parties who share no secret, and they support [[non-repudiation]] because only one party could have signed.

### Password hashing: a hash with a deliberate cost

A login check needs to verify a password, never recover it, so reversible encryption is the wrong tool: whoever steals the key gets every password, which is why OWASP advises against it. A plain fast hash is also wrong, because people choose passwords from a small space and a fast hash lets an attacker test enormous numbers of guesses. Password-hashing functions such as Argon2id, scrypt, bcrypt, and PBKDF2 add a unique random [[salt]] per user and a tunable work factor. [Password hashing and key derivation](lesson:CRY-05) works through the cost arithmetic.

## Worked example

The engineering team at shop.example has six requirements. For each one, ask three things: which property is needed (confidentiality, integrity, authenticity, or none), who the adversary is, and who should hold a key.

| #   | Requirement                                                                 | Property needed                                   | Choice                                                         |
| --- | --------------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Put a 16-byte binary order id into a URL                                    | None; this is representation                      | base64url encoding                                             |
| 2   | Let customers detect a corrupted or swapped download of the desktop app     | Integrity and authenticity against the mirror operator | A signature by shop.example, verified with a key the user already has |
| 3   | Accept payment webhooks from pay.example, which shares a secret key         | Integrity and authenticity between two parties    | HMAC-SHA256 over the body, compared in constant time           |
| 4   | Keep saved addresses unreadable in stolen backups, readable by the warehouse | Confidentiality and integrity                     | AES-256-GCM, key held in a key manager outside the backup      |
| 5   | Check customer passwords at login                                           | Verification without recovery                     | Argon2id with a unique salt per user                           |
| 6   | Create unguessable password-reset tokens                                    | Unpredictability                                  | 32 random bytes from a CSPRNG, then base64url-encoded          |

Step 1. The order id needs only safe transport, so encoding is enough. If ids must also be unguessable, encoding does not help: generate them randomly, and have the server still check that each order belongs to the logged-in user.

Step 2. This is the classic trap. A SHA-256 digest on the download page catches accidental corruption, but whoever controls the mirror can replace both the file and the digest. A digital signature fixes the problem because the verifying public key was obtained earlier, for example with the previous version of the app, and nobody can produce a valid signature without shop.example's private key.

Step 3. Both companies share a key, so a MAC is the simplest fit; a signature would also work but costs more. A bare hash or Base64 of the body is worthless, because anyone can compute it. Even a valid tag does not prevent an attacker from resending an old webhook; [protocol composition](lesson:CRY-07) shows how timestamps and nonces add freshness.

Step 4. The warehouse needs the original address back, so the transformation must be reversible, but only by key holders. That is encryption, and authenticated encryption also detects tampering. If the key is stored in the same backup as the data, the encryption achieves nothing, so key placement is part of the design.

Step 5. The login check needs verification but never reversal, so a one-way function fits, made slow and salted because passwords are guessable.

Step 6. No transformation creates unpredictability. The randomness has to come from a [[csprng]], such as Python's `secrets.token_urlsafe(32)`. The encoding only packages the random bytes for a URL.

Notice the pattern: every choice followed from the property and from who holds which key, not from the type of data.

## Defenses

- **State requirements as properties and adversaries.** "Integrity against whoever runs the mirror" leads to the right primitive; "hash the file" does not.
- **Use high-level, reviewed libraries.** Prefer authenticated-encryption and password-hashing APIs over assembling primitives yourself. The CS 161 textbook is blunt: never implement your own cryptography from the algorithms taught in class.
- **Prefer authenticated encryption.** OWASP's Cryptographic Storage Cheat Sheet says authenticated modes should always be used where available, with GCM or CCM first.
- **Retire weak hashes.** Use SHA-256 or SHA3-256 for integrity and fingerprints. Treat MD5 and SHA-1 in security code as findings.
- **Review for telltale patterns.** Base64 near words like `password`, `secret`, or `token`; MD5 or SHA-1 in authentication code; `==` used to compare MAC tags; keys written into source code.

Each defense has limits. Choosing the right primitive does not fix stolen keys, weak randomness, or protocol flaws such as replay. Those are the subjects of [randomness and key lifecycle](lesson:CRY-06) and [protocol composition](lesson:CRY-07).

## Common misconceptions

- **"Base64 makes data unreadable."** It changes the representation only. Anyone can decode it without a key.
- **"Hashes can be decrypted."** There is no key and nothing to decrypt. Lookup sites guess inputs and compare digests, which works whenever the input was guessable.
- **"Encrypted means tamper-proof."** Unauthenticated encryption can be modified without detection. Use an AEAD mode or add a MAC.
- **"A digest next to the download proves it is authentic."** Only if the digest came from a channel the attacker cannot change. Otherwise use a signature.
- **"SHA-256 is a good password hash because it is secure."** It is a strong hash, but it is designed to be fast, which helps an attacker guessing low-entropy passwords.

## Try it in the lab

In [the lab](lab:password-cracking), you see the difference between the strength of a hash function and the strength of the secret it protects. You start with a leaked table of password hashes from a fictional site, produced with fast, unsalted SHA-256, and check candidate passwords from a short list against it. Watch what happens when two users share a password. The lab then adds per-user salts and slow key derivation (PBKDF2, run in your browser through the Web Crypto API), so you can compare how much work each guess costs. As you go, write down which change raised the attacker's cost and why none of the steps is "decryption."

> [!ETHICS] Only test systems you own or have written permission to test.

**Without the lab.** Open the developer console on any HTTPS page (the Web Crypto API requires a secure context), or use Python on your own machine. Hash `hunter2` twice and confirm the digests match, then change one character and compare. Base64-encode a string and decode it again.

```javascript
const bytes = new TextEncoder().encode("hunter2");
const digest = await crypto.subtle.digest("SHA-256", bytes);
console.log([...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""));
// f52fbd32b2b3b86ff88ef6c490628285f482af15ddcb29541f94bcf526a3f6c7
console.log(btoa("hunter2"), atob("aHVudGVyMg=="));
```

Then, on paper, choose a primitive for each requirement and write one sentence on who holds which key: (a) embed a logo image in a JSON response; (b) detect whether a configuration file a colleague sent you was altered, when you already share a key; (c) store users' recovery email addresses so the support team can read them; (d) let anyone confirm that a published security advisory came from your team.

## Key takeaways

- Encoding changes representation and uses no key, so it provides no security.
- A hash is a keyless, fixed-size fingerprint. It cannot be decrypted, but guessable inputs can be found by guessing.
- Encryption gives confidentiality against anyone without the key; use authenticated encryption so changes are detected.
- Integrity against an active attacker needs a secret: a MAC with a shared key, or a digital signature with a private key.
- Choose the primitive from the required property and from who holds which key, not from the type of data.

## Go deeper

- Boneh and Shoup's free [A Graduate Course in Applied Cryptography](https://toc.cryptobook.us/) (version 0.6, January 2023) gives formal definitions of collision resistance (Chapter 8) and authenticated encryption (Chapter 9).
- The CS 161 [hashes chapter](https://textbook.cs161.org/crypto/hashes.html) explains length-extension attacks on SHA-2. Work out why that property makes `SHA-256(key || message)` a poor MAC and how HMAC avoids the problem.
- NIST's [hash function project page](https://csrc.nist.gov/projects/hash-functions) records which hash functions are approved and the history of the SHA-1 transition. Consider what a long migration like SHA-1's implies for algorithms that are still in wide use today.
