---
topicId: CLD-01
title: Cloud shared-responsibility models
summary: Cloud security is divided between the provider and the customer, and the dividing line moves with the service model. Learn to read that line for IaaS, PaaS, and SaaS, allocate controls to an owner, and find the gaps that nobody owns.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Define IaaS, PaaS, and SaaS using the NIST SP 800-145 service models, and state what the customer controls in each.
  - Allocate a list of security controls between provider and customer for a stated service model, and justify each allocation.
  - Classify a control as inherited, shared, or customer-specific.
  - Identify responsibility gaps in a cloud deployment and assign each gap an owner.
prerequisites: [FND-02, FND-03]
concepts: [shared-responsibility-model, cloud-service-provider, iaas, paas, saas, multi-tenancy]
keywords:
  - shared responsibility
  - CSP
  - cloud service provider
  - IaaS
  - PaaS
  - SaaS
  - FaaS
  - serverless
  - NIST SP 800-145
  - security of the cloud
  - security in the cloud
  - shared fate
  - inherited controls
  - responsibility matrix
  - cloud misconfiguration
sources:
  - title: 'NIST SP 800-145: The NIST Definition of Cloud Computing'
    url: https://csrc.nist.gov/pubs/sp/800/145/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
  - title: Uphold the Cloud Shared Responsibility Model (Cybersecurity Information Sheet, March 2024)
    url: https://media.defense.gov/2024/Mar/07/2003407863/-1/-1/0/CSI-CloudTop10-Shared-Responsibility-Model.PDF
    publisher: National Security Agency (NSA)
  - title: Shared Responsibility Model
    url: https://aws.amazon.com/compliance/shared-responsibility-model/
    publisher: Amazon Web Services
  - title: Shared responsibility in the cloud
    url: https://learn.microsoft.com/en-us/azure/security/fundamentals/shared-responsibility
    publisher: Microsoft
  - title: Shared responsibilities and shared fate on Google Cloud
    url: https://docs.cloud.google.com/architecture/framework/security/shared-responsibility-shared-fate
    publisher: Google Cloud
    license: CC BY 4.0
  - title: Security Guidance for Critical Areas of Focus in Cloud Computing v5
    url: https://cloudsecurityalliance.org/artifacts/security-guidance-v5
    publisher: Cloud Security Alliance
    license: All rights reserved
    sourceId: csa-security-guidance-v5
quiz:
  - question: A team moves its web application from virtual machines it manages (IaaS) to a managed application platform (PaaS). Which responsibility moves from the team to the provider?
    choices:
      - Deciding which employees may read the application's data.
      - Patching the operating system that the application runs on.
      - Fixing an injection flaw in the application's own code.
      - Choosing whether the database is encrypted with a key the team controls.
    answer: 1
    explanation: Under PaaS the provider operates the operating system and runtime, so OS patching moves across the line. Access decisions, the team's own code, and data-protection choices stay with the customer in every service model.
  - question: An auditor asks for evidence that the data center hosting your IaaS workload has badge-controlled entry. How should you classify this control, and where does the evidence come from?
    choices:
      - A customer-specific control, evidenced by your own badge-reader logs.
      - A shared control, evidenced by badge logs that you and the provider both keep.
      - An inherited control, evidenced by the provider's independent audit reports, because you cannot inspect the facility.
      - It is not a control at all once a system moves to the cloud.
    answer: 2
    explanation: Physical and environmental protections are inherited entirely from the provider. The customer never enters the facility, so it relies on the provider's audit reports. The control still exists; only its owner changed.
  - question: What does it mean that patch management is a shared control?
    choices:
      - The provider patches its infrastructure and the customer patches its guest operating systems and applications, and each part has a single owner.
      - The provider and the customer each patch half of the servers.
      - The customer applies patches only when the provider requests them.
      - Whichever party notices a missing patch first is expected to apply it.
    answer: 0
    explanation: A shared control has two separate parts that apply in different contexts. Each part has exactly one owner. Treating "shared" as "someone will do it" is how gaps appear.
  - question: A student club uses a SaaS file-sharing service. A folder of member phone numbers is shared with "anyone with the link," and the link is posted publicly. Who was responsible for preventing this exposure?
    choices:
      - The provider, because a SaaS provider operates the entire stack.
      - Nobody, because the service behaved exactly as designed.
      - The provider, because it should forbid link sharing altogether.
      - The club, because sharing settings and data protection remain the customer's job even in SaaS.
    answer: 3
    explanation: Even in SaaS, the customer configures sharing and protects its data. A provider can make safer defaults more likely to prevent the mistake, but the setting the club chose was the club's responsibility.
  - question: Which of these is a responsibility gap?
    choices:
      - The provider patches the hypervisor and the customer patches the guest operating system.
      - The customer requires multi-factor authentication for every administrator.
      - The team assumes the managed database's automatic snapshots cover recovery, but nobody has set retention or tested a restore.
      - The customer stores the provider's responsibility matrix in its security plan.
    answer: 2
    explanation: The platform takes snapshots, but choosing retention and proving that a restore works are customer tasks. Because each party assumed the other had recovery covered, no one owns it. That is the definition of a gap.
