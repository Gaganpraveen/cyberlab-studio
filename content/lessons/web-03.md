---
topicId: WEB-03
title: Phishing evidence and link destinations
summary: How to investigate a suspicious message the way an analyst does, by separating what the sender wrote from what your own systems recorded, reading SPF, DKIM and DMARC results, and finding where each link really leads without clicking it.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish the parts of an email that the sender controls from the evidence that the receiving organization's own servers add.
  - Interpret SPF, DKIM and DMARC results in an Authentication-Results header, stating what a pass does and does not prove.
  - Determine a link's real destination from its href without opening it, and name the registrable domain that controls it.
  - Write a defanged, evidence-based verdict for a suspicious message and choose a proportionate response.
prerequisites: [WEB-02, NET-02, HUM-01]
concepts:
  - phishing
  - spoofing
  - envelope-sender
  - spf
  - dkim
  - dmarc
  - authentication-results
  - display-name-spoofing
  - defanging
labs: [homograph]
keywords:
  - phishing analysis
  - email header analysis
  - spearphishing link
  - T1566
  - T1566.002
  - SPF
  - DKIM
  - DMARC
  - DMARC alignment
  - Authentication-Results
  - authserv-id
  - Reply-To
  - Return-Path
  - display name spoofing
  - defang
  - hxxp
  - consent phishing
  - RFC 9989
  - RFC 8601
  - RFC 5322
  - RFC 7208
  - RFC 6376
sources:
  - title: 'Phishing: Spearphishing Link (T1566.002)'
    url: https://attack.mitre.org/techniques/T1566/002/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: 'RFC 9989: Domain-Based Message Authentication, Reporting, and Conformance (DMARC)'
    url: https://www.rfc-editor.org/info/rfc9989
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9989-dmarc
  - title: 'RFC 8601: Message Header Field for Indicating Message Authentication Status'
    url: https://www.rfc-editor.org/info/rfc8601
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-8601-authentication-results
  - title: 'RFC 5322: Internet Message Format'
    url: https://www.rfc-editor.org/info/rfc5322
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-5322-internet-message-format
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
    sourceId: nist-sp-800-63b
quiz:
  - question: A message from `helpdesk@campus-support.test` reaches campus.test, and the Authentication-Results header added by `mx.campus.test` shows SPF, DKIM and DMARC all passing for campus-support.test. What has been established?
    choices:
      - The message is legitimate, because every check passed.
      - Whoever controls campus-support.test sent it, but nothing about whether that domain belongs to the campus or is honest.
      - The campus authorized campus-support.test to send mail on its behalf.
      - The links in the message were scanned and found safe.
    answer: 1
    explanation: SPF, DKIM and DMARC authenticate a domain, not an intention. Anyone can register a look-alike domain and publish passing records for it. DMARC ties the visible From domain to the domain that authenticated, but it never compares that domain with the one the reader expects to see.
  - question: Which header is the most trustworthy evidence in a message delivered to `alice@campus.test`?
    choices:
      - The From header, because mail servers check it before delivery.
      - The lowest Received header, because it shows where the message started.
      - An Authentication-Results header that names the sender's own server.
      - The Authentication-Results header that mx.campus.test, the campus's own receiving server, added.
    answer: 3
    explanation: A sender can write any header before the message leaves its server, including fake Received lines and fake Authentication-Results lines. Only the headers added by servers you operate are records rather than claims, which is why the authserv-id at the start of an Authentication-Results header matters.
  - question: A link's visible text is `https://campus.test/login`, and its href is `https://campus.test.account-check.test/login?u=alice`. Which statement is correct?
    choices:
      - A click opens a site controlled by whoever registered account-check.test.
      - A click opens campus.test, because both the text and the start of the href say so.
      - The browser warns before following a link whose text differs from its href.
      - The link is safe as long as it uses HTTPS.
    answer: 0
    explanation: The mail client follows the href, and the text is decoration. Reading the host from the right, the registrable domain is account-check.test, so campus.test is just a pair of labels its owner chose. Browsers do not compare link text with the href, and HTTPS only encrypts the connection to whoever runs the site.
  - question: campus.test publishes a DMARC policy of `p=reject`. Which message does that policy stop at receivers that apply DMARC?
    choices:
      - A message from helpdesk@campus-support.test with valid SPF and DKIM for campus-support.test.
      - A message from "Campus IT" with the address it.campus@freemail.test.
      - A message with the From address help@campus.test, sent from a server campus.test never authorized and without a campus.test DKIM signature.
      - A message sent from a real campus.test account whose password was stolen.
    answer: 2
    explanation: DMARC protects the domain that publishes it, so mail that claims to come from campus.test must authenticate as campus.test. Look-alike domains and free-mail addresses with trusted display names are different domains with their own policies or none. Mail from a compromised real account passes, because the campus's own servers really did send it.
  - question: Bob typed his password and a six-digit code into a page that a phishing link opened. Why would a passkey have protected him where the code did not?
    choices:
      - A passkey is a longer secret, so it is harder to type into a fake page.
      - The browser uses a passkey only for the site it was created for, so the look-alike site cannot obtain a sign-in the real site will accept.
      - A passkey stops the look-alike page from loading at all.
      - A passkey expires sooner than a six-digit code.
    answer: 1
    explanation: A one-time code is a secret Bob can be tricked into relaying, and a phishing page can pass it to the real site within seconds; NIST SP 800-63B-4 does not count such codes as phishing-resistant. With WebAuthn, the browser scopes each credential to its site and includes the origin in what is signed, so a look-alike origin gets nothing useful. Bob must still report the incident, because his password was exposed.
