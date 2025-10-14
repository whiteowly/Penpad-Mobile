import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { measure } from "react-native-reanimated";

const firebaseConfig = {
  apiKey: "AIzaSyAaTaGHJVq9ouy-9TbkeJ7xQ-f5GCh6u4g",
  authDomain: "penpad-d7362.firebaseapp.com",
  projectId: "penpad-d7362",
  storageBucket: "penpad-d7362.appspot.com",
  messagingSenderId: "923363544696",
  appId: "1:923363544696:android:e7ebbe8d46a484719da78d",
  
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default firebaseConfig;