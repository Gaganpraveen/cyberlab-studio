---
topicId: IAM-05
title: OAuth and OpenID Connect concepts
summary: OAuth 2.0 lets a user grant an application limited access to an API without sharing a password, and OpenID Connect adds a way to learn who signed in. Learn the roles, trace the authorization code flow with PKCE and an OpenID Connect sign-in, and diagnose the configuration misunderstandings that RFC 9700 warns about.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Identify the resource owner, client, authorization server, and resource server, and the OpenID provider and relying party, in a described integration.
  - Trace the authorization code flow with PKCE and explain what the state value, the code verifier, and exact redirect URI matching each prevent.
  - Distinguish an access token, a refresh token, and an ID token by audience and purpose.
  - Diagnose OAuth and OpenID Connect configuration misunderstandings against RFC 9700 and recommend fixes.
prerequisites: [IAM-01, IAM-04, WEB-04]
concepts: [oauth, openid-connect, id-token, pkce, access-token]
labs: []
keywords:
  - OAuth 2.0
  - OAuth2
  - OIDC
  - authorization code grant
  - authorization code flow
  - code_verifier
  - code_challenge
  - S256
  - redirect URI
  - state parameter
  - nonce
  - scope
  - consent
  - implicit grant
  - resource owner password credentials
  - confidential client
  - public client
  - OpenID provider
  - UserInfo endpoint
  - sender-constrained tokens
  - DPoP
  - mix-up attack
  - RFC 6749
  - RFC 7636
  - RFC 9700
  - BCP 240
sources:
  - title: 'RFC 6749: The OAuth 2.0 Authorization Framework'
    url: https://www.rfc-editor.org/rfc/rfc6749.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 7636: Proof Key for Code Exchange by OAuth Public Clients'
    url: https://www.rfc-editor.org/rfc/rfc7636.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 9700: Best Current Practice for OAuth 2.0 Security (BCP 240)'
    url: https://www.rfc-editor.org/rfc/rfc9700.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: OpenID Connect Core 1.0 incorporating errata set 2
    url: https://openid.net/specs/openid-connect-core-1_0.html
    publisher: OpenID Foundation
  - title: OWASP OAuth 2.0 Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
quiz:
  - question: printshop.example wants to read Alice's photos stored at photos.example so it can print them. In OAuth terms, which party is the client?
    choices:
      - Alice
      - The photos.example API
      - printshop.example
      - The authorization server that issues tokens
    answer: 2
    explanation: The client is the application that requests access on the resource owner's behalf. Alice is the resource owner, the photos API is the resource server, and the authorization server authenticates Alice, records her consent, and issues tokens.
  - question: What does PKCE protect against?
    choices:
      - Someone who obtains the authorization code redeeming it, because only the client that created the code verifier can complete the exchange.
      - Phishing of the user's password at the authorization server.
      - Theft of tokens from the resource server's database.
      - Cross-site scripting in the client's pages.
    answer: 0
    explanation: The client sends a hash of a secret code verifier with the authorization request and reveals the verifier only at the token endpoint. A stolen or injected code is useless without it. RFC 9700 requires PKCE for public clients and names S256 as the method to use.
  - question: A client treats any access token whose sub claim says alice as proof that Alice signed in to it. Why is this a misunderstanding?
    choices:
      - Access tokens never contain a sub claim.
      - The client should read an email claim instead of sub.
      - It is safe as long as the access token is a JWT.
      - An access token is meant for a resource server and does not show that the user authenticated to this client; an OpenID Connect ID token, checked for its audience and nonce, does.
    answer: 3
    explanation: An access token could have been issued to a different client and replayed here. OpenID Connect's ID token names the client in aud, carries the nonce from this sign-in, and has validation rules designed for exactly this question.
  - question: Which redirect URI registration follows RFC 9700?
    choices:
      - 'https://printshop.example/* so that any page can receive codes'
      - 'https://printshop.example/oauth/callback, compared as an exact string'
      - Whatever https URL the client sends in each request
      - 'http://printshop.example/callback, since codes are short-lived'
    answer: 1
    explanation: RFC 9700 says authorization servers must use exact string matching for redirect URIs, with a narrow exception for localhost ports in native apps. Patterns and request-time URLs let an attacker steer codes elsewhere, and OWASP adds that servers must not allow http redirect URIs.
  - question: Which grant should a new single-page application use to call an API on the user's behalf?
    choices:
      - The implicit grant, because it returns tokens straight to the browser.
      - The resource owner password credentials grant, so the app can show its own sign-in form.
      - The authorization code grant with PKCE.
      - Client credentials, with the client secret embedded in the JavaScript.
    answer: 2
    explanation: RFC 9700 says clients should not use the implicit grant and that the password grant must not be used. A single-page app is a public client that cannot keep a secret, so it uses the authorization code grant with PKCE.
