---
topicId: WEB-01
title: Homograph attacks and Unicode confusables
summary: See how characters from different scripts can share a glyph, how internationalized domains are encoded with Punycode, how Unicode and browsers detect confusable and mixed-script names, and why a non-ASCII domain is not automatically malicious.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Distinguish a code point from the glyph a font draws for it.
  - Convert an internationalized label to its Punycode (xn--) form and back by reasoning.
  - Explain how Unicode UTS #39 defines confusables and mixed-script strings.
  - Describe how browsers decide whether to show a label as Unicode or as Punycode.
  - Explain why a non-ASCII domain can be perfectly legitimate.
prerequisites: [FND-01]
concepts: [homograph-attack, confusable, mixed-script, unicode, code-point, punycode, idn]
labs: [homograph]
sources:
  - title: Unicode Technical Standard #39, Unicode Security Mechanisms
    url: https://www.unicode.org/reports/tr39/
    publisher: Unicode Consortium
  - title: Unicode Technical Standard #46, Unicode IDNA Compatibility Processing
    url: https://www.unicode.org/reports/tr46/
    publisher: Unicode Consortium
  - title: RFC 3492, Punycode, A Bootstring encoding of Unicode for IDNA
    url: https://www.rfc-editor.org/rfc/rfc3492
    publisher: IETF
  - title: RFC 5890, Internationalized Domain Names for Applications (IDNA), Definitions and Document Framework
    url: https://www.rfc-editor.org/rfc/rfc5890
    publisher: IETF
  - title: Chromium Project, Internationalized Domain Names (IDN) in Google Chrome
    url: https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md
    publisher: The Chromium Projects
  - title: Mozilla Wiki, IDN Display Algorithm
    url: https://wiki.mozilla.org/IDN_Display_Algorithm
    publisher: Mozilla
quiz:
  - question: The name cаmpus.test uses a Cyrillic small letter a (U+0430) in place of the Latin a. What is its ASCII (Punycode) form?
    choices:
      - campus.test
      - xn--cmpus-4ve.test
      - xn--bcher-kva.test
      - cyrillic-campus.test
    answer: 1
    explanation: Because the label contains a non-ASCII character, IDNA encodes it to an A-label beginning with xn--. The Cyrillic-a variant of campus encodes to xn--cmpus-4ve, which looks nothing like the original.
  - question: Which is the difference between a code point and a glyph?
    choices:
      - They are the same thing
      - A code point is the number Unicode assigns a character; a glyph is the shape a font draws
      - A glyph is the number; a code point is the shape
      - A code point only exists for ASCII
    answer: 1
    explanation: U+0061 (Latin a) and U+0430 (Cyrillic a) are different code points that a font may draw with nearly identical glyphs. Confusability is a property of glyphs, not of code points.
  - question: Why do modern browsers display bücher.test as Unicode but display the Cyrillic-a campus look-alike as its xn-- form?
    choices:
      - bücher.test is older
      - bücher.test is a single-script, legitimate label, while the look-alike mixes Latin and Cyrillic in a confusable way
      - The browser cannot encode bücher.test
      - Random chance
    answer: 1
    explanation: Browser policies show a label in Unicode when it passes script and confusable checks. A single-script label like bücher is allowed; a Latin/Cyrillic mixed-script confusable is shown as Punycode so the deception is visible.
  - question: According to Unicode UTS #39, a "mixed-script" string is one whose characters
    choices:
      - Are all from the same script
      - Come from scripts with no script in common across the whole string
      - Are all ASCII
      - Contain only digits
    answer: 1
    explanation: UTS #39 computes a resolved script set as the intersection across all characters. If that intersection is empty, the string is mixed-script, which is a common spoofing signal.
  - question: A German bookstore registers bücher.test (xn--bcher-kva.test). What is the right conclusion?
    choices:
      - It is malicious because it is not ASCII
      - It should be blocked by all browsers
      - A non-ASCII domain can be entirely legitimate; context decides, not the mere presence of non-ASCII characters
      - Punycode means phishing
    answer: 2
    explanation: Internationalized domains exist so the world can use its own languages. "Non-ASCII" is not a synonym for "malicious." The signal to watch for is confusable, mixed-script impersonation of a specific target.
