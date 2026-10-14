---
topicId: CLD-07
title: Build pipelines and artifact provenance
summary: A build pipeline holds the keys to everything it publishes, and it runs code from many hands. Learn how attackers abuse CI/CD workflows, how signed build provenance and keyless signing let others check where an artifact came from, and how to design a small release pipeline whose output can be verified.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Identify the trust boundaries in a CI/CD pipeline and the credentials that each stage holds.
  - Recognize insecure workflow patterns, such as running untrusted pull request code with secrets, and rewrite them with least privilege.
  - Explain what build provenance records and what each SLSA Build level, from L0 to L3, adds.
  - Describe how keyless signing binds an artifact digest to a workload identity and a transparency log entry.
  - Design a toy release pipeline and the deploy-time checks that verify its artifacts.
prerequisites: [CLD-06, CRY-04, IAM-05]
concepts: [ci-cd-pipeline, build-provenance, slsa, artifact-signing]
keywords:
  - CI/CD
  - continuous integration
  - continuous delivery
  - GitHub Actions
  - workflow
  - poisoned pipeline execution
  - PPE
  - pull_request_target
  - script injection
  - GITHUB_TOKEN
  - OIDC
  - SLSA
  - SLSA v1.2
  - provenance
  - in-toto
  - attestation
  - Sigstore
  - Cosign
  - Fulcio
  - Rekor
  - transparency log
  - keyless signing
  - SolarWinds
  - SUNBURST
sources:
  - title: SLSA v1.2 Build Track Basics
    url: https://slsa.dev/spec/v1.2/build-track-basics
    publisher: The Linux Foundation (OpenSSF SLSA project)
    license: Community Specification License 1.0
  - title: Sigstore Overview
    url: https://docs.sigstore.dev/about/overview/
    publisher: Sigstore project
  - title: Secure use reference for GitHub Actions
    url: https://docs.github.com/en/actions/reference/security/secure-use
    publisher: GitHub
  - title: Using artifact attestations to establish provenance for builds
    url: https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
    publisher: GitHub
  - title: OWASP Top 10 CI/CD Security Risks
    url: https://owasp.org/www-project-top-10-ci-cd-security-risks/
    publisher: OWASP Foundation
    license: All rights reserved
  - title: 'SolarWinds Compromise, Campaign C0024'
    url: https://attack.mitre.org/campaigns/C0024/
    publisher: The MITRE Corporation
    sourceId: mitre-attack
quiz:
  - question: A workflow is triggered by pull_request_target, checks out the pull request's head commit, and runs make test. Why is this dangerous?
    choices:
      - The pull_request_target trigger cannot run tests.
      - Code written by the pull request's author runs in a workflow that may have repository write access and the repository's secrets.
      - Commits from forks cannot be checked out.
      - The make tool is not available on hosted runners.
    answer: 1
    explanation: GitHub warns that pull_request_target workflows may have write access and access to referenced secrets, and that they must not check out untrusted code. Running the contributor's Makefile there hands that code the workflow's privileges, a form of poisoned pipeline execution.
  - question: In the SolarWinds compromise, SUNBURST reached customers in updates signed with SolarWinds' own code-signing certificates. What does this show?
    choices:
      - The signature algorithm SolarWinds used was broken.
      - Customers should never install signed updates.
      - The code-signing certificates had expired.
      - A signature shows who signed an artifact, not that the build that produced it was free of tampering.
    answer: 3
    explanation: MITRE ATT&CK records that the malicious code was injected into the Orion build process and still signed with SolarWinds certificates. The signature was genuine; the build was not trustworthy. That is why provenance and hardened, isolated build platforms matter in addition to signing.
  - question: Which SLSA Build level first requires that a hosted build platform generate and sign the provenance, so that tampering after the build can be detected?
    choices:
      - Build L0
      - Build L1
      - Build L2
      - Build L3
    answer: 2
    explanation: Build L1 only requires that provenance exist, and SLSA notes it is trivial to forge. Build L2 adds a hosted platform that signs the provenance and consumers who validate it. Build L3 adds hardening against tampering during the build.
  - question: In Sigstore's keyless signing, what takes the place of a long-lived private signing key?
    choices:
      - A short-lived certificate that binds an ephemeral key to an OIDC-verified identity, with the signing event recorded in a transparency log.
      - A password stored in the CI system's secret store.
      - A hash of the artifact posted on the project's website.
      - The registry's TLS certificate.
    answer: 0
    explanation: Fulcio issues a short-lived certificate for the signer's identity and an ephemeral public key, the private key is discarded after signing, and Rekor records the signature and certificate in an append-only log. Verifiers then check that the identity in the certificate is the one they expect.
  - question: A deploy step accepts any image that carries valid, signed provenance, whoever signed it. Which attack does this still allow?
    choices:
      - A downgrade of the registry's TLS connection.
      - An attacker builds a malicious image from their own fork, obtains valid provenance for it, and the check accepts it.
      - A denial-of-service attack against the registry.
      - None, because any valid provenance proves the image is safe.
    answer: 1
    explanation: Valid provenance proves how an artifact was built, not that it was built from your repository by your workflow. A verification policy must pin the expected signer identity, source repository, and ref, and compare digests.
