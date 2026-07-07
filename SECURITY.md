# Security Policy

## Supported Versions

This project is in early development. Security fixes are provided for the latest published minor release only.

| Version | Supported |
| ------- | --------- |
| 0.3.x   | Yes       |
| < 0.3   | No        |

If you are using an older version, upgrade to the latest release before reporting an issue unless the vulnerability still reproduces there.

## Reporting a Vulnerability

Please do not report security vulnerabilities in public issues.

Use GitHub's private vulnerability reporting for this repository:

https://github.com/devioarts/capacitor-electron/security/advisories/new

If private reporting is unavailable, open a minimal public issue asking for a private security contact, but do not include exploit details, proof-of-concept code, tokens, credentials, or affected user data.

Please include:

- The affected `@devioarts/capacitor-electron` version.
- Your operating system and Electron version.
- A concise description of the vulnerability and impact.
- Reproduction steps or a minimal proof of concept.
- Whether the issue affects generated Electron templates, the CLI, runtime bridges, or documentation.

## Response Expectations

Maintainers will try to acknowledge valid reports within 7 days. Confirmed vulnerabilities will be fixed in a new patch or minor release when possible, and the advisory will be published after users have had a reasonable opportunity to upgrade.

## Security Notes for Users

This package creates an Electron runtime for Capacitor apps. Treat renderer content, external URLs, downloaded files, deep links, custom protocols, and native command execution as security-sensitive surfaces. Keep Electron and this package up to date, review generated template changes during upgrades, and avoid disabling sandboxing, context isolation, CSP, or protocol allowlists unless you fully trust the affected content.