---

## Why it matters

Your eyes read the address bar; your computer reads bytes. A homograph attack lives in the gap between the two. An attacker registers a [[domain-name]] that *looks* identical to a trusted one but is built from different underlying characters, so the page your browser loads is not the page you think you asked for. Because the deception is visual, even a careful person who "checks the URL" can be fooled.

This is a foundational web-security topic for two reasons. First, it is a clean, concrete example of a theme that repeats across the course: identity on the web is about exact machine-level equality, and human perception is a poor substitute. Second, understanding it properly protects you from the opposite mistake — treating every non-ASCII or `xn--` domain as an attack. Most internationalized domains are ordinary businesses operating in their own language. A defender who cannot tell the difference will either miss real attacks or flag harmless sites.

> [!ETHICS]
> Only test systems you own or have written permission to test. The names in this lesson use the reserved `.test` top-level domain (RFC 6761), which can never be registered by anyone. Investigate confusable domains by *inspecting* their characters and encoding, never by attacking a live site.

## The core idea

Every character in [[unicode|Unicode]] has a [[code-point]], a number written like `U+0061`. A [[glyph]] is the shape a font draws for a code point. The trap is that *different code points can share a glyph*. The Latin small letter a is `U+0061`. The Cyrillic small letter a is `U+0430`. In almost every font they are drawn identically, yet to a computer they are as different as the letters `a` and `z`.

Now compare three fictional names:

- `campus.test` — every letter is ordinary Latin.
- `cаmpus.test` — looks the same, but the second character is Cyrillic `U+0430`, not Latin `U+0061`.
- `bücher.test` — plainly non-ASCII (a German word for "books"), and plainly *not* trying to impersonate anything.

A [[homograph-attack]] is the deliberate use of the second kind: a name whose glyphs are [[confusable]] with a target's, so it passes a glance. The third name is the honest case the defense must not break: a legitimate internationalized name. Telling these apart is the whole skill.

The key mental model: a homograph attack is a kind of [[spoofing]]. It fakes the apparent identity of a site, the same way [typosquatting](lesson:WEB-02) fakes it with misspellings and [phishing](lesson:WEB-03) fakes it with a convincing message. They are variations on one idea — making something untrusted look trusted.

## How it works

### From Unicode to the wire: IDNA and Punycode

The DNS historically carried only a narrow set of ASCII characters in host labels: letters, digits, and the hyphen. To let names use the world's scripts, the [[idna|IDNA]] system (Internationalized Domain Names in Applications) converts a Unicode label into an ASCII-compatible form before it travels over [[dns|DNS]].

RFC 5890 gives the vocabulary. A **U-label** is the human-facing Unicode form (`bücher`). An **A-label** is its ASCII encoding, which always begins with the prefix `xn--`. The encoding itself is [[punycode|Punycode]], defined in RFC 3492. Punycode copies the plain ASCII characters first, adds a hyphen delimiter, and then appends a compact code that tells a decoder which non-ASCII characters to insert and where. You do not need to compute it by hand, but you should recognize what it produces:

```text
U-label (what you read)     A-label (what DNS carries)
---------------------------------------------------------
campus.test                 campus.test          (already ASCII)
bücher.test                 xn--bcher-kva.test   (legitimate German)
cаmpus.test  (Cyrillic a)   xn--cmpus-4ve.test   (impersonation)
```

Two things jump out. First, a non-ASCII label and its `xn--` form are the *same name*; the `xn--` form is just how it is written for the wire. Second, the attacker's look-alike and the real `campus.test` encode to completely different A-labels. `xn--cmpus-4ve.test` shares no useful resemblance to `campus.test`. That is the defender's lever: machines compare A-labels, and the A-labels are not confusable even when the glyphs are.

A related standard, UTS #46, defines the processing that maps a Unicode domain to and from its ASCII form (`ToASCII` and `ToUnicode`) and smooths over historical differences between IDNA versions. It is why typing an uppercase `BÜCHER.test` and a lowercase `bücher.test` resolve to the same place.

### Detecting confusables: Unicode UTS #39

