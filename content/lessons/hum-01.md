---
topicId: HUM-01
title: Social-engineering mechanisms
summary: How social engineers borrow trust, apply pressure, and steer a legitimate user into acting for them, and which process and technical controls break that chain even when the story is convincing.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Break a social-engineering attempt into its stages of research, pretext, contact, influence, request, and exit.
  - Explain how levers such as authority, urgency, and reciprocation shortcut careful decisions.
  - Distinguish phishing, spear phishing, whaling, smishing, vishing, pretexting, baiting, quid pro quo, and tailgating by channel and goal.
  - Recommend process and technical controls, such as out-of-band verification and phishing-resistant MFA, and state the limits of each.
prerequisites: [FND-02, WEB-03]
concepts:
  - social-engineering
  - pretexting
  - spear-phishing
  - whaling
  - smishing
  - vishing
  - baiting
  - quid-pro-quo
  - tailgating
  - business-email-compromise
  - mfa-fatigue
  - sim-swapping
  - out-of-band-verification
keywords:
  - SE
  - social engineering
  - pretext
  - BEC
  - CEO fraud
  - payment redirection
  - voice phishing
  - SMS phishing
  - help desk fraud
  - push bombing
  - MFA fatigue
  - SIM swap
  - piggybacking
  - persuasion principles
  - CAPEC-416
  - CAPEC-407
  - CAPEC-417
  - T1566
  - T1566.004
  - T1598
sources:
  - title: 'CAPEC-416: Manipulate Human Behavior'
    url: https://capec.mitre.org/data/definitions/416.html
    publisher: The MITRE Corporation
    license: CAPEC Terms of Use (royalty-free license)
    sourceId: mitre-capec
  - title: 'Understanding scam victims: seven principles for systems security (UCAM-CL-TR-754)'
    url: https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-754.html
    publisher: University of Cambridge Computer Laboratory
  - title: Twitter Investigation Report (October 2020)
    url: https://www.dfs.ny.gov/system/files/documents/2026/07/Twitter-Investigation-Report.pdf
    publisher: New York State Department of Financial Services
  - title: 'Scattered Spider (Cybersecurity Advisory AA23-320A)'
    url: https://www.cisa.gov/news-events/cybersecurity-advisories/aa23-320a
    publisher: CISA and FBI, with international partners
    license: TLP:CLEAR
  - title: 2025 IC3 Annual Report
    url: https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf
    publisher: Federal Bureau of Investigation, Internet Crime Complaint Center (IC3)
  - title: Business Email Compromise
    url: https://www.fbi.gov/how-we-can-help-you/common-frauds-and-scams/business-email-compromise
    publisher: Federal Bureau of Investigation
quiz:
  - question: A caller who says he is from IT asks Alice to read back the six-digit code that just arrived on her phone, and minutes later her account is taken over. Why did MFA not stop this?
    choices:
      - The caller broke the cryptography inside the authenticator app.
      - The code shows only that its holder received it, so once Alice reads it out, the attacker can submit it to the real site.
      - One-time codes stay valid for 24 hours, so any old code would have worked.
      - Text messages are broadcast in plaintext to every phone nearby.
    answer: 1
    explanation: A one-time code or a push approval is a secret the user can be talked into sharing or approving. Nothing in it tells the user which site is asking. Phishing-resistant authenticators such as security keys and passkeys check the site's identity themselves, so there is nothing useful to relay.
  - question: An email signed by the CFO asks Alice to change a supplier's bank account before 3 p.m. and says "email only, I'm boarding a flight." What is the strongest response?
    choices:
      - Reply to the email and ask the CFO to confirm the change in writing.
      - Call the phone number in the email signature to double-check.
      - Check that the message passed DMARC, and make the change if it did.
      - Contact the supplier and the CFO through numbers already on file, and follow the payment-change procedure.
    answer: 3
    explanation: Replying or calling a number in the message reaches whoever sent it, possibly the attacker. DMARC says only that a domain authorized the message, not that its sender is honest. Verification must use a channel that existed before the request arrived.
  - question: Why can't SPF, DKIM, and DMARC alone stop business email compromise?
    choices:
      - They show only that a domain authorized a message, so look-alike domains and compromised real mailboxes still pass.
      - They encrypt each message, which hides the attacker's real address from the recipient.
      - They work only for messages sent between two people at the same company.
      - They block all external email, so attackers switch to text messages.
    answer: 0
    explanation: Email authentication protects a domain's name from forgery. It cannot judge intent. A message from a look-alike domain the attacker registered, or from a supplier's real but compromised mailbox, authenticates perfectly.
  - question: A visitor carrying two coffees waits by a badge-controlled door and smiles at Bob as he swipes in. Bob holds the door. Which mechanism and lever are at work?
    choices:
      - Baiting, exploiting greed with an enticing free item.
      - Quid pro quo, trading a service for access.
      - Tailgating, exploiting politeness and the reluctance to challenge someone who looks like they belong.
      - Vishing, exploiting authority over the phone.
    answer: 2
    explanation: Tailgating means following an authorized person through a controlled entrance. It relies on helpfulness and on the social cost of challenging someone, which is why policies that make challenging normal, and doors that admit one person per badge, work better than asking people to be suspicious.
  - question: A help-desk agent can reset any employee's MFA after a phone call. Which change most reduces the risk of attackers talking their way into accounts?
    choices:
      - Show the help desk an annual awareness video about vishing.
      - Require a callback to the number on file or a manager's approval before any MFA reset, and log every reset for review.
      - Ask callers for their employee ID and date of birth before resetting.
      - Let agents skip verification during busy periods so queues stay short.
    answer: 1
    explanation: Employee IDs and birth dates are often discoverable, so they do not prove identity. A callback through a contact established before the call, or a second person's approval, forces the attacker to defeat an independent channel. Logging lets someone catch resets that slip through.
