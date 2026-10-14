import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { LEAKED_SUBDOMAIN_FLAG } from './engine';

const lab = 'recon-and-attack-surface';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'recon-footprint',
    labId: lab,
    title: 'Build the footprint',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['FND-04'],
    prompt:
      'Reconnaissance starts with open-source intelligence. On the **OSINT** tab, open every intelligence source to reveal all of the organization&rsquo;s hosts. The lab marks this solved once your footprint is complete.',
    hints: [
      'Each source reveals one or more hosts; you need all of them.',
      'DNS shows the obvious public hosts, but certificate logs, job posts, and code leaks reveal the rest.',
    ],
    solution:
      'A footprint is the full set of an organization&rsquo;s internet-facing assets. Public DNS shows the intended hosts, but certificate-transparency logs, job postings, and leaked code reveal hosts the organization never meant to publish. Attackers assemble this picture first; defenders should run the same searches against themselves.',
  },
  {
    id: 'recon-leaked-subdomain',
    labId: lab,
    title: 'Find the leaked subdomain',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['FND-04', 'NET-02'],
    prompt:
      'One internal-only host was exposed because a TLS certificate was issued for it and logged publicly. Find that host on the **OSINT** or **Surface** tab and submit the flag shown when you inspect it.',
    hints: [
      'Certificate-transparency logs record every certificate issued, even for hosts not in public DNS.',
      'Look for an admin host with an internal (10.x) address that is still reachable from the internet.',
    ],
    acceptedHashes: [hashAnswer(LEAKED_SUBDOMAIN_FLAG)],
    solution:
      'The `dev-admin` host is an internal admin panel that leaked through a certificate-transparency log — its certificate is public even though the hostname was never in public DNS. CT logs are a standard recon source precisely because they expose hosts organizations forget are discoverable. The fix is to take it off the internet.',
  },
  {
    id: 'recon-classify',
    labId: lab,
    title: 'Public or internal?',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['FND-04'],
    prompt:
      'Look at the `dev-admin` host. Given what it is and its address, **is it meant to be public or internal?** (One word.)',
    hints: [
      'It is an admin panel on a 10.x internal address.',
      'Admin interfaces belong behind the VPN, not on the open internet.',
    ],
    acceptedHashes: [hashAnswer('internal'), hashAnswer('private')],
    solution:
      'It is **internal**. An admin panel on an RFC 1918 (10.x) address is meant to be reachable only from inside the network or over the VPN. Finding it exposed to the internet is the misconfiguration the lab asks you to fix by making it internal.',
  },
  {
    id: 'recon-killchain',
    labId: lab,
    title: 'First phase',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['FND-04'],
    prompt:
      'Everything you did on the OSINT tab maps to the first phase of the **Cyber Kill Chain**. **Name that first phase.** (One word.)',
    hints: [
      'It comes before weaponization and delivery.',
      'It is the gathering-information phase — the subject of this lab.',
    ],
    acceptedHashes: [
      hashAnswer('reconnaissance'),
      hashAnswer('recon'),
      hashAnswer('reconnaissance (recon)'),
    ],
    solution:
      'The first phase is **reconnaissance**: the attacker gathers information about the target before any attack. The Lockheed Martin Cyber Kill Chain runs Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command and Control, and Actions on Objectives. Shrinking your attack surface disrupts the attack at this earliest phase.',
  },
  {
    id: 'recon-reduce',
    labId: lab,
    title: 'Reduce the attack surface',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['FND-04'],
    prompt:
      'On the **Surface** tab, apply hardening actions — move internal hosts off the internet, close risky ports, and strip the metadata leak — until the attack-surface score drops well below its starting value. The lab marks this solved once the score is low enough.',
    hints: [
      'The biggest wins are the three internal hosts that should not be internet-facing.',
      'Each exposed internal host carries a large penalty; taking it off the internet removes it entirely.',
    ],
    solution:
      'Attack-surface reduction means removing exposure, not just patching it. Taking the three internal hosts off the internet erases their penalty and their ports at once; stripping metadata removes a smaller leak. What remains is only the intended public hosts, serving only the ports they need.',
  },
  {
    id: 'recon-minimal',
    labId: lab,
    title: 'Minimal-exposure design',
    difficulty: 'intermediate',
    points: 25,
    kind: 'task',
    topicIds: ['FND-04'],
    prompt:
      'Reach a **minimal-exposure** posture: no internal host reachable from the internet, no high-risk port (SSH, RDP, database) exposed, and no metadata leak. The lab marks this solved once the whole surface meets that bar.',
    hints: [
      'Every internal host must be made internal, and every high-risk port on anything still exposed must be closed.',
      'Do not forget to strip the leaking document metadata.',
    ],
    solution:
      'Minimal exposure is the defensive goal of this lab: the internet-facing surface is exactly what the organization intends — public hosts, low-risk web ports — and nothing more. High-risk services (SSH, RDP, databases) and internal apps live behind the VPN, and the organization stops leaking the metadata that helps an attacker map it.',
  },
];
