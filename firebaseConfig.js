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

import { initializeAuth, getReactNativePersistence } from 'firebase/auth';

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (e) {
  // If already initialized or fails, fall back to getAuth
  authInstance = getAuth(app);
}

export const auth = authInstance;
export default firebaseConfig;