---

## Why it matters

Most security controls are built to stop someone who lacks permission. [[social-engineering|Social engineering]] goes around them by persuading someone who has permission to act for the attacker. The firewall, the password rules, and the access-control lists all work as designed; the harmful request simply arrives through a person allowed to carry it out.

In its 2025 annual report, the FBI's Internet Crime Complaint Center (IC3) recorded 24,768 complaints of [[business-email-compromise]] (BEC), a fraud in which a criminal poses as an executive, colleague, or supplier to redirect a payment. Reported BEC losses were about $3.05 billion, second only to investment fraud. The July 2020 compromise of Twitter also began with people, not a software flaw. According to the New York State Department of Financial Services, callers posing as Twitter's IT help desk steered employees to a fake VPN login page, used the credentials as they were typed, and persuaded some employees to approve the multi-factor prompt that followed. The attackers compromised 130 accounts and took about $118,000 in bitcoin.

This lesson takes the attacker's mechanisms apart so you can recognize them and, more importantly, design procedures that do not depend on everyone spotting every trick.

## The core idea

A social-engineering attack borrows trust that belongs to someone else and spends it before anyone checks. Three assumptions have to hold:

1. **The target can do something valuable.** An accounts-payable clerk can pay invoices, a help-desk agent can reset passwords, and a receptionist can open a door. The attacker needs someone who holds such a power.
2. **The attacker can reach the target** through a channel the target treats as normal: email, a text message, a phone call, a chat tool, or the front entrance.
3. **The target acts before verifying.** Every attack is a race between the attacker's story and the moment someone checks it against an independent source.

An analogy: picking a lock is slow and noisy, but persuading the keyholder that you are the locksmith is often easier. Defenders therefore teach people to notice the pressure and, because people sometimes miss it, build procedures in which a story alone never moves money, resets a credential, or grants access.

Frank Stajano and Paul Wilson, who studied scams recreated for the BBC series _The Real Hustle_, drew the conclusion engineers need: the behaviors fraudsters exploit are predictable features of human decision making, so systems should be designed around them rather than blaming users for being gullible.

## How it works

### The stages of an attack

Most attempts, from a mass text to a months-long fraud, pass through the same stages.

| Stage     | What the attacker does                                                      | What it gives them    |
| --------- | --------------------------------------------------------------------------- | --------------------- |
| Research  | Gathers names, roles, suppliers, and jargon from public pages and old leaks | A believable story    |
| Pretext   | Invents a role and a reason, such as "IT is fixing your VPN"                | A reason to cooperate |
| Contact   | Picks a channel: email, SMS, phone, chat, or a visit                        | Reach                 |
| Influence | Applies levers such as authority and urgency                                | A hasty decision      |
| Request   | Asks for one action: a password, a code, a payment, an open door            | The payoff            |
| Exit      | Ends the contact smoothly, sometimes urging secrecy                         | Time before discovery |

