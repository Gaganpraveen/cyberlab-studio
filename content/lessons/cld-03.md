---
topicId: CLD-03
title: Storage permissions and data exposure
summary: One storage setting can publish every file in a bucket to the internet, and such exposures can go unnoticed for years. Learn how object storage decides who may read an object, how to trace every path to public access, and how layered guardrails keep private data private.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Trace every mechanism that can grant access to an object (identity policies, bucket policies, ACLs, and signed URLs) and decide whether an anonymous request succeeds.
  - Explain how account- and bucket-level public-access blocks override permissive policies and ACLs, and what they leave unchanged.
  - Rewrite a public bucket policy so that it grants only named principals and requires encrypted transport.
  - Plan the containment, investigation, and prevention steps after a storage exposure is reported.
prerequisites: [CLD-01, CLD-02]
concepts: [object-storage, bucket-policy, access-control-list, block-public-access, presigned-url]
labs: [cloud-iam-policy]
keywords:
  - S3
  - Amazon S3
  - Blob Storage
  - Cloud Storage
  - open bucket
  - leaky bucket
  - public bucket
  - data exposure
  - misconfiguration
  - Block Public Access
  - public access prevention
  - anonymous access
  - bucket ACL
  - pre-signed URL
  - signed URL
  - T1530
  - data from cloud storage
  - aws:SecureTransport
sources:
  - title: Blocking public access to your Amazon S3 storage
    url: https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html
    publisher: Amazon Web Services
  - title: Public access prevention (Cloud Storage)
    url: https://docs.cloud.google.com/storage/docs/public-access-prevention
    publisher: Google Cloud
    license: CC BY 4.0
  - title: 'IAM JSON policy elements: Condition operators'
    url: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html
    publisher: Amazon Web Services
  - title: 'MITRE ATT&CK T1530: Data from Cloud Storage'
    url: https://attack.mitre.org/techniques/T1530/
    publisher: The MITRE Corporation
    license: MITRE ATT&CK Terms of Use (royalty-free license)
    sourceId: mitre-attack
  - title: Apology and Notice Concerning Newly Discovered Potential Data Leakage of Customer Information due to Cloud Settings (May 31, 2023)
    url: https://global.toyota/en/newsroom/corporate/39241625.html
    publisher: Toyota Motor Corporation
  - title: Use Secure Cloud Identity and Access Management Practices (Cybersecurity Information Sheet, March 2024)
    url: https://media.defense.gov/2024/Mar/07/2003407866/-1/-1/0/CSI-CloudTop10-Identity-Access-Management.PDF
    publisher: National Security Agency (NSA) and Cybersecurity and Infrastructure Security Agency (CISA)
