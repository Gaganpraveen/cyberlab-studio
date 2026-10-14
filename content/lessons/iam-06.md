---
topicId: IAM-06
title: Role-, attribute-, and relationship-based access
summary: Every application needs rules for who may do what to which object. Learn how role-based, attribute-based, and relationship-based access control express those rules, where each one breaks, and how to test a policy against a reviewed decision matrix before it reaches users.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Express one access requirement as an RBAC role assignment, an ABAC rule, and a set of ReBAC relationships.
  - Compare RBAC, ABAC, and ReBAC on object-level rules, context, auditability, and typical failures.
  - Explain how a policy enforcement point and a policy decision point divide an authorization check, and why the decision defaults to deny.
  - Test a draft policy against a reviewed decision matrix and diagnose each mismatch.
prerequisites: [IAM-01, FND-05]
concepts: [rbac, abac, rebac]
labs: [access-control-matrix]
keywords:
  - RBAC
  - ABAC
  - ReBAC
  - access control model
  - access control matrix
  - access control list
  - ACL
  - role explosion
  - role hierarchy
  - permission
  - entitlement
  - policy decision point
  - PDP
  - policy enforcement point
  - PEP
  - deny by default
  - relationship tuple
  - fine-grained authorization
  - Zanzibar
  - broken access control
  - CWE-862
  - CWE-863
  - NIST SP 800-162
sources:
  - title: 'NIST SP 800-162: Guide to Attribute Based Access Control (ABAC) Definition and Considerations'
    url: https://csrc.nist.gov/pubs/sp/800/162/upd2/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (not subject to US copyright)
  - title: OWASP Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'OWASP Top 10:2025, A01 Broken Access Control'
    url: https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
    sourceId: cwe-top-25
  - title: "Zanzibar: Google's Consistent, Global Authorization System (USENIX ATC '19)"
    url: https://www.usenix.org/conference/atc19/presentation/pang
    publisher: USENIX Association
quiz:
  - question: A grading system gives the role ta the permission grade.write. Carol is the TA for one section of one course. What is wrong with this policy?
    choices:
      - It violates separation of duties, because TAs and instructors share a permission.
      - The permission names an action on a kind of object, so unless other code narrows it, Carol can write grades in every course and section.
      - Nothing; holding the ta role is enough to justify any grading request.
      - RBAC permissions must expire, and this one has no end date.
    answer: 1
    explanation: An RBAC permission usually names an action on a type of object. "TAs can write grades" therefore holds for every grade. Fixing that inside RBAC means one role per section, which leads to role explosion; the better fix ties Carol to her section through a relationship or an attribute.
  - question: Which requirement is most naturally expressed in ABAC rather than in RBAC or ReBAC?
    choices:
      - Instructors may publish grades.
      - Alice may view the submissions she wrote.
      - Anyone who can view a folder can view the documents in it.
      - Grades may be changed only before the grading deadline and only from a university-managed device.
    answer: 3
    explanation: The deadline and the device are environment and context attributes evaluated at the moment of the request. A role cannot express time or device state, and a relationship graph records who is connected to what, not conditions such as the clock.
  - question: An administrator removes Bob from a shared folder, and a minute later a colleague adds a confidential document to that folder. Which property must a ReBAC system have so that Bob cannot open the new document?
    choices:
      - Its decisions must respect the order in which the access change and the content change happened.
      - Bob's password must be reset whenever his access changes.
      - The folder must be renamed so that Bob's old links stop working.
      - The document must be stored in a different database from the relationships.
    answer: 0
    explanation: A replica or cache that has not yet seen the removal could still find a path from Bob to the folder and approve him for content added after he was removed. Zanzibar's abstract stresses that its decisions respect the causal ordering of user actions, across changes to both access control lists and object contents.
  - question: A draft policy passes all eight rows of a decision matrix that the course staff reviewed. What can you conclude?
    choices:
      - The policy is correct for every possible request.
      - The enforcement point is called on every endpoint.
      - The policy agrees with the reviewed decisions for those eight requests; requests nobody listed are untested, so the matrix needs deliberate negative rows and must grow with new requirements.
      - The policy no longer needs decision logging.
    answer: 2
    explanation: Tests show agreement with the cases someone wrote down. In the worked example, the staff never asked whether a TA could view another section's submissions, and the first draft quietly allowed it. Passing tests also say nothing about endpoints that never call the policy.
  - question: An auditor asks for a list of everyone who can read one particular record. Under which model is this hardest to answer, and why?
    choices:
      - RBAC, because roles are assigned by managers rather than by the system.
      - ABAC, because the answer depends on attribute values and environment conditions at request time, so it has to be computed by evaluating the rules for every possible subject.
      - ReBAC, because relationships cannot be searched backward from an object.
      - None; all three store the answer directly.
    answer: 1
    explanation: Under RBAC you list the members of the roles that hold the permission. Under ReBAC you search the graph backward from the object. ABAC stores rules rather than answers, and a rule such as "while on shift" has a different answer every hour.
