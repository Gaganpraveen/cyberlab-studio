---
topicId: APP-08
title: API rate, quota, and business-logic controls
summary: Learn how limits on rate, volume, and cost keep an API available and affordable, why business workflows need server-enforced order and atomic steps, and investigate a fictional checkout for bounded workflow and authorization failures.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Distinguish rate limits, quotas, and business-logic rules, and choose what each limit should count by.
  - Implement and test a token-bucket rate limiter that answers excess requests with 429 and Retry-After.
  - Investigate a fictional checkout workflow for unchecked values, limit overruns, skipped steps, and missing object-level checks.
  - Repair a check-then-act race with one atomic database transaction, and enforce workflow order with a server-side state table.
  - Explain why sensitive business flows need anti-automation and spending caps in addition to per-request limits.
prerequisites: [APP-02, APP-06]
concepts: [rate-limiting, business-logic-flaw, limit-overrun, race-condition, toctou, dos-attack]
labs: [ddos]
keywords:
  - API4:2023
  - API6:2023
  - CWE-770
  - rate limiting
  - token bucket
  - quota
  - 429 Too Many Requests
  - Retry-After
  - business logic
  - limit overrun
  - race window
  - anti-automation
  - state machine
  - spending limit
sources:
  - title: 'API4:2023 Unrestricted Resource Consumption (OWASP API Security Top 10 2023)'
    url: https://api-security.owasp.org/editions/2023/en/0xa4-unrestricted-resource-consumption/
    publisher: OWASP API Security Project
    license: CC BY-SA 4.0
    sourceId: owasp-api-security-top-10
  - title: 'API6:2023 Unrestricted Access to Sensitive Business Flows (OWASP API Security Top 10 2023)'
    url: https://api-security.owasp.org/editions/2023/en/0xa6-unrestricted-access-to-sensitive-business-flows/
    publisher: OWASP API Security Project
    license: CC BY-SA 4.0
    sourceId: owasp-api-security-top-10
  - title: 'OWASP ASVS 5.0.0, V2 Validation and Business Logic'
    url: https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-asvs
  - title: Business logic vulnerabilities (Web Security Academy)
    url: https://portswigger.net/web-security/logic-flaws
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
  - title: Race conditions (Web Security Academy)
    url: https://portswigger.net/web-security/race-conditions
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
    sourceId: cwe-top-25
quiz:
  - question: A one-time coupon is redeemed by first asking the database whether the account has used it and then recording the use. Mallory sends 20 requests at the same moment and the discount applies 20 times. What is the best fix?
    choices:
      - Add a short pause between the check and the write.
      - Run the check twice before writing.
      - Rate-limit the endpoint to one request per second per account.
      - Make redemption one atomic step, such as an insert that a uniqueness constraint on account and coupon refuses the second time.
    answer: 3
    explanation: The flaw is the gap between check and act, a limit overrun. A pause widens the gap, a second check has its own gap, and a rate limit only makes collisions less likely. PortSwigger recommends atomic state changes using the datastore's concurrency features, with uniqueness constraints as defense in depth.
  - question: The checkout page calls POST /api/orders/{id}/confirm when the payment page reports success, and the server marks the order confirmed. What is the core flaw?
    choices:
      - The confirm endpoint has no rate limit.
      - The server lets the client report a fact only the server can verify, so a caller can skip payment by calling confirm directly.
      - Order ids should be random UUIDs.
      - The endpoint should answer 201 instead of 200.
    answer: 1
    explanation: Workflow order and payment status are business facts the server must own. ASVS 2.3.1 asks that business flows be processed in the expected order without skipping steps. Here, the order should become paid only when the server receives the payment provider's verified notification.
  - question: Why is a rate limit keyed only on IP address weak protection for an endpoint that sends SMS verification codes?
    choices:
      - Attackers can spread requests across many addresses and legitimate users often share one, so limits also need to count per account and per phone number, with a spending cap behind them.
      - Servers cannot see the IP address of a request.
      - Rate limits only work on GET requests.
      - IP-based limits are forbidden by the HTTP standard.
    answer: 0
    explanation: The key decides what a limit actually protects. OWASP's API6 scenarios include bots spreading purchases across IP addresses, and its API4 guidance recommends per-operation limits and spending limits for paid service providers such as SMS gateways.
  - question: A token bucket holds 3 tokens and refills one token every 60 seconds. Alice sends 5 requests at once. What happens?
    choices:
      - All 5 succeed, because the bucket refills over the minute.
      - The first request succeeds and the other 4 fail.
      - The first 3 succeed and the other 2 receive 429 Too Many Requests, with a Retry-After header saying when to try again.
      - All 5 fail, because she exceeded the limit.
    answer: 2
    explanation: The capacity allows a burst of 3, after which requests must wait for refills. Answering 429 with Retry-After tells a well-behaved client when to come back instead of retrying immediately.
  - question: Which statement about business-logic flaws is accurate?
    choices:
      - Automated scanners find them reliably, because they produce server errors.
      - They abuse legitimate features in unintended ways, such as skipped steps or out-of-range values, so finding them requires knowing the intended workflow.
      - They only occur in banking software.
      - A web application firewall blocks them by default.
    answer: 1
    explanation: PortSwigger describes logic flaws as design and implementation flaws that let an attacker elicit unintended behavior, notes they are often invisible to people who are not looking for them, and says they are difficult to detect with automated scanners. The requests look normal; only the business meaning is wrong.
