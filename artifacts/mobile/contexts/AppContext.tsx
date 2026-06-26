import AsyncStorage from '@react-native-async-storage/async-storage';
import { get, ref, set } from 'firebase/database';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { rtdb } from '@/lib/firebase';
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
}

const STORAGE_VERSION = '6';
const RTDB_BASE = 'dnp360';

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

const EMPTY_ARRAY_SENTINEL = '__ea__';

function clean<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (_k, v) => {
    if (Array.isArray(v) && v.length === 0) return EMPTY_ARRAY_SENTINEL;
    return v === undefined ? null : v;
  }));
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
  { id: 'G001', name: 'Main Market', wardId: 'W1', wardNumber: '1', description: 'Main market area of Ward 1', color: '#10B981', createdAt: d(30), createdBy: 'SA001' },
  { id: 'G002', name: 'Hospital Area', wardId: 'W1', wardNumber: '1', description: 'Near district hospital', color: '#EF4444', createdAt: d(30), createdBy: 'SA001' },
  { id: 'G003', name: 'School Area', wardId: 'W1', wardNumber: '1', description: 'Near government school', color: '#F97316', createdAt: d(28), createdBy: 'SA001' },
  { id: 'G004', name: 'Market Zone A', wardId: 'W2', wardNumber: '2', description: 'Market Road Zone', color: '#8B5CF6', createdAt: d(25), createdBy: 'SA001' },
  { id: 'G005', name: 'Sector 7 Group 1', wardId: 'W42', wardNumber: '42', description: 'Near Temple', color: '#0EA5E9', createdAt: d(20), createdBy: 'SA001' },
  { id: 'G006', name: 'Green Park Zone', wardId: 'W12', wardNumber: '12', description: 'Green Park area', color: '#EC4899', createdAt: d(15), createdBy: 'SA001' },
];

const SEED_HOUSES: House[] = [
  { id: 'H001', registrationNumber: 'DNPH001', ownerName: 'Ramesh Prasad', fatherOrHusband: 'Shiv Prasad', mobile: '9934512300', address: 'Ward 42, Near Temple, Daudnagar', wardId: 'W42', wardNumber: '42', groupId: 'G005', groupName: 'Sector 7 Group 1', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(30) },
  { id: 'H002', registrationNumber: 'DNPH002', ownerName: 'Sunita Devi', fatherOrHusband: 'Ram Kumar', mobile: '9934512301', address: 'Ward 42, Main Road, Daudnagar', wardId: 'W42', wardNumber: '42', groupId: 'G005', groupName: 'Sector 7 Group 1', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(29) },
  { id: 'H003', registrationNumber: 'DNPH003', ownerName: 'Manoj Kumar Singh', fatherOrHusband: 'Vijay Singh', mobile: '9934512302', address: 'Ward 42, Shiv Nagar, Daudnagar', wardId: 'W42', wardNumber: '42', propertyType: 'Commercial', status: 'Active', isActive: true, createdAt: d(28) },
  { id: 'H004', registrationNumber: 'DNPH004', ownerName: 'Geeta Kumari', fatherOrHusband: 'Suresh Kumar', mobile: '9934512303', address: 'Ward 1, Station Road, Daudnagar', wardId: 'W1', wardNumber: '1', groupId: 'G001', groupName: 'Main Market', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(27) },
  { id: 'H005', registrationNumber: 'DNPH005', ownerName: 'Vijay Kumar', mobile: '9934512304', address: 'Ward 1, Near School, Daudnagar', wardId: 'W1', wardNumber: '1', groupId: 'G003', groupName: 'School Area', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(26) },
  { id: 'H006', registrationNumber: 'DNPH006', ownerName: 'Anjali Singh', fatherOrHusband: 'Deepak Singh', mobile: '9934512305', address: 'Ward 12, Civil Area, Daudnagar', wardId: 'W12', wardNumber: '12', groupId: 'G006', groupName: 'Green Park Zone', propertyType: 'Residential', status: 'Active', isActive: true, createdAt: d(25) },
  { id: 'H007', registrationNumber: 'DNPH007', ownerName: 'Pradeep Yadav', mobile: '9934512306', address: 'Ward 12, Green Park, Daudnagar', wardId: 'W12', wardNumber: '12', propertyType: 'Government', status: 'Active', isActive: true, createdAt: d(24) },
  { id: 'H008', registrationNumber: 'DNPH008', ownerName: 'Kavita Devi', fatherOrHusband: 'Mohan Prasad', mobile: '9934512307', address: 'Ward 2, Market Road, Daudnagar', wardId: 'W2', wardNumber: '2', groupId: 'G004', groupName: 'Market Zone A', propertyType: 'Commercial', status: 'Active', isActive: true, createdAt: d(23) },
];

