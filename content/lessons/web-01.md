---
topicId: WEB-01
title: Homograph attacks and Unicode confusables
summary: Why two domain names that look identical can belong to different owners, how Unicode, IDNA and Punycode make the trick possible, and how browsers and detectors tell an imitation from a legitimate international name.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish a character's code point, glyph and script, and explain why a homograph depends on the gap between them.
  - Convert a Unicode domain label to its xn-- A-label and describe what IDNA mapping does before Punycode encoding.
  - 'Classify a pair of look-alike names as single-script, mixed-script or whole-script confusables using the UTS #39 skeleton.'
  - Predict whether a browser's IDN display policy will show a label in Unicode or as Punycode, and state the limits of that policy.
  - Evaluate a homograph detection rule with a confusion matrix and justify why blocking all non-ASCII names is a poor design.
prerequisites: [CRY-01, NET-02]
concepts:
  - homograph-attack
  - confusable
  - code-point
  - glyph
  - unicode-script
  - mixed-script
  - idn
  - idna
  - punycode
  - a-label
  - u-label
  - confusable-skeleton
  - whole-script-confusable
  - restriction-level
  - idn-display-policy
labs: [homograph]
keywords:
  - IDN homograph attack
  - homoglyph
  - look-alike domain
  - Punycode
  - xn--
  - ACE prefix
  - IDNA2008
  - UTS 39
  - UTS 46
  - RFC 3492
  - RFC 5890
  - confusables.txt
  - CWE-1007
  - CAPEC-632
sources:
  - title: 'Unicode Technical Standard #39: Unicode Security Mechanisms'
    url: https://www.unicode.org/reports/tr39/
    publisher: Unicode Consortium
    license: Unicode Terms of Use
    sourceId: unicode-uts-39
  - title: 'Unicode Technical Standard #46: Unicode IDNA Compatibility Processing'
    url: https://www.unicode.org/reports/tr46/
    publisher: Unicode Consortium
    license: Unicode Terms of Use
    sourceId: unicode-uts-46
  - title: 'RFC 3492: Punycode: A Bootstring encoding of Unicode for Internationalized Domain Names in Applications (IDNA)'
    url: https://www.rfc-editor.org/rfc/rfc3492
    publisher: IETF (RFC Editor)
    license: Internet Society full copyright statement (verbatim copies permitted)
    sourceId: rfc-3492-punycode
  - title: 'RFC 5890: Internationalized Domain Names for Applications (IDNA): Definitions and Document Framework'
    url: https://www.rfc-editor.org/info/rfc5890
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-5890-idna2008
  - title: Internationalized Domain Names (IDN) in Google Chrome
    url: https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md
    publisher: The Chromium Project
  - title: Phishing with Unicode Domains
    url: https://xudongz.com/blog/2017/idn-phishing/
    publisher: Xudong Zheng
