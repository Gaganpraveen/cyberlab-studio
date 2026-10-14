---
topicId: APP-06
title: Object-level and function-level authorization
summary: Learn why an API must decide on every request whether this caller may use this function, on this object, with these fields, and practice repairing a fictional API's access-control matrix with tests derived from it.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish object-level, function-level, and property-level authorization failures in an API.
  - Build an access-control matrix for a small API and derive allow and deny tests from it.
  - Repair handlers with one deny-by-default policy that checks function access before loading data and object access after.
  - Prevent mass assignment by allowlisting the properties a client may change.
  - Explain why hidden interfaces, unguessable identifiers, and authentication alone do not provide authorization.
prerequisites: [IAM-01, IAM-04, FND-05]
concepts: [authorization, bola, bfla, mass-assignment, access-control-matrix, privilege-escalation, complete-mediation]
labs: [access-control-matrix]
keywords:
  - BOLA
  - IDOR
  - BFLA
  - mass assignment
  - API1:2023
  - API3:2023
  - API5:2023
  - A01:2025
  - CWE-639
  - CWE-862
  - CWE-863
  - horizontal privilege escalation
  - vertical privilege escalation
  - deny by default
sources:
  - title: 'API1:2023 Broken Object Level Authorization (OWASP API Security Top 10 2023)'
    url: https://api-security.owasp.org/editions/2023/en/0xa1-broken-object-level-authorization/
    publisher: OWASP API Security Project
    license: CC BY-SA 4.0
    sourceId: owasp-api-security-top-10
  - title: 'API3:2023 Broken Object Property Level Authorization (OWASP API Security Top 10 2023)'
    url: https://api-security.owasp.org/editions/2023/en/0xa3-broken-object-property-level-authorization/
    publisher: OWASP API Security Project
    license: CC BY-SA 4.0
    sourceId: owasp-api-security-top-10
  - title: 'API5:2023 Broken Function Level Authorization (OWASP API Security Top 10 2023)'
    url: https://api-security.owasp.org/editions/2023/en/0xa5-broken-function-level-authorization/
    publisher: OWASP API Security Project
    license: CC BY-SA 4.0
    sourceId: owasp-api-security-top-10
  - title: Authorization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Access control vulnerabilities and privilege escalation (Web Security Academy)
    url: https://portswigger.net/web-security/access-control
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
  - title: 'A01:2025 Broken Access Control (OWASP Top 10:2025)'
    url: https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
quiz:
  - question: Signed in as mallory, a tester changes GET /api/orders/1044 to GET /api/orders/1043 and receives alice's order. Which weakness is this?
    choices:
      - Broken authentication, because the API accepted mallory's token.
      - Broken object level authorization, because the API never checked that order 1043 belongs to the caller.
      - SQL injection in the order number.
      - Cross-site request forgery against alice.
    answer: 1
    explanation: Mallory's token was valid, so authentication worked. What failed is the object-level check, the question of whether this caller may read this particular order. OWASP lists this as API1:2023, Broken Object Level Authorization, and MITRE's CWE-639 lists insecure direct object reference (IDOR) as another name for it.
  - question: A team replaces sequential order numbers with random UUIDs. What does that change?
    choices:
      - It fixes the flaw, because nobody can guess another user's order id.
      - Nothing, because UUIDs are just as easy to guess as small numbers.
      - It removes the need for object-level checks for support staff.
      - It makes ids harder to guess, but ids still leak through links, logs, and shared screens, so the ownership check is still required.
    answer: 3
    explanation: OWASP recommends random, unpredictable ids, but alongside an authorization check on every request that uses a client-supplied id. Its Authorization Cheat Sheet asks that lookup ids not be usable even when guessed. An id is a name, not a permission.
  - question: The admin menu is hidden from customers, but GET /api/admin/users has no role check on the server. Which statement is correct?
    choices:
      - This is broken function level authorization; anyone who learns the path can call it.
      - It is safe, because customers never see the link.
      - It is safe as long as the path is long and hard to guess.
      - It is an object-level flaw, because user records are objects.
    answer: 0
    explanation: Hiding a link changes what the interface shows, not what the server allows. Paths leak, for example through robots.txt files and JavaScript that every user downloads, as PortSwigger points out, and OWASP says developers must never rely on client-side access control checks. The missing check is on the function itself, so this is BFLA (API5:2023).
  - question: PATCH /api/users/me accepts {"display_name":"Mal","role":"admin"}, and mallory becomes an administrator. What is the best fix?
    choices:
      - Check that the role value is a string.
      - Remove the role field from the profile form in the web page.
      - Accept only the properties this endpoint is meant to change, such as display_name and email, and reject anything else.
      - Encrypt the role column in the database.
    answer: 2
    explanation: This is mass assignment, part of API3:2023. The handler copied every client-supplied property into the stored record. OWASP's advice is to allow changes only to the properties the client should update. Changing the form does nothing, because the attacker sends the request directly.
  - question: Why should authorization tests come from the reviewed access-control matrix rather than be generated from the POLICY table in the code?
    choices:
      - Generated tests run too slowly to use in continuous integration.
      - Tests generated from the code's own table only prove that the code agrees with itself; the reviewed matrix records what the policy is supposed to be.
      - The matrix lists more users than the code does.
      - Generated tests cannot check status codes.
    answer: 1
    explanation: If someone grants refunds to customers by mistake, a test generated from the same table expects customers to succeed and passes. Tests written from an independent, reviewed statement of intent catch that error. OWASP also advises against deploying changes that make authorization tests fail.
