---
topicId: APP-02
title: Input validation and canonicalization
summary: Learn to check that input has the shape and meaning your code expects, why every value must be reduced to one canonical form before it is checked, and how to compare validation pipelines on an agreed set of edge cases.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Distinguish syntactic from semantic validation and write an allowlist rule for each.
  - Explain why input must be decoded and canonicalized before it is validated.
  - Compare two validation pipelines on a fixed set of Unicode edge cases and predict each outcome.
  - Identify validator pitfalls such as partial regular-expression matches, lenient parsing, and client-only checks.
  - Explain why validation complements, but cannot replace, parameterized queries and output encoding.
prerequisites: [APP-01, FND-03, WEB-01]
concepts: [input-validation, canonicalization, allowlist, denylist, unicode-normalization, percent-encoding, redos]
labs: [sql-injection, prompt-injection, ssrf-url-filter]
keywords:
  - CWE-20
  - CWE-180
  - positive validation
  - whitelist
  - blacklist
  - syntactic validation
  - semantic validation
  - NFC
  - NFKC
  - case folding
  - ReDoS
  - ASVS V2
sources:
  - title: Input Validation Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'CWE-20: Improper Input Validation'
    url: https://cwe.mitre.org/data/definitions/20.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 'CWE-180: Incorrect Behavior Order: Validate Before Canonicalize'
    url: https://cwe.mitre.org/data/definitions/180.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: 'Unicode Standard Annex #15: Unicode Normalization Forms'
    url: https://www.unicode.org/reports/tr15/
    publisher: Unicode Consortium
  - title: 'OWASP ASVS 5.0.0, V2: Validation and Business Logic'
    url: https://raw.githubusercontent.com/OWASP/ASVS/v5.0.0/5.0/en/0x11-V2-Validation-and-Business-Logic.md
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-asvs
  - title: 'unicodedata: Unicode Database (Python documentation)'
    url: https://docs.python.org/3/library/unicodedata.html
    publisher: Python Software Foundation
quiz:
  - question: A signup service checks that a username is unique by comparing the raw text. A later password-reset step applies NFKC normalization and case folding before it looks the name up. What is the risk?
    choices:
      - None, because normalization only changes how a name is displayed.
      - Two names that are different as stored text can share one canonical form, so an action meant for one account can land on another.
      - Normalization lets attackers inject SQL into the reset query.
      - The reset step will reject every name that contains non-ASCII characters.
    answer: 1
    explanation: The two components disagree about which names are equal. Signup sees "ａｌｉｃｅ" and "alice" as different, but the reset step sees both as "alice". Canonicalize once, before validation and the uniqueness check, and store only the canonical form.
  - question: A function checks that a path starts with /safe_dir/ and then resolves it to a canonical path. The input /safe_dir/../ passes the check. What is the right fix?
    choices:
      - Add the string .. to a denylist of forbidden sequences.
      - Run the same check a second time after the first one.
      - Repeat the check in the browser before the form is submitted.
      - Resolve the path to its canonical form first, then check the resolved path.
    answer: 3
    explanation: This is CWE-180, validate before canonicalize. Resolving /safe_dir/../ produces /, which is outside the folder. The check must examine the same form of the value that the program will use. A denylist misses other spellings, and a client-side check is bypassed by anyone who sends the request directly.
  - question: In Python, which input is wrongly accepted by re.match(r"^[a-z0-9_]{3,20}$", name)?
    choices:
      - "bob followed by a newline character"
      - "Bob"
      - "b"
      - "bob smith"
    answer: 0
    explanation: In Python, $ also matches just before a final newline, so "bob\n" passes. Using re.fullmatch requires the pattern to match the entire value. The other three inputs are correctly rejected for a capital letter, length, and a space.
  - question: Which of these is a semantic validation check rather than a syntactic one?
    choices:
      - The quantity field contains only digits.
      - The date field matches the pattern YYYY-MM-DD.
      - The return date of a booking falls after its departure date.
      - The username is at most 20 characters long.
    answer: 2
    explanation: Syntactic checks look at type and format. Semantic checks ask whether a well-formed value makes sense for the operation, such as two dates in the right order. A date can be perfectly formatted and still be wrong for the booking.
  - question: Why can input validation not replace parameterized queries as the defense against SQL injection?
    choices:
      - Validation is too slow to run on every request.
      - Legitimate values such as the name o'brien contain characters that are special to SQL, so a rule strict enough to block them would reject real data.
      - Validation only works in the browser, not on the server.
      - Regular expressions cannot describe the format of a name.
    answer: 1
    explanation: Validation decides whether a value is acceptable for the business; it cannot make an acceptable value safe for every interpreter. A real customer named o'brien must be accepted, and only a parameterized query keeps that apostrophe from changing the SQL.
