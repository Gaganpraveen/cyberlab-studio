---
topicId: FOR-06
title: Email and document evidence
summary: >-
  How to read an email's header fields as evidence, which parts the sender controls and which were
  added by servers in transit, how authentication results are trusted, and what document metadata can
  and cannot reveal about who made a file and when.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Classify each header field of a message by who wrote it and how far it can be trusted.
  - Trace a message's path by reading Received fields from the bottom up and trusting them from the top down.
  - Interpret an Authentication-Results field, including why SPF can pass while DMARC fails.
  - Extract a document's internal metadata safely and explain how it differs from file-system timestamps.
prerequisites: [WEB-03, FOR-05]
concepts: [email-header, authentication-results, document-metadata]
labs: []
keywords:
  - email headers
  - full headers
  - message source
  - show original
  - Received header
  - Return-Path
  - Message-ID
  - Reply-To
  - Authentication-Results
  - RFC 5322
  - RFC 5321
  - RFC 8601
  - SPF
  - DKIM
  - DMARC
  - alignment
  - business email compromise
  - BEC
  - document metadata
  - docProps/core.xml
  - Office Open XML
  - OOXML
  - ECMA-376
  - EXIF
  - eml
sources:
  - title: 'RFC 5322: Internet Message Format'
    url: https://www.rfc-editor.org/rfc/rfc5322
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 5321: Simple Mail Transfer Protocol'
    url: https://www.rfc-editor.org/rfc/rfc5321
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 8601: Message Header Field for Indicating Message Authentication Status'
    url: https://www.rfc-editor.org/rfc/rfc8601
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'ECMA-376: Office Open XML File Formats'
    url: https://ecma-international.org/publications-and-standards/standards/ecma-376/
    publisher: Ecma International
quiz:
  - question: A message has five Received fields. Which one can an examiner at the receiving organization trust most?
    choices:
      - The bottom one, because it is closest to the real sender.
      - The one whose host name matches the From domain.
      - The top one, because the organization's own server added it last, and no one outside could have altered it afterward.
      - None of them, because Received fields are always forged.
    answer: 2
    explanation: >-
      Each server prepends its own Received field, so the top fields were written by the receiving
      organization's servers and the lower ones by systems further back, which the sender may control.
      Read the path from the bottom up, but trust it from the top down, stopping at the first hop you
      cannot vouch for.
  - question: >-
      Your border server's Authentication-Results field shows spf=pass for mailer.billing-notice.test
      and dmarc=fail for header.from=vendor.example. What does this mean?
    choices:
      - The sending server was authorized to send for billing-notice.test, but no passing check aligned with the vendor.example address shown in From, so the message may be impersonating vendor.example.
      - The message definitely came from vendor.example, because SPF passed.
      - The message was altered in transit.
      - The DMARC record of vendor.example is misconfigured.
    answer: 0
    explanation: >-
      SPF checks the envelope sender's domain, not the visible From. DMARC requires a passing SPF or DKIM
      result for a domain that aligns with the From domain. An attacker can easily make SPF pass for a
      domain they own while displaying someone else's address.
  - question: A colleague forwards you a suspicious email as evidence. Why is that not enough?
    choices:
      - Forwarded messages are encrypted.
      - Forwarding usually drops or rewrites the original header fields, so you need the original message exported with full headers, or a copy from the mail server.
      - Forwarding changes the attachment's file type.
      - Forwarded messages cannot be hashed.
    answer: 1
    explanation: >-
      A forward is a new message created by your colleague. The original Received, Authentication-Results,
      and Message-ID fields are often missing. Ask for the original as a file, such as an .eml export, or
      collect it from the server, and hash it when you receive it.
  - question: >-
      A document's internal metadata says it was created in 2019, but its file-system creation time on
      the suspect's laptop is yesterday. What is the best interpretation?
    choices:
      - The internal metadata must be forged.
      - The laptop's clock is wrong.
      - The file is from yesterday, because file-system times are authoritative.
      - Both can be true, because internal metadata travels with the file while a copy gets new file-system times, but internal metadata is also easy to edit, so corroborate before relying on it.
    answer: 3
    explanation: >-
      Copying or downloading creates a new file with fresh file-system times, while the properties stored
      inside the document travel unchanged. A 2019 internal date is consistent with an older document
      copied yesterday. Because anyone can edit those properties, the examiner looks for independent
      support, such as an email that carried the file.
  - question: >-
      Below your border server's Received field, a message contains an Authentication-Results field
      claiming dkim=pass and using your own server's authserv-id. How should you treat it?
    choices:
      - As forged by an upstream party; RFC 8601 expects your border server to delete or obscure fields claiming its identity, and only fields from authentication services you know should be trusted.
      - As proof that DKIM passed.
      - As a sign that your server is misconfigured and the message is safe.
      - As equivalent to a DKIM-Signature field.
    answer: 0
    explanation: >-
      Anyone can write any header field into a message before sending it. RFC 8601 ties trust to the
      authserv-id of a known verifier and requires border servers to remove instances that claim to come
      from inside their own trust boundary. A field in the wrong position is a red flag, not a result.
