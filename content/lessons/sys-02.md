---
topicId: SYS-02
title: Buffer errors and bounds checking
summary: Learn how out-of-bounds writes and reads happen in C, why they corrupt data, hijack control flow or leak secrets, how to diagnose them in toy programs with AddressSanitizer, and what stack canaries, non-executable memory and ASLR do and do not stop.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Identify the missing or incorrect bounds check in a C function that overflows or over-reads a buffer.
  - Classify a buffer error as an out-of-bounds write (CWE-787) or read (CWE-125) and explain its likely consequences.
  - Repair a vulnerable copy with an explicit length check and test the repair with boundary inputs.
  - Interpret an AddressSanitizer report to locate the faulty access, its size and the buffer it overran.
  - Evaluate what stack canaries, non-executable memory and ASLR prevent, and what each leaves open.
prerequisites: [SYS-01]
concepts: [buffer-overflow, bounds-checking, stack-canary, nx-bit, aslr]
labs: []
keywords:
  - buffer overrun
  - stack smashing
  - heap overflow
  - out-of-bounds write
  - out-of-bounds read
  - over-read
  - off-by-one
  - integer conversion
  - CWE-787
  - CWE-125
  - CWE-120
  - CWE-121
  - CWE-122
  - CWE-119
  - Heartbleed
  - CVE-2014-0160
  - AddressSanitizer
  - ASan
  - -fsanitize=address
  - stack protector
  - DEP
  - W^X
sources:
  - title: 'Computer Security (CS 161 textbook), Chapter 3: Memory Safety Vulnerabilities'
    url: https://textbook.cs161.org/memory-safety/vulnerabilities.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Chapter 4: Mitigating Memory-Safety Vulnerabilities'
    url: https://textbook.cs161.org/memory-safety/mitigations.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'CWE-787: Out-of-bounds Write'
    url: https://cwe.mitre.org/data/definitions/787.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 'CWE-125: Out-of-bounds Read'
    url: https://cwe.mitre.org/data/definitions/125.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use (royalty-free license)
    sourceId: cwe-top-25
  - title: AddressSanitizer (Clang documentation)
    url: https://clang.llvm.org/docs/AddressSanitizer.html
    publisher: LLVM Project
quiz:
  - question: A server copies claimed_len bytes from a request's payload into its reply, where claimed_len is a field in the request. Which check closes the over-read?
    choices:
      - Make the reply buffer large enough for the biggest possible claimed_len.
      - Reject the request unless claimed_len equals the number of payload bytes actually received and fits in the reply buffer.
      - Fill the reply buffer with zeros before copying.
      - Check only that claimed_len is greater than zero.
    answer: 1
    explanation: The bug is trusting a length the client controls. A bigger buffer or zeroing it does not stop the copy from reading past the real payload into neighboring memory. The length must be checked against both what actually arrived and where it is going, which is the Heartbleed lesson.
  - question: A function receives char *buf and uses sizeof buf as the limit for snprintf. What goes wrong?
    choices:
      - Nothing; sizeof always gives the size of the array a pointer refers to.
      - snprintf ignores its size argument when the format string is a literal.
      - The program fails to compile, because sizeof cannot be applied to a pointer.
      - sizeof buf is the size of the pointer itself (often 8 bytes), not of the buffer, so the limit is wrong.
    answer: 3
    explanation: Inside the function, buf is only a pointer, and C pointers do not carry the size of what they point to. sizeof gives the pointer's size. The fix is to pass the buffer's size as a separate parameter, as the repaired save_coupon does.
  - question: Which statement about a stack canary is accurate?
    choices:
      - It detects a contiguous overwrite of the saved return information when the function returns, but it does not protect neighboring local variables or the heap.
      - It prevents any write past the end of a local buffer from happening.
      - It encrypts the return address so that it cannot be read.
      - It checks every array index while the function runs.
    answer: 0
    explanation: The compiler places a random value between the locals and the saved frame pointer and return address, and checks it just before returning. An overflow that reaches the saved data must pass through the canary and change it. Corrupting a neighboring local, a heap object, or skipping over the canary goes unnoticed.
  - question: 'Why is this check unsafe when len is an int: if (len > 64) return; memcpy(dst, src, len);'
    choices:
      - memcpy cannot copy more than 64 bytes at a time.
      - The comparison should be len >= 64 to leave room for a terminator.
      - A negative len passes the check, then converts to an enormous size_t when passed to memcpy.
      - The check must come after the copy to be effective.
    answer: 2
    explanation: memcpy takes a size_t, which is unsigned. A negative int such as -1 is smaller than 64, so it passes the check, and then converts to a value near the maximum of size_t. The fix is to keep sizes in size_t and to reject negative values before any conversion.
  - question: A toy program behaves normally without AddressSanitizer, but an ASan build reports stack-buffer-overflow, WRITE of size 17, on a 16-byte buffer. What is the most likely explanation?
    choices:
      - ASan reports false positives for strings, so the report can be ignored.
      - The copy wrote a 16-character string plus its terminating NUL, one byte past the buffer, and the normal build hid the damage.
      - The stack ran out of space because the buffer was too large.
      - The compiler placed the buffer in read-only memory.
    answer: 1
    explanation: Sixteen characters need 17 bytes with the NUL. The extra byte lands in a neighbor, which often causes no visible symptom, so ordinary tests pass. ASan surrounds each object with poisoned bytes and checks every access, so it catches the off-by-one at once.
