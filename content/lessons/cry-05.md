---
topicId: CRY-05
title: Password hashing and key derivation
summary: Work out what an attacker who steals a password database must spend to crack it, and how salts, work factors, memory-hard functions, and peppers raise that cost; then choose between password-based KDFs and HKDF.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Calculate an attacker's search time from keyspace size, guessing rate, and work factor.
  - Explain how a salt, a work factor, memory hardness, and a pepper each change an offline attacker's cost, and the limit of each.
  - Configure Argon2id, scrypt, or PBKDF2 to current OWASP and NIST guidance, storing the algorithm, parameters, and salt with each hash.
  - Choose between a password-based KDF and HKDF for a given secret, and justify the choice.
prerequisites: [CRY-01, IAM-02]
concepts: [password-hashing, salt, rainbow-table, key-derivation-function, entropy]
labs: [password-cracking]
keywords:
  - password storage
  - password hash
  - Argon2
  - Argon2id
  - scrypt
  - bcrypt
  - PBKDF2
  - HKDF
  - KDF
  - salt
  - pepper
  - work factor
  - cost factor
  - memory-hard function
  - offline attack
  - dictionary attack
  - brute force
  - keyspace
  - password cracking
  - RFC 9106
  - RFC 5869
  - NIST SP 800-63B-4
  - NIST SP 800-132
  - CWE-916
  - CWE-759
sources:
  - title: OWASP Password Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-63b
  - title: 'RFC 9106: Argon2 Memory-Hard Function for Password Hashing and Proof-of-Work Applications'
    url: https://www.rfc-editor.org/info/rfc9106
    publisher: RFC Editor (IRTF Crypto Forum Research Group)
  - title: 'NIST SP 800-132: Recommendation for Password-Based Key Derivation, Part 1: Storage Applications'
    url: https://csrc.nist.gov/pubs/sp/800/132/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: 'RFC 5869: HMAC-based Extract-and-Expand Key Derivation Function (HKDF)'
    url: https://www.rfc-editor.org/info/rfc5869
    publisher: IETF (RFC Editor)
  - title: 'Computer Security (CS 161 textbook), Ch. 14: Passwords'
    url: https://textbook.cs161.org/crypto/passwords.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
quiz:
  - question: Two shop.example users chose the same password, and the site uses a unique random salt per user. What does an attacker who steals the table see?
    choices:
      - Two different hashes, so the shared password is not visible and each account must be attacked separately.
      - Two identical hashes, revealing that the passwords match.
      - Both passwords in plaintext, because the salts are stored unencrypted.
      - Nothing useful, because salted hashes cannot be attacked at all.
    answer: 0
    explanation: The salt changes the input to the hash, so equal passwords give different outputs. Salts are not secret, so each account can still be attacked by guessing, but every guess now works against only one account, and precomputed tables are useless.
  - question: shop.example uses PBKDF2-HMAC-SHA256 with 600,000 iterations. Why does that still not protect a user whose password is `Summer2024!`?
    choices:
      - Because PBKDF2 has been broken.
      - Because the salt is stored next to the hash.
      - Because the password is near the top of every attacker's candidate list, so even expensive guesses reach it quickly.
      - Because PBKDF2 cannot handle punctuation.
    answer: 2
    explanation: A work factor multiplies the cost of every guess, but if the right password is among the first few thousand guesses, the total cost stays small. Blocklists, longer passwords, and multi-factor authentication address what hashing cannot.
  - question: What does a memory-hard function such as Argon2id or scrypt add beyond a high iteration count?
    choices:
      - Longer hash outputs that take more storage.
      - A large memory requirement for every guess, which limits how many guesses GPUs or custom chips can run in parallel.
      - Encryption of the password with a server key.
      - The ability to skip the salt.
    answer: 1
    explanation: Attackers gain most of their speed by running thousands of guesses side by side on cheap parallel hardware. If each guess needs many megabytes of memory, memory size and bandwidth cap that parallelism, while a defender's server pays the cost only once per login.
  - question: Where should a pepper be kept?
    choices:
      - In each user's row, next to the salt.
      - Inside the encoded hash string.
      - In the application's source code repository.
      - Outside the database, for example in a key management service or hardware security module.
    answer: 3
    explanation: A pepper helps only if an attacker who steals the database does not also get the pepper. Storing it with the hashes, or in a repository, defeats the purpose. It is a secret key and needs key management, including a plan for rotation.
  - question: A service must derive an AES key from a 256-bit random shared secret, and another key from a user's passphrase. Which choice is correct?
    choices:
      - HKDF for both, because it is the modern KDF.
      - Argon2id for both, because slower is always safer.
      - HKDF for the random secret, and a password-based KDF such as Argon2id or PBKDF2 for the passphrase.
      - SHA-256 for both, truncated to the key length.
    answer: 2
    explanation: HKDF is designed for secrets that are already high-entropy; it is fast and binds context. A passphrase is guessable, so its KDF must be salted and deliberately expensive. Slowing down a random 256-bit secret adds cost without adding security.
