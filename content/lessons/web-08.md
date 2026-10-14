---
topicId: WEB-08
title: Clickjacking and interface deception
summary: How a page can turn another site's real interface against its user, by framing it invisibly under a decoy, drawing a fake browser window, or rewriting the tab that opened it, and how frame-ancestors, X-Frame-Options, noopener and careful interface design keep a click or a glance from meaning something the user never intended.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain why a cross-origin page can display a signed-in site inside a frame and capture clicks meant for a decoy, and why CSRF tokens do not stop it.
  - Configure frame-ancestors and X-Frame-Options for pages that must never be framed, pages framed only by their own site and pages embedded by named partners, and predict what a browser does when it receives both headers.
  - Evaluate SameSite cookies, confirmation steps, click delays and frame-busting scripts as clickjacking defenses, stating the limits of each.
  - Prevent reverse tabnabbing by choosing among the noopener default, rel values, window.open() features and Cross-Origin-Opener-Policy.
  - Identify a browser-in-the-browser window with checks that drawn interface cannot pass.
prerequisites: [WEB-04, WEB-06, WEB-07]
concepts:
  - clickjacking
  - frame-ancestors
  - x-frame-options
  - frame-busting
  - browser-in-the-browser
  - browsing-context
  - tabnabbing
  - noopener
  - cross-origin-opener-policy
labs: [csrf-clickjacking]
keywords:
  - clickjacking
  - UI redressing
  - UI redress attack
  - CWE-1021
  - CAPEC-103
  - CAPEC-222
  - CAPEC-506
  - tapjacking
  - likejacking
  - cursorjacking
  - frame-ancestors
  - CSP frame-ancestors
  - X-Frame-Options
  - XFO
  - DENY
  - SAMEORIGIN
  - ALLOW-FROM
  - RFC 7034
  - frame busting
  - framebusting
  - context integrity
  - InContext
  - browser-in-the-browser
  - BitB
  - picture-in-picture attack
  - fake browser window
  - tabnabbing
  - reverse tabnabbing
  - window.opener
  - target=_blank
  - rel=noopener
  - rel=noreferrer
  - rel=opener
  - window.open noopener
  - Cross-Origin-Opener-Policy
  - COOP
  - same-origin-allow-popups
  - browsing context
sources:
  - title: OWASP Clickjacking Defense Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: OWASP HTML5 Security Cheat Sheet (Tabnabbing)
    url: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Clickjacking
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
  - title: 'HTML Standard, Section 4.6: Links (the noopener, noreferrer and opener link types)'
    url: https://html.spec.whatwg.org/multipage/links.html
    publisher: WHATWG
  - title: 'RFC 7034: HTTP Header Field X-Frame-Options'
    url: https://www.rfc-editor.org/rfc/rfc7034
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'Clickjacking: Attacks and Defenses (USENIX Security 2012)'
    url: https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/huang
    publisher: USENIX Association (Huang, Moshchuk, Wang, Schechter and Jackson)
