import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeAuth, getReactNativePersistence } from 'firebase/auth/react-native';
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

// Initialize React Native Auth with AsyncStorage persistence so the
// user's session survives app restarts. This prevents showing the login
// screen every time the app opens.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // initializeAuth may throw if already initialized — fall back to getAuth
  authInstance = getAuth(app);
}

export const auth = authInstance;
export default firebaseConfig;