---

## Why it matters

The SolarWinds compromise shows why the build itself needs protection. MITRE ATT&CK describes it as "a sophisticated supply chain cyber operation conducted by APT29 that was discovered in mid-December 2020." The attackers "used customized malware to inject malicious code into the SolarWinds Orion software build process that was later distributed through a normal software update." ATT&CK also records that APT29 "was able to get SUNBURST signed by SolarWinds code signing certificates." Two lessons follow. Reviewing the source code cannot catch code that is inserted during the build. And a valid signature proves only who signed an artifact, not how it was made.

Modern CI/CD pipelines are attractive targets because of what they hold and what they run. A pipeline holds the credentials to publish packages, push container images, and deploy to production, and it runs code from many parties: contributors, third-party actions and plugins, and dependencies. The OWASP Top 10 CI/CD Security Risks project lists ten risk categories, from Insufficient Flow Control Mechanisms (CICD-SEC-1) to Insufficient Logging and Visibility (CICD-SEC-10). This lesson concentrates on four: Poisoned Pipeline Execution (CICD-SEC-4), Insufficient Credential Hygiene (CICD-SEC-6), Ungoverned Usage of 3rd Party Services (CICD-SEC-8), and Improper Artifact Integrity Validation (CICD-SEC-9).

## The core idea

A [[ci-cd-pipeline]] turns source code into artifacts, such as packages, binaries, or container images, and often deploys them. Anyone who runs an artifact should be able to answer four questions: which source was it built from, which build platform built it, how, and has it changed since? Two mechanisms make the answers checkable:

- [[artifact-signing|Artifact signing]] binds an artifact's digest to an identity using a [[digital-signature]].
- [[build-provenance|Build provenance]] is signed metadata that describes how the artifact was produced: the builder, the source repository and revision, the parameters, and the dependencies.

Both rest on assumptions. The build platform must isolate builds and keep signing material away from the code being built. The signer must be the identity that consumers expect. And consumers must actually verify before they install or deploy. [[slsa|SLSA]] ("Supply-chain Levels for Software Artifacts," pronounced "salsa"), a project of the Open Source Security Foundation, turns these assumptions into levels that producers can meet and consumers can check.

Each stage of a pipeline has its own failure mode:

| Stage               | What goes wrong                                       | Control                                                  |
| ------------------- | ----------------------------------------------------- | -------------------------------------------------------- |
| Source              | An unreviewed change reaches the release branch       | Branch protection and required review                    |
| Pipeline definition | Untrusted code runs with secrets                      | No secrets for untrusted triggers; least-privilege tokens |
| Build               | Code is inserted during the build, as with SUNBURST   | Hosted, isolated builds; signing keys out of reach        |
| Publish             | The artifact is swapped after the build               | Signed provenance; refer to artifacts by digest           |
| Deploy              | An unexpected artifact is deployed                    | Verify signer, source, and digest before running          |
| Dependencies        | Malicious or confused packages are installed          | See [CLD-06](lesson:CLD-06)                               |

## How it works

### The pipeline is a privileged identity

