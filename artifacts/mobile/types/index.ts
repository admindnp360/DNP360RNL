export type UserRole = 'citizen' | 'safaikarmi' | 'official' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  role: UserRole;
  wardId?: string;
  employeeId?: string;
  avatar?: string;
  address?: string;
  isActive?: boolean;
  createdAt?: string;
  isSuperAdmin?: boolean;
  cannotBeDeleted?: boolean;
}

export type ComplaintStatus = 'submitted' | 'assigned' | 'in_progress' | 'resolved';
export type ComplaintCategory =
  | 'garbage_collection'
  | 'drainage'
  | 'water_supply'
  | 'street_light'
  | 'road_damage'
  | 'cleanliness'
  | 'other';

export interface Complaint {
  id: string;
  citizenId: string;
  citizenName: string;
  category: ComplaintCategory;
  description: string;
  location: string;
  status: ComplaintStatus;
  createdAt: string;
  updatedAt: string;
  photo?: string;
  assignedTo?: string;
  assignedToName?: string;
  wardId?: string;
  wardNumber?: string;
}

export interface House {
  id: string;
  registrationNumber: string;
  ownerName: string;
  mobile: string;
  address: string;
  wardId: string;
  wardNumber: string;
  isActive: boolean;
}

export interface HouseVisit {
  id: string;
  houseId: string;
  houseRegistrationNumber: string;
  ownerName: string;
  address: string;
  workerId: string;
  workerName?: string;
  wardId?: string;
  visitDate: string;
  visitTime: string;
  collectedGarbage: boolean;
  notes?: string;
  status: 'visited' | 'not_visited';
}

export interface Ward {
  id: string;
  wardNumber: string;
  name: string;
  area: string;
  assignedWorkers: string[];
  totalHouses: number;
  officialId?: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'notice' | 'announcement' | 'alert';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  expiresAt?: string;
  isActive: boolean;
}

export interface Attendance {
  id: string;
  workerId: string;
  date: string;
  status: 'present' | 'absent' | 'half_day';
  checkInTime?: string;
  checkOutTime?: string;
  method: 'qr' | 'manual';
}

export interface SecretKey {
  id: string;
  code: string;
  role: 'safaikarmi' | 'official' | 'admin';
  isActive: boolean;
  usedBy?: string;
  usedByName?: string;
  createdAt: string;
}

export interface SupportDetails {
  phone: string;
  email: string;
  address: string;
  hours: string;
}

export interface PasswordResetRequest {
  id: string;
  email: string;
  name: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
}

export const COMPLAINT_CATEGORIES: Record<ComplaintCategory, string> = {
  garbage_collection: 'Garbage Collection',
  drainage: 'Drainage',
  water_supply: 'Water Supply',
  street_light: 'Street Light',
  road_damage: 'Road Damage',
  cleanliness: 'Cleanliness',
  other: 'Other Issues',
};

export const COMPLAINT_CATEGORY_ICONS: Record<ComplaintCategory, string> = {
  garbage_collection: 'trash-2',
  drainage: 'droplets',
  water_supply: 'droplet',
  street_light: 'zap',
  road_damage: 'alert-triangle',
  cleanliness: 'wind',
  other: 'help-circle',
};
