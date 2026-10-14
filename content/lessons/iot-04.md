---
topicId: IOT-04
title: Mobile data storage and platform controls
summary: Where a mobile app should keep tokens, cached records, and keys under a stated threat model, what app-private storage, passcode-based file encryption, and hardware-backed keystores each protect against, and the leaks through backups, logs, and the screen that bypass all three.
level: intermediate
status: draft
version: 1
updated: 2026-10-14
estimatedMinutes: 30
objectives:
  - State a threat model for data at rest on a phone that distinguishes another app, a person using the unlocked phone, a thief with a locked phone, a backup reader, and code running inside the app.
  - Explain what app-private storage, passcode-based file encryption, and a platform keystore each protect against, and where each one stops.
  - Explain why a key that never leaves the keystore can still be used by malicious code running as the app, and how a user-authentication requirement narrows that misuse.
  - Choose and justify a storage location and protection level for each data item in a fictional app under stated threats.
prerequisites: [IOT-03, CRY-02, SYS-05]
concepts:
  - keystore
  - trusted-execution-environment
labs: []
keywords:
  - Android Keystore
  - AndroidKeyStore
  - KeyGenParameterSpec
  - StrongBox
  - TEE
  - hardware-backed keys
  - key attestation
  - iOS Keychain
  - Data Protection
  - NSFileProtectionComplete
  - Secure Enclave
  - SharedPreferences
  - app-private storage
  - backups
  - OWASP MASVS
  - MASVS-STORAGE
  - MASWE-0002
  - MASWE-0003
  - MASWE-0005
  - MASWE-0006
sources:
  - title: Android Keystore system
    url: https://developer.android.com/privacy-and-security/keystore
    publisher: Google (Android Developers)
  - title: 'Apple Platform Security: Data Protection overview'
    url: https://support.apple.com/guide/security/data-protection-overview-secf6276da8a/web
    publisher: Apple
  - title: 'Apple Platform Security: Data Protection classes'
    url: https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web
    publisher: Apple
  - title: 'Apple Platform Security: Keychain data protection'
    url: https://support.apple.com/guide/security/keychain-data-protection-secb0694df1a/web
    publisher: Apple
  - title: 'OWASP MASVS: MASVS-STORAGE'
    url: https://mas.owasp.org/MASVS/05-MASVS-STORAGE/
    publisher: OWASP Foundation (OWASP Mobile Application Security project)
quiz:
  - question: An iOS app stores a cached transcript with the default protection class for third-party app data. A thief takes the phone, which has been unlocked once since it last restarted and is now locked. Which statement is correct?
    choices:
      - The file is as protected as it would be under Complete Protection.
      - The file has no encryption at all, because the default class is No Protection.
      - The file's class key stays in memory after the first unlock, so the default class mainly protects against attacks that involve a restart; Complete Protection would discard the key shortly after locking.
      - The file is protected only if the app also stores it in the keychain.
    answer: 2
    explanation: Apple documents that third-party app data defaults to Protected Until First User Authentication, whose class key is not removed from memory when the device locks. Complete Protection discards its class key shortly after lock, so sensitive files that are not needed in the background should opt into it.
  - question: Malicious code runs inside an Android app's process. The app's signing key lives in Android Keystore, bound to secure hardware. What can the malicious code do?
    choices:
      - Copy the key bytes to its server, because the key is loaded into the app's memory for each operation.
      - Ask the keystore to sign data with the key while it runs, but not extract the key material.
      - Nothing, because hardware-backed keys cannot be used by a compromised app.
      - Read the key from the app's backup file.
    answer: 1
    explanation: Key material never enters the app process, and hardware-bound keys never leave the secure hardware, so the key cannot be copied off the device. The keystore still performs operations for the app that owns the key, so code running as that app can use it. A user-authentication requirement on the key narrows this by demanding a recent unlock or biometric check.
  - question: Which choice best protects a long-lived refresh token against someone who later restores the phone's backup onto a different device?
    choices:
      - Storing the token in a plaintext file in shared storage and deleting it at logout
      - Writing the token to the app's log so it can be recovered for support
      - Encrypting the token with a key from the same preferences file
      - Encrypting the token with a non-exportable keystore key, or keeping it in a keychain item marked This device only, and excluding it from backups
    answer: 3
    explanation: A keystore key never leaves the device, so encrypted data restored elsewhere cannot be decrypted, and This device only keychain items are unusable when restored to a different device. Shared storage, logs, and keys stored beside the data are all listed MASVS weaknesses.
  - question: Why does iOS file Data Protection not protect an app's files from a roommate who is using alice's unlocked phone?
    choices:
      - Because the passcode-derived class keys are already available while the phone is unlocked, so the files are readable unless the app also demands fresh user presence
      - Because both features turn themselves off when the phone is connected to Wi-Fi
      - Because they encrypt only data that is sent over the network
      - Because they protect only data stored by system apps
    answer: 0
    explanation: Encryption at rest protects data whose keys are not currently available. When the phone is unlocked, class keys are in use and the data is readable. Only a requirement checked at the moment of use, such as a keychain access control that demands Face ID or a keystore key that requires authentication for each use, makes the roommate prove they are alice.
