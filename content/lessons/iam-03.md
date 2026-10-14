---
topicId: IAM-03
title: Multi-factor authentication and passkeys
summary: Multi-factor authentication makes a stolen password insufficient, but methods differ sharply in what they resist. Learn how one-time codes, push approvals, security keys, and passkeys work, why only origin-bound public-key methods resist phishing, and how to choose among them under stated threats and usability limits.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Classify authenticators by factor and explain why two authenticators of the same factor are not multi-factor authentication.
  - Explain how a look-alike site relays one-time codes and push approvals, and why a WebAuthn signature cannot be relayed the same way.
  - Trace WebAuthn registration and authentication and list the checks a relying party must perform.
  - Compare MFA methods against stated threats and usability constraints and justify a recommendation.
  - Describe the trade-offs between synced and device-bound passkeys, including account recovery.
prerequisites: [IAM-02, CRY-04, WEB-04]
concepts: [mfa, authenticator, passkey, webauthn]
labs: [login-security]
keywords:
  - multi-factor authentication
  - two-factor authentication
  - 2FA
  - phishing-resistant MFA
  - FIDO2
  - WebAuthn Level 3
  - security key
  - passkeys
  - synced passkey
  - device-bound passkey
  - one-time password
  - OTP
  - TOTP
  - push notification
  - number matching
  - push bombing
  - MFA fatigue
  - SIM swap
  - SS7
  - authenticator assurance level
  - AAL2
  - AAL3
  - NIST SP 800-63B-4
sources:
  - title: 'Web Authentication: An API for accessing Public Key Credentials, Level 3 (W3C Recommendation, 25 August 2026)'
    url: https://www.w3.org/TR/webauthn-3/
    publisher: W3C Web Authentication Working Group
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-63b
  - title: Implementing Phishing-Resistant MFA (fact sheet, October 2022)
    url: https://www.cisa.gov/sites/default/files/publications/fact-sheet-implementing-phishing-resistant-mfa-508c.pdf
    publisher: Cybersecurity and Infrastructure Security Agency (CISA)
  - title: Passkeys
    url: https://fidoalliance.org/passkeys/
    publisher: FIDO Alliance
    license: All rights reserved
quiz:
  - question: A site asks for a password and then the answer to a security question. Is this multi-factor authentication?
    choices:
      - Yes, because the user must supply two separate secrets.
      - Yes, as long as the answer is checked on the server.
      - No, because both are something you know, so one phishing page or one data leak can capture both.
      - No, because security questions count as a biometric factor.
    answer: 2
    explanation: Factors are categories. A password and a security answer are both knowledge, so they fail together to the same attacks. Multi-factor authentication combines different categories, such as knowledge plus a physical authenticator.
  - question: Alice enters her password and a six-digit app code into shop-example.test, a look-alike of shop.example. Seconds later the attacker is signed in as Alice. Why did the code not protect her?
    choices:
      - Nothing in the code says which site it is for, so the fake site forwarded it to the real one while it was still valid.
      - The attacker computed the code from Alice's password.
      - Six-digit codes can be brute-forced within their 30-second window.
      - The code was sent without encryption.
    answer: 0
    explanation: A one-time code proves possession of the authenticator only to whoever receives it. A real-time relay forwards it before it expires. NIST SP 800-63B-4 states that OTP and out-of-band authentication are not phishing-resistant.
  - question: The same look-alike page tries to use Alice's passkey for shop.example. What stops it?
    choices:
      - The passkey's private key is too long to be copied.
      - The relying party blocks all sign-ins from new devices.
      - Alice's fingerprint is checked by the relying party, which notices the mismatch.
      - The browser scopes the credential to the RP ID shop.example and records the true origin in the signed client data, so the page cannot obtain a usable signature.
    answer: 3
    explanation: A page on shop-example.test cannot request a credential for shop.example, and even a relayed signature would carry the origin https://shop-example.test, which the real relying party rejects. The biometric check happens locally on the authenticator; the site never sees the fingerprint.
  - question: An organization needs AAL3 for its administrators under NIST SP 800-63B-4. Which choice fits?
    choices:
      - Synced passkeys stored in each administrator's personal credential manager.
      - Hardware security keys with non-exportable private keys, two registered per administrator.
      - A password plus SMS codes, with number matching.
      - A password plus an authenticator app.
    answer: 1
    explanation: AAL3 requires a phishing-resistant cryptographic authenticator with a non-exportable private key, and NIST says syncable authenticators shall not be used at AAL3. SMS and app codes are not phishing-resistant. Registering a spare key avoids lockout when one is lost.
  - question: Which statement about number matching for push approvals is accurate?
    choices:
      - It makes push approvals fully phishing-resistant.
      - It removes the need for a password.
      - It stops blind approvals during push bombing, but a look-alike site can still show the user the real number to type.
      - It replaces the phone with a hardware key.
    answer: 2
    explanation: Number matching forces the user to read a number from the sign-in screen, which defeats approving a random prompt to make it stop. In a real-time relay the attacker's page simply displays the number the real site generated. CISA presents number matching as an interim measure, not phishing-resistant MFA.
