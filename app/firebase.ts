import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyATyNA6MI5y12_534jsMe5CYx0ySHDkP8I",
  authDomain: "je-esports-b48c0.firebaseapp.com",
  projectId: "je-esports-b48c0",
  storageBucket: "je-esports-b48c0.firebasestorage.app",
  messagingSenderId: "1072139571260",
  appId: "1:1072139571260:web:9bebdb61b99b2487beb339",
  measurementId: "G-TJ278DL196",
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
});
export const storage = getStorage(app);