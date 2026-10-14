---
topicId: IAM-02
title: Passwords, recovery, and account lifecycle
summary: A password protects an account only if every stage of the account's life is sound, from the rules for choosing it and the way it is stored to the reset flow and the moment the account closes. Learn the current NIST and OWASP guidance and use it to evaluate a real-looking account and recovery workflow.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Evaluate a password policy against NIST SP 800-63B-4 and recommend specific changes.
  - Explain how unique salts and slow, memory-hard hashing raise the cost of offline guessing, and choose parameters from OWASP guidance.
  - Distinguish online guessing, password spraying, credential stuffing, and offline cracking by what the attacker holds and which defenses work.
  - Design a password-reset flow with unguessable, single-use, short-lived tokens, uniform responses, and notifications.
  - Identify lifecycle gaps, such as sessions or tokens that survive a reset or an account closure.
prerequisites: [IAM-01, CRY-01]
concepts: [password-manager, credential-stuffing, password-spraying, brute-force-attack, account-recovery]
labs: [password-cracking, login-security]
keywords:
  - password policy
  - password storage
  - password reset
  - forgot password
  - account lifecycle
  - Argon2id
  - bcrypt
  - scrypt
  - PBKDF2
  - salt
  - pepper
  - password blocklist
  - breached passwords
  - account lockout
  - recovery codes
  - account enumeration
  - NIST SP 800-63B-4
  - T1110
  - T1110.001
  - T1110.002
  - T1110.003
  - T1110.004
sources:
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-63b
  - title: OWASP Password Storage Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'MITRE ATT&CK T1110: Brute Force'
    url: https://attack.mitre.org/techniques/T1110/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use
    sourceId: mitre-attack
quiz:
  - question: A site requires passwords of 8 to 16 characters with an uppercase letter, a digit, and a symbol, and forces a change every 90 days. Passwords are the only factor. Which change best follows NIST SP 800-63B-4?
    choices:
      - Keep the rules but shorten the change interval to 30 days.
      - Require two symbols instead of one.
      - Require at least 15 characters, allow at least 64, drop the composition rules and scheduled changes, and check new passwords against a blocklist.
      - Replace the password with two security questions.
    answer: 2
    explanation: NIST SP 800-63B-4 requires a 15-character minimum for single-factor passwords, says verifiers should permit at least 64 characters, forbids other composition rules and periodic changes, and requires a blocklist check. Security questions are knowledge-based authentication, which NIST says not to prompt for.
  - question: A unique random salt is stored right next to each password hash. Why does it still help?
    choices:
      - It makes precomputed tables useless and forces the attacker to guess against each hash separately, and identical passwords no longer share a hash.
      - It encrypts the hash so that a thief cannot read it.
      - It must be kept secret, so an attacker cannot compute any hashes at all.
      - It makes weak passwords impossible to guess.
    answer: 0
    explanation: A salt is not a secret; its job is uniqueness. Because every hash has a different salt, a guess must be recomputed for each account, precomputed tables do not apply, and two users with the same password get different hashes. A weak password still falls quickly, which is why slow hashing and blocklists matter too.
  - question: An attacker tries one common password, such as Winter2025!, once against each of 5,000 accounts at one company. Which defense is least effective against this specific attack?
    choices:
      - Rejecting common and expected passwords with a blocklist at sign-up.
      - Requiring a second factor at sign-in.
      - Alerting on failed sign-ins spread across many accounts.
      - Locking each account after five failed attempts.
    answer: 3
    explanation: This is password spraying. Each account sees only one failure, so a per-account lockout never triggers. A blocklist removes the guessed password from the population, a second factor makes a correct guess insufficient, and cross-account monitoring sees the pattern.
  - question: A reset link looks like https://shop.example/reset?u=alice&t=1760400000, where t is a Unix timestamp. What is the most serious flaw?
    choices:
      - The link uses HTTPS, which hides the token from the user.
      - Anyone who knows a username can construct a working link, because nothing in it is secret or random.
      - The link is too long for a user to type.
      - The timestamp reveals the user's time zone.
    answer: 1
    explanation: A reset token must be an unguessable value from a cryptographically secure random generator, stored by the server (ideally as a hash), usable once, and short-lived. A username plus a timestamp can be forged by anyone, turning the reset flow into a way to take over any account.
  - question: After an account recovery succeeds, what does NIST SP 800-63B-4 require?
    choices:
      - Asking the user to set a new security question.
      - Scheduling another forced password change in 90 days.
      - Sending a notification to the subscriber or their designee.
      - Disabling the account for 24 hours.
    answer: 2
    explanation: NIST requires that every account recovery trigger a notification to the subscriber or their designee, so that a recovery the real owner did not start is noticed quickly. Security questions and scheduled changes are both discouraged.
