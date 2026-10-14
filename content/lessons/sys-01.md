---
topicId: SYS-01
title: Memory layout and memory-safety principles
summary: See how a running program's memory is divided into code, static data, heap and stack, what memory safety means in its spatial and temporal forms, and why knowing every object's owner and lifetime prevents whole classes of vulnerabilities.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Place each object in a small C program in the code, static data, heap or stack region and state its lifetime.
  - Distinguish spatial from temporal memory-safety violations and give an example of each.
  - Explain how a single memory error can corrupt data, hijack control flow or leak information.
  - Map the ownership of every allocation in a small program, naming who frees it and who may only borrow it.
  - Read /proc/self/maps to connect a program's addresses to its memory regions and their permissions.
prerequisites: [FND-02]
concepts: [memory-safety, virtual-memory, stack, heap, undefined-behavior, ownership]
labs: []
keywords:
  - memory layout
  - address space
  - text segment
  - data segment
  - BSS
  - call stack
  - stack frame
  - spatial safety
  - temporal safety
  - undefined behavior
  - UB
  - memory-safe language
  - MSL
  - CWE-119
  - CWE-1399
  - /proc/self/maps
sources:
  - title: 'Computer Security (CS 161 textbook), Chapter 2: x86 Assembly and Call Stack'
    url: https://textbook.cs161.org/memory-safety/x86.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'The Case for Memory Safe Roadmaps'
    url: https://www.cisa.gov/resources-tools/resources/case-memory-safe-roadmaps
    publisher: CISA, NSA, FBI and international partners
    license: No explicit license found (marked TLP:CLEAR)
  - title: 'CWE-119: Improper Restriction of Operations within the Bounds of a Memory Buffer'
    url: https://cwe.mitre.org/data/definitions/119.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: Eliminating Memory Safety Vulnerabilities at the Source
    url: https://security.googleblog.com/2024/09/eliminating-memory-safety-vulnerabilities-Android.html
    publisher: Google Online Security Blog
  - title: Undefined behavior (C language reference)
    url: https://cppreference.com/c/language/behavior
    publisher: cppreference.com
  - title: 'proc_pid_maps(5): Linux manual page'
    url: https://www.man7.org/linux/man-pages/man5/proc_pid_maps.5.html
    publisher: Linux man-pages project (man7.org)
quiz:
  - question: In the worked example, where does the struct order created by order_new live, and when does its lifetime end?
    choices:
      - On order_new's stack frame; it ends when order_new returns.
      - On the heap; it ends when its owner, main, calls free on it.
      - In static data; it ends when the program exits.
      - In read-only data next to the string "shop.example".
    answer: 1
    explanation: malloc returns heap memory, which lives until someone frees it, no matter which function allocated it. order_new returns the pointer, so ownership moves to main, which frees the order exactly once. Only the pointer variable inside order_new lived on its stack frame.
  - question: Which of these is a temporal memory-safety violation rather than a spatial one?
    choices:
      - Writing element 10 of a 10-element array.
      - Copying a 40-byte string into a 16-byte buffer.
      - Reading through a pointer to a local variable after its function has returned.
      - Reading one byte before the start of a heap buffer.
    answer: 2
    explanation: Spatial errors go outside an object's bounds; temporal errors use an object outside its lifetime. A function's local variables stop existing when it returns, so the pointer dangles even though its address may look valid. The other three choices all step outside an object's bounds.
  - question: On x86, why can writing past the end of a local array change where a function returns?
    choices:
      - The return address is saved in the same stack frame at a higher address than the locals, and arrays fill toward higher addresses.
      - The return address is stored on the heap next to recently allocated objects.
      - The CPU reloads the program's code from the stack before every return.
      - Local arrays are stored inside the code region, next to the instructions.
    answer: 0
    explanation: A frame holds, from higher to lower addresses, the arguments, the return address, the saved frame pointer and the locals. Indexing past the end of a local array moves toward higher addresses, so an overflow runs into the saved control data instead of away from it.
  - question: 'A teammate says: "Our C service is built with ASLR and stack canaries, so it is memory safe." What is the best response?'
    choices:
      - Correct. Together those two features guarantee spatial and temporal safety.
      - Correct, but only if the service is also compiled with optimizations turned on.
      - Memory safety only matters for operating-system kernels, so the question does not apply.
      - Those are mitigations that make exploitation harder. Out-of-bounds and use-after-free accesses can still happen, and some can still be exploited.
    answer: 3
    explanation: ASLR randomizes addresses and canaries detect one pattern of stack overwrite. Neither adds bounds or lifetime checks, so the bug classes remain. CISA and its partners note that both have well-known bypasses, such as leaking addresses. Memory safety comes from the language, from careful code, or from runtime checks.
  - question: order_print receives a const struct order pointer and is documented as borrowing the order. What does borrowing permit?
    choices:
      - Freeing the order once it has finished printing, to save memory.
      - Storing the pointer in a global variable so later calls can reuse it.
      - Reading the order while the call runs, without freeing it or keeping the pointer afterward.
      - Taking ownership, so main must no longer free the order.
    answer: 2
    explanation: A borrower may use the object only while the owner keeps it alive. Freeing it would make main's later free a double free, and saving the pointer would leave a dangling pointer once main frees the order. Ownership stays with main.