---

## Why it matters

A buffer is a fixed-size block of memory, such as a 16-byte array that holds a coupon code. A buffer error reads or writes outside that block. These errors take five places in MITRE's 2025 CWE Top 25 Most Dangerous Software Weaknesses: out-of-bounds write (CWE-787) is 5th, out-of-bounds read (CWE-125) is 8th, the classic unchecked buffer copy (CWE-120) is 11th, and stack-based and heap-based overflows (CWE-121 and CWE-122) are 14th and 16th.

An out-of-bounds read can be as damaging as a write. In 2014, the Heartbleed bug (CVE-2014-0160) in the widely used OpenSSL library trusted a length field in a heartbeat request. When a request claimed more data than it actually carried, the server sent back extra bytes from its own memory. MITRE's description of the bug notes that this memory could include private cryptographic keys and other sensitive data. Nothing crashed, and nothing was overwritten.

This lesson teaches you to diagnose buffer errors in small toy programs: find the buffer, find the access, and find the check that is missing or wrong. That is the skill code reviewers, testers and incident responders use every day.

## The core idea

Every access to a buffer must satisfy one rule: the offset plus the length stays within the buffer's real size. Writing it down is easy. Enforcing it in C is hard for three reasons.

1. **Pointers do not know their limits.** When a C function receives `char *dst`, it gets an address, not a size. Unless the caller also passes the size, the function cannot check anything.
2. **Many library functions do not check.** `strcpy` copies until it finds a terminating NUL byte, however far that is. `gets`, the CS 161 textbook's classic example, reads as much input as the user supplies.
3. **Lengths come from untrusted places.** A length field in a network message, a file header or a user's input is attacker-controlled data, and using it unchecked is the Heartbleed pattern.

[[bounds-checking|Bounds checking]] is the practice of verifying, before the access, that the index or length fits. Memory-safe languages insert the check automatically and stop with an error when it fails. In C, the programmer must write the check, and the right size must be available where the check happens.

A useful picture is a paper form with a box sized for 16 characters. A careful clerk stops at the box's edge. C's `strcpy` keeps writing, onto the next field and beyond, because nothing tells it where the box ends.

## How it works

### Where the extra bytes land

A [[buffer-overflow]] writes past the end, or before the start, of a buffer. What it damages depends on the neighbors:

- **Stack overflows.** A local array sits below the function's saved frame pointer and return address (see [SYS-01](lesson:SYS-01)). Depending on how the compiler arranged the frame, an overflow can corrupt other local variables and then the saved control data. The CS 161 textbook shows how changing a saved return address can redirect execution when the function returns. For defenders, the point is that one unchecked copy can hand control of the program to the input's author.
- **Heap overflows.** A heap buffer sits next to other heap objects and the allocator's own bookkeeping. Overflowing it can change another object's fields, including function pointers, and the effect appears later, far from the bug.
- **Over-reads.** An out-of-bounds read returns a neighbor's bytes. MITRE's CWE-125 lists secrets such as keys, personal data and memory addresses. A leaked address also helps an attacker defeat [[aslr|address randomization]], covered below.

### Common shapes of the bug