---

## Why it matters

Email sits at the center of many investigations: a [[phishing]] message that delivered malware, a [[business-email-compromise|fraudulent payment request]] that looked like it came from a supplier, a leaked document sent to a personal account. The visible "From" line settles none of these questions, because a sender can write anything there. The evidence lies in the header fields, a record that grows as the message passes from server to server, and in the metadata embedded in attachments.

Both kinds of evidence are uneven. Some fields were written by the sender and are only claims. Others were added by servers that the receiving organization runs and can vouch for. Document properties such as author and creation date are written by the author's own software, travel with the file, and can be edited by anyone. Skilled examiners do not ask "is this header genuine?" They ask "who wrote this field, and can I trust that writer?"

## The core idea

An [[email-header]] is the block of header fields at the top of a message, defined by RFC 5322. Sort its fields by who wrote them:

- **Sender-written fields** include From, To, Subject, Date, Reply-To, and usually Message-ID, plus the body and attachments. They record what the sender chose to say.
- **Transit fields** are added by servers along the way. Each server prepends a Received field, and the final delivery server adds Return-Path. RFC 5321 requires relays to add their own Received field and gateways to prepend one without altering any that already exist.
- **Verification fields** such as [[authentication-results|Authentication-Results]] record what a receiving server concluded when it checked [[spf|SPF]], [[dkim|DKIM]], and [[dmarc|DMARC]].

The analogy is a parcel. The return address is handwritten by the sender. Each post office it passes through adds a stamp on top of the earlier ones. A forger can paint fake stamps on the parcel before mailing it, but cannot remove the real stamps added later by post offices you trust. So you read the route from the oldest stamp to the newest, and you trust it only from the newest stamp back to the first one you can vouch for.

## How it works

### Fields and their trustworthiness

| Field                  | Written by                                       | What it tells you                                                              | Caveat                                                               |
| ---------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| From                   | Sender's mail client                             | The claimed author                                                             | Trivially forged; check DMARC alignment                              |
| Reply-To               | Sender's mail client                             | Where replies will go                                                          | A mismatch with From is common in payment fraud                      |
| Date                   | Sender's client or submission server             | When the sender's system says the message was ready, with an offset            | Sender's clock and zone                                              |
| Message-ID             | Usually the sender's client or submission server | A globally unique identifier; the part after @ often names the generating host | Can be forged; useful for finding copies in other mailboxes and logs |
| Received               | Every server that handled the message            | One hop each: who handed it over, to whom, and when                            | Only hops added by servers you trust are reliable                    |
| Return-Path            | The final delivery server                        | The envelope sender, used for bounces                                          | Often differs from From                                              |
| Authentication-Results | The receiving domain's verifier                  | SPF, DKIM, and DMARC outcomes                                                  | Trust only fields from your own verifier                             |

RFC 5322 defines the Date field as the moment "the creator of the message indicated" it was complete and ready to send, not when it was delivered, and it says every message "SHOULD have" a Message-ID that is globally unique. Received fields appear newest first, so the path reads from the bottom of the header upward.

Inside a Received field, the "from" part usually shows two things: the name the sending server announced, which it chose, and in brackets the IP address the receiving server actually saw on the connection, which it observed. The bracketed address in a field written by your own server is one of the strongest facts in the header.

### Authentication results

RFC 8601 defines Authentication-Results so that a verifier can pass its conclusions to filters and mail clients. Each field begins with an authserv-id naming the authentication service. Because anyone can insert a fake field before sending, the RFC requires a border server to "delete or otherwise obscure any instance of this header field" that claims to come from its own trust boundary, and consumers should use the authserv-id to decide which fields to believe.