---

## Why it matters

Most services still let people sign in with a password, and every stage of an account's life offers an attacker a way in: weak choices at sign-up, a stolen database of password hashes, passwords reused from another site, and a reset flow that is easier to fool than the sign-in page. MITRE ATT&CK groups the guessing attacks under Brute Force (T1110), with sub-techniques for password guessing, password cracking, [[password-spraying]], and [[credential-stuffing]].

Many people learned rules such as "one capital, one digit, one symbol, and change it every 90 days." Users satisfy such rules in predictable ways, like `Password1!`, or `Spring1!` becoming `Summer1!`. NIST's current guidance, SP 800-63B-4 (final in July 2025), forbids composition rules and scheduled changes and asks instead for length, a blocklist of known-bad passwords, and support for [[password-manager|password managers]].

This lesson walks through the whole lifecycle: choosing a password, storing it, defending the sign-in page, recovering a lost account, and closing an account cleanly. It ends with the skill a security reviewer actually needs: reading a proposed account workflow and finding its gaps.

## The core idea

A password is a shared secret, so the server must be able to _check_ a password without being able to _reveal_ it. Three facts shape everything else:

- **Servers get breached.** Design storage so that a stolen database is expensive to turn back into passwords.
- **People reuse passwords.** A password leaked from one site will be tried on yours, so a correct password is weaker evidence than it looks.
- **Recovery is a second front door.** An account is only as strong as its weakest way in. If a reset link can be forged, or a help-desk agent persuaded, the password does not matter.

Think of a password as a house key. Good design means the key is hard to guess (length, no common patterns), the lock does not keep a copy of the key's shape (hashing), the locksmith checks identity before cutting a new key ([[account-recovery]]), and keys are collected when tenants move out (closure).

## How it works

### Choosing a password

SP 800-63B-4 sets these rules for verifiers, the systems that check passwords:

| Rule | NIST SP 800-63B-4 | Why |
| --- | --- | --- |
| Minimum length | 15 characters when the password is the only factor; 8 when it is used only as part of multi-factor authentication | Length is the main source of guessing work |
| Maximum length | Should permit at least 64 characters, and verify the whole password | Allows passphrases; truncation silently weakens them |
| Characters | Should accept printing ASCII, the space, and Unicode; each code point counts as one character | Passphrases and non-English speakers |
| Composition rules | Shall not impose them | People answer them predictably, as in `Password1!` |
| Blocklist | Shall compare new passwords against commonly used, expected, or compromised values | Removes the guesses attackers try first |
| Periodic changes | Shall not require them; shall force a change on evidence of compromise | Forced changes produce predictable variants |
| Hints and security questions | Shall not store hints readable before sign-in or prompt for knowledge-based questions | Answers are guessable or public |
| Password managers | Shall allow them and autofill; should allow paste | Makes long, unique passwords practical |
| Failed attempts | Shall limit consecutive failed attempts to no more than 100 | Caps online guessing |

### Storing a password