| Pattern                 | Vulnerable C                                      | Why it fails                                                    | Repair                                                     |
| ----------------------- | ------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| Unbounded copy          | `strcpy(dst, src)`                                | Copies until the NUL, however long `src` is                     | Check `strlen(src) < dst_size`, then copy                  |
| Off-by-one              | `for (i = 0; i <= n; i++) a[i] = 0;`              | Touches `a[n]`, one past the last element                       | Use `i < n`                                                |
| Forgotten terminator    | `char *p = malloc(strlen(s)); strcpy(p, s);`      | No room for the NUL byte                                        | Allocate `strlen(s) + 1`                                   |
| Trusted length field    | `memcpy(out, msg->data, msg->claimed_len)`        | The sender chooses the length                                   | Compare with the bytes received and the destination's size |
| Signed length           | `if (len > 64) return; memcpy(dst, src, len);`    | With `int len`, -1 passes the check and becomes a huge `size_t` | Keep sizes in `size_t`; reject negatives before converting |
| Size of the wrong thing | `snprintf(buf, sizeof buf, ...)` with `char *buf` | `sizeof` gives the pointer's size, not the buffer's             | Pass the buffer's size as a parameter                      |

The signed-length row is the CS 161 textbook's integer conversion vulnerability. GCC's `-Wsign-conversion` warning flags the implicit conversion from `int` to `size_t` that makes it possible.

### Finding buffer errors with AddressSanitizer

Many buffer errors cause no visible symptom: the extra byte lands in padding or in a variable nobody reads again. AddressSanitizer (ASan) is a compiler feature, available in GCC and Clang with `-fsanitize=address`, that makes them visible. It places poisoned "redzones" around stack, heap and global objects, tracks which bytes are addressable, and checks each load and store in the code it compiled, plus calls to common library functions such as `strcpy`. Its report names the kind of access (read or write), its size, the buffer it overran, and the line of code responsible. The Clang documentation lists out-of-bounds accesses to the heap, stack and globals, use-after-free, double free and several other errors among the bugs it finds, with a typical slowdown of about 2x. It is a testing tool, not something to ship in production builds.

### Mitigations and what they leave open

Because C programs will keep containing some buffer errors, systems add exploit mitigations. They make a bug harder to turn into an [[exploit]]; they do not remove it.

| Mitigation                        | How it works                                                                                               | What it does not stop                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [[stack-canary\|Stack canary]]    | A random value between the locals and the saved frame pointer and return address, checked before returning | Overwrites of other locals or heap objects, writes that skip the canary, an attacker who learns its value |
| [[nx-bit\|Non-executable memory]] | Each page is writable or executable, never both (also called W^X or DEP)                                   | Attacks that reuse code already in memory, and attacks that only change data                              |
| [[aslr\|ASLR]]                    | Each region starts at a random address on every run                                                        | Information leaks that reveal an address; limited randomness on 32-bit systems                            |

The CS 161 textbook stresses that these work best together: with both ASLR and non-executable pages, an attacker typically needs two separate bugs, one to leak an address and one to corrupt memory. Hardware is adding more layers, such as pointer authentication, which stores a keyed check value in the unused upper bits of 64-bit pointers. Each layer raises the cost of an attack. None turns C into a memory-safe language.

The sequence below shows an over-read in the style of Heartbleed against a fictional echo service, and the fix. The attacker's request claims 500 bytes but carries 3. The vulnerable server copies 500 bytes starting at the 3-byte payload and returns 497 bytes of its own memory. The repaired server compares the claimed length with the bytes it actually received and rejects the request.

```sequence
title: An over-read that trusts a length field
participant C as Client
participant S as echo.shop.example
C -> S: Echo request: length 3, data "hat"
S --> C: Reply: "hat"
C -> S: Echo request: length 500, data "hat"
note S: Copies 500 bytes starting at the 3-byte data
S --> C: Reply: "hat" + 497 bytes of server memory
note: The repaired server compares claimed and received lengths
C -x S: Length 500, 3 bytes received: rejected
```

## Worked example

The checkout service at `shop.example` stores a customer's coupon code in a 16-byte buffer. Here is the toy version a teammate wrote, with the bug left in:

```c
/* coupon.c: a deliberately buggy toy. Build and run it only on your own machine. */
#include <stdio.h>
#include <string.h>

static void save_coupon(char *dst, const char *code) {
    strcpy(dst, code);                  /* BUG: copies until the NUL, however far */
}

int main(int argc, char **argv) {
    char coupon[16];
    const char *code = (argc > 1) ? argv[1] : "SPRING-SALE-2026";  /* 16 chars + NUL */
    save_coupon(coupon, code);
    printf("saved coupon: %s\n", coupon);
    return 0;
}
```

Diagnose it in five steps.

1. **Find the buffer and its real size.** `coupon` is a 16-byte array on `main`'s stack frame.
2. **Find every access and the value that limits it.** `strcpy` writes `strlen(code) + 1` bytes, the characters plus the NUL. Nothing compares that number with 16, and `save_coupon` cannot, because it never learns the size.
3. **Ask who controls the value.** The code comes from the command line, standing in for a web form. The user controls its length.
4. **Classify.** It is an out-of-bounds write on the stack: CWE-787, and more specifically CWE-121 (stack-based buffer overflow) and CWE-120 (copy without checking the size of the input). Even the default input is wrong: `SPRING-SALE-2026` has 16 characters, so the copy writes 17 bytes. That off-by-one usually produces no visible symptom.
5. **Repair and test.** Pass the size, check before copying, and refuse input that does not fit rather than silently cutting it short:

```c
/* Returns 0 on success, -1 if the code does not fit (nothing is written). */
static int save_coupon(char *dst, size_t dst_size, const char *code) {
    size_t n = strlen(code);
    if (n >= dst_size)                  /* leave room for the terminating NUL */
        return -1;
    memcpy(dst, code, n + 1);           /* copies the NUL too */
    return 0;
}

/* In main: */
    if (save_coupon(coupon, sizeof coupon, code) != 0) {
        fprintf(stderr, "coupon code too long (max %zu characters)\n", sizeof coupon - 1);
        return 1;
    }
```

Here `sizeof coupon` is correct, because inside `main` `coupon` is the array itself, not a pointer. Test the boundaries: 15 characters must be accepted, while 16 and 17 must be rejected with nothing written. Then rerun the tests under AddressSanitizer to confirm that no access leaves the buffer.

Whether to reject or truncate is a design decision. Truncating a coupon code can silently turn it into a different valid code. Rejecting is usually safer, which is an example of [[input-validation]] at the point where the data is used.

## Defenses

- **Make every buffer access checkable.** Pass a size with every pointer, check offset plus length against it before the access, and prefer interfaces that take a size, such as `snprintf` and `fgets`. *Limits:* a check can still be wrong, for example by forgetting the NUL or mixing signed and unsigned values, so pair checks with tests at the boundaries.
- **Treat lengths from input as untrusted.** Compare claimed lengths with the bytes actually received and with the destination's size, and watch for overflow when computing sizes. *Limits:* this only works where every input is validated, and a single missed path is enough.
- **Prefer bounds-checked code.** Memory-safe languages check every index. In C++, containers such as `std::vector` and `std::string` carry their own sizes, and their `at` member function checks the index. *Limits:* calls into C code and explicitly unsafe code are outside the guarantee, and unchecked operations such as `std::vector`'s `operator[]` remain available.
- **Test with sanitizers and fuzzing.** ASan turns silent overruns into precise reports, and a fuzzer generates many unusual inputs to drive the program into its edge cases. *Limits:* both find bugs only on code paths the tests actually reach.
- **Keep the mitigations on.** Stack canaries, non-executable memory and ASLR are standard in modern compilers and operating systems. *Limits:* as the table shows, each has known gaps. They are [[defense-in-depth]], not a fix.

## Common misconceptions

- **"`strncpy` is the safe version of `strcpy`."** If the source is as long as the limit or longer, `strncpy` does not write a terminating NUL, so the next string operation can over-read. MITRE's CWE-119 entry warns about this pitfall. Check lengths explicitly instead.
- **"Reading past the end is harmless, because nothing is overwritten."** Heartbleed was a read. Over-reads leak secrets and addresses that weaken other defenses.
- **"Stack canaries prevent buffer overflows."** A canary detects one pattern, a contiguous overwrite of saved control data, and only when the function returns. Everything in the canary row of the table is still possible.
- **"If ASan finds nothing, the code has no buffer errors."** ASan only checks the accesses your tests actually execute. Untested paths and unusual inputs can still hide bugs.
- **"Truncating input always makes a copy safe."** It prevents the overflow, but the shortened value may mean something different, and code that assumes the full value is present can misbehave.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Use your own Linux machine, Windows Subsystem for Linux, or a virtual machine. Every program here is a deliberately buggy toy that only touches its own memory.

