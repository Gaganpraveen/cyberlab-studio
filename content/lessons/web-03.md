---
topicId: WEB-03
title: Phishing evidence and link destinations
summary: Learn to separate what a message displays from where it really leads, read the evidence in email headers at a conceptual level, understand SPF, DKIM, and DMARC, and know how to report phishing.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 28
objectives:
  - Separate a link's displayed text from its real destination and judge by the destination.
  - Read email evidence conceptually, including trace headers and authentication results.
  - Explain what SPF, DKIM, and DMARC each check, and what they do not.
  - Report phishing through the right channels and apply layered defenses.
prerequisites: [WEB-01, WEB-02]
concepts: [phishing, spoofing, spf, dkim, dmarc, responsible-disclosure]
labs: [homograph]
sources:
  - title: RFC 9989, Domain-based Message Authentication, Reporting, and Conformance (DMARC)
    url: https://www.rfc-editor.org/rfc/rfc9989
    publisher: IETF
  - title: RFC 7208, Sender Policy Framework (SPF) for Authorizing Use of Domains in Email, Version 1
    url: https://www.rfc-editor.org/rfc/rfc7208
    publisher: IETF
  - title: RFC 6376, DomainKeys Identified Mail (DKIM) Signatures
    url: https://www.rfc-editor.org/rfc/rfc6376
    publisher: IETF
  - title: RFC 8601, Message Header Field for Indicating Message Authentication Status
    url: https://www.rfc-editor.org/rfc/rfc8601
    publisher: IETF
  - title: "CISA, NSA, FBI, MS-ISAC, Phishing Guidance: Stopping the Attack Cycle at Phase One"
    url: https://www.cisa.gov/resources-tools/resources/phishing-guidance-stopping-attack-cycle-phase-one
    publisher: Cybersecurity and Infrastructure Security Agency
  - title: U.S. Federal Trade Commission, How to Recognize and Avoid Phishing Scams
    url: https://consumer.ftc.gov/articles/how-recognize-and-avoid-phishing-scams
    publisher: U.S. Federal Trade Commission
quiz:
  - question: An email shows the link text "https://campus.test/login" but the anchor's href points to https://account-verify.example/. Which should you trust?
    choices:
      - The displayed text, because it is what you see
      - The href, because that is where the click actually goes
      - Neither matters
      - Whichever is shorter
    answer: 1
    explanation: Displayed text is free-form and attacker-controlled. The href is the real destination. Always judge by where a link actually leads, not by the words used to label it.
  - question: What does an SPF record check?
    choices:
      - That the visible From header address is genuine
      - Whether the sending server's IP is authorized for the envelope (MAIL FROM) domain
      - Whether the message body was modified
      - Whether the user clicked a link
    answer: 1
    explanation: SPF authorizes sending hosts for the MAIL FROM and HELO identities, not the visible From header. That gap is exactly why DMARC adds alignment with the From domain.
  - question: Why can DMARC catch spoofing that SPF or DKIM alone might miss?
    choices:
      - It encrypts the whole message
      - It requires the visible From domain to align with a domain that passed SPF or DKIM
      - It blocks all mail from new domains
      - It scans attachments for malware
    answer: 1
    explanation: SPF and DKIM authenticate domains that may differ from the one the user sees. DMARC requires the From domain to align with a passing check, closing the gap between authenticated identity and displayed identity.
  - question: You receive a phishing email impersonating your school. Per common guidance, a good reporting action is to
    choices:
      - Reply asking them to stop
      - Forward it to your IT/security team and delete it
      - Click the link to gather evidence
      - Post it publicly with your login details
    answer: 1
    explanation: Report to the people who can act (your IT or security team, and bodies like the FTC or CISA) and then delete it. Never click links or submit credentials to "investigate."
  - question: An Authentication-Results header in a message says dmarc=pass. Why is that not automatically trustworthy on its own?
    choices:
      - Because pass always means spam
      - Because a sender can forge that header; you should only trust results added by your own mail provider
      - Because DMARC does not exist
      - Because headers are encrypted
    answer: 1
    explanation: Authentication-Results has no built-in integrity, so an attacker can insert a fake one. RFC 8601 says to trust it only when added by a known, trusted mail system that strips forged copies at the border.
