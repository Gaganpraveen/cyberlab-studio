---
topicId: APP-07
title: Deserialization and parser trust
summary: Learn why formats that rebuild objects or fetch external content let input choose what a parser does, and analyze a constrained JSON parser that limits size, structure, types, and ranges before building objects itself.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Explain how native deserialization lets input choose types and code, and why validating the result afterward is too late.
  - Recognize risky deserialization and XML parsing calls in Python and Java and name safer alternatives.
  - Analyze a constrained JSON parser and predict which stage rejects each edge case.
  - Configure an XML parser to reject document type declarations, and explain XXE and entity-expansion risks.
  - Evaluate mitigations such as signatures and class allowlists, including what they leave exposed.
prerequisites: [APP-02, APP-05]
concepts: [insecure-deserialization, gadget-chain, xxe, input-validation, allowlist]
keywords:
  - insecure deserialization
  - CWE-502
  - CWE-611
  - A08:2025
  - pickle
  - ObjectInputStream
  - object injection
  - XXE
  - DTD
  - billion laughs
  - JSON
  - parser differential
  - yaml.safe_load
  - defusedxml
sources:
  - title: Deserialization Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: XML External Entity Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: 'CWE-502: Deserialization of Untrusted Data'
    url: https://cwe.mitre.org/data/definitions/502.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
  - title: pickle — Python object serialization (Python documentation)
    url: https://docs.python.org/3/library/pickle.html
    publisher: Python Software Foundation
  - title: 'A08:2025 Software or Data Integrity Failures (OWASP Top 10:2025)'
    url: https://top10.owasp.org/2025/A08_2025-Software_or_Data_Integrity_Failures/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
  - title: Insecure deserialization (Web Security Academy)
    url: https://portswigger.net/web-security/deserialization
    publisher: PortSwigger Ltd
    sourceId: portswigger-web-security-academy
quiz:
  - question: A server calls pickle.loads on a cookie and then checks that the result is a Cart object with sensible values. Why does the check not protect it?
    choices:
      - The check is fine; it only needs to run before the cart is saved.
      - Pickle data cannot hold a Cart object, so the check always fails.
      - Code chosen by the data can run while the object is being rebuilt, before the check ever sees the result.
      - The check protects against tampering but not against eavesdropping.
    answer: 2
    explanation: Native deserialization creates the objects the data names and runs their loading hooks. PortSwigger notes that many attacks are complete before deserialization finishes, and Python's documentation warns that malicious pickle data can execute arbitrary code during unpickling.
  - question: Which redesign best removes the risk from a shopping cart stored in a cookie as a pickled object?
    choices:
      - Keep the cart on the server under a random session id, or store it as JSON that a constrained parser checks before building objects.
      - Encode the pickled bytes in Base64 so they cannot be read.
      - Compress the pickle so it is harder to edit.
      - Catch every exception that pickle.loads raises.
    answer: 0
    explanation: The fix is to stop letting client-controlled bytes choose types. Base64 and compression are encodings, not protections, and catching exceptions does nothing about code that runs successfully. A data-only format yields plain values that the application checks and converts itself.
  - question: In Java, which setting most directly prevents XXE in a DocumentBuilderFactory that parses untrusted uploads?
    choices:
      - Setting a larger heap size for the parser.
      - Validating the document against a schema after parsing.
      - Using UTF-8 instead of UTF-16.
      - Enabling the disallow-doctype-decl feature, so any document with a DOCTYPE declaration is rejected.
    answer: 3
    explanation: External entities are declared in the document's DTD, which the DOCTYPE declaration introduces. OWASP's guidance is to disable DTDs whenever possible and reject DOCTYPE declarations if the parser supports it. Validation after parsing is too late, because entities are resolved during parsing.
  - question: Why does the constrained parser test qty with type(qty) is int instead of isinstance(qty, int)?
    choices:
      - isinstance is slower and should never be used in validation.
      - In Python, bool is a subclass of int, so isinstance would accept true as a quantity of 1.
      - type() also checks that the number is positive.
      - JSON numbers are always floats in Python, so isinstance would reject every quantity.
    answer: 1
    explanation: isinstance(True, int) is True in Python, and True == 1. A JSON true would slip through as a quantity. Exact type checks match the schema's intent; the same trap affects the version check, which is why it tests the type as well as the value.
  - question: A service signs pickled job messages with a secret HMAC key and verifies the signature before unpickling. What risk remains?
    choices:
      - None; signed pickles are safe in every case.
      - Signatures make the messages unreadable to attackers.
      - Anyone who obtains the key, or any bug that makes the service sign attacker data, can still produce messages that run code when unpickled.
      - The HMAC check itself executes the pickle.
    answer: 2
    explanation: Verifying before deserializing is the right order and blocks outsiders who lack the key. But it moves the trust onto the key and everything that can sign. OWASP's deserialization guidance treats signing and filtering as mitigations; data-only formats remove the underlying risk.
