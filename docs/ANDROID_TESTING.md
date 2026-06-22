# Android APK Test Record

The standalone preview APK was installed and tested on an Android 10 or newer device. It worked as expected on a Google Pixel 7 Pro running Android 14. A newer development/debug APK has also been built and checked with Android SDK tools. Its device test is still pending.

## Steps for the device test

1. Start the backend server by going to this link - https://selfiemagic.onrender.com/. Wait for a few minutes till it shows "{"error":"Not found"}".
4. Download the APK from the provided Google Drive link.
5. Install the APK on any android device.
6. In the project root directory run - `npx expo start --dev-client`. Expo development server, Metro.
7. Open the app. Login with these credentials - 
   `Email - test@gmail.com`
   `Password - 123456`
8. Allow camera, microphone, location, and media access.
9. Record a video and check that it appears on the dashboard with current status.
10. Restart the app and check that the video is still there.
11. Turn off the internet, record another video, and check that it stays pending.
12. Turn the internet back on and check that the video uploads and changes to uploaded.

## Checks

The APK package was checked with the Android SDK tools.

The APK was later installed on a physical Google Pixel 7 Pro running Android 14 (API 34). Installation and launch passed, and the app worked as expected. This confirms that the standalone APK runs on an Android version newer than the required Android 10/API 29 minimum.
