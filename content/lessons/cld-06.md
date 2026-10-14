---
topicId: CLD-06
title: Software dependencies and SBOMs
summary: Most of an application's code comes from dependencies, many of them pulled in indirectly. Learn how a software bill of materials (SBOM) records what is inside a build, how to trace a vulnerable component through the dependency graph, and how to decide whether and how to update it.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish direct from transitive dependencies and explain what a lockfile records.
  - List the NTIA minimum data fields of an SBOM and identify them in a CycloneDX document.
  - Trace a vulnerable component through an SBOM's dependency graph to the direct dependency that brings it in.
  - Make and justify an update decision (upgrade, override, mitigate, or document as not affected) for a vulnerable dependency.
  - Explain how dependency confusion and malicious releases differ from ordinary vulnerabilities, and choose defenses for each.
prerequisites: [CLD-04, FND-04]
concepts: [software-supply-chain, sbom, transitive-dependency, lockfile, vex, software-composition-analysis, dependency-confusion]
labs: [supply-chain-provenance]
keywords:
  - SBOM
  - software bill of materials
  - CycloneDX
  - SPDX
  - ECMA-424
  - NTIA minimum elements
  - purl
  - package URL
  - VEX
  - SCA
  - software composition analysis
  - transitive dependency
  - lockfile
  - dependency pinning
  - dependency confusion
  - xz utils
  - CVE-2024-3094
  - CWE-506
  - open-source risk
sources:
  - title: The Minimum Elements For a Software Bill of Materials (SBOM)
    url: https://www.ntia.gov/report/2021/minimum-elements-software-bill-materials-sbom
    publisher: National Telecommunications and Information Administration (NTIA), US Department of Commerce
  - title: CycloneDX Specification Overview
    url: https://cyclonedx.org/specification/overview/
    publisher: OWASP Foundation
    license: All rights reserved
  - title: SPDX
    url: https://spdx.dev/
    publisher: The Linux Foundation
    license: All rights reserved
  - title: 'OWASP Top 10:2025, A03 Software Supply Chain Failures'
    url: https://top10.owasp.org/2025/A03_2025-Software_Supply_Chain_Failures/
    publisher: OWASP Foundation
    sourceId: owasp-top-10
  - title: CVE-2024-3094 Detail
    url: https://nvd.nist.gov/vuln/detail/CVE-2024-3094
    publisher: NIST National Vulnerability Database
  - title: npm-sbom command documentation (npm CLI source)
    url: https://raw.githubusercontent.com/npm/cli/latest/docs/lib/content/commands/npm-sbom.md
    publisher: npm (GitHub)
quiz:
  - question: An application declares 12 packages in its manifest, and its SBOM lists 240 components. What best explains the difference?
    choices:
      - The SBOM tool double-counted each package.
      - The other components are transitive dependencies, which the declared packages pull in, directly or through further dependencies.
      - The SBOM lists every file in the repository as a component.
      - The extra components are development tools that never reach production.
    answer: 1
    explanation: Each direct dependency brings its own dependencies, recursively. The NTIA minimum elements expect an SBOM to cover top-level components and their transitive dependencies, which is why SBOMs are much longer than manifests.
  - question: A scanner reports a critical vulnerability in a parsing library deep in your dependency graph. Your code never parses untrusted input with it, and the vulnerable function is never called. What is the best next step?
    choices:
      - Ignore the report permanently, because scanners are often wrong.
      - Delete the library from the lockfile by hand.
      - Record the analysis, for example as a VEX statement that the product is not affected and why, and still plan a routine upgrade.
      - Ship an emergency release the same day, regardless of reachability.
    answer: 2
    explanation: Reachability matters, but the reasoning must be written down so others can check it, and the safe default is still to upgrade in a normal cycle. A VEX statement is a structured way to say "not affected" and give the justification.
  - question: What makes dependency confusion possible?
    choices:
      - A build is configured to search both a private and a public registry for the same package name and accepts whichever offers a higher version.
      - The public registry deletes private packages.
      - A developer types the package name with a spelling mistake.
      - The lockfile records cryptographic hashes.
    answer: 0
    explanation: If an internal package name can also be resolved from a public registry, an attacker who publishes that name with a high version number can get their code installed. A typo is a different attack, typosquatting.
  - question: A team pins every dependency to an exact version with integrity hashes. Which risk does this NOT address?
    choices:
      - A new release silently replacing the version they reviewed.
      - A registry serving tampered bytes for the pinned version.
      - A build pulling a different version on different days.
      - A version that was already malicious when the team pinned it, as with the backdoored xz releases.
    answer: 3
    explanation: Pinning and hashes guarantee that you get exactly what you chose, every time. They cannot tell you whether what you chose was safe; that needs review, provenance checks, and monitoring of advisories.
  - question: A container image's SBOM is generated only from the application's package manifest. Why might it miss a compromised system library such as liblzma?
    choices:
      - Because system libraries are never included in container images.
      - Because operating-system packages in the image's base layers are not listed in the application's manifest, so the SBOM must be generated from the built image as well.
      - Because SBOM formats cannot represent system libraries.
      - Because liblzma has no version number.
    answer: 1
    explanation: An SBOM is only as complete as what its generator inspects. Generating it from the final artifact, such as the container image, captures operating-system packages that the application manifest never mentions.
