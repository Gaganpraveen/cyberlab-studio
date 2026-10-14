---
topicId: WEB-02
title: Typosquatting and misleading URL structure
summary: Learn to read a URL the way a browser does, find the one part that identifies who you are really talking to, and recognize typosquatting, deceptive subdomains and paths, and the userinfo trick.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 26
objectives:
  - Break a URL into its scheme, authority, path, query, and fragment.
  - Identify the registrable domain and explain why it, not the whole string, identifies the owner.
  - Recognize typosquatting, combosquatting, deceptive subdomains, path deception, and the userinfo@ trick.
  - Choose defenses that rely on the real destination rather than on appearance.
prerequisites: [FND-01, WEB-01]
concepts: [typosquatting, url, registrable-domain, public-suffix, domain-name]
labs: [homograph]
sources:
  - title: RFC 3986, Uniform Resource Identifier (URI), Generic Syntax
    url: https://www.rfc-editor.org/rfc/rfc3986
    publisher: IETF
  - title: WHATWG URL Standard
    url: https://url.spec.whatwg.org/
    publisher: WHATWG
  - title: Public Suffix List
    url: https://publicsuffix.org/
    publisher: Mozilla Foundation
  - title: MDN Web Docs, What is a URL?
    url: https://developer.mozilla.org/en-US/docs/Learn_web_development/Howto/Web_mechanics/What_is_a_URL
    publisher: Mozilla
  - title: MITRE ATT&CK, Acquire Infrastructure, Domains (T1583.001)
    url: https://attack.mitre.org/techniques/T1583/001/
    publisher: MITRE
  - title: "Kintis et al., Hiding in Plain Sight: A Longitudinal Study of Combosquatting Abuse (ACM CCS 2017)"
    url: https://astrolavos.gatech.edu/articles/1708.08519.pdf
    publisher: Georgia Institute of Technology
quiz:
  - question: In the URL https://login.example.test/campus.test/sso, which part identifies the server you are actually talking to?
    choices:
      - campus.test in the path
      - login.example.test, the host
      - sso at the end
      - https
    answer: 1
    explanation: The host is the authority, read before the first single slash. Everything after that first slash is a path on that host. Here you are talking to example.test, and "campus.test" is just a folder name on it.
  - question: For the host app.store.example.co.uk, what is the registrable domain?
    choices:
      - example.co.uk
      - store.example.co.uk
      - co.uk
      - app.store.example.co.uk
    answer: 0
    explanation: co.uk is a public suffix, so the registrable domain is the public suffix plus the one label before it, example.co.uk. The app and store labels are subdomains the same owner controls.
  - question: What does the host of https://campus.test@login.example.test/ resolve to?
    choices:
      - campus.test
      - login.example.test
      - Both, split evenly
      - Neither; the URL is invalid
    answer: 1
    explanation: Anything before the @ is the userinfo, not the host. The real host is login.example.test. The userinfo "campus.test" is there to mislead a reader, which is why RFC 3986 flags it as a semantic attack.
  - question: A message links to campus-login.example instead of campus.test. This is an example of
    choices:
      - A homograph attack
      - Combosquatting
      - A valid subdomain of campus.test
      - Certificate pinning
    answer: 1
    explanation: Combining a recognizable name with an extra word in a brand-new registrable domain is combosquatting. It is a different registrable domain from campus.test, so its owner is unrelated.
  - question: Why is reading a URL right-to-left (from the TLD inward) a useful habit?
    choices:
      - URLs are written in reverse
      - The registrable domain sits just left of the public suffix, so you find the real owner first and ignore misleading labels further left
      - It makes the URL shorter
      - Browsers require it
    answer: 1
    explanation: The owner is determined by the public suffix plus the label immediately to its left. Reading inward from the right finds that anchor before deceptive subdomains or paths can distract you.
---

## Why it matters

A URL is the web's way of answering "who am I talking to?" Attackers spend enormous effort making that answer *look* like a trusted site while pointing somewhere else. Unlike the [homograph attacks](lesson:WEB-01) of the last lesson, these tricks usually need no exotic characters at all. They exploit something simpler: most people never learned exactly how a URL is structured, so they read it like a sentence, left to right, and trust whichever familiar word they see first.

Reading a URL correctly is one of the highest-value skills in everyday security. It is the difference between clicking a link in a message and knowing, before you click, which server will actually receive your password. The same skill underpins [phishing analysis](lesson:WEB-03), and it is cheap to teach and hard to unlearn once it clicks.

> [!ETHICS]
> Only test systems you own or have written permission to test. Every example here uses the reserved domains `example.test`, `campus.test`, and `bank.example` (RFC 2606 and RFC 6761), which cannot belong to a real organization. Practice reading and classifying URLs; do not register look-alike domains or send anyone a deceptive link.

## The core idea

A [[url|URL]] has a fixed grammar, and one part of it carries all the trust. RFC 3986 defines the general shape, and MDN draws it this way:

```text
 https://  login.example.test  :443   /campus/sso   ?next=/home   #top
 \_____/   \________________/  \__/    \_________/   \_________/   \__/
  scheme         host          port       path          query     fragment
          \__________________________/
                   authority
```

The piece that answers "who am I talking to?" is the **host**, inside the authority. And within the host, not every label is equal. The owner of a site is identified by its **[[registrable-domain|registrable domain]]**: the [[public-suffix|public suffix]] (such as `com`, `org`, or `co.uk`) plus the one label immediately to its left.

- In `www.example.com`, the public suffix is `com`, so the registrable domain is `example.com`.
- In `app.store.example.co.uk`, the public suffix is `co.uk`, so the registrable domain is `example.co.uk`.

Everything to the *left* of the registrable domain is a [[subdomain]], which the same owner controls. Everything to the *right* of the first single slash is a path, which is just a location *on* that server. The single most useful habit in this lesson: **find the registrable domain, and ignore the rest when deciding who you are talking to.** Because the registrable domain sits just left of the suffix, reading the host right-to-left finds the real owner first.

## How it works

### What counts as "the same site"

The boundary between "a label the owner controls" and "a suffix anyone can register under" is not something you can guess from the dots. Is `github.io` a public suffix? Yes — so `whatwg.github.io` is its *own* registrable domain, not a subdomain of some `github.io` owner. This information lives in the **Public Suffix List**, a community-maintained list that browsers use to, in its own words, highlight "the most important part of a domain name" and to stop one site from setting cookies for a whole suffix. The WHATWG URL Standard builds its definitions of "public suffix" and "registrable domain" directly on that list.

This matters because attackers exploit the gap between what *looks* like the important part and what *is*. Consider these fictional hosts, all of which a careless reader might associate with `campus.test`:

```text
Host                              Registrable domain   Same owner as campus.test?
-----------------------------------------------------------------------------------
campus.test                       campus.test          yes (it is campus.test)
mail.campus.test                  campus.test          yes (a subdomain)
campus.test.login-portal.example  login-portal.example no  (campus.test is a subdomain label!)
campus-login.example              campus-login.example no  (a different registrable domain)
campus.test@login.example.test    login.example.test   no  (campus.test is userinfo, see below)
```

Row three is the classic subdomain trick: `campus.test.login-portal.example` contains the literal text `campus.test`, but the registrable domain is `login-portal.example`. Reading right-to-left, you reach the real owner before the decoy.

### Families of look-alike names

MITRE's ATT&CK framework catalogs how adversaries "acquire domains that are similar to legitimate domains" for targeting (technique T1583.001). The main families:

- **[[typosquatting|Typosquatting]]**: a near-miss spelling that catches typos, such as `caompus.test`, `campuss.test`, or `cmpus.test`. Dropping, doubling, transposing, or neighboring-key substitutions are all common.
- **Combosquatting**: the real name plus an extra word in a brand-new registrable domain, such as `campus-login.example` or `secure-campus.example`. Nothing is misspelled; the name is simply *not* the real one.
- **Different top-level domain**: the exact name under another [[top-level-domain|TLD]], such as `campus.example` when the real site is `campus.test`. ATT&CK explicitly notes adversaries "may use a different top-level domain (TLD) than the legitimate one."
- **Homograph / IDN look-alikes**: confusable characters, the subject of the [previous lesson](lesson:WEB-01). ATT&CK lists these as "homoglyphs" and "internationalized domain names."
- **Deceptive subdomains and paths**: putting the trusted name where it has no authority — as a subdomain label (`campus.test.evil.example`) or as a path (`evil.example/campus.test/login`).

### The userinfo trick

RFC 3986 allows an optional **[[userinfo|userinfo]]** component before the host, separated by an `@`. It was meant for credentials, and the "`user:password`" form is now deprecated, but the structure survives and is a gift to attackers. The rule the browser follows: *everything before the `@` is userinfo; the host is what comes after it.* So:

```text
https://campus.test@login.example.test/session
                   ^
                   everything before @ is userinfo, NOT the host
host = login.example.test
```

RFC 3986 names this directly in its "Semantic Attacks" section, with the example `ftp://cnn.example.com&story=breaking_news@10.0.0.1/top_story.htm`. A reader sees `cnn.example.com` and assumes that is the host; in fact the host is `10.0.0.1`, and the "`cnn.example.com&story=breaking_news`" is userinfo designed to mislead. The RFC warns that such a component "could be much longer than the example above," pushing the real host off the visible part of the address bar. It even suggests that clients render userinfo distinctly to reduce the risk, "although there is no panacea." Modern browsers often strip or warn about credentials in links for exactly this reason, but you should be able to spot the `@` yourself.

## Worked example

You receive a message: "Your `campus.test` library account needs reverification," with a button. You long-press to reveal the link rather than tapping it, and you see:

```text
https://campus.test.account-verify.example/library/login?ref=campus.test
```

