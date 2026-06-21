import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDc-IHNbnlOA4rlDZVdCXn8ZaXuGwm2S5E',
  authDomain: 'admin-dnp360.firebaseapp.com',
  databaseURL: 'https://admin-dnp360-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'admin-dnp360',
  storageBucket: 'admin-dnp360.firebasestorage.app',
  messagingSenderId: '150388145428',
  appId: '1:150388145428:web:940eaeda3e16bf3be21601',
  measurementId: 'G-QW41Z0MY33',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(app);
export const rtdb = getDatabase(app);
export default app;
