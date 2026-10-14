---
topicId: WEB-07
title: Content Security Policy and browser defenses
summary: How a Content Security Policy lets a site tell the browser which scripts it actually wrote, why nonce- and hash-based strict policies succeed where host allowlists failed, how to roll a policy out without breaking the site, and which neighboring headers close the gaps that CSP leaves.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how a strict, nonce- or hash-based Content Security Policy stops injected scripts, and why host allowlists usually fail to.
  - Predict, for a given policy and page fixture, whether the browser runs a script, blocks it or only reports it.
  - Plan a rollout that refactors inline code, measures a candidate policy in report-only mode, and then enforces it.
  - Configure Trusted Types and choose neighboring defenses (HSTS, nosniff, Referrer-Policy, Subresource Integrity), stating what each one stops and what it does not.
prerequisites: [WEB-05, NET-05]
concepts:
  - content-security-policy
  - csp-nonce
  - strict-dynamic
  - csp-report-only
  - trusted-types
  - hsts
  - mime-sniffing
  - subresource-integrity
labs: [xss]
keywords:
  - CSP
  - Content-Security-Policy
  - Content-Security-Policy-Report-Only
  - CSP Level 3
  - CSP3
  - strict CSP
  - nonce-based CSP
  - hash-based CSP
  - strict-dynamic
  - unsafe-inline
  - unsafe-eval
  - script-src
  - object-src
  - base-uri
  - form-action
  - default-src
  - report-to
  - Reporting-Endpoints
  - report-uri
  - CSP violation report
  - require-trusted-types-for
  - Trusted Types
  - HSTS
  - Strict-Transport-Security
  - RFC 6797
  - HSTS preload
  - X-Content-Type-Options
  - nosniff
  - MIME sniffing
  - Referrer-Policy
  - SRI
  - Subresource Integrity
  - security headers
  - CWE-79
sources:
  - title: Content Security Policy Level 3 (W3C Working Draft, 16 September 2026)
    url: https://www.w3.org/TR/CSP3/
    publisher: W3C Web Application Security Working Group
    license: W3C Software and Document License
  - title: Content Security Policy (CSP)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
  - title: OWASP Content Security Policy Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Mitigate cross-site scripting (XSS) with a strict Content Security Policy (CSP)
    url: https://web.dev/articles/strict-csp
    publisher: Google (web.dev), by Lukas Weichselbaum
    license: CC BY 4.0 (code samples Apache 2.0)
  - title: 'CSP Is Dead, Long Live CSP! On the Insecurity of Whitelists and the Future of Content Security Policy (ACM CCS 2016)'
    url: https://research.google/pubs/pub45542/
    publisher: Google Research (Weichselbaum, Spagnuolo, Lekies and Janc)
  - title: Trusted Types API
    url: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