Work it the disciplined way:

1. **Find the first single slash.** Everything before it is the authority: `campus.test.account-verify.example`. Everything after it (`/library/login?...`) is path and query on that host. The `campus.test` in the query string is just a parameter value and carries no authority at all.
2. **Read the host right-to-left.** The public suffix is `example`-style TLD; the label just left of it is `account-verify`. So the registrable domain is `account-verify.example`.
3. **Compare to the real owner.** `account-verify.example` is not `campus.test`. The leading `campus.test.` is a subdomain label that `account-verify.example` created to look reassuring. Verdict: impersonation.
4. **Check for extra tricks.** There is no `@`, so no userinfo decoy here, and the characters are plain ASCII, so no homograph. This one relies purely on subdomain placement.
5. **Act on the real destination.** You do not click. If you want to check your library account, you navigate to your known bookmark for `campus.test` directly.

The same procedure disarms every family above. You never trusted a familiar word; you found the registrable domain and judged by that.

## Defenses

- **Read the registrable domain, every time.** For a person, the durable skill is the right-to-left habit from this lesson. Its limit: it requires attention under pressure, and long or mobile-truncated URLs hide the important part. Pair it with the habits below.
- **Navigate by trust anchors, not by links.** Use bookmarks or type known addresses for sensitive sites, and let a password manager fill credentials. A manager binds each saved login to an exact origin and will silently refuse to autofill on `account-verify.example`, which is a strong, non-visual signal that you are not where you think. Its limit: it only helps for sites you have saved, and only if you notice the non-fill.
- **Organizational monitoring.** Defenders register common typo and combo variants of their own names, and watch domain registrations, certificate transparency logs, and passive DNS for new look-alikes. ATT&CK's own mitigation is to "consider monitoring for domains created with a similar structure to your own, including under a different TLD." Its limit: the space of possible look-alikes is effectively infinite, so monitoring reduces but cannot eliminate exposure.
- **Blocking and reputation.** Mail gateways and browsers consult reputation feeds and can block known-bad domains. Its limit: fresh domains have no reputation yet, and research on combosquatting found many abusive domains are long-lived and slow to be listed, so reputation lags the attack.

As with homographs, the layers compensate for each other's gaps; none is sufficient alone.

## Common misconceptions

- **"If the real name appears in the URL, it's the real site."** The name can appear as a subdomain label, a path segment, a query value, or userinfo without conferring any authority. Only its position as the registrable domain matters.
- **"The longer and more official-looking the URL, the more trustworthy."** Length and official-sounding words (`secure`, `account`, `verify`) are free to add and are favored by attackers precisely because they reassure.
- **"`https` means it's safe."** HTTPS means the connection to *that host* is encrypted. A typosquatted or combosquatted domain can obtain a valid certificate for itself. HTTPS says nothing about *which* site you reached.
- **"Subdomains are controlled by whoever owns the name in the middle."** Subdomains are controlled by the owner of the registrable domain. `campus.test.evil.example` is controlled by `evil.example`, not by the campus.
- **"The part before the @ is the site."** It is the userinfo. The host is after the `@`. This single misunderstanding powers a whole family of deceptive links.

## Try it in the lab

The [homograph lab](lab:homograph) doubles as a URL-reading workbench. Alongside the confusable-character cases, you can classify original, fictional URLs built from the patterns above: typo variants of `campus.test`, combosquatted names like `campus-login.example`, subdomain decoys such as `campus.test.login-portal.example`, and userinfo links of the form `campus.test@login.example.test`. For each, practice the drill: locate the authority, extract the registrable domain, and state who actually owns the destination and why. Your goal is to reach the right verdict from structure alone, the way a browser does, without visiting anything.

## Go deeper

Graduate readers should quantify the problem. Kintis and colleagues, in "Hiding in Plain Sight: A Longitudinal Study of Combosquatting Abuse" (ACM CCS 2017), analyzed 468 billion DNS records and found combosquatting far more prevalent than typosquatting, with a large fraction of abusive domains persisting for years and often appearing on blocklists only long after they begin resolving. That persistence is a direct argument for structural literacy over reputation alone: by the time a domain is listed, the damage window has often closed.

Two further directions. First, study the Public Suffix List as a piece of security infrastructure with its own failure modes: it is a hand-maintained file, so a stale or missing entry can misclassify a registrable boundary and, as the WHATWG standard warns, it "cannot be relied-upon to provide a hard security boundary" — the standard recommends the *origin* concept for security decisions, which you will meet in the browser-isolation topic. Second, connect URL structure to automated detection: features such as edit distance to known brands, number of subdomain labels, TLD rarity, and presence of userinfo feed real phishing-URL classifiers. A good exercise is to build a small rule-based classifier for the fictional corpus in the lab and measure, as in the homograph case, how often it flags legitimate-but-unusual URLs by mistake. The recurring theme across both lessons is that the hard part of defense is not catching the obvious attacks but doing so without drowning in false positives.