---

## Why it matters

A phishing message succeeds only when someone acts on it: clicks the link, opens the file, or types a password. MITRE ATT&CK catalogs [[phishing]] as an initial-access technique (T1566). Its sub-technique Spearphishing Link (T1566.002) covers messages that carry a link "instead of attaching malicious files to the email itself." In practice the link may lead to a fake sign-in page, a malware download, or a request to grant an outside application access to an account.

When someone reports a suspicious message, a security team must decide quickly whether it is real, how far it spread, and whether anyone clicked. The wording rarely settles this, because attackers copy real messages closely. What settles it is evidence the attacker could not write: records added by your own mail servers, and the true destination of every link. [Social-engineering mechanisms](lesson:HUM-01) explains why people respond to lures; this lesson shows how an analyst checks them safely.

## The core idea

Think of a paper letter. The sender writes the return address, letterhead and signature, and anyone can print a convincing letterhead. Your own post office adds the postmark, which is real evidence about how the letter arrived because you trust that office, but which says nothing about whether the sender is honest.

Every message mixes the same two kinds of evidence:

- **Claims** are everything the sender wrote: the display name, the From address, the subject, the body, logos, link text, and any header that was already in the message when it reached your server.
- **Records** are what systems you trust added or measured: the trace and authentication headers your own servers added, the destination each link actually encodes, and answers you get through an independent channel.

Assume the attacker controls their own mail servers, can register any available domain, and can publish any DNS records for domains they own. You trust your organization's receiving server, `mx.campus.test` in this lesson. Then a claim is never proof, and a record proves only what it measured.

## How it works

### The fields of a message

Email, like a letter, has an envelope and a message. During delivery the sending server announces an [[envelope-sender]] in the SMTP `MAIL FROM` command, and the server that finally delivers the message usually records it in a `Return-Path` header. The message itself carries header fields defined by RFC 5322, such as From, Reply-To and Subject. Each server that handles the message adds a `Received` trace header at the top, so the newest [[email-header|headers]] come first.

| Field                                      | Written by                                       | What it can establish                         |
| ------------------------------------------ | ------------------------------------------------ | --------------------------------------------- |
| Display name, such as "Campus IT Helpdesk" | Sender                                           | Nothing; it is free text                      |
| From address                               | Sender                                           | Its domain is the one DMARC checks            |
| Reply-To                                   | Sender                                           | Nothing; it is where replies will go          |
| Return-Path (envelope sender)              | Receiving server, copying the sender's MAIL FROM | The domain that SPF checks                    |
| Received, added by your own servers        | Your servers                                     | Which host connected, from which IP, and when |
| Received, below your first server          | Anyone earlier, including the sender             | Nothing reliable                              |
| Authentication-Results from your server    | Your server                                      | The SPF, DKIM and DMARC outcomes              |
| Link text                                  | Sender                                           | Nothing                                       |
| Link href                                  | Sender                                           | Where a click goes first                      |

