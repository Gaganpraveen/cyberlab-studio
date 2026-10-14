---
topicId: WEB-06
title: Cross-site request forgery
summary: Why a page on one site can make your browser send a state-changing request to another site where you are signed in, and how tokens, safe methods, SameSite cookies, Origin and Fetch Metadata checks, and re-authentication let a server refuse requests the user never intended.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why a browser attaches cookies to a forged cross-site request and why the same-origin policy does not stop the request from being sent.
  - Analyze a state-changing request and decide whether another site can forge it, given its method, content type, cookie attributes and the checks the server performs.
  - Implement a synchronizer token check and compare it with the signed double-submit cookie pattern.
  - Design layered defenses with SameSite cookies, Origin and Fetch Metadata checks, and re-authentication, stating the limits of each.
prerequisites: [WEB-04, IAM-04]
concepts:
  - csrf
  - csrf-token
  - double-submit-cookie
  - safe-method
  - origin-header
  - fetch-metadata
  - samesite-cookie
  - confused-deputy
labs: []
keywords:
  - CSRF
  - XSRF
  - cross-site request forgery
  - session riding
  - CWE-352
  - CAPEC-62
  - anti-CSRF token
  - synchronizer token pattern
  - double submit cookie
  - signed double-submit cookie
  - login CSRF
  - Origin header
  - Referer header
  - Sec-Fetch-Site
  - Sec-Fetch-Mode
  - Fetch Metadata
  - resource isolation policy
  - SameSite
  - safe methods
  - re-authentication
  - RFC 6265bis
sources:
  - title: OWASP Cross-Site Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Cross-site request forgery (CSRF)
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
  - title: 'CS 161 Textbook, Ch. 21: Cross-Site Request Forgery (CSRF)'
    url: https://textbook.cs161.org/web/csrf.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'CWE-352: Cross-Site Request Forgery (CSRF)'
    url: https://cwe.mitre.org/data/definitions/352.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: Fetch Metadata Request Headers (W3C Working Draft)
    url: https://www.w3.org/TR/fetch-metadata/
    publisher: W3C Web Application Security Working Group
    license: W3C Software and Document License
  - title: 'Cookies: HTTP State Management Mechanism (draft-ietf-httpbis-rfc6265bis)'
    url: https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis
    publisher: IETF HTTP Working Group (Internet-Draft)
    license: IETF Trust Legal Provisions (BCP 78)
quiz:
  - question: 'bank.example accepts `POST /transfer` with a form-encoded body and checks only the session cookie, which is set with `SameSite=None; Secure`. Why can a page on mallory.test make a transfer happen even though it cannot read any bank.example response?'
    choices:
      - Because the browser sends cross-origin form submissions without a preflight and attaches the bank's cookie, and the attack needs only the side effect, not the response.
      - Because SameSite=None tells the browser to share the bank's responses with every site.
      - Because the same-origin policy does not apply to POST requests.
      - Because HTTPS hides the request's origin from the bank.
    answer: 0
    explanation: A form submission is a cross-origin write, which the same-origin policy allows, and a form-encoded POST is a simple request, so no preflight asks the bank first. SameSite=None lets the cookie go along. The same-origin policy still blocks mallory.test from reading the reply, but a forged transfer succeeds through its side effect alone.
  - question: 'A team sets a random value in a cookie named `csrf` and accepts a POST only if that cookie is present and matches the value stored for the session. Why does this not stop CSRF?'
    choices:
      - Because random values cannot be compared securely.
      - Because the attacker can read the cookie through the same-origin policy.
      - Because the browser attaches cookies automatically, so a forged request carries the value without the attacker ever knowing it.
      - Because cookies are not sent with POST requests.
    answer: 2
    explanation: The flaw in CSRF is that cookies travel on their own. A check that reads only cookies is satisfied by every forged request. The token must arrive in something the attacker's page cannot make the browser fill in, such as a form field or request header, and in the double-submit pattern the server compares that copy with the cookie, preferably as an HMAC bound to the session.
  - question: "bank.example's session cookie is `SameSite=Strict`. An attacker takes over the marketing blog at blog.bank.example and serves a page that submits a form to `https://bank.example/settings/email`, which requires no token. What happens?"
    choices:
      - The browser withholds the cookie, because Strict blocks every request from another origin.
      - The browser sends the cookie, because the request is same-site, so only a token, an Origin check or a Fetch Metadata check could stop it.
      - The browser blocks the request, because the same-origin policy forbids cross-origin forms.
      - The request succeeds only if the user clicks a link first.
    answer: 1
    explanation: SameSite compares sites, and blog.bank.example and bank.example share a registrable domain and scheme, so even Strict cookies are sent. The request is cross-origin, so its Origin header names the blog, and Sec-Fetch-Site reports same-site; a server that accepts only same-origin state changes would refuse it, and a required token would also stop it.
  - question: 'Which response reflects OWASP guidance for a server that checks Fetch Metadata on state-changing requests?'
    choices:
      - Rely on Sec-Fetch-Site alone, because page scripts cannot forge it.
      - Treat any request without the header as malicious and block all older browsers.
      - Allow same-site requests, because SameSite cookies already trust them.
      - Refuse cross-site requests and fall back to checking the Origin header when Sec-Fetch-Site is missing.
    answer: 3
    explanation: Page scripts cannot set Sec- headers, but older browsers and non-browser clients do not send them, so OWASP calls a fallback to standard origin verification a mandatory requirement. OWASP also advises treating same-site requests conservatively, because a compromised subdomain is same-site.
  - question: Why does OWASP recommend re-authentication, rather than a CAPTCHA, before a user changes the email address on an account?
    choices:
      - A CAPTCHA is too hard for users to solve.
      - A forged request cannot supply the user's password or a fresh passkey assertion, while a CAPTCHA only distinguishes humans from bots and can be solved in a different session.
      - Re-authentication encrypts the request, and a CAPTCHA does not.
      - CAPTCHAs are blocked by SameSite cookies.
    answer: 1
    explanation: Re-authentication asks for proof that only the real user has at that moment, which a page on another site cannot provide. A CAPTCHA proves only that some human solved it, possibly the attacker in their own session. Because re-authentication adds friction, it is reserved for critical actions such as changing credentials or the email address used for recovery.
