---
topicId: HUM-05
title: Privacy notices and user control
summary: Why long privacy policies fail the people they are meant to inform, how to design layered and just-in-time notices with real choices, and how to recognize and fix dark patterns that obscure or subvert privacy decisions.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 35
objectives:
  - Explain why the notice-and-choice model fails when notices are long, vague, or shown at the wrong moment.
  - Describe a privacy notice along the design dimensions of timing, channel, modality, and control.
  - Identify dark patterns that obscure or subvert privacy choices and propose a fix for each.
  - Redesign a fictional consent interface and justify each data choice by purpose, necessity, default, and retention.
prerequisites: [GRC-03, HUM-03]
concepts: [privacy-notice, notice-and-choice, dark-pattern]
keywords:
  - privacy policy
  - privacy notice
  - notice and choice
  - informed consent
  - consent banner
  - cookie banner
  - layered notice
  - just-in-time notice
  - dark patterns
  - deceptive design
  - privacy by default
  - FTC
  - Communicate-P
sources:
  - title: 'Bringing Dark Patterns to Light (FTC Staff Report, September 2022)'
    url: https://www.ftc.gov/reports/bringing-dark-patterns-light
    publisher: US Federal Trade Commission, Bureau of Consumer Protection
  - title: 'The Cost of Reading Privacy Policies (McDonald and Cranor, I/S: A Journal of Law and Policy for the Information Society, 2008; author draft)'
    url: https://lorrie.cranor.org/pubs/readingPolicyCost-authorDraft.pdf
    publisher: Aleecia M. McDonald and Lorrie Faith Cranor
  - title: 'A Design Space for Effective Privacy Notices (Schaub, Balebako, Durity, and Cranor, SOUPS 2015)'
    url: https://www.usenix.org/conference/soups2015/proceedings/presentation/schaub
    publisher: USENIX Association
  - title: 'NIST Privacy Framework: A Tool for Improving Privacy through Enterprise Risk Management'
    url: https://www.nist.gov/privacy-framework/privacy-framework
    publisher: National Institute of Standards and Technology (NIST)
    license: US Government work (NIST; not subject to US copyright)
    sourceId: nist-privacy-framework
quiz:
  - question: McDonald and Cranor estimated the time it would take Americans to read the privacy policies of the sites they visit. What does that estimate imply for design?
    choices:
      - People are lazy, so notices should be made legally binding whether read or not.
      - A model that depends on people reading every full policy cannot work, so the information that matters must reach people in shorter forms at the moments they decide.
      - Policies should be made longer so they cover every case.
      - Privacy notices are unnecessary and can be removed.
    answer: 1
    explanation: When reading every policy would cost on the order of 200 hours a year, not reading is rational. Layered and just-in-time notices put the few facts that matter where decisions happen, while the full policy stays available for those who want it.
  - question: A cookie banner shows "Accept all" in a bold, colored button and "Reject" as small grey text. What does the FTC staff report say about this design?
    choices:
      - It is acceptable as long as the reject option exists somewhere.
      - It is required, because acceptance must be the default.
      - It is a recommended way to reduce consent fatigue.
      - Highlighting the data-sharing option while greying out the alternative is a dark pattern; one option should not be more prominent than the other.
    answer: 3
    explanation: The report lists highlighting the choice that collects more information, while greying out the other, among the designs that obscure or subvert privacy choices, and recommends that no option be more prominent than another.
  - question: A fitness app asks for location access the first time it opens, before the user has done anything. Which redesign best fits the design-space idea of timing?
    choices:
      - Ask just in time, when the user starts a feature that needs location, and say why it is needed.
      - Ask again every day until the user agrees.
      - Move the request into paragraph 14 of the privacy policy.
      - Remove the option to decline so the app always works.
    answer: 0
    explanation: A request tied to the action that needs the data is easier to understand and to judge. Repeating a request until the user gives in is itself a dark pattern the FTC describes.
  - question: Which statement about privacy notices is most accurate?
    choices:
      - A notice can make any data collection acceptable, as long as it is disclosed.
      - Clicking "I agree" on a long policy shows that the person understood it.
      - A notice cannot fix collection the service does not need; minimizing what is collected matters more than describing it well.
      - Notices matter only for websites, not for apps or devices.
    answer: 2
    explanation: The FTC report urges businesses to collect the data necessary to provide the requested service and nothing more. A clear notice of unnecessary collection is still unnecessary collection.
  - question: An app's settings show a toggle labeled "Do Not Sell My Information" that is switched off. Why does the FTC report flag this kind of control?
    choices:
      - Toggles are illegal in privacy settings.
      - The control should be hidden so users are not confused.
      - It should be turned on by default only for adults.
      - It creates a double negative, so users can easily make the opposite choice from the one they intend.
    answer: 3
    explanation: With a "do not" label, the off position means data is sold. The report recommends toggles that are neither ambiguous nor confusing; a plain question such as "Share my information with advertisers?" with an unambiguous answer avoids the trap.