quiz:
  - question: A bucket policy grants s3:GetObject on every object to the principal "*" (everyone), and the bucket's RestrictPublicBuckets setting is on. What happens to a request with no credentials?
    choices:
      - It succeeds, because the bucket policy explicitly allows everyone.
      - It is denied, because a bucket with a public policy then serves only AWS service principals and authorized users in the owner's account.
      - It succeeds only for objects uploaded after the setting was turned on.
      - It is denied, because turning on the setting deletes the bucket policy.
    answer: 1
    explanation: The setting neutralizes the public policy without changing it. That is also its weakness. If someone turns the setting off, the old policy is public again, so the policy itself must be fixed too.
  - question: Why does encrypting objects at rest with a provider-managed key fail to prevent a public-bucket exposure?
    choices:
      - Encryption at rest applies only to objects uploaded in the future.
      - Provider-managed keys are published so that customers can decrypt their data.
      - The storage service decrypts objects for any request that passes the access check, including an anonymous request that the policy allows.
      - Encrypted objects cannot be made public in the first place.
    answer: 2
    explanation: Encryption at rest protects against lost or stolen storage media, not against requests the service is configured to accept. Access control decides who receives the decrypted bytes.
  - question: An object has a public-read ACL. Its bucket has IgnorePublicAcls turned on and no public bucket policy. Can an anonymous user read the object?
    choices:
      - No, because public ACLs on the bucket and its objects are ignored while the setting is on.
      - Yes, because an object's ACL takes priority over bucket settings.
      - Yes, but only through a pre-signed URL.
      - No, because turning on the setting deletes every ACL.
    answer: 0
    explanation: IgnorePublicAcls makes the service disregard public ACLs without removing them. Turning the setting off would restore the exposure, so the ACL should be removed as well.
  - question: A bucket policy lets the principal "*" read objects, but only when aws:SourceIp is in 198.51.100.0/24. Amazon S3 does not classify this policy as public. What does that mean in practice?
    choices:
      - Nobody can read the objects.
      - Only IAM users in the bucket owner's account can read the objects.
      - Objects are encrypted for requests from that address range.
      - Anyone whose request comes from that range, including anonymous users, can read the objects, so "not public" is weaker than "only our staff."
    answer: 3
    explanation: The provider's label tests whether access is limited to fixed values such as a CIDR block. Anonymous users inside the range still get in. Read the policy to learn who has access; do not rely on the label alone.
  - question: A student reports that a class roster in a college bucket opened without signing in. What should the response team do first?
    choices:
      - Delete the bucket and its logs so that the exposure disappears quickly.
      - Block public access on the bucket to stop the exposure, then preserve the logs and investigate what was downloaded.
      - Wait for the next scheduled configuration review.
      - Rename the file so that the shared link stops working, and take no further action.
    answer: 1
    explanation: Containment comes first, but evidence matters. Deleting logs destroys the only record of whether data was taken. Renaming one file leaves every other object and the cause in place.
---

## Why it matters

[[object-storage|Object storage]] is where organizations keep most of their cloud data: database exports, backups, logs, uploaded documents, and research datasets. It is also reachable over HTTPS from anywhere, so the only thing standing between a sensitive file and the whole internet is its access configuration. When that configuration is wrong, an attacker needs no exploit. They request the file's address, and the service hands it over.

Exposures like this are common enough that MITRE ATT&CK describes them under Data from Cloud Storage (T1530), observing that "There have been numerous incidents where cloud storage has been improperly secured," including storage left open to anonymous users. An NSA and CISA information sheet on cloud identity likewise cites misconfigured access controls that exposed customer data. Such exposures also tend to last. In May 2023, Toyota Motor Corporation reported that a cloud-settings error had left customer data potentially reachable from outside the company. In Japan, in-vehicle device identifiers and map-update data for about 260,000 customers had been reachable from February 2015 to May 2023. For some customers in Asia and Oceania, names, addresses, phone numbers, email addresses, and vehicle identification numbers had been reachable from October 2016 to May 2023. Toyota attributed the incident to "insufficient dissemination and enforcement of data handling rules" and added continuous monitoring of its cloud settings.

Two lessons follow. The mistake was a setting, not a software flaw. And nobody noticed for years, because a public bucket keeps working for its intended users. Nothing breaks, so nothing alerts.

## The core idea

A storage request is checked like any other cloud request (see [CLD-02](lesson:CLD-02)): who is asking, for which action, on which object, under what conditions. What makes storage special is the anonymous caller. A request with no credentials at all is still a request, and if any applicable rule allows "everyone," the service answers it. That is what "public" means: access granted to anonymous callers, or to every authenticated user of the provider, which is nearly the same thing because anyone can open an account.

Access to one object can come from several independent places, so exposure analysis means checking all of them. Grants can come from identity-based policies, a [[bucket-policy]], [[access-control-list|access control lists (ACLs)]], signed URLs, or configuration that serves the bucket as a website. Blocks can come from organization-, account-, or bucket-level public-access settings, explicit denies, and conditions on the request.

Think of a building full of filing cabinets. Each drawer can carry its own "anyone may open" sign (an ACL). Each cabinet can carry a sign covering all of its drawers (a bucket policy). The building manager can post one rule at the entrance: "No drawer in this building opens for the public" (a [[block-public-access]] setting). The entrance rule beats any sign, but only while it stays posted.