A server should never store a password, or an encrypted password it could decrypt. It stores a one-way, _salted_, _slow_ hash. A [[salt]] is a random value, unique per password, stored next to the hash; NIST requires at least 32 bits. Salts make precomputed tables such as [[rainbow-table|rainbow tables]] useless and give identical passwords different hashes, but they are not secret.

Slowness is the other half. General-purpose hashes such as SHA-256 are designed to be fast, which lets an attacker with a stolen database test enormous numbers of guesses. A [[password-hashing]] function makes each guess deliberately expensive. The OWASP Password Storage Cheat Sheet recommends Argon2id with at least 19 MiB of memory, 2 iterations, and 1 degree of parallelism; scrypt if Argon2id is unavailable; bcrypt with a work factor of at least 10 for legacy systems (most implementations read only the first 72 bytes); and PBKDF2 with HMAC-SHA-256 at 600,000 iterations where FIPS-140 compliance is required. An optional _pepper_, a secret shared by all hashes and kept in a vault rather than the database, adds defense in depth.

```python
import hashlib

# Vulnerable: fast and unsalted. Equal passwords give equal hashes,
# and a stolen table can be guessed at enormous speed.
stored = hashlib.sha256(password.encode()).hexdigest()
```

```python
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

# Fixed: Argon2id with OWASP's minimum parameters (memory in KiB).
ph = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
stored = ph.hash(password)  # "$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>"

def check(user, attempt: str) -> bool:
    try:
        ph.verify(user.password_hash, attempt)  # recomputes with the stored salt
    except VerifyMismatchError:
        return False
    if ph.check_needs_rehash(user.password_hash):  # parameters raised since
        user.password_hash = ph.hash(attempt)      # upgrade at this sign-in
    return True
```

The stored string records the algorithm, parameters, and salt, so the cost can be raised later and old hashes upgraded as users sign in.

### Four ways to guess

Guessing attacks differ in what the attacker holds, so they need different defenses. The table summarizes the four that ATT&CK lists under T1110.

| Attack | What the attacker has | Why naive defenses miss it | What works |
| --- | --- | --- | --- |
| Password guessing | One target account and the sign-in form | Per-account limits do see it | Throttling, a second factor |
| Password spraying | Many usernames and a few common passwords | One attempt per account never trips a lockout | Blocklists, cross-account monitoring, a second factor |
| Credential stuffing | Username and password pairs leaked elsewhere | Each pair is tried once and is often _correct_ | Screening for breached passwords, bot detection, a second factor |
| Password cracking | A stolen table of hashes, offline | No sign-in page involved, so no throttling | Slow salted hashing, long unique passwords |

A [[brute-force-attack]] in the narrow sense, trying every combination, is rarely practical online, where rate limits apply; offline, against fast hashes, it is practical for short passwords. The other attacks succeed because real passwords are not random: people choose common words, patterns, and old passwords.

### Recovery: the second front door

SP 800-63B-4 allows four classes of account recovery: _saved_ recovery codes issued in advance for the user to keep offline (at least 64 bits of randomness, stored hashed, invalidated after use), _issued_ recovery codes sent to a verified address (valid for at most 10 minutes by text or voice and 24 hours by email), recovery contacts the user designated, and repeating identity proofing. Every recovery must trigger a notification to the subscriber. Knowledge-based answers such as a first pet's name are not on the list.

A common design emails a link containing an unguessable, single-use token. The diagram shows the safe version, in which the response never reveals whether the account exists, the server keeps only a hash of the token, and the owner is told about the change.

```sequence
title: Password reset with an emailed single-use token
participant B as Browser
participant S as shop.example
participant M as Alice's mailbox
B -> S: POST /forgot (alice@mail.example)
S --> B: "If the account exists, we sent a link"
S -> M: Link with a random token, valid for 1 hour
note S: Stores only a hash of the token
B -> S: POST /reset (token, new password)
note S: Checks hash and expiry, then voids token
S --> B: Password changed; please sign in
S -> M: Notice: your password was just changed
```

