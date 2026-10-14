import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { ADMIN_FLAG, METADATA_FLAG } from './engine';

const lab = 'ssrf-url-filter';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'ssrf-metadata',
    labId: lab,
    title: 'Steal cloud credentials',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['APP-05'],
    prompt:
      'The server fetches any URL you give it. With no defenses, point it at the cloud metadata service at **http://169.254.169.254/latest/meta-data/iam/** and submit the flag in the credentials it returns.',
    hints: [
      '169.254.169.254 is the link-local address cloud instances use for metadata.',
      'The server can reach it even though you cannot — that is the whole point of SSRF.',
    ],
    acceptedHashes: [hashAnswer(METADATA_FLAG)],
    solution: `The fetcher runs inside the network, so it can reach the link-local metadata endpoint that hands out the instance&rsquo;s IAM credentials. An attacker who controls the fetched URL exfiltrates those keys. The flag is **${METADATA_FLAG}**. Cloud metadata is the classic SSRF prize.`,
  },
  {
    id: 'ssrf-term',
    labId: lab,
    title: 'Name the attack',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['APP-05'],
    prompt:
      'Making a server fetch an attacker-chosen URL so it reaches internal resources on the attacker&rsquo;s behalf has a three-word name (and a four-letter acronym). **What is it?**',
    hints: ['The acronym is SSRF.', 'It expands to &ldquo;server-side request ___&rdquo;.'],
    acceptedHashes: [
      hashAnswer('ssrf'),
      hashAnswer('server-side request forgery'),
      hashAnswer('server side request forgery'),
    ],
    solution:
      '**SSRF — server-side request forgery.** The server becomes a confused deputy: it holds network access the attacker lacks, and the attacker steers it. Targets include cloud metadata, internal admin panels, and services bound to loopback or private ranges.',
  },
  {
    id: 'ssrf-localhost',
    labId: lab,
    title: 'Reach the loopback admin',
    difficulty: 'intermediate',
    points: 15,
    kind: 'flag',
    topicIds: ['APP-05'],
    prompt:
      'Internal services often bind to localhost, trusting that only the host can reach them. Fetch **http://localhost:8080/admin** through the server and submit the flag.',
    hints: [
      'From the server&rsquo;s point of view, localhost is the server itself.',
      'Loopback (127.0.0.1) is just as internal as any private address.',
    ],
    acceptedHashes: [hashAnswer(ADMIN_FLAG)],
    solution: `A service bound to localhost is reachable by anything running on that host — including your SSRF-controlled fetcher. &ldquo;Only local&rdquo; is not an access control when an attacker can make the server issue the request. The flag is **${ADMIN_FLAG}**.`,
  },
  {
    id: 'ssrf-block-ip',
    labId: lab,
    title: 'Block the internal ranges',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['APP-05', 'APP-02'],
    prompt:
      'Enable **block internal IPs** (resolve the host, then refuse loopback, link-local, and private addresses) and retry the metadata fetch. The lab marks this solved once the internal request is refused.',
    hints: [
      'The check must run on the *resolved* IP, not the hostname string.',
      'That way even metadata.evil.example — which resolves to 169.254.169.254 — is caught.',
    ],
    solution:
      'Resolve the hostname to an IP and reject loopback (127.0.0.0/8), link-local (169.254.0.0/16), and private (10/8, 172.16/12, 192.168/16) ranges before connecting. Checking the resolved IP — not the string — is what defeats hostnames that point inward. Re-check after redirects, and ideally pin the connection to the validated IP to resist DNS rebinding.',
  },
  {
    id: 'ssrf-allowlist',
    labId: lab,
    title: 'Allowlist destinations',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['APP-05'],
    prompt:
      'Enable the **destination allowlist** (only example.com and api.example.com) and retry an internal fetch. The lab marks this solved once a host that is not on the list is refused.',
    hints: [
      'Where the set of legitimate destinations is known, an allowlist is the strongest control.',
      'Anything not explicitly allowed — including 169.254.169.254 — is denied by default.',
    ],
    solution:
      'When a feature only ever needs to reach a known set of hosts, allowlist them and deny everything else by default. It is far more robust than trying to enumerate every dangerous address. Combine it with resolved-IP checks for fetchers that must accept arbitrary user URLs.',
  },
  {
    id: 'ssrf-resolve',
    labId: lab,
    title: 'Why the string is not enough',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['APP-05', 'APP-02'],
    prompt:
      'A blocklist of hostnames is bypassed when a benign-looking name resolves to an internal address. **What must you validate instead of (or as well as) the hostname text?**',
    hints: [
      'The attacker controls the name; you control what you do after resolving it.',
      'Think about what the name turns into before the connection is made.',
    ],
    acceptedHashes: [
      hashAnswer('the resolved ip address'),
      hashAnswer('resolved ip address'),
      hashAnswer('the resolved ip'),
      hashAnswer('resolved ip'),
      hashAnswer('ip address'),
      hashAnswer('the ip address'),
      hashAnswer('ip'),
    ],
    solution:
      'Validate the **resolved IP address**, not the hostname string. The attacker picks the name, and DNS can point it anywhere — including an internal range — so a name-based blocklist is trivially bypassed. Resolve first, reject internal IPs, and pin the connection to the address you validated so it cannot change between the check and the request.',
  },
];
