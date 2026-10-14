---
topicId: SYS-03
title: Use-after-free and lifetime management
summary: Understand how a pointer outlives the object it refers to, why a use after free can leak or corrupt another object's data, and how explicit ownership in C, smart pointers in C++, and Rust's borrow checker each prevent it.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Trace a heap object's lifetime through allocation, sharing, free and reuse, and mark where each pointer to it starts to dangle.
  - Explain, at a conceptual level, why a use after free can leak data, corrupt data or redirect control flow.
  - Repair a use-after-free in C by restructuring ownership, and compare the repair with C++ shared ownership and Rust borrowing.
  - Use AddressSanitizer reports to locate the bad access, the free and the allocation behind a lifetime bug.
  - Judge the limits of nulling pointers, allocator hardening and testing as defenses.
prerequisites: [SYS-01, SYS-02]
concepts: [use-after-free, dangling-pointer, ownership]
labs: []
keywords:
  - UAF
  - CWE-416
  - CWE-415
  - CWE-825
  - double free
  - dangling pointer
  - dangling reference
  - object lifetime
  - temporal memory safety
  - RAII
  - std::unique_ptr
  - std::shared_ptr
  - std::weak_ptr
  - reference counting
  - garbage collection
  - borrow checker
  - E0502
  - iterator invalidation
  - heap-use-after-free
  - -Wuse-after-free
sources:
  - title: 'CWE-416: Use After Free'
    url: https://cwe.mitre.org/data/definitions/416.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 'Computer Security (CS 161 textbook), Chapter 3: Memory Safety Vulnerabilities'
    url: https://textbook.cs161.org/memory-safety/vulnerabilities.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'The Rust Programming Language, Section 4.2: References and Borrowing'
    url: https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html
    publisher: The Rust Project
  - title: AddressSanitizer (Clang documentation)
    url: https://clang.llvm.org/docs/AddressSanitizer.html
    publisher: LLVM Project
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
    sourceId: cwe-top-25
  - title: 'The Case for Memory Safe Roadmaps'
    url: https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps
    publisher: CISA, NSA, FBI and international partners
    license: No explicit license found (marked TLP:CLEAR)
quiz:
  - question: In session_uaf.c, logout frees the session and sets cache[slot] to NULL. Why does the handler still use freed memory?
    choices:
      - free does not actually release memory until the program exits.
      - Setting cache[slot] to NULL frees the session a second time.
      - The handler's local variable s is a separate copy of the address, and nothing updated it.
      - printf copies the session before logout runs.
    answer: 2
    explanation: A pointer is just a copy of an address. Clearing the owner's copy does not touch any other copy, so s dangles the moment logout returns. This is why MITRE calls nulling a pointer after free only a defense-in-depth measure, and less useful when many structures hold pointers.
  - question: Why can a use after free reveal data that belongs to a different user?
    choices:
      - The allocator may hand the freed block to a new allocation, so the stale pointer now reads whatever the new object stores there.
      - Freed memory is automatically copied into every other session.
      - The operating system moves freed memory into another process.
      - free fills the block with data from the most recent request.
    answer: 0
    explanation: Reusing freed memory is the allocator's job. CWE-416 describes exactly this, where the memory now belongs to the code using the new pointer. A stale read sees the new occupant's data, and a stale write corrupts it.
  - question: Which change fixes handle_request in the C++ version without changing what logout does?
    choices:
      - Mark the session's fields const so they cannot change after logout.
      - Replace std::shared_ptr with a raw pointer to avoid reference-counting overhead.
      - Call delete on the session inside handle_request after printing.
      - Have the handler copy the std::shared_ptr, so its own reference keeps the session alive until the handler finishes.
    answer: 3
    explanation: With shared ownership, logout only drops the cache's reference. The handler's copy is another reference, and the session is destroyed when the last one goes away. A raw pointer or a manual delete reintroduces the original bug or a double free.
  - question: Rust rejects session_bad.rs with error E0502. What rule is the compiler enforcing?
    choices:
      - Every HashMap must be locked before it is read.
      - While s borrows a value inside the map, the map cannot be mutably borrowed to remove that entry, so the reference cannot dangle.
      - Strings must be copied before they are printed.
      - A function may not both read and write its arguments.
    answer: 1
    explanation: Rust allows either one mutable borrow or any number of shared borrows at a time, and a reference must never outlive its data. Removing the entry needs a mutable borrow while s is still in use, so the program is rejected before it can run.
  - question: Your test suite passes under AddressSanitizer with no reports. What can you conclude?
    choices:
      - The program has no use-after-free bugs anywhere.
      - The program would also pass without ASan, so ASan can be dropped.
      - No use-after-free or double free happened on the code paths those tests ran; other paths may still hide lifetime bugs.
      - ASan only checks buffer overflows, so the result says nothing about lifetimes.
    answer: 2
    explanation: ASan detects heap use-after-free and double free, but only when the faulty access actually executes. It cannot reason about paths the tests never reach, which is why teams pair it with fuzzing and with designs that rule the bug out.
