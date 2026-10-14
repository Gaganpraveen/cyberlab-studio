import { Check, Flag, Play, ShieldCheck, UserCog, X } from 'lucide-react';
import { useState } from 'react';

import { Markdown } from '@/components/markdown/Markdown';
import { Button } from '@/components/ui/Button';
import { Badge, Callout } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { markChallengeSolved } from '@/lib/progress';

import { EvidenceLog, type EvidenceEntry, evidence } from '../components/EvidenceLog';
import { LabLayout, LabSteps } from '../components/LabLayout';
import {
  type Decision,
  INSECURE_POLICY,
  type Policy,
  RESOURCES,
  type Resource,
  USERS,
  type User,
  authorize,
  isLeastPrivilege,
} from './engine';
import { accessControlLab } from './index';

interface Response {
  caller: User;
  resource: Resource;
  decision: Decision;
}

function isExploit(resource: Resource, caller: User, decision: Decision): boolean {
  // An allowed access that only succeeded because a guard was off.
  if (!decision.allowed) return false;
  if (decision.control !== 'authenticated') return false;
  const crossUser = !!resource.ownerId && resource.ownerId !== caller.id;
  return crossUser || !!resource.adminOnly;
}

export default function AccessControlLab() {
  const [policy, setPolicy] = useState<Policy>(INSECURE_POLICY);
  const [callerId, setCallerId] = useState('mallory');
  const [resourceId, setResourceId] = useState('doc-alice');
  const [response, setResponse] = useState<Response | null>(null);
  const [log, setLog] = useState<EvidenceEntry[]>([]);
  const add = (e: EvidenceEntry) => setLog((prev) => [...prev, e]);

  const caller = USERS.find((u) => u.id === callerId)!;
  const resource = RESOURCES.find((r) => r.id === resourceId)!;
  const secured = isLeastPrivilege(policy);

  const setOwnership = (on: boolean) => {
    setPolicy((p) => ({ ...p, ownershipCheck: on }));
    if (on) {
      markChallengeSolved('acl-fix-ownership');
      add(
        evidence(
          'success',
          'Ownership check enabled',
          'Non-admins may now only touch objects they own. The IDOR path is closed.',
        ),
      );
    }
  };

  const setRole = (on: boolean) => {
    setPolicy((p) => ({ ...p, roleCheck: on }));
    if (on) {
      markChallengeSolved('acl-fix-rbac');
      add(
        evidence(
          'success',
          'Role check enabled',
          'Admin-only resources now require the admin role. The escalation path is closed.',
        ),
      );
    }
  };

  const sendRequest = () => {
    const decision = authorize(caller, resource, 'read', policy);
    setResponse({ caller, resource, decision });
    if (decision.allowed) {
      const exploit = isExploit(resource, caller, decision);
      add(
        evidence(
          exploit ? 'danger' : 'success',
          `Allowed · ${caller.name} read ${resource.label}`,
          `${decision.reason}${resource.secret ? `\n${resource.secret}` : ''}`,
        ),
      );
    } else {
      add(evidence('success', `Denied · ${caller.name} → ${resource.label}`, decision.reason));
    }
  };

  const reset = () => {
    setPolicy(INSECURE_POLICY);
    setCallerId('mallory');
    setResourceId('doc-alice');
    setResponse(null);
    setLog([]);
  };

  const guide = (
    <div className="space-y-5">
      <p className="text-fg-muted text-sm leading-relaxed">
        Broken access control is the most common web vulnerability. The policy here starts by
        trusting any <strong className="text-fg">logged-in</strong> caller. You will walk in as
        Mallory, take what is not yours, then add the two checks that stop you.
      </p>
      <LabSteps
        steps={[
          { title: 'Read the matrix', body: 'See who can reach what under the current policy.' },
          { title: 'Exploit IDOR', body: "Read Alice's document as Mallory — no ownership check." },
          { title: 'Escalate', body: 'Reach the admin directory as a normal user.' },
          { title: 'Enforce ownership', body: 'Close broken object-level authorization.' },
          { title: 'Enforce roles', body: 'Gate admin resources and reach least privilege.' },
        ]}
      />
      <Callout tone="info" title="A model, not a server">
        <code>authorize()</code> is a pure function over fixed users and resources. No request
        leaves your browser; the accounts and documents are fictional.
      </Callout>
    </div>
  );

  const workspace = (
    <div className="space-y-5 p-5">
      {/* Policy */}
      <div className="border-line bg-surface/40 rounded-xl border p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-fg text-sm font-semibold">Authorization policy</h3>
          {secured ? (
            <Badge tone="success" className="gap-1">
              <ShieldCheck className="size-3.5" aria-hidden /> least privilege
            </Badge>
          ) : (
            <Badge tone="danger">authenticated-only (insecure)</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={policy.ownershipCheck ? 'ghost' : 'secondary'}
            disabled={policy.ownershipCheck}
            onClick={() => setOwnership(true)}
          >
            {policy.ownershipCheck ? '✓ Ownership check on' : 'Enable ownership check'}
          </Button>
          <Button
            size="sm"
            variant={policy.roleCheck ? 'ghost' : 'secondary'}
            disabled={policy.roleCheck}
            onClick={() => setRole(true)}
          >
            {policy.roleCheck ? '✓ Role check on' : 'Enable role check'}
          </Button>
        </div>
      </div>

      {/* Matrix */}
      <div className="border-line overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-surface-2 text-fg-subtle text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Subject \\ Resource</th>
              {RESOURCES.map((r) => (
                <th key={r.id} className="px-3 py-2 text-center font-medium">
                  {r.label}
                  {r.adminOnly && <div className="text-warning text-[0.6rem]">admin-only</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {USERS.map((u) => (
              <tr key={u.id} className={cn(u.attacker && 'bg-danger-soft/40')}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    {u.role === 'admin' && <UserCog className="text-info size-3.5" aria-hidden />}
                    <span className="text-fg font-medium">{u.name}</span>
                    {u.attacker && (
                      <Badge tone="danger" className="ml-1">
                        attacker
                      </Badge>
                    )}
                    {u.role === 'admin' && <span className="text-fg-subtle text-xs">admin</span>}
                  </div>
                </td>
                {RESOURCES.map((r) => {
                  const d = authorize(u, r, 'read', policy);
                  return (
                    <td key={r.id} className="px-3 py-2 text-center" title={d.reason}>
                      {d.allowed ? (
                        <Check
                          className={cn(
                            'mx-auto size-4',
                            d.control === 'admin-override' ? 'text-info' : 'text-success',
                          )}
                          aria-label="allowed"
                        />
                      ) : (
                        <X className="text-danger mx-auto size-4" aria-label="denied" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Request */}
      <div className="border-line bg-surface/40 space-y-3 rounded-xl border p-4">
        <h3 className="text-fg text-sm font-semibold">Send a read request</h3>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-fg-muted text-xs">
            <div className="mb-1">Acting as</div>
            <select
              value={callerId}
              onChange={(e) => setCallerId(e.target.value)}
              className="bg-surface-2 border-line text-fg rounded-md border px-2 py-1.5 text-sm"
            >
              {USERS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                  {u.role === 'admin' ? ' (admin)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="text-fg-muted text-xs">
            <div className="mb-1">Resource</div>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="bg-surface-2 border-line text-fg rounded-md border px-2 py-1.5 text-sm"
            >
              {RESOURCES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <Button size="sm" onClick={sendRequest} className="gap-1.5">
            <Play className="size-3.5" aria-hidden /> Send read request
          </Button>
        </div>

        {response && (
          <div
            className={cn(
              'space-y-2 rounded-lg border p-3 text-sm',
              response.decision.allowed
                ? isExploit(response.resource, response.caller, response.decision)
                  ? 'border-danger/40 bg-danger-soft'
                  : 'border-success/40 bg-success-soft'
                : 'border-success/40 bg-success-soft',
            )}
          >
            <div className="flex items-center gap-2">
              <Badge
                tone={
                  response.decision.allowed
                    ? isExploit(response.resource, response.caller, response.decision)
                      ? 'danger'
                      : 'success'
                    : 'success'
                }
              >
                {response.decision.allowed ? '200 OK' : '403 Forbidden'}
              </Badge>
              <span className="text-fg-muted text-xs">{response.decision.reason}</span>
            </div>
            {response.decision.allowed && response.resource.secret && (
              <pre className="text-fg overflow-x-auto font-mono text-xs whitespace-pre-wrap">
                {response.resource.secret}
              </pre>
            )}
            {response.decision.allowed &&
              response.resource.secret &&
              /CTF\{/.test(response.resource.secret) && (
                <div className="border-accent/40 bg-accent-soft text-fg flex items-center gap-2 rounded-md border p-1.5 font-mono text-xs">
                  <Flag className="text-accent-text size-3.5 shrink-0" aria-hidden />
                  {response.resource.secret.match(/CTF\{[^}]*\}/)?.[0]}
                </div>
              )}
          </div>
        )}
      </div>

      <div className="prose-lesson max-w-none text-sm">
        <Markdown compact>
          {`**Access control must be enforced on the server, for every request.** Hiding a link or trusting an object id is not a control — the caller chooses what to ask for. Two checks cover most of it: *object-level* authorization (does this caller own, or have a grant to, this specific object?) and *function-level* authorization (does this caller&rsquo;s role permit this action at all?). Together they enforce **least privilege**, which limits the blast radius of any one compromised account.`}
        </Markdown>
      </div>
    </div>
  );

  return (
    <LabLayout
      lab={accessControlLab}
      guide={guide}
      workspace={workspace}
      evidence={<EvidenceLog entries={log} onClear={() => setLog([])} />}
      onReset={reset}
    />
  );
}