---

## Why it matters

Most APIs name the things they act on: `GET /api/orders/1043`, `POST /api/orders/1043/refund`, `PATCH /api/users/me`. [[authentication|Authentication]] tells the server who is calling. [[authorization|Authorization]] must then answer a harder question on every request: may this caller do this, to this object, with these fields?

When the answer is skipped or wrong, the result is broken access control, the first category of the OWASP Top 10:2025 (A01:2025). The OWASP API Security Top 10 2023 lists three API variants: broken object level authorization first (API1), broken object property level authorization third (API3), and broken function level authorization fifth (API5). MITRE's weakness catalog shows the same pattern; on the [2025 CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html), Missing Authorization ([[cwe|CWE]]-862) ranks 4th, Incorrect Authorization (CWE-863) 17th, and Authorization Bypass Through User-Controlled Key (CWE-639) 24th.

These flaws are easy to create and hard to see. The application works perfectly for honest users, who only ever ask for their own orders. Nothing breaks until someone changes a number in a request, and normal testing, which signs in as the right user, never tries.

## The core idea

Think of a hotel. The front desk checks your identity once and gives you a key card; that is authentication. The card opens your room and not room 412, even though you know 412's number; that is object-level authorization. Staff cards open the linen room and guest cards do not, whatever door a guest finds; that is function-level authorization. And you may adjust your room's thermostat but not its nightly price; that is property-level authorization.

Every API request needs all three checks, made by the server, every time. This is [[complete-mediation|complete mediation]]: a check made at sign-in, or by the user interface, says nothing about this request. OWASP's A01:2025 guidance adds that access control is only effective in trusted server-side code or serverless APIs, where the attacker cannot change it.

To check behavior you must first write down what it should be. An [[access-control-matrix|access-control matrix]] does that: one row per operation, one column per role, and in each cell the rule, such as "allow," "deny," or "own orders only." It turns a vague policy into something a reviewer can read and a test can check.

## How it works

### Object level: whose object is it?

[[bola|Broken object level authorization (BOLA)]], often called an insecure direct object reference (IDOR), happens when a handler takes an id from the request, loads the object, and returns or changes it without asking how the caller relates to it. PortSwigger calls the result horizontal [[privilege-escalation|privilege escalation]]: access to resources belonging to another user of the same kind.

A tempting fix is to compare the id in the path with the user id in the caller's [[access-token|token]]. OWASP warns that this "isn't a sufficient solution" for BOLA: many objects, such as orders, shops, and documents, are not named by the user's id at all, so the check must look up the object and test the caller's relationship to it. OWASP's A01:2025 guidance says model access controls should enforce record ownership.

### Function level: may this role call it at all?

[[bfla|Broken function level authorization (BFLA)]] is the vertical form: a regular user reaches functionality meant for another role. OWASP's API5 checklist asks whether a regular user can reach administrative endpoints, and whether a user can perform a sensitive action just by changing the HTTP method, for example from `GET` to `DELETE`. A common cause is protecting a function only by not showing it. PortSwigger notes that administrative URLs leak through files such as `robots.txt` and through JavaScript that every user downloads, and warns: "Never rely on obfuscation alone for access control."

```javascript
// Vulnerable: protected only because the admin menu does not show the link.
app.get('/api/admin/users', listUsers);

// Fixed: one application-wide guard, and every route names the permission it needs.
// roleMay looks up the caller's role in a policy table, as in the worked example.
const can = (action) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'not signed in' });
  if (!roleMay(req.user, action)) return res.status(403).json({ error: 'forbidden' });
  next();
};

app.get('/api/admin/users', can('user:list'), listUsers);
```