The analysis rests on assumptions. You must know which buckets hold sensitive data, the provider must evaluate settings as documented, and you must know every copy of the data, including replicas, backups, and caches. Google notes, for instance, that objects may stay reachable through internet caches for a while after public access is removed.

## How it works

### Paths that grant access

| Mechanism             | Attached to                | Typical exposure mistake                                    |
| --------------------- | -------------------------- | ----------------------------------------------------------- |
| Identity-based policy | A user or role             | Wildcard access to every bucket, then the credential leaks  |
| Bucket policy         | The bucket                 | `"Principal": "*"` on the whole bucket when one folder was meant to be public |
| ACL                   | A bucket or one object     | A legacy public-read grant on a single object               |
| Signed URL            | One object, for a time     | A long expiry, posted where many people can see it          |
| Website hosting       | The bucket                 | Public assets stored next to private files                  |
| Cross-account grant   | A bucket policy            | Trusting another account that you do not control            |

A [[presigned-url|pre-signed (signed) URL]] deserves a note. It embeds a signature made with an authorized principal's credentials, so whoever holds the link acts as that principal for one object until the link expires. It is a bearer token: convenient for sharing, and dangerous when it lives too long.

### What "public" means to the provider

Amazon S3 states that when it evaluates a bucket policy, it "begins by assuming that the policy is public." A policy counts as non-public only if every grant is limited to fixed values, such as specific principals, a CIDR block in `aws:SourceIp`, or a specific source network, account, or resource. A single grant to the wildcard principal `*` without such a fixed condition makes the whole policy public. Notice what the label does not measure: a policy limited to an address range is "non-public" even though anonymous users inside that range can read the data. The label answers one narrow question; it does not tell you whether the access matches your intent.

### Guardrails that block public access

S3 Block Public Access has four independent settings:

| Setting               | Effect when turned on                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------- |
| BlockPublicAcls       | Calls that would set a public ACL on the bucket or an object fail                            |
| IgnorePublicAcls      | Existing public ACLs on the bucket and its objects are ignored                               |
| BlockPublicPolicy     | Calls that would attach a public bucket policy are rejected                                  |
| RestrictPublicBuckets | A bucket with a public policy serves only AWS service principals and authorized users in the owner's account |

Two settings stop new mistakes and two neutralize existing ones. They can be set for an organization, an account, a bucket, or an access point, and S3 "applies the most restrictive combination" of the levels. They do not modify existing policies or ACLs, so turning a block off brings the old exposure back.

Google Cloud Storage offers a similar control: "When you enforce public access prevention, no one can make data in applicable buckets public through IAM policies or ACLs." It can be enforced per bucket or across a project, folder, or organization, and existing public grants stay in place but are overridden while it is enforced. Signed URLs are a different case. A signed URL carries an authorized principal's signature, so it is not an anonymous request; Google states that public access prevention "doesn't apply to the creation and sharing of Signed URLs."

The diagram below shows the same anonymous request before and after the block is turned on, followed by a legitimate download through a signed URL.

```sequence
title: Anonymous reads before and after blocking public access
participant M as Mallory, no credentials
participant S as Storage API
participant A as Alice, registrar staff
M -> S: GET exports/roster.csv
note S: Bucket policy allows Principal "*"
S --> M: 200 OK with the roster
note S: Admin turns on RestrictPublicBuckets
M -x S: GET exports/roster.csv is refused (403)
A -> S: GET with a signed URL valid for 15 minutes
S --> A: 200 OK, request acts as Alice's role
```

### Encryption and logging answer different questions

Encryption at rest protects lost or stolen storage media. The service decrypts objects for any request that passes the access check, so encryption with a provider-managed key does nothing against a public policy. A customer-managed key adds a second, separate permission check on the key itself, which can limit exposure.

Logging decides what you can learn afterward. If reads of individual objects are not recorded, and on some services they are off unless you enable them, you cannot tell whether exposed data was downloaded.

## Worked example