The cheapest trick in the table is [[display-name-spoofing]]: a trusted name such as "Campus IT Helpdesk" in front of an address at an unrelated domain. Many mail apps, especially on phones, show only the display name until the reader taps it. A Reply-To at a different domain from the From address is another classic signal, particularly in [[business-email-compromise]], where the attacker wants a conversation rather than a click.

### What SPF, DKIM and DMARC check

Three standards let a receiving server test claims about the sending domain, guarding against [[spoofing]]. Each authenticates a domain, not a person or an intention.

- [[spf]] lets the envelope sender's domain list, in DNS, the servers allowed to send for it. The receiver compares the connecting IP address with that list.
- [[dkim]] lets a domain add a [[digital-signature]] over chosen headers and the body. The `d=` tag names the signing domain, whose public key the receiver fetches from DNS.
- [[dmarc]] lets the domain in the visible From address publish a policy. A message passes DMARC when SPF or DKIM passes for a domain that is _aligned_ with the From domain: identical under strict alignment, or sharing the same organizational domain under relaxed alignment, the default. The policy, `p=none`, `p=quarantine` or `p=reject`, states what the domain owner asks receivers to do with mail that fails. RFC 9989, published in May 2026, is the current standards-track specification.

The receiving server writes the outcomes into an [[authentication-results]] header, defined in RFC 8601. It begins with an authserv-id that names the server that ran the checks. A sender could include a forged copy, so RFC 8601 requires a conforming server to delete copies that claim to come from inside its own trust boundary without arriving from a trusted server. As a reader, trust only the copy your own server added. The diagram shows these checks for the worked example's message, sent from 203.0.113.25.

```sequence
title: How mx.campus.test authenticates a look-alike message
participant S as out.campus-support.test
participant M as mx.campus.test
participant D as DNS
participant A as Alice's inbox
S -> M: MAIL FROM bounce@bounce.campus-support.test
M -> D: SPF record for bounce.campus-support.test?
D --> M: v=spf1 ip4:203.0.113.25 -all
note M: SPF pass, the connecting IP is listed
S -> M: Message, From helpdesk@campus-support.test
M -> D: DKIM key and DMARC policy, campus-support.test
D --> M: Public key, and v=DMARC1; p=reject
note M: DKIM pass, aligned with From: DMARC pass
M --> A: Delivered, with Authentication-Results added
```

Every check passed, and every check was about campus-support.test; nothing compared that domain with campus.test. Authentication answers "which domain is responsible for this message?" Whether that domain deserves trust is your call.

| Result       | Shows                                                  | Does not show                                                                |
| ------------ | ------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `spf=pass`   | The connecting IP is authorized by the envelope domain | Anything about the visible From address                                      |
| `dkim=pass`  | The `d=` domain signed these headers and this body     | That `d=` matches From, or that the content is true                          |
| `dmarc=pass` | An aligned domain authenticated the From domain        | That the From domain belongs to the organization you expect                  |
| `dmarc=fail` | No aligned SPF or DKIM pass                            | That the message is malicious; forwarding and mailing lists can break checks |

### Where a link really goes

In an HTML message, the text a reader sees and the address a click follows are separate, and the text may itself look like an address:

```html
<p>
  Confirm your account at
  <a href="https://campus.test.account-check.test/login?u=alice">https://campus.test/login</a>
</p>
```

The mail client follows the `href`; the text between the tags is only display. To read the href safely on a computer, hover over the link and read the status bar, or copy the link address into a text editor; on a phone, a long press can load a preview of the page itself, so analysts use a computer. Next, read the host from the right to find its [[registrable-domain]] ([WEB-02](lesson:WEB-02)) and decode any `xn--` labels ([WEB-01](lesson:WEB-01)). Here the registrable domain is account-check.test.

Four complications are common.

- **Rewritten links.** Many mail gateways rewrite every link to pass through a checking service, so hovering shows the gateway's address with the original URL inside a parameter. Decode it with the gateway's tools, never by clicking.
- **Redirects.** A link shortener, a tracking link or an [[open-redirect]] on a trusted site means the first host is not the last. Only an isolated analysis system should follow the chain.
- **Nothing to hover.** A QR code in an image, an attached HTML file that draws a sign-in form from the local disk, or a "call this number" lure carries its destination where hovering cannot reach.
- **A genuine domain.** In consent phishing, which ATT&CK describes for this technique, the link opens a real identity provider's sign-in page, which asks the user to let an outside application access their account. The domain checks out; the evidence is the application's name and the permissions it requests.

