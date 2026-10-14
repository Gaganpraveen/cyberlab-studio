---
topicId: IAM-04
title: Sessions, cookies, and tokens
summary: After sign-in, a session identifier or token stands in for the user's password and second factor until it expires or is revoked. Learn how server-side sessions and signed tokens work, how cookie attributes and timeouts protect them, how to end them reliably, and how to verify a JWT safely.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Compare server-side sessions with self-contained tokens in terms of revocation, scaling, and exposure.
  - Choose cookie attributes and idle and absolute timeouts for a session cookie, and justify each choice.
  - Explain session hijacking and session fixation conceptually and name the defenses that stop each.
  - Inspect a toy service's session lifecycle and identify where invalidation fails.
  - Configure JWT verification that pins algorithms and validates issuer, audience, and expiry, following RFC 8725.
prerequisites: [IAM-01, IAM-02, WEB-04]
concepts: [session, cookie, session-hijacking, session-fixation, jwt, access-token, refresh-token]
labs: [jwt]
keywords:
  - session management
  - session ID
  - session cookie
  - cookie attributes
  - Secure
  - HttpOnly
  - SameSite
  - __Host- prefix
  - idle timeout
  - absolute timeout
  - logout
  - session invalidation
  - bearer token
  - JSON Web Token
  - JWS
  - RFC 7519
  - RFC 8725
  - BCP 225
  - token revocation
  - refresh token rotation
  - backend for frontend
sources:
  - title: OWASP Session Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'RFC 7519: JSON Web Token (JWT)'
    url: https://www.rfc-editor.org/rfc/rfc7519.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-7519-jwt
  - title: 'RFC 8725: JSON Web Token Best Current Practices'
    url: https://www.rfc-editor.org/rfc/rfc8725.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-8725-jwt-bcp
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-63b
  - title: 'OWASP Top 10:2025, A01 Broken Access Control'
    url: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
  - title: CircleCI incident report for January 4, 2023 security incident
    url: https://circleci.com/blog/jan-4-2023-incident-report/
    publisher: CircleCI
quiz:
  - question: A team keeps each user's session in a signed JWT with a 30-day expiry and no server-side state. A user reports a stolen laptop. What is the main problem?
    choices:
      - Servers cannot read the claims inside a JWT.
      - The token stays valid until it expires unless the service adds state, such as a denylist or a per-user token version.
      - The signature stops verifying when the token is used from a different laptop.
      - Browsers delete stored tokens automatically when a device is reported stolen.
    answer: 1
    explanation: A self-contained token is checked by its signature and expiry alone, so nothing tells the server that this particular token should no longer work. Revoking it early needs server-side state, which is why long-lived stateless tokens are risky and short lifetimes matter.
  - question: Which Set-Cookie value best protects the session cookie for shop.example?
    choices:
      - 'sid=…; Path=/; SameSite=None'
      - 'sid=…; Domain=shop.example; Max-Age=31536000'
      - 'sid=…; Domain=shop.example'
      - '__Host-sid=…; Secure; HttpOnly; SameSite=Lax; Path=/'
    answer: 3
    explanation: Secure keeps the cookie off unencrypted connections, HttpOnly stops scripts from reading it, and SameSite limits when it is sent with cross-site requests. The __Host- prefix requires Secure, Path=/, and no Domain attribute, so subdomains can neither receive nor overwrite it. A one-year Max-Age keeps a credential around far longer than needed.
  - question: Why must an application issue a new session identifier at the moment a user signs in?
    choices:
      - So that an identifier that existed before sign-in, and might be known to someone else, never becomes an authenticated session.
      - Because a cookie cannot be updated once it has been set.
      - To make the cookie smaller after sign-in.
      - Because the earlier identifier was encrypted with a different key.
    answer: 0
    explanation: This is the defense against session fixation. If the identifier stays the same across sign-in, anyone who knew it beforehand shares the signed-in session. OWASP calls regeneration after any privilege change, including sign-in, mandatory.
  - question: A user clicks Sign out. The app deletes the cookie in the browser but leaves the server-side session in place. What follows?
    choices:
      - Nothing; deleting the cookie ends the session everywhere.
      - The user is signed out of every device at once.
      - Any copy of the old session identifier keeps working until the server-side session times out.
      - The server rotates the identifier automatically.
    answer: 2
    explanation: OWASP warns that deleting a cookie alone does not invalidate a stolen copy of the session identifier. Logout must destroy the session on the server, and the cookie should be cleared as well.
  - question: Which JWT verification approach follows RFC 8725?
    choices:
      - Accept whichever algorithm the token's header names, so that keys can be rotated freely.
      - Pin the list of accepted algorithms, use a key with enough entropy, and validate the issuer, audience, and expiry before trusting any claim.
      - Skip signature checks for tokens that come from inside the company network.
      - Decode the payload and trust it whenever the exp claim is in the future.
    answer: 1
    explanation: RFC 8725 requires libraries to let the caller specify the allowed algorithms and to use no others, forbids human-memorable passwords as keys for keyed-MAC algorithms such as HS256, and requires audience validation. A decoded payload is just data until every check has passed.
