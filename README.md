# Cullr

Cullr is a mobile app that helps you free the junk in your phone by automatically scanning for clutter in your gallery. It scans images on your behalf, moves candidates to a recycle bin, and lets you permanently delete them when you are ready. All processing happens locally on-device.

## Highlights

- Automatic junk scanning to cut manual scouring from hours to seconds
- Scan images -> move to recycle bin -> delete permanently
- Everything happens locally (no uploads)
- Estimated storage recovery: 10-25% for typical cluttered galleries (see Notes)

## Tech stack

- Expo (React Native)
- Expo Router (file-based routing)
- TypeScript

## Requirements

- Node.js (LTS recommended)
- npm
- Android Studio + Android SDK (for local Android builds)
- Java 17 (for Gradle/Android builds)

## Setup

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the dev server

   ```bash
   npx expo start
   ```

3. Run on a device/emulator
   - Android emulator (Android Studio)
   - Physical device with USB debugging enabled
   - Expo Go (limited, depending on native modules)

## Scripts

```bash
npm run start
npm run start:tunnel
npm run android
npm run ios
npm run web
npm run lint
npm run reset-project
```

## Build with EAS (cloud)

Recommended for release builds. This repo has APK and AAB profiles in [eas.json](eas.json).

```bash
# APK (internal preview build for testing)
npx eas build -p android --profile preview

# APK (internal distribution with production settings)
npx eas build -p android --profile production-apk

```

Follow the prompts to configure credentials and download the artifact.

## Build an APK locally (Android)

Use this if you want to build the APK on your machine.

1. Ensure Android SDK and Java 17 are installed and available in your environment.
2. From the project root, build the release APK:

   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. Find the APK at:

   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

If you need a debug APK instead:

```bash
cd android
./gradlew assembleDebug
```

## Project structure

- [app/](app/) - App screens and routes
- [src/components/](src/components/) - Reusable UI components
- [src/services/](src/services/) - Gallery scanning and deletion logic
- [src/store/](src/store/) - State management

## Notes

- Estimated storage savings assume 2-5 GB of junk in a 20-50 GB gallery (roughly 10-25%).
- Estimated time savings assume 2-4 hours of manual review vs a 10-60 second scan pass.
- Actual results vary by gallery size, device speed, and how much clutter is present.
- This app performs local-only processing for privacy.

## Privacy

- No uploads or external processing. Everything stays on-device.
- Deletions are explicit and user confirmed via the recycle bin flow.

## License

MIT License.
