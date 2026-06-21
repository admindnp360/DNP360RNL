import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (identifier: string, password: string, method?: 'email' | 'mobile') => Promise<boolean>;
  loginWithCode: (secretCode: string) => Promise<boolean>;
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

const AuthContext = createContext<AuthContextType | null>(null);

function uid() {
  return 'U' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

async function getPasswordOverrides(): Promise<Record<string, string>> {
  try {
    const stored = await AsyncStorage.getItem('dnp360_password_overrides');
    return stored ? JSON.parse(stored) : {};
  } catch { return {}; }
}

async function savePasswordOverride(email: string, password: string): Promise<void> {
  const overrides = await getPasswordOverrides();
  overrides[email.toLowerCase()] = password;
  await AsyncStorage.setItem('dnp360_password_overrides', JSON.stringify(overrides));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadStoredUser(); }, []);

  async function getRegisteredUsers(): Promise<(User & { password: string })[]> {
    try {
      const stored = await AsyncStorage.getItem('dnp360_registered_users');
      return stored ? JSON.parse(stored) : [];
    } catch { return []; }
  }

  async function saveRegisteredUsers(users: (User & { password: string })[]) {
    await AsyncStorage.setItem('dnp360_registered_users', JSON.stringify(users));
  }

  async function loadStoredUser() {
    try {
      const stored = await AsyncStorage.getItem('dnp360_user');
      if (stored) setUser(JSON.parse(stored));
    } catch {} finally { setIsLoading(false); }
  }

  async function login(identifier: string, password: string, method: 'email' | 'mobile' = 'email'): Promise<boolean> {
    const overrides = await getPasswordOverrides();
    const allUsers = [...DEMO_USERS, ...(await getRegisteredUsers())];
    const found = allUsers.find(u =>
      method === 'email'
        ? u.email.toLowerCase() === identifier.toLowerCase()
        : u.mobile === identifier
    );
    if (!found) return false;
    if (found.isActive === false) return false;

    const effectivePassword = overrides[found.email.toLowerCase()] ?? found.password;
    if (effectivePassword !== password) return false;

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
      const stored = await AsyncStorage.getItem('dnp360_secretKeys');
      if (stored) {
        const keys: Array<{ id: string; code: string; role: string; isActive: boolean; usedBy?: string }> = JSON.parse(stored);
        const matched = keys.find(k => k.code.toUpperCase() === code && k.isActive);
        if (matched) {
          if (matched.usedBy) {
            const allUsers = [...DEMO_USERS, ...(await getRegisteredUsers())];
            const found = allUsers.find(u => u.id === matched.usedBy);
            if (found) {
              const { password: _, ...userData } = found;
              setUser(userData);
              await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
              return true;
            }
          }
          const demoForRole = DEMO_USERS.find(u => u.role === matched.role);
          if (demoForRole) {
            const { password: _, ...userData } = demoForRole;
            setUser(userData);
            await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
            return true;
          }
        }
      }
    } catch {}

    return false;
  }

  async function register(name: string, email: string, mobile: string, password: string, address?: string): Promise<{ success: boolean; error?: string }> {
    const allUsers = [...DEMO_USERS, ...(await getRegisteredUsers())];
    const emailExists = allUsers.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) return { success: false, error: 'This email is already registered.' };
    const mobileExists = allUsers.some(u => u.mobile === mobile);
    if (mobileExists) return { success: false, error: 'This mobile number is already registered.' };

    const newUser: User & { password: string } = {
      id: uid(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      role: 'citizen',
      address: address?.trim(),
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      password,
    };

    const registered = await getRegisteredUsers();
    await saveRegisteredUsers([...registered, newUser]);

    const { password: _, ...userData } = newUser;
    setUser(userData);
    await AsyncStorage.setItem('dnp360_user', JSON.stringify(userData));
    return { success: true };
  }

  async function logout() {
    setUser(null);
    await AsyncStorage.removeItem('dnp360_user');
  }

  async function updateProfile(updates: Partial<User>) {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem('dnp360_user', JSON.stringify(updated));
  }

  async function resetUserPassword(email: string, newPassword: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const allUsers = [...DEMO_USERS, ...(await getRegisteredUsers())];
    const found = allUsers.find(u => u.email.toLowerCase() === normalizedEmail);
    if (!found) return false;
    await savePasswordOverride(normalizedEmail, newPassword);
    const registered = await getRegisteredUsers();
    const updatedRegistered = registered.map(u =>
      u.email.toLowerCase() === normalizedEmail ? { ...u, password: newPassword } : u
    );
    await saveRegisteredUsers(updatedRegistered);
    return true;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, loginWithCode, register, logout, updateProfile, resetUserPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
