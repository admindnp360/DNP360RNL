import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { db, firebaseAuth } from '@/lib/firebase';
import type {
  Attendance, Complaint, ComplaintCategory, ComplaintStatus,
  Group, House, HouseVisit, ImportHistory, Notice, PasswordResetRequest,
  SecretKey, SupportDetails, User, Ward,
} from '@/types';

interface BulkImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: { rowNumber: number; registrationNo?: string; reason: string }[];
}

interface AppContextType {
  complaints: Complaint[];
  houses: House[];
  wards: Ward[];
  groups: Group[];
  notices: Notice[];
  attendance: Attendance[];
  houseVisits: HouseVisit[];
  users: User[];
  secretKeys: SecretKey[];
  supportDetails: SupportDetails;
  passwordResetRequests: PasswordResetRequest[];
  importHistory: ImportHistory[];
  addComplaint: (c: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
  addHouseVisit: (visit: Omit<HouseVisit, 'id'>) => Promise<void>;
  markAttendance: (workerId: string, method?: 'qr' | 'manual') => Promise<boolean>;
  addHouse: (h: Omit<House, 'id'>) => Promise<void>;
  addMultipleHouses: (houses: Omit<House, 'id'>[]) => Promise<void>;
  updateHouse: (id: string, updates: Partial<House>) => Promise<void>;
  deleteHouse: (id: string) => Promise<void>;
  bulkImportHouses: (
    rows: Omit<House, 'id'>[],
    duplicateMode: 'skip' | 'update' | 'replace',
    onProgress?: (done: number, total: number) => void
  ) => Promise<BulkImportResult>;
  assignGroupToHouses: (houseIds: string[], groupId: string, groupName: string) => Promise<void>;
  removeGroupFromHouses: (houseIds: string[]) => Promise<void>;
  addWard: (w: Omit<Ward, 'id'>) => Promise<void>;
  updateWard: (id: string, updates: Partial<Ward>) => Promise<void>;
  assignWorkerToWard: (wardId: string, workerId: string) => Promise<void>;
  addGroup: (g: Omit<Group, 'id'>) => Promise<Group>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addNotice: (n: Omit<Notice, 'id' | 'createdAt'>) => Promise<void>;
  updateNotice: (id: string, updates: Partial<Notice>) => Promise<void>;
  deleteNotice: (id: string) => Promise<void>;
  addUser: (u: User) => Promise<void>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addSecretKey: (role: SecretKey['role']) => Promise<SecretKey>;
  assignSecretKeyToUser: (userId: string, userName: string, role: SecretKey['role']) => Promise<SecretKey>;
  toggleSecretKey: (id: string) => Promise<void>;
  deleteSecretKey: (id: string) => Promise<void>;
  updateSecretKeyCode: (keyId: string, newCode: string) => Promise<void>;
  updateUserId: (oldId: string, newId: string) => Promise<void>;
  updateUserFull: (oldId: string, newId: string, updates: Partial<User>) => Promise<void>;
  updateSupportDetails: (updates: Partial<SupportDetails>) => Promise<void>;
  addPasswordResetRequest: (email: string, name: string) => Promise<void>;
  updatePasswordResetRequest: (id: string, status: 'approved' | 'rejected', adminNote?: string) => Promise<void>;
  addImportHistory: (h: Omit<ImportHistory, 'id'>) => Promise<void>;
  deleteImportHistory: (id: string) => Promise<void>;
  getHouseByRegistration: (regNum: string) => House | undefined;
  getComplaintsByUser: (userId: string) => Complaint[];
  getAttendanceByWorker: (workerId: string) => Attendance[];
  getVisitsByWorker: (workerId: string) => HouseVisit[];
  isTodayAttendanceMarked: (workerId: string) => boolean;
  syncStatus: 'synced' | 'pending' | 'error';
}

const STORAGE_VERSION = '7';

function uid() {
  return Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function nowTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

function genSecretKey(role: SecretKey['role']): string {
  const prefix = role === 'safaikarmi' ? 'SK' : 'OF';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const rand4 = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${rand4()}-${rand4()}`;
}

export function genUserId(role: string): string {
  const prefix = role === 'citizen' ? 'CT' : role === 'safaikarmi' ? 'SK' : role === 'official' ? 'OF' : 'AD';
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `${prefix}${digits}${letter}`;
}

function clean<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_k, v) => (v === undefined ? null : v)));
}

const d = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
};

const SEED_WARDS: Ward[] = [
  { id: 'W1',  wardNumber: '1',  name: 'Daudnagar Ward 1',  area: 'Station Road Area',   assignedWorkers: ['SK7291R'], totalHouses: 120, officialId: 'OF7642B' },
  { id: 'W2',  wardNumber: '2',  name: 'Daudnagar Ward 2',  area: 'Market Area',          assignedWorkers: [],          totalHouses: 98,  officialId: 'OF3815C' },
  { id: 'W3',  wardNumber: '3',  name: 'Daudnagar Ward 3',  area: 'Old Town',             assignedWorkers: [],          totalHouses: 145 },
  { id: 'W4',  wardNumber: '4',  name: 'Daudnagar Ward 4',  area: 'Civil Line',           assignedWorkers: [],          totalHouses: 87  },
  { id: 'W42', wardNumber: '42', name: 'Daudnagar Ward 42', area: 'Sector 7 High Street', assignedWorkers: ['SK1538Q'], totalHouses: 65,  officialId: 'OF7642B' },
  { id: 'W12', wardNumber: '12', name: 'Daudnagar Ward 12', area: 'Zone 4',               assignedWorkers: [],          totalHouses: 110, officialId: 'OF7642B' },
];

const SEED_GROUPS: Group[] = [
  { id: 'G001', name: 'Main Market',    wardId: 'W1',  wardNumber: '1',  description: 'Main market area of Ward 1', color: '#10B981', createdAt: d(30), createdBy: 'SA001' },
  { id: 'G002', name: 'Hospital Area',  wardId: 'W1',  wardNumber: '1',  description: 'Near district hospital',     color: '#EF4444', createdAt: d(30), createdBy: 'SA001' },
  { id: 'G003', name: 'School Area',    wardId: 'W1',  wardNumber: '1',  description: 'Near government school',     color: '#F97316', createdAt: d(28), createdBy: 'SA001' },
  { id: 'G004', name: 'Market Zone A',  wardId: 'W2',  wardNumber: '2',  description: 'Market Road Zone',           color: '#8B5CF6', createdAt: d(25), createdBy: 'SA001' },
  { id: 'G005', name: 'Sector 7 Group 1', wardId: 'W42', wardNumber: '42', description: 'Near Temple',             color: '#0EA5E9', createdAt: d(20), createdBy: 'SA001' },
  { id: 'G006', name: 'Green Park Zone', wardId: 'W12', wardNumber: '12', description: 'Green Park area',          color: '#EC4899', createdAt: d(15), createdBy: 'SA001' },
];

const SEED_HOUSES: House[] = [
  { id: 'H001', registrationNumber: 'DNPH001', ownerName: 'Ramesh Prasad',    fatherOrHusband: 'Shiv Prasad',  mobile: '9934512300', address: 'Ward 42, Near Temple, Daudnagar',  wardId: 'W42', wardNumber: '42', groupId: 'G005', groupName: 'Sector 7 Group 1', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(30) },
  { id: 'H002', registrationNumber: 'DNPH002', ownerName: 'Sunita Devi',      fatherOrHusband: 'Ram Kumar',    mobile: '9934512301', address: 'Ward 42, Main Road, Daudnagar',    wardId: 'W42', wardNumber: '42', groupId: 'G005', groupName: 'Sector 7 Group 1', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(29) },
  { id: 'H003', registrationNumber: 'DNPH003', ownerName: 'Manoj Kumar Singh', fatherOrHusband: 'Vijay Singh', mobile: '9934512302', address: 'Ward 42, Shiv Nagar, Daudnagar',  wardId: 'W42', wardNumber: '42', propertyType: 'Commercial',  status: 'Active', isActive: true, createdAt: d(28) },
  { id: 'H004', registrationNumber: 'DNPH004', ownerName: 'Geeta Kumari',     fatherOrHusband: 'Suresh Kumar', mobile: '9934512303', address: 'Ward 1, Station Road, Daudnagar', wardId: 'W1',  wardNumber: '1',  groupId: 'G001', groupName: 'Main Market',      propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(27) },
  { id: 'H005', registrationNumber: 'DNPH005', ownerName: 'Vijay Kumar',      mobile: '9934512304',            address: 'Ward 1, Near School, Daudnagar',  wardId: 'W1',  wardNumber: '1',  groupId: 'G003', groupName: 'School Area',      propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(26) },
  { id: 'H006', registrationNumber: 'DNPH006', ownerName: 'Anjali Singh',     fatherOrHusband: 'Deepak Singh', mobile: '9934512305', address: 'Ward 12, Civil Area, Daudnagar',  wardId: 'W12', wardNumber: '12', groupId: 'G006', groupName: 'Green Park Zone',  propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(25) },
  { id: 'H007', registrationNumber: 'DNPH007', ownerName: 'Pradeep Yadav',    mobile: '9934512306',            address: 'Ward 12, Green Park, Daudnagar',  wardId: 'W12', wardNumber: '12', propertyType: 'Government',  status: 'Active', isActive: true, createdAt: d(24) },
  { id: 'H008', registrationNumber: 'DNPH008', ownerName: 'Kavita Devi',      fatherOrHusband: 'Mohan Prasad', mobile: '9934512307', address: 'Ward 2, Market Road, Daudnagar',  wardId: 'W2',  wardNumber: '2',  groupId: 'G004', groupName: 'Market Zone A',    propertyType: 'Commercial',  status: 'Active', isActive: true, createdAt: d(23) },
];

const SEED_NOTICES: Notice[] = [
  { id: 'N001', title: 'Property Tax Due',           content: 'All property holders are requested to pay their annual property tax before 31st March 2025.',         type: 'notice',       priority: 'high',   createdAt: '2025-01-10', isActive: true },
  { id: 'N002', title: 'Water Supply Interruption',  content: 'Due to maintenance work, water supply will be interrupted in Ward 3, 4, and 5 on 25th January.',     type: 'alert',        priority: 'high',   createdAt: '2025-01-20', isActive: true },
  { id: 'N003', title: 'Cleanliness Drive',          content: 'Nagar Parishad Daudnagar is organizing a Swachh Bharat cleanliness drive on 26th January.',           type: 'announcement', priority: 'medium', createdAt: '2025-01-18', isActive: true },
  { id: 'N004', title: 'Ward Committee Meeting',     content: 'Monthly ward committee meeting will be held on 28th January at 11 AM in the Municipal Hall.',          type: 'notice',       priority: 'low',    createdAt: '2025-01-15', isActive: true },
];

const SEED_COMPLAINTS: Complaint[] = [
  { id: 'CPL001', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'garbage_collection', description: 'Garbage has not been collected from our street for 3 days.', location: 'Ward 5, Near Post Office, Daudnagar', status: 'submitted',   createdAt: d(2),  updatedAt: d(2),  wardId: 'W1',  wardNumber: '1'  },
  { id: 'CPL002', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'drainage',           description: 'Open drain near our house is blocked and overflowing.',        location: 'Ward 5, Ram Nagar, Daudnagar',       status: 'assigned',    createdAt: d(5),  updatedAt: d(3),  assignedTo: 'SK1538Q', assignedToName: 'Amit Kumar', wardId: 'W1', wardNumber: '1' },
  { id: 'CPL003', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'street_light',       description: 'Street light near our house is not working for a week.',        location: 'Ward 5, Main Road, Daudnagar',       status: 'resolved',    createdAt: d(15), updatedAt: d(8),  wardId: 'W1',  wardNumber: '1'  },
  { id: 'CPL004', citizenId: 'CT5629N', citizenName: 'Priya Singh',  category: 'water_supply',       description: 'No water supply for 2 days in our area.',                       location: 'Ward 12, Civil Line, Daudnagar',     status: 'in_progress', createdAt: d(1),  updatedAt: d(0),  assignedTo: 'SK1538Q', assignedToName: 'Amit Kumar', wardId: 'W12', wardNumber: '12' },
  { id: 'CPL005', citizenId: 'CT8834P', citizenName: 'Suresh Yadav', category: 'road_damage',        description: 'Large pothole on main road causing accidents.',                  location: 'Ward 3, Station Road, Daudnagar',    status: 'submitted',   createdAt: d(0),  updatedAt: d(0),  wardId: 'W3',  wardNumber: '3'  },
  { id: 'CPL006', citizenId: 'CT2017K', citizenName: 'Meena Devi',   category: 'cleanliness',        description: 'Public park is very dirty. Garbage piled up near the gate.',    location: 'Ward 2, Central Park, Daudnagar',    status: 'assigned',    createdAt: d(3),  updatedAt: d(2),  wardId: 'W2',  wardNumber: '2'  },
];

const SEED_USERS: User[] = [
  { id: 'CT4821M', name: 'Rahul Kumar',   email: 'citizen.dnp360@gmail.com',  mobile: '9876543210', role: 'citizen',    address: 'Ward 5, Daudnagar', isActive: true,  createdAt: '2024-01-15' },
  { id: 'CT5629N', name: 'Priya Singh',   email: 'priya.singh@gmail.com',     mobile: '9876543220', role: 'citizen',    isActive: true,  createdAt: '2024-02-20' },
  { id: 'CT8834P', name: 'Suresh Yadav',  email: 'suresh.yadav@gmail.com',    mobile: '9876543221', role: 'citizen',    isActive: true,  createdAt: '2024-03-10' },
  { id: 'CT2017K', name: 'Meena Devi',    email: 'meena.devi@gmail.com',      mobile: '9876543222', role: 'citizen',    isActive: true,  createdAt: '2024-04-05' },
  { id: 'SK1538Q', name: 'Amit Kumar',    email: 'sk1538q.dnp360@gmail.com',  mobile: '9876543211', role: 'safaikarmi', wardId: 'W42', employeeId: 'SK2291', isActive: true,  createdAt: '2023-06-01' },
  { id: 'SK7291R', name: 'Raju Prasad',   email: 'sk7291r.dnp360@gmail.com',  mobile: '9876543215', role: 'safaikarmi', wardId: 'W1',  employeeId: 'SK2292', isActive: true,  createdAt: '2023-07-01' },
  { id: 'SK4403S', name: 'Bholu Kumar',   email: 'sk4403s.dnp360@gmail.com',  mobile: '9876543216', role: 'safaikarmi', wardId: 'W3',  employeeId: 'SK2293', isActive: false, createdAt: '2023-08-01' },
  { id: 'OF7642B', name: 'Rajesh Gupta',  email: 'of7642b.dnp360@gmail.com',  mobile: '9876543212', role: 'official',   wardId: 'W12', employeeId: 'OF4412', isActive: true,  createdAt: '2022-03-10' },
  { id: 'OF3815C', name: 'Deepak Sinha',  email: 'of3815c.dnp360@gmail.com',  mobile: '9876543217', role: 'official',   wardId: 'W2',  employeeId: 'OF4413', isActive: true,  createdAt: '2022-05-15' },
  { id: 'AD9305X', name: 'Sandeep Kumar', email: 'ad9305x.dnp360@gmail.com',  mobile: '9876543213', role: 'admin',      employeeId: 'AD9305X', isActive: true,  createdAt: '2021-01-01' },
];

const SEED_KEYS: SecretKey[] = [
  { id: 'KEY001', code: 'SK-2566-F000', role: 'safaikarmi', isActive: true,  usedBy: 'SK1538Q', usedByName: 'Amit Kumar',   createdAt: d(30) },
  { id: 'KEY002', code: 'OF-4416-A000', role: 'official',   isActive: true,  usedBy: 'OF7642B', usedByName: 'Rajesh Gupta', createdAt: d(30) },
  { id: 'KEY003', code: 'SK-3891-B000', role: 'safaikarmi', isActive: false, createdAt: d(10) },
  { id: 'KEY004', code: 'OF-7234-C000', role: 'official',   isActive: true,  createdAt: d(5)  },
];

const DEFAULT_SUPPORT: SupportDetails = {
  phone: '06184-XXXXXX',
  email: 'support@dnp360.in',
  address: 'Municipal Office, Daudnagar, Bihar - 824143',
  hours: 'Mon–Sat, 10:00 AM – 5:00 PM',
};

function seedAttendance(): Attendance[] {
  const records: Attendance[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = d(i);
    if (new Date(date).getDay() === 0) continue;
    records.push({
      id: `ATT${i}`,
      workerId: 'SK1538Q',
      date,
      status: i === 0 ? 'present' : Math.random() > 0.15 ? 'present' : 'absent',
      checkInTime: '08:00',
      checkOutTime: '17:00',
      method: i % 3 === 0 ? 'manual' : 'qr',
    });
  }
  return records;
}

function seedHouseVisits(): HouseVisit[] {
  const visits: HouseVisit[] = [];
  const housesList = SEED_HOUSES.filter(h => h.wardId === 'W42');
  for (let i = 5; i >= 0; i--) {
    const date = d(i);
    for (const house of housesList) {
      if (Math.random() > 0.3) {
        const hr = 7 + Math.floor(Math.random() * 3);
        const min = Math.floor(Math.random() * 60);
        visits.push({
          id: `VISIT${i}${house.id}`,
          houseId: house.id,
          houseRegistrationNumber: house.registrationNumber,
          ownerName: house.ownerName,
          address: house.address,
          workerId: 'SK1538Q',
          workerName: 'Amit Kumar',
          wardId: house.wardId,
          visitDate: date,
          visitTime: `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
          collectedGarbage: Math.random() > 0.2,
          status: 'visited',
        });
      }
    }
  }
  return visits;
}