---

## Why it matters

In many modern applications, most of the code was not written by the team that ships it. A web service declares a handful of packages, and each of those brings its own dependencies, which bring theirs. When a vulnerability is announced in a popular library, every organization asks the same questions: do we use it, where, and which version? Without an inventory, answering means searching repositories and servers, often by hand. The [[software-supply-chain]], everything and everyone involved in producing the software you run, is now treated as a top risk: the OWASP Top 10:2025 lists Software Supply Chain Failures third, and the category was top-ranked in OWASP's community survey, with exactly half of respondents placing it first.

Sometimes the problem is not a mistake but sabotage. Malicious code was found in the xz compression utilities, tracked as CVE-2024-3094. The National Vulnerability Database records that "Malicious code was discovered in the upstream tarballs of xz, starting with version 5.6.0," and that the build process produced "a modified liblzma library that can be used by any software linked against this library." NVD classifies it as CWE-506, Embedded Malicious Code. A team with an inventory of every build could ask "which of our systems ship an affected xz or liblzma version?" and get an answer from a query; a team without one had to go looking.

A [[sbom|software bill of materials (SBOM)]] is that inventory. It does not make software safe, but it turns "are we affected?" from a research project into a query.

## The core idea

Start with the dependency graph. Your project declares direct dependencies in a manifest such as `package.json` or `requirements.txt`. Each of those has dependencies of its own, which are [[transitive-dependency|transitive dependencies]] of your project. The package manager resolves the whole graph to concrete versions and can record the result in a [[lockfile]], which lists the exact version, and often a cryptographic hash, of every package installed.

An SBOM is a machine-readable list of the components in a piece of software and the relationships among them. A food ingredients label is a fair analogy: it does not tell you whether the food is healthy, but without it you cannot check for the one ingredient you are allergic to. The SBOM works together with two other kinds of document: vulnerability advisories, and [[vex|Vulnerability Exploitability eXchange (VEX)]] statements, in which a supplier says whether a known vulnerability can actually be exploited in its product. Each answers a different question:

| Document                  | Answers                                          | Example                                                         |
| ------------------------- | ------------------------------------------------ | --------------------------------------------------------------- |
| SBOM                      | What is inside this release?                     | `xml-tiny-example` version 1.4.2 is included                    |
| Vulnerability advisory    | What is wrong with a component?                  | Versions before 1.4.5 expand external entities in untrusted XML |
| VEX statement             | Does that problem affect this product?           | Not affected: the vulnerable function is never called           |

The approach rests on assumptions. The SBOM must be complete and generated from the real build rather than written by hand. Component names in it must match the identifiers that vulnerability databases use. And it must describe the artifact you actually deploy, not an earlier build.

## How it works

### What an SBOM must contain

In 2021, the US National Telecommunications and Information Administration (NTIA) published "The Minimum Elements For a Software Bill of Materials (SBOM)," which groups requirements into data fields, automation support, and practices. The data fields are:

| Field                     | Meaning                                                    |
| ------------------------- | ---------------------------------------------------------- |
| Supplier Name             | Who created and names the component                        |
| Component Name            | The name its supplier gives it                             |
| Version of the Component  | The supplier's identifier for this version                 |
| Other Unique Identifiers  | Extra IDs that help match it to databases                  |
| Dependency Relationship   | Which component includes which                             |
| Author of SBOM Data       | Who produced this SBOM entry                               |
| Timestamp                 | When the SBOM data was assembled                           |

For automation, NTIA names three machine-readable formats: SPDX, CycloneDX, and SWID tags. Its practices say that a new SBOM must be created when software gets a new build or release, that an SBOM should cover top-level components and their transitive dependencies, and that the author must explicitly identify "known unknowns," places where the dependency data is incomplete.

### Formats and identifiers

CycloneDX, developed by the OWASP Foundation and Ecma International and published as the Ecma standard ECMA-424, describes components, services, dependencies, and vulnerabilities in JSON, XML, or Protocol Buffers. Its dependency graph can represent both direct and transitive relationships. SPDX, a Linux Foundation project, is an open SBOM standard whose specification is also the international standard ISO/IEC 5962:2021. Either format works if tools can match its identifiers against vulnerability data. For open-source packages, both can carry a package URL (purl), which names the ecosystem, the package, and the version in one string, such as `pkg:npm/report-kit-example@3.2.0`.

