import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, onValue, set, push, update, remove, Database } from "firebase/database";
import { getAuth, signInAnonymously, Auth } from "firebase/auth";

// Firebase config (can be replaced by user's actual keys)
const firebaseConfig = {
  apiKey: "AIzaSyFakeKeyPlaceholder123456789",
  authDomain: "aruvi-play.firebaseapp.com",
  databaseURL: "https://aruvi-play-default-rtdb.firebaseio.com",
  projectId: "aruvi-play",
  storageBucket: "aruvi-play.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

let app;
let auth: Auth | null = null;
let database: Database | null = null;
let useMock = false;

// Check if we are using placeholder keys to prevent network hangs and slowness
const isPlaceholder = firebaseConfig.apiKey.includes("FakeKey") || firebaseConfig.apiKey.startsWith("AIzaSyFake");

if (isPlaceholder) {
  console.log("Firebase placeholder keys detected. Operating in local simulation mode.");
  useMock = true;
} else {
  try {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    database = getDatabase(app);
  } catch (error) {
    console.warn("Firebase failed to initialize. Falling back to local simulation mode.", error);
    useMock = true;
  }
}

// Generate a random 6-character alphanumeric room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export { auth, database, useMock };
