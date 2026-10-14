---
topicId: IOT-03
title: Mobile application permissions
summary: How mobile operating systems let users decide which app may reach the camera, location, contacts, and other protected resources, why a granted permission is a lasting capability shared with every library in the app, and how to review an app's requests for least privilege.
level: intro
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - Explain how the app sandbox, the permission declaration, and the user's grant combine to control access to a protected resource.
  - Classify Android permissions as install-time, runtime, signature, or special, and describe how each is granted.
  - Map each permission in a fictional app's request list to the feature that needs it, and propose a less privileged alternative where one exists.
  - Identify what a permission system cannot control, such as what an app does with data after access and what bundled libraries do with the app's permissions.
prerequisites: [SYS-04, SYS-05, FND-05]
concepts:
  - app-permission
  - mobile-sandbox
labs: []
keywords:
  - Android permissions
  - runtime permission
  - dangerous permission
  - install-time permission
  - normal permission
  - signature permission
  - special app access
  - AndroidManifest.xml
  - uses-permission
  - iOS privacy
  - purpose string
  - usage description
  - Info.plist
  - least privilege
  - data minimization
  - third-party SDK
  - OWASP MASVS
  - MASVS-PRIVACY
  - MASVS-PLATFORM
sources:
  - title: Permissions on Android
    url: https://developer.android.com/guide/topics/permissions/overview
    publisher: Google (Android Developers)
  - title: Request location permissions
    url: https://developer.android.com/develop/sensors-and-location/location/permissions
    publisher: Google (Android Developers)
  - title: Requesting access to protected resources
    url: https://developer.apple.com/documentation/uikit/requesting-access-to-protected-resources
    publisher: Apple
    license: All rights reserved
  - title: OWASP Mobile Application Security Verification Standard (MASVS)
    url: https://mas.owasp.org/MASVS/
    publisher: OWASP Foundation (OWASP Mobile Application Security project)
quiz:
  - question: Which kind of Android permission does the user turn on in a system settings page, rather than through a dialog the app triggers?
    choices:
      - Install-time (normal)
      - Signature
      - Runtime (dangerous)
      - Special
    answer: 3
    explanation: Special permissions, such as drawing over other apps, are managed on the Special app access page in system settings. Install-time and signature permissions are granted automatically, and runtime permissions are requested by the app while it runs.
  - question: CampusEats bundles a third-party analytics SDK, and alice grants the app location access. Which statement is correct?
    choices:
      - The SDK cannot read location, because it was not the code that asked for it.
      - The SDK can use the location permission, because it runs inside the app's sandbox with all of the app's permissions.
      - The system shows a new prompt each time the SDK reads location.
      - The SDK runs in its own separate sandbox with no permissions.
    answer: 1
    explanation: Permissions belong to the app, not to individual pieces of code inside it. Android notes that including a library means inheriting its permission requirements, and Apple tells developers they are responsible for all access to protected resources, including access by SDKs and libraries.
  - question: Why should an app check a permission's status before each use rather than once at first launch?
    choices:
      - Checking makes the prompt appear in the user's language.
      - Permissions expire automatically every 24 hours.
      - People can change or revoke a grant in Settings at any time, so an earlier answer may no longer hold.
      - Checking stops bundled libraries from using the permission.
    answer: 2
    explanation: A grant is not permanent. Apple states that a person can change authorization at any time using Settings, so an earlier answer may no longer hold. Apps must check the current status and handle a refusal gracefully.
  - question: A new app asks for every permission it might ever need the moment it first opens. What is the main security cost?
    choices:
      - Users lose the context they need to decide, learn to tap Allow without reading, and the app holds capabilities before any feature needs them.
      - The operating system rejects apps that ask for more than three permissions.
      - The prompts only slow down the app's first launch.
      - The app can never ask for those permissions again.
    answer: 0
    explanation: Asking in context, at the moment a feature needs a resource, makes the reason obvious and keeps each grant tied to something the user chose. Front-loading prompts trains reflexive approval and violates least privilege by granting access early.
  - question: Which protection does a mobile permission system not provide?
    choices:
      - Blocking camera access until the user agrees
      - Limiting where the app sends location data after it has read it
      - Letting the user revoke contacts access later
      - Requiring apps to declare which protected resources they use
    answer: 1
    explanation: Permissions control access to a resource. Once the app has the data, the operating system does not decide what the app does with it. That falls to data minimization, privacy notices, store rules, and law.
---

## Why it matters

A phone holds an unusually complete record of its owner: where they go, whom they talk to, what they photograph, and what is said near its microphone. Dozens of apps from different developers run on it side by side. Mobile operating systems therefore isolate each app and make it ask before it touches sensitive resources. Android's documentation names the goals of its permission system as control, transparency, and data minimization.

A permission prompt is a security decision made in a few seconds, usually by someone trying to do something else. Once granted, a permission is a capability the app keeps until someone revokes it, and every library compiled into the app can use it too. Reviewing what an app asks for, and why, is one of the few privacy controls that users and organizations fully own.

