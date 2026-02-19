// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyClror2JnXFBjGRALVWlq2fTVcy_GnEwcw",
  authDomain: "ott-settlement.firebaseapp.com",
  projectId: "ott-settlement",
  storageBucket: "ott-settlement.firebasestorage.app",
  messagingSenderId: "173916969633",
  appId: "1:173916969633:web:3fb55a5a2663a0b19deee0",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
