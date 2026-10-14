---
topicId: HUM-08
title: Accessibility in security systems
summary: How CAPTCHAs, time limits, passwords, and one-time codes can lock out people with disabilities, what WCAG 2.2 requires, including Success Criterion 3.3.8 Accessible Authentication, and how to remove each barrier while keeping the security goal it serves.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 40
objectives:
  - State the security goal behind a login step, CAPTCHA, time limit, or code check, and identify the accessibility barriers it creates.
  - Apply WCAG 2.2 Success Criterion 3.3.8 to an authentication flow, including its four exceptions and the rule that every step must comply.
  - Propose an alternative for each barrier that keeps the stated security goal, such as passkeys, paste-friendly code fields, or warned and extendable timeouts.
  - Audit a login page you own against an accessibility checklist and report each barrier with a fix.
prerequisites: [IAM-03, HUM-04]
concepts: [captcha]
keywords:
  - accessibility
  - a11y
  - WCAG 2.2
  - Web Content Accessibility Guidelines
  - SC 3.3.8
  - Accessible Authentication (Minimum)
  - SC 3.3.9
  - cognitive function test
  - CAPTCHA
  - audio CAPTCHA
  - SC 1.1.1
  - SC 2.2.1
  - Timing Adjustable
  - SC 2.2.5
  - SC 2.2.6
  - session timeout
  - SC 1.3.5
  - autocomplete
  - paste blocking
  - one-time code
  - WCAG technique H100
  - WCAG failure F109
  - screen reader
  - assistive technology
sources:
  - title: 'Web Content Accessibility Guidelines (WCAG) 2.2 (W3C Recommendation, 12 December 2024)'
    url: https://www.w3.org/TR/WCAG22/
    publisher: World Wide Web Consortium (W3C)
    license: W3C Document License
  - title: 'Understanding Success Criterion 3.3.8: Accessible Authentication (Minimum)'
    url: https://www.w3.org/WAI/WCAG22/Understanding/accessible-authentication-minimum.html
    publisher: W3C Web Accessibility Initiative (WAI)
    license: W3C permissive license
  - title: 'H100: Providing properly marked up email and password inputs'
    url: https://www.w3.org/WAI/WCAG22/Techniques/html/H100
    publisher: W3C Web Accessibility Initiative (WAI)
  - title: 'Inaccessibility of CAPTCHA: Alternatives to Visual Turing Tests on the Web (W3C Group Draft Note, 16 December 2021)'
    url: https://www.w3.org/TR/turingtest/
    publisher: World Wide Web Consortium (W3C)
    license: W3C permissive document license
  - title: 'NIST SP 800-63B-4: Digital Identity Guidelines: Authentication and Authenticator Management'
    url: https://csrc.nist.gov/pubs/sp/800/63/b/4/final
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-sp-800-63b
quiz:
  - question: A login page blocks pasting into the password field "for security." Under WCAG 2.2 SC 3.3.8, what is the problem?
    choices:
      - There is no problem, because WCAG covers only images and video, not login forms.
      - Blocking paste is required at Level AAA, so the page simply goes beyond Level AA.
      - It forces users to recall and type the password, a cognitive function test with no assisting mechanism, so the step fails unless another method is offered.
      - The page fails only if its passwords are shorter than the 15-character minimum.
    answer: 2
    explanation: The Understanding document says copy and paste can be relied on to avoid transcription and that blocking paste into authentication fields fails the criterion unless another method is available. NIST SP 800-63B-4 likewise requires sites to allow password managers and autofill and recommends permitting paste.
  - question: A bank sends a six-digit code by SMS, and its form splits the code into six one-character boxes where pasting fills only the first box. Which change best removes the barrier while keeping the second factor?
    choices:
      - Use one labeled field that accepts a pasted code, and offer a passkey as an alternative.
      - Remove the second factor entirely, so that users only need to enter a password.
      - Shorten the code's lifetime to 30 seconds so that intercepted codes expire sooner.
      - Add a distorted-text CAPTCHA before the code field to stop automated attempts.
    answer: 0
    explanation: The Understanding document says manual transcription of a verification code is not compliant and that users must at least be able to paste it. A single pasteable field keeps the possession check, and a passkey avoids codes altogether.
  - question: Which statement about SC 3.3.8 Accessible Authentication (Minimum) is accurate?
    choices:
      - It bans passwords at Level AA.
      - It applies only to the first step of a login, so a later code step can require transcription.
      - It requires an image CAPTCHA as the accessible alternative to a password.
      - When authentication has several steps, as in multi-factor authentication, every step must comply.
    answer: 3
    explanation: Passwords are allowed when a mechanism such as a password manager or paste can fill them. The Understanding document says that when there is more than one step, all steps need to comply, so a code step that requires manual transcription fails even if the password step passes.
  - question: A sign-up form uses a distorted-text CAPTCHA to slow automated account creation. What does the W3C note on CAPTCHA suggest about this design?
    choices:
      - It is fully accessible as long as the distorted text is displayed in a large font.
      - It burdens blind, visually impaired, and dyslexic users, and many CAPTCHAs can be cracked, so non-interactive controls deserve a look first.
      - It should be replaced by an audio CAPTCHA, which works for every user who cannot see the image.
      - It should be kept, because modern CAPTCHAs cannot be solved by machines or by crowd-sourced workers.
    answer: 1
    explanation: The note describes text CAPTCHAs as asking users who are blind, visually impaired, or dyslexic to do the task they are least able to do, says many CAPTCHAs can be largely cracked by algorithms, and discusses alternatives such as heuristics, honeypots, and limited-use accounts. An audio version fails people who are deaf or hard of hearing.
  - question: A benefits portal signs users out after 10 idle minutes and discards the half-finished form. Which redesign keeps the security goal and meets WCAG?
    choices:
      - Remove the time limit entirely on every page.
      - Keep the timeout but hide it, so users are not distracted.
      - Warn before the session ends, let the user extend it with a simple action, and keep the form data after they sign in again.
      - Sign users out after 2 minutes instead, so less data is at risk.
    answer: 2
    explanation: SC 2.2.1 allows a time limit if users are warned and given at least 20 seconds to extend it with a simple action, and SC 2.2.5 asks that users can continue without data loss after re-authenticating. Unattended sessions still end; people who need more time keep their work.