---

## Why it matters

A password alone can be phished, guessed, or replayed from another site's breach (see [Passwords, recovery, and account lifecycle](lesson:IAM-02)). [[mfa]] adds a second, different factor so that a stolen password is not enough. NIST SP 800-63B-4 requires two distinct factors at authenticator assurance level 2 (AAL2), says verifiers "SHALL offer at least one phishing-resistant authentication option at AAL2," and requires federal agencies to make their staff, contractors, and partners use phishing-resistant authentication.

Not all second factors are equal. CISA's fact sheet on phishing-resistant MFA lists how attackers get around weaker methods: fake sign-in portals that capture both the password and the one-time code, push bombing (flooding a user with approval prompts until one is accepted), abuse of weaknesses in SS7, the signaling system of the phone network, to obtain codes, and SIM swaps that move a victim's phone number to the attacker. CISA calls phishing-resistant MFA "the gold standard for MFA" and notes that "the only widely available phishing-resistant authentication is FIDO/WebAuthn authentication."

So the useful question is not "do we have MFA?" but "which threats does this method resist, and what does it cost users?" Answering it is this lesson's skill.

## The core idea

An [[authenticator]] proves one of three _factors_: something you know (a password or PIN), something you have (an enrolled phone app or a security key), or something you are (a fingerprint or face). Factors are categories, so a password plus a security question is still one factor. Biometrics usually unlock a key stored on the device rather than traveling to the server.

Under phishing, the deciding property is _binding_: is the authenticator's output tied to the site the user is really on? A person can read a six-digit code into any page that asks for it. A [[passkey]] signs data in which the _browser_ records the origin it actually connected to, so a signature produced on a look-alike page is useless at the real one.

An analogy: a one-time code is a password spoken aloud, which anyone listening can repeat. A passkey signature is a letter that the post office addresses itself, using the street address of the building you are standing in. A forger's office receives a letter addressed to the forger, which the real recipient refuses.

Three assumptions apply. The user's device and browser are not controlled by malware. The browser learns the true origin, which depends on [[tls]] and certificate validation. And enrollment and recovery are at least as strong as sign-in. MFA protects the moment of sign-in; it does nothing for a session cookie stolen afterward ([[session-hijacking]]).

## How it works

### Comparing authenticator types

| Method | Factor | Phishing-resistant? | Main weaknesses | Usability |
| --- | --- | --- | --- | --- |
| Password only | Know | No | Phishing, reuse, guessing | Familiar; must be unique per site |
| SMS or voice code | Have (a phone number) | No | Relay, [[sim-swapping]], SS7 abuse; NIST restricts it | Works on any phone; delivery delays |
| Authenticator app code (TOTP) | Have (an enrolled app) | No | Relay; the shared secret also sits on the server | Works offline; manual typing |
| Push approval | Have (an enrolled app) | No | Relay; push bombing ([[mfa-fatigue]]) | One tap; needs a smartphone |
| Hardware security key | Have, often plus a PIN | Yes | Loss and cost; a spare must be enrolled | Touch or tap; fast |
| Synced passkey | Have, unlocked by know or are | Yes | Depends on the account that syncs it | No password; survives a lost phone |
| Device-bound passkey | Have, unlocked by know or are | Yes | Lost with the device | Strong key control; no sync |

NIST SP 800-63B-4 states plainly that passwords, look-up secrets, out-of-band methods (SMS, voice, push), and one-time passwords are not phishing-resistant. It restricts the phone network for out-of-band codes: verifiers must make alternative authenticators available and should watch for risk signals such as a SIM change or number porting.

### Why codes and pushes can be relayed

> [!ETHICS] Only test systems you own or have written permission to test.

A phishing page that relays traffic in real time is an [[adversary-in-the-middle]]. It needs no cryptography: it forwards whatever the user types, and the real site cannot tell the difference.

```sequence
title: A one-time code relayed by a look-alike site
participant U as Alice
participant P as shop-example.test (fake)
participant S as shop.example
U -> P: Password and 6-digit code
P -> S: The same password and code, seconds later
S --> P: Session cookie for alice
P --> U: "Something went wrong, please retry"
note: The code was valid; nothing tied it to one site
```

Push approvals fail the same way: Alice expects a prompt because she just "signed in," so she approves it. Number matching, where the user types a number shown on the sign-in screen into the app, defeats blind approvals during push bombing, and CISA recommends it as an interim step. It does not stop a relay, because the fake page can show the real number.

### WebAuthn registration

