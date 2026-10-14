/**
 * A deterministic model of an authorization layer, used to teach broken access
 * control: the most common web vulnerability class (OWASP A01). There is no
 * server and no network — `authorize` is a pure function over a fixed set of
 * users and resources, and the "attacks" are simply requests that a weak policy
 * wrongly permits.
 *
 * The weak default checks only that the caller is logged in. Turning on the
 * ownership check stops one user reading another's object (IDOR / broken
 * object-level authorization); turning on the role check stops a normal user
 * reaching an admin-only resource (privilege escalation).
 */

export type Role = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  role: Role;
  /** Marks the account the learner attacks from. */
  attacker?: boolean;
}

export interface Resource {
  id: string;
  label: string;
  /** The owning user id, for owned objects. */
  ownerId?: string;
  /** Only administrators should reach this resource. */
  adminOnly?: boolean;
  /** Sensitive content revealed on a successful read (a flag or private note). */
  secret?: string;
}

export type Action = 'read' | 'delete';

export const USERS: User[] = [
  { id: 'alice', name: 'Alice', role: 'user' },
  { id: 'bob', name: 'Bob', role: 'user' },
  { id: 'mallory', name: 'Mallory', role: 'user', attacker: true },
  { id: 'root', name: 'Root', role: 'admin' },
];

export const IDOR_FLAG = 'CTF{idor_broke_object_level_auth}';
export const PRIV_ESC_FLAG = 'CTF{privilege_escalation_to_admin}';

export const RESOURCES: Resource[] = [
  {
    id: 'doc-alice',
    label: "Alice's private review",
    ownerId: 'alice',
    secret: `Alice's performance review — confidential. ${IDOR_FLAG}`,
  },
  { id: 'doc-bob', label: "Bob's draft", ownerId: 'bob', secret: "Bob's unpublished draft." },
  {
    id: 'doc-mallory',
    label: "Mallory's notes",
    ownerId: 'mallory',
    secret: 'Your own notes. (You already own this one.)',
  },
  {
    id: 'admin-users',
    label: 'Admin · user directory',
    adminOnly: true,
    secret: `Full user directory with password-reset powers. ${PRIV_ESC_FLAG}`,
  },
];

export interface Policy {
  /** Enforce that a non-admin may only touch objects they own. */
  ownershipCheck: boolean;
  /** Enforce that admin-only resources require the admin role. */
  roleCheck: boolean;
}

/** The insecure starting policy: authenticated callers can do anything. */
export const INSECURE_POLICY: Policy = { ownershipCheck: false, roleCheck: false };

export interface Decision {
  allowed: boolean;
  reason: string;
  /** Which guard made the decision, for teaching. */
  control: 'authenticated' | 'ownership' | 'role' | 'admin-override';
}

export function userById(id: string): User | undefined {
  return USERS.find((u) => u.id === id);
}
export function resourceById(id: string): Resource | undefined {
  return RESOURCES.find((r) => r.id === id);
}

/**
 * Decide whether `user` may perform `action` on `resource` under `policy`.
 * Admins bypass ownership (a deliberate, explicit override).
 */
export function authorize(
  user: User,
  resource: Resource,
  action: Action,
  policy: Policy,
): Decision {
  // Role check: admin-only resources.
  if (resource.adminOnly) {
    if (policy.roleCheck && user.role !== 'admin') {
      return {
        allowed: false,
        reason: `${resource.label} is admin-only and ${user.name} is not an administrator.`,
        control: 'role',
      };
    }
  }

  // Ownership check: owned objects.
  if (resource.ownerId && resource.ownerId !== user.id) {
    if (user.role === 'admin') {
      return {
        allowed: true,
        reason: `${user.name} is an administrator (ownership overridden).`,
        control: 'admin-override',
      };
    }
    if (policy.ownershipCheck) {
      const owner = userById(resource.ownerId);
      return {
        allowed: false,
        reason: `${resource.label} is owned by ${owner?.name ?? resource.ownerId}; ${user.name} is not the owner.`,
        control: 'ownership',
      };
    }
  }

  return {
    allowed: true,
    reason: `${user.name} is authenticated; ${action} permitted.`,
    control: 'authenticated',
  };
}

/** True when the policy blocks every cross-user and non-admin-to-admin access. */
export function isLeastPrivilege(policy: Policy): boolean {
  return policy.ownershipCheck && policy.roleCheck;
}
