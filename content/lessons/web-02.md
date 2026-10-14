---
topicId: WEB-02
title: Typosquatting and misleading URL structure
summary: How attackers register names that are almost right and build links whose familiar parts are decoration, and how to find the one part of a URL that decides who controls the destination.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Identify each component of a URL and state which components decide which server the browser reaches.
  - Find a host's registrable domain from its public suffix and explain why it marks the boundary of control.
  - Classify a look-alike link as a typosquat, combosquat, homograph or misleading-structure trick, and explain how each pattern deceives.
  - Recommend defenses for an organization, including fixing open redirects and keeping one trusted domain, and state the limits of each.
prerequisites: [WEB-01, NET-02]
concepts:
  - typosquatting
  - combosquatting
  - lookalike-domain
  - url
  - registrable-domain
  - public-suffix
  - subdomain
  - top-level-domain
  - userinfo
labs: [homograph]
keywords:
  - typosquatting
  - URL hijacking
  - combosquatting
  - cybersquatting
  - look-alike domain
  - misleading subdomain
  - eTLD+1
  - Public Suffix List
  - userinfo
  - open redirect
  - CAPEC-630
  - T1583.001
  - RFC 6761
sources:
  - title: URL Standard
    url: https://url.spec.whatwg.org/
    publisher: WHATWG
  - title: Public Suffix List
    url: https://publicsuffix.org/
    publisher: Mozilla (community-maintained)
  - title: 'CAPEC-630: TypoSquatting'
    url: https://capec.mitre.org/data/definitions/630.html
    publisher: The MITRE Corporation
    license: CAPEC Terms of Use (royalty-free license)
    sourceId: mitre-capec
  - title: 'Acquire Infrastructure: Domains (T1583.001)'
    url: https://attack.mitre.org/techniques/T1583%2F001/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'RFC 6761: Special-Use Domain Names'
    url: https://www.rfc-editor.org/info/rfc6761
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-6761-special-use-domains
quiz:
  - question: Which part of `https://bank.example.account-verify.test/login` tells you who controls the site?
    choices:
      - The scheme, `https`.
      - The first labels, `bank.example`.
      - The registrable domain, `account-verify.test`.
      - The path, `/login`.
    answer: 2
    explanation: Control follows the registrable domain, the public suffix plus one label, read from the right. Whoever registered account-verify.test controls every name that ends in it, including the decorative bank.example prefix. HTTPS only says the connection to that owner is encrypted.
  - question: A link reads `https://bank.example@account-verify.test/`. Where does the browser connect?
    choices:
      - To account-verify.test, because everything before the @ is userinfo.
      - To bank.example, because it appears first.
      - To bank.example first and then to account-verify.test.
      - Nowhere, because a URL cannot contain an @ sign.
    answer: 0
    explanation: In a URL, text before an @ in the authority is a username (and optional password). The URL Standard flags credentials as a validation error but still parses the URL, so the host after the @ is the only destination.
  - question: Why can't software find a registrable domain by simply taking the last two labels of a host?
    choices:
      - Because hosts are read from left to right.
      - Because the DNS stores labels in random order.
      - Because only top-level domains can be registered.
      - Because some public suffixes have more than one label, such as co.uk, so the registrable domain can have three or more labels.
    answer: 3
    explanation: The registrable domain is the public suffix plus one label, and a public suffix can be several labels long. That is why browsers ship the Public Suffix List instead of guessing, and why "last two labels" misjudges names under multi-label suffixes.
  - question: Which of these is a combosquat of `bank.example`?
    choices:
      - '`bnak.example`'
      - '`bank-example-rewards.test`'
      - '`login.bank.example`'
      - '`https://bank.example/rewards`'
    answer: 1
    explanation: A combosquat keeps the brand intact and adds words, so it passes a quick glance without any misspelling. bnak.example is a transposition typosquat, while login.bank.example and the rewards path both belong to the real owner.
  - question: 'A link starts with the genuine host: `https://bank.example/go?to=https://account-verify.test/`. What is the most accurate assessment?'
    choices:
      - It is safe, because the host is genuine.
      - It is invalid, because a query cannot contain a URL.
      - It is not necessarily safe, because an open redirect on bank.example would forward the browser to account-verify.test.
      - It is safe, because browsers ignore query strings.
    answer: 2
    explanation: The host decides the first server, but that server can send the browser anywhere. If bank.example forwards to any address named in a parameter, its own trusted name becomes a phishing hop. The fix belongs to the site, which should only redirect to an allowlist of destinations.
