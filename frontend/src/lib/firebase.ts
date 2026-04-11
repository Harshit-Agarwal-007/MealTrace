import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPDlItM8Mj74F5Sqahy9eaBt-SBYVQbVE",
  authDomain: "mealtrace-digital.firebaseapp.com",
  projectId: "mealtrace-digital",
  storageBucket: "mealtrace-digital.firebasestorage.app",
  messagingSenderId: "591108153859",
  appId: "1:591108153859:web:58c60d6c20cb3d93466436"
};

// Initialize Firebase for SSR or CSR safely
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