---

## Why it matters

"Sign in with id.example" buttons and "Allow this app to read your calendar" prompts are everywhere, and both run on [[oauth]] 2.0 (RFC 6749) and [[openid-connect]] (OIDC). They let one service act for a user at another without ever seeing the user's password. They also have many moving parts, and each part that is misunderstood becomes a weakness: an app that treats an access token as proof of who signed in, a redirect address matched by pattern instead of exactly, a missing CSRF check, or a grant type that should have been retired.

The IETF collected the lessons of a decade of deployments in RFC 9700, the OAuth 2.0 Security Best Current Practice (BCP 240, January 2025), which updates RFC 6749. Its headline rules are concrete: authorization servers "MUST utilize exact string matching" for redirect URIs, "Public clients MUST use PKCE," clients "SHOULD NOT use the implicit grant," and the resource owner password credentials grant "MUST NOT be used."

This lesson builds the vocabulary to read such rules: who the parties are, what travels between them, and which property each step protects.

## The core idea

OAuth is _delegation_. A user lets an application do one limited thing at an API, for a limited time, without handing over the password. The classic analogy is a valet key: it starts the car and locks the doors, but it does not open the trunk, and the owner never gives up the master key. In OAuth the valet key is an [[access-token]], and its limits are the _scope_ (what it allows), its audience (which API accepts it), and its expiry.

OAuth by itself does not tell the application who the user is. It answers "may this app read Alice's photos?", not "is the person at this browser Alice?" OpenID Connect, which its specification calls "a simple identity layer on top of the OAuth 2.0 protocol," adds that answer as a signed [[id-token]].

Three assumptions underlie both. Every exchange runs over [[tls]]. The browser delivers redirects to the address the authorization server chose. And each client has registered its exact redirect addresses in advance, so the authorization server knows where codes may go.

## How it works

### The roles

| Role | Definition (RFC 6749) | In the running example |
| --- | --- | --- |
| Resource owner | The entity that can grant access; for a person, the end-user | Alice |
| Client | The application that requests access on the owner's behalf | `printshop.example` |
| Authorization server | Authenticates the owner, obtains consent, and issues tokens | `auth.photos.example` |
| Resource server | Hosts the protected resources and accepts access tokens | The `photos.example` API |

OpenID Connect renames two of these: an authorization server that supports OIDC is an _OpenID provider_ (OP), a kind of [[identity-provider]], and the client that signs users in is a [[relying-party]] (RP).

RFC 6749 also distinguishes client types. A _confidential_ client, such as a server-side web application, can keep a secret. A _public_ client, such as a mobile app or a single-page JavaScript app, cannot, because anything shipped to the user's device can be extracted.

### The authorization code flow with PKCE

The diagram shows Alice letting `printshop.example` read her photos. The browser carries the front-channel messages; the client talks to the token endpoint directly.

```sequence
title: OAuth 2.0 authorization code flow with PKCE
participant B as Alice's browser
participant C as printshop.example
participant AS as auth.photos.example
participant RS as photos.example API
B -> C: Click "Print from my photo library"
note C: New code verifier; challenge = SHA-256 of it
C --> B: Redirect to AS: scope, state, code challenge
B -> AS: Alice signs in and approves "read photos"
AS --> B: Redirect to the client with code and state
B -> C: Code and state (client checks the state)
C -> AS: POST /token with code and code verifier
note AS: Hash of the verifier must match the challenge
AS --> C: Access token, optional refresh token
C -> RS: GET /photos with the access token
```

Each parameter defends one step:

- **Redirect URI.** The authorization server sends the code only to an address registered for this client, compared as an exact string. A pattern such as `https://printshop.example/*` could deliver codes to any page on the site, including one with an [[open-redirect]].
- **State.** A one-time value bound to Alice's browser that the client checks when the code returns, so that an attacker cannot feed the client a code from the attacker's own account, a form of [[csrf]]. RFC 9700 lets clients that use PKCE rely on it for CSRF protection instead.
- **PKCE.** [[pkce]] (RFC 7636) was designed for public clients, where another app on the device might intercept the redirect. The client creates a high-entropy random _code verifier_ of 43 to 128 characters and sends only its SHA-256 hash, the _code challenge_ (method `S256`), in the first redirect. At the token endpoint it reveals the verifier. Whoever obtains the code alone cannot redeem it.
- **Scope.** The client asks only for what it needs, `photos.read` here, and Alice sees that request on the consent screen.

