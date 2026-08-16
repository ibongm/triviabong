# Package TriviaBong as an Android APK (Capacitor)

## Context

TriviaBong today is a client-only React/Vite SPA deployed as a static site to Vercel, with Firebase for auth/Firestore. The goal is a native Android app: sideload an APK for personal testing now, publish to the Play Store later. The chosen approach is **Capacitor**, which wraps the existing built web app (`dist/`) in a native Android WebView shell — this reuses essentially all existing React/Firebase code unchanged, rather than a rewrite.

Two things in the current code need real changes to work correctly on Android (confirmed by reading the source, not hypothetical):

1. **Google Sign-In uses `signInWithPopup`** in two places (`src/services/firebase.js:57-61`, `src/components/AuthModal.jsx:70-87`). Popups don't work in an Android WebView — Google blocks OAuth in embedded user agents. Fix: native Google Sign-In via a Capacitor plugin, bridged into the existing `firebase/auth` session so the rest of the app (Firestore, `onAuthStateChanged`, stats sync) needs no further changes.
2. **`AdminPanel.jsx` calls `fetch('/api/questions', ...)` with a relative URL** (3 call sites, lines 127/207/234). On the web this resolves against the Vercel origin; inside the Capacitor WebView the origin is `https://localhost`, so these calls would 404. Needs an `API_BASE` constant that points at the real deployed origin when running natively.

Everything else (Firestore rules, bundled question JSON, leaderboard logic, leveling) needs no Android-specific change — it's all normal HTTPS calls or local assets that behave the same inside a WebView as inside a desktop browser.

Distribution is staged: **sideload (debug APK) first**, **Play Store later**. The application ID and asset pipeline should be chosen now with the Play Store step in mind (application ID is immutable once published), even though signing/publishing work itself is deferred.

## Decisions locked in

| Decision | Value |
|---|---|
| Packaging | Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/android`) |
| Application ID | `com.triviabong.app` — pick now, cannot change after Play publish |
| App name | `TriviaBong` |
| webDir | `dist` (matches existing `vite build` output, no `vite.config.js` change needed) |
| Google Sign-In plugin | `@capacitor-firebase/authentication` (native account picker, bridges into existing `firebase/auth` JS SDK via `signInWithCredential`) |
| Distribution now | Sideload debug APK (`adb install`), no signing/keystore needed |
| Distribution later | Play Store — release keystore, AAB via `bundleRelease`, Play Console listing (deferred, not executed in this pass) |
| Android tooling | Not installed yet — install Android Studio (bundles a compatible JDK) only when ready to actually build |

## Implementation steps

### 1. Add Capacitor to the project
```
npm install @capacitor/core @capacitor-firebase/authentication
npm install -D @capacitor/cli @capacitor/android @capacitor/assets
npx cap init "TriviaBong" "com.triviabong.app" --web-dir dist
```
Generates `capacitor.config.ts` — set `server: { androidScheme: 'https' }` explicitly (Capacitor's default, worth pinning: means the WebView serves from `https://localhost`, which is why Vite's default `base: '/'` needs no change — `dist/index.html`'s absolute asset paths resolve correctly against Capacitor's asset loader).

Build/sync order, every time:
```
npm run build            # vite build -> dist/
npx cap add android       # one-time
npx cap sync android      # after every build or plugin change
```
`android/` gets committed to git (Capacitor convention — it's source, not a build artifact); its own `.gitignore` (from the template) excludes `android/app/build/` and `android/.gradle/`.

### 2. Native Google Sign-In

**Firebase/Google console prerequisites** (one-time):
- Firebase console → project `triviabong-web` → Add app → Android, package name `com.triviabong.app`.
- Get the debug keystore's SHA-1: `cd android && gradlew.bat signingReport` (or `keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android`), add it to the Firebase Android app config.
- Download `google-services.json` into `android/app/google-services.json`.
- Add the Google Services Gradle plugin manually (not handled by `cap sync`): classpath in `android/build.gradle`, `apply plugin` in `android/app/build.gradle` — follow `@capacitor-firebase/authentication`'s Android setup doc for exact syntax at implementation time.

**Code changes:**

`src/services/firebase.js` — branch `loginWithGoogle` on `Capacitor.isNativePlatform()`:
```js
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { signInWithCredential } from 'firebase/auth'; // add to existing import block

export const loginWithGoogle = async () => {
    let user;
    if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        const credential = GoogleAuthProvider.credential(result.credential?.idToken);
        user = (await signInWithCredential(auth, credential)).user;
    } else {
        user = (await signInWithPopup(auth, googleProvider)).user;
    }
    await syncUserProfile(user);
    return user;
};
```
The native call authenticates the native-layer SDK; `signInWithCredential` on the existing JS `auth` instance is what keeps `onAuthStateChanged`/Firestore/every other call site working unmodified.

`src/components/AuthModal.jsx` — `handleGoogleLogin` currently duplicates the popup call instead of using `loginWithGoogle`. Refactor it to just call `loginWithGoogle()` from `firebase.js` (also removes a redundant duplicate `syncUserProfile` call):
```js
const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
        const user = await loginWithGoogle();
        if (onSuccess) onSuccess(user);
        if (onClose) onClose();
    } catch (err) {
        console.error("Google Auth Error:", err);
        setErrorMsg(getAuthErrorMessage(err, { isGoogle: true }));
    } finally {
        setLoading(false);
    }
};
```
Note: native cancel/error codes differ from `signInWithPopup`'s (`auth/popup-closed-by-user` etc. won't fire natively) — `getAuthErrorMessage`'s Google branch will fall through to the generic error message on native cancel. Cosmetic only; observe real device error codes during testing and refine if worth it.