const SEED_NOTICES: Notice[] = [
  { id: 'N001', title: 'Property Tax Due', content: 'All property holders are requested to pay their annual property tax before 31st March 2025 to avoid penalty.', type: 'notice', priority: 'high', createdAt: '2025-01-10', isActive: true },
  { id: 'N002', title: 'Water Supply Interruption', content: 'Due to maintenance work, water supply will be interrupted in Ward 3, 4, and 5 on 25th January from 9 AM to 5 PM.', type: 'alert', priority: 'high', createdAt: '2025-01-20', isActive: true },
  { id: 'N003', title: 'Cleanliness Drive - Swachh Bharat', content: 'Nagar Parishad Daudnagar is organizing a Swachh Bharat cleanliness drive on 26th January.', type: 'announcement', priority: 'medium', createdAt: '2025-01-18', isActive: true },
  { id: 'N004', title: 'Ward Committee Meeting', content: 'Monthly ward committee meeting will be held on 28th January at 11 AM in the Municipal Hall.', type: 'notice', priority: 'low', createdAt: '2025-01-15', isActive: true },
];

const SEED_COMPLAINTS: Complaint[] = [
  { id: 'CPL001', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'garbage_collection', description: 'Garbage has not been collected from our street for 3 days.', location: 'Ward 5, Near Post Office, Daudnagar', status: 'submitted',   createdAt: d(2),  updatedAt: d(2),  wardId: 'W1',  wardNumber: '1'  },
  { id: 'CPL002', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'drainage',           description: 'Open drain near our house is blocked and overflowing during rain.', location: 'Ward 5, Ram Nagar, Daudnagar',     status: 'assigned',    createdAt: d(5),  updatedAt: d(3),  assignedTo: 'SK1538Q', assignedToName: 'Amit Kumar', wardId: 'W1',  wardNumber: '1'  },
  { id: 'CPL003', citizenId: 'CT4821M', citizenName: 'Rahul Kumar',  category: 'street_light',       description: 'Street light near our house is not working for a week.',           location: 'Ward 5, Main Road, Daudnagar',       status: 'resolved',    createdAt: d(15), updatedAt: d(8),  wardId: 'W1',  wardNumber: '1'  },
  { id: 'CPL004', citizenId: 'CT5629N', citizenName: 'Priya Singh',  category: 'water_supply',       description: 'No water supply for 2 days in our area.',                          location: 'Ward 12, Civil Line, Daudnagar',     status: 'in_progress', createdAt: d(1),  updatedAt: d(0),  assignedTo: 'SK1538Q', assignedToName: 'Amit Kumar', wardId: 'W12', wardNumber: '12' },
  { id: 'CPL005', citizenId: 'CT8834P', citizenName: 'Suresh Yadav', category: 'road_damage',        description: 'Large pothole on main road causing accidents.',                      location: 'Ward 3, Station Road, Daudnagar',    status: 'submitted',   createdAt: d(0),  updatedAt: d(0),  wardId: 'W3',  wardNumber: '3'  },
  { id: 'CPL006', citizenId: 'CT2017K', citizenName: 'Meena Devi',   category: 'cleanliness',        description: 'Public park is very dirty. Garbage piled up near the gate.',        location: 'Ward 2, Central Park, Daudnagar',    status: 'assigned',    createdAt: d(3),  updatedAt: d(2),  wardId: 'W2',  wardNumber: '2'  },
];

