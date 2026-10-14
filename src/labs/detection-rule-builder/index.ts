import { Siren } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const detectionRuleBuilderLab: LabDefinition = {
  id: 'detection-rule-builder',
  title: 'Detection Rule Builder',
  tagline:
    'Tune a detection rule over a labeled log set until it catches every attack with no false alarms, then read precision and recall.',
  description:
    'Blue-team detection engineering against a fixed, labeled log set: a compromised account exfiltrating data at night hides among benign large daytime transfers. Build a rule by combining clauses with AND, watch the confusion matrix (true/false positives and negatives) update live, and tune it from a broad, noisy rule to a high-fidelity one that reaches 100% precision and 100% recall. Learn why specificity, not just volume, separates a trusted alert from alert fatigue.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic detection-rule evaluator over a labeled log set',
  topicIds: ['OPS-02', 'OPS-01'],
  icon: Siren,
  objectives: [
    'Build a detection rule by combining clauses with AND',
    'Read a confusion matrix: true/false positives and true/false negatives',
    'Reach 100% recall so no attack event slips past the rule',
    'Cut false positives to reach 100% precision without losing recall',
    'Explain precision and recall and the trade-off between them',
  ],
  component: lazy(() => import('./DetectionRuleLab')),
  challenges,
};
