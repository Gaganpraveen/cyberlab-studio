---
topicId: WEB-05
title: Cross-site scripting and output handling
summary: Why a page that mixes trusted code with untrusted data can end up running an attacker's script with the site's own authority, and how contextual output encoding, safe DOM APIs, sanitization and browser-enforced layers keep data from ever becoming code.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain why an injected script gains the victim site's origin, and distinguish reflected, stored and DOM-based cross-site scripting.
  - Identify the output context of each value in a template or script and choose the matching encoding, validation or safe API.
  - Repair a vulnerable renderer by replacing innerHTML with text-only DOM APIs, validating URL schemes and sanitizing rich text.
  - Evaluate auto-escaping, Content Security Policy, Trusted Types and HttpOnly cookies, stating what each can and cannot stop.
prerequisites: [WEB-04, APP-01]
concepts:
  - xss
  - reflected-xss
  - stored-xss
  - dom-based-xss
  - dom-sink
  - output-context
  - output-encoding
  - auto-escaping
  - sanitization
  - javascript-url
labs: [xss]
keywords:
  - XSS
  - cross-site scripting
  - CWE-79
  - CAPEC-63
  - CAPEC-588
  - CAPEC-591
  - CAPEC-592
  - A05:2025
  - reflected XSS
  - stored XSS
  - persistent XSS
  - DOM XSS
  - client-side XSS
  - innerHTML
  - textContent
  - HTML escaping
  - HTML entity
  - contextual output encoding
  - auto-escaping
  - DOMPurify
  - setHTML
  - HTML Sanitizer API
  - dangerouslySetInnerHTML
  - javascript URL
  - Trusted Types
sources:
  - title: OWASP Cross Site Scripting Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: OWASP DOM based XSS Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Cross-site scripting (XSS)
    url: https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later
    sourceId: mdn-web-security
  - title: 'CS 161 Textbook, Ch. 22: Cross-Site Scripting (XSS)'
    url: https://textbook.cs161.org/web/xss.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: "CWE-79: Improper Neutralization of Input During Web Page Generation ('Cross-site Scripting')"
    url: https://cwe.mitre.org/data/definitions/79.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
    sourceId: cwe-top-25
quiz:
  - question: 'A profile page uses an auto-escaping template everywhere. The homepage field is rendered as `<a href="{{ homepage }}">`. Which homepage value can still run script when another user clicks the link?'
    choices:
      - A value containing `<script>` tags.
      - A value containing a double quote character.
      - A value that uses the `javascript:` scheme followed by code.
      - A value containing an ampersand.
    answer: 2
    explanation: HTML encoding changes characters such as angle brackets, ampersands and quotes, so the tags, the quote and the ampersand all arrive as harmless text. A javascript URL needs none of those characters, so it passes through the encoder unchanged and runs in the page's origin when clicked. URL-valued attributes need their own rule, which is to parse the value and allow only https and http.
  - question: "A renderer sets `li.innerHTML = review.body`. A teammate proposes deleting `<script>` tags from reviews before they are saved. What is the best response?"
    choices:
      - Render the body with textContent instead; HTML has other ways to run script, and an input filter cannot know where the data will be written.
      - The proposal works, because innerHTML runs only script elements.
      - The proposal works as long as the filter also runs in the browser.
      - The proposal is unnecessary, because innerHTML never creates elements from a string.
    answer: 0
    explanation: innerHTML does not execute inserted script elements, but it does build every other element, and an image's error handler, for example, runs code. Deleting one tag is a denylist with gaps, applied before anyone knows the output context. Writing the body as text removes the problem at its root, and a sanitizer handles the case where some markup must survive.
  - question: 'The help page at `https://shop.example/help` runs `panel.innerHTML = decodeURIComponent(location.hash.slice(1))`. The server HTML-encodes everything it outputs, and its logs show nothing unusual. Why?'
    choices:
      - The server's encoding stops the attack, so the page is not vulnerable.
      - Browsers refuse to run script that comes from the address bar.
      - HTTPS encrypts the payload, so the server cannot log it.
      - The fragment after `#` is never sent to the server, and the flaw is in the page's own script, so it must be fixed in the browser.
    answer: 3
    explanation: HTTP leaves the fragment out of the request because it is reserved for client-side processing. The data flows from location.hash to the innerHTML sink entirely in the browser, which makes this DOM-based XSS, and server-side encoding never sees it. Use textContent; Trusted Types can make the browser reject the string assignment outright. HTTPS is decrypted at the server, so it does not explain the empty logs.
  - question: Reviews at shop.example must allow bold and italic text. Which approach is correct?
    choices:
      - HTML-encode each review, because encoding keeps the formatting tags working.
      - Sanitize each review with a maintained HTML sanitizer that allows only the formatting elements, and insert the result without modifying it afterwards.
      - Delete every `<` and `>` character with a regular expression before saving.
      - Insert each review with innerHTML and rely on the Content Security Policy.
    answer: 1
    explanation: Encoding would display the tags as literal text, and deleting angle brackets destroys the formatting along with the meaning of text such as "3 < 5". A sanitizer parses the markup and keeps only an allowlist of elements and attributes; OWASP recommends DOMPurify and warns that editing sanitized HTML can void the protection. CSP is a backup layer, not a reason to skip sanitizing.
  - question: shop.example marks its session cookie HttpOnly. A stored XSS flaw lets mallory's script run on alice's order page. What can the script still do?
    choices:
      - Nothing, because HttpOnly stops the script from running.
      - Read the session cookie through document.cookie.
      - Read the page and send requests to shop.example that carry alice's cookie automatically, acting as her.
      - Show alert dialogs, which is all that XSS can do.
    answer: 2
    explanation: HttpOnly hides the cookie from document.cookie, but the browser still attaches it to requests the script makes, and because the script runs in shop.example's origin, it can read the responses. MDN notes that injected code can do anything the site's own code can do. An alert is only a harmless proof that script ran.
