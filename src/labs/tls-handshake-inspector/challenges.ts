import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { CERT_PIN_FLAG } from './engine';

const lab = 'tls-handshake-inspector';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'tls-trace',
    labId: lab,
    title: 'Trace the handshake',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['NET-05'],
    prompt:
      'On the **Handshake** tab, turn verification on and validate the **Valid certificate**. The client confirms the certificate was signed by an authority it already trusts. **Which key does it use to check that signature?** (Two words.)',
    hints: [
      'A signature made with a private key is checked with the matching public key.',
      'The client ships with the certificate authority&rsquo;s key, not the server&rsquo;s.',
    ],
    acceptedHashes: [
      hashAnswer('public key'),
      hashAnswer('the public key'),
      hashAnswer('ca public key'),
      hashAnswer('the ca public key'),
      hashAnswer("ca's public key"),
      hashAnswer('cas public key'),
      hashAnswer("the ca's public key"),
      hashAnswer('the cas public key'),
      hashAnswer('trusted ca public key'),
      hashAnswer("the certificate authority's public key"),
    ],
    solution:
      'The client verifies the certificate with the **CA&rsquo;s public key**. The authority signed the certificate with its *private* key, and anyone can check that signature with the matching *public* key, which ships in the client&rsquo;s trust store. Because only the authority holds the private key, a valid signature means a trusted authority really vouched for this certificate. This is why signing is not encryption: the goal is proof of origin, not secrecy.',
  },
  {
    id: 'tls-expired',
    labId: lab,
    title: 'Catch the expired certificate',
    difficulty: 'beginner',
    points: 15,
    kind: 'answer',
    topicIds: ['NET-05'],
    prompt:
      'Validate the **Expired certificate**. Its signature is from the trusted CA and the hostname matches, yet the client still rejects it. **Which single check fails?** Name it in a word or two.',
    hints: [
      'Every certificate carries a &ldquo;not before&rdquo; and &ldquo;not after&rdquo; date.',
      'Compare those dates to the client&rsquo;s current time in the report.',
    ],
    acceptedHashes: [
      hashAnswer('validity period'),
      hashAnswer('validity'),
      hashAnswer('the validity period'),
      hashAnswer('validity period check'),
      hashAnswer('the validity period check'),
      hashAnswer('validity check'),
      hashAnswer('expiry'),
      hashAnswer('the expiry check'),
      hashAnswer('expired'),
      hashAnswer('expiration'),
      hashAnswer('not expired'),
      hashAnswer('notexpired'),
    ],
    solution:
      'The **validity period** check fails. A certificate is only valid between its *notBefore* and *notAfter* dates; past *notAfter* the client must reject it even though the signature is still mathematically valid. Expiry forces keys to be rotated and gives revocation a natural backstop. An attacker who recovers an old key cannot reuse the matching certificate once it has lapsed.',
  },
  {
    id: 'tls-hostname',
    labId: lab,
    title: 'Hostname mismatch',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['NET-05'],
    prompt:
      'Validate the **Hostname mismatch** certificate. It is signed by the trusted CA and is not expired, but the client refuses it anyway. Read the report: **what hostname is this certificate actually issued for?**',
    hints: [
      'The requested host is shop.example.test — the client is reaching for that name.',
      'Look at the certificate&rsquo;s **subject** field, not the host you asked for.',
    ],
    acceptedHashes: [
      hashAnswer('other.example.test'),
      hashAnswer('https://other.example.test'),
    ],
    solution:
      'The certificate&rsquo;s subject is **other.example.test**, but the client asked for shop.example.test, so the names do not match and the certificate is rejected. A valid signature only proves the authority issued the certificate; it says nothing about *which* site may use it. Checking that the subject (or a subject-alternative name) matches the host you intended to reach is what stops an attacker from presenting a legitimately-signed certificate for a site they do not control.',
  },
  {
    id: 'tls-trust-policy',
    labId: lab,
    title: 'Build the trust policy',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['NET-05', 'CRY-04'],
    prompt:
      'A client that accepts any certificate is not secure — it is the classic &ldquo;disabled certificate verification&rdquo; bug. Turn **verification on** and validate all four certificates so that only the valid one is accepted and the expired, mismatched, and self-signed ones are rejected. The lab marks this solved once your policy sorts all four correctly.',
    hints: [
      'With verification off, every certificate is accepted — that is the vulnerability.',
      'A correct policy needs the trusted CA, the intended hostname, and the current time.',
    ],
    solution:
      'A trust policy answers three questions for every certificate: is the signature from a CA I trust, is the certificate within its validity period, and does its subject match the host I intended to reach? Only the valid certificate passes all three; the expired, hostname-mismatched, and self-signed certificates each fail one. Disabling verification (accepting any certificate) throws all of this away and is the single most common TLS mistake in real applications.',
  },
  {
    id: 'tls-hsts',
    labId: lab,
    title: 'Defeat SSL stripping with HSTS',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['NET-05'],
    prompt:
      'On the **HSTS** tab, an on-path attacker downgrades the first request from https to plain http (SSL stripping) and reads everything. **Enable HSTS**, then attempt the downgraded connection again. The lab marks this solved once the browser refuses to speak http to this host.',
    hints: [
      'SSL stripping works because the very first request is plain http, before any redirect.',
      'HSTS tells the browser: for this host, always use https and never http.',
    ],
    solution:
      'SSL stripping relies on that first unprotected http request: an on-path attacker intercepts it, talks https to the server itself, and relays plaintext to the victim. **HTTP Strict Transport Security** closes the gap by telling the browser to upgrade every request to this host to https and to refuse http outright, so there is no plaintext request for the attacker to strip. Preloading HSTS protects even the very first visit.',
  },
  {
    id: 'tls-pin',
    labId: lab,
    title: 'Pin the certificate',
    difficulty: 'advanced',
    points: 25,
    kind: 'flag',
    topicIds: ['NET-05', 'CRY-04'],
    prompt:
      'On the **Pinning** tab, an attacker presents a *different* certificate that is still validly signed by the trusted CA for the right host (a mis-issued or rogue certificate). Normal validation accepts it. **Enable certificate pinning** so only the genuine key is trusted, watch the rogue certificate get rejected, and submit the flag that appears.',
    hints: [
      'Both certificates pass signature, validity, and hostname checks — pinning adds a fourth.',
      'Pinning compares the leaf&rsquo;s key fingerprint to one specific expected value.',
    ],
    acceptedHashes: [hashAnswer(CERT_PIN_FLAG)],
    solution:
      'Certificate (or public-key) pinning records the exact key fingerprint the client expects and rejects any other certificate, even one a trusted CA signed. It defends against a compromised or coerced certificate authority that mis-issues a certificate for your host: the signature checks out, but the key is not the pinned one. The trade-off is operational — rotate a pinned key carelessly and you lock out your own clients — so pinning is used where that risk is worth it.',
  },
];