---

## Why it matters

Security controls sit at the front door of almost every online service: the login form, the CAPTCHA, the code sent to a phone, the session that expires mid-task. If a person cannot get through that door because of a disability, the service is closed to them, however well the rest of it is designed. For a student, that can mean no access to grades, financial aid, or course materials.

The barriers are concrete. The World Wide Web Consortium (W3C), which writes the main web accessibility standards, has published a note on the inaccessibility of CAPTCHAs. It observes that asking "users who are blind, visually impaired or dyslexic to identify textual characters" gives them the task they are least able to perform, and that audio alternatives fail people who are deaf or hard of hearing. The W3C's explanation of its accessible-authentication requirement adds that memorizing usernames and passwords can be very hard for some people with cognitive disabilities.

Many of these barriers buy little security in return. The same CAPTCHA note reports that image, logic, and audio CAPTCHAs "can be largely cracked using both complex and simple computer algorithms," and that people recruited through crowd-sourcing can solve them too. A check that stops legitimate people more reliably than it stops attackers is a cost, not a defense. And a barrier can push people toward workarounds that weaken security, such as asking someone else to sign in for them.

## The core idea

Every security mechanism exists to meet a goal: only the account holder signs in; automated sign-ups are slowed; an unattended session does not stay open. An accessibility barrier is a part of the mechanism that stops legitimate people with disabilities from getting through. The design task is to keep the goal and change the mechanism.

Three assumptions guide the work:

1. **Disability is common and varied.** Vision, hearing, motor, and cognitive disabilities each affect different steps, and the W3C notes that situational limits, such as a small phone screen or a noisy room, affect people without disabilities too.
2. **A barrier is not a control.** If a check fails people more often than it fails attackers, it is friction without protection.
3. **Accessible and secure often coincide.** Passkeys and password managers remove memory and typing burdens, and they also make phishing and password reuse harder.

