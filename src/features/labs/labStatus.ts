import type { LabDefinition } from '@/labs/types';

/** Labs without a status are available; unfinished labs say 'in-development'. */
export function isLabAvailable(lab: LabDefinition): boolean {
  return lab.status !== 'in-development';
}
