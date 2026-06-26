import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { Group, House, Ward } from '@/types';
import { PROPERTY_TYPES } from '@/types';

type View_ = 'wards' | 'groups' | 'houses';

const WARD_GRADS = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'],
  ['#F97316', '#EA580C'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
] as const;

const GROUP_COLORS = ['#10B981', '#0EA5E9', '#F97316', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#06B6D4'];

export default function SuperAdminHouseDB() {
  const { houses, wards, groups, users, addHouse, updateHouse, deleteHouse, addGroup, deleteGroup, addWard, updateWard, assignWorkerToWard } = useAppData();
  const { user } = useAuth();
  const colors = useColors();
  const { showAlert } = useAlert();

  const [view, setView] = useState<View_>('wards');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [showEditHouseModal, setShowEditHouseModal] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);

  const [houseForm, setHouseForm] = useState({ ownerName: '', fatherOrHusband: '', mobile: '', address: '', propertyType: 'Residential' as any });
  const [groupForm, setGroupForm] = useState({ name: '', description: '', color: GROUP_COLORS[0] });
  const [wardForm, setWardForm] = useState({ wardNumber: '', name: '', area: '' });
  const [showAddWardModal, setShowAddWardModal] = useState(false);
  const [showWorkerModal, setShowWorkerModal] = useState(false);
  const [workerModalWard, setWorkerModalWard] = useState<Ward | null>(null);
  const [workerSearch, setWorkerSearch] = useState('');
  const [savingWorker, setSavingWorker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const totalHouses = houses.length;
  const activeHouses = houses.filter(h => h.isActive).length;
  const ungroupedHouses = houses.filter(h => !h.groupId).length;

  function goToGroups(ward: Ward) {
    setSelectedWard(ward);
    setView('groups');
    setSearch('');
  }

  function goToHouses(group: Group | null) {
    setSelectedGroup(group);
    setView('houses');
    setSearch('');
    setExpandedHouseId(null);
  }

  function goBack() {
    if (view === 'houses') { setView('groups'); setExpandedHouseId(null); setSearch(''); }
    else if (view === 'groups') { setView('wards'); setSelectedWard(null); setSearch(''); }
  }

  const wardGroups = groups;

  const houseList = (() => {
    let list: House[];
    if (selectedGroup !== null) {
      list = houses.filter(h => h.groupId === selectedGroup.id);
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

  async function handleAddHouse() {
    if (!selectedWard) return;
    if (!houseForm.ownerName.trim() || !houseForm.address.trim()) {
      showAlert('Missing Fields', 'Owner name and address are required.', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      const regNum = `DNPH${Date.now().toString().slice(-6)}`;
      await addHouse({
        registrationNumber: regNum,
        ownerName: houseForm.ownerName.trim(),
        fatherOrHusband: houseForm.fatherOrHusband.trim() || undefined,
        mobile: houseForm.mobile.trim(),
        address: houseForm.address.trim(),
        wardId: selectedWard.id,
        wardNumber: selectedWard.wardNumber,
        groupId: selectedGroup?.id,
        groupName: selectedGroup?.name,
        propertyType: houseForm.propertyType,
        status: 'Active',
        isActive: true,
        createdBy: user?.name,
      });
      setHouseForm({ ownerName: '', fatherOrHusband: '', mobile: '', address: '', propertyType: 'Residential' });
      setShowAddHouseModal(false);
      showAlert('House Added', `Registration: ${regNum}`, undefined, 'success');
    } finally { setSaving(false); }
  }

  const safaikarmis = users.filter(u => u.role === 'safaikarmi' && u.isActive !== false);

  function openWorkerModal(ward: Ward) {
    setWorkerModalWard(ward);
    setWorkerSearch('');
    setShowWorkerModal(true);
  }

  async function handleAssignWorker(workerId: string) {
    if (!workerModalWard) return;
    setSavingWorker(true);
    try {
      await assignWorkerToWard(workerModalWard.id, workerId);
      setWorkerModalWard(prev => prev
        ? { ...prev, assignedWorkers: prev.assignedWorkers.includes(workerId) ? prev.assignedWorkers : [...prev.assignedWorkers, workerId] }
        : prev);
    } finally { setSavingWorker(false); }
  }

  async function handleRemoveWorker(workerId: string) {
    if (!workerModalWard) return;
    const newWorkers = workerModalWard.assignedWorkers.filter(id => id !== workerId);
    setSavingWorker(true);
    try {
      await updateWard(workerModalWard.id, { assignedWorkers: newWorkers });
      setWorkerModalWard(prev => prev ? { ...prev, assignedWorkers: newWorkers } : prev);
    } finally { setSavingWorker(false); }
  }

  async function handleAddWard() {
    if (!wardForm.wardNumber.trim() || !wardForm.name.trim()) {
      showAlert('Missing', 'Ward number and name are required.', undefined, 'warning');
      return;
    }
    if (wards.some(w => w.wardNumber === wardForm.wardNumber.trim())) {
      showAlert('Duplicate', `Ward ${wardForm.wardNumber} already exists.`, undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      await addWard({
        wardNumber: wardForm.wardNumber.trim(),
        name: wardForm.name.trim(),
        area: wardForm.area.trim() || wardForm.name.trim(),
        assignedWorkers: [],
        totalHouses: 0,
      });
      setWardForm({ wardNumber: '', name: '', area: '' });
      setShowAddWardModal(false);
      showAlert('Ward Created', wardForm.name.trim(), undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleAddGroup() {
    if (!groupForm.name.trim()) {
      showAlert('Missing', 'Group name is required.', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      await addGroup({
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        color: groupForm.color,
        createdAt: new Date().toISOString().split('T')[0],
        createdBy: user?.name,
      });
      setGroupForm({ name: '', description: '', color: GROUP_COLORS[0] });
      setShowAddGroupModal(false);
      showAlert('Group Created', groupForm.name.trim(), undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleDeleteGroup(g: Group) {
    const houseCount = houses.filter(h => h.groupId === g.id).length;
    showAlert(
      'Delete Group?',
      `"${g.name}" has ${houseCount} house(s). Houses will become ungrouped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(g.id) },
      ],
      'error'
    );
  }

  async function handleDeleteHouse(h: House) {
    showAlert('Delete House?', `${h.ownerName} — ${h.registrationNumber}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHouse(h.id) },
    ], 'error');
  }

  function openEditHouse(h: House) {
    setEditingHouse(h);
    setHouseForm({
      ownerName: h.ownerName,
      fatherOrHusband: h.fatherOrHusband || '',
      mobile: h.mobile,
      address: h.address,
      propertyType: h.propertyType || 'Residential',
    });
    setShowEditHouseModal(true);
  }

  async function handleSaveEditHouse() {
    if (!editingHouse) return;
    if (!houseForm.ownerName.trim() || !houseForm.address.trim()) {
      showAlert('Missing', 'Owner name and address required.', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateHouse(editingHouse.id, {
        ownerName: houseForm.ownerName.trim(),
        fatherOrHusband: houseForm.fatherOrHusband.trim() || undefined,
        mobile: houseForm.mobile.trim(),
        address: houseForm.address.trim(),
        propertyType: houseForm.propertyType,
      });
      setShowEditHouseModal(false);
      setEditingHouse(null);
      showAlert('Updated', 'House details saved.', undefined, 'success');
    } finally { setSaving(false); }
  }

  function buildCSV(list: House[]): string {
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['S.No', 'Registration No', 'Owner Name', 'Father/Husband', 'Ward No', 'Group', 'Address', 'Mobile', 'Property Type', 'Status', 'Added On'];
    const rows = list.map((h, i) => [
      String(i + 1),
      escape(h.registrationNumber),
      escape(h.ownerName),
      escape(h.fatherOrHusband || ''),
      escape(`Ward ${h.wardNumber}`),
      escape(h.groupName || 'Ungrouped'),
      escape(h.address),
      escape(h.mobile || ''),
      escape(h.propertyType || 'Residential'),
      escape(h.status || 'Active'),
      escape(h.createdAt || ''),
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  async function handleExportCSV() {
    if (houseList.length === 0) {
      showAlert('Nothing to Export', 'No houses match the current filter.', undefined, 'warning');
      return;
    }
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      showAlert('Not Supported', 'Sharing is not available on this device.', undefined, 'error');
      return;
    }
    setExporting(true);
    setShowExportModal(false);
    try {
      const csv = buildCSV(houseList);
      const ward = selectedWard ? `Ward${selectedWard.wardNumber}` : 'AllWards';
      const grp = selectedGroup ? `_${selectedGroup.name.replace(/\s+/g, '')}` : '';
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const filename = `HouseDB_${ward}${grp}_${date}.csv`;
      const path = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Export ${filename}`, UTI: 'public.comma-separated-values-text' });
    } catch (e: any) {
      showAlert('Export Failed', e?.message ?? 'Unknown error.', undefined, 'error');
    } finally {
      setExporting(false);
    }
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
            <Text style={s.headerTitle}>House Database</Text>
            <Text style={s.headerSub}>
              {totalHouses} total · {wards.length} wards · {groups.length} groups
            </Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="database" size={22} color="#fff" />
          </View>
        </View>
        <View style={s.statRow}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.statPill}>
            <Text style={s.statNum}>{totalHouses}</Text>
            <Text style={s.statLbl}>Total Houses</Text>
          </LinearGradient>
          <LinearGradient colors={['#10B981', '#059669']} style={s.statPill}>
            <Text style={s.statNum}>{activeHouses}</Text>
            <Text style={s.statLbl}>Active</Text>
          </LinearGradient>
          <LinearGradient colors={['#F97316', '#EA580C']} style={s.statPill}>
            <Text style={s.statNum}>{ungroupedHouses}</Text>
            <Text style={s.statLbl}>Ungrouped</Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Breadcrumb */}
      {view !== 'wards' && (
        <View style={[s.breadcrumb, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setView('wards'); setSelectedWard(null); setSelectedGroup(null); }}>
            <Text style={[s.breadcrumbLink, { color: '#6366F1' }]}>All Wards</Text>
          </TouchableOpacity>
          {selectedWard && (
            <>
              <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
              {view === 'groups' ? (
                <Text style={[s.breadcrumbCurrent, { color: colors.text }]}>Ward {selectedWard.wardNumber}</Text>
              ) : (
                <TouchableOpacity onPress={() => { setView('groups'); setSelectedGroup(null); }}>
                  <Text style={[s.breadcrumbLink, { color: '#6366F1' }]}>Ward {selectedWard.wardNumber}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
          {view === 'houses' && selectedGroup && (
            <>
              <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
              <Text style={[s.breadcrumbCurrent, { color: colors.text }]}>{selectedGroup.name}</Text>
            </>
          )}
          {view === 'houses' && !selectedGroup && (
            <>
              <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
              <Text style={[s.breadcrumbCurrent, { color: colors.text }]}>All Houses</Text>
            </>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={s.backBtn} onPress={goBack}>
            <Feather name="arrow-left" size={12} color="#6366F1" />
            <Text style={[s.backBtnText, { color: '#6366F1' }]}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── WARDS VIEW ── */}
      {view === 'wards' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 170 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={[s.sectionLabel, { color: '#6366F1' }]}>All Wards</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[s.actionChip, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}
                onPress={() => setShowAddGroupModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="layers" size={13} color="#10B981" />
                <Text style={[s.actionChipText, { color: '#10B981' }]}>Add Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.actionChip, { backgroundColor: '#4F46E515', borderColor: '#4F46E540' }]}
                onPress={() => setShowAddWardModal(true)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={13} color="#6366F1" />
                <Text style={[s.actionChipText, { color: '#6366F1' }]}>Add Ward</Text>
              </TouchableOpacity>
            </View>
          </View>
          {wards.map((ward, idx) => {
            const grad = WARD_GRADS[idx % WARD_GRADS.length];
            const wHouses = houses.filter(h => h.wardId === ward.id).length;
            const wWorkers = ward.assignedWorkers ?? [];
            const assignedWorkerUsers = safaikarmis.filter(u => wWorkers.includes(u.id));
            return (
              <View
                key={ward.id}
                style={[s.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <TouchableOpacity onPress={() => goToGroups(ward)} activeOpacity={0.85}>
                  <View style={s.wardRow}>
                    <LinearGradient colors={grad} style={s.wardBadge}>
                      <Text style={s.wardBadgeText}>W{ward.wardNumber}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.wardName, { color: colors.text }]}>{ward.name}</Text>
                      <Text style={[s.wardArea, { color: colors.mutedForeground }]}>{ward.area}</Text>
                    </View>
                    <View style={s.wardMeta}>
                      <View style={s.metaPill}>
                        <Feather name="home" size={10} color={colors.mutedForeground} />
                        <Text style={[s.metaText, { color: colors.mutedForeground }]}>{wHouses}</Text>
                      </View>
                      <View style={s.metaPill}>
                        <Feather name="users" size={10} color={colors.mutedForeground} />
                        <Text style={[s.metaText, { color: colors.mutedForeground }]}>{wWorkers.length}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Worker chips row */}
                <View style={s.workerChipRow}>
                  {assignedWorkerUsers.slice(0, 3).map(w => (
                    <View key={w.id} style={[s.workerChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View style={[s.workerAvatar, { backgroundColor: grad[0] + '30' }]}>
                        <Text style={[s.workerAvatarText, { color: grad[0] }]}>{w.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <Text style={[s.workerChipName, { color: colors.text }]} numberOfLines={1}>{w.name}</Text>
                    </View>
                  ))}
                  {assignedWorkerUsers.length > 3 && (
                    <View style={[s.workerChipMore, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={[s.workerChipMoreText, { color: colors.mutedForeground }]}>+{assignedWorkerUsers.length - 3}</Text>
                    </View>
                  )}
                  {assignedWorkerUsers.length === 0 && (
                    <Text style={[s.noWorkerText, { color: colors.mutedForeground }]}>No workers assigned</Text>
                  )}
                  <TouchableOpacity
                    style={[s.manageWorkersBtn, { backgroundColor: '#4F46E515', borderColor: '#4F46E540' }]}
                    onPress={() => openWorkerModal(ward)}
                    activeOpacity={0.8}
                  >
                    <Feather name="user-plus" size={12} color="#6366F1" />
                    <Text style={[s.manageWorkersBtnText, { color: '#6366F1' }]}>Manage</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
          {wards.length === 0 && (
            <View style={[s.empty, { backgroundColor: colors.card }]}>
              <Feather name="map" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No wards found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── GROUPS VIEW ── */}
      {view === 'groups' && selectedWard && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 170 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <Text style={[s.sectionLabel, { color: '#6366F1' }]}>
              All Groups · {groups.length}
            </Text>
            <View style={[s.crossWardBadge]}>
              <Feather name="shuffle" size={10} color="#F97316" />
              <Text style={s.crossWardText}>Cross-ward</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.allHousesCard, { backgroundColor: colors.card, borderColor: '#6366F1' }]}
            onPress={() => goToHouses(null)}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.groupIconBox}>
              <Feather name="grid" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={[s.groupName, { color: colors.text }]}>All Houses in Ward {selectedWard.wardNumber}</Text>
              <Text style={[s.groupDesc, { color: colors.mutedForeground }]}>
                {houses.filter(h => h.wardId === selectedWard.id).length} houses
              </Text>
            </View>
            <TouchableOpacity
              style={[s.addHouseBtn, { backgroundColor: '#6366F120', borderColor: '#6366F140' }]}
              onPress={() => setShowAddHouseModal(true)}
            >
              <Feather name="plus" size={14} color="#6366F1" />
              <Text style={[s.addHouseBtnText, { color: '#6366F1' }]}>Add</Text>
            </TouchableOpacity>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
          </TouchableOpacity>

          {wardGroups.map((g, idx) => {
            const count = houses.filter(h => h.groupId === g.id).length;
            const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
            return (
              <TouchableOpacity
                key={g.id}
                style={[s.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => goToHouses(g)}
                activeOpacity={0.85}
              >
                <View style={[s.groupIconBox, { backgroundColor: color }]}>
                  <Feather name="layers" size={18} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.groupName, { color: colors.text }]}>{g.name}</Text>
                  <Text style={[s.groupDesc, { color: colors.mutedForeground }]}>
                    {count} houses{g.description ? ` · ${g.description}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteGroup(g)} style={s.deleteGroupBtn}>
                  <Feather name="trash-2" size={14} color={colors.destructive} />
                </TouchableOpacity>
                <View style={[s.groupCountBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[s.groupCountText, { color }]}>{count}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            );
          })}

          {wardGroups.length === 0 && (
            <View style={[s.empty, { backgroundColor: colors.card }]}>
              <Feather name="layers" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No groups yet</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.addGroupBtn, { borderColor: '#6366F160' }]}
            onPress={() => setShowAddGroupModal(true)}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.addGroupBtnGrad}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={s.addGroupBtnText}>Add New Group</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ── HOUSES VIEW ── */}
      {view === 'houses' && selectedWard && (
        <View style={{ flex: 1 }}>
          <View style={[s.searchRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[s.searchBox, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search reg no, owner, address..."
                placeholderTextColor={colors.mutedForeground}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[s.exportBtn, { backgroundColor: exporting ? '#6366F130' : '#6366F120', borderColor: '#6366F150' }]}
              onPress={() => setShowExportModal(true)}
              disabled={exporting}
              activeOpacity={0.75}
            >
              {exporting
                ? <ActivityIndicator size={14} color="#6366F1" />
                : <Feather name="download-cloud" size={16} color="#6366F1" />}
            </TouchableOpacity>
          </View>

          {/* Column Headers */}
          <View style={[s.colHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <Text style={[s.colHeaderCell, { width: 40, color: colors.mutedForeground }]}>S.No</Text>
            <View style={[s.colDivider, { backgroundColor: colors.border }]} />
            <Text style={[s.colHeaderCell, { flex: 1, color: colors.mutedForeground }]}>Registration No</Text>
            <View style={[s.colDivider, { backgroundColor: colors.border }]} />
            <Text style={[s.colHeaderCell, { flex: 1.2, color: colors.mutedForeground }]}>Owner Name</Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingBottom: 170 }}>
            {houseList.map((h, idx) => {
              const isExpanded = expandedHouseId === h.id;
              return (
                <View key={h.id}>
                  <TouchableOpacity
                    style={[s.houseRow, { borderBottomColor: colors.border, backgroundColor: isExpanded ? '#6366F108' : colors.background }]}
                    onPress={() => setExpandedHouseId(isExpanded ? null : h.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[s.houseCell, { width: 40, color: colors.mutedForeground }]}>{idx + 1}</Text>
                    <View style={[s.colDivider, { backgroundColor: colors.border }]} />
                    <View style={[s.houseCellFlex, { flex: 1 }]}>
                      <View style={s.regDot} />
                      <Text style={[s.regText, { color: '#6366F1' }]}>{h.registrationNumber}</Text>
                    </View>
                    <View style={[s.colDivider, { backgroundColor: colors.border }]} />
                    <View style={[s.houseCellFlex, { flex: 1.2 }]}>
                      <Text style={[s.ownerText, { color: colors.text }]} numberOfLines={1}>{h.ownerName}</Text>
                      <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.mutedForeground} />
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={[s.houseDetail, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                      <View style={s.detailHeader}>
                        <Text style={[s.detailTitle, { color: colors.text }]}>{h.ownerName}</Text>
                        <View style={s.detailActions}>
                          <TouchableOpacity style={[s.detailAction, { backgroundColor: '#6366F120' }]} onPress={() => openEditHouse(h)}>
                            <Feather name="edit-2" size={13} color="#6366F1" />
                          </TouchableOpacity>
                          <TouchableOpacity style={[s.detailAction, { backgroundColor: '#EF444420' }]} onPress={() => handleDeleteHouse(h)}>
                            <Feather name="trash-2" size={13} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={s.detailGrid}>
                        {[
                          { icon: 'hash', label: 'Registration No', value: h.registrationNumber },
                          { icon: 'user', label: 'Owner Name', value: h.ownerName },
                          { icon: 'users', label: 'Father/Husband', value: h.fatherOrHusband || '—' },
                          { icon: 'map-pin', label: 'Ward', value: `Ward ${h.wardNumber}` },
                          { icon: 'layers', label: 'Group', value: h.groupName || 'Ungrouped' },
                          { icon: 'home', label: 'Address', value: h.address },
                          { icon: 'phone', label: 'Mobile', value: h.mobile || '—' },
                          { icon: 'tag', label: 'Property Type', value: h.propertyType || '—' },
                          { icon: 'activity', label: 'Status', value: h.status || 'Active' },
                        ].map(row => (
                          <View key={row.label} style={[s.detailRow, { borderBottomColor: colors.border }]}>
                            <View style={s.detailLabelWrap}>
                              <Feather name={row.icon as any} size={12} color={colors.mutedForeground} />
                              <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                            </View>
                            <Text style={[s.detailValue, { color: colors.text }]}>{row.value}</Text>
                          </View>
                        ))}
                        {h.createdAt && (
                          <View style={[s.detailRow, { borderBottomColor: colors.border }]}>
                            <View style={s.detailLabelWrap}>
                              <Feather name="calendar" size={12} color={colors.mutedForeground} />
                              <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>Added On</Text>
                            </View>
                            <Text style={[s.detailValue, { color: colors.text }]}>{h.createdAt}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })}

            {houseList.length === 0 && (
              <View style={[s.empty, { backgroundColor: colors.card, margin: 16 }]}>
                <Feather name="home" size={32} color={colors.mutedForeground} />
                <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No houses found</Text>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={s.fab} onPress={() => setShowAddHouseModal(true)}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.fabGrad}>
              <Feather name="plus" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ADD HOUSE MODAL ── */}
      <Modal visible={showAddHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Add House</Text>
            <Pressable onPress={() => setShowAddHouseModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Owner Name *', key: 'ownerName', placeholder: 'Ram Prasad' },
              { label: 'Father / Husband Name', key: 'fatherOrHusband', placeholder: 'Shiv Prasad' },
              { label: 'Mobile', key: 'mobile', placeholder: '9876543210', keyboard: 'phone-pad' },
              { label: 'Address *', key: 'address', placeholder: 'Ward 1, Near Temple...' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(houseForm as any)[f.key]}
                  onChangeText={v => setHouseForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Property Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROPERTY_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt}
                  style={[s.typePill, houseForm.propertyType === pt && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }, { borderColor: colors.border }]}
                  onPress={() => setHouseForm(p => ({ ...p, propertyType: pt }))}
                >
                  <Text style={[s.typePillText, { color: houseForm.propertyType === pt ? '#fff' : colors.mutedForeground }]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleAddHouse} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Add House'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── EDIT HOUSE MODAL ── */}
      <Modal visible={showEditHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Edit House</Text>
            <Pressable onPress={() => setShowEditHouseModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Owner Name *', key: 'ownerName', placeholder: 'Ram Prasad' },
              { label: 'Father / Husband Name', key: 'fatherOrHusband', placeholder: 'Shiv Prasad' },
              { label: 'Mobile', key: 'mobile', placeholder: '9876543210', keyboard: 'phone-pad' },
              { label: 'Address *', key: 'address', placeholder: 'Ward 1, Near Temple...' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={(houseForm as any)[f.key]}
                  onChangeText={v => setHouseForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Property Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROPERTY_TYPES.map(pt => (
                <TouchableOpacity
                  key={pt}
                  style={[s.typePill, houseForm.propertyType === pt && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }, { borderColor: colors.border }]}
                  onPress={() => setHouseForm(p => ({ ...p, propertyType: pt }))}
                >
                  <Text style={[s.typePillText, { color: houseForm.propertyType === pt ? '#fff' : colors.mutedForeground }]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleSaveEditHouse} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── EXPORT PREVIEW MODAL ── */}
      <Modal visible={showExportModal} animationType="fade" transparent>
        <View style={s.exportOverlay}>
          <View style={[s.exportSheet, { backgroundColor: colors.card }]}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.exportHeader}>
              <View style={s.exportHeaderRow}>
                <View style={s.exportHeaderIcon}>
                  <Feather name="download-cloud" size={20} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.exportTitle}>Export CSV</Text>
                  <Text style={s.exportSubtitle}>House Database</Text>
                </View>
                <Pressable onPress={() => setShowExportModal(false)} style={s.closeBtn}>
                  <Feather name="x" size={18} color="#fff" />
                </Pressable>
              </View>
            </LinearGradient>

            <View style={{ padding: 20, gap: 14 }}>
              {/* Scope info */}
              <View style={[s.exportScopeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[s.exportScopeLabel, { color: colors.mutedForeground }]}>Exporting from</Text>
                <View style={s.exportScopeRow}>
                  <Feather name="map-pin" size={13} color="#6366F1" />
                  <Text style={[s.exportScopeValue, { color: colors.text }]}>
                    Ward {selectedWard?.wardNumber} — {selectedWard?.name}
                  </Text>
                </View>
                {selectedGroup && (
                  <View style={s.exportScopeRow}>
                    <Feather name="layers" size={13} color="#10B981" />
                    <Text style={[s.exportScopeValue, { color: colors.text }]}>{selectedGroup.name}</Text>
                  </View>
                )}
                {search.trim().length > 0 && (
                  <View style={s.exportScopeRow}>
                    <Feather name="filter" size={13} color="#F97316" />
                    <Text style={[s.exportScopeValue, { color: colors.text }]}>Filter: "{search}"</Text>
                  </View>
                )}
              </View>

              {/* Count pill */}
              <View style={[s.exportCountPill, { backgroundColor: '#6366F115' }]}>
                <Feather name="home" size={14} color="#6366F1" />
                <Text style={[s.exportCountText, { color: '#6366F1' }]}>
                  {houseList.length} house{houseList.length !== 1 ? 's' : ''} will be exported
                </Text>
              </View>

              {/* Column preview */}
              <Text style={[s.exportColTitle, { color: colors.mutedForeground }]}>COLUMNS INCLUDED</Text>
              <View style={s.exportColGrid}>
                {['S.No', 'Registration No', 'Owner Name', 'Father/Husband', 'Ward No', 'Group', 'Address', 'Mobile', 'Property Type', 'Status', 'Added On'].map(col => (
                  <View key={col} style={[s.exportColChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Feather name="check" size={10} color="#10B981" />
                    <Text style={[s.exportColChipText, { color: colors.text }]}>{col}</Text>
                  </View>
                ))}
              </View>

              {/* Format note */}
              <View style={[s.exportNote, { backgroundColor: '#0EA5E915', borderColor: '#0EA5E930' }]}>
                <Feather name="info" size={12} color="#0EA5E9" />
                <Text style={[s.exportNoteText, { color: colors.mutedForeground }]}>
                  Saved as <Text style={{ color: '#0EA5E9', fontFamily: 'Inter_600SemiBold' }}>.csv</Text> — opens in Excel, Google Sheets, or any spreadsheet app.
                </Text>
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[s.exportCancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowExportModal(false)}
                >
                  <Text style={[s.exportCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={handleExportCSV} activeOpacity={0.85} disabled={houseList.length === 0}>
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.exportConfirmBtn}>
                    <Feather name="download" size={16} color="#fff" />
                    <Text style={s.exportConfirmText}>Export &amp; Share</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── WORKER ASSIGNMENT MODAL ── */}
      <Modal visible={showWorkerModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>Worker Assignment</Text>
              <Text style={[s.modalSub, { color: '#FFFFFFAA' }]}>
                Ward {workerModalWard?.wardNumber} — {workerModalWard?.name}
              </Text>
            </View>
            <Pressable onPress={() => setShowWorkerModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
            {/* Currently assigned */}
            <View>
              <Text style={[s.workerSectionTitle, { color: colors.mutedForeground }]}>
                ASSIGNED ({workerModalWard?.assignedWorkers.length ?? 0})
              </Text>
              {(workerModalWard?.assignedWorkers ?? []).length === 0 ? (
                <View style={[s.workerEmptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="users" size={22} color={colors.mutedForeground} />
                  <Text style={[s.workerEmptyText, { color: colors.mutedForeground }]}>No workers assigned yet</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {(workerModalWard?.assignedWorkers ?? []).map(wid => {
                    const w = safaikarmis.find(u => u.id === wid);
                    if (!w) return null;
                    return (
                      <View key={wid} style={[s.workerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[s.workerAvatarLg, { backgroundColor: '#4F46E520' }]}>
                          <Text style={[s.workerAvatarLgText, { color: '#6366F1' }]}>{w.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.workerRowName, { color: colors.text }]}>{w.name}</Text>
                          <Text style={[s.workerRowId, { color: colors.mutedForeground }]}>{w.id} · {w.mobile || '—'}</Text>
                        </View>
                        <View style={[s.workerStatusBadge, { backgroundColor: '#10B98115' }]}>
                          <Feather name="check-circle" size={11} color="#10B981" />
                          <Text style={[s.workerStatusText, { color: '#10B981' }]}>Assigned</Text>
                        </View>
                        <TouchableOpacity
                          style={[s.workerRemoveBtn, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]}
                          onPress={() => handleRemoveWorker(wid)}
                          disabled={savingWorker}
                          activeOpacity={0.8}
                        >
                          <Feather name="user-minus" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Search + available workers */}
            <View>
              <Text style={[s.workerSectionTitle, { color: colors.mutedForeground }]}>ADD WORKERS</Text>
              <View style={[s.workerSearchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="search" size={14} color={colors.mutedForeground} />
                <TextInput
                  style={[s.workerSearchInput, { color: colors.text }]}
                  placeholder="Search by name or ID..."
                  placeholderTextColor={colors.mutedForeground}
                  value={workerSearch}
                  onChangeText={setWorkerSearch}
                />
                {workerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setWorkerSearch('')}>
                    <Feather name="x" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={{ gap: 8, marginTop: 10 }}>
                {safaikarmis
                  .filter(u => {
                    const isAssigned = workerModalWard?.assignedWorkers.includes(u.id);
                    if (isAssigned) return false;
                    if (!workerSearch.trim()) return true;
                    const q = workerSearch.toLowerCase();
                    return u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q);
                  })
                  .map(w => {
                    const otherWard = wards.find(wd => wd.assignedWorkers.includes(w.id) && wd.id !== workerModalWard?.id);
                    return (
                      <View key={w.id} style={[s.workerRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[s.workerAvatarLg, { backgroundColor: '#10B98120' }]}>
                          <Text style={[s.workerAvatarLgText, { color: '#10B981' }]}>{w.name.charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.workerRowName, { color: colors.text }]}>{w.name}</Text>
                          <Text style={[s.workerRowId, { color: colors.mutedForeground }]}>
                            {w.id}{otherWard ? ` · Also W${otherWard.wardNumber}` : ''}
                          </Text>
                        </View>
                        {otherWard && (
                          <View style={[s.workerStatusBadge, { backgroundColor: '#F9731615' }]}>
                            <Feather name="alert-circle" size={11} color="#F97316" />
                            <Text style={[s.workerStatusText, { color: '#F97316' }]}>W{otherWard.wardNumber}</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[s.workerAddBtn, { backgroundColor: '#4F46E5' }]}
                          onPress={() => handleAssignWorker(w.id)}
                          disabled={savingWorker}
                          activeOpacity={0.8}
                        >
                          <Feather name="user-plus" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                {safaikarmis.filter(u => !workerModalWard?.assignedWorkers.includes(u.id)).length === 0 && (
                  <View style={[s.workerEmptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name="check-circle" size={22} color="#10B981" />
                    <Text style={[s.workerEmptyText, { color: colors.mutedForeground }]}>All workers assigned</Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── ADD WARD MODAL ── */}
      <Modal visible={showAddWardModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Add Ward</Text>
            <Pressable onPress={() => setShowAddWardModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Ward Number *</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 5"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              value={wardForm.wardNumber}
              onChangeText={v => setWardForm(p => ({ ...p, wardNumber: v }))}
            />
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Ward Name *</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Qila Mohalla"
              placeholderTextColor={colors.mutedForeground}
              value={wardForm.name}
              onChangeText={v => setWardForm(p => ({ ...p, name: v }))}
            />
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Area / Locality</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Near Daudnagar Chowk"
              placeholderTextColor={colors.mutedForeground}
              value={wardForm.area}
              onChangeText={v => setWardForm(p => ({ ...p, area: v }))}
            />
            <TouchableOpacity onPress={handleAddWard} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Creating…' : 'Create Ward'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── ADD GROUP MODAL ── */}
      <Modal visible={showAddGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#10B981', '#059669']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Create Group</Text>
            <Pressable onPress={() => setShowAddGroupModal(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Group Name *</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Main Market"
              placeholderTextColor={colors.mutedForeground}
              value={groupForm.name}
              onChangeText={v => setGroupForm(p => ({ ...p, name: v }))}
            />
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
            <TextInput
              style={[s.fieldInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Near main market area..."
              placeholderTextColor={colors.mutedForeground}
              value={groupForm.description}
              onChangeText={v => setGroupForm(p => ({ ...p, description: v }))}
            />
            <Text style={[s.fieldLabel, { color: colors.mutedForeground }]}>Color</Text>
            <View style={s.colorRow}>
              {GROUP_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[s.colorDot, { backgroundColor: c }, groupForm.color === c && s.colorDotSelected]}
                  onPress={() => setGroupForm(p => ({ ...p, color: c }))}
                />
              ))}
            </View>
            <TouchableOpacity onPress={handleAddGroup} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981', '#059669']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Creating…' : 'Create Group'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  superBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  superBadgeText: { color: '#FFD700', fontSize: 10, fontFamily: 'Inter_700Bold' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  headerSub: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF15', justifyContent: 'center', alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLbl: { color: '#FFFFFFCC', fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  breadcrumbLink: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  breadcrumbCurrent: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#6366F115' },
  backBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 2 },
  wardCard: { borderRadius: 16, borderWidth: 1, padding: 14, overflow: 'hidden' },
  wardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wardBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  wardBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  wardName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  wardArea: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  wardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  allHousesCard: { borderRadius: 16, borderWidth: 1.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  groupIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupName: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  groupDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  groupCountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  groupCountText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  deleteGroupBtn: { padding: 6 },
  addGroupBtn: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  addGroupBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, justifyContent: 'center' },
  addGroupBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  addHouseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  addHouseBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  exportBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  exportOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  exportSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  exportHeader: { padding: 20 },
  exportHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  exportHeaderIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
  exportTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  exportSubtitle: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  exportScopeBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  exportScopeLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  exportScopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportScopeValue: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  exportCountPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  exportCountText: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  exportColTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase' },
  exportColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  exportColChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  exportColChipText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  exportNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  exportNoteText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  exportCancelBtn: { flex: 1, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  exportCancelText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  exportConfirmBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  exportConfirmText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  colHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  colHeaderCell: { fontSize: 12, fontFamily: 'Inter_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  colDivider: { width: 1, height: 14, marginHorizontal: 8 },
  houseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  houseCell: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  houseCellFlex: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1' },
  regText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  ownerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  houseDetail: { padding: 16, borderBottomWidth: 1 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  detailTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  detailActions: { flexDirection: 'row', gap: 8 },
  detailAction: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  detailGrid: { gap: 0 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  detailLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  fab: { position: 'absolute', bottom: 125, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: 'Inter_400Regular' },
  typePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: 'transparent' },
  typePillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  colorRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorDotSelected: { borderWidth: 3, borderColor: '#fff' },
  saveBtn: { borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  actionChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  crossWardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9731615', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  crossWardText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#F97316' },
  workerChipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 10, paddingHorizontal: 2, borderTopWidth: 1, borderTopColor: '#FFFFFF08', marginTop: 8 },
  workerChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8, paddingVertical: 3, paddingLeft: 3, borderRadius: 20, borderWidth: 1 },
  workerAvatar: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  workerAvatarText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  workerChipName: { fontSize: 11, fontFamily: 'Inter_500Medium', maxWidth: 72 },
  workerChipMore: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  workerChipMoreText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  noWorkerText: { fontSize: 11, fontFamily: 'Inter_400Regular', fontStyle: 'italic' },
  manageWorkersBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, marginLeft: 'auto' },
  manageWorkersBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  modalSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  workerSectionTitle: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  workerEmptyBox: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  workerEmptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, padding: 12 },
  workerAvatarLg: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  workerAvatarLgText: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  workerRowName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  workerRowId: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  workerStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  workerStatusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  workerRemoveBtn: { width: 32, height: 32, borderRadius: 10, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  workerAddBtn: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  workerSearchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  workerSearchInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular' },
});