The second form follows two PortSwigger recommendations: use a single application-wide mechanism, and "make it mandatory for developers to declare the access that is allowed for each resource." It also separates two answers: 401 means the server does not know who you are, 403 means it knows and refuses.

### Property level: which fields?

[[mass-assignment|Mass assignment]] happens when a handler copies every property in the request body into a stored object. A profile update meant for a display name also accepts `role` or `credit_limit`, because the framework or the code binds whatever arrives. OWASP's API3 category covers this together with its mirror image, responses that include properties the caller should not read. Its advice in both directions is to choose properties explicitly: "Allow changes only to the object's properties that should be updated by the client," and return only what the endpoint needs. An [[orm]] that binds request data straight onto models makes this mistake easy.

### Where the check runs

The order of operations matters. Check the function first, before loading anything, so a caller without the right role learns nothing about which objects exist. Then load the object and check the relationship. The diagram shows the object-level check deciding two otherwise identical requests.

```sequence
title: One endpoint, two callers, one object-level check
participant A as alice
participant M as mallory
participant S as api.shop.example
participant D as Order store
A -> S: GET /api/orders/1043 with alice's token
note S: Function check: customers may read orders
S -> D: Load order 1043
D --> S: Order 1043, owner alice
note S: Object check: caller alice owns it, allow
S --> A: 200 OK with order details
M -> S: GET /api/orders/1043 with mallory's token
note S: Function check: customers may read orders
S -> D: Load order 1043
D --> S: Order 1043, owner alice
note S: Object check: caller mallory does not own it, deny
S --> M: 404 Not Found, the same answer as a missing order
```

Answering 404 rather than 403 for someone else's object avoids confirming that order 1043 exists. Either code can be right; what matters is that the decision is deliberate and consistent across the API.

## Worked example

The activity: fix a fictional API access-control matrix. The `shop.example` API has three roles: customers (alice, bob, mallory), support staff (carol), and administrators (dave). The product owner and a security reviewer agree on this matrix:

| Operation                      | customer               | support                | admin                  |
| ------------------------------ | ---------------------- | ---------------------- | ---------------------- |
| `GET /api/orders/{id}`         | Own orders only        | Any order              | Any order              |
| `POST /api/orders/{id}/refund` | Deny                   | Any order              | Any order              |
| `GET /api/admin/users`         | Deny                   | Deny                   | Allow                  |
| `PATCH /api/users/me`          | `display_name`, `email` | `display_name`, `email` | `display_name`, `email` |

The test data is fictional and lives in memory:

```python
ORDERS = {
    1043: {"id": 1043, "owner": "alice", "total": "42.50", "status": "shipped"},
    1044: {"id": 1044, "owner": "bob", "total": "18.00", "status": "processing"},
}
USERS = {
    "alice":   {"display_name": "Alice",   "email": "alice@shop.example",   "role": "customer"},
    "bob":     {"display_name": "Bob",     "email": "bob@shop.example",     "role": "customer"},
    "mallory": {"display_name": "Mallory", "email": "mallory@shop.example", "role": "customer"},
    "carol":   {"display_name": "Carol",   "email": "carol@shop.example",   "role": "support"},
    "dave":    {"display_name": "Dave",    "email": "dave@shop.example",    "role": "admin"},
}
```

Here are the current handlers. Each receives the name of the authenticated user, so authentication already works:

```python
def get_order(user, order_id):
    order = ORDERS.get(order_id)
    if order is None:
        return 404, None
    return 200, order                         # never asks whose order it is

def refund_order(user, order_id):             # the UI shows "Refund" only to staff
    order = ORDERS.get(order_id)
    if order is None:
        return 404, None
    order["status"] = "refunded"
    return 200, order

def list_users(user):                         # linked only from the admin menu
    return 200, USERS

def update_profile(user, changes):
    USERS[user].update(changes)               # copies every field, including "role"
    return 200, USERS[user]
```

Next, turn the matrix into test cases. Each row names a caller, an operation, a target, and the status the matrix requires. Include the denials: they are the cases that honest-user testing never covers.

