// lib/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import dotenv from "dotenv";


const firebaseConfig = {
  apiKey: "AIzaSyCT_byGorv86ohnNLthb157FJ-RwymBPHE",
  authDomain: "innovationatssystem.firebaseapp.com",
  databaseURL: "https://innovationatssystem-default-rtdb.firebaseio.com",
  projectId: "innovationatssystem",
  storageBucket: "innovationatssystem.firebasestorage.app",
  messagingSenderId: "884093152341",
  appId: "1:884093152341:web:dc10f839022686baedb8dc"
};
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