The three checks answer different questions. SPF asks whether the connecting server may send for the envelope sender's domain. DKIM asks whether a domain's signature over the body and selected fields verifies, which shows that domain signed the message, not that a particular person wrote it. DMARC asks whether a passing SPF or DKIM domain aligns with the domain in From. An attacker who owns a look-alike domain can pass SPF and DKIM for that domain and still fail DMARC for the brand shown in From.

### Document metadata

[[document-metadata|Document metadata]] is information stored inside a file about the file itself. Office documents in the Office Open XML format, standardized as ECMA-376, are ZIP packages: a core-properties part, `docProps/core.xml`, records fields such as creator, last modified by, revision number, and created and modified times. PDFs carry their own information dictionary and often XMP metadata, and photos often carry EXIF data such as the camera model and capture time.

Two properties make document metadata useful and dangerous. It travels with the file: copying, emailing, or downloading creates new file-system times (see [Filesystem artifacts and metadata](lesson:FOR-02)) but leaves internal properties unchanged. And it reflects the author's software and settings, such as the user name configured in the application and the author's clock, which anyone can edit. It is good at corroborating or contradicting a story, and weak on its own.

## Worked example

Bob now asks how process 6644 on W-17 might have started. The mail server shows that mallory, W-17's assigned user, received this message early on October 4 (UTC). He exports the original from the server as an `.eml` file, hashes it, and examines a copy. The fields that matter are below (fictional, simplified).

```text
Return-Path: <bounce-7731@mailer.billing-notice.test>
Received: from mx1.shop.example (mx1.shop.example [192.0.2.25])
        by mbox.shop.example with LMTP; Sat, 3 Oct 2026 23:05:33 -0500
Authentication-Results: mx1.shop.example;
        spf=pass smtp.mailfrom=mailer.billing-notice.test;
        dkim=pass header.d=billing-notice.test;
        dmarc=fail header.from=vendor.example
Received: from relay.billing-notice.test (unknown [203.0.113.66])
        by mx1.shop.example with ESMTPS; Sun, 4 Oct 2026 04:05:31 +0000
Received: from accounting-pc.vendor.example ([198.51.100.40])
        by relay.billing-notice.test; Fri, 2 Oct 2026 11:00:00 -0700
From: "Vendor Billing" <billing@vendor.example>
Reply-To: <payments@billing-notice.test>
To: <mallory@shop.example>
Subject: Overdue invoice 4471
Date: Sun, 4 Oct 2026 04:04:58 +0000
Message-ID: <20261004040458.5521@relay.billing-notice.test>
```

The diagram shows which system wrote each part as the message traveled.

```sequence
title: Who wrote which header field
participant R as relay.billing-notice.test
participant MX as mx1.shop.example
participant MB as mbox.shop.example
participant C as Mallory's mail client
note R: Writes From, Date, Message-ID, lowest Received
R -> MX: SMTP from 203.0.113.66
note MX: Checks SPF, DKIM, DMARC; adds results field
note MX: Prepends Received with the observed IP
MX -> MB: Delivers over LMTP
note MB: Prepends Received; adds Return-Path
C -> MB: Fetches the message
MB --> C: Full message with all header fields
```

Bob reads it from the top down, trusting only what shop.example's servers wrote.

1. **Delivery time.** The top Received field, written by `mbox.shop.example`, puts delivery at 23:05:33 UTC-05:00, which is 04:05:33 UTC, about six and a half minutes before process 6644 started on W-17.
2. **The real origin.** `mx1.shop.example` recorded a connection from 203.0.113.66 at 04:05:31 UTC. The name `relay.billing-notice.test` is what that server announced; "unknown" means no matching reverse DNS name was found.
3. **Authentication.** The Authentication-Results field carries shop.example's own authserv-id, so bob trusts it. SPF and DKIM passed for `billing-notice.test`, a domain the sender controls, but DMARC failed for `vendor.example`. The message appears to impersonate the vendor.
4. **Untrustworthy history.** The lowest Received field, claiming a hop from `accounting-pc.vendor.example` two days earlier, was written by the sender's own relay. It cannot be verified, and its date conflicts with the Date field, so bob records it as a claim, possibly planted to make the message look as though it came from the vendor.
5. **Fraud signals.** Reply-To points to the look-alike domain, and the Message-ID names the sender's relay.

