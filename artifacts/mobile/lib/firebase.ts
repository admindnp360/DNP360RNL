import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDc-IHNbnlOA4rlDZVdCXn8ZaXuGwm2S5E',
  authDomain: 'admin-dnp360.firebaseapp.com',
  projectId: 'admin-dnp360',
  storageBucket: 'admin-dnp360.firebasestorage.app',
  messagingSenderId: '150388145428',
  appId: '1:150388145428:web:940eaeda3e16bf3be21601',
  measurementId: 'G-QW41Z0MY33',
};

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApp();

function buildAuth() {
  if (!isNew) return getAuth(app);
  try {
    if (Platform.OS !== 'web') {
      const { getReactNativePersistence } = require('firebase/auth') as typeof import('firebase/auth') & { getReactNativePersistence?: (s: any) => any };
      if (getReactNativePersistence) {
        return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
      }
    }
  } catch {}
  return getAuth(app);
}

function buildFirestore() {
  try {
    if (Platform.OS === 'web') {
      return initializeFirestore(app, {
        localCache: persistentLocalCache(),
      });
    }
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const firebaseAuth = buildAuth();
export const db = buildFirestore();
export default app;