---

## Why it matters

A [[use-after-free]] (UAF) happens when a program keeps using [[heap]] memory after freeing it. It is the 7th entry in MITRE's 2025 CWE Top 25 Most Dangerous Software Weaknesses, and the only memory-lifetime error on the list. MITRE's CWE-416 entry explains the danger in one chain of events. After the memory is freed, the allocator may hand it out again for a new object, while the old pointer still refers into it. From then on, the memory belongs to the code that uses the new pointer, and every use of the old one is invalid.

Use-after-free bugs tend to appear in large C and C++ programs whose objects have complicated lifetimes, such as web browsers and operating-system kernels. There, an object is often freed in one component while a pointer to it survives in another. The code that frees the object and the code that later uses it may never appear on the same screen.

This lesson follows one object through its whole lifetime, shows where pointers to it start to dangle, and compares three repairs: explicit ownership in C, shared ownership in C++, and compile-time borrow checking in Rust.

## The core idea

A pointer is a copy of an address. Freeing an object ends its lifetime, but it does not find and update the copies of its address scattered through the program. Each surviving copy becomes a [[dangling-pointer]]. Nothing about a dangling pointer looks wrong: it holds a perfectly ordinary address, and in C it can be dereferenced like any other pointer.

Think of returning a rental car while keeping a spare key. The key still opens the car. Once the agency rents the car to someone else, your key opens *their* car. You could see their belongings (a stale read) or move their seat (a stale write).

The assumptions behind this lesson are simple. The examples are single-threaded toys, and the memory allocator reuses freed memory, which is exactly its job. Temporal [[memory-safety]] then requires two rules:

1. No code may use any pointer to an object after the object is freed.
2. Each allocation is freed exactly once.

[[ownership|Ownership]] is the discipline that enforces both: one owner frees the object exactly once, and borrowers stop using it before that happens.

## How it works

### One object's lifetime

The sequence below follows the session object in this lesson's toy program. A request handler borrows a pointer from a session cache, which owns the sessions. During the request, the cache logs alice out and frees her session. The handler's pointer still holds the old address. If the allocator later reuses that memory for mallory's new session, a read through the stale pointer sees mallory's data.

```sequence
title: How a borrowed pointer outlives its object
participant H as Request handler
participant C as Session cache (owner)
participant A as Allocator
H -> C: Get alice's session
C --> H: Pointer s (a borrow)
H -> C: Log alice out
C -> A: free(alice's session)
note H: s still holds the old address
C -> A: malloc for mallory's new session
A --> C: May return the same memory
H -x A: Read s->user: invalid, may be mallory's data
```

### What can go wrong

| Stale operation               | What happens                                                     | Property harmed                      |
| ----------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| Read through a stale pointer  | Returns garbage or the new occupant's data                       | [[confidentiality\|Confidentiality]] |
| Write through a stale pointer | Corrupts the new occupant's fields                               | [[integrity\|Integrity]]             |
| New occupant holds pointers   | A corrupted pointer or function pointer can redirect the program | Integrity and control flow           |
| Free the same block twice     | The allocator's records are corrupted (CWE-415, double free)     | Availability, and possibly integrity |

MITRE lists the same consequences for CWE-416: modified memory, crashes, leaked information, and in the worst case code execution when attacker-influenced data overwrites something like a function pointer. C++ objects with virtual functions carry a pointer to a table of function addresses, so a corrupted stale object can redirect a later call; the CS 161 textbook discusses attacks on these pointers. If an attacker can influence what gets allocated into the freed memory, they influence what the stale pointer finds there. Defenders do not need the details. It is enough to know that a UAF can be far worse than a crash.

