---
topicId: NET-05
title: TLS and certificate validation
summary: Walk through a TLS 1.3 handshake, see how a client decides whether a server's certificate chain and name deserve trust, and practice diagnosing real validation errors such as a hostname mismatch, a missing intermediate certificate, and an expired certificate.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain what each message of a TLS 1.3 handshake contributes to key agreement, server authentication, and handshake integrity.
  - Describe the checks a client makes to validate a certificate chain and to match it to the hostname it meant to reach.
  - Diagnose common validation errors from tool output and choose the correct fix on the server or the client.
  - Explain why disabling certificate validation hands control to an adversary-in-the-middle, and rewrite code that does it.
prerequisites: [NET-04, CRY-03, CRY-04]
concepts: [tls, adversary-in-the-middle]
keywords:
  - TLS 1.3
  - SSL
  - HTTPS
  - TLS handshake
  - ClientHello
  - ServerHello
  - key share
  - ECDHE
  - X25519
  - CertificateVerify
  - Finished message
  - SNI
  - server name indication
  - X.509
  - certificate chain
  - chain of trust
  - intermediate certificate
  - root store
  - trust store
  - subject alternative name
  - SAN
  - hostname verification
  - wildcard certificate
  - expired certificate
  - revocation
  - HSTS
  - Certificate Transparency
  - openssl s_client
  - man-in-the-middle
  - CWE-295
  - CWE-296
  - CWE-297
  - CWE-298
  - CWE-299
  - goto fail
  - RFC 9846
  - RFC 8446
  - RFC 5280
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 31: TLS'
    url: https://textbook.cs161.org/network/tls.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 13: Certificates'
    url: https://textbook.cs161.org/crypto/certificates.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3'
    url: https://www.rfc-editor.org/info/rfc9846
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9846-tls-1-3
  - title: 'RFC 5280: Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile'
    url: https://www.rfc-editor.org/rfc/rfc5280
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'CWE-295: Improper Certificate Validation'
    url: https://cwe.mitre.org/data/definitions/295.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 'MDN Web Docs: Strict-Transport-Security header'
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5 or later (prose); code samples CC0 or MIT
    sourceId: mdn-web-security
quiz:
  - question: In a TLS 1.3 handshake, what does the server's CertificateVerify message prove?
    choices:
      - That a certificate authority approved this particular connection.
      - That the server holds the private key for the certificate it sent, because it signs the handshake so far with that key.
      - That the client's browser is up to date.
      - That the certificate has not been revoked.
    answer: 1
    explanation: Certificates are public, so anyone can replay one. Only the holder of the matching private key can sign this handshake's transcript, which ties the certificate to this connection and to the key exchange both sides just performed.
  - question: "Users who visit https://shop.example get a certificate warning, and openssl s_client reports \"Verify return code: 62 (hostname mismatch)\". The certificate lists only DNS:www.shop.example. What is the right fix?"
    choices:
      - Add an HTTP redirect from https://shop.example to https://www.shop.example.
      - Ask users to add a permanent exception in their browsers.
      - Switch the server to an older TLS version, which checks names less strictly.
      - Get a certificate whose subject alternative names include shop.example as well as www.shop.example, and install it.
    answer: 3
    explanation: The client compares the name it meant to reach with the certificate's subject alternative names. A redirect cannot help, because the browser must validate the TLS connection to shop.example before it ever sees the redirect. Exceptions train users to ignore exactly the warning that stops an adversary-in-the-middle.
  - question: A Python script fails with "unable to get local issuer certificate" for a site that loads fine in a browser. What is the most likely cause?
    choices:
      - The server sends only its leaf certificate, not the intermediate that links it to a trusted root, and the browser happens to have that intermediate from elsewhere.
      - The site's certificate has been revoked.
      - The script is using the wrong TCP port.
      - The server's clock is set to the wrong time zone.
    answer: 0
    explanation: Path validation needs a complete chain from the leaf to a root in the client's trust store. Servers should send their leaf plus every intermediate. A client that cannot find the missing link reports that it cannot get the issuer certificate.
  - question: "A developer writes requests.get(url, verify=False) because \"the traffic is still encrypted.\" Why is that dangerous?"
    choices:
      - It is not dangerous; encryption alone keeps the data confidential.
      - It disables encryption, so all data is sent in plaintext.
      - Without validation, an adversary-in-the-middle can present any certificate, complete one handshake with the client and another with the server, and read or change everything.
      - It only matters for websites, not for API calls between servers.
    answer: 2
    explanation: Encryption protects you only if you know whom you share the keys with. Skipping validation means the client will happily agree on keys with the attacker, which is the weakness CWE-295 describes.
  - question: Alice follows a link to a site with a valid certificate for paypa1-login.example. What does that certificate tell her?
    choices:
      - That the site belongs to the real payment company.
      - Only that her connection is encrypted and goes to whoever controls paypa1-login.example, which says nothing about whether that party is honest.
      - That a certificate authority has inspected the site for phishing.
      - That the domain has existed for at least a year.
    answer: 1
    explanation: Domain-validated certificates prove control of a name, nothing more. Lookalike and typosquatted names can get valid certificates, so the padlock is not a trust signal about the operator.
