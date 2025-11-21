import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyAaTaGHJVq9ouy-9TbkeJ7xQ-f5GCh6u4g",
  authDomain: "penpad-d7362.firebaseapp.com",
  projectId: "penpad-d7362",
  storageBucket: "penpad-d7362.appspot.com",
  messagingSenderId: "923363544696",
  appId: "1:923363544696:android:e7ebbe8d46a484719da78d",
  
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
<<<<<<< HEAD

// Initialize React Native Auth with AsyncStorage persistence so the
// user's session survives app restarts. This prevents showing the login
// screen every time the app opens.
let authInstance;
// Some environments (or older firebase SDK installs) may not include the
// `firebase/auth/react-native` entrypoint. Use a runtime require and
// gracefully fall back to `getAuth` when it's unavailable.
try {
  // require at runtime so the bundler doesn't fail if module is missing
  // eslint-disable-next-line global-require
  const rnAuth = require('firebase/auth/react-native');
  const { initializeAuth, getReactNativePersistence } = rnAuth;
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If runtime require fails, fall back to the default web/node auth instance.
  // This means persistence will use the default behavior for this platform.
  authInstance = getAuth(app);
}

export const auth = authInstance;
=======
export const auth = getAuth(app);
>>>>>>> ffc16eb8705aa69fd0eaa4ba8d466cc6932dd1b2
export default firebaseConfig;