### From inventory to decisions

[[software-composition-analysis|Software composition analysis (SCA)]] tools compare SBOM components with vulnerability databases and report matches. Each match then needs triage. Is the vulnerable code present in the build? Is it reachable with attacker-controlled input? Is a fixed version available, and does it break anything? Scanners report findings that do not matter in context, such as a vulnerable function that is never called, and they miss components, such as code copied into a project without package metadata.

### Ways dependencies go wrong

- **Known vulnerabilities**, found and published after you adopted a component.
- **Malicious releases**, where a real project ships sabotaged code, as with xz.
- **Look-alike packages** published under names close to popular ones ([[typosquatting]]).
- **[[dependency-confusion|Dependency confusion]]**, where a build resolves an internal package name from a public registry.
- **Floating versions**, where a range such as "any 3.x" lets an unreviewed release flow into the next build.

Dependency confusion deserves a closer look, because it needs no bug in anyone's code. The diagram shows a build server configured to consult both a private and a public registry. An attacker publishes a package with the same name as an internal one and a higher version number, and a client that prefers the highest version installs it.

```sequence
title: Dependency confusion with two package sources
participant M as Mallory
participant N as Public registry
participant B as Build server
participant P as registry.example (private)
M -> N: Publish campus-utils-example 99.0.0
B -> P: Versions of campus-utils-example?
P --> B: 1.4.0, the real internal package
B -> N: Versions of campus-utils-example?
N --> B: 99.0.0, Mallory's copy
note B: Misconfigured client installs the highest
B -x N: Fixed: internal scope resolves only from P
```

## Worked example

Bob maintains the fictional `gradebook-web` application. A fictional advisory, EXAMPLE-2026-0042, reports that `xml-tiny-example` versions before 1.4.5 expand external entities when parsing untrusted XML, a weakness known as [[xxe|XML external entity (XXE)]] processing. (All package names and the advisory are fictional.) Bob's task is to decide whether `gradebook-web` is affected and what to do.