---

## Why it matters

[[tls|Transport Layer Security (TLS)]] protects HTTPS, mail between servers, many VPNs, and encrypted DNS. It is much of the reason the attacks in earlier lessons are survivable. A poisoned DNS cache (see [DNS resolution and trust](lesson:NET-02)) or a spoofed ARP entry (see [ARP and local-network trust](lesson:NET-03)) can send alice's connection to mallory, but if alice's client validates the server's certificate, mallory cannot finish the handshake as `shop.example`, and the attack becomes a visible error instead of a silent theft.

That "if" carries the weight. Encryption without authentication is useless against an [[adversary-in-the-middle]], who can simply agree on one set of keys with alice and another with the server. Authentication comes from certificate validation, and validation is easy to get wrong or to switch off. MITRE's Common Weakness Enumeration lists the mistake as CWE-295, Improper Certificate Validation, with real examples that include Apple's 2014 "goto fail" bug (CVE-2014-1266) and router firmware whose updater ran curl with its insecure `-k` option (CVE-2021-22909).

TLS 1.3 was first specified in RFC 8446; RFC 9846 now replaces it as the current specification of version 1.3.

## The core idea

TLS solves two problems at once:

1. **Agree on fresh secret keys over a network the attacker controls.** Both sides run an ephemeral [[diffie-hellman]] [[key-exchange]]: each sends a one-time public value, and each combines its own secret with the other's public value to reach the same shared secret, which an eavesdropper cannot compute. Because the values are discarded afterward, a later theft of the server's long-term key does not expose old sessions, a property called [[forward-secrecy]].
2. **Make sure the other side is the server you meant.** The server presents a [[certificate]], a document that binds a public key to a name and is signed by a [[certificate-authority]] that the client already trusts. The server then proves it holds the matching private key.

Think of meeting a stranger who shows an ID card. The card is worth something only if you trust its issuer, it has not expired, the name on it is the name of the person you came to meet, and the photo matches the face in front of you. A browser checks the same four things: a trusted issuer, a valid date, the right name, and proof of possession.

The assumptions underneath:

- The client's trust store, its list of root certificate authorities, contains only authorities that behave honestly.
- Authorities issue a certificate only to whoever controls the name in it.
- The server keeps its private key private.
- The client's clock is roughly correct, and the client checks the name it intended to reach, not a name the server suggests.

## How it works

### The TLS 1.3 handshake

```sequence
title: A TLS 1.3 handshake (simplified)
participant C as Alice's browser
participant S as www.shop.example
C -> S: ClientHello: versions, suites, key share, SNI
S --> C: ServerHello: chosen suite, server key share
note: Both derive keys; the rest is encrypted
S --> C: EncryptedExtensions
S --> C: Certificate: leaf plus intermediate
S --> C: CertificateVerify: signature over the handshake
S --> C: Finished: MAC over the whole handshake
C -> S: Finished: MAC over the whole handshake
C -> S: HTTP request, encrypted with the session keys
```

