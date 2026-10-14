---
topicId: CRY-03
title: Public-key encryption and key agreement
summary: Learn how two parties who share no secret can agree on a key over a public network, why public-key encryption protects keys rather than bulk data, and why every key exchange must be authenticated.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Trace a Diffie-Hellman exchange, identifying which values are public, which are secret, and who can compute the shared key.
  - Explain why unauthenticated key agreement fails against an active attacker, and how signatures and certificates close the gap.
  - Describe hybrid encryption and the key encapsulation (KEM) interface, and explain why public-key operations protect keys rather than data.
  - Distinguish static key transport from ephemeral key agreement, and explain forward secrecy.
prerequisites: [CRY-01, CRY-02]
concepts:
  [public-key-cryptography, key-exchange, diffie-hellman, key-encapsulation-mechanism, forward-secrecy]
keywords:
  - asymmetric encryption
  - public key
  - private key
  - key pair
  - RSA
  - RSA-OAEP
  - OAEP
  - ECDH
  - ECDHE
  - X25519
  - Curve25519
  - KEM
  - ML-KEM
  - HPKE
  - hybrid encryption
  - key agreement
  - key transport
  - discrete logarithm
  - man-in-the-middle
  - MITM
  - perfect forward secrecy
  - PFS
  - RFC 7748
  - FIPS 203
  - CWE-780
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 10: Diffie-Hellman Key Exchange'
    url: https://textbook.cs161.org/crypto/key-exchange.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 11: Public-Key Encryption'
    url: https://textbook.cs161.org/crypto/public-key.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 7748: Elliptic Curves for Security'
    url: https://www.rfc-editor.org/info/rfc7748
    publisher: IETF (RFC Editor)
  - title: 'FIPS 203: Module-Lattice-Based Key-Encapsulation Mechanism Standard'
    url: https://csrc.nist.gov/pubs/fips/203/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-fips-203
  - title: OWASP Cryptographic Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3'
    url: https://www.rfc-editor.org/info/rfc9846
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9846-tls-1-3
quiz:
  - question: In a Diffie-Hellman exchange with public parameters p and g, what must Alice keep secret?
    choices:
      - The parameters p and g, because they define the group.
      - Her exponent a and the shared value she computes; p, g, and her public value A can all be public.
      - Her public value A, because it reveals a.
      - Nothing, because Diffie-Hellman needs no secrets.
    answer: 1
    explanation: Diffie-Hellman is designed so that everything sent over the wire can be public. Security rests on Alice's random exponent, which never leaves her machine, and on the hardness of computing the shared value from p, g, A, and B.
  - question: Mallory controls the network between Alice and shop.example, which run Diffie-Hellman with no authentication. What can she do?
    choices:
      - Nothing, because Diffie-Hellman resists eavesdroppers.
      - Compute Alice's private exponent from her public value.
      - Only delay or drop messages.
      - Run a separate exchange with each side, so she shares one key with Alice and another with the server, and relay traffic between them.
    answer: 3
    explanation: Diffie-Hellman defeats a passive eavesdropper, but nothing tells Alice that the public value she received came from the server. Mallory substitutes her own value in both directions. Signing the exchange with a key bound to the server's name by a certificate stops this.
  - question: Why does TLS 1.3 use ephemeral (EC)DHE instead of encrypting a session key under the server's long-term RSA key?
    choices:
      - So that stealing the server's long-term private key later does not decrypt sessions that were recorded earlier.
      - Because RSA cannot encrypt a 32-byte key.
      - Because ephemeral keys remove the need for certificates.
      - Because Diffie-Hellman is faster than AES.
    answer: 0
    explanation: With key transport, the long-term key decrypts every recorded session. With ephemeral key agreement, each session's secret is deleted after use, and the long-term key only signs. That property is forward secrecy. Certificates are still needed to authenticate the server.
  - question: A developer encrypts a 5 MB file directly with RSA, chunk by chunk and with no padding. What is the best fix?
    choices:
      - Use a larger RSA modulus.
      - Encrypt each chunk twice.
      - Use hybrid encryption, such as HPKE, in which a fresh key encrypts the file with an AEAD and a KEM or RSA-OAEP protects that key.
      - Base64-encode each chunk before encrypting it.
    answer: 2
    explanation: Unpadded ("textbook") RSA is deterministic and malleable, and public-key operations are slow and limited to small inputs. Hybrid encryption uses public-key cryptography only for a short key and symmetric AEAD for the data. A larger modulus fixes neither problem.
  - question: After an X25519 exchange, Alice and Bob hold the same 32-byte shared secret. What should they do next?
    choices:
      - Use it directly as the AES key for all traffic in both directions.
      - Feed it to a key derivation function such as HKDF, with context such as the protocol name and transcript, to derive separate keys for each purpose and direction.
      - Send it to each other to confirm it matches.
      - Encrypt it with RSA before using it.
    answer: 1
    explanation: A raw Diffie-Hellman output is not a uniformly random key and carries no context. A KDF turns it into independent keys bound to the protocol and session. Sending it would destroy its secrecy, and separate keys per direction prevent reflection problems.
