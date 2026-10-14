---
topicId: APP-05
title: Server-side request forgery
summary: Learn how a feature that fetches URLs lets outsiders borrow the server's network position, how cloud metadata endpoints raise the stakes, and how to evaluate a destination policy offline and enforce it at connection time.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why a server's network position turns a URL-fetching feature into a path to internal systems.
  - Describe how cloud instance metadata services work and how a session-token design such as IMDSv2 reduces SSRF risk.
  - Write and test an offline destination policy that checks scheme, exact host, port, and resolved addresses.
  - Explain why string checks, DNS rebinding, and redirects defeat naive URL validation, and enforce the policy at connection time.
  - Combine application checks with network egress controls and least-privilege credentials.
prerequisites: [APP-02, NET-02, CLD-02]
concepts: [ssrf, confused-deputy, dns-rebinding, open-redirect, egress-filtering, instance-metadata-service]
labs: [ssrf-url-filter]
keywords:
  - SSRF
  - CWE-918
  - A01:2025
  - IMDSv2
  - instance metadata
  - 169.254.169.254
  - link-local address
  - DNS rebinding
  - open redirect
  - egress filtering
  - webhook
  - blind SSRF
sources:
  - title: Server-Side Request Forgery Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-cheat-sheet-series
  - title: Access instance metadata for an EC2 instance (Amazon EC2 User Guide)
    url: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
    publisher: Amazon Web Services
  - title: Add defense in depth against open firewalls, reverse proxies, and SSRF vulnerabilities with enhancements to the EC2 Instance Metadata Service (AWS Security Blog, 2019)
    url: https://aws.amazon.com/blogs/security/defense-in-depth-open-firewalls-reverse-proxies-ssrf-vulnerabilities-ec2-instance-metadata-service/
    publisher: Amazon Web Services
  - title: 'A01:2025 Broken Access Control (OWASP Top 10:2025)'
    url: https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/
    publisher: OWASP Foundation
    license: CC BY-SA 4.0
    sourceId: owasp-top-10
  - title: 2025 CWE Top 25 Most Dangerous Software Weaknesses
    url: https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html
    publisher: The MITRE Corporation
    license: CWE Terms of Use
    sourceId: cwe-top-25
quiz:
  - question: An attacker on the internet can reach only the public web server. Why is an SSRF flaw in that server still dangerous?
    choices:
      - The server's requests come from inside the network, so they can reach internal services and metadata endpoints the attacker cannot.
      - SSRF lets the attacker read the server's memory directly.
      - SSRF turns the attacker's browser into part of the internal network.
      - The flaw only matters if the internal services are also on the internet.
    answer: 0
    explanation: SSRF is a confused-deputy problem. The server has a network position and sometimes credentials that the attacker lacks, and the flaw lets the attacker choose where the server sends its requests.
  - question: A policy checks that a URL's host is images.partner.example, and then the HTTP client resolves the name again when it connects. What can still go wrong?
    choices:
      - Nothing, because the host name was checked against the allowlist.
      - The TLS certificate check always fails after a second lookup.
      - The name can resolve to a different, internal address at connection time, so the check and the connection disagree.
      - The Host header is removed by the second lookup.
    answer: 2
    explanation: This is the DNS rebinding problem. OWASP warns that domain allowlisting alone does not prevent it. Validate the resolved addresses and connect only to an address you validated, or enforce the check at connection time.
  - question: Which control best protects cloud credentials from an SSRF flaw in an application running on a virtual machine?
    choices:
      - A denylist entry for the literal string 169.254.169.254.
      - Requiring the session-token metadata service (IMDSv2), blocking the fetcher's egress to link-local addresses, and giving the machine's role only the permissions it needs.
      - Switching the preview feature from https to http.
      - Rate-limiting the preview endpoint to one request per second.
    answer: 1
    explanation: The metadata address can be written in several forms and reached through redirects, so a string denylist is weak. A token that requires a PUT request and a custom header defeats many simple SSRF flaws, egress rules block the destination at the network level, and least privilege limits what any stolen credential can do.
  - question: Why should the server's HTTP client refuse to follow redirects when fetching user-supplied URLs?
    choices:
      - Redirects make every request twice as slow.
      - Redirects always change https to http.
      - Redirect responses cannot contain images.
      - A URL that passes validation can answer with a redirect to a destination that was never checked.
    answer: 3
    explanation: Validation applies to the first URL only. If the client silently follows a redirect, the real destination is whatever the first server says, including an internal address. Disable redirects, or validate every hop with the same policy.
  - question: Which host does a standards-following URL parser connect to for https://images.partner.example@192.0.2.50/cat.png?
    choices:
      - images.partner.example
      - partner.example
      - 192.0.2.50
      - Both hosts, one after the other.
    answer: 2
    explanation: Everything before the @ is userinfo, a user name and password field, so the host is 192.0.2.50. A check that searches the string for the allowed name is fooled; a check on the parsed host is not, and a policy should reject userinfo outright.
