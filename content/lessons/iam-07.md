---
topicId: IAM-07
title: Service identities and secret management
summary: Most identities in a modern system belong to software, not people. Learn how workloads prove who they are, why short-lived credentials issued by the platform beat stored secrets, how secret managers and rotation work, and what to do first when a secret leaks.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain how a workload proves its identity with a platform-issued token or certificate instead of a stored secret.
  - Identify where long-lived secrets leak, in code, configuration, pipelines, and logs, and choose a safer alternative for each.
  - Design per-workload identities with least-privilege permissions and a rotation plan for the secrets that remain.
  - Order the response to a leaked secret, from revocation through investigation, and justify that order.
prerequisites: [IAM-01, IAM-04, IAM-06]
concepts: [service-account, secrets-management]
labs: []
keywords:
  - non-human identity
  - machine identity
  - workload identity
  - workload identity federation
  - service account
  - API key
  - access key
  - hard-coded credentials
  - secrets manager
  - vault
  - dynamic secrets
  - secret rotation
  - credential rotation
  - revocation
  - short-lived credentials
  - temporary credentials
  - OIDC federation
  - AssumeRoleWithWebIdentity
  - IAM Roles Anywhere
  - secret zero
  - secret scanning
  - pre-commit hook
  - environment variables
sources:
  - title: OWASP Secrets Management Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Security best practices in IAM (AWS Identity and Access Management User Guide)
    url: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
    publisher: Amazon Web Services
  - title: CircleCI incident report for January 4, 2023 security incident
    url: https://circleci.com/blog/jan-4-2023-incident-report/
    publisher: CircleCI
quiz:
  - question: A developer discovers that shop.example's payment API key was committed to a public repository a week ago. What should happen first?
    choices:
      - Delete the commit and force-push the branch so the key disappears.
      - Revoke the key at the payment provider, then deliver a replacement through the secrets manager.
      - Make the repository private.
      - Add the file to .gitignore so it is not committed again.
    answer: 1
    explanation: Only revocation makes the leaked value worthless. Clones, forks, and caches keep the old commit no matter what happens to the repository, so OWASP's incident-response order starts with immediate revocation, then rotation, then removing the value from code and logs, then investigating with logs.
  - question: Why does a CI job that exchanges a signed, short-lived OIDC token for cloud credentials carry less risk than a cloud access key stored as a CI variable?
    choices:
      - Nothing long-lived is stored in the CI system, the credentials expire on their own, and the cloud's trust policy can restrict them to one repository and branch.
      - OIDC tokens are encrypted, so no one can read them.
      - The cloud provider stops checking permissions for federated jobs.
      - Federation removes the need for least-privilege policies.
    answer: 0
    explanation: A stored key works for anyone who copies it until someone revokes it, as CircleCI's customers learned. A federated job holds only a short-lived token and credentials that expire on their own, issued only when the token's claims match the trust policy. The issued credentials still need least-privilege permissions.
  - question: Which statement about environment variables matches the OWASP Secrets Management Cheat Sheet?
    choices:
      - They are the recommended place for every secret.
      - The operating system encrypts them, so they are safe to use for keys.
      - Only the root user can read them.
      - They are generally accessible to all processes and can end up in logs or system dumps, so they are not recommended unless other methods are not possible.
    answer: 3
    explanation: Environment variables are better than hard-coded values but leak in predictable ways, through child processes, crash dumps, debug pages, and build logs. OWASP prefers fetching or mounting secrets from a secrets manager at runtime.
  - question: The orders API and the nightly report job at shop.example share one database account with full rights. What is the main problem?
    choices:
      - Shared accounts make queries slower.
      - Databases cannot authenticate software, only people.
      - Least privilege and accountability both fail, because a leak from either component exposes everything the account can do and the logs cannot say which component acted.
      - Shared accounts cannot be rotated.
    answer: 2
    explanation: Each workload should have its own identity, scoped to the tables and actions it needs. Separate identities also let you revoke one component's access during an incident without stopping the other.
  - question: CircleCI's customer data was encrypted at rest, yet the company told customers to assume their stored secrets had been accessed. Why?
    choices:
      - The encryption algorithm had been broken.
      - The attacker extracted encryption keys from a running process, and a process that decrypts secrets to use them can expose them.
      - Encryption at rest never protects anything.
      - Customers had turned encryption off.
    answer: 1
    explanation: Encryption at rest protects disks, backups, and stolen database files. It does not protect data from an attacker who reaches a system that holds the keys in memory, which is what CircleCI's report describes. Hence the advice to rotate everything and to stop storing long-lived credentials where possible.
---

## Why it matters