```python
# Expected statuses, written from the reviewed matrix, not from the code.
CASES = [
    ("alice",   "get_order",    1043, 200),   # own order
    ("mallory", "get_order",    1043, 404),   # someone else's order
    ("carol",   "get_order",    1043, 200),   # support may read any order
    ("alice",   "refund_order", 1043, 403),   # customers may not refund, even their own
    ("mallory", "refund_order", 1043, 403),
    ("carol",   "refund_order", 1044, 200),
    ("mallory", "list_users",   None, 403),
    ("carol",   "list_users",   None, 403),
    ("dave",    "list_users",   None, 200),
]
```

Running each case against fresh test data, plus one profile update in which mallory sends `{"display_name": "Mal", "role": "admin"}`, gives the matrix as implemented:

| Caller and request             | Matrix says | Current code             | Repaired code |
| ------------------------------ | ----------- | ------------------------ | ------------- |
| alice reads order 1043         | 200         | 200                      | 200           |
| mallory reads order 1043       | 404         | **200, alice's order**   | 404           |
| carol reads order 1043         | 200         | 200                      | 200           |
| alice refunds order 1043       | 403         | **200, refunded**        | 403           |
| mallory refunds order 1043     | 403         | **200, refunded**        | 403           |
| carol refunds order 1044       | 200         | 200                      | 200           |
| mallory lists users            | 403         | **200, every account**   | 403           |
| carol lists users              | 403         | **200, every account**   | 403           |
| dave lists users               | 200         | 200                      | 200           |
| mallory sets her own role      | 400         | **200, now an admin**    | 400           |

Six of ten cells are wrong, and every passing case is one an honest user would try. The repair puts the matrix into the code as data, with one function per kind of check. A role or action missing from the table is denied.

```python
# The reviewed matrix as data: action -> role -> scope. Anything missing is denied.
POLICY = {
    "order:read":   {"customer": "own", "support": "any", "admin": "any"},
    "order:refund": {"support": "any", "admin": "any"},
    "user:list":    {"admin": "any"},
}
EDITABLE_PROFILE_FIELDS = {"display_name", "email"}

def role_may(user, action):
    """Function level: does the caller's role have any grant for this action?"""
    return USERS[user]["role"] in POLICY.get(action, {})

def covers(user, action, owner):
    """Object level: does that grant cover this particular object?"""
    scope = POLICY.get(action, {}).get(USERS[user]["role"])
    return scope == "any" or (scope == "own" and owner == user)

def get_order(user, order_id):
    if not role_may(user, "order:read"):
        return 403, None
    order = ORDERS.get(order_id)
    if order is None or not covers(user, "order:read", order["owner"]):
        return 404, None                      # same answer for "missing" and "not yours"
    return 200, order

def refund_order(user, order_id):
    if not role_may(user, "order:refund"):    # checked before the order is loaded
        return 403, None
    order = ORDERS.get(order_id)
    if order is None or not covers(user, "order:refund", order["owner"]):
        return 404, None
    order["status"] = "refunded"
    return 200, order

def list_users(user):
    if not role_may(user, "user:list"):
        return 403, None
    return 200, USERS

def update_profile(user, changes):
    rejected = sorted(set(changes) - EDITABLE_PROFILE_FIELDS)
    if rejected:
        return 400, {"error": f"fields not editable here: {rejected}"}
    USERS[user].update(changes)
    return 200, {field: USERS[user][field] for field in sorted(EDITABLE_PROFILE_FIELDS)}
```

With the repair, all ten cases match the matrix, and mallory's role stays `customer`. Two details deserve attention. A customer who tries to refund a nonexistent order gets 403, the same as for a real one, because the function check runs before the lookup. And the profile endpoint rejects unknown fields instead of silently dropping them, so a client bug or a probe gets a clear error that is easy to log. Changing roles still needs a separate administrative function, with its own row in the matrix.

## Defenses

| Defense                                              | What it prevents                                      |
| ---------------------------------------------------- | ----------------------------------------------------- |
| One central policy that denies by default            | Forgotten checks on new routes, actions, or roles     |
| Every route declares the action it needs             | Endpoints that nobody thought to protect              |
| Function check before loading data                   | Leaking whether objects exist to unauthorized roles   |
| Object check after loading, or an owner-scoped query | Reading or changing other users' objects (BOLA)       |
| Allowlists of writable and readable properties       | Mass assignment and excessive data exposure           |
| Matrix-derived tests, run on every change            | Regressions when code or policy changes               |
| Logging and alerting on authorization failures       | Unnoticed probing for ids and hidden functions        |