---

## Why it matters

[[authorization|Authorization]] answers one question for every request: may this subject perform this action on this object? (See [Authentication versus authorization](lesson:IAM-01).) Even a small course site has thousands of user, action, and object combinations, and nobody writes the answers one by one. Developers write a _policy_ in some access control model, and the model decides which rules are easy to state and which mistakes are easy to make.

Getting it wrong is common. The OWASP Top 10:2025 keeps Broken Access Control in first place, and MITRE's 2025 CWE Top 25 includes both Missing Authorization (CWE-862) and Incorrect Authorization (CWE-863). The second is the quieter failure: a check exists and runs, but the rule behind it is wrong, such as a "teaching assistant" role that lets any TA change any grade in any course.

The OWASP Authorization Cheat Sheet advises developers to "Prefer Attribute and Relationship Based Access Control over RBAC," while granting that RBAC is often simpler to set up. This lesson explains the three models, why that advice usually holds, and how to test any policy against decisions that people have reviewed.

## The core idea

Picture an _access control matrix_: one row per subject, one column per object, and in each cell the actions that subject may take on that object. The matrix specifies what should happen, but it is far too large and changes too often to store directly, so each model compresses it differently:

- **RBAC groups the rows.** [[rbac|Role-based access control]] gives permissions to roles, such as `instructor`, and gives roles to users. Everyone with the same roles gets the same row.
- **ABAC computes the cells.** [[abac|Attribute-based access control]] evaluates rules over attributes of the subject, the object, the action, and sometimes the environment, such as the time of day, at the moment of the request.
- **ReBAC derives the cells from a graph.** [[rebac|Relationship-based access control]] stores facts such as "alice wrote this submission" and "this submission belongs to section 2," and grants access when a chain of relationships connects the subject to the object.

In building terms, a badge that opens every staff door is a role. A door reader that admits lab staff with current safety training during working hours evaluates attributes. A rule that admits you to the apartment you rent, and the guests you invited, follows relationships.

All three assume that the subject is already authenticated, that the roles, attributes, and relationships the policy reads are accurate, and that every request reaches the check, the principle of [[complete-mediation]].

## How it works

### Role-based access control

RBAC has three parts: users, roles, and permissions, where a permission is an action on a kind of object. A grading system might define:

```yaml
roles:
  student: [submission.create, submission.view_own]
  ta: [submission.view, grade.write]
  instructor: [submission.view, grade.write, grade.publish]
assignments:
  alice: [student]
  carol: [student, ta]
  dave: [instructor]
```

The appeal is auditability. "Who can publish grades?" has a direct answer: the members of `instructor`. Roles mirror job functions, so managers can review them. Many RBAC systems also support role hierarchies, in which a senior role inherits a junior one's permissions, and constraints that enforce [[separation-of-duties]], such as forbidding one person to hold both the role that requests payments and the one that approves them.

The weakness is scope. `grade.write` names a kind of object, not a particular one, so this policy lets Carol, a TA for one section, write every grade in the system unless code somewhere else narrows it. Teams that try to fix this inside RBAC mint roles such as `ta-cs101-sec2`, one per course and section, and end up with _role explosion_: more near-duplicate roles than anyone can review. The OWASP cheat sheet lists RBAC's drawbacks for applications: limited support for object-level decisions, role explosion, a poor fit for multi-tenant and cross-organizational access, and management and auditing that get harder as roles multiply.