Look at what talks to what inside a typical web application, and most callers are programs, not people. The web tier calls an orders API, the API reads a database and calls a payment provider, a nightly job writes reports to storage, and a CI/CD pipeline builds and deploys all of them. Each is a _workload_ that must prove who it is, and for years the usual proof was a long-lived secret: a database password in a config file, an API key in an environment variable, a cloud access key pasted into the CI system's settings.

Such secrets are easy to copy and hard to track. In January 2023, the CI/CD provider CircleCI disclosed that an attacker who used malware on an engineer's laptop took "customer environment variables, tokens, and keys" from its systems. The data was encrypted at rest, but the attacker "extracted encryption keys from a running process." CircleCI asked every customer to rotate their secrets, from OAuth tokens to SSH keys, and warned: "If you stored secrets on our platform during this time period, assume they have been accessed." One of its recommendations afterward was to "Use OIDC tokens wherever possible to avoid storing long-lived credentials in CircleCI."

This lesson covers both halves of that advice: replacing stored secrets with identities that the platform vouches for, and managing the secrets that remain.

## The core idea

A [[service-account]] is an identity for software rather than for a person, also called a non-human, machine, or workload identity. Like a user account, it should belong to one thing, hold only the permissions that thing needs, have a named human owner, and be removed when the thing is retired.

The hard part is authentication. A program cannot remember a password the way a person does, so either it _holds_ a secret, such as an API key, or it is _vouched for_ by the platform it runs on. In the second case the cloud, the container orchestrator, or the CI system attests "this request comes from the deploy job of repository `shop/web`" and a token service issues a short-lived credential on that basis.

Hotel keys make the difference concrete. A metal master key copied into a drawer works until someone changes the locks, and nobody knows how many copies exist. A key card is programmed at the front desk for one room and expires at checkout. Long-lived secrets are master keys; [[temporary-credentials]] issued against a platform identity are key cards.

This approach assumes that the platform identifies workloads correctly, since it becomes the root of trust; that the secrets manager and token service, now prime targets, get the strongest protection; and that [[least-privilege]] applies to machines as it does to people.

## How it works

### Where long-lived secrets leak

| Where the secret lives | How it escapes | Better choice |
| --- | --- | --- |
| Source code and committed config | Every clone and fork; the history keeps it after deletion | Fetch at runtime from a secrets manager; scan before commit |
| Environment variables | Other processes, crash dumps, debug pages, and logs | Fetch or mount at runtime |
| CI/CD variables | Every job and administrator, and the CI provider itself | Federate to short-lived credentials |
| Logs and error messages | Tokens in URLs and headers get logged and shipped elsewhere | Mask them; OWASP says secrets should "Never be logged" |
| Container images | Build arguments and image layers keep values even after a later step deletes them | Build-time secret mounts; never Dockerfile `ENV` or `ARG` |
| Chat, tickets, and wikis | Pasted while debugging, then searchable for years | Share a reference to the secrets manager, not the value |

The OWASP Secrets Management Cheat Sheet adds that because environment variables reach other processes, logs, and system dumps, their use "is therefore not recommended unless the other methods are not possible."

### Workload identity: let the platform vouch

Major platforms can hand a workload a credential it never had to store. A cloud virtual machine or serverless function receives the temporary credentials of its attached role from the platform, on a virtual machine through the [[instance-metadata-service]]. AWS's IAM best practices put it plainly: in that case "there is no need to distribute long lived credentials" to the workload. Container orchestrators such as [[kubernetes]] can give each pod a signed token for its service account, and many CI systems can issue each job a signed OpenID Connect token that identifies the job.

Workloads outside a cloud can trade such a token for that cloud's credentials. AWS documents both an `AssumeRoleWithWebIdentity` call, which accepts a [[jwt]] from an identity provider configured in the account, and IAM Roles Anywhere, which accepts an X.509 [[certificate]] from the organization's own [[public-key-infrastructure]]. The diagram shows a CI deploy job using this kind of exchange.

```sequence
title: A CI job trades an OIDC token for short-lived cloud credentials
participant J as Deploy job (shop/web, main)
participant CI as CI provider's token issuer
participant STS as Cloud token service
participant R as Release bucket
J -> CI: Request an ID token for audience "cloud-sts"
CI --> J: Signed JWT: repo, branch, job; expires soon
J -> STS: Exchange the JWT for role "deploy-web"
note STS: Check signature, issuer, audience, repo, branch
STS --> J: Temporary credentials scoped to "deploy-web"
J -> R: Upload the release with those credentials
note: Nothing long-lived was stored in the CI system
```

The trust policy on the cloud side is now the security boundary. It should name the exact issuer, the expected audience, and the specific repository and branch allowed to assume the role. A policy that checks only the issuer could accept tokens from any project hosted at the same CI provider.

