# FlightWorkApp

FlightWorkApp is an Expo / React Native app designed for airport operations work, bringing shift planning, flight activity, quick-reference manuals, and phone + Wear OS support into one place.

It is mainly built to:

- check the current shift
- view the operational flight timeline
- use quick Android widgets
- use a Wear OS companion for essential info
- store notes, passwords, contacts, and operational manuals

## AI-Assisted Development

A core part of this project is that it was built with AI support throughout the development process.

That includes:

- feature ideation and planning
- code implementation and refactoring
- debugging and issue fixing
- documentation drafting
- repository and release workflow setup

## Main Features

- Shift calendar with manual entry and import tools.
- Flight timeline and shift operations view.
- Android widget for shift flights.
- Companion Wear OS.
- Editable manuals and operational notes.
- Contacts, notepad, and password management.

## Stack

- Expo SDK 54
- React Native 0.81
- React 19
- TypeScript
- Android native module + Wear OS module

## Requirements

- Node.js 20 recommended
- npm
- Android Studio + Android SDK for local Android builds
- Java 17 or newer

## Clone and Run

To work on the project from another computer:

```bash
git clone https://github.com/TargetMisser/FlightWorkApp.git
cd FlightWorkApp
npm ci
npm run start
```

## Useful Commands

Start Metro:

```bash
npm run start
```

Run Android:

```bash
npm run android
```

Run Web:

```bash
npm run web
```

Typecheck:

```bash
npm run typecheck
```

## Build and Releases

APK files are published in [GitHub Releases](https://github.com/TargetMisser/FlightWorkApp/releases).

Latest stable: **v2.6.22**

To install:

1. Open the Releases section and download `AeroStaffPro-vX.X.X.apk`.
2. Transfer to your Android device and install (enable "Unknown sources" if needed).
3. For Wear OS, pair the phone app — the watch companion installs automatically.

To build locally:

```bash
$env:RELEASE_STORE_FILE="C:\path\to\release.keystore"
$env:RELEASE_STORE_PASSWORD="your-keystore-password"
$env:RELEASE_KEY_ALIAS="your-key-alias"
$env:RELEASE_KEY_PASSWORD="your-key-password"

cd android
.\gradlew.bat assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

The GitHub Actions release workflow expects these repository secrets:
`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, and `KEY_PASSWORD`.

## Branch Structure

- `main`: most stable and shareable branch
- `dev`: current development branch

## Workflow Git

Suggested flow:

```bash
git checkout dev
git pull
git checkout -b feature/nome-modifica
```

When you are done:

```bash
git add .
git commit -m "Describe your change"
git push
```

## Notes

- The repository is set up to be used from multiple computers.
- Local files, logs, temporary outputs, and keystores are not published.
- The Android / Wear OS module is included in the repository.
