---
topicId: RES-05
title: Formal modeling and verification concepts
summary: Model a security mechanism as a state machine, state safety and liveness properties precisely, check them with a model checker or a protocol verifier, and read every result in light of the model's assumptions, including its attacker model.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 60
objectives:
  - Model a small security mechanism as a state machine with variables, an initial state and transitions.
  - Write a safety property as an invariant and explain how safety differs from liveness.
  - Run a small explicit-state model checker, read its counterexample trace, and fix the design it exposes.
  - List the assumptions a verification result depends on, such as step atomicity, the number of processes and the attacker model.
  - Explain what the Dolev-Yao attacker used by ProVerif and Tamarin can and cannot do.
prerequisites: [FND-03, SYS-06, CRY-07]
concepts: [formal-verification, model-checking, invariant, safety-property, liveness-property, dolev-yao-model]
labs: []
keywords:
  - formal methods
  - TLA+
  - TLC
  - state machine
  - state space
  - state-space explosion
  - counterexample
  - temporal logic
  - fairness
  - ProVerif
  - Tamarin
  - applied pi calculus
  - multiset rewriting
  - symbolic model
  - Needham-Schroeder
  - Needham-Schroeder-Lowe
  - race condition
  - TOCTOU
sources:
  - title: The TLA+ Home Page
    url: https://lamport.org/tla/tla.html
    publisher: Leslie Lamport
  - title: How Amazon Web Services Uses Formal Methods (Communications of the ACM, April 2015)
    url: https://cacm.acm.org/magazines/2015/4/184701-how-amazon-web-services-uses-formal-methods/fulltext
    publisher: Association for Computing Machinery (ACM)
  - title: 'Tamarin Prover Manual: Introduction'
    url: https://tamarin-prover.com/manual/master/book/001_introduction.html
    publisher: Tamarin Prover project
  - title: ProVerif manual (ProVerif 2.05)
    url: https://bblanche.gitlabpages.inria.fr/proverif/manual.pdf
    publisher: Inria (ProVerif project)
  - title: 'Modeling and Analyzing Security Protocols with Tamarin: A Comprehensive Guide'
    url: https://tamarin-prover.com/book/index.html
    publisher: Tamarin Prover project (book page with free draft PDF)
quiz:
  - question: Which of these is a safety property?
    choices:
      - Every password-reset request eventually gets an answer.
      - A reset token never changes a password more than once.
      - The server eventually recovers after a crash.
      - Every queued alert is eventually triaged.
    answer: 1
    explanation: A safety property says something bad never happens, so a violation is a finite sequence of steps that ends in a bad state. The other three say something good eventually happens, which makes them liveness properties; no finite trace can violate them, and checking them needs fairness assumptions.
  - question: A model checker reports that an invariant holds for a model with two concurrent requests. What has been shown?
    choices:
      - The real system can never violate the property.
      - The property holds for any number of requests.
      - The property holds in every reachable state of this model, under its assumptions about steps, request count and environment.
      - The code has no race conditions.
    answer: 2
    explanation: The result is about the model, not the implementation, and only for the instance checked. If the code performs a step in two parts that the model treats as one, or if a third request matters, the result does not carry over. Stating these assumptions is part of reporting the result.
  - question: In the reset-token model, why does the counterexample need two requests to interleave?
    choices:
      - Both requests pass the "is the token valid?" check before either marks it used, so both go on to change the password.
      - The token expires between the two requests.
      - The second request guesses the token.
      - The model checker randomly picks a bad order.
    answer: 0
    explanation: Checking and using the token are separate steps, so another request can run in between. This is a time-of-check to time-of-use race. Making the check and the update one atomic step, for example with a conditional database update, removes the bad interleaving, and the checker then finds no violation.
  - question: ProVerif and Tamarin analyze protocols against a Dolev-Yao style attacker. Which attack does that model leave out?
    choices:
      - Replaying an old message.
      - Forwarding a message to a different party.
      - Recovering a key by measuring how long decryption takes.
      - Starting a session with an honest user under the attacker's own identity.
    answer: 2
    explanation: The symbolic attacker controls the network and can read, replay, redirect and inject messages, and it can act as a legitimate but dishonest participant. It cannot break cryptography or observe side channels such as timing, so a proof in this model says nothing about those attacks.
  - question: A protocol verifier says a property "cannot be proved". What should you conclude?
    choices:
      - An attack definitely exists.
      - The protocol is secure.
      - The tool crashed and the result can be ignored.
      - The result is inconclusive; look for an attack trace, refine the model or the query, or try another approach.
    answer: 3
    explanation: The ProVerif manual explains that verifying protocols for an unbounded number of sessions is undecidable, so a "don't know" answer is unavoidable for some inputs. When ProVerif does print an attack trace, the manual says that trace corresponds to a real attack in the model.