The attachment, `invoice-4471.docm`, is a macro-enabled Word document. Bob never opens it in Word. In an [[malware-sandbox|isolated analysis machine]], he lists the package and reads its core properties as text:

```bash
unzip -l invoice-4471.docm                       # the listing includes word/vbaProject.bin, the macro part
unzip -p invoice-4471.docm docProps/core.xml     # prints the core properties as XML
```

```xml
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:creator>user</dc:creator>
  <cp:lastModifiedBy>user</cp:lastModifiedBy>
  <cp:revision>3</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF">2026-09-29T08:14:00Z</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">2026-10-02T17:31:00Z</dcterms:modified>
</cp:coreProperties>
```

The generic author name and the creation date days before the "overdue invoice" was sent fit a prepared lure, but internal metadata is easy to set, so bob treats it as context. The email shows that a malicious-looking attachment reached mallory's mailbox minutes before the suspicious process started. It does not show that anyone opened the attachment; that question needs endpoint evidence.

## In practice

- **Collect originals, not forwards.** Export the message with full headers as a file, or collect it from the server or its journal, and hash it on receipt.
- **Know your own servers.** List your organization's mail hosts and authserv-ids, so you can tell where trusted fields end.
- **Convert every date.** Received fields carry their own offsets, and the Date field reflects the sender's clock. Normalize them to UTC before building a timeline.
- **Handle attachments as hazardous.** Analyze them in an isolated environment, read metadata with tools that do not execute content, and hash every extracted file.
- **Corroborate metadata.** Treat author names and internal dates as leads to confirm with independent records, such as the message that carried the file or server logs.

## Common misconceptions

- **"The From address shows who sent the message."** It shows what the sender typed. Alignment checks and server-written fields carry the evidence.
- **"Every Received field is evidence of the path."** Only fields written by servers you trust. Lower fields may be fabricated by the sender.
- **"SPF pass means the message is legitimate."** It means the server may send for the envelope domain, which an attacker can own.
- **"A DKIM pass proves who wrote the message."** It proves a domain signed it, which says nothing about the person at the keyboard.
- **"Document metadata is reliable because users never see it."** Anyone can view and edit it with common tools.

## Try it yourself

> [!ETHICS] Only examine devices, accounts, and files you own or have written permission to examine.

**Part 1: your own email.** Open a message in your own mailbox, ideally a newsletter or automated notice rather than personal correspondence, and use your mail client's option to show the original message or its full headers.

1. Find every Received field. Which ones were written by your provider, and where do the trusted fields end?
2. Find your provider's Authentication-Results field. What are its authserv-id and the SPF, DKIM, and DMARC results?
3. Compare the domain in From with the DKIM `header.d` domain and the SPF domain. Are they aligned?
4. Convert the Date field and the top Received time to UTC. How far apart are they?

**Part 2: your own document.** In Word or LibreOffice Writer, create a new document, type a sentence, and save it as `test.docx`. Then run:

```bash
unzip -p test.docx docProps/core.xml
```

Compare the creator and dates with what your word processor shows under file information. Copy the file to another folder and check its file-system times with `stat`. Which values changed with the copy, and which did not? Finally, change the author name in your word processor's settings, save again, and note how easily that field changes.

## Key takeaways

- Sort header fields by who wrote them: the sender, servers in transit, or your own verifier.
- Read Received fields from the bottom up for the route, and trust them from the top down only as far as servers you can vouch for.
- Trust Authentication-Results only from your own authserv-id, and remember that SPF and DKIM can pass for a look-alike domain while DMARC fails.
- Document metadata travels with a file and survives copying, but it reflects the author's settings and is easy to edit.
- Preserve originals with full headers, hash them, and analyze attachments in isolation.

## Go deeper

- Read RFC 8601's security considerations in [RFC 8601](https://www.rfc-editor.org/rfc/rfc8601) and explain how a forged Authentication-Results field could mislead a mail client that trusts every instance.
- Compare the Date field and trace fields in [RFC 5322](https://www.rfc-editor.org/rfc/rfc5322) with the relay rules in [RFC 5321](https://www.rfc-editor.org/rfc/rfc5321). Which fields could a malicious relay rewrite without detection?
- Open question: as more mail is created and read inside cloud services, headers increasingly reflect providers' internal systems. What should an examiner request from a provider to reconstruct a message's path?
