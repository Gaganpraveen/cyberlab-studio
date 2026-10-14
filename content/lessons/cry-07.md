---
topicId: CRY-07
title: Cryptographic protocol composition
summary: Learn why secure primitives can still form insecure protocols, how replay, reflection, downgrade, and padding-oracle attacks exploit missing checks, and how TLS 1.3 binds freshness, context, and the whole handshake together.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 50
objectives:
  - Explain why authenticated encryption alone does not stop replay, reordering, reflection, or cross-context reuse.
  - Compare encrypt-and-MAC, MAC-then-encrypt, and encrypt-then-MAC, and explain how checking in the wrong order creates a padding oracle.
  - Analyze a protocol message for freshness, order, direction, session, and purpose, and name the field or key that enforces each.
  - Describe how TLS 1.3 resists downgrade and binds the handshake transcript, and identify where 0-RTT data loses replay protection.
  - Repair a toy protocol with per-direction keys, sequence numbers, and associated data.
prerequisites: [CRY-02, CRY-03, CRY-04, NET-05]
concepts: [replay-attack, downgrade-attack, padding-oracle-attack]
keywords:
  - protocol composition
  - replay
  - replay protection
  - freshness
  - sequence number
  - challenge-response
  - reflection attack
  - cross-protocol attack
  - context binding
  - domain separation
  - associated data
  - downgrade
  - version rollback
  - fallback
  - TLS_FALLBACK_SCSV
  - padding oracle
  - Lucky Thirteen
  - POODLE
  - encrypt-then-MAC
  - MAC-then-encrypt
  - encrypt-and-MAC
  - transcript
  - Finished
  - CertificateVerify
  - 0-RTT
  - early data
  - Dolev-Yao
  - RFC 9846
  - RFC 8446
  - RFC 7457
  - RFC 7507
  - RFC 7366
  - CVE-2013-0169
  - CVE-2014-3566
