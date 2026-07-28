# IIT Calendar

A comprehensive Buddhist calendar and spiritual practice companion app designed for monastics and lay practitioners. This app provides essential tools for daily life in a monastic or serious practice environment, supporting multiple traditions and languages.

## Features

- **Multi-Tradition Calendar**: Supports Sri Lankan, Myanmar, Thai, and Traditional Lunar calendars.
- **Solar Calculations**: Precise dawn, solar noon, and sunset times with support for specific monastic traditions (Pa-Auk, Na-Uyana).
- **Chanting & Texts**: Integrated chanting book with support for multiple Pali scripts (Roman, Sinhala, Burmese, Thai, etc.) via Aksharamukha.
- **Meditation Timer**: A "Stillness" timer for daily meditation practice.
- **Study Mode**: Pomodoro-based study timer with task management and focus reporting.
- **Multi-Language**: Available in English, Sinhala, Burmese, Thai, Vietnamese, Khmer, and Lao.
- **Cross-Platform**: Optimized for Web, Android (Capacitor), iOS (Capacitor), and Desktop (Tauri).

## Privacy

IIT Calendar is designed with a **local-first** philosophy. Your data—including settings, chanting history, and meditation statistics—is stored exclusively on your device.

- **No Data Collection**: We do not collect or transmit your personal data to external servers.
- **Local Storage**: All practice data stays within your device's local storage or native file system.
- **Location Data**: Used locally for precise solar/lunar calculations; never shared.
- **Privacy Policy & EULA**: Accessible directly within the app via **Settings > Legal & Information**.

## Tech Stack

- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Package Manager**: [pnpm](https://pnpm.io/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Mobile Support**: [Capacitor](https://capacitorjs.com/)
- **Desktop Support**: [Tauri](https://tauri.app/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Script Conversion**: [Aksharamukha](https://aksharamukha.appspot.com/)

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd iit-calendar

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

### Build

```bash
# Build for web
pnpm build

# Preview build
pnpm preview
```

### Mobile (Capacitor)

To sync and build for mobile platforms:

```bash
# Sync with mobile platforms
pnpm run cap:sync

# Open Android Studio
pnpm run cap:open:android

# Open Xcode (macOS only)
pnpm run cap:open:ios
```

## Releasing & Versioning

This project uses **Capgo OTA (Over-The-Air) live updates** for mobile applications to deploy UI changes instantly.

### 1. Creating Development Pre-Releases (`dev` Channel)

For testing features or data migrations on devices set to the **Dev** update channel:

```bash
# Start a new dev pre-release (e.g. 1.1.5 -> 1.1.6-dev.0)
pnpm version prepatch --preid=dev

# Bump subsequent dev builds (1.1.6-dev.0 -> 1.1.6-dev.1)
pnpm version prerelease --preid=dev

# Or specify an exact version string directly
pnpm version 1.1.6-dev.1

# Push commits and tag to trigger build
git push --follow-tags
```

### 2. Creating Official Stable Releases (`stable` Channel)

When a feature is verified and ready for all users:

```bash
# Bump patch release (e.g. 1.1.5 -> 1.1.6)
pnpm version patch

# Bump minor release for native updates (e.g. 1.1.5 -> 1.2.0)
pnpm version minor

# Push commit and tags to GitHub
git push --follow-tags
```

### Automatic Build Automation

Running `pnpm version` automatically:
- Bumps the version in `package.json`.
- Runs `capacitor-set-version` to sync `Info.plist` (iOS) and `build.gradle` (Android).
- Stages all files and creates a Git commit and tag (e.g. `v1.1.6-dev.1` or `v1.1.6`).
- Triggers GitHub Actions to package `web-build.zip` and publish the release.

### OTA Update Channels

Users can select their preferred OTA update channel via **Settings > OTA Update Channel**:
- **Stable**: Receives only verified, official releases (e.g., `v1.1.6`).
- **Dev**: Receives test/development releases (e.g., `v1.1.6-dev.1`).

For details on when to use Patch vs. Minor vs. Major versions, see the [Versioning Policy](VERSIONING.md).

## License

This project is licensed under the **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)** license.

- **Free to use, share, and adapt** for personal and non-commercial purposes.
- **Attribution**: You must give appropriate credit.
- **Non-Commercial**: You may not use the material for commercial purposes.
- **No Additional Restrictions**: You may not apply legal terms or technological measures that legally restrict others from doing anything the license permits.

See the [LICENSE](LICENSE) file for the full legal text.
