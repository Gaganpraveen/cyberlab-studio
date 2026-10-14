import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'ddos';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'ddos-collapse',
    labId: lab,
    title: 'Watch it fall over',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['MAL-05', 'APP-08'],
    prompt:
      'With no defense in place, run the simulation and let the botnet flood arrive. The lab marks this solved once you have run an undefended flood and seen real users&rsquo; share of the service collapse during the attack window.',
    hints: [
      'Leave the defense set to None and press Run.',
      'Watch the legitimate-traffic line drop as the flood saturates the queue.',
    ],
    solution:
      'A denial-of-service attack does not break in or steal data; it exhausts a finite resource — here, the service&rsquo;s per-tick capacity. Once the flood fills the queue, a fair share leaves real users only a tiny fraction of the service, so availability collapses even though nothing was &ldquo;hacked&rdquo;.',
  },
  {
    id: 'ddos-target',
    labId: lab,
    title: 'Which pillar',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['MAL-05'],
    prompt:
      'Security is often framed as the CIA triad: confidentiality, integrity, and availability. **Which one** does a denial-of-service attack primarily target?',
    hints: [
      'The attack does not read or alter data.',
      'It stops legitimate users from reaching the service.',
    ],
    acceptedHashes: [hashAnswer('availability'), hashAnswer('a'), hashAnswer('the a')],
    solution:
      'DoS attacks target **availability** — the promise that a service is reachable when users need it. Confidentiality and integrity are about keeping data secret and correct; availability is about keeping the service up, which is exactly what flooding it denies.',
  },
  {
    id: 'ddos-ratelimit',
    labId: lab,
    title: 'Throttle the bots',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['MAL-06', 'APP-08'],
    prompt:
      'Turn on the **Rate limit** defense and run the flood again. The lab marks this solved once rate limiting brings real users&rsquo; availability during the attack back up to a healthy level.',
    hints: [
      'A rate limit caps how many requests any single source may send per tick.',
      'Bots send far more per source than a real user, so the cap hits them hardest.',
    ],
    solution:
      'Rate limiting caps requests per source, so a bot sending thirty requests a tick is cut to the same small budget as a real user sending one. The flood shrinks dramatically while legitimate traffic is untouched, and the service recovers. It is a targeted defense: it exploits the difference between one abusive source and many ordinary ones.',
  },
  {
    id: 'ddos-distributed',
    labId: lab,
    title: 'Name the D',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['MAL-05', 'MAL-06'],
    prompt:
      'When the flood comes not from one machine but from thousands of compromised hosts (a botnet) at once, the attack gets an extra letter. **What does the first D in DDoS stand for?**',
    hints: [
      'It describes traffic coming from many places at the same time.',
      'The opposite of coming from a single source.',
    ],
    acceptedHashes: [
      hashAnswer('distributed'),
      hashAnswer('distributed denial of service'),
      hashAnswer('distributed denial-of-service'),
      hashAnswer('ddos'),
    ],
    solution:
      'The first D is **distributed**: a distributed denial-of-service spreads the flood across many hosts (a botnet), so it is far larger and much harder to block by source. You cannot simply ban one IP when the traffic arrives from thousands at once — which is why per-source rate limiting and upstream scrubbing matter.',
  },
  {
    id: 'ddos-defense',
    labId: lab,
    title: 'Cap the source',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['MAL-06', 'APP-08'],
    prompt:
      'In a few words, **name the defense** that limits how many requests any single client is allowed to make in a given time window — the one you just switched on.',
    hints: [
      'It is the defense that cut the bots down to a real user&rsquo;s budget.',
      'Also called throttling.',
    ],
    acceptedHashes: [
      hashAnswer('rate limiting'),
      hashAnswer('rate limit'),
      hashAnswer('rate-limiting'),
      hashAnswer('ratelimiting'),
      hashAnswer('throttling'),
      hashAnswer('request throttling'),
      hashAnswer('rate limiting (throttling)'),
    ],
    solution:
      'Rate limiting (throttling) caps requests per client per window, usually keyed by IP, API key, or account. It is a first-line defense against abusive volume. Against a large DDoS it is combined with upstream filtering, traffic scrubbing, and content-delivery networks that absorb the load far from the origin.',
  },
  {
    id: 'ddos-scaling',
    labId: lab,
    title: 'Just add servers?',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['APP-08'],
    prompt:
      'The other defense in this lab adds capacity by bringing up more servers to absorb the load. **What is the general name** for adding more servers to handle more traffic?',
    hints: [
      'Think about handling more load by growing out, not by blocking traffic.',
      'Cloud platforms do this automatically; the term often appears as &ldquo;auto-&rdquo; something.',
    ],
    acceptedHashes: [
      hashAnswer('scaling'),
      hashAnswer('horizontal scaling'),
      hashAnswer('scaling out'),
      hashAnswer('scale out'),
      hashAnswer('autoscaling'),
      hashAnswer('auto scaling'),
      hashAnswer('auto-scaling'),
      hashAnswer('over-provisioning'),
      hashAnswer('overprovisioning'),
    ],
    solution:
      'Adding servers is **scaling** (horizontal scaling or autoscaling). In the lab it helps — availability improves — but it still serves the bot traffic, so it is costly and cannot outrun a big enough flood on its own. Scaling absorbs load; rate limiting and filtering remove the bad load. Real defenses use both, plus a CDN or scrubbing service in front.',
  },
];
