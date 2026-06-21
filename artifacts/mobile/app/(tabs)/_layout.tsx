import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { SyncStatusBar } from '@/components/SyncStatusBar';

type TabName = 'index' | 'action' | 'secondary' | 'tertiary' | 'profile';

const ROLE_TABS: Record<string, Record<TabName, { icon: string; label: string }>> = {
  citizen: {
    index:     { icon: 'home',        label: 'Home' },
    action:    { icon: 'alert-circle', label: 'Complaints' },
    secondary: { icon: 'volume-2',    label: 'Notices' },
    tertiary:  { icon: 'phone-call',  label: 'Emergency' },
    profile:   { icon: 'user',        label: 'Profile' },
  },
  safaikarmi: {
    index:     { icon: 'home',        label: 'Dashboard' },
    action:    { icon: 'maximize',    label: 'Scan QR' },
    secondary: { icon: 'calendar',    label: 'Attendance' },
    tertiary:  { icon: 'bar-chart-2', label: 'Performance' },
    profile:   { icon: 'user',        label: 'Profile' },
  },
  official: {
    index:     { icon: 'home',        label: 'Dashboard' },
    action:    { icon: 'clipboard',   label: 'Complaints' },
    secondary: { icon: 'users',       label: 'Workers' },
    tertiary:  { icon: 'home',        label: 'Houses' },
    profile:   { icon: 'user',        label: 'Profile' },
  },
  admin: {
    index:     { icon: 'grid',        label: 'Dashboard' },
    action:    { icon: 'users',       label: 'Users' },
    secondary: { icon: 'key',         label: 'Keys' },
    tertiary:  { icon: 'settings',    label: 'Manage' },
    profile:   { icon: 'user',        label: 'Profile' },
  },
};

const ROLE_COLORS: Record<string, string> = {
  citizen:    '#1264E8',
  safaikarmi: '#007F42',
  official:   '#C45C00',
  admin:      '#1A3FA8',
};

export default function TabLayout() {
  const { user } = useAuth();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';

  const role = user?.role ?? 'citizen';
  const tabs = ROLE_TABS[role] ?? ROLE_TABS.citizen;
  const activeColor = ROLE_COLORS[role] ?? colors.primary;

  const tabNames: TabName[] = ['index', 'action', 'secondary', 'tertiary', 'profile'];

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: activeColor,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            backgroundColor: isIOS ? 'transparent' : colors.background,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            elevation: 0,
            height: 60,
            paddingBottom: 6,
            paddingTop: 6,
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            ) : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
            ),
          tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_500Medium' },
        }}
      >
        {tabNames.map((name) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: tabs[name].label,
              tabBarIcon: ({ color }) => <Feather name={tabs[name].icon as any} size={20} color={color} />,
            }}
          />
        ))}
      </Tabs>
      <SyncStatusBar />
    </View>
  );
}