quiz:
  - question: Your browser shows `xn--n1ae5d4v.example` in the address bar instead of a readable name. What is the most accurate interpretation?
    choices:
      - The site's TLS certificate failed validation.
      - The browser's display policy judged the Unicode form risky and showed the A-label instead.
      - The domain does not exist in the DNS.
      - The page content has been encrypted with Punycode.
    answer: 1
    explanation: The A-label is the real name the DNS uses. Browsers fall back to it when a label fails their IDN display checks, here because every letter is a Cyrillic look-alike of a Latin word. Certificates and DNS are unaffected, and Punycode is an encoding, not encryption.
  - question: Which check would catch `ѕһор.example`, written entirely in Cyrillic, imitating `shop.example`?
    choices:
      - Flag any label that mixes two scripts.
      - Reject any label that fails IDNA validation.
      - "Compare the label's UTS #39 skeleton with the skeleton of the protected name."
      - Require the site to use HTTPS.
    answer: 2
    explanation: This is a whole-script confusable, so it uses one script and passes a script-mixing rule. It is also a perfectly valid IDNA label, and the attacker can get a certificate for it. Only a comparison of skeletons (or a browser rule built on one) sees that it maps to the same letters as shop.
  - question: Why is "block every domain that contains a non-ASCII character" a poor detection rule?
    choices:
      - It flags legitimate internationalized names and still misses look-alikes made only of ASCII characters.
      - Non-ASCII names never reach the DNS, so the rule can never fire.
      - It is too slow to run on every page load.
      - Punycode hides non-ASCII characters, so the rule cannot see them.
    answer: 0
    explanation: The rule has poor precision, because names like bücher.example are legitimate, and imperfect recall, because a name like mai1.example (digit one for the letter l) is pure ASCII. The URL parser exposes non-ASCII labels as xn-- A-labels, so the rule can see them; seeing them is not the problem.
  - question: In the A-label `xn--bcher-kva`, what is the part `bcher`?
    choices:
      - An encrypted copy of the label.
      - A checksum that protects the label from tampering.
      - A random suffix added by the registrar.
      - The label's ASCII characters, copied before the delimiter; `kva` encodes the ü and its position.
    answer: 3
    explanation: Punycode copies the basic (ASCII) code points first, adds a hyphen delimiter, and then encodes each non-ASCII code point and its position. That is why the encoding is reversible and why an all-Cyrillic label has no delimiter at all.
  - question: An attacker controls a perfect look-alike of `shop.example`, and a user is completely fooled by the name. Which defense still protects the user's login?
    choices:
      - Teaching users to read URLs more carefully.
      - A passkey, because the browser offers it only to the site it was registered for.
      - A longer, more complex password.
      - The padlock icon in the address bar.
    answer: 1
    explanation: A passkey is bound to the real site's domain, and the browser compares characters, not glyphs, before offering it. The look-alike is a different name, so there is nothing to phish. A password, however long, can be typed into the fake page, and the padlock only shows that the connection to the look-alike is encrypted.
---

## Why it matters

In April 2017, the researcher Xudong Zheng registered `xn--80ak6aa92e.com`, whose decoded first label is five Cyrillic letters (U+0430, U+0440, U+0440, U+04CF, U+0435). In the fonts Chrome and Firefox used, they were indistinguishable from the Latin word "apple", and Chrome, Firefox and Opera displayed the decoded name, so the address bar appeared to read `apple.com`. Zheng built the page only as a demonstration; Chrome's fix was rolling out when his post appeared, and Firefox users could force the encoded form with the `network.IDN_show_punycode` setting ([Zheng, 2017](https://xudongz.com/blog/2017/idn-phishing/)).