---

## Why it matters

A [[privacy-notice]] is supposed to tell people what an organization does with their data, so they can decide whether to go along with it. In practice, notices are long, vague, and rarely read. Aleecia McDonald and Lorrie Faith Cranor estimated in 2008 that the median privacy policy among the 75 most popular websites ran about 2,514 words, roughly 10 minutes of reading at 250 words per minute. Reading the policies of every site a typical American visits would take on the order of 200 hours a year, and the authors valued the nation's lost time at about $781 billion a year. Not reading is the rational response.

Meanwhile, the interface around a notice often makes the decision for the user. In its 2022 staff report _Bringing Dark Patterns to Light_, the US Federal Trade Commission (FTC) defined [[dark-pattern|dark patterns]] as "design practices that trick or manipulate users into making choices they would not otherwise have made" and devoted a section to designs that "obscure or subvert privacy choices." Its examples include a bold "Accept" button beside a muted grey "Reject," default settings that maximize data sharing, and "repeated prompting until a consumer finally succumbs and accepts."

For engineers, both problems are design problems. A notice is a user interface, and it can be designed well or badly.

## The core idea

Much of privacy practice rests on [[notice-and-choice]]: the organization discloses what it does, and each person chooses whether to accept. The model works only when three assumptions hold:

1. **People can absorb the notice.** Attention is limited, and a notice competes with the task the person came to do.
2. **The organization knows its own data flows.** You cannot describe collection, sharing, and retention you have not mapped.
3. **The choice is real.** Declining must be possible and easy, and it should not break features that do not need the data.

When any assumption fails, "consent" becomes a ritual. A useful analogy is a medicine label. The few warnings that matter go on the bottle, at the moment of use, in plain words; the full insert stays in the box for anyone who wants it. A good privacy design works the same way: short, timely notices for decisions, and a complete policy for reference.

## How it works

### Why long policies fail

Full policies serve several audiences at once: regulators, lawyers, and the public. They tend to hedge, with phrases such as "may share," "selected partners," and "including but not limited to," which are legally safe but tell a reader little. They also bundle many decisions into one ("By using this app you agree"), so the only choice offered is all or nothing. The result is a document that is accurate, complete, and useless at the moment a person decides.

### A design space for notices

Florian Schaub, Rebecca Balebako, Adam Durity, and Lorrie Faith Cranor surveyed notice research at SOUPS 2015 and organized it into a design space. Its four dimensions give designers a shared vocabulary:

| Dimension | Question                        | Options in the design space                                          |
| --------- | ------------------------------- | -------------------------------------------------------------------- |
| Timing    | When is the notice shown?       | At setup, just in time, context-dependent, periodic, persistent, on demand |
| Channel   | Where is it shown?              | Primary (the device or platform in use), secondary (an out-of-band channel), or public |
| Modality  | In what form?                   | Visual, auditory, haptic and other, or machine-readable              |
| Control   | How can the person respond?     | Blocking (must decide to continue), non-blocking (controls offered without forcing a choice), or decoupled (no control in the notice itself) |

Two common patterns combine these dimensions:

- **Layered notice.** A short first layer states what is collected, why, who receives it, how long it is kept, and what choices exist, with a link to the full policy.
- **Just-in-time notice.** The notice appears when a feature first needs the data, such as a location request when the person taps "Find a store near me," so the purpose is obvious from context.

