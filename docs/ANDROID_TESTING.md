# Android APK Test Record

The APK has been built, installed, and tested on an Android 10 or newer device. The app installed successfully and worked as expected on a Google Pixel 7 Pro running Android 14.

## Build details

| Item | Result |
| --- | --- |
| Build profile | `preview` (`android.buildType: apk`) |
| EAS build | [90773792-a6a8-4c34-9f5d-d0931838a2d8](https://expo.dev/accounts/dmitra2/projects/SelfieMagic/builds/90773792-a6a8-4c34-9f5d-d0931838a2d8), finished on 20 June 2026 |
| Local APK | `artifacts/SelfieMagic-1.0.0-preview.apk` (102,698,848 bytes, ignored by Git) |
| SHA-256 | `EBE6B9A3F4F508713A9163E94FADF299485D624D44021C0DBEB6156D5603CCD2` |
| Package | `com.dmitra2.SelfieMagic` |
| App version | `1.0.0` (`versionCode 2`) |
| Android SDK | Minimum API 24, target and compile API 36 |

## Device test status

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

1. Build the APK with `eas build --platform android --profile preview`.
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

The APK was later installed on a physical Google Pixel 7 Pro running Android 14 (API 34). Installation and launch passed, and the app worked as expected. This confirms that the APK runs on an Android version newer than the required Android 10/API 29 minimum.
