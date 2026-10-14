---
topicId: WEB-05
title: Cross-site scripting and output handling
summary: Understand reflected, stored, and DOM-based XSS, why the fix is context-aware output encoding rather than input filtering, and how Content Security Policy and framework auto-escaping add defense in depth.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 32
objectives:
  - Distinguish reflected, stored, and DOM-based XSS and explain how each subverts the same-origin policy.
  - Apply the correct output encoding for the HTML, attribute, JavaScript, and URL contexts.
  - Explain why sanitizing input alone does not reliably prevent XSS.
  - Describe how a strict Content Security Policy and framework auto-escaping provide defense in depth, and where their escape hatches reintroduce risk.
prerequisites: [FND-01]
concepts: [xss, output-encoding, content-security-policy, same-origin-policy, input-validation]
labs: [xss]
sources:
  - title: OWASP Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
  - title: OWASP DOM based XSS Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
  - title: MDN Web Docs, Cross-site scripting (XSS)
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS
    publisher: Mozilla
  - title: MDN Web Docs, Content Security Policy (CSP)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
    publisher: Mozilla
  - title: UC Berkeley CS 161 Textbook, Cross-Site Scripting (XSS)
    url: https://textbook.cs161.org/web/xss.html
    publisher: University of California, Berkeley
  - title: React, Common components reference (dangerouslySetInnerHTML)
    url: https://react.dev/reference/react-dom/components/common
    publisher: Meta Open Source
quiz:
  - question: What makes XSS dangerous in terms of the same-origin policy?
    choices:
      - It encrypts the victim's traffic
      - The injected script runs with the victim site's origin, so it can act as the logged-in user there
      - It changes the victim's DNS settings
      - It only affects the attacker's own browser
    answer: 1
    explanation: Normally a script may only act within its own origin. XSS slips attacker script into a trusted site, so it runs with that site's origin and can read page data or act as the user, subverting the same-origin policy.
  - question: Why is sanitizing or filtering input alone an unreliable defense against XSS?
    choices:
      - Input is always safe
      - The right transform depends on the output context, and input filters are fragile and miss DOM-based XSS and non-script vectors
      - Because browsers block all scripts by default
      - Because sanitizing is illegal
    answer: 1
    explanation: Whether a string is dangerous depends on where it is later placed (HTML, attribute, JS, URL). Input-stage filters cannot know the context, are easy to bypass, and miss DOM-based cases, so encoding must happen at output in the correct context.
  - question: A value is inserted into an HTML attribute. What is required for safety?
    choices:
      - Nothing, attributes are always safe
      - Quote the attribute and encode the data for the attribute context
      - Base64-encode the value
      - Put it inside a script tag instead
    answer: 1
    explanation: Unquoted attributes let input add new attributes like an event handler. Quoting the value and applying attribute-context encoding keeps the data inside the attribute.
  - question: What role does a Content Security Policy play against XSS?
    choices:
      - It replaces the need to encode output
      - It is a backup layer that can stop injected script from executing even if encoding fails
      - It encrypts the page
      - It validates the user's password
    answer: 1
    explanation: CSP is defense in depth. MDN states it "is not an alternative to sanitizing input"; a strict policy (nonces/hashes) can block injected inline script if the primary defense fails, but it is a second line, not the first.
  - question: In React, which pattern reintroduces XSS risk if misused?
    choices:
      - Rendering a string in JSX, which is auto-escaped
      - Using dangerouslySetInnerHTML with untrusted, unsanitized HTML
      - Using useState
      - Importing a component
    answer: 1
    explanation: React escapes string children by default, but dangerouslySetInnerHTML writes raw HTML. React's own docs warn it is "trivial to introduce an XSS vulnerability this way" unless the markup is trusted and sanitized.
---

## Why it matters

Modern web apps are built by combining data from many sources — users, databases, other services — into pages shown to other users. [[xss|Cross-site scripting]] (XSS) is what happens when some of that data is actually *code*, and the browser runs it. An attacker who can get script to execute in your page can do anything the logged-in user can do: read what is on the screen, make requests as them, steal a [[session]] token, or quietly change what the page shows.