The idea is older. In 2002, Evgeniy Gabrilovich and Alex Gontmakher described the _homograph attack_ in _Communications of the ACM_ and, as a proof of concept, registered a version of `microsoft.com` spelled with Russian letters for the c and the o ([Gabrilovich and Gontmakher, 2002](https://cacm.acm.org/opinion/the-homograph-attack)).

What makes a [[homograph-attack]] instructive is that nothing technical fails. The attacker really owns the look-alike name, so the [[dns]] resolves it, a certificate authority will issue a valid [[certificate]] for it, and the browser shows a padlock. Only a person comparing shapes on a screen is deceived. The defense is to make software compare exact characters while still serving the many people who do not write in the Latin alphabet.

## The core idea

Start with the assumptions. The attacker can register any name a registry accepts, including internationalized names, obtain a certificate for it, and put it in front of the victim in a link, an ad, a QR code or a search result. The victim judges whether a site is genuine mostly by looking at its name.

Three things that everyday speech blurs must be kept apart:

- A **character** is an abstract unit of text, such as "Latin small letter a".
- A [[code-point]] is the number [[unicode]] assigns to it, written like U+0061. Software compares code points.
- A [[glyph]] is the shape a font draws for it. People compare glyphs.

Every character also has a [[unicode-script|script]], the writing system it belongs to, such as Latin, Cyrillic, Greek or Han; digits and punctuation share the value Common. A homograph pair is two strings whose code points differ but whose glyphs match or nearly match, and Unicode calls such strings [[confusable|confusables]]. The DNS never sees glyphs: to it, `shop.example` and a twin spelled with one Cyrillic letter are unrelated names that can have unrelated owners.

Think of identical twins: a guard comparing faces can be fooled, but a fingerprint scanner cannot. Homograph defenses check the fingerprint, the code points.

One more assumption shapes every good defense: [[idn|internationalized domain names]] are legitimate. A name like `bücher.example` (German for "books") or `学校.example` ("school") harms no one. The goal is to block _imitation of a name you protect_, not _being non-English_.

## How it works

### Characters that share a shape

Some characters from other scripts closely resemble Latin letters:

| Looks like | Character | Code point | Unicode name                   | Script   |
| ---------- | --------- | ---------- | ------------------------------ | -------- |
| a          | а         | U+0430     | CYRILLIC SMALL LETTER A        | Cyrillic |
| e          | е         | U+0435     | CYRILLIC SMALL LETTER IE       | Cyrillic |
| o          | ο         | U+03BF     | GREEK SMALL LETTER OMICRON     | Greek    |
| p          | р         | U+0440     | CYRILLIC SMALL LETTER ER       | Cyrillic |
| s          | ѕ         | U+0455     | CYRILLIC SMALL LETTER DZE      | Cyrillic |
| l          | ӏ         | U+04CF     | CYRILLIC SMALL LETTER PALOCHKA | Cyrillic |
| l          | 1         | U+0031     | DIGIT ONE                      | Common   |

Whether two glyphs look alike depends on the font, the size and the reader, so confusability is a property of rendering and perception, not of the characters. That is why Unicode publishes it as data in UTS #39, its security mechanisms standard, and says the data will keep being refined ([UTS #39](https://www.unicode.org/reports/tr39/)).

### From Unicode labels to DNS names

Host names in the DNS follow the _LDH_ rule: ASCII letters, digits and hyphens. [[idna|IDNA]] (Internationalized Domain Names for Applications) lets software use Unicode labels anyway by translating at the edges. IDNA2008 defines two forms of each label: the [[u-label|U-label]], the Unicode form people read, and the [[a-label|A-label]], an ASCII form made of the prefix `xn--` and the label's [[punycode]] encoding ([RFC 5890](https://www.rfc-editor.org/info/rfc5890)). Resolvers and name servers only ever see A-labels.

Browsers do one more thing first. The [WHATWG URL Standard](https://url.spec.whatwg.org/), which defines how browsers parse URLs, sends the host of every web address through non-transitional UTS #46 processing: it maps characters (lowercasing, folding full-width letters to ASCII, deleting certain invisible characters), applies [[unicode-normalization]] to form NFC, validates the result, and only then Punycode-encodes each non-ASCII label ([UTS #46](https://www.unicode.org/reports/tr46/)). A browser's URL parser produces these results:

```text
Typed or linked host            Host after URL parsing
SHOP.Example                    shop.example
ｓｈｏｐ.example (full-width)    shop.example
shop<U+200B>.example            shop.example          (zero-width space deleted)
bücher.example                  xn--bcher-kva.example
ѕhop.example                    xn--hop-ehd.example   (first letter Cyrillic)
ѕһор.example                    xn--n1ae5d4v.example  (every letter Cyrillic)
```

Punycode, defined in RFC 3492, copies the ASCII ("basic") code points first, adds a hyphen as a delimiter if there were any, and then encodes each non-ASCII code point and its position as a compact variable-length number ([RFC 3492](https://www.rfc-editor.org/rfc/rfc3492)). In `xn--bcher-kva`, `bcher` is the ASCII part and `kva` encodes the ü and where it goes; the all-Cyrillic `xn--n1ae5d4v` has no ASCII part and so no delimiter. Punycode is a public, reversible [[encoding]], not encryption, so software can always recover and compare the exact characters.

IDNA validation answers "is this a well-formed name?", never "is this name honest?": both `ѕhop.example` and `shop.example` are valid.

### Measuring confusability with a skeleton

UTS #39 turns "looks alike" into a test a program can run. Its [[confusable-skeleton|skeleton]] function:

1. converts the string to Normalization Form D (NFD), which splits an accented letter into a base letter and combining marks;
2. removes default-ignorable code points, such as zero-width characters;
3. replaces each character with its _prototype_ from the `confusables.txt` data file, so Cyrillic а becomes Latin a and the digit 1 becomes Latin l; and
4. applies NFD again.

Two strings are confusable when their skeletons are equal. (Version 18.0 first puts bidirectional text into display order.) A skeleton is only for comparison, never for display. Here is the idea with a tiny table:

```javascript
// Teaching sketch of the UTS #39 skeleton idea. A real implementation loads
// the full confusables.txt table and also handles bidirectional text.
const PROTOTYPE = new Map([
  ['\u0430', 'a'], // CYRILLIC SMALL LETTER A
  ['\u0435', 'e'], // CYRILLIC SMALL LETTER IE
  ['\u043e', 'o'], // CYRILLIC SMALL LETTER O
  ['\u0440', 'p'], // CYRILLIC SMALL LETTER ER
  ['\u0441', 'c'], // CYRILLIC SMALL LETTER ES
  ['\u0455', 's'], // CYRILLIC SMALL LETTER DZE
  ['\u04bb', 'h'], // CYRILLIC SMALL LETTER SHHA
  ['1', 'l'], // DIGIT ONE
]);

function skeleton(text) {
  const decomposed = text.normalize('NFD').replace(/\p{Default_Ignorable_Code_Point}/gu, '');
  const mapped = [...decomposed].map((ch) => PROTOTYPE.get(ch) ?? ch).join('');
  return mapped.normalize('NFD');
}

const confusable = (a, b) => a !== b && skeleton(a) === skeleton(b);

confusable('shop', '\u0455hop'); // true: mixed-script imitation
confusable('shop', '\u0455\u04bb\u043e\u0440'); // true: whole-script imitation
confusable('shop', 'sh\u00f6p'); // false: the diaeresis survives NFD
```

UTS #39 then sorts confusable pairs by the scripts involved, and the classes matter for defense:

- **Single-script confusables** share a script. The standard's example is the Croatian word "ljeto" spelled with the single Latin character ǉ (U+01C9) instead of l and j.
- **Mixed-script confusables** share no script, usually because one is a [[mixed-script]] string, like `ѕhop` (a Cyrillic ѕ, then Latin letters) imitating `shop`.
- **[[whole-script-confusable|Whole-script confusables]]** are mixed-script confusables in which each string uses one script: all-Cyrillic `ѕһор` imitating Latin `shop`, or the standard's example, Latin "scope" versus Cyrillic "ѕсоре".

The cheapest check, "flag any label that mixes scripts", catches the second class and misses the third. Zheng's demonstration name was a whole-script confusable.

### Restriction levels and display policies

UTS #39 also defines six [[restriction-level|restriction levels]], from ASCII-Only to Unrestricted, for how freely an identifier mixes scripts. The level Chrome builds on, Highly Restrictive, allows one script, or Latin combined with the script sets used to write Japanese, Chinese or Korean.

Browsers combine these tools into an [[idn-display-policy]] that decides, label by label, whether to show the U-label or fall back to the A-label. Chrome's documented policy ([Chromium, IDN in Google Chrome](https://chromium.googlesource.com/chromium/src/+/main/docs/idn.md)) shows Punycode when, among other checks, a label:

- contains a character UTS #39 does not allow in identifiers;
- goes beyond the Highly Restrictive level, with the added rule that Latin, Cyrillic and Greek may never mix;
- is a mixed-script confusable;
- is a whole-script confusable under a top-level domain not known to host many names in that script (for Cyrillic, examples include `ru` and `ua`); or
- belongs to a registrable domain whose skeleton, with diacritics removed, matches a popular domain.

Chrome also shows a full-page "lookalike" warning before some navigations to names whose skeleton matches a popular or frequently visited site. The diagram follows one click on a look-alike link.

```sequence
title: A look-alike link under a Chrome-style display policy
participant U as User
participant B as Browser
participant D as DNS resolver
participant S as Look-alike site
U -> B: Click a link shown as ѕhop.example
note B: URL parsing turns the host into xn--hop-ehd.example
B -> D: Look up xn--hop-ehd.example
D --> B: 203.0.113.7 (the attacker's server)
B -> S: TLS handshake for xn--hop-ehd.example
S --> B: Valid certificate for that exact name
note B: Label mixes Cyrillic and Latin, so show Punycode
B --> U: Address bar shows xn--hop-ehd.example
```

Every protocol step succeeds: the name resolves, the server proves it controls `xn--hop-ehd.example`, and the connection is encrypted. The only defense is the last step, where the user sees an unfamiliar `xn--` name instead of a convincing imitation.

## Worked example

The fictional security team at `shop.example` receives four newly registered names from a domain-monitoring feed and must decide which imitate their name. They follow the lab's steps.

**Step 1: Inspect the code points.** They paste each name into a tool that lists code points and scripts instead of trusting their eyes.

| Name             | Code points of the first label            | Scripts in that label |
| ---------------- | ----------------------------------------- | --------------------- |
| `ѕhop.example`   | U+0455 U+0068 U+006F U+0070               | Cyrillic and Latin    |
| `ѕһор.example`   | U+0455 U+04BB U+043E U+0440               | Cyrillic              |
| `shöp.example`   | U+0073 U+0068 U+00F6 U+0070               | Latin                 |
| `bücher.example` | U+0062 U+00FC U+0063 U+0068 U+0065 U+0072 | Latin                 |

**Step 2: Decode to A-labels.** The URL parser gives `xn--hop-ehd`, `xn--n1ae5d4v`, `xn--shp-tna` and `xn--bcher-kva`. None equals `shop`, so each is a separate registration with its own possible owner and certificate.

**Step 3: Compute skeletons.** Mapping prototypes gives `shop` for both `ѕhop` and `ѕһор`. For `shöp`, NFD splits ö into o plus U+0308 COMBINING DIAERESIS, and the mark survives, so the skeleton is not `shop`.

**Step 4: Classify.** `ѕhop` is a mixed-script confusable and `ѕһор` a whole-script one. `shöp` is not a confusable under UTS #39, because a visible diacritic counts as a real difference.

**Step 5: Predict the browser display.** Under a Chrome-style policy, `ѕhop` appears as Punycode because Latin and Cyrillic mix in one label, and `ѕһор` because it is a whole-script Cyrillic confusable under a non-Cyrillic top-level domain. `shöp` appears in Unicode unless `shop.example` is on the browser's popular-domain list, since only that check strips diacritics. `bücher` appears in Unicode.

**Step 6: Decide.** The team requests takedowns for the first two names and blocks them in its mail and web filters. `shöp` is a judgment call: a diaeresis is easy to miss at small sizes, so a high-value brand might flag diacritic variants too and accept more [[false-positive|false positives]]. `bücher` is left alone, because the team flags imitation of a protected name, not non-ASCII characters.

> [!ETHICS] Only test systems you own or have written permission to test.

Registering a look-alike of a real organization's name, even for a classroom demonstration, can break registrar terms and trademark law, which is why this lesson uses reserved `.example` and `.test` names.

## Defenses

- **Browser display policies.** Showing the A-label for risky labels removes the convincing imitation from the address bar. Limits: the rules are heuristics, so single-script confusables, whole-script confusables under a top-level domain for that script, and diacritic variants of less popular names pass. Other software may use a different policy or none, and the link _text_ in a message is outside the browser's control.
- **Skeleton matching against protected names.** A defender can compare the skeletons of new registrations, names in certificate logs, or URLs in incoming mail with the names they protect. This targets imitation directly and leaves legitimate internationalized names alone; script-mixing rules are a cheaper complement that misses whole-script confusables. Limits: the confusables data is incomplete, and fonts keep changing.
- **Defensive registration and monitoring.** Organizations register the most obvious look-alikes of their own names and redirect them to the real site. MITRE ATT&CK's detection advice for adversaries acquiring domains is to watch for new domains with a structure similar to your own ([T1583.001](https://attack.mitre.org/techniques/T1583%2F001/)). Limits: there are far too many variants to register them all.
- **Phishing-resistant authentication.** A [[passkey]], which is a [[webauthn]] credential, is bound to the domain it was created for, and the browser will not offer it to a different name, however similar. A [[password-manager]] that fills only on the saved site's domain helps the same way: both compare characters, not glyphs. This is the strongest defense, because it removes the payoff even when a person is fooled. Limits: it protects the login, not other data a fake page might request, such as a card number.

## Common misconceptions

- **"HTTPS prevents homograph attacks."** HTTPS proves you reached whoever controls the name in the address bar. The attacker controls the look-alike, so their certificate is valid.
- **"Blocking every non-ASCII domain solves it."** That rule blocks legitimate names in most of the world's writing systems and still misses all-ASCII look-alikes such as `mai1.example`, where the digit 1 stands in for the letter l.
- **"A script-mixing check is enough."** Whole-script confusables use one script throughout and pass it.
- **"If the address bar shows Unicode, the name is safe."** Display policies are heuristics, and they govern only the address bar, not the same name in an email or chat message.
- **"Punycode is a kind of encryption."** It is a public, reversible encoding whose value is that it makes hidden differences visible.

## Try it in the lab

[The lab](lab:homograph) runs in your browser and uses its own URL parser, so the conversions you see are real IDNA behavior. Everything concerns a fictional protected name, `campus.test`, and nothing touches the network.

1. **Compare.** On the Inspector tab, the Original field holds `campus.test` and the Modified field a look-alike. The modified row rings the character whose code point differs. Click it to see its code point, Unicode name, script and the Latin letter it imitates, which answer "Name the imposter character" and "Identify the mixed scripts".
2. **Decode.** In the Host analysis panel, record the look-alike's ASCII form for "Convert to the ASCII form". The names render alike; their ASCII forms differ.
3. **Explore.** Type `bücher.test`, then `学校.test`, into the Modified field. Both become `xn--` A-labels, and neither imitates `campus.test`. The Scripts row counts the `.test` label too, so `学校.test` lists Han and Latin; browsers, like the rule builder, judge script mixing one label at a time.
4. **Defend.** On the Rule builder tab, the starting rule blocks every non-ASCII name. Its confusion matrix shows false alarms on `bücher.test`, `résumé.test` and `学校.test`. Turn it off, turn on "Confusable skeleton match" (protecting `campus.test`), and try "Flag mixed scripts" alone and with it. Zero false positives with the Cyrillic look-alikes still caught solves "Fix the over-eager rule".
5. **Reflect.** Three suspicious names stay in the Missed column under every combination of rules. Explain in two sentences why a homograph detector cannot see them; [the next lesson](lesson:WEB-02) is about exactly those names.

## Key takeaways

- A homograph attack exploits the gap between what software compares (code points) and what people compare (glyphs), while every protocol, TLS included, works as designed.
- IDNA maps and validates a Unicode label, and Punycode turns it into an `xn--` A-label. A valid name is not necessarily an honest one.
- The UTS #39 skeleton makes "looks alike" testable, and whole-script confusables show why script-mixing checks alone fall short.
- Good detectors target imitation of protected names, not non-ASCII text, and are judged on both false positives and false negatives.
- Phishing-resistant credentials such as passkeys remove the payoff even when the name fools a person.

## Go deeper

- **The original framing.** Gabrilovich and Gontmakher's short column in _Communications of the ACM_ (vol. 45, no. 2, February 2002) anticipated much of what followed, including the role of internationalized names ([CACM](https://cacm.acm.org/opinion/the-homograph-attack)).
- **How complete is the confusables data?** Suzuki, Chiba, Yoneya, Mori and Goto built a homoglyph database from rendered glyph images: 13,208 homoglyph pairs against 6,296 in Unicode's data, with only 127 in common. Among 955,512 internationalized names in `.com`, Unicode's list alone found 436 homographs of ASCII domains, and both lists together found 3,280 ([ShamFinder, ACM IMC 2019](https://arxiv.org/pdf/1909.07539)). Open question: how should a standard define "confusable" when the answer depends on fonts that keep changing?
- **Deviation characters.** UTS #46 explains how ß, ς, ZWJ and ZWNJ let "the same name" reach different destinations during the move from IDNA2003 to IDNA2008 ([UTS #46](https://www.unicode.org/reports/tr46/)).