### The rest of the lifecycle

An account is created, used, changed, recovered, sometimes compromised, and eventually closed. A password change should require the current password or a fresh sign-in and should notify the owner. Evidence of compromise, such as the password appearing in a breach corpus, should force a change and end existing [[session|sessions]]. Closing an account must invalidate _every_ credential bound to it, including API tokens and recovery codes; NIST requires prompt invalidation of authenticators when an account ends.

## Worked example

> [!ETHICS] Only test systems you own or have written permission to test.

A product team at the fictional `shop.example` proposes this workflow. Evaluate it step by step.

```text
shop.example account workflow (draft 2)
1. Sign-up: 8 to 16 characters, at least one capital, one digit and one
   symbol; spaces rejected; paste disabled on the password field.
2. Storage: sha256(password), hex encoded.
3. Sign-in: "No such user" or "Wrong password"; after 3 failures the
   account is locked for 24 hours.
4. Every 90 days each user must choose a new password.
5. Forgot password: answer "first pet's name", then receive
   https://shop.example/reset?u=alice&t=<unix time>, valid for 7 days.
6. After a reset the user is signed in automatically; other sessions
   stay active; no email is sent.
7. Account closure: the profile is hidden; API tokens keep working.
```

| Step | Problem | Consequence | Fix |
| --- | --- | --- | --- |
| 1 | Composition rules, a 16-character cap, no spaces, no paste | Predictable passwords; passphrases and password managers blocked | 15-character minimum, accept 64 or more, spaces and Unicode, allow paste and autofill, blocklist check |
| 2 | Fast, unsalted hash | A stolen table cracks quickly; equal passwords are visible | Argon2id with a per-password salt and OWASP parameters |
| 3 | Different error messages; harsh lockout | Reveals which accounts exist; anyone can lock out any user; spraying stays under the limit | One generic message, throttling with growing delays, cross-account monitoring, a second factor |
| 4 | Scheduled changes | Users rotate `Spring1!` to `Summer1!` | Change only on evidence of compromise |
| 5 | Security question and a predictable, long-lived link | Answers can be researched; anyone can forge a reset link for any user | Drop the question; a random token stored as a hash, used once, valid briefly |
| 6 | Auto sign-in, surviving sessions, no notice | An intruder who already had a session keeps it, and the owner never learns | Require sign-in, end other sessions, notify the owner |
| 7 | Credentials survive closure | A closed account still works through its API tokens | Revoke every token, session, and recovery code at closure |

Step 5 is the most dangerous: it lets anyone take over any account without guessing a password at all. Step 2 is next, because a single database leak would let an attacker quickly recover every common or short password in it. Ranking findings by consequence, not by the order they appear, is what makes a review useful.

## Defenses

- **Length plus a blocklist.** Requiring 15 characters for single-factor passwords and rejecting common or breached values removes the easiest guesses. _Limit:_ a generic blocklist misses passwords built from a user's own public details unless context-specific words are added, and users still reuse long passwords.
- **Slow, salted hashing.** Argon2id or a peer protects strong passwords after a breach and buys time to force resets. _Limit:_ it cannot save a password on every attacker's short list, and parameters must be raised as hardware improves.
- **Throttling and monitoring.** Slow down repeated failures per account and watch failure patterns across accounts and sources. _Limit:_ strict lockouts let anyone lock out a victim, and distributed attacks blend into normal traffic.
- **A second factor or passkeys.** A correct stolen password is no longer enough (see [Multi-factor authentication and passkeys](lesson:IAM-03)). _Limit:_ attackers then target recovery, and some second factors can be phished.
- **Safe recovery.** Random, hashed, single-use, short-lived tokens; the same response for every address; notification after recovery; offline recovery codes. _Limit:_ recovery is only as strong as the mailbox or phone it trusts, and people at a help desk can be manipulated through [[social-engineering]].
- **Clean lifecycle events.** Notify on every change, end sessions after a reset, and revoke every credential at closure. _Limit:_ revocation must reach every system that issued a token.