---

## Why it matters

Phones are lost, stolen, lent to friends, backed up to the cloud, and sometimes infected. Whatever an app writes to the device can outlive the moment that needed it: a session token in a settings file, a cached copy of a student's grades, a log line that contains a password. OWASP's Mobile Application Security Verification Standard (MASVS) gives storage its own control group, MASVS-STORAGE, and its weakness catalog names the usual leaks: sensitive data stored unencrypted outside private storage, written to logs, or left in backups, and cryptographic keys stored outside the platform keystore.

Mobile platforms offer strong tools for this: each app's private storage, file encryption tied to the device passcode, and keystores backed by isolated hardware. Each protects against particular attackers and not others, so choosing among them starts with saying who the attacker is.

## The core idea

For sensitive data there is a ladder of choices, best first:

1. **Do not store it.** Data that never reaches flash storage cannot leak from it. Fetch it when needed and keep it in memory.
2. **Keep it in app-private storage,** inside the [[mobile-sandbox]], where other apps cannot read it.
3. **Encrypt it with a key the app never holds,** generated inside a platform [[keystore]] and, where possible, kept in isolated hardware.
4. **Require the user's presence** for each use of that key, through the lock-screen credential or a biometric.

Each rung defends against a different attacker. The [[threat-model]] for this lesson assumes an intact operating system (not rooted or jailbroken), a phone with a lock-screen passcode, and five attackers, compared in the table below.

| Attacker                            | App-private file       | Passcode-based file encryption        | Keystore-encrypted data           |
| ----------------------------------- | ---------------------- | ------------------------------------- | --------------------------------- |
| Another app on the phone            | Blocked by the sandbox | Not the relevant control              | Blocked; keys belong to one app   |
| Thief with the phone locked         | Depends on encryption  | Depends on the protection class       | Blocked if the key needs an unlock |
| Roommate using the unlocked phone   | Exposed                | Exposed; keys are in use              | Exposed unless each use needs the user |
| Someone restoring a backup elsewhere | Exposed unless excluded | Depends on how the backup is protected | Useless; the key stayed on the device |
| Malicious code running as the app   | Exposed                | Exposed                               | Key cannot be copied, but can be used |

The last row is the subtle one. A keystore protects the key, not the data: it guarantees the key cannot be copied off the device, but it still performs operations for the app that owns the key.

## How it works

### Passcode-based file encryption

On iOS, Data Protection builds a hierarchy of keys on top of the device's hardware encryption. Every new file gets its own 256-bit key, and that key is wrapped by the key of the file's _protection class_. Files that third-party apps create are protected by default, but the class matters:

| Class                                        | When the data is available                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| A: Complete Protection                       | Only while unlocked; the class key is discarded shortly after the device locks |
| B: Protected Unless Open                     | Files already open stay usable, and new files can be written while locked     |
| C: Protected Until First User Authentication | After the first unlock since restart, even when the phone is locked again      |
| D: No Protection                             | Always; the key is protected only by the device's hardware UID                 |