const SEED_USERS: User[] = [
  { id: 'CT4821M', name: 'Rahul Kumar',   email: 'citizen.dnp360@gmail.com',   mobile: '9876543210', role: 'citizen',    address: 'Ward 5, Daudnagar', isActive: true,  createdAt: '2024-01-15' },
  { id: 'CT5629N', name: 'Priya Singh',   email: 'priya.singh@gmail.com',      mobile: '9876543220', role: 'citizen',    isActive: true,  createdAt: '2024-02-20' },
  { id: 'CT8834P', name: 'Suresh Yadav', email: 'suresh.yadav@gmail.com',     mobile: '9876543221', role: 'citizen',    isActive: true,  createdAt: '2024-03-10' },
  { id: 'CT2017K', name: 'Meena Devi',   email: 'meena.devi@gmail.com',       mobile: '9876543222', role: 'citizen',    isActive: true,  createdAt: '2024-04-05' },
  { id: 'SK1538Q', name: 'Amit Kumar',   email: 'sk1538q.dnp360@gmail.com',   mobile: '9876543211', role: 'safaikarmi', wardId: 'W42',  employeeId: 'SK2291', isActive: true,  createdAt: '2023-06-01' },
  { id: 'SK7291R', name: 'Raju Prasad',  email: 'sk7291r.dnp360@gmail.com',   mobile: '9876543215', role: 'safaikarmi', wardId: 'W1',   employeeId: 'SK2292', isActive: true,  createdAt: '2023-07-01' },
  { id: 'SK4403S', name: 'Bholu Kumar',  email: 'sk4403s.dnp360@gmail.com',   mobile: '9876543216', role: 'safaikarmi', wardId: 'W3',   employeeId: 'SK2293', isActive: false, createdAt: '2023-08-01' },
  { id: 'OF7642B', name: 'Rajesh Gupta', email: 'of7642b.dnp360@gmail.com',   mobile: '9876543212', role: 'official',   wardId: 'W12',  employeeId: 'OF4412', isActive: true,  createdAt: '2022-03-10' },
  { id: 'OF3815C', name: 'Deepak Sinha', email: 'of3815c.dnp360@gmail.com',   mobile: '9876543217', role: 'official',   wardId: 'W2',   employeeId: 'OF4413', isActive: true,  createdAt: '2022-05-15' },
  { id: 'AD9305X', name: 'Sandeep Kumar',email: 'ad9305x.dnp360@gmail.com',   mobile: '9876543213', role: 'admin',      employeeId: 'AD9305X', isActive: true,  createdAt: '2021-01-01' },
];