### Recording what you find

[[defanging|Defanging]] rewrites indicators so that they cannot be clicked, and so that chat and ticket systems do not turn them into live links:

```text
Live:      https://campus.test.account-check.test/login?u=alice
Defanged:  hxxps://campus.test.account-check[.]test/login?u=alice
Sender:    helpdesk[@]campus-support[.]test
```

Note that `u=alice` is a per-recipient token: visiting the link, even from an analysis machine, could tell its operator that Alice's copy was opened. Values recorded this way become [[indicator-of-compromise|indicators]] the team can search for in mail and proxy logs.

## Worked example

Alice, a student at the fictional campus.test, reports a message with her mail app's Report button, and Bob, a campus security analyst, investigates it. The message, domains and account are synthetic, so no real credentials are involved. These are its key headers, newest first:

```text
Return-Path: <bounce@bounce.campus-support.test>
Authentication-Results: mx.campus.test;
    spf=pass smtp.mailfrom=bounce.campus-support.test;
    dkim=pass header.d=campus-support.test;
    dmarc=pass header.from=campus-support.test
Received: from out.campus-support.test (out.campus-support.test [203.0.113.25])
    by mx.campus.test with ESMTPS; Wed, 14 Oct 2026 08:12:03 -0400
DKIM-Signature: v=1; a=rsa-sha256; d=campus-support.test; s=mail; ...
From: "Campus IT Helpdesk" <helpdesk@campus-support.test>
Reply-To: <helpdesk-team@freemail.test>
To: <alice@campus.test>
Subject: Action required: confirm your account
Date: Wed, 14 Oct 2026 08:11:58 -0400
```

1. **Preserve, and do not interact.** Bob works from the original message file that the Report button submitted, not a forwarded copy, because forwarding creates a new message without the original headers. He opens no links or attachments on his workstation and submits nothing to the site, not even invented credentials.
2. **Separate the claims.** The display name says Campus IT Helpdesk, the address is at campus-support.test, and replies would go to freemail.test: three identities, and only the free-text one mentions the campus. The urgent subject is a claim too.
3. **Read the records.** The top Received header was added by mx.campus.test, which accepted the message from 203.0.113.25, a host calling itself out.campus-support.test. The Authentication-Results header with authserv-id mx.campus.test shows SPF, DKIM and DMARC passing for campus-support.test; SPF counts for DMARC because bounce.campus-support.test shares that organizational domain. So the owner of campus-support.test sent the message. Bob checks the campus's published list of approved sending domains, and campus-support.test is not on it.
4. **Extract every link.** In the message source, the link that displays `https://campus.test/login` has the href `https://campus.test.account-check.test/login?u=alice`, whose registrable domain is account-check.test. The footer links to the real campus.test privacy page, which makes the message look authentic but changes nothing.
5. **Verify through a known channel.** The account system shows no pending suspension for Alice, and the help desk sent no such notice.
6. **Write the verdict.** Several independent records agree, so Bob states high confidence. Had only the wording seemed odd, he would have written "suspicious, low confidence."

```text
Verdict:     Credential phishing (malicious), high confidence
Evidence:    From domain campus-support.test is not a campus sending domain;
             SPF, DKIM and DMARC pass only for that look-alike domain;
             link text shows campus.test, but the href goes to account-check.test;
             Reply-To is an unrelated free-mail domain;
             the account system shows no pending suspension.
Indicators:  helpdesk[@]campus-support[.]test, 203.0.113[.]25,
             hxxps://campus.test.account-check[.]test/login
Actions:     remove all copies; block both domains at the mail gateway and
             web proxy; search proxy logs for visits; reset exposed passwords.
```

7. **Scope the incident.** Bob searches the mail logs for the same sender, subject and URL, then the web proxy logs for requests to account-check.test, much as ATT&CK's detection guidance correlates email links with clicks. Anyone who entered a password on the site has it reset and their sessions revoked.

> [!ETHICS] Only test systems you own or have written permission to test.

## Defenses

