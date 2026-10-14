---
topicId: IAM-08
title: Federation and enterprise identity
summary: Federation lets one identity provider vouch for a user to many applications, and enterprise identity ties those accounts to the organization's records of who works there. Trace a SAML single sign-on, map the trust boundaries in a federation, and investigate why accounts outlive the people they belong to.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Trace a service-provider-initiated SAML single sign-on and list what the service provider must validate in the response.
  - Identify the trust boundaries in a federation, including the identity provider's signing key and the federation configuration.
  - Explain the joiner-mover-leaver lifecycle and how a directory, single sign-on, and SCIM provisioning carry it to each application.
  - Investigate a deprovisioning failure and name every access path that survived the identity provider account.
prerequisites: [IAM-04, IAM-05, IAM-06]
concepts: [federation, identity-provider, relying-party, sso, saml, scim, deprovisioning]
labs: []
keywords:
  - federated identity
  - single sign-on
  - SAML 2.0
  - SAML assertion
  - service provider
  - SP-initiated SSO
  - IdP-initiated SSO
  - unsolicited response
  - assertion consumer service
  - AudienceRestriction
  - InResponseTo
  - NotOnOrAfter
  - XML signature wrapping
  - token-signing certificate
  - Golden SAML
  - federation metadata
  - enterprise directory
  - joiner-mover-leaver
  - JML
  - onboarding
  - offboarding
  - access creep
  - orphaned account
  - access review
  - provisioning
  - SCIM
  - RFC 7644
  - NIST SP 800-63C-4
  - T1606.002
sources:
  - title: 'NIST SP 800-63C-4: Digital Identity Guidelines: Federation and Assertions'
    url: https://csrc.nist.gov/pubs/sp/800/63/C/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: OWASP SAML Security Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'RFC 7644: System for Cross-domain Identity Management: Protocol'
    url: https://www.rfc-editor.org/rfc/rfc7644.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'MITRE ATT&CK T1606.002: Forge Web Credentials: SAML Tokens'
    url: https://attack.mitre.org/techniques/T1606/002/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use
    sourceId: mitre-attack
quiz:
  - question: Bob's employer disables his identity provider account at 5 p.m. on his last day. At 9 p.m. he is still reading the company wiki, which uses SAML single sign-on. What is the most likely explanation?
    choices:
      - The wiki created its own session when Bob signed in that morning, and disabling the identity provider account blocks only new sign-ins.
      - SAML assertions never expire.
      - The identity provider's signing key has been stolen.
      - Bob's browser is showing cached copies of the pages.
    answer: 0
    explanation: After validating an assertion, a service provider runs its own session and does not ask the identity provider again until that session ends. Deprovisioning has to end application sessions and tokens too, or keep them short.
  - question: Which check ties a SAML response to a sign-in that this service provider actually started?
    choices:
      - The strength of the signature algorithm
      - The Audience value matching the service provider's entity ID
      - InResponseTo matching the ID of an authentication request the service provider sent
      - The NotBefore time
    answer: 2
    explanation: The other checks matter too, but only InResponseTo links the response to a request this service provider issued for this browser. Unsolicited, IdP-initiated responses have no such link, which is why OWASP calls them "inherently less secure by design."
  - question: An attacker obtains an identity provider's token-signing private key. What can they do, and what helps most?
    choices:
      - Nothing, because every assertion also carries the user's password.
      - Recover users' passwords from the key.
      - Sign in only as accounts that have no MFA.
      - Create assertions for any user with any attributes, which every relying party will accept; keep the key in an HSM, alert on federation changes, and look for assertions with no matching sign-in at the identity provider.
    answer: 3
    explanation: Relying parties trust whatever the key signs, so MITRE ATT&CK lists forged SAML tokens (T1606.002) as a way to impersonate any user and possibly bypass MFA. The defenses protect the key, watch the federation configuration, and correlate service provider logins with identity provider sign-ins.
  - question: When Carol moves from engineering to finance, she gains finance access, but her engineering access is never removed. What is this failure, and how is it prevented?
    choices:
      - Credential stuffing, prevented by MFA.
      - Access creep in the mover step, prevented by recomputing access from the new role and reviewing access after every move.
      - Session fixation, prevented by regenerating session IDs.
      - Federation drift, prevented by switching from SAML to OpenID Connect.
    answer: 1
    explanation: Movers are the forgotten step of joiner-mover-leaver. Adding access is requested by the person who needs it; removing old access is requested by no one, so it must be automatic or reviewed.
  - question: Why do organizations add SCIM provisioning to SAML or OpenID Connect single sign-on?
    choices:
      - SCIM encrypts SAML assertions in transit.
      - SCIM replaces multi-factor authentication.
      - Single sign-on acts only when a user arrives, while SCIM lets the identity provider create, update, and remove the user's account in each application, even if the user never signs in again.
      - SCIM makes IdP-initiated sign-on safe.
    answer: 2
    explanation: RFC 7644 defines SCIM as an HTTP-based protocol for provisioning and managing identity data across domains. Without it, an application learns about a user only at sign-in and never hears that the user left.
