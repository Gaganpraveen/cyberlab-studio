---
topicId: WEB-04
title: Origins, sites, and browser isolation
summary: How the browser decides which pages may read each other's data, using origins for the same-origin policy and CORS and the broader notion of a site for SameSite cookies and process isolation, and why the difference matters for every web attack that follows.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Determine whether two URLs are same-origin and whether they are same-site, and explain why the answers can differ.
  - Predict which cross-origin interactions the same-origin policy allows, such as sending a request or embedding an image, and which it blocks, such as reading a response.
  - Explain how CORS relaxes the same-origin policy, when the browser sends a preflight request, and why reflecting the Origin header with credentials is dangerous.
  - Choose cookie attributes for a session cookie and explain what SameSite and site isolation add beneath the same-origin policy, including their limits.
prerequisites: [WEB-02, IAM-04]
concepts:
  - origin
  - site
  - same-origin-policy
  - cors
  - preflight-request
  - samesite-cookie
  - site-isolation
  - cookie
labs: []
keywords:
  - SOP
  - same-origin policy
  - same-site
  - schemeful same-site
  - eTLD+1
  - CORS
  - Access-Control-Allow-Origin
  - Access-Control-Allow-Credentials
  - preflight
  - OPTIONS
  - SameSite=Lax
  - SameSite=Strict
  - SameSite=None
  - __Host- prefix
  - HttpOnly
  - site isolation
  - Spectre
  - CORB
  - postMessage
sources:
  - title: 'CS 161 Textbook, Ch. 19: Same-Origin Policy'
    url: https://textbook.cs161.org/web/sop.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: Same-origin policy
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
  - title: Cross-Origin Resource Sharing (CORS)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
  - title: Set-Cookie header (SameSite, Secure, HttpOnly and cookie prefixes)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
  - title: Site Isolation
    url: https://www.chromium.org/Home/chromium-security/site-isolation/
    publisher: The Chromium Projects
    license: CC BY 2.5
  - title: URL Standard
    url: https://url.spec.whatwg.org/
    publisher: WHATWG
quiz:
  - question: Which pair of URLs is same-site but not same-origin?
    choices:
      - '`https://shop.example` and `http://shop.example`'
      - '`https://shop.example` and `https://bank.example`'
      - '`https://shop.example` and `https://cart.shop.example`'
      - '`https://shop.example/a` and `https://shop.example/b`'
    answer: 2
    explanation: The hosts differ, so the origins differ, but the scheme and the registrable domain (shop.example) are the same, so the site is the same. The first pair differs in scheme, which makes it cross-origin and, because sites include the scheme, cross-site too. The second pair has different registrable domains. The last pair differs only in path, so it is both same-origin and same-site.
  - question: A page on `https://mallory.test` runs `fetch('https://bank.example/api/balance')`, and bank.example sends no CORS headers. What happens?
    choices:
      - The browser sends the request, but the script on mallory.test cannot read the response.
      - The browser refuses to send the request at all.
      - The request is sent and the script reads the response, because GET is a safe method.
      - The browser asks the user for permission before sending it.
    answer: 0
    explanation: The same-origin policy restricts reading, not sending. A plain GET is a simple request, so there is no preflight; the request reaches the server, and the browser then withholds the response from the script because no Access-Control-Allow-Origin header permits mallory.test. This is why servers must not change state on GET and why CORS is not a defense against CSRF.
  - question: "The API at `api.shop.example` copies whatever Origin header a request carries into `Access-Control-Allow-Origin` and also sends `Access-Control-Allow-Credentials: true`. Its session cookie is set with `SameSite=None; Secure`. Why is this dangerous?"
    choices:
      - Every request now needs a preflight, which slows the API down.
      - It turns off HTTPS for the API.
      - It only affects pages on shop.example subdomains, so it is harmless.
      - Any website a signed-in user visits can send credentialed requests to the API and read the private responses.
    answer: 3
    explanation: Echoing the Origin header with credentials means every origin is allowed to read responses made with the user's cookie, and SameSite=None lets the browser attach that cookie from any site. MDN advises naming only the specific origins that need credentialed access instead of reflecting the Origin header.
  - question: bank.example sets its session cookie with `SameSite=Lax`. Alice is signed in and visits mallory.test, which automatically submits a hidden form that POSTs to `https://bank.example/transfer`. What does the browser do?
    choices:
      - It sends the POST with the cookie, because form submissions are always allowed.
      - It sends the POST without the cookie, because Lax attaches cookies to cross-site requests only for top-level navigations that use a safe method such as GET.
      - It blocks the POST, because the same-origin policy forbids cross-origin writes.
      - It sends the POST with the cookie, but mallory.test cannot read the response.
    answer: 1
    explanation: Cross-origin form submissions are writes, which the same-origin policy allows, so the request is sent. Lax withholds the cookie on a cross-site POST, so the bank sees a request from someone who is not signed in. The protection comes from the cookie attribute, and it does not apply when the attacking page is same-site, such as a compromised blog.bank.example.
  - question: Why did browsers add site isolation when they already enforced the same-origin policy?
    choices:
      - Because the same-origin policy never applied to cookies.
      - Because site isolation replaces CORS for cross-origin APIs.
      - Because the policy is enforced by code inside a renderer process, so a renderer bug or a Spectre-style side channel could expose another site's data held in the same process.
      - Because site isolation makes all subdomains of a site the same origin.
    answer: 2
    explanation: The same-origin policy is a rule that browser code checks. If one process holds data from two sites, a compromised renderer or a speculative-execution side channel can read across that rule. Site isolation puts different sites in different operating-system processes, so the data is simply not there to read. It isolates by site, not by origin, and it does not change CORS or cookie rules.