quiz:
  - question: 'bank.example protects every form with a synchronizer CSRF token and sets its session cookie with `SameSite=None` so that its pages work inside a partner portal. It sends no framing headers. Why does the token not stop a clickjacking page on mallory.test?'
    choices:
      - The token travels in a cookie, which the frame shares with mallory.test.
      - The attack needs script on mallory.test to read the token from the frame, which the same-origin policy allows.
      - Alice's real click submits the bank's own form inside the frame, so the request carries the genuine token and cookie.
      - Tokens protect only GET requests, and the attack sends a POST.
    answer: 2
    explanation: In CSRF the attacker writes the request and cannot know the token. In clickjacking the attacker writes nothing; Alice clicks the real form, which the bank rendered with its own token, and the same-origin policy still keeps mallory.test from reading anything. The fix is to stop the page from being framed with frame-ancestors or X-Frame-Options, and SameSite=Lax or Strict cookies would also keep the frame signed out.
  - question: 'A response carries `Content-Security-Policy: frame-ancestors https://portal.partner.example` and `X-Frame-Options: DENY`. What does a current browser do when a page on portal.partner.example frames it?'
    choices:
      - It shows the page, because an enforced frame-ancestors directive makes the browser ignore X-Frame-Options; only browsers without frame-ancestors fall back to DENY.
      - It blocks the page, because the stricter header always wins.
      - It blocks the page, because the two headers conflict and conflicting values fall back to DENY.
      - It shows the page only if the partner's own page also sends frame-ancestors.
    answer: 0
    explanation: The HTML Standard's processing model checks for an enforced frame-ancestors directive first and, if one exists, never reads X-Frame-Options, and MDN says the same. Sending both is deliberate. Modern browsers apply the allowlist, and old browsers that understand only X-Frame-Options block every frame, failing closed. The conflicting-values rule applies to several X-Frame-Options values, not to this pair of headers.
  - question: "A developer adds `<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; frame-ancestors 'none'\">` to the account page and sends no framing headers. Can mallory.test still frame the page?"
    choices:
      - No, because default-src 'none' covers every directive, including frame-ancestors.
      - No, because the meta element applies the policy before the frame is displayed.
      - Only in browsers that do not support CSP Level 3.
      - Yes, because browsers ignore frame-ancestors in a meta element, and frame-ancestors never falls back to default-src.
    answer: 3
    explanation: CSP Level 3 excludes frame-ancestors from policies delivered by a meta element, and Chromium logs a console message saying it ignored the directive. MDN adds that frame-ancestors does not fall back to default-src, so even a header policy of default-src 'none' lets anyone frame the page. The fix is a response header that names frame-ancestors explicitly.
  - question: 'A forum renders user-posted links as `<a href="…" target="_blank">`. Which change brings back the risk of reverse tabnabbing?'
    choices:
      - Adding rel="noreferrer" to the links.
      - Opening the links from a script with window.open(url, '_blank') instead.
      - Removing target="_blank" so the links open in the same tab.
      - Sending Cross-Origin-Opener-Policy with the value same-origin on the forum's pages.
    answer: 1
    explanation: The HTML Standard treats a link whose target is _blank as noopener unless its rel includes opener, and noreferrer implies noopener as well. window.open() gets no such default, so unless the script passes the noopener feature, the new page receives a window.opener reference it can use to navigate the forum tab to a look-alike page. Same-tab links open no second window, and COOP same-origin cuts opener references to cross-origin pages.
  - question: On mallory.test, a "Sign in with bank.example" button opens what looks like a popup whose address bar shows https://bank.example with a padlock. Which check exposes it as part of mallory's page?
    choices:
      - The address bar inside the window shows HTTPS and a padlock.
      - The sign-in form looks exactly like the one on bank.example.
      - The window cannot be dragged outside the browser window, and the password manager offers no saved bank.example password.
      - The window opened quickly, without a loading delay.
    answer: 2
    explanation: Everything inside a page's content area, including a fake address bar and padlock, is pixels the page chose. Jackson and colleagues note that a fake window cannot be dragged outside its parent window. A password manager or passkey checks the real origin of the page holding the form, which is mallory.test, so it offers nothing, and that automatic check is more dependable than inspecting the window by eye.
---

## Why it matters

The earlier lessons in this domain fought over code and requests: whose script runs ([WEB-05](lesson:WEB-05)) and which requests a server should honor ([WEB-06](lesson:WEB-06)). Interface deception goes around both by forging only what the victim sees. In its best-known form, the victim makes the request with their own click, on the real site, in their real session.

