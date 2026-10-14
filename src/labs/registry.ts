import { ddosLab } from './ddos';
import { homographLab } from './homograph';
import { jwtLab } from './jwt';
import { passwordCrackingLab } from './password-cracking';
import { sqlInjectionLab } from './sql-injection';
import { xssLab } from './xss';

import type { ChallengeDefinition, LabDefinition } from './types';

/** Every lab, in the order they appear on the Labs page. */
export const LABS: LabDefinition[] = [
  homographLab,
  sqlInjectionLab,
  ddosLab,
  passwordCrackingLab,
  xssLab,
  jwtLab,
];

const labById = new Map(LABS.map((lab) => [lab.id, lab]));

export function getLab(id: string): LabDefinition | undefined {
  return labById.get(id);
}

export const CHALLENGES: ChallengeDefinition[] = LABS.flatMap((lab) => lab.challenges);

export function labsForTopic(topicId: string): LabDefinition[] {
  return LABS.filter((lab) => lab.topicIds.includes(topicId));
}
