  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";
  import {getFirestore } from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";



  const firebaseConfig = {
    apiKey: "AIzaSyDRAXSZNc1WtyILldwPLX97Pm9jfGDNPPg",
    authDomain: "beepark-42a9b.firebaseapp.com",
    projectId: "beepark-42a9b",
    storageBucket: "beepark-42a9b.firebasestorage.app",
    messagingSenderId: "528130557502",
    appId: "1:528130557502:web:2b1bcefe75903d6a2ab36f"
  };

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app)

  export {app, auth, db}