---

## Why it matters

Many features fetch a URL on a user's behalf: link previews, "import an image from a URL," webhooks that call back to a customer's server, document converters that load remote images, and integrations that read a partner's API. [[ssrf|Server-side request forgery (SSRF)]] happens when an attacker can choose, fully or partly, where such a server-side request goes. The request then leaves from the server, with the server's network position and sometimes its credentials, toward a destination the attacker picked.

That matters because servers can reach places the internet cannot: administrative interfaces bound to the local machine, internal APIs behind the firewall, databases with web interfaces, and cloud [[instance-metadata-service|instance metadata services]] that hand out credentials. MITRE catalogs the weakness as [[cwe|CWE]]-918; it ranked 22nd on the 2025 CWE Top 25. The OWASP Top 10:2025 lists CWE-918 among the notable weaknesses of A01:2025, Broken Access Control, which fits: SSRF lets a user act with access that belongs to the server.

The defenses are well understood, but no single check is enough. URLs are hard to validate as strings, names can resolve to new addresses, and redirects can move a request after it was approved. This lesson builds a destination policy you can test without contacting anything, then enforces it where the connection actually happens.

## The core idea

Start with two assumptions. First, the server sits inside a [[trust-boundary|trust boundary]] that the attacker is outside of: it can open connections that the attacker's own computer cannot. Second, something on the other side trusts requests because of where they come from, such as an internal service that skips authentication for "local" callers or a metadata service that answers any process on the machine.

SSRF is an instance of the [[confused-deputy|confused deputy]] problem: a program with more authority than its caller is tricked into using that authority on the caller's behalf. Think of a mailroom clerk who will deliver any envelope to any office named on it. Visitors cannot walk into the executive floor, but the clerk can, and the clerk does not ask who wrote the address. The fix is to give the clerk a list of offices that visitors may send mail to, and to lock the doors the clerk never needs.

## How it works

### What the server can reach that the user cannot

| Destination class            | Typical addresses                                  | What may be there                                      |
| ---------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| The machine itself (loopback) | `localhost`, `127.0.0.1`, `::1`                   | Admin and debug interfaces bound to local connections  |
| Private networks             | `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7` | Internal APIs, dashboards, service consoles  |
| Link-local                   | `169.254.0.0/16`, `fe80::/10`                      | Cloud instance metadata services                       |
| Other URL schemes            | `file:`, and others a client library supports      | Local files or other protocols, if the client allows them |

The attack flow below shows one feature, a link preview at `preview.shop.example`, used against two of these destinations. The attacker never connects to the internal systems; the preview server does, and returns what it found. The last step shows the same request refused once a destination policy and network egress rules are in place.

```sequence
title: SSRF through a link-preview feature
participant M as mallory
participant P as preview.shop.example
participant I as Internal admin (10.0.0.8)
participant D as Metadata (169.254.169.254)
M -> P: POST /preview url=http://10.0.0.8/admin
P -> I: GET /admin from inside the network
I --> P: Internal admin page
P --> M: Preview shows internal data
M -> P: POST /preview url=http://169.254.169.254/
P -> D: GET instance metadata
D --> P: Instance data, possibly role credentials
note: With a destination policy and egress rules
P -x D: Refused: not an allowed destination
```

Even when the response is not shown, an attacker can learn from timing and errors which internal addresses answer, and a request alone can trigger an action on an internal service. This is blind SSRF.

### Cloud metadata endpoints, conceptually