The Twitter investigators concluded that the attackers appear to have researched employees' functions and titles first, which made the help-desk story fit. Inventing the role and the reason is [[pretexting]], which MITRE's Common Attack Pattern Enumeration and Classification (CAPEC) describes as creating an invented scenario and assuming an identity or role to persuade a target to release information or act (CAPEC-407).

Defenders should pay most attention to the request. An attacker can skip research or use a clumsy pretext but cannot skip asking for what they want, so a procedure that treats certain requests as high risk, however convincing the story, targets the one stage that is always present.

### Influence levers

CAPEC groups these techniques under "Manipulate Human Behavior" (CAPEC-416). Its "Influence Perception" patterns (CAPEC-417) name six levers that match the principles of persuasion described by psychologist Robert Cialdini. Stajano and Wilson add levers drawn from street scams, notably distraction and time pressure.

| Lever                      | Why it works                                         | Fictional cue                                        |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------- |
| Authority                  | People are trained to comply with bosses and IT      | "This is Bob from the CFO's office."                 |
| Scarcity and urgency       | A deadline or looming loss rushes the decision       | "The wire must go out before 3 p.m."                 |
| Reciprocation              | A favor creates a felt obligation                    | The caller "fixes" a problem, then asks for a code   |
| Commitment and consistency | After a small yes, a bigger yes feels consistent     | "You confirmed your username, so read me the code."  |
| Liking                     | People help those who seem friendly or similar       | Small talk about a shared hometown                   |
| Consensus or social proof  | People follow what others seem to be doing           | "Everyone on your team has already re-registered."   |
| Distraction                | Attention spent on one thing is not spent checking   | A chatty call while a sign-in prompt arrives         |

Time pressure deserves special attention. As Stajano and Wilson put it, "When you are under time pressure to make an important choice, you use a different decision strategy." The attacker wants the fast, intuitive strategy that serves everyday choices applied to a decision that deserves a slow one.

### Channels and named variants

The common names mostly describe the channel and target of one underlying pattern.

| Variant                         | Channel                                    | Typical request                             |
| ------------------------------- | ------------------------------------------ | ------------------------------------------- |
| [[phishing]]                    | Bulk email or messages                     | Credentials, a file to open, or a payment   |
| [[spear-phishing]]              | A message tailored to one person or team   | The same, with a more convincing story      |
| [[whaling]]                     | Spear phishing aimed at senior executives  | Wire transfers or sensitive documents       |
| [[smishing]]                    | SMS and other text messaging               | A tap on a link or a call to a number       |
| [[vishing]]                     | Voice calls                                | Passwords, one-time codes, or remote access |
| [[business-email-compromise]]   | Spoofed, look-alike, or compromised email  | Redirected payments or gift cards           |
| [[baiting]]                     | A found USB drive or an enticing download  | Opening or running something                |
| [[quid-pro-quo]]                | Phone or chat                              | Access in exchange for a "service"          |
| [[tailgating]]                  | In person, at a controlled door            | Physical entry behind an authorized person  |

### Chaining channels to defeat MFA

Current campaigns chain channels so that each makes the next more believable. The Twitter attackers combined vishing, a look-alike website, and real-time relay of whatever employees typed. The CISA and FBI advisory on the group called Scattered Spider (AA23-320A, November 2023) describes callers posing as IT or help-desk staff, persuading help desks to reset passwords or MFA tokens, convincing mobile carriers to move a victim's phone number to a SIM card the attackers hold ([[sim-swapping]]), and sending repeated push prompts until an employee pressed "Accept" ([[mfa-fatigue]]).

The diagram shows why a password plus a one-time code or push approval does not stop a well-run attack: the attacker never breaks the [[mfa|multi-factor authentication]] but relays the victim's own actions to the real site in real time.

```sequence
title: Real-time relay of a password and MFA approval (fictional)
participant M as Mallory
participant A as Alice
participant P as Look-alike login page
participant R as vpn.shop.example
M -> A: Call: "IT help desk, your VPN needs a reset"
A -> P: Types username and password
P --> M: Credentials captured as typed
M -> R: Signs in with Alice's credentials
R -> A: Push prompt: "Approve sign-in?"
A --> R: Approves, as the caller said to expect it
R --> M: Session granted to Mallory
```

