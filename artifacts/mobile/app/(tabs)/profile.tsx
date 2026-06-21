import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AdminProfile from '@/screens/admin/AdminProfile';
import ProfileScreen from '@/screens/shared/ProfileScreen';

export default function ProfileTab() {
  const { user } = useAuth();
  if (user?.role === 'admin') return <AdminProfile />;
  return <ProfileScreen />;
}
