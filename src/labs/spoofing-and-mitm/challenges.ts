import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { DNS_POISON_FLAG, ONPATH_FLAG } from './engine';

const lab = 'spoofing-and-mitm';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'mitm-read-arp',
    labId: lab,
    title: 'Read the ARP table',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['NET-03'],
    prompt:
      'On the **ARP** tab, read the local network. **What is the IP address of the gateway (router)?** All traffic to the internet passes through it, which is why it is the attacker&rsquo;s target.',
    hints: [
      'The gateway is the router role in the device list.',
      'It is the .1 address on the 192.0.2.0/24 network.',
    ],
    acceptedHashes: [hashAnswer('192.0.2.1')],
    solution:
      'The gateway is **192.0.2.1**. Because every packet bound for outside the LAN goes through the gateway, an attacker who can impersonate it sees (and can alter) all of that traffic. That is why ARP spoofing targets the gateway&rsquo;s IP.',
  },
  {
    id: 'mitm-become',
    labId: lab,
    title: 'Become the man in the middle',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['NET-03'],
    prompt:
      'ARP has no authentication. On the **ARP** tab, run the spoof so the victim believes the attacker is the gateway, putting the attacker on the path. Submit the flag revealed once you are on-path.',
    hints: [
      'A gratuitous ARP reply claims an IP the attacker does not own.',
      'Watch the gateway IP rebind to the attacker&rsquo;s MAC address.',
    ],
    acceptedHashes: [hashAnswer(ONPATH_FLAG)],
    solution:
      'ARP replies are trusted without verification, so the attacker sends an unsolicited (gratuitous) reply mapping the gateway&rsquo;s IP to its own MAC. The victim now sends gateway-bound traffic to the attacker — a man-in-the-middle / on-path position. The attacker can read and modify traffic that is not independently protected (e.g. by TLS).',
  },
  {
    id: 'mitm-poison-dns',
    labId: lab,
    title: 'Poison the resolver',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['NET-02'],
    prompt:
      'On the **DNS** tab, inject a forged record so that a trusted hostname resolves to the attacker&rsquo;s address. Submit the flag revealed when the poisoned record is cached.',
    hints: [
      'With no DNSSEC, the resolver accepts a record it cannot verify.',
      'After poisoning, look up the protected host and see where it points.',
    ],
    acceptedHashes: [hashAnswer(DNS_POISON_FLAG)],
    solution:
      'DNS responses are unauthenticated by default, so a forged record for a trusted name can be slipped into the resolver&rsquo;s cache. Every later lookup returns the attacker&rsquo;s address until the record expires — users are silently redirected even though they typed the right name.',
  },
  {
    id: 'mitm-spot-spoof',
    labId: lab,
    title: 'Spot the spoof',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['NET-03'],
    prompt:
      'An ARP reply that nobody requested — sent to overwrite a victim&rsquo;s table — has a specific name. **What is that kind of unsolicited ARP reply called?** (One word.)',
    hints: [
      'It is &ldquo;unsolicited&rdquo; or &ldquo;unrequested&rdquo; in one word.',
      'The same word describes an insult given without provocation.',
    ],
    acceptedHashes: [
      hashAnswer('gratuitous'),
      hashAnswer('gratuitous arp'),
      hashAnswer('a gratuitous arp'),
    ],
    solution:
      'It is a **gratuitous** ARP reply — one sent without a matching request. Legitimately it announces an address change; abused, it overwrites a victim&rsquo;s cache to redirect traffic. A second tell-tale is that two different IPs now map to the same MAC, which monitoring and dynamic ARP inspection can catch.',
  },
  {
    id: 'mitm-harden',
    labId: lab,
    title: 'Harden the LAN',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['NET-03'],
    prompt:
      'On the **ARP** tab, enable **dynamic ARP inspection** (or static entries) and run the spoof again. The lab marks this solved once the spoof is rejected and the attacker can no longer get on the path.',
    hints: [
      'Dynamic ARP inspection validates ARP replies against a trusted binding.',
      'With it on, the gratuitous reply is dropped and the gateway binding holds.',
    ],
    solution:
      'Dynamic ARP inspection (DAI) checks ARP replies against a trusted IP-to-MAC binding (from DHCP snooping or static entries) and drops ones that do not match. The gratuitous reply is rejected, so the gateway binding stays honest and the attacker never reaches an on-path position.',
  },
  {
    id: 'mitm-dnssec',
    labId: lab,
    title: 'Validate with DNSSEC',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['NET-02'],
    prompt:
      'On the **DNS** tab, enable **DNSSEC** and attempt the cache poisoning again. The lab marks this solved once the forged record fails validation and the honest answer stands.',
    hints: [
      'DNSSEC signs records so forgeries fail a signature check.',
      'With it on, the poisoned record is rejected and the real IP remains.',
    ],
    solution:
      'DNSSEC adds cryptographic signatures to DNS records, so a resolver can verify that an answer really came from the zone&rsquo;s owner. A forged record has no valid signature and is rejected, which stops cache poisoning for signed zones. It protects integrity and authenticity of records, not their confidentiality.',
  },
];