---

## Why it matters

[[phishing|Phishing]] is the most common doorway into an organization because it attacks the person, not the protocol. A message pretends to come from someone you trust and asks you to click, log in, or pay. The techniques from the last two lessons — [homograph look-alikes](lesson:WEB-01) and [misleading URL structure](lesson:WEB-02) — are often the payload inside a phishing message. This lesson is about the detective work: given a suspicious message, how do you decide what it really is, from evidence rather than from how convincing it looks?

That skill is durable because the deception is fundamentally about a mismatch between *appearance* and *reality*: the name shown versus the address behind it, the brand in the logo versus the domain that signed the mail. Once you know where the real evidence lives, a polished phishing email becomes much easier to call, and you learn the limits of the automated defenses that try to do this at scale.

> [!ETHICS]
> Only test systems you own or have written permission to test. Analyze suspicious messages safely: inspect links and headers without clicking, and never enter real credentials to "see what happens." All examples here use reserved domains such as `campus.test` and `bank.example`.

## The core idea

Two mismatches do most of the work in phishing, and two ideas defend against them.

First, **displayed text is not the destination.** In HTML, a link's visible label and its target are independent:

```html
<a href="https://account-verify.example/login">https://campus.test/login</a>
```

The words between the tags can say anything; the browser follows the `href`. The same is true of a sender's display name ("Campus IT Help Desk") versus the actual email address, and of a button whose caption says one thing while its link goes elsewhere. The first rule of phishing analysis: **judge by the real destination, not the label.**

Second, **the "From" you see is not proof of origin.** Email was designed in a more trusting era, and the visible `From:` header is just text the sender writes. Faking it is [[spoofing]]. Three standards — [[spf|SPF]], [[dkim|DKIM]], and [[dmarc|DMARC]] — add checkable evidence about who really sent a message, and a fourth header, Authentication-Results, records the verdicts. Learning to read that evidence is the second rule.

## How it works

### Evidence in an email, conceptually

An email is more than its body. As it travels, each mail server that handles it prepends a `Received:` trace line, so the headers accumulate a route recorded bottom-to-top (oldest at the bottom). There are actually *two* senders: the visible `From:` header the user reads, and the envelope sender (the `MAIL FROM`, recorded at delivery as `Return-Path:`) that mail servers use. Phishing frequently sets a trustworthy-looking `From:` while the envelope and trace tell a different story.

The most useful single header for a verdict is `Authentication-Results` (RFC 8601), which your receiving mail system adds to summarize its checks:

```http
Authentication-Results: mx.campus.test;
  spf=fail smtp.mailfrom=bounce.account-verify.example;
  dkim=none;
  dmarc=fail header.from=campus.test
```

Read conceptually, this says: the receiving system `mx.campus.test` found that the envelope domain was not authorized to send (`spf=fail`), the message carried no valid signature (`dkim=none`), and the visible `From:` domain `campus.test` did not pass DMARC alignment (`dmarc=fail`). That is a strong signal of a spoofed message. A crucial caveat from RFC 8601: this header has no built-in integrity, so a sender can *forge* one. You should only trust an `Authentication-Results` line that your own border mail server added — and that server is supposed to strip any forged copies claiming its name at the boundary.

### SPF, DKIM, DMARC: what each one actually checks

These three are often lumped together, but they check different things, and the differences are the whole point.

**SPF** (RFC 7208) lets a domain publish, in DNS, which servers may send its mail:

```text
campus.test.  TXT  "v=spf1 ip4:203.0.113.0/24 include:mail.campus.test -all"
```

The receiver checks the *sending server's IP* against this list. But SPF checks the **envelope** sender (`MAIL FROM`/`HELO`), explicitly *not* the visible `From:` header the user reads. So a message can pass SPF for one domain while displaying a completely different `From:` address. That gap is the reason DMARC exists.

