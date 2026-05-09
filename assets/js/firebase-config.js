import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCCOC2CKdPaoxP-k3z5Tto9gtKCaFUn8Ko",
  authDomain: "beeparking-a33a4.firebaseapp.com",
  projectId: "beeparking-a33a4",
  storageBucket: "beeparking-a33a4.firebasestorage.app",
  messagingSenderId: "577983473721",
  appId: "1:577983473721:web:5df7348b8545b3361a05e8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