sources:
  - title: 'RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3'
    url: https://www.rfc-editor.org/info/rfc9846
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9846-tls-1-3
  - title: 'RFC 7457: Summarizing Known Attacks on Transport Layer Security (TLS) and Datagram TLS (DTLS)'
    url: https://www.rfc-editor.org/info/rfc7457
    publisher: IETF (RFC Editor)
  - title: 'RFC 7507: TLS Fallback Signaling Cipher Suite Value (SCSV) for Preventing Protocol Downgrade Attacks'
    url: https://www.rfc-editor.org/rfc/rfc7507.html
    publisher: IETF (RFC Editor)
  - title: 'Computer Security (CS 161 textbook), Ch. 8: Message Authentication Codes (MACs)'
    url: https://textbook.cs161.org/crypto/macs.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 31: TLS'
    url: https://textbook.cs161.org/network/tls.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 8725: JSON Web Token Best Current Practices'
    url: https://www.rfc-editor.org/info/rfc8725
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-8725-jwt-bcp
quiz:
  - question: A service seals every request with AES-GCM under a per-session key, using a fresh random nonce and no associated data. Mallory records a valid "pay bob $100" request and sends it again in the same session. What happens?
    choices:
      - The server rejects it, because that nonce was already used.
      - Decryption fails, because GCM detects copied ciphertexts.
      - It decrypts and verifies normally, because nothing in the message tells the server it is a copy.
      - It fails, because AES-GCM changes the key after every message.
    answer: 2
    explanation: AEAD proves that a key holder produced these exact bytes, and a copy is exactly those bytes. The nonce keeps the sender's keystream unique; the receiver does not track nonces unless the protocol requires it. Freshness needs a sequence number, challenge, or timestamp that the receiver checks.
  - question: Why did MAC-then-encrypt with CBC mode lead to padding-oracle attacks?
    choices:
      - HMAC becomes weak when its output is encrypted.
      - The receiver had to decrypt and check the padding before it could verify the MAC, and its different reactions revealed whether the padding was valid.
      - CBC mode encrypts every block with a different key, which leaks the padding length.
      - The MAC was sent in the clear next to the ciphertext.
    answer: 1
    explanation: The receiver processed unauthenticated data first. Distinct errors or timing for "bad padding" and "bad MAC" turned it into an oracle that answers one question about the plaintext per query. Encrypt-then-MAC or an AEAD mode rejects every modified ciphertext before decryption, so the question is never answered.
  - question: In TLS 1.3, why does an attacker's edit to the ClientHello, such as deleting the strongest cipher suites, cause the handshake to fail?
    choices:
      - The Finished MAC and the server's CertificateVerify signature both cover the entire handshake, so the two sides' views of it no longer match.
      - The ClientHello is encrypted under the server's public key.
      - TLS 1.3 servers ignore the client's list and always pick the strongest suite.
      - The downgrade marker in the server's random value encodes the client's cipher-suite list.
    answer: 0
    explanation: Each side computes its checks over the transcript it actually saw. If Mallory altered any message, the transcripts differ and verification fails. The downgrade marker is a separate mechanism that signals a fallback to TLS 1.2 or older.
  - question: Alice's app and bank.example use one AES-GCM key for both directions. Which attack does this allow that separate per-direction keys prevent?
    choices:
      - A padding oracle, because AES-GCM uses padding.
      - A downgrade to an older TLS version.
      - Brute-forcing the key twice as fast.
      - Reflection, in which a message the server sent is fed back to the server and still verifies.
    answer: 3
    explanation: With one shared key, the tag cannot say who wrote a message. A server-to-client message sent back to the server verifies, and if the formats match it may be acted on. Per-direction keys, or a direction label in the associated data, make such a message fail.
  - question: TLS 1.3 lets a returning client send 0-RTT early data in its first flight. Which shop.example request is reasonable to accept as early data?
    choices:
      - A POST to /checkout that charges a card.
      - A POST to /account/password that changes the password.
      - A GET of /products?category=lamps that only reads the catalog.
      - A DELETE of /account that closes the account.
    answer: 2
    explanation: RFC 9846 gives no guarantee that early data will not be replayed between connections, because it does not depend on the server's fresh random value. Accept it only for requests that are safe to repeat, such as reading a catalog.
---

## Why it matters

Each primitive in this domain makes a precise promise. [[aead|Authenticated encryption]] keeps a message secret and detects any change to it, a [[mac]] detects forgery, and a [[digital-signature]] shows who signed. None of them says whether a message is new, meant for you, or in order, or whether the other side agreed to the same settings. Those guarantees come from the **protocol**: which messages are sent, in what order, under which keys, and what the receiver checks before acting.

[[tls|TLS]] shows what happens when composition goes wrong. Before version 1.3 it used well-studied primitives, yet RFC 7457, a 2015 IETF summary of known attacks, lists many failures. Lucky Thirteen and POODLE were padding-oracle attacks enabled by the MAC-then-encrypt record design of TLS and its predecessor SSL 3.0. Others included a renegotiation attack, the triple handshake attack, and downgrades that stripped TLS away entirely. None broke AES or HMAC; each exploited how the pieces were combined, negotiated, or checked.

TLS 1.3, now specified in RFC 9846, was redesigned around those lessons, so it is this lesson's positive example.

## The core idea

Think of a paper check. A valid signature does not stop someone from depositing a photocopy of a check that was already cashed, so banks also check the check number, the payee, and the date. A cryptographic tag is like the signature: it proves that someone holding the key produced exactly these bytes, and nothing more.

The standard assumption is a network attacker, often called the Dolev–Yao model. Mallory can read, record, drop, delay, reorder, replay, and inject messages, and she can open her own sessions with anyone. She cannot break the primitives or steal keys. Against her, a receiver must answer five questions before acting on a message, and a valid tag answers none of them:

| Question the receiver must answer                     | Typical mechanism                                    | Attack when it is missing          |
| ----------------------------------------------------- | ---------------------------------------------------- | ---------------------------------- |
| Have I accepted this message before?                  | Challenge [[nonce]], sequence number, timestamp      | [[replay-attack]]                  |
| Is this the next message, with none missing?          | Sequence numbers, an end-of-session message          | Reordering, deletion, truncation   |
| Was it made for this session, direction, and purpose? | Associated data, per-direction keys, audience fields | Reflection, splicing, substitution |
| Do we agree on everything negotiated so far?          | A MAC or signature over the whole handshake          | [[downgrade-attack]]               |
| Did I authenticate before processing anything?        | Encrypt-then-MAC or AEAD, with one uniform error     | [[padding-oracle-attack]]          |

## How it works

### Combining encryption and a MAC

[Symmetric encryption and authenticated encryption](lesson:CRY-02) introduced three ways to combine a cipher with a MAC (E is encryption; k1 and k2 are separate keys). They differ in what the receiver does first:

| Construction                               | Receiver's first step      | Consequence                                 |
| ------------------------------------------ | -------------------------- | ------------------------------------------- |
| Encrypt-and-MAC: E(k1, m), MAC(k2, m)      | Decrypt, then check        | Tag on plaintext; MACs promise no secrecy   |
| MAC-then-encrypt: E(k1, m ‖ MAC(k2, m))    | Decrypt, unpad, then check | Unauthenticated data processed first        |
| Encrypt-then-MAC: c = E(k1, m), MAC(k2, c) | Check the tag              | Forgeries rejected before decryption        |

The CS 161 textbook recommends encrypt-then-MAC with separate keys, and AEAD gives the same guarantee in one call. TLS up to 1.2 used MAC-then-encrypt in its CBC suites; RFC 7457 recommends AEAD or encrypt-then-MAC (RFC 7366) instead.

### Padding oracles, conceptually

CBC mode pads the final block with a recognizable pattern. In MAC-then-encrypt, the receiver must decrypt and check the padding before it can even find the tag. If it reacts differently to bad padding than to a bad tag (a different error, alert, or processing time), it becomes an **oracle**: each modified ciphertext tells Mallory whether the hidden plaintext ended in valid padding.

One bit per query is enough. In CBC decryption, each plaintext block is the block cipher's output XORed with the previous ciphertext block, so changing a byte of that previous block flips the same bits in the plaintext. By choosing changes systematically, Mallory deduces the plaintext byte by byte without learning the key. Serge Vaudenay described the idea in 2002.

```sequence
title: A padding oracle in a MAC-then-encrypt receiver
participant M as Mallory
participant S as shop.example
note M: Recorded one encrypted request with a cookie
M -> S: The ciphertext with one byte changed
S --> M: Error: bad padding
M -> S: The ciphertext with a different change
S --> M: Error: bad MAC, so the padding was valid
note M: Each valid-padding answer leaks plaintext
M -x S: Encrypt-then-MAC: every change fails the tag
```

In the diagram, the server's two different errors are the leak. The last line shows the fix: a receiver that checks the tag first, so every modified ciphertext fails the same way. The CS 161 textbook notes side-channel attacks on MAC-then-encrypt through timing and error messages, including a padding oracle against a TLS implementation. Lucky Thirteen used a [[timing-attack|timing side channel]], so identical error messages are not enough; the order of the checks must change.

### Downgrade: attacking the negotiation

Most protocols negotiate: the client offers versions and algorithms, and the server chooses. If nothing later confirms the offer, Mallory can edit it so both sides settle on the weakest option they share, a [[downgrade-attack]]. RFC 7507 explains that many clients retried with a lower version after a failed handshake, to cope with buggy servers, so Mallory needed only to make the first attempts fail. POODLE paired this fallback with SSL 3.0's padding weakness. RFC 7507's TLS_FALLBACK_SCSV signal marks a retry as a fallback, so a server that supports a higher version can abort.