---

## Why it matters

HTTP is stateless: each request arrives on its own. After a user signs in (see [Passwords, recovery, and account lifecycle](lesson:IAM-02) and [Multi-factor authentication and passkeys](lesson:IAM-03)), the application needs a way to recognize the same browser on the next request. Whatever carries that recognition, a session identifier in a [[cookie]] or a token, becomes a _bearer_ credential: while it is valid, presenting it is as good as presenting the password and the second factor.

That makes sessions a target. CircleCI's report on its January 2023 security incident says that malware on an engineer's laptop was used to "steal a valid, 2FA-backed SSO session," that "the malware was not detected by our antivirus software," and that the company then recommended that all customers rotate their secrets. Multi-factor authentication had done its job at sign-in; the stolen session did not need it.

No single control prevents every theft, so good session design limits what a stolen credential is worth: short lifetimes, invalidation on the server, and careful verification. The OWASP Top 10:2025 lists these among its access-control defenses: invalidate sessions on logout, keep stateless JWTs short-lived, and use refresh tokens for longer-lived access.

## The core idea

There are two ways to remember a signed-in user.

- **Server-side session.** The server creates a random, meaningless identifier and keeps the real [[session]] state (who, since when, last activity) in its own store. This works like a coat-check ticket: the number means nothing by itself, the coat stays behind the counter, and the staff can void a ticket at any moment.
- **Self-contained token.** The token itself carries signed claims: who the user is, which service the token is for, and when it expires. This is like a festival wristband with the dates printed on it and a hologram: any gate can check it without calling the office, but a wristband already on someone's wrist is hard to cancel.

The trade-off is revocation versus independence. Server-side sessions are easy to end but need a lookup on every request. Signed tokens can be checked by many services without shared storage, but they keep working until they expire unless the system adds state after all.

Both designs rest on assumptions: traffic is protected by [[tls]]; identifiers come from a cryptographically secure random number generator ([[csprng]]); the browser enforces cookie rules; signing keys stay secret; and the _server_ enforces expiry, because anything stored on the client can be kept past its stated lifetime.

## How it works

### Signing in with a password and a session cookie

```sequence
title: Password sign-in that creates a session cookie
participant B as Browser
participant S as shop.example
participant D as Session store
B -> S: POST /login (alice, password)
note S: Verify password hash, then the second factor
S -> D: Create a new random session id for alice
S --> B: 303 See Other, Set-Cookie: __Host-sid=…
B -> S: GET /orders (Cookie: __Host-sid=…)
S -> D: Look up the id; check idle and absolute limits
D --> S: alice, signed in 09:02, last active 09:14
S --> B: 200 OK, Alice's orders
```

The server creates a _new_ identifier only after the password and second factor check out, stores the session state, and sends the identifier in a cookie. On every later request it looks the identifier up and checks both timeouts before trusting it. OWASP's guidance for the identifier itself: at least 64 bits of entropy from a CSPRNG, and a value that is meaningless, with no user id or timestamp inside it.