Unicode publishes security data precisely so software can flag deception. UTS #39, *Unicode Security Mechanisms*, defines a **confusable** as a string whose shape can be mistaken for another, and it ships a data file (`confusables.txt`) mapping characters to a normalized prototype. Its core operation is the *skeleton*: reduce a string to a canonical "shape signature," and two strings are confusable when their skeletons match. A detector can compute the skeleton of a suspect name and compare it against known brands.

UTS #39 also formalizes scripts. Each character has an augmented [[unicode-script|script]] set. The **resolved script set** of a string is the *intersection* of those sets across all its characters. If the intersection is non-empty, the string is single-script; if it is empty, the string is [[mixed-script]]. Our look-alike mixes Latin (`c`, `m`, `p`, `u`, `s`) with Cyrillic (the `а`), so its resolved script set is empty: it is mixed-script, a strong spoofing signal. `bücher` is entirely Latin (the `ü` is a Latin letter with a diaeresis), so it is single-script and raises no mixed-script alarm.

UTS #39 stacks these into *restriction levels*, from ASCII-Only up through Single Script and Highly Restrictive (which permits a few sensible combinations, such as Latin with Japanese), to Unrestricted. Software picks a level and treats anything looser as suspect.

### What browsers actually do

Browsers combine these ideas into a display policy, deciding per label whether to show the friendly Unicode form or fall back to the bare `xn--` form so you can see the trick. Chromium's documented rules show a label in Unicode *unless* a check fails; failures include mixing scripts outside an allowed set (Latin, Cyrillic, and Greek may not be freely mixed with each other), matching a whole-script confusable whose look-alike target uses a different script, or having a skeleton that collides with a top domain. When a label fails, Chromium shows `xn--...`, and for the most dangerous look-alikes it can show a full "Did you mean" interstitial. Firefox uses a related approach: a label is shown in Unicode if its top-level domain is on an allow list or if it meets the "Moderately Restrictive" profile of UTS #39; otherwise it is shown as Punycode.

The payoff for our fixtures is exactly what you would want. A browser following these rules displays `bücher.test` as the readable Unicode word, because it is a single-script, legitimate label. It displays the Cyrillic-`a` look-alike as `xn--cmpus-4ve.test`, because a Latin/Cyrillic mixed-script confusable fails the checks. The browser has, in effect, *translated the deception into something visible.*

## Worked example

Put yourself in the role of an analyst who receives a report: "A student says `campus.test` asked them to log in again and it looked wrong." You have the suspicious link.

1. **Inspect the characters, do not visit.** Copy the host and list its code points. You find `U+0063 U+0430 U+006D U+0070 U+0075 U+0073` for the first label. The second code point is `U+0430` — Cyrillic, not the Latin `U+0061` you expected. Already you know the name is not `campus.test`.
2. **Check the resolved script set.** The label mixes Latin and Cyrillic, so it is [[mixed-script]]. For a short English-looking brand name, that is a near-certain red flag.
3. **Compute or look up the A-label.** The name encodes to `xn--cmpus-4ve.test`. This is a different registrable name from `campus.test`; whoever controls it is not the campus.
4. **Compare skeletons.** The skeleton of the suspect label matches the skeleton of `campus`, confirming it is a deliberate confusable of that specific target rather than an unrelated word.
5. **Now test the benign control.** Run the same checks on `bücher.test`. Code points include `U+00FC` (a Latin letter), the label is single-script Latin, and its skeleton does not match a protected brand. It encodes to `xn--bcher-kva.test`. Conclusion: legitimate internationalized name, not an attack.

The investigation never required loading either site. Everything you needed was in the characters themselves. That is the habit the [homograph lab](lab:homograph) builds: reach a verdict from evidence — code points, scripts, and Punycode — rather than from how a page looks.

## Defenses