XSS has stayed near the top of web vulnerability lists for two decades because it is subtle. It is not one bug but a family, the defenses are easy to get almost-but-not-quite right, and the most natural-seeming fix (filter out bad input) does not actually work. Understanding *why* the real fix is about **output**, not input, is one of those ideas that reshapes how you read all web code afterward. It is the browser-side sibling of [SQL injection](lesson:APP-01): both are injection flaws where data is mistaken for code.

> [!ETHICS]
> Only test systems you own or have written permission to test. The payloads in this lesson are standard, inert teaching examples shown so you can recognize and prevent them. Practice them only in the course's sandboxed lab, which runs learner markup in an isolated frame that cannot touch the app.

## The core idea

Normally the [[same-origin-policy|same-origin policy]] keeps sites apart: a script from one origin cannot read or act inside another. XSS defeats that by smuggling the attacker's script *into* a trusted site, so it runs with the victim site's origin and all the trust that comes with it. As the UC Berkeley CS 161 textbook puts it, XSS attacks are powerful because they "subvert the same-origin policy."

Every XSS bug comes from the same root cause, which MDN states plainly: a site accepts input that an attacker can craft and then includes it "in a page without sanitizing it," so the browser parses attacker data as markup or script. The cure, therefore, is to make sure that when data is written into a page, the browser treats it as *data* — text to display — and never as *code* to run. That is **[[output-encoding|output encoding]]**, and the central subtlety is that the correct encoding depends on *where* the data lands.

## How it works

### Three places XSS comes from

XSS is usually classified by how the malicious data reaches the page:

- **Reflected XSS.** The server takes input from the current request (a search term, an error message) and echoes it straight back into the response. The attacker crafts a URL containing the payload and lures a victim to open it. The script runs once, in that response.
- **Stored XSS.** The payload is saved on the server — in a comment, a profile field, a message — and then served to *everyone* who views that content later. CS 161 notes this form "is particularly severe" because one injection reaches many victims without any further action by the attacker.
- **DOM-based XSS.** No server round-trip is needed. Client-side JavaScript reads something attacker-influenced (such as part of the URL) and writes it into a dangerous DOM sink like `innerHTML`. The injection happens entirely in the browser.

The three differ in plumbing but share the fix: wherever untrusted data is written into a page, encode it for that context.

### Context is everything

The same character is dangerous in one place and harmless in another, so there is no single "escape" function. OWASP organizes the defense by output context. A few of the common ones:

For text placed in the body of an HTML element, HTML-entity-encode the five significant characters:

```html
<!-- untrusted "comment" placed as element text -->
<p>COMMENT</p>
<!-- encode:  &  ->  &amp;    <  ->  &lt;    >  ->  &gt;    "  ->  &quot;    '  ->  &#x27; -->
```

For a value placed inside an attribute, OWASP's rule is to "always surround attribute values with ... quotation marks" and encode for the attribute context. An unquoted attribute is the classic trap, because input can simply add a new attribute:

```html
<!-- UNSAFE: unquoted attribute lets input inject a new attribute -->
<img src=AVATAR>
<!-- SAFE: quoted value, attribute-encoded -->
<img src="AVATAR">
```

Inside `<script>` blocks, inside event-handler attributes like `onclick`, inside `<style>`, and inside `javascript:` URLs, simple encoding is *not enough* — OWASP lists these as contexts where you should not place untrusted data at all. For URLs, percent-encode components (`encodeURIComponent` in JavaScript) and allow only `http`/`https` schemes so an attacker cannot smuggle a `javascript:` URL into an `href`.

A clean, context-correct HTML-encoder for the element-text case looks like this, and it is worth recognizing:

```javascript
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;");
}
```

But the better move, when you only need to show text, is to avoid HTML parsing entirely by using a safe sink. The OWASP DOM XSS guidance calls `textContent` the most fundamental safe option: assigning to `element.textContent` inserts a string as text, never as markup, so no encoding function is even required.

```javascript
// Safe: the browser never parses this as HTML
output.textContent = untrustedComment;

// Dangerous: innerHTML parses the string as markup
output.innerHTML = untrustedComment; // avoid
```

### Why filtering input is not the fix

The intuitive defense — strip dangerous input when it arrives — fails for several concrete reasons:

1. **The input stage does not know the output context.** The same comment might later appear as element text, inside an attribute, and in a JSON blob consumed by JavaScript. Each needs a different transform, and only the output site knows which.
2. **Detectors are leaky.** CS 161 observes that "it is very difficult to write a good detector that catches all XSS attacks." Removing `<script>` misses event handlers, `javascript:` URLs, and markup that becomes dangerous only after the browser's own parsing quirks rewrite it.
3. **Legitimate data contains "dangerous" characters.** A user whose name is `O'Brien` or who writes `5 < 7` is not attacking you. Blocking those characters at input breaks real data while still missing clever payloads.

The reliable discipline is therefore: validate input for shape where you can (an [[input-validation|allowlist]] of expected formats), but *encode at output in the correct context* as the actual XSS defense. Encoding is deterministic and context-aware; filtering is guesswork.

### Frameworks help — until you opt out

Modern frameworks reduce XSS because their templating auto-escapes by default. React escapes string values placed in JSX, so writing `{userComment}` inserts text, not markup. MDN notes that most templating engines "automatically perform output encoding," which is why framework-built apps have fewer XSS bugs.

The danger moves to the **escape hatches** that bypass that protection. React's `dangerouslySetInnerHTML` writes raw HTML; its own documentation warns that "unless the markup is coming from a completely trusted source, it is trivial to introduce an [XSS] vulnerability this way," and says to use it "only ... with trusted and sanitized data." Angular has `bypassSecurityTrust*` functions, and other frameworks have equivalents. The pattern to watch for in review is any call that takes a string and treats it as markup or code. When you genuinely must render user-authored HTML (say, a rich-text comment), do not hand-roll a filter — run it through a vetted sanitizer such as DOMPurify, and understand that even that must be kept patched and used carefully.

### CSP: a second line, not the first

A [[content-security-policy|Content Security Policy]] tells the browser which scripts it is allowed to run, so that *even if* an injection slips through, the injected script does not execute. MDN is explicit about its role: "Setting a CSP is not an alternative to sanitizing input. Websites should sanitize input *and* set a CSP, providing defense in depth against XSS." A modern "strict" CSP marks each legitimate script with a per-response nonce or a hash and blocks everything else:

```http
Content-Security-Policy: script-src 'nonce-RANDOM'; object-src 'none'; base-uri 'none'
```

Under such a policy, an injected inline `<script>` with no matching nonce simply will not run, and `javascript:` URLs and inline event handlers are disallowed. Host-based allowlists (listing trusted domains) are far weaker: research and MDN both note they are "hard to get right" and frequently bypassable. CSP is powerful, but it is a backstop for when your output handling fails, not a substitute for doing it correctly.

## Worked example

A fictional course site at `campus.test` has a comment box. The server stores each comment and later renders the comment page by building HTML like this:

```javascript
// Vulnerable renderer: concatenates untrusted text into markup
page.innerHTML = "<p class=comment>" + comment + "</p>";
```

A visitor submits a comment that is not prose but markup containing an image tag with an `onerror` handler. Because the value is dropped into `innerHTML` unencoded *and* the `class` attribute is unquoted, the browser parses the comment as real markup, and the handler runs in the origin of `campus.test` for every later viewer. That is stored XSS: one submission, many victims, each one's browser now doing the attacker's bidding as the logged-in user.

Now repair it. The page only needs to *display* the comment as text, so the fix is to stop parsing it as HTML at all:

```javascript
// Fixed renderer: the comment is inserted as text, never parsed as markup
const p = document.createElement("p");
p.className = "comment";
p.textContent = comment; // safe sink
page.appendChild(p);
```

With `textContent`, the exact same malicious submission now shows up on the page as literal, visible text — the tags are displayed, not executed. As defense in depth, the site also ships the strict CSP above, so that if some *other* code path ever injects a script, the browser refuses to run it. Finally, because the real risk was session theft, the site sets its session [[cookie]] `HttpOnly` so page scripts cannot read it (MDN notes this "mitigates attacks against cross-site scripting"), remembering that an attacker who runs script can still *act* as the user even without reading the token. See [Sessions, cookies, and tokens](lesson:IAM-04).

## Defenses