quiz:
  - question: "shop.example sends `Content-Security-Policy: script-src 'self' https://cdn.shop.example; object-src 'none'`. A stored XSS flaw lets mallory add markup to a product page. Which injected item can still run?"
    choices:
      - An inline script element.
      - An image whose error-handler attribute contains code.
      - A script element whose src points to a file on cdn.shop.example.
      - A link that uses the javascript scheme.
    answer: 2
    explanation: Without 'unsafe-inline', the policy blocks inline scripts, event-handler attributes and javascript URLs. But it trusts every file on the listed hosts, whoever wrote the tag that loads it. The 2016 study found unsafe endpoints on 14 of the 15 domains most commonly allowlisted for scripts. A nonce asks a better question, namely whether the server itself marked this tag.
  - question: "A developer puts `script-src 'nonce-c2hvcC1ub25jZQ=='` in the site's configuration file, and the template writes the same value into every script tag. What is wrong?"
    choices:
      - Nothing, because the value is long and random-looking.
      - The nonce must be hashed with SHA-256 before it goes in the header.
      - The policy also needs 'unsafe-inline', or the site's own scripts will break.
      - The value never changes, so anyone who loads a page learns it and can copy it into injected markup.
    answer: 3
    explanation: MDN requires a nonce that is different for every HTTP response and unpredictable. A fixed value is a password printed on every page. Hashing it changes nothing, since a hash source is a different mechanism that fingerprints script content, and 'unsafe-inline' is ignored by current browsers whenever a nonce is present.
  - question: "During a rollout, each response carries an enforced `Content-Security-Policy` and a stricter `Content-Security-Policy-Report-Only` candidate. A script violates only the candidate. What happens?"
    choices:
      - The script runs, and the browser sends a violation report for the candidate.
      - The script is blocked, because the stricter policy always wins.
      - The browser ignores the report-only header whenever an enforced policy is present.
      - The script is blocked, but no report is sent.
    answer: 0
    explanation: MDN says that when both headers are present, both policies are honored. The enforced policy allows the script, and the report-only policy never blocks anything; it only reports. That lets a team keep enforcing what already works while measuring what the stricter candidate would break.
  - question: "shop.example enforces `script-src 'nonce-R' 'strict-dynamic'; object-src 'none'; base-uri 'none'`. Its trusted app.js creates a script element and copies a URL parameter into its src. What stops a crafted link whose parameter names a script on mallory.test?"
    choices:
      - The nonce, because the new script element does not carry one.
      - The base-uri directive, because it restricts where scripts may load from.
      - Adding https to script-src, so that only HTTPS scripts can load.
      - Nothing in this policy; Trusted Types can make the src assignment reject a plain string, and app.js itself must be fixed.
    answer: 3
    explanation: "'strict-dynamic' passes the trust given to a nonced script on to the scripts it loads, and MDN warns that the policy cannot protect a trusted script that builds script elements from attacker-influenced data. base-uri governs only the base element, and browsers that support 'strict-dynamic' ignore https in the same directive. Enforcing require-trusted-types-for 'script' turns the src assignment into a TypeError, but the real repair is removing the bug."
  - question: shop.example sends `Strict-Transport-Security` with `max-age=63072000; includeSubDomains` on its HTTPS responses, and alice has visited before. On a hostile café network she types shop.example without https. What happens?
    choices:
      - The browser connects over HTTP first and then follows the server's redirect to HTTPS.
      - The browser upgrades the request to HTTPS before sending anything, and it will not let her click through a certificate error.
      - Nothing changes, because HSTS applies only to subdomains.
      - The browser sends the request over HTTP but encrypts the cookies.
    answer: 1
    explanation: MDN says a browser that has seen HSTS for a site upgrades every request to HTTPS and disables the option to bypass certificate errors, so an attacker on the network sees no plain HTTP request to intercept. The protection depends on that earlier secure visit; a first-time visitor is exposed unless the site is on the browsers' preload list.
---

## Why it matters

[The previous lesson](lesson:WEB-05) ended with a demanding rule: every value, in every [[output-context]], on every page, must be encoded or sanitized correctly. A large application has thousands of places where data meets markup, and an attacker needs only one that was missed. [[content-security-policy|Content Security Policy (CSP)]] answers that arithmetic: the site declares in a response header which scripts it meant to run, and the browser refuses the rest.