---

## Why it matters

A new HTTPS connection begins with two computers that may never have communicated before agreeing on a secret key while anyone on the network can watch. [Symmetric encryption](lesson:CRY-02) needs that shared key, and [[public-key-cryptography]] supplies it. A browser and shop.example run a [[key-exchange]] inside the [[tls|TLS]] handshake, then switch to authenticated encryption for the actual traffic.

The mathematics is strong; the failures come from assumptions nobody checked. Common ones are a key exchange that nobody authenticated, RSA used without padding (CWE-780, use of RSA without OAEP), a long-term key whose later theft exposes years of recorded traffic, and a shared secret used directly as a key. One more reason for care: a large quantum computer would break the public-key algorithms covered here, which is why this part of cryptography is being replaced first, as [post-quantum migration](lesson:CRY-08) explains.

## The core idea

Public-key cryptography uses a **key pair**: a public key that anyone may know and a private key that only its owner holds. It offers two tools for establishing secrets.

- **Public-key encryption** is like handing out open padlocks. Anyone can snap one shut on a box addressed to Bob, but only Bob has the key that opens it.
- **Key agreement** is like mixing paint, an analogy the CS 161 textbook uses. Alice and Bob each mix a secret color into a shared public color and swap the mixtures. Each adds their own secret color again, and both end up with the same final color. An observer sees only the mixtures and cannot un-mix them.

Three assumptions sit underneath every use of these tools, and naming them is half of protocol analysis:

1. **A hard problem.** RSA relies on the difficulty of factoring, Diffie-Hellman on discrete logarithms, and ML-KEM on module lattice problems.
2. **Fresh, secret randomness.** Private values come from a [[csprng]] and never leave their owner.
3. **Authentic public keys.** Alice must know that the public key she uses really belongs to Bob. Public-key cryptography turns "share a secret" into "know whose key this is," and [digital signatures and certificates](lesson:CRY-04) solve that second problem.

## How it works

### Key pairs and what they are for

Each party generates its own key pair. The public key can be published; the private key never leaves its owner. For encryption, anyone encrypts with the public key and only the private key decrypts. For signatures, the private key signs and anyone verifies with the public key. Public-key operations are far slower than AES and handle only small inputs, so in practice they protect **keys**, and symmetric AEAD protects the data.

### RSA, briefly

RSA's public key is a modulus `n = p × q` (two large secret primes) and an exponent `e`. "Textbook" RSA encrypts a number `m` as `m^e mod n`. Used that way, it is deterministic, so equal messages give equal ciphertexts, and malleable, since multiplying two ciphertexts yields an encryption of the product of their plaintexts. Real systems add randomized OAEP padding. The OWASP Cryptographic Storage Cheat Sheet asks for keys of at least 2048 bits with OAEP and recommends an established hybrid scheme such as HPKE for encrypting data to a public key.

### Diffie-Hellman key agreement

[[diffie-hellman|Diffie-Hellman]] lets two parties compute a shared secret without ever sending it:

1. Everyone agrees on public parameters: a large prime `p` and a generator `g`.
2. Alice picks a random secret `a` and sends `A = g^a mod p`. Bob picks `b` and sends `B = g^b mod p`.
3. Alice computes `B^a mod p` and Bob computes `A^b mod p`. Both equal `g^(ab) mod p`.

An eavesdropper sees `p`, `g`, `A`, and `B`. Computing `g^(ab) mod p` from those values is believed to be infeasible for well-chosen groups, such as 2048-bit primes. Elliptic-curve Diffie-Hellman (ECDH) applies the same idea to points on an elliptic curve and needs much smaller keys. X25519, specified in RFC 7748, uses 32-byte public keys and produces a 32-byte shared secret. The output is never used directly as a key. It is passed through a [[key-derivation-function]] such as HKDF, together with context about the protocol and session.

### Key encapsulation