### 3. Fix the admin panel's relative API URL
`AdminPanel.jsx` lines 127/207/234 call `fetch('/api/questions', ...)`. Add an `API_BASE` constant — empty string on web (preserves current relative-path behavior on Vercel/previews), the real deployed origin when `Capacitor.isNativePlatform()` — and use `` fetch(`${API_BASE}/api/questions`, {...}) `` at all three sites. Only matters if the Android app needs the in-app admin question-upload flow; the rest of the admin panel is pure Firestore and already fine.

### 4. App icons / splash screen
No launcher-sized art exists yet (`public/` only has `favicon.svg`/`icons.svg`). Need a source icon ≥1024×1024 (and optionally a splash ≥2732×2732) at `resources/icon.png` / `resources/splash.png`, then:
```
npx capacitor-assets generate --android
npx cap sync android
```
This writes `android/app/src/main/res/mipmap-*/ic_launcher*` and splash drawable/style entries. A placeholder (e.g. a high-res rasterization of the existing favicon) is fine for sideload testing; a real icon should land before any Play Store submission.

### 5. Android environment setup (one-time, do only when ready to build)
Install Android Studio (bundles a compatible JDK — no separate JDK needed) — its setup wizard installs the SDK platform, build tools, and platform-tools (`adb`). Set `ANDROID_HOME` so the Capacitor CLI/Gradle work from a plain terminal. For a physical device: enable Developer Options + USB debugging; or create an emulator via Android Studio's Device Manager.

### 6. Build & sideload
```
npm run build
npx cap sync android
cd android
gradlew.bat assembleDebug
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```
Debug builds are auto-signed by Gradle's built-in debug config — no keystore setup needed for this path. Equivalent via Android Studio: **Build → Build APK(s)**, or **Run ▶** to build+install+launch in one step.

### 7. Play Store path (later, not executed now)
Release keystore (`keytool -genkeypair ...`, stored outside the repo, referenced via a gitignored `android/keystore.properties`), signing config in `android/app/build.gradle`, `gradlew.bat bundleRelease` → `.aab` (Play requires AAB not APK), manual `versionCode`/`versionName` bumps in `build.gradle` (not synced from `package.json`). **Register the release keystore's SHA-1 in Firebase**, and after the first Play Console upload, **also register Play App Signing's own re-signing certificate SHA-1** — missing either is the most common cause of native sign-in breaking in production while debug builds keep working. Play Console also needs a Data Safety form (the app collects email + auth identity + gameplay stats), content rating, and a privacy policy URL before publishing.

## Verification

1. After `cap sync`, sanity-check `android/app/src/main/assets/public/index.html` for correct absolute asset paths.
2. `npx cap run android` (or Android Studio Run ▶) — watch `adb logcat`/Logcat for JS console errors forwarded from the WebView.
3. Manual golden-path walkthrough on-device: lobby → category → leaderboard → play through questions → joker → game-over/victory → save score → stats modal → back to lobby.
4. **Native Google Sign-In, tested explicitly**: confirm the native account picker appears (not a popup/webview overlay — if one does, the platform branch or plugin registration is wrong), completes sign-in, `onAuthStateChanged` fires app-wide, and the session survives an app kill/relaunch. Also deliberately cancel once to see what error message actually surfaces.
5. If the `API_BASE` fix is done: sign in as the admin account, open Admin, confirm a question add/edit/delete actually reaches `api/questions.js` instead of failing against `https://localhost`.

**Scope of existing E2E scripts**: `run-triviabong`'s `golden-path.mjs`/`cross-device-sync-check.mjs` drive Playwright against a browser (dev server or deployed URL) — they cannot drive an installed Capacitor Android WebView. They remain useful for confirming the *web* path (unchanged `signInWithPopup` flow, shared game/Firestore logic) doesn't regress from the `Capacitor.isNativePlatform()` branching, but a green run says nothing about whether the APK itself works. That's exclusively verified by steps 2-5 above, done manually on-device or emulator.

## Known risks

- **SHA-1 fingerprint mismatches** are the single most common native-auth failure (`DEVELOPER_ERROR`/error code 10). This project will register three separately over its lifecycle: debug keystore (now), release keystore (Play upload), and Play App Signing's re-signing cert (after first upload) — missing any one breaks sign-in for that build variant only, which is confusing if not anticipated.
- **`google-services.json` and the Google Services Gradle plugin are manual edits**, not managed by `cap sync` — a stale file after a package-name or SHA-1 change is a second common failure source.
- **No Android back-button handling** — `App.jsx`'s state machine has no router; the hardware back button needs an explicit `@capacitor/app` `backButton` listener (e.g. route to lobby / close modals) or it'll fall through to Android's default (likely exiting the app mid-game). Out of scope for sideload testing, but should be addressed before Play Store submission — Play review expects native-feeling back-button behavior.
- **Icon/splash source art doesn't exist yet** — a content dependency that blocks `capacitor-assets generate` until supplied.