---

## Why it matters

When an organization moves a system into the cloud, it hands part of the work of running that system to a [[cloud-service-provider]]. The provider now operates the buildings, servers, and network that the system runs on. What the organization does not hand over is the need for every layer to be protected. Someone still has to patch each operating system, decide who may read each record, and notice when an account is misused. The [[shared-responsibility-model]] is the arrangement, described in the provider's documentation and contracts, that says which party does each of those jobs.

Many cloud failures happen at the seams of that arrangement rather than inside the provider's data centers. A 2024 information sheet from the US National Security Agency (NSA) warns that "Customers often assume the CSP's responsibility to protect customer data is broader than it actually is," and that "Misconfiguration and lack of security controls are significant risks in cloud environments." Google Cloud's architecture guidance is blunter: "Many cloud security breaches are the direct result of misconfiguration." A storage bucket that a customer set to public, or an administrator account without [[mfa|multi-factor authentication]], is not a provider failure. The provider's systems did exactly what the customer configured them to do.

For a security engineer, the practical skill is reading the dividing line for each service and writing down an owner for every control. A control with no owner is the gap an attacker finds first.

## The core idea

NIST Special Publication 800-145 gives the standard definition. Cloud computing is a model for on-demand network access to a shared pool of configurable computing resources that can be "rapidly provisioned and released with minimal management effort or service provider interaction." The definition names five essential characteristics (on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service), three service models, and four deployment models (private, community, public, and hybrid). Resource pooling means many customers share the same physical machines, a property called [[multi-tenancy]].

Picture a system as a stack of layers, from the data center at the bottom up to the data and the people who use it at the top. The service model draws a line across that stack. Below the line, the provider operates everything, and the customer usually cannot even see it. Above the line, the customer operates whatever it deploys or configures. The three NIST service models put the line at different heights:

- In [[iaas|Infrastructure as a Service (IaaS)]], the customer rents virtual machines, storage, and networks, and controls "operating systems, storage, and deployed applications."
- In [[paas|Platform as a Service (PaaS)]], the customer deploys its own applications onto a platform the provider runs. It controls the applications and possibly some hosting settings, but not the operating systems underneath.
- In [[saas|Software as a Service (SaaS)]], the customer uses the provider's application, typically through a web browser, and controls little beyond limited user-specific settings.

Newer offerings such as function-as-a-service (often called serverless) do not fit neatly into one model, so read each one's documentation to see where it draws the line.

An apartment analogy helps, within limits. In an empty rental (IaaS), the landlord maintains the structure and wiring while you furnish the place and lock your own door. A serviced apartment (PaaS) adds maintained appliances. A hotel room (SaaS) leaves almost nothing to you. In every case, though, you decide who gets a copy of your key and what valuables you leave on the desk. The analogy breaks in one way: cloud doors are software settings that change in seconds, so one mistaken setting can open your room to the entire internet.

The model rests on assumptions worth stating up front. It assumes that the provider's isolation between tenants holds, that the provider's documentation accurately describes what the provider does, and that the customer controls the administrative accounts for its own tenant. If any of these fails, the responsibility matrix you write on paper no longer matches reality.

## How it works

### The line for each service model

The table below combines how NIST, AWS, Microsoft, and Google describe the split. "Shared" means each party owns a separate part of the same control, not that they split one task evenly.

| Layer or control                                 | IaaS     | PaaS     | SaaS     |
| ------------------------------------------------ | -------- | -------- | -------- |
| Physical facilities, hardware, physical network  | Provider | Provider | Provider |
| Virtualization layer (hypervisor)                | Provider | Provider | Provider |
| Guest operating system and its patches           | Customer | Provider | Provider |
| Runtime, middleware, and platform settings       | Customer | Shared   | Provider |
| Application code                                 | Customer | Customer | Provider |
| Network exposure and firewall rules              | Customer | Shared   | Provider |
| Application configuration and sharing settings   | Customer | Customer | Customer |
| Accounts, identities, and access policies        | Customer | Customer | Customer |
| Data classification and protection choices       | Customer | Customer | Customer |
| Endpoints that connect to the service            | Customer | Customer | Customer |