---

## Why it matters

People who check a link before clicking usually read it from left to right, and a familiar name near the start is reassuring. Attackers exploit that habit in two ways. They register names that are almost right, with a misspelling, an extra word or a different ending, and they build links in which the familiar part is decoration while the part that matters sits further to the right.

MITRE's catalog of attack patterns states the first trick plainly: in [[typosquatting]], "An adversary registers a domain name with at least one character different than a trusted domain" ([CAPEC-630](https://capec.mitre.org/data/definitions/630.html)). MITRE ATT&CK lists acquiring domains as a resource-development step that supports phishing, drive-by compromise and command and control, and notes that adversaries may choose names similar to legitimate ones, including through homoglyphs ([T1583.001](https://attack.mitre.org/techniques/T1583%2F001/)). Such names cost little, and they can carry valid certificates like any other name.

This lesson teaches a mechanical skill: given any URL, find the one part that decides who controls the destination. The rule takes minutes to learn, works on every URL, and makes most of the tricks below collapse.

## The core idea

State the assumptions first. The attacker can register any available name under a public suffix, controls every subdomain beneath it, and can write anything they like in the rest of a link: the username, the path, the query and the fragment. The victim sees the link as text, often truncated, and judges it by the familiar words it contains.

The key fact is that control on the web follows the [[registrable-domain]]. Whoever registers `account-verify.test` controls `bank.example.account-verify.test` and every other name that ends in `.account-verify.test`. The browser connects to the host; the link's author chose every other part freely, and none of those parts changes who answers.

An analogy: think of the registrable domain as an office building and its subdomains as signs on the doors. The owner can paint any sign on any door, including one that says "bank.example". A sign tells you nothing until you know whose building it is, and the building's name is always at the right-hand end of the host.

## How it works

### The anatomy of a URL

A [[url]], as the WHATWG URL Standard models it, splits into the components below. The example is `https://login.bank.example:8443/statements?month=09#latest`.

| Component             | Value in the example | Decides which server answers?     |
| --------------------- | -------------------- | --------------------------------- |
| Scheme                | `https`              | Yes: the protocol                 |
| Username and password | (none)               | No                                |
| Host                  | `login.bank.example` | Yes                               |
| Port                  | `8443`               | Yes: which service on that host   |
| Path                  | `/statements`        | No                                |
| Query                 | `?month=09`          | No                                |
| Fragment              | `#latest`            | No, and it is not sent to servers |

Only the scheme, host and port decide which server answers. Together they form the [[origin]], the subject of [Origins, sites, and browser isolation](lesson:WEB-04).