### What the tokens are for

| Token | Audience | Purpose | Typical lifetime |
| --- | --- | --- | --- |
| Access token | The resource server | Call the API within the granted scope | Minutes to an hour |
| [[refresh-token]] | The authorization server only | Obtain new access tokens without the user | Longer; rotated or bound to the client |
| ID token | The client (relying party) | Tell the client who signed in, and when | Minutes; consumed at sign-in |

RFC 9700 adds three token rules. Access tokens should be audience-restricted to a specific resource server. Servers should use sender-constrained tokens, such as mutual TLS or DPoP, so that a copied token is useless without the client's private key. And refresh tokens for public clients "MUST be sender-constrained or use refresh token rotation" (see [Sessions, cookies, and tokens](lesson:IAM-04) for rotation).

The resource server still makes its own authorization decision. A token with `photos.read` lets the client read photos _Alice_ could read; it does not let the client read Bob's (see [Authentication versus authorization](lesson:IAM-01)).

### OpenID Connect sign-in

To sign Alice in to `notes.example` with her account at `id.example`, the relying party runs the same code flow with the `openid` scope and a `nonce`, and receives an ID token alongside the access token.

```sequence
title: OpenID Connect sign-in with the authorization code flow
participant B as Alice's browser
participant RP as notes.example (relying party)
participant OP as id.example (OpenID provider)
B -> RP: Click "Sign in with id.example"
RP --> B: Redirect: scope openid, state, nonce, PKCE
B -> OP: Alice authenticates with her passkey
OP --> B: Redirect back with code and state
B -> RP: Code and state
RP -> OP: POST /token with code and code verifier
OP --> RP: ID token (a signed JWT) and access token
note RP: Validate iss, aud, signature, exp, nonce
RP --> B: Session cookie for Alice's account
```

The ID token is a [[jwt]] whose required claims are `iss`, `sub`, `aud`, `exp`, and `iat`; it also carries the `nonce` when one was sent. OpenID Connect Core lists the checks: the issuer must exactly match the provider's identifier, the audience must contain the client's own `client_id`, the signature must verify with the issuer's keys, the current time must be before `exp`, and the `nonce` must match the value from this sign-in. Only then does the relying party create its own session.

### Patterns that RFC 9700 retires

- **Implicit grant.** It returned access tokens directly in the redirect; OWASP notes that "it exposes access tokens in the URL fragment." Use the code flow with PKCE.
- **Resource owner password credentials.** The client collects the user's password itself, which defeats the purpose of delegation. It "MUST NOT be used."
- **Mix-up between authorization servers.** A client that works with several authorization servers must know which one sent each response; RFC 9700 recommends the `iss` response parameter or a distinct redirect URI per server.

## Worked example

> [!ETHICS] Only test systems you own or have written permission to test.

A developer drafted these settings for `printshop.example`, a single-page app that prints photos from `photos.example` and lets users sign in with `id.example`. First trace the roles, then find the misunderstandings.

```yaml
# printshop.example OAuth client settings (draft)
client_type: public          # single-page JavaScript app
grant: implicit
redirect_uris: ["https://printshop.example/*"]
scope: "photos.read photos.write photos.delete"
pkce: false
state: "printshop-state"     # the same value on every request
sign_in: "trust the sub claim of any access token we receive"
token_storage: localStorage
refresh_tokens: "30 days, never rotated"
```

**Step 1: trace the roles.** For photo access, Alice is the resource owner, `printshop.example` the client, `auth.photos.example` the authorization server, and the `photos.example` API the resource server. For sign-in, `id.example` is the OpenID provider and `printshop.example` the relying party. Writing this down exposes the first confusion: the draft uses an _access_ token, whose audience is an API, to answer the relying party's question about who signed in.

**Step 2: find the misunderstandings.**