A pipeline job runs on a machine called a runner and holds credentials: a repository token, registry credentials, and often rights to deploy to the cloud. GitHub's secure-use guidance for Actions says the automatic `GITHUB_TOKEN` should have "the minimum required permissions," with read access to repository contents as the default and higher permissions granted only to the jobs that need them. For cloud access, it recommends [[openid-connect|OpenID Connect (OIDC)]], which lets workflows "stop storing these credentials as long-lived secrets" and instead obtain "short-lived, well-scoped access tokens for your workflow runs." The cloud provider trusts a signed token that names the repository and workflow, so no long-lived secret sits in the pipeline waiting to be stolen.

### Untrusted input reaches the pipeline

OWASP describes poisoned pipeline execution (PPE) as the ability of an attacker who has access to source control, but not to the build environment, to manipulate the build so that it runs malicious commands. In direct PPE, the attacker edits the CI configuration itself. In indirect PPE, they edit files that the pipeline runs, such as a Makefile, scripts, or tests. In public PPE, an anonymous contributor's pull request triggers CI in a public repository.

GitHub's triggers show how much the details matter. For pull requests from forks, the `pull_request` trigger passes no secrets to the runner, and the `GITHUB_TOKEN` is read-only. The `pull_request_target` trigger instead runs "in the context of the default branch of the base repository." GitHub warns that workflows using it "may have repository write access and access to referenced secrets" and "must not explicitly check out untrusted code, including from pull request forks."

Two more entry points deserve attention. With **script injection**, text that an attacker controls, such as a pull request title, becomes shell code when a workflow pastes `${{ github.event.pull_request.title }}` directly into a `run:` script. GitHub recommends passing such values to an action as arguments or, in inline scripts, through an intermediate environment variable. With **third-party actions and plugins**, the workflow runs someone else's code with its own privileges, and GitHub notes that "a tag can be moved or deleted if a bad actor gains access to the repository storing the action." GitHub's guidance calls a workflow dependency lockfile, which records the exact commit of every action including transitive ones, the strongest protection, and pinning each action to a full-length commit SHA the fallback.

### Provenance and SLSA Build levels

SLSA version 1.2 defines a Build track and a Source track. The Build track has four levels:

| Level    | Requirements                                                                                   | Protects against                                                               |
| -------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Build L0 | None                                                                                           | Nothing; meant for development and test builds                                 |
| Build L1 | A consistent build process; the platform generates provenance automatically                    | Mistakes, such as building from a commit that is not in the upstream repository |
| Build L2 | A hosted build platform generates and signs the provenance; consumers validate it              | Tampering after the build                                                      |
| Build L3 | A hardened platform: runs cannot influence one another, and signing secrets are out of reach of user-defined build steps | Tampering during the build by insiders, compromised credentials, or other tenants |

SLSA warns that Build L1 provenance is "trivial to bypass or forge," which is why L2 requires a hosted platform to sign the provenance and consumers to validate it.

SLSA's provenance format is a JSON document of type `https://slsa.dev/provenance/v1` with two parts: a build definition (build type, external parameters, internal parameters, and resolved dependencies) and run details (the builder's ID and metadata about the run). External parameters are "under external control, such as those set by a user or tenant of the build platform," so SLSA treats them as untrusted: they "MUST be included in the provenance and MUST be verified downstream." Here is an illustrative excerpt for a fictional image. Real platforms define their own build types and parameter names.

```json
{
  "_type": "https://in-toto.io/Statement/v1",
  "subject": [
    { "name": "registry.example/quiz/quiz-engine", "digest": { "sha256": "<image-digest>" } }
  ],
  "predicateType": "https://slsa.dev/provenance/v1",
  "predicate": {
    "buildDefinition": {
      "buildType": "<URI of the platform's build type>",
      "externalParameters": {
        "repository": "https://github.com/OWNER/quiz-engine",
        "ref": "refs/tags/v1.4.0"
      },
      "resolvedDependencies": [
        {
          "uri": "git+https://github.com/OWNER/quiz-engine@refs/tags/v1.4.0",
          "digest": { "gitCommit": "<full-commit-sha>" }
        }
      ]
    },
    "runDetails": {
      "builder": { "id": "<URI of the trusted build platform>" }
    }
  }
}
```

A verifier checks the signature on this statement, that the builder ID is one it trusts, that the repository and ref are the expected ones, and that the subject digest matches the artifact it is about to run.

### Keyless signing