---

## Why it matters

Every API call spends something: processor time, memory, database work, and sometimes money, when the call sends an SMS message, an email, or pulls data out of a cloud bucket. Without limits, one client can exhaust a service or its budget. OWASP's API Security Top 10 2023 lists this as API4, Unrestricted Resource Consumption; one of its scenarios describes scripted password-reset requests that made a backend send tens of thousands of paid SMS messages, costing thousands of dollars within minutes. MITRE's Allocation of Resources Without Limits or Throttling ([[cwe|CWE]]-770) ranked 25th on the 2025 CWE Top 25. At scale, missing limits become [[dos-attack|denial of service]].

Speed limits alone are not enough. API6, Unrestricted Access to Sensitive Business Flows, covers automation that buys a whole stock of a scarce product, spams comments, or reserves every time slot, all through perfectly valid requests. And some attacks need no volume at all: a negative quantity, a skipped step, or two requests that arrive together. PortSwigger defines these [[business-logic-flaw|business logic vulnerabilities]] as "flaws in the design and implementation of an application that allow an attacker to elicit unintended behavior," and warns that they are "often invisible to people who aren't explicitly looking for them."

> [!ETHICS] Only test systems you own or have written permission to test.

## The core idea

An API needs three kinds of control, and each answers a different question:

1. **[[rate-limiting|Rate limits]]**: how fast may this client act? For example, three verification codes at once, then one per minute.
2. **Quotas and size limits**: how much may it consume? For example, 100 records per page, a 5 MB upload, ten SMS messages per account per day, or a monthly spending cap with the SMS provider.
3. **Business rules**: may this action happen at all, now, in this order? For example, one welcome coupon per account, payment before shipping, at most ten of one item per order.

Think of a theme park. Turnstiles meter how fast people enter, a ticket allows a set number of rides per day, and each ride checks that you queued and meet its rules. A faster turnstile does nothing about a visitor who walks in through the exit. Rate limits and quotas meter traffic; only server-side business rules stop requests that are individually valid but wrong for the workflow.

The principle behind the third kind: the client says what it wants, and the server, which owns the state, decides what is allowed now.

## How it works

### Rate limits: algorithm, key, and response

A token bucket is a common algorithm. Each client has a bucket of tokens; each request takes one; tokens refill at a steady rate up to a maximum. The capacity allows short bursts, and the refill rate sets the long-run pace. Injecting the clock makes it testable without waiting:

```python
import math
import time

class TokenBucket:
    """Allow bursts up to capacity, then a steady rate of refill_per_second."""

    def __init__(self, capacity: int, refill_per_second: float, clock=time.monotonic):
        self.capacity = capacity
        self.refill = refill_per_second
        self.clock = clock
        self.tokens = float(capacity)
        self.updated = clock()

    def try_take(self) -> tuple[bool, float]:
        """Return (allowed, seconds until the next token)."""
        now = self.clock()
        self.tokens = min(self.capacity, self.tokens + (now - self.updated) * self.refill)
        self.updated = now
        if self.tokens >= 1:
            self.tokens -= 1
            return True, 0.0
        return False, (1 - self.tokens) / self.refill

buckets: dict[tuple[str, str], TokenBucket] = {}

def send_code(account: str, clock=time.monotonic) -> tuple[int, dict]:
    # 3 codes at once, then one every 60 seconds, per account.
    bucket = buckets.setdefault((account, "sms-code"), TokenBucket(3, 1 / 60, clock))
    allowed, wait = bucket.try_take()
    if not allowed:
        return 429, {"Retry-After": str(math.ceil(wait))}
    return 202, {}
```

