---
topicId: NET-04
title: TCP connection state
summary: Follow a TCP connection through its states from LISTEN to TIME-WAIT, model a listener as a toy state machine, and see how SYN floods and forged resets exploit the state a host keeps and the checks it makes, and how SYN cookies and stricter checks respond.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - Trace the TCP states that a client and a server pass through during connection setup and teardown.
  - Explain how sequence and acknowledgment numbers keep off-path attackers from injecting resets or data, and why they offer no protection against on-path attackers.
  - Use a toy state machine to predict how a host answers unexpected segments and to identify the resource that a SYN flood exhausts.
  - Evaluate SYN cookies, backlog tuning, challenge ACKs, and cryptographic protections against the attacks each one addresses.
prerequisites: [NET-01]
concepts: [tcp, three-way-handshake, syn-flood, syn-cookies]
keywords:
  - TCP states
  - TCP state machine
  - transmission control block
  - LISTEN
  - SYN-SENT
  - SYN-RECEIVED
  - ESTABLISHED
  - FIN-WAIT
  - CLOSE-WAIT
  - TIME-WAIT
  - half-open connection
  - backlog
  - SYN-ACK
  - RST
  - reset injection
  - initial sequence number
  - ISN
  - challenge ACK
  - blind in-window attack
  - SYN flooding
  - RFC 9293
  - RFC 4987
  - RFC 5961
sources:
  - title: 'Computer Security (CS 161 textbook), Ch. 30: TCP and UDP'
    url: https://textbook.cs161.org/network/transport.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'Computer Security (CS 161 textbook), Ch. 34: Denial-of-Service (DoS)'
    url: https://textbook.cs161.org/network/dos.html
    publisher: University of California, Berkeley (CS 161)
    license: CC BY-SA 4.0
    sourceId: cs161-textbook
  - title: 'RFC 9293: Transmission Control Protocol (TCP)'
    url: https://rfc-editor.org/rfc/rfc9293.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
  - title: 'RFC 4987: TCP SYN Flooding Attacks and Common Mitigations'
    url: https://www.rfc-editor.org/rfc/rfc4987
    publisher: IETF (RFC Editor)
  - title: "RFC 5961: Improving TCP's Robustness to Blind In-Window Attacks"
    url: https://www.rfc-editor.org/rfc/rfc5961.html
    publisher: IETF (RFC Editor)
    license: IETF Trust Legal Provisions (BCP 78)
quiz:
  - question: A server receives a SYN and answers with a SYN-ACK. Which state does that connection enter, and why does it matter for denial of service?
    choices:
      - ESTABLISHED, because the server has agreed to talk, so data can flow at once.
      - TIME-WAIT, because the server waits to see whether the client really exists.
      - SYN-RECEIVED, a half-open entry the server keeps until the final ACK arrives or a timer expires, which is exactly what a SYN flood fills up.
      - CLOSED, because nothing is stored until the client sends data.
    answer: 2
    explanation: The server commits memory to a connection before the client has proved it can receive packets at its claimed address. Forged SYNs never complete the handshake, so their half-open entries sit until they time out, and genuine clients find no room.
  - question: Why is it hard for an off-path attacker to reset alice's established connection to shop.example?
    choices:
      - The forged RST must carry the right addresses and ports and a sequence number the receiver will accept, which the attacker cannot see and must guess.
      - Routers drop any packet with the RST flag that did not come from the real server.
      - TCP signs every segment with a key agreed during the handshake.
      - Resets are accepted only during the handshake, never in ESTABLISHED.
    answer: 0
    explanation: TCP accepts segments whose numbers fit the receiver's expectations, so sequence numbers act as an unauthenticated secret. RFC 5961 narrows what a reset must match, which makes blind guessing far harder. An on-path attacker sees the numbers and needs no guessing at all.
  - question: With SYN cookies enabled, what does a server store about a connection between sending its SYN-ACK and receiving the final ACK?
    choices:
      - A full transmission control block, exactly as without cookies.
      - The client's first data segment, so it can check it later.
      - A list of every client address that has ever connected.
      - Nothing for that connection; the needed information is encoded in its initial sequence number and checked when the ACK returns.
    answer: 3
    explanation: The server derives its sequence number from a secret, the connection's addresses and ports, and a time value. A genuine client's ACK echoes that number plus one, so the server can rebuild the state only for clients that really received the SYN-ACK.
  - question: An on-path attacker injects a TCP reset with correct numbers into alice's HTTPS connection. What happens?
    choices:
      - Nothing, because TLS rejects the reset.
      - The TCP connection is torn down; TLS protects the data it carries but not the TCP header, so alice sees an error and must reconnect.
      - The reset is forwarded to the server, which decides whether to accept it based on the TLS session keys.
      - The browser silently switches the connection to UDP.
    answer: 1
    explanation: TLS runs on top of TCP and authenticates only its own records. A reset is a TCP-level event, so TLS cannot stop it, though it can tell that the stream ended without a proper TLS close. Protecting TCP headers themselves takes IPsec or TCP's authentication option.
  - question: In the toy listener model, what happens when an ACK arrives from a client that matches no half-open entry and no established connection?
    choices:
      - The listener creates an ESTABLISHED connection, because an ACK proves the client is real.
      - The listener ignores it silently, because TCP never answers unexpected segments.
      - The listener answers with a reset, the same response RFC 9293 prescribes when no matching connection exists.
      - The listener stores the ACK until a matching SYN arrives.
    answer: 2
    explanation: A host replies to a segment that belongs to no connection with a reset, so stray or forged segments get a clear refusal. That is also why alice's laptop resets the SYN-ACK caused by a SYN forged in her name.