## The core idea

Each app runs in a [[mobile-sandbox]]: the operating system gives it its own identity and private storage, and by default no access to other apps' data or to protected hardware. An [[app-permission]] is a controlled opening in that sandbox, a named right to use one protected resource such as the camera, precise location, or the contact list.

Three parties take part in every permission:

1. **The developer declares** what the app may ask for.
2. **The user grants or refuses**, except for low-risk permissions that the system grants itself.
3. **The operating system enforces** the decision on every access, which is [[complete-mediation]] applied to a phone.

The guiding principle is [[least-privilege]]: an app should hold only the permissions its current features need, for only as long as it needs them. Android's guidance makes the first step concrete: before declaring anything, check whether the use case can be met with no permission at all.

The [[threat-model]] assumes the operating system and its permission checks are trustworthy. The app might be careless or malicious. Libraries inside the app are someone else's code, running with all of the app's permissions. The user is busy and may not read prompts closely.

## How it works

### Android's permission types

Android sorts permissions by how much they can affect the user, the system, and other apps:

| Type                  | What it covers                                                                    | How it is granted                                         |
| --------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Install-time (normal) | Limited access that minimally affects the system or other apps                    | Automatically when the app is installed                   |
| Signature             | Capabilities shared by apps signed with the same certificate, or kept for the system | Automatically, only to apps signed by the defining certificate |
| Runtime (dangerous)   | Private data such as location and contacts, and hardware such as camera and microphone | The app asks while running, and the user decides      |
| Special               | Particular operations defined by the platform or device maker, such as drawing over other apps | The user turns it on in the Special app access settings |

A grant is also not permanent. Apple's documentation points out that a person can change the decision in Settings at any time, so an app must check the current status before each use instead of relying on an earlier answer. Related permissions can share a group so the user sees fewer dialogs, but the documentation warns that groups can change without notice, so code must not rely on them.

Special permissions deserve extra suspicion. An app allowed to draw over other apps can place its own content on top of another app's screen, the mobile cousin of [[clickjacking]].

### Asking in context

Android's guidance is to request a permission "as late into the flow of your app's use cases as possible," at the moment the user starts the feature that needs it, and to be clear about what is being accessed, why, and what stops working if the user says no. The diagram traces that flow for a camera request.

```sequence
title: A runtime permission request, asked in context
participant U as alice
participant A as CampusEats app
participant OS as Phone OS
U -> A: Taps "Scan locker code"
A -> OS: Is camera access granted?
OS --> A: Not yet
A -> OS: Request camera access
OS -> U: Prompt showing the app's reason
U --> OS: Allow
OS --> A: Granted; the camera view opens
note: If alice declines, the app offers manual code entry
```

Asking in context does two things. It gives the user the information needed to decide, because the reason is obvious when they have just tapped "Scan." It also keeps the grant tied to a feature the user chose, rather than front-loading a dozen prompts at first launch that train people to tap Allow without reading.

Apple's platforms follow the same pattern. Protected resources are off limits by default, and the first time an app tries to use one, the system shows a prompt titled with the app's name and containing the app's _purpose string_, a short reason supplied by the developer. An app that lacks the purpose string fails to get access and may crash, and App Review rejects apps that use protected resources without one. The system remembers the answer, and some prompts offer narrower choices: Apple's location prompt includes Allow Once and Allow While Using App. The purpose string lives in the app's `Info.plist`, under a key named for the resource:

```xml
<!-- iOS Info.plist: the purpose string shown in the location prompt -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>CampusEats uses your location to sort dining halls by distance.</string>
```

### What a permission cannot control

Permission systems control access, not use, and that leaves real gaps:

- **Libraries inherit everything.** Android's documentation says it plainly: "When you include a library, you also inherit its permission requirements." Apple tells developers they are responsible for all access to protected resources, including access by SDKs and libraries. An advertising or analytics SDK runs inside the app's sandbox and can read whatever the app can.
- **Data leaves with the app.** Once an app reads your location, the operating system does not decide where the app sends it. That is governed by [[data-minimization]], the app's [[privacy-notice]], store rules, and law, not by the permission check.
- **Grants are coarse.** Permission to read contacts usually means all contacts, not the one friend you meant to invite.
- **People are tired.** A prompt is a [[security-warning]] like any other, and repeated prompts get approved by reflex. This is a [[usable-security]] problem as much as a technical one.

Another Android best practice addresses visibility: when an app uses sensitive data or hardware, it should show a continuous indication if the system does not already show one.

## Worked example

The fictional campus food app CampusEats, published by `shop.example`, asks for five runtime permissions. Alice, reviewing it for the student government, lists each permission next to the feature the store page claims it serves, then asks three questions of each: does the feature need a permission at all, would a weaker one do, and is the request timed to the feature?