### Attribute-based access control

NIST SP 800-162 describes ABAC as a logical access control method in which permission to perform a set of operations is decided by evaluating attributes of the subject, the object, and the requested operations, and in some cases environment conditions, against a policy. A rule for TAs might read:

```yaml
- effect: permit
  action: grade.write
  when:
    - subject.ta_sections contains resource.section
    - subject.id != resource.author
    - environment.now < resource.grading_deadline
```

One rule now covers every section, adds a conflict-of-interest condition (no grading your own work), and adds a deadline that no role could express.

ABAC deployments usually split the work between two components. A _policy enforcement point_ (PEP) sits in the request path and asks a _policy decision point_ (PDP) for a decision. The PDP gathers the attributes, evaluates the rules, and answers permit or deny. Keeping them separate lets one decision engine serve many applications.

The costs move elsewhere. Attributes become security-critical: whoever can edit `ta_sections` in the registrar's database can grant grading rights, so attribute sources need the same protection as the policy. And "who can change this grade?" no longer has a stored answer; it depends on attribute values at request time, so answering it means evaluating the rules for every possible subject.

### Relationship-based access control

ReBAC stores relationships and derives permissions by following them. This lesson writes each relationship as a tuple in the form `object#relation@subject`:

```text
course:cs101#instructor@user:dave
section:cs101-2#course@course:cs101
section:cs101-2#ta@user:carol
submission:hw3-alice#section@section:cs101-2
submission:hw3-alice#author@user:alice
```

A schema then defines permissions in terms of relations, for instance "the graders of a submission are the TAs of its section and the instructors of that section's course." To check whether Carol may grade Alice's submission, the PDP walks from `submission:hw3-alice` to its section, finds `ta@user:carol` there, and permits. Delete that one tuple when Carol's appointment ends, and every grading right that flowed through it disappears at once.

Because the stored facts name individual objects, ReBAC is object-level by design and suits sharing: folders whose viewers see the documents inside, teams nested in organizations, tenants that must never see one another. The best-known large deployment is Google's Zanzibar, presented at USENIX ATC 2019 as "a global system for storing and evaluating access control lists." Its abstract reports that it serves hundreds of Google services, among them Drive, Photos, and YouTube, with trillions of access control lists, millions of authorization requests per second, and 95th-percentile latency under 10 milliseconds.

Graphs bring their own hazard: consistency. Suppose an administrator removes Bob from a folder, and then someone adds a confidential document to it. A replica or cache that has not yet seen the removal could still let Bob read the new document. Zanzibar's abstract stresses that its decisions respect the causal ordering of user actions, across changes to both access control lists and object contents.

### Comparing the models

| Question | RBAC | ABAC | ReBAC |
| --- | --- | --- | --- |
| Object-level rules | Extra code, or one role per object | Yes, through object attributes | Yes, by design |
| Context such as time or device | Not in the basic model | Yes | Usually added through attributes |
| "Who can access this object?" | Easy: list the role members | Hard: depends on values at request time | Possible: search the graph backward |
| Typical failure | Over-broad roles, role explosion | Wrong or stale attributes, tangled rules | Unexpected inherited paths, stale replicas |
| Good fit | Internal tools with stable job functions | Context-heavy or regulated rules | Sharing, documents, multi-tenant apps |

Real systems mix them. A common design uses a role to gate a feature (only staff reach the grading page), relationships to scope objects (only your own sections), and attributes for context (only before the deadline).

### Where the decision happens

Whatever the model, the PEP must sit on every path to the data, on the server, and the PDP must default to deny. When no rule permits a request, the answer is no, the [[implicit-deny]] that puts [[fail-safe-defaults]] into practice. Many policy languages also offer an [[explicit-deny]] that overrides any permit, for rules such as "no one grades their own work." The OWASP cheat sheet's first three recommendations say the same in practical terms: enforce least privilege, deny by default, and validate permissions on every request.

## Worked example