The W3C states the intent of its authentication criterion in exactly these terms: "an accessible, easy-to-use, and secure method for users to authenticate when logging into an existing account." A useful analogy is a building entrance. Adding a ramp beside the stairs does not weaken the lock on the door. Accessible authentication is the ramp: another way to reach the same lock.

## How it works

### Cognitive function tests and SC 3.3.8

The Web Content Accessibility Guidelines (WCAG) 2.2, a W3C Recommendation, organize accessibility requirements into testable success criteria (SC) at Levels A, AA, and AAA. Where [[usable-security]], the subject of the lesson on [password usability](lesson:HUM-04), asks whether people can use a control correctly, accessibility asks whether everyone can.

For authentication, the key term is the cognitive function test, which WCAG defines as "A task that requires the user to remember, manipulate, or transcribe information." Remembering a password, solving a puzzle, and copying a code by hand all qualify. According to the W3C's Understanding document for the criterion, the common identifiers name, email, and phone number "are not considered cognitive function tests."

SC 3.3.8 Accessible Authentication (Minimum), at Level AA, says: "A cognitive function test (such as remembering a password or solving a puzzle) is not required for any step in an authentication process unless that step provides at least one of the following":

| Exception          | WCAG wording                                                                                   | Example                                            |
| ------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Alternative        | "Another authentication method that does not rely on a cognitive function test."               | A [[passkey]] offered beside the password          |
| Mechanism          | "A mechanism is available to assist the user in completing the cognitive function test."       | A [[password-manager]] fills the password          |
| Object Recognition | "The cognitive function test is to recognize objects."                                         | "Select every picture of a bicycle"                |
| Personal Content   | "The cognitive function test is to identify non-text content the user provided to the website." | Picking the photo the user uploaded at sign-up     |

The Understanding document draws practical conclusions:

- A password field complies when the site lets browsers and password managers fill it in. Actively blocking them fails.
- "Copy and paste can be relied on to avoid transcription." Blocking paste into authentication fields fails the criterion unless another method is available.
- "A service that requires manual transcription of a verification code is not compliant." Users must at least be able to paste the code.
- When there is more than one step, as in multi-factor authentication ([[mfa]]), "all steps need to comply."
- Two-factor methods that do not rely on codes, such as hardware authentication devices and operating-system authentication, are not cognitive function tests.

At Level AAA, SC 3.3.9 Accessible Authentication (Enhanced) removes the object recognition and personal content exceptions. The personal content exception also comes with a security caution: "Care must be taken to provide adequate security in this case," because someone who is not the account holder might guess the right picture from a set of choices. The criterion covers existing users signing in; it "does not cover creation of a username or initiation of an account."

### CAPTCHAs

A [[captcha]] is a challenge, such as distorted text, an audio clip, or an image puzzle, that tries to tell a person from an automated program. WCAG SC 1.1.1 Non-text Content (Level A) requires a CAPTCHA to have text alternatives that identify and describe its purpose, and "alternative forms of CAPTCHA using output modes for different types of sensory perception." Even then, gaps remain: an audio version helps a blind user but not a deafblind one.

The W3C CAPTCHA note surveys alternatives. Some need no interaction at all: spam filtering, proof-of-work, heuristics, honeypots, and limited-use accounts. Others draw on more than one party, such as devices the person already owns. In practice, start with controls that never interrupt anyone, such as [[rate-limiting]], heuristics, and limits on what a brand-new account can do, and show a challenge only when signals look suspicious, with more than one accessible way to pass it. If you use a honeypot, a form field hidden from people that bots tend to fill in, hide it from screen readers too, or blind users may fill it in and be blocked as bots.

### Time limits

Short limits serve real goals: an unattended [[session]] should end, and a code should expire. But people who use screen readers or switch access, or who read slowly, may need more time. WCAG sets these rules:

| Criterion               | Level | Requirement (abridged)                                                                                                                                  |
| ----------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.2.1 Timing Adjustable | A     | For each time limit, the user can turn it off, adjust it to at least ten times the default, or be warned and given at least 20 seconds to extend it with a simple action, at least ten times. Exceptions cover real-time events, essential limits, and limits over 20 hours. |
| 2.2.5 Re-authenticating | AAA   | After a session expires, the user can continue without loss of data after re-authenticating.                                                             |
| 2.2.6 Timeouts          | AAA   | Users are warned how long they can be inactive before data is lost, unless the data is kept for more than 20 hours.                                       |

Read together, these suggest a pattern that keeps the security goal: warn before the session ends, let the user extend it with one simple action, and save their work so that signing in again picks up where they left off. The session still ends when someone walks away.

### Passwords and codes

NIST SP 800-63B-4, the US federal authentication guideline, points the same way. Verifiers "SHALL allow the use of password managers and autofill functionality," "SHOULD permit claimants to use the 'paste' function when entering a password," and should offer an option to display the password while it is typed. They must request the whole password, never a subset such as only its 2nd, 5th, and 7th characters, and must limit consecutive failed attempts on one authenticator to no more than 100, which tolerates typos without allowing unlimited guessing.

Markup matters too. WCAG technique H100 shows email and password inputs with labels and `autocomplete` values so that browsers and password managers can fill them, and its test checks that each input has an appropriate accessible name and allows pasting. WCAG also lists a failure, F109, for "preventing password or code re-entry in the same format." Here is a barrier next to its fix:

```html
<!-- Barrier: unlabeled fields, paste blocked, code split into six boxes -->
<input type="password" placeholder="Password" onpaste="return false">
<input maxlength="1"><input maxlength="1"><input maxlength="1">
<input maxlength="1"><input maxlength="1"><input maxlength="1">

<!-- Fix: labeled fields that autofill, password managers, and paste can fill -->
<label for="email">Email</label>
<input id="email" type="email" autocomplete="email">
<label for="password">Password</label>
<input id="password" type="password" autocomplete="current-password">
<label for="code">Code from your text message</label>
<input id="code" type="text">
```

## Worked example

> [!NOTE]
> bank.example and its login flow are fictional.

**Setting.** bank.example's login has three steps. Step 1 asks for email and password, with paste blocked. Step 2 shows a distorted-text CAPTCHA. Step 3 asks for a six-digit text-message code in six one-character boxes. The whole page expires after two idle minutes, without warning. The stated goals: only the account holder signs in, automated [[credential-stuffing]] is slowed, and codes and sessions expire.

**Step 1: Name each barrier and the criterion it meets or fails.**

| Step                 | Barrier                                                              | WCAG 2.2                                                        |
| -------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| Password, no paste   | Password managers blocked, so the password must be recalled and typed | Fails 3.3.8: a cognitive function test with no mechanism        |
| Text CAPTCHA         | Transcribing distorted characters; no other sensory mode              | Fails 1.1.1; transcription is not object recognition, so 3.3.8 fails too |
| Six-box code         | Pasting fills only the first box, so the code must be copied by hand  | Fails 3.3.8: manual transcription of a code                     |
| Two-minute timeout   | No warning and no way to extend; entered data lost                    | Fails 2.2.1                                                     |

**Step 2: Redesign while keeping each goal.** The team allows paste and autofill on labeled fields, and offers passkey sign-in as an alternative to the password. It removes the CAPTCHA from login and slows credential stuffing with rate limits per account and per source, the failed-attempt limit SP 800-63B-4 requires, and a step-up challenge only for suspicious traffic, with an accessible way to pass. The code moves into one field that accepts paste. The timeout grows to 15 minutes with a warning two minutes before the end.

```sequence
title: A warned, extendable timeout at bank.example (fictional)
participant U as Alice
participant B as Browser
participant S as bank.example
note S: Alice idle for 13 of 15 minutes
S --> B: Session ends in 2 minutes
B --> U: Dialog with a "Stay signed in" button
U -> B: Presses "Stay signed in"
B -> S: Extend the session
S --> B: Extended; form data kept
note S: No response means sign-out, draft saved
```