## Common misconceptions

- **"Complexity rules make passwords strong."** They make passwords predictable. Length and a blocklist do more.
- **"Regular forced changes improve security."** NIST now forbids scheduled changes and requires a change on evidence of compromise.
- **"SHA-256 is a secure way to store passwords."** It is a secure hash but a poor password store, because it is fast.
- **"The salt must be kept secret."** The salt provides uniqueness, not secrecy. A pepper is the optional secret, kept outside the database.
- **"Security questions are a second factor."** They are another thing you know, often discoverable from public records or social media.
- **"Locking an account after three tries is the safest option."** It invites denial of service and does nothing against spraying or stuffing.

## Try it in the lab

In [the lab](lab:password-cracking) you play a defender who receives a leaked table of fast, unsalted SHA-256 password hashes from a fictional site. You will see how quickly common passwords fall to a short wordlist while one long passphrase that is not on the list survives, then compare how the attacker's cost changes when the same passwords are stored with unique salts and with PBKDF2.

[The login lab](lab:login-security) moves the attack online, to the sign-in form of a fictional account, `avery`.

1. On the **Attack** tab, click **Launch dictionary attack** with no defenses. The attacker's wordlist of 12 common passwords gets in on the 10th guess: the lab reports the account compromised and shows a flag. By the table in Four ways to guess, this dictionary attack is password guessing: one account facing common passwords, not leaked pairs.
2. Turn on one defense at a time and launch again. Each defense button is a toggle, so click it again to turn that defense off before the next run. Rate limiting stops the run after 5 guesses. Account lockout stops it after 3, and the lab notes that the real `avery` is now locked out too. With MFA the password is guessed, but the second factor refuses the session. Which of the three would still work against spraying or stuffing?
3. On the **Enumeration** tab, click **Probe** for `avery`, then **Probe a fake name**. Turn on **generic errors**, probe both again, and compare the messages with step 3 of the worked example.

**Without the lab.** First, a paper calculation. Assume, for this exercise only, a rig that tests 10 billion unsalted SHA-256 guesses per second. How long does it take to try every 8-letter lowercase password (26^8 of them)? Every 15-letter one? Now assume each guess must run 600,000 PBKDF2 iterations, making it about 600,000 times as expensive, and recompute the 8-letter case. Finally, explain why none of this helps a user whose password is `password123`. Second, review the recovery settings of one of your own accounts: confirm the recovery email and phone are current, store a set of recovery codes offline if the service offers them, and check where sign-in alerts are sent.

To check your arithmetic: about 21 seconds, about 5,300 years, and about 145 days. A password on every attacker's short list falls on the first few guesses, whatever the hash cost.

## Key takeaways

- Follow NIST SP 800-63B-4: length (15 characters for a single factor), a blocklist, no composition rules, no scheduled changes, and support for password managers.
- Store passwords with a unique salt and a slow, memory-hard function such as Argon2id, never with a fast hash or reversible encryption.
- Spraying, stuffing, guessing, and cracking need different defenses; per-account lockout alone stops few of them.
- Treat recovery as a front door: unguessable single-use tokens, uniform responses, notification, and no security questions.
- Lifecycle events matter: a reset should end other sessions, and closing an account must revoke every credential bound to it.

## Go deeper

- SP 800-63B-4 asks that recovery at AAL2 use two recovery codes from different methods, one recovery code plus a bound single-factor authenticator, or repeated identity proofing. Compare the usability and attack cost of each option for a service with millions of users.
- The OWASP Password Storage Cheat Sheet describes upgrading legacy hashes by wrapping an old fast hash inside a slow one until the user's next sign-in. Analyze what this protects, and what it does not, if the database leaks mid-migration.
- Open question: blocklists depend on what has already leaked. How would you measure whether a blocklist of a given size meaningfully reduces successful spraying against your users?