---

## Why it matters

Every running program reads and writes numbered bytes of memory. In C and C++, nothing stops a program from touching the wrong bytes: one past the end of an array, or memory it already gave back. These memory-safety bugs are a leading cause of serious [[vulnerability|vulnerabilities]] in software written in those languages. A December 2023 guide from CISA, the NSA, the FBI and partner agencies from four other countries reports that about 70 percent of Microsoft's CVEs, and about 70 percent of the vulnerabilities found in Google's Chromium project, are memory-safety vulnerabilities. It concludes that about two-thirds of reported vulnerabilities in memory-unsafe languages still relate to memory, and it urges software makers to publish roadmaps for moving to memory-safe languages.

There is evidence that the approach works. Google reports that memory-safety issues were 76 percent of Android vulnerabilities in 2019 and 24 percent in 2024. Over that period the Android team focused on writing new code in memory-safe languages instead of rewriting its existing C and C++.

This lesson builds the mental model the rest of this domain uses: where a program's data lives, how long it lives, and who is responsible for it. With that model you can read a memory bug report and say what went wrong and which defense would have helped.

## The core idea

To the hardware, memory is one long row of numbered bytes. A programming language lays *objects* over that row: an `int` here, a 16-byte array there, a structure somewhere else. Every object has two properties a correct program must respect:

- **Bounds**: where the object starts and how many bytes it covers.
- **Lifetime**: when the object comes into existence and when it stops existing.

[[memory-safety|Memory safety]] means every memory access stays inside the bounds and the lifetime of an object the program legitimately obtained. Breaking the first rule is a *spatial* violation, such as writing the 17th byte of a 16-byte array. Breaking the second is a *temporal* violation, such as reading heap memory after it was freed. Some definitions also count reading uninitialized memory and treating bytes as the wrong type.

An analogy helps. A hotel key card should open one room (bounds), and only during your stay (lifetime). Memory-safe languages such as Java, Python, Go and Rust issue key cards that every door checks. C and C++ hand you a master key and trust you to remember which room is yours and when you checked out. Memory-safety vulnerabilities are the times programmers forget.

One assumption matters before the mechanism: standard C checks neither property while the program runs (testing tools can add checks, as [SYS-02](lesson:SYS-02) shows). An out-of-bounds or after-lifetime access is [[undefined-behavior|undefined behavior]], so the C standard places no restrictions on what happens next. In practice the program reads or writes whatever happens to be at that address. What is there depends on the program's state, and an attacker may have shaped that state.

## How it works

### One address space, four regions

When the operating system starts a program, it gives the process a private [[virtual-memory|virtual address space]]. The kernel maps those addresses onto physical memory one page (commonly 4 KiB) at a time, and the processor enforces the mapping on every access. Each page carries permissions: readable, writable, executable. Because each process has its own mappings, a process cannot directly address another process's memory; any sharing goes through the kernel. That is where [[process-isolation]] starts (see [SYS-05](lesson:SYS-05)).

Inside that space, a C program's data falls into four classic regions. The CS 161 textbook draws them from low to high addresses:

| Region      | What it holds                                                      | Lifetime                   | Managed by              | Usual permissions                 |
| ----------- | ------------------------------------------------------------------ | -------------------------- | ----------------------- | --------------------------------- |
| Code (text) | Machine instructions                                               | Whole run                  | Loader                  | Read, execute                     |
| Static data | Globals, `static` variables, string literals (in a read-only part) | Whole run                  | Loader                  | Read, write (literals: read only) |
| Heap        | Objects from `malloc` or `new`                                     | Until `free` or `delete`   | The programmer          | Read, write                       |
| Stack       | Local variables, arguments, return addresses                       | Until the function returns | Compiler-generated code | Read, write                       |

