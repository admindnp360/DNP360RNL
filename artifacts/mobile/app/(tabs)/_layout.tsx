import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { SyncStatusBar } from '@/components/SyncStatusBar';
import { CameraScanner } from '@/components/CameraScanner';

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
    action:    { icon: 'camera',      label: 'Scan QR' },
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
    secondary: { icon: 'database',    label: 'House DB' },
    tertiary:  { icon: 'settings',    label: 'Manage' },
    profile:   { icon: 'user',        label: 'Profile' },
  },
};

const ROLE_COLORS: Record<string, string> = {
  citizen:    '#6AAEFF',
  safaikarmi: '#34D399',
  official:   '#FFAA5C',
  admin:      '#8CB4FF',
};

function ScanCenterIcon({ focused }: { focused: boolean }) {
  return (
    <View style={scanStyles.wrap}>
      <LinearGradient
        colors={focused ? ['#22C55E', '#15803D'] : ['#16A34A', '#166534']}
        style={scanStyles.circle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Feather name="camera" size={26} color="#fff" />
      </LinearGradient>
    </View>
  );
}

const scanStyles = StyleSheet.create({
  wrap: { width: 60, height: 60, marginBottom: 18, justifyContent: 'center', alignItems: 'center' },
  circle: {
    width: 58, height: 58, borderRadius: 29,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 10,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)',
  },
});

export default function TabLayout() {
  const { user } = useAuth();
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const [directCamera, setDirectCamera] = useState(false);

  const role = user?.role ?? 'citizen';
  const baseTabs = ROLE_TABS[role] ?? ROLE_TABS.citizen;
  const tabs = baseTabs;
  const activeColor = ROLE_COLORS[role] ?? colors.primary;
  const isSafaikarmi = role === 'safaikarmi';

  const tabNames: TabName[] = isSafaikarmi
    ? ['index', 'secondary', 'action', 'tertiary', 'profile']
    : ['index', 'action', 'secondary', 'tertiary', 'profile'];

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
            height: isSafaikarmi ? 68 : 60,
            paddingBottom: isSafaikarmi ? 8 : 6,
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
        {tabNames.map((name) => {
          const isScanCenter = isSafaikarmi && name === 'action';
          return (
            <Tabs.Screen
              key={name}
              name={name}
              options={{
                title: isScanCenter ? '' : tabs[name].label,
                tabBarIcon: isScanCenter
                  ? ({ focused }) => <ScanCenterIcon focused={focused} />
                  : ({ color }) => <Feather name={tabs[name].icon as any} size={20} color={color} />,
                tabBarLabel: isScanCenter ? () => null : undefined,
                tabBarButton: isScanCenter
                  ? (props) => (
                      <Pressable
                        style={props.style}
                        onPress={props.onPress as any}
                        onLongPress={() => setDirectCamera(true)}
                        delayLongPress={350}
                      >
                        {props.children as React.ReactNode}
                      </Pressable>
                    )
                  : undefined,
              }}
            />
          );
        })}
      </Tabs>

      <SyncStatusBar />

      {/* Long-press direct camera — no scan tab UI shown */}
      {isSafaikarmi && (
        <CameraScanner
          visible={directCamera}
          onClose={() => setDirectCamera(false)}
        />
      )}
    </View>
  );
}