A student emails the registrar: a link to a class roster opened in a private browser window without signing in. Alice, the security engineer, investigates the fictional bucket `registrar-exports-111122223333`.

**Step 1: Inventory every access path.** The account-level public-access block is off (the account predates the team's standards). The bucket-level block is off. ACLs are enabled on the bucket. There is no website hosting and no cross-account grant. The bucket policy is:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WebsiteAssets",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::registrar-exports-111122223333/*"
    }
  ]
}
```

Its `Sid` reveals the intent: someone wanted to publish logos stored under `public/`, but the resource covers the entire bucket.

**Step 2: Decide the effective access of each object.**

| Object                         | Grant paths                         | Anonymous read?          |
| ------------------------------ | ----------------------------------- | ------------------------ |
| `public/logo.png`              | Bucket policy                       | Yes, as intended         |
| `exports/roster-2026-fall.csv` | Bucket policy                       | Yes, not intended        |
| `exports/grades-draft.xlsx`    | Bucket policy and a public-read ACL | Yes, by two separate paths |

**Step 3: Contain.** Alice turns on all four block settings for the bucket. RestrictPublicBuckets cuts off anonymous access through the policy at once, and IgnorePublicAcls neutralizes the object ACL. She confirms from her own browser that the roster link now returns 403.

**Step 4: Fix the cause, not only the symptom.** The logos move to a separate bucket meant for public content. The ACL on the grades file is removed. The bucket policy is rewritten to grant one named role and to refuse any request that does not use TLS:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RegistrarAppReadsExports",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::111122223333:role/registrar-app" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::registrar-exports-111122223333/exports/*"
    },
    {
      "Sid": "DenyInsecureTransport",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::registrar-exports-111122223333",
        "arn:aws:s3:::registrar-exports-111122223333/*"
      ],
      "Condition": { "Bool": { "aws:SecureTransport": "false" } }
    }
  ]
}
```

The `Bool` condition on `aws:SecureTransport` matches requests that did not arrive over TLS, and the explicit deny then overrides any allow.

**Step 5: Investigate impact.** Alice preserves the bucket's access logs and searches them for anonymous reads under `exports/` during the exposure window. Because roster and grade data are protected student records, she hands her findings to the college's [[incident-response]] process, which decides on notification. Had object-level logging been off, the honest finding would be that downloads could not be ruled out.

**Step 6: Prevent recurrence.** The team turns on the public-access block for the whole account, adds a configuration monitor that alerts on any public bucket, and tags buckets with a data classification so that alerts on sensitive buckets get priority.

## Defenses

- **Block public access at the highest level.** Turn it on for the organization or account, and publish public content only from buckets created for that purpose. The limit: an administrator with enough privilege can turn it off, and exceptions tend to accumulate.
- **Keep public and private data apart.** A bucket should hold one class of data. Mixing them, as in the worked example, turns one broad grant into a breach.
- **Grant named principals only.** Write bucket policies with specific roles or accounts, and avoid ACLs where the provider lets you disable them. Policies are easier to review in one place.
- **Share with short-lived signed URLs.** The limit: anyone holding the link can use it until it expires, so keep lifetimes short and never post links publicly.
- **Use customer-managed keys for sensitive data.** The key's own permission check adds a second barrier. The limit: encryption does nothing against an authorized but wrong recipient.
- **Monitor configuration continuously.** Automated checks and policy analyzers that flag public and cross-account access catch drift that annual reviews miss. Toyota added exactly this kind of monitoring after its incident.
- **Log object-level access.** Without it, you cannot scope an exposure or rule out data theft.
- **Classify data.** Toyota's own diagnosis was a failure to spread and enforce data handling rules. Engineers cannot protect data they do not know is sensitive.

## Common misconceptions

