---
topicId: CRY-04
title: Digital signatures and certificate systems
summary: Learn how digital signatures prove who produced data, how X.509 certificates and certificate authorities bind public keys to names, and how to validate a certificate chain and a signed token step by step.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Explain what a digital signature guarantees, and contrast it with a MAC in who can create, who can verify, and non-repudiation.
  - Validate a sample certificate chain by checking signatures, validity dates, CA constraints, key usage, revocation, and the hostname.
  - Explain why a verifier must choose the algorithm and key itself, using JWT "alg" confusion as the example.
  - Identify which validation step stops a given forgery, such as a copied certificate or a certificate signed by a non-CA.
prerequisites: [CRY-01, CRY-03]
concepts: [digital-signature, certificate, certificate-authority, public-key-infrastructure]
labs: [jwt]
keywords:
  - digital signature
  - X.509
  - PKI
  - CA
  - root CA
  - intermediate CA
  - trust anchor
  - root store
  - chain of trust
  - certification path validation
  - subject alternative name
  - SAN
  - basicConstraints
  - key usage
  - CRL
  - OCSP
  - revocation
  - RSA-PSS
  - ECDSA
  - EdDSA
  - Ed25519
  - JWS
  - JWT
  - alg none
  - HS256
  - RS256
  - RFC 5280
  - RFC 7519
  - RFC 8725
  - FIPS 186-5
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 12: Digital Signatures'
    url: https://textbook.cs161.org/crypto/signatures.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 13: Certificates'
    url: https://textbook.cs161.org/crypto/certificates.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 5280: Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile'
    url: https://www.rfc-editor.org/info/rfc5280
    publisher: IETF (RFC Editor)
  - title: 'RFC 9846: The Transport Layer Security (TLS) Protocol Version 1.3'
    url: https://www.rfc-editor.org/info/rfc9846
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-9846-tls-1-3
  - title: 'RFC 7519: JSON Web Token (JWT)'
    url: https://www.rfc-editor.org/info/rfc7519
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-7519-jwt
  - title: 'RFC 8725: JSON Web Token Best Current Practices'
    url: https://www.rfc-editor.org/info/rfc8725
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
    sourceId: rfc-8725-jwt-bcp
quiz:
  - question: Why can a MAC not provide non-repudiation, while a digital signature can?
    choices:
      - MAC tags are shorter than signatures.
      - MACs are built from hash functions.
      - With a MAC, both parties hold the same key, so either could have produced the tag; only the private-key holder can produce a signature.
      - Signatures are encrypted and MAC tags are not.
    answer: 2
    explanation: Non-repudiation asks whether a third party can tell who created a message. A shared MAC key means the verifier could have made the tag itself. A signature needs the private key, which only the signer holds, although a stolen key still undermines the claim.
  - question: While validating a chain, you find that the certificate acting as the intermediate has basicConstraints set to CA:FALSE. What should the verifier do?
    choices:
      - Reject the chain, because a certificate that is not a CA must not be used to sign other certificates.
      - Accept the chain, because the intermediate's signature verifies.
      - Accept the chain, as long as the root is in the trust store.
      - Ignore the extension, because extensions are optional.
    answer: 0
    explanation: Without this check, anyone holding an ordinary certificate for their own domain could issue certificates for any other name. A valid signature only shows who signed; the CA flag shows whether that signer was allowed to.
  - question: A JWT verifier reads the "alg" field from the token header and uses whatever algorithm it names. Which token could an attacker get accepted?
    choices:
      - Only tokens signed with the server's private key.
      - Only tokens that are encrypted.
      - None, because the header is covered by the signature.
      - A token whose header says "none" and whose signature is empty, unless the library refuses "none".
    answer: 3
    explanation: With "none" there is no signature to check, so the header's integrity protection never runs. RFC 8725 requires libraries to let the caller fix the set of accepted algorithms, and to tie each key to exactly one algorithm.
  - question: Mallory copies the genuine certificate chain of www.shop.example and serves it from her own server. Why does the browser still reject her?
    choices:
      - The certificate is encrypted so that only the real server can send it.
      - The browser checks a signature over the handshake made with the private key of the leaf certificate, which Mallory does not have.
      - Each certificate can be downloaded only once.
      - The certificate lists the server's IP address, and hers differs.
    answer: 1
    explanation: Certificates are public, so copying one is easy. Authentication comes from proving possession of the matching private key, which in TLS 1.3 is a signature over the handshake transcript.
  - question: Which check shows that a certificate was issued for the site the user is actually visiting?
    choices:
      - The certificate's signature verifies under the issuer's key.
      - The certificate is within its validity period.
      - The requested hostname matches one of the certificate's subject alternative names.
      - The root certificate is self-signed.
    answer: 2
    explanation: Every other check can pass for a perfectly valid certificate that belongs to a different site. Name matching ties the chain to the connection the user asked for.