Cloud virtual machines can ask a metadata service about themselves. On Amazon EC2, the service answers at `169.254.169.254`, or at `fd00:ec2::254` over IPv6, and AWS's documentation states that these addresses "are valid only from the instance." Besides details such as the instance's region, the service can provide [[temporary-credentials|temporary credentials]] for the role attached to the machine. If an application can be made to fetch from that address and return the result, those credentials can leak.

AWS's second version of the service, IMDSv2, is session-oriented. A client must first send a `PUT` request to `/latest/api/token`, with a header `X-aws-ec2-metadata-token-ttl-seconds` that sets the token's lifetime, and must then send the returned token in an `X-aws-ec2-metadata-token` header on every metadata request. An SSRF flaw that lets an attacker choose only the URL cannot complete the first step. AWS's launch post for IMDSv2 notes that many SSRF flaws also let attackers set arbitrary headers, which is why the design requires a `PUT` request as well, and reports that this combination "protects against the vast majority of SSRF vulnerabilities." Administrators can require tokens; AWS's documentation states that "If IMDSv2 is required, IMDSv1 does not work." The token response also carries a hop limit, 1 by default, so the packets are discarded if they try to travel beyond the instance; a container on the instance counts as an extra hop and may need a limit of 2. OWASP calls IMDSv2 "an additional defense-in-depth mechanism" that "mitigates some of the instances of SSRF," and recommends migrating to it and disabling IMDSv1. It complements a destination policy; it does not replace one.

### Why URL validation is hard

Four problems defeat naive checks.

- **Parsing.** A check that searches the URL string for `partner.example` is fooled by text in the path or the [[userinfo]] part. In `https://images.partner.example@192.0.2.50/cat.png`, the host is `192.0.2.50`. Parse with a standard library, check the parsed host for exact equality, and reject [[url|URLs]] with userinfo. OWASP adds: "Treat parser disagreement as a rejection."
- **Many spellings of one address.** An [[ip-address|IP address]] can be written in several notations, and IPv6 can embed IPv4 addresses. Never compare addresses as strings; parse them and compare against networks.
- **DNS answers change.** A name can pass the check, then resolve to an internal address when the client connects, which is [[dns-rebinding|DNS rebinding]]. OWASP warns that "Domain allowlisting alone does not prevent DNS rebinding." Validate the resolved addresses and connect only to an address you validated, keeping the original host name for the `Host` header and certificate checks.
- **Redirects.** A URL that passes can answer with a redirect to an internal address. An [[open-redirect|open redirect]] on a trusted site makes this easy. Disable redirect following, or apply the full policy to every hop.

This is why OWASP prefers allowlists here: "Deny-lists are bypass-prone. Prefer allow-lists." Its strongest advice for features that call known services is "Do not accept complete URLs from the user": accept an identifier, and build the request yourself.

## Worked example

The activity: evaluate destination policy without contacting external systems. The `shop.example` product team lets merchants import images from one partner, whose image hosts are published with fixed address ranges. The policy is a pure function: it takes a URL and a resolver function, so tests can pass a fake resolver and never touch the network.

```python
import ipaddress
from urllib.parse import urlsplit

# Each allowed host, and the address range its owner publishes for it.
ALLOWED = {
    "images.partner.example": ipaddress.ip_network("203.0.113.0/24"),
    "cdn.partner.example": ipaddress.ip_network("198.51.100.0/24"),
}

def check_destination(url: str, resolve) -> tuple[bool, str]:
    parts = urlsplit(url)
    if parts.scheme != "https":
        return False, "scheme must be https"
    if parts.username is not None or parts.password is not None:
        return False, "user names and passwords in URLs are not allowed"
    host = (parts.hostname or "").removesuffix(".")  # hostname is already lowercase
    network = ALLOWED.get(host)
    if network is None:
        return False, f"host {host!r} is not on the allowlist"
    if parts.port not in (None, 443):
        return False, "port must be 443"
    addresses = [ipaddress.ip_address(a) for a in resolve(host)]
    if not addresses:
        return False, "name does not resolve"
    for ip in addresses:
        if ip.version == 6 and ip.ipv4_mapped:
            ip = ip.ipv4_mapped
        if ip not in network:
            return False, f"{host} resolves to {ip}, outside {network}"
    return True, "allowed; connect only to the checked addresses"

FAKE_DNS = {
    "images.partner.example": ["203.0.113.10"],
    "cdn.partner.example": ["10.0.0.5"],          # a record that now points inside
}
```