| Requested           | Claimed feature                 | Needed?                                          | Less privileged option                          |
| ------------------- | ------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Precise location    | Sort dining halls by distance   | Partly: sorting needs only rough distance        | Approximate location, only while in use         |
| Background location | "Remind me when I pass a café"  | No: not part of ordering                         | Drop it; offer a reminder the user schedules    |
| Contacts            | Invite friends                  | No: reading every contact to send one invite     | The system share sheet with an invite link      |
| Microphone          | Voice search                    | Optional feature                                 | Ask only when the user taps the microphone      |
| Camera              | Scan the QR code on a pickup locker | Yes, at scan time                            | Request when the user taps Scan                 |

**Step 1: Remove what no feature needs.** Background location and contacts go. The invite feature still works, because the share sheet lets the user choose a recipient without the app ever reading the address book.

**Step 2: Narrow what remains.** Sorting halls by distance works with approximate location, and only while the app is open. Android's location guide points the same way: declare precise location only if the app benefits from it, and keep working when the user grants only approximate access. On Android 10 and later, background location is a separate permission the app must declare, so dropping it in Step 1 removed a whole class of access.

**Step 3: Defer what is optional.** Voice search is cut from the first release. If it returns, the app asks for the microphone only when the user taps the microphone button.

**Step 4: Check the libraries.** CampusEats bundles a third-party analytics SDK. Because the SDK shares the app's permissions, alice asks the vendor which data the SDK collects with them, and records the answer in the review.

**Step 5: Write the result down.** The revised manifest is the review's deliverable, shown next to the original:

```xml
<!-- Before: what CampusEats requested -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.CAMERA" />

<!-- After: only what the shipped features need, each requested in context -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
```

Five runtime permissions became two, both requested at the moment of use, and each feature has a path that works if the user says no: manual locker codes for the camera, and a campus map for location.

## Defenses

- **Need no permission when you can.** Android's first step is to check whether a use case can be met without declaring a permission. Limit: some features genuinely need sensitive data.
- **Request the minimum, late, and with a reason.** Ask at the moment of use, explain why, and say what still works if the user declines. Limit: a clear prompt still cannot stop a user from approving by reflex.
- **Prefer narrower grants.** Approximate location, while-in-use access, and system pickers or share sheets limit exposure. Limit: not every resource has a narrow option.
- **Audit bundled libraries.** Every SDK inherits the app's permissions, so know what each one collects. Limit: closed-source SDKs are hard to verify.
- **Design for denial and revocation.** Check permissions before each use and degrade gracefully. Limit: this costs development time, which is why it is often skipped.
- **Review permissions as a user or organization.** Revoke what you cannot justify and delete apps you no longer use. Limit: reviews depend on attention people rarely have.

## Common misconceptions

- **"If the app store approved it, its permissions are reasonable."** Store review is not a least-privilege audit of every request.
- **"Denying a permission breaks the app."** A well-designed app explains what stops working and keeps the rest running.
- **"A permission protects my data after the app reads it."** It controls access only. What the app then does with the data is outside the permission system.
- **"Only the app's own code uses its permissions."** Every library in the app shares them.
- **"Once I tap Allow, the decision is permanent."** You can revoke a grant in Settings at any time, which is why apps must check before every use.

## Try it yourself

Use only your own phone, and change only your own settings.

1. **Audit three apps.** Open your phone's permission settings (the permission manager on Android, Privacy & Security on iOS). For three apps, list every permission each holds and write the feature that needs it. Revoke anything you cannot justify, use the apps normally for a day, and note what actually broke.
2. **Narrow one grant.** Pick an app with location access and change it to the narrowest option your phone offers, such as only while using the app or approximate location.
3. **Review on paper.** The fictional StudyBuddy app requests the camera (scan whiteboards), microphone (record lectures), contacts (find classmates), precise location (find open study rooms), calendar (exam reminders), and drawing over other apps (a floating focus timer). Using alice's table as a model, write the least-privileged set, when each request should appear, and what the app should do if the user declines.

## Key takeaways

- The sandbox blocks access by default, and a permission is a declared, granted, and enforced opening in it.
- On Android, install-time and signature permissions are granted automatically, runtime permissions are asked for in context, and special permissions are turned on in system settings.
- Least privilege means trying no permission first, then a weaker one, then asking at the moment of use.
- A granted permission is a lasting capability shared with every library in the app, and it controls access, not what happens to the data afterward.

## Go deeper

- Android's [Permissions on Android](https://developer.android.com/guide/topics/permissions/overview) guide lists its best practices; compare each with the secure design principles in [FND-05](lesson:FND-05) and decide which principle it applies.
- The [OWASP MASVS](https://mas.owasp.org/MASVS/) groups mobile requirements into control families, including MASVS-PLATFORM for interaction with the operating system and MASVS-PRIVACY for personal data. Pick one requirement from each and design a test for the CampusEats review.
- Open question: permissions name resources ("location"), while users care about purposes ("location for delivery only"). How could an operating system enforce purpose limits once data has left the device?