With a fake clock, five requests from one account at the same instant give three 202 responses and two 429 responses with `Retry-After: 60`; another account is unaffected, and 60 seconds later one more request succeeds. Status 429, Too Many Requests, comes from [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585): it means the user "has sent too many requests in a given amount of time," and the response may include `Retry-After` to say how long to wait. The RFC deliberately does not define how the server identifies the user or counts requests. That choice is yours, and it is the next design question.

What you count by matters as much as the algorithm. Counting per IP address is weak on its own: many legitimate users share an address, and OWASP's API6 scenarios include bots that spread purchases across many addresses. Count per account or API key, per target such as the phone number or user name being acted on, and per operation, with global caps behind them. OWASP's API4 guidance asks to "Limit/throttle how many times or how often a single API client/user can execute a single operation," such as one-time-password checks and password recovery, and to "Configure spending limits for all service providers/API integrations." One practical note: a dictionary inside one process limits only that process. Production limiters keep counters in a shared store or enforce them at a gateway.

### Quotas and size limits

Volume hides in parameters. A `limit=1000000` query parameter, a huge JSON array, or one request that batches hundreds of operations can make a single request as expensive as thousands, so counting requests does not bound the work; OWASP's API4 describes an attacker who bundled many uploads into one batched GraphQL request to get past rate limits and exhaust memory. Its prevention advice is to "Define and enforce a maximum size of data on all incoming parameters and payloads" and to validate parameters that control how many records are returned.

### Business rules: order, limits, and atomic steps

ASVS 5.0 turns business logic into verifiable requirements. Requirement 2.3.1 says the application "will only process business logic flows for the same user in the expected sequential step order" without skipping steps; 2.3.2 asks that limits be implemented as documented; 2.3.3 asks for transactions, so an operation fully succeeds or rolls back; and 2.3.4 asks for locking that prevents double-booking of limited resources.

Concurrency is where many of these break. A [[race-condition|race condition]] occurs, in PortSwigger's words, "when websites process requests concurrently without adequate safeguards," and "The period of time during which a collision is possible is known as the 'race window'." A [[limit-overrun|limit overrun]] uses that window to exceed a business limit, such as applying a one-time discount repeatedly; PortSwigger calls limit overruns "a subtype of so-called 'time-of-check to time-of-use' (TOCTOU) flaws." [[toctou|TOCTOU]] flaws in general are the subject of [race conditions and time-of-check/time-of-use](lesson:SYS-06).

```sequence
title: Two requests race to redeem a one-time coupon
participant M as mallory
participant S as api.shop.example
participant D as Database
M -> S: Request 1: apply WELCOME10
M -> S: Request 2: apply WELCOME10
S -> D: Request 1 asks: used before?
S -> D: Request 2 asks: used before?
D --> S: Request 1: no
D --> S: Request 2: no
S -> D: Both record a use and discount the cart
note: Both checks ran before either write: the race window
note: Repaired: the insert itself is the check
S -> D: Request 1 inserts the redemption row
D --> S: Inserted, discount applied in the same transaction
S -x D: Request 2 insert refused by the uniqueness constraint
```

Some flows are sensitive even when each request is correct. For API6 risks, OWASP suggests identifying the business flows that would hurt if used excessively, then choosing mechanisms such as device fingerprinting, human detection with a [[captcha|CAPTCHA]] or similar, and detection of non-human patterns. ASVS 2.4.1 asks for anti-automation controls against excessive calls. Each has costs: CAPTCHAs burden real people, including people with disabilities, so apply them to the flows that need them.

## Worked example

The activity: investigate bounded workflow and authorization failures. The `shop.example` team gives you a local copy of its checkout service, two fictional accounts (alice and mallory), a written test plan, and a cap of 50 requests per probe. The SMS provider is replaced by a stub that only counts messages, so nothing leaves the machine. Carts start at 50.00, and the welcome coupon takes 10.00 off once per account.

Here are the relevant handlers. Each request opens its own database connection:

```python
def apply_coupon(db, user, order_id, code):
    used = db.execute("SELECT 1 FROM redemptions WHERE user = ? AND code = ?",
                      (user, code)).fetchone()                     # check ...
    if used:
        return 409
    with db:                                                       # ... then act
        db.execute("INSERT INTO redemptions (user, code) VALUES (?, ?)", (user, code))
        db.execute("UPDATE orders SET total = total - ? WHERE id = ?",
                   (COUPONS[code], order_id))
    return 200

def confirm(db, user, order_id):     # the checkout page calls this when payment "succeeds"
    with db:
        db.execute("UPDATE orders SET state = 'confirmed' WHERE id = ?", (order_id,))
    return 200
```

The test plan produced these findings:

| #  | Probe                                                       | Expected                 | Observed                              | Category                     |
| -- | ----------------------------------------------------------- | ------------------------ | ------------------------------------- | ---------------------------- |
| F1 | Set an item's quantity to -3                                | 400                      | 200; the total drops                  | Unchecked business value     |
| F2 | 20 simultaneous coupon requests for mallory's cart          | One 200, then 409s       | 20 × 200; total −150.00               | Limit overrun                |
| F3 | Call `confirm` on an unpaid cart                            | Refused                  | 200; order confirmed                  | Skipped workflow step        |
| F4 | mallory calls `confirm` on alice's order                    | 404                      | 200                                   | Object-level authorization   |
| F5 | 50 SMS-code requests for one account in a minute            | 3 × 202, then 429        | 50 × 202; the stub counted 50         | Unrestricted consumption     |

For F2, the vulnerable handler had a short pause added between the check and the write to widen the race window, standing in for other work. A discount meant to apply once applied twenty times and pushed a 50.00 cart below zero. F1 is fixed with ideas from [input validation](lesson:APP-02): accept only whole-number quantities from 1 to 10, the documented limit, and compute every total on the server from server-side prices. F4 is the object-level check from [object-level and function-level authorization](lesson:APP-06). F5 is fixed by the token bucket keyed by account, a daily quota per account and phone number, and a spending cap configured with the provider.

F2 needs one atomic step. The repaired handler adds a uniqueness constraint, `PRIMARY KEY (user, code)`, to the redemptions table and lets the database decide:

```python
def apply_coupon(db, user, order_id, code):
    if code not in COUPONS:
        return 404
    try:
        with db:                                   # one transaction: both changes, or neither
            db.execute("INSERT INTO redemptions (user, code) VALUES (?, ?)", (user, code))
            changed = db.execute(
                "UPDATE orders SET total = total - ? "
                "WHERE id = ? AND owner = ? AND state = 'cart'",
                (COUPONS[code], order_id, user)).rowcount
            if changed != 1:
                raise LookupError(order_id)        # also rolls back the redemption
    except sqlite3.IntegrityError:
        return 409                                 # already redeemed, however close the timing
    except LookupError:
        return 404
    return 200
```

Rerun with 20 simultaneous requests, each on its own connection, this version accepted exactly one request in each of five trials, and the cart ended at 40.00. The `WHERE` clause also checks the owner and the state, so mallory cannot discount alice's cart, and a failed attempt does not use up her own redemption, because the transaction rolls back.

F3 and F4 need the server to own the workflow. The browser should never be able to confirm anything. The repaired service replaces `confirm` with a table of allowed transitions, each tied to the role that may trigger it:

```python
# (current state, event) -> (role allowed to send it, next state). Anything else is refused.
WORKFLOW = {
    ("cart", "checkout"): ("customer", "awaiting_payment"),
    ("awaiting_payment", "payment_captured"): ("payment-provider", "paid"),
    ("paid", "ship"): ("warehouse", "shipped"),
}

def advance(db, actor, role, order_id, event):
    with db:
        row = db.execute("SELECT owner, state FROM orders WHERE id = ?", (order_id,)).fetchone()
        if row is None or (role == "customer" and row[0] != actor):
            return 404                             # object-level check, as in APP-06
        owner, state = row
        rule = WORKFLOW.get((state, event))
        if rule is None or rule[0] != role:
            return 409                             # wrong step, or not this role's step
        changed = db.execute("UPDATE orders SET state = ? WHERE id = ? AND state = ?",
                             (rule[1], order_id, state)).rowcount
        return 200 if changed == 1 else 409        # someone else moved it first
```