[[webauthn]] is the W3C browser API behind security keys and passkeys; Level 3 became a W3C Recommendation on 25 August 2026, and a Level 4 working draft followed. The site is the [[relying-party]] (RP), identified by an _RP ID_ that defaults to the page's own domain. A page may claim only its own domain or a [[registrable-domain]] suffix of it, so `shop-example.test` can never ask for a `shop.example` credential.

```sequence
title: WebAuthn registration (creating a passkey)
participant A as Authenticator
participant B as Browser
participant S as shop.example (RP)
B -> S: Begin registration for alice
S --> B: Random challenge, RP ID, user handle
B -> A: create(): RP ID and hash of client data
note A: User verifies with fingerprint or PIN
note A: New key pair, only for shop.example
A --> B: Public key, credential id, signed data
B -> S: Attestation object and client data
note S: Check challenge, origin, RP ID; store key
```

The authenticator creates a fresh key pair for this RP alone. The private key stays with the authenticator; the RP stores the public key and a credential id. An optional _attestation_ statement lets the RP learn what kind of authenticator created the key. Because each site gets its own key pair, a breach of one RP reveals only public keys, which cannot sign in anywhere.

### WebAuthn authentication

```sequence
title: WebAuthn authentication (signing in with a passkey)
participant A as Authenticator
participant B as Browser
participant S as shop.example (RP)
B -> S: Begin sign-in
S --> B: Fresh random challenge, RP ID
B -> A: get(): RP ID and hash of client data
note A: User verifies; picks the shop.example key
A --> B: Signature over authenticator and client data
B -> S: Assertion: credential id and signature
note S: Verify signature, challenge, origin, flags
S --> B: Signed in; session cookie set
```

The browser builds the _client data_ itself, so the page cannot lie about where it is:

```json
{
  "type": "webauthn.get",
  "challenge": "q8Yv3Zr1T0m2bN4xW7cK9a",
  "origin": "https://shop.example",
  "crossOrigin": false
}
```

The authenticator signs its own data (a hash of the RP ID, flags for user presence and user verification, and a counter) together with a hash of this client data, using a [[digital-signature]]. The RP must then check that the challenge is the one it just issued, which defeats [[replay-attack|replays]]; that the type is `webauthn.get` and the origin is its own; that the RP ID hash matches; that the required flags are set; and that the signature verifies with the stored public key. If a relay forwarded the request, the origin would read `https://shop-example.test` and verification would fail.

### Passkeys and assurance levels

The FIDO Alliance describes a passkey as "an authentication credential based on FIDO standards" that lets people sign in without a password, approving with the same biometric, PIN, or pattern that unlocks their device; the biometric never leaves the device. A passkey is usually _discoverable_, stored so that the user need not type a username. _Synced_ passkeys are copied across a user's devices through a cloud service, typically a credential manager ([[password-manager]]), so a lost phone does not lose the account, but the syncing account joins the attack surface. _Device-bound_ passkeys, such as those on a hardware security key, never leave one device.

| Level | NIST SP 800-63B-4 requirement (summary) | Reauthentication |
| --- | --- | --- |
| AAL1 | Single-factor or multi-factor | Overall timeout should be at most 30 days |
| AAL2 | Two distinct factors, at least one replay-resistant; a phishing-resistant option must be offered | At most 24 hours overall and 1 hour idle (should) |
| AAL3 | A phishing-resistant cryptographic authenticator with a non-exportable private key; syncable authenticators not allowed | At most 12 hours overall (shall) and 15 minutes idle (should) |

## Worked example

The fictional `bank.example` must choose MFA for two groups: customers and its own administrators. It states these threats and constraints:

- **T1** credential stuffing with passwords leaked elsewhere;
- **T2** real-time phishing sites that relay codes and prompts;
- **T3** SIM swaps against customers' phone numbers;
- **T4** push bombing;
- **U1** some customers have no smartphone; **U2** customers lose phones; **U3** administrators need AAL3.

**Step 1: score each method against each threat.**

| Method | T1 stuffing | T2 relay phishing | T3 SIM swap | T4 push bombing |
| --- | --- | --- | --- | --- |
| Password + SMS code | Resists | Fails | Fails | Not applicable |
| Password + app code (TOTP) | Resists | Fails | Resists | Not applicable |
| Password + push with number matching | Resists | Fails | Resists | Mostly resists |
| Synced passkey | Resists | Resists | Resists | Not applicable |
| Hardware security key | Resists | Resists | Resists | Not applicable |

**Step 2: apply the constraints.** U3 rules out every option in the table except hardware keys for administrators: AAL3 needs a non-exportable key, and NIST forbids syncable authenticators there. U2 favors synced passkeys for customers, since they survive a lost phone. U1 means a non-smartphone option must remain.

**Step 3: recommend, and name the residual risk.**

