import * as firebaseApp from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAkzofEaby0xfOxYFRwitmLm0o1SlirQZk",
  authDomain: "flutter-apply.firebaseapp.com",
  databaseURL: "https://flutter-apply-default-rtdb.firebaseio.com",
  projectId: "flutter-apply",
  storageBucket: "flutter-apply.firebasestorage.app",
  messagingSenderId: "226410919520",
  appId: "1:226410919520:web:b9c26cf5a94d8ea7347505",
  measurementId: "G-RQ8V3DNTES"
};


// Simple check to see if the user has replaced the placeholders
export const isConfigValid = !firebaseConfig.apiKey.includes("YOUR_API_KEY");

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getFirestore(app);