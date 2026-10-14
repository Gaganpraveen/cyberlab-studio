---
topicId: CLD-02
title: Cloud identity and permissions
summary: In the cloud, every action is an API call that an authorization engine allows or denies by reading policies. Learn how that evaluation works, why default deny and explicit deny matter, and how to repair an over-broad policy so that a stolen credential can do as little as possible.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Identify the principal, action, resource, and conditions in a cloud access request and in a policy statement.
  - Predict whether a request is allowed, implicitly denied, or explicitly denied by applying policy evaluation rules.
  - Rewrite an over-broad policy so that it grants only the actions and resources a workload needs.
  - Explain how cloud credentials are stolen or abused, and choose controls that limit the damage.
prerequisites: [IAM-01, IAM-06, CLD-01]
concepts: [iam-policy, principal, implicit-deny, explicit-deny, temporary-credentials, instance-metadata-service]
labs: [cloud-iam-policy]
keywords:
  - IAM
  - identity and access management
  - AWS IAM
  - Azure RBAC
  - policy evaluation
  - least privilege
  - wildcard permissions
  - role
  - service account
  - access key
  - T1078.004
  - valid accounts
  - privilege escalation
  - IMDS
  - SSRF
  - permissions boundary
  - service control policy
sources:
  - title: How AWS enforcement code logic evaluates requests to allow or deny access
    url: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
    publisher: Amazon Web Services
  - title: Security best practices in IAM
    url: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
    publisher: Amazon Web Services
  - title: What is Azure role-based access control (Azure RBAC)?
    url: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
    publisher: Microsoft
  - title: Use Secure Cloud Identity and Access Management Practices (Cybersecurity Information Sheet, March 2024)
    url: https://media.defense.gov/2024/Mar/07/2003407866/-1/-1/0/CSI-CloudTop10-Identity-Access-Management.PDF
    publisher: National Security Agency (NSA) and Cybersecurity and Infrastructure Security Agency (CISA)
  - title: Russian Cyber Actors Target Cloud-Hosted Infrastructure (press release, February 26, 2024)
    url: https://www.nsa.gov/Press-Room/Press-Releases-Statements/Press-Release-View/Article/3686651/russian-cyber-actors-target-cloud-hosted-infrastructure/
    publisher: National Security Agency (NSA)
  - title: 'MITRE ATT&CK T1078.004: Valid Accounts: Cloud Accounts'
    url: https://attack.mitre.org/techniques/T1078/004/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