---

## Why it matters

MITRE's 2025 CWE Top 25, computed from 39,080 CVE records published between June 2024 and June 2025, ranks [[xss|cross-site scripting (XSS)]] first, as CWE-79 ([methodology](https://cwe.mitre.org/top25/archive/2025/2025_methodology.html)). OWASP's Top 10:2025 files it under A05:2025 Injection and counts more than 30,000 CVEs for it ([OWASP](https://top10.owasp.org/2025/A05_2025-Injection/)).

It matters because of the boundary from [the previous lesson](lesson:WEB-04). The [[same-origin-policy]] decides what a script may touch by asking which [[origin]] it runs in, and an injected script runs in the origin of the site that served it. MDN puts it plainly: the attacker's code "can then do anything that the site's own code can do," including reading and changing the site's pages and local storage and sending requests with the user's credentials. No browser rule is broken. The browser is obeying the page.

The cause, though, is narrow: data that should have stayed text was parsed as markup or code, and each place where that can happen has a known fix.

## The core idea

A web page is text that the browser parses. Developers write a template that fixes the structure, and values such as a username or a review fill its gaps. The browser receives one undifferentiated string, with no record of which characters the developers wrote. If a value contains characters that mean something to the parser, such as `<`, the browser treats them as structure, and the visitor who supplied the value has become a co-author of the page.

Think of a typesetter who pastes each letter to the editor into the layout file verbatim: a reader who includes typesetting commands gets them obeyed. The fix is to set every letter as text, not to censor letters. [[injection|Injection]] in general, including SQL injection in [APP-01](lesson:APP-01), has this shape: data crossing into the channel that carries code.

The model assumes:

- The attacker, mallory, can get a value into a page that someone else views: a review, a profile field, or a parameter in a link the victim opens.
- The victim, alice, is signed in to `shop.example` in the same browser.
- The browser works exactly as specified. XSS needs no browser bug.

The defense follows from the model: wherever data is written into a document, make sure the parser can read it only as data.

## How it works

### How the payload arrives, and where it is mishandled

OWASP's DOM-based XSS cheat sheet separates two questions: "Stored and reflected describe how an attack payload reaches a victim; server-side and client-side describe where untrusted data is handled unsafely."

|                                                      | Mishandled by server-side code                    | Mishandled by the page's JavaScript                         |
| ---------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| **Reflected:** the payload is in the victim's request | A search page copies `?q=` into its HTML          | A script copies a URL parameter into `innerHTML`            |
| **Stored:** the payload was saved earlier             | A review is saved and later printed by a template | A script fetches saved reviews and assigns them to `innerHTML` |

[[reflected-xss|Reflected XSS]] needs the victim to open a crafted link, so it usually arrives by email or chat. [[stored-xss|Stored XSS]] waits on the site for every visitor, administrators included. [[dom-based-xss|DOM-based XSS]] happens when the page's own script passes data to a [[dom-sink]], an API that parses its input as HTML or runs it as code. If that data comes from the URL fragment, the part after `#`, the server never sees it: HTTP leaves the fragment out of the request because it is "reserved for client-side processing" ([RFC 9110, Section 7.1](https://www.rfc-editor.org/info/rfc9110)).

The diagram follows a stored payload.

```sequence
title: Stored XSS in a product review
participant M as Mallory
participant S as shop.example
participant A as Alice's browser
M -> S: POST /reviews (body contains markup)
S --> M: 201 Created, review saved as typed
A -> S: GET /product/42 (Cookie: session=…)
S --> A: 200 OK, review pasted into the HTML
note A: The parser builds an element from the review
note A: Its script runs in shop.example's origin
A -> S: Requests the script makes, with alice's cookie
S --> A: Responses the script can read, as if alice asked
```

Every step works as designed: because the script runs in shop.example's origin, the same-origin policy treats its requests and reads as the site's own.

### Output contexts

A page nests several languages: HTML, attribute values, URLs, JavaScript and CSS. Each has its own special characters, so the right treatment depends on the [[output-context]], the exact place in the document where a value is written. The OWASP XSS Prevention Cheat Sheet gives a rule for each:

| Context         | Template fragment                          | Safe handling                                                                                                     |
| --------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| HTML text       | `<p>{{ body }}</p>`                        | HTML-encode `&`, `<`, `>`, `"` and `'`                                                                             |
| Attribute value | `<input value="{{ name }}">`               | Always quote the value and encode it; never put data in event-handler attributes such as `onclick`                |
| URL attribute   | `<a href="{{ site }}">`                    | Parse the URL and allow only `https:` and `http:`; [[percent-encoding\|percent-encode]] values inside a query string |
| JavaScript      | `<script>const n = '{{ name }}';</script>` | Only inside a quoted string, with a JavaScript encoder; never insert code, identifiers or expressions               |
| CSS             | `<div style="color: {{ color }}">`         | Only inside a property value, checked against expected values                                                     |

[[output-encoding|Output encoding]] replaces each special character with an escape the parser reads as data. In HTML, `<` becomes the character reference `&lt;`, which the browser displays as a less-than sign instead of starting a tag. The cheat sheet warns that encoding for one context does not protect another and that "no single technique will solve XSS." A filter applied when input arrives cannot know which context the value will reach later, which is why encoding belongs at output.

### Encoding on the server

The vulnerable pattern builds HTML by pasting strings together:

```javascript
// Vulnerable: review fields are pasted into the page as HTML.
app.get('/product/:id', (req, res) => {
  const items = reviewsFor(req.params.id)
    .map((r) => `<li><b>${r.author}</b>: ${r.body}</li>`)
    .join('');
  res.send(`<ul id="reviews">${items}</ul>`);
});

// Fixed: encode each value for HTML text as it is written.
const escapeHtml = (s) =>
  String(s)
    .replaceAll('&', '&amp;') // first, so the entities added below survive
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#x27;');

app.get('/product/:id', (req, res) => {
  const items = reviewsFor(req.params.id)
    .map((r) => `<li><b>${escapeHtml(r.author)}</b>: ${escapeHtml(r.body)}</li>`)
    .join('');
  res.send(`<ul id="reviews">${items}</ul>`);
});
```

A hand-written encoder is a teaching device. In production, let the template engine do the work: [[auto-escaping]] templates encode every value by default. MDN notes that "most modern templating engines automatically perform output encoding" and that React encodes values embedded in JSX. The risk then moves to escape hatches that switch encoding off, such as Django's `safe` filter, React's `dangerouslySetInnerHTML` and Angular's `bypassSecurityTrustAs*` functions, so every use deserves review.

### Safe DOM APIs in the browser

In client-side code, the equivalent of encoding is choosing an API that treats input as text.

- **Sinks that parse HTML:** `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `document.write`.
- **Sinks that run JavaScript:** `eval()`, `new Function()`, and `setTimeout()` or `setInterval()` called with a string.
- **APIs that keep data as text:** `textContent`; `document.createElement` with `append()`, whose string arguments become text nodes; `setAttribute` for attributes that cannot hold code; and a form field's `value`.

OWASP's DOM-based XSS cheat sheet calls `textContent` "the most fundamental safe way to populate the DOM with untrusted data," and its first guideline is that untrusted data should be treated only as displayable text. Both cheat sheets add that `setAttribute` is safe only for some attributes: event handlers and `srcdoc` interpret their values as code or HTML, and an `href` still needs URL validation.

### When some HTML must survive

Reviews with bold and italic text cannot simply be encoded, because the tags would appear literally. [[sanitization|Sanitizing]] parses the markup and keeps only an [[allowlist]] of elements and attributes. OWASP recommends the DOMPurify library, says to patch it regularly, and warns: "If you sanitize content and then modify it afterwards, you can easily void your security efforts." Browsers are adding a built-in sanitizer, `Element.setHTML()`, which MDN describes as "an XSS-safe method to parse and sanitize a string of HTML" that always removes script elements, frames and event-handler attributes. MDN marks it as limited availability, not yet Baseline ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML)), so check support before relying on it.

## Worked example

The activity is to repair a toy renderer in an isolated origin. shop.example's product page fetches reviews as JSON and renders them in the browser. Each review has an `author`, a `rating` from 1 to 5, an optional `site` (the reviewer's homepage) and a plain-text `body`. Before changing anything, the team loads the renderer in a test harness on a separate origin, `https://render-test.example`, that holds no cookies or user data, so a test that runs script there exposes nothing.

**Step 1: Read the vulnerable renderer.**

```javascript
// Vulnerable toy renderer: every field is parsed as HTML.
function renderReview(list, review) {
  const li = document.createElement('li');
  li.innerHTML =
    `<a href="${review.site}">${review.author}</a> ` +
    `rated it ${review.rating}/5: ${review.body}`;
  list.append(li);
}
```

**Step 2: Map each field to its context.**

| Field    | Who controls it       | Context in the renderer | Correct handling                                      |
| -------- | --------------------- | ----------------------- | ----------------------------------------------------- |
| `author` | Any registered user   | HTML text               | Insert as a text node                                 |
| `rating` | The review form       | HTML text               | Accept only the integers 1 to 5, then insert as text  |
| `site`   | The reviewer's profile | URL in `href`          | Parse the URL; keep only `https:` and `http:` values  |
| `body`   | The review form       | HTML text               | Insert as a text node                                 |

**Step 3: Reproduce with one fixture.** In the harness, the team renders a review whose body is the classic proof:

```text
<img src=x onerror="alert(1)">
```

The alert appears. The parser built an image element, the image failed to load, and the browser ran its error handler. The fixture uses an image because `innerHTML` does not run inserted script elements; MDN's [innerHTML page](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML) uses this same example to show why that rule protects nothing.

**Step 4: Rebuild with safe APIs.**

```javascript
// Fixed: structure comes from DOM calls; data only ever becomes text.
function renderReview(list, review) {
  const li = document.createElement('li');
  const name = document.createElement('a');
  name.textContent = review.author;
  const href = safeHttpUrl(review.site);
  if (href) name.href = href;
  const r = review.rating;
  const stars = Number.isInteger(r) && r >= 1 && r <= 5 ? r : '?';
  li.append(name, ` rated it ${stars}/5: `, review.body); // strings become text nodes
  list.append(li);
}

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null; // missing, relative or malformed
  }
}
```

**Step 5: Treat the URL as its own context.** Encoding alone would not have saved the `site` field. A [[javascript-url]], one that uses the `javascript:` scheme followed by code, needs none of the five characters that HTML encoding changes, so it would pass through an encoder intact and run when someone clicks the reviewer's name. Parsing the value with the `URL` constructor and allowing only two schemes closes that path; anything else renders as a plain name without a link.

**Step 6: Retest and lock it in.** The fixture now displays as literal characters, and the browser's element inspector shows a text node instead of an image. The team adds the fixture to the renderer's unit tests, asserting that the rendered item contains no `img` element and that its text includes the fixture string, and adds a code-review check that flags any new use of `innerHTML`.

**Step 7: Allow formatting safely.** Later, product managers ask for bold and italic text in reviews. Instead of returning to raw `innerHTML`, the body goes through a sanitizer immediately before insertion and is never modified afterwards:

```javascript
const body = document.createElement('span');
body.innerHTML = DOMPurify.sanitize(review.body, { ALLOWED_TAGS: ['b', 'i'], ALLOWED_ATTR: [] });
li.append(name, ` rated it ${stars}/5: `, body); // the sanitized span replaces the raw string
```

The tests change accordingly: the fixture's image must now be removed rather than displayed, and `<b>` and `<i>` must survive.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Auto-escaping templates and safe DOM APIs.** Make the safe path the default: an auto-escaping template on the server, and `textContent` or DOM construction in the browser, with every escape hatch reviewed. _Limit:_ they protect HTML text and quoted attributes; URL, JavaScript and CSS contexts still need the rules in the context table.
- **A maintained sanitizer for rich HTML.** Allow the smallest set of elements and attributes the feature needs. _Limit:_ a loose configuration, an unpatched library or an edit made after sanitizing reopens the hole.
- **Validation of typed fields.** A rating must be an integer from 1 to 5, and a homepage must be an `https:` or `http:` URL. _Limit:_ free text must legitimately accept characters like `<` and quotes, as in "3 < 5", so validation narrows input without replacing output encoding.
- **Browser-enforced layers.** A strict [[content-security-policy]] blocks injected inline scripts and event handlers, and [[trusted-types]] make sinks such as `innerHTML` reject plain strings. [WEB-07](lesson:WEB-07) covers both. _Limit:_ MDN calls CSP "a backup defense," and OWASP says it "should not be your primary defense mechanism."
- **Containment.** `HttpOnly` session cookies keep scripts from reading the cookie, and user-uploaded HTML served from a separate site, as in [WEB-04](lesson:WEB-04), runs in its own origin. _Limit:_ injected script can still send requests that carry the cookie, as [IAM-04](lesson:IAM-04) explains.
- **Testing and review.** Keep fixtures like the one above in unit tests, and search code for sinks and escape hatches. OWASP does not recommend web application firewalls against XSS, "especially DOM-Based XSS": a payload in the URL fragment never reaches the server where such a firewall sits.

## Common misconceptions

- **"Filtering `<script>` tags on input prevents XSS."** HTML has many other ways to run script, such as event-handler attributes, and an input filter cannot know which context a value will reach. Encode or sanitize at output.
- **"HTML-encoding every value is enough."** It protects HTML text and quoted attributes. A `javascript:` URL in an `href`, or data placed inside a script block, needs different handling.
- **"Our framework makes XSS impossible."** Auto-escaping covers the common case, but `dangerouslySetInnerHTML`, `bypassSecurityTrustAs*` and server code that builds HTML by hand bypass it. OWASP adds that React 19's blocking of `javascript:` URLs "does not replace application-specific URL validation."
- **"HttpOnly cookies prevent XSS."** They hide one cookie from scripts. The injected script still acts as the user.
- **"XSS just means pop-up alerts."** The alert is a harmless proof that script ran. The real impact is everything the user can do on the site.

## Try it in the lab

In [the lab](lab:xss), a toy comment page inserts each comment into its HTML, as a server-side template would, and shows the result in a sandboxed frame (`sandbox="allow-scripts"`, with no same-origin access). The three preset payloads, a script element, an image error handler and an SVG load handler, do nothing except post a harmless marker back to the lab, so it can tell when a comment executes.

1. **Make it run.** On the Comment tab, keep rendering set to Vulnerable (raw HTML), pick a preset payload and post it. The preview reports that the payload executed, and the evidence log records it.
2. **Classify it.** The comment is saved and shown to everyone who later views the page. Name the type of XSS.
3. **See what the browser sees.** Switch rendering to Safe (escaped) and post the same payload. It now displays as text. Answer what `<` becomes once it is escaped.
4. **Neutralize it.** On the Defend tab, compare each payload under both renderers, then click Check the safe renderer to confirm that all three are inert.
5. **Name the fix** in a few words, and explain in one sentence why it is applied on output rather than on input.
6. **Find the gap.** The safe renderer encodes one context, HTML text. Using the context table, write down what it would miss if the form gained a homepage field, and how the worked example handles that field. The lab's final challenge, on a second layer of defense, continues in [WEB-07](lesson:WEB-07).

## Key takeaways

- XSS turns data into markup or code inside the victim site's own origin, so the same-origin policy grants the injected script everything the site's code can do.
- Reflected and stored describe how a payload arrives; server-side and DOM-based describe where it is mishandled. The fix is the same idea everywhere: keep data as data.
- Encode for the exact output context at the moment of writing, preferably through auto-escaping templates, and validate URLs before they reach `href` or `src`.
- In the browser, write untrusted data with `textContent` or DOM construction. When HTML must survive, sanitize it with a maintained library and leave the result untouched.
- CSP, Trusted Types and HttpOnly cookies are backup layers that limit damage, not substitutes for correct output handling.

## Go deeper

- **Safe by construction.** Christoph Kern's "Securing the Tangled Web" (_Communications of the ACM_ 57(9), 2014) describes software design patterns Google developed to prevent script injection in large applications ([Google Research](https://research.google/pubs/securing-the-tangled-web/)). Which of its ideas reappear in Trusted Types?
- **Reviewable sinks.** The W3C Trusted Types draft aims to shrink the code that can cause DOM XSS to small, isolated parts that are easier to review ([Trusted Types](https://w3c.github.io/trusted-types/dist/spec/)). Sketch a migration plan for a large application, including the role of a temporary default policy.
- **Counting versus impact.** OWASP's Top 10:2025 describes XSS as "high frequency/low impact," while the 2025 CWE Top 25 ranks it first. Compare the two methodologies ([OWASP A05:2025](https://top10.owasp.org/2025/A05_2025-Injection/), [CWE methodology](https://cwe.mitre.org/top25/archive/2025/2025_methodology.html)) and explain how each ranking can be right on its own terms.
