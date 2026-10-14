---
topicId: IAM-01
title: Authentication versus authorization
summary: Authentication establishes who is making a request; authorization decides, on every request, whether that identity may take this action on this resource. Learn to separate the two in requirements, code, and HTTP responses, and to diagnose the access-control flaws that come from confusing them.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Distinguish identification, authentication, authorization, and accountability in a requirement or a request trace.
  - Classify an access failure as missing authentication, missing authorization, or incorrect authorization, and name a matching CWE entry.
  - Rewrite a handler that checks only login status so that it enforces function-level and object-level authorization on the server.
  - Choose between 401, 403, and 404 responses for a failed check and justify the choice.
  - Build an access matrix and use it to test a set of access decisions.
prerequisites: [FND-01, FND-05]
concepts: [authentication, authorization, authenticator]
labs: []
keywords:
  - authn
  - authz
  - access control
  - identification
  - accountability
  - broken access control
  - IDOR
  - insecure direct object reference
  - BOLA
  - BFLA
  - privilege escalation
  - horizontal privilege escalation
  - vertical privilege escalation
  - 401 Unauthorized
  - 403 Forbidden
  - CWE-284
  - CWE-287
  - CWE-306
  - CWE-639
  - CWE-862
  - CWE-863
  - A01:2025
  - NIST SP 800-63-4
sources:
  - title: 'NIST SP 800-63-4: Digital Identity Guidelines'
    url: https://csrc.nist.gov/pubs/sp/800/63/4/final
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
  - title: 401 Unauthorized (MDN Web Docs)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/401
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5
  - title: 403 Forbidden (MDN Web Docs)
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/403
    publisher: Mozilla (MDN Web Docs contributors)
    license: CC BY-SA 2.5
quiz:
  - question: 'A requirement says: "Users must be authorized with a password and a one-time code before viewing grades." What is the main problem with it?'
    choices:
      - Nothing; a password and a one-time code are the two authorization factors.
      - It specifies how users prove who they are, but not which grades each user may view.
      - It should require the server to return 403 when the code is wrong.
      - One-time codes belong to authorization, so the password part is redundant.
    answer: 1
    explanation: A password plus a one-time code strengthens authentication. The authorization rule, for example that students see only their own grades and instructors see grades for the courses they teach, is missing entirely, and missing rules are where broken access control begins.
  - question: Alice is signed in to shop.example. She changes the address /orders/1041 to /orders/1042 and sees Bob's order. Which description fits best?
    choices:
      - Missing authentication for a critical function, because the order page should require a login.
      - Session fixation, because Alice is using Bob's session.
      - A weak password policy, because Bob's password was guessable.
      - A missing object-level authorization check, which is a horizontal privilege escalation.
    answer: 3
    explanation: Alice was correctly authenticated as herself. The server never checked that order 1042 belongs to her, a user-controlled key bypassing authorization (CWE-639, often called IDOR). It is horizontal because she gains a peer's data, not higher privileges.
  - question: A signed-in customer calls an endpoint that only administrators may use. The server knows exactly who she is. Which response fits HTTP semantics best?
    choices:
      - 403 Forbidden, or 404 Not Found if the site prefers not to reveal that the endpoint exists.
      - 401 Unauthorized with a WWW-Authenticate header, because she is not authorized.
      - 200 OK with an empty body, so the client learns nothing.
      - A redirect to the sign-in page, so she can try a different account.
    answer: 0
    explanation: Despite its name, 401 means the request lacks valid authentication credentials. Here authentication succeeded, and re-authenticating would not change the outcome, which is what 403 signals. A server may use 404 instead to avoid confirming that the resource exists.
  - question: Developers hid the Refund button from customers, but POST /orders/{id}/refund checks only that the caller is logged in. Why is the store still vulnerable?
    choices:
      - Because customers can restyle the page and reveal the hidden button.
      - Because the session cookie is sent without encryption.
      - Because any authenticated client can send the refund request directly, so the server itself must check the caller's role.
      - Because hidden buttons are a form of cross-site scripting.
    answer: 2
    explanation: The client controls every byte it sends, so hiding a control in the interface is not access control. The endpoint is missing a function-level authorization check (CWE-862), which lets a customer perform an agent's action, a vertical privilege escalation.
  - question: Which change strengthens authorization rather than authentication?
    choices:
      - Requiring a passkey instead of a password at sign-in.
      - Scoping every order query to the signed-in customer and denying any request that no rule allows.
      - Adding a CAPTCHA to the sign-in page.
      - Temporarily locking an account after many failed sign-in attempts.
    answer: 1
    explanation: Passkeys, CAPTCHAs, and lockouts all make it harder to sign in as someone else. Scoping queries to the subject and denying by default change what an already authenticated user can reach, which is authorization.