Notices suffer the same [[habituation]] as security warnings: a consent prompt seen on every visit soon gets clicked without reading. The design answer is to ask less often, and at better moments.

### Dark patterns that subvert privacy choices

The FTC report describes concrete interface practices that obscure or subvert privacy choices. Each has a straightforward fix drawn from the report's own recommendations.

| Pattern (FTC description)                                  | Fictional example                                         | Fix                                                        |
| ---------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------- |
| No definitive way to reject                                | "Accept" and "Ask me later," but no "No"                  | Offer a clear, final "No"                                  |
| Repeated prompts until the consumer gives in               | A sharing prompt on every launch                          | Ask once, respect the answer, allow changes in settings    |
| Confusing toggles, including double negatives              | "Do Not Sell My Information: Off"                         | A plain question with an unambiguous answer               |
| Choices hidden behind "a number of tabs and sub-tabs"      | Location sharing three menus deep                         | Put choices where the decision is made                     |
| The sharing option highlighted, the other greyed out       | Bold blue "Accept," pale grey "Reject"                    | Give both options equal prominence                         |
| Defaults that maximize collection and sharing              | "Share with partners" pre-checked                         | Privacy-protective defaults; collect only what is needed   |

The report's recommendations are specific: businesses should "collect the data necessary to provide the service the consumer requested, and nothing more"; toggles "should not be ambiguous or confusing, and one option should not be more prominent than another"; and choices should appear "at a time and in a context in which the consumer is making a decision about their data."

### Privacy as an organizational capability

Notices are the visible end of a larger process. The NIST Privacy Framework organizes privacy risk management into functions. One of them, Communicate-P, aims to give organizations and individuals "a reliable understanding" of how data are processed and the associated privacy risks, and a way to "engage in a dialogue" about them. You cannot write an honest notice without the earlier work of inventorying data and practicing [[data-minimization]], and good defaults are the practical core of [[privacy-by-design]].

## Worked example

> [!NOTE]
> shop.example, its app, and every screen below are fictional.

**Setting.** shop.example's mobile app has three privacy problems: it asks for location on first launch with no explanation, its sign-up form pre-checks "Share my purchase history with partners," and its cookie banner shows a large "Accept all" button next to a tiny "Manage choices" link that opens three sub-tabs. The team must fix each one and explain the data choice behind it.

**Step 1: List each data use and decide whether it is needed.**

| Data             | Purpose                           | Needed for the core service? | Decision                                    |
| ---------------- | --------------------------------- | ---------------------------- | ------------------------------------------- |
| Precise location | Find nearby stores                | Only for that feature        | Ask just in time; use once; do not store    |
| Purchase history | Order tracking and returns        | Yes                          | Collect; explain in the first layer         |
| Purchase history | Partner advertising               | No                           | Off by default; separate, unbundled choice  |
| Analytics cookies | Improve the app                  | No                           | Off by default; equal-weight choice         |

**Step 2: Fix the sign-up consent.** The vulnerable pattern is a pre-checked box and an unequal choice; the fix is an unbundled question with equal options and a stated purpose.

```html
<!-- Before: pre-checked sharing, bundled with account creation -->
<label><input type="checkbox" name="partners" checked> Share my purchase history with partners</label>
<button class="primary-large">Create account</button>

<!-- After: a separate question, off by default, purpose and retention stated -->
<fieldset>
  <legend>Share your purchase history with advertising partners?</legend>
  <p>Partners use it to show you offers. We keep this choice until you change it in Settings.</p>
  <label><input type="radio" name="partners" value="no" checked> No, don't share</label>
  <label><input type="radio" name="partners" value="yes"> Yes, share</label>
</fieldset>
<button>Create account</button>
```

**Step 3: Move the location request.** The app no longer asks at launch. When Alice taps "Find a store near me," a one-line explanation appears first, then the phone's own permission prompt.