Long-lived signing keys are a liability: anyone who steals one can sign anything until the key is revoked. Sigstore, "an open source project for improving software supply chain security," avoids them. A client such as Cosign creates a one-time key pair and presents an OIDC identity token to Fulcio, Sigstore's certificate authority, which "issues a short-lived certificate bound to the provided identity and public key." The client signs the artifact. The artifact's digest, the signature, and the certificate are stored in Rekor, "an immutable, append-only ledger," and the private key is discarded after a single signing. A verifier checks that "the identity in the certificate matches an expected identity." With Cosign, that check names both the signer and the identity provider that vouched for it:

```sh
cosign verify registry.example/quiz/quiz-engine@sha256:<image-digest> \
  --certificate-identity=<expected signer identity> \
  --certificate-oidc-issuer=<expected OIDC issuer>
```

## Worked example

Alice maintains `quiz-engine`, a fictional web application. Its repository is on GitHub (`OWNER` stands for the account), its images go to the fictional registry `registry.example`, and the campus cluster deploys them. Her task is to turn the current workflow into a verifiable toy release pipeline.

**Step 1: Review the current workflow.**

```yaml
# .github/workflows/release.yml (insecure)
name: release
on:
  pull_request_target:
  push:
    branches: [main]
permissions: write-all
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - run: echo "Building ${{ github.event.pull_request.title }}"
      - run: make test image
      - uses: VENDOR/registry-push@main
        with:
          password: ${{ secrets.REGISTRY_PASSWORD }}
```

Alice finds six problems:

1. `pull_request_target` plus a checkout of the pull request's head commit runs a stranger's Makefile in a job that holds a write-capable token and later handles the registry password. If the repository is public, anyone can open such a pull request: this is public PPE.
2. The pull request title is pasted into a shell command, so a crafted title becomes a command.
3. `permissions: write-all` lets every step push commits and change releases.
4. `VENDOR/registry-push@main` is a moving reference to third-party code that receives the password.
5. The registry password is a long-lived secret.
6. Nothing records how the image was built, and nothing checks it at deploy time.

**Step 2: Split untrusted testing from privileged release.** Pull requests get a workflow with no secrets and a read-only token:

```yaml
# .github/workflows/ci.yml
name: ci
on: pull_request
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@<full-length-commit-sha> # v4
      - name: Show the title safely
        env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: echo "Testing: $PR_TITLE"
      - run: make test
```

The contributor can edit this workflow file in their own pull request, so it must hold nothing worth stealing: no secrets and a read-only token. Releases run only for version tags, in a protected environment, with each permission granted for a reason:

```yaml
# .github/workflows/release.yml
name: release
on:
  push:
    tags: ['v*']
permissions: {}
jobs:
  release:
    runs-on: ubuntu-latest
    environment: release
    permissions:
      contents: read      # check out the code
      id-token: write     # request an OIDC token for signing
      attestations: write # store the attestation
    steps:
      - uses: actions/checkout@<full-length-commit-sha> # v4
      - name: Build and push the image
        id: push
        run: ./scripts/build-and-push.sh # logs in with a short-lived token, writes "digest" to $GITHUB_OUTPUT
      - name: Generate artifact attestation
        uses: actions/attest@<full-length-commit-sha> # v4
        with:
          subject-name: registry.example/quiz/quiz-engine
          subject-digest: ${{ steps.push.outputs.digest }}
          push-to-registry: true
```

The attestation step needs `id-token: write` and `attestations: write`, as GitHub's documentation lists. The digest flows through a step output that Actions evaluates, not through a shell.

**Step 3: Trace the release.** The design in one picture:

```sequence
title: A verifiable toy release
participant A as Alice
participant R as Repository
participant C as Hosted runner
participant S as Signing service
participant G as registry.example
participant D as Deployer
A -> R: Merge a reviewed change, tag v1.4.0
R -> C: Tag push starts the release job
note C: Builds image, records sha256 digest
C -> S: OIDC token naming repo, workflow, tag
S --> C: Short-lived signing certificate
note S: Certificate binds a key to that identity
C -> G: Push image and signed provenance
D -> G: Fetch provenance for the digest
note D: Check signer, repository, ref, digest
D -x G: Reject images that fail the check
```

