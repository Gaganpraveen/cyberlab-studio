# Security Policy

CyberLab Studio is a static web app with no backend and no accounts. It stores
progress only in the browser's local storage and makes no outbound requests to
carry out a lab exercise. That keeps the security surface small, but we still
want to hear about problems.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Instead, use
GitHub's private vulnerability reporting:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** to open a private advisory.

If you cannot use that, contact the repository owner (**@Gaganpraveen**) on
GitHub and ask for a private channel.

Please include what you found, how to reproduce it, and the impact you expect.
We will acknowledge your report, investigate, and keep you updated on a fix.

## Scope

Things we especially want to know about:

- Any way a lab could reach outside its sandbox — make a real network request,
  touch a real host, or escape a sandboxed iframe.
- A cross-site scripting or content-injection path in the app shell or the
  Markdown renderer.
- A dependency with a known, exploitable vulnerability that affects the built
  site.

Out of scope: the intentionally vulnerable targets **inside** the labs. Those
are deliberately insecure teaching material and run only against in-memory,
fictional data in the student's own tab.
