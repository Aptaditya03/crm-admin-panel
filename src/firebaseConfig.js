import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyAR_xahfMdBIyNYF8vbH40udPCgs3rS2R0",
  authDomain: "clienthandling-1efa6.firebaseapp.com",
  databaseURL: "https://clienthandling-1efa6-default-rtdb.firebaseio.com",
  projectId: "clienthandling-1efa6",
  storageBucket: "clienthandling-1efa6.firebasestorage.app",
  messagingSenderId: "418124929105",
  appId: "1:418124929105:web:d1e498dc138b8cc2aec070",
  measurementId: "G-9RBN1S96V1"
};
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const database = getDatabase(app);