The bottom four rows never change. Microsoft's documentation says that "regardless of the type of deployment," the customer always retains responsibility for data, endpoints, accounts, and access management, and its matrix marks configuration settings as the customer's in every model. The NSA sheet agrees that customers "typically maintain the security of their data, endpoints, and accounts" and manage the access control policies in their tenant, and Google says customers "always remain responsible for their access policies and data." The reason is simple: the provider cannot know which of your employees should read a student's transcript. That is a business decision, and it reaches the cloud only as an [[iam-policy]] or a sharing setting that the customer writes.

### Inherited, shared, and customer-specific controls

AWS sorts [[security-control|security controls]] into three kinds, and the vocabulary works with any provider:

- **Inherited controls** come entirely from the provider, such as physical and environmental protections. The customer cannot inspect the provider's data center, so it relies on the provider's independent audit reports as evidence.
- **Shared controls** have a provider part and a customer part that apply in different contexts. In patch management, the provider patches its infrastructure and the customer patches its guest operating systems and applications. Configuration management and security awareness training split the same way: each party configures its own systems and trains its own staff.
- **Customer-specific controls** belong only to the customer and depend on what it builds, for example routing or segmenting sensitive data inside particular security zones.

### The line moves per service, not per provider

Phrases such as "the AWS model" hide an important detail: the line is drawn for each service. AWS notes that a virtual-machine service such as Amazon EC2 requires the customer to "perform all of the necessary security configuration and management tasks," while for abstracted services such as Amazon S3 the provider runs the operating system and platform, and the customer manages its data, encryption options, and permissions. One real application usually combines several services, so its responsibility map is a list of per-service lines rather than a single label.

### Defaults, guardrails, and shared fate

Even where a setting is formally the customer's job, the provider chooses its default value and builds the tools for checking it. Google describes a "shared fate" approach: it publishes blueprints with its security recommendations enabled by default, opinionated recommendations, and policy tools that let customers set guardrails across all of their projects. Secure defaults shrink the number of gaps a customer can create by accident. They do not move accountability. If a customer turns a guardrail off, the resulting exposure is still the customer's configuration.

## Worked example

The registrar at a fictional college runs course registration at `register.college.example`. Today the system lives on virtual machines (IaaS). The team wants to move it to a managed application platform and a managed PostgreSQL database, both PaaS. Alice, the security engineer, must allocate controls for the new design before the move is approved.

**Step 1: State the service model for each component.** The web tier will run on the provider's app platform. The database will use the provider's managed database service. Uploaded documents will go into [[object-storage]]. Staff sign in through the college's existing identity provider. Alice reads the (fictional) provider's documentation for each service. It says the app platform patches the operating system and language runtime; the database service applies engine patches during a maintenance window the customer picks and keeps daily snapshots for seven days by default; and every management action is recorded in an activity log that customers can export.

**Step 2: List the controls that matter.** Alice starts from the system's [[threat-model]]. Registration data is part of the education records protected under [[ferpa|FERPA]], so confidentiality and integrity dominate. She lists ten controls.

**Step 3: Allocate each control and justify it.**

| Control                                  | Owner under PaaS     | Reasoning                                                            |
| ---------------------------------------- | -------------------- | -------------------------------------------------------------------- |
| Data-center physical security            | Provider (inherited) | Customer cannot reach the facility; evidence is the audit report     |
| Host and hypervisor patching             | Provider (inherited) | Below the PaaS line                                                  |
| Operating-system and runtime patching    | Provider             | Moves to the provider when the system leaves IaaS                    |
| Database engine patching                 | Shared               | Provider patches; registrar picks the window and retests the app     |
| Injection and access flaws in app code   | Customer             | The registrar wrote the code                                         |
| Which staff may read student records     | Customer             | A business decision, expressed as an access policy                   |
| MFA for administrators                   | Customer             | Provider offers MFA; the registrar must require it                   |
| Network exposure of database and storage | Shared               | Platform enforces rules; registrar decides what is reachable         |
| Backups and restore testing              | Shared               | Platform takes snapshots; registrar sets retention and tests restore |
| Review of administrator activity         | Shared               | Provider records activity; registrar exports, keeps, and reviews it  |

