---
topicId: CLD-08
title: Infrastructure as code and secret exposure
summary: Infrastructure as code makes cloud environments reviewable and repeatable, and it makes mistakes and leaked credentials repeatable too. Learn where secrets hide in an IaC workflow, how secret scanning and push protection catch them, and how to respond to an exposed credential and prevent the next one.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Explain how infrastructure as code changes the review, repeatability, and blast radius of cloud configuration.
  - Identify where secrets end up in an IaC workflow, including source files, variable files, state and plan files, and CI logs.
  - Review a sanitized Terraform configuration for hardcoded credentials and risky settings, and rewrite it.
  - Apply a rotate-first response to an exposed credential and explain why deleting the commit is not enough.
  - Choose controls that prevent recurrence, such as push protection, pre-commit and CI scanning, and policy checks.
prerequisites: [CLD-02, CLD-07, IAM-07]
concepts: [infrastructure-as-code, secret-scanning, secrets-management]
keywords:
  - infrastructure as code
  - IaC
  - Terraform
  - state file
  - tfstate
  - tfvars
  - sensitive values
  - ephemeral values
  - write-only arguments
  - hardcoded credentials
  - CWE-798
  - secret scanning
  - push protection
  - gitleaks
  - pre-commit hook
  - credential rotation
  - policy as code
  - misconfiguration scanning
  - NIST SP 800-218
sources:
  - title: Manage sensitive data in your configuration
    url: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
    publisher: HashiCorp
  - title: About secret scanning
    url: https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning
    publisher: GitHub
  - title: About push protection
    url: https://docs.github.com/en/code-security/concepts/secret-security/push-protection
    publisher: GitHub
  - title: Gitleaks
    url: https://github.com/gitleaks/gitleaks
    publisher: Gitleaks project
    license: MIT
  - title: 'CWE-798: Use of Hard-coded Credentials'
    url: https://cwe.mitre.org/data/definitions/798.html
    publisher: The MITRE Corporation
  - title: 'NIST SP 800-218: Secure Software Development Framework (SSDF) Version 1.1'
    url: https://csrc.nist.gov/pubs/sp/800/218/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-218
quiz:
  - question: A developer commits a cloud access key to a shared repository, notices a few minutes later, and pushes a second commit that deletes it. What should happen first?
    choices:
      - Nothing more, because the key is no longer in the code.
      - Rewrite the repository history to remove the first commit, then keep using the key.
      - Revoke or rotate the key immediately, then check the provider's logs for its use, then clean up.
      - Make the repository private.
    answer: 2
    explanation: The key is still in the history and in every clone made in the meantime, so it must be treated as compromised. Revoking it ends its usefulness; checking logs shows whether anyone used it; cleaning up history comes after and does not recall copies.
  - question: A Terraform variable holding a database password is marked sensitive. Where can the password still be found?
    choices:
      - Nowhere, because Terraform encrypts sensitive values.
      - In the state and plan files, readable by anyone who can access them.
      - Only in the terminal output of terraform apply.
      - Only in the cloud provider's audit logs.
    answer: 1
    explanation: Terraform's documentation says it stores values marked sensitive in both state and plan files; the flag only redacts them from command-line output. Keeping a value out of state needs ephemeral values or write-only arguments, and the state itself must be protected.
  - question: Which control stops a secret before it enters the shared repository's history?
    choices:
      - Push protection on the repository, or a secret-scanning pre-commit hook.
      - A weekly scan of the default branch.
      - Rotating every key on a fixed schedule.
      - Code review after the change is merged.
    answer: 0
    explanation: A pre-commit hook checks the commit on the developer's machine, and push protection rejects the push at the server. Later scans and reviews find secrets only after they are already in history, which then requires rotation.
  - question: Why is infrastructure as code both a security improvement and a new risk?
    choices:
      - It removes the need for access control on cloud accounts.
      - It encrypts every resource it creates.
      - It makes cloud configuration impossible to change by hand.
      - Changes can be reviewed and repeated, but a flaw or a secret in the code is repeated everywhere the code is applied, and the code and state become sensitive assets.
    answer: 3
    explanation: Review, version history, and repeatable deployments are real gains. The same repeatability spreads mistakes, and the repository and state files become a concentrated target that needs least-privilege access.
  - question: A secret scanner reports no findings for your repository. What can you conclude?
    choices:
      - The repository contains no secrets.
      - No strings matching the scanner's rules were found in what it scanned; secrets in custom formats, in other locations, or encoded may remain.
      - Every secret the repository ever held has been rotated.
      - The repository's state files are encrypted.
    answer: 1
    explanation: Scanners recognize known patterns and suspicious strings. A clean result lowers risk but does not prove absence, which is why scanning is combined with keeping secrets out of code by design.
