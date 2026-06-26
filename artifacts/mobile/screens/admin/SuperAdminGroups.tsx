import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import type { Group, House, Ward } from '@/types';

const WARD_GRADS = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'],
  ['#F97316', '#EA580C'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
] as const;

const GROUP_COLORS = ['#10B981', '#0EA5E9', '#F97316', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#06B6D4'];

export default function SuperAdminGroups() {
  const { houses, wards, groups, assignGroupToHouses, removeGroupFromHouses } = useAppData();
  const colors = useColors();
  const { showAlert } = useAlert();

  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [search, setSearch] = useState('');
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<string>>(new Set());
  const [filterUngrouped, setFilterUngrouped] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const wardHouses = selectedWard
    ? houses.filter(h => {
        if (h.wardId !== selectedWard.id) return false;
        if (filterUngrouped && h.groupId) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            h.registrationNumber.toLowerCase().includes(q) ||
            h.ownerName.toLowerCase().includes(q) ||
            h.address.toLowerCase().includes(q)
          );
        }
        return true;
      })
    : [];

  const wardGroups = selectedWard ? groups.filter(g => g.wardId === selectedWard.id) : [];

  function toggleHouse(id: string) {
    setSelectedHouseIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedHouseIds.size === wardHouses.length) {
      setSelectedHouseIds(new Set());
    } else {
      setSelectedHouseIds(new Set(wardHouses.map(h => h.id)));
    }
  }

  async function handleAssignGroup(group: Group) {
    if (selectedHouseIds.size === 0) return;
    setAssigning(true);
    try {
      await assignGroupToHouses([...selectedHouseIds], group.id, group.name);
      showAlert('Assigned', `${selectedHouseIds.size} house(s) assigned to "${group.name}"`, undefined, 'success');
      setSelectedHouseIds(new Set());
      setShowGroupModal(false);
    } finally { setAssigning(false); }
  }

  async function handleRemoveGroup() {
    if (selectedHouseIds.size === 0) return;
    showAlert('Remove Group?', `Remove group from ${selectedHouseIds.size} house(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          await removeGroupFromHouses([...selectedHouseIds]);
          showAlert('Done', 'Group removed from selected houses.', undefined, 'success');
          setSelectedHouseIds(new Set());
        },
      },
    ], 'warning');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <LinearGradient colors={['#1a0533', '#0D1B4B']} style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={s.superBadge}>
              <Feather name="star" size={10} color="#FFD700" />
              <Text style={s.superBadgeText}>SUPER ADMIN</Text>
            </View>
            <Text style={s.headerTitle}>Group Assignment</Text>
            <Text style={s.headerSub}>Assign houses to groups by ward</Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="layers" size={22} color="#fff" />
          </View>
        </View>
      </LinearGradient>

      {/* Ward Pills */}
      <View style={[s.wardPillBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.wardLabel, { color: colors.mutedForeground }]}>Ward:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {wards.map((ward, idx) => {
            const active = selectedWard?.id === ward.id;
            const grad = WARD_GRADS[idx % WARD_GRADS.length];
            return (
              <TouchableOpacity
                key={ward.id}
                onPress={() => { setSelectedWard(active ? null : ward); setSelectedHouseIds(new Set()); setSearch(''); }}
                activeOpacity={0.8}
              >
                {active ? (
                  <LinearGradient colors={grad} style={s.wardPillActive}>
                    <Text style={s.wardPillActiveText}>W{ward.wardNumber}</Text>
                  </LinearGradient>
                ) : (
                  <View style={[s.wardPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[s.wardPillText, { color: colors.mutedForeground }]}>W{ward.wardNumber}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {!selectedWard ? (
        <View style={s.emptyCenter}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.emptyIcon}>
            <Feather name="map-pin" size={28} color="#fff" />
          </LinearGradient>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Select a Ward</Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Choose a ward above to assign houses to groups</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Filter & Search bar */}
          <View style={{ paddingHorizontal: 16, paddingTop: 14, gap: 10 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search houses..." />
            <View style={s.filterRow}>
              <TouchableOpacity
                style={[s.filterPill, filterUngrouped && { backgroundColor: '#F97316', borderColor: '#F97316' }, { borderColor: colors.border }]}
                onPress={() => setFilterUngrouped(p => !p)}
              >
                <Feather name="filter" size={12} color={filterUngrouped ? '#fff' : colors.mutedForeground} />
                <Text style={[s.filterPillText, { color: filterUngrouped ? '#fff' : colors.mutedForeground }]}>Ungrouped Only</Text>
              </TouchableOpacity>
              <Text style={[s.houseCount, { color: colors.mutedForeground }]}>
                {wardHouses.length} house{wardHouses.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Selection Bar */}
          {wardHouses.length > 0 && (
            <View style={[s.selectionBar, { backgroundColor: '#4F46E515', borderColor: '#4F46E530' }]}>
              <TouchableOpacity style={s.selectAllBtn} onPress={selectAll}>
                <View style={[s.checkbox, { borderColor: '#4F46E5' }, selectedHouseIds.size === wardHouses.length && { backgroundColor: '#4F46E5' }]}>
                  {selectedHouseIds.size === wardHouses.length && <Feather name="check" size={10} color="#fff" />}
                </View>
                <Text style={[s.selectAllText, { color: '#4F46E5' }]}>
                  {selectedHouseIds.size === wardHouses.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
              {selectedHouseIds.size > 0 && (
                <View style={s.selectionActions}>
                  <Text style={[s.selectedCount, { color: '#4F46E5' }]}>{selectedHouseIds.size} selected</Text>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}
                    onPress={handleRemoveGroup}
                  >
                    <Feather name="x-circle" size={13} color="#EF4444" />
                    <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }]}
                    onPress={() => setShowGroupModal(true)}
                  >
                    <Feather name="layers" size={13} color="#fff" />
                    <Text style={[s.actionBtnText, { color: '#fff' }]}>Assign</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 170, gap: 8, paddingTop: 10 }}>
            {wardHouses.map((h, idx) => {
              const isSelected = selectedHouseIds.has(h.id);
              const group = groups.find(g => g.id === h.groupId);
              const groupColor = group?.color || '#6B7280';
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[
                    s.houseCard,
                    { backgroundColor: colors.card, borderColor: isSelected ? '#4F46E5' : colors.border },
                    isSelected && { borderWidth: 1.5 },
                  ]}
                  onPress={() => toggleHouse(h.id)}
                  activeOpacity={0.85}
                >
                  <View style={[s.checkbox, { borderColor: isSelected ? '#4F46E5' : colors.border }, isSelected && { backgroundColor: '#4F46E5' }]}>
                    {isSelected && <Feather name="check" size={10} color="#fff" />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={s.houseCardTop}>
                      <Text style={[s.houseReg, { color: '#6366F1' }]}>{h.registrationNumber}</Text>
                      {h.groupId ? (
                        <View style={[s.groupChip, { backgroundColor: groupColor + '20', borderColor: groupColor + '40' }]}>
                          <View style={[s.groupChipDot, { backgroundColor: groupColor }]} />
                          <Text style={[s.groupChipText, { color: groupColor }]}>{h.groupName}</Text>
                        </View>
                      ) : (
                        <View style={[s.groupChip, { backgroundColor: '#F9731620', borderColor: '#F9731640' }]}>
                          <Text style={[s.groupChipText, { color: '#F97316' }]}>Ungrouped</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[s.houseOwner, { color: colors.text }]}>{h.ownerName}</Text>
                    <Text style={[s.houseAddr, { color: colors.mutedForeground }]} numberOfLines={1}>{h.address}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {wardHouses.length === 0 && (
              <View style={[s.empty, { backgroundColor: colors.card }]}>
                <Feather name="home" size={32} color={colors.mutedForeground} />
                <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>No houses found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Group Selection Modal */}
      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>Select Group</Text>
              <Text style={s.modalSub}>Assign {selectedHouseIds.size} house(s) to a group</Text>
            </View>
            <Pressable onPress={() => setShowGroupModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {wardGroups.length === 0 ? (
              <View style={[s.empty, { backgroundColor: colors.card }]}>
                <Feather name="layers" size={32} color={colors.mutedForeground} />
                <Text style={[s.emptyTitle, { color: colors.mutedForeground }]}>No groups in this ward</Text>
                <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Create groups in House DB tab first</Text>
              </View>
            ) : (
              wardGroups.map((g, idx) => {
                const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
                const count = houses.filter(h => h.groupId === g.id).length;
                return (
                  <TouchableOpacity
                    key={g.id}
                    style={[s.groupSelectCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => handleAssignGroup(g)}
                    disabled={assigning}
                    activeOpacity={0.85}
                  >
                    <View style={[s.groupColorDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.groupSelectName, { color: colors.text }]}>{g.name}</Text>
                      {g.description && <Text style={[s.groupSelectDesc, { color: colors.mutedForeground }]}>{g.description}</Text>}
                    </View>
                    <View style={[s.groupCountBadge, { backgroundColor: color + '20' }]}>
                      <Text style={[s.groupCountText, { color }]}>{count}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start' },
  superBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  superBadgeText: { color: '#FFD700', fontSize: 10, fontFamily: 'Inter_700Bold' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  headerSub: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF15', justifyContent: 'center', alignItems: 'center' },
  wardPillBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  wardLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wardPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  wardPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wardPillActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  wardPillActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  filterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  filterPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterPillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  houseCount: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 10 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  selectAllText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedCount: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  houseCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  houseCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  houseReg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  groupChipDot: { width: 5, height: 5, borderRadius: 3 },
  groupChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  houseOwner: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  houseAddr: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 12 },
  groupColorDot: { width: 14, height: 14, borderRadius: 7 },
  groupSelectCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupSelectName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  groupSelectDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  groupCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  groupCountText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSub: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
});