- **Context-aware output encoding (the primary defense).** Encode every untrusted value for the exact context where it is written, or use a safe sink like `textContent`. Its limit: you must apply it at *every* output site; a single missed sink is a hole, which is why frameworks that encode by default are valuable.
- **Allowlist input validation (supporting).** Reject input that does not match an expected shape (a date, an integer, a known option). Its limit: validation reduces attack surface but cannot be the main defense, because much valid data legitimately contains special characters.
- **HTML sanitization for rich content.** When users must submit HTML, pass it through a maintained sanitizer (DOMPurify). Its limit: sanitizers are complex, must be patched, and can be undone if you modify the output afterward or re-parse it.
- **Content Security Policy (defense in depth).** A strict, nonce- or hash-based CSP blocks injected script execution as a backstop. Its limit: it is explicitly not a replacement for encoding, host allowlists are weak, and strict policies take engineering effort to deploy without breaking legitimate scripts.
- **Framework auto-escaping.** Prefer frameworks that encode by default, and treat every escape hatch as a code-review trigger. Its limit: the hatches exist, and a single misuse reintroduces the bug.

These layers are complementary precisely because output encoding can be forgotten in one place; CSP and `HttpOnly` reduce the blast radius when it is.

## Common misconceptions

- **"XSS is a server bug."** It can be purely client-side (DOM-based XSS) with no server involvement. Any place code writes untrusted data into the page is a candidate.
- **"If I strip `<script>`, I'm safe."** Event handlers, `javascript:` URLs, and markup that mutates during parsing all run script without a literal `<script>` tag. Blocklisting tags is not a defense.
- **"One escaping function covers everything."** The correct transform differs by context (HTML text, attribute, JavaScript, CSS, URL). Encoding for the wrong context can still be exploitable.
- **"A CSP means I don't need to encode."** MDN directly contradicts this: CSP is defense in depth alongside encoding, not instead of it.
- **"My framework makes XSS impossible."** It makes the *default* safe. The escape hatches (`dangerouslySetInnerHTML` and friends) are exactly where framework apps still get XSS.
- **"HttpOnly cookies stop XSS."** They stop a script from *reading* the cookie, which blunts token theft, but injected script can still act as the user. It is mitigation, not prevention.

## Try it in the lab

Open the [XSS sandbox](lab:xss). You will attack a toy comment page that renders input unsafely, confirm that a standard payload executes, and then repair the renderer so the same payload becomes inert text. Crucially, the target runs inside a sandboxed `<iframe>` with no access to the course app, so you are performing the real mechanism against a contained origin. You will fix the bug the right way — by moving to a safe sink or context-correct encoding rather than filtering input — and then re-run the attack to prove it now fails. Finally you will add a strict CSP and watch it block a leftover injection, seeing for yourself how encoding and CSP play different roles.

## Go deeper

Graduate readers should study why "just sanitize the HTML" is harder than it looks. Mario Heiderich and colleagues' "mXSS Attacks" (ACM CCS 2013) showed *mutation-based* XSS, where markup that is harmless when a server-side filter inspects it becomes executable after the browser's own `innerHTML` serialization and re-parsing mutate it. mXSS is the sharpest argument for safe sinks and for not re-parsing sanitized output. On the framework side, Samuel, Saxena, and Song's "Context-Sensitive Auto-Sanitization" (ACM CCS 2011) formalizes the idea that the *template engine* should infer each output context and apply the matching encoder automatically — the principled version of the context rules in this lesson.

On CSP, read Weichselbaum, Spagnuolo, Lekies, and Janc's "CSP Is Dead, Long Live CSP!" (ACM CCS 2016), which measured real deployments and found the overwhelming majority of host-allowlist policies bypassable, motivating the nonce-and-`strict-dynamic` approach now recommended. Finally, follow the standards frontier: the Trusted Types API makes dangerous DOM sinks refuse plain strings, forcing data through a vetted policy function (`require-trusted-types-for 'script'`), which turns "remember to encode at every sink" into an enforced invariant. A good capstone is to take the lab's toy renderer, deploy a strict CSP with Trusted Types, and enumerate which code changes the enforcement forces — a concrete taste of how large codebases are being retrofitted to make XSS structurally hard rather than merely discouraged.
