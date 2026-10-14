---
topicId: CRY-02
title: Symmetric encryption and authenticated encryption
summary: See why a block cipher needs a mode, what ECB, CBC, and CTR leak, and why confidentiality without integrity lets an attacker change messages it cannot read, then use authenticated encryption (AEAD) correctly.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why confidentiality and integrity are separate goals, and show how an unauthenticated mode lets an attacker change a message it cannot read.
  - Compare ECB, CBC, CTR, and AES-GCM by what each requires (IV, nonce, padding) and what each leaks.
  - Use an AEAD API correctly, with a unique nonce per key and associated data that binds the ciphertext to its context.
  - Verify a MAC with a constant-time comparison and justify encrypt-then-MAC with separate keys when no AEAD is available.
prerequisites: [CRY-01]
concepts: [symmetric-encryption, block-cipher, aes, aead, mac, hmac]
keywords:
  - AES
  - AES-GCM
  - GCM
  - GMAC
  - ChaCha20-Poly1305
  - ECB
  - CBC
  - CTR
  - IV
  - initialization vector
  - IND-CPA
  - malleability
  - bit flipping
  - encrypt-then-MAC
  - associated data
  - FIPS 197
  - NIST SP 800-38D
  - RFC 5116
  - RFC 2104
  - CWE-327
  - CWE-323
  - CWE-353
  - CWE-208
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 6: Symmetric-Key Cryptography'
    url: https://textbook.cs161.org/crypto/symmetric.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 8: Message Authentication Codes (MACs)'
    url: https://textbook.cs161.org/crypto/macs.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'FIPS 197: Advanced Encryption Standard (AES)'
    url: https://csrc.nist.gov/pubs/fips/197/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation: Galois/Counter Mode (GCM) and GMAC'
    url: https://csrc.nist.gov/pubs/sp/800/38/d/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'RFC 5116: An Interface and Algorithms for Authenticated Encryption'
    url: https://www.rfc-editor.org/info/rfc5116
    publisher: IETF (RFC Editor)
  - title: 'hmac: Keyed-Hashing for Message Authentication (Python documentation)'
    url: https://docs.python.org/3/library/hmac.html
    publisher: Python Software Foundation
quiz:
  - question: A photo service encrypts images with AES-256 in ECB mode. What can someone who sees only the ciphertext learn?
    choices:
      - Nothing, because AES-256 has no known practical attack.
      - The key, after collecting enough images.
      - Where identical 16-byte plaintext blocks repeat, which can reveal outlines, flat regions, and repeated records.
      - Only the file size.
    answer: 2
    explanation: ECB encrypts each block independently with the same key, so equal plaintext blocks give equal ciphertext blocks. The cipher is not broken; the mode is deterministic and leaks patterns. The key size does not change that.
  - question: Mallory flips one bit of an AES-CTR ciphertext of `TO:bob;AMT:0100` in transit, and the server uses no MAC. What happens when the server decrypts it?
    choices:
      - The same bit flips in the plaintext, and the server sees a valid-looking message.
      - Decryption fails because the counter no longer matches.
      - The whole message decrypts to random bytes.
      - The server detects the change because AES is a permutation.
    answer: 0
    explanation: CTR mode XORs the plaintext with a keystream, so a bit flipped in the ciphertext flips exactly that bit in the plaintext. Nothing in the mode notices. Only a MAC or an AEAD mode detects the change.
  - question: Which statement about the 96-bit nonce passed to AES-GCM is correct?
    choices:
      - It must be kept secret, like the key.
      - It can be a fixed constant if the key is 256 bits long.
      - It should be derived from the plaintext so that equal messages share it.
      - It must never repeat under the same key, because reuse can expose relationships between plaintexts and let an attacker forge tags.
    answer: 3
    explanation: Nonces travel in the clear; their job is to be unique per key. SP 800-38D warns that even one repeated IV may allow forgery, because the attacker can likely recover the authentication subkey, and CTR keystream reuse leaks the XOR of the two plaintexts.
  - question: A webhook handler checks `if received_tag == expected_tag:`. What is the risk, and what is the fix?
    choices:
      - There is no risk, because HMAC tags look random.
      - The comparison can stop at the first differing character, so response time may leak how much of a forged tag is right; use `hmac.compare_digest`.
      - The `==` operator compares only the first 16 bytes; compare the full hex strings instead.
      - The tag must be decrypted before it is compared.
    answer: 1
    explanation: Python's documentation recommends `compare_digest` instead of `==` when checking an externally supplied digest, because it avoids content-based short-circuiting. Timing differences are a classic side channel (CWE-208).
  - question: In bank.example's AES-GCM messages, the header `v1|transfer|session-42` is passed as associated data. What does this give?
    choices:
      - The header is encrypted together with the body.
      - The header becomes secret and is removed from the message.
      - The header stays readable, but any change to it makes decryption fail, so a ciphertext cannot be moved to another session or message type.
      - Nothing, unless the header is also hashed separately.
    answer: 2
    explanation: Associated data is authenticated but not encrypted. Decryption must be given the same associated data, or it fails. That binds the ciphertext to its context without hiding fields that routers or logs need to read.