**DKIM** (RFC 6376) adds a cryptographic signature. The sending domain signs selected headers and the body, publishes a public key in DNS under a selector, and the receiver verifies the signature:

```text
selector1._domainkey.campus.test.  TXT  "v=DKIM1; k=rsa; p=<public key>"
```

A valid DKIM signature proves the message was authorized by the signing domain (`d=`) and was not altered in the signed parts. But RFC 6376 does not require the signing domain to match the visible `From:` domain — a message can be validly signed by one domain while displaying another.

**DMARC** (RFC 9989, which replaced the earlier RFC 7489 in 2026) ties the loose ends together. The domain owner publishes a policy in DNS:

```text
_dmarc.campus.test.  TXT  "v=DMARC1; p=reject; rua=mailto:dmarc@campus.test"
```

DMARC passes only if an SPF or DKIM identity **aligns** with the visible `From:` domain — the thing the user actually sees. The policy `p=` tells receivers what to do with mail that fails: `none` (monitor only), `quarantine` (treat as suspicious), or `reject` (refuse). The domain also receives aggregate reports (`rua`) summarizing who is sending mail as them. DMARC is what turns "this was signed by *some* domain" into "this really is from the domain it claims to be."

Put simply: SPF and DKIM authenticate *a* domain; DMARC insists that domain be *the one you see*. None of the three inspect the body for malicious links, and none can help if the attacker sends from a *look-alike* domain that passes all three for *itself* — which is why the URL-reading skills from the previous lessons remain essential.

### Reporting

Reporting phishing is a small act of [[responsible-disclosure|coordination]] that protects everyone else who received the same message. Guidance from the U.S. Federal Trade Commission is concrete: forward a phishing email "to the Anti-Phishing Working Group at reportphishing@apwg.org," forward a phishing text "to SPAM (7726)," and "report the phishing attempt to the FTC at ReportFraud.ftc.gov." Inside an organization, report to your IT or security team first; many mail clients have a built-in "report phishing" button that routes the message to defenders and removes it. CISA's joint phishing guidance likewise urges organizations to report incidents (it lists `report@cisa.gov` and the FBI's Internet Crime Complaint Center). The common thread: tell someone who can act, and do not reply to or engage the sender.

## Worked example

A message arrives in a student's inbox. The display name is "Campus Help Desk," the subject is "Action required: reverify your account in 24 hours," and there is a blue button labeled "Secure Login."

1. **Reveal the real link.** Hovering the button shows the `href` points to `https://campus-helpdesk.example/verify`, not `campus.test`. Applying the [URL-reading drill](lesson:WEB-02), the registrable domain is `campus-helpdesk.example` — combosquatting, not the campus. Red flag one.
2. **Check the sender address, not the display name.** The display name says "Campus Help Desk," but the actual address is `no-reply@mail.campus-helpdesk.example`. The friendly name is free text; the address is the evidence. Red flag two.
3. **Read the authentication results.** The `Authentication-Results` line added by the student's own provider shows `dmarc=fail header.from=campus.test`: the message *claims* `campus.test` in some field but fails alignment. Red flag three. (The student also notes this line is trustworthy precisely because it was added by their provider, not by the sender.)
4. **Weigh the pretext.** Urgency and a deadline are classic pressure tactics the FTC lists as phishing signs. Legitimate password resets do not usually threaten a 24-hour lockout. Red flag four.
5. **Do not click; report and delete.** The student uses the client's "report phishing" button (routing it to campus IT) and, per FTC guidance, could also forward it to `reportphishing@apwg.org` and report at `ReportFraud.ftc.gov`. If they want to check their account, they open their own bookmark for `campus.test`.

No single clue was needed in isolation; the verdict rests on converging evidence, and none of it required trusting the message's appearance.

## Defenses

Phishing defense is layered because any one layer fails sometimes. CISA's joint guidance, *Stopping the Attack Cycle at Phase One*, organizes the technical defenses; combine them with human ones.

