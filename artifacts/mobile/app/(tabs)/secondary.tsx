import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import CitizenNotices from '@/screens/citizen/CitizenNotices';
import SKAttendance from '@/screens/safaikarmi/SKAttendance';
import OfficialWorkers from '@/screens/official/OfficialWorkers';
import SuperAdminHouseMain from '@/screens/admin/SuperAdminHouseMain';

export default function SecondaryTab() {
  const { user } = useAuth();
  if (user?.role === 'safaikarmi') return <SKAttendance />;
  if (user?.role === 'official') return <OfficialWorkers />;
  if (user?.role === 'admin') return <SuperAdminHouseMain />;
  return <CitizenNotices />;
}