---

## Why it matters

Even a small organization runs many applications: email, chat, a wiki, code hosting, payroll, cloud consoles. Without federation, each has its own password, its own [[mfa|multi-factor]] setup or none, and its own list of accounts. When someone leaves, an administrator must remember every system they used. [[federation|Identity federation]] fixes this by letting one [[identity-provider]] (IdP) authenticate users and vouch for them to every application, and [[sso|single sign-on]] (SSO) means one sign-in reaches them all.

Centralizing identity cuts both ways. It puts strong authentication and a single off switch in one place. It also makes the IdP's signing key and configuration a single point that every application trusts. MITRE ATT&CK documents adversaries who obtain a SAML token-signing certificate and forge tokens with arbitrary claims and lifetimes, which can impersonate any user and may bypass MFA. And the off switch works only if it reaches every application: accounts, sessions, and tokens that outlive the person are a common gap.

NIST's guideline for this area, SP 800-63C-4 (final July 2025), "focuses on identity federations and the use of assertions to implement them." This lesson traces a SAML sign-in, maps where trust lives, and follows an identity from hiring to departure.

## The core idea

A passport is a good model. The issuing country vouches for who you are; a border officer abroad has never met you but checks that the passport is genuine, unexpired, and matches the traveler, and then trusts the issuer's statement. In federation, the IdP issues signed statements called _assertions_, and each [[relying-party]] (RP) verifies the signature and the details before believing them. NIST SP 800-63C-4 describes the arrangement as a provider supplying authentication attributes, and optionally attributes about the user, to many separately administered relying parties, each of which may accept more than one provider.

Enterprise identity adds a source of truth. The HR system knows who works here and in what role. A _directory_, such as Microsoft Active Directory or an LDAP directory, holds accounts and groups derived from those records. The IdP authenticates people against the directory and issues assertions. Provisioning then creates and removes accounts in each application. Together they run the _joiner-mover-leaver_ lifecycle: access granted at hiring, changed with each new role, and removed at departure.

The model assumes the IdP authenticates strongly (see [Multi-factor authentication and passkeys](lesson:IAM-03)), its signing key stays secret, every RP validates every assertion fully, and the pipeline from HR records to applications is complete and fast.

## How it works

### Roles in two protocols

| Concept | SAML 2.0 | OpenID Connect |
| --- | --- | --- |
| Party that authenticates the user | Identity provider | OpenID provider |
| Party that relies on the result | Service provider (SP) | Relying party (client) |
| The signed statement | Assertion, in XML | ID token, a JWT |
| How trust is set up | Exchanged metadata: entity IDs, endpoints, signing certificates | Client registration and the provider's published signing keys |

[[saml|SAML 2.0]] remains common in enterprise software, and [[openid-connect]] in newer and consumer applications; the latter is covered in [OAuth and OpenID Connect concepts](lesson:IAM-05). The trust questions are the same in both.

### A SAML sign-in, started by the service provider

Alice works at `corp.example`, whose IdP is `id.corp.example`. She opens the company wiki, a hosted service at `wiki.example`.

```sequence
title: SAML single sign-on initiated by the service provider
participant B as Alice's browser
participant SP as wiki.example (service provider)
participant IdP as id.corp.example (identity provider)
B -> SP: GET /dashboard (no session yet)
SP --> B: Redirect to IdP with AuthnRequest (ID r42)
B -> IdP: Deliver the AuthnRequest
note IdP: Alice signs in with her passkey
IdP --> B: Page that auto-posts a signed SAML Response
B -> SP: POST /saml/acs with the SAML Response
note SP: Verify signature, audience, time, InResponseTo
SP --> B: Session cookie for Alice's wiki account
```

In this common setup the browser carries every message, and the IdP and the SP never talk directly during sign-in. The SP's _assertion consumer service_ (`/saml/acs`) receives the response, validates it, and creates a local [[session]]. From then on the wiki trusts its own session cookie and does not consult the IdP again until that session ends. That detail matters for deprovisioning.

### What the service provider must check

The OWASP SAML Security Cheat Sheet lists the checks. In plain terms, the SP must confirm that:

