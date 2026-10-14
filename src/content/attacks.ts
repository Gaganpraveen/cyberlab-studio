import { z } from 'zod';

import { type Attack, type AttackCategory, attackSchema } from './schema';

/** The attack index (content/coverage/attacks*.yaml), parsed to JSON at build time. */
const files = import.meta.glob<unknown>('/content/coverage/attacks*.yaml', {
  query: '?data',
  import: 'default',
  eager: true,
});

export function toAttacks(file: string, data: unknown): Attack[] {
  const result = z.array(attackSchema).safeParse(data ?? []);
  if (!result.success) {
    const details = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid attack index ${file}: ${details}`);
  }
  return result.data;
}

function loadAll(): Attack[] {
  const attacks = new Map<string, Attack>();
  for (const [file, data] of Object.entries(files)) {
    try {
      for (const attack of toAttacks(file, data)) {
        if (attacks.has(attack.id)) {
          console.error(`Duplicate attack id "${attack.id}" in ${file}; keeping the first.`);
          continue;
        }
        attacks.set(attack.id, attack);
      }
    } catch (error) {
      console.error((error as Error).message);
    }
  }
  return [...attacks.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const ATTACKS: Attack[] = loadAll();

const byId = new Map(ATTACKS.map((a) => [a.id, a]));

export function getAttack(id: string): Attack | undefined {
  return byId.get(id);
}

export function attacksForTopic(topicId: string): Attack[] {
  const id = topicId.toUpperCase();
  return ATTACKS.filter((a) => a.topics.includes(id));
}

export const ATTACK_CATEGORIES: Record<AttackCategory, { label: string; description: string }> = {
  'social-engineering': {
    label: 'Social engineering',
    description: 'Deceiving people into acting against their own interests.',
  },
  web: {
    label: 'Web and browser',
    description: 'Abusing how browsers and web apps trust content.',
  },
  injection: {
    label: 'Injection',
    description: 'Input that is treated as code or commands by an interpreter.',
  },
  network: {
    label: 'Network',
    description: 'Interception, spoofing and abuse of network protocols.',
  },
  malware: { label: 'Malware', description: 'Malicious software and how it spreads and persists.' },
  identity: {
    label: 'Identity and access',
    description: 'Stealing, guessing or forging the proof of who someone is.',
  },
  cryptographic: {
    label: 'Cryptographic',
    description: 'Breaking or sidestepping encryption, hashing and signatures.',
  },
  system: {
    label: 'Systems and memory',
    description: 'Memory-safety bugs, privilege escalation and isolation failures.',
  },
  availability: {
    label: 'Availability',
    description: 'Exhausting resources so legitimate users are denied service.',
  },
  'supply-chain': {
    label: 'Supply chain',
    description: 'Compromising the software, build or vendor you trust.',
  },
  cloud: {
    label: 'Cloud and containers',
    description: 'Misconfiguration and abuse of cloud identity, storage and workloads.',
  },
  'wireless-iot': {
    label: 'Wireless, mobile and IoT',
    description: 'Radio links, mobile apps and embedded devices.',
  },
  physical: { label: 'Physical', description: 'Attacks that need hands on the hardware.' },
  ai: {
    label: 'AI and LLM',
    description: 'Manipulating machine-learning models and the apps built on them.',
  },
  insider: { label: 'Insider', description: 'Misuse of legitimate access from inside.' },
};