---

## Why it matters

Websites get breached, and password tables leak with them. Once an attacker holds the table, the login form's rate limits and lockouts no longer apply: the attacker can test guesses offline, as fast as their hardware allows, and use any password that works on other sites where the same person reused it. How the site stored the passwords decides whether the attacker recovers most of them in minutes or few of them in years.

MITRE's weakness catalog names the common mistakes, including CWE-759 (a one-way hash without a salt) and CWE-916 (a password hash with insufficient computational effort). The fixes are well understood and inexpensive. This lesson is about why they work, expressed as arithmetic you can check.

## The core idea

A password is a secret that a human chose, so it has far less [[entropy]] than a random key. Treat a stored password hash as an object the attacker will eventually hold, and ask what each guess costs them.

The attacker's work is roughly:

```text
time = (number of guesses needed) × (cost per guess) ÷ (guesses the hardware runs at once)
```

Every defense in this lesson attacks one of those factors:

- A [[salt]] stops one guess from being checked against every account at once, and makes precomputed tables useless.
- A **work factor** multiplies the cost per guess.
- **Memory hardness** shrinks how many guesses cheap parallel hardware can run at once.
- A **pepper**, a secret key stored outside the database, makes guessing impossible for someone who steals only the database.
- None of them reduces the number of guesses needed for a password like `password1`. Blocklists, length, and multi-factor authentication do that.

## How it works

### The arithmetic of guessing

A **keyspace** is the set of possible passwords under some rule. If a password is 8 lowercase letters, there are `26^8 ≈ 2.1 × 10^11` possibilities. With all 95 printable ASCII characters, there are `95^8 ≈ 6.6 × 10^15`.

For round numbers, assume the attacker can compute 10 billion (`10^10`) fast hashes per second; the exact rate depends on hardware, and the ratios are what matter. Then:

| Password rule                             | Keyspace         | Exhaustive search at `10^10` per second |
| ----------------------------------------- | ---------------- | --------------------------------------- |
| 8 lowercase letters                       | `2.1 × 10^11`    | About 21 seconds                        |
| 8 printable ASCII characters              | `6.6 × 10^15`    | About 7.7 days                          |
| 12 printable ASCII characters             | `5.4 × 10^23`    | About 1.7 million years                 |
| A password from a list of a million common ones | `10^6`     | About 0.0001 seconds                    |

The last row is the real problem. People do not choose uniformly at random, so attackers try likely passwords first, from leaked-password lists and variations on them. This is a [[brute-force-attack]] made smarter by ordering.

### Salts: one guess, one account

An unsalted hash maps equal passwords to equal hashes. The attacker hashes each guess once and looks it up among all the stolen hashes, so a single pass over a candidate list attacks every account at once. They can even compute the hashes in advance; a [[rainbow-table]] is a compressed form of such a precomputed table.

A salt is a random value, unique to each account and stored next to the hash, that is mixed into the computation. Salts are not secret. They work because each guess must now be recomputed for every account, and nothing can be precomputed before the salts are known. NIST SP 800-63B-4 requires salts of at least 32 bits, and modern password-hashing libraries generate a salt automatically.

### Work factors: making each guess expensive

A [[password-hashing]] function is a deliberately slow, salted one-way function with a tunable cost. PBKDF2 repeats HMAC many times; OWASP's current guidance for PBKDF2-HMAC-SHA256 is 600,000 iterations, which makes each guess at least 600,000 times as expensive as one fast hash, since every iteration is a full HMAC. Use 600,000 as the multiplier for round numbers. Under the assumption above, the attacker's rate drops from `10^10` to about `1.7 × 10^4` guesses per second, and the 8-lowercase-letter keyspace now takes about 145 days per account instead of 21 seconds.

The defender pays the same cost, but only once per login, which is why NIST says the cost factor should be as high as practical without hurting the verifier's performance.

### Memory hardness: limiting parallel hardware

Attackers get their speed from running thousands of guesses side by side on GPUs or custom chips, each guess using little memory. A memory-hard function such as scrypt or Argon2 requires a large block of memory for every guess. A device with 24 GiB of memory can run at most about 1,290 computations at once if each one needs 19 MiB, no matter how many cores it has.

RFC 9106, published through the IRTF's Crypto Forum Research Group, specifies Argon2 and makes Argon2id the variant every implementation must support. Argon2id takes three cost parameters: memory in KiB, the number of passes (iterations), and the degree of parallelism (lanes). OWASP's minimum recommendation is Argon2id with 19 MiB of memory, 2 iterations, and parallelism 1; if Argon2id is unavailable, scrypt with `N = 2^17`, `r = 8`, `p = 1`; bcrypt with a work factor of at least 10 only for legacy systems, noting its 72-byte input limit; and PBKDF2 where FIPS-140 validated algorithms are required.