---

## Why it matters

A browser is a shared computer. One window may hold your bank, your email and a page you reached from a search result, all running code at once, while the browser attaches your [[cookie|cookies]] to requests automatically. The rule that stops that random page from reading your mailbox is the [[same-origin-policy]]. Nearly every attack in this domain works around it or abuses what it permits: [[xss]] runs an attacker's script inside the victim's origin, [[csrf]] exploits the fact that cross-origin requests can still be sent, and [[clickjacking]] exploits the fact that pages can be embedded.

The boundary must also survive bugs. [[spectre|Spectre]]-style side-channel attacks can read memory inside a browser's renderer process "even without bugs in Chrome," as the Chromium project puts it, so a rule enforced by code inside one process is not enough. Chrome turned on [[site-isolation]] for all sites on desktop in Chrome 67 to keep different sites in different processes.

## The core idea

Picture an office building. Each origin is one office with its own locked filing cabinet. Anyone may slide a letter under any door (a write) or hang a copy of another office's poster on their own wall (an embed), but nobody may open another office's cabinet (a read) unless that office hands out a key, which is what CORS does. A site is a company that rents several offices on one floor, and for some purposes, such as cookies, the building treats the whole company as one tenant.

The assumptions behind the model:

- The attacker controls a site the victim visits, here `mallory.test`, and can run any JavaScript there.
- The victim, Alice, is signed in to `bank.example` in the same browser.
- The browser enforces its own rules correctly, except where the section on site isolation considers a compromised renderer.

## How it works

### Origins and sites

An [[origin]] is the triple of scheme, host and port, with port 443 assumed for `https` and 80 for `http`. Two URLs are same-origin only when all three parts match exactly; paths, queries and fragments do not count. Some documents, such as those loaded from `data:` URLs and, in most browsers, local files, get an opaque origin that matches no other.

A [[site]] is coarser. Chromium defines it as "the scheme and registered domain name, including the public suffix, but ignoring subdomains, port, or path," so `https://foo.example.com:8080` belongs to the site `https://example.com`. The registered part is the [[registrable-domain]], found with the [[public-suffix]] list. A host without one, such as an IP address, is its own site.