The first generation of policies mostly failed at that job. Analyzing about 100 billion pages, Google researchers found 26,011 distinct policies on 1,680,867 hosts. They judged 94.72 percent of those policies bypassable, and 75.81 percent relied on script allowlists an attacker could get around, because 14 of the 15 domains most commonly allowlisted contained unsafe endpoints. Overall, 99.34 percent of hosts with CSP gained no protection against [[xss|cross-site scripting (XSS)]] from it ([Weichselbaum et al., ACM CCS 2016](https://research.google/pubs/pub45542/)). The same paper proposed [[strict-dynamic|'strict-dynamic']], the keyword that makes nonce-based policies practical, and MDN, OWASP and web.dev now recommend such policies as strict CSP.

## The core idea

Once a script has been injected, the browser cannot tell it from the site's own code: both arrive in the same document from the same origin. CSP supplies the missing information. Alongside the page, the server states which scripts it wrote, and the browser enforces that statement.

The statement can take two forms. An allowlist names hosts ("any script from `cdn.shop.example`"). It acts like a doorman who admits anyone wearing an approved company's badge: every file on a listed host can run, whoever wrote the tag that loads it. A [[csp-nonce|nonce]] is a wristband printed fresh each night. The server picks a random value for each response, puts it in the policy and stamps it on each script tag it wrote. Injected markup cannot carry the value, because the attacker wrote that markup before the server chose it. A hash works similarly, as a fingerprint of each inline script the site wrote.

The model assumes:

- An injection flaw exists. CSP limits what it can do but does not remove it.
- The attacker can add markup to a page but cannot read or change response headers or predict a nonce.
- The site's own scripts are trustworthy. A policy decides which scripts run, not what they do; a trusted script that passes attacker data to a dangerous sink is a job for [[trusted-types]].
- The browser supports CSP Level 3; older browsers enforce less.

OWASP sets the expectation: CSP "should not be relied upon as the only defensive mechanism against XSS." It is [[defense-in-depth]], a second wall behind correct output handling.

## How it works

### Delivering a policy

A policy is a list of directives separated by semicolons, each a name followed by the sources it allows. The server sends it in the `Content-Security-Policy` response header, and MDN advises setting it "on all responses to all requests, not just the main document." A `<meta http-equiv>` element also works but does less: CSP Level 3 excludes `report-uri`, `frame-ancestors` and `sandbox` from it, and report-only mode cannot be delivered that way.

| Directive                   | What it governs                                                       | Strict value                                           | Defends against                                  |
| --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------ |
| `script-src`                | Scripts, including inline code, event handlers and `javascript:` URLs | `'nonce-…'` or `'sha256-…'`, with `'strict-dynamic'` | Injected script                                  |
| `object-src`                | Plugin content such as `<object>` and `<embed>`                       | `'none'`                                               | Script run through plugins                       |
| `base-uri`                  | URLs that a `<base>` element may set                                  | `'none'`                                               | A `<base>` that redirects relative script URLs   |
| `form-action`               | Where forms may submit                                                | `'self'`                                               | Injected forms that send data elsewhere          |
| `frame-ancestors`           | Which pages may frame this one                                        | `'none'` or `'self'`                                   | [[clickjacking\|Clickjacking]] (WEB-08)           |
| `require-trusted-types-for` | Whether DOM sinks accept plain strings                                | `'script'`                                             | [[dom-based-xss\|DOM-based XSS]]                  |

`default-src` covers any resource type whose own directive is missing.

### What a script policy blocks

MDN explains that once a policy contains `script-src` or `default-src`, inline JavaScript stops running unless explicitly allowed: code inside `<script>` elements, event-handler attributes and `javascript:` URLs. So do `eval()` and similar APIs. These defaults are the point: the classic payloads from WEB-05, inline scripts and event handlers, stop running. The keyword `'unsafe-inline'` lifts the inline restriction, and MDN warns that it "defeats much of the purpose of having a CSP"; `'unsafe-eval'` does the same for `eval()`.

So the site's own code must leave inline attributes too; web.dev's rollout replaces handlers such as `onclick`, and `javascript:` links, with listeners registered from script:

```html
<!-- Before: an inline handler, which a strict policy blocks -->
<button onclick="saveCart()">Save</button>

<!-- After: plain markup, with the behavior in a script the server marked -->
<button id="save">Save</button>
<script nonce="{{ nonce }}">
  document.getElementById('save').addEventListener('click', saveCart);
</script>
```

### Nonces, hashes and 'strict-dynamic'

MDN states the two requirements for a nonce: it "must be different for every HTTP response, and must not be predictable." The server puts it in the header as `'nonce-…'` and in the `nonce` attribute of each script element the template author wrote:

```javascript
import { randomBytes } from 'node:crypto';

// Weak: one nonce for every response, so anyone who views a page learns it.
const STATIC_NONCE = 'c2hvcC1ub25jZQ==';

// Fixed: a fresh, unpredictable nonce for each response.
app.use((req, res, next) => {
  const nonce = randomBytes(16).toString('base64');
  res.locals.nonce = nonce; // the template writes it into its own script tags only
  res.setHeader('Reporting-Endpoints', 'csp="https://reports.shop.example/csp"');
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'; ` +
      `object-src 'none'; base-uri 'none'; report-to csp`,
  );
  next();
});
```

```html
<script nonce="{{ nonce }}" src="/static/app.js"></script>
```

Two mistakes undo the scheme: a nonce that repeats, whether hard-coded or frozen into a cached page, is public; and OWASP warns against middleware that stamps the nonce on every script tag in the finished HTML, since injected scripts would receive it too.

A hash-based policy lists a base64-encoded SHA-256, SHA-384 or SHA-512 [[hash-function|hash]] of each inline script, such as `'sha256-…'`, and the browser runs a script only if its content matches (MDN). Hashes suit static and cached pages, but OWASP cautions that even a whitespace change breaks the match.

Pages also load scripts that load other scripts, such as a widget loader, and [[strict-dynamic|'strict-dynamic']] handles them. In MDN's words, the trust given to a script with a nonce or hash "shall be propagated to all the scripts loaded by that root script," while allowlists, `'self'` and `'unsafe-inline'` are ignored. Script elements in parsed markup still need their own nonce or hash. MDN names the cost: if a trusted script creates script elements from attacker-influenced data, the policy cannot help.

The `https:` and `'unsafe-inline'` entries in the code are fallbacks for old browsers. Browsers that understand nonces ignore `'unsafe-inline'`, and those that support `'strict-dynamic'` ignore `https:` (MDN, web.dev).

### Measuring before enforcing

A [[csp-report-only|report-only policy]], sent in the `Content-Security-Policy-Report-Only` header, is evaluated but not enforced: the browser blocks nothing and reports each violation (MDN). Reports go to an endpoint declared in the `Reporting-Endpoints` header and named by the `report-to` directive; MDN advises also declaring the deprecated `report-uri` until every browser supports `report-to`. Each report is JSON naming the page, the violated directive, what was blocked and whether the policy was enforced.

A response may carry both headers, and both are honored, so a team can keep enforcing a working policy while measuring a stricter candidate:

```http
Reporting-Endpoints: csp="https://reports.shop.example/csp"
Content-Security-Policy: script-src 'nonce-4Fq1…' 'strict-dynamic'; object-src 'none'; base-uri 'none'; report-to csp
Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types loader; report-to csp
```

```sequence
title: Measuring a candidate policy before enforcing it
participant B as Alice's browser
participant S as shop.example
participant R as reports.shop.example
B -> S: GET /account
S --> B: 200 OK, enforced policy + report-only candidate
note B: The widget loader breaks a candidate rule
note B: Report-only, so the loader still runs
B -> R: POST violation report (page, directive, sample)
note R: The team fixes the loader, then enforces
```

A report-only header protects no one; it is a measuring instrument. Once the reports stop showing legitimate code that would break, the candidate moves into the enforcing header, the order web.dev's rollout also follows: refactor, test in report-only mode, enforce.

### Trusted Types

A script policy controls which scripts run; Trusted Types control what running scripts may hand to dangerous sinks. With `require-trusted-types-for 'script'` enforced, assigning a plain string to an injection sink such as `innerHTML` or a script element's `src` throws a `TypeError`. Sinks accept only typed values from named policy objects, and the `trusted-types` directive lists the allowed policy names (MDN). Each policy is a small function, such as a sanitizer or a URL check, so reviewers audit a few policies instead of every sink. MDN recommends a `default` policy only as a migration bridge, and lists Trusted Types as Baseline 2026.

### Neighboring defenses

MDN's practical security guides recommend four more defenses, each closing one neighboring gap:

| Mechanism                                              | Value                                                       | What it stops                                                                         | Limit                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` ([[hsts\|HSTS]])           | `max-age=63072000; includeSubDomains`                       | Plain HTTP: requests are upgraded to HTTPS, and certificate errors cannot be clicked through | The first visit is exposed unless the site is preloaded; subdomains without HTTPS break |
| `X-Content-Type-Options`                               | `nosniff`                                                   | [[mime-sniffing\|MIME sniffing]] that runs a mislabeled file as a script or stylesheet | Needs correct `Content-Type` headers                                                   |
| `Referrer-Policy`                                      | `strict-origin-when-cross-origin` (the default) or stricter | Paths and query strings leaking to other sites in the `Referer` header                | Other sites still see the origin unless a stricter value withholds it                   |
| `integrity` attribute ([[subresource-integrity\|SRI]]) | `sha384-…` on a `<script>` or `<link>` element              | A third-party file altered after the site pinned it                                   | Pins one version, and the host must allow CORS                                          |