- **Enforce DMARC on your own domains.** With campus.test at `p=reject`, receivers that apply DMARC refuse mail that falsely claims to come from campus.test. _Limit:_ it protects only the domains that publish it. Look-alike domains, free-mail accounts with trusted display names, and compromised real accounts all pass.
- **Filter and rewrite links.** Gateways score messages, block known-bad domains and recheck links when they are clicked, because a page that was harmless when scanned can change later. _Limit:_ a newly registered domain has no reputation yet, so some lures get through.
- **Warn in the client and the browser.** External-sender banners and browser look-alike warnings help a reader pause; ATT&CK lists user training as a mitigation while noting that people struggle to check URLs by eye. _Limit:_ people stop reading a [[security-warning]] they see on every message.
- **Use phishing-resistant authentication.** With [[passkey|passkeys]] and other [[webauthn]] authenticators, the browser uses a credential only for the site it belongs to, so a look-alike page cannot collect a usable sign-in. NIST SP 800-63B-4 does not count one-time codes or out-of-band approvals as phishing-resistant. _Limit:_ consent phishing, malware downloads and weak account-recovery paths remain; see [the MFA lesson](lesson:IAM-03).
- **Make reporting fast and blame-free.** A one-click Report button and quick feedback turn recipients into sensors, and each report lets the team pull other copies. _Limit:_ it depends on someone noticing, which a healthy [[security-culture]] makes more likely.
- **Send mail that is easy to verify.** Use one well-known domain, never ask for passwords through email links, and tell people how you will contact them, so fakes stand out. [[out-of-band-verification|Out-of-band verification]] through a directory number settles unusual requests.

## Common misconceptions

- **"It passed SPF, DKIM and DMARC, so it is genuine."** Authentication names the responsible domain. A look-alike domain can pass all three.
- **"The link text is a URL, so that is where it goes."** The href decides. The text is decoration; browsers never check it against the href, and only some mail clients warn about a mismatch.
- **"A message from a colleague's real address is safe."** If the account is compromised, the message passes every check, because your own servers really sent it. Verify unusual requests another way.
- **"Hovering shows the final destination."** It shows the first hop. Rewritten links, shorteners and redirects can lead elsewhere, and QR codes and attachments cannot be hovered at all.
- **"Opening it in a private window is safe."** A private window only keeps history and cookies from being saved. The page still runs on your machine and network, so leave that to isolated analysis systems.

## Try it in the lab

Investigate a synthetic message without real credentials. Everything in [the lab](lab:homograph) is fictional, and nothing in it connects to the network.

1. **Read the case file.** Open the Investigation tab. The message claims to come from IT Helpdesk at help@campus.test and urges you to confirm your account at campus.test. The lab notes that the link text says campus.test but the link points to `http://xn--cmpus-4ve.test/login`. List every claim, and the one record you have: the href.
2. **Notice what is missing.** The case file has no Authentication-Results header. Write down which result, from which server, would show whether the From address help@campus.test is forged.
3. **Decode the destination.** On the Inspector tab, the suspect name starts as `cаmpus.test`, and its Host analysis panel shows the ASCII form `xn--cmpus-4ve.test`, the link's host. Click the ringed character to find the Cyrillic letter behind the "Name the imposter character" challenge.
4. **Read a second destination.** Solve "Read the real destination," in which a message links the text campus.test to the host `campus.test.evil-login.test`.
5. **Write your verdict.** Use the worked example's format: verdict and confidence, evidence, defanged indicators, and actions. Then, on the Rule builder tab, find which of the two destinations the available rules can flag, and note in your verdict which dataset names they miss, and why.

## Key takeaways

- Base verdicts on records that your own systems added or measured, not on claims the sender wrote.
- SPF, DKIM and DMARC name the domain responsible for a message, not whether it is the one you expected or whether its owner is honest.
- A link goes where its href points. Find the registrable domain without clicking, and remember that the first hop may not be the last.
- Record defanged indicators and a stated confidence, then scope the incident through mail and proxy logs.
- Phishing-resistant authentication limits the damage when someone does click, because a look-alike site cannot use what it collects.

## Go deeper

- **Organizational domains.** RFC 9989 finds the organizational domain for relaxed alignment by walking the DNS tree, while browsers use the Public Suffix List for a similar idea. What could go wrong when mail and web security draw the boundary of "one owner" differently?
- **Detection engineering.** ATT&CK's detection guidance for T1566.002 correlates links in email with later clicks and browser activity. Design that join over mail and proxy logs, and decide how to treat security scanners that visit every link and look like clicks.
- **Trusting headers.** RFC 8601 explains why receivers remove forged Authentication-Results headers and how readers decide which authserv-ids to trust. What changes when mail passes through a forwarding service or mailing list?