---

## Why it matters

Testing runs a system on some inputs and checks the outputs. Concurrency and adversaries break that approach, because the bugs live in particular orderings of events: two requests interleaving, or an attacker replaying a message at just the wrong moment. The number of possible orderings grows so quickly that tests sample only a tiny fraction of them. [[formal-verification|Formal verification]] takes a different route: describe the design precisely as a mathematical model, state the property it must have, and let a tool examine every behavior of that model, or prove that the property holds.

Industry uses this. In a 2015 *Communications of the ACM* article, Amazon Web Services engineers described applying TLA+ to ten large, complex real-world systems, including parts of DynamoDB and S3. The TLC model checker, which exhaustively checks a property across every possible execution of a model, found a subtle bug in DynamoDB's design whose shortest error trace was 35 high-level steps long, a sequence few people would ever write as a test case.

Security protocols are a classic target. The Needham-Schroeder public-key authentication protocol was published in 1978; in the mid-1990s Lowe published an attack on it and a one-field fix, and ProVerif's manual still uses the flawed and corrected versions as examples. Protocol verifiers such as ProVerif and Tamarin have since been used on TLS, Signal, 5G authentication and EMV payment cards.

## The core idea

A **model** is a precise, simplified description of a system as a state machine:

- **State variables** describe everything that matters, such as "is the token still valid?" and "how far has each request gotten?"
- An **initial state** says where the system starts.
- **Transitions**, or actions, say how the state may change in one step.

A **behavior** is a sequence of states, each reached from the previous one by a transition. A **property** says which behaviors are acceptable. Properties come in two kinds. A [[safety-property|safety property]] says something bad never happens, such as "a reset token never changes a password twice". An [[invariant]] is the simplest form: a condition that must hold in every reachable state. A [[liveness-property|liveness property]] says something good eventually happens, such as "every request eventually gets an answer". A safety violation can be shown with a finite trace; a liveness property can only be violated by an infinite behavior, so checking it needs fairness assumptions, such as "a request that stays ready to run is eventually scheduled".

[[model-checking|Model checking]] explores every reachable state of a finite model and tests the property in each one. If the property fails, the checker prints a **counterexample**: a step-by-step trace from the initial state to the bad state. Think of a maze. Testing walks a few paths from the entrance; a model checker floods every corridor at once and reports the shortest path into the forbidden room.

The crucial assumption is that **a result is about the model, not the system**. The model fixes how big each step is, how many processes exist, what values variables can take, and what the environment, including the attacker, can do. When a model and its code disagree on any of these, the result may not carry over.

## How it works

### Writing the model

The worked example below models password resets at the fictional `bank.example`. A user gets a single-use reset token by email, then submits it with a new password. The server's handler does two things: it checks that the token is valid, then it marks the token used and changes the password. An attacker who has obtained a token, or a user who double-clicks, may submit it twice at nearly the same moment, so the model includes two concurrent requests.

In TLA+, Leslie Lamport's language for modeling concurrent and distributed systems, the design fits on one screen:

```text
---------------------------- MODULE ResetToken ----------------------------
EXTENDS Naturals
CONSTANT Requests                      \* for example {1, 2}
VARIABLES token, pc, changes
vars == <<token, pc, changes>>

Init == /\ token = "valid"
        /\ pc = [r \in Requests |-> "start"]
        /\ changes = 0

Check(r) == /\ pc[r] = "start"
            /\ pc' = [pc EXCEPT ![r] = IF token = "valid" THEN "checked" ELSE "done"]
            /\ UNCHANGED <<token, changes>>

Use(r) == /\ pc[r] = "checked"
          /\ token' = "used"
          /\ changes' = changes + 1
          /\ pc' = [pc EXCEPT ![r] = "done"]

Finished == /\ \A r \in Requests : pc[r] = "done"
            /\ UNCHANGED vars              \* lets a finished system idle

Next == Finished \/ \E r \in Requests : Check(r) \/ Use(r)
Spec == Init /\ [][Next]_vars

AtMostOnce == changes <= 1               \* the invariant to check
=============================================================================
```

`Check(r)` and `Use(r)` are separate actions because the handler performs them as separate operations; anything can happen in between. The TLC model checker would be given `Requests = {1, 2}` and asked to check `AtMostOnce` as an invariant. The same model is small enough to check with the short Python program in the worked example.

### What the checker does

An explicit-state model checker performs a graph search. It starts from the initial states, applies every enabled transition, records each new state, and tests the invariant in every state it reaches. Searching breadth-first means the first violation found has the shortest possible trace.

The cost is **state-space explosion**: the number of reachable states grows quickly as you add processes or values. For the reset-token model, counting every reachable state as requests are added:

| Concurrent requests | States (check, then use) | States (atomic check-and-use) |
| ------------------- | ------------------------ | ----------------------------- |
| 1                   | 3                        | 2                             |
| 2                   | 10                       | 4                             |
| 4                   | 124                      | 16                            |
| 8                   | 17,752                   | 256                           |

Real models have many more variables, so modelers keep instances small, abstract away details that do not affect the property, and state the bounds they checked.

### Protocols and the Dolev-Yao attacker

Cryptographic protocols need a model of the attacker as well as the honest parties. ProVerif and Tamarin use a **symbolic** model. Messages are terms, such as "the pair of n and A, encrypted with Bob's public key", not bit strings. The attacker, in the [[dolev-yao-model|Dolev-Yao model]], controls the network: it can read, block, replay, redirect and inject messages, combine anything it has learned, and take part in the protocol as a legitimate but dishonest user. It cannot break the cryptography; the Tamarin book describes events with negligible probability, such as guessing a fresh random value, as impossible in symbolic models.

Both tools handle an unbounded number of protocol sessions. ProVerif's input language is a variant of the applied pi calculus, and its manual is candid about the price: because verification for unbounded sessions is undecidable, some queries end with "cannot be proved", which means "don't know". When ProVerif prints an attack trace, though, the trace corresponds to a real attack in the model. Tamarin models protocols with multiset rewriting rules, states properties in first-order logic over time points, and may not terminate on some problems, in which case the user guides the proof interactively.

The Needham-Schroeder public-key protocol shows what these tools catch. Alice sends Bob her name and a fresh nonce *Na*, encrypted for Bob. Bob replies with *Na* and his own nonce *Nb*, encrypted for Alice. Alice returns *Nb*, encrypted for Bob. Now suppose Alice starts an ordinary session with Mallory, a registered but dishonest user:

```sequence
title: Lowe's attack on Needham-Schroeder public-key
participant A as Alice
participant M as Mallory
participant B as Bob
A -> M: {Na, Alice} encrypted for Mallory
M -> B: {Na, Alice} re-encrypted for Bob
B --> M: {Na, Nb} encrypted for Alice
M --> A: passes it on unread
A -> M: {Nb} encrypted for Mallory
M -> B: {Nb} re-encrypted for Bob
note B: Bob now believes he is talking to Alice
```

