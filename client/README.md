# Casca — Mobile Client (Expo / React Native)

This directory contains the cross-platform mobile client for **Casca**, built with **Expo SDK** and **React Native** (TypeScript).

---

## 📱 Features Implemented in the Foundation

- **Interactive Calendar (UC-03 & UC-04)**:
  - Filters by scope: `ALL`, `CAMPUS`, `CLUB`, `SECTION`.
  - Section switcher banner: view other sections' events in read-only mode (`+ Browse IT-B`).
  - Event cards rendering venue, description, IST formatted timestamps, and color-coded scope badges.
- **Event Publishing & Approval Requests (UC-06, UC-07, UC-14)**:
  - Role-based event creation form (`SECTION`, `CLUB`, `CAMPUS`).
  - Campus events submit with `PENDING_APPROVAL` status requiring Admin approval.
- **Identity & Persona Switcher (UC-02)**:
  - View student profile, course, section, year, clubs, and active roles.
  - Interactive persona switcher to preview the UI as a **Student**, **Class Representative (CR)**, or **Club Coordinator**.

---

## 🚀 Running the Client Locally

1. **Start the Expo development server**:
   ```bash
   cd client
   npm start
   ```
2. **Preview on a Phone**:
   - Install the **Expo Go** app from Google Play Store or iOS App Store.
   - Scan the QR code displayed in the terminal with your phone's camera.
3. **Preview on Web**:
   ```bash
   npm run web
   ```

---

## 📦 How to Build an Android APK

There are two primary methods to produce an installable `.apk` file:

### Method 1: Cloud APK Build via EAS (Easiest)

This builds a standalone installable APK without needing Android Studio or Gradle installed locally.

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```
2. **Log into your Expo account**:
   ```bash
   eas login
   ```
3. **Trigger the preview APK build**:
   ```bash
   cd client
   eas build -p android --profile preview
   ```
   _When complete, EAS provides a download URL and QR code for the `.apk` file._

---

### Method 2: Local APK Build (Offline / Gradle)

If you have the Android SDK and Java JDK 17 installed:

1. **Generate the native Android project**:
   ```bash
   cd client
   npx expo prebuild --platform android
   ```
2. **Compile the standalone APK**:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
3. **Locate the generated APK**:
   The installer APK will be generated at:
   `android/app/build/outputs/apk/release/app-release.apk`