The **ClientHello** lists the versions and cipher suites alice's browser supports, carries its ephemeral key share, and names the site it wants in the server name indication (SNI) field. In a standard handshake SNI travels unencrypted, so observers on the path can learn which site alice asked for. The **ServerHello** picks a cipher suite and returns the server's key share. Both sides now compute the same shared secret, and every later handshake message is encrypted.

The **Certificate** message carries the server's leaf certificate and the intermediate certificates that link it to a root. Certificates are public, and as the CS 161 textbook notes, an attacker can simply copy the real server's certificate and present it, so presenting one proves nothing by itself. The **CertificateVerify** message does the proving: the server signs a hash of the handshake so far with the private key that matches its certificate. Finally, each side sends **Finished**, a MAC over the entire handshake under keys derived from the shared secret. If an attacker altered any earlier message, for example to remove strong cipher suites, the Finished values will not match, and the connection fails.

TLS 1.3 completes this in one round trip, and it no longer allows RSA key exchange, an older method that lacked forward secrecy.

### Validating the chain

The client must connect the leaf certificate to a root it already trusts, a process called path validation and specified for Internet certificates in RFC 5280. The server sends the leaf and the intermediates; the root is already in the client's trust store.

| Check          | The question the client asks                                         | OpenSSL's message when it fails               |
| -------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| Chain building | Can I link this leaf through the intermediates to a root I trust?    | `unable to get local issuer certificate` (20) |
| Signatures     | Is each certificate signed by the key in the one above it?           | `certificate signature failure` (7)           |
| Validity dates | Is now between notBefore and notAfter for every certificate?         | `certificate has expired` (10)                |
| CA rules       | Is every certificate above the leaf allowed to act as an authority?  | `invalid CA certificate` (79)                 |
| Trust anchor   | Does the chain end at a root in my trust store, not at a stranger's? | `self-signed certificate` (18)                |
| Name           | Does the hostname I wanted match one of the certificate's DNS names? | `hostname mismatch` (62)                      |
| Revocation     | Has the issuer withdrawn this certificate early?                     | Depends on client policy                      |

The error numbers are OpenSSL 3.0's, from the lab described in the worked example. Revocation is the weakest check in practice: the CS 161 textbook explains that a client that cannot fetch fresh revocation data must either fail open, letting an attacker who blocks that fetch win, or fail closed, letting an outage block everyone.

The name check deserves emphasis. The client compares the name from the URL, `shop.example`, with the DNS names listed in the certificate's subject alternative name (SAN) extension. A wildcard such as `*.shop.example` covers exactly one label, as OpenSSL's own check shows for a lab certificate:

```text
$ openssl x509 -in wild.pem -noout -checkhost www.shop.example
Hostname www.shop.example does match certificate
$ openssl x509 -in wild.pem -noout -checkhost shop.example
Hostname shop.example does NOT match certificate
$ openssl x509 -in wild.pem -noout -checkhost a.b.shop.example
Hostname a.b.shop.example does NOT match certificate
```

### The vulnerable pattern and the fix

The most common validation bug is not subtle: someone turns validation off to make an error go away.

```python
import requests

# Vulnerable: certificate checks are disabled, so any adversary-in-the-middle
# who presents any certificate can read and change this traffic.
requests.get("https://api.shop.example/orders", verify=False)

# Fixed: validation is on by default.
requests.get("https://api.shop.example/orders")

# Fixed, for a server whose certificate comes from a private campus CA:
# trust that CA explicitly instead of trusting everyone.
requests.get("https://api.shop.example/orders", verify="/etc/ssl/campus-ca.pem")
```

The same mistake appears as `curl -k`, custom code that accepts every certificate, and code that checks the chain but never compares the hostname, all patterns that CWE-295 and its child weaknesses, such as CWE-297 for host mismatches, describe. In each case the encryption still works perfectly; it is simply shared with the attacker.

