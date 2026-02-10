// js/config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- PASTE YOUR FIREBASE CONFIG HERE ---
const firebaseConfig = {
    apiKey: "AIzaSyDLCb7FqinRcwfATQaceH5FNdh9Fq7cQNU",
    authDomain: "alumni-website-mathematix.firebaseapp.com",
    projectId: "alumni-website-mathematix",
    storageBucket: "alumni-website-mathematix.firebasestorage.app",
    messagingSenderId: "1048772376154",
    appId: "1:1048772376154:web:fbaca6260c4b1128b88a63",
    measurementId: "G-P8FWPM3BCY"
};

// Initialize and Export
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