Between internal services, the same idea appears as mutual [[tls]] with short-lived certificates issued automatically to each workload.

### Secrets managers

Some secrets cannot be eliminated: a payment provider's API key, a database that only understands passwords, a signing key. A [[secrets-management|secrets manager]] holds them in one place. The OWASP cheat sheet recommends centralizing storage, provisioning, auditing, rotation, and management; applying least privilege with fine-grained controls on each secret; and keeping tamper-resistant audit logs that record who requested a secret, when it was used, and every administrative action.

The application should authenticate to the manager with its workload identity, not with another stored secret. Otherwise the problem only moves: the password that unlocks the manager becomes the new secret to protect, a puzzle often called _secret zero_.

Better still are _dynamic secrets_: a fresh credential for each requester, such as a database login created on demand with a short lease and revoked automatically. OWASP prefers dynamic secrets where possible and keeps static ones for long-lived key material, such as storage encryption or TLS keys, and for services that cannot issue temporary credentials. A leaked dynamic secret expires by itself and points straight to the workload it was issued to.

The keys that encrypt stored secrets often live in a key management service or a [[hardware-security-module]]. The CircleCI case shows the limit of encryption: any process that decrypts secrets in order to use them is a place where an attacker can read them.

### Rotation

Rotation replaces a secret with a new one on a schedule, when someone with access leaves, and immediately on any suspicion, so that, in OWASP's words, "any stolen credentials will only work for a short time." OWASP exempts people's passwords unless compromise is suspected. To avoid outages, most rotations overlap two credentials:

1. Create the new credential while the old one still works.
2. Deliver it to every consumer through the secrets manager.
3. Confirm through logs that nothing still uses the old one.
4. Revoke the old credential.

AWS recommends its "access last used" information for retiring access keys safely, which is exactly the check in step 3. Rotation that is not automated tends not to happen, and rotation that has never been tested tends to fail on the day of a leak.

### Least privilege for machines

Give every workload, in every environment, its own identity. Shared accounts break both least privilege and [[accountability]]: a leak from any component exposes everything the account can do, and the logs cannot say which component acted. Scope each identity to the actions and resources it needs, using the models from [Role-, attribute-, and relationship-based access](lesson:IAM-06), and add conditions such as the branch or network a request must come from. [Cloud identity and permissions](lesson:CLD-02) covers how cloud policies express this.

## Worked example

`shop.example` runs three services, a web frontend, an orders API, and a nightly report job, that share one `.env` file committed to the repository:

```ini
# .env (committed to Git and shared by every component)
DB_URL=postgres://admin:example-password@db.shop.test/shop
PAYMENT_API_KEY=example-not-a-real-key
STORAGE_KEY_ID=example-key-id
STORAGE_SECRET=example-secret
```

All three connect to the database as `admin`. A CI pipeline deploys with a cloud access key that has administrator rights, stored as a CI variable. Nothing has been rotated since launch.

**Step 1: inventory every secret.**

| Secret | Used by | What it can do | Stored in | Last rotated |
| --- | --- | --- | --- | --- |
| Database `admin` password | Web, orders API, report job | Anything in the database | `.env` in Git | Never |
| Payment API key | Orders API | Charge and refund on the merchant account | `.env` in Git | Never |
| Storage key pair | Report job | Read and write every bucket | `.env` in Git | Never |
| Cloud administrator key | CI pipeline | Anything in the cloud account | CI variable | Never |

**Step 2: give each component its own identity and only the access it needs.**

| Component | Identity | Permissions | Credential |
| --- | --- | --- | --- |
| Web frontend | `web` | Call the orders API; no database access | Short-lived certificate for mutual TLS |
| Orders API | `orders-api` | Read and write the `orders` tables; read the secret `payments/api-key` | Dynamic database login; workload identity to the secrets manager |
| Report job | `reports` | Read a database replica; write only under `reports/` in one bucket | Platform-issued temporary credentials |
| CI deploy | `deploy-web` | Push images and update services; no data access | OIDC exchange, only for `shop/web` on `main` |

**Step 3: plan rotation for what remains.** The payment API key is the one static, third-party secret left. It moves into the secrets manager, gets a named owner, and is rotated on a fixed schedule and on any suspicion, using the four-step overlap: create a second key at the payment provider, deliver it, confirm in the provider's logs that the old key is idle, then revoke it. The database logins and cloud credentials now expire by themselves, so they need monitoring that issuance keeps working rather than a rotation calendar.

**Step 4: rehearse a leak.** Suppose a scanner finds the old `PAYMENT_API_KEY` in a fork of the repository. The OWASP cheat sheet's incident-response steps give the order:

1. **Revoke** the key immediately at the payment provider. Deleting the commit does not help, because forks and clones keep it.
2. **Rotate**: issue the replacement through the secrets manager, ideally automatically.
3. **Delete** the value from code and logs, and plan any rewrite of Git history carefully.
4. **Investigate with logs**: who had access, when the key was used, and when it was last rotated. Treat any use between the leak and the revocation as a security incident.

Before the redesign, one leaked file exposed the database, every bucket, the payment account, and the cloud account. After it, a stolen `reports` credential expires on its own and can write only under one prefix.

## Defenses

- **Replace stored secrets with workload identity.** Use platform-issued, short-lived credentials, federated where needed. _Limit:_ the trust policy becomes the boundary, and a loose condition, such as any repository or any branch, hands the role to the wrong jobs.
- **Centralize the remaining secrets in a manager.** Per-identity access, fine-grained policies, and tamper-resistant audit logs. _Limit:_ the manager and its administrators become prime targets; protect them with phishing-resistant MFA (see [Multi-factor authentication and passkeys](lesson:IAM-03)).
- **Prefer dynamic, expiring credentials; automate rotation for the rest.** _Limit:_ some third-party services offer only static keys and manual rotation.
- **Detect leaks early.** Run [[secret-scanning]] in a pre-commit hook, in repositories, and over CI logs; OWASP suggests running more than one tool and correlating the results. _Limit:_ scanners recognize known key formats best and can miss a generic password.
- **Harden the pipeline.** OWASP says to treat CI/CD tooling as production, apply least privilege, make sure pipeline output and forks do not leak secrets, and keep secrets out of the pipeline entirely where possible. _Limit:_ the CI provider stays inside your trust boundary, as CircleCI's customers learned.
- **Write the leak runbook in advance.** Record each secret's owner, how to revoke it, and whom to notify. _Limit:_ an unrehearsed runbook tends to fail under pressure.

## Common misconceptions

- **"A private repository is a safe place for secrets."** Everyone with access, every integration, and anyone who later obtains a copy gets them.
- **"Environment variables are secure."** They beat hard-coding, but other processes, crash dumps, and logs can expose them.
- **"Encrypted at rest means safe."** A process that decrypts secrets to use them can expose them, which is how the CircleCI attacker obtained keys.
- **"Deleting the commit fixes a leak."** Only revocation makes a leaked secret worthless.
- **"Service accounts are internal, so they need less care."** They often hold broad standing rights and never face an MFA prompt, so they need owners, least privilege, and deprovisioning just as people do (see [Federation and enterprise identity](lesson:IAM-08)).

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

1. **On paper: redesign a toy app.** A club website at `club.test` has a web server, a mailing-list worker that uses a third-party email API, and a CI pipeline that deploys to a cloud bucket. All of them read an email API key, a database password, and a cloud access key from one committed file. Produce the worked example's two tables, then a rotation plan for the static secret that must remain and the four-step response if it leaks.
2. **On your own machine.** In a repository you own, search the current files and the history for strings that look like secrets:

   ```bash
   # Run inside a repository you own.
   git grep -n -I -i -E "(api[_-]?key|secret|passw(or)?d|token)[[:space:]]*[:=]"
   git log --all --oneline -S "PRIVATE KEY"
   ```

   The second lists commits that added or removed that string, even if it was later deleted. If you find a real secret, revoke it first, as in Step 4.

3. **With your own accounts.** Open the personal access token or API key page of a developer service you use. For each token, note its scopes, expiry, and last use. Revoke any you no longer need, and set expiration dates on the rest.

## Key takeaways

- Most identities in a system belong to software. Each workload deserves its own identity, owner, least-privilege permissions, and end of life.
- Prefer credentials that the platform issues and expires, through workload identity or OIDC federation, over long-lived secrets in code, environment variables, or CI settings.
- Keep unavoidable secrets in a secrets manager with fine-grained access and audit logs, and prefer dynamic secrets that expire by themselves.
- Rotate with overlap, automate it, and test it before you need it.
- When a secret leaks, revoke first, then replace it, remove it, and investigate; deleting the commit is not a fix.

## Go deeper

- Read CircleCI's incident report and map each announced change, such as periodic automatic OAuth token rotation, finer-grained token permissions through GitHub Apps, and the advice to use OIDC tokens, to a defense in this lesson. Which would have limited the damage, and which mainly speed up recovery?
- The OWASP cheat sheet recommends storing a secrets manager's primary secret in a secondary system. What failure does this guard against, and what new trust does it add?
- Open question: every workload's first credential has to come from somewhere. Compare platform attestation, such as cloud metadata or orchestrator-issued tokens, with an operator injecting a bootstrap secret. What does each assume, and what breaks when that assumption fails?