A [[key-encapsulation-mechanism]] (KEM) is a cleaner interface for the same job. The receiver publishes a public key. The sender runs **encapsulate** on it and gets two outputs: a fresh shared secret and a short ciphertext. The receiver runs **decapsulate** on the ciphertext with the private key and recovers the same secret. FIPS 203 standardizes ML-KEM, a KEM designed to resist quantum attacks, and an IETF specification approved for TLS 1.3 pairs it with X25519 in a hybrid key exchange, as [post-quantum migration](lesson:CRY-08) describes.

### Hybrid encryption

Encrypting data to someone's public key always follows the same pattern, often called hybrid encryption:

| Step | What happens                                           | Primitive             |
| ---- | ------------------------------------------------------ | --------------------- |
| 1    | Create a fresh shared secret for this message          | KEM (or RSA-OAEP)     |
| 2    | Derive a symmetric key from it, bound to context       | KDF such as HKDF      |
| 3    | Encrypt the data and authenticate its header           | AEAD such as AES-GCM  |

The recipient reverses the steps. Standard constructions such as HPKE package these steps so that applications do not assemble them by hand.

### Ephemeral keys and forward secrecy

Compare two ways to set up a session key. In **key transport**, the client picks the session key and encrypts it under the server's long-term RSA public key. Anyone who records the traffic and later steals that private key can decrypt every recorded session. In **ephemeral key agreement**, both sides generate fresh Diffie-Hellman secrets for each session and erase them afterward, and the long-term key is used only to sign. Stealing the long-term key later reveals nothing about past sessions. That property is [[forward-secrecy]]. TLS 1.3 removed static RSA and static Diffie-Hellman key exchange, so every TLS 1.3 handshake that uses public-key exchange provides it.

### The missing piece: authentication

The CS 161 textbook states the limit plainly: Diffie-Hellman is "only secure against a passive adversary and not an active adversary." An [[adversary-in-the-middle]] who can change messages simply runs one exchange with each side:

```sequence
title: Adversary in the middle of unauthenticated Diffie-Hellman
participant A as Alice
participant M as Mallory
participant B as shop.example
A -> M: A = g^a mod p
M -> B: M = g^m mod p (in place of A)
B -> M: B = g^b mod p
M -> A: M = g^m mod p (in place of B)
note A: Key with Mallory: g^(am)
note B: Key with Mallory: g^(bm)
note M: Decrypts, reads, and re-encrypts all traffic
```

Nothing in the math tells Alice where `M` came from. The fix is to authenticate the exchange: the server signs the handshake, including both key shares, with a long-term private key, and the client checks that signature with a public key that a [[certificate]] binds to the name shop.example. TLS 1.3 does exactly this.

## Worked example

Trace the roles, secrets, and assumptions of a Diffie-Hellman exchange using a toy group, `p = 23` and `g = 5`. The numbers are far too small for real use, which is part of the lesson.

**Step 1: Run the exchange.** Alice picks `a = 6`; Bob picks `b = 15`.

```python
p, g = 23, 5            # toy group: hopelessly small for real use
a, b = 6, 15            # secret exponents, normally from a CSPRNG
A = pow(g, a, p)        # Alice sends 8
B = pow(g, b, p)        # Bob sends 19
print(A, B, pow(B, a, p), pow(A, b, p))   # 8 19 2 2
```

**Step 2: Record who knows what.**

| Value          | Chosen or computed by | Sent on the wire? | Known to          |
| -------------- | --------------------- | ----------------- | ----------------- |
| p = 23, g = 5  | Agreed in advance     | Yes               | Everyone          |
| a = 6          | Alice                 | No                | Alice             |
| b = 15         | Bob                   | No                | Bob               |
| A = 8          | Alice                 | Yes               | Everyone          |
| B = 19         | Bob                   | Yes               | Everyone          |
| shared = 2     | Both, independently   | No                | Alice and Bob     |

**Step 3: Test assumption 1, the hard problem.** Eve sees `p`, `g`, `A`, and `B`. In this toy group she can try all 22 possible exponents and find `a = 6` instantly. In a 2048-bit group or on X25519, that search is far beyond any computer, so the assumption holds only for properly sized parameters.

**Step 4: Test assumption 3, authentic keys.** Mallory picks `m = 13` and sends `M = 5^13 mod 23 = 21` to both sides. Alice computes `21^6 mod 23 = 18`, and Mallory computes the same value from `A`. Bob computes `21^15 mod 23 = 7`, and Mallory computes that from `B`. Alice and Bob each believe they share a key with the other, but both share keys with Mallory. Nothing broke the math; the protocol assumed authenticity it never checked.

