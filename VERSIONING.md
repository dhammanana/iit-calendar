# Versioning & Update Guide

This project supports multiple targets: Web, Android/iOS (Capacitor), and Desktop (Tauri). To ensure seamless delivery of features and bug fixes without breaking compatibility, we follow a strict versioning policy.

---

## The Versioning Model

We use [Semantic Versioning (SemVer)](https://semver.org/) in the format `MAJOR.MINOR.PATCH` (e.g., `1.2.3`).

In this project, the SemVer components correspond directly to the deployment channels:

| SemVer Component | Type of Change | Release Channel | Action Needed |
| :--- | :--- | :--- | :--- |
| **PATCH** (`x.x.Y`) | Web bundle updates, bug fixes, UI improvements | **Capgo OTA (Over-The-Air)** | Publish a new release on GitHub. Device updates automatically. |
| **MINOR** (`x.Y.x`) | New features, native plugin changes, config updates | **App Stores (Google Play / Apple App Store)** | Recompile native binaries and submit updates. |
| **MAJOR** (`X.x.x`) | Breaking changes, massive redesigns, native structure changes | **App Stores (Google Play / Apple App Store)** | Recompile native binaries and submit updates. |

---

## Why Versioning Matters for Capgo OTA Updates

We use **Capgo** (`@capgo/capacitor-updater`) to push live hot-fixes and web asset updates to Android and iOS apps. This allows us to fix bugs in the UI (React/Vite app code) instantly without waiting for App Store approval.

However, **Capgo has a strict minor-version matching constraint**:
- **Devices will only download an OTA update if its minor and major version match the native app version.**
- **Upgrade Path Example**:
  - A device with native build `1.0.5` **can** automatically update to web bundle versions `1.0.6`, `1.0.7`, etc., via OTA.
  - A device with native build `1.0.5` **cannot** update to `1.1.0` or `2.0.0` via OTA.
- **Why this exists**: Web updates modify JS/CSS/HTML but cannot update native Java/Kotlin/Swift files (Capacitor Plugins). If a web update relies on a new Capacitor plugin that isn't present in the native binary, the app will crash. Enforcing minor-version matching prevents incompatible code from breaking the app on users' devices.

---

## How to Release and Update Versions

### 1. Releasing a Patch Version (OTA Live Update)
*Use this for bug fixes or minor UI tweaks that do not add new Capacitor/Tauri native plugins or change native configurations.*

1. Run `pnpm version <patch|minor|major>` or `npm version <patch|minor|major>` (e.g. `pnpm version patch` or `pnpm version 1.2.0`).
   - This automatically updates `package.json`, triggers the `"version"` script to run `capacitor-set-version` for iOS (`Info.plist`) and Android (`build.gradle`), stages all files, and creates a Git commit and tag (`v1.2.0`).
2. Push commit & tag to GitHub:
   ```bash
   git push --follow-tags
   ```
3. **Automated CI Build & Release**: GitHub Actions detects the tag, re-verifies native versions with `github.run_number`, compiles `web-build.zip` and the Android APK, and creates a GitHub Release.
4. **Tauri (Desktop)**: Remember to update `src-tauri/tauri.conf.json` when bumping minor/major versions.