**Step 4: Verify before deploying.** The deploy job runs GitHub's verifier, which rejects attestations that were not produced by Alice's repository, and then deploys the image by digest rather than by tag:

```sh
gh attestation verify oci://registry.example/quiz/quiz-engine:v1.4.0 -R OWNER/quiz-engine
```

**Step 5: Name the remaining risks.** The design follows the Build L2 pattern: a hosted platform signs provenance and the consumer validates it. Whether it reaches Build L3 depends on the platform meeting the L3 requirements, which Alice must check rather than assume. And provenance records which commit was built, not whether that commit is good. A stolen maintainer account could still tag a malicious commit, so tag protection and required review remain essential.

## Defenses

- **Separate untrusted work from privileged work.** Run tests on contributions without secrets or write access, and release only from protected branches or tags. The limit: indirect PPE through files that the privileged job runs, such as scripts and Makefiles, still needs review.
- **Grant tokens least privilege.** Default to no permissions and grant each job what it needs. The limit: a release job still needs some powerful rights, so protect it with an environment that requires approval.
- **Replace stored secrets with short-lived credentials.** Use OIDC and configure the cloud side to accept tokens only from the expected repository and branch. The limit: a loose trust condition can let other repositories' workflows obtain the role.
- **Pin third-party code.** Use a workflow lockfile where available, or full commit SHAs, and review updates. The limit: pinning preserves whatever you pinned.
- **Generate signed provenance on a hosted platform.** Aim for Build L3 for important releases. The limit: provenance describes the build, not the quality of the source.
- **Verify at the point of use.** Check the signer identity, source repository, ref, and digest, and enforce the check in deployment, for example with an admission controller ([CLD-05](lesson:CLD-05)). The limit: a policy that accepts any valid signature also accepts an attacker's.
- **Watch the logs.** A public transparency log such as Sigstore's Rekor is append-only, so maintainers can look for signatures under their project's identity that they did not make. Log pipeline activity too (CICD-SEC-10).

## Common misconceptions

- **"A signed artifact is a safe artifact."** SUNBURST was signed with SolarWinds' own certificates. A signature tells you who; provenance and a trustworthy build tell you how.
- **"Pinning to a version tag is pinning."** Tags can be moved. Only a commit SHA, a digest, or a lockfile that records them is fixed.
- **"Masked secrets are safe in CI."** Masking hides a secret's exact value in logs. Code running in the job can still read the secret and send it elsewhere.
- **"Private repositories don't need pipeline hardening."** PPE needs only access to source control, which insiders and stolen developer accounts have.
- **"Provenance proves the code is good."** It proves where and how an artifact was built. Code review and dependency checks still decide whether the code deserves to be built.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Design a verifiable toy release pipeline on paper, for a project you own or for the fictional `quiz-engine`:

1. Draw the stages from commit to deployment. Mark each trust boundary and list the credentials available at each stage.
2. If you have CI workflows in a repository you own, list each workflow's triggers, token permissions, secrets, and third-party actions, and note how each action is referenced: tag, branch, or commit SHA.
3. Write your deploy-time policy in one sentence: which signer identity, repository, and ref you accept, and what happens when the check fails.
4. Which SLSA Build level does your design reach, and what single change would raise it?

Optionally, in a test repository you own on GitHub, follow GitHub's artifact attestation guide to attest one build, then verify it with `gh attestation verify`.

## Key takeaways

- A pipeline is a privileged identity that runs other people's code; treat its triggers, tokens, and third-party steps as attack surface.
- Never run untrusted pull request code with secrets or a write-capable token; pass untrusted text through environment variables, not into scripts.
- Signing proves who; provenance records how, from which source, and on which builder. SolarWinds shows why both are needed.
- SLSA Build levels progress from provenance existing (L1), to platform-signed provenance (L2), to hardened, isolated builds (L3).
- Verification is the step that makes the rest count: pin the expected identity, repository, ref, and digest.

## Go deeper

- Read the SLSA v1.2 build requirements and decide which level your CI platform can support, and why.
- Read the OWASP pages for CICD-SEC-6 and CICD-SEC-9, and map each recommendation to a control in your own pipeline.
- Open question: reproducible builds let independent builders produce bit-for-bit identical artifacts. What would that add to signed provenance, and what would it cost?