That form is [[clickjacking]], or UI redressing, which MITRE catalogs as CWE-1021, "Improper Restriction of Rendered UI Layers or Frames" ([CWE-1021](https://cwe.mitre.org/data/definitions/1021.html)). Huang and colleagues report two widespread kinds in the wild, Tweetbomb and Likejacking, in which hidden Tweet or Like buttons spread the attacker's link to victims' friends. In their study of 2,064 participants, new attack variants succeeded 43 to 98 percent of the time ([USENIX Security 2012](https://www.usenix.org/conference/usenixsecurity12/technical-sessions/presentation/huang)).

Two relatives complete the family: a fake browser window drawn inside a page lies about which site is open, and [[tabnabbing|reverse tabnabbing]] swaps the page in a tab the user has left. All three exploit the gap between what the screen shows and what the browser does.

## The core idea

Picture a petition on a clipboard, with carbon paper and a contract hidden beneath it, lined up so your signature lands on the contract. You meant to sign the petition, but the contract receives a signature that is genuinely yours. Nothing was forged, so checking the signature proves nothing.

The [[same-origin-policy]] from [WEB-04](lesson:WEB-04) controls what a page may read, not what it may show. Framing another origin's page is an allowed embed, and the frame keeps its own origin, so the page inside is entirely real: real session, real buttons, real [[csrf-token|CSRF tokens]]. The embedding page cannot read any of it, but it decides where the frame sits, how transparent it is and what covers it. Only the framed page can refuse this, through its own response headers.

The model assumes:

- mallory controls `mallory.test` and can get Alice to visit it.
- Alice is signed in to `bank.example` in the same browser, which works as specified.
- mallory cannot read bank.example's pages and does not need to. As in [[csrf]], the harm is a request's side effect, but the bank's own page sends this request, so WEB-06's token and origin checks pass.

## How it works

### Clickjacking: a real page under a decoy

MDN describes three moves: the attacker's page embeds the target in an `<iframe>`, hides the frame, and lines up decoy elements with the target's sensitive controls. In its example, a user who clicks the decoy "will actually be clicking on the invisible" bank button. If the user is signed in, the request "will include the user's real credentials, and the request will succeed" ([MDN](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/Clickjacking)). [[samesite-cookie|SameSite]] `Lax` or `Strict` [[cookie|cookies]] are withheld from cross-site frames, so the diagram assumes bank.example uses `SameSite=None`, as sites with embedded features sometimes must.

```sequence
title: A clickjacked setting, and the header that stops it
participant A as Alice's browser
participant M as mallory.test
participant B as bank.example
A -> M: GET /prize
M --> A: Decoy page, bank page in a transparent frame
A -> B: GET /settings/sharing in the frame, with cookie
B --> A: 200 OK, the real form and its CSRF token
note A: Alice clicks the decoy; the frame on top gets it
A -> B: POST /settings/sharing, cookie and real token
note: With frame-ancestors 'none' on the GET response
B -x A: The browser refuses to show the frame at all
```

Huang and colleagues describe the variants as attacks on context integrity: the user should see the element and the pointer before acting, and nothing should change as they click.

| Integrity broken | Example                                        | Defense idea                                         |
| ---------------- | ---------------------------------------------- | ---------------------------------------------------- |
| Target display   | A transparent frame over a decoy               | Forbid framing, or check the element is fully visible |
| Pointer          | A fake cursor drawn away from the real pointer | Disable custom cursors near sensitive elements       |
| Temporal         | A button swapped in between two clicks         | Ignore clicks briefly after a sensitive element appears |

Framing rules address only the first row, and only for frames. The authors clickjacked Google's OAuth dialog, protected by X-Frame-Options, by swapping it in as a popup during a double-click; a 250-millisecond click delay cut that attack's success from 47 to 2 percent. Clickjacking's mobile-app version is called tapjacking (CWE-1021).

### Forbidding framing with frame-ancestors

The [[frame-ancestors]] directive of [[content-security-policy|Content Security Policy]] "specifies valid parents that may embed a page using `<frame>`, `<iframe>`, `<object>`, or `<embed>`" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors)). The framed page sends it in one of three forms:

```http
Content-Security-Policy: frame-ancestors 'none'
Content-Security-Policy: frame-ancestors 'self'
Content-Security-Policy: frame-ancestors 'self' https://portal.partner.example
```

`'none'` forbids all framing, `'self'` allows only parent pages with the page's own [[origin]], and a list names allowed embedders. OWASP recommends `'none'` "unless a specific need has been identified for framing." Three details catch people out:

- It does not fall back to `default-src`. MDN warns that a policy of `default-src 'none'` "still allows the resource to be embedded by anyone."
- It must arrive in a header. CSP Level 3 excludes it from policies in a `<meta>` element ([W3C CSP3, Section 3.3](https://www.w3.org/TR/CSP3/)), as [WEB-07](lesson:WEB-07) noted.
- `'self'` means the same origin, not the same site, so `help.shop.example` with `'self'` refuses frames from `shop.example`.

### The older header: X-Frame-Options

Browsers adopted [[x-frame-options]] first. RFC 7034 (2013) describes three values: `DENY`, `SAMEORIGIN`, and `ALLOW-FROM` with one origin ([RFC 7034](https://www.rfc-editor.org/rfc/rfc7034)). The HTML Standard now defines how browsers process the header, superseding the RFC ([HTML Standard, Section 7.7](https://html.spec.whatwg.org/multipage/speculative-loading.html#the-x-frame-options-header)).

| Header received                                     | What a current browser does                                         |
| --------------------------------------------------- | ------------------------------------------------------------------- |
| `DENY`                                              | Blocks every frame, even same-origin ones                           |
| `SAMEORIGIN`                                        | Allows the frame only if every ancestor has the page's origin       |
| `ALLOW-FROM https://partner.example`                | Ignores the whole header, so any site can frame the page            |
| Conflicting values, such as `DENY` and `SAMEORIGIN` | Blocks the frame                                                    |
| The header set in a `<meta>` element                | Ignores it                                                          |
| The header plus an enforced `frame-ancestors`       | Ignores the header and applies `frame-ancestors`                    |

RFC 7034 reported that implementations compared `SAMEORIGIN` only with the top-level page; the HTML Standard checks every ancestor. `ALLOW-FROM` is the trap: modern browsers "will ignore the header completely" (MDN), which can leave "NO clickjacking defense in place" (OWASP).

### Sending both

MDN calls frame-ancestors "a replacement for `X-Frame-Options`" and recommends sending both, so browsers without frame-ancestors still block framing. For a page that partners embed, send the exact `frame-ancestors` list plus `X-Frame-Options: DENY`: new browsers apply the list, and old ones fail closed.

```javascript
// Vulnerable: the sharing page has no framing rule, so any site may frame it.
app.get('/settings/sharing', requireSession, renderSharingPage);

// Fixed: registered after the WEB-07 policy middleware and before every route,
// so each response also gets a framing rule.
const FRAMING_EXCEPTIONS = {
  '/widget/wishlist': 'frame-ancestors https://blog.partner.example',
};
app.use((req, res, next) => {
  // append, not set: a second header that leaves the WEB-07 policy in place.
  res.append('Content-Security-Policy', FRAMING_EXCEPTIONS[req.path] ?? "frame-ancestors 'none'");
  res.set('X-Frame-Options', 'DENY'); // read only by browsers without frame-ancestors
  next();
});
```

Because extra policies "can only further restrict" a page ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy)), the exception replaces the default instead of adding a second header.

### Fake browser interface

A page controls its content area, but not the browser's interface around it, such as the address bar. A [[browser-in-the-browser]] attack paints a second browser window, with a trusted URL, a padlock and a sign-in form, inside the content area, simulating "the entire web browser with JavaScript" ([CS 161, Ch. 23](https://textbook.cs161.org/web/ui-attacks.html)). Jackson and colleagues, who called it a picture-in-picture attack, found it "as effective as homograph attacks": only three of 27 participants flagged all three fakes, and training made participants label more sites, real and fake, as legitimate ([Jackson et al.](https://www.adambarth.com/papers/2007/jackson-simon-tan-barth.pdf)).

No header helps, because the fake window is the attacker's own content, but checks that a picture cannot pass do. A fake window "cannot be dragged outside of its parent window," and a [[password-manager]] or [[passkey]] works only on its own site ([WEB-01](lesson:WEB-01), [WEB-03](lesson:WEB-03)), so neither offers anything to a form on mallory.test.

### Reverse tabnabbing through window.opener

The HTML Standard calls what stands behind each tab, window or frame a [[browsing-context]], "a programmatic representation of a series of documents." A page opened by a link or `window.open()` can get an auxiliary browsing context that records its opener, exposed to scripts as `window.opener` ([HTML Standard, Section 7.3](https://html.spec.whatwg.org/multipage/document-sequences.html)). Across origins, reads through it fail, but "navigation of the opener window is possible," so the new page can swap the original tab's page for a [[phishing]] page ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/opener); [OWASP](https://community.owasp.org/attacks/Reverse_Tabnabbing)).

```sequence
title: Reverse tabnabbing through window.opener
participant T1 as Tab 1: forum.example
participant T2 as Tab 2: mallory.test
participant L as Look-alike sign-in page
T1 -> T2: Alice opens a posted link that keeps the opener
note T2: window.opener refers to tab 1
T2 -> T1: Navigate the opener to the look-alike page
T1 -> L: GET /login, shown in tab 1
note T1: Alice returns to tab 1 and signs in again
note: With noopener, tab 2 has no handle on tab 1
```

The defense is the [[noopener]] link type. The HTML Standard treats a link as noopener when its `rel` includes `noopener` or `noreferrer`, or when its target is `_blank` and its `rel` lacks `opener` ([HTML Standard, Section 4.6](https://html.spec.whatwg.org/multipage/links.html)). MDN confirms this default for `<a>`, `<area>` and `<form>` elements ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/noopener)), and OWASP notes that some browsers still lack it. Gaps remain:

| Opened by                           | `window.opener` | Fix                                                               |
| ----------------------------------- | --------------- | ----------------------------------------------------------------- |
| `<a target="_blank">`               | `null`          | Add `rel="noopener noreferrer"` for older browsers                |
| `<a target="_blank" rel="opener">`  | The opener      | Drop `rel="opener"` for untrusted links                           |
| `<a target="help">`, a named target | The opener      | Add `rel="noopener"`                                              |
| `window.open(url, '_blank')`        | The opener      | Pass `'noopener,noreferrer'`; `window.open()` then returns `null` |

`noreferrer` also withholds the `Referer` header. [[cross-origin-opener-policy|Cross-Origin-Opener-Policy (COOP)]] protects from the opener's side: with `same-origin`, cross-origin pages open in a separate group of browsing contexts, and "any references between the new document and its opener are severed" ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Opener-Policy)). Its `same-origin-allow-popups` value keeps popup references for services such as OAuth or payments, so it does not shield the opener from those popups.

## Worked example

The activity is to inspect an isolated UI example and weigh defensive trade-offs. Before shop.example lets partner blogs embed a "Save to wishlist" button, Bob from the security team audits framing in an isolated harness, `https://ui-test.example`, with a test account and no customer data. Its toy decoy page frames a shop.example page at half opacity over a dummy button, so testers see both layers.

**Step 1: Decide who must frame each page.**

| Pages                       | Framed by                | Policy                                         | Fallback                      |
| --------------------------- | ------------------------ | ---------------------------------------------- | ----------------------------- |
| `/account/*`, `/checkout/*` | Nobody                   | `frame-ancestors 'none'`                       | `X-Frame-Options: DENY`       |
| `/help/*`                   | shop.example's own pages | `frame-ancestors 'self'`                       | `X-Frame-Options: SAMEORIGIN` |
| `/widget/wishlist`          | Partner blogs            | `frame-ancestors https://blog.partner.example` | `X-Frame-Options: DENY`       |

**Step 2: Measure before enforcing.** Bob first sends `frame-ancestors 'self'; report-to csp` site-wide in a `Content-Security-Policy-Report-Only` header ([WEB-07](lesson:WEB-07)), which blocks nothing and reports each violation. The reports reveal one legitimate embedder, `https://support.shop.example`, which joins the help pages' list.

**Step 3: Test in the harness.** Enforced, the rules keep the account, help and widget pages out of the harness, while a test page on `blog.partner.example` shows the widget. An engineer's alternative, `X-Frame-Options: ALLOW-FROM https://blog.partner.example`, fails: the browser ignores it as invalid.

**Step 4: Weigh the widget's trade-offs.** Framing rules cannot protect the widget from the sites allowed to frame it, or from anyone who compromises one.

| Design                                                          | A clickjacked click achieves          | Cost               |
| --------------------------------------------------------------- | ------------------------------------- | ------------------ |
| Widget saves with Alice's session cookie (`SameSite=None`)      | Saves an item, or worse later         | None, until abused |
| Widget only opens a top-level shop.example confirmation window  | Opens a window                        | One extra click    |
| Confirm button ignores clicks for half a second after appearing | Nothing unless Alice reads and clicks | A short pause      |

Bob picks the second and third designs. The session cookie stays `SameSite=Lax`, so the framed widget is never signed in, and the confirmation page forbids framing like every account page.

**Step 5: Check links and windows.** Review links keep `target="_blank"` and gain `rel="noopener noreferrer"` for older browsers, and the Share button's `window.open()` call gains `'noopener,noreferrer'`. Account pages send `Cross-Origin-Opener-Policy: same-origin`; checkout, whose payment popup must report back, uses `same-origin-allow-popups`.

**Step 6: Record the residual risk.** No header stops a partner page from drawing a fake sign-in window, so sign-in offers passkeys.

## Defenses

OWASP recommends combining mechanisms as [[defense-in-depth]].

- **`frame-ancestors` on every HTML response.** Default to `'none'`; allow `'self'` or a short list only where needed. _Limit:_ it stops only framing. A compromised allowed embedder can still clickjack, and popups are not frames.
- **`X-Frame-Options` as the fallback.** `DENY` or `SAMEORIGIN`, never `ALLOW-FROM`. _Limit:_ it must be on every page, cannot list partners, and is lost if a proxy strips it (OWASP).
- **SameSite session cookies.** `Lax` or `Strict` keeps a cross-site frame signed out. _Limit:_ OWASP notes it is no help when the attack "does not require the user to be authenticated," or against a same-site attacker.
- **Intent checks.** Confirm consequential actions on a top-level page, and make new sensitive buttons ignore clicks briefly. _Limit:_ friction; OWASP treats `window.confirm()` "as supplementary confirmation, not a guarantee."
- **No openers for untrusted pages.** Keep the `_blank` default, pass `noopener` to `window.open()`, and send COOP `same-origin` where no popup must report back. _Limit:_ `rel="opener"`, named targets and `same-origin-allow-popups` reopen the door.
- **Authentication that ignores pixels.** Password managers and passkeys check the real origin. _Limit:_ a user can still type a password into a fake window.
- **[[frame-busting|Frame-busting scripts]], only as a legacy extra.** OWASP warns that "multiple ways of defeating this type of script have been made public."

## Common misconceptions

- **"CSRF tokens stop clickjacking."** The click lands on the real page, which carries the real token.
- **"`default-src 'none'` forbids framing."** `frame-ancestors` never falls back to `default-src`.
- **"A meta tag works as well as a header."** Browsers ignore both framing rules in a `<meta>` element.
- **"`ALLOW-FROM` lets me name a partner."** Modern browsers ignore the whole header, so every site can frame the page.
- **"Links with `target="_blank"` are dangerous," or "always safe."** They get noopener by default, but `rel="opener"`, named targets and `window.open()` still create an opener.
- **"The padlock in that window proves the site."** Inside the content area, a padlock is just pixels.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

On the **Clickjacking** tab of [the lab](lab:csrf-clickjacking), a prize page frames the bank's real Transfer button, invisible, over a decoy.

1. Click **Reveal overlay** to see both layers, then **Load attacker page and click**. The result reads "click hijacked"; submit its flag for "Steal a click."
2. Click **Enable frame protection** and load the page again. The browser refuses the frame, which solves "Refuse to be framed." Which of Bob's pages could not refuse every frame?

**Without the lab.** Test framing rules with two servers that listen only on 127.0.0.1, as in [WEB-04](lesson:WEB-04).

1. Create folders `a` and `b`. In `b`, save `account.html` containing `<h1>My account</h1><button>Delete my account</button>`, and `opened.html` containing `<h1>Opened page</h1>`. In `a`, save `index.html` containing `<iframe src="http://127.0.0.1:8001/account.html" width="400" height="200"></iframe>`.
2. Save this header-adding server in `b` as `headers_server.py`:

   ```python
   # Serve this folder on 127.0.0.1:8001, adding the response headers given on the
   # command line, for example:
   #   python3 headers_server.py "Content-Security-Policy: frame-ancestors 'none'"
   import sys
   from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

   EXTRA = [arg.split(': ', 1) for arg in sys.argv[1:]]


   class Handler(SimpleHTTPRequestHandler):
       def end_headers(self):
           self.send_header('Cache-Control', 'no-store')  # reloads always see new headers
           for name, value in EXTRA:
               self.send_header(name, value)
           super().end_headers()


   ThreadingHTTPServer(('127.0.0.1', 8001), Handler).serve_forever()
   ```

3. Run `python3 -m http.server 8000 --bind 127.0.0.1` in `a` and `python3 headers_server.py` in `b`, and open `http://127.0.0.1:8000/` with DevTools open.
4. Restart `b` with one header at a time: `"Content-Security-Policy: frame-ancestors 'none'"`, then `frame-ancestors 'self'` and `frame-ancestors http://127.0.0.1:8000` in that header, then `"X-Frame-Options: DENY"`, `"X-Frame-Options: ALLOW-FROM http://127.0.0.1:8000"` and `"Content-Security-Policy: default-src 'none'"`. Note whether the frame renders and the Console message, and explain `'self'` using [[origin]] and [[site]].
5. Pass `"Content-Security-Policy: frame-ancestors http://127.0.0.1:8000"` and `"X-Frame-Options: DENY"` together. Predict the result first.
6. Restart with no arguments, add `<meta http-equiv="Content-Security-Policy" content="frame-ancestors 'none'">` to `account.html`, and reload.
7. In `a`, save `links.html` with two links to `http://127.0.0.1:8001/opened.html`, one with `target="_blank"` and one adding `rel="opener"`. Open each from `http://127.0.0.1:8000/links.html` and run `window.opener` in the new tab's console. Where it is not `null`, try `window.opener.document`, then `window.opener.location.href = 'http://127.0.0.1:8001/opened.html'`, and watch the first tab. Stop both servers.

## Key takeaways

- Clickjacking frames a real, signed-in page under a decoy. The click is genuine, so CSRF tokens do not stop it.
- Send `Content-Security-Policy: frame-ancestors 'none'`, `'self'` or an exact list on every HTML response, in a real header.
- Keep `X-Frame-Options: DENY` or `SAMEORIGIN` as a fallback that newer browsers ignore. `ALLOW-FROM` fails open.
- A page that must be framed should hold no authority; consequential actions belong on a top-level page that confirms them.
- A new tab can navigate its opener, so rely on noopener and consider COOP. No header stops a window drawn inside a page.

## Go deeper

- **Context integrity.** In InContext, sites mark sensitive elements and the browser checks what the user saw, and when ([Huang et al.](https://www.usenix.org/system/files/conference/usenixsecurity12/sec12-final39.pdf)). Could this per-element design protect an embeddable widget that frame-ancestors cannot?
- **Nested frames.** On 127.0.0.1, build a top page that frames an allowed page, which frames a protected one. What do `SAMEORIGIN` and an allowlisting `frame-ancestors` rule decide, and why did RFC 7034's top-level-only comparison fall short?
- **Cues a page cannot copy.** Training made Jackson and colleagues' participants accept more fake sites ([Jackson et al.](https://www.adambarth.com/papers/2007/jackson-simon-tan-barth.pdf)). Design a cue no page can imitate, and a study of whether people notice its absence.