OWASP's API5 guidance says enforcement "should deny all access by default, requiring explicit grants to specific roles for access to every function," and its Authorization Cheat Sheet adds, "Remember an attacker only needs to find one way in." For object checks, a query such as `WHERE id = ? AND owner = ?` makes the database enforce ownership for customer requests, though roles with wider scope still need the policy. Use random, unpredictable ids as a second layer, never as the check itself. As rules grow beyond roles, for example "support staff may refund orders under a set amount," attribute-based ([[abac|ABAC]]) and relationship-based ([[rebac|ReBAC]]) models fit better; OWASP recommends preferring them over plain role-based control ([[rbac|RBAC]]), and [role-, attribute-, and relationship-based access](lesson:IAM-06) covers them. Finally, follow API1's advice: write tests for the authorization mechanism, and do not deploy changes that make them fail.

## Common misconceptions

- **"The user is signed in, so the request is allowed."** Authentication says who is calling. Every request still needs an authorization decision about this function, this object, and these fields.
- **"Customers cannot see the button."** The interface is not the boundary. OWASP: "Developers must never rely on client-side access control checks."
- **"Our ids are unguessable."** Ids leak through links, logs, and screenshots, and they are often shared on purpose. An id identifies an object; it does not grant access to it.
- **"We compare the id in the URL with the user id in the token."** That covers only objects named by the user's id. OWASP says this approach "could address only a small subset of cases."
- **"The API gateway handles authorization."** A gateway can enforce coarse rules, such as which roles may call a route. It usually cannot know who owns order 1043; that check needs the data.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

In [the lab](lab:access-control-matrix), every read request passes through one authorization function, `authorize()`, and its starting policy asks only whether the caller is signed in: authentication without authorization.

1. **Object level.** Acting as Mallory, request **Alice's private review** with **Send read request**. The answer is 200 OK with Alice's review and a flag, and the stated reason is only that Mallory is authenticated. Nothing asked how Mallory relates to the object: that is [[bola|BOLA]], or IDOR. Submit the flag for "Read a document that is not yours."
2. **Function level.** Still as Mallory, request **Admin · user directory**. The matrix marks it admin-only, yet it also returns 200 OK, because no check looks at her role: that is [[bfla|BFLA]]. Submit the flag for "Reach the admin endpoint."
3. **Close both.** Click **Enable ownership check** and **Enable role check**, then send both requests again. Alice's review now returns 404 Not Found and the directory 403 Forbidden, each with a reason naming the failed check, and the policy badge reads "access control enforced." Mallory's matrix row keeps only her own notes, while Root still reads every document through an explicit admin override, like the admin's "Any order" cell in the worked example.
4. **Compare with the worked example.** The repaired `get_order` also answers 404 for someone else's order. What would a 403 for Alice's review have told Mallory? The lab also models only reads: which row of the worked example's results needs a third, property-level check?

**Without the lab.** Everything here runs locally in Python, with in-memory dictionaries for `ORDERS` and `USERS`.

1. Copy the test data, the current handlers, and `CASES` from the worked example, and write a loop that resets the data before each case and prints expected and actual statuses. Mark every mismatch in your own copy of the matrix before reading the repaired code.
2. Apply the repair one check at a time and rerun the cases after each change. Which single change fixes the most cells?
3. Extend the matrix: customers may cancel their own orders, but only while the status is `processing`. Write the new test rows first, including one for a shipped order and one for another customer's order, then add the policy entry and handler.
4. Write a test that fails when any handler uses an action missing from `POLICY`, so new endpoints cannot ship without a decision.
5. Break the repaired code on purpose by adding `"customer": "any"` to `order:refund`. Do your tests from the matrix catch it? Would tests generated from `POLICY` catch it?

## Key takeaways

- Authorization asks three questions on every request: may this caller use this function, on this object, with these fields?
- BOLA is the horizontal failure, BFLA the vertical one, and mass assignment the property-level one; OWASP lists them as API1, API5, and API3 of 2023.
- Write the intended policy as an access-control matrix, and derive tests from it, especially the denials.
- Enforce one deny-by-default policy on the server: function check before loading, object check after.
- Hidden links, unguessable ids, and valid tokens are not authorization.

## Go deeper

- OWASP's third API1 scenario concerns a GraphQL mutation that deletes documents by id. In GraphQL, one request can reach many objects through nested fields. Where should object-level checks live so that no resolver can skip them?
- Multi-tenant software serves many customer organizations from shared tables. Research how database row-level security can enforce tenant isolation beneath the application, and what it cannot express.
- Open question: authorization tests derived from a matrix cover the cases someone thought of. How would you generate the unanticipated ones, for example every role against every route and every object owner, without the test merely repeating the policy?