**Step 3: Check that the goals still hold.** Only the account holder can sign in: passkeys resist phishing, which the old password-plus-code flow did not. Automated attempts are still slowed, now by limits that bots cannot hire people to solve. Codes still expire, and idle sessions still end. No goal was weakened, and two were strengthened.

## In practice

- **Start from the goal, not the mechanism.** Write down what each control protects, then ask whether a less burdensome mechanism meets the same goal.
- **Offer more than one way in.** At least one method should need no memory or transcription, such as a passkey or a security key. Hardware keys need some dexterity and biometrics do not work for everyone, so no single method suits all users.
- **Never block paste or autofill.** Label every field, and use `autocomplete` values so password managers work.
- **Keep CAPTCHAs off the login path.** Use non-interactive controls first, and if a challenge is unavoidable, offer it in more than one sensory mode.
- **Make timeouts humane.** Warn, allow extension with a simple action, and preserve work across re-authentication.
- **Test with real users and tools.** Try each flow with a keyboard and a screen reader, and with consenting users who have disabilities. Automated checkers catch only part of the problem.

Accessible options carry their own risks. An email-link login is only as secure as the mailbox it uses, and a personal-content check can be guessed, as the W3C itself warns. Weigh each option against the stated goal.

## Common misconceptions

- **"Accessibility weakens security."** Several of the most accessible options, such as passkeys and password managers, are also among the strongest.
- **"CAPTCHAs stop bots."** The W3C reports that many can be cracked by algorithms or solved by crowd-sourced workers.
- **"An audio CAPTCHA fixes the accessibility problem."** It fails people who are deaf or hard of hearing, and the W3C notes it can be cracked too.
- **"Blocking paste protects passwords."** It breaks password managers, conflicts with SP 800-63B-4, and fails SC 3.3.8 unless another method is offered.
- **"Any time limit is a WCAG failure."** SC 2.2.1 allows time limits that users can turn off, adjust, or extend after a warning.

## Try it yourself

> [!ETHICS] Only test systems you own or have written permission to test.

Audit a login page you own: a personal site, a class project, or a local test page built from the two snippets above. Do not test anyone else's site, and do not try to get around any real site's CAPTCHA or security controls.

1. **Keyboard.** Using only Tab, Shift+Tab, Enter, and Space, can you reach and operate every field and button?
2. **Names.** Turn on your operating system's screen reader, such as VoiceOver on macOS or Narrator on Windows, and listen to each field. Does each one announce a clear name?
3. **Paste and autofill.** Does your password manager fill the fields? Can you paste the password and any code?
4. **Cognitive function tests.** List every step that asks the user to remember, transcribe, or solve something. Does each offer an alternative or an assisting mechanism?
5. **Time limits.** Is there any time limit? Is there a warning, a simple way to extend, and is work kept after signing in again?
6. **Report.** For each barrier, record the security goal it serves, the WCAG criterion involved, and a fix that keeps the goal.

## Key takeaways

- Every security mechanism serves a goal. An accessibility barrier is a way the mechanism fails legitimate people, and the fix should keep the goal.
- WCAG 2.2 SC 3.3.8 (Level AA) says no authentication step may require a cognitive function test unless it offers an alternative, an assisting mechanism, object recognition, or personal content, and every step must comply.
- Allowing paste and password managers, offering passkeys, and using one pasteable code field meet SC 3.3.8 and match NIST SP 800-63B-4.
- CAPTCHAs burden people more reliably than they stop bots; prefer non-interactive controls such as rate limits and heuristics.
- Time limits can stay when users are warned, can extend them with a simple action, and keep their work.

## Go deeper

- Read the W3C's Understanding document for SC 3.3.8 and its techniques. Which of your own accounts would pass, and at which step would the others fail?
- Skim the W3C note on the inaccessibility of CAPTCHA. Which alternative would you choose for a small nonprofit's donation form, and what would it cost?
- Open question: an email-link login avoids passwords but depends on the security of the mailbox. When is that trade worth making?
