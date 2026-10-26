# LocalBeats — Android-first Expo music player

A starter project for a local music player with a burgundy-and-black palette, monospaced typography, user-selected folder, song list, album screens, and background playback.

## Setup

```bash
npm install
npx expo install expo-audio expo-file-system expo-router expo-status-bar
npx expo install @react-native-async-storage/async-storage react-native-safe-area-context react-native-screens
npx expo install @react-native-community/slider
npx expo prebuild
npx expo run:android
```

Use an Android device or emulator. Background playback and Android lock-screen controls need a native development build; they are not fully testable in Expo Go.

## Install an offline Android build

The regular `npm run android` command installs a debug build that loads JavaScript from Metro on the development computer. It will not launch reliably after that computer is disconnected.

With an Android device connected over USB (or an emulator running), build and install the standalone release version:

```bash
npm run android:release
```

The release APK includes the app bundle, so LocalBeats can launch without the development computer or an internet connection. The generated APK is at `android/app/build/outputs/apk/release/app-release.apk`; copy it to another Android device and install it there to use the app independently. Music must be stored on the device, and the music folder must be selected in LocalBeats.

## Publish an app update

Tap the LOCALBEATS title on the library screen to open App Info. **Check for updates** looks for the latest published GitHub Release in `suji0028/SUJIFLAC`. If a newer version is available and that release includes an `app-release.apk` asset, the screen offers its download. Android requires the user to confirm installing the APK; updates are not installed silently.

Song titles use `src/BlackMustang.ttf`, while artist, album, and other track metadata use `src/blackPink.ttf`. Both fonts are bundled locally and work without an internet connection.

For each update, increase `version` in both `app.json` and `package.json`, and increase `versionCode` and set `versionName` in `android/app/build.gradle`. Build with `npm run android:release`, then create a published GitHub Release whose tag matches the app version (for example, `v1.0.3`) and attach the generated APK using the exact asset name `app-release.apk`. The Android package ID must remain `com.localbeats.player` so Android recognizes it as an update to the installed app.

The current Android release build uses the local `android/app/debug.keystore`, which is intentionally excluded from Git. Keep a secure backup and use the same keystore for every release; if building on another computer, restore that keystore securely before building. Android will not install an update signed with a different key.

## Important current limitations

This is a starter scaffold, not a finished production music player.

- Folder access uses Android's Storage Access Framework.
- Android scanning reads embedded title, artist, album, album artist, genre, year, track number, and duration from SAF content URIs using `MediaMetadataRetriever`; files without readable tags fall back to a clean filename and safe defaults. Embedded art is resized and saved to the app cache.
- Bass/treble controls use Android's output-mix equalizer and are available only on devices that support that effect; output-mix changes may also affect audio from other apps.
- The album and now-playing screens currently show a generated record icon, not extracted embedded artwork.
- SAF directory traversal can vary by Android provider. Validate it on the target devices and add error reporting/reconnect flow.
- The audio metadata reader is a local native Android module, so rebuild and reinstall the Android development app after native changes; a Metro reload alone does not add the module to an existing binary.
- Review the exact Expo package versions after creating the project. Expo SDK and native module versions must match the SDK installed by `create-expo-app`.
- Add `@react-native-community/slider` with the install command above (listed separately to keep the screen source simple).

## Next implementation milestone

Add embedded album-art extraction and persist the complete metadata index in AsyncStorage. Do not copy whole large audio files into JS memory just to parse tags.
