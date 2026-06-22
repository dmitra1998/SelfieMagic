# Android APK Test Record

The standalone preview APK was installed and tested on an Android 10 or newer device. It worked as expected on a Google Pixel 7 Pro running Android 14. A newer development/debug APK has also been built and checked with Android SDK tools. Its device test is still pending.

## Build details

| Item | Preview APK | Development/debug APK |
| --- | --- | --- |
| EAS profile | `preview` | `development` with Expo Dev Client |
| EAS build | [90773792-a6a8-4c34-9f5d-d0931838a2d8](https://expo.dev/accounts/dmitra2/projects/SelfieMagic/builds/90773792-a6a8-4c34-9f5d-d0931838a2d8) | [ece7eec0-ef40-4a71-b3df-135a890b903c](https://expo.dev/accounts/dmitra2/projects/SelfieMagic/builds/ece7eec0-ef40-4a71-b3df-135a890b903c) |
| Local file | `artifacts/SelfieMagic-1.0.0-preview.apk` | `artifacts/SelfieMagic-1.0.0-development.apk` |
| Size | 102,698,848 bytes | 171,022,954 bytes |
| SHA-256 | `EBE6B9A3F4F508713A9163E94FADF299485D624D44021C0DBEB6156D5603CCD2` | `47A69B9245E0EDA8ADB0D9B013311CBAEB358617BDDE80B07D560437C80B54B6` |
| Debuggable flag | No | Yes (`android:debuggable=true`) |
| Package | `com.dmitra2.SelfieMagic` | `com.dmitra2.SelfieMagic` |
| App version | `1.0.0` (`versionCode 2`) | `1.0.0` (`versionCode 2`) |
| Android SDK | Minimum API 24, target API 36 | Minimum API 24, target API 36 |
| Device test | Passed on Pixel 7 Pro | Pending |

## Preview APK device test

| Test | Result |
| --- | --- |
| Device or emulator | Google Pixel 7 Pro (physical device) |
| Android version and API | Android 14, API 34 |
| APK installation | Passed |
| App launch | Passed |
| General app test | Passed; app worked as expected |
| Camera permission and recording | Not recorded separately |
| Video still present after restart | Pending |
| Offline queue and upload after reconnecting | Pending |
| S3 object confirmed and app marked as uploaded | Pending |

## Steps for the device test

1. Build the APK with `eas build --platform android --profile development` or `preview`.
2. Get its hash with `Get-FileHash path/to/selfiemagic.apk -Algorithm SHA256`.
3. Start an API 29 or newer emulator, or connect an Android 10 or newer phone.
4. Run `adb shell getprop ro.product.model` to get the device model.
5. Run `adb shell getprop ro.build.version.sdk` to get the API level.
6. Install the APK with `adb install -r path/to/selfiemagic.apk`.
7. Open the app and allow camera, microphone, location, and media access.
8. Record a video and check that it appears on the dashboard.
9. Restart the app and check that the video is still there.
10. Turn off the internet, record another video, and check that it stays pending.
11. Turn the internet back on and check that the video uploads and changes to uploaded.
12. Check the S3 object key and file size, then add the results to this file.

## Checks

On 20 June 2026, the APK package was checked with the Android SDK tools. `aapt dump badging` confirmed the package name, app version, minimum API 24, and target API 36.

The preview APK was later installed on a physical Google Pixel 7 Pro running Android 14 (API 34). Installation and launch passed, and the app worked as expected. This confirms that the standalone APK runs on an Android version newer than the required Android 10/API 29 minimum.

The development/debug APK was built after the SecureStore and MP4 metadata changes. `aapt` confirmed its package details and `android:debuggable=true`. It has not yet been installed on the Pixel 7 Pro, so this file does not claim a runtime result for that newer binary.