### Cookie attributes

| Attribute | What it does | Recommendation |
| --- | --- | --- |
| `Secure` | Sent only over HTTPS | Always set |
| `HttpOnly` | Hidden from page scripts | Always set for session cookies |
| `SameSite` | Limits sending with cross-site requests | `Strict` or `Lax`; defense in depth against [[csrf]], not a replacement for CSRF tokens |
| `__Host-` name prefix | Browser requires `Secure`, `Path=/`, and no `Domain` | Use for session cookies, so subdomains cannot receive or overwrite them |
| `Domain` | Widens the cookie to subdomains | Leave unset |
| `Path` | Limits the paths that receive it | As narrow as the application allows |
| `Expires` / `Max-Age` | When the browser discards it | Short; the server must enforce expiry itself |

OWASP also advises keeping session identifiers out of URLs, where they leak through links, logs, browser history, and the `Referer` header, and refusing identifiers supplied in URL parameters.

### Lifetimes: idle, absolute, and reauthentication

A session needs two server-side clocks. The _idle_ timeout ends it after a period without activity; OWASP cites common ranges of 2 to 5 minutes for high-value applications and 15 to 30 minutes for low-risk ones. The _absolute_ timeout ends it regardless of activity; OWASP gives 4 to 8 hours as an example for an office application used through a workday. NIST SP 800-63B-4 ties reauthentication to assurance level: at AAL2, at most 24 hours overall and 1 hour of inactivity (recommended); at AAL3, at most 12 hours overall (required) and 15 minutes of inactivity (recommended).

Events matter as much as clocks. The identifier must be regenerated at sign-in and at every privilege change, such as a password change or role elevation. The session must be destroyed on the server at logout; as OWASP puts it, "deleting a cookie alone does not invalidate a stolen copy of the session ID." A password reset or a disabled account should end all of the user's sessions.

### Hijacking and fixation

> [!ETHICS] Only test systems you own or have written permission to test.

[[session-hijacking]] means presenting someone else's valid identifier or token. The server cannot tell a copy from the original, so the defenses aim to keep the credential from leaking and to shrink its value if it does. Exposure routes include script injection through [[xss]] (which `HttpOnly` blocks from _reading_ the cookie), unencrypted connections (blocked by `Secure` and TLS), identifiers in URLs and logs, and malware on the user's device, as in the CircleCI incident. Short lifetimes, reauthentication before sensitive actions, and alerts on anomalies such as a sudden change of network or browser limit what a stolen session can do.

[[session-fixation]] is the reverse problem. If the server keeps the same identifier across sign-in, then an identifier that existed _before_ sign-in, which someone else might know, becomes an authenticated session. The fix is simple and, in OWASP's words, "mandatory": issue a fresh identifier whenever privilege changes, destroy the old one, and accept only identifiers the server itself issued, from cookies rather than URLs.

### Self-contained tokens: JSON Web Tokens

A [[jwt]] (RFC 7519) is "a compact, URL-safe means of representing claims." A signed JWT has three base64url-encoded parts separated by periods: a header naming the algorithm and key, a payload of claims, and a [[digital-signature]] or [[hmac]] over the first two. The parts are _encoded_, not encrypted, so anyone holding the token can read it. Decoded, an access token might look like this:

```json
{
  "header": { "alg": "ES256", "typ": "JWT", "kid": "2026-10" },
  "payload": {
    "iss": "https://auth.shop.example",
    "sub": "user-1041",
    "aud": "https://api.shop.example",
    "exp": 1760431500,
    "iat": 1760430900,
    "jti": "5b1f0c2e"
  }
}
```

The registered claims answer the questions a verifier must ask: who issued it (`iss`), whom it is about (`sub`), which recipient it is for (`aud`), when it stops being valid (`exp`) and before when it is not valid (`nbf`), when it was issued (`iat`), and a unique id (`jti`) that can help detect replays. This token lives 10 minutes.

