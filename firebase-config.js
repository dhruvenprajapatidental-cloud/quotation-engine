/* ============================================================
   FIREBASE CONFIG — Fill in your Firebase project details
   Instructions:
   1. Go to https://console.firebase.google.com
   2. Create a project → Add Web App → Copy config below
   3. In Firebase console: Firestore Database → Create → Start in test mode
   4. Use the SAME Company PIN on all devices to sync data
   ============================================================ */

window.FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
<script type="module">
  // Import the functions you need from the SDKs you need
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
  // TODO: Add SDKs for Firebase products that you want to use
  // https://firebase.google.com/docs/web/setup#available-libraries

  // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyATTeTGS1YalV7-xpdU9v4f2F3GkWbf_80",
    authDomain: "mayuri-enteprise.firebaseapp.com",
    databaseURL: "https://mayuri-enteprise-default-rtdb.firebaseio.com",
    projectId: "mayuri-enteprise",
    storageBucket: "mayuri-enteprise.firebasestorage.app",
    messagingSenderId: "952941571994",
    appId: "1:952941571994:web:b4dcdd8a909e64895e9423"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
</script>
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

/*
  Firestore Security Rules (paste in Firebase Console → Firestore → Rules):

  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if true;
      }
    }
  }
*/