See MDN's guides on [HSTS](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/TLS#http_strict_transport_security_implementation), [MIME types](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/MIME_types), [Referrer policy](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Referrer_policy) and [SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/SRI). HSTS builds on the certificate checks in [NET-05](lesson:NET-05).

## Worked example

The activity is to compare approved policies against toy fixtures. shop.example's security team has three approved candidate policies and wants to know what each would run and block before any user sees it. They reuse the isolated harness from WEB-05, `https://render-test.example`, which holds no cookies or user data. Each fixture is a small page whose script, if it runs, only writes the fixture's name into the harness log.

**Step 1: State the policies.** The harness replaces `R` with a fresh nonce on every response.

```text
P1  script-src 'self' https://cdn.shop.example; object-src 'none'
P2  script-src 'nonce-R' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none'; base-uri 'none'
P3  P2, plus: require-trusted-types-for 'script'; trusted-types loader
```

**Step 2: Predict.** F1 is the site's own nonced script. F2 to F4 are classic injections: an inline script element, an image error handler as in WEB-05, and a `javascript:` link the tester clicks. In F5, app.js loads `/static/widget.js`. F6 is an injected tag loading a file from `cdn.shop.example`. F7 is a bug in app.js that copies a URL parameter into a new script's `src`, tested with a file on `mallory.test`. The team predicts every cell first.

