import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import SuperAdminHouseDB from './SuperAdminHouseDB';
import SuperAdminImport from './SuperAdminImport';
import SuperAdminGroups from './SuperAdminGroups';

type InnerTab = 'housedb' | 'import' | 'groups';

const TABS: { key: InnerTab; label: string; icon: string; grad: readonly [string, string] }[] = [
  { key: 'housedb', label: 'House DB', icon: 'database', grad: ['#4F46E5', '#7C3AED'] },
  { key: 'import', label: 'Import', icon: 'upload-cloud', grad: ['#0EA5E9', '#0284C7'] },
  { key: 'groups', label: 'Groups', icon: 'layers', grad: ['#10B981', '#059669'] },
];

export default function SuperAdminHouseMain({ embedded = false }: { embedded?: boolean }) {
  const [tab, setTab] = useState<InnerTab>('housedb');
  const colors = useColors();
  const activeTab = TABS.find(t => t.key === tab)!;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {tab === 'housedb' && <SuperAdminHouseDB />}
      {tab === 'import' && <SuperAdminImport />}
      {tab === 'groups' && <SuperAdminGroups />}

      {/* Bottom inner tab bar */}
      <View style={[s.innerTabBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={s.innerTab}
              onPress={() => setTab(t.key)}
              activeOpacity={0.7}
            >
              <View style={[s.innerTabIcon, active && { backgroundColor: t.grad[0] + '20' }]}>
                <Feather
                  name={t.icon as any}
                  size={18}
                  color={active ? t.grad[0] : colors.mutedForeground}
                />
              </View>
              <Text style={[s.innerTabLabel, { color: active ? t.grad[0] : colors.mutedForeground, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {t.label}
              </Text>
              {active && <View style={[s.innerTabUnderline, { backgroundColor: t.grad[0] }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  innerTabBar: {
    position: 'absolute',
    bottom: 62,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 6,
    paddingTop: 6,
    zIndex: 10,
  },
  innerTab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    position: 'relative',
    paddingBottom: 4,
  },
  innerTabIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerTabLabel: {
    fontSize: 10,
  },
  innerTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 2,
    borderRadius: 1,
  },
});