---

## Why it matters

Signatures carry trust across the internet. A browser decides that a server really is shop.example by checking a [[certificate]] chain. An operating system installs an update only if it is signed by the vendor, and a web API accepts a login token only if the token's signature or MAC verifies. In each case the cryptography is rarely what fails. The verifier fails to perform a check: it skips the hostname, ignores whether the issuer was allowed to issue, or lets the token choose its own algorithm.

The trust system has failed at the top, too. The CS 161 textbook recounts how Verisign once issued certificates in the name of "Microsoft Corporation" to someone else and had no way to revoke them, so Microsoft had to ship a software patch listing the bad certificates. Because a browser trusts every certificate authority in its store equally, one mistaken authority can affect every site.

## The core idea

A [[digital-signature]] is the public-key counterpart of a MAC. The signer uses a **private key**; anyone with the matching **public key** can verify. Think of a wax seal pressed with a unique signet ring: anyone who knows what the seal looks like can check it, but only the ring's owner can make it.

A signature alone does not tell you whose key you hold. A **certificate** solves this: it is a signed statement, made by a [[certificate-authority]] (CA), that a public key belongs to a name such as `www.shop.example`. Your device starts with a small set of trusted CA keys, the **trust anchors** in its root store, and accepts other keys only when a chain of signatures leads back to one of them. The certificates, authorities, policies, and software together form a [[public-key-infrastructure]] (PKI).

The assumptions to keep in mind:

- Private keys stay private; one stolen signing key forges anything.
- The verifier's trust anchors are the right ones, and every CA in the store behaves.
- The hash inside the signature scheme is collision resistant.
- **The verifier performs every check.** Many real failures break this assumption.

## How it works

### Signing and verifying

A signature scheme has three algorithms. **KeyGen** produces a key pair. **Sign** takes the private key and a message and outputs a signature. **Verify** takes the public key, the message, and the signature and returns accept or reject. The security goal, in the CS 161 textbook's forgery game, is that an attacker who can obtain signatures on messages of her choice still cannot produce a valid signature on any new message.