**Step 1: Query the SBOM.** The build pipeline attaches a CycloneDX SBOM to every release. Here is an excerpt from the current release:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.7",
  "metadata": {
    "timestamp": "2026-10-01T14:03:00Z",
    "component": { "bom-ref": "app", "type": "application", "name": "gradebook-web", "version": "2.8.0" }
  },
  "components": [
    {
      "bom-ref": "rk",
      "type": "library",
      "name": "report-kit-example",
      "version": "3.2.0",
      "purl": "pkg:npm/report-kit-example@3.2.0"
    },
    {
      "bom-ref": "xt",
      "type": "library",
      "name": "xml-tiny-example",
      "version": "1.4.2",
      "purl": "pkg:npm/xml-tiny-example@1.4.2"
    }
  ],
  "dependencies": [
    { "ref": "app", "dependsOn": ["rk"] },
    { "ref": "rk", "dependsOn": ["xt"] }
  ]
}
```

Version 1.4.2 is in the vulnerable range.

**Step 2: Trace the path.** The `dependencies` section shows `gradebook-web` → `report-kit-example` 3.2.0 → `xml-tiny-example` 1.4.2. Bob never chose `xml-tiny-example`; it is transitive. That tells him where a fix must come from: either `report-kit-example` updates its own dependency, or Bob overrides it.

**Step 3: Assess reachability and exposure.** Reading the code, Bob finds that `report-kit-example` uses the XML parser to import grading rubrics, and instructors upload those rubric files. The input is untrusted, and the vulnerable code path runs. The product is affected.

**Step 4: Compare options.**

| Option                                          | Pros                              | Cons                                         |
| ----------------------------------------------- | --------------------------------- | -------------------------------------------- |
| Upgrade `report-kit-example` to 3.2.4, which uses 1.4.5 | Supported fix from upstream | Must test the newer report-kit release      |
| Override `xml-tiny-example` to 1.4.5 directly   | Fast if upstream has no release   | Untested combination; must be removed later  |
| Disable rubric uploads until fixed              | Removes exposure immediately      | Instructors lose a feature                   |
| Mark as not affected                            | No change needed                  | False here, because the path is reachable    |

**Step 5: Decide and record.** The upstream fix exists, so Bob upgrades `report-kit-example` and lets the package manager update the lockfile. Had there been no upstream release, he would have used npm's `overrides` field in `package.json` as a temporary measure:

```json
{
  "overrides": {
    "xml-tiny-example": "1.4.5"
  }
}
```

The tests pass, the pipeline regenerates the SBOM, and Bob confirms that the new SBOM lists `xml-tiny-example` 1.4.5. Because other campus teams run `gradebook-web`, he also publishes a VEX statement saying that release 2.8.0 is affected and that release 2.8.1 fixes the problem.

## Defenses

- **Generate SBOMs automatically for every build.** Produce them in the pipeline from the built artifact, including container images, and store them with the release. The limit: an SBOM is only as complete as what its generator can see, and tools disagree on edge cases.
- **Monitor continuously and triage by reachability.** Run SCA against new advisories, not only at build time. The limit: reachability analysis takes judgment, and a wrong "not affected" call is costly, so write down the reasoning.
- **Pin with lockfiles and hashes, and update deliberately.** Install exactly what the lockfile says in CI, and take updates through reviewed changes. The limit: pinning preserves whatever you pinned, including a malicious release.
- **Close the dependency-confusion gap.** Give internal packages a namespace or scope that resolves only from the private registry, route all installs through one registry proxy that never looks up internal names publicly, and consider registering your internal names publicly as placeholders.
- **Vet before adopting.** Check a new dependency's maintenance activity, maintainers, and install-time scripts, and prefer fewer, well-maintained dependencies.
- **Check provenance.** Signatures and build provenance (see [CLD-07](lesson:CLD-07)) help show who built a package and from which source, which matters because the xz malicious code was found in release tarballs. The limit: provenance cannot show that the source itself is benign.

## Common misconceptions

- **"An SBOM makes our software secure."** It is an inventory. Its value comes from what you do with it: matching advisories, tracing paths, and acting.
- **"Only our direct dependencies matter."** Transitive dependencies run with the same privileges as your own code.
- **"Every scanner finding means we are vulnerable."** Some findings are unreachable. Analyze, document, and still update on a normal schedule.
- **"Our source-code SBOM covers the container."** Operating-system packages in the base image, such as liblzma, are not in the application's manifest, so an SBOM built only from that manifest misses them. Generate one from the image as well.
- **"Pinning stops supply-chain attacks."** Pinning stops silent changes. It does not judge whether the version you pinned is trustworthy.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

On the **Dependencies** tab of [the lab](lab:supply-chain-provenance), a fixed install of four packages is checked against a lockfile; nothing is downloaded or run. For each package, the table shows the registry it came from and its lockfile hash next to the hash of the tarball actually resolved.

1. **Read the install.** With both **Install controls** unchecked, the summary reads "2 of 2 malicious installed." `@acme/auth@9.9.9` is an internal name resolved from the public registry at an impossibly high version, the dependency-confusion pattern from the diagram, and the lockfile never pinned it. `color-utils@2.1.0` resolved to `sha256:ff0000` instead of the pinned `sha256:c3c3c3`: its tarball was swapped.
2. **One control at a time.** Checked alone, **Verify resolved hashes against the lockfile** blocks only `color-utils`, because `@acme/auth` has no pinned hash to compare, and **Scope internal names to the private registry** blocks only `@acme/auth`. Either way, one malicious package still installs.
3. **Both together.** With both checked, the summary reads "0 of 2 malicious installed," which solves "Clean install" and shows the flag for the "Catch the swapped package" challenge. Then answer "Name the confusion attack" and "Name the inventory."
4. **Find the gap.** `react` and `lodash` pass because their hashes match the lockfile. Which defenses from this lesson could catch a version that was already malicious when you pinned it, as with the backdoored xz releases?

**Without the lab.** Generate an SBOM for a small project that you wrote yourself, using an open-source tool whose documentation you have read. For a Node.js project, the npm documentation describes an `npm sbom` command that "generates a Software Bill of Materials (SBOM) listing the dependencies for the current project" in SPDX or CycloneDX format. Run `npm help sbom` to see the options your installed version supports. Then answer:

1. How many components are direct dependencies, and how many are transitive?
2. Pick one transitive component. Trace its path back to the direct dependency that brings it in.
3. Which NTIA data fields does your SBOM fill in, and which are missing or "known unknowns"?
4. Look the component up in a public vulnerability database. If it has an advisory, write a one-paragraph update decision like Bob's: affected or not, which option you would choose, and why.

## Key takeaways

- Much of an application's code is often third-party, and much of that arrives through transitive dependencies.
- An SBOM lists what is inside a build; NTIA's minimum elements include supplier, component name, version, unique identifiers, dependency relationships, SBOM author, and timestamp.
- Trace a vulnerable component through the dependency graph, check reachability, then upgrade, override, mitigate, or document "not affected" with a VEX statement.
- Generate SBOMs from the built artifact for every release, so that operating-system packages are included.
- Lockfiles and hashes prevent silent changes; namespaces and a single registry proxy prevent dependency confusion; neither replaces vetting and provenance.

## Go deeper

- Read the NTIA minimum elements report in full, including its discussion of depth, known unknowns, and how SBOMs should evolve.
- Compare the CycloneDX object model with SPDX. How does each represent services, licenses, and vulnerability exploitability data?
- Open question: different SBOM generators can produce different inventories for the same artifact. How would you design an experiment to measure an SBOM tool's completeness and accuracy?