`learn.campus.test` is a course site. Dave teaches CS101, which has two sections. Carol is the TA for section 2 and is also a student in CS201. Alice is a student in section 2 and Bob in section 1. The course staff reviewed and signed off on the decisions below. This matrix, not the code, is the specification.

**Step 1: the reviewed matrix.**

| # | Subject | Action | Object | Expected | Reason |
| --- | --- | --- | --- | --- | --- |
| 1 | alice | view | Alice's CS101 hw3 | Permit | Author |
| 2 | alice | view | Bob's CS101 hw3 | Deny | Not the author, not staff |
| 3 | carol | grade | Alice's CS101 hw3 | Permit | TA of section 2 |
| 4 | carol | grade | Bob's CS101 hw3 | Deny | Section 1 is not hers |
| 5 | carol | grade | Carol's CS201 hw1 | Deny | Her own work; not staff in CS201 |
| 6 | carol | publish | CS101 grades | Deny | Instructor only |
| 7 | dave | publish | CS101 grades | Permit | Instructor of CS101 |
| 8 | dave | grade | Carol's CS201 hw1 | Deny | Not staff in CS201 |

**Step 2: run the first draft.** Draft 1 is the RBAC policy from earlier, with `bob: [student]` added. Rows 1, 2, 3, 6, and 7 match, though rows 1 and 2 pass only because the code behind `submission.view_own` checks authorship, a relationship hidden inside a role's name. Rows 4, 5, and 8 fail: the draft permits all three, because `grade.write` holds for every submission in every course. Row 5 is the most damaging, since Carol could grade her own work in another course. Each failure is an instance of CWE-863, Incorrect Authorization: a check runs, but it encodes the wrong rule.

**Step 3: write a relationship-scoped draft.** Draft 2 derives every object-level decision from relationships and denies by default:

```yaml
# Draft 2: relationship-scoped, deny by default
default: deny
permissions:
  submission.view:
    any_of: [author, section.ta, section.course.instructor]
  grade.write:
    any_of: [section.ta, section.course.instructor]
    deny_if: [author] # explicit deny: never grade your own work
  grade.publish:
    any_of: [instructor] # evaluated on a course object
```

The relationships come from the registrar's enrollment and staffing records:

```text
course:cs101#instructor@user:dave
section:cs101-1#course@course:cs101
section:cs101-2#course@course:cs101
section:cs101-2#ta@user:carol
section:cs201-1#course@course:cs201
submission:hw3-alice#section@section:cs101-2
submission:hw3-alice#author@user:alice
submission:hw3-bob#section@section:cs101-1
submission:hw3-bob#author@user:bob
submission:hw1-carol#section@section:cs201-1
submission:hw1-carol#author@user:carol
```

Rerun the matrix. Row 4 now denies, because no path leads from `submission:hw3-bob` to Carol. Row 5 denies twice over: Carol is not staff in CS201, and the explicit deny on `author` would block her even if she were. Row 8 denies, because Dave has no relationship to CS201. All eight rows match.

**Step 4: grow the matrix and automate it.** Reviewing the drafts side by side exposes a row the staff never wrote: may Carol _view_ Bob's section 1 submission? Draft 1 says yes, through the global `submission.view`; Draft 2 says no. The staff confirm no, and the row joins the matrix. A second new case checks change over time: delete Carol's `ta` tuple, as happens when her appointment ends, and row 3 must flip to deny. The OWASP cheat sheet recommends unit and integration tests for authorization logic, and a table-driven test keeps the matrix enforced on every change:

```python
import pytest
from grading import policy

CASES = [
    ("alice", "submission.view", "submission:hw3-alice", True),
    ("alice", "submission.view", "submission:hw3-bob", False),
    ("carol", "grade.write", "submission:hw3-alice", True),
    ("carol", "grade.write", "submission:hw3-bob", False),
    ("carol", "grade.write", "submission:hw1-carol", False),
    ("carol", "grade.publish", "course:cs101", False),
    ("dave", "grade.publish", "course:cs101", True),
    ("dave", "grade.write", "submission:hw1-carol", False),
    ("carol", "submission.view", "submission:hw3-bob", False),  # added in review
]

@pytest.mark.parametrize("user, action, obj, expected", CASES)
def test_policy_matches_reviewed_matrix(user, action, obj, expected):
    assert policy.check(user, action, obj) is expected
```

