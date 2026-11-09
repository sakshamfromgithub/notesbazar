// ============================================================
//  NoteBazaar — Firebase Configuration
//  HOW TO FILL THIS (5 minutes):
//  1) Go to https://console.firebase.google.com and create a project
//  2) Project Settings (gear icon) → General → "Your apps" → Web app (</>)
//  3) Copy the config values below
//  4) Replace the values below with yours
//  5) Put YOUR login email inside ADMIN_EMAILS (you = the admin)
//
//  Full guide: see FIREBASE-SETUP.md
// ============================================================

window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyBC2CQmn6UVCGF1qhgV4-tOeNMtEr8etdo",

  authDomain: "notesbazaar-74388.firebaseapp.com",

  projectId: "notesbazaar-74388",

  storageBucket: "notesbazaar-74388.firebasestorage.app",

  messagingSenderId: "658844879296",

  appId: "1:658844879296:web:13cdbb0ff6106959cda025"

};

// ------------------------------------------------------------
// ADMIN — this is YOU.
// Register/login on the site with this EXACT email and you will
// get the Admin panel (upload notes, approve payments).
// Also put the same email inside firestore.rules and storage.rules
// where it says REPLACE_WITH_ADMIN_EMAIL.
// ------------------------------------------------------------
window.ADMIN_EMAILS = ["admin@notebazaar.in"]; // ← CHANGE THIS

// ------------------------------------------------------------
// PAYMENT — your UPI details (shown to buyers on the payment screen)
// ------------------------------------------------------------
window.UPI_ID = "Q021815184@ybl";   // money goes here
window.UPI_NAME = "NoteBazaar";     // payee name buyers will see