| Setting | Misunderstanding | Risk | Fix |
| --- | --- | --- | --- |
| `grant: implicit` | A browser app needs tokens in the redirect | Tokens exposed in the URL fragment | Authorization code grant with PKCE |
| Wildcard redirect URI | Any page on our domain is safe | Codes delivered to unintended pages | Register exact URIs; exact string matching |
| Three scopes | Ask once for everything | A stolen token can delete photos | Request `photos.read` only |
| `pkce: false` | PKCE is optional for web apps | A captured code can be redeemed | PKCE with `S256`; required for public clients |
| Constant `state` | State is a formality | Cross-site login and code injection | One-time value bound to the browser, or rely on PKCE |
| Sign-in from an access token | Any token naming Alice proves Alice is here | A token issued to another client could be replayed here | OIDC: validate an ID token's `iss`, `aud`, signature, `exp`, and `nonce` |
| `localStorage` | Storage is private to the app | One script injection reads every token | A backend-for-frontend holding tokens; session cookie in the browser |
| Unrotated 30-day refresh tokens | Refresh tokens are like passwords | A copied token works for a month | Rotation with reuse detection, or sender-constraining |

The most serious item is the sign-in rule, because it turns any access token for Alice, issued to _any_ client, into a way to sign in as her. The next is the wildcard redirect, because it can hand codes to the wrong place.

## Defenses

- **Use the authorization code flow with PKCE everywhere.** RFC 9700 requires PKCE for public clients and recommends it for confidential ones. _Limit:_ PKCE protects the code, not tokens stolen later.
- **Register and exactly match redirect URIs.** Remove open redirects on client and server. _Limit:_ an exact URI is safe only if the page behind it is.
- **Bind each flow to the browser.** One-time `state`, the `nonce` for OIDC, and PKCE. _Limit:_ they stop injected responses, not a user who approves a malicious client.
- **Keep tokens narrow and short.** Minimal scopes, audience-restricted access tokens, short lifetimes, and sender-constrained tokens where supported. _Limit:_ sender-constraining needs support on the client, authorization server, and resource server.
- **Validate ID tokens completely.** Issuer, audience, signature, expiry, and nonce, with the issuer's published keys. _Limit:_ validation proves who the provider says signed in, not that the provider was itself uncompromised (see [Federation and enterprise identity](lesson:IAM-08)).
- **Authenticate confidential clients with asymmetric methods.** RFC 9700 recommends mutual TLS or signed JWT client assertions over shared secrets. _Limit:_ public clients still have no secret to protect.

## Common misconceptions

- **"OAuth is an authentication protocol."** It delegates access to an API. Sign-in needs OpenID Connect's ID token or an equivalent.
- **"PKCE is only for mobile apps."** RFC 9700 requires it for all public clients and recommends it for confidential ones.
- **"The state parameter is optional."** Without a one-time `state` or PKCE, the client cannot tell its own response from an injected one.
- **"A wildcard redirect URI is fine on our own domain."** RFC 9700 demands exact matching because one weak page is enough.
- **"Scopes are the app's permission system."** Scopes limit the client. The resource server still decides what the user may access.
- **"An ID token can be sent to APIs."** Its audience is the client. APIs expect access tokens.

## Try it yourself

1. **On paper.** For each item, name the role or token involved and the attack its absence would allow: the registered redirect URI, `state`, the code verifier, the `nonce`, the `aud` claim of an ID token, and the scope `photos.read`.
2. **With your own accounts only.** Open the "connected apps" or "third-party access" page of one of your own accounts (most large email and code-hosting services have one). For each app, note which scopes it holds and when it last used them, and revoke any you no longer use.
3. **Optional, in your own browser.** Sign in to a site you use through a "Sign in with" button while the Network tab of your developer tools is open. Find the redirect to the authorization endpoint and identify `client_id`, `redirect_uri`, `scope`, `state`, and, if present, `code_challenge` and `nonce`. Observe only; do not copy or reuse codes or tokens.

## Key takeaways

- OAuth delegates limited access to an API; OpenID Connect adds a signed ID token that tells the client who signed in.
- Learn the four roles first: most configuration mistakes come from confusing which party a token or check is for.
- The authorization code flow with PKCE, exact redirect URI matching, and one-time `state` are the modern baseline that RFC 9700 sets.
- Access tokens go to APIs, refresh tokens only to the authorization server, and ID tokens only to the client.
- The implicit and password grants are retired; sender-constrained and rotated tokens shrink the value of a copied token.

## Go deeper

- RFC 9700 describes mix-up attacks against clients that use several authorization servers. Explain why the `iss` response parameter or distinct redirect URIs defend against them, and what a client must store to use either one.
- OpenID Connect Core allows the client to skip signature checking for an ID token received directly from the token endpoint over TLS. Argue when that shortcut is sound and when it is not.
- Open question: RFC 9700 recommends sender-constrained access tokens through mutual TLS or DPoP. What would it take for a single-page app to use them, and how much protection would remain if a script injection ran inside the app itself?