## In practice

- **Start from the matrix.** Write requirements as subject, action, object, and expected decision, and have the data owner review them before you choose a model. Pick the simplest model that expresses every row. _Limit:_ a matrix covers only the cases people imagined, so add negative rows on purpose: other users, other tenants, ended appointments.
- **Combine models deliberately.** Give each layer one job, as in the mixed design above. _Limit:_ every extra mechanism is another place for a rule to hide, so document which layer owns which decision.
- **Centralize the decision; enforce it everywhere.** One PDP or policy library, called by a server-side PEP on every path, including APIs, exports, and static files. _Limit:_ a central engine does nothing for an endpoint that forgets to call it, so test for missing calls too.
- **Protect the inputs.** Attributes and relationships are grants. Take them from authoritative systems such as the registrar or HR, restrict who can change them, log every change, and remove them promptly when people change jobs or leave (see [Federation and enterprise identity](lesson:IAM-08)). _Limit:_ a policy is only as current as its slowest data source.
- **Log decisions and review access.** Record each permit and deny with its inputs in a [[security-log]], and periodically review who holds which roles and relationships. _Limit:_ reviews catch drift slowly; they complement tests rather than replace them.

## Common misconceptions

- **"RBAC is obsolete."** Roles remain a clear, auditable way to gate features. The problem is relying on them alone for object-level decisions.
- **"ABAC means getting rid of roles."** A role is simply one subject attribute that an ABAC rule can test.
- **"ReBAC is just an access control list."** An [[access-control-list]] names who may use one object. ReBAC also follows chains, such as folder to document or group to member, so one stored fact can grant access to many objects.
- **"Unguessable IDs are a form of access control."** OWASP warns that hiding or randomizing identifiers is not enough; check access to the specific object on every request.
- **"A passing test suite proves the policy correct."** It proves agreement with the rows you wrote. Requests nobody tested are unknown, not safe.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

[The lab](lab:access-control-matrix) shows an [[access-control-matrix|access control matrix]] of read decisions: four fictional users against three owned documents and an admin-only user directory. First write the expected decision for all 16 cells, as in the worked example. The starting policy permits any signed-in caller: acting as Mallory, read Alice's private review and the admin user directory. Then click **Enable ownership check** and **Enable role check**, and compare with yours. Which check is RBAC, and how would ABAC or ReBAC express the other? Root still reads every document through a built-in admin override: is that role too broad?

**Without the lab.** For a shared-notes app at `notes.example`, where users own notes, share them as editors or viewers, and file them in shared folders, write eight rows of subject, action, object, and expected decision, including three denials and a person removed from a folder. Express the policy as RBAC roles, ABAC rules, and ReBAC tuples; mark what each handles awkwardly. Then write an RBAC policy that passes every row, add one it fails, and name the relationship its role names hid.

## Key takeaways

- An access control model compresses the access matrix: RBAC groups subjects into roles, ABAC computes decisions from attributes, and ReBAC derives them from relationships.
- RBAC is easy to audit, but its permissions name kinds of objects rather than specific ones, which leads to over-broad roles or role explosion.
- ABAC adds context such as deadlines and ownership, and ReBAC makes object-level and shared access natural; both make their inputs as sensitive as the policy itself.
- Enforce on the server for every request, deny by default, and use explicit denies for rules that must never be overridden.
- Treat a reviewed decision matrix as the specification, and turn it into automated tests that grow with every new requirement.

## Go deeper

- Read the Zanzibar paper (USENIX ATC 2019) and explain how a system answering millions of checks per second can ensure that a user removed from a folder never sees content added after the removal. What would a simple cache of past decisions break?
- NIST SP 800-162 also discusses using ABAC to share information within and between organizations while keeping control of it. For two cooperating organizations, list the attributes each would have to trust from the other, and explain what happens when one side's attributes are wrong or stale.
- Open question: given two policies, how would you find a request on which they disagree without enumerating every subject and object? Consider why it is tractable for RBAC and much harder for rich ABAC rules.