The durable fix is to authenticate the negotiation. In TLS 1.3, Finished is a MAC over the entire handshake and CertificateVerify is the server's signature over it (RFC 9846), so any edit makes the transcripts differ and the checks fail. For older versions, a TLS 1.3 server that negotiates TLS 1.2 puts a fixed marker in the last 8 bytes of its random value (`44 4F 57 4E 47 52 44 01`, ASCII "DOWNGRD" plus 0x01), and a TLS 1.3 client that sees it aborts. In TLS 1.2 with ephemeral key exchange, the server signs both random values, so the marker cannot be erased unnoticed. RFC 9846 calls this protection limited; it does not cover static RSA key exchange.

### Binding messages to their context

When directions, sessions, purposes, or recipients share a key, the tag cannot tell them apart, and Mallory can move a message to a context where it means something else:

- **Reflection.** With one key for both directions, Mallory returns Alice's own message to her, and it verifies as if Bob had sent it. Use a key or label per direction; the CS 161 TLS chapter shows TLS deriving separate keys for each side, and TLS 1.3 gives each sender its own traffic secret.
- **Substitution.** RFC 8725 describes a [[jwt|JSON Web Token]] issued for one recipient or purpose being accepted by another; its fixes include checking the audience (`aud`) claim. The general rule is **domain separation**: every key, signature, and token says what it is for, and the verifier checks.
- **Fields outside the tag.** If only the amount is authenticated, Mallory changes the account number.

AEAD associated data is authenticated but not encrypted, so headers, session ids, and sequence numbers can be bound to a ciphertext. A [[key-derivation-function]] with distinct labels supplies separate keys, and fresh session keys stop messages from moving between sessions.

### Freshness and replay

A [[replay-attack]] resends a valid message so the receiver acts on it again; a copy is not a modification, so no tag catches it. Freshness comes from a challenge the verifier chose (one more round trip), a sequence number (state that must survive restarts), or a timestamp window (synchronized clocks, plus a cache for replays inside the window).

In TLS, fresh random values from both sides give every connection different keys (CS 161), and RFC 9846 credits the server's random value with replay protection for ordinary TLS 1.3 data. The exception is **0-RTT early data**, sent by a returning client before the server contributes anything fresh. RFC 9846 warns that it has no guarantee of non-replay between connections, so accept it only for requests that are safe to repeat.

### TLS 1.3 as the positive example

| TLS 1.3 design choice (RFC 9846)                          | Failure it rules out                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| Only AEAD algorithms protect records                      | MAC-then-encrypt padding oracles                                  |
| Static RSA and static Diffie-Hellman key exchange removed | Decrypting recorded traffic after a key theft ([[forward-secrecy]]) |
| Finished and CertificateVerify cover the whole handshake  | Tampering with the negotiation                                    |
| A downgrade marker in the server's random value           | Silent rollback to TLS 1.2 or older                               |
| A separate traffic secret for each sender                 | Reflecting records back to their sender                           |
| A fresh server random value in every handshake            | Replaying ordinary data into a new connection                     |
| No compression and no renegotiation                       | Compression attacks such as CRIME, and renegotiation attacks      |

TLS 1.3 mostly removed options. Every option is a negotiation an attacker can steer and a code path someone must get right.

## Worked example

Your task is to find the replay, binding, and context assumptions in a deliberately weak protocol at a fictional bank.

**Setup.** Alice's banking app talks to `bank.example` over a custom encrypted channel. (A real app should use TLS; the toy makes the reasoning visible.) At install time, the app and server agreed on one 256-bit key `K`. Version 0 seals every instruction like this, and the server executes anything that decrypts:

```python
nonce = os.urandom(12)
blob = nonce + AESGCM(K).encrypt(nonce, b'{"op":"transfer","to":"bob","cents":10000}', None)
```

The server sends receipts back to the app sealed the same way, with the same key and the same JSON format.

**Step 1: list the server's assumptions and test each.**