---

## Why it matters

Infrastructure as code (IaC) describes servers, networks, storage, and permissions in files that a tool such as Terraform applies to a cloud account. It brings software practices to infrastructure: changes are reviewed in pull requests, every version is recorded, and an environment can be rebuilt from its definition. It also concentrates risk. A flawed module copied into ten projects creates the same open port or public database ten times. And IaC needs credentials to call cloud APIs, set database passwords, and configure services, and those credentials have a way of ending up in the files.

A credential written into code is a recognized weakness, catalogued as CWE-798, Use of Hard-coded Credentials. IaC credentials are usually what CWE calls the outbound variation: credentials the code uses to connect to another system. Once committed, a credential lives in the repository's history and in every clone, so deleting the line later does not remove it. NIST's Secure Software Development Framework (SSDF) asks producers to "Store all forms of code – including source code, executable code, and configuration-as-code – based on the principle of least privilege so that only authorized personnel, tools, services, etc. have access." An IaC repository, and the state files its tools produce, deserve the same protection as the infrastructure they control.

## The core idea

Treat infrastructure code like application code: review it, test it, and scan it before it is applied. Treat secrets as something the code refers to, never something it contains. Secrets leak from more places than the source files:

| Place                  | How a secret gets there                              | Safer pattern                                                    |
| ---------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| Source files           | Credentials typed into provider or resource blocks   | Credentials from the environment: single sign-on locally, OIDC in CI |
| Variable files         | Real values committed for convenience                | Keep secret values out of committed files; read a secrets manager |
| State and plan files   | The tool records resource attributes, passwords included | Remote, encrypted, access-controlled state; values kept out of state |
| CI logs                | A script prints a variable while debugging           | Never echo secrets; rely on masking only as a backstop           |
| Container images       | A build step copies a credential into a layer        | Build secrets (see [CLD-04](lesson:CLD-04))                       |

These patterns rest on assumptions: that every secret can be replaced on demand, that scanners recognize the secrets you use, and that the people and pipelines with access to state are trustworthy. Each assumption fails sometimes, which is why the defenses overlap.

## How it works

### What Terraform keeps in state

Terraform records what it created in a state file so that it can compare the real world with the configuration. Its documentation is blunt: "Terraform stores your state in a plaintext file, which includes any secret values you defined in your configuration," and state and plan files can contain "sensitive values, such as initial database passwords or API tokens." Marking a variable or output `sensitive` only redacts it from command-line output; Terraform "stores values with the `sensitive` argument in both state and plan files."

HashiCorp's recommendations follow from that: treat state as sensitive data by excluding it from Git, store it remotely, encrypt it at rest, limit access with access controls, and use audit logs to track who reads it. Newer releases can keep some values out of state altogether. Ephemeral values, available from Terraform 1.10, "are available at runtime, but Terraform omits them from state and plan files entirely," and write-only arguments, available from Terraform 1.11, let a resource receive a value that is not stored.

### Finding secrets with scanners

Secret scanners search text for strings that match known credential formats, such as a cloud provider's access key prefix, and some also flag high-entropy strings or suspicious keywords. They can run at three points: on the developer's machine before a commit (a pre-commit hook), at the server when a push arrives (push protection), and across the whole history of a repository after the fact. The earlier the check, the cheaper the fix, because a secret blocked before it is shared never needs rotating.

GitHub's secret scanning shows what a hosted scanner covers. It scans "your entire Git history on all branches of your repository," along with issue and pull request text, discussions, and wikis. When it finds a credential issued by one of its partner services, GitHub notifies the provider "so they can take action, such as revoking the credential." Its push protection blocks secrets "before they reach your repository," whether they arrive by a command-line push, a commit in the web interface, a file upload, or an API request. A user with write access can bypass a block by giving a reason, and each bypass is recorded as an alert and in the audit log. Push protection for users is on by default for pushes to public repositories, but repository-level push protection is off until someone enables it.