quiz:
  - question: A role has one identity-based policy that allows s3:GetObject on arn:aws:s3:::reports-111122223333/*, and no other policy applies. The role calls s3:DeleteObject on an object in that bucket. What happens?
    choices:
      - It is allowed, because the role already has access to the bucket.
      - It is denied by an implicit deny, because no statement allows DeleteObject.
      - It is denied by an explicit deny, because deleting is a destructive action.
      - It is allowed, because resource-based policies are checked first.
    answer: 1
    explanation: Access to one action on a resource says nothing about other actions. Nothing allows DeleteObject, so the default (implicit) deny applies. No Deny statement exists, so this is not an explicit deny.
  - question: Two policies apply to a request. One allows s3:* on every resource; the other denies s3:PutBucketPolicy on the target bucket. The principal calls PutBucketPolicy on that bucket. What is the result?
    choices:
      - Allowed, because the broader policy was attached first.
      - Allowed, because an allow for all actions outranks a single deny.
      - It depends on which statement is more specific.
      - Denied, because an explicit deny overrides any allow.
    answer: 3
    explanation: In AWS IAM, order and specificity do not matter. If any applicable statement explicitly denies the request, the final decision is deny, however broad the allows are.
  - question: A workload only ever reads one folder, but its policy allows "s3:*" on "*". Why does the broad policy matter if the code never uses the extra permissions?
    choices:
      - A thief who steals the credential can use every permission the policy grants, such as reading, overwriting, or deleting any bucket and changing bucket policies.
      - Wildcard permissions turn off logging for the workload.
      - Wildcard permissions make the credential expire later.
      - It does not matter, because the code limits what the credential can do.
    answer: 0
    explanation: Policies bound what a credential can do, not what the original code does. An attacker uses the credential directly, so the blast radius equals the policy, not the program.
  - question: An audit finds an automated service account that has a password, no MFA, and no sign-ins in a year. What is the best response?
    choices:
      - Leave it alone, because an unused account cannot be attacked.
      - Rename it so that attackers cannot guess its name.
      - Disable or remove it, and move any automation that still needs it to short-lived credentials scoped to its task.
      - Add MFA by sharing a single one-time-code device among the team.
    answer: 2
    explanation: Unused accounts still accept sign-ins. NSA and the UK NCSC reported in 2024 that SVR actors gained cloud access mainly through automated system accounts and inactive accounts, which often lacked MFA and had weak passwords.
  - question: A web application on a cloud virtual machine has a server-side request forgery (SSRF) flaw. Why can this become a cloud permissions problem?
    choices:
      - SSRF lets the attacker edit the machine's IAM policy directly.
      - The attacker can make the server request its role's temporary credentials from the instance metadata service, then use them with all of the role's permissions.
      - SSRF disables explicit deny statements on the machine.
      - The metadata service stores the root user's password.
    answer: 1
    explanation: The metadata service hands the machine's role credentials to anything on the machine that asks, including a request the attacker tricks the server into making. The role's policy then sets the damage, which is one more reason to keep it narrow.
---

## Why it matters

In a traditional data center, a firewall separates the inside from the outside, and an attacker must first get through the network. A public cloud's management interface is different: it is an API reachable from anywhere on the internet. Creating a server, reading a file from storage, or deleting a database is a single authenticated API call, and what decides whether it succeeds is, above all, the cloud's identity and access management (IAM) system. In effect, identity has become the perimeter. An NSA and CISA information sheet on cloud IAM puts it simply: "Cloud environments are valuable targets for adversaries."

Attackers have noticed. In February 2024, the US National Security Agency and the UK's National Cyber Security Centre described how actors linked to Russia's foreign intelligence service (SVR), also tracked as APT29 and Midnight Blizzard, "primarily gain access to cloud-based systems by logging into automated system accounts and inactive accounts." Such accounts "often do not use multifactor authentication and have weak passwords," which made password spraying and brute forcing effective ways in. To stay in, the actors used "system issued tokens" or registered their own devices. MITRE ATT&CK catalogs the general pattern as Valid Accounts: Cloud Accounts (T1078.004) and notes that over-privileged accounts "may be used to harvest sensitive data from online storage accounts and databases."

The lesson for defenders is that once a credential is stolen, the damage is bounded only by the permissions attached to it. Writing those permissions well is one of the most valuable skills in cloud security.

## The core idea

Every request to a cloud API answers four questions. Who is asking (the [[principal]])? What do they want to do (the action, such as reading an object)? On what (the resource)? And under what circumstances (the context, such as the source address or whether [[mfa|multi-factor authentication]] was used)? An [[iam-policy]] is a set of statements about those same four things. The authorization engine compares the request with every policy that applies and returns allow or deny.

The major clouds share three rules, with small differences:

1. **Default deny.** If no policy allows a request, it fails. AWS states that "By default, all requests are implicitly denied," with a narrow exception for the account's root user. A request that fails this way meets an [[implicit-deny]].
2. **Allows add up.** Permissions from several grants combine. Microsoft describes Azure RBAC as "an additive model, so your effective permissions are the sum of your role assignments."
3. **Explicit deny wins.** A statement that denies the action overrides any allow, however broad. In AWS's words, "An explicit deny overrides an explicit allow," and Azure checks its deny assignments before its role assignments. This is an [[explicit-deny]].

A badge system is a fair analogy. A new badge opens no doors. Each approval adds doors. A "do not admit" list at the front desk overrides every approval. [[least-privilege|Least privilege]] means approving only the doors a person needs; AWS's best-practice guide says to "grant only the permissions required to perform a task."

The model rests on three assumptions: every path to a resource passes through the engine, each credential really belongs to the principal it names, and the policies say what their authors meant. The last one fails most often, because the engine enforces a mistaken policy as faithfully as a correct one.

## How it works

### Principals and their credentials

Principals come in two kinds. Human users should sign in through an identity provider using [[federation]] and receive short-lived credentials for each session. Workloads, such as a virtual machine or a build job, act through a role or [[service-account]], and they too should use [[temporary-credentials]] that expire after minutes or hours instead of long-lived access keys. The AWS IAM best practices list both requirements, along with MFA for humans and updating any long-term access keys that remain. The reason is exposure time. A key that never expires stays useful to a thief until someone notices; a token that expires shrinks that window.

### Anatomy of a policy

Here is an AWS identity-based policy with one statement:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadReportsFromCampus",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::reports-111122223333/*",
      "Condition": {
        "IpAddress": { "aws:SourceIp": "203.0.113.0/24" }
      }
    }
  ]
}
```

`Effect` is `Allow` or `Deny`. `Action` names API operations in the form `service:Operation`, and wildcards such as `s3:*` match many at once. `Resource` names targets by Amazon Resource Name (ARN), where `*` means every resource. `Condition` adds tests on the request context; here the request must come from the campus range `203.0.113.0/24`. Attached to a user or role, this is an identity-based policy. A statement attached to a resource, such as a storage bucket, is a resource-based policy; it adds a `Principal` element naming whom it trusts. Azure and Google Cloud use different syntax, binding a principal to a role at a scope, but the ideas carry over.

### How a decision is reached

The sequence below follows one allowed request and one denied request from the same role session. The engine authenticates the caller, assembles the request context, and walks through its checks before the storage service does any work.

```sequence
title: Two requests through a cloud authorization engine
participant App as gradebook role session
participant API as Cloud API
participant Eng as Policy engine
App -> API: GetObject submissions/hw1.pdf (signed)
API -> Eng: Authenticate caller, build request context
note Eng: Any applicable explicit Deny? No
note Eng: Organization guardrails allow it? Yes
note Eng: Does a policy allow it? Yes
Eng --> API: Allow
API --> App: 200 OK with the object
App -x API: DeleteObject submissions/hw1.pdf is denied
note Eng: No statement allows DeleteObject: implicit deny
```

AWS documents the checks in a fixed order. Each step can end the evaluation with a deny or pass the request on:

| Step | Check                                                               | Effect on the decision                                   |
| ---- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| 1    | Does any applicable policy explicitly deny the request?             | Yes: final deny                                          |
| 2    | Do organization guardrails (control policies) allow the action?     | No: deny                                                 |
| 3    | Does a resource-based policy allow it?                              | Yes: can allow on its own for some same-account callers  |
| 4    | Does an identity-based policy allow it?                             | No: deny, unless step 3 already allowed it               |
| 5    | If a permissions boundary is set, does it allow the action?         | No: deny                                                 |
| 6    | If the session has a session policy, does it allow the action?      | No: deny                                                 |

Two details matter in practice. Guardrails, such as organization control policies and permissions boundaries, never grant anything by themselves; they only cap what other policies can grant. And within one account, an allow in either an identity-based or a resource-based policy is usually enough, although role trust policies and key policies must name the principal explicitly.

### Where permissions go wrong

- **Wildcards.** `"Action": "*"` or `"Resource": "*"` grants far more than any task needs, including actions no one considered.
- **Permission to change permissions.** A principal that can attach policies, create credentials for other identities, or give a more powerful role to a workload it launches can grant itself more access. That makes such permissions nearly as dangerous as administrator access. ATT&CK lists adding cloud credentials and abusing role-assumption policies among the ways attackers persist and achieve [[privilege-escalation]].
- **Inheritance.** A grant at a parent level flows down. The NSA and CISA sheet warns that permissions on a parent folder or organizational unit apply to everything nested beneath it, and Azure scopes have the same parent-child structure.
- **Stale identities.** Accounts that no one uses still accept sign-ins, as the SVR campaign showed.
- **Credentials exposed through the application.** A cloud virtual machine obtains its role's temporary credentials from the [[instance-metadata-service]], an HTTP endpoint reachable only from inside the machine. If the application has a [[ssrf|server-side request forgery]] flaw, an attacker can make the server fetch those credentials and use them elsewhere. The NSA and CISA sheet calls this out and recommends the latest metadata-service version and restricting access to it.

## Worked example

Bob maintains the fictional `gradebook` app, which runs as the role `gradebook-app` in AWS account `111122223333`. The app reads student submissions under `gradebook-uploads-111122223333/submissions/` and writes feedback files under `gradebook-uploads-111122223333/feedback/`. It does nothing else. This is the role's current policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:*",
      "Resource": "*"
    }
  ]
}
```

**Step 1: Read it as a thief would.** With these credentials, anyone could read every object in every bucket in the account, overwrite or delete student submissions, and call `PutBucketPolicy` to make a bucket public. The app needs none of this.

**Step 2: List what the app really does.** Bob reads the code and checks the access logs for the last term. The app calls exactly two operations: `GetObject` on `submissions/*` and `PutObject` on `feedback/*`.

**Step 3: Rewrite to least privilege.**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadSubmissions",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::gradebook-uploads-111122223333/submissions/*"
    },
    {
      "Sid": "WriteFeedback",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::gradebook-uploads-111122223333/feedback/*"
    }
  ]
}
```

**Step 4: Add a guardrail.** The security team attaches a second policy to every application role. It allows nothing. It explicitly denies changes to who can reach a bucket (its policy, its access control lists, and its public-access block), so a future mistake cannot reopen that door:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AppsNeverChangeBucketAccess",
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
        "s3:PutBucketAcl",
        "s3:PutObjectAcl",
        "s3:PutBucketPublicAccessBlock"
      ],
      "Resource": "*"
    }
  ]
}
```

**Step 5: Test decisions.** Bob writes down the expected outcome of six requests before deploying, then confirms them in a test account he owns.

| #   | Request by `gradebook-app`                                           | Decision      | Reason                                              |
| --- | -------------------------------------------------------------------- | ------------- | --------------------------------------------------- |
| 1   | `GetObject` on `submissions/alice/hw1.pdf`                           | Allow         | Matches `ReadSubmissions`                           |
| 2   | `PutObject` on `feedback/alice/hw1.txt`                              | Allow         | Matches `WriteFeedback`                             |
| 3   | `PutObject` on `submissions/alice/hw1.pdf`                           | Implicit deny | No statement allows writing submissions             |
| 4   | `GetObject` on an object in `registrar-exports-111122223333`         | Implicit deny | Resource is outside both statements                 |
| 5   | `DeleteObject` on `submissions/alice/hw1.pdf`                        | Implicit deny | Action is not allowed anywhere                      |
| 6   | `PutBucketPolicy`, after someone re-attaches the old `s3:*` policy   | Explicit deny | The guardrail's deny overrides the restored allow   |

Request 3 shows that least privilege protects integrity as well as confidentiality: the app can no longer overwrite what students submitted. Request 6 shows defense in depth: the explicit deny holds even after a later mistake.

**Step 6: Name the residual risk.** A thief with the new credentials could still read every submission. Bob keeps the role's credentials short-lived and asks the operations team to alert on unusual read volume.

## Defenses

- **Least privilege, applied iteratively.** Start narrow, or start from a provider-managed policy and tighten it. AWS recommends tools that generate candidate policies from recorded access activity. The limit: a policy learned from activity reflects only the observation window, so rare legitimate tasks get missed, and anything an attacker did during the window looks legitimate.
- **Temporary credentials everywhere.** Use federation for humans, roles for workloads, and short token lifetimes, as the SVR advisory recommends. The limit: a stolen token still works until it expires.
- **Phishing-resistant MFA for people.** NSA and CISA recommend phishing-resistant methods "where possible," such as FIDO or WebAuthn authenticators. The limit: MFA protects sign-ins, not access keys or tokens that have already been issued.
- **Guardrails that cap permissions.** Organization-wide deny policies and permissions boundaries limit what any team can grant. The limit: they need upkeep, and guardrails that block legitimate work tempt teams to remove them.
- **Separation of duties.** NSA and CISA give the example that key administrators should not be able to use the keys they manage. See [[separation-of-duties]].
- **Review and remove.** Regularly remove unused users, roles, permissions, and credentials. NSA and CISA add a caution: plan emergency ("break glass") access before deleting permissions that only look unused.
- **Conditions.** Require MFA, a source network, or resource tags. The limit: network conditions weaken when attackers route traffic through residential proxies, as the SVR actors did.
- **Protect workload credentials.** Fix SSRF flaws, require the newest metadata-service version, and restrict which machines can reach it.
- **Log and alert.** Log access requests and policy changes, and investigate anomalies, as NSA and CISA advise. A [[security-log]] of IAM changes is often the first evidence of privilege escalation.

## Common misconceptions

- **"Default deny means we are safe."** Only if the allows are narrow. One wildcard statement cancels the benefit.
- **"A more specific allow beats a general deny."** Not in AWS IAM: an applicable explicit deny wins regardless of specificity or order.
- **"Service accounts are low risk because no person uses them."** They are attractive targets precisely because they often lack MFA and nobody watches them.
- **"Read-only access is harmless."** Read access to every bucket is a data breach waiting to happen, and read access to secrets often leads to write access elsewhere.
- **"MFA on the console protects our access keys."** Interactive MFA does not stop a long-lived key from being used. ATT&CK notes that adding long-lived credentials can let an attacker bypass MFA.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

[The lab](lab:cloud-iam-policy) evaluates requests against a fictional AWS-style account policy with this lesson's three rules. Its **Effective policy** panel shows `DeveloperAccess`, a statement that grants `role/developers` the actions `iam:*` and `s3:*` on `*`.

1. **Escalate.** With every **Policy hardening** box unchecked, click **Escalate to admin (iam:AttachRolePolicy)**. `DeveloperAccess` allows it on the role's own ARN, so the lab reports that you are now admin and reveals the flag for the "Become admin through a wildcard" challenge.
2. **Compare two denials.** Check only **Add an explicit Deny on IAM self-escalation** and run the attack again: the evidence log reports an explicit deny by `DenySelfEscalation`, although `iam:*` is still allowed. Check only **Scope the developer role to only the actions it needs** instead and run it again: now the log reports an implicit deny. Either solves "Close the escalation path"; like Bob, keep both.
3. **Predict, then test.** Before choosing a principal, action and resource in **Test any request**, write down the decision you expect, as Bob does in Step 5. Then answer "Allow vs. Deny" and "Name the principle."
4. **Finish on paper.** On its own, the Deny covers only five IAM calls, so `iam:*` still allows other ways to gain access, such as creating access keys for an admin user. The scoped statement also keeps `Resource: *`. Rewrite it with ARNs, as Bob does in Step 3.

**Without the lab.** This is a paper exercise. A fictional job, `photo-resizer`, runs as a role in account `111122223333`. It reads originals from `photos-111122223333/originals/` and writes resized images to `photos-111122223333/thumbnails/`. Its current policy is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:*", "iam:*"],
      "Resource": "*"
    }
  ]
}
```

1. Write a least-privilege replacement policy with one statement per task.
2. Explain in two sentences why `iam:*` lets a thief make the role an administrator.
3. Predict the decision (allow, implicit deny, or explicit deny) for each request under your new policy: `GetObject` on `originals/cat.jpg`; `PutObject` on `thumbnails/cat.jpg`; `PutObject` on `originals/cat.jpg`; `DeleteObject` on `thumbnails/cat.jpg`; `ListAllMyBuckets`; and `AttachRolePolicy` on the job's own role.
4. Write one guardrail statement with `"Effect": "Deny"` that would still protect the bucket's access settings if someone restored the old policy.

If you have your own sandbox account, check your predictions with the provider's policy-testing tools.

## Key takeaways

- Every cloud API call is decided by policies about a principal, an action, a resource, and conditions.
- Requests are denied by default; allows add up; an applicable explicit deny overrides any allow.
- A stolen credential can do everything its policy allows, so scope policies to the exact actions and resources a task needs.
- Prefer federation and short-lived credentials to long-lived keys, and remove identities nobody uses.
- Guardrails that only deny, such as organization policies and boundaries, keep later mistakes from reopening access.

## Go deeper

- Read AWS's full evaluation logic, including permissions boundaries, session policies, and the special cases for resource-based policies.
- Compare it with Azure RBAC's additive model and deny assignments. Which design makes it easier to answer the question "who can read this storage account?"
- The NSA and CISA IAM sheet covers privileged access workstations, just-in-time elevation, and hardening federation servers, which this lesson only touches.
- Open question: least privilege is easy to state and hard to keep as code changes. How would you measure the gap between the permissions a role has and the permissions it uses, and how often should that gap be closed?