---

## Why it matters

Every request to a protected application has to answer two different questions. The first is _who is asking?_ The second is _is this particular asker allowed to do this particular thing, right now?_ The first question is [[authentication]]; the second is [[authorization]]. A site can answer the first one flawlessly, with strong passwords and a second factor, and still hand any signed-in user everyone else's data because it never asks the second.

That failure is not rare. The OWASP Top 10:2025 keeps Broken Access Control in first place and reports that "100% of the applications tested were found to have some form of broken access control." In MITRE's 2025 CWE Top 25, Missing Authorization (CWE-862) ranks fourth, and Incorrect Authorization (CWE-863), Improper Access Control (CWE-284), Missing Authentication for Critical Function (CWE-306), and Authorization Bypass Through User-Controlled Key (CWE-639) also make the list.

Many of these flaws begin as a sentence in a requirements document: "users must be authorized with a password," or "only logged-in users can see orders." This lesson teaches you to read such sentences, and the requests that follow, and say which question each one answers.

## The core idea

Access control is easier to reason about as four separate steps:

1. **Identification**: the requester claims an identity, such as the username `alice`. A claim proves nothing by itself.
2. **Authentication**: the system verifies the claim. NIST describes a successful authentication as showing that the claimant possesses and controls one or more valid authenticators bound to the account. An [[authenticator]] is something such as a password, a passkey, or a code-generating app.
3. **Authorization**: for each request, the system decides whether the authenticated subject may perform the requested action on the requested resource under the current conditions.
4. **Accountability**: the system records what each identity did, so that actions can be traced back later ([[accountability]]).

An analogy helps. At a hotel, the front desk checks your photo ID against a reservation (authentication) and programs a key card. The card opens room 412 and the gym (authorization), the reader on each door decides every time you tap, and the system logs each tap (accountability). A meticulous ID check at the desk does nothing about a card mistakenly programmed to open every room on the floor.

Two assumptions sit under the model. First, every request passes through an enforcement point that the client cannot skip, the principle of [[complete-mediation]]. Second, the server learns _who_ is asking only from a credential or [[session]] it has verified itself, never from something the client merely asserts, such as a hidden form field or an `X-User-Id` header. If either assumption fails, even a perfect policy goes unenforced.

Notice what authentication does _not_ prove: that the account belongs to a particular real person. Checking real-world identity, called identity proofing, is a separate process. NIST SP 800-63-4 gives it its own identity assurance levels (IAL), distinct from authenticator assurance levels (AAL) and federation assurance levels (FAL).

## How it works

### The parties in an authentication

NIST SP 800-63-4 names the roles precisely. A _claimant_ tries to authenticate. A _verifier_ checks that the claimant controls the authenticators and that they are bound to an active subscriber account. A _credential service provider_ (CSP) enrolls subscribers and binds authenticators to their accounts. A [[relying-party]] (RP), usually the application, relies on the verifier's result to open an authenticated session. In a small web app one server plays every role; in [[federation]] the roles are split across organizations (see [Federation and enterprise identity](lesson:IAM-08)).

The RP then uses the subscriber's identity, assurance level, and attributes to make its own authorization decisions. An identity provider can tell an application _who_ someone is, but only the application can decide what that person may do inside it.

### The authorization decision

Every authorization check, however it is implemented, evaluates something like this:

```text
decide(subject, action, resource, context) -> allow | deny

subject:  alice (role: customer, signed in with a passkey)
action:   read
resource: order 1042 (owner: bob, status: shipped)
context:  09:14 UTC, request from her usual laptop
policy:   a customer may read an order only if she owns it
result:   deny
```