Class C is the default for third-party app data. Apple describes it as protecting against attacks that involve a restart, because its class key stays in memory after the first unlock. A phone stolen while locked, but not restarted since its owner last unlocked it, therefore offers class C files less protection than class A files, whose key is gone. Class A's key is protected by a key derived from both the user's passcode and the device's UID, which ties decryption to this device and this passcode.

### Keystores and hardware-backed keys

Encrypting a file is only as good as the place the key lives. Android Keystore keeps keys "non-exportable," and its documentation states that "key material never enters the application process": the app asks a system service to encrypt, decrypt, or sign, and receives only results. When a key is bound to secure hardware, either a [[trusted-execution-environment]] (TEE) or a [[secure-element]], its material never leaves that hardware. Apps can confirm where a key lives by asking for its security level, and on Android 9 and later some devices add StrongBox, which keeps keys in a more isolated secure subsystem such as an embedded secure element. Android's own advice is that StrongBox is slower and that most apps do not need it.

Every Android Keystore key carries _authorizations_ fixed when it is created: which purposes, block modes, padding schemes, and digests it may be used with, an optional validity period, and whether the user must have authenticated recently. The keystore enforces them on every use, so even the app that created the key cannot later use it outside those limits.

On iOS, the keychain plays the same role for small secrets such as tokens. Items are encrypted with AES-256-GCM, decrypting an item's secret value always requires a round trip through the Secure Enclave, and a system service decides which items each app may access. Keychain items have accessibility classes that mirror file protection, such as available only when unlocked or available after first unlock, and "This device only" variants are unusable if a backup is restored to a different device. An access control can also require Face ID, Touch ID, or the passcode before an item is used, and the Secure Enclave evaluates that requirement.

### The vulnerable pattern and the fix

The most common storage mistake is a long-lived secret in a plaintext preferences file:

```java
// Vulnerable: a refresh token sits in plaintext in the app's preferences.
SharedPreferences prefs = context.getSharedPreferences("session", Context.MODE_PRIVATE);
prefs.edit().putString("refresh_token", refreshToken).apply();
```

The file is private to the app, so other apps cannot read it, but it appears in backups unless excluded and is readable by anything running as the app. The fix keeps the key inside Android Keystore and stores only ciphertext:

```java
// Fix: encrypt the token with a non-exportable AES key held by Android Keystore.
KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
generator.init(new KeyGenParameterSpec.Builder("session-key",
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setUserAuthenticationRequired(true)          // usable only after a recent unlock
        .setUserAuthenticationParameters(300,
            KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL)
        .build());
SecretKey key = generator.generateKey();

Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
cipher.init(Cipher.ENCRYPT_MODE, key);               // the keystore chooses a fresh IV
byte[] iv = cipher.getIV();
byte[] sealed = cipher.doFinal(refreshToken.getBytes(StandardCharsets.UTF_8));
// Save iv and sealed in app-private storage; the key bytes never reach this process.
```

AES-GCM is [[aead|authenticated encryption]], so tampering with the stored ciphertext is detected at decryption. The user-authentication setting means the key works only within five minutes of the user unlocking the phone or passing a strong biometric check, which narrows what malicious code running as the app can do with it.

### Leaks that bypass storage controls

Careful file storage is undone if the same data escapes another way. MASVS-STORAGE and its linked weakness entries cover the usual channels: sensitive data in logs (MASWE-0005), in backups (MASWE-0006), unencrypted outside private storage (MASWE-0002), in notifications, in screenshots, and on the clipboard, plus a best practice of turning off keyboard caching for sensitive input fields. The same group lists cryptographic keys stored outside the platform keystore (MASWE-0003), the mistake the code above fixes.

## Worked example

The fictional GradeView app for `registrar.example` shows students their grades. Alice must decide where it stores four items. Her threat model covers a stolen phone, other apps, a roommate who borrows the unlocked phone, and backups restored on another device. A fully compromised operating system is out of scope, and she says so in writing.

**Step 1: Classify the data.** The refresh token can mint new sessions, so it is high value. The cached transcript is personal and sensitive. The campus ID barcode is shown openly at the library desk. The theme setting is not sensitive.

**Step 2: Apply the first rung.** The transcript is needed only on screen. GradeView fetches it each time and keeps it in memory, so a stolen phone holds no copy.

