/**
 * A deterministic model of a cloud IAM policy evaluator (AWS-style). A policy is
 * a list of statements; each request (principal, action, resource) is evaluated
 * with the real precedence rule: default deny, an explicit Deny overrides any
 * Allow, otherwise an Allow grants the request. Nothing is live — there is no
 * cloud account — so the learner can run two misconfiguration attacks and then
 * tighten the policy until both are denied.
 *
 * Attack 1: a developer role granted `iam:*` on `*` can attach an admin policy
 * to itself (wildcard privilege escalation). Attack 2: a bucket statement that
 * allows `s3:GetObject` to principal `*` lets anyone read a private object
 * (public-bucket data exposure). Scoping the actions, adding an explicit Deny,
 * and removing the public principal close them.
 */

export const ESCALATION_FLAG = 'CTF{wildcard_iam_is_admin}';
export const BUCKET_FLAG = 'CTF{public_bucket_leaked_secrets}';

export type Effect = 'Allow' | 'Deny';

export interface Statement {
  sid: string;
  effect: Effect;
  principals: string[];
  actions: string[];
  resources: string[];
}

export interface Defenses {
  /** Replace the developer role's wildcard actions with only the ones it needs. */
  scopeActions: boolean;
  /** Add an explicit Deny on IAM self-escalation for the developer role. */
  denyEscalation: boolean;
  /** Remove the public `*` principal from the bucket statement. */
  removePublicPrincipal: boolean;
}

export const DEFAULT_DEFENSES: Defenses = {
  scopeActions: false,
  denyEscalation: false,
  removePublicPrincipal: false,
};

export const DEVELOPER = 'role/developers';
export const SECRET_OBJECT = 'arn:aws:s3:::acme-reports/secret-salaries.csv';
const ADMIN_TARGET = 'arn:aws:iam::111122223333:user/intern';

/** Build the account policy for the given defense settings. */
export function buildPolicy(d: Defenses): Statement[] {
  const devActions = d.scopeActions ? ['s3:GetObject', 'logs:*'] : ['iam:*', 's3:*'];
  const statements: Statement[] = [
    {
      sid: 'DeveloperAccess',
      effect: 'Allow',
      principals: [DEVELOPER],
      actions: devActions,
      resources: ['*'],
    },
    {
      sid: 'ReportsBucket',
      effect: 'Allow',
      principals: d.removePublicPrincipal ? [DEVELOPER] : ['*'],
      actions: ['s3:GetObject'],
      resources: ['arn:aws:s3:::acme-reports/*'],
    },
  ];
  if (d.denyEscalation) {
    statements.push({
      sid: 'DenySelfEscalation',
      effect: 'Deny',
      principals: [DEVELOPER],
      actions: ['iam:AttachUserPolicy', 'iam:PutUserPolicy', 'iam:CreatePolicyVersion'],
      resources: ['*'],
    });
  }
  return statements;
}

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

/** Does an IAM glob pattern (with `*`) match a concrete value? */
export function globMatch(pattern: string, value: string): boolean {
  return globToRegExp(pattern).test(value);
}

export interface AccessRequest {
  principal: string;
  action: string;
  resource: string;
}

export interface Decision {
  effect: Effect;
  reason: string;
  matchedSid?: string;
}

function statementMatches(s: Statement, req: AccessRequest): boolean {
  return (
    s.principals.some((p) => globMatch(p, req.principal)) &&
    s.actions.some((a) => globMatch(a, req.action)) &&
    s.resources.some((r) => globMatch(r, req.resource))
  );
}

/** Evaluate a request against a policy: default deny, explicit Deny wins. */
export function evaluate(statements: Statement[], req: AccessRequest): Decision {
  const denied = statements.find((s) => s.effect === 'Deny' && statementMatches(s, req));
  if (denied) {
    return { effect: 'Deny', reason: `Explicit Deny by ${denied.sid}`, matchedSid: denied.sid };
  }
  const allowed = statements.find((s) => s.effect === 'Allow' && statementMatches(s, req));
  if (allowed) {
    return { effect: 'Allow', reason: `Allowed by ${allowed.sid}`, matchedSid: allowed.sid };
  }
  return { effect: 'Deny', reason: 'Implicit deny: no statement allows this request' };
}

export interface AttackResult {
  success: boolean;
  decision: Decision;
  reason: string;
  flag?: string;
  loot?: string;
}

/** The developer role tries to attach AdministratorAccess to itself. */
export function tryEscalate(d: Defenses): AttackResult {
  const decision = evaluate(buildPolicy(d), {
    principal: DEVELOPER,
    action: 'iam:AttachUserPolicy',
    resource: ADMIN_TARGET,
  });
  if (decision.effect === 'Allow') {
    return {
      success: true,
      decision,
      reason:
        'The developers role may call iam:AttachUserPolicy, so you attached AdministratorAccess to yourself. You are now admin.',
      flag: ESCALATION_FLAG,
    };
  }
  return {
    success: false,
    decision,
    reason:
      'Blocked: the developers role can no longer modify IAM, so it cannot grant itself admin rights.',
  };
}

/** An anonymous (`*`) principal tries to read the private salaries object. */
export function tryReadBucket(d: Defenses): AttackResult {
  const decision = evaluate(buildPolicy(d), {
    principal: '*',
    action: 's3:GetObject',
    resource: SECRET_OBJECT,
  });
  if (decision.effect === 'Allow') {
    return {
      success: true,
      decision,
      reason:
        'The bucket statement allows s3:GetObject to principal *, so an anonymous request downloaded the object.',
      flag: BUCKET_FLAG,
      loot: 'secret-salaries.csv (every employee salary)',
    };
  }
  return {
    success: false,
    decision,
    reason: 'Blocked: anonymous principals are no longer allowed, so the object stays private.',
  };
}