The code that intercepts a request and enforces the result is a policy enforcement point; the logic that evaluates the rules is a policy decision point. In a small app both are one function call; in a large system the decision point can be a separate service. Rules can be written in terms of roles, attributes, or relationships ([[rbac]], [[abac]], and [[rebac]]; see [Role-, attribute-, and relationship-based access](lesson:IAM-06)).

Authorization happens at two granularities, and each fails in its own way:

- **Function level**: may this kind of user call this operation at all? A customer who reaches an agent's refund endpoint gains a _vertical_ [[privilege-escalation]]. API security calls this broken function level authorization ([[bfla]]).
- **Object level**: may this user act on _this_ object? A customer who reads another customer's order gains a _horizontal_ escalation: the same privileges, applied to someone else's data. This is broken object level authorization ([[bola]]), often called an insecure direct object reference (IDOR).

### One request, two checks

The diagram follows one request from Alice's browser. A login middleware turns the session [[cookie]] into an authenticated identity. The order handler then asks the database for an order that has the requested id _and_ belongs to Alice. Order 1042 is Bob's, so no row comes back and the handler answers 404.

```sequence
title: Authentication and authorization are separate checks
participant B as Alice's browser
participant M as Login middleware
participant H as Order handler
participant D as Order database
B -> M: GET /orders/1042 (Cookie: session=7f3c…)
note M: Authentication: this session belongs to alice
M -> H: Forward the request with user = alice
H -> D: Find order 1042 where customer = alice
D --> H: No matching row (1042 is Bob's)
H --> B: 404 Not Found
note: Authorization ran for this request and this object
```

The authentication step is the same for every page; the authorization step depends on the specific object, so a global "must be logged in" filter can never replace it.

### Reading failures in HTTP

HTTP status codes encode the difference, with one confusing name. As MDN explains, 401 Unauthorized means a request "lacks valid authentication credentials for the requested resource," and the server sends a `WWW-Authenticate` header naming the scheme it expects. Despite the name, 401 is about authentication. With 403 Forbidden, the server understood who is asking and refuses anyway: "authenticating or re-authenticating makes no difference." A server may answer 404 Not Found instead of 403 when it does not want to confirm that a resource exists.

|                  | Authentication                                         | Authorization                                        |
| ---------------- | ------------------------------------------------------ | ---------------------------------------------------- |
| Question         | Who is making this request?                            | May this subject do this action on this resource now? |
| Inputs           | Password, passkey, one-time code, session cookie       | Identity, attributes, action, resource, context      |
| Output           | An authenticated subject, or a failure                 | Allow or deny                                        |
| When it runs     | At sign-in, re-authentication, and step-up             | On every request, for every object touched           |
| Failure response | 401, or a redirect to the sign-in page                 | 403, or 404 to hide existence                        |
| Typical weakness | CWE-287, CWE-306                                       | CWE-862, CWE-863, CWE-639                            |
| Made stronger by | [[mfa]], passkeys, safe account recovery               | Least privilege, deny by default, central policy, tests |

### Where the confusion comes from

Three habits blur the line. The word "auth" is ambiguous, which is why careful writers say AuthN and AuthZ. Frameworks make authentication a one-line decorator such as `@login_required`, which feels like security but answers only the first question. And an [[access-token]] may name a user _and_ list permissions, so teams assume that verifying its signature is the authorization check. A valid signature shows only that the token is genuine; deciding whether its subject and scopes permit _this_ action on _this_ object is a separate step (see [Sessions, cookies, and tokens](lesson:IAM-04)).

## Worked example

> [!ETHICS] Only test systems you own or have written permission to test.

The fictional store `shop.example` lets customers see their orders and lets support agents issue refunds. Customer `alice` owns order 1041, customer `bob` owns order 1042, and `carol` is a support agent. Diagnose the requirements first, then the access decisions.

**Step 1: read the requirements.** For each line, ask which of the four steps it describes and what it leaves out.