---

## Why it matters

Applications constantly turn bytes back into structures: cookies, caches, message queues, file imports, API request bodies. Doing that is deserialization, and when the bytes come from someone you do not trust, the parser becomes an attack surface. MITRE catalogs [[insecure-deserialization|Deserialization of Untrusted Data]] as [[cwe|CWE]]-502, which ranked 15th on the [2025 CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html). The OWASP Top 10:2025 maps it under A08:2025, Software or Data Integrity Failures, describing data "encoded or serialized into a structure that an attacker can see and modify." OWASP's Deserialization Cheat Sheet reports that attacks against deserializers "have been found to allow denial-of-service, access control, or remote code execution."

XML adds a second family. An XML parser that resolves external entities can be steered into reading local files or making network requests; OWASP says [[xxe|XXE]] "can expose local files, cause server-side request forgery (SSRF), or exhaust resources." MITRE catalogs it as [CWE-611](https://cwe.mitre.org/data/definitions/611.html).

The lesson behind both: a parser is a small interpreter, and its input is the program. The more a format can express, the more an attacker can make the parser do.

> [!ETHICS] Only test systems you own or have written permission to test.

## The core idea

Formats fall into two broad kinds. Data-only formats, such as standard JSON, describe plain values: strings, numbers, booleans, lists, and maps. A conforming parser can only build those. Object formats, such as Python's pickle or Java's built-in serialization, describe objects of named types, and the deserializer creates those types and runs their loading code. Some formats sit in between: YAML with custom tags, XML with document type definitions, and JSON libraries that read type names from the data.

An analogy: a data-only format is a box of labeled parts that you inspect and assemble yourself. Native deserialization is a kit that assembles itself the moment you open it, following instructions written by the sender. Inspecting it afterward is too late.

So the rule at a [[trust-boundary|trust boundary]] is: parse untrusted input into plain data with a constrained parser, check its exact shape, types, and ranges, and only then build your own objects from the checked values.

## How it works

### When the input chooses the code

Python's documentation is blunt: "The `pickle` module **is not secure**. Only unpickle data you trust," because "It is possible to construct malicious pickle data which will execute arbitrary code during unpickling." Java's `ObjectInputStream.readObject()` has the same shape of problem. The data names classes, the runtime creates them, and some languages call "magic methods" automatically during deserialization, as PortSwigger explains.

The attacker does not need to upload code. PortSwigger defines a gadget as "a snippet of code that exists in the application that can help an attacker to achieve a particular goal"; a [[gadget-chain|gadget chain]] links many such method calls, and "All of the code already exists on the website." Every library on the classpath adds potential gadgets. And because the hooks run while the object is still being rebuilt, PortSwigger observes that "Many deserialization-based attacks are completed before deserialization is finished."

```sequence
title: Native deserialization lets the data choose what runs
participant M as mallory
participant S as shop.example server
participant D as Deserializer
participant C as Installed classes
M -> S: Request with a crafted serialized cookie
S -> D: Rebuild the cart from the cookie
D -> C: Create the types the data names and run their loading hooks
C --> D: Hooks have already run with attacker-chosen values
D --> S: An object for validation to inspect, too late
```

Other ecosystems repeat the pattern. OWASP's cheat sheet advises, "For untrusted YAML, use yaml.safe_load()," and notes that Microsoft's `BinaryFormatter` "is dangerous and cannot be secured," that Json.NET's `TypeNameHandling` should be set only to `None`, and that Jackson "can be used safely as long as polymorphism is not used." The last two show that JSON is only as safe as the library reading it: once the data can name a type, the problem returns.

### When the parser fetches things: XXE

XML documents can begin with a document type declaration, `<!DOCTYPE ...>`, which carries a document type definition (DTD). A DTD can define entities, which are named pieces of content. An external entity names a URI, and a parser that resolves it reads that file or URL and inserts the result into the document. With untrusted input, the parser becomes a confused deputy, much like the fetcher in [server-side request forgery](lesson:APP-05).

```sequence
title: An XML import before and after DTDs are rejected
participant M as mallory
participant S as import.shop.example
participant X as XML parser
participant F as Local files
M -> S: Upload XML whose DTD declares an external entity
S -> X: Parse the document
X -> F: Read the file the entity names
F --> X: File contents
X --> S: Document with the file inserted
S --> M: Import preview shows the file
note: With DOCTYPE declarations rejected
M -x S: Same upload refused before any entity is resolved
```

Entities also enable denial of service without any external access. Python's documentation describes the "billion laughs" attack, in which nested entities each refer to another several times, so a small document expands to "several gigabytes of text." OWASP notes that "Preventing XXE does not prevent every XML denial-of-service attack."

### Even data-only parsers have edges

JSON's standard, [RFC 8259](https://www.rfc-editor.org/rfc/rfc8259), leaves room for disagreement. Object names "SHOULD be unique," but when they are not, "the behavior of software that receives such an object is unpredictable," and "Many implementations report the last name/value pair only." If a gateway reads the first `qty` and the service reads the last, they have parsed different requests. The RFC also says Infinity and NaN "are not permitted," yet Python's `json` module accepts them by default. And the RFC lets implementations set limits on text size, nesting depth, number range, and string length, which a careful parser should do.

## Worked example

The activity: analyze a safe constrained parser example. The `shop.example` team found this in an old service:

```python
import base64
import pickle

def load_cart(cookie: str):
    # The cookie's bytes decide which objects are created and what code runs.
    return pickle.loads(base64.b64decode(cookie))
```

The first fix is architectural: keep the cart on the server and give the browser only a random session identifier. But the cart also travels between services as a message, so the team replaced pickle with JSON and wrote a parser that accepts exactly one shape, `{"version": 1, "items": [{"sku": "SKU-1234", "qty": 2}]}`:

```python
import json
import re
from dataclasses import dataclass

MAX_BYTES = 4096
MAX_ITEMS = 50
SKU = re.compile(r"SKU-[0-9]{4}")

class CartError(ValueError):
    """Raised for any input the parser refuses."""

@dataclass(frozen=True)
class CartItem:
    sku: str
    qty: int

def _reject_duplicates(pairs):
    keys = [key for key, _ in pairs]
    if len(keys) != len(set(keys)):
        raise CartError("duplicate key")
    return dict(pairs)

def _reject_constant(name):
    raise CartError(f"{name} is not valid JSON")

def parse_cart(raw: bytes) -> list[CartItem]:
    if len(raw) > MAX_BYTES:                                    # 1. size, before parsing
        raise CartError("input too large")
    try:                                                        # 2. data-only syntax
        data = json.loads(raw, object_pairs_hook=_reject_duplicates,
                          parse_constant=_reject_constant)
    except (UnicodeDecodeError, json.JSONDecodeError, RecursionError) as exc:
        raise CartError("not valid JSON") from exc
    if type(data) is not dict or set(data) != {"version", "items"}:    # 3. exact shape
        raise CartError("expected exactly the fields version and items")
    if type(data["version"]) is not int or data["version"] != 1:
        raise CartError("unsupported version")
    items = data["items"]
    if type(items) is not list or not 1 <= len(items) <= MAX_ITEMS:
        raise CartError(f"items must hold 1 to {MAX_ITEMS} entries")
    cart = []
    for item in items:                                          # 4. types and ranges
        if type(item) is not dict or set(item) != {"sku", "qty"}:
            raise CartError("each item needs exactly sku and qty")
        sku, qty = item["sku"], item["qty"]
        if type(sku) is not str or not SKU.fullmatch(sku):
            raise CartError("sku must look like SKU-1234")
        if type(qty) is not int or not 1 <= qty <= 99:
            raise CartError("qty must be a whole number from 1 to 99")
        cart.append(CartItem(sku, qty))                         # 5. build objects yourself
    return cart
```

Running approved edge cases through `parse_cart` gives these decisions:

| Input (illustrative)                                 | Decision | Stage | Why it matters                                        |
| ---------------------------------------------------- | -------- | ----- | ----------------------------------------------------- |
| The expected shape with one valid item               | Accept   | 5     | Plain values become a `CartItem` the code built       |
| `"qty": NaN`                                         | Reject   | 2     | Not JSON; NaN makes every comparison false            |
| `"qty": true`                                        | Reject   | 4     | `isinstance(True, int)` is true in Python             |
| `"qty": 1, "qty": 99` in one item                    | Reject   | 2     | Duplicate names; other parsers may keep the first     |
| An extra `"price": 0.01` field                       | Reject   | 4     | Unknown fields are refused, not silently bound        |
| 51 items                                             | Reject   | 3     | Bounded work per message                              |
| 2,000 nested arrays (4,000 bytes)                    | Reject   | 3     | Fits the size limit, parses, fails the shape check    |
| 5,000 bytes of anything                              | Reject   | 1     | Refused before the parser does any work               |
| Pickle bytes of a harmless dictionary                | Reject   | 2     | Not JSON, so no object is ever created                |
| `"version": 1.0` or `"version": true`                | Reject   | 3     | Both compare equal to 1 in Python                     |
| `"sku": "SKU-1234\n"`                                | Reject   | 4     | `fullmatch`, unlike `$`, refuses a trailing newline   |

Three details reward a closer look. First, the size check comes before parsing, so the cost of any input is bounded; it also bounds nesting depth, and the `RecursionError` handler covers extreme nesting if someone later raises the limit. Second, a naive version that checked only `if qty > 99` would accept NaN, because every comparison with NaN is false. Third, a version that skipped the exact-keys check and built items with `CartItem(**item)`, for a class with a `price` field, would let the client set prices: [mass assignment](lesson:APP-06) by another route. The last row connects to [input validation and canonicalization](lesson:APP-02).

For XML, the equivalent constraint in Java is to refuse DTDs outright. Tested with the JDK's built-in parser, the default factory accepts a document with a DOCTYPE, and this one rejects it with "DOCTYPE is disallowed":

```java
DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
// Reject any document that contains a DOCTYPE declaration.
dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
dbf.setXIncludeAware(false);
dbf.setExpandEntityReferences(false);
DocumentBuilder builder = dbf.newDocumentBuilder();
```

## Defenses

| Situation                              | Defense                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| Untrusted bytes, any format            | Size limit first, then a parser that builds only plain values            |
| Native serialization at a boundary     | Replace it with a data-only format, or keep the state on the server      |
| Legacy native deserialization          | Verify a signature first; class allowlists and resource limits; low privilege |
| YAML                                   | `yaml.safe_load`, with no custom constructors for arbitrary objects      |
| XML from outside                       | Reject DOCTYPE declarations; in Python, `defusedxml` parsing interfaces  |
| JSON libraries with type metadata      | Turn off polymorphic typing and type names read from the data            |
| After parsing                          | Exact shape, exact types, ranges; build domain objects explicitly        |

Order matters for signatures. PortSwigger stresses that "any checks must take place before beginning the deserialization process," and OWASP's A08:2025 guidance says unsigned or unencrypted serialized data should not be received from untrusted clients. For Java, OWASP recommends serialization filters "with an application-specific class allowlist and resource limits," then warns: "Filtering does not make arbitrary untrusted deserialization safe." Python's [XML security notes](https://docs.python.org/3/library/xml.html) say Expat does not access local files or create network connections by default, but that versions lower than 2.7.2 may be vulnerable to entity-expansion attacks; OWASP recommends `defusedxml` for untrusted XML. Keep libraries patched, since gadgets live in them, and log parser rejections, because a spike in malformed input is worth investigating.

## Common misconceptions

- **"We validate the object after loading it."** For native formats, the damage happens during loading. Validation must work on plain data that a constrained parser produced.
- **"JSON is always safe."** Standard JSON parsing builds plain values, but libraries that read type names from the data bring object creation back, and data-only parsers still disagree about duplicates, NaN, and limits.
- **"Signing makes pickle safe."** Signing blocks outsiders who lack the key. Anyone who has the key, or can get the service to sign their data, can still produce code-running input.
- **"A blocklist of dangerous classes is enough."** OWASP expects that "more 'gadget' classes will be discovered that can be abused." Allowlists are stronger, and avoiding native deserialization is stronger still.
- **"It is in the standard library, so it is safe by default."** Python calls pickle "not secure," and the JDK's default XML factory accepts DOCTYPE declarations unless configured otherwise.

## Try it yourself

Everything here runs locally with Python's standard library.

1. Copy `parse_cart` and build the inputs from the table as byte strings. Predict each decision and stage before running them.
2. Replace `type(qty) is not int` with `not isinstance(qty, int)`. Which input now passes, and what quantity does it produce?
3. Remove `object_pairs_hook`. What does `{"qty": 1, "qty": 99}` become? Write down what a parser that keeps the first value would see, and why that disagreement is dangerous between two services.
4. Remove `parse_constant` and the type check, and keep only `if qty > 99`. Show that NaN passes, then explain why.
5. Run `python3 -c "import pyexpat; print(pyexpat.EXPAT_VERSION)"` and compare the result with the 2.7.2 note in Python's XML security documentation.
6. Inventory a project you work on: list every place it deserializes data, such as cookies, caches, queues, and uploads, and note the format and whether the bytes cross a trust boundary.

## Key takeaways

- A parser is an interpreter for its input; the more a format can express, the more an attacker can make the parser do.
- Never deserialize untrusted data with formats that choose types or run code; validating afterward is too late.
- Parse untrusted input into plain values with limits, check exact shape, types, and ranges, then build objects yourself.
- Reject DTDs for untrusted XML; XXE turns the parser into a file reader and request forger.
- Signatures and class filters reduce risk in legacy systems but do not make untrusted native deserialization safe.

## Go deeper

- Parser differentials appear wherever two components read the same bytes: duplicate JSON keys, conflicting headers, or URLs parsed by different libraries. Design a test that feeds identical input to two parsers in your stack and compares the results.
- The research area called language-theoretic security (LangSec) treats every input format as a formal language and argues for recognizing input completely before acting on it. How far does `parse_cart` follow that idea, and where does it fall short?
- Open question: a schema language such as JSON Schema can replace hand-written checks. What does it make easier to review, and which checks in `parse_cart`, such as duplicate keys or NaN, happen before any schema could see the data?
