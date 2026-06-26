import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SearchBar } from '@/components/SearchBar';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import type { Group, Ward } from '@/types';

const WARD_GRADS = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'],
  ['#F97316', '#EA580C'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
] as const;

const GROUP_COLORS = ['#10B981', '#0EA5E9', '#F97316', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#06B6D4'];

type ViewMode = 'groups' | 'houses';

export default function SuperAdminGroups() {
  const { houses, wards, groups, assignGroupToHouses, removeGroupFromHouses } = useAppData();
  const colors = useColors();
  const { showAlert } = useAlert();

  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('groups');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<Group | null>(null);
  const [showingUngrouped, setShowingUngrouped] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedHouseIds, setSelectedHouseIds] = useState<Set<string>>(new Set());
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const wardGroups = groups;

  const wardHouses = (() => {
    let list: typeof houses;
    if (selectedGroupFilter) {
      list = houses.filter(h => h.groupId === selectedGroupFilter.id);
    } else if (showingUngrouped && selectedWard) {
      list = houses.filter(h => h.wardId === selectedWard.id && !h.groupId);
    } else if (selectedWard) {
      list = houses.filter(h => h.wardId === selectedWard.id);
    } else {
      return [];
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(h =>
        h.registrationNumber.toLowerCase().includes(q) ||
        h.ownerName.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q)
      );
    }
    return list;
  })();

  function selectWard(ward: Ward) {
    setSelectedWard(ward);
    setViewMode('groups');
    setSelectedGroupFilter(null);
    setShowingUngrouped(false);
    setSelectedHouseIds(new Set());
    setSearch('');
  }

  function openGroup(group: Group) {
    setSelectedGroupFilter(group);
    setShowingUngrouped(false);
    setViewMode('houses');
    setSelectedHouseIds(new Set());
    setSearch('');
  }

  function openUngrouped() {
    setSelectedGroupFilter(null);
    setShowingUngrouped(true);
    setViewMode('houses');
    setSelectedHouseIds(new Set());
    setSearch('');
  }

  function goBackToGroups() {
    setViewMode('groups');
    setSelectedGroupFilter(null);
    setShowingUngrouped(false);
    setSelectedHouseIds(new Set());
    setSearch('');
  }

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

  const assignableGroups = selectedGroupFilter
    ? groups.filter(g => g.id !== selectedGroupFilter.id)
    : groups;

  const ungroupedCount = selectedWard
    ? houses.filter(h => h.wardId === selectedWard.id && !h.groupId).length
    : 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Ward Pills */}
      <View style={[s.wardPillBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.wardLabel, { color: colors.mutedForeground }]}>Ward:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          {wards.map((ward, idx) => {
            const active = selectedWard?.id === ward.id;
            const grad = WARD_GRADS[idx % WARD_GRADS.length];
            return (
              <TouchableOpacity key={ward.id} onPress={() => selectWard(ward)} activeOpacity={0.8}>
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
          <LinearGradient colors={['#10B981', '#059669']} style={s.emptyIcon}>
            <Feather name="layers" size={28} color="#fff" />
          </LinearGradient>
          <Text style={[s.emptyTitle, { color: colors.text }]}>Select a Ward</Text>
          <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Choose a ward above to view and manage groups</Text>
        </View>

      ) : viewMode === 'groups' ? (
        /* ── GROUP CARDS VIEW ── */
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
              All Groups · {wardGroups.length}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9731615', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Feather name="shuffle" size={10} color="#F97316" />
              <Text style={{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#F97316' }}>Cross-ward</Text>
            </View>
          </View>

          {wardGroups.length === 0 ? (
            <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="layers" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No Groups Yet</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Create groups using the House DB tab</Text>
            </View>
          ) : (
            wardGroups.map((g, idx) => {
              const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
              const count = houses.filter(h => h.groupId === g.id).length;
              return (
                <TouchableOpacity
                  key={g.id}
                  style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openGroup(g)}
                  activeOpacity={0.85}
                >
                  <View style={[s.groupColorBar, { backgroundColor: color }]} />
                  <View style={[s.groupIconBox, { backgroundColor: color + '20' }]}>
                    <Feather name="layers" size={20} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.groupName, { color: colors.text }]}>{g.name}</Text>
                    {g.description ? (
                      <Text style={[s.groupDesc, { color: colors.mutedForeground }]}>{g.description}</Text>
                    ) : null}
                  </View>
                  <View style={[s.countBadge, { backgroundColor: color + '20' }]}>
                    <Feather name="home" size={11} color={color} />
                    <Text style={[s.countBadgeText, { color }]}>{count}</Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
                </TouchableOpacity>
              );
            })
          )}

          {/* Ungrouped Houses card */}
          {ungroupedCount > 0 && (
            <TouchableOpacity
              style={[s.groupCard, { backgroundColor: colors.card, borderColor: '#F9731640' }]}
              onPress={openUngrouped}
              activeOpacity={0.85}
            >
              <View style={[s.groupColorBar, { backgroundColor: '#F97316' }]} />
              <View style={[s.groupIconBox, { backgroundColor: '#F9731620' }]}>
                <Feather name="alert-circle" size={20} color="#F97316" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.groupName, { color: colors.text }]}>Ungrouped Houses</Text>
                <Text style={[s.groupDesc, { color: colors.mutedForeground }]}>Houses not assigned to any group</Text>
              </View>
              <View style={[s.countBadge, { backgroundColor: '#F9731620' }]}>
                <Feather name="home" size={11} color="#F97316" />
                <Text style={[s.countBadgeText, { color: '#F97316' }]}>{ungroupedCount}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          )}
        </ScrollView>

      ) : (
        /* ── INGROUP HOUSE LIST VIEW ── */
        <View style={{ flex: 1 }}>
          {/* Header bar with back + group name */}
          <View style={[s.housesHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <TouchableOpacity style={s.backBtn} onPress={goBackToGroups} activeOpacity={0.7}>
              <Feather name="arrow-left" size={18} color="#6366F1" />
            </TouchableOpacity>
            {selectedGroupFilter ? (
              <View style={[s.groupChip, { backgroundColor: (selectedGroupFilter.color || '#6366F1') + '20' }]}>
                <View style={[s.groupChipDot, { backgroundColor: selectedGroupFilter.color || '#6366F1' }]} />
                <Text style={[s.groupChipText, { color: selectedGroupFilter.color || '#6366F1' }]}>
                  {selectedGroupFilter.name}
                </Text>
              </View>
            ) : showingUngrouped ? (
              <View style={[s.groupChip, { backgroundColor: '#F9731620' }]}>
                <View style={[s.groupChipDot, { backgroundColor: '#F97316' }]} />
                <Text style={[s.groupChipText, { color: '#F97316' }]}>Ungrouped Houses</Text>
              </View>
            ) : null}
            <Text style={[s.houseCountLabel, { color: colors.mutedForeground }]}>
              {wardHouses.length} house{wardHouses.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search houses..." />
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
                  {!showingUngrouped && (
                    <TouchableOpacity
                      style={[s.actionBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}
                      onPress={handleRemoveGroup}
                    >
                      <Feather name="x-circle" size={13} color="#EF4444" />
                      <Text style={[s.actionBtnText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }]}
                    onPress={() => setShowGroupModal(true)}
                  >
                    <Feather name="arrow-right-circle" size={13} color="#fff" />
                    <Text style={[s.actionBtnText, { color: '#fff' }]}>Move</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140, gap: 8, paddingTop: 10 }}>
            {wardHouses.map(h => {
              const isSelected = selectedHouseIds.has(h.id);
              const grp = groups.find(g => g.id === h.groupId);
              const groupColor = grp?.color || '#6B7280';
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
                        <View style={[s.groupSmallChip, { backgroundColor: groupColor + '20', borderColor: groupColor + '40' }]}>
                          <View style={[s.groupChipDot, { backgroundColor: groupColor }]} />
                          <Text style={[s.groupSmallChipText, { color: groupColor }]}>{h.groupName}</Text>
                        </View>
                      ) : (
                        <View style={[s.groupSmallChip, { backgroundColor: '#F9731620', borderColor: '#F9731640' }]}>
                          <Text style={[s.groupSmallChipText, { color: '#F97316' }]}>Ungrouped</Text>
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
              <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="home" size={32} color={colors.mutedForeground} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No houses found</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Move to Group Modal */}
      <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>{showingUngrouped ? 'Assign to Group' : 'Move to Group'}</Text>
              <Text style={s.modalSub}>{showingUngrouped ? `Assign ${selectedHouseIds.size} house(s) to a group` : `Move ${selectedHouseIds.size} house(s) to a different group`}</Text>
            </View>
            <Pressable onPress={() => setShowGroupModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {assignableGroups.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="layers" size={32} color={colors.mutedForeground} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No other groups available</Text>
                <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Create more groups in the House DB tab</Text>
              </View>
            ) : (
              assignableGroups.map((g, idx) => {
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
                      {g.description ? <Text style={[s.groupSelectDesc, { color: colors.mutedForeground }]}>{g.description}</Text> : null}
                    </View>
                    <View style={[s.countBadge, { backgroundColor: color + '20' }]}>
                      <Feather name="home" size={11} color={color} />
                      <Text style={[s.countBadgeText, { color }]}>{count}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  wardPillBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  wardLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wardPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  wardPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wardPillActive: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  wardPillActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },

  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  sectionLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },

  groupCard: { borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingRight: 14, paddingVertical: 14, gap: 12 },
  groupColorBar: { width: 4, alignSelf: 'stretch' },
  groupIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  groupDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  countBadgeText: { fontSize: 13, fontFamily: 'Inter_700Bold' },

  housesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6366F115' },
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  groupChipDot: { width: 8, height: 8, borderRadius: 4 },
  groupChipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  houseCountLabel: { marginLeft: 'auto', fontSize: 12, fontFamily: 'Inter_500Medium' },

  selectionBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 10 },
  selectAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  selectAllText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedCount: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  actionBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  houseCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  houseCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  houseReg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  groupSmallChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  groupSmallChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  houseOwner: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  houseAddr: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  groupSelectCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupColorDot: { width: 14, height: 14, borderRadius: 7 },
  groupSelectName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  groupSelectDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },

  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSub: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
});