```sequence
title: A just-in-time location request (fictional)
participant U as Alice
participant A as shop.example app
participant O as Phone operating system
U -> A: Taps "Find a store near me"
A --> U: "We use your location once to list nearby stores"
U -> A: Continues
A -> O: Requests location permission
O --> U: System permission prompt
U -> O: Allows
O --> A: Location for this search
note A: Used for the search, then discarded
```

**Step 4: Rebuild the cookie banner.** "Accept all" and "Reject all" get identical buttons, and "Choose" opens one screen of plainly labeled switches, all off except those strictly needed to run the site.

**Step 5: Write the first layer.** "We use your order details to deliver and support your purchases. Location is used only when you search for stores, and isn't stored. We share data with advertisers only if you say yes, and you can change that anytime in Settings. Full policy."

## In practice

- **Map before you write.** Inventory what you collect, why, where it goes, and how long you keep it; the notice is a summary of that map.
- **Collect less.** Every field you do not collect is a field you never have to explain, secure, or breach.
- **Default to privacy.** Pre-select the option that shares least, and unbundle optional uses from the core service.
- **Ask in context, once.** Use just-in-time requests tied to features, respect the answer, and make changes easy in settings.
- **Make choices symmetric.** Accepting and declining should take the same effort and have the same visual weight.
- **Test with people.** Ask consenting users to explain, in their own words, what a notice says and what each choice does. The FTC report likewise urges businesses to "assess their user interfaces from a consumer's perspective."

The limits are real. A clear notice cannot justify unnecessary collection, and legal requirements differ by jurisdiction and change over time, so check current law, such as state privacy statutes, with counsel before relying on any design as compliant.

## Common misconceptions

- **"A longer notice is more transparent."** Length hides the few facts people need. Transparency means the right facts at the right moment.
- **"Clicking 'I agree' means informed consent."** Agreement to an unread, bundled policy shows only that the person wanted to continue.
- **"If people don't change the defaults, they must be happy with them."** Defaults tend to stick whatever people prefer, and the FTC lists defaults that maximize sharing among privacy dark patterns.
- **"Dark patterns are just aggressive marketing."** The FTC treats designs that trick or manipulate people as a consumer-protection problem, not a style choice.
- **"Privacy notices are a legal document only."** They are part of the product's interface, and they can be designed and tested like any other.

## Try it yourself

Rewrite a fictional privacy notice. This one belongs to the fictional Fernwood Fitness app at fitness.example:

```text
Fernwood Fitness ("we") may collect, use, and share personal information,
including but not limited to device identifiers, precise geolocation, heart
rate and other health metrics, contacts, and usage data, with affiliates,
service providers, and selected partners for purposes including service
provision, analytics, personalization, marketing, research, and other
legitimate business purposes. By using the app you consent to these
practices. To withdraw consent, email privacy@fitness.example; withdrawal
may limit functionality. We retain information as long as necessary.
```

1. Underline every vague phrase and every bundled decision. Which sentence prevents a real choice?
2. Make a data table like the one in the worked example: each data type, its purpose, whether the core service needs it, and your decision.
3. Write a first-layer notice of at most 80 words in plain language.
4. Design one just-in-time request (for location or contacts) and say when it appears.
5. Compare how hard it is to give consent and to withdraw it in the original. Redesign withdrawal so it takes the same effort.

## Key takeaways

- Reading every privacy policy would cost people on the order of 200 hours a year, so the facts that matter must reach them in short, timely forms.
- Timing, channel, modality, and control are design choices; layered and just-in-time notices use them to fit the moment of decision.
- The FTC describes dark patterns that obscure or subvert privacy choices, from greyed-out "Reject" buttons to defaults that maximize sharing.
- Privacy-protective defaults, unbundled choices, and symmetric effort make consent meaningful.
- No notice can fix collecting more than the service needs; minimization comes first.

## Go deeper

- Read Schaub and colleagues' design-space paper and classify three notices you see this week by timing, channel, modality, and control. Which dimension did their designers seem to ignore?
- McDonald and Cranor's estimate dates from 2008. What has changed since then, with mobile apps, smart devices, and AI assistants, and would the cost of reading be higher or lower today?
- Open question: if hardly anyone reads notices, should privacy protection shift from individual choice toward default rules and limits on collection? What would be lost?