---

## Why it matters

A TCP connection is not just a stream of packets; it is a pair of records, one at each end, that track where the conversation stands. That state is what makes TCP reliable, and it is also what attackers aim at. Every record costs the server memory, so an attacker who can make a server create records cheaply can exhaust it. And every record holds expectations, chiefly sequence numbers, so an attacker who can meet those expectations can inject data into a connection or tear it down.

Both kinds of attack are old and real. Steven Bellovin's 1989 paper on TCP/IP security, reprinted with his later commentary, describes how Morris used predictable initial sequence numbers to "construct a TCP packet sequence without ever receiving any responses from the server," impersonating a trusted host. The CS 161 textbook cites an ISP, Comcast, injecting resets to cut off BitTorrent uploads. SYN flooding, which fills a server's table of half-open connections, has its own IETF document, RFC 4987, describing the attack and its common mitigations. Understanding connection state lets you read these attacks, and the defenses, as consequences of a few design decisions.

## The core idea

Think of a phone call that both sides log in a notebook. "Can you hear me?" "Yes, can you hear me?" "Yes." Only then does the conversation start, and each side numbers every sentence it says, so the other can notice anything missing. At the end, each side says goodbye and waits a moment in case the other's last words were lost.

In [[tcp|TCP]], the notebook is a transmission control block: the two addresses and two ports, the next sequence number to send, the next one expected, the window, and the connection's state. Every arriving segment is judged against it.

The assumptions behind that judgment:

1. **No cryptographic authentication.** A segment is accepted if its addresses, ports, flags, and numbers fit the record. Nothing proves who sent it.
2. **Numbers stand in for secrets.** Initial sequence numbers are chosen unpredictably, as RFC 9293 directs, so an off-path attacker does not know them.
3. **On-path attackers see everything.** Anyone who can read the segments knows the numbers and can forge segments that fit.
4. **Servers commit early.** A server creates a half-open record when a SYN arrives, before the client has shown it can receive packets at its claimed address.

## How it works

### The states

RFC 9293 names the states a connection moves through:

| State        | Who                     | Meaning                                                               |
| ------------ | ----------------------- | --------------------------------------------------------------------- |
| LISTEN       | Server                  | Waiting for a SYN on a port                                           |
| SYN-SENT     | Client                  | Sent a SYN, waiting for the SYN-ACK                                   |
| SYN-RECEIVED | Server                  | Got a SYN and sent a SYN-ACK; waiting for the final ACK (half-open)   |
| ESTABLISHED  | Both                    | Data flows in both directions                                         |
| FIN-WAIT-1   | Side that closes first  | Sent a FIN, waiting for it to be acknowledged                         |
| FIN-WAIT-2   | Side that closes first  | Its FIN was acknowledged; waiting for the other side's FIN            |
| CLOSE-WAIT   | Side that closes second | Received a FIN; waiting for its own application to close              |
| LAST-ACK     | Side that closes second | Sent its own FIN; waiting for the final acknowledgment                |
| TIME-WAIT    | Side that closes first  | Waits about twice the maximum segment lifetime before forgetting      |
| CLOSED       | Both                    | No connection (RFC 9293 calls it a fictional state: no record exists) |