1. Administrators: two hardware security keys each, one kept as a spare.
2. Customers: passkeys as the default, an app code as the fallback, and SMS only as a restricted last resort with SIM-change and porting signals, as NIST advises.
3. Recovery: offline recovery codes, and a notification through a separate channel whenever a new authenticator is bound, which NIST requires.
4. Residual risks: malware on a customer's device, stolen session cookies, and social engineering at the help desk. MFA addresses none of these, so session lifetime limits and help-desk procedures still matter.

## Defenses

- **Prefer phishing-resistant MFA.** Use WebAuthn security keys or passkeys, starting with administrators, help-desk staff, and email systems, which CISA singles out as priorities. _Limit:_ fallback methods can remain the weak link if attackers can choose them.
- **Harden push.** Require number matching, rate-limit prompts, and show the location and application. _Limit:_ still relayable.
- **Restrict SMS.** Offer alternatives and watch for SIM changes and number porting. _Limit:_ some users have no alternative.
- **Protect enrollment and recovery.** Treat a new authenticator or a changed phone number as a binding event: require existing strong authentication and notify through a separate channel. Encourage at least two authenticators, as NIST recommends. _Limit:_ recovery remains a target for social engineering.
- **Verify WebAuthn completely.** Use a maintained server library, and check the challenge, type, origin, RP ID hash, flags, and signature on every assertion. _Limit:_ a skipped origin check silently removes phishing resistance.
- **Protect the session MFA creates.** Apply reauthentication timeouts appropriate to the AAL and end sessions on suspicious changes. _Limit:_ a stolen cookie works until it expires or is revoked (see [Sessions, cookies, and tokens](lesson:IAM-04)).

## Common misconceptions

- **"Any MFA stops phishing."** Codes and push approvals can be relayed in real time. Only origin-bound methods such as WebAuthn resist it.
- **"A passkey is a password stored in the cloud."** It is a key pair. The site stores only a public key and never receives a secret that works elsewhere.
- **"The website receives my fingerprint."** The biometric check happens on the device; the site sees a signature and a "user verified" flag.
- **"SMS codes are as good as app codes."** SMS adds SIM-swap and phone-network risks, which is why NIST restricts it.
- **"Number matching makes push phishing-proof."** It stops blind approvals, not relays.
- **"MFA protects the whole session."** It protects sign-in. A stolen session cookie bypasses it.

## Try it in the lab

In [the lab](lab:login-security), an attacker runs a wordlist of 12 common passwords against the sign-in form of a fictional account, `avery`.

1. On the **Attack** tab, click **Launch dictionary attack** with no defenses. The 10th guess is right, and the lab reports the account compromised.
2. Turn on **MFA** and launch again, with rate limiting and account lockout left off: either one stops the run before the password is reached, so if you turned one on, click it again to turn it off. This time the password is guessed, but the second factor refuses the session, which solves the Add a second factor challenge. The lab's run is password guessing rather than credential stuffing, but the result matches column T1 of the worked example's table: a correct password is no longer enough.
3. The lab never says which kind of second factor it models, so it can show only that column. Suppose it were an SMS code: which threats from the worked example would still get in, and which method would stop them?

**Without the lab.** On paper, choose a fictional student portal at `portal.campus.test`. Write three threats and two usability constraints for its users, fill in a method-by-threat table like the one in the worked example, and recommend a primary and a fallback method. State one residual risk your choice does not address.

Then, with your own accounts only, open the security settings of one of them, starting with your email. List the MFA methods offered and the ones you use. Confirm you have at least two working authenticators and current recovery codes, and remove phone numbers or devices you no longer control. If the service offers passkeys, create one and note which domain the browser says it is for and how you unlock it.

## Key takeaways

- Factors are categories; MFA needs two different ones, and the method matters as much as the count.
- One-time codes, SMS, and push approvals stop credential stuffing but can be relayed by a real-time phishing site.
- WebAuthn and passkeys resist phishing because the browser scopes credentials to the RP ID and signs the true origin into every assertion.
- NIST SP 800-63B-4 requires a phishing-resistant option at AAL2 and non-exportable keys at AAL3, where synced passkeys are not allowed.
- MFA protects sign-in, not the session that follows, and only if enrollment and recovery are equally strong.

## Go deeper

- Read the relying-party operations in WebAuthn Level 3, the sections on registering a new credential and verifying an assertion, and list every check in order. Which checks would a hurried implementation skip, and what would each omission allow?
- NIST permits exportable keys at AAL2 but not at AAL3. Weigh recoverability against key control for synced passkeys, and decide which of your own accounts deserve a device-bound key.
- Open question: CISA notes that FIDO/WebAuthn is the only widely available phishing-resistant method. How should a consumer service handle passkey loss without reintroducing a phishable recovery path?