**Step 3: Protect the token.** Alice uses the keystore pattern above on Android and a keychain item that is available only when unlocked, marked This device only, and protected by an access control requiring Face ID or the passcode on iOS. On Android she also excludes the encrypted token from backups. Because the key cannot leave the device, a backup restored elsewhere is useless.

**Step 4: Protect files that must exist.** For offline viewing, students may save one transcript. Alice stores it in app-private storage with Complete Protection on iOS, so it becomes unreadable shortly after the phone locks, and deletes it at logout.

**Step 5: Close the side channels.** The app writes no tokens or grades to logs, hides grade details in notifications, marks sensitive screens so the system does not keep readable snapshots of them, and disables keyboard caching on the student ID field.

| Item               | Decision                                   | Main attacker it stops                |
| ------------------ | ------------------------------------------ | ------------------------------------- |
| Refresh token      | Keystore or keychain, user presence, no backup | Roommate, backup reader, thief    |
| Cached transcript  | Not stored; saved copy uses Complete Protection | Thief with a locked phone        |
| Campus ID barcode  | App-private storage                        | Other apps                            |
| Theme setting      | App-private preferences                    | None needed                           |

## Defenses

- **Store less.** Data you never write cannot leak. Limit: offline features need some local data.
- **Use app-private storage, never shared storage, for anything sensitive.** Limit: the sandbox does not stop backups, the unlocked phone's user, or code running as the app.
- **Choose the strongest file protection the feature allows.** On iOS, use Complete Protection for data not needed while locked. Limit: background tasks cannot read such files while the phone is locked.
- **Keep keys in the platform keystore or keychain, bound to hardware where possible.** Limit: the key can still be used by code running as the app.
- **Require user presence for high-value keys.** Limit: frequent prompts annoy users, so reserve them for actions that matter.
- **Exclude secrets from backups and keep them out of logs, notifications, and screenshots.** Limit: each channel needs its own fix, so use a checklist such as MASVS-STORAGE.
- **Pair device storage with server controls.** Short-lived [[access-token|access tokens]] and revocable [[refresh-token|refresh tokens]] limit the damage when a device is lost.

## Common misconceptions

- **"Encrypting the data with a key stored next to it protects it."** Anyone who can read the file can read the key. The key must live in the keystore.
- **"A hardware-backed key makes the data safe even if the app is compromised."** The key cannot be copied, but the compromised app can still ask the keystore to use it.
- **"Device encryption protects my data while I use the phone."** File encryption protects data whose keys are not available. While the phone is unlocked, they are.
- **"All app files are equally protected on iOS."** The default class keeps its key in memory after the first unlock. Complete Protection must be chosen.
- **"Private storage is private everywhere."** Backups copy it unless the app excludes it.

## Try it yourself

Use only your own phone and accounts.

1. **Check the foundation.** Confirm your phone has a lock-screen passcode, since passcode-based file encryption depends on it. Note how quickly the screen locks automatically.
2. **Review your backups.** Open your phone's backup settings and list which apps are backed up. For two of them, decide whether anything they store should stay out of a backup.
3. **Fill the table on paper.** For a fictional banking app at `bank.example`, list four items (session token, account number, last statement PDF, and push notification text). For each, choose a storage option and protection level, and name the attacker from the threat table that your choice stops.
4. **Map it to MASVS.** Match each of your decisions to a MASVS-STORAGE weakness it avoids.

## Key takeaways

- Start from the attacker: another app, a thief, the person holding the unlocked phone, a backup reader, or code running as the app each defeats different controls.
- App-private storage stops other apps. Passcode-based encryption stops a thief only when the right protection class keeps keys out of memory.
- A keystore guarantees the key cannot be copied, not that it cannot be used. User-presence requirements narrow its use.
- Most real leaks bypass the file system: logs, backups, notifications, screenshots, the clipboard, and keyboard caches.

## Go deeper

- Android's [keystore documentation](https://developer.android.com/privacy-and-security/keystore) describes key attestation, which lets a server check that a key really lives in secure hardware. What does attestation prove, and what does it not prove about the app that uses the key?
- Compare Apple's [Data Protection classes](https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web) with the "after first unlock" state: why might an attacker who steals a phone prefer to keep it powered on?