Because the caller predicted the prompt, approving it felt like following instructions. An authenticator that checks which site it is talking to, such as a [[passkey]] or a security key using [[webauthn|WebAuthn]], breaks this chain because it will not sign in to the look-alike page at all.

## Worked example

> [!NOTE]
> Everything in this scenario is fictional: the company, the people, and every domain. It is written for recognition practice, not as a template.

**Setting.** Alice handles accounts payable at shop.example, an online retailer. Bob is its chief financial officer, supplies.example is its packaging supplier, and Mallory is the attacker.

**Step 1: Research.** Mallory learns the supplier's name from a shop.example press release and Bob's title from the company's About page.

**Step 2: The message.** On the quarter's last day, Alice receives this email:

```text
From:    "Bob (CFO)" <bob.cfo@shop-example.test>
To:      alice@shop.example
Subject: Re: supplies.example invoice - URGENT before quarter close

Alice, supplies.example has changed banks. Update their account to the
attached details and release today's payment before 3 p.m. I'm boarding
a flight, so email only. Keep this between us until the audit is done.
```

**Step 3: The follow-up call.** Twenty minutes later, a caller claiming to be from supplies.example's finance team asks whether Alice "got Bob's note." The second channel seems to confirm the first.

**Step 4: Analysis.** Each cue maps to a lever and to a check the attacker does not control.

| Cue                                                | Lever or stage                       | Independent check                                   |
| -------------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Sender domain is shop-example.test, not shop.example | Borrowed authority                 | Read the full address, not the display name         |
| "Before 3 p.m." on quarter close                   | Urgency                              | A real deadline survives a ten-minute check         |
| "Email only, I'm boarding a flight"                | Blocks verification                  | A request that forbids checking is itself a warning |
| "Keep this between us"                             | Isolation, planning the exit         | Policy requires a second approver anyway            |
| New bank details for a known supplier              | The request: high value, hard to reverse | Always triggers the payment-change procedure    |
| A call that "confirms" the email                   | Consistency and social proof         | Two channels run by one attacker are one channel    |

**Step 5: The response.** Alice neither replies to the email nor calls back the number that called her. She calls supplies.example at the number in the vendor records created when the supplier was onboarded and learns that nothing has changed. This is [[out-of-band-verification]]: confirming a request through a channel that existed before the request arrived. She then reports the message with her mail client's report button, and the security team blocks the look-alike domain and searches other mailboxes for the same message.

```sequence
title: The payment-change procedure stops the fraud
participant M as Mallory
participant A as Alice
participant V as supplies.example (number on file)
participant S as Security team
M -> A: Email as "Bob": change supplier bank details today
M -> A: Call: "Did you get Bob's note?"
note A: High-risk request, urgency, verification blocked
A -> V: Calls the number from the vendor records
V --> A: "We never changed our bank account"
A -x M: Change refused, payment held
A -> S: Reports the email and the call
```

**Step 6: Why it failed.** The deciding control was the procedure, not Alice's intuition. Even if she had been fooled, the rule that every bank-detail change needs a callback and a second approver would have stopped the payment. The second approver applies [[separation-of-duties]], which turns one person's mistake into a near miss.

## Defenses

No single control stops social engineering, so defenses are layered, and each layer has limits.

### Make verification the default for high-risk requests

- **Out-of-band verification.** Confirm any request to change payment details, reset credentials, or grant access through a contact you already hold. The FBI's BEC guidance says to look up a company's phone number yourself and to verify any change in account number or payment procedure with the person making the request. _Limit:_ it fails if the trusted records can themselves be changed by email, so protect the vendor file and the directory.
- **A second approver.** Require two people for bank-detail changes and large transfers. _Limit:_ rushed approvers rubber-stamp, so audit approvals.
- **Identity proofing at the help desk.** Resetting a password or moving an MFA device should need more than facts an attacker can look up, such as a callback to the number on file or a manager's confirmation. Scattered Spider targeted exactly this step. _Limit:_ strict checks burden locked-out employees, so design [[account-recovery]] for both usability and security.

### Remove what can be phished, and limit reach