Most signature schemes hash the message and sign the digest, which is why they depend on collision resistance. Widely used schemes include RSA (with PSS or PKCS #1 v1.5 padding), ECDSA, and EdDSA such as Ed25519. NIST's Digital Signature Standard, [FIPS 186-5](https://csrc.nist.gov/pubs/fips/186-5/final) (2023), specifies the algorithms approved for US federal use. ECDSA needs a fresh, secret random value for every signature; repeating it leaks the private key, a failure covered in [randomness and key lifecycle](lesson:CRY-06). Ed25519 derives that value deterministically, which removes the risk.

```python
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

signing_key = Ed25519PrivateKey.generate()   # stays with shop.example's release system
verify_key = signing_key.public_key()        # shipped inside the previous app version
release = b"contents of shop-app-2.4.1.zip"
signature = signing_key.sign(release)        # 64 bytes

verify_key.verify(signature, release)        # returns None: valid
try:
    verify_key.verify(signature, release + b"!")
except InvalidSignature:
    print("rejected: release was modified")
```

### Signatures compared with MACs

|                       | MAC (for example HMAC-SHA256)           | Digital signature (for example Ed25519)   |
| --------------------- | --------------------------------------- | ----------------------------------------- |
| Who can create it     | Anyone holding the shared key           | Only the private-key holder               |
| Who can verify it     | Only holders of the same shared key     | Anyone with the public key                |
| Non-repudiation       | No; either key holder could have made it | Yes, as long as the private key is safe   |
| Speed and size        | Very fast, 32-byte tag                  | Slower, 64 bytes or more                  |
| Key distribution      | Needs a secret channel                  | Needs an authentic public key             |

Signatures provide integrity and authenticity, not confidentiality. A signed message is still readable by anyone who sees it.

### What a certificate contains

An X.509 certificate, profiled for the internet by RFC 5280, holds:

- **Subject** and **subject alternative names (SANs)**: the names the key belongs to, such as `DNS:www.shop.example`. Modern clients match hostnames against the SAN entries.
- **Subject public key**: the key being vouched for.
- **Issuer**: the CA that signed it, and the issuer's **signature** over all of the fields.
- **Validity period**: `notBefore` and `notAfter`.
- **Extensions** that limit use. **Basic constraints** say whether the certificate may act as a CA (`CA:TRUE`) and how many CA levels may follow (`pathLen`). **Key usage** and **extended key usage** restrict what the key may do, for example sign certificates or authenticate a TLS server.

### Chains, validation, and revocation

A server sends its **leaf** certificate and one or more **intermediate** CA certificates. The client builds a path from the leaf to a trust anchor in its own store and validates every link. RFC 5280 gives the full path-validation algorithm; the core checks appear in the worked example below. A root certificate is usually self-signed, but its signature proves nothing. It is trusted only because it is already in the store.

Certificates can be withdrawn before they expire, through revocation lists (CRLs) that the CA signs and publishes, or through online status checks. The CS 161 textbook explains the dilemma: if a client cannot fetch current revocation data, it must either accept possibly revoked certificates or refuse service. Short validity periods limit how long a bad certificate stays usable.

### Signed tokens: JWTs

A signed [[jwt|JSON Web Token]] (RFC 7519) is three base64url parts separated by dots: a header, a payload of claims, and a signature over the first two. The header's `alg` names the algorithm. `HS256` is HMAC-SHA256, which is really a **MAC** with a shared secret; `RS256`, `ES256`, and `EdDSA` are true signatures; `none` means no protection at all. The payload is only encoded, not encrypted, so anyone holding the token can read its claims.

RFC 8725 describes the classic failures: libraries that accepted `none`, verifiers tricked into checking an RS256 token with HMAC using the RSA public key as the secret, and HMAC keys made from guessable passwords that an attacker can brute-force offline. Its rule is that the **verifier**, not the token, decides which algorithm and key to use:

```python
# Vulnerable: the token chooses how it is checked
def verify_any(header: dict, claims: dict, signature: bytes) -> dict:
    alg = header["alg"]
    if alg == "none":
        return claims                  # accepts unsigned tokens
    key = RSA_PUBLIC_KEY if alg == "RS256" else HMAC_SECRET   # invites key confusion
    ...
```

```python
import base64, hashlib, hmac, json, time

def b64url_decode(part: str) -> bytes:
    return base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))

def verify_hs256(token: str, key: bytes) -> dict:
    header_b64, payload_b64, sig_b64 = token.split(".")
    if json.loads(b64url_decode(header_b64)).get("alg") != "HS256":
        raise ValueError("unexpected algorithm")       # fixed allowlist of one
    expected = hmac.new(key, f"{header_b64}.{payload_b64}".encode(), hashlib.sha256).digest()
    if not hmac.compare_digest(expected, b64url_decode(sig_b64)):
        raise ValueError("bad signature")
    claims = json.loads(b64url_decode(payload_b64))
    if claims.get("iss") != "https://shop.example" or claims.get("aud") != "shop.example":
        raise ValueError("wrong issuer or audience")
    if claims.get("exp", 0) <= time.time():
        raise ValueError("expired")
    return claims
```

In production, use a maintained JWT library configured with an explicit algorithm allowlist and required claims, rather than parsing tokens yourself.

## Worked example

Validate the chain that www.shop.example presents to a browser on October 14, 2026. The certificates are fictional.

| Field             | Leaf                               | Intermediate                  | Root (in the trust store) |
| ----------------- | ---------------------------------- | ----------------------------- | ------------------------- |
| Subject           | www.shop.example                   | Example Issuing CA 1          | Example Root CA           |
| SANs              | shop.example, www.shop.example     | none                          | none                      |
| Issuer            | Example Issuing CA 1               | Example Root CA               | Example Root CA (self)    |
| Validity          | 2026-09-01 to 2026-11-29           | 2025-01-01 to 2030-12-31      | 2020-01-01 to 2040-12-31  |
| Basic constraints | CA:FALSE                           | CA:TRUE, pathLen 0            | CA:TRUE                   |
| Key usage         | digitalSignature; EKU serverAuth   | keyCertSign, cRLSign          | keyCertSign, cRLSign      |

```sequence
title: Checking a server's certificate chain
participant C as Browser
participant S as www.shop.example
C -> S: ClientHello for www.shop.example
S --> C: Certificate: leaf and intermediate
S --> C: CertificateVerify: signature over handshake
note C: Build a path to a trusted root and check each link
note C: Verify the handshake signature with the leaf key
C -> S: Finished: server authenticated
```

Step 1. **Build the path.** The leaf's issuer matches the intermediate's subject, and the intermediate's issuer matches a root that is already in the browser's store.

Step 2. **Check every signature.** The leaf's signature verifies with the intermediate's public key, and the intermediate's verifies with the root's public key.

Step 3. **Check the dates.** October 14, 2026 falls inside all three validity periods.

Step 4. **Check CA authority.** The intermediate has `CA:TRUE` and `keyCertSign`, so it may issue certificates. Its `pathLen 0` means no further CA may sit below it, and the leaf is not a CA, so the path is allowed.

Step 5. **Check purpose and name.** The leaf allows TLS server authentication, and the requested name `www.shop.example` matches a SAN entry.

Step 6. **Check revocation.** Neither the leaf nor the intermediate appears in current revocation data from its issuer.

Step 7. **Check possession of the key.** In TLS 1.3, the server's CertificateVerify message is a signature over the entire handshake (RFC 9846), and it verifies with the leaf's public key. Only now is the server authenticated.

Now change one fact at a time and find the step that fails:

- The user visits `api.shop.example`. Step 5 fails: that name is not among the SANs.
- Mallory holds a valid leaf certificate for `mallory.example` and uses its key to sign a certificate for `www.shop.example`. Step 4 fails, because her certificate says `CA:FALSE`.
- The date is December 1, 2026. Step 3 fails: the leaf has expired.
- Mallory copies the genuine chain to her own server. Steps 1 to 6 pass, but step 7 fails, because she cannot sign the handshake without the leaf's private key.

## Defenses

- **Use a platform or library verifier**, never a hand-written one, and never disable checks. Code that turns off hostname or chain verification "for testing" can easily reach production.
- **Check names, dates, constraints, purposes, and revocation**, not just signatures. A signature only says who signed, not whether they were allowed to.
- **Keep trust stores small and current.** Remove CAs your system does not need; for internal services, use a private root that only those clients trust.
- **Protect signing keys** in hardware security modules or managed key services, limit who can sign, and log every signature for audit.
- **For tokens, fix the algorithm and key on the verifier side**, reject `none`, use strong random HMAC keys or asymmetric keys, and validate `iss`, `aud`, and `exp`, as RFC 8725 directs.

Limits remain. A trusted CA that misissues a certificate passes every check, and revocation is slow and unreliable. Signatures prove who signed, not that the signed content is safe.

## Common misconceptions

- **"The root's self-signature proves it is trustworthy."** Anyone can self-sign. A root is trusted only because it is in the store.
- **"A certificate proves the site is honest."** It binds a key to a name. A phishing site can hold a perfectly valid certificate for its own lookalike name.
- **"Signed means encrypted."** Signatures do not hide anything. A signed JWT's claims are readable by anyone who holds it.
- **"HS256 tokens are signed."** HS256 is a MAC; every service that can verify a token can also mint one.
- **"Copying a certificate lets you impersonate the site."** Certificates are public. Impersonation needs the private key.

## Try it in the lab

In [the lab](lab:jwt), you work with the session token of a fictional application. You decode it and confirm that its claims are only base64url-encoded. Then you forge an admin token whose header claims `alg: none` and watch a weak verifier accept it, and you recover the service's guessable HMAC secret from a short wordlist and sign a token that even a strict verifier trusts. Finally, you switch to a verifier that pins the algorithm and requires a signature, and run a battery of forged and tampered tokens against it. Throughout, connect each step to the RFC 8725 practice it illustrates, and note the one problem the strict verifier cannot fix: a key weak enough to guess has to be replaced.

> [!ETHICS] Only test systems you own or have written permission to test.

**Without the lab.** Use Python on your own machine. This sample token was signed with HS256 using the 32-byte key `6f1c2b8e9d0a4f3b7c5e1a2d8f9b0c3e4a6d7f8e9c0b1a2d3e4f5a6b7c8d9e0f` (hex), which is published here for practice and protects nothing:

```text
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbGljZSIsInJvbGUiOiJzdHVkZW50IiwiaXNzIjoiaHR0cHM6Ly9zaG9wLmV4YW1wbGUiLCJhdWQiOiJzaG9wLmV4YW1wbGUiLCJleHAiOjE4OTM0NTYwMDB9.RjdvrDGwe1G0V0oqsIdsmRUSBlD9psCsxpMQBeKBoEE
```

Decode the header and payload by hand with `b64url_decode`, then run `verify_hs256` with the key. Change `"role":"student"` to `"role":"admin"`, re-encode the payload, keep the old signature, and confirm that verification fails. Finally, open any HTTPS site in your browser, view its certificate through the address bar, and fill in a table like the one in the worked example from the real chain.

## Key takeaways

- A digital signature lets anyone verify what only the private-key holder could create; a MAC cannot separate the two parties.
- A certificate is a CA's signature binding a public key to a name, and trust flows from anchors already in your store.
- Validation means checking every link: signatures, dates, CA constraints, purposes, revocation, the hostname, and proof of the private key.
- The verifier, never the token or message, chooses the algorithm and key.
- Signatures provide integrity and authenticity, not confidentiality.

## Go deeper

- [RFC 5280](https://www.rfc-editor.org/info/rfc5280), Section 6, gives the full certification path validation algorithm, including name constraints and policy processing that this lesson skipped.
- [TLS and certificate validation](lesson:NET-05) applies these checks inside a real TLS handshake; trace where each validation step happens.
- [RFC 8725](https://www.rfc-editor.org/info/rfc8725) lists JWT threats such as substitution and cross-JWT confusion. Explain how the `aud` claim and explicit typing defend against each.
- Open question: revocation that depends on online checks fails open or fails closed. Compare short-lived certificates with revocation lists, using the trade-offs in the CS 161 [certificates chapter](https://textbook.cs161.org/crypto/certificates.html).
