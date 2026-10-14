import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { BUCKET_FLAG, ESCALATION_FLAG } from './engine';

const lab = 'cloud-iam-policy';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'iam-escalate-flag',
    labId: lab,
    title: 'Become admin through a wildcard',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['CLD-02'],
    prompt:
      'The developers role is granted `iam:*` on `*`. Run the self-escalation attack to attach admin to your own role, then submit the flag it reveals.',
    hints: [
      '`iam:*` includes `iam:AttachUserPolicy` — the call that grants a policy to a principal.',
      'Leave the defenses off and run &ldquo;Escalate to admin&rdquo;.',
    ],
    acceptedHashes: [hashAnswer(ESCALATION_FLAG)],
    solution: `A role that can call IAM write actions on itself can always reach admin — it just attaches AdministratorAccess. \`iam:*\` on \`*\` hands that power out by accident. The flag is **${ESCALATION_FLAG}**. The fix is to scope the role to the exact actions it needs, and to add an explicit Deny on the self-escalation calls.`,
  },
  {
    id: 'iam-bucket-flag',
    labId: lab,
    title: 'Read the public bucket',
    difficulty: 'beginner',
    points: 20,
    kind: 'flag',
    topicIds: ['CLD-03'],
    prompt:
      'The reports bucket allows `s3:GetObject` to principal `*`. Read the private salaries object as an anonymous caller and submit the flag.',
    hints: [
      'Principal `*` means anyone, including unauthenticated requests.',
      'Run &ldquo;Read secret object&rdquo; with the public principal still in place.',
    ],
    acceptedHashes: [hashAnswer(BUCKET_FLAG)],
    solution: `A bucket statement with principal \`*\` is a public bucket: anyone on the internet can read every object the statement covers. Countless real breaches are exactly this. The flag is **${BUCKET_FLAG}**. The fix is to remove the \`*\` principal so only named roles can read the object.`,
  },
  {
    id: 'iam-fix-escalation',
    labId: lab,
    title: 'Close the escalation path',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['CLD-02'],
    prompt:
      'Tighten the policy so the developers role can no longer escalate to admin. The lab marks this solved when the escalation attack is denied.',
    hints: [
      'Scope the role&rsquo;s actions so `iam:*` is gone, or add an explicit Deny on the IAM write calls.',
      'Either defense works; an explicit Deny is the belt-and-braces option because Deny always wins.',
    ],
    solution:
      'Two tools close this. Scoping the role to only the actions it needs removes `iam:*` entirely. An explicit Deny on `iam:AttachUserPolicy` and friends is a backstop: because Deny overrides any Allow, it holds even if a future Allow gets too broad. Defense in depth uses both.',
  },
  {
    id: 'iam-fix-bucket',
    labId: lab,
    title: 'Make the bucket private',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['CLD-03'],
    prompt:
      'Tighten the bucket so an anonymous caller can no longer read the object. The lab marks this solved when the read is denied.',
    hints: [
      'The problem is the `*` principal on the bucket statement.',
      'Remove the public principal so only the developers role is allowed.',
    ],
    solution:
      'Removing the `*` principal turns the bucket from public to private: the anonymous request now hits the implicit deny because no remaining statement allows it. Scope object access to the specific roles that need it, never to `*`.',
  },
  {
    id: 'iam-deny-wins',
    labId: lab,
    title: 'Allow vs. Deny',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CLD-02'],
    prompt:
      'In IAM policy evaluation, when one matching statement says Allow and another says Deny, which effect wins? (One word.)',
    hints: ['It is the safe default.', 'An explicit one of these overrides any Allow.'],
    acceptedHashes: [hashAnswer('deny'), hashAnswer('explicit deny'), hashAnswer('a deny')],
    solution:
      'An explicit **Deny** always wins. IAM is deny-by-default, and any matching Deny overrides every Allow. That is why an explicit Deny is a reliable guardrail: it cannot be undone by a broad Allow elsewhere in the policy.',
  },
  {
    id: 'iam-least-privilege',
    labId: lab,
    title: 'Name the principle',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['CLD-02', 'CLD-03'],
    prompt:
      'Granting every identity only the permissions it actually needs — and no wildcards &ldquo;just in case&rdquo; — is the principle of ____. (Two words.)',
    hints: ['The opposite of `*` on `*`.', 'Least ____.'],
    acceptedHashes: [
      hashAnswer('least privilege'),
      hashAnswer('the principle of least privilege'),
      hashAnswer('principle of least privilege'),
      hashAnswer('least-privilege'),
    ],
    solution:
      'The **principle of least privilege**: every identity gets exactly the permissions it needs to do its job and nothing more. Wildcards like `iam:*` and principals like `*` violate it directly, which is why both attacks in this lab were possible.',
  },
];