| URL A                         | URL B                              | Same origin? | Same site?                              | Why                                                      |
| ----------------------------- | ---------------------------------- | ------------ | --------------------------------------- | -------------------------------------------------------- |
| `https://shop.example/cart`   | `https://shop.example/orders?id=7` | Yes          | Yes                                     | Only the path and query differ                           |
| `https://shop.example`        | `https://shop.example:8443`        | No           | Yes                                     | The port differs, and sites ignore ports                 |
| `https://shop.example`        | `https://www.shop.example`         | No           | Yes                                     | The hosts differ, but the registrable domain matches     |
| `https://cart.shop.example`   | `https://blog.shop.example`        | No           | Yes                                     | Sibling subdomains share a registrable domain            |
| `https://shop.example`        | `http://shop.example`              | No           | No                                      | The scheme differs, and sites include the scheme         |
| `https://shop.example`        | `https://bank.example`             | No           | No                                      | Different registrable domains                            |
| `https://alice.pages.example` | `https://bob.pages.example`        | No           | No, if pages.example is a public suffix | Each user's subdomain is its own registrable domain      |
| `http://127.0.0.1:8000`       | `http://127.0.0.1:8001`            | No           | Yes                                     | Only the port differs, and an IP address is its own site |

Same-site is the weaker relationship. The WHATWG URL Standard warns that registrable domains cannot provide a hard security boundary, partly because browsers may not share the same suffix list, and it steers new security features toward origins.

### What the same-origin policy permits

MDN groups cross-origin interactions into three kinds:

- **Writes are typically allowed:** links, redirects and form submissions.
- **Embeds are typically allowed:** scripts, stylesheets, images, media and frames from other origins.
- **Reads are typically blocked:** a script cannot read a cross-origin response body, the document inside a cross-origin frame, or another origin's `localStorage` and IndexedDB data, although embedding leaks a little, such as an image's dimensions.

Two consequences surprise people. First, an embedded script runs with the origin of the page that includes it, not the server it came from. A third-party analytics script on `shop.example` can therefore read everything a shop.example script can, so including it is an act of complete trust. Second, a frame takes the origin of its own URL. The parent and a cross-origin frame see only a few properties of each other's windows and communicate through `postMessage`.

Cookies follow their own, looser rules. A page may set a cookie for its own host or for a parent domain, as long as that parent is not a public suffix. Without a `Domain` attribute the cookie is host-only; with `Domain=shop.example` it is sent to every subdomain.

### CORS: letting another origin read

[[cors|Cross-Origin Resource Sharing (CORS)]] is how a server tells the browser that another origin may read its responses. For a simple request, a GET, HEAD or POST with only basic headers and a content type of `application/x-www-form-urlencoded`, `multipart/form-data` or `text/plain`, the browser sends the request at once and only afterward decides whether the script may see the response. Any other request first triggers a [[preflight-request]], an `OPTIONS` request that asks permission:

```sequence
title: A preflighted CORS request, then a refused one
participant P as Script on app.shop.example
participant B as Browser
participant A as api.shop.example
P -> B: fetch PUT /orders/42, JSON, with credentials
B -> A: OPTIONS /orders/42 (Origin: app.shop.example)
A --> B: 204, allows app.shop.example, PUT, credentials
B -> A: PUT /orders/42 with cookies
A --> B: 200, Allow-Origin: https://app.shop.example
B --> P: Response handed to the script
note: The same fetch from mallory.test gets no Allow-Origin
B -x A: PUT never sent, because the preflight failed
```

The two hosts are same-site, yet CORS still applies, because CORS works on origins. For requests that carry cookies, the server must name one explicit origin rather than the `*` wildcard and must send `Access-Control-Allow-Credentials: true`. The classic mistake is to echo whatever origin asked:

```javascript
// Vulnerable: every origin may read responses made with the user's cookies.
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', req.get('Origin'));
  res.set('Access-Control-Allow-Credentials', 'true');
  next();
});

// Fixed: only listed origins get credentialed read access.
const allowed = new Set(['https://app.shop.example']);
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (allowed.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }
  res.set('Vary', 'Origin'); // caches must not reuse one origin's answer for another
  next();
});
```

