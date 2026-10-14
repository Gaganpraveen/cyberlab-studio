---
topicId: SYS-06
title: Race conditions and time-of-check/time-of-use
summary: Learn why concurrent code that reads, decides and writes in separate steps can lose updates or act on stale checks, how time-of-check/time-of-use flaws arise in files and databases, and how locks, atomic operations and single-step system calls or queries close the window.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how interleaved read-modify-write and check-then-act sequences lose updates or act on stale information.
  - Identify the check, the use and the window between them in file-system and database code.
  - Enumerate every interleaving of a small, bounded race and use the result to show whether a fix is correct.
  - Repair a race with a mutex, an atomic operation, an exclusive-create system call or a conditional database update, and state the limits of each fix.
  - Reproduce a toy data race on your own machine and confirm a fix with repeated runs and ThreadSanitizer.
prerequisites: [SYS-01, SYS-04, FND-05]
concepts: [race-condition, toctou]
labs: []
keywords:
  - race condition
  - data race
  - TOCTOU
  - TOCTTOU
  - time-of-check to time-of-use
  - CWE-362
  - CWE-367
  - check-then-act
  - read-modify-write
  - lost update
  - double spend
  - critical section
  - mutex
  - atomic operation
  - ThreadSanitizer
  - TSan
  - O_EXCL
  - symlink race
  - concurrency
  - transaction isolation
sources:
  - title: 'Computer Security (CS 161 textbook), Chapter 1: Security Principles'
    url: https://textbook.cs161.org/principles/principles.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: "CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization ('Race Condition')"
    url: https://cwe.mitre.org/data/definitions/362.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 'CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition'
    url: https://cwe.mitre.org/data/definitions/367.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 'open(2): Linux manual page'
    url: https://man7.org/linux/man-pages/man2/open.2.html
    publisher: Linux man-pages project (man7.org)
  - title: ThreadSanitizer (Clang documentation)
    url: https://clang.llvm.org/docs/ThreadSanitizer.html
    publisher: LLVM Project
  - title: 'PostgreSQL 18 Documentation, Section 13.2: Transaction Isolation'
    url: https://www.postgresql.org/docs/current/transaction-iso.html
    publisher: The PostgreSQL Global Development Group
quiz:
  - question: In race.c, two threads each run points = points + 1 a million times. Why can the total come out below 2,000,000?
    choices:
      - The processor discards additions when two cores run at the same moment.
      - The counter overflows and wraps around to a smaller number.
      - printf runs before the threads have finished.
      - Each update is a separate load and store, so both threads can load the same old value, and one store then overwrites the other.
    answer: 3
    explanation: The update is a read-modify-write. If thread B loads points after thread A loads it but before A stores, both compute the same new value and one increment is lost. Of the six possible orders of the four memory operations, only two avoid the loss.
  - question: A program calls stat(path) to make sure a file does not exist, then calls open(path, O_WRONLY | O_CREAT | O_TRUNC). Which change removes the time-of-check/time-of-use window?
    choices:
      - Call stat a second time immediately before open, to make the window shorter.
      - Replace both calls with open(path, O_WRONLY | O_CREAT | O_EXCL), which fails if anything already exists at that name, including a symbolic link.
      - Put a mutex around the two calls inside the program.
      - Run the program as root so the open always succeeds.
    answer: 1
    explanation: With O_CREAT and O_EXCL, the kernel checks and creates in one system call, so there is no gap to exploit. A second check only narrows the window, and a mutex coordinates threads of one program, not other processes or users. Running as root makes any mistake worse.
  - question: Why does UPDATE gift_cards SET balance = balance - 50 WHERE id = 7 AND balance >= 50 stop the double spend under PostgreSQL's default Read Committed isolation?
    choices:
      - The second UPDATE waits for the first to commit, then re-evaluates its WHERE clause against the new balance of 0, so it changes no rows and the request is refused.
      - Read Committed runs every transaction one at a time.
      - The database remembers the balance the first request read and gives the same value to the second.
      - Parameterized queries cannot run concurrently.
    answer: 0
    explanation: PostgreSQL documents that an UPDATE finding a row changed by a concurrent transaction waits for that transaction and then re-checks its WHERE condition on the updated row. Because the check and the debit are one statement, no interleaving lets both requests see 50.
  - question: After you compile race.c with -O2, a thousand runs all print 2,000,000. What does that show?
    choices:
      - The optimizer made the update atomic, so the race is fixed.
      - Programs compiled with -O2 run their threads one at a time.
      - Very little. The data race is still undefined behavior; the optimizer only shrank the window until it rarely shows, and ThreadSanitizer still reports it.
      - The mutex is added automatically at -O2.
    answer: 2
    explanation: Assuming no other thread touches points, the compiler may replace the loop with one addition of 1,000,000, which changes the timing, not the correctness. Passing runs are evidence about the schedules you happened to get, nothing more.
  - question: A set-user-ID program calls access(path, W_OK) and then open(path, O_WRONLY). Why is this dangerous even though access checks the invoking user's rights?
    choices:
      - access checks the effective user ID, which belongs to the program's owner.
      - Both calls take a name, so the name can be re-pointed to a different file between the check and the open, and the open runs with the program's elevated rights.
      - access always succeeds for set-user-ID programs.
      - open ignores the result of access and refuses the file.
    answer: 1
    explanation: access deliberately checks the real user ID, but a name is only a pointer that can change. The access(2) manual page warns that the gap between checking and opening is a security hole. The fix is to open the file with the user's own identity, so open's own permission check is the check.