- **Browser display policies.** The first line of defense is the one described above: browsers already down-convert suspicious labels to `xn--` and warn on known look-alikes. Its limit: policies balance safety against breaking the many legitimate IDNs, so they are heuristic. A clever single-script confusable (for example, an all-Cyrillic string shaped like a Latin word) can still slip through if the target brand is not specifically protected.
- **Registry and registrar policies.** Many registries restrict which scripts may be mixed in a label or reserve confusable variants. Its limit: policies vary widely across the thousands of top-level domains, and an attacker shops for a permissive one.
- **Confusable and mixed-script detection in your own software.** Security tools, mail filters, and link scanners can apply UTS #39 skeletons and resolved-script checks to flag suspicious names at scale. Its limit: skeleton matching needs a list of protected targets, and whole-script confusables produce false positives on ordinary foreign-language text, so detection must be tuned, not absolute.
- **Not trusting the glyph.** For people, the durable defense is to verify destinations by means other than appearance: use bookmarks for sensitive sites, let a password manager bind credentials to the exact origin (it will refuse to autofill on a look-alike), and treat any unexpected "log in again" prompt as suspect. Its limit: this depends on habit and good tools, which is why the technical layers above matter.

No single layer is sufficient, which is why they are stacked. This is [defense in depth](lesson:FND-01) applied to identity on the web.

## Common misconceptions

- **"A domain with `xn--` or non-ASCII characters is an attack."** No. `xn--bcher-kva.test` is just `bücher.test`, a normal name in German. Internationalized domains exist so the world is not forced into ASCII. The signal is confusable, mixed-script impersonation of a *specific* target, not the mere presence of non-ASCII.
- **"If it looks identical, it is identical."** Identical glyphs can be different [[code-point|code points]]. Your browser and your tools compare the underlying characters and the A-label, and so should you.
- **"Only exotic scripts are a problem."** Some of the most effective look-alikes use characters very close to Latin, including other Latin letters with marks or digits shaped like letters. It is about glyph similarity, not how "foreign" a script seems.
- **"Punycode is a security feature."** Punycode is an [[encoding]], not a protection. It is keyless and fully reversible; anyone can convert back and forth. Its role here is to make a name representable in DNS and, as a side effect, to make a disguised name visible when a browser chooses to show the `xn--` form.
- **"The https padlock means the site is who I think it is."** A certificate proves control of *that* domain, including a look-alike one. An attacker can get a valid certificate for `xn--cmpus-4ve.test`. The padlock says the connection is encrypted, not that the name is the one you meant.

## Try it in the lab

Open the [homograph lab](lab:homograph). You will inspect a set of fictional domains built on the reserved `.test` names from this lesson, including `campus.test`, the Cyrillic-`a` look-alike that encodes to `xn--cmpus-4ve.test`, and the benign `bücher.test` (`xn--bcher-kva.test`). For each one you will:

- break the host into code points and spot the out-of-place character;
- compute its scripts and decide whether it is single-script or mixed-script;
- read its Punycode A-label; and
- then design a detection rule and evaluate it against the whole set, measuring where it correctly flags the impersonation and where it wrongly flags the legitimate German name.

That last step is the real lesson: a good rule catches the attack *without* punishing legitimate international names. The lab runs entirely in your browser using the Unicode and IDNA processing already built into it, so you are observing real behavior, not a simulation.

## Go deeper

Graduate readers can start with the paper that named the problem: Evgeniy Gabrilovich and Alex Gontmakher, "The Homograph Attack," *Communications of the ACM* 45(2), February 2002, which demonstrated a Cyrillic look-alike of a well-known domain years before IDNs were widely deployed. Read it alongside the current UTS #39 to see how the defense matured from "this is possible" into a precise, data-driven specification.

Three directions reward further study. First, examine the *skeleton* algorithm in UTS #39 in detail, including how it interacts with Unicode normalization (NFC/NFD) and with the bidirectional algorithm for right-to-left scripts; confusable detection is subtle precisely because "the same shape" is hard to define formally. Second, study whole-script confusables, where every character comes from one non-Latin script yet the whole string mimics a Latin word. These defeat naive mixed-script checks and force policies to consider the target's script, which is why browser rules special-case certain top-level domains. Third, connect this to the broader detection pipeline: certificate transparency logs and passive DNS let defenders discover newly registered confusable and look-alike domains near the moment they appear, turning a reactive problem into a monitoring one. A good capstone question: design a confusable-domain monitor for a fictional institution, and quantify its false-positive cost against the real multilingual domains it must tolerate.