Mallory cannot read Bob's reply, but she does not need to: Alice decrypts it for her and hands back *Nb*. No cryptography was broken. Lowe's fix adds Bob's name inside the second message, so Alice can tell that the reply comes from someone other than the party she meant to talk to:

```sequence
title: Lowe's fix: Bob names himself in message 2
participant A as Alice
participant M as Mallory
participant B as Bob
A -> M: {Na, Alice} encrypted for Mallory
M -> B: {Na, Alice} re-encrypted for Bob
B --> M: {Na, Nb, Bob} encrypted for Alice
M --> A: passes it on unread
A -x M: Alice expected Mallory's name, sees Bob's, stops
```

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

Check the reset-token design, find the bug, fix it, and examine the assumptions. This Python program is a complete explicit-state model checker for the model above; it needs only the standard library.

```python
from collections import deque

REQUESTS = (0, 1)   # two concurrent password-reset requests with the same token
ATOMIC = False      # True: check the token and mark it used in one step


def initial_state():
    # (token, step reached by each request, number of password changes)
    return ("valid", ("start",) * len(REQUESTS), 0)


def next_states(state):
    token, pc, changes = state
    for r in REQUESTS:
        def moved(step):
            return pc[:r] + (step,) + pc[r + 1:]
        if pc[r] == "start" and ATOMIC:
            if token == "valid":
                yield f"request {r} checks and uses the token", ("used", moved("done"), changes + 1)
            else:
                yield f"request {r} is rejected", (token, moved("done"), changes)
        elif pc[r] == "start":
            step = "checked" if token == "valid" else "done"
            yield f"request {r} checks the token ({token})", (token, moved(step), changes)
        elif pc[r] == "checked":
            yield f"request {r} marks the token used, changes password", ("used", moved("done"), changes + 1)


def invariant(state):
    return state[2] <= 1   # the token changes the password at most once


def check():
    start = initial_state()
    parent = {start: None}            # state -> (previous state, action)
    queue = deque([start])
    while queue:                      # breadth-first: shortest counterexample first
        state = queue.popleft()
        if not invariant(state):
            trace = []
            while parent[state] is not None:
                previous, action = parent[state]
                trace.append((action, state))
                state = previous
            return list(reversed(trace)), len(parent)
        for action, nxt in next_states(state):
            if nxt not in parent:
                parent[nxt] = (state, action)
                queue.append(nxt)
    return None, len(parent)


trace, explored = check()
if trace is None:
    print(f"Invariant holds in all {explored} reachable states.")
else:
    print(f"Invariant violated after exploring {explored} states:")
    for action, state in trace:
        print(f"  {action:48} -> {state}")
```

**Step 1: run it.** The checker reports a violation:

```text
Invariant violated after exploring 10 states:
  request 0 checks the token (valid)               -> ('valid', ('checked', 'start'), 0)
  request 1 checks the token (valid)               -> ('valid', ('checked', 'checked'), 0)
  request 0 marks the token used, changes password -> ('used', ('done', 'checked'), 1)
  request 1 marks the token used, changes password -> ('used', ('done', 'done'), 2)
```

**Step 2: read the trace.** Both requests pass the validity check before either marks the token used, so both change the password. This is a time-of-check to time-of-use race. If the two requests carried different new passwords, a single-use token has just set the password twice, and the last writer wins.

**Step 3: fix the design.** Make the check and the update one indivisible step. In a database this is a conditional update, such as `UPDATE reset_tokens SET used = TRUE WHERE token_hash = ? AND used = FALSE`, followed by changing the password only if exactly one row was updated. In the model, set `ATOMIC = True`. The checker now prints `Invariant holds in all 4 reachable states.`

**Step 4: examine the assumptions.** The clean result rests on choices the model made:

- **Atomicity.** The fix is correct only if the database really performs the conditional update atomically. If the code reads the row in one query and writes it in another, the real system still has the bug, whatever the model says.
- **Instance size.** Only two requests were checked. Setting `REQUESTS = (0, 1, 2)` gives 8 states for the fixed design and still no violation, which builds confidence but is not a proof for every number of requests.
- **Scope.** The model leaves out token expiry, multiple tokens per user, and how an attacker might obtain a token in the first place. Those belong to a wider [[threat-model|threat model]] and possibly a different model.
- **Property type.** Only safety was checked. Nothing here shows that every request eventually finishes; that is a liveness property, and checking it would need fairness assumptions.

## In practice

- **Model designs, not code.** The greatest payoff comes early, while a design flaw is cheap to fix. A model of a few dozen lines can expose an interleaving that no test suite exercised.
- **Pick a tool that fits the problem.** TLA+ and its TLC model checker suit concurrent and distributed designs. ProVerif and Tamarin suit cryptographic protocols against a network attacker. Lamport's TLA+ home page and the Tamarin and ProVerif manuals include tutorials.
- **Keep model and system connected.** Review the model whenever the design changes, and test the implementation against the model's traces where you can.
- **Report results with their assumptions.** A verification claim should state the model's bounds, its step granularity, its attacker model and the exact properties checked. Readers should be able to tell what was not covered.

## Common misconceptions

- **"Verified means secure."** Verification shows that a model satisfies stated properties. Side channels, weak cryptographic primitives, implementation bugs and attacks outside the threat model remain possible.
- **"No counterexample with two processes means none with a hundred."** The result covers the instance checked. Some arguments show that a small instance suffices for a particular model, but that is a separate claim that needs its own justification.
- **"Every counterexample is a real attack."** A counterexample is a behavior of the model. Check that the real system allows the same interleaving before calling it an attack.
- **"Formal methods are only for huge companies."** The tools named here are free, and small models routinely find real design bugs.

## Try it yourself

Use the Python checker from the worked example on your own computer; it needs Python 3 and no extra packages.

1. Run it as written and confirm that the four-step counterexample appears.
2. Set `ATOMIC = True` and confirm the invariant holds. How many states were explored?
3. Set `REQUESTS = (0, 1, 2)` and run both versions. Compare the state counts with the table above, then explain why the counterexample still uses only two of the three requests.
4. Add token expiry: allow a new action, "the token expires", whenever the token is still valid, and add a fourth state field that records whether a password was changed after expiry. Add the invariant "no password change after expiry" and check both designs. You should find a three-step violation without atomicity, even with one request, and no violation with it.
5. Write three assumptions your model makes that the real `bank.example` code might violate, and say how you would check each one.

## Key takeaways

- A formal model fixes the state, the steps and the environment; a property says which behaviors are acceptable.
- Safety properties have finite counterexamples that a model checker can print; liveness properties need fairness assumptions.
- Model checking finds interleaving bugs, such as time-of-check to time-of-use races, that tests rarely hit, at the cost of state-space explosion.
- Every verification result is conditional on the model's assumptions, including step atomicity, instance size and the attacker model; report those assumptions with the result.

## Go deeper

- The AWS engineers' experience report explains how they introduced TLA+ and what it found: [How Amazon Web Services Uses Formal Methods](https://cacm.acm.org/magazines/2015/4/184701-how-amazon-web-services-uses-formal-methods/fulltext).
- The Tamarin book introduces symbolic protocol modeling from first principles and is available as a free draft PDF: [Modeling and Analyzing Security Protocols with Tamarin](https://tamarin-prover.com/book/index.html).
- The ProVerif manual walks through a handshake protocol and the Needham-Schroeder case study: [ProVerif manual](https://bblanche.gitlabpages.inria.fr/proverif/manual.pdf).
- Open question: symbolic proofs assume perfect cryptography, while computational proofs reason about real probabilities but are harder to automate. How should a protocol designer combine the two kinds of evidence?