Scanners have two kinds of error. False positives include test fixtures and documentation examples. False negatives include secrets in custom formats, values split across lines, and encoded data. A clean scan lowers risk; it does not prove there are no secrets.

### Responding to an exposed secret

Order matters. First, revoke or rotate the credential, because anyone who saw or cloned the repository may have it, and rewriting history does not recall copies. GitHub's advice for a scanning alert is to "rotate the affected credential immediately to prevent unauthorized access," and it notes that removing secrets from Git history "is time-intensive and often unnecessary if you've already revoked the credential." Second, check the provider's audit logs for any use of the credential since it was exposed, and investigate what it touched. Third, remove the secret from the code, replace it with a reference to a secrets manager, and decide whether rewriting history is worth the disruption. Fourth, fix the process that let it in. The diagram shows the difference push protection makes.

```sequence
title: An access key reaches a repository
participant B as Bob
participant G as Repository host
participant C as Cloud provider
B -x G: Push containing an access key (blocked)
note: Without push protection, the push succeeds
G --> B: Scanning alert: access key in history
B -> C: Deactivate the key and issue a new one
B -> C: Search audit logs for the old key's use
B -> G: Replace the key with a secrets reference
```

### Checking configuration before it is applied

Because IaC is code, the same automated checks can run on every change. Misconfiguration scanners and policy-as-code rules read the configuration or the planned changes and fail a pull request that, for example, makes a database publicly accessible, opens an administrative port to the whole internet, or disables encryption. Settings changed by hand in a console skip those checks, which is why IaC teams also watch for drift between the code and the live environment.

## Worked example

After a scanner alert, Alice receives a sanitized excerpt of the fictional `gradebook-infra` repository. The secret values have been replaced with `REDACTED` markers; everything else is as committed. The repository also contains `terraform.tfstate` and `prod.tfvars`.

```hcl
# main.tf (sanitized; insecure)
provider "aws" {
  region     = "us-east-1"
  access_key = "REDACTED-ACCESS-KEY-ID"
  secret_key = "REDACTED-SECRET-ACCESS-KEY"
}

resource "aws_db_instance" "grades" {
  identifier          = "grades-db"
  engine              = "postgres"
  instance_class      = "db.t3.micro"
  allocated_storage   = 20
  username            = "gradebook_admin"
  password            = "REDACTED-DB-PASSWORD"
  publicly_accessible = true
}

resource "aws_security_group_rule" "admin_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.app.id
}
```

**Step 1: List the findings.**

1. A long-lived access key sits in the provider block (CWE-798).
2. The database password is in the code. The AWS provider's documentation warns that a password set this way "may show up in logs, and it will be stored in the state file."
3. The database accepts connections from the public internet.
4. SSH is open to every address on the internet.
5. The state file is committed, so everyone with read access has every value it holds.
6. The variables file for production is committed.

**Step 2: Contain before cleaning.** Alice has the access key deactivated and replaced first, then searches the account's audit logs for activity by that key since the commit date. The database password is rotated next, because it sat in both the code and the committed state.

**Step 3: Rewrite the configuration.**

```hcl
# main.tf (fixed)
terraform {
  backend "s3" {
    bucket  = "tfstate-111122223333"
    key     = "gradebook/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}

provider "aws" {
  region = "us-east-1"
  # No credentials here: a single sign-on profile locally,
  # an OIDC role session in CI (see CLD-07).
}

resource "aws_db_instance" "grades" {
  identifier                  = "grades-db"
  engine                      = "postgres"
  instance_class              = "db.t3.micro"
  allocated_storage           = 20
  username                    = "gradebook_admin"
  manage_master_user_password = true # RDS manages the password in Secrets Manager
  storage_encrypted           = true
  publicly_accessible         = false
}

resource "aws_security_group_rule" "admin_ssh" {
  type              = "ingress"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["198.51.100.0/24"] # campus administration network (example range)
  security_group_id = aws_security_group.app.id
}
```

The state now lives in a dedicated bucket, which needs the protections from [CLD-03](lesson:CLD-03): no public access, a bucket policy limited to the IaC roles, and versioning so a damaged state can be recovered. Alice also removes the committed files and ignores them from now on:

```text
# .gitignore
*.tfstate
*.tfstate.*
*.tfvars
.terraform/
```

**Step 4: Prevent recurrence.** Alice turns on push protection for the repository and adds a CI job that scans every pull request for secrets and misconfigurations. For the team's laptops, she adds a hook for the pre-commit framework, using the configuration from the Gitleaks documentation and pinned to a release she has reviewed:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/gitleaks/gitleaks
    rev: <reviewed-release-tag-or-commit>
    hooks:
      - id: gitleaks
```

Finally, she gives the pipeline short-lived credentials, so that no long-lived key needs to exist at all.

## Defenses

- **Keep secrets out of IaC.** Take credentials from the environment, read secrets from a secrets manager at run time, let services manage their own passwords where they can, and use ephemeral values or write-only arguments. The limit: a value that a resource must store will exist somewhere, so protect that place.
- **Protect state like a secret.** Store it remotely, encrypted, with access limited to the people and roles that apply changes, and audit reads. The limit: anyone who can run `terraform apply` can usually read state.
- **Scan at three points.** Pre-commit hooks, push protection, and repository-wide scanning catch different mistakes. The limit: scanners know only the patterns they are given, so add custom rules for in-house secret formats.
- **Check configuration in CI.** Run misconfiguration and policy checks on every pull request and block high-risk findings. The limit: rules cover known patterns, so reviewers still read the plan.
- **Make rotation routine.** Prefer short-lived credentials and practice rotating long-lived ones, so that a leak becomes an inconvenience rather than an emergency. The limit: some legacy systems cannot rotate easily; list them before an incident does.
- **Give the IaC pipeline least privilege.** Separate a read-only role for planning from an approved role for applying ([CLD-02](lesson:CLD-02)).

## Common misconceptions

- **"We deleted the secret in the next commit, so it's gone."** It is still in history, in every clone, and possibly in forks and caches.
- **"Marking a value sensitive protects it."** It only hides the value from command-line output. It is still in state and plan files.
- **"A private repository is a safe place for secrets."** Everyone with read access, and every clone and backup, has a copy, and access lists change over time.
- **"The scanner found nothing, so we have no secrets."** Scanners find what they recognize.
- **"Rotating the key is enough."** Rotation stops future use. Only the logs tell you whether the key was used before you rotated it.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test. Run secret scanners only on repositories you own.

**Part 1: Scan your own repository.** Choose a repository that you created, install an open-source secret scanner after reading its documentation, and scan the full history. For example, Gitleaks, an MIT-licensed scanner, scans a repository's history with `gitleaks git -v --redact path/to/your-repo`, where `--redact` keeps the secrets themselves out of the output. For each finding, decide whether it is a real secret or a false positive. If it is real, rotate it first, then remove it, then add a pre-commit hook so that the same mistake is caught next time.

**Part 2: Review a sanitized configuration on paper.** Find at least four problems in this fictional excerpt, and write the fix and the recurrence-prevention step for each:

```hcl
terraform {
  backend "s3" {
    bucket = "course-downloads-111122223333" # also serves public course files
    key    = "terraform.tfstate"
    region = "us-east-1"
  }
}

variable "smtp_password" {
  type      = string
  default   = "REDACTED-SMTP-PASSWORD"
  sensitive = true
}

resource "aws_security_group_rule" "db" {
  type              = "ingress"
  from_port         = 5432
  to_port           = 5432
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.db.id
}
```

Then answer: if this repository had been public for a month, what would you do in the first hour, and in what order?

## Key takeaways

- IaC makes configuration reviewable and repeatable, which spreads both good settings and mistakes.
- Secrets leak through source files, variable files, state and plan files, CI logs, and images; Terraform state is plain text and includes values marked sensitive.
- When a secret is exposed, rotate first, check the logs second, and clean up third.
- Scan before commit, at push, and across history, and check configuration in CI before it is applied.
- The best secret is one that never needs storing: short-lived credentials, service-managed passwords, and values kept out of state.

## Go deeper

- Read Terraform's guidance on ephemeral values and write-only arguments, and identify which resources in a project you know could use them.
- Compare the rule sets of two open-source secret scanners. Which secret formats does each recognize, and how do you add your own?
- Open question: if every credential were short-lived and issued per job, what would remain for a secret scanner to find?