---

## Why it matters

Every program makes assumptions about its input: a quantity is a small positive whole number, a username is short and contains no spaces, a booking ends after it starts, a file name points inside the upload folder. [[input-validation|Input validation]] is the code that checks those assumptions before the program acts on them. When it is missing or wrong, the program does things its authors never intended. MITRE's [[cwe|CWE]] catalog treats improper input validation, CWE-20, as a broad class of weakness that sits above many more specific ones, and it ranked 18th on the 2025 CWE Top 25.

Validation has a quieter partner, [[canonicalization]]: reducing the many ways of writing a value to one standard form. The same name can be typed in capitals, in full-width letters, or with characters that differ only in their [[unicode|Unicode]] encoding. The same path can be written with `..` segments or with percent-escapes. If a validator checks one spelling and a later component acts on another, the check protects nothing. MITRE gives this ordering mistake its own entry, CWE-180, "Validate Before Canonicalize."

This lesson treats validation as engineering: write down the expected shape and meaning of each input, reduce the input to one form, check that form, and pass only the checked form onward. It also marks the limits. Validation narrows what reaches the rest of the program, but it is not how you stop SQL injection or cross-site scripting.

## The core idea

Assume input arrives from outside the program's control: a browser form, an API client, a file, a message queue, or another internal service. OWASP's Input Validation Cheat Sheet asks you to validate data crossing [[trust-boundary|trust boundaries]] even when the source is internal, and to validate on the server even when the browser checks the same fields, because anyone can send a request without using your page.

Every input then raises two questions, in this order. First, **what is this value, really?** That is canonicalization. Second, **is it acceptable?** That is validation. Think of a currency exchange counter with a 500-dollar limit. The clerk must convert a stack of foreign bills to dollars before comparing it with the limit. Comparing the number printed on the bills with 500 is meaningless, and it can be wrong in either direction.

Validation itself has two layers. **Syntactic validation** checks type and format: digits only, 3 to 20 characters, a well-formed date. **Semantic validation** checks whether a well-formed value makes sense for the operation: the return date follows the departure date, the quantity is within stock. Both layers work best as an [[allowlist]], a precise description of what is acceptable, with everything else rejected. The opposite approach, a [[denylist]] of known-bad strings, always misses something. The cheat sheet's own example: blocking apostrophes rejects legitimate names without making a database query safe.

## How it works

### Checking shape, then meaning

A syntactic check should test the whole value, with a length bound, using a strict parser. Lenient parsing is a common source of bugs. In JavaScript, `parseInt` reads digits until it meets a non-digit, so it turns `"12abc"` into `12` instead of rejecting it:

```javascript
// LENIENT: parseInt("12abc", 10) returns 12, and "-5" passes as -5.
const qty = parseInt(req.body.qty, 10);

// STRICT: a form field must be a string of 1 to 3 digits, then the range is checked.
const raw = req.body.qty;
if (typeof raw !== 'string' || !/^[0-9]{1,3}$/.test(raw)) {
  throw new RangeError('qty must be a whole number');
}
const qty = Number(raw);
if (qty < 1 || qty > 100) throw new RangeError('qty must be between 1 and 100');
```

Semantic checks come after the value is well formed. They compare it with other values and with the rules of the business: dates in order, a coupon used once, a quantity no larger than the stock. Whether this user may touch this record is a separate question, authorization, covered in [object-level authorization](lesson:APP-06).

For structured input such as JSON, use a schema library that checks types and required fields and rejects unexpected fields. Rejecting unknown fields matters, because frameworks that copy every incoming field into an object can let a user set fields they should never control.

### Canonicalization: one value, many spellings

