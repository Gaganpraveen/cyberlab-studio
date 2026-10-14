import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { IDOR_FLAG, PRIV_ESC_FLAG } from './engine';

const lab = 'access-control-matrix';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'acl-idor',
    labId: lab,
    title: 'Read a document that is not yours',
    difficulty: 'beginner',
    points: 15,
    kind: 'flag',
    topicIds: ['IAM-06', 'IAM-01'],
    prompt:
      'The starting policy only checks that you are logged in. Acting as **Mallory**, send a read request for **Alice&rsquo;s private review** and submit the flag it leaks.',
    hints: [
      'The server never checks who owns the object — only that you are authenticated.',
      'Pick Mallory as the caller and Alice&rsquo;s document as the resource.',
    ],
    acceptedHashes: [hashAnswer(IDOR_FLAG)],
    solution: `Because the weak policy authorizes any authenticated caller, Mallory reads Alice&rsquo;s object just by naming it — an **insecure direct object reference (IDOR)**, also called broken object-level authorization. The fix is to check *ownership* on every request, not just that the caller logged in. The flag is **${IDOR_FLAG}**.`,
  },
  {
    id: 'acl-term',
    labId: lab,
    title: 'Name the flaw',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['IAM-06'],
    prompt:
      'Accessing another user&rsquo;s object simply by supplying its identifier, with no ownership check, has a well-known name (and a four-letter acronym). **What is it?**',
    hints: [
      'The acronym expands to &ldquo;insecure direct object reference&rdquo;.',
      'OWASP also calls it broken object-level authorization.',
    ],
    acceptedHashes: [
      hashAnswer('idor'),
      hashAnswer('insecure direct object reference'),
      hashAnswer('an insecure direct object reference'),
      hashAnswer('broken object level authorization'),
      hashAnswer('broken object-level authorization'),
      hashAnswer('bola'),
    ],
    solution:
      'This is an **IDOR — insecure direct object reference** (OWASP: broken object-level authorization). The application exposes a direct handle to an object and trusts the caller to only ask for their own. The defense is an authorization check that ties the object to the caller on every access.',
  },
  {
    id: 'acl-priv-esc',
    labId: lab,
    title: 'Reach the admin endpoint',
    difficulty: 'intermediate',
    points: 20,
    kind: 'flag',
    topicIds: ['IAM-06', 'IAM-01'],
    prompt:
      'Still acting as **Mallory** (a normal user), send a read request for the **admin user directory** and submit the flag. The weak policy never checks your role.',
    hints: [
      'An admin-only resource is only safe if something actually enforces the admin role.',
      'With the role check off, a normal user walks straight in.',
    ],
    acceptedHashes: [hashAnswer(PRIV_ESC_FLAG)],
    solution: `Marking a resource &ldquo;admin-only&rdquo; does nothing unless a check enforces it. With the role check off, Mallory reaches an administrative endpoint she should never see — **vertical privilege escalation**. The flag is **${PRIV_ESC_FLAG}**.`,
  },
  {
    id: 'acl-fix-ownership',
    labId: lab,
    title: 'Enforce ownership',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-06'],
    prompt:
      'Turn on the **ownership check** in the policy. The lab marks this solved once Mallory can no longer read documents she does not own, while owners and admins still can.',
    hints: [
      'The ownership check compares the object&rsquo;s owner to the caller.',
      'Watch Mallory&rsquo;s row in the matrix turn to denied for other people&rsquo;s documents.',
    ],
    solution:
      'The ownership check compares each object&rsquo;s owner to the authenticated caller and denies the mismatch, closing the IDOR. Owners keep access to their own objects, and the explicit admin override keeps administrators working — though that blanket override is itself broad access, which a least-privilege design would scope and log.',
  },
  {
    id: 'acl-fix-rbac',
    labId: lab,
    title: 'Enforce the admin role',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['IAM-06'],
    prompt:
      'Turn on the **role check**. The lab marks this solved once only administrators can reach admin-only resources and the privilege-escalation path is closed.',
    hints: [
      'Role-based access control gates admin-only resources behind the admin role.',
      'After enabling it, Mallory&rsquo;s access to the admin directory should flip to denied.',
    ],
    solution:
      'Role-based access control (RBAC) attaches permissions to roles and checks the caller&rsquo;s role before serving a protected resource. With it on, only Root (admin) reaches the admin directory; Mallory is denied, and the escalation path is closed.',
  },
  {
    id: 'acl-principle',
    labId: lab,
    title: 'The guiding principle',
    difficulty: 'beginner',
    points: 15,
    kind: 'answer',
    topicIds: ['IAM-06', 'IAM-01'],
    prompt:
      'Both fixes follow one security principle: give each identity only the access it needs, and no more. **Name that principle.**',
    hints: [
      'It is usually stated as the principle of &ldquo;least ___&rdquo;.',
      'Sometimes abbreviated PoLP.',
    ],
    acceptedHashes: [
      hashAnswer('least privilege'),
      hashAnswer('the principle of least privilege'),
      hashAnswer('principle of least privilege'),
      hashAnswer('polp'),
      hashAnswer('least-privilege'),
    ],
    solution:
      'It is the **principle of least privilege**: every user, process, and service should hold the minimum access needed for its task, and nothing more. Ownership checks and RBAC are two concrete ways to enforce it, shrinking what any single compromised account can reach.',
  },
];