Running the approved test URLs through `check_destination(url, lambda h: FAKE_DNS.get(h, []))` gives:

| Test URL                                             | Decision | Reason                                          |
| ---------------------------------------------------- | -------- | ----------------------------------------------- |
| `https://images.partner.example/cat.png`             | Allow    | Host allowlisted; resolves inside its range     |
| `https://IMAGES.partner.example./cat.png`            | Allow    | Same host after canonicalization                |
| `http://images.partner.example/cat.png`              | Deny     | Scheme must be https                            |
| `https://evilpartner.example/cat.png`                | Deny     | Exact host match fails (a suffix check would pass) |
| `https://images.partner.example@192.0.2.50/cat.png`  | Deny     | Userinfo present; the parsed host is 192.0.2.50 |
| `https://images.partner.example:8443/cat.png`        | Deny     | Port must be 443                                |
| `https://cdn.partner.example/logo.png`               | Deny     | Resolves to 10.0.0.5, outside 198.51.100.0/24   |
| `https://169.254.169.254/`                           | Deny     | Not an allowlisted host                         |
| `file:///etc/passwd`                                 | Deny     | Scheme must be https                            |

Every decision was made offline. The `cdn` row is the important one: the name is on the allowlist, but its address is not where its owner said it would be, so the request is refused.

An offline check still leaves a gap: the HTTP client might resolve the name again when it connects. Close it by enforcing the address rule at connection time. The host, scheme, and port checks still run first; the connection-time check adds the address rule for the address actually used. In Go, a `net.Dialer` can run a `Control` function after resolution and just before each connection, and `CheckRedirect` can refuse redirects. This sketch allows one partner range:

```go
var allowed = []netip.Prefix{netip.MustParsePrefix("203.0.113.0/24")}

// control runs after DNS resolution, just before each connection is made.
func control(network, address string, _ syscall.RawConn) error {
	ap, err := netip.ParseAddrPort(address)
	if err != nil {
		return err
	}
	ip := ap.Addr().Unmap()
	for _, p := range allowed {
		if p.Contains(ip) {
			return nil
		}
	}
	return fmt.Errorf("destination %s is not allowed", ip)
}

client := &http.Client{
	Timeout:   5 * time.Second,
	Transport: &http.Transport{DialContext: (&net.Dialer{Control: control}).DialContext},
	CheckRedirect: func(*http.Request, []*http.Request) error {
		return errors.New("redirects are not followed")
	},
}
```

Tested against a throwaway server listening on `127.0.0.1` on your own machine, this client fails with "destination 127.0.0.1 is not allowed" before any byte is sent.

## Defenses

| Defense                                           | What it does                                          | Limits                                                         |
| ------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| Accept an identifier, not a URL                   | The server builds every request itself                | Not possible for open features such as webhooks                |
| Allowlist of scheme, exact host, and port         | Rejects every destination nobody approved             | Must be maintained as partners change                          |
| Validate resolved addresses at connection time    | Defeats DNS rebinding and internal records            | Needs a client or proxy that exposes the hook                  |
| Disable redirects, or re-check each hop           | Stops a checked URL from moving elsewhere             | Some legitimate services redirect                              |
| [[egress-filtering|Egress filtering]] and segmentation | The fetcher's network cannot reach internal ranges or metadata | Must be kept in step with the network        |
| IMDSv2 required, least-privilege machine roles    | Defeats many simple SSRF flaws; limits stolen credentials | Defense in depth only                                     |
| Authentication on internal services               | Removes trust based on network location               | Every internal service must take part                          |
| Response handling, timeouts, and logging          | Return only parsed data; reveal unusual destinations   | Blind SSRF still has side effects                              |

For destinations that cannot be listed in advance, such as customer webhooks, OWASP's second case applies: verify that every resolved address is public, rejecting loopback, private, and link-local ranges, connect only to validated addresses, and disable redirects. Put the fetcher in its own network segment behind a [[firewall]] or egress proxy, so that a bug in the application check still meets a wall at the network layer. [[network-segmentation|Network segmentation]] and [[least-privilege|least privilege]] make SSRF a contained bug instead of a breach.

## Common misconceptions