| Layer                  | Different spellings of the same value                         | Canonical step                         |
| ---------------------- | ------------------------------------------------------------- | -------------------------------------- |
| URL encoding           | `/` and `%2F`; `a` and `%61`                                  | Decode exactly once                    |
| Letter case            | `Alice` and `alice`; `ß` and `ss`                             | Case-fold                              |
| Unicode composition    | `é` as one code point, or `e` plus a combining accent         | Normalize to NFC                       |
| Unicode compatibility  | Full-width `ａ`, ligature `ﬁ`, modifier letter `ᴬ`            | Normalize to NFKC (lossy; for comparison) |
| File paths             | `/srv/app/files/../config`, symbolic links                    | Resolve to a real path (see [APP-04](lesson:APP-04)) |

[[percent-encoding|Percent-encoding]] writes a byte as `%` followed by two hexadecimal digits, so `%2F` stands for `/`. Web frameworks decode it once on the way in. Code that decodes again treats a value as two different strings at two different times, which is why CWE-20 warns against decoding the same input twice.

[[unicode-normalization|Unicode normalization]] is defined by Unicode Standard Annex #15. It has four forms. NFC and NFD unify **canonical equivalents**, different code-point sequences for the same character, such as a precomposed `é` and `e` followed by a combining accent. NFKC and NFKD also unify **compatibility equivalents**, which the annex calls "a weaker type of equivalence": full-width letters become ordinary ones, the ligature `ﬁ` becomes `fi`, and the circled digit `①` becomes `1`. Compatibility normalization loses information, so use it to compare identifiers, not to rewrite free text that people wrote. Two cautions apply. Normalization can change a string's length, since `ﬁ` becomes two letters. And it does not unify [[confusable]] characters from different scripts, such as Cyrillic `а` and Latin `a`; detecting those needs the separate techniques of [homograph detection](lesson:WEB-01).

Case folding is the Unicode-aware way to compare text without regard to case. In Python, `"ß".lower()` stays `ß`, while `"ß".casefold()` becomes `ss`.

### Order matters: decode, canonicalize, validate, use

CWE-180's own example is a path check. Code tests that a path starts with `/safe_dir/` and only afterward resolves it. The input `/safe_dir/../` passes the test and then resolves to `/`, the root of the file system. The repair is to resolve first and test the resolved path, so the check examines exactly the value the program will use.

The general pipeline is:

1. **Bound the size** of the raw input before parsing it.
2. **Decode** bytes to text with a fixed encoding, rejecting malformed sequences, and decode transport encodings exactly once.
3. **Canonicalize** with one shared function that every component calls.
4. **Validate** the canonical value: syntax first, then semantics.
5. **Use** only the canonical value, still protected for each destination with parameterized queries and output encoding.

### Validators that fail open

Small details turn a validator into a sieve. In Python, `$` also matches just before a final newline, so `re.match(r"^[a-z]+$", "bob\n")` succeeds; `re.fullmatch` requires the pattern to cover the entire value. In Ruby, `^` and `$` match at every line. Regular expressions can also be slow: a pattern with nested repetition can take exponential time on a long, nearly matching input in a backtracking engine, a problem called [[redos|regular-expression denial of service (ReDoS)]]. The cheat sheet's advice is to bound length before matching, avoid patterns with excessive backtracking, and use a non-backtracking engine or a timeout. Finally, prefer rejecting bad input to repairing it. Deleting "dangerous" characters can assemble a new dangerous string out of the pieces left behind, and a silently truncated value may mean something different from what the user sent.

## Worked example

The activity: compare validation stages on approved edge cases. The `shop.example` team writes its username policy down first. Usernames are compared without regard to case or compatibility spelling; the canonical form is NFKC followed by case folding; a canonical username has 3 to 20 characters from `a` to `z`, digits, and underscore; a few names are reserved; and canonical names must be unique. The team also approves a fixed list of edge cases, so everyone tests the same inputs. Accounts `alice` and `bob` already exist.

Two candidate pipelines are on the table:

```python
import re
import unicodedata

def canonical(raw: str) -> str:
    """The one canonicalization policy, shared by signup, login, and reset."""
    return unicodedata.normalize("NFKC", raw).casefold()

RESERVED = {"admin", "support"}
USERNAME = re.compile(r"[a-z0-9_]{3,20}")

def register_a(raw: str, taken: set[str]) -> str:
    # Pipeline A: validate and check uniqueness on the raw text.
    if not re.fullmatch(r"\w{3,20}", raw):   # \w accepts letters in any script
        raise ValueError("format")
    if raw in taken or raw in RESERVED:
        raise ValueError("unavailable")
    return raw  # stored as typed; login and reset later compare canonical(raw)

def register_b(raw: str, taken: set[str]) -> str:
    # Pipeline B: canonicalize first, validate the canonical form, store it.
    name = canonical(raw)
    if not USERNAME.fullmatch(name):
        raise ValueError("format")
    if name in taken or name in RESERVED:
        raise ValueError("unavailable")
    return name
```

Running both on the approved edge cases (Python string escapes shown for characters that are invisible or look identical to ASCII) gives:

| Approved input                         | Pipeline A                 | Pipeline B                            |
| -------------------------------------- | -------------------------- | ------------------------------------- |
| `"alice"`                              | Rejected: unavailable      | Rejected: unavailable                 |
| `"Alice"`                              | Accepted as a new account  | Rejected: canonical `alice` is taken  |
| `"ａｌｉｃｅ"` (full-width letters)     | Accepted as a new account  | Rejected: canonical `alice` is taken  |
| `"ᴬlice"` (modifier letter A)          | Accepted as a new account  | Rejected: canonical `alice` is taken  |
| `"\u212aate"` (Kelvin sign for K)     | Accepted                   | Accepted, stored as `kate`            |
| `"ﬁona"` (ligature fi)                 | Accepted                   | Accepted, stored as `fiona`           |
| `"al\u200bice"` (zero-width space)    | Rejected: format           | Rejected: format                      |
| `"bob\n"` (trailing newline)           | Rejected: format           | Rejected: format                      |
| `"Admin"`                              | Accepted                   | Rejected: reserved                    |
| `"mallory"`                            | Accepted                   | Accepted                              |

Pipeline A stores four names that its own login and reset code will treat as `alice` or `admin`. The diagram shows how that disagreement between components can become an account takeover.

```sequence
title: Two components disagree about which names are equal
participant M as mallory
participant S as Signup (raw text)
participant R as Reset (canonical)
participant DB as Accounts
M -> S: Register "ᴬlice", email mallory@shop.example
S -> DB: Raw "ᴬlice" is not taken, insert row
M -> R: Reset password for "ᴬlice"
R --> M: Reset link sent to mallory's own email
M -> R: Open link, choose a new password
R -> DB: Update account whose canonical name is "alice"
note DB: Both rows match; alice's comes first
DB --> R: Password changed on alice's account
```

Pipeline B closes the gap because every component uses the same canonical form, and the uniqueness check runs on that form. Two more observations come from the table. The zero-width space survives NFKC unchanged, so the syntax check after canonicalization still matters. And the Kelvin sign is a canonical equivalent of `K`, so even NFC would replace it. To make the decision durable, store the canonical name in its own column with a database unique constraint, and add these edge cases to the test suite.

## Defenses

| Control                                      | What it prevents                                          | Limits                                                                 |
| -------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------- |
| Server-side validation in a trusted layer    | Malformed and out-of-range values driving program logic   | Says nothing about safety for a specific interpreter                   |
| Allowlist syntax and semantic rules          | Unexpected types, formats, and business-rule violations   | Rules must track the business; overly strict rules reject real users   |
| One shared canonicalization function         | Components disagreeing about which values are equal       | Lossy forms such as NFKC suit identifiers, not free text               |
| Unique constraint on the canonical form      | Duplicate identities that differ only in spelling         | Does not catch cross-script confusables                                |
| Size bounds and safe regular expressions     | Resource exhaustion and ReDoS during validation           | Needs a limit for every field and request                              |
| Logging rejected input                       | Unnoticed probing                                         | Logs must not store secrets or become a new injection target           |

OWASP ASVS 5.0.0 states the core requirements in chapter V2: requirement 2.2.1 asks that input be "validated to enforce business or functional expectations," and requirement 2.2.2 asks that validation be enforced "at a trusted service layer." Treat validation as one layer of [[defense-in-depth|defense in depth]]. Queries still need [parameters](lesson:APP-01), and HTML output still needs [[output-encoding|output encoding]], because a value can be perfectly valid for the business and still dangerous for an interpreter.