| Assumption the server makes                 | Enforced in v0?                 | What Mallory can do                                    |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| This instruction is new                     | No                              | Resend a captured transfer, so Bob is paid again       |
| Instructions arrive in order                | No                              | Deliver an old "change payee" after a newer one        |
| It came from the app, not from the server   | No: one key for both directions | Reflect a receipt, which parses as a new transfer      |
| It belongs to this session                  | No: one key for months          | Replay last month's messages today                     |
| It is meant for this endpoint and version   | No                              | Move a message between endpoints that share `K`        |

Every row fails, and AES-GCM works perfectly in every one of them.

**Step 2: watch the replay.**

```sequence
title: Toy protocol v0: replaying a transfer
participant A as Alice's app
participant M as Mallory
participant S as bank.example
A -> S: nonce + AES-GCM(K, pay bob 100.00)
note M: Records the bytes on a shared network
S --> A: Receipt: transfer done
M -> S: The same bytes, sent again
S --> M: Tag valid: second transfer done
note S: Nothing in the message shows it was used
```

The copy is byte-for-byte genuine, so the tag check passes. The nonce does not help: it keeps the sender's keystream unique, but the server never checks for repeats.

**Step 3: design version 1.** Version 1 runs a fresh key exchange per session, derives one key per direction with HKDF, numbers every message, and binds the protocol name, version, direction, session id, and sequence number into the associated data. The receiver accepts only sequence numbers above the highest it has seen.

```python
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

def direction_key(session_secret: bytes, direction: bytes) -> bytes:
    """A separate key for each direction, from this session's fresh secret."""
    return HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
                info=b"bank.example transfer v1 " + direction).derive(session_secret)

def context(direction: str, session_id: str, seq: int) -> bytes:
    """Everything the receiver relies on, bound into the tag as associated data."""
    return f"bank.example/transfer/v1|{direction}|{session_id}|{seq}".encode()

def seal(key: bytes, direction: str, session_id: str, seq: int, msg: bytes) -> tuple[int, bytes, bytes]:
    nonce = os.urandom(12)
    return seq, nonce, AESGCM(key).encrypt(nonce, msg, context(direction, session_id, seq))

class Receiver:
    def __init__(self, key: bytes, direction: str, session_id: str):
        self.aead = AESGCM(key)
        self.direction = direction
        self.session_id = session_id
        self.highest_seq = 0

    def accept(self, seq: int, nonce: bytes, ct: bytes) -> bytes:
        if seq <= self.highest_seq:
            raise ValueError("rejected: replayed or out of order")
        ad = context(self.direction, self.session_id, seq)
        plaintext = self.aead.decrypt(nonce, ct, ad)   # InvalidTag on any mismatch
        # Advance only after the tag checks out. Advancing first would let Mallory
        # send garbage labeled seq 1,000,000 and lock out every genuine message.
        self.highest_seq = seq
        return plaintext

# On the server, for one session:
# inbox = Receiver(direction_key(session_secret, b"c2s"), "c2s", session_id)
```

**Step 4: rerun the attacks against version 1.**

```sequence
title: Toy protocol v1: the same attacks fail
participant A as Alice's app
participant M as Mallory
participant S as bank.example
A -> S: seq 7, nonce, AES-GCM(c2s key, pay bob, AD)
S --> A: Receipt sealed under the s2c key
M -x S: seq 7 again: not above the highest seen
M -x S: Same bytes relabeled seq 8: tag fails
M -x S: The receipt sent back: wrong key, tag fails
```

Each rejection maps to one change: the replay fails the sequence check, the relabeled copy fails because the sequence number is in the associated data, and the reflected receipt fails because it was sealed under the server-to-client key. A message from another session fails on its session id. In a real service, `ValueError` and `InvalidTag` should produce the same response.