### What TLS does not do

TLS does not hide metadata: IP addresses, SNI, packet sizes, and timing stay visible. It does not vouch for honesty: a phishing site can hold a valid certificate for its own lookalike name, such as a [[typosquatting|typosquatted]] domain. It does not protect TCP itself, so a forged reset can still end a connection (see [TCP connection state](lesson:NET-04)). And it cannot protect data on a compromised endpoint.

## Worked example

The campus moved the `shop.example` ordering portal to a new server. Users who type `https://shop.example` see a browser warning, while `https://www.shop.example` works, and a nightly script now fails. To diagnose without touching production, we reproduced the server in a lab with a private teaching CA (root "Example Teaching Root CA," intermediate "Example Teaching Issuing CA"). The output below is real OpenSSL 3.0 output from that lab, trimmed, with the lab's address and file names replaced by the scenario's names.

**Step 1: Connect and ask for a name check.**

```text
$ openssl s_client -connect shop.example:443 -servername shop.example \
    -verify_hostname shop.example -CAfile teaching-root.pem
depth=0 CN = www.shop.example
verify error:num=62:hostname mismatch
verify return:1
depth=2 CN = Example Teaching Root CA
verify return:1
depth=1 CN = Example Teaching Issuing CA
verify return:1
depth=0 CN = www.shop.example
verify return:1
---
Certificate chain
 0 s:CN = www.shop.example
   i:CN = Example Teaching Issuing CA
 1 s:CN = Example Teaching Issuing CA
   i:CN = Example Teaching Root CA
---
Verification error: hostname mismatch
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
Verify return code: 62 (hostname mismatch)
```

**Step 2: Read the chain.** The server sent two certificates: the leaf (depth 0), issued by the issuing CA, and the issuing CA's certificate (depth 1), issued by the root. The root (depth 2) came from our trust file. Every link verified. The only error is 62, a hostname mismatch. Notice that `s_client` still finished the handshake; it is a diagnostic tool that reports errors and carries on. A browser stops.

**Step 3: Inspect the leaf.**

```text
$ openssl x509 -in leaf.pem -noout -subject -issuer -dates -ext subjectAltName
subject=CN = www.shop.example
issuer=CN = Example Teaching Issuing CA
notBefore=Oct 14 05:41:21 2026 GMT
notAfter=Jan 12 05:41:21 2027 GMT
X509v3 Subject Alternative Name:
    DNS:www.shop.example
```

**Step 4: Diagnose and fix the first problem.** The certificate covers only `www.shop.example`, but users asked for `shop.example`. The fix is a certificate whose SAN lists both names. A redirect from `shop.example` to `www.shop.example` cannot fix it alone, because the redirect travels inside a TLS connection that must first validate for `shop.example`.

**Step 5: Diagnose the script.** The script talks to a second lab server that was configured with only its leaf certificate:

```text
depth=0 CN = www.shop.example
verify error:num=20:unable to get local issuer certificate
verify return:1
depth=0 CN = www.shop.example
verify error:num=21:unable to verify the first certificate
...
Verify return code: 21 (unable to verify the first certificate)
```

Only one certificate arrived, and the client had no way to link it to the root. The fix belongs on the server: configure it to send the leaf and the intermediate. A browser that still loads the site may already hold that intermediate from somewhere else, which is why "it works in my browser" is not evidence that the server is configured correctly.

**Step 6: Look ahead.** Asking OpenSSL to verify the same chain as of a date 120 days in the future (`openssl verify -attime ...`) prints `certificate has expired` (error 10), because notAfter is in January 2027. The operational fix is automated renewal and expiry monitoring, not a reminder on someone's calendar.

## Defenses