In this classic picture, the [[heap]] grows toward higher addresses as the program allocates. The [[stack]] grows toward lower addresses as functions call other functions. Real systems add more mappings, such as shared libraries, and randomize where each region starts, but the four-region picture is the right first model.

Page permissions are coarse. The hardware stops writes to code, but nothing at the page level stops a pointer meant for one heap object from overwriting its neighbor. Memory safety is a property of individual objects, which are usually much smaller than pages.

### The stack frame

Each function call gets a *stack frame*. In the 32-bit x86 convention the CS 161 textbook describes, the caller pushes the arguments, and the `call` instruction saves the *return address*, the place to resume in the caller. The called function then saves the caller's frame pointer and reserves space for its local variables. From higher to lower addresses, a frame holds the arguments, the return address, the saved frame pointer, and the locals. On 64-bit x86 the first few arguments travel in registers, but the return address still sits on the stack above the locals.

That ordering is why stack bugs are so dangerous. Array elements sit at increasing addresses, so writing past the end of a local array runs *toward* the saved frame pointer and return address. Lesson [SYS-02](lesson:SYS-02) covers this kind of [[buffer-overflow]] and the compiler defenses placed in its way.

### Three ways a memory error causes harm

An invalid access does not stop a C program. It touches some other object, and the damage depends on what that object is:

1. **Corrupted data.** A write lands in a neighboring variable, such as an `is_admin` flag or a length field. This attacks [[integrity]].
2. **Hijacked control flow.** A write lands in data that decides which code runs next: a return address, a function pointer, or a C++ object's pointer to its table of virtual functions. The attacker then chooses where execution goes.
3. **Information leak.** A read returns bytes from a neighboring object, such as a key, a password, or an address that weakens another defense. This attacks [[confidentiality]].

A crash is the lucky outcome: it hurts [[availability]], but at least it announces the bug. MITRE's CWE-119, the parent class for most of these errors, lists the same consequences: unauthorized code execution, modified memory, read memory and denial of service. For labeling real vulnerabilities, MITRE asks for a more specific child, such as CWE-787 (out-of-bounds write) or CWE-125 (out-of-bounds read).

### Spatial and temporal errors

| Kind     | What goes wrong                     | Typical C cause                                                | Example CWE ids                                                                      |
| -------- | ----------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Spatial  | Access outside an object's bounds   | Unchecked index or copy length, off-by-one loop                | CWE-787 (write), CWE-125 (read)                                                      |
| Temporal | Access outside an object's lifetime | Using freed memory, freeing twice, returning a local's address | CWE-416 (use after free), CWE-415 (double free), CWE-562 (returning a stack address) |

Temporal errors include [[use-after-free]], which happens through a [[dangling-pointer]]: a pointer that still holds the address of an object that no longer exists. Lesson [SYS-03](lesson:SYS-03) treats them in depth.

### Ownership: who frees what

Lifetime bugs are the subtle ones, because the code that allocates an object, the code that uses it, and the code that frees it may be far apart. The discipline that keeps them consistent is [[ownership]]:

- In the simplest scheme, every heap object has exactly one **owner**, the variable or data structure responsible for freeing it exactly once. (Some designs share ownership through a reference count.)
- Ownership can **move**. A function that returns a freshly allocated object hands ownership to its caller.
- Other code may **borrow** the object, using a pointer to read or change it. A borrower must not free the object and must not keep the pointer after the owner frees it.

C cannot express these rules in its type system. They live in comments, naming conventions and the programmer's memory. Rust checks them when it compiles your code, and C++ expresses them with smart pointers such as `std::unique_ptr`.

## Worked example

The order service at `shop.example` has a small C module. Read it, then map every object it creates.

```c
#include <stdio.h>
#include <stdlib.h>

static const char *store = "shop.example";  /* pointer: static data; text: read-only data */
static int orders_today;                    /* static data, starts at zero */

struct order {
    char item[16];
    int quantity;
};

/* Returns a new order. The caller becomes its owner and must free it. */
struct order *order_new(const char *item, int quantity) {
    struct order *o = malloc(sizeof *o);    /* the object lives on the heap */
    if (o == NULL)
        return NULL;
    snprintf(o->item, sizeof o->item, "%s", item);  /* bounded copy */
    o->quantity = quantity;
    orders_today++;
    return o;                               /* ownership moves to the caller */
}

/* Borrows the order: reads it, never frees it, keeps no copy of the pointer. */
void order_print(const struct order *o) {
    char line[64];                          /* stack: gone when this function returns */
    snprintf(line, sizeof line, "%s: %d x %s", store, o->quantity, o->item);
    puts(line);
}

int main(void) {
    struct order *o = order_new("blue mug", 2);  /* main now owns the order */
    if (o == NULL)
        return 1;
    order_print(o);                         /* lend it out */
    free(o);                                /* the owner frees it exactly once */
    o = NULL;                               /* leave no dangling copy behind */
    printf("orders today: %d\n", orders_today);
    return 0;
}
```