## Common misconceptions

- **"The browser already validates the form."** Client-side checks give users quick feedback. An attacker sends requests directly, so the server must repeat every check.
- **"Blocking dangerous characters is validation."** That is a denylist. It misses alternate spellings and rejects legitimate data such as o'brien.
- **"Validation prevents injection."** It reduces exposure, but parameterized queries and output encoding are what make valid data safe.
- **"Normalization sanitizes text."** OWASP is blunt: "Normalization is not sanitization." It makes comparison consistent; it does not remove anything dangerous.
- **"`^` and `$` anchor the whole string."** Not in every language. Python's `$` accepts a trailing newline, and Ruby's anchors work per line.
- **"Internal services send clean data."** Data crossing any trust boundary needs validation, including data from your own systems.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

In [the lab](lab:sql-injection), the same fictional campus store from [SQL injection](lesson:APP-01) lets you test where validation ends and parameterization begins. On the Harden tab, run the automated battery of login inputs in Parameterized mode. It accepts the one legitimate login and defeats every injection attempt without filtering a single character, which shows that the protection comes from keeping data out of the SQL structure, not from the shape of the input. Then go through the results table on paper: which of those inputs would a sensible username rule have rejected, and which would it have let through?

In [the prompt-injection lab](lab:prompt-injection), a fictional support assistant, AcmeBot, keeps an admin password in its hidden instructions. With every defense off, send the **Direct override** message: the password leaks. Check only **Keyword blocklist**, and the direct override is rejected, but the **Obfuscated override**, a similar request whose banned words are disguised with a homoglyph and zero-width spaces, still leaks, because the blocklist reads the raw text. That is how a [[denylist]] fails open: any spelling it did not foresee gets through. Now check **Input validation + canonicalization** and send the obfuscated message again. The evidence log shows its canonical form, the plain sentence in lowercase, and the check rejects it: Pipeline B's order, canonicalize and then validate. That check still matches override wording, though, so canonicalization fixed the spelling problem, not the denylist problem. Why do **Instruction / data separation** and **Least privilege** not need to recognize the attack at all?

In [the SSRF lab](lab:ssrf-url-filter), a server fetches any URL you give it. Pick **metadata.evil.example** and click **Fetch URL**: the name looks external, but the result shows it resolving to an internal address, and the server returns cloud credentials. Click **Block internal IPs** and fetch again. The lab now validates the resolved address, not the name, and refuses the request. As with CWE-180, the check examines the value the program will actually use. Answer "Why the string is not enough," then click **Destination allowlist** and fetch again: only two named hosts pass, an [[allowlist]] in place of a list of bad addresses.

**Without the lab.** Copy `canonical`, both pipelines, and the approved edge cases into a Python file on your own machine. Before running anything, predict each result in a blank copy of the table above. Then run both pipelines and compare. Finally, extend the list with `"ADMİN"` (capital I with a dot above) and `"straße"` (with `ß`), predict again, and use `unicodedata.normalize` from the [Python documentation](https://docs.python.org/3/library/unicodedata.html) to explain any surprise.

## Key takeaways

- Validate on the server, against an allowlist, for both syntax (type, format, length) and semantics (does the value make sense here).
- Decode and canonicalize first, then validate, then use only the value you validated.
- Give every component the same canonicalization function, and enforce uniqueness on the canonical form.
- Use whole-value matching, length bounds, and strict parsers so validators do not fail open.
- Validation narrows input; parameterized queries and output encoding are still required at each destination.

## Go deeper

- Unicode Standard Annex #15 notes that normalization is not closed under concatenation: joining two normalized strings can produce one that is not normalized. What does that imply for code that validates pieces of an identifier separately and then joins them?
- [Unicode Technical Standard #39](https://www.unicode.org/reports/tr39/) defines skeletons and mixed-script tests for confusable identifiers, a problem normalization does not solve. Compare its restriction levels with the username policy in the worked example.
- Open question: validation fails whenever two parsers disagree about the same bytes, for example a validator and a downstream library that read a URL or a JSON document differently. How would you test that every component in a request path parses an input the same way?
