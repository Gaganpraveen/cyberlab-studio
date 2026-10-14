---
topicId: HUM-04
title: Password and authentication usability
summary: Why traditional password rules push people into insecure habits, what NIST SP 800-63B-4 now requires instead, and how to weigh user burden against real security gains when comparing password policies and alternatives such as passkeys.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how composition rules, forced expiration, and paste blocking create user burden without proportionate security gains.
  - Apply the SP 800-63B-4 password requirements to evaluate a password policy.
  - Compare two password policies by user burden and by resistance to online guessing, credential stuffing, and phishing.
  - Recommend secure alternatives, such as password managers and passkeys, and state what each costs users and deployers.
prerequisites: [IAM-02, CRY-05]
concepts: [usable-security, password-composition-rule, password-blocklist]
keywords:
  - password policy
  - password complexity
  - composition rules
  - password expiration
  - password rotation
  - passphrase
  - banned password list
  - password blocklist
  - security questions
  - KBA
  - password manager
  - passkeys
  - NIST SP 800-63B-4
  - SP 800-63-4
  - AAL1
  - Users Are Not the Enemy
sources:
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-63b
  - title: 'Users Are Not the Enemy (Adams and Sasse, Communications of the ACM, 1999)'
    url: https://cacm.acm.org/research/users-are-not-the-enemy/
    publisher: Association for Computing Machinery (Communications of the ACM)
  - title: 'The quest to replace passwords: a framework for comparative evaluation of Web authentication schemes (UCAM-CL-TR-817)'
    url: https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-817.html
    publisher: University of Cambridge Computer Laboratory
  - title: 'Security Engineering, 3rd ed., Chapter 3: Psychology and Usability'
    url: https://www.cl.cam.ac.uk/archive/rja14/Papers/SEv3-ch03.pdf
    publisher: Ross Anderson (Wiley edition; free chapter on the author's site)
    license: All rights reserved
    sourceId: anderson-security-engineering
quiz:
  - question: Which of these policy elements does SP 800-63B-4 prohibit?
    choices:
      - Comparing a new password against a list of commonly used and compromised passwords.
      - Requiring a minimum of 15 characters for a password used as the only factor.
      - Requiring users to change their passwords every 90 days when there is no evidence of compromise.
      - Allowing password managers to fill in the password field.
    answer: 2
    explanation: The guideline says verifiers SHALL NOT require periodic changes but SHALL force a change when there is evidence of compromise. The blocklist check and the 15-character minimum are required, and password managers and autofill must be allowed.
  - question: A policy requires an uppercase letter, a digit, and a symbol. Why does SP 800-63B-4 forbid such composition rules?
    choices:
      - Symbols cannot be stored by modern databases.
      - The rules add burden while people meet them in predictable ways, such as Summer2026!, so attackers' guess lists already cover the result.
      - Composition rules make passwords too strong to remember, so they must be weakened.
      - Uppercase letters break password hashing.
    answer: 1
    explanation: A requirement for character types is easy to satisfy by decorating a familiar word. Length and a blocklist of known passwords target the guesses attackers actually try, without dictating how people build their passwords.
  - question: Staff complain that they cannot paste from their password manager on the sign-in page. What does SP 800-63B-4 say?
    choices:
      - Verifiers SHALL allow password managers and autofill, and SHOULD permit paste.
      - Paste must be blocked to stop malware from reading the clipboard.
      - Password managers are allowed only at the highest assurance level.
      - Paste is allowed only for passwords shorter than 15 characters.
    answer: 0
    explanation: Blocking paste pushes people away from password managers, which make long, unique passwords practical. The guideline treats supporting them as a requirement.
  - question: Bonneau, Herley, van Oorschot, and Stajano rated many proposed password replacements against 25 benefits. What did they conclude?
    choices:
      - Graphical passwords dominate text passwords on every benefit.
      - Biometrics provide every benefit that passwords provide, plus better security.
      - Hardware tokens are the only scheme worse than passwords.
      - No scheme retains all the benefits that legacy passwords already provide, so replacing passwords always involves trade-offs.
    answer: 3
    explanation: Many schemes beat passwords on security, but each loses something, often deployability or cost. That is why the question is which trade-off suits a given setting, not which scheme is perfect.
  - question: A college adopts a 15-character minimum for single-factor passwords, and students say typing them on phones is painful. Which response best balances usability and security?
    choices:
      - Drop the minimum back to 8 characters for everyone.
      - Require a password change every month so short passwords are replaced often.
      - Offer passkeys or a second factor; with MFA, SP 800-63B-4 allows passwords as short as 8 characters, and a show-password option reduces typing errors.
      - Add a symbol requirement so shorter passwords are still strong.
    answer: 2
    explanation: The guideline sets 15 characters for passwords used alone but permits a minimum of 8 when the password is only part of multi-factor authentication. Passkeys remove typing entirely, and showing the password while it is entered reduces errors.
---

## Why it matters

Passwords remain the most familiar way people prove who they are online, and for decades organizations tried to make them stronger by making them harder: mix character types, change them every 90 days, never write them down, never paste them. The result was predictable to anyone who watched users. In a study published in _Communications of the ACM_ in 1999, Anne Adams and Martina Angela Sasse collected 139 questionnaire responses and conducted 30 in-depth interviews at two organizations. Half of the questionnaire respondents wrote their passwords down in some form, and many varied each new password from the last in predictable ways. The rules did not make users careless; they made the secure behavior impossible to sustain.

The official guidance has caught up. NIST's Special Publication 800-63B-4, finalized in July 2025, is the US federal guideline for authentication. It forbids composition rules and routine forced changes, requires a check against lists of compromised passwords, and requires sites to allow password managers. These changes are a case study in [[usable-security]]: designing security people can use correctly and willingly, so the secure way to do a task is also the easy way.

## The core idea

Every authentication rule spends some of the user's time, memory, and patience. The question is whether that spending buys protection against attacks that actually happen.

Three assumptions frame the analysis:

1. **Attackers guess what people choose, not random strings.** Online, they try common passwords against many accounts ([[password-spraying]]) or reuse passwords leaked from other sites ([[credential-stuffing]]). Offline, after a breach, they test guesses against stolen hashes, starting with the most popular choices.
2. **Human memory is limited.** People cannot remember dozens of long, unique, frequently changing secrets, so they cope by reusing, writing down, and making small predictable changes.
3. **Coping behavior is a design outcome.** Adams and Sasse argued that "Users have to be treated as partners in the endeavor to secure an organization's systems, not as the enemy within." When a rule produces workarounds, the rule is the problem.

The design principle at stake is [[psychological-acceptability]]: a protection people find too costly will be bypassed, so its real-world strength is lower than its strength on paper.

## How it works

### Where traditional rules go wrong

| Rule                        | Burden on people                                 | What attackers see                                                    |
| --------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- |
| Composition rules           | Remember where the capital and symbol went       | Familiar words with predictable decoration, such as Summer2026!       |
| Forced periodic change      | Learn a new secret every few months              | Predictable variations of the old password                            |
| Short maximum length        | Long passphrases rejected                        | A smaller space of possible passwords                                 |
| Paste or autofill blocked   | Password managers stop working                   | More reused and shorter passwords                                     |
| Security questions          | Remember invented answers or reveal true ones    | Answers often found through public records or social media            |
| Password hints              | Little                                           | A clue visible to anyone who asks                                     |

A [[password-composition-rule]] is any requirement about which kinds of characters a password must contain. It feels like it forces strength, but a rule demanding a digit and a symbol is easily met by appending them to a familiar word. Forced expiration has a similar flaw: if the old password was not compromised, changing it gains nothing, and if it was, the attacker may already have used it.

### What SP 800-63B-4 requires

The guideline replaces the old rules with a few targeted ones. "SHALL" marks a requirement and "SHOULD" a recommendation.

| Topic                    | SP 800-63B-4 (Section 3.1.1)                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| Minimum length           | SHALL be at least 15 characters when the password is the only factor; at least 8 when it is used only as part of multi-factor authentication |
| Maximum length           | SHOULD permit at least 64 characters                                                         |
| Characters               | SHOULD accept printing ASCII, the space, and Unicode; SHALL count each Unicode code point as one character |
| Composition rules        | SHALL NOT impose them                                                                        |
| Periodic change          | SHALL NOT require it; SHALL force a change on evidence of compromise                         |
| Blocklist                | SHALL compare the whole proposed password against a list of commonly used, expected, or compromised passwords |
| Hints and questions      | SHALL NOT store hints available to unauthenticated users, or prompt for security questions when passwords are chosen |
| Password managers        | SHALL allow password managers and autofill; SHOULD permit paste                              |
| Display                  | SHOULD offer an option to show the password while it is typed                                |
| Truncation               | SHALL verify the entire password, not a subset or a truncated version                        |
| Failed attempts          | SHALL limit failed attempts, to no more than 100 consecutive failures on one authenticator   |

The logic is to target the attacks above. A [[password-blocklist]] rejects exactly the passwords attackers try first. Rate limiting makes online guessing slow. Length makes offline guessing expensive, provided the server also stores passwords with proper [[password-hashing]]. Everything else is left to the user's choice.

### The user's side of the ledger

Usability is not only about memory. Anderson's _Security Engineering_ separates the practical difficulties of choosing, entering, remembering, and recovering passwords, and each one matters:

- **Entry.** Long passwords are hard to type on phones. A show-password option, which the guideline recommends, reduces typing errors, and autofill, which sites must allow, removes typing altogether.
- **Memory.** A [[password-manager]] lets people use long, unique passwords without remembering them, and the guideline requires sites to allow one.
- **Recovery.** Security questions are both forgettable and guessable. Recovery is often the weakest path into an account, as the lesson on [account recovery](lesson:IAM-02) explains.

### Beyond passwords

Joseph Bonneau, Cormac Herley, Paul van Oorschot, and Frank Stajano rated proposed replacements for web passwords against 25 usability, deployability, and security benefits. Their sobering conclusion was that no scheme provides all the benefits, and "none even retains the full set of benefits which legacy passwords already provide." Passwords persist largely because of deployability: they cost little per user and work everywhere.

| Option                         | Burden on users                             | Security gain                                   | Cost to deploy                            |
| ------------------------------ | ------------------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| Password plus blocklist        | Low: one memorable phrase                    | Stops the most common guesses                   | Low                                       |
| Password manager               | Learn one tool, one master password         | Unique, long passwords everywhere               | Training and support                      |
| Password plus a second factor  | An extra step at sign-in                    | Stolen passwords alone no longer suffice        | Enrollment, recovery, help desk           |
| Passkey                        | Unlock a device with a fingerprint or PIN   | Resists phishing; nothing reusable to steal     | Device support, recovery planning         |

A [[passkey]] is often the best trade where it is supported: there is nothing to remember or type, and it cannot be phished because it is bound to the real site, as the lesson on [MFA and passkeys](lesson:IAM-03) explains.

## Worked example

> [!NOTE]
> bank.example, its staff, and the numbers below are fictional.

**Setting.** bank.example's employee portal still uses a 2010-era password policy. The security team proposes a replacement and must justify it to managers worried that "weaker rules" mean weaker security.

**Step 1: Compare the policies.**

| Element              | Policy A (current)                         | Policy B (proposed)                                  |
| -------------------- | ------------------------------------------ | ---------------------------------------------------- |
| Length               | 8 to 16 characters                         | 15 or more for password-only accounts, up to 64      |
| Composition          | Upper, lower, digit, and symbol required   | None                                                 |
| Expiration           | Every 90 days                              | Only on evidence of compromise                       |
| Screening            | None                                       | Blocklist of common and breached passwords           |
| Paste and autofill   | Blocked                                    | Allowed; show-password toggle                        |
| Recovery             | Three security questions                   | Help-desk callback to the number on file             |
| Failed attempts      | 3 failures lock the account for 30 minutes | Rate limiting with growing delays                    |
| Second factor        | None                                       | Passkey offered to all staff                         |

**Step 2: Count the burden.** With 2,000 staff, Policy A forces 8,000 password changes a year. Its three-failure lockout means a typo-prone morning can lock someone out, and attackers can lock out accounts on purpose. Its 16-character maximum rejects passphrases, and blocking paste rules out password managers.

**Step 3: Test against real attacks.** Policy A accepts `Summer2026!`, which meets every composition rule but follows a season-plus-year pattern that guessers try early. Policy B rejects it twice, as too short and as a likely blocklist entry, and accepts a passphrase such as `lantern maple orbit seventeen`. Against credential stuffing, Policy B's breached-password screening and passkey option help, while Policy A has nothing beyond lockouts. Against phishing, only the passkey helps.

**Step 4: Change the checker.** The code shows the vulnerable pattern next to the fix.

```python
# Before: composition rules and a short maximum (forbidden or discouraged by SP 800-63B-4)
def acceptable_old(pw: str) -> bool:
    return (8 <= len(pw) <= 16
            and any(c.isupper() for c in pw)
            and any(c.islower() for c in pw)
            and any(c.isdigit() for c in pw)
            and any(not c.isalnum() for c in pw))

# After: length plus a whole-password blocklist check, no composition rules
def acceptable(pw: str, blocklist: set[str], single_factor: bool = True) -> bool:
    minimum = 15 if single_factor else 8
    if len(pw) < minimum or len(pw) > 64:  # len() counts Unicode code points
        return False
    return pw not in blocklist  # compare the entire password, not substrings
```

**Step 5: Make the case.** Policy B asks less of every employee and blocks more of the passwords attackers actually try. The managers' worry rests on a confusion between rules that are strict and rules that are effective.

## In practice

- **Lead with length and screening.** Set the minimum by how the password is used, and check every new password against a blocklist that includes breached passwords.
- **Remove friction that buys nothing.** Drop composition rules, routine expiration, hints, and security questions. Force a change only when there is evidence of compromise.
- **Support the tools people need.** Allow paste and autofill, offer a show-password toggle, and accept spaces and Unicode.
- **Throttle rather than lock.** Rate limiting with growing delays stops online guessing without letting attackers lock out real users.
- **Move toward passkeys.** Offer them wherever possible, and design recovery so it does not reopen the door that passkeys closed.

The limit of any password policy is that it cannot stop phishing: a perfect password typed into a fake site is still stolen. That is why policies are only part of an authentication strategy.

## Common misconceptions

- **"Complex passwords are strong passwords."** Character variety is easy to fake with predictable decoration. Length and screening do more.
- **"Regular password changes limit damage."** Without evidence of compromise, changes mostly produce predictable variations and more resets.
- **"Blocking paste stops malware."** It mainly stops password managers, pushing people toward shorter, reused passwords.
- **"Writing a password down is always wrong."** A written password kept somewhere physically secure can be safer than a reused one, though a password manager is better still.
- **"Passkeys are perfect."** They resist phishing, but device loss and account recovery still need careful design.

## Try it yourself

Compare two password policies for usability and security. Use the policies of two services you use, such as your campus account and a shopping site, reading only their public help pages or sign-up screens. Do not test them by attempting sign-ins or account changes beyond your own normal use.

1. For each policy, record its length limits, composition rules, expiration, paste support, recovery method, and whether it offers passkeys or a second factor.
2. Score each element against the SP 800-63B-4 table above: meets, conflicts with, or is silent.
3. Estimate the yearly burden for a typical user: forced changes, lockouts, and recovery steps.
4. For each policy, name the attack it handles worst: online guessing, credential stuffing, offline cracking, or phishing.
5. Write a three-sentence recommendation for the weaker policy, ordered by security gain per unit of user burden.

## Key takeaways

- Rules that ignore human memory produce workarounds, and the workarounds decide real-world security.
- SP 800-63B-4 forbids composition rules and routine expiration, and requires length, blocklist screening, rate limiting, and support for password managers.
- Evaluate a policy against the attacks that actually happen: guessing common passwords, reusing leaked ones, and phishing.
- No password replacement keeps every benefit of passwords, but passkeys remove memorization and resist phishing where they are supported.

## Go deeper

- Read Adams and Sasse's article and identify which of its 1999 recommendations SP 800-63B-4 adopted more than 25 years later.
- Bonneau and colleagues' framework scores schemes on 25 benefits. Score passkeys yourself, and decide which benefits they give up compared with passwords.
- Open question: blocklists must be large enough to catch likely guesses but small enough not to frustrate users. How would you measure the right size for your users?
