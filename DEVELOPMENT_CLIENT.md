# Building a Development Client (EAS) — Step-by-step (PowerShell)

This guide walks you through building an Expo Development Client with EAS so you can test native features (including Android push tokens) that are not available in Expo Go.

Follow these steps from your project root (PowerShell on Windows).

---

## 0. Quick checklist (do this first)
- Commit your work or stash it to avoid accidental loss:

Run in PowerShell:

    git status
    git add -A
    git commit -m "chore: checkpoint before building dev client"

- Back up any credentials you own locally (keystore, `google-services.json`, `GoogleService-Info.plist`) to a safe place.

---

## 1. Install / log in to EAS CLI

If you don’t have EAS CLI installed, use npx (no global install required):

PowerShell examples:

    # One-off invocation (recommended)
    npx eas-cli login

    # Or install globally (optional)
    npm install -g eas-cli
    # then
    # eas login

Follow the interactive prompt to sign into your Expo account.

---

## 2. Prepare project configuration

You already have an `eas.json` profile in this repo. Confirm it exists and contains a `development` profile with `developmentClient: true`.

If you changed the profile, commit `eas.json`:

    git add eas.json
    git commit -m "chore: add eas.json development profile"

---

## 3. Firebase / FCM setup (Android push)

You must configure Firebase Cloud Messaging (FCM) so Android builds can receive push notifications.

1. Go to https://console.firebase.google.com and create (or use) your project.
2. Add an Android app to the Firebase project with your app's applicationId (package name). If you don't know it, check `app.json`/`app.config.js` or `android.package` in `app.json`.
3. Download the generated `google-services.json`.
4. Keep that file safe locally — you can upload it to EAS during build. You do NOT need to check it into the repo (and you probably shouldn't).

EAS will ask to upload `google-services.json` during the build flow, or you can manage credentials via the Expo dashboard / `eas credentials`.

---

## 4. Build development client (Android APK)

This creates a development build that can be installed on a device and supports native modules and push tokens.

PowerShell:

    # Build Android dev-client (remote build)
    npx eas build --platform android --profile development

Notes:
- EAS will prompt to manage credentials (keystore) and may ask to upload your `google-services.json` (FCM). Let it manage things automatically if you prefer.
- The build runs on Expo's build servers and produces an APK URL when finished. It can take several minutes.

Local build option (if you have native toolchain):

    # Local build (requires Android SDK / Java / Gradle)
    npx eas build --platform android --profile development --local

---

## 5. Install the APK to your Android device/emulator

When the build finishes you'll get a download URL from the EAS web UI. Or you can download the artifact locally and install via adb:

    # Example (replace path\to\app.apk with actual file path)
    adb install -r path\to\app.apk

If you built remotely, open the build page URL and scan the QR code from your phone or download the artifact and install.

---

## 6. Run the dev server and open the app

1. Start Metro in your project:

    npx expo start --tunnel

2. Open the Expo Development Client on your device and scan the QR shown in the terminal or EAS build page. The dev client will load your JS bundle from your dev server.

---

## 7. Verify push token retrieval in-app

In your app code (you likely already have this), use Expo Notifications API to get a push token.

Example (JS/TS snippet):

```ts
import * as Notifications from 'expo-notifications';

async function getPushToken() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Push permissions not granted');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync();
    console.log('expo push token', token);
    return token;
  } catch (err) {
    console.error('Failed to get push token', err);
    return null;
  }
}
```

Run that code in the installed dev client and verify you get a token printed. If you receive a token, remote push notification support is available.

If the call fails with an error referencing Expo Go or permission denied, double-check you are running the development client (not Expo Go) and that FCM credentials were uploaded to EAS.

---

## 8. Send a test push

Use Expo's push API or your server with the token returned above. If you're using the Expo push service (classic), you'll send to the Expo token format. If you're using another service, follow the appropriate server-side instructions.

---

## 9. Common pitfalls & tips

- If you uninstall the app and reinstall, local app storage (AsyncStorage) will be cleared for that package name. Back up or sync important local state before uninstalling.
- If EAS asks about credentials and you choose to let it manage them, the keystore will be stored by Expo — still keep a local backup if possible.
- For production builds, use proper keystore management and follow steps to configure push credentials in Firebase.
- If your organization restricts network access, ensure the device and your dev machine are on the same network for local bundling (or use the `--tunnel` option).

---

## 10. Optional: upload FCM manually before building

You can upload `google-services.json` via the Expo dashboard or during the `eas build` interactive flow. Alternatively use `eas credentials`:

    npx eas credentials
    # follow prompts to upload Android FCM `google-services.json`

---

If you want, I can also:
- Add a small script that commits your current branch and prompts you to continue with `eas build`.
- Walk through your `eas build` output and help interpret errors if the build fails.

---

References
- Expo docs: https://docs.expo.dev/eas/
- Notifications & FCM: https://docs.expo.dev/push-notifications/using-fcm/