---

## Why it matters

[[symmetric-encryption|Symmetric encryption]] does the bulk work of protecting data. It encrypts TLS records, disk volumes, database fields, backups, and chat messages. Public-key cryptography, covered in the [next lesson](lesson:CRY-03), usually only sets up a symmetric key, which then protects the actual traffic.

When symmetric encryption fails in practice, the cipher is rarely the problem. AES, standardized as FIPS 197 in 2001, has no practical attack known that does much better than trying every key. The failures come from how it is used: a mode that leaks patterns, encryption with no integrity check, a nonce that repeats, or a tag compared carelessly. MITRE tracks these as weaknesses such as CWE-327 (a broken or risky algorithm), CWE-353 (missing integrity check), and CWE-323 (reusing a nonce and key pair).

The central lesson is that **confidentiality and integrity are different goals**. Encryption stops an attacker from reading a message. It does not, by itself, stop the attacker from changing it.

## The core idea

Think of an encrypted message as a letter written in a private code. An outsider cannot read it. But if the outsider knows the letter's layout, for example that the amount always appears in the same place, they may be able to change the coded symbols at that spot and alter the meaning without reading anything else. Confidentiality held; integrity did not. A tamper-evident seal over the whole letter is a separate protection. Authenticated encryption provides both, plus a printed address label that anyone can read but nobody can alter.

The assumptions behind this lesson:

- The attacker knows every algorithm, sees every ciphertext, and can **modify, drop, or inject** ciphertexts. That describes an [[adversary-in-the-middle]] on a network, or anyone with write access to stored data.
- The key is random, secret, and held only by the legitimate parties.
- The attacker may know the message format, or even most of the plaintext, such as a fixed JSON structure.

## How it works

### Block ciphers and AES

A [[block-cipher]] is a keyed permutation: for each key, it maps every fixed-size input block to a distinct output block, and without the key the mapping looks random. [[aes|AES]] uses 128-bit (16-byte) blocks and 128-, 192-, or 256-bit keys. On its own, a block cipher encrypts exactly one block. A **mode of operation** turns it into a scheme for messages of any length, and the mode decides most of the security properties.

### Modes of operation and what they leak

| Mode | How it works                                                | Needs                                     | Problem when used alone                                         |
| ---- | ----------------------------------------------------------- | ----------------------------------------- | --------------------------------------------------------------- |
| ECB  | Encrypts each block independently                           | Padding                                   | Equal plaintext blocks give equal ciphertext blocks             |
| CBC  | XORs each block with the previous ciphertext block first    | A random, unpredictable IV; padding       | No integrity; padding errors can become an oracle               |
| CTR  | Encrypts a nonce and counter to make a keystream, then XORs | A nonce that never repeats under the key  | No integrity; flipped ciphertext bits flip plaintext bits      |
| GCM  | CTR encryption plus a polynomial MAC over ciphertext and associated data | A unique nonce, ideally 96 bits | None, if nonces are unique; reuse is catastrophic              |

ECB's leak is easy to demonstrate. Two identical 16-byte blocks of plaintext produce two identical blocks of ciphertext:

```python
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

key = os.urandom(16)
enc = Cipher(algorithms.AES(key), modes.ECB()).encryptor()   # do not use ECB
ct = enc.update(b"PAY BOB $100.00!" * 2) + enc.finalize()
print(ct[:16] == ct[16:32])   # True: the repetition shows through
```

The CS 161 textbook formalizes the goal as **IND-CPA** (indistinguishability under chosen-plaintext attack). The attacker picks two messages of equal length, receives the encryption of one of them, and may ask for encryptions of anything else. If the attacker cannot guess which message was encrypted noticeably better than a coin flip, the scheme hides everything except length. A deterministic scheme such as ECB always fails, because the attacker can simply encrypt both candidates and compare. That is why CBC needs a fresh, unpredictable IV and CTR needs a fresh nonce: they make every encryption different.

The IV and nonce are not secrets. They travel in the clear next to the ciphertext. Their job is to be unique, and for CBC, unpredictable.

### Integrity: MACs

