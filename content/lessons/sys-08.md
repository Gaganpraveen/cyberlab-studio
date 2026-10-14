---
topicId: SYS-08
title: Side-channel concepts and mitigations
summary: Learn how timing, caches and speculative execution can leak secrets from code that gives correct answers, how Spectre turns speculation into a leak, how to write a constant-time comparison, and how to analyze timing measurements while stating their limitations honestly.
level: advanced
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 45
objectives:
  - Explain what a side channel is and why logically correct code can still leak secrets through timing, caches or power.
  - Describe, at a conceptual level, how Spectre uses speculative execution and a cache side channel to reveal data a program never architecturally read.
  - Rewrite an early-exit comparison as a constant-time comparison and explain what makes it constant time.
  - Analyze synthetic timing measurements with robust statistics and a confidence interval, and state what they cannot show.
  - Select mitigations for a given threat, from constant-time code to isolation and processor updates, and state their costs.
prerequisites: [SYS-01, SYS-05, CRY-02, RES-04]
concepts: [side-channel-attack, timing-attack, spectre, speculative-execution, constant-time-code]
labs: []
keywords:
  - side channel
  - side-channel attack
  - timing attack
  - cache timing
  - microarchitectural attack
  - Spectre
  - Meltdown
  - CVE-2017-5753
  - CVE-2017-5715
  - CVE-2017-5754
  - bounds check bypass
  - branch target injection
  - speculative execution
  - transient execution
  - constant-time code
  - constant-time comparison
  - compare_digest
  - KPTI
  - retpoline
  - site isolation