### Common shapes of the bug

- **Freed in a callee, used by the caller.** A function frees an object as a side effect, and its caller continues using its own pointer. This is the toy below.
- **Two owners.** Two parts of the program each believe they own a block, and both free it: a double free, MITRE's CWE-415, a peer of CWE-416.
- **Container growth.** In C++, a reference or pointer into a `std::vector` dangles when the vector grows and moves its elements to new storage.
- **Error paths.** Cleanup code frees an object on one error path, and later code still uses it.
- **Use after return.** A pointer to a local variable escapes from its function, as in [SYS-01](lesson:SYS-01).

### Ownership models compared

| Model                                 | Who frees, and when                    | Stops use-after-free?                     | Costs and gaps                                                              |
| ------------------------------------- | -------------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Manual (C `malloc` and `free`)        | Whoever the comments say               | Only through discipline                   | Easy to get wrong across functions                                          |
| Single owner (C++ `std::unique_ptr`)  | The owner's destructor, automatically  | Stops leaks and double frees by the owner | Raw pointers and references taken from it can still dangle                  |
| Shared owners (C++ `std::shared_ptr`) | Whoever drops the last reference       | Yes, for code that holds a reference      | Counting overhead; reference cycles leak unless broken with `std::weak_ptr` |
| Garbage collection (Java, Go, Python) | The runtime, once nothing can reach it | Yes, in ordinary code                     | Run-time overhead; files and sockets still need explicit closing            |
| Rust ownership and borrowing          | The owner, when it goes out of scope   | Yes, checked at compile time in safe Rust | Learning curve; `unsafe` code and C libraries are outside the check         |

The Rust book states the borrowing rules plainly: at any time you can have either one mutable reference or any number of immutable references, and references must always be valid. The compiler, it says, "guarantees that references will never be dangling references."

## Worked example

The `shop.example` session service keeps one session per logged-in user in a cache, which owns them. Here is the unsafe version:

```c
struct session {
    char user[16];
    int is_admin;
};

static struct session *cache[8];            /* the cache owns every session */

static void logout(int slot) {
    free(cache[slot]);                      /* the owner frees the session... */
    cache[slot] = NULL;                     /* ...and clears its own pointer */
}

static void handle_request(int slot, int wants_logout) {
    struct session *s = cache[slot];        /* borrowed pointer */
    if (s == NULL)
        return;
    if (wants_logout)
        logout(slot);                       /* frees *s, but s still holds the address */
    printf("request by %s\n", s->user);     /* BUG: use after free */
}
```

**Step 1: label every pointer as owner or borrower.** `cache[slot]` is the owner. `s` is a borrow, valid only while the cache still holds the session.

**Step 2: find where each borrow must end.** The borrow must end before `logout` frees the session. Here it does not: `s` is used after the call.

**Step 3: notice why the cleanup was not enough.** `logout` dutifully clears `cache[slot]`, but that is the owner's copy. `s` is a separate copy, and nothing updates it.

**Repair 1, in C: finish with the borrow before the owner frees.** Reorder the work so the last use of `s` comes first, and make the end of the borrow visible:

```c
static void handle_request(int slot, int wants_logout) {
    struct session *s = cache[slot];        /* borrowed: valid only until logout() */
    if (s == NULL)
        return;
    printf("request by %s\n", s->user);     /* last use of the borrow */
    s = NULL;                               /* the borrow ends here */
    if (wants_logout)
        logout(slot);                       /* only the owner frees, after the last use */
}
```

This works, but only because a person checked the order. A later edit that moves the `printf` below `logout` brings the bug back, and the compiler will likely not object.

**Repair 2, in C++: share ownership.** With `std::shared_ptr`, the handler holds its own reference, so `logout` only drops the cache's reference and the session lives until the handler finishes:

```cpp
std::map<int, std::shared_ptr<Session>> cache;    // the cache holds one reference

void logout(int slot) {
    cache.erase(slot);                            // drops the cache's reference only
}

void handle_request(int slot, bool wants_logout) {
    auto it = cache.find(slot);
    if (it == cache.end())
        return;
    std::shared_ptr<Session> s = it->second;      // the handler holds its own reference
    if (wants_logout)
        logout(slot);                             // the session survives: s still owns it
    std::cout << "request by " << s->user << "\n";
}                                                 // last reference gone: freed here
```

The guarantee now comes from reference counting at run time rather than from reviewers. The cost is a counter update on every copy, and a design question: should a logged-out session really stay alive until the request ends? Here that is acceptable. Sometimes the better design is a non-owning `std::weak_ptr`, which the handler must check before each use and which reports when the session is gone.

**Repair 3, in Rust: let the compiler refuse the bug.** Translated directly, the unsafe shape does not compile:

```rust
fn handle_request(cache: &mut HashMap<u32, Session>, slot: u32, wants_logout: bool) {
    let s = match cache.get(&slot) {        // s borrows the session inside the cache
        Some(s) => s,
        None => return,
    };
    if wants_logout {
        cache.remove(&slot);                // rejected: the session is still borrowed
    }
    println!("request by {}", s.user);
}
```

The compiler reports error E0502, "cannot borrow `*cache` as mutable because it is also borrowed as immutable," and points at the borrow, the removal and the later use. The accepted version moves ownership out of the cache, so the program frees the session exactly once, after its last use:

```rust
fn handle_request(cache: &mut HashMap<u32, Session>, slot: u32, wants_logout: bool) {
    if wants_logout {
        if let Some(s) = cache.remove(&slot) {  // ownership moves out of the cache
            println!("logout by {}", s.user);
        }                                       // s goes out of scope: freed exactly once
    } else if let Some(s) = cache.get(&slot) {  // a short borrow, ended before any removal
        println!("request by {}", s.user);
    }
}
```

The three repairs differ in where the guarantee comes from: human review in C, run-time counting in C++, and a compile-time proof in Rust.

## Defenses

- **Design ownership explicitly.** Give every heap object one owner, document every borrow, and never store a borrowed pointer somewhere that outlives the borrow. *Limits:* in C this is a convention that only reviewers enforce.
- **Use RAII and smart pointers in C++.** Resource acquisition is initialization (RAII) ties freeing to a destructor, so `std::unique_ptr` and `std::shared_ptr` free objects automatically and exactly once. *Limits:* raw pointers and references taken from them can still dangle, as the vector example in the exercise shows.
- **Choose memory-safe languages for new code.** Garbage collection and Rust's borrow checker rule out use-after-free in ordinary code. *Limits:* `unsafe` blocks and calls into C libraries are outside the guarantee.
- **Null pointers after free.** CWE-416 lists this as [[defense-in-depth]]: a null dereference usually just crashes. *Limits:* it protects one copy, and MITRE notes it helps less when many structures hold pointers.
- **Test for lifetime bugs.** AddressSanitizer reports heap use-after-free and double free, with stack traces for the bad access, the free and the original allocation. GCC's `-Wuse-after-free` warning, enabled by `-Wall` in recent versions, catches simple cases at compile time. *Limits:* the warning misses bugs that cross function boundaries, like the toy here, and ASan sees only paths that tests execute.
- **Harden the allocator and the hardware.** Hardened allocators detect some misuse, such as an obvious double free, and make exploitation less reliable. Hardware memory tagging, such as Arm's Memory Tagging Extension (MTE), is emerging. *Limits:* CISA and its partners point out that a hardened allocator does not remove the vulnerability itself.

## Common misconceptions

- **"Setting the pointer to NULL after free prevents use-after-free."** It clears one copy. Every other copy still dangles, as `s` did in the toy.
- **"A use after free always crashes."** Often it silently reads garbage or another object's data. The toy's normal build may print a corrupted user name and keep going.
- **"Smart pointers make C++ memory safe."** They manage ownership, but a reference into a container or a raw pointer from `get()` can still outlive the object.
- **"Garbage-collected languages have no lifetime bugs."** They prevent use-after-free in ordinary code, but using a file or connection after closing it is the same mistake one level up.
- **"Rust cannot have use-after-free."** Safe Rust prevents it. Code inside `unsafe` blocks, and C libraries that Rust calls, can still have it.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Use your own Linux machine, Windows Subsystem for Linux, or a virtual machine. Each program is a deliberately buggy toy that only touches its own memory.