CORS headers are instructions to browsers. Other clients ignore them, so the server must still authenticate and authorize every request.

### SameSite cookies

The browser attaches cookies to matching requests no matter which page started them, which is the root of [[csrf]]. The [[samesite-cookie|SameSite]] attribute limits this by comparing sites, including the scheme:

- `Strict` sends the cookie only on same-site requests.
- `Lax` also sends it on cross-site requests that are top-level navigations with a safe method, which excludes POST, PUT and DELETE.
- `None` sends it on every request and requires the `Secure` attribute.

MDN notes that some browsers apply Lax when the attribute is missing, in a looser form that still sends the cookie on a POST made within two minutes of the cookie being set. A careful session cookie spells everything out:

```http
Set-Cookie: __Host-session=7f3c9a; Path=/; Secure; HttpOnly; SameSite=Lax
```

The `__Host-` prefix makes the browser reject the cookie unless it is Secure, has no Domain attribute and uses `Path=/`, so it stays with one host. `HttpOnly` hides it from `document.cookie`, although the browser still sends it with `fetch()` calls. The key limit is that SameSite compares sites: a request from `https://blog.shop.example` to `https://shop.example` is same-site, so even Strict cookies go along. A compromised subdomain defeats it.

### Site isolation

The same-origin policy is enforced by browser code. If the renderer process drawing mallory.test also held bank.example's data, a memory-corruption bug or a speculative-execution side channel could read across the rule. Site isolation, in Chromium's words, "ensures that pages from different websites are always put into different processes," each inside a [[sandbox]], so the operating system's [[process-isolation]] backs up the browser's rule. It groups pages by site, not origin. Since Chrome 67 it covers all sites on desktop, while on Android it covers only some sites, such as those users sign in to, on devices with at least 2 GB of memory. The same page describes Cross-Origin Read Blocking (CORB), which keeps many cross-site responses out of a renderer that requested them through tags such as `<img>`, and calls it "a best effort approach."

## Worked example

The activity is to inspect a permitted cross-origin behavior matrix. Alice is signed in to `https://bank.example`, whose session cookie is `SameSite=Lax`. She opens `https://mallory.test` in another tab, and its script tries five things:

| Action by mallory.test's page                    | Kind  | Sent?                                      | Lax cookie attached? | Readable by mallory's script?       |
| ------------------------------------------------ | ----- | ------------------------------------------ | -------------------- | ----------------------------------- |
| 1. Link to `https://bank.example/statements`     | Write | Yes, as a top-level navigation             | Yes (safe method)    | No; the page belongs to the bank    |
| 2. Hidden form POST to `/transfer`               | Write | Yes                                        | No                   | No                                  |
| 3. `<img src="https://bank.example/logo.png">`   | Embed | Yes                                        | No                   | Only the image's dimensions         |
| 4. `<iframe src="https://bank.example/account">` | Embed | Yes; shown unless the bank forbids framing | No                   | No                                  |
| 5. Credentialed `fetch()` of `/api/balance`      | Read  | Yes                                        | No                   | No, unless CORS allows mallory.test |

Read the matrix column by column:

1. **Sending is rarely the barrier.** Every row reaches the bank's server. The same-origin policy controls what mallory.test can read afterward, which in every row is nothing useful.
2. **The cookie column is SameSite's work.** Only the top-level link carries the cookie, so it must never change state; GET requests should only read.
3. **Change one attribute.** Suppose the bank had used `SameSite=None`. Rows 2 to 5 would now carry the cookie. Row 2 becomes a working forgery, the subject of [CSRF](lesson:WEB-06), and row 4 becomes a framed, signed-in page for [clickjacking](lesson:WEB-08). Rows 3 and 5 still reveal nothing useful, because the read restriction holds.
4. **Change the attacker's location.** Suppose the script ran on a compromised `blog.bank.example`. Every row is now same-site, so the cookie is attached even with `SameSite=Strict`, and only the read restriction, CSRF tokens and framing rules remain.

## Defenses