---

## Why it matters

MITRE's 2025 CWE Top 25 ranks [[csrf|cross-site request forgery (CSRF)]], CWE-352, third, behind only cross-site scripting and SQL injection ([CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html)). CWE's entry describes the weakness as an application that cannot reliably tell whether a request carrying a user's credentials was one the user meant to send.

[WEB-04](lesson:WEB-04) showed the gap. The [[same-origin-policy]] stops a page from reading another site's responses, but links, redirects and form submissions cross origins freely, and the browser attaches the destination's [[cookie|cookies]] on its own. A page on `mallory.test` cannot read Alice's bank balance, but it may be able to make her browser ask the bank to move money, log her out, or change her email address. The last is especially damaging, because the account's password-reset messages then go to the attacker.

Browsers have narrowed the gap with SameSite defaults and new request headers. The server, however, still decides which requests to honor, and this lesson is about making that decision correctly.

## The core idea

Picture a receptionist who carries out any memo handed over by someone wearing a staff badge, without asking who wrote it. mallory cannot get a badge, but she can slip a memo into Alice's bag. When Alice walks in, the receptionist sees Alice's badge and obeys mallory's memo. The badge is the cookie, which the browser presents automatically; the memo is the request, which any page can compose.

This is a [[confused-deputy]] problem: the browser holds Alice's authority and is tricked into spending it on a request someone else wrote. MDN lists the conditions that make CSRF possible: the site uses HTTP requests to change state, uses only cookies to identify who sent them, and uses only parameters an attacker can predict. Every defense removes one of those conditions or adds a check the attacker cannot pass.

The model assumes:

- Alice is signed in to `bank.example`, which authenticates requests with a session cookie.
- Alice visits `mallory.test`, whose JavaScript mallory controls.
- mallory cannot read bank.example's responses, because the same-origin policy holds, and cannot run script on bank.example. OWASP warns that cross-site scripting "can defeat all CSRF mitigation techniques," because injected script runs as the site itself ([WEB-05](lesson:WEB-05)).

## How it works

### A forged request

The bank's transfer form sends this request:

```http
POST /transfer HTTP/1.1
Host: bank.example
Cookie: session=7f3c9a
Content-Type: application/x-www-form-urlencoded

to=bob&amount=50
```

Its handler checks only the session:

```javascript
// Vulnerable: a valid session cookie is the only check.
app.post('/transfer', requireSession, (req, res) => {
  transfer(req.session.user, req.body.to, Number(req.body.amount));
  res.redirect('/done');
});
```

Every parameter is predictable, so mallory can reproduce the request with a toy form on her own page; one line of script submits it as soon as the page loads.

```html
<!-- On mallory.test: a hidden form aimed at the bank -->
<form action="https://bank.example/transfer" method="POST">
  <input type="hidden" name="to" value="mallory" />
  <input type="hidden" name="amount" value="500" />
</form>
```

