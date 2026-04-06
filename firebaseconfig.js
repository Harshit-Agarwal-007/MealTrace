// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBPDlItM8Mj74F5Sqahy9eaBt-SBYVQbVE",
  authDomain: "mealtrace-digital.firebaseapp.com",
  projectId: "mealtrace-digital",
  storageBucket: "mealtrace-digital.firebasestorage.app",
  messagingSenderId: "591108153859",
  appId: "1:591108153859:web:58c60d6c20cb3d93466436",
  measurementId: "G-5NF72FG9RH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

