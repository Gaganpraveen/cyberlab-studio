import { Cloud } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const cloudIamPolicyLab: LabDefinition = {
  id: 'cloud-iam-policy',
  title: 'Cloud IAM Policy and Public Buckets',
  tagline:
    'Abuse a wildcard IAM grant to become admin and read a public bucket, then tighten the policy until both are denied.',
  description:
    'A fictional AWS-style account with real IAM evaluation semantics: default deny, explicit Deny overrides Allow. Two common misconfigurations are live — a developer role granted iam:* on * (wildcard privilege escalation) and a reports bucket readable by principal * (public data exposure). Run both attacks, then scope the role, add an explicit Deny, and remove the public principal to close them. Includes a request simulator to test any principal, action, and resource against the current policy.',
  difficulty: 'intermediate',
  estimatedMinutes: 25,
  mode: 'simulation',
  engine: 'Deterministic IAM policy evaluator',
  topicIds: ['CLD-02', 'CLD-03'],
  icon: Cloud,
  objectives: [
    'Read an IAM policy and spot wildcard actions and public principals',
    'Escalate to admin by abusing iam:* self-service permissions',
    'Read a private object through a public (principal *) bucket statement',
    'Apply least privilege: scope actions and remove the public principal',
    'Use an explicit Deny as a guardrail that overrides any Allow',
  ],
  component: lazy(() => import('./CloudIamPolicyLab')),
  challenges,
};