**Step 1: list the objects and place them.** Go line by line and ask, "Where do these bytes live, and when do they die?"

| Object                                    | Region                      | Lifetime                    | Owner, and who frees it                |
| ----------------------------------------- | --------------------------- | --------------------------- | -------------------------------------- |
| Machine code of the three functions       | Code                        | Whole run                   | Loader; never freed                    |
| The characters `"shop.example"`           | Static data, read-only part | Whole run                   | Loader; never freed                    |
| `store` and `orders_today`                | Static data, writable part  | Whole run                   | Loader; never freed                    |
| The `struct order` from `malloc`          | Heap                        | From `malloc` until `free`  | `main` after the move; `main` frees it |
| `o` inside `order_new`, `o` inside `main` | Stack (or a register)       | Until each function returns | Automatic                              |
| `line` inside `order_print`               | Stack                       | Until `order_print` returns | Automatic                              |

**Step 2: follow ownership.** `order_new` allocates the order and returns it, so ownership moves to `main`. `order_print` only borrows it: its `const` parameter says it will not change the order, and its comment says it keeps no copy. `main` frees the order exactly once. It then sets its pointer to `NULL`, so a later mistaken use typically crashes at once on the null pointer instead of silently touching freed memory.

**Step 3: check every pointer against its target's lifetime.** No pointer here is used after its target dies. `store` points to a literal that lasts the whole run. The `o` inside `order_new` dies before the order does, `order_print`'s parameter dies while the order is still alive, and `main`'s `o` is reset to `NULL` the moment the order is freed. The copies are bounded by `sizeof`, so the spatial side is safe too.

**Step 4: find the planted bug.** A teammate proposes this helper:

```c
/* BUG: returns the address of a buffer whose lifetime ends at the return. */
const char *order_label(const struct order *o) {
    char label[32];
    snprintf(label, sizeof label, "%d x %s", o->quantity, o->item);
    return label;
}
```

`label` lives in `order_label`'s stack frame, which is reclaimed the moment the function returns. The caller receives a dangling pointer, and the next function call may reuse those bytes. That is a temporal violation even though every copy is bounded. GCC warns about this exact pattern ("function returns address of local variable"). The repair moves ownership of the buffer to the caller, who also states its size:

```c
/* FIX: the caller owns the buffer and says how big it is. */
int order_label(const struct order *o, char *out, size_t out_size) {
    int n = snprintf(out, out_size, "%d x %s", o->quantity, o->item);
    return (n >= 0 && (size_t)n < out_size) ? 0 : -1;  /* -1: error or truncated */
}
```

## Defenses

- **Write new code in a memory-safe language.** Bounds checks and automatic or ownership-based memory management remove most spatial and temporal errors by construction. *Limits:* code marked `unsafe`, calls into C libraries, and bugs in the runtime itself fall outside the guarantee, and logic flaws such as broken [[authorization]] remain. CISA and its partners ask vendors to publish a roadmap with phases and a date after which new systems use memory-safe languages, because the transition takes years.
- **In C and C++, make bounds and ownership explicit.** Pass a length with every buffer, use bounded functions such as `snprintf`, document who frees each allocation, and in C++ use smart pointers. *Limits:* these depend on discipline, and one missed case is enough.
- **Find bugs before attackers do.** Compiler warnings, runtime checkers such as AddressSanitizer (see [SYS-02](lesson:SYS-02)) and fuzzing catch many errors during testing. *Limits:* they only see code paths that the tests actually run.
- **Add exploit mitigations.** [[aslr|Address space layout randomization (ASLR)]], [[stack-canary|stack canaries]] and [[nx-bit|non-executable memory]] make a bug harder to turn into an [[exploit]]. *Limits:* they do not remove the bug, and the CISA guide notes common bypasses, such as leaking an address.
- **Contain the damage.** Running risky code in a [[sandbox]] limits what a compromised process can reach ([SYS-05](lesson:SYS-05)). Together these layers are an example of [[defense-in-depth]].