const SEED_KEYS: SecretKey[] = [
  { id: 'KEY001', code: 'SK-2566-F000', role: 'safaikarmi', isActive: true,  usedBy: 'SK1538Q', usedByName: 'Amit Kumar',    createdAt: d(30) },
  { id: 'KEY002', code: 'OF-4416-A000', role: 'official',   isActive: true,  usedBy: 'OF7642B', usedByName: 'Rajesh Gupta',  createdAt: d(30) },
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

function normalizeFromRTDB(val: any): any {
  if (val === null || val === undefined) return val;
  if (val === EMPTY_ARRAY_SENTINEL) return [];
  if (Array.isArray(val)) return val.map(normalizeFromRTDB);
  if (typeof val === 'object') {
    const keys = Object.keys(val);
    const allNumeric = keys.length > 0 && keys.every(k => /^\d+$/.test(k));
    if (allNumeric) {
      return keys
        .sort((a, b) => Number(a) - Number(b))
        .map(k => normalizeFromRTDB(val[k]));
    }
    const out: any = {};
    for (const k of keys) out[k] = normalizeFromRTDB(val[k]);
    return out;
  }
  return val;
}

function toArray<T>(val: any): T[] {
  if (!val) return [];
  return (Object.values(val) as any[]).map(normalizeFromRTDB) as T[];
}

function toMap<T extends { id: string }>(arr: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  arr.forEach(item => { map[item.id] = item; });
  return map;
}

async function rtdbLoad<T extends { id: string }>(path: string, seed: T[]): Promise<T[]> {
  try {
    const snap = await get(ref(rtdb, `${RTDB_BASE}/${path}`));
    if (snap.exists()) return toArray<T>(snap.val());
    await set(ref(rtdb, `${RTDB_BASE}/${path}`), clean(toMap(seed)));
    return seed;
  } catch {
    const stored = await AsyncStorage.getItem(`dnp360_${path}`).catch(() => null);
    return stored ? JSON.parse(stored) : seed;
  }
}

async function rtdbLoadObj<T>(path: string, seed: T): Promise<T> {
  try {
    const snap = await get(ref(rtdb, `${RTDB_BASE}/${path}`));
    if (snap.exists()) return snap.val() as T;
    await set(ref(rtdb, `${RTDB_BASE}/${path}`), clean(seed));
    return seed;
  } catch {
    const stored = await AsyncStorage.getItem(`dnp360_${path}`).catch(() => null);
    return stored ? JSON.parse(stored) : seed;
  }
}

async function rtdbSave<T extends { id: string }>(path: string, data: T[]): Promise<void> {
  try {
    await set(ref(rtdb, `${RTDB_BASE}/${path}`), clean(toMap(data)));
  } catch {
    await AsyncStorage.setItem(`dnp360_${path}`, JSON.stringify(data)).catch(() => {});
  }
}

async function rtdbSaveObj<T>(path: string, data: T): Promise<void> {
  try {
    await set(ref(rtdb, `${RTDB_BASE}/${path}`), clean(data));
  } catch {
    await AsyncStorage.setItem(`dnp360_${path}`, JSON.stringify(data)).catch(() => {});
  }
}

const DATA_COLLECTIONS = ['complaints', 'houses', 'wards', 'groups', 'notices', 'attendance', 'houseVisits', 'secretKeys', 'support', 'passwordResetRequests', 'importHistory'];

async function checkVersion(): Promise<void> {
  try {
    const snap = await get(ref(rtdb, `${RTDB_BASE}/meta/version`));
    if (snap.exists() && snap.val() === STORAGE_VERSION) return;
    await Promise.all(DATA_COLLECTIONS.map(c => set(ref(rtdb, `${RTDB_BASE}/${c}`), null)));
    await set(ref(rtdb, `${RTDB_BASE}/meta/version`), STORAGE_VERSION);
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

  useEffect(() => {
    (async () => {
      await checkVersion();
      const [c, h, w, g, n, a, v, u, k, s, r, ih] = await Promise.all([
        rtdbLoad<Complaint>('complaints', SEED_COMPLAINTS),
        rtdbLoad<House>('houses', SEED_HOUSES),
        rtdbLoad<Ward>('wards', SEED_WARDS),
        rtdbLoad<Group>('groups', SEED_GROUPS),
        rtdbLoad<Notice>('notices', SEED_NOTICES),
        rtdbLoad<Attendance>('attendance', seedAttendance()),
        rtdbLoad<HouseVisit>('houseVisits', seedHouseVisits()),
        rtdbLoad<User>('users', SEED_USERS),
        rtdbLoad<SecretKey>('secretKeys', SEED_KEYS),
        rtdbLoadObj<SupportDetails>('support', DEFAULT_SUPPORT),
        rtdbLoad<PasswordResetRequest>('passwordResetRequests', []),
        rtdbLoad<ImportHistory>('importHistory', []),
      ]);
      setComplaints(c); setHouses(h); setWards(w); setGroups(g); setNotices(n);
      setAttendance(a); setHouseVisits(v); setUsers(u); setSecretKeys(k);
      setSupportDetails(s); setPasswordResetRequests(r); setImportHistory(ih);
    })();
  }, []);

  async function addComplaint(c: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = today();
    const item: Complaint = { ...c, id: uid(), createdAt: now, updatedAt: now };
    const updated = [item, ...complaints];
    setComplaints(updated); await rtdbSave('complaints', updated);
  }

  async function updateComplaint(id: string, updates: Partial<Complaint>) {
    const updated = complaints.map(c => c.id === id ? { ...c, ...updates, updatedAt: today() } : c);
    setComplaints(updated); await rtdbSave('complaints', updated);
  }

  async function addHouseVisit(visit: Omit<HouseVisit, 'id'>) {
    const item: HouseVisit = { ...visit, id: uid() };
    const updated = [item, ...houseVisits];
    setHouseVisits(updated); await rtdbSave('houseVisits', updated);
  }

  async function markAttendance(workerId: string, method: 'qr' | 'manual' = 'qr'): Promise<boolean> {
    const todayStr = today();
    if (attendance.some(a => a.workerId === workerId && a.date === todayStr)) return false;
    const item: Attendance = { id: uid(), workerId, date: todayStr, status: 'present', checkInTime: nowTime(), method };
    const updated = [item, ...attendance];
    setAttendance(updated); await rtdbSave('attendance', updated);
    return true;
  }

  async function addHouse(h: Omit<House, 'id'>) {
    const item: House = { ...h, id: uid(), createdAt: today() };
    const updated = [...houses, item];
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function addMultipleHouses(newHouses: Omit<House, 'id'>[]) {
    const items: House[] = newHouses.map(h => ({ ...h, id: uid(), createdAt: today() }));
    const updated = [...houses, ...items];
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function updateHouse(id: string, updates: Partial<House>) {
    const updated = houses.map(h => h.id === id ? { ...h, ...updates, updatedAt: today() } : h);
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function deleteHouse(id: string) {
    const updated = houses.filter(h => h.id !== id);
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function bulkImportHouses(
    rows: Omit<House, 'id'>[],
    duplicateMode: 'skip' | 'update' | 'replace',
    onProgress?: (done: number, total: number) => void
  ): Promise<BulkImportResult> {
    const result: BulkImportResult = { imported: 0, skipped: 0, failed: 0, errors: [] };
    let currentHouses = [...houses];
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
          const existing = currentHouses[existingIdx];
          const merged: House = {
            ...existing,
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
          result.imported++;
        }
      } else {
        const item: House = { ...row, id: uid(), createdAt: today(), status: 'Active', isActive: true };
        currentHouses = [...currentHouses, item];
        result.imported++;
      }

      if (onProgress && (i + 1) % BATCH === 0) {
        onProgress(i + 1, rows.length);
        await new Promise(r => setTimeout(r, 0));
      }
    }

    setHouses(currentHouses);
    await rtdbSave('houses', currentHouses);
    onProgress?.(rows.length, rows.length);
    return result;
  }

  async function assignGroupToHouses(houseIds: string[], groupId: string, groupName: string) {
    const updated = houses.map(h =>
      houseIds.includes(h.id) ? { ...h, groupId, groupName, updatedAt: today() } : h
    );
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function removeGroupFromHouses(houseIds: string[]) {
    const updated = houses.map(h =>
      houseIds.includes(h.id) ? { ...h, groupId: undefined, groupName: undefined, updatedAt: today() } : h
    );
    setHouses(updated); await rtdbSave('houses', updated);
  }

  async function addWard(w: Omit<Ward, 'id'>) {
    const item: Ward = { ...w, id: uid() };
    const updated = [...wards, item];
    setWards(updated); await rtdbSave('wards', updated);
  }

  async function updateWard(id: string, updates: Partial<Ward>) {
    const updated = wards.map(w => w.id === id ? { ...w, ...updates } : w);
    setWards(updated); await rtdbSave('wards', updated);
  }

  async function assignWorkerToWard(wardId: string, workerId: string) {
    const updatedWards = wards.map(w => {
      if (w.id === wardId) {
        const workers = w.assignedWorkers.includes(workerId) ? w.assignedWorkers : [...w.assignedWorkers, workerId];
        return { ...w, assignedWorkers: workers };
      }
      return w;
    });
    setWards(updatedWards); await rtdbSave('wards', updatedWards);
    const updatedUsers = users.map(u => u.id === workerId ? { ...u, wardId } : u);
    setUsers(updatedUsers); await rtdbSave('users', updatedUsers);
  }

  async function addGroup(g: Omit<Group, 'id'>): Promise<Group> {
    const item: Group = { ...g, id: uid() };
    const updated = [...groups, item];
    setGroups(updated); await rtdbSave('groups', updated);
    return item;
  }

  async function updateGroup(id: string, updates: Partial<Group>) {
    const updated = groups.map(g => g.id === id ? { ...g, ...updates } : g);
    setGroups(updated); await rtdbSave('groups', updated);
  }

  async function deleteGroup(id: string) {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated); await rtdbSave('groups', updated);
    const updatedHouses = houses.map(h => h.groupId === id ? { ...h, groupId: undefined, groupName: undefined } : h);
    setHouses(updatedHouses); await rtdbSave('houses', updatedHouses);
  }

  async function addNotice(n: Omit<Notice, 'id' | 'createdAt'>) {
    const item: Notice = { ...n, id: uid(), createdAt: today() };
    const updated = [item, ...notices];
    setNotices(updated); await rtdbSave('notices', updated);
  }

  async function updateNotice(id: string, updates: Partial<Notice>) {
    const updated = notices.map(n => n.id === id ? { ...n, ...updates } : n);
    setNotices(updated); await rtdbSave('notices', updated);
  }

  async function deleteNotice(id: string) {
    const updated = notices.filter(n => n.id !== id);
    setNotices(updated); await rtdbSave('notices', updated);
  }

  async function addUser(u: User) {
    const updated = [...users, u];
    setUsers(updated); await rtdbSave('users', updated);
  }

  async function updateUser(id: string, updates: Partial<User>) {
    const updated = users.map(u => u.id === id ? { ...u, ...updates } : u);
    setUsers(updated); await rtdbSave('users', updated);
  }

  async function deleteUser(id: string) {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated); await rtdbSave('users', updated);
  }

  async function addSecretKey(role: SecretKey['role']): Promise<SecretKey> {
    const code = genSecretKey(role);
    const item: SecretKey = { id: uid(), code, role, isActive: true, createdAt: today() };
    const updated = [...secretKeys, item];
    setSecretKeys(updated); await rtdbSave('secretKeys', updated);
    return item;
  }

  async function toggleSecretKey(id: string) {
    const updated = secretKeys.map(k => k.id === id ? { ...k, isActive: !k.isActive } : k);
    setSecretKeys(updated); await rtdbSave('secretKeys', updated);
  }

  async function deleteSecretKey(id: string) {
    const updated = secretKeys.filter(k => k.id !== id);
    setSecretKeys(updated); await rtdbSave('secretKeys', updated);
  }

  async function assignSecretKeyToUser(userId: string, userName: string, role: SecretKey['role']): Promise<SecretKey> {
    const code = genSecretKey(role);
    const item: SecretKey = { id: uid(), code, role, isActive: true, createdAt: today(), usedBy: userId, usedByName: userName };
    const updated = [...secretKeys, item];
    setSecretKeys(updated); await rtdbSave('secretKeys', updated);
    return item;
  }

  async function updateSecretKeyCode(keyId: string, newCode: string) {
    const updated = secretKeys.map(k => k.id === keyId ? { ...k, code: newCode.trim().toUpperCase() } : k);
    setSecretKeys(updated); await rtdbSave('secretKeys', updated);
  }

  async function updateUserId(oldId: string, newId: string) {
    const trimNew = newId.trim().toUpperCase();
    if (!trimNew || trimNew === oldId) return;
    const updatedUsers = users.map(u => u.id === oldId ? { ...u, id: trimNew } : u);
    setUsers(updatedUsers); await rtdbSave('users', updatedUsers);
    const updatedKeys = secretKeys.map(k =>
      k.usedBy === oldId ? { ...k, usedBy: trimNew } : k
    );
    setSecretKeys(updatedKeys); await rtdbSave('secretKeys', updatedKeys);
  }

  async function updateSupportDetails(updates: Partial<SupportDetails>) {
    const updated = { ...supportDetails, ...updates };
    setSupportDetails(updated); await rtdbSaveObj('support', updated);
  }

  async function addPasswordResetRequest(email: string, name: string) {
    const item: PasswordResetRequest = { id: uid(), email, name, requestedAt: today(), status: 'pending' };
    const updated = [item, ...passwordResetRequests];
    setPasswordResetRequests(updated); await rtdbSave('passwordResetRequests', updated);
  }

  async function updatePasswordResetRequest(id: string, status: 'approved' | 'rejected', adminNote?: string) {
    const updated = passwordResetRequests.map(r =>
      r.id === id ? { ...r, status, ...(adminNote ? { adminNote } : {}) } : r
    );
    setPasswordResetRequests(updated); await rtdbSave('passwordResetRequests', updated);
  }

  async function addImportHistory(h: Omit<ImportHistory, 'id'>) {
    const item: ImportHistory = { ...h, id: uid() };
    const updated = [item, ...importHistory];
    setImportHistory(updated); await rtdbSave('importHistory', updated);
  }

  async function deleteImportHistory(id: string) {
    const updated = importHistory.filter(h => h.id !== id);
    setImportHistory(updated); await rtdbSave('importHistory', updated);
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
      addSecretKey, assignSecretKeyToUser, toggleSecretKey, deleteSecretKey, updateSecretKeyCode, updateUserId,
      updateSupportDetails,
      addPasswordResetRequest, updatePasswordResetRequest,
      addImportHistory, deleteImportHistory,
      getHouseByRegistration, getComplaintsByUser,
      getAttendanceByWorker, getVisitsByWorker, isTodayAttendanceMarked,
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