- the response or assertion carries a valid [[digital-signature]] from an authorized IdP, with at least RSA-SHA-256 and no SHA-1, and that the signature covers the very assertion used for login;
- the `Audience` is the SP's own entity ID, and the `Destination` and `Recipient` name the SP's own endpoint;
- the current time falls between `NotBefore` and `NotOnOrAfter`;
- `InResponseTo` matches an authentication request this SP sent;
- the assertion has not been used before, with short lifetimes making replay detection practical.

> [!ETHICS] Only test systems you own or have written permission to test.

The signature-coverage rule exists because of _XML signature wrapping_. A SAML message is a tree, and careless code can verify the signature on one element while reading the user's name from a different, unsigned one placed elsewhere in the tree. OWASP's defenses are to validate against local, trusted copies of the schemas, select security elements with absolute paths, and use only the configured IdP key, ignoring any key embedded in the message. Use a maintained SAML library rather than writing this yourself.

OWASP also calls unsolicited, IdP-initiated responses "inherently less secure by design," because without `InResponseTo` the SP cannot tell whether the user meant to sign in at all. Best practice is to turn them off.

### Where trust lives

Each item below is a [[trust-boundary]], a point where one party accepts another's word.

- **The signing key.** Whoever holds the IdP's token-signing key can create assertions for any user, with any attributes, and every RP will accept them. ATT&CK technique T1606.002 describes adversaries obtaining such a key, or, with enough privileges, adding a new federation trust that they control. Mitigations include keeping signing keys in a [[hardware-security-module]], as OWASP recommends, restricting who can change federation settings, and alerting on any change.
- **The federation configuration.** Adding a trusted IdP or replacing a certificate is as powerful as resetting every password, so it deserves the same approvals and logging.
- **The attributes.** RPs often map attributes such as group membership to permissions. They should key accounts on the IdP's stable subject identifier, not on an email address that can change or be reassigned, and they still make their own authorization decisions (see [Authentication versus authorization](lesson:IAM-01)).
- **The RP's own session.** Once created, it is outside the IdP's control.

ATT&CK's detection notes suggest one useful correlation: SP logins backed by assertions that have no matching sign-in event at the IdP.

### Joiners, movers, and leavers

- **Joiner.** An HR record creates the directory account; group membership follows from the role; applications receive accounts automatically; the person enrolls in MFA. Grant the role's access, not a copy of a colleague's.
- **Mover.** A new role must add new access _and_ remove old access. The removal is the step everyone forgets, so long-tenured staff accumulate permissions, a pattern called _access creep_.
- **Leaver.** Disable the IdP account, end sessions and revoke tokens, remove application accounts, recover devices, reassign data the person owned, and rotate any shared secret they knew (see [Service identities and secret management](lesson:IAM-07)).

[[scim|SCIM]] carries these events to applications. RFC 7644 describes it as an HTTP-based protocol for "provisioning and managing identity data on the web and in cross-domain environments." The IdP, acting as the SCIM client, creates users with `POST`, reads them with `GET`, replaces or modifies them with `PUT` or `PATCH`, and removes them with `DELETE`, at endpoints such as `/Users` and `/Groups`:

```http
DELETE /scim/v2/Users/u-1042 HTTP/1.1
Host: wiki.example
Authorization: Bearer <provisioning token>
```

Without provisioning, an application learns about a user only at sign-in, and it never hears that the user has left.

## Worked example

Two weeks after Bob's contract with `corp.example` ended, the wiki's audit log shows Bob's account exporting the finance space. The IdP shows his account disabled on his last day. How did he get in?

**Step 1: list every door into the wiki and who controls it.**

| Door | Controlled by | Closed when the IdP account is disabled? |
| --- | --- | --- |
| SAML sign-in | IdP signing key and Bob's IdP account | Yes |
| Existing wiki session cookie | The wiki | No; it lasts until it expires |
| Personal API token Bob created in the wiki | The wiki | No |
| Local wiki password set before SSO was introduced | The wiki | No |
| The finance team's shared reporting account | Whoever knows the password | No |

**Step 2: build the timeline from the logs.**

| When | System | Event |
| --- | --- | --- |
| Last day, 17:00 | HR | Contract ends |
| Last day, 17:30 | IdP | Bob's account disabled; no sign-ins afterward |
| Last day + 3 | Wiki | Activity on a 30-day session from Bob's last morning |
| Last day + 14 | Wiki | Finance export through Bob's personal API token |
| Last day + 14 | IdP | No authentication events for Bob |

The IdP did its job. The surviving doors were all inside the wiki, which had never been connected to provisioning.

**Step 3: find the root causes and fixes.**