**Step 5: Repair the protocol and list the new assumptions.** Bob signs `(A, B)` plus both identities with his long-term signing key, and Alice verifies the signature with Bob's public key from a certificate. Mallory cannot sign her substituted value as Bob. The repaired protocol now assumes that the signature scheme is unforgeable and that Alice obtained Bob's public key from a trustworthy source. Finally, both sides feed the shared secret into a KDF with context. With real parameters, the whole exchange looks like this:

```python
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

alice = X25519PrivateKey.generate()   # ephemeral: one per session
bob = X25519PrivateKey.generate()
# Each side sends only its 32-byte public key (and must authenticate it)
shared_a = alice.exchange(bob.public_key())
shared_b = bob.exchange(alice.public_key())
assert shared_a == shared_b

key = HKDF(
    algorithm=hashes.SHA256(), length=32, salt=None,
    info=b"shop.example v1 client-to-server key",   # context binding
).derive(shared_a)
```

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Authenticate every key exchange.** Sign the handshake transcript with a certified long-term key, or use a pre-shared key. Check the identity in the certificate, not just the signature.
- **Prefer ephemeral key agreement** for forward secrecy, and erase ephemeral secrets as soon as the keys are derived.
- **Use standard groups and curves**, such as X25519 or NIST P-256, through a maintained library. Never invent parameters, and let the library validate peer public values.
- **Never use textbook RSA.** Use RSA-OAEP with at least 2048-bit keys, or better, a KEM inside a standard hybrid scheme such as HPKE.
- **Derive keys with a KDF** and bind them to the protocol, roles, and transcript. Use separate keys for each direction.
- **Plan for quantum attacks.** Hybrid key exchange that combines ML-KEM with X25519 has been approved for TLS 1.3; see [post-quantum migration](lesson:CRY-08).

Each defense has limits. Authentication is only as good as the certificate system behind it. Forward secrecy does not protect a session whose keys are stolen while it is running, and nothing here helps if an endpoint itself is compromised.

## Common misconceptions

- **"Public-key encryption is for encrypting files."** It protects short keys. The data goes through symmetric AEAD.
- **"Diffie-Hellman authenticates the server."** Plain Diffie-Hellman authenticates nobody. Authentication comes from signatures, certificates, or pre-shared keys.
- **"Public keys should be kept fairly private."** Disclosure of a public key is harmless. The threat is **substitution**, which is why public keys need certificates.
- **"Forward secrecy means recorded traffic can never be decrypted."** It protects past sessions against later theft of long-term keys. It does not help if the key-agreement algorithm itself is broken, for example by a future quantum computer.
- **"A bigger RSA key fixes textbook RSA."** Size does not fix determinism or malleability; padding such as OAEP does.

## Try it yourself

Work on paper first, then check your answers in Python on your own machine.

1. Use `p = 29` and `g = 2`. Pick your own secrets for Alice and Bob, compute both public values, and confirm that both sides reach the same shared value.
2. Fill in a "who knows what" table like the one in the worked example, with a row for every value.
3. Play Mallory with an exponent of your choice. Compute the two keys she ends up sharing, and mark which rows of your table changed.
4. Write the assumptions your protocol depends on, then add one sentence for each describing what an attacker gains if it fails.
5. Run the X25519 example, deriving a key on each side from its own shared value. Change the `info` string on one side only and observe that the two keys no longer match. Explain in two sentences why binding context into key derivation is useful.

## Key takeaways

- Public-key cryptography lets strangers establish secrets, but it protects keys; symmetric AEAD protects the data.
- In Diffie-Hellman, everything sent is public; security rests on secret random exponents and a hard problem.
- Unauthenticated key agreement falls to an adversary in the middle. Authenticate the exchange with signatures and certificates.
- Ephemeral key agreement gives forward secrecy, which static RSA key transport cannot.
- Pass shared secrets through a KDF with context, and never use textbook RSA.

## Go deeper

- [RFC 7748](https://www.rfc-editor.org/info/rfc7748) specifies X25519 and X448. Compare its design goals with those of classic finite-field Diffie-Hellman groups.
- [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) defines ML-KEM's parameter sets and the KEM interface used in post-quantum key exchange.
- Boneh and Shoup, [A Graduate Course in Applied Cryptography](https://toc.cryptobook.us/) (version 0.6), Chapters 10 to 12, develop public-key encryption and chosen-ciphertext security formally, and Chapter 21 covers authenticated key exchange. Open question: what exactly should a handshake signature cover so that an attacker cannot splice together pieces of two different sessions?
