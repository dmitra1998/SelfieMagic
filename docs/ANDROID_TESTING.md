# Android APK Test Record

The APK was installed and tested on an Android 10 or newer device. It worked as expected on a Google Pixel 7 Pro running Android 14. A newer development/debug APK has also been built and checked with Android SDK tools.

## Steps for the device test

1. Start the backend server by going to this link - https://selfiemagic.onrender.com/health. Wait for a few minutes till it shows "{"ok":true}". It indicates that the server is running.
2. Download the APK from this Google Drive link - https://drive.google.com/file/d/18feEvx93yrkTZlyEJP7CuE3Rxod3mJNq/view?usp=drive_link.
3. Install the APK on any android device.
4. In the project root directory run - `npx expo start --dev-client` to check the logs. PC and phone are on the same Wi-Fi.
5. Open the app. Login with these credentials - 
   `Email - test@gmail.com`
   `Password - 123456`
6. Allow camera, microphone, location, and media access.
7. Record a video and check that it appears on the dashboard with current status.
8. Restart the app and check that the video is still there.
9. Turn off the internet, record another video, and check that it stays pending.
10. Turn the internet back on and check that the video uploads and changes to uploaded.

## Checks

The APK package was checked with the Android SDK tools.

The APK was later installed on a physical Google Pixel 7 Pro running Android 14 (API 34). Installation and launch passed, and the app worked as expected. This confirms that the standalone APK runs on an Android version newer than the required Android 10/API 29 minimum.