---

## Why it matters

A [[race-condition]] is a bug whose outcome depends on the timing of activities that share something: threads updating one variable, processes using one file, or web requests changing one database row. MITRE's CWE-362 describes code that needs temporary, exclusive access to a shared resource, "but a timing window exists in which the shared resource can be modified by another code sequence." A [[toctou]] (time-of-check to time-of-use) flaw, CWE-367, is the special case where a program checks a resource, then acts on the result, but the resource changes in between.

The steps a race interleaves are often security checks. MITRE lists consequences from crashes and corrupted data to reading or writing files the attacker could not otherwise reach, and gaining privileges. The CS 161 textbook's example is an ATM that checks the balance, then pays out. Pause one ATM between those steps, withdraw the same money at a second ATM, let the first finish, and the bank pays twice.

Races are also hard to find: whether a run fails depends on scheduling, core count and load, so a racy program can pass a thousand tests and fail on the next. MITRE warns that stress testing misses races "with very narrow timing windows." This lesson shows how races arise, how to reason about every interleaving of a small, bounded example, and how to close the window rather than shrink it.

## The core idea

Start with the assumptions. Two or more threads or processes run concurrently, in parallel on several cores or taking turns on one. The scheduler may pause any of them between any two instructions or system calls. They share a resource, and at least one of them changes it.

Any multi-step operation can then be interleaved with another. Two patterns cause most trouble:

- **Read-modify-write.** Read a value, compute a new one, write it back. If another thread writes in between, one update is lost.
- **Check-then-act.** Check a condition (the balance covers the price, the file does not exist), then act on it. If the condition changes in between, the action rests on a stale decision.

Picture two roommates who each open the fridge, see no milk and go out to buy some. Each check was true when made, and stale when acted on. The cure is to make the sequence atomic: indivisible from the point of view of anyone else using the resource. Either a lock lets only one actor run the sequence at a time (mutual exclusion), or a single operation provided by the processor, the [[kernel]] or the database does the whole job at once.

## How it works

### Lost updates: counting interleavings

In C, `points = points + 1` looks like one step, but the processor performs three: load `points` into a register, add 1, and store the register back. Only the load and the store touch shared memory. The table follows two threads, A and B, that both start from `points = 41`.

| Step | Thread A        | Thread B        | `points` in memory |
| ---- | --------------- | --------------- | ------------------ |
| 1    | Load 41         |                 | 41                 |
| 2    |                 | Load 41         | 41                 |
| 3    | Add 1, store 42 |                 | 42                 |
| 4    |                 | Add 1, store 42 | 42                 |

Both threads did their work, yet the result is 42, not 43. Because this toy is bounded (two threads, two memory operations each), we can check every order of the four operations. There are six, and only the two in which one thread stores before the other loads give 43. Which order happens depends on the scheduler, the cores and the caches, so the bug comes and goes.

### Data races in C and C++