- **"We validate the URL string."** Strings can carry userinfo, odd notations, and names that resolve elsewhere. Validate parsed hosts and resolved addresses.
- **"Blocking 127.0.0.1 and localhost is enough."** Loopback has many spellings, and private, link-local, and IPv6 ranges remain. OWASP calls deny-lists bypass-prone.
- **"Internal services are safe behind the firewall."** SSRF comes from inside the firewall. Internal services should authenticate their callers.
- **"No response shown means no risk."** Blind SSRF still reaches internal services, triggers actions, and reveals which addresses answer.
- **"IMDSv2 fixes SSRF."** It protects one high-value destination against many simple flaws. Everything else on the internal network still needs a destination policy.

## Try it in the lab

> [!ETHICS] Only test systems you own or have written permission to test.

In [the lab](lab:ssrf-url-filter), a server fetches any URL you type and shows what came back, including the address each host resolved to. No request leaves your browser: a fixed DNS map and fake services stand in for the network. Each defense button toggles: click it again to turn that defense off.

1. **Use the deputy.** With no defenses, pick **Cloud metadata** and click **Fetch URL**: the server returns role credentials from 169.254.169.254, the link-local metadata address in the destination table. Submit the flag for "Steal cloud credentials," then do the same with **Loopback admin** for "Reach the loopback admin." You never reach those services yourself; the server, a [[confused-deputy|confused deputy]], does it for you, as in the link-preview diagram.
2. **See why names are not enough.** Fetch **metadata.evil.example**. The name looks external, but the result shows it resolving to the same metadata address, so a check on the host name text would have let it through. Answer "Why the string is not enough."
3. **Block internal IPs.** Click **Block internal IPs** and repeat all three fetches. The lab resolves each host and refuses loopback, link-local, and private addresses, which solves "Block the internal ranges." Leave the allowlist off for now: it refuses requests before the address check runs.
4. **Allowlist.** Click **Destination allowlist**, which allows only two named hosts. Fetch an internal URL to solve "Allowlist destinations," then fetch **Public image**, which still succeeds.
5. **Finish on paper.** The lab's allowlist checks only the host name, and its fake DNS never changes. Which row of the worked example's table would that allowlist alone let through, and which lab defense would still refuse it? What do the address ranges in `check_destination` and the Go `Control` function add?

**Without the lab.** Everything here runs offline on your own machine.

1. Copy `check_destination` and `FAKE_DNS` into a Python file. Before running, predict the decision for each test URL in the table, then run them and compare.
2. Add three test URLs of your own: one that should be allowed, one that should be denied for its port, and one that is denied only because of its resolved address. Change `FAKE_DNS` to simulate a record that moves.
3. Find the line that rejects userinfo and comment it out. Which test now gives a different answer, and why is the parsed host still the right thing to check?
4. Try `https://images.partner.example:99999/cat.png`. Python raises an error instead of returning a decision. Change the function so that a malformed port produces a clear denial, and explain why a policy should fail closed.
5. Optional, with Go installed: start a local test server with `httptest.NewServer`, point the Go client at it, and confirm that the `Control` function refuses the loopback address.

## Key takeaways

- SSRF lets an outsider choose where a trusted server sends requests; the server's network position is the prize.
- Cloud metadata services are a prime target; require session tokens such as IMDSv2 and give machine roles least privilege.
- Prefer identifiers or a strict allowlist of scheme, exact host, port, and address range over parsing open URLs.
- Check resolved addresses where the connection is made, and refuse or re-check redirects.
- Back the application with egress filtering, segmentation, and authenticated internal services.

## Go deeper

- The OWASP cheat sheet's rule, "Treat parser disagreement as a rejection," points to a research area: two URL parsers in one request path can disagree about the host. Compare how your language's URL library and your HTTP client parse unusual inputs, and design a differential test for them.
- Webhooks are SSRF by design: the customer chooses the destination. OWASP describes a proof of legitimacy, in which the receiving application generates a random token that legitimate requests must carry. How would you combine that with an egress proxy and per-customer limits from [API rate and business-logic controls](lesson:APP-08)?
- Open question: a metadata service trusts every process on the machine. What would a design look like in which each workload must prove its identity to obtain credentials? Compare your answer with [service identities and secret management](lesson:IAM-07).