**Step 5: state what version 1 still does not do.** It cannot detect messages Mallory silently drops, so the app needs acknowledgments. It loses replay protection if the server forgets `highest_seq` mid-session, for example after a crash. And it is only as strong as the key exchange behind `session_secret`: if that exchange was unauthenticated, Mallory can run version 1 flawlessly with each side as an [[adversary-in-the-middle]].

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Use a standard, analyzed protocol.** TLS 1.3 already provides freshness, per-direction keys, transcript authentication, and downgrade resistance.
- **Authenticate everything the receiver acts on**: version, message type, direction, session, sequence number, and recipient.
- **Separate keys** by direction, purpose, and session.
- **Authenticate before processing.** Verify the tag before decrypting, unpadding, decompressing, or parsing, and give every failure the same response.
- **Authenticate the negotiation.** Cover the full transcript, never fall back silently, and remove legacy versions instead of keeping them "just in case."
- **Design freshness explicitly**, and accept TLS 0-RTT data only for requests that are safe to repeat.
- **Write down the security goals and check them**, ideally with [[formal-verification]] ([formal modeling](lesson:RES-05)).

Each defense has limits: uniform errors do not hide timing, sequence numbers need state that survives crashes, associated data binds only what you put in it, and a standard protocol can still be configured to accept weak options.

## Common misconceptions

- **"AEAD prevents replay."** It authenticates bytes, and a copy has the same bytes. Freshness needs a counter, challenge, or timestamp that the receiver checks.
- **"The nonce stops replays."** An AES-GCM nonce keeps the keystream unique for the sender. The receiver rejects repeats only if the protocol makes it track them.
- **"Keeping old versions enabled is harmless if new ones are preferred."** An attacker who can steer the negotiation, or force a fallback, picks the old one for you.
- **"A generic error message fixes padding oracles."** Timing can still reveal the difference. Checking the tag first removes the oracle.

## Try it yourself

Use paper for Part A and Python on your own machine for Part B.

**Part A: a smart lock.** A lock at `lock.test` and Alice's phone share a key K.

1. Version 1: the phone sends `UNLOCK` followed by `HMAC(K, "UNLOCK")`. Explain how Mallory, who records radio traffic near the door today, gets in tomorrow.
2. Version 2: the lock sends a random 128-bit challenge c, and the phone answers `HMAC(K, c)`. Which attack does this stop, and what must the lock remember?
3. Version 3: so the phone can check the lock too, the phone opens with a challenge d, the lock replies with `HMAC(K, d)` and its own challenge c, and the phone answers `HMAC(K, c)`. If the lock accepts two connections at once, show how Mallory, posing as the phone, makes the lock answer its own challenge. Fix it with a direction label.
4. For your final version, name the field or key that provides freshness, direction binding, and purpose binding.

**Part B: break your own fix.** Copy the version 1 code, write a test for each attack in Step 4 plus one for another session's message, then delete one field at a time from `context()` and record which test starts failing. You will have rebuilt the assumptions table from evidence.

## Key takeaways

- A valid tag proves who made the bytes, not that they are fresh, in order, or meant for this context; the protocol must supply those checks.
- Authenticate before you process: encrypt-then-MAC or AEAD removes padding oracles, and error hiding alone does not.
- Bind every message to its direction, session, purpose, and position with separate keys and associated data.
- Authenticate the whole negotiation, as TLS 1.3 does with its Finished MAC and CertificateVerify signature, and refuse silent fallback.
- Replay protection needs explicit freshness, and TLS 1.3 0-RTT data gives it up between connections.

## Go deeper

- [RFC 7457](https://www.rfc-editor.org/info/rfc7457) catalogs attacks on TLS up to 2015. Match each to the TLS 1.3 design choice that addresses it, and note any that no protocol change could fix.
- [RFC 9846](https://www.rfc-editor.org/info/rfc9846), Section 8, describes server mechanisms that limit 0-RTT replay. Compare their state requirements with the worked example's sequence numbers.
- Boneh and Shoup, [A Graduate Course in Applied Cryptography](https://toc.cryptobook.us/) (version 0.6), Chapter 21, treats authenticated key exchange formally.
- Open question: two protocols that are each secure can fail when they share a key or certificate. How would you test a deployment for such cross-protocol interactions?