A CLOSING state also exists for the rare case in which both sides send FIN at the same moment.

### Setup and teardown

```sequence
title: A TCP connection from setup to teardown
participant C as Client 192.0.2.10:51544
participant S as Server 203.0.113.80:443
note S: LISTEN
C -> S: SYN, seq=x (client: SYN-SENT)
S --> C: SYN-ACK, seq=y, ack=x+1 (server: SYN-RECEIVED)
C -> S: ACK, ack=y+1 (both: ESTABLISHED)
note: Data flows; every byte is numbered and acknowledged
C -> S: FIN (client: FIN-WAIT-1)
S --> C: ACK (server: CLOSE-WAIT; client: FIN-WAIT-2)
S -> C: FIN (server: LAST-ACK)
C -> S: ACK (client: TIME-WAIT; server: CLOSED)
```

The [[three-way-handshake]] does two jobs: each side learns the other's initial sequence number, and the server learns that the client can receive packets at the address it claimed, because the client's ACK echoes a number that only traveled to that address. The teardown is a pair of one-way closes; either side may keep sending after the other has finished. TIME-WAIT exists so that the final ACK can be resent if it is lost, and so that stray segments from this connection die out before a new connection reuses the same addresses and ports.

### Sequence numbers as a weak secret

A receiver accepts a segment only if its sequence number falls inside the window of bytes it is willing to take. An off-path attacker who wants to inject data or a reset (RST) must therefore get the addresses, ports, and an acceptable sequence number right without seeing any of the connection's traffic.

The original rule made that easier than it sounds. As RFC 5961 quotes it, "A reset is valid if its sequence number is in the window," so the attacker needs about 2^31 divided by the window size guesses on average, not 2^31: roughly 65,536 packets for a 32,768-byte window. RFC 5961 credits Watson's 2004 presentation with first showing that such blind attacks were practical, and it tightens the rules. A reset is accepted only if its sequence number exactly matches the next expected byte. If it is merely inside the window, the receiver sends a "challenge ACK" instead; the genuine peer, which really did want to reset, answers with a correctly numbered reset, while a blind attacker never sees the challenge. An unexpected SYN on an established connection also gets a challenge ACK, whatever its sequence number, and an optional stricter check on acknowledgment numbers makes injected data harder, though not impossible, to slip in.

RFC 5961 is explicit about the limit: "These changes to the TCP state machine do NOT protect an implementation from on-path attacks." An on-path attacker reads the numbers off the wire. And because [[tls|TLS]] protects only the data inside TCP, not TCP's own headers, such an attacker can end even an encrypted connection by injecting one reset.

### A toy state machine

The activity for this topic is to investigate a small model and its failure conditions. This Python sketch models a listener's handling of connection setup. It is a teaching toy with no timers, windows, or networking:

```python
import hashlib
import hmac

SECRET = b"server-secret"   # a real server picks this randomly and rotates it
BACKLOG = 4                 # how many half-open (SYN-RECEIVED) entries fit


def isn_for(client):
    """Initial sequence number from a keyed hash, so outsiders cannot predict it."""
    digest = hmac.new(SECRET, repr(client).encode(), hashlib.sha256).digest()
    return int.from_bytes(digest[:4], "big")


class ToyListener:
    def __init__(self, syn_cookies=False):
        self.syn_cookies = syn_cookies
        self.half_open = {}        # client -> ACK number we expect back
        self.established = set()

    def on_segment(self, client, flags, ack=None):
        if flags == "SYN":
            if self.syn_cookies:   # store nothing; the ISN itself is the proof
                return f"SYN-ACK seq={isn_for(client)} (no state kept)"
            if len(self.half_open) >= BACKLOG:
                return "drop SYN: no free half-open slot"
            self.half_open[client] = (isn_for(client) + 1) % 2**32
            return "SYN-ACK sent; entry is SYN-RECEIVED"
        if flags == "ACK":
            expected = (isn_for(client) + 1) % 2**32
            if self.syn_cookies:
                ok = ack == expected
            else:
                ok = self.half_open.pop(client, None) == ack
            if ok:
                self.established.add(client)
                return "ESTABLISHED"
            return "RST: ACK matches no connection we started"
        if client in self.established:
            return "process segment (if its sequence number is in the window)"
        return "RST: no such connection"
```