- **Email authentication (SPF + DKIM + DMARC).** Publishing all three, and enforcing DMARC at `p=reject`, lets receivers drop mail that spoofs your domain. CISA's guidance states that "DMARC, along with ... SPF ... and DKIM, verify the sending server" and recommends a reject policy for sent mail. Its limit: these protect *your* domain from being impersonated; they do nothing against a look-alike domain the attacker owns, and misconfiguration is common.
- **Phishing-resistant authentication.** The strongest user-side control is phishing-resistant multi-factor authentication, such as FIDO/WebAuthn security keys, which CISA calls "phishing resistant" because the credential is cryptographically bound to the real site and will not work on a look-alike. Its limit: it must be deployed and adopted, and fallback methods can reintroduce risk.
- **Filtering and browser defenses.** Mail gateways, URL rewriting and scanning, reputation blocklists, and browser warnings catch a large share of known-bad messages and links. Its limit: fresh domains and targeted "spear" messages often evade reputation.
- **Training and reporting culture.** Teaching people to read destinations and report suspicious mail, with an easy report button, turns users into sensors. Its limit, documented in usability research, is that people are unreliable detectors under time pressure, so training supports the technical layers rather than replacing them.

Because the human layer is fallible by nature, the technical layers must assume some messages will be clicked — a direct application of [defense in depth](lesson:FND-01).

## Common misconceptions

- **"If the From address is my bank, it's my bank."** The `From:` header is writable text. Only authentication evidence (and DMARC alignment) tells you whether it is genuine.
- **"SPF/DKIM/DMARC stop all phishing."** They stop *domain spoofing of domains that deploy them*. An attacker using their own combosquatted or homograph domain can pass all three for that domain. The URL still has to be read.
- **"A pass in Authentication-Results means the mail is safe."** A `pass` means the claimed domain is authenticated, not that the content is benign — spam can be validly signed. And a `pass` header is only meaningful when your own provider added it, because the field can be forged.
- **"The link text shows where I'm going."** The visible text and the `href` are independent. Reveal and read the actual destination.
- **"I can safely click to investigate."** Clicking can trigger tracking, malware, or a convincing credential form. Analyze from headers and revealed links; never submit real credentials.
- **"Good grammar means it's legitimate."** Modern phishing is often well written. The FTC's own guidance notes that polish is no longer a reliable signal.

## Try it in the lab

The [homograph lab](lab:homograph) lets you practice the link-destination half of this lesson on synthetic messages — no real credentials, no outbound requests. Take the fictional links a phishing message might use and run the full drill: reveal the real destination, extract the registrable domain, classify the deception (typo, combo, subdomain, userinfo, or confusable), and decide whether the displayed text matches where the link truly leads. The habit you are building is to treat the destination as the evidence and the appearance as a claim to be checked.

## Go deeper

Graduate readers should pair the usability literature with the protocol detail. Rachna Dhamija, J. D. Tygar, and Marti Hearst's "Why Phishing Works" (CHI 2006) remains a sobering baseline: their best fake fooled about ninety percent of participants, and many users judged legitimacy from page content while ignoring the address bar and security indicators entirely. That result is the empirical case for phishing-resistant authentication and for not relying on human vigilance alone. On the measurement side, the NIST "Phish Scale" (Steves, Greene, and Theofanos) offers a way to rate how difficult a given lure is to detect, which matters when interpreting click-rate metrics from awareness programs.

On the protocol side, read RFC 9989 closely and note what changed from RFC 7489: DMARC now determines the organizational domain with a bounded "DNS tree walk" rather than relying solely on the Public Suffix List, and it adds policy controls for non-existent subdomains. Then study the honest limits of the stack: forwarding and mailing lists can break SPF and DKIM alignment, which is why organizations stage DMARC from `none` to `reject` using aggregate reports. A strong exercise is to take a set of synthetic headers and classify each message's true origin from the trace and authentication evidence alone, then explain which real-world mail flows (forwarders, newsletters, ticketing systems) would produce a false "fail" and how a careful policy avoids blocking them. As in the earlier lessons, the hard part is catching abuse without harming legitimate senders.