### Vulnerable and fixed storage

```python
import hashlib

# Vulnerable: fast and unsalted. Equal passwords give equal hashes, and an
# attacker with the table can test guesses at full hardware speed (CWE-759, CWE-916).
stored = hashlib.sha256(password).hexdigest()
```

```python
import os

from cryptography.exceptions import InvalidKey
from cryptography.hazmat.primitives.kdf.argon2 import Argon2id

def hash_password(password: bytes) -> str:
    kdf = Argon2id(salt=os.urandom(16), length=32, iterations=2, lanes=1,
                   memory_cost=19 * 1024)          # memory in KiB: 19 MiB
    return kdf.derive_phc_encoded(password)
    # e.g. '$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>'

def check_password(password: bytes, stored: str) -> bool:
    try:
        Argon2id.verify_phc_encoded(password, stored)
        return True
    except InvalidKey:
        return False
```

The encoded string, in the PHC string format that OWASP recommends, records the algorithm, version, parameters, and salt, so the site can raise its parameters later. When a user with an old-style hash next logs in successfully, the site recomputes the hash with the new settings and replaces the old one.

### Peppers

A pepper is a secret key, shared by all accounts and held outside the database, that is applied in addition to the salt, for example as the key of an HMAC over the password before hashing, kept in a secrets vault or [[hardware-security-module]]. If only the database leaks, the attacker cannot test a single guess. If the application server is compromised, the pepper is exposed too, and OWASP notes that changing a compromised pepper forces affected users to reset their passwords. NIST SP 800-63B-4 recommends this kind of additional keyed step as defense in depth.

### Key derivation: the other job

A [[key-derivation-function]] turns a secret into keys. Two kinds exist, and they must not be swapped:

| Input secret                                  | Right tool                                | Why                                           |
| --------------------------------------------- | ----------------------------------------- | --------------------------------------------- |
| A password or passphrase                      | Argon2id, scrypt, or PBKDF2 with a salt   | The input is guessable, so each guess must cost a lot |
| A high-entropy secret, such as a Diffie-Hellman output or a random master key | HKDF (RFC 5869)          | The input cannot be guessed; the job is to produce clean, independent keys |

HKDF works in two stages. **Extract** condenses the input, using an optional salt, into a pseudorandom key. **Expand** stretches that key into as many output keys as needed, each bound to an `info` label such as `"backup-encryption v1"`, so keys for different purposes are independent. For passwords, NIST SP 800-132 specifies how to derive keys that protect stored data, and SP 800-63B-4 points verifiers to the approved schemes in its latest revision; NIST has announced plans to revise SP 800-132.

## Worked example

shop.example is choosing how to store 100,000 customer passwords. To compare configurations safely, the team uses fixtures, not real data: a fictional table of 100,000 accounts and a candidate list of one million common passwords. Assume, as above, `10^10` fast hashes per second.

| Configuration                           | What a thief can do                                      | Cost to run the full list against all accounts |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------------- |
| A. SHA-256, no salt                     | Hash each guess once and look it up; use precomputed tables | `10^6` hashes: well under a second           |
| B. SHA-256 with per-user salt           | Must hash every guess for every account                  | `10^6 × 10^5 = 10^11` hashes: about 10 seconds |
| C. PBKDF2-HMAC-SHA256, 600,000 iterations, salt | Same, but each guess costs about `6 × 10^5` hashes | `6 × 10^16` hashes: about 70 days            |
| D. Argon2id, 19 MiB, t = 2, p = 1, salt | Same, and memory caps parallel guessing                  | At 50 ms of CPU per guess, about 160 core-years |
| E. Configuration D plus a pepper in a key service | Nothing offline, if only the database leaks    | No guess can be checked without the pepper      |

Step 1. **A versus B.** Salting does not slow down a single guess. It removes the shortcut of checking one guess against everyone, which multiplies the attacker's work by the number of accounts, here 100,000.

Step 2. **B versus C.** The work factor multiplies the cost of every guess. The full list against everyone grows from seconds to months.

Step 3. **Look at one targeted account in C.** Trying the whole million-word list against one person costs `10^6 × 6 × 10^5 / 10^10 = 60` seconds. A user who picked a common password is still found quickly. Hashing raises the price of guessing; it does not make a guessable password safe.

Step 4. **C versus D.** Per guess, Argon2id with these parameters takes tens of milliseconds of CPU time on ordinary hardware; at 50 ms, `10^11` guesses need `5 × 10^9` core-seconds, about 160 core-years. Each guess also needs 19 MiB of memory, so GPUs cannot shrink that figure as easily as they shrink C's. Measure your own hardware; the point is that memory, not just time, now limits the attacker.