1. Put the unsafe worked example into `session_uaf.c`, with `#include <stdio.h>`, `<stdlib.h>` and `<string.h>` at the top and this `main`:

```c
int main(void) {
    cache[3] = calloc(1, sizeof *cache[3]);
    if (cache[3] == NULL)
        return 1;
    snprintf(cache[3]->user, sizeof cache[3]->user, "%s", "alice");
    handle_request(3, 0);
    handle_request(3, 1);
    return 0;
}
```

   Build it with `gcc -Wall -Wextra -g -O0 session_uaf.c -o session_uaf` and run it. The second line of output may show garbage instead of `alice`, with no error at all. Notice that `-Wall` gave no warning here, because the free happens inside another function.

2. Rebuild with `-fsanitize=address` and run it again. ASan reports a `heap-use-after-free` and prints three stack traces. Match each one to the code: where the stale read happened (the first frames are inside `printf`; look for `handle_request`), where the block was freed (`logout`, called from `handle_request`), and where it was allocated (`main`).
3. Apply Repair 1 and confirm that the ASan build runs cleanly. Then add a third call, `handle_request(3, 0)`, and confirm that the empty slot is handled safely.
4. Try a double free. Save this as `double_free.c` and build it with and without ASan:

```c
/* double_free.c: a deliberately buggy toy. Two owners both free the same block. */
#include <stdlib.h>

int main(void) {
    char *receipt = malloc(32);
    char *copy = receipt;          /* BUG: a second "owner" of the same block */
    free(receipt);
    free(copy);                    /* double free */
    return 0;
}
```

   Recent GCC versions warn at compile time that `copy` is used after `free`. Without ASan, your C library may stop the program with a message such as `double free detected`. With ASan, the report begins `attempting double-free`.

5. Try the C++ container case. Save this as `cart.cpp` and build it with `g++ -Wall -Wextra -g -O0 -fsanitize=address cart.cpp -o cart`:

```cpp
// cart.cpp: a deliberately buggy toy. A reference into a vector dangles after it grows.
#include <iostream>
#include <vector>

int main() {
    std::vector<int> prices{1299};       // one price, in cents
    const int &first = prices[0];        // a reference into the vector's storage
    prices.push_back(450);               // may move the elements to new storage
    std::cout << first << "\n";          // BUG: first may refer to freed storage
}
```

   ASan reports a `heap-use-after-free` on the line that prints `first`, freed by the `push_back`. Fix it by reading `prices[0]` again after the vector grows, or by remembering an index instead of a reference.

6. If you have Rust installed, compile the rejected and accepted `handle_request` versions with a small `main` that inserts alice's session into a `HashMap`. Read the E0502 message and identify the three places it points to.
7. On paper, list every pointer in `session_uaf.c`, mark it owner or borrower, and write down the exact point where each borrow must end.

## Key takeaways

- Freeing an object ends its lifetime but leaves every copy of its address behind. Each copy is a dangling pointer.
- The allocator reuses freed memory, so a use after free can read or corrupt a different object, which is why it ranks 7th in the 2025 CWE Top 25.
- One owner that frees each object exactly once, and borrowers that stop before that, prevents both use-after-free and double free.
- C relies on discipline, C++ smart pointers enforce ownership at run time, and Rust's borrow checker rejects dangling references at compile time.
- AddressSanitizer pinpoints the bad access, the free and the allocation, but only on paths your tests run. Nulling pointers and hardened allocators reduce harm without removing the bug.

## Go deeper

- The [Rust book's chapter on references and borrowing](https://doc.rust-lang.org/book/ch04-02-references-and-borrowing.html) builds the borrowing rules from small examples, including a function that tries to return a dangling reference. Which C bugs from this lesson would each rule have prevented?
- MITRE's [CWE-416](https://cwe.mitre.org/data/definitions/416.html) places use after free under CWE-825 (expired pointer dereference) and lists real CVEs as observed examples. Pick one and identify the owner, the borrower and the missing end of the borrow.
- [The Case for Memory Safe Roadmaps](https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps) weighs allocator hardening, sandboxing and hardware such as memory tagging against moving to memory-safe languages. Under what conditions is each the better investment?
