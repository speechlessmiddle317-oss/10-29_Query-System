import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Configured from firebase-applet-config.json
const firebaseConfig = {
  projectId: "gen-lang-client-0578703073",
  appId: "1:477282281783:web:3688c925c1c9ef354b12b2",
  apiKey: "AIzaSyChv3VSbErg6Xb_PjX3wSDLw8ANWIwMbiY",
  authDomain: "gen-lang-client-0578703073.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2c8fa4df-9478-4d21-9ebb-8854f12eeb84",
  storageBucket: "gen-lang-client-0578703073.firebasestorage.app",
  messagingSenderId: "477282281783",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Use initializeFirestore with experimentalForceLongPolling to prevent WebChannel [code=unavailable] in iframe/proxy environments
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalForceLongPolling: true,
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

export const db = firestoreDb;
export const auth = getAuth(app);

// Initial connectivity check as required by Firebase specification
if (typeof window !== "undefined") {
  (async function testConnection() {
    try {
      await getDocFromServer(doc(db, "test", "connection"));
    } catch (error) {
      if (error instanceof Error && (error.message.includes("client is offline") || error.message.includes("unavailable"))) {
        console.info("[Firebase] Operating in resilient offline mode until backend connection stabilizes.");
      }
    }
  })();
}