When two threads access the same memory location, at least one writes, and nothing orders them (no lock, no atomic operation), the program has a data race. In C and C++ that is [[undefined-behavior|undefined behavior]], like the out-of-bounds write in [SYS-02](lesson:SYS-02); in [cppreference's](https://en.cppreference.com/w/c/language/memory_model) words, "If a data race occurs, the behavior of the program is undefined." So the compiler may assume no other thread touches a plain variable and optimize accordingly, as the exercise shows.

A data race and a race condition differ. Making each access atomic removes the data race, but a race condition remains if a check and the action that depends on it are separate atomic steps. The worked example's gift card has no data race, since the database executes each statement atomically, yet it still pays out twice.

### Time of check to time of use

CWE-367 defines a TOCTOU flaw as a check of a resource's state followed by a use, where the state "can change between the check and the use in a way that invalidates the results of the check." File systems are the classic setting: most file calls take a path name, and a name is only a pointer that other processes may be able to re-point.

Consider a function that refuses to overwrite an existing file:

```c
/* BUG: check by name, then use by name */
int create_draft(const char *path) {
    struct stat st;
    if (stat(path, &st) == 0) {              /* time of check: is the name free? */
        fprintf(stderr, "%s already exists\n", path);
        return -1;
    }
    /* window: another process can create the name, or a link, right here */
    return open(path, O_WRONLY | O_CREAT | O_TRUNC, 0600);   /* time of use */
}
```

If `path` is in a directory other users can write, another user could create a [[symbolic-link]] at that name during the window, pointing at one of your files, and `open` would follow it and truncate your file. The fix is not a faster check but no separate check at all: ask the kernel to check and create in one system call.

```c
/* FIX: one system call checks and creates, atomically */
int create_draft(const char *path) {
    int fd = open(path, O_WRONLY | O_CREAT | O_EXCL, 0600);
    if (fd < 0)
        perror(path);                        /* EEXIST: something got there first */
    return fd;
}
```

The open(2) manual page specifies that with `O_CREAT` and `O_EXCL` together, `open` fails with `EEXIST` if the name already exists, and that symbolic links are not followed: the call fails "regardless of where the symbolic link points."

The best-known file TOCTOU involves privilege. Before opening a file on a user's behalf, a [[setuid]] program may call `access()`, which checks permission with the user's real ID rather than the program's effective ID. Both calls take a name, so the file checked and the file opened need not be the same; the [access(2) manual page](https://man7.org/linux/man-pages/man2/access.2.html) warns that doing so "creates a security hole, because the user might exploit the short time interval between checking and opening the file to manipulate it." The page's safer alternative is to switch temporarily to the user's real ID and then call `open`, so the kernel's own permission check is the check. Better still, avoid set-user-ID programs ([SYS-04](lesson:SYS-04)). The principle is [[complete-mediation]]: check authority at each access, not by remembering an earlier decision.

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

We reproduce a bounded toy race on paper, then test a fix. The fictional store shop.example accepts gift cards, and alice's card 7 holds $50. Here is its redemption code in Python. The queries are parameterized, so this is not about [SQL injection](lesson:APP-01).

```python
def redeem(db, card_id, price):
    # BUG: the check and the use are separate statements
    (balance,) = db.execute(
        "SELECT balance FROM gift_cards WHERE id = ?", (card_id,)).fetchone()
    if balance < price:                       # time of check
        return False
    db.execute("UPDATE gift_cards SET balance = ? WHERE id = ?",
               (balance - price, card_id))    # time of use
    return True                               # the caller ships the order
```

**Step 1: find the shared resource, the check and the use.** The shared resource is card 7's row. The check is the `SELECT` plus the comparison. The use is the `UPDATE`, which writes a balance computed from the value read earlier.

**Step 2: bound the model.** Two checkouts for a $50 item arrive together, perhaps because alice double-clicks Pay, or because mallory, holding a copy of the card number, sends two at once. Each request has two steps, C (check) and U (use): C1 and U1 for request 1, C2 and U2 for request 2.

**Step 3: enumerate every interleaving.** Each request must check before it uses, so there are exactly six orders.

| Order       | Request 1 | Request 2          | Final balance | Goods shipped      |
| ----------- | --------- | ------------------ | ------------- | ------------------ |
| C1 U1 C2 U2 | Paid      | Refused (reads $0) | $0            | $50, correct       |
| C1 C2 U1 U2 | Paid      | Paid               | $0            | $100, double spend |
| C1 C2 U2 U1 | Paid      | Paid               | $0            | $100, double spend |
| C2 C1 U1 U2 | Paid      | Paid               | $0            | $100, double spend |
| C2 C1 U2 U1 | Paid      | Paid               | $0            | $100, double spend |
| C2 U2 C1 U1 | Refused   | Paid               | $0            | $50, correct       |

Four of six orders ship $100 of goods against a $50 card, and the card ends at $0 in every row, so the balance alone looks normal; only reconciling orders against cards reveals the loss. The diagram shows the order C1 C2 U1 U2.

```sequence
title: Two redemptions race on a $50 gift card
participant R1 as Request 1
participant DB as shop.example database
participant R2 as Request 2
R1 -> DB: SELECT balance of card 7
DB --> R1: 50
R2 -> DB: SELECT balance of card 7
DB --> R2: 50
note: Both checks pass: 50 covers the price
R1 -> DB: UPDATE balance to 0
R2 -> DB: UPDATE balance to 0
note: Two $50 orders ship; the card shows $0
```

**Step 4: apply the fix.** Move the check into the statement that changes the balance:

```python
def redeem(db, card_id, price):
    # FIX: one statement checks and debits; the database makes it atomic
    cur = db.execute(
        "UPDATE gift_cards SET balance = balance - ? "
        "WHERE id = ? AND balance >= ?", (price, card_id, price))
    return cur.rowcount == 1                  # 0 rows changed means refused
```

**Step 5: test the fix against every interleaving.** Each request is now one atomic step, so only two orders exist. The first changes one row, leaving $0; the second finds `balance >= 50` false, changes nothing and is refused. The database guarantees this: PostgreSQL, for example, documents that under its default Read Committed level an `UPDATE` that finds its row changed by a concurrent transaction waits for that transaction to commit, then re-evaluates its `WHERE` clause against the updated row. Both orders ship $50, so the fix is correct for this model.

State the model's limits too: one card, one price, and a database that behaves as documented. An order paid from several cards needs all its debits in one transaction, so they succeed or fail together. An application lock is no substitute, because shop.example runs several web servers and a lock inside one process means nothing to the others. Put atomicity where the shared resource lives.

## Defenses

| Defense                    | What it does                                                               | Limits                                                            |
| -------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Remove sharing             | Each thread gets its own data, or threads pass messages                    | Not always possible                                               |
| Mutex (lock)               | One thread at a time runs the critical section                             | Must cover the whole check and act; risks deadlock and contention |
| Atomic operations          | Hardware read-modify-write on one variable, such as C11 `atomic_fetch_add` | One variable only; two atomic steps are not atomic together       |
| Atomic file operations     | `open` with `O_CREAT` and `O_EXCL`, `mkstemp`, `fstat` on a descriptor     | Earlier directories in a path can change; see `openat` in open(2) |
| Atomic database statements | Conditional `UPDATE`, transactions, unique constraints                     | A separate read, then write, is still racy under Read Committed   |
| Least privilege            | A race in an unprivileged program reaches only what its user could         | Limits damage; the bug remains                                    |
| Detection                  | ThreadSanitizer, stress tests, review for check-then-act                   | Only executed paths; stress tests miss narrow windows             |

Two habits prevent many file races: once you hold a file descriptor, operate on it rather than the name, because a descriptor refers to one specific file and cannot be re-pointed; and never use `access()` to authorize a privileged action.

ThreadSanitizer, built into Clang and GCC, instruments memory accesses and reports data races at run time, naming both accesses and both threads. Its documentation gives typical costs of 5x to 15x in speed and 5x to 10x in memory, so it belongs in testing, and libraries compiled without it can hide races or cause false reports. MITRE notes that white-box analysis, such as code review, can spot common idioms like TOCTOU file operations.

## Common misconceptions

- **"It passed every test, so there is no race."** Tests sample a few schedules; a race can hide for months and appear under new hardware or load. Reason about interleavings and run a race detector.
- **"Races need multiple cores."** One core switches threads whenever the scheduler preempts them, and file TOCTOU flaws involve separate processes, often separate users.
- **"A lock inside my program protects the file."** Other processes never take your lock. Use the operating system's atomic operations.
- **"`volatile` makes a variable thread-safe."** It forces each access to really happen, but the update is still a separate load and store; MITRE's entry says `volatile` "does not necessarily solve the synchronization problem." Use a mutex or C11 atomics.
- **"A faster check closes the window."** It only shrinks it, and an attacker who can retry or slow the system needs to win only once. MITRE offers narrowing the window only as a fallback when operations cannot be made atomic.

## Try it yourself

You will reproduce a bounded toy race (two threads, one variable of its own, a fixed number of steps, well under a second of run time) and test two fixes. You need Linux, macOS or WSL with GCC or Clang.

1. Save this as `race.c`:

   ```c
   /* race.c: a bounded toy race. Two threads each add 1,000,000 points. */
   #include <pthread.h>
   #include <stdio.h>

   #define ROUNDS 1000000

   static long points = 0;                 /* shared by both threads */

   static void *earn(void *arg) {
       (void)arg;
       for (int i = 0; i < ROUNDS; i++)
           points = points + 1;            /* BUG: load, add, store are separate */
       return NULL;
   }

   int main(void) {
       pthread_t a, b;
       pthread_create(&a, NULL, earn, NULL);
       pthread_create(&b, NULL, earn, NULL);
       pthread_join(a, NULL);
       pthread_join(b, NULL);
       printf("points: %ld (expected %d)\n", points, 2 * ROUNDS);
       return 0;
   }
   ```

2. Compile without optimization and run it five times:

   ```bash
   gcc -Wall -Wextra -O0 -pthread race.c -o race
   for i in 1 2 3 4 5; do ./race; done
   ```

   Expect totals below 2,000,000 that change from run to run; most runs on our test machine printed between 1.0 and 1.9 million. If every run prints 2,000,000, the threads probably ran one after the other; try a few more runs. Correctness here depends on luck.

3. Predict, then rebuild with `-O2`. On our test machine (GCC 13, x86-64), the optimizer replaced the whole loop with one instruction that adds 1,000,000, so each thread touched memory once and every run printed 2,000,000. The race is still in the code; the window just became too small to hit.

4. Fix it with a mutex. Replace `earn` with this version, recompile with step 2's commands and run it several times. Every run should print 2,000,000.

   ```c
   static pthread_mutex_t points_lock = PTHREAD_MUTEX_INITIALIZER;

   static void *earn(void *arg) {
       (void)arg;
       for (int i = 0; i < ROUNDS; i++) {
           pthread_mutex_lock(&points_lock);    /* one thread at a time from here... */
           points = points + 1;
           pthread_mutex_unlock(&points_lock);  /* ...to here */
       }
       return NULL;
   }
   ```

   Compare run times with `time ./race`: on our machine the locked version was roughly ten times slower, the price of a million tiny critical sections. For a second fix, include `<stdatomic.h>`, declare `static atomic_long points = 0;`, replace the update with `atomic_fetch_add(&points, 1);` and print `atomic_load(&points)`. It was correct, and faster than the mutex.

5. Detect the race with ThreadSanitizer. We use `-O0` so the report points at the exact line; the documentation recommends `-O1` or higher for speed in larger programs.

   ```bash
   gcc -g -O0 -fsanitize=thread -pthread race.c -o race_tsan
   ./race_tsan
   ```

   The report looks like this (trimmed):

   ```text
   WARNING: ThreadSanitizer: data race (pid=...)
     Read of size 8 at 0x... by thread T2:
       #0 earn race.c:12
     Previous write of size 8 at 0x... by thread T1:
       #0 earn race.c:12
     Location is global 'points' of size 8 at 0x...
   SUMMARY: ThreadSanitizer: data race race.c:12 in earn
   ```

   On our machine, TSan reported the race even on a run whose total came out right, because it checks whether the accesses are ordered by synchronization, not whether the answer looks wrong. Build the mutex version the same way and confirm that the warning disappears.

6. On paper, mark the check, the use and the window in the stat-then-open code above. Then rewrite a script of your own that checks whether a file exists before creating it; in Python, `open(path, "x")` creates a file exclusively and raises `FileExistsError` if the name is taken.

## Key takeaways

- A race condition exists when correctness depends on the timing of operations on a shared resource; read-modify-write and check-then-act sequences are the usual culprits.
- A TOCTOU flaw acts on a stale check. Names can be re-pointed between calls, so check and use must be one operation on the same object.
- Fix races by making the whole sequence atomic where the resource lives: a mutex or atomic operation for threads, `O_CREAT` with `O_EXCL` or a descriptor for files, a conditional `UPDATE` or a transaction for databases.
- Enumerate every interleaving of a small bounded model to expose a bug or confirm a fix; for real programs, add ThreadSanitizer and design review, because passing tests prove little.

## Go deeper

- The gift-card table is a hand-run [[model-checking|model check]]. [Formal modeling](lesson:RES-05) shows how tools explore every interleaving of larger models, and why the number of states forces models to stay small.
- The [open(2) manual page](https://man7.org/linux/man-pages/man2/open.2.html) explains why `openat` exists: directories earlier in a path can change during a call. How would you use it in a program that writes into a shared directory?
- For the buggy `redeem`, use [PostgreSQL's isolation chapter](https://www.postgresql.org/docs/current/transaction-iso.html) to work out which interleavings Repeatable Read and Serializable prevent, and what the application must do when the database aborts a transaction.
- Using the [C memory model](https://en.cppreference.com/w/c/language/memory_model), explain why the mutex creates a happens-before ordering between the two threads' updates, while the plain loop does not.
