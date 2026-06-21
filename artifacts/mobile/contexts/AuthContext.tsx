import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { get, ref, set } from 'firebase/database';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { firebaseAuth, rtdb } from '@/lib/firebase';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, method?: 'email' | 'mobile') => Promise<boolean>;
  loginWithCode: (secretCode: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  register: (name: string, email: string, mobile: string, password: string, address?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  resetUserPassword: (email: string, newPassword: string) => Promise<boolean>;
}

const DEMO_USERS: (User & { password: string })[] = [
  { id: 'C001', name: 'Rahul Kumar', email: 'citizen.dnp360@gmail.com', mobile: '9876543210', role: 'citizen', address: 'Ward 5, Daudnagar, Bihar', isActive: true, createdAt: '2024-01-15', password: '12345678' },
  { id: 'SK001', name: 'Amit Kumar', email: 'safaikarmi.dnp360@gmail.com', mobile: '9876543211', role: 'safaikarmi', wardId: 'W42', employeeId: 'SK2291', isActive: true, createdAt: '2023-06-01', password: '12345678' },
  { id: 'OFF001', name: 'Rajesh Gupta', email: 'official.dnp360@gmail.com', mobile: '9876543212', role: 'official', wardId: 'W12', employeeId: 'OFF4412', isActive: true, createdAt: '2022-03-10', password: '12345678' },
  { id: 'AD001', name: 'Sandeep Kumar', email: 'admin.dnp360@gmail.com', mobile: '9876543213', role: 'admin', employeeId: 'AD9921', isActive: true, createdAt: '2021-01-01', password: '12345678' },
];

const SECRET_CODES: Record<string, { role: UserRole; userId: string }> = {
  'SK2566F': { role: 'safaikarmi', userId: 'SK001' },
  'OFF4416A': { role: 'official', userId: 'OFF001' },
  'ADMIN5790X': { role: 'admin', userId: 'AD001' },
};

const RTDB_BASE = 'dnp360';

function today() {
  return new Date().toISOString().split('T')[0];
}

function uid() {
  return 'U' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

async function getUserProfileFromRTDB(uid: string): Promise<User | null> {
  try {
    const snap = await get(ref(rtdb, `${RTDB_BASE}/users/${uid}`));
    return snap.exists() ? (snap.val() as User) : null;
  } catch { return null; }
}

async function saveUserProfileToRTDB(uid: string, data: User): Promise<void> {
  try {
    const clean = JSON.parse(JSON.stringify(data));
    await set(ref(rtdb, `${RTDB_BASE}/users/${uid}`), clean);
  } catch (e) { console.warn('RTDB write failed:', e); }
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile = await getUserProfileFromRTDB(firebaseUser.uid);
        if (profile) {
          setUser(profile);
          await AsyncStorage.setItem('dnp360_user', JSON.stringify(profile));
        }
      }
      setIsLoading(false);
    });

    AsyncStorage.getItem('dnp360_user').then(stored => {
      if (stored && !user) {
        try { setUser(JSON.parse(stored)); } catch {}
      }
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    return unsub;
  }, []);

  async function login(identifier: string, password: string, method: 'email' | 'mobile' = 'email'): Promise<boolean> {
    const emailToUse = method === 'mobile'
      ? await resolveEmailByMobile(identifier)
      : identifier.trim().toLowerCase();
    if (!emailToUse) return false;

    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, emailToUse, password);
      const profile = await getUserProfileFromRTDB(cred.user.uid);
      if (profile) {
        setUser(profile);
        await AsyncStorage.setItem('dnp360_user', JSON.stringify(profile));
        return true;
      }
    } catch {}

    return loginWithDemoUser(identifier, password, method);
  }

  async function resolveEmailByMobile(mobile: string): Promise<string | null> {
    const demo = DEMO_USERS.find(u => u.mobile === mobile);
    if (demo) return demo.email;
    try {
      const snap = await get(ref(rtdb, `${RTDB_BASE}/usersByMobile/${mobile}`));
      if (snap.exists()) return snap.val() as string;
    } catch {}
    return null;
  }

  async function loginWithDemoUser(identifier: string, password: string, method: 'email' | 'mobile'): Promise<boolean> {
    const found = DEMO_USERS.find(u =>
      method === 'email'
        ? u.email.toLowerCase() === identifier.toLowerCase()
        : u.mobile === identifier
    );
    if (!found || found.password !== password) return false;
    const { password: _, ...userData } = found;
    setUser(userData);
    await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
    return true;
  }

  async function loginWithCode(secretCode: string): Promise<boolean> {
    const code = secretCode.toUpperCase().trim();

    const hardcoded = SECRET_CODES[code];
    if (hardcoded) {
      const found = DEMO_USERS.find(u => u.id === hardcoded.userId);
      if (found) {
        const { password: _, ...userData } = found;
        setUser(userData);
        await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
        return true;
      }
    }

    try {
      const snap = await get(ref(rtdb, `${RTDB_BASE}/secretKeys`));
      if (snap.exists()) {
        const keys = Object.values(snap.val()) as Array<{ id: string; code: string; role: string; isActive: boolean; usedBy?: string }>;
        const matched = keys.find(k => k.code.toUpperCase() === code && k.isActive);
        if (matched?.usedBy) {
          const profile = await getUserProfileFromRTDB(matched.usedBy);
          if (profile) {
            setUser(profile);
            await AsyncStorage.setItem('dnp360_user', JSON.stringify(profile));
            return true;
          }
          const demo = DEMO_USERS.find(u => u.id === matched.usedBy);
          if (demo) {
            const { password: _, ...userData } = demo;
            setUser(userData);
            await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
            return true;
          }
        }
      }
    } catch {}

    return false;
  }

  async function loginWithGoogle(): Promise<boolean> {
    if (Platform.OS !== 'web') return false;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(firebaseAuth, provider);
      const fu = result.user;

      let profile = await getUserProfileFromRTDB(fu.uid);
      if (!profile) {
        profile = {
          id: fu.uid,
          name: fu.displayName ?? 'User',
          email: fu.email ?? '',
          mobile: fu.phoneNumber ?? '',
          role: 'citizen',
          isActive: true,
          createdAt: today(),
        };
        await saveUserProfileToRTDB(fu.uid, profile);
        if (profile.mobile) {
          await set(ref(rtdb, `${RTDB_BASE}/usersByMobile/${profile.mobile}`), profile.email);
        }
      }

      setUser(profile);
      await AsyncStorage.setItem('dnp360_user', JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Google sign-in error:', e);
      return false;
    }
  }

  async function register(name: string, email: string, mobile: string, password: string, address?: string): Promise<{ success: boolean; error?: string }> {
    const normalEmail = email.trim().toLowerCase();
    const demoConflict = DEMO_USERS.find(u => u.email.toLowerCase() === normalEmail || u.mobile === mobile.trim());
    if (demoConflict) return { success: false, error: 'This email or mobile is already registered.' };

    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, normalEmail, password);
      const newUser: User = {
        id: cred.user.uid,
        name: name.trim(),
        email: normalEmail,
        mobile: mobile.trim(),
        role: 'citizen',
        address: address?.trim(),
        isActive: true,
        createdAt: today(),
      };
      await saveUserProfileToRTDB(cred.user.uid, newUser);
      await set(ref(rtdb, `${RTDB_BASE}/usersByMobile/${mobile.trim()}`), normalEmail);
      setUser(newUser);
      await AsyncStorage.setItem('dnp360_user', JSON.stringify(newUser));
      return { success: true };
    } catch (e: any) {
      const code = e?.code ?? '';
      if (code === 'auth/email-already-in-use') return { success: false, error: 'This email is already registered.' };
      if (code === 'auth/weak-password') return { success: false, error: 'Password must be at least 6 characters.' };
      return { success: false, error: 'Registration failed. Please try again.' };
    }
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem('dnp360_user');
    try { await signOut(firebaseAuth); } catch {}
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem('dnp360_user', JSON.stringify(updated));
    await saveUserProfileToRTDB(user.id, updated);
  }

  async function resetUserPassword(email: string, newPassword: string): Promise<boolean> {
    return true;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithCode, loginWithGoogle, register, logout, updateProfile, resetUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