| Gap | Root cause | Fix |
| --- | --- | --- |
| Long-lived wiki session | SP sessions outlive the IdP account | Shorter sessions; reauthentication for exports; end sessions on deprovisioning |
| Personal API token | Tokens are created outside the IdP | Expiring tokens; revoke all of a user's tokens on deprovisioning |
| Local password | SSO was never enforced | SSO-only login; local accounts limited to monitored break-glass use |
| No provisioning | Wiki not connected to the lifecycle | SCIM from the IdP, triggered by the HR record |
| Shared account | Credentials not tied to one person | Personal accounts, or rotation whenever a member leaves |

A review also finds that Bob, who moved from engineering to finance a year earlier, still had administrator rights in the code repository: access creep from a skipped mover step. Whatever Bob intended, lingering access like this is a classic [[insider-threat]] path, and none of it should have existed.

## Defenses

- **Make the IdP the only front door.** Enforce SSO and disable local passwords, except for a few monitored break-glass accounts. _Limit:_ some applications cannot enforce SSO, and they need a compensating manual process.
- **Drive the lifecycle from HR records.** Provision and deprovision through SCIM, and recompute access on every move. _Limit:_ not every application supports SCIM; keep a leaver checklist for the rest.
- **Bound sessions and tokens.** Short RP sessions, reauthentication for sensitive actions, expiring tokens, and revocation on departure. _Limit:_ shorter sessions trade away some convenience.
- **Validate assertions completely.** Signature coverage, audience, recipient, time window, `InResponseTo`, and replay, using a maintained library with IdP-initiated SSO turned off. _Limit:_ library flaws still happen, so patch promptly.
- **Guard the trust anchors.** Signing keys in an HSM, approvals and alerts for federation changes, and correlation of SP logins with IdP sign-ins. _Limit:_ detection works after the fact; rotating a stolen signing key affects every RP.
- **Review access regularly.** Have managers confirm group memberships and application accounts, and remove orphaned accounts that map to no current person. _Limit:_ reviews degrade into rubber stamps when they are too large.

## Common misconceptions

- **"Disabling the IdP account removes all access."** It blocks new federated sign-ins. Sessions, tokens, local passwords, and shared accounts need their own off switches.
- **"SSO is riskier than separate passwords."** It concentrates risk, but it also concentrates strong authentication and offboarding. Separate passwords are usually weaker, reused, and forgotten at departure.
- **"A valid signature means the assertion is for us."** Signed assertions for other SPs, expired ones, and replayed ones all carry valid signatures.
- **"The IdP decides what users may do in our app."** It vouches for identity and supplies attributes; authorization stays with the application.
- **"Moving someone to a new team is harmless."** Without removal of old access, every move leaves extra permissions behind.

## Try it yourself

1. **On paper: map the doors.** For a hosted application your class might use, list every way a user could reach their data: SSO, local passwords, sessions, API tokens, mobile apps, shared accounts. For each, name what closes it when the person leaves.
2. **On paper: write the JML runbook.** For a 50-person company at `corp.example` with an IdP, five SaaS applications, and an HR system, specify what triggers each joiner, mover, and leaver step, which system performs it, and how you would verify it happened.
3. **With your own account.** Open the security page of an account you own that offers "Sign in with" options or lists devices. Find the active sessions and the third-party apps that sign in with this account, and sign out of anything you do not recognize or no longer use.
4. **Optional, your own sign-in.** If your school uses SAML for single sign-on, open the Network tab of your browser's developer tools while signing in to a campus service. Find the `POST` to the service's assertion consumer endpoint, decode the `SAMLResponse` field locally with `atob()` in your browser console, and identify the `Issuer`, `Audience`, `NotOnOrAfter`, and attribute names (an encrypted assertion will show only the outer response). The response contains your personal data, so do not paste it into online decoders, share it, or reuse it.

## Key takeaways

- Federation lets one identity provider vouch for users to many relying parties; SSO turns that into one sign-in.
- A service provider must check signature coverage, audience, recipient, time window, `InResponseTo`, and replay, and should refuse unsolicited responses.
- The IdP's signing key and the federation configuration are trust anchors for every connected application, so protect, monitor, and audit them.
- Joiner-mover-leaver is a lifecycle, not an event: automate it from HR records, remove old access on every move, and provision with SCIM.
- Disabling the IdP account ends only new sign-ins; sessions, API tokens, local passwords, and shared accounts must be closed too.

## Go deeper

- Read NIST SP 800-63C-4 and list which of this lesson's relying-party checks it requires, and which requirements it adds beyond them.
- ATT&CK's detection notes for T1606.002 include signed assertions with no preceding authentication event at the IdP. Design that correlation: which logs from the IdP and SPs do you need, how do you join them, and what would cause false positives?
- Open question: how could an IdP tell every relying party, within seconds, that a user's access has ended, and what would each party have to trust to act on that signal?