A [[mac]] (message authentication code) is a short tag computed from a message and a secret key. It is secure if an attacker who has seen tags on messages of their choice still cannot produce a valid tag for any new message. [[hmac|HMAC]], built from a hash such as SHA-256, is the standard example. A MAC proves integrity and origin among key holders, but as the CS 161 textbook says, "MACs have no confidentiality guarantees."

How you check a tag matters. A plain `==` comparison can return as soon as the first character differs, so the response time may reveal how many leading characters of a forged tag were correct. That is a [[timing-attack]]: an attacker who can measure precisely enough can learn a valid tag one piece at a time.

```python
import hmac

# Vulnerable: may stop at the first mismatch, leaking timing
if received_tag == expected_tag:
    accept()

# Fixed: compares without content-based short-circuiting
if hmac.compare_digest(received_tag, expected_tag):
    accept()
```

### Combining encryption and a MAC

Before AEAD modes were common, protocols glued a cipher and a MAC together. There are three orders: MAC the plaintext and send it beside the ciphertext (encrypt-and-MAC), MAC the plaintext and encrypt both (MAC-then-encrypt), or encrypt first and MAC the ciphertext (encrypt-then-MAC). The CS 161 textbook recommends **encrypt-then-MAC**, because the receiver checks the tag before decrypting anything, and it says the two functions should use **different keys**. MAC-then-encrypt forces the receiver to decrypt and unpad unauthenticated data first, which has enabled padding-oracle attacks. [Protocol composition](lesson:CRY-07) explains those failures.

### AEAD: one primitive for both goals

[[aead|Authenticated encryption with associated data]] (AEAD) packages encryption and integrity into a single, hard-to-misuse interface. RFC 5116 describes it: encryption takes a key, a [[nonce]], the plaintext, and **associated data**, which is authenticated but not encrypted. Decryption returns either the original plaintext or a failure, never modified data. Associated data is where you put context the receiver must agree on, such as a protocol version, a message type, or a record id.

AES-GCM is the most common AEAD. NIST SP 800-38D specifies it and recommends 96-bit IVs and 128-bit tags. Its rules on nonces are strict. The chance of ever reusing an IV with the same key must stay at or below 2^-32, and implementations that generate random IVs may call the encryption function at most 2^32 times per key. SP 800-38D warns that if even one IV is repeated, an attacker can likely recover the hash subkey that GCM's authentication depends on and then forge messages. ChaCha20-Poly1305 is the other widely used AEAD, with a 256-bit key, a 96-bit nonce, and a 128-bit tag, and the same rule: never reuse a nonce with a key.

## Worked example

This example compares confidentiality with integrity using toy messages. The bank.example mobile app sends a transfer instruction to its server. In version 1, the instruction is encrypted with AES-CTR and nothing else. Mallory sits on the network path and cannot read the traffic, but she knows the app's message format.

```sequence
title: Changing a message without reading it
participant A as Alice's app
participant M as Mallory
participant S as bank.example
A -> M: AES-CTR ciphertext of TO:bob;AMT:0100
note M: Flips bits at the known position of the amount
M -> S: Modified ciphertext
note S: Decrypts to TO:bob;AMT:9100
S --> A: Transfer of 9100 confirmed
```

Step 1. **Why Mallory can do this.** CTR ciphertext is the plaintext XORed with a keystream. The format tells Mallory that byte 11 is the first digit of the amount, and she guesses it is `0`. XORing that ciphertext byte with `ord("0") ^ ord("9")` turns the decrypted digit into `9`.

```python
import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

key, nonce = os.urandom(16), os.urandom(16)
msg = b"TO:bob;AMT:0100"
enc = Cipher(algorithms.AES(key), modes.CTR(nonce)).encryptor()
ct = bytearray(enc.update(msg) + enc.finalize())

ct[11] ^= ord("0") ^ ord("9")   # Mallory's edit: no key needed

dec = Cipher(algorithms.AES(key), modes.CTR(nonce)).decryptor()
print(dec.update(bytes(ct)) + dec.finalize())   # b'TO:bob;AMT:9100'
```

Step 2. **What held and what failed.** Confidentiality held: Mallory never learned the key, and she learned nothing she had not already guessed. Integrity failed completely: the server accepted a message that Alice never sent.

Step 3. **Version 2 uses AES-GCM.** The app passes the header `v1|transfer|session-42` as associated data, and Mallory makes the same edit.

```python
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

aead = AESGCM(AESGCM.generate_key(bit_length=128))
nonce = os.urandom(12)                    # unique for every message under this key
header = b"v1|transfer|session-42"        # authenticated, not encrypted
ct = bytearray(aead.encrypt(nonce, msg, header))

ct[11] ^= ord("0") ^ ord("9")             # the same edit as before
try:
    aead.decrypt(nonce, bytes(ct), header)
except InvalidTag:
    print("rejected: ciphertext or header was modified")
```

