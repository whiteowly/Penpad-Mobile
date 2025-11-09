import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAaTaGHJVq9ouy-9TbkeJ7xQ-f5GCh6u4g",
  authDomain: "penpad-d7362.firebaseapp.com",
  projectId: "penpad-d7362",
  storageBucket: "penpad-d7362.firebasestorage.app",
  messagingSenderId: "923363544696",
  appId: "1:923363544696:android:e7ebbe8d46a484719da78d"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);   