Suppose the bank sets its session cookie with `SameSite=None`, as some sites do so that their pages work inside other sites' frames. The diagram shows what follows.

```sequence
title: A forged transfer from a page on mallory.test
participant A as Alice's browser
participant M as mallory.test
participant B as bank.example
A -> M: GET / (Alice opens mallory's page)
M --> A: Page with a hidden, auto-submitting form
A -> B: POST /transfer, to=mallory, amount=500
note B: Cookie attached, so the session is valid
B --> A: 302 Found, transfer done
note A: mallory.test never sees the reply, nor needs it
```

The browser did nothing wrong. A form submission is a cross-origin write, which the same-origin policy allows, and it is a simple request, so no CORS preflight asks the bank's permission first. The attack needs no response: the damage is the side effect.

### What makes a request forgeable

| Request to bank.example                                        | Can an attacker's page send it with Alice's cookie?                        | Why                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| A GET that changes state, such as `GET /logout`                | Yes, from mallory.test as a link or other top-level navigation, even with `SameSite=Lax` | Lax still attaches cookies to top-level navigations that use GET      |
| A POST from an HTML form                                       | Only if the cookie is `SameSite=None`, or the browser applies no default   | Forms send simple requests without a preflight                        |
| A `fetch()` with a JSON content type or a custom header        | No, unless the bank's CORS policy allows mallory's origin with credentials | Such requests need a preflight that the bank must approve             |
| A form or link on a compromised `blog.bank.example`            | Yes, whatever the SameSite value                                           | The request is same-site, so SameSite does not apply                  |