**Step 3: Measure.** Each policy is served first in report-only mode, so that every fixture runs and every violation produces a report, and then enforced. Enforced results in a current browser:

| Fixture                       | P1: allowlist | P2: strict | P3: strict + Trusted Types      |
| ----------------------------- | ------------- | ---------- | ------------------------------- |
| F1 site script with nonce     | Runs          | Runs       | Runs                            |
| F2 injected inline script     | Blocked       | Blocked    | Blocked                         |
| F3 injected event handler     | Blocked       | Blocked    | Blocked                         |
| F4 `javascript:` link         | Blocked       | Blocked    | Blocked                         |
| F5 loader adds widget.js      | Runs          | Runs       | Blocked: a string reached `src` |
| F6 injected tag, listed host  | **Runs**      | Blocked    | Blocked                         |
| F7 loader builds src from URL | Blocked       | **Runs**   | Blocked                         |

**Step 4: Read the matrix.** All three policies stop the classic injections, F2 to F4, which is most of CSP's value. P1 runs F6 because it trusts every file on the listed host, the weakness the 2016 study measured, and blocks F7 only because `mallory.test` is not listed. P2 runs F7, the `'strict-dynamic'` cost MDN warns about. P3 blocks F7 at the sink but breaks the legitimate loader, F5.

**Step 5: Refactor and decide.** The loader gets a named policy that admits only the site's own static scripts:

```javascript
const loaderPolicy = trustedTypes.createPolicy('loader', {
  createScriptURL(input) {
    const url = new URL(input, location.origin);
    if (url.origin === location.origin && url.pathname.startsWith('/static/')) return url.href;
    throw new TypeError(`Blocked script URL: ${input}`);
  },
});

const s = document.createElement('script');
s.src = loaderPolicy.createScriptURL('/static/widget.js'); // F5 runs again under P3
document.head.append(s);
```

The team enforces P2 at once, since it breaks nothing and stops F2, F3, F4 and F6, and runs P3 in report-only mode beside it until its reports are clean, before enforcing it. The F7 bug is fixed regardless, because a policy only limits damage.

> [!ETHICS] Only test systems you own or have written permission to test.

## In practice