- **"Nobody knows our bucket's name, so it is safe."** Names are guessable and leak through applications, links, and code. Obscurity is not access control.
- **"The data is encrypted, so it cannot leak."** The service decrypts for any request it accepts, including anonymous ones that a public policy allows.
- **"Blocking public access will break our signed links."** A signed URL is an authorized request, not an anonymous one. Google documents that its block does not apply to signed URLs, and S3's blocks target public policies and ACLs, not requests signed by an authorized user in the owner's account.
- **"If no one complained, nothing was taken."** Without object-level logs, you cannot know. Exposure alone may also trigger legal obligations.
- **"Private once means private forever."** Settings drift as people make changes. Toyota's exposure lasted for years.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.
> Do not probe other people's buckets, even ones you suspect are public; reading them can be unauthorized access under laws such as the [[cfaa|CFAA]].

In [the lab](lab:cloud-iam-policy), a fictional AWS-style account has a bucket statement, `ReportsBucket`, that allows `s3:GetObject` on `arn:aws:s3:::acme-reports/*` to the principal `*`: the same pattern as `WebsiteAssets` in the worked example.

1. **Read it anonymously.** Click **Read secret object (anonymous)**. The request is allowed, the lab lists `secret-salaries.csv` as stolen, and it reveals the flag for the "Read the public bucket" challenge.
2. **See whom `*` covers.** In **Test any request**, choose `s3:GetObject` on the salaries object for the principal `*`, then for `role/auditor`, which no statement names. `ReportsBucket` allows both: `*` matches every caller, not only anonymous ones.
3. **Fix the grant.** Check **Remove the public principal from the bucket**. It replaces `*` with the named role `role/developers`, as Alice's rewrite in Step 4 does, and solves "Make the bucket private." Run the read again: it now meets an implicit deny. Then answer "Name the principle."
4. **Finish on paper.** The lab fixes the policy itself; it has no ACLs, signed URLs or public-access blocks. Which block setting would have contained this exposure without editing the policy, as in Step 3, and why must the policy still be fixed?

**Without the lab.** This paper exercise covers four fictional buckets. ACLs are enabled on all of them, and the account-level block is off.

```text
Bucket A  club-photos-111122223333
  Block settings: all four on
  Bucket policy:  Allow Principal "*" s3:GetObject on club-photos-111122223333/*

Bucket B  club-minutes-111122223333
  Block settings: all off
  Bucket policy:  Allow Principal "*" s3:GetObject on club-minutes-111122223333/public/*
  Object ACL:     minutes/2026-09.pdf is public-read

Bucket C  club-backups-111122223333
  Block settings: IgnorePublicAcls on, the other three off
  Bucket policy:  none
  Object ACL:     backup.zip is public-read

Bucket D  club-site-111122223333
  Block settings: all off
  Bucket policy:  Allow Principal "*" s3:GetObject on club-site-111122223333/*
                  only when aws:SourceIp is 198.51.100.0/24
```

For each bucket:

1. Decide whether Mallory, with no credentials and an address outside `198.51.100.0/24`, can read each object. Name the mechanism that decides.
2. Decide whether S3 would label the bucket policy public, and whether that label matches who can actually read the data.
3. Write the smallest change that removes unintended access without breaking intended access.

Then, for one bucket in a cloud account you own, list every access path from the table in "How it works" and confirm that each one is intended.

## Key takeaways

- Access to an object can come from identity policies, bucket policies, ACLs, signed URLs, and website settings; check all of them.
- "Public" means anonymous callers, or every account holder, can get in; read the policy rather than trusting a label.
- Public-access blocks override permissive policies and ACLs without deleting them, so fix the underlying grant as well.
- Encryption at rest does not stop a public exposure; access control and object-level logging do the real work.
- Separate public and private data, monitor configuration continuously, and classify what each bucket holds.

## Go deeper

- Compare Amazon S3 Block Public Access with Google Cloud Storage public access prevention. Which one changes existing behavior immediately, and which settings only stop new mistakes?
- Read the procedure examples under ATT&CK T1530 to see how attackers find and pull data from cloud storage, then design one detection for your own logs.
- Open question: exposures like Toyota's went unnoticed for years. How would you measure time to detection for storage misconfigurations across an organization, and what signal would shorten it?