| Requirement as written                                       | What it really specifies                 | What is missing                                                |
| ------------------------------------------------------------ | ---------------------------------------- | -------------------------------------------------------------- |
| R1. Only logged-in users can see orders.                     | Authentication only                      | Which orders: a customer should see only the orders she owns   |
| R2. Users must be authorized with a password and a one-time code. | Authentication strength, mislabeled | Any authorization rule at all                                  |
| R3. Support agents can refund orders.                        | Function-level authorization             | Limits: which orders, how much, and who approves large refunds |
| R4. The Refund button is hidden from customers.              | Interface behavior                       | Server-side enforcement; hiding a control is not access control |
| R5. Refunds are logged.                                      | Accountability                           | What to log: who, which order, the amount, and the decision    |

Rewritten as testable policy, R1 and R3 become: "A customer may read an order only if `order.customer_id` equals her own id. A support agent may refund up to $200 on an order linked to a ticket assigned to her; larger refunds need a supervisor's approval." The approval rule applies [[separation-of-duties]].

**Step 2: trace the decisions.** The team implemented R1 and R4 literally. Here is what four requests did.

| Request                    | Authenticated as | App's answer       | Correct answer | Diagnosis                                                   |
| -------------------------- | ---------------- | ------------------ | -------------- | ----------------------------------------------------------- |
| `GET /orders/1042`, no cookie | nobody        | 302 to `/login`    | 302 or 401     | Correct: authentication is required                         |
| `GET /orders/1041`         | alice            | 200                | 200            | Correct: she owns the order                                 |
| `GET /orders/1042`         | alice            | 200, Bob's order   | 404            | Missing object-level check (CWE-639), horizontal escalation |
| `POST /orders/1041/refund` | alice            | 200, refund issued | 403            | Missing function-level check (CWE-862), vertical escalation |

Both failures share one root cause: the server authenticated every request and authorized none.

**Step 3: fix the code.** The vulnerable handler, written in a Flask-like Python style, checks only that someone is logged in:

```python
@app.get("/orders/<int:order_id>")
@login_required                       # authentication: who are you?
def show_order(order_id):
    order = db.fetch_one("SELECT * FROM orders WHERE id = %s", (order_id,))
    return render_order(order)        # any signed-in user can read any order
```

The fixed version asks the missing question on the server, for this object, and adds the function-level check the refund endpoint lacked:

```python
@app.get("/orders/<int:order_id>")
@login_required
def show_order(order_id):
    order = db.fetch_one(
        "SELECT * FROM orders WHERE id = %s AND customer_id = %s",
        (order_id, current_user.id),  # authorization: is this order yours?
    )
    if order is None:
        abort(404)                    # same answer for "absent" and "not yours"
    return render_order(order)

@app.post("/orders/<int:order_id>/refund")
@login_required
def refund_order(order_id):
    if not current_user.has_permission("refund"):      # function level first
        abort(403)
    order = db.fetch_one("SELECT * FROM orders WHERE id = %s", (order_id,))
    if order is None or not policy.allows(current_user, "refund", order):
        abort(404)                                     # object level: this order
    issue_refund(order, actor=current_user.id)         # logged for accountability
```

Checking the function-level rule before loading the order also stops a customer from using the refund endpoint to learn which order numbers exist.

**Step 4: turn the matrix into tests.** Automate the expected answer for each role and ownership case: Alice reading 1041 gets 200, Alice reading 1042 gets 404, Alice refunding anything gets 403, and Carol refunding a $50 order on another agent's ticket gets 404. Negative tests, which expect a denial, matter most: the original bug passed every positive test.

## Defenses

- **Deny by default.** Every route and object starts out inaccessible, and a rule must explicitly allow access. This applies [[fail-safe-defaults]] to access control and is a core recommendation of the OWASP Authorization Cheat Sheet. _Limit:_ a permissive framework default, or a new endpoint registered outside the protected router, silently reopens the gap.
- **Enforce on the server, on every request.** Put authentication in shared middleware and authorization in one reusable policy layer that each handler calls with the specific object. _Limit:_ middleware cannot know who owns order 1042, so object checks belong where the object is loaded.
- **Scope data access to the subject.** A query such as `WHERE id = %s AND customer_id = %s` makes the safe path the easy one. _Limit:_ sharing, delegation, and team ownership need a real policy model, not just an owner column.
- **Derive identity only from verified credentials.** Ignore client-supplied user ids and roles; read identity from the verified session or token. _Limit:_ this assumes the session or token is itself protected.
- **Apply least privilege.** Give each role only what its tasks need ([[least-privilege]]), and review roles for privilege creep as people change jobs.
- **Match authentication strength to the action.** Require a fresh, stronger sign-in, called step-up authentication, before refunds or account changes. Here authentication becomes an _input_ to authorization. _Limit:_ it cannot rescue a rule that is itself wrong.
- **Log and test.** Log denied decisions with subject, action, and object, alert on bursts of denials, which can signal enumeration, and keep the access matrix as automated tests. _Limit:_ logs detect rather than prevent, and tests cover only the cases written down.