- **Scope session cookies tightly.** Use the `__Host-` prefix, `Secure`, `HttpOnly` and `SameSite=Lax` or `Strict`. _Limit:_ SameSite trusts the whole site, and none of these attributes stops script already running in your origin.
- **Grant CORS narrowly.** Send `Access-Control-Allow-Origin` only from API endpoints that need it, name exact origins, add `Vary: Origin`, and allow credentials only when necessary. _Limit:_ CORS governs reading in browsers; it is not access control.
- **Put untrusted content on a separate site.** Serve user uploads or user-written HTML from a different registrable domain, such as `shopusercontent.example`, so they get their own origin, process and cookie scope. _Limit:_ another domain to manage, and it must never host a sign-in page, or users learn to trust it.
- **Close the remaining doors.** Require [[csrf-token|CSRF tokens]] for state changes and forbid framing where it is not needed. _Limit:_ both are per-application work that must cover every endpoint.
- **Keep browsers updated.** Site isolation, sandboxing and cookie defaults are browser features that improve over time. _Limit:_ you cannot control which browser each visitor runs.

## Common misconceptions

- **"The same-origin policy blocks cross-origin requests."** It blocks reading responses. Links, form posts and embeds cross origins all the time.
- **"CORS protects my server."** CORS relaxes the same-origin policy at the server's request. A misconfigured CORS policy weakens security.
- **"Same-site means same-origin."** A sibling subdomain or another port is same-site but cross-origin.
- **"SameSite cookies stop all CSRF."** They do not stop same-site attackers, and Lax still allows cross-site top-level GET navigations.
- **"A third-party script runs in its own origin."** It runs with the origin of the page that includes it.

## Try it yourself

Build your own behavior matrix on your own machine, with two tiny local web servers that listen only on the loopback address, 127.0.0.1.

1. Create folders `a` and `b`. Put any small image in `b` as `logo.png`, and a short page there as `b.html`. In `a`, create `index.html` containing `<img src="http://127.0.0.1:8001/logo.png">` and `<iframe src="http://127.0.0.1:8001/b.html"></iframe>`.
2. Start one server in each folder with `python3 -m http.server 8000 --bind 127.0.0.1` (in `a`) and the same command with port `8001` (in `b`), then open `http://127.0.0.1:8000/` in your browser.
3. Open the developer tools console and run `fetch('http://127.0.0.1:8001/b.html').then((r) => r.text())`. Record the CORS error, then look at the terminal running the port 8001 server: its log shows that the request arrived and was answered.
4. Run `document.querySelector('iframe').contentWindow.document` and record the security error. Note that the image and the frame both rendered.
5. Run `document.cookie = 'demo=1'`, then open `http://127.0.0.1:8001/b.html` in a new tab and run `document.cookie` there. Record what you see, and explain it using the table of origins and sites.
6. Fill in a matrix like the worked example's, with columns for sent, rendered and readable. Stop both servers with Ctrl+C when you finish.

## Key takeaways

- An origin is scheme, host and port; a site is scheme plus registrable domain. Same-site pairs can be cross-origin.
- The same-origin policy blocks reads, not writes or embeds, which is why CSRF and clickjacking exist.
- CORS lets a server opt in to cross-origin reads. Name exact origins, and never echo the Origin header when credentials are allowed.
- SameSite limits which requests carry cookies, but it trusts the whole site, including every subdomain.
- Site isolation puts different sites in different processes, so a renderer bug or side channel cannot reach another site's data.

## Go deeper

- **Compromised renderers.** Chromium's Site Isolation page says that from Chrome 77 desktop isolation also defends against fully compromised renderers, while Android protects only a subset of sites. What memory and performance trade-offs might drive that difference?
- **Origins versus sites.** The URL Standard asks new specifications to prefer origins. List the browser features that still use sites, such as SameSite and process allocation, and argue whether each should move to origins.
- **Leaks through embedding.** MDN notes that embedding leaks some information, such as image dimensions. Design a fictional experiment showing what a cross-origin page can learn from load and error events alone, and consider which response headers would close each leak.