## Common misconceptions

- **"It did not crash, so the access was fine."** Undefined behavior often succeeds silently, reading or overwriting a neighbor. Crashing is the best case, not the only one.
- **"The stack and the heap are different kinds of memory."** Both are ordinary RAM in the same address space, with the same permissions. Only their lifetime rules differ.
- **"ASLR and canaries make C memory safe."** They are mitigations that raise an attacker's cost. The out-of-bounds or after-free access still happens.
- **"Setting a pointer to NULL after free fixes use-after-free."** It protects only that one variable. Any other copy of the pointer still dangles, which is why ownership must be clear.
- **"A memory-safe language makes a program secure."** It removes one large class of bugs. Injection, broken access control and bad cryptography are still possible.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Use a Linux machine, Windows Subsystem for Linux, or a Linux virtual machine you control. The `/proc` file system used here is Linux-specific.

1. Run `cat /proc/self/maps`. The word `self` means the process reading the file, so this prints the map of `cat` itself. Each line is one mapping: an address range, permissions (`r`, `w`, `x`, then `p` for private or `s` for shared), a file offset, a device, an inode, and a name. Find the lines named `[heap]`, `[stack]` and `[vdso]`, the `cat` program file, and the C library. Which mappings are executable, and are any both writable and executable?
2. Save this program as `where.c`. It prints where four kinds of object live, then prints its own memory map.

```c
/* where.c: print where four kinds of object live, then this process's memory map. */
#include <stdio.h>
#include <stdlib.h>

int counter = 42;                                   /* static data */

int main(void) {
    int local = 7;                                  /* stack */
    int *on_heap = malloc(sizeof *on_heap);         /* heap */
    if (on_heap == NULL)
        return 1;

    printf("code   main     %p\n", (void *)main);   /* POSIX allows this cast */
    printf("static counter  %p\n", (void *)&counter);
    printf("heap   *on_heap %p\n", (void *)on_heap);
    printf("stack  local    %p\n\n", (void *)&local);

    FILE *maps = fopen("/proc/self/maps", "r");     /* Linux only */
    if (maps != NULL) {
        char line[512];
        while (fgets(line, sizeof line, maps) != NULL)
            fputs(line, stdout);
        fclose(maps);
    }
    free(on_heap);
    return 0;
}
```

3. Compile and run it with `gcc -Wall -Wextra -g where.c -o where` and then `./where`. For each printed address, find the map line whose range contains it. You should find `main` in an executable (`r-xp`) line for your program file, `counter` in a writable (`rw-p`) line for the same file, the heap object in `[heap]`, and `local` in `[stack]`.
4. Run `./where` a second time and compare the addresses. They change from run to run because of ASLR, which [SYS-02](lesson:SYS-02) explains.
5. On paper, extend the worked example's table for a version of `main` that creates two orders and keeps both in an array. Who owns each order, who frees each one, and what happens to any pointers left in the array afterward?

## Key takeaways

- A process sees one private virtual address space. A C program's data sits in code, static data, heap and stack regions, each with its own lifetime rule.
- Memory safety has two halves: spatial (stay inside an object's bounds) and temporal (use an object only during its lifetime).
- C checks neither half at run time. A violation is undefined behavior that can corrupt data, hijack control flow or leak secrets.
- Clear ownership, one owner that frees each object exactly once while others only borrow it, prevents most lifetime bugs.
- Memory-safe languages remove most of these bugs by construction. Mitigations such as ASLR only make the remaining bugs harder to exploit.

## Go deeper

- Szekeres, Payer, Wei and Song, "SoK: Eternal War in Memory," [IEEE Symposium on Security and Privacy 2013](https://www.ieee-security.org/TC/SP2013/papers/p2.html), builds a general model of memory-corruption attacks, shows which protection policies stop which attacks, and asks why stricter defenses are rarely deployed.
- The [CHERI project](https://www.cl.cam.ac.uk/research/security/ctsrd/cheri/) of the University of Cambridge and SRI International adds hardware capabilities to conventional processors, giving C and C++ code fine-grained memory protection. What would wide deployment require?
- Google's [Android analysis](https://security.googleblog.com/2024/09/eliminating-memory-safety-vulnerabilities-Android.html) argues that vulnerabilities decay with code age, so writing new code in a memory-safe language helps more than rewriting old code. What evidence would test that claim for your own code base?
