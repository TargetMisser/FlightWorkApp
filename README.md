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

APK files are also published in GitHub Releases when available.

Expected assets:

- `FlightWorkApp-v2.1.0-release.apk`: main Android app
- `FlightWorkApp-Wear-v2.1.0.apk`: Wear OS companion

To install a release:

1. Open the repository Releases section.
2. Download the APK you need.
3. Install the APK on your Android device.
4. For Wear OS, use the watch-specific APK.

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

## GitHub Actions

The repository includes workflows for:

- basic CI
- snapshot releases on `main`

Note: execution depends on GitHub Actions being available for the account/repository.

## Notes

- The repository is set up to be used from multiple computers.
- Local files, logs, temporary outputs, and keystores are not published.
- The Android / Wear OS module is included in the repository.