**Step 4: Look for gaps.** Two rows worry Alice. First, backups: the old team assumed "the cloud backs things up," but nobody had compared the seven-day default with the college's retention requirement or ever practiced a restore. She assigns both tasks to the database lead and asks for a dated restore test. Second, logging: the provider records management activity, but nobody in the registrar's office exports or reads it. The NSA sheet is explicit that providers "are not responsible for detecting when cloud resources are exploited due to a customer mistake." She assigns log review to the college's security operations team.

**Step 5: Compare with the other models.** Under the old IaaS design, operating-system patching and host firewall rules were the registrar's job, and they were the two controls most often late. Under a SaaS registration product, application code would move to the vendor too, but access policy, MFA, data handling, and endpoints would still belong to the registrar. Moving to PaaS removes work. It does not remove responsibility for who can see a transcript.

Alice files the matrix with the system's security plan, adding a column that links each row to the provider document supporting it, so the next reviewer can check whether the line has moved.

## In practice

**Write the matrix down, per service.** For every service a system uses, record each control, its owner, and the provider document that supports the allocation. The NSA sheet notes that "CSP documentation and terms of service outline how the customers and CSPs share the responsibilities," and recommends reviewing the service-level agreement and asking the provider when anything is unclear. The limit: a matrix is a snapshot, and providers change their services.

**Use the provider's guardrails.** Organization-wide policies, settings that block public access, and secure baselines prevent whole classes of mistakes at once. They cover only the settings they were designed for, and an administrator with enough privilege can usually turn them off.

**Check configuration continuously.** The customer's half of the model is mostly configuration, and it drifts as people make changes. Automated checks against an approved baseline catch drift far sooner than an annual review, though they only find what their rules describe.

**Plan detection and response together.** Decide in advance how the provider will notify you of an incident on its side and how you will detect misuse on yours, since the provider will not detect it for you.

**Know what an attestation covers.** A provider's compliance report is evidence for inherited controls. It says nothing about whether your own access policies are correct.

## Common misconceptions

- **"The provider is responsible for security."** In AWS's phrasing, the provider is responsible for security *of* the cloud, and the customer for security *in* the cloud.
- **"With SaaS, we have nothing left to secure."** Accounts, access policies, sharing settings, data, and endpoints stay with the customer in every model.
- **"Shared means split fifty-fifty."** A shared control has two separate parts, and each part has exactly one owner. Patching the hypervisor and patching the guest operating system are different jobs.
- **"Each provider has one model."** The line is drawn per service. A virtual machine and a managed storage service from the same provider leave very different work to the customer.
- **"The provider's certification makes our system compliant."** It covers the provider's controls. The customer still has to show that its own half is in place.

## Try it yourself

Work on paper or in a spreadsheet. A fictional student club, `chess.college.example`, uses three services:

1. A SaaS file-sharing service for member lists and tournament photos.
2. A PaaS web host for its public website, deployed from a code repository.
3. An IaaS virtual machine that runs a game server, reachable from the internet on one port.

For each service, allocate these eight controls as Provider, Customer, or Shared, and write one sentence of justification for each: physical security, operating-system patching, web application code, network exposure, file-sharing settings, MFA for the club's administrator accounts, backups, and review of sign-in logs.

Then answer three questions:

- Which controls belong to the customer in all three services, and why can't they move?
- Which control changes owner most often across the three services? What does that suggest about planning a migration?
- Find one gap, a control that nobody is doing as described. Assign an owner and say how you would check that it gets done.

Finally, pick one real service of each type and open the provider's own shared-responsibility page. Where your matrix disagrees with the provider's, note which way the provider draws the line and why.

## Key takeaways

- The service model sets the line between provider-operated and customer-operated layers: lowest for IaaS, higher for PaaS, highest for SaaS.
- Data, accounts, access policies, and endpoints stay with the customer in every service model.
- A shared control has two separate parts with one owner each, so write both owners down.
- The line is drawn per service, so build a per-service responsibility matrix and cite the provider documentation for each row.
- Many cloud failures are customer-side misconfigurations, so the customer's half needs continuous checking.

## Go deeper

- Read NIST SP 800-145 in full; it is short, and later cloud guidance builds on its vocabulary. Notice that it defines who controls each layer, not who is accountable for an outcome.
- Compare the AWS, Microsoft, and Google pages side by side. Where does each place network controls for PaaS, and why might they differ?
- Domain 1 of the Cloud Security Alliance's Security Guidance v5 treats cloud concepts and architectures in depth.
- Open question: shared fate says providers should own more of the outcome through secure defaults. How would you measure whether a new default actually reduced customer misconfigurations?