- **Start from a published strict policy.** Adapt the examples from MDN, OWASP or web.dev rather than growing a host list, and check it with a tool such as Google's CSP Evaluator, which MDN links to.
- **Cover every response.** Send the header on all responses, and generate nonces in the rendering path, never in a cached layer; cached pages need hashes.
- **Keep `'unsafe-eval'` out.** web.dev suggests replacing `eval()` used to parse JSON with `JSON.parse()`; adding `'unsafe-eval'` instead "makes your policy slightly less secure."
- **Keep reading reports after enforcement.** A new violation can mean that a deploy broke a script or that unexpected markup appeared.
- **Know the limits.** Injected markup that is not script, such as a fake form, still renders; `form-action` limits only where forms submit. A policy does not check what trusted scripts do, and it protects only visitors whose browsers enforce it. Correct output handling stays the primary fix.

## Common misconceptions

- **"Any CSP header protects against XSS."** Only a policy without a working `'unsafe-inline'` and without broad host lists does, and in 2016 almost none qualified.
- **"CSP replaces output encoding."** It limits damage when encoding is missed. The flaw remains, and an old browser or a policy mistake exposes it.
- **"Report-only mode is a safe first deployment."** It is a safe test that blocks nothing; users stay unprotected until enforcement.
- **"`'strict-dynamic'` makes a policy stricter."** It extends trust to scripts that trusted code loads. That makes nonce policies deployable, at the cost shown by F7.
- **"HSTS protects the first visit."** Only for preloaded sites. Otherwise it protects the visits after the first secure one.

## Try it in the lab

The last objective of [the lab](lab:xss) is to describe how a Content Security Policy adds a second layer of defense, and the lab's preview carries a real policy to study. Do the WEB-05 lab steps first.

1. **Find the policy.** On the Comment tab, set rendering to Vulnerable (raw HTML) and post the Image onerror preset. In your browser's developer tools, inspect the sandboxed preview frame and find the `<meta http-equiv="Content-Security-Policy">` element in its head. Its value is `default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`.
2. **Explain each directive.** Write what each of the four allows and blocks here, why the image fails to load, and why its error handler still runs.
3. **Explain the result.** The policy allows no external scripts, no connections and no images except `data:` URLs, yet the payload ran. Name the source expression responsible.
4. **Write the strict version.** Replace the `script-src` value with a nonce and predict whether each preset would run. Name two things this policy could not do from a `<meta>` element.
5. **Name the second layer.** Answer the Defense in depth challenge, which asks for the header that restricts which scripts may run. Then, on the Defend tab, click Check the safe renderer and explain in one sentence why the preview's `'unsafe-inline'` does no harm under Safe (escaped) rendering, and what that says about which defense comes first.

**Without the lab.** In your browser's developer tools, read the `Content-Security-Policy` response header of a site you use, if it has one, and classify it as nonce-based, hash-based, allowlist or absent.

## Key takeaways

- CSP tells the browser which scripts the site wrote; inline scripts, event handlers and `javascript:` URLs are refused unless `'unsafe-inline'` takes effect.
- Prefer a strict policy: a fresh, unpredictable nonce per response or hashes, with `'strict-dynamic'`, `object-src 'none'` and `base-uri 'none'`. Host allowlists usually fail.
- Roll out in order: refactor inline code, measure in report-only mode, enforce, and keep reading reports.
- `'strict-dynamic'` trusts whatever trusted code loads; Trusted Types close that gap by making DOM sinks refuse plain strings.
- HSTS, nosniff, Referrer-Policy and Subresource Integrity each close one neighboring gap. None of them, CSP included, replaces fixing the injection.

## Go deeper

- **Measuring bypassability.** How did Weichselbaum and colleagues decide that a policy was bypassable ([ACM CCS 2016](https://research.google/pubs/pub45542/)), and what would a comparable study of today's strict policies need to account for?
- **Why some directives need a header.** CSP Level 3 lists the directives that a `<meta>` policy cannot carry ([W3C CSP3, Section 3.3](https://www.w3.org/TR/CSP3/)). Explain, from when a browser parses a page, why `frame-ancestors` in particular cannot work from markup.
- **Reports as personal data.** MDN's sample violation report includes the document URL, the referrer and a sample of the blocked code ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)). Design a collection pipeline that keeps reports useful for debugging while limiting the personal data they carry.