RFC 8725, the JWT Best Current Practices, catalogs how verification goes wrong: accepting tokens whose header says no signature is present, letting the token's own header choose the verification algorithm, signing with low-entropy secrets that can be guessed offline, and accepting a token meant for another recipient or another purpose. Its rules turn into a short, strict verifier:

```python
import jwt  # PyJWT

claims = jwt.decode(
    token,
    key=ISSUER_PUBLIC_KEY,                # from configuration, never from the token
    algorithms=["ES256"],                 # pinned allowlist; nothing else accepted
    audience="https://api.shop.example",  # reject tokens meant for other services
    issuer="https://auth.shop.example",
    options={"require": ["exp", "iat", "sub"]},
)
```

RFC 8725 also asks for explicit typing in the `typ` header and mutually exclusive validation rules, so that one kind of token, such as an ID token, can never pass as another, such as an [[access-token]].

### Refreshing access without long-lived tokens

Short-lived access tokens limit theft, but users should not sign in every ten minutes. A [[refresh-token]] solves this: it is sent only to the authorization server, never to APIs, and it is exchanged for a fresh access token.

```sequence
title: Refreshing a short-lived access token with rotation
participant C as App (client)
participant AS as Authorization server
participant API as Orders API
C -> API: GET /orders (access token, now expired)
API --> C: 401, token expired
C -> AS: POST /token (refresh token R1)
note AS: R1 valid and unused; retire it
AS --> C: New access token and refresh token R2
C -> API: GET /orders (new access token)
API --> C: 200 OK
note AS: Any later use of R1 revokes R2 as well
```

With _rotation_, each refresh token works once. If a retired token is ever presented again, either the client or someone holding a copy is misusing it, and the server revokes the whole chain. [OAuth and OpenID Connect concepts](lesson:IAM-05) covers where these tokens come from.

### Where tokens live in a browser

OWASP's Session Management Cheat Sheet warns: "Do not store authentication tokens, session IDs, JWTs, refresh tokens, or any credential in" HTML5 web storage, because any script running on the origin can read it and a single XSS flaw exposes every stored token. It recommends `HttpOnly; Secure; SameSite` cookies or a backend-for-frontend (BFF), a small server component that holds tokens and gives the browser only a session cookie.

## Worked example

A class project, the toy service `notes.test`, runs on the student's own machine. The team records what the service does at each lifecycle event and compares it with what should happen.

```http
Set-Cookie: sid=1041-1760430900; Path=/
```

| Event | What should happen | What `notes.test` does | Finding |
| --- | --- | --- | --- |
| Sign-in | New random identifier; the old one destroyed | Keeps the identifier from before sign-in | Session fixation risk |
| Cookie issued | `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite` | `sid=1041-1760430900; Path=/` | Identifier is a user id plus a timestamp, so it can be predicted; scripts can read it |
| 70 minutes idle | Reauthentication (AAL2 idle limit: 1 hour) | Still signed in | No idle timeout |
| Sign-out | Server destroys the session | Only the browser cookie is cleared | Copies keep working |
| Password change | Other sessions and refresh tokens revoked | Other sessions continue | An intruder keeps access |
| API token | Minutes of life; `aud` checked; strong key | 24-hour HS256 JWT, a dictionary word as the key, no `aud` | Long exposure, an offline-guessable key, reuse across services |

The fixes follow directly. The cookie becomes:

```http
Set-Cookie: __Host-sid=Jq3vR9pX2LkT7wQe5ZbN0a; Secure; HttpOnly; SameSite=Lax; Path=/
```

Logout ends the session where it lives:

```python
@app.post("/logout")
def logout():
    sessions.delete(request.cookies.get("__Host-sid"))  # destroy it on the server
    response = redirect("/")
    response.delete_cookie("__Host-sid", path="/", secure=True)
    return response
```

A password change calls the same store to delete every other session for that user and revokes the user's refresh tokens. The API switches to 10-minute tokens signed with ES256 and the strict verifier shown earlier. The team then re-runs each event and confirms the new behavior, including the negative cases: the pre-sign-in identifier and the signed-out identifier must both be refused.

## Defenses