The part of an authority before an @ sign is [[userinfo]], a username with an optional password. The URL Standard treats credentials in a URL as a validation error ("invalid-credentials"), but the error is non-fatal: parsing succeeds, and the browser connects to whatever host follows the @ ([URL Standard](https://url.spec.whatwg.org/)).

### Finding the registrable domain

A host's labels are separated by dots, and delegation runs from right to left: each label is assigned by whoever controls the name to its right. The rightmost label is the [[top-level-domain]]. A [[public-suffix]] is a suffix under which anyone can register names, such as `com`, `co.uk` or `pvt.k12.ma.us`. The Public Suffix List, a Mozilla initiative maintained as a community resource, records these suffixes so that software does not have to guess ([Public Suffix List](https://publicsuffix.org/)). The registrable domain is the public suffix plus the one label to its left, and everything further left is a [[subdomain]] controlled by the registrable domain's owner.

The URL Standard defines the registrable domain the same way. Its examples include `www.example.com`, whose registrable domain is `example.com`, and a shared-hosting domain that is itself listed as a public suffix, so that each customer's site under it counts as a separate registrable domain. The standard also warns that registrable domains are not a hard security boundary and recommends the origin for security decisions.

The shortcut "take the last two labels" fails whenever a suffix has more than one label. This sketch applies the right-to-left rule with a toy suffix list that includes an invented two-label suffix, `co.example`:

```javascript
// Teaching sketch: who controls a link's host? Real code must use the full
// Public Suffix List, for example through a maintained library.
const PUBLIC_SUFFIXES = new Set(['example', 'test', 'co.example']);

function registrableDomain(hostname) {
  const labels = hostname.split('.');
  for (let i = 0; i < labels.length; i++) {
    const candidate = labels.slice(i).join('.'); // longest suffix first
    if (PUBLIC_SUFFIXES.has(candidate)) {
      return i === 0 ? null : labels.slice(i - 1).join('.');
    }
  }
  return null; // an IP address or an unknown suffix: treat as untrusted
}

const controlledBy = (link) => registrableDomain(new URL(link).hostname);

controlledBy('https://login.bank.example/statements'); // 'bank.example'
controlledBy('https://bank.example.account-verify.test/'); // 'account-verify.test'
controlledBy('https://bank.example@account-verify.test/'); // 'account-verify.test'
controlledBy('https://shop.co.example/'); // 'shop.co.example', not 'co.example'
```

`new URL()` only parses text; it makes no network request, so it is a safe way to take a suspicious link apart.

### Patterns of look-alike names

A [[lookalike-domain]] is chosen to be mistaken for a protected one. Against the fictional `bank.example`, typical patterns look like this:

| Pattern                       | Example                    | The trick                           |
| ----------------------------- | -------------------------- | ----------------------------------- |
| Omission                      | `bnk.example`              | A letter left out                   |
| Repetition                    | `bannk.example`            | A letter doubled                    |
| Transposition                 | `bnak.example`             | Two letters swapped                 |
| Adjacent-key substitution     | `bsnk.example`             | A neighboring key on the keyboard   |
| Look-alike ASCII              | `rnail.example`            | "rn" read as "m" in `mail.example`  |
| Missing dot                   | `wwwbank.example`          | The dot after "www" dropped         |
| Different top-level domain    | `bank.test`                | The right name, the wrong suffix    |
| [[combosquatting]]            | `bank-example-login.test`  | The brand intact, plus extra words  |
| Homograph                     | `bаnk.example`             | A Cyrillic а ([WEB-01](lesson:WEB-01)) |

The first six wait for someone to mistype the name or rely on a reader missing a small difference. A combosquat needs no mistake at all: the real brand appears intact, so it passes a quick glance. The missing-dot row shows how one dropped character moves a link from a subdomain the owner controls (`www.bank.example`) to a name anyone could register (`wwwbank.example`).

### Misleading structure

A second family of tricks abuses the grammar of a URL instead of the spelling of a name. Every link below mentions `bank.example`, yet the browser's URL parser reports the host on the right:

```text
Link as written                                           Host the browser connects to
https://bank.example@account-verify.test/                 account-verify.test  (bank.example is a username)
https://bank.example:443@account-verify.test/             account-verify.test  (443 is a password, not a port)
https://bank.example.account-verify.test/login            bank.example.account-verify.test
https://account-verify.test/bank.example/login            account-verify.test  (name in the path)
https://account-verify.test/?next=https://bank.example/   account-verify.test  (name in the query)
https://account-verify.test/#bank.example                 account-verify.test  (name in the fragment)
http://192.0.2.10/bank.example/login                      192.0.2.10           (no domain name at all)
```

The third line is a misleading subdomain: its registrable domain is `account-verify.test`, and the familiar prefix is a door sign the attacker painted.

A subtler case starts at the genuine host. If `bank.example` has an [[open-redirect]], an endpoint that forwards visitors to any address named in a parameter, a link can honestly begin with `https://bank.example/` and still end on the attacker's page. The diagram follows Alice's browser through that hop.

```sequence
title: An open redirect turns a genuine link into a phishing hop
participant A as Alice's browser
participant R as bank.example
participant S as account-verify.test
A -> R: GET /go?to=https://account-verify.test/
R --> A: 302 Found, Location: https://account-verify.test/
note A: The browser follows the redirect automatically
A -> S: GET /
S --> A: 200 OK, a page styled like bank.example
note A: The address bar now shows account-verify.test
```

The link Alice checked was honest about its first host. The flaw is a [[vulnerability]] in `bank.example`'s own code, and only the site can fix it. Link shorteners go further and hide the destination completely, and an email can display one address while linking to another, which [the next lesson](lesson:WEB-03) examines.

## Worked example

The fictional help desk at `bank.example` has eight reported links in its queue. The analyst never clicks them. For each one she parses the URL, takes the host, finds its registrable domain and compares it with `bank.example`; only then does she name the pattern.

| #   | Link                                                      | Registrable domain          | Verdict and pattern                        |
| --- | --------------------------------------------------------- | --------------------------- | ------------------------------------------ |
| 1   | `https://login.bank.example/statements`                   | `bank.example`              | Genuine subdomain                          |
| 2   | `https://bank.example.account-verify.test/login`          | `account-verify.test`       | Suspicious: misleading subdomain           |
| 3   | `https://bank.example@account-verify.test/`               | `account-verify.test`       | Suspicious: userinfo trick                 |
| 4   | `https://bnak.example/`                                   | `bnak.example`              | Suspicious: transposition typosquat        |
| 5   | `https://bank-example-support.test/`                      | `bank-example-support.test` | Suspicious: combosquat                     |
| 6   | `https://account-verify.test/bank.example/login`          | `account-verify.test`       | Suspicious: brand only in the path         |
| 7   | `http://192.0.2.10/bank.example/login`                    | none (an IP address)        | Suspicious: no name, and no TLS            |
| 8   | `https://bank.example/go?to=https://account-verify.test/` | `bank.example`              | Genuine host, suspicious destination       |

**Step 1: Parse, do not eyeball.** She copies each link as text and runs it through the URL parser (the sketch above, or the same `new URL()` call in a scratch page). Row 3 shows why: by eye it starts with the bank's name, but the parser puts `bank.example` in the username.

**Step 2: Compare registrable domains.** Only rows 1 and 8 share the protected registrable domain. Everything else belongs to someone else, however familiar it looks.

**Step 3: Name the pattern.** Rows 4 and 5 are names someone registered to resemble the bank. Rows 2, 3 and 6 use the bank's name only as decoration on the attacker's own domain. Row 7 avoids names entirely and uses plain HTTP, so there is no certificate to check.

**Step 4: Respond by pattern.** Typosquats and combosquats go to the brand-protection process for takedown and blocking. For rows 2, 3 and 6, the registrable domain `account-verify.test` is what gets blocked, since the bank's name is incidental. Row 8 goes to the bank's own web team as a bug report: a correct registrable domain is necessary for trust but not sufficient.

> [!ETHICS] Only test systems you own or have written permission to test.

The examples use `.example` and `.test`, names that RFC 6761 reserves so that registrars must not register them; that is why documentation and labs use them ([RFC 6761](https://www.rfc-editor.org/info/rfc6761)).

## Defenses

- **Teach the right-to-left rule.** Find the public suffix, add one label, and judge only that. Limits: people are busy, links are truncated in small windows and previews, and a long host buries its registrable domain.
- **Use the Public Suffix List in software.** Browsers can use the list to highlight the most important part of a domain name and to stop "supercookies" from being set on public suffixes. Mail and web filters can compute every link's registrable domain and compare it with protected names. Limits: the list is maintained by people, so a new suffix can be missing for a while.
- **Keep one trusted domain.** Put services under subdomains of the name customers already know. Every extra marketing or support domain teaches people to accept unfamiliar names, which is exactly the habit combosquats exploit.
- **Register and redirect the obvious variants.** CAPEC's mitigation for typosquatting is to buy likely typo domains and forward them to the legitimate one. Limits: the variants are effectively unlimited.
- **Monitor new registrations.** ATT&CK's detection advice is to watch domain registration data for names with a structure similar to your own. Limits: detection does not stop a campaign that starts the same day, and dispute or takedown processes take time.
- **Fix open redirects.** Avoid taking redirect targets from request parameters. Where one is needed, map a short identifier to a fixed list of destinations, or check the target against an [[allowlist]].
- **Use phishing-resistant sign-in.** A [[passkey]] or a [[password-manager]] matches the exact domain it was saved for, so neither one is offered on `bnak.example` or `bank.example.account-verify.test`.

## Common misconceptions

- **"The name at the start of the host is the site."** The left side holds subdomains; the owner is named at the right.
- **"If the brand appears in the URL, the link belongs to the brand."** Every part except the registrable domain can be written by anyone.
- **"The registrable domain is the last two labels."** Not under multi-label suffixes such as `co.uk`.
- **"An @ in a link is an email address."** In a URL it ends the userinfo, and the host follows it.
- **"HTTPS means the link is safe."** A certificate proves control of a name, not good intentions, and a typosquat's owner can get one.

## Try it in the lab

[The lab](lab:homograph) contains three all-ASCII imitations of its fictional protected name, `campus.test`, and a challenge built on misleading structure.

1. **Read the real destination.** Solve the challenge of that name: a fictional message shows the text "campus.test" but links to `campus.test.evil-login.test`. Apply the right-to-left rule and enter the registrable domain.
2. **See what homograph tools miss.** On the Inspector tab, type `canpus.test` and then `campus-test.test` into the Modified field. Both are pure ASCII and pure Latin, and neither has a Punycode form, so nothing looks unusual to the character-level tools.
3. **Confirm the blind spot.** On the Rule builder tab, check that `canpus.test`, `campus-test.test` and `campus.test.evil-login.test` stay in the Missed column under every combination of the three rules.
4. **Design better rules on paper.** Write three extra checks: (a) flag a host that contains `campus.test` but whose registrable domain is something else; (b) flag a registrable label one edit away from `campus` (one letter inserted, deleted, replaced or swapped); (c) flag the protected name with its dot replaced by a hyphen. Apply your rules by hand to all twelve dataset names and fill in a confusion matrix. Do they catch the three missed names without flagging `mail.campus.test` or `library.test`?

## Key takeaways

- Control follows the registrable domain: the public suffix plus one label, read from the right. Everything to its left was chosen by its owner.
- Typosquats and combosquats imitate a name; misleading-structure links hide the real host behind userinfo, subdomains, paths, queries or redirects.
- Parse links with a real URL parser and the Public Suffix List instead of reading them by eye.
- A genuine host is necessary but not sufficient: open redirects turn trusted names into phishing hops.
- Organizations reduce exposure by keeping one trusted domain, registering obvious variants, monitoring registrations and fixing redirects.

## Go deeper

- **Why registrable domains are not a security boundary.** The URL Standard defines public suffixes and registrable domains but warns against relying on them as a hard boundary, and points to origins instead ([URL Standard](https://url.spec.whatwg.org/)). Compare the two definitions and find a case where they disagree.
- **A list that software depends on.** The Public Suffix List is a community resource that browsers and other software use to make security and display decisions ([Public Suffix List](https://publicsuffix.org/)). Open question: what goes wrong, and for whom, when a copy of the list is out of date?
- **Measuring a URL classifier.** Most links in ordinary mail are benign, so a filter with a small false-positive rate can still bury analysts in false alarms. Work through the [[base-rate-fallacy]] before trusting any detector's headline accuracy, including the rules you design in the lab.