sources:
  - title: 'Timing Attacks on Implementations of Diffie-Hellman, RSA, DSS, and Other Systems'
    url: https://www.paulkocher.com/doc/TimingAttacks.pdf
    publisher: Paul C. Kocher (author's copy)
  - title: 'Spectre Attacks: Exploiting Speculative Execution (arXiv:1801.01203)'
    url: https://arxiv.org/abs/1801.01203
    publisher: arXiv
  - title: Meltdown and Spectre
    url: https://meltdownattack.com/
  - title: 'Spectre Side Channels (Linux kernel documentation)'
    url: https://docs.kernel.org/admin-guide/hw-vuln/spectre.html
    publisher: The Linux kernel development community
  - title: Constant-Time Crypto (BearSSL)
    url: https://www.bearssl.org/constanttime.html
    publisher: BearSSL (Thomas Pornin)
  - title: 'hmac: Keyed-Hashing for Message Authentication (Python documentation)'
    url: https://docs.python.org/3/library/hmac.html
    publisher: Python Software Foundation
    license: Python Software Foundation License Version 2
quiz:
  - question: tag_equal_leaky always returns the right answer. Why is it still a security problem?
    choices:
      - It sometimes returns 1 for a wrong tag.
      - It copies the secret tag into memory that the caller can read.
      - Its running time grows with the number of leading bytes that match, so someone who can time many guesses can learn the tag a byte at a time.
      - It uses more memory as the tag grows.
    answer: 2
    explanation: The output is correct, but the time it takes is a second output that depends on the secret. That is the definition of a timing side channel. The constant-time version examines every byte regardless of where the first difference is.
  - question: In Spectre variant 1, the processor discards the mis-speculated instructions. Why does the secret still leak?
    choices:
      - The speculative load brought a cache line chosen by the secret into the cache, and the attacker can tell which line by timing memory accesses.
      - The discarded results are written to the system log.
      - The processor prints the secret in an exception message.
      - The operating system copies the secret into the attacker's process.
    answer: 0
    explanation: Discarding undoes architectural effects such as register values, but not microarchitectural ones such as which lines are cached. A cache timing measurement turns that leftover state into data.
  - question: In the synthetic study, 20 samples per guess give a 95% interval of [-16.3, 18.9] ns for the difference in medians. What should you conclude?
    choices:
      - The check is constant time.
      - The check leaks exactly 9 ns.
      - An attacker cannot exploit this check.
      - At this sample size the data cannot distinguish a leak of this size from noise, so the result is inconclusive.
    answer: 3
    explanation: The interval includes zero and is wide, so the data are consistent with no difference and with a large one. With 1,000 samples the interval for the same model excludes zero. Absence of evidence at small sample sizes is not evidence of absence.
  - question: With 1,000 samples, the constant-time version shows no detectable difference. What does that establish?
    choices:
      - The function is constant time on every processor and compiler.
      - Only that this measurement found no difference of a size it could detect; constant-time behavior must also be checked by reviewing the code and the compiled machine code.
      - Any function that uses XOR runs in constant time.
      - An attacker would need exactly 1,000 samples to break it.
    answer: 1
    explanation: Measurements can reveal a leak but cannot prove there is none, and these data are synthetic anyway. BearSSL warns that compilers can turn constant-time source into variable-time machine code, so the compiled output matters.
  - question: A web browser runs JavaScript from many sites on one machine. Which mitigation best limits Spectre-style reads of another site's data?
    choices:
      - Rewrite every website in constant-time code.
      - Disable the processor's cache.
      - Render different sites in different operating-system processes, so another site's data is not in the attacker's address space.
      - Add antivirus signatures for Spectre.
    answer: 2
    explanation: Speculative reads reach data in the attacker's own process most easily, so keeping each site's data in its own process removes the target. Antivirus is a poor fit, because these attacks are hard to tell apart from normal programs.
---

## Why it matters

A program can compute exactly the right answer and still leak its secrets through how it computes: how long it takes, which memory it touches, how much power it draws. A [[side-channel-attack]] observes those effects instead of the program's outputs. In 1996, Paul Kocher showed that "by carefully measuring the amount of time required to perform private key operations, attackers may be able to find fixed Diffie-Hellman exponents, factor RSA keys, and break other cryptosystems."

In January 2018, researchers disclosed Meltdown and [[spectre]], which turned a performance feature of most modern processors into a leak. Their website summarizes the damage: "Meltdown breaks the most fundamental isolation between user applications and the operating system," and "Spectre breaks the isolation between different applications." Exploitation "does not leave any traces in traditional log files." Fixing them took changes to processors' microcode, operating systems, compilers and browsers, and some fixes cost performance.

Side channels matter to anyone who handles secrets: password and token checks, cryptographic code, and any system that runs mutually distrusting code on shared hardware, from cloud servers to web browsers.

## The core idea

State the assumptions first. The attacker cannot read the secret directly, but can trigger the operation that uses it many times and measure something about each run, such as its duration or the state of a shared cache. Each measurement is noisy. The question is whether the measured quantity depends on the secret strongly enough to stand out from the noise after many runs.

Picture a guard who checks a password letter by letter and says "no" at the first wrong letter. You never hear the password, but if you can time how long the guard takes to refuse, a longer pause means more letters were right. That is a [[timing-attack]].

The defense follows from the definition. A side channel exists when something observable depends on a secret, so mitigations either make the observable independent of the secret, as [[constant-time-code]] does, or deny the attacker the ability to observe it, for example through isolation. Adding random noise only raises the number of measurements an attacker needs.

## How it works

### Timing: the early-exit comparison

A service that checks a message authentication tag ([[mac]]) must compare the tag it computed with the one it received. The obvious loop stops at the first difference:

```c
/* LEAKY: stops at the first difference, so time reveals the matching prefix */
int tag_equal_leaky(const unsigned char *a, const unsigned char *b, size_t n) {
    for (size_t i = 0; i < n; i++)
        if (a[i] != b[i])
            return 0;
    return 1;
}

/* CONSTANT TIME: examines every byte; no branch depends on the data */
int tag_equal_ct(const unsigned char *a, const unsigned char *b, size_t n) {
    unsigned char diff = 0;
    for (size_t i = 0; i < n; i++)
        diff |= a[i] ^ b[i];       /* any differing bit sets a bit in diff */
    return diff == 0;
}
```

The leaky version takes longer the more leading bytes match, so an attacker who can submit guesses can, in principle, learn a valid tag one byte at a time. The constant-time version always reads all `n` bytes, its only branch depends on the public length, and it decides once at the end. BearSSL's guide defines constant-time implementations as code that does "not leak secret information through timing analysis," and stresses that branches matter "only if the condition is secret." It also warns that a compiler can turn such source into machine code "that computes the right value but with a variable time," so in practice use a vetted function. Python's `hmac.compare_digest` is designed "to prevent timing analysis by avoiding content-based short circuiting behaviour."

Timing attacks are not limited to local programs: BearSSL notes that "timing attacks against network servers are practical," although they usually need many samples.

### Caches

Processors keep recently used memory in small, fast caches. A cache hit takes a few cycles; a miss can take far longer. If a victim's memory accesses depend on a secret, for example a table lookup indexed by a key byte, then an attacker who shares the cache can later time its own accesses to learn which cache lines the victim touched. BearSSL notes that cache-based leaks "have been successfully leveraged to retrieve secret keys (for both RSA and AES implementations)." Constant-time code therefore also avoids secret-dependent memory addresses.

Who can observe depends on who shares the hardware. Two hardware threads on one core share its caches and branch predictors, cores on one chip share the last-level cache, and virtual machines on one host share all of it. That is why the Linux kernel offers STIBP, which adds "additional isolation between CPU threads running on the same core," and why the Meltdown and Spectre site warns that on some cloud infrastructure "it might be possible to steal data from other customers."

### Speculative execution and Spectre

A modern processor does not wait to learn which way a branch goes. With [[speculative-execution]], it predicts the outcome and runs ahead. If the prediction was wrong, it discards the results: registers and memory return to their correct values. But microarchitectural state, such as which lines are in the cache, is not rolled back.

The Spectre paper describes attacks that induce "a victim to speculatively perform operations that would not occur during correct program execution and which leak the victim's confidential information via a side channel." The Linux kernel documentation describes variant 1, "bounds check bypass" (CVE-2017-5753), as speculation that bypasses conditional branches, and variant 2, "branch target injection" (CVE-2017-5715), as speculation of indirect branches. The diagram shows variant 1 conceptually: code that checks an index before using it to read an array.

```sequence
title: Spectre variant 1, conceptually
participant A as Attacker
participant V as Victim code
participant C as CPU cache
A -> V: Many requests with in-bounds indexes
note V: The predictor learns: check passes
A -> V: One request with an out-of-bounds index
V -> C: Speculatively read a secret; touch a line it selects
note V: Check resolves as failed; results discarded
note C: The touched line is still cached
A -> C: Time accesses to candidate lines
C --> A: One is fast, revealing the secret value
```

Meltdown, CVE-2017-5754, is a related flaw that let user programs read kernel memory on affected processors; operating systems patched it with kernel page-table isolation (KPTI on Linux). Spectre is different: in the website's words, it "is harder to exploit than Meltdown, but it is also harder to mitigate." The kernel documentation lists guest-to-host and guest-to-guest attacks among its scenarios, which is why cloud providers care.

> [!ETHICS] Only test systems you own or have written permission to test.

## Worked example

The activity: analyze synthetic measurements and state their limitations clearly. A fictional team at shop.example wants to know whether its 16-byte tag check leaks timing. Rather than probe a live system, a student builds a model: each call costs 120 ns, plus 3 ns for each byte the check examines, plus random jitter, plus rare interrupts that add 500 to 2,000 ns. **Every number below is synthetic, produced by the `timing_sim.py` script in the exercise.** For each guess with 0 to 3 correct leading bytes, the script draws 1,000 samples.

| Version    | Correct leading bytes | Mean (ns) | Median (ns) | Interquartile range (ns) |
| ---------- | --------------------- | --------- | ----------- | ------------------------ |
| Early exit | 0                     | 155.8     | 123.8       | 34.7                     |
| Early exit | 1                     | 160.3     | 127.8       | 36.4                     |
| Early exit | 2                     | 158.4     | 129.0       | 35.5                     |
| Early exit | 3                     | 169.7     | 134.3       | 35.8                     |
| Constant   | 0                     | 208.8     | 169.5       | 35.6                     |
| Constant   | 3                     | 201.9     | 169.5       | 35.6                     |

**Step 1: choose a robust statistic.** The means do not even rise steadily: 2 correct bytes looks faster than 1. Interrupts add huge delays to about 3% of samples and drag the mean around. The median ignores those outliers, and the early-exit medians climb by roughly 3 ns per byte, as the model says they should.

**Step 2: compare the signal with the noise.** The per-byte step is about 3 ns, but the middle half of the samples spans about 35 ns. A single measurement says almost nothing; only many samples reveal the trend.

**Step 3: quantify uncertainty.** A bootstrap resamples the data to estimate how much the medians could vary. For the early-exit check, the 95% interval for median(3 correct) minus median(0 correct) is [7.2, 13.2] ns, which excludes zero. For the constant-time check it is [-3.5, 3.1] ns, which includes zero.

**Step 4: vary the sample size.** With only 20 samples per guess, the early-exit interval widens to [-16.3, 18.9] ns. The same leak becomes invisible: the result is inconclusive, not negative.

**Step 5: state the limitations.**

- The data are synthetic. The leak was built into the model, so the analysis shows that the method can detect a 3 ns-per-byte leak, not that any real system leaks.
- The noise is invented. Real noise is heavier-tailed and drifts with processor frequency, cache state and other workloads, and network jitter is far larger than 3 ns.
- Samples were independent by construction. Real measurements are correlated over time, so they should be interleaved and repeated.
- The constant-time result is a non-detection. Measurement can expose a leak but never prove its absence, which is why the code and its compiled output must be reviewed.
- Measuring a real service without permission is an attack on it, whatever the intent.

## Defenses

| Layer                | Mitigation                                                                  | What it addresses                 | Cost or limit                                                                                      |
| -------------------- | --------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Application code     | Constant-time code; vetted functions such as `hmac.compare_digest`          | Timing and cache leaks of secrets | Hard to get right; compilers can reintroduce leaks                                                 |
| Kernel and compilers | Speculation barriers (LFENCE) and "nospec" accessors after sensitive checks | Spectre variant 1                 | Placed case by case; Linux gives "no guarantee that all possible attack vectors" are covered       |
| Kernel and microcode | Retpolines, IBRS, IBPB and STIBP                                            | Spectre variant 2                 | The kernel documentation warns of "a performance cost"                                             |
| Operating system     | Kernel page-table isolation                                                 | Meltdown                          | Needed only on affected processors                                                                 |
| Architecture         | Separate processes for distrusting code, such as browser [[site-isolation]] | Cross-domain reads                | More memory and processes                                                                          |
| Hardware             | Redesigned processors                                                       | The root cause                    | Years to replace; the Spectre authors argue sound fixes need processor and instruction-set changes |

On Linux you can see which of these your kernel applies: the files in `/sys/devices/system/cpu/vulnerabilities/` report each issue's status, for example "Mitigation: Retpolines" or "Not affected" for `spectre_v2`.

Two cautions apply to every row. A mitigation addresses specific variants, and new variants keep appearing. And performance costs tempt operators to turn mitigations off, so that decision belongs in a documented [[threat-model]], not a default.

## Common misconceptions

- **"Correct output means secure code."** The time, cache footprint and power draw are outputs too.
- **"Adding random delays fixes timing leaks."** Noise averages out over many samples, as the worked example shows. Remove the dependence on the secret instead.
- **"Spectre is a software bug that a patch removes."** It comes from how processors speculate. Patches block known paths; the Spectre authors argue that sound fixes need processor changes.
- **"Antivirus will catch it."** The Meltdown and Spectre site notes that these attacks are hard to tell apart from normal applications.
- **"Constant time means fast."** It means independent of secrets. A constant-time check is often slightly slower, because it never stops early.

## Try it yourself

1. Save the simulation as `timing_sim.py` and run `python3 timing_sim.py`. With Python 3.8 or later it should print the numbers in the worked example, or numbers very close to them.

   ```python
   # timing_sim.py: SYNTHETIC timings for a toy 16-byte tag check.
   # Nothing is measured; every number comes from the made-up model below.
   import random
   import statistics

   random.seed(2026)                  # fixed seed: everyone gets the same data
   TAG_LEN, BASE, PER_BYTE, JITTER = 16, 120.0, 3.0, 25.0   # nanoseconds (invented)

   def sample(correct, constant_time):
       examined = TAG_LEN if constant_time else min(correct + 1, TAG_LEN)
       t = BASE + PER_BYTE * examined + random.gauss(0, JITTER)
       if random.random() < 0.03:     # rare interrupts add a large delay
           t += random.uniform(500, 2000)
       return t

   def median_diff_ci(a, b, rounds=1000):
       """95% bootstrap interval for median(b) - median(a)."""
       diffs = sorted(statistics.median(random.choices(b, k=len(b))) -
                      statistics.median(random.choices(a, k=len(a)))
                      for _ in range(rounds))
       return diffs[int(0.025 * rounds)], diffs[int(0.975 * rounds)]

   N = 1000                           # samples per guess; try 20 and 100 as well
   for constant_time in (False, True):
       print("constant-time check" if constant_time else "early-exit check")
       runs = [[sample(c, constant_time) for _ in range(N)] for c in range(4)]
       for c, xs in enumerate(runs):
           q1, _, q3 = statistics.quantiles(xs, n=4)
           print(f"  {c} correct: mean {statistics.mean(xs):6.1f}  "
                 f"median {statistics.median(xs):6.1f}  IQR {q3 - q1:5.1f}")
       lo, hi = median_diff_ci(runs[0], runs[3])
       print(f"  median(3 correct) - median(0 correct): 95% CI [{lo:.1f}, {hi:.1f}] ns")
   ```

2. Change `N` to 20, then 100. Then set `JITTER` to 100 or `PER_BYTE` to 1. For each run, record whether the early-exit interval excludes zero, and write one sentence on what the change means for an attacker and for a defender testing their own code.
3. Save the two C functions above as `tags.c` and run `gcc -O2 -S tags.c`. In `tags.s` (on x86-64), find the byte comparison followed by a conditional jump out of the loop in `tag_equal_leaky`. In `tag_equal_ct`, check that the only conditional jump depends on the loop counter.
4. On Linux, run `grep . /sys/devices/system/cpu/vulnerabilities/*` and look up two entries in the kernel documentation cited above.

## Key takeaways

- A side channel exists whenever something observable, such as time, cache state or power, depends on a secret, even in code that returns correct results.
- Spectre makes a processor speculatively touch secret-dependent memory and leaves the evidence in the cache, so isolation built on architectural checks alone can fail.
- Constant-time code removes the dependence on secrets: no secret-dependent branches or memory addresses, and vetted library functions instead of hand-rolled ones.
- Timing evidence needs robust statistics, enough samples, uncertainty intervals and stated limitations; a non-detection never proves that code is safe.

## Go deeper

- Read section 9 and section 10 of [Kocher's paper](https://www.paulkocher.com/doc/TimingAttacks.pdf) on making operations take the same time and on blinding. Why does Kocher call the first approach difficult in practice?
- The [Spectre paper](https://arxiv.org/abs/1801.01203) argues that speculative execution undermines the assumptions behind process separation, containerization and just-in-time compilation. Revisit [Process isolation and sandboxing](lesson:SYS-05): which boundaries in its comparison table still hold?
- Testing many guesses raises the problem of multiple comparisons. Using [Security metrics and statistical interpretation](lesson:RES-04), how would you control false positives when testing all 256 values of each byte?