async function seedIfEmpty<T extends { id: string }>(col: string, seed: T[]): Promise<void> {
  if (seed.length === 0) return;
  try {
    const snap = await getDocs(collection(db, col));
    if (!snap.empty) return;
    const b = writeBatch(db);
    for (const item of seed) {
      const { id, ...rest } = item as any;
      b.set(doc(db, col, id), clean({ ...rest, _createdAt: serverTimestamp() }));
    }
    await b.commit();
  } catch {
    // offline — Firestore will sync when connection is restored
  }
}

async function seedDocIfEmpty<T>(col: string, docId: string, seed: T): Promise<void> {
  try {
    const snap = await getDoc(doc(db, col, docId));
    if (snap.exists()) return;
    await setDoc(doc(db, col, docId), clean({ ...(seed as any), _createdAt: serverTimestamp() }));
  } catch {
    // offline fallback
  }
}

async function fsSaveDoc<T extends { id: string }>(col: string, item: T): Promise<void> {
  try {
    const { id, ...rest } = item as any;
    await setDoc(doc(db, col, id), clean({ ...rest, _updatedAt: serverTimestamp() }));
  } catch {
    console.warn(`Firestore write failed for ${col}/${(item as any).id}`);
  }
}

async function fsUpdateDocFields(col: string, docId: string, fields: Record<string, any>): Promise<void> {
  try {
    await updateDoc(doc(db, col, docId), { ...clean(fields), _updatedAt: serverTimestamp() });
  } catch {
    console.warn(`Firestore update failed for ${col}/${docId}`);
  }
}