- **Phishing-resistant MFA.** The Scattered Spider advisory recommends FIDO/WebAuthn or PKI-based MFA because these methods resist phishing and are not susceptible to push bombing or SIM swapping. _Limit:_ attackers move to the weakest remaining path, often account recovery, legacy systems, or the help desk.
- **Email authentication.** [[spf|SPF]], [[dkim|DKIM]], and [[dmarc|DMARC]] stop outsiders from sending mail that claims your exact domain. _Limit:_ they cannot stop look-alike domains or messages from a real but compromised supplier mailbox.
- **External-sender banners.** The same advisory suggests adding a banner to email received from outside the organization. _Limit:_ people stop noticing a banner they see on every message, a problem examined in the lesson on [security warnings](lesson:HUM-03).

### Prepare people and make reporting easy

- **Training on levers and requests.** Teach people to notice the request and the pressure rather than hunt for typos. _Limit:_ training cannot be the main control, as the lesson on [phishing education](lesson:HUM-02) shows.
- **Fast, blame-free reporting.** Every targeted person is a sensor, but only if reporting is easy and nobody is punished for pausing to verify. Speed matters after a loss: for a fraudulent transfer, the IC3 report says "time is of the essence" and advises asking your bank at once to recall the funds, then filing a complaint at ic3.gov. The lesson on [security culture](lesson:HUM-07) covers how to build the habit.

## Common misconceptions

- **"Only careless people fall for it."** The levers exploit normal decision making, and employees at a major technology company approved MFA prompts during the 2020 Twitter attack. Build procedures that work even when someone is fooled.
- **"MFA makes us immune."** One-time codes and push approvals can be relayed or approved under pressure. Phishing-resistant authenticators bind sign-in to the real site, yet recovery paths still need protection.
- **"A message that passes DMARC comes from an honest sender."** DMARC shows that a domain authorized the message. A compromised supplier mailbox passes every check.
- **"You can spot phishing by bad grammar."** Targeted messages are often well written. The reliable signals are the request (money, credentials, access, secrecy) and whether you can verify it independently.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

This exercise is on paper. Do not send test messages to classmates, friends, or coworkers: simulated phishing needs authorization and consent, as the lesson on [phishing education](lesson:HUM-02) explains.

Analyze this message to Bob, a student at the fictional Fernwood College, whose real domain is fernwood.example.

```text
From:     "Fernwood IT Service Desk" <it-support@fernwood-helpdesk.test>
Reply-To: helpdesk-2207@mail.example
To:       bob@fernwood.example
Subject:  Action required: mailbox deactivation in 2 hours

Hi Bob, your mailbox failed the new security check. To keep access
during finals week, confirm your sign-in at the link below. 140 students
in your department have already done this. Then reply with the 6-digit
code we text you to finish verification.
Fernwood IT (please do not call the help desk; lines are busy)
```

1. List the claimed sender, the actual sender domain, and the reply-to address. Which belong to fernwood.example?
2. State the request in one sentence. Which part of it could never be legitimate?
3. Label every influence lever you can find, using the table in "How it works."
4. Write the verification step you would take, naming the trusted channel you would use.
5. Draft a two-sentence report to your campus IT team.

**Check your analysis.** Neither the sender nor the reply-to address belongs to fernwood.example. The request for a one-time code is never legitimate: the code proves that the person signing in holds your phone, so sharing it hands that proof to someone else. The levers are urgency (two hours), fear of loss (deactivation during finals), social proof (140 students), and an attempt to block verification ("do not call the help desk"). To verify, open the campus IT site from a bookmark or a typed address, or call the number on your student ID, never one in the message.

## Key takeaways

- Social engineering targets the person who holds a privilege, not the control that guards it; the request is the one stage an attacker cannot skip.
- Influence levers such as authority and urgency exploit normal mental shortcuts, so defenses must not depend on perfect vigilance.
- Out-of-band verification through contacts you already hold, plus a second approver, stops most payment and reset fraud even when the story is convincing.
- One-time codes and push approvals can be relayed or coaxed out of people; phishing-resistant MFA binds sign-in to the real site and pushes attackers toward recovery paths.
- Easy, blame-free reporting turns every targeted person into an early warning.

## Go deeper

- Map each of Stajano and Wilson's seven principles (distraction, social compliance, herd, dishonesty, deception, need and greed, and time) to a control that would blunt it. Which have no good technical control?
- Use CAPEC-416 and its children (pretexting, influence perception, framing, incentives, and psychological principles) as a checklist to threat-model a human-facing workflow, such as a help desk.
- Open question: the 2025 IC3 report notes that businesses reported more than $30 million in losses to BEC scams involving AI. If writing style and even voice can be imitated cheaply, what evidence of identity should verification rely on?
