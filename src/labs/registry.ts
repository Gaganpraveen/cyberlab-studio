import { accessControlLab } from './access-control-matrix';
import { classicalCipherLab } from './classical-cipher-breaker';
import { commandPathInjectionLab } from './command-path-injection';
import { csrfClickjackingLab } from './csrf-clickjacking';
import { ddosLab } from './ddos';
import { homographLab } from './homograph';
import { jwtLab } from './jwt';
import { loginSecurityLab } from './login-security';
import { passwordCrackingLab } from './password-cracking';
import { reconAttackSurfaceLab } from './recon-and-attack-surface';
import { spoofingMitmLab } from './spoofing-and-mitm';
import { sqlInjectionLab } from './sql-injection';
import { ssrfUrlFilterLab } from './ssrf-url-filter';
import { tlsHandshakeLab } from './tls-handshake-inspector';
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
  reconAttackSurfaceLab,
  spoofingMitmLab,
  tlsHandshakeLab,
  classicalCipherLab,
  accessControlLab,
  loginSecurityLab,
  csrfClickjackingLab,
  commandPathInjectionLab,
  ssrfUrlFilterLab,
];

const labById = new Map(LABS.map((lab) => [lab.id, lab]));

export function getLab(id: string): LabDefinition | undefined {
  return labById.get(id);
}

export const CHALLENGES: ChallengeDefinition[] = LABS.flatMap((lab) => lab.challenges);

export function labsForTopic(topicId: string): LabDefinition[] {
  return LABS.filter((lab) => lab.topicIds.includes(topicId));
}