Two details mirror real TCP. The initial sequence number comes from a keyed hash of the connection's identity, like the secret-keyed function F in RFC 9293's recommended "ISN = M + F(localip, localport, remoteip, remoteport, secretkey)" (the toy leaves out the clock M), so an outsider cannot compute it. And a segment that matches no connection earns a reset, as RFC 9293 requires, which is how alice's laptop answers a SYN-ACK provoked by a SYN that someone forged in her name.

## Worked example

Use the toy to watch a [[syn-flood|SYN flood]] and its fix. The forged sources come from the documentation range 198.51.100.0/24.

| Step | Event                                          | Toy listener's response                          | Why                                                                                   |
| ---- | ---------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1    | SYNs "from" 198.51.100.1 through .4            | SYN-ACK sent; entry is SYN-RECEIVED (four times) | Each SYN creates a half-open entry                                                    |
| 2    | The SYN-ACKs go to those addresses             | (no ACKs or resets return)                       | The forged addresses are offline or unused; a live host would reset and free the slot |
| 3    | Alice's genuine SYN from 192.0.2.10:51544      | drop SYN: no free half-open slot                 | The backlog of four is full: the failure condition                                    |
| 4    | Restart with `syn_cookies=True`; repeat step 1 | SYN-ACK seq=... (no state kept)                  | Nothing accumulates, however many SYNs arrive                                         |
| 5    | Alice's SYN, then her ACK echoing seq + 1      | ESTABLISHED                                      | Her ACK proves she received the SYN-ACK                                               |
| 6    | An ACK with a guessed number from 198.51.100.9 | RST: ACK matches no connection we started        | Without the secret, the attacker cannot compute the cookie                            |

```sequence
title: A SYN flood fills the half-open table (conceptual)
participant F as Forged sources
participant S as Server in LISTEN
participant C as Alice
F -> S: SYNs claiming 198.51.100.x addresses
S --> F: SYN-ACKs to addresses that never answer
note S: Half-open slots stay full until timers expire
C -> S: Alice's genuine SYN
S -x C: Dropped: no free half-open slot
```

Now probe the model's failure conditions, as the activity asks:

- **Timers.** Real stacks retransmit SYN-ACKs and eventually discard half-open entries. Add a timeout to the toy: a flood must keep sending SYNs faster than entries expire. RFC 4987 lists shortening the SYN-RECEIVED timer and enlarging the backlog as mitigations, and notes that a shorter timer can drop slow legitimate clients while the attacker only needs a proportionally higher rate.
- **Cookie limits.** The toy's cookie never expires and carries no options. Real SYN cookies embed time-dependent bits, so old cookies stop working, and they have only a few bits for TCP options; RFC 4987 calls losing window scaling "the largest price." That is one reason SYN cookies "typically are not used by default" and switch on only under heavy load.
- **Real addresses.** If the flood comes from machines that complete the handshake, cookies do nothing: every connection is genuine, and the attack moves to established connections or the application, a problem for [[ddos-attack|distributed denial-of-service]] defenses.

## Defenses

> [!ETHICS] Only test systems you own or have written permission to test.