Two rules follow. First, [[safe-method|safe methods]] such as GET, HEAD and OPTIONS must not change state; [MDN's glossary](https://developer.mozilla.org/en-US/docs/Glossary/Safe/HTTP) says plainly that "an application should not allow GET requests to alter its state." Second, browser defaults reduce exposure but decide nothing: some browsers treat a cookie without a SameSite attribute as Lax, and MDN notes that this default is looser, still sending the cookie on a POST made within two minutes of the cookie being set. The server must recognize forged requests itself.

### Tokens: a value only the real page has

The core defense adds a parameter mallory cannot predict. In the synchronizer token pattern, the server creates a random [[csrf-token]] for each session, stores it in the session, and embeds it in every form it renders or hands it to the page's own script for a request header. On every state-changing request, the server compares the submitted token with the stored one.

```javascript
import { randomBytes } from 'node:crypto';

// One unpredictable token per session, embedded in every form the server renders:
//   <input type="hidden" name="csrf" value="{{ csrfToken(req.session) }}">
function csrfToken(session) {
  session.csrf ??= randomBytes(32).toString('base64url');
  return session.csrf;
}

// Required on every state-changing request.
function requireCsrf(req, res, next) {
  const sent = req.get('X-CSRF-Token') ?? req.body.csrf;
  if (!sent || sent !== req.session.csrf) return res.status(403).send('Missing or invalid token');
  next();
}

app.post('/transfer', requireSession, requireCsrf, handleTransfer);
```

mallory's page can make the browser send a request, but it cannot read the bank's pages, so it never learns the token. OWASP adds three rules: generate tokens with a secure random source, never put them in URLs or logs, and do not send them in a cookie in this pattern, since cookies are exactly what the browser adds on its own.

Stateless servers, which keep no session store, use the [[double-submit-cookie]] pattern instead:

|                        | Synchronizer token                         | Signed double-submit cookie                                                              |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| State on the server    | The token, stored in the session           | Only a secret key                                                                        |
| Where the token travels | A hidden form field or a request header   | A cookie, plus a copy in a field or header                                               |
| What the server checks | The submitted token equals the stored one  | The two copies match, and an HMAC binding the token to the session verifies              |
| Main pitfall           | Leaking the token through URLs or logs     | The unsigned variant: anyone who can write cookies for the domain can plant a matching pair |

OWASP calls the signed variant, an [[hmac]] computed with a server-side secret over the session ID and a random value, the most secure form of the pattern, and marks the unsigned one as discouraged because an attacker who controls a [[subdomain]] may be able to write cookies for the whole domain.

### Signals the browser adds

Browsers also tell the server where a request came from:

- The [[origin-header|Origin header]] names the origin that started the request. OWASP says to verify that a present Origin matches the target origin, to fall back to the Referer header's host when it is absent, and never to treat a missing header or `Origin: null` as evidence of a same-origin request.
- [[fetch-metadata|Fetch Metadata]] headers describe the request's context. `Sec-Fetch-Site` is `same-origin`, `same-site`, `cross-site`, or `none` for a navigation the user started by typing an address or choosing a bookmark. The W3C draft reports a request as cross-site if any URL in its redirect chain was cross-site. Page scripts cannot set `Sec-` headers, and MDN notes that browsers send them only to potentially trustworthy URLs, such as HTTPS ones.
- [[samesite-cookie|SameSite]] makes the browser withhold the cookie itself, as WEB-04 described. It is defined in the cookie standard's revision, draft-ietf-httpbis-rfc6265bis, which in October 2026 had been approved and was waiting in the RFC Editor's queue to replace RFC 6265. OWASP calls SameSite "useful as a defense-in-depth control" that "does not replace a proper CSRF defense in most deployments."

A check that combines the first two signals:

```javascript
// Refuse state-changing requests that the browser reports as not same-origin.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function rejectCrossSite(req, res, next) {
  if (SAFE.has(req.method)) return next(); // safe methods change nothing
  const site = req.get('Sec-Fetch-Site');
  if (site) return site === 'same-origin' ? next() : res.status(403).send('Cross-site request');
  // Fallback for clients that send no Fetch Metadata: require a matching Origin.
  return req.get('Origin') === 'https://bank.example' ? next() : res.status(403).send('Bad origin');
}
```

Published policies differ on that fallback. [MDN's example](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Fetch_metadata) rejects requests without Fetch Metadata, web.dev's resource isolation policy lets them through so older browsers keep working ([web.dev](https://web.dev/articles/fetch-metadata)), and OWASP calls a fallback to standard origin checks "a mandatory requirement." This version follows OWASP and treats `same-site` as untrusted, so a compromised subdomain cannot pass.

### Confirming intent

For critical actions, such as changing a password or email address, adding a payee or making a large transfer, OWASP recommends user-interaction defenses: re-authentication or a one-time token. A forged request cannot supply Alice's password or a fresh [[passkey]] assertion ([IAM-03](lesson:IAM-03)). OWASP also says not to use a CAPTCHA for this, because it distinguishes humans from bots, and an attacker can solve one in a different session.

Sign-in forms need protection too. OWASP notes that CSRF can occur on login forms, where the user is not yet authenticated: a forged sign-in logs Alice in to mallory's account, so anything she enters afterward is saved where mallory can see it. The fix is a pre-session with its own token, replaced by a fresh session after sign-in.

## Worked example

The activity is to analyze a fictional request and authorization scenario. Bob reviews bank.example before a release. Its session cookie is set with:

```http
Set-Cookie: __Host-session=Jq3vR9; Path=/; Secure; HttpOnly; SameSite=Lax
```

The framework's synchronizer tokens protect most forms, and the marketing team runs a blog at `blog.bank.example` on a third-party platform. Bob lists every state-changing endpoint and asks three questions of each: would a request from mallory.test carry the cookie, would a request from a compromised blog carry it, and what stops a forgery?

| Endpoint              | Request                                  | From mallory.test                   | From blog.bank.example (same-site)                    | Finding                                                   |
| --------------------- | ---------------------------------------- | ----------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `GET /logout`         | A link                                   | Cookie sent: a top-level GET        | Cookie sent                                           | Forgeable. Make logout a POST with a token                |
| `POST /transfer`      | Form with a token                        | Cookie withheld                     | Cookie sent, but the token is missing                 | Protected by the token, and cross-site also by SameSite   |
| `POST /settings/email` | Form; the token check was disabled here | Cookie withheld                     | Cookie sent                                           | Forgeable from the blog. Restore the token; re-authenticate |
| `PUT /api/payees`     | `fetch()` with JSON and a token header   | Cookie withheld; preflight required | Preflight fails unless CORS allows the blog's origin  | Protected while CORS stays strict                         |

1. **Apply MDN's three conditions.** All four endpoints change state, and all four rely on the cookie to identify Alice. They differ in predictability: where a token is required, mallory cannot construct a valid request.
2. **Read the cookie columns.** `SameSite=Lax` withholds the cookie from every cross-site request except the top-level GET to `/logout`. A forced logout is a nuisance, but the same pattern on a GET that moved money would be critical.
3. **Move the attacker.** If the blog's platform is compromised, every request is same-site and SameSite does nothing. The email endpoint is then forgeable, and changing the email address hands over the account through password reset. This row blocks the release.
4. **Check the browser's signals.** A forged request from the blog arrives with `Sec-Fetch-Site: same-site` and `Origin: https://blog.bank.example`, so `rejectCrossSite` refuses it even without a token.
5. **Write the findings.** Restore the token on `/settings/email` and require the password or a passkey to change the email address; move logout to POST; add `rejectCrossSite` to every state-changing route; and keep the CORS policy limited to the bank's own origins.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **The framework's CSRF protection on every state-changing route.** OWASP's first recommendation is to use built-in protection: synchronizer tokens for stateful applications, signed double-submit cookies for stateless ones. _Limit:_ one route with the check disabled is enough, as the worked example shows, and any XSS defeats tokens.
- **Safe methods.** Keep GET, HEAD and OPTIONS free of side effects. _Limit:_ MDN warns that a method-override feature, which lets a request claim a different method, can get around a POST-only rule.
- **SameSite=Strict or Lax on session cookies.** _Limit:_ it trusts every subdomain, Lax allows top-level GET navigations, and browser defaults vary.
- **Origin and Fetch Metadata checks.** _Limit:_ older browsers and non-browser clients omit the headers, so a fallback is required, and Fetch Metadata is sent only to potentially trustworthy URLs.
- **Non-simple requests for APIs.** Require a JSON content type or a custom header so that cross-origin calls need a preflight. _Limit:_ MDN notes that a CORS policy allowing the attacker's origin with credentials removes this protection.
- **Re-authentication for critical actions.** _Limit:_ it adds friction, so reserve it for actions that change credentials, recovery settings or money movement.

## Common misconceptions

- **"Using POST prevents CSRF."** HTML forms send cross-site POST requests.
- **"CORS stops CSRF."** CORS governs reading responses; simple requests are sent without asking.
- **"SameSite makes tokens unnecessary."** It trusts every subdomain, allows top-level GET navigations, and OWASP keeps it as defense in depth.
- **"A secret in a cookie proves the request is genuine."** The browser attaches cookies automatically, which is the whole problem. The proof must travel in a field or header that the attacker's page cannot fill in.
- **"HTTPS prevents CSRF."** The forged request travels over HTTPS too.

## Try it yourself

Watch your own browser send a cross-origin write, using two local servers that listen only on 127.0.0.1, as in [WEB-04](lesson:WEB-04).

1. In a folder `a`, create `form.html` containing `<form action="http://127.0.0.1:8001/save" method="POST"><input name="note" value="hello"><button>Send</button></form>`. Start `python3 -m http.server 8000 --bind 127.0.0.1` in `a`, and the same command with port `8001` in an empty folder `b`.
2. Open `http://127.0.0.1:8000/form.html` and the developer tools' Network panel, then click Send. Python's simple server does not accept POST and answers with an error, but its terminal log shows that the request arrived.
3. Select the request and record its Origin header and any `Sec-Fetch-Site` and `Sec-Fetch-Mode` headers. The pages differ only by port, so they are cross-origin but same-site; check whether the headers agree. Then type `http://127.0.0.1:8001/` into the address bar and record that request's headers.
4. On paper, apply the `rejectCrossSite` decision to each request you recorded, and explain why the form's POST reached the server even though the page on port 8000 could never read the reply.
5. On a site where you have your own account, change a harmless setting with the Network panel open, and note whether the request carries a token field or header and which `SameSite` value the cookies use. Only observe: do not resend or alter requests. Stop both servers with Ctrl+C.

## Key takeaways

- CSRF works because the browser attaches cookies to requests that any page can compose, and the same-origin policy limits reading, not sending.
- A request is forgeable when it changes state, is authenticated only by cookies, and has predictable parameters; each defense removes one of these conditions.
- Tokens the attacker cannot read, synchronizer or signed double-submit, are the primary defense. SameSite, Origin and Fetch Metadata checks add layers with known gaps.
- Keep safe methods free of side effects, and require re-authentication for actions that could hand over an account.
- Cross-site scripting defeats every CSRF defense, so the two must be fixed together.

## Go deeper

- **Redirect chains.** The W3C Fetch Metadata draft reports a request as cross-site if any URL in its redirect chain was cross-site ([Fetch Metadata](https://www.w3.org/TR/fetch-metadata/)). Construct a fictional chain showing why reporting only the last hop would let a forged request look same-origin.
- **Deploying without breaking things.** web.dev's resource isolation policy is rolled out in a reporting mode first and then enforced ([web.dev](https://web.dev/articles/fetch-metadata)). Design the log query you would run on bank.example before enforcing it, and decide how long the fallback for clients without the headers should last.
- **Standardizing cookies.** The 6265bis draft, in the RFC Editor's queue in October 2026, will obsolete RFC 6265 ([datatracker](https://datatracker.ietf.org/doc/draft-ietf-httpbis-rfc6265bis)). Compare what it requires of SameSite with what MDN reports about browser defaults, and list what a site can safely assume.