async function fsDeleteDoc(col: string, docId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, col, docId));
  } catch {
    console.warn(`Firestore delete failed for ${col}/${docId}`);
  }
}

async function fsUpdateSingleDoc<T>(col: string, docId: string, data: T): Promise<void> {
  try {
    await setDoc(doc(db, col, docId), clean({ ...(data as any), _updatedAt: serverTimestamp() }));
  } catch {
    console.warn(`Firestore update failed for ${col}/${docId}`);
  }
}

async function checkVersion(): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'meta', 'version'));
    if (snap.exists() && snap.data().value === STORAGE_VERSION) return;
    const cols = ['complaints', 'houses', 'wards', 'groups', 'notices', 'attendance', 'houseVisits', 'users', 'secretKeys', 'passwordResetRequests', 'importHistory'];
    for (const col of cols) {
      const colSnap = await getDocs(collection(db, col));
      if (!colSnap.empty) {
        const b = writeBatch(db);
        colSnap.docs.forEach(d => b.delete(d.ref));
        await b.commit();
      }
    }
    await setDoc(doc(db, 'meta', 'version'), { value: STORAGE_VERSION, _updatedAt: serverTimestamp() });
  } catch {
    const v = await AsyncStorage.getItem('dnp360_version').catch(() => null);
    if (v !== STORAGE_VERSION) {
      await AsyncStorage.setItem('dnp360_version', STORAGE_VERSION).catch(() => {});
    }
  }
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [houses, setHouses] = useState<House[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [houseVisits, setHouseVisits] = useState<HouseVisit[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [secretKeys, setSecretKeys] = useState<SecretKey[]>([]);
  const [supportDetails, setSupportDetails] = useState<SupportDetails>(DEFAULT_SUPPORT);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>([]);
  const [importHistory, setImportHistory] = useState<ImportHistory[]>([]);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'error'>('synced');
  const _pendingWrites = useRef(0);
  const _hadFsError = useRef(false);

  function _beginWrite() {
    _pendingWrites.current += 1;
    setSyncStatus('pending');
  }
  function _endWrite(ok: boolean) {
    _pendingWrites.current = Math.max(0, _pendingWrites.current - 1);
    if (!ok) _hadFsError.current = true;
    if (_pendingWrites.current === 0) setSyncStatus(_hadFsError.current ? 'error' : 'synced');
  }
  async function _fsWrite<T extends { id: string }>(col: string, item: T) {
    _beginWrite();
    const { id, ...rest } = item as any;
    try {
      await setDoc(doc(db, col, id), clean({ ...rest, _updatedAt: serverTimestamp() }));
      _hadFsError.current = false;
      _endWrite(true);
    } catch {
      _endWrite(false);
      console.warn(`[Sync] Write failed: ${col}/${id}`);
    }
  }
  async function _fsDelete(col: string, id: string) {
    _beginWrite();
    try {
      await deleteDoc(doc(db, col, id));
      _endWrite(true);
    } catch {
      _endWrite(false);
      console.warn(`[Sync] Delete failed: ${col}/${id}`);
    }
  }

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    let active = true;

    (async () => {
      // 0 — ensure a Firebase Auth token exists (required for Firestore writes)
      //     SUPER_ADMIN uses a local bypass, so we sign in anonymously here.
      //     Real Firebase Auth users (official, safaikarmi, citizen) will already
      //     have a valid session from AuthContext and this becomes a no-op.
      if (!firebaseAuth.currentUser) {
        try { await signInAnonymously(firebaseAuth); } catch { /* offline / disabled */ }
      }

      // 1 — version check (wipes stale data if schema changed)
      await checkVersion();

      // 2 — seed each collection once if Firestore is empty
      await Promise.all([
        seedIfEmpty('complaints',            SEED_COMPLAINTS),
        seedIfEmpty('houses',                SEED_HOUSES),
        seedIfEmpty('wards',                 SEED_WARDS),
        seedIfEmpty('groups',                SEED_GROUPS),
        seedIfEmpty('notices',               SEED_NOTICES),
        seedIfEmpty('attendance',            seedAttendance()),
        seedIfEmpty('houseVisits',           seedHouseVisits()),
        seedIfEmpty('users',                 SEED_USERS),
        seedIfEmpty('secretKeys',            SEED_KEYS),
        seedDocIfEmpty('settings', 'support', DEFAULT_SUPPORT),
      ]);

      if (!active) return;

      // 3 — real-time listeners (fire immediately with cached data, then live updates)
      //     Each listener falls back to seed data on permission-denied so the app
      //     is always functional even before Firestore rules are deployed.
      const snap2arr = <T,>(snap: any) =>
        snap.docs.map((d: any) => ({ id: d.id, ...d.data() }) as T);

      function listen<T extends { id: string }>(
        colName: string,
        setter: React.Dispatch<React.SetStateAction<T[]>>,
        fallback: T[],
      ): () => void {
        return onSnapshot(
          collection(db, colName),
          (snap) => {
            const fresh = snap2arr<T>(snap);
            setter(prev => {
              // Keep locally-added items not yet confirmed by Firestore
              const freshIds = new Set(fresh.map((d: T) => d.id));
              const localOnly = prev.filter(d => !freshIds.has(d.id));
              return localOnly.length > 0 ? [...fresh, ...localOnly] : fresh;
            });
            // Clear read-error flag when a snapshot succeeds
            _hadFsError.current = false;
            if (_pendingWrites.current === 0) setSyncStatus('synced');
          },
          (err) => {
            console.warn(`[Firestore] ${colName}: ${err.code} — keeping local state`);
            setter(prev => prev.length > 0 ? prev : fallback);
            _hadFsError.current = true;
            setSyncStatus('error');
          },
        );
      }

      unsubscribers.push(
        listen('complaints',             setComplaints,             SEED_COMPLAINTS),
        listen('houses',                 setHouses,                 SEED_HOUSES),
        listen('wards',                  setWards,                  SEED_WARDS),
        listen('groups',                 setGroups,                 SEED_GROUPS),
        listen('notices',                setNotices,                SEED_NOTICES),
        listen('attendance',             setAttendance,             seedAttendance()),
        listen('houseVisits',            setHouseVisits,            seedHouseVisits()),
        listen('users',                  setUsers,                  SEED_USERS),
        listen('secretKeys',             setSecretKeys,             SEED_KEYS),
        listen('passwordResetRequests',  setPasswordResetRequests,  []),
        listen('importHistory',          setImportHistory,          []),
        onSnapshot(
          doc(db, 'settings', 'support'),
          (s) => { if (s.exists()) setSupportDetails(s.data() as SupportDetails); },
          (_err) => setSupportDetails(DEFAULT_SUPPORT),
        ),
      );
    })();

    return () => {
      active = false;
      unsubscribers.forEach(u => u());
    };
  }, []);

  async function addComplaint(c: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = today();
    const item: Complaint = { ...c, id: uid(), createdAt: now, updatedAt: now };
    setComplaints(prev => [item, ...prev]);
    await fsSaveDoc('complaints', item);
  }

  async function updateComplaint(id: string, updates: Partial<Complaint>) {
    const updatedItem = { ...complaints.find(c => c.id === id)!, ...updates, updatedAt: today() };
    setComplaints(prev => prev.map(c => c.id === id ? updatedItem : c));
    await fsSaveDoc('complaints', updatedItem);
  }

  async function addHouseVisit(visit: Omit<HouseVisit, 'id'>) {
    const item: HouseVisit = { ...visit, id: uid() };
    setHouseVisits(prev => [item, ...prev]);
    await fsSaveDoc('houseVisits', item);
  }

  async function markAttendance(workerId: string, method: 'qr' | 'manual' = 'qr'): Promise<boolean> {
    const todayStr = today();
    if (attendance.some(a => a.workerId === workerId && a.date === todayStr)) return false;
    const item: Attendance = { id: uid(), workerId, date: todayStr, status: 'present', checkInTime: nowTime(), method };
    setAttendance(prev => [item, ...prev]);
    await fsSaveDoc('attendance', item);
    return true;
  }

  async function addHouse(h: Omit<House, 'id'>) {
    const item: House = { ...h, id: uid(), createdAt: today() };
    setHouses(prev => [...prev, item]);
    await _fsWrite('houses', item);
  }

  async function addMultipleHouses(newHouses: Omit<House, 'id'>[]) {
    const items: House[] = newHouses.map(h => ({ ...h, id: uid(), createdAt: today() }));
    setHouses(prev => [...prev, ...items]);
    const b = writeBatch(db);
    for (const item of items) {
      const { id, ...rest } = item as any;
      b.set(doc(db, 'houses', id), clean({ ...rest, _updatedAt: serverTimestamp() }));
    }
    await b.commit().catch(e => console.warn('Batch write failed:', e));
  }

  async function updateHouse(id: string, updates: Partial<House>) {
    const updatedItem = { ...houses.find(h => h.id === id)!, ...updates, updatedAt: today() };
    setHouses(prev => prev.map(h => h.id === id ? updatedItem : h));
    await _fsWrite('houses', updatedItem);
  }

  async function deleteHouse(id: string) {
    setHouses(prev => prev.filter(h => h.id !== id));
    await _fsDelete('houses', id);
  }

  async function bulkImportHouses(
    rows: Omit<House, 'id'>[],
    duplicateMode: 'skip' | 'update' | 'replace',
    onProgress?: (done: number, total: number) => void
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };
    let currentHouses = [...houses];
    const toWrite: House[] = [];
    const BATCH = 50;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const existingIdx = currentHouses.findIndex(
        h => h.registrationNumber.toUpperCase() === row.registrationNumber.toUpperCase()
      );

      if (existingIdx !== -1) {
        if (duplicateMode === 'skip') {
          result.skipped++;
        } else {
          const merged: House = {
            ...currentHouses[existingIdx],
            ownerName: row.ownerName,
            fatherOrHusband: row.fatherOrHusband,
            address: row.address,
            mobile: row.mobile,
            propertyType: row.propertyType,
            wardId: row.wardId,
            wardNumber: row.wardNumber,
            updatedAt: today(),
          };
          currentHouses[existingIdx] = merged;
          toWrite.push(merged);
          result.imported++;
        }
      } else {
        const item: House = { ...row, id: uid(), createdAt: today(), status: 'Active', isActive: true };
        currentHouses = [...currentHouses, item];
        toWrite.push(item);
        result.imported++;
      }

      if (onProgress && (i + 1) % BATCH === 0) {
        onProgress(i + 1, rows.length);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setHouses(currentHouses);

    const FIRESTORE_BATCH = 500;
    for (let i = 0; i < toWrite.length; i += FIRESTORE_BATCH) {
      const chunk = toWrite.slice(i, i + FIRESTORE_BATCH);
      const b = writeBatch(db);
      for (const item of chunk) {
        const { id, ...rest } = item as any;
        b.set(doc(db, 'houses', id), clean({ ...rest, _updatedAt: serverTimestamp() }));
      }
      await b.commit().catch(e => console.warn('Bulk batch failed:', e));
    }

    onProgress?.(rows.length, rows.length);
    return result;
  }

  async function assignGroupToHouses(houseIds: string[], groupId: string, groupName: string) {
    setHouses(prev => prev.map(h =>
      houseIds.includes(h.id) ? { ...h, groupId, groupName, updatedAt: today() } : h
    ));
    const b = writeBatch(db);
    for (const houseId of houseIds) {
      b.update(doc(db, 'houses', houseId), { groupId, groupName, updatedAt: today(), _updatedAt: serverTimestamp() });
    }
    await b.commit().catch(e => console.warn('assignGroup batch failed:', e));
  }

  async function removeGroupFromHouses(houseIds: string[]) {
    setHouses(prev => prev.map(h =>
      houseIds.includes(h.id) ? { ...h, groupId: undefined, groupName: undefined, updatedAt: today() } : h
    ));
    const b = writeBatch(db);
    for (const houseId of houseIds) {
      b.update(doc(db, 'houses', houseId), { groupId: null, groupName: null, updatedAt: today(), _updatedAt: serverTimestamp() });
    }
    await b.commit().catch(e => console.warn('removeGroup batch failed:', e));
  }

  async function addWard(w: Omit<Ward, 'id'>) {
    const item: Ward = { ...w, id: uid() };
    setWards(prev => [...prev, item]);
    await _fsWrite('wards', item);
  }

  async function updateWard(id: string, updates: Partial<Ward>) {
    const updatedItem = { ...wards.find(w => w.id === id)!, ...updates };
    setWards(prev => prev.map(w => w.id === id ? updatedItem : w));
    await fsSaveDoc('wards', updatedItem);
  }

  async function assignWorkerToWard(wardId: string, workerId: string) {
    const updatedWard = wards.find(w => w.id === wardId)!;
    const workers = updatedWard.assignedWorkers.includes(workerId)
      ? updatedWard.assignedWorkers
      : [...updatedWard.assignedWorkers, workerId];
    const newWard = { ...updatedWard, assignedWorkers: workers };
    setWards(prev => prev.map(w => w.id === wardId ? newWard : w));
    await fsSaveDoc('wards', newWard);

    const updatedUser = { ...users.find(u => u.id === workerId)!, wardId };
    setUsers(prev => prev.map(u => u.id === workerId ? updatedUser : u));
    await fsSaveDoc('users', updatedUser);
  }

  async function addGroup(g: Omit<Group, 'id'>): Promise<Group> {
    const item: Group = { ...g, id: uid() };
    setGroups(prev => [...prev, item]);
    await _fsWrite('groups', item);
    return item;
  }

  async function updateGroup(id: string, updates: Partial<Group>) {
    const updatedItem = { ...groups.find(g => g.id === id)!, ...updates };
    setGroups(prev => prev.map(g => g.id === id ? updatedItem : g));
    await _fsWrite('groups', updatedItem);
  }

  async function deleteGroup(id: string) {
    setGroups(prev => prev.filter(g => g.id !== id));
    await _fsDelete('groups', id);
    const affected = houses.filter(h => h.groupId === id);
    if (affected.length > 0) {
      setHouses(prev => prev.map(h => h.groupId === id ? { ...h, groupId: undefined, groupName: undefined } : h));
      const b = writeBatch(db);
      for (const house of affected) {
        b.update(doc(db, 'houses', house.id), { groupId: null, groupName: null, _updatedAt: serverTimestamp() });
      }
      await b.commit().catch(e => console.warn('deleteGroup batch failed:', e));
    }
  }

  async function addNotice(n: Omit<Notice, 'id' | 'createdAt'>) {
    const item: Notice = { ...n, id: uid(), createdAt: today() };
    setNotices(prev => [item, ...prev]);
    await fsSaveDoc('notices', item);
  }

  async function updateNotice(id: string, updates: Partial<Notice>) {
    const updatedItem = { ...notices.find(n => n.id === id)!, ...updates };
    setNotices(prev => prev.map(n => n.id === id ? updatedItem : n));
    await fsSaveDoc('notices', updatedItem);
  }

  async function deleteNotice(id: string) {
    setNotices(prev => prev.filter(n => n.id !== id));
    await fsDeleteDoc('notices', id);
  }

  async function addUser(u: User) {
    setUsers(prev => [...prev, u]);
    await fsSaveDoc('users', u);
  }

  async function updateUser(id: string, updates: Partial<User>) {
    const updatedItem = { ...users.find(u => u.id === id)!, ...updates };
    setUsers(prev => prev.map(u => u.id === id ? updatedItem : u));
    await fsSaveDoc('users', updatedItem);
  }

  async function deleteUser(id: string) {
    const target = users.find(u => u.id === id);
    if (
      id === 'SUPERADMIN' ||
      (target as any)?.isSuperAdmin ||
      (target as any)?.cannotBeDeleted
    ) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    await fsDeleteDoc('users', id);
  }

  async function addSecretKey(role: SecretKey['role']): Promise<SecretKey> {
    const code = genSecretKey(role);
    const item: SecretKey = { id: uid(), code, role, isActive: true, createdAt: today() };
    setSecretKeys(prev => [...prev, item]);
    await fsSaveDoc('secretKeys', item);
    return item;
  }

  async function toggleSecretKey(id: string) {
    const current = secretKeys.find(k => k.id === id)!;
    const updatedItem = { ...current, isActive: !current.isActive };
    setSecretKeys(prev => prev.map(k => k.id === id ? updatedItem : k));
    await fsUpdateDocFields('secretKeys', id, { isActive: updatedItem.isActive });
  }

  async function deleteSecretKey(id: string) {
    setSecretKeys(prev => prev.filter(k => k.id !== id));
    await fsDeleteDoc('secretKeys', id);
  }

  async function assignSecretKeyToUser(userId: string, userName: string, role: SecretKey['role']): Promise<SecretKey> {
    const code = genSecretKey(role);
    const item: SecretKey = { id: uid(), code, role, isActive: true, createdAt: today(), usedBy: userId, usedByName: userName };
    setSecretKeys(prev => [...prev, item]);
    await fsSaveDoc('secretKeys', item);
    return item;
  }

  async function updateSecretKeyCode(keyId: string, newCode: string) {
    const updatedItem = { ...secretKeys.find(k => k.id === keyId)!, code: newCode.trim().toUpperCase() };
    setSecretKeys(prev => prev.map(k => k.id === keyId ? updatedItem : k));
    await fsUpdateDocFields('secretKeys', keyId, { code: updatedItem.code });
  }

  async function updateUserId(oldId: string, newId: string) {
    const trimNew = newId.trim().toUpperCase();
    if (!trimNew || trimNew === oldId) return;
    const oldUser = users.find(u => u.id === oldId);
    if (!oldUser) return;
    const newUser = { ...oldUser, id: trimNew };
    setUsers(prev => prev.map(u => u.id === oldId ? newUser : u));
    const b = writeBatch(db);
    b.delete(doc(db, 'users', oldId));
    const { id: _id, ...rest } = newUser as any;
    b.set(doc(db, 'users', trimNew), clean({ ...rest, _updatedAt: serverTimestamp() }));
    const affectedKeys = secretKeys.filter(k => k.usedBy === oldId);
    const updatedKeys = secretKeys.map(k => k.usedBy === oldId ? { ...k, usedBy: trimNew } : k);
    setSecretKeys(updatedKeys);
    for (const k of affectedKeys) {
      b.update(doc(db, 'secretKeys', k.id), { usedBy: trimNew, _updatedAt: serverTimestamp() });
    }
    await b.commit().catch(e => console.warn('updateUserId batch failed:', e));
  }

  async function updateUserFull(oldId: string, newId: string, updates: Partial<User>) {
    const trimNew = newId.trim().toUpperCase();
    const targetId = trimNew && trimNew !== oldId ? trimNew : oldId;
    const oldUser = users.find(u => u.id === oldId)!;
    const updatedUser = { ...oldUser, ...updates, id: targetId };
    setUsers(prev => prev.map(u => u.id === oldId ? updatedUser : u));
    const b = writeBatch(db);
    if (targetId !== oldId) {
      b.delete(doc(db, 'users', oldId));
    }
    const { id: _id, ...rest } = updatedUser as any;
    b.set(doc(db, 'users', targetId), clean({ ...rest, _updatedAt: serverTimestamp() }));
    if (targetId !== oldId) {
      const affectedKeys = secretKeys.filter(k => k.usedBy === oldId);
      const updatedKeys = secretKeys.map(k => k.usedBy === oldId ? { ...k, usedBy: targetId } : k);
      setSecretKeys(updatedKeys);
      for (const k of affectedKeys) {
        b.update(doc(db, 'secretKeys', k.id), { usedBy: targetId, _updatedAt: serverTimestamp() });
      }
    }
    await b.commit().catch(e => console.warn('updateUserFull batch failed:', e));
  }

  async function updateSupportDetails(updates: Partial<SupportDetails>) {
    const updated = { ...supportDetails, ...updates };
    setSupportDetails(updated);
    await fsUpdateSingleDoc('settings', 'support', updated);
  }

  async function addPasswordResetRequest(email: string, name: string) {
    const item: PasswordResetRequest = { id: uid(), email, name, requestedAt: today(), status: 'pending' };
    setPasswordResetRequests(prev => [item, ...prev]);
    await fsSaveDoc('passwordResetRequests', item);
  }

  async function updatePasswordResetRequest(id: string, status: 'approved' | 'rejected', adminNote?: string) {
    const updatedItem = {
      ...passwordResetRequests.find(r => r.id === id)!,
      status,
      ...(adminNote ? { adminNote } : {}),
    };
    setPasswordResetRequests(prev => prev.map(r => r.id === id ? updatedItem : r));
    await fsSaveDoc('passwordResetRequests', updatedItem);
  }

  async function addImportHistory(h: Omit<ImportHistory, 'id'>) {
    const item: ImportHistory = { ...h, id: uid() };
    setImportHistory(prev => [item, ...prev]);
    await fsSaveDoc('importHistory', item);
  }

  async function deleteImportHistory(id: string) {
    setImportHistory(prev => prev.filter(h => h.id !== id));
    await fsDeleteDoc('importHistory', id);
  }

  const getHouseByRegistration = (regNum: string) =>
    houses.find(h => h.registrationNumber.toUpperCase() === regNum.toUpperCase());

  const getComplaintsByUser = (userId: string) =>
    complaints.filter(c => c.citizenId === userId);

  const getAttendanceByWorker = (workerId: string) =>
    attendance.filter(a => a.workerId === workerId).sort((a, b) => b.date.localeCompare(a.date));

  const getVisitsByWorker = (workerId: string) =>
    houseVisits.filter(v => v.workerId === workerId).sort((a, b) =>
      (b.visitDate + b.visitTime).localeCompare(a.visitDate + a.visitTime));

  const isTodayAttendanceMarked = (workerId: string) =>
    attendance.some(a => a.workerId === workerId && a.date === today());

  return (
    <AppContext.Provider value={{
      complaints, houses, wards, groups, notices, attendance, houseVisits, users, secretKeys,
      supportDetails, passwordResetRequests, importHistory,
      addComplaint, updateComplaint, addHouseVisit, markAttendance,
      addHouse, addMultipleHouses, updateHouse, deleteHouse, bulkImportHouses,
      assignGroupToHouses, removeGroupFromHouses,
      addWard, updateWard, assignWorkerToWard,
      addGroup, updateGroup, deleteGroup,
      addNotice, updateNotice, deleteNotice,
      addUser, updateUser, deleteUser,
      addSecretKey, assignSecretKeyToUser, toggleSecretKey, deleteSecretKey, updateSecretKeyCode, updateUserId, updateUserFull,
      updateSupportDetails,
      addPasswordResetRequest, updatePasswordResetRequest,
      addImportHistory, deleteImportHistory,
      getHouseByRegistration, getComplaintsByUser,
      getAttendanceByWorker, getVisitsByWorker, isTodayAttendanceMarked,
      syncStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppData must be used within AppProvider');
  return ctx;
}