The `payment_captured` event comes only from the handler that verifies the payment provider's signed notification, so a customer who sends it gets 409, as does a warehouse system that tries to ship an unpaid cart. The `UPDATE ... WHERE state = ?` is a conditional update: if two events race, only one moves the order. With these changes and the F1 and F5 fixes, every probe in the test plan returns its expected result; the old `confirm` route no longer exists, and mallory's attempt to check out alice's cart gets 404.

## Defenses

| Risk                                    | Control                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| Request floods and brute force          | Token-bucket or window limits per account, key, target, and operation         |
| Volume hidden in parameters             | Maximum page sizes, payload sizes, and batch sizes, validated on the server   |
| Costly third-party calls                | Per-account quotas, provider spending caps, and billing alerts                |
| Out-of-range values                     | Server-side validation against documented business limits                     |
| Skipped steps and client-claimed facts  | A server-side state table; facts such as payment come from verified sources   |
| Limit overruns                          | One transaction, uniqueness constraints, conditional updates                  |
| Abuse of sensitive flows                | Identify the flows; anti-automation and monitoring for non-human patterns     |

PortSwigger's race-condition advice is to "Ensure sensitive endpoints make state changes atomic by using the datastore's concurrency features," to use features such as "column uniqueness constraints" as defense in depth, and "Don't attempt to use one data storage layer to secure another." For logic flaws, it recommends that developers and testers understand the business domain, avoid implicit assumptions about user behavior, and "Maintain clear design documents and data flows for all transactions and workflows." Monitor too: 429 responses, refused transitions, and rejected values are signals of probing worth alerting on.

## Common misconceptions

- **"We have a rate limit, so we are protected."** A rate limit meters speed. It does not stop one well-timed pair of requests, a negative quantity, or a skipped step.
- **"Limiting by IP address is enough."** Shared addresses punish real users, and distributed attackers rotate addresses. Count what the action affects: the account, the target, and the money.
- **"The interface enforces the order of steps."** Any step's endpoint can be called directly. The server must know the current state and allow only the next valid transitions.
- **"Races are too unlikely to matter."** Attackers can send many requests at the same moment on purpose, and every extra request is another chance to land inside the window.
- **"Business logic flaws show up in scanner reports."** They look like ordinary requests. Finding them takes someone who knows what the business intends.

## Try it in the lab

In [the lab](lab:ddos), a seeded simulation shows a fictional botnet flooding a small service with a finite queue. You run the same flood three ways: with no defense, with a per-source rate limit, and with extra capacity. For each run, compare the share of real users served during the attack, the legitimate requests dropped, and the bot requests the service still paid to handle. The rate limit wins here because every bot is its own source and sends far more than any real user. Then decide what the limit should count by when that is not true: many real users behind one campus address, or one attacker spread across thousands of addresses.

**Without the lab.** Copy the `TokenBucket` class and drive it with a fake clock: a small class whose `__call__` returns a time you advance by hand. Predict the responses for five requests at once, then after 30 seconds and after 60 seconds, and confirm. Then reproduce F2 locally: create a temporary SQLite database file with an `orders` table and a `redemptions` table without the uniqueness constraint, add a short `time.sleep` between the check and the write in the vulnerable `apply_coupon`, and release 20 threads at once with `threading.Barrier`, each opening its own connection. Count the successes, add `PRIMARY KEY (user, code)` and the repaired handler, and run it again.

## Key takeaways

- Rate limits control speed, quotas and size limits control volume and cost, and business rules control what may happen at all.
- Choose limit keys deliberately: per account, target, and operation, with spending caps behind paid services.
- The server owns workflow state; never let the client assert facts such as payment.
- Close check-then-act races with one atomic step: transactions, uniqueness constraints, and conditional updates.
- Logic flaws hide in normal-looking requests, so test against the intended workflow, not only for errors.

## Go deeper

- Compare token buckets with fixed-window and sliding-window counters. Which allows the largest burst at a window boundary, and when does that matter?
- Idempotency is a close relative of the limit-overrun problem: a client retries a payment after a timeout and must not be charged twice. Research how payment APIs let clients attach a unique key to each operation, and how that relates to the uniqueness constraint here.
- Open question: anti-automation controls such as CAPTCHAs impose costs on people, including people with disabilities. How would you decide which flows deserve them, and what evidence would show that a control is worth its cost?