## Common misconceptions

- **"Logged in means allowed."** Every request still needs an authorization decision for the specific action and object.
- **"Hiding the button is access control."** The client controls everything it sends, so anyone can send the request a hidden button would have sent.
- **"Random ids fix IDOR."** Unguessable ids are useful defense in depth, but they leak through shared links, logs, and browser history. The fix is an ownership or policy check.
- **"401 means not authorized."** In HTTP, 401 means not _authenticated_. A known user who lacks permission gets 403, or 404.
- **"MFA makes access control stronger."** [[mfa]] makes impersonation harder. It does nothing about a rule that lets every customer read every order.
- **"Authentication proves who someone is in real life."** It proves control of an authenticator bound to an account. Identity proofing is a separate process.
- **"OAuth is a login protocol."** [[oauth]] delegates permission to call an API; sign-in is layered on top by [[openid-connect]] (see [OAuth and OpenID Connect concepts](lesson:IAM-05)).

## Try it yourself

Work on paper. The fictional `library.example` app has three roles: patron, librarian, and administrator.

1. Label each requirement as identification, authentication, authorization, or accountability, and rewrite any vague one as a testable rule:
   - "Patrons sign in with their library card number and a PIN."
   - "Only staff can waive fines."
   - "Patrons can see loans."
   - "All fine waivers are recorded."
   - "Librarians are authorized with a security key."
2. Build an access matrix with the roles as rows and these actions as columns: view own loans, view another patron's loans, waive a fine, edit the catalog, change a user's role. Fill each cell with allow, deny, or a condition.
3. For each logged request, give the status code you would return (200, 401, 403, or 404) and, if the app was wrong, the weakness:
   - A patron requests `/patrons/5512/loans`, another patron's loans, and gets 200.
   - An anonymous request to `/fines/88/waive` gets 403.
   - A librarian changes her own role to administrator through `/users/me/role` and gets 200.
4. Optional, with your own accounts only: sign out of a site you use, open the Network tab of your browser's developer tools, and load a bookmarked account page. Does the site redirect to its sign-in page, or answer 401 or 403?

To check yourself: "Patrons can see loans" has the same gap as R1, the anonymous request deserved a 401 or a redirect, and the role change is a vertical privilege escalation.

## Key takeaways

- Authentication answers _who is asking_; authorization answers _may they do this, to this, now_. Keep them as separate checks in requirements, code, and tests.
- Authorization runs on every request and usually depends on the specific object, so a global login filter can never replace it.
- Derive identity from what the server has verified, never from what the client claims, and deny by default.
- In HTTP, 401 means unauthenticated, 403 means authenticated but not permitted, and 404 can hide that a resource exists.
- An access matrix turned into automated negative tests is a cheap way to catch broken access control, the most common web weakness class.

## Go deeper

- NIST SP 800-63-4 separates identity proofing (IAL), authentication (AAL), and federation (FAL) assurance so that a relying party can choose each according to its risk. Why split them, and what must the relying party still decide alone?
- Norm Hardy's 1988 essay ["The Confused Deputy"](https://css.csail.mit.edu/6.566/2011/readings/confused-deputy.html) (reading copy from MIT 6.566) describes a compiler that holds authority from two parties and cannot tell which one a request should use. Relate it to a web server that calls internal services on behalf of its users.
- The OWASP Authorization Cheat Sheet favors attribute- and relationship-based models over pure roles and recommends automated tests for authorization logic. Open question: what evidence would convince you that an application with hundreds of endpoints enforces its policy everywhere?