- **Validate by default, everywhere.** Use the platform's standard verification and never ship `verify=False`, `curl -k`, or accept-all code. For private servers, trust a specific campus CA rather than disabling checks. Limit: a client is only as good as its trust store.
- **Serve complete chains and renew automatically.** Configure servers with the leaf and all intermediates, automate renewal, and alert well before expiry. Limit: automation fails silently unless monitored.
- **Refuse click-through for important sites.** HTTP Strict Transport Security (HSTS) tells browsers to reach a site only over HTTPS, and for such a site the browser offers no way to click through a certificate error. Limit: the first visit, before the browser has seen the header, is still exposed unless the site is on a browser's preload list.
- **Watch for certificates you did not request.** Certificate Transparency logs publicly record issued certificates, so domain owners can monitor them and spot mis-issuance. Limit: monitoring detects the problem after issuance; it does not prevent it.
- **Keep protocol versions current.** Offer TLS 1.3, and keep TLS 1.2 only with strong settings for older clients. Limit: legacy devices may force difficult trade-offs.

## Common misconceptions

- **"The padlock means the site is trustworthy."** It means the connection is encrypted to whoever controls that name.
- **"A self-signed certificate is fine because the traffic is encrypted."** Without a trusted signature, nothing distinguishes the real server's key from an attacker's.
- **"Clicking through one warning is harmless."** A warning is exactly what an adversary-in-the-middle produces. Clicking through hands the attacker the session.
- **"TLS hides which sites I visit."** The server's IP address, and normally the SNI field, are visible to the network.
- **"An expired certificate only means weaker encryption."** The cryptography is unchanged; what has lapsed is the issuer's vouching, which only ever covered the validity period.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

These commands only read the public certificate that any browser receives. Run them from your own computer. (On Windows, OpenSSL is available in Git Bash or WSL; your browser's certificate viewer works everywhere.)

```bash
# Show the negotiated protocol, the chain, and the verification result
openssl s_client -connect example.com:443 -servername example.com -brief </dev/null

# Print the leaf certificate's names and dates
openssl s_client -connect example.com:443 -servername example.com </dev/null 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

# Produce a hostname mismatch on purpose: check the real certificate
# against a name it was never issued for (the check runs on your machine)
openssl s_client -connect example.com:443 -servername example.com \
  -verify_hostname not-example.test </dev/null 2>&1 | grep -i verif
```

1. From the first command, record the protocol version, the cipher suite, and the key exchange group. Which handshake messages in the diagram produced each one?
2. From the second, list the SAN entries. Would a certificate with exactly these names be valid for `www.example.com`? For `mail.example.com`?
3. Run the third command and explain the error number you see. Why does `s_client` still connect when a browser would refuse?
4. In your browser, open the certificate viewer for any HTTPS site you use. Trace the chain from leaf to root, and find the root in your operating system's or browser's trust store.

## Key takeaways

- TLS 1.3 combines an ephemeral key exchange, which gives fresh keys and forward secrecy, with certificate-based server authentication, all confirmed by Finished messages over the whole handshake.
- A certificate is public; CertificateVerify proves that the server holds the matching private key.
- Validation means building a chain to a trusted root, checking every signature and date, and matching the intended hostname against the SAN entries.
- Most real failures are mundane: a missing name, a missing intermediate, an expired certificate, or validation switched off in code.
- TLS authenticates names, not honesty, and it leaves metadata and the TCP layer exposed.

## Go deeper

- Compare the handshake in [RFC 9846](https://www.rfc-editor.org/info/rfc9846) with the simplified diagram above: what do HelloRetryRequest and pre-shared-key resumption add, and what risks does early (0-RTT) data bring back?
- [RFC 5280](https://www.rfc-editor.org/rfc/rfc5280), Section 6, gives the full path-validation algorithm. Open question: revocation checking is often skipped or soft-fails in practice; are short certificate lifetimes a better answer than revocation?
- The [CS 161 certificates chapter](https://textbook.cs161.org/crypto/certificates.html) discusses bogus certificates in Microsoft's name issued by Verisign, and why the fix required pushing a software update. Discussion: because browsers accept any trusted authority for any name, what happens to the whole system when one authority misbehaves?