- **Unpredictable initial sequence numbers.** RFC 9293's keyed-hash recommendation stops off-path attackers from forging whole connections. Limit: no protection against anyone who can see the traffic.
- **Stricter acceptance rules.** RFC 5961's exact-match resets and challenge ACKs make blind resets and injections much harder. Limit: still useless against on-path attackers.
- **SYN cookies and SYN caches.** [[syn-cookies|SYN cookies]] keep no state until a client proves it received the SYN-ACK; a SYN cache keeps a smaller record than a full connection, and hybrids switch to cookies when the cache fills. Limits: cookies lose some TCP options and cost a hash per SYN, and neither helps when the flood completes handshakes from real addresses.
- **Backlog and timer tuning.** A larger backlog and a shorter SYN-RECEIVED timeout raise the rate an attacker needs. Limit: they move the threshold rather than remove it.
- **Filtering and upstream help.** Ingress filtering (BCP 38) reduces floods from forged addresses, and firewalls or proxies can complete handshakes on a server's behalf (both in RFC 4987). Limits: they need capacity for the whole flood, and they become part of what you must trust.
- **Authenticate segments when it matters.** IPsec, which RFC 5961 names as the way to protect a connection from both on-path and off-path attackers, or TCP's authentication options on long-lived connections such as BGP sessions between routers, let endpoints reject forged segments outright (see [Routing and BGP security](lesson:NET-06)). Limit: both sides must share keys, so this does not fit the open web.

## Common misconceptions

- **"TLS protects my connection from being reset."** TLS authenticates its records, not TCP's headers. A correctly numbered forged reset still closes the connection.
- **"Sequence numbers are authentication."** They are 32-bit values that anyone on the path can read. They deter blind guessing only.
- **"A SYN flood needs enormous bandwidth."** The classic attack targets the half-open table, which modest packet rates can fill when each entry waits for a timeout.
- **"SYN cookies stop denial of service."** They stop one resource-exhaustion attack. Floods of real connections, application requests, or raw bandwidth need other defenses.
- **"TIME-WAIT entries mean something is leaking."** TIME-WAIT is deliberate; it protects new connections from old, delayed segments.

## Try it yourself

Use only your own computer and traffic.

```bash
# Linux: list TCP sockets with their states
ss -tan
ss -tan state time-wait

# macOS
netstat -an -p tcp

# Windows (PowerShell)
Get-NetTCPConnection | Sort-Object State | Format-Table -AutoSize

# Make one short connection to watch it open and close
curl -sI https://example.com
```

1. Run the listing and find connections in ESTABLISHED, and possibly CLOSE-WAIT or TIME-WAIT. Which side of each connection is yours?
2. Run the `curl` command, then list sockets again within a minute. If your side closed first, you will see a TIME-WAIT entry for the server's address and port 443.
3. Optional: capture your own `curl` connection in Wireshark and label each SYN, SYN-ACK, ACK, FIN, and RST with the state transition it causes, using the sequence diagram above.
4. Copy the toy listener into a file on your computer and extend it: add a timeout for half-open entries, count how many SYNs per second an attacker would need to keep alice out, and add a time counter to the cookie so that old cookies expire. What new failure condition does each change introduce?

## Key takeaways

- TCP keeps a record per connection, and its states, from LISTEN through SYN-RECEIVED, ESTABLISHED, and the FIN exchanges to TIME-WAIT, describe what each side expects next.
- The handshake proves that a client can receive at its claimed address, but a server commits memory before that proof arrives, which is what a SYN flood exploits.
- Sequence numbers are an unauthenticated secret: unpredictable values and RFC 5961's checks stop blind off-path attackers, never on-path ones.
- SYN cookies remove the half-open state for clients that never finish the handshake, but they do not stop floods from real addresses.
- TLS protects what TCP carries, not TCP itself; a forged reset can still end an encrypted connection.

## Go deeper

- Steven M. Bellovin's ["A Look Back at 'Security Problems in the TCP/IP Protocol Suite'"](https://www.cs.columbia.edu/~smb/papers/acsac-ipext.pdf) explains Morris's sequence-number attack, notes that "Kevin Mitnick reimplemented Morris' idea and used it to attack Tsutomu Shimomura," and discusses later reset attacks.
- [RFC 4987](https://www.rfc-editor.org/rfc/rfc4987) compares end-host and network-based SYN flood mitigations and their trade-offs. Open question: as more traffic moves to QUIC over UDP, which of these ideas carry over, and which problems return?
- [RFC 5961](https://www.rfc-editor.org/rfc/rfc5961.html) works through the arithmetic of blind in-window attacks. Exercise: estimate how many forged resets a blind attacker needs on average, with and without the exact-match rule, for a 65,535-byte window.