Step 5. **E.** A pepper changes the threat model rather than the arithmetic: a database-only leak becomes unattackable offline, while a full server compromise falls back to configuration D.

Step 6. **Close the gap from Step 3.** NIST SP 800-63B-4 requires checking each new password against a blocklist of commonly used, expected, or compromised passwords, and a minimum length of 15 characters for passwords used as the only factor. Add multi-factor authentication, and the stolen table matters far less.

## Defenses

- **Hash passwords with Argon2id**, or scrypt, bcrypt, or PBKDF2 where required, at or above the current OWASP parameters, through a maintained library.
- **Use a unique random salt per password.** Libraries do this for you; never use a fixed or user-derived salt.
- **Tune the cost** by benchmarking on your own servers. OWASP's rule of thumb is that one hash should take less than a second; setting it too high lets a flood of login attempts exhaust your CPU. Revisit it as hardware improves.
- **Store parameters with each hash** and upgrade old hashes when users next log in.
- **Add a pepper** held in a key management service or HSM if you can manage the key properly.
- **Reduce the number of guesses needed**: check new passwords against a blocklist, allow long passphrases, and support MFA and passkeys.
- **Detect leaks**: watch for bulk reads of the credential table, and keep the hashes away from systems that do not need them.

Limits: no hashing scheme protects a password that is on the attacker's list, and none protects users who reuse a password that leaked from a weaker site elsewhere.

## Common misconceptions

- **"Salts must be secret."** Salts are stored in the clear. They work by making each account a separate target.
- **"SHA-256 is fine because it is secure."** It is a sound hash and a poor password hash, because it is designed to be fast.
- **"Encrypting passwords is safer than hashing them."** Anyone who obtains the encryption key recovers every password at once. Verification never needs the original.
- **"A slow hash makes weak passwords safe."** It makes each guess expensive, but a password near the top of the list is still found early.
- **"HKDF is a password hash."** HKDF is fast by design. Using it on a password gives the attacker the same advantage as a plain hash.

## Try it in the lab

In [the lab](lab:password-cracking), you take the attacker's side against a fictional leaked table. First you check candidate passwords from a short list against fast, unsalted SHA-256 hashes and see identical passwords share a hash. Then you repeat the attempt after the lab adds per-user salts and switches to PBKDF2 with a high iteration count, and you compare how many guesses per second your browser manages in each case. Record the rates and extend them to the keyspaces in the table above. The lab is still being built, so its exact steps may differ from this description.

> [!ETHICS] Only test systems you own or have written permission to test.

**Without the lab.** Measure your own machine with fixtures only. This script times one fast hash and one PBKDF2 computation on a made-up password, then estimates how long PBKDF2 would take to search the 8-lowercase-letter keyspace on one core:

```python
import hashlib
import os
import time

def rate(fn, n):
    start = time.perf_counter()
    for _ in range(n):
        fn()
    return n / (time.perf_counter() - start)

pw, salt = b"fixture-password", os.urandom(16)
fast = rate(lambda: hashlib.sha256(salt + pw).digest(), 200_000)
slow = rate(lambda: hashlib.pbkdf2_hmac("sha256", pw, salt, 600_000), 3)
print(f"SHA-256: {fast:,.0f} guesses/s   PBKDF2 600k: {slow:,.1f} guesses/s")
print(f"Days for 26^8 guesses with PBKDF2 on one core: {26**8 / slow / 86400:,.0f}")
```

Then add `hashlib.scrypt(pw, salt=salt, n=2**17, r=8, p=1, maxmem=2**28)` as a third configuration. Write a short paragraph comparing the three rates, and explain why your laptop's rate understates what an attacker with GPUs could do for SHA-256 but not as much for scrypt.

## Key takeaways

- Offline guessing cost is the number of guesses, times the cost per guess, divided by parallelism; each defense targets one factor.
- Salts make each account a separate target and defeat precomputed tables; they are not secret.
- Work factors and memory hardness make each guess expensive; use Argon2id at or above current guidance.
- A pepper stored outside the database protects against database-only leaks.
- Use password-based KDFs for passwords and HKDF for high-entropy secrets, never the reverse.

## Go deeper

- [RFC 9106](https://www.rfc-editor.org/info/rfc9106) explains Argon2's design and gives recommended parameter choices. Compare them with OWASP's minimums and explain the gap.
- [NIST SP 800-63B-4](https://csrc.nist.gov/pubs/sp/800/63/b/4/final) sets requirements for password verifiers, including salt length, blocklists, and length limits. Which of its rules reduce the number of guesses needed rather than the cost of each?
- Open question: how should a large site measure whether its chosen parameters are "as high as practical" as hardware and attacker economics change?