Step 4. **The tag catches it.** The 16-byte tag covers the ciphertext and the header, so the edit fails verification and the server never sees altered plaintext. The server rebuilds the header from its own record of the session, so a ciphertext that Mallory copies in from another session also fails to decrypt.

Step 5. **What GCM does not fix.** Mallory can still record a valid message and send the identical bytes again tomorrow. Stopping replay needs sequence numbers, timestamps, or nonces checked by the receiver, which is a protocol property, not a cipher property.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Use an AEAD mode** (AES-GCM or ChaCha20-Poly1305) through a high-level library. Never use ECB for data. Do not ship unauthenticated CBC or CTR.
- **If no AEAD is available**, use encrypt-then-MAC with a separate MAC key, and verify the tag before decrypting.
- **Keep nonces unique per key.** Use a counter that never resets for the life of the key, or random 96-bit nonces within the SP 800-38D limit of 2^32 encryptions per key, and rotate keys before reaching it.
- **Bind context with associated data**: protocol version, direction, message type, and record or session id.
- **Act only on verified plaintext.** Never parse or use output before the tag check passes. Standard AEAD APIs enforce this; hand-rolled streaming decryption often does not.
- **Compare tags in constant time**, with `hmac.compare_digest` in Python, and limit how many verification attempts a client can make.
- **Generate keys with a [[csprng]] and store them in a key manager.** Use one key per purpose.

Limits remain. AEAD does not hide message length or timing, does not stop replay, and cannot help if the key is stolen. Randomness and key handling are covered in [randomness, nonces, and key lifecycle](lesson:CRY-06).

## Common misconceptions

- **"AES-256 means the data is secure."** The mode, nonce handling, and integrity check matter more than key length. AES-256 in ECB mode still leaks patterns.
- **"Tampering produces garbage, so it would be noticed."** CTR edits produce exactly the plaintext the attacker chose. Without a tag check, nothing notices.
- **"The IV or nonce must be secret."** Both are sent in the clear. A nonce must be unique, and a CBC IV must also be unpredictable.
- **"A MAC hides the message."** A MAC provides integrity only. Encrypt the message if it must stay confidential.
- **"Associated data is encrypted."** It is authenticated but stays readable.
- **"Random nonces are always safe."** With random 96-bit nonces, the chance of a repeat grows with every message, so SP 800-38D caps a key at 2^32 encryptions when IVs are random.

## Try it yourself

Run these toy experiments in Python on your own machine (`pip install cryptography`), or use the Web Crypto API in your browser's developer console on any HTTPS page.

1. Run the ECB example with two different 16-byte blocks, then with two equal ones. What changes in the ciphertext?
2. Run the CTR bit-flip example. Then change the edit so the recipient becomes `rob` instead of `bob`. Which byte and which XOR value do you need?
3. Run the AES-GCM example. Then leave the ciphertext untouched but change one character of the header passed to `decrypt`. What happens, and why is that useful?
4. Encrypt two different messages with AES-CTR using the **same** key and nonce, and XOR the two ciphertexts. Compare the result with the XOR of the two plaintexts, and write two sentences on why this makes nonce reuse dangerous.

The same tamper test in the browser console:

```javascript
const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 128 }, false, ["encrypt", "decrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const data = new TextEncoder().encode("TO:bob;AMT:0100");
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
ct[11] ^= "0".charCodeAt(0) ^ "9".charCodeAt(0);   // flip the amount digit
try {
  await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
} catch (e) {
  console.log("rejected:", e.name);   // OperationError
}
```

For each experiment, record which property, confidentiality or integrity, the mode protected, and which it did not.

## Key takeaways

- A block cipher such as AES encrypts one 16-byte block; the mode of operation determines what leaks.
- Confidentiality and integrity are separate: unauthenticated modes let an attacker change messages they cannot read.
- Use an AEAD mode, keep every nonce unique per key, and put context the receiver must agree on into the associated data.
- If you must combine a cipher and a MAC, encrypt first, MAC the ciphertext with a separate key, and verify before decrypting.
- Compare MAC tags in constant time, and remember that AEAD does not stop replay.

## Go deeper

- Boneh and Shoup, [A Graduate Course in Applied Cryptography](https://toc.cryptobook.us/) (version 0.6, January 2023): Chapter 9, "Authenticated encryption," develops the formal definitions and proofs behind this lesson.
- [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final), Section 8 and Appendix A, explains GCM's IV rules and the forgery that follows a repeated IV. NIST announced in 2024 that it will revise the publication; check its page for the current status.
- Open question: nonce-misuse-resistant designs limit the damage of a repeated nonce at some cost in speed. When is that trade worth making, and who in your system controls nonce generation?