- **Random, opaque identifiers.** At least 64 bits of entropy from a CSPRNG, with nothing meaningful inside. _Limit:_ randomness prevents guessing, not theft.
- **Protective cookie attributes.** `Secure`, `HttpOnly`, `SameSite`, and the `__Host-` prefix. _Limit:_ `HttpOnly` stops scripts from reading the cookie, but injected script can still send requests in the user's session.
- **Server-enforced timeouts.** Idle and absolute limits matched to the risk and the AAL. _Limit:_ short timeouts annoy users, who may then reach for risky workarounds.
- **Regenerate and invalidate.** New identifier at sign-in and privilege changes; server-side destruction at logout, password change, and account disablement. _Limit:_ every service that issued a token must take part.
- **Short-lived tokens, rotated refresh tokens.** _Limit:_ an access token remains valid for its few minutes, and rotation needs reuse detection to be worth much.
- **Strict JWT verification.** Pinned algorithms, strong keys, and issuer, audience, expiry, and type checks. _Limit:_ library defaults vary, so tests should include tokens that must be rejected.
- **Anomaly detection and step-up.** Watch for sudden changes in network or browser, and require reauthentication before sensitive actions. _Limit:_ OWASP notes that binding to IP address or User-Agent can be bypassed behind shared NAT or proxies, and legitimate users move between networks.

## Common misconceptions

- **"JWTs are encrypted."** Signed JWTs are only encoded; anyone holding one can read its claims.
- **"Signing out deletes the session."** Only if the server destroys it. Clearing the cookie does not invalidate copies.
- **"MFA protects against session theft."** MFA protects sign-in. A stolen session cookie or token needs no second factor.
- **"HttpOnly prevents XSS."** It prevents scripts from reading the cookie, not the XSS itself.
- **"A stateless token can be revoked instantly."** Not without adding state, such as a denylist or a per-user version number.
- **"Long sessions are harmless convenience."** Every extra hour is an extra hour in which a stolen credential works.

## Try it in the lab

In [the lab](lab:jwt) you inspect the session token issued by a toy service: you decode its header and claims, see why a verifier that lets the token choose its own algorithm, or that relies on a guessable secret, accepts tokens it should refuse, and then harden the verifier by pinning the algorithm, using a strong key, and validating the claims. The lab is still being built; the exercise below works today.

**Without the lab.** Use your own browser and one of your own accounts. Open the developer tools, go to the Application tab (Chrome or Edge) or the Storage tab (Firefox), and select Cookies for the site. For each cookie that looks like a session identifier, record its `Secure`, `HttpOnly`, and `SameSite` settings, its expiry, and whether its name uses the `__Host-` prefix. Do not copy or share cookie values: they are credentials. Sign out and check whether the cookie disappears. Then open the account's security settings, review the list of active sessions or devices, and sign out any you do not recognize. Finally, fill in the lifecycle table from the worked example for that service, using only what you could observe.

## Key takeaways

- A session identifier or token is a bearer credential: while valid, it is as good as the password and second factor that created it.
- Server-side sessions are easy to revoke; self-contained tokens are easy to check but hard to revoke, so keep them short-lived.
- Protect session cookies with `Secure`, `HttpOnly`, `SameSite`, and the `__Host-` prefix, and enforce idle and absolute timeouts on the server.
- Regenerate the identifier at sign-in and privilege changes, and destroy sessions on the server at logout, password change, and account disablement.
- Verify JWTs strictly, as RFC 8725 describes: pinned algorithms, strong keys, and checks on issuer, audience, expiry, and type.

## Go deeper

- RFC 8725 describes cross-JWT confusion, where a token issued for one purpose is accepted for another. Design mutually exclusive validation rules for an authorization server that issues both ID tokens and access tokens with the same key infrastructure.
- OWASP describes a renewal timeout that periodically replaces the session identifier during use and notes a race in which the old identifier is used first. Model that race and decide how long the overlap window should be.
- Open question: OWASP observes that binding a session to an IP address or User-Agent is easy to bypass and can break for legitimate users. What signal could tie a session to a device without harming privacy or mobility, and how would you evaluate it?