1. Save the vulnerable `coupon.c` from the worked example. Build it normally with `gcc -Wall -Wextra -g -O0 coupon.c -o coupon` and run `./coupon`. The 17-byte copy into a 16-byte buffer probably prints the coupon with no sign of trouble.
2. Run `./coupon THIS-COUPON-CODE-IS-FAR-TOO-LONG-2026` (37 characters). Many Linux distributions build with stack protection by default, so the program likely stops with `*** stack smashing detected ***` when `main` returns. The stack canary noticed the damage, but only after it had happened.
3. Build an AddressSanitizer version with `gcc -Wall -Wextra -g -O0 -fsanitize=address coupon.c -o coupon-asan` and run `./coupon-asan` with no argument. Read the report, which looks like this (trimmed, with addresses and offsets removed):

```text
ERROR: AddressSanitizer: stack-buffer-overflow on address ...
WRITE of size 17 at ... thread T0
    #0 ... in strcpy
    #1 ... in save_coupon coupon.c:6
    #2 ... in main coupon.c:12
  This frame has 1 object(s):
    [...] 'coupon' (line 10) <== Memory access at offset ... overflows this variable
```

4. Now try an over-read. This toy sums four prices but its loop runs one step too far:

```c
/* prices.c: a deliberately buggy toy that reads one element too far. */
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    size_t count = 4;
    int *prices = malloc(count * sizeof *prices);   /* room for prices[0] .. prices[3] */
    if (prices == NULL)
        return 1;
    for (size_t i = 0; i < count; i++)
        prices[i] = 100 * (int)(i + 1);

    long total = 0;
    for (size_t i = 0; i <= count; i++)             /* BUG: <= reads prices[4] */
        total += prices[i];
    printf("total: %ld\n", total);
    free(prices);
    return 0;
}
```

Build it once normally and once with `-fsanitize=address`. The normal build may print a plausible total. The ASan build reports a `heap-buffer-overflow`, a `READ of size 4`, located just past a 16-byte region.

5. For each report, fill in a short diagnosis: read or write, how many bytes, which buffer and region (stack or heap), which line, which check was missing, and which CWE fits (787 or 125). Then apply the repairs, rebuild with ASan, and test the boundary cases: 15, 16 and 17 characters for the coupon, and the loop limit for the prices.

Your compiler may differ. On some distributions, building with optimization turns on a fortified `strcpy` that stops the program first with `*** buffer overflow detected ***`. That is another hardening layer, and `-O0` keeps this exercise's output simple. Clang accepts the same `-fsanitize=address` flag if its sanitizer runtime is installed.

## Key takeaways

- Every buffer access must keep offset plus length within the buffer's real size, and in C the programmer must carry that size to the place where the check happens.
- Out-of-bounds writes (CWE-787) can corrupt data or redirect control flow. Out-of-bounds reads (CWE-125) leak secrets and addresses, as Heartbleed showed.
- Most buffer bugs follow a few shapes: unbounded copies, off-by-one limits, forgotten terminators, trusted length fields and signed-to-unsigned conversions.
- AddressSanitizer turns silent overruns in tested code into precise reports. Use it, along with boundary tests and fuzzing, before release.
- Stack canaries, non-executable memory and ASLR raise the cost of exploitation, but each has known gaps. Only correct bounds checks or a memory-safe language remove the bug.

## Go deeper

- Serebryany, Bruening, Potapenko and Vyukov, "AddressSanitizer: A Fast Address Sanity Checker," [USENIX ATC 2012](https://www.usenix.org/conference/atc12/technical-sessions/presentation/serebryany), explains the shadow-memory design behind ASan and measures its overhead. Why is a design this fast still unsuitable as a production defense?
- The [CS 161 chapter on mitigations](https://textbook.cs161.org/memory-safety/mitigations.html) analyzes how each mitigation can fail and why combining them helps. For each one, which additional bug would an attacker need?
- MITRE's [CWE-787](https://cwe.mitre.org/data/definitions/787.html) lists more specific children and the weaknesses that can lead to it. Pick a recent out-of-bounds-write CVE and trace its root cause through those relationships.
