import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import type { Group, House, Ward } from '@/types';
import { PROPERTY_TYPES } from '@/types';

// ─── Glass Design Tokens ──────────────────────────────────────────────
const BG        = '#060B18';
const GLASS     = 'rgba(255,255,255,0.07)';
const GLASS_HI  = 'rgba(255,255,255,0.12)';
const GLASS_BD  = 'rgba(255,255,255,0.13)';
const TEXT      = '#F0F4FF';
const MUTED     = 'rgba(255,255,255,0.45)';
const MUTED2    = 'rgba(255,255,255,0.25)';

type View_ = 'wards' | 'groups' | 'houses';
type InnerSegment = 'db' | 'groups';

const WARD_GRADS: readonly [string, string][] = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'],
  ['#F97316', '#EA580C'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#6D28D9'],
];

const GROUP_COLORS = ['#10B981','#0EA5E9','#F97316','#8B5CF6','#EC4899','#EF4444','#F59E0B','#06B6D4'];

export default function SuperAdminHouseDB() {
  const {
    houses, wards, groups, users,
    addHouse, updateHouse, deleteHouse,
    addGroup, updateGroup, deleteGroup,
    addWard, updateWard, deleteWard,
    assignWorkerToWard, assignGroupToHouses, removeGroupFromHouses,
    syncStatus,
  } = useAppData();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  // ── Navigation state ──────────────────────────────────────────────
  const [view, setView]                   = useState<View_>('wards');
  const [segment, setSegment]             = useState<InnerSegment>('db');
  const [selectedWard, setSelectedWard]   = useState<Ward | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [expandedHouseId, setExpandedHouseId] = useState<string | null>(null);
  const [search, setSearch]               = useState('');
  const [globalSearch, setGlobalSearch]   = useState('');

  // ── Groups segment state ───────────────────────────────────────────
  const [grpWard, setGrpWard]             = useState<Ward | null>(null);
  const [grpGroupFilter, setGrpGroupFilter] = useState<Group | null>(null);
  const [grpShowUngrouped, setGrpShowUngrouped] = useState(false);
  const [grpViewMode, setGrpViewMode]     = useState<'cards' | 'houses'>('cards');
  const [grpSearch, setGrpSearch]         = useState('');
  const [grpSelectedIds, setGrpSelectedIds] = useState<Set<string>>(new Set());
  const [showGrpAssignModal, setShowGrpAssignModal] = useState(false);
  const [assigning, setAssigning]         = useState(false);

  // ── Modal state ────────────────────────────────────────────────────
  const [showAddHouseModal, setShowAddHouseModal]   = useState(false);
  const [showAddGroupModal, setShowAddGroupModal]   = useState(false);
  const [showEditHouseModal, setShowEditHouseModal] = useState(false);
  const [showAddWardModal, setShowAddWardModal]     = useState(false);
  const [showWorkerModal, setShowWorkerModal]       = useState(false);
  const [showEditWardModal, setShowEditWardModal]   = useState(false);
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [showMoveModal, setShowMoveModal]           = useState(false);
  const [showExportModal, setShowExportModal]       = useState(false);

  // ── Form state ─────────────────────────────────────────────────────
  const [editingHouse, setEditingHouse]   = useState<House | null>(null);
  const [houseForm, setHouseForm]         = useState({ ownerName: '', fatherOrHusband: '', mobile: '', address: '', propertyType: 'Residential' as any });
  const [groupForm, setGroupForm]         = useState({ name: '', description: '', color: GROUP_COLORS[0] });
  const [wardForm, setWardForm]           = useState({ wardNumber: '', name: '', area: '' });
  const [workerModalWard, setWorkerModalWard] = useState<Ward | null>(null);
  const [workerSearch, setWorkerSearch]   = useState('');
  const [editingWard, setEditingWard]     = useState<Ward | null>(null);
  const [editWardForm, setEditWardForm]   = useState({ name: '', area: '' });
  const [editingGroup, setEditingGroup]   = useState<Group | null>(null);
  const [editGroupForm, setEditGroupForm] = useState({ name: '', description: '' });
  const [moveWardId, setMoveWardId]       = useState<string>('');
  const [moveGroupId, setMoveGroupId]     = useState<string | null>(null);

  // ── Selection (DB tab) ─────────────────────────────────────────────
  const [selectionMode, setSelectionMode]       = useState(false);
  const [selectedHouseIds, setSelectedHouseIds] = useState<string[]>([]);

  // ── Loading state ──────────────────────────────────────────────────
  const [savingWorker, setSavingWorker] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [exporting, setExporting]       = useState(false);

  // ── Sync pulse ────────────────────────────────────────────────────
  const syncPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (syncStatus === 'pending') {
      Animated.loop(Animated.sequence([
        Animated.timing(syncPulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(syncPulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])).start();
    } else {
      syncPulse.stopAnimation();
      Animated.timing(syncPulse, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    }
  }, [syncStatus]);

  // ── Derived stats ─────────────────────────────────────────────────
  const totalHouses    = houses.length;
  const activeHouses   = houses.filter(h => h.isActive).length;
  const ungroupedHouses = houses.filter(h => !h.groupId).length;

  // ── Global search across all wards ────────────────────────────────
  const globalResults = (() => {
    const q = globalSearch.trim().toLowerCase();
    if (q.length < 2) return [];
    return houses.filter(h =>
      h.registrationNumber.toLowerCase().includes(q) ||
      h.ownerName.toLowerCase().includes(q) ||
      (h.fatherOrHusband || '').toLowerCase().includes(q) ||
      h.address.toLowerCase().includes(q) ||
      (h.mobile || '').includes(q)
    );
  })();

  // ── DB Tab – navigation helpers ───────────────────────────────────
  function goToGroups(ward: Ward) { setSelectedWard(ward); setView('groups'); setSearch(''); setGlobalSearch(''); }
  function goToHouses(group: Group | null) { setSelectedGroup(group); setView('houses'); setSearch(''); setExpandedHouseId(null); }
  function goBack() {
    if (view === 'houses') { setView('groups'); setExpandedHouseId(null); setSearch(''); exitSelectionMode(); }
    else if (view === 'groups') { setView('wards'); setSelectedWard(null); setSearch(''); }
  }

  function exitSelectionMode() { setSelectionMode(false); setSelectedHouseIds([]); }
  function toggleHouseSelection(id: string) {
    setSelectedHouseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function openMoveModal() {
    setMoveWardId(selectedWard?.id ?? wards[0]?.id ?? '');
    setMoveGroupId(null);
    setShowMoveModal(true);
  }

  // ── Groups Segment helpers ─────────────────────────────────────────
  function grpSelectWard(ward: Ward) {
    setGrpWard(ward); setGrpViewMode('cards'); setGrpGroupFilter(null);
    setGrpShowUngrouped(false); setGrpSelectedIds(new Set()); setGrpSearch('');
  }
  function grpOpenGroup(g: Group) {
    setGrpGroupFilter(g); setGrpShowUngrouped(false); setGrpViewMode('houses');
    setGrpSelectedIds(new Set()); setGrpSearch('');
  }
  function grpOpenUngrouped() {
    setGrpGroupFilter(null); setGrpShowUngrouped(true); setGrpViewMode('houses');
    setGrpSelectedIds(new Set()); setGrpSearch('');
  }
  function grpGoBack() {
    setGrpViewMode('cards'); setGrpGroupFilter(null);
    setGrpShowUngrouped(false); setGrpSelectedIds(new Set()); setGrpSearch('');
  }
  function grpToggle(id: string) {
    setGrpSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function grpSelectAll(list: House[]) {
    setGrpSelectedIds(prev => prev.size === list.length ? new Set() : new Set(list.map(h => h.id)));
  }

  const grpHouseList = (() => {
    if (!grpWard) return [];
    let list = grpGroupFilter
      ? houses.filter(h => h.groupId === grpGroupFilter.id)
      : grpShowUngrouped
        ? houses.filter(h => h.wardId === grpWard.id && !h.groupId)
        : [];
    if (grpSearch.trim()) {
      const q = grpSearch.toLowerCase();
      list = list.filter(h =>
        h.registrationNumber.toLowerCase().includes(q) ||
        h.ownerName.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q)
      );
    }
    return list;
  })();

  const grpUngroupedCount = grpWard ? houses.filter(h => h.wardId === grpWard.id && !h.groupId).length : 0;
  const grpAssignable = grpGroupFilter ? groups.filter(g => g.id !== grpGroupFilter.id) : groups;

  async function grpHandleAssign(g: Group) {
    if (grpSelectedIds.size === 0) return;
    setAssigning(true);
    try {
      await assignGroupToHouses([...grpSelectedIds], g.id, g.name);
      showAlert('Assigned', `${grpSelectedIds.size} house(s) assigned to "${g.name}"`, undefined, 'success');
      setGrpSelectedIds(new Set()); setShowGrpAssignModal(false);
    } finally { setAssigning(false); }
  }
  async function grpHandleRemove() {
    if (grpSelectedIds.size === 0) return;
    showAlert('Remove Group?', `Remove group from ${grpSelectedIds.size} house(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
          await removeGroupFromHouses([...grpSelectedIds]);
          showAlert('Done', 'Group removed.', undefined, 'success');
          setGrpSelectedIds(new Set());
        },
      },
    ], 'warning');
  }

  // ── House CRUD ────────────────────────────────────────────────────
  const houseList = (() => {
    let list: House[] = selectedGroup !== null
      ? houses.filter(h => h.groupId === selectedGroup.id)
      : selectedWard ? houses.filter(h => h.wardId === selectedWard.id) : [];
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
      showAlert('Missing Fields', 'Owner name and address are required.', undefined, 'warning'); return;
    }
    setSaving(true);
    try {
      const regNum = `DNPH${Date.now().toString().slice(-6)}`;
      await addHouse({
        registrationNumber: regNum, ownerName: houseForm.ownerName.trim(),
        fatherOrHusband: houseForm.fatherOrHusband.trim() || undefined,
        mobile: houseForm.mobile.trim(), address: houseForm.address.trim(),
        wardId: selectedWard.id, wardNumber: selectedWard.wardNumber,
        groupId: selectedGroup?.id, groupName: selectedGroup?.name,
        propertyType: houseForm.propertyType, status: 'Active', isActive: true, createdBy: user?.name,
      });
      setHouseForm({ ownerName: '', fatherOrHusband: '', mobile: '', address: '', propertyType: 'Residential' });
      setShowAddHouseModal(false);
      showAlert('House Added', `Registration: ${regNum}`, undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleSaveEditHouse() {
    if (!editingHouse) return;
    if (!houseForm.ownerName.trim() || !houseForm.address.trim()) {
      showAlert('Missing', 'Owner name and address required.', undefined, 'warning'); return;
    }
    setSaving(true);
    try {
      await updateHouse(editingHouse.id, {
        ownerName: houseForm.ownerName.trim(),
        fatherOrHusband: houseForm.fatherOrHusband.trim() || undefined,
        mobile: houseForm.mobile.trim(), address: houseForm.address.trim(),
        propertyType: houseForm.propertyType,
      });
      setShowEditHouseModal(false); setEditingHouse(null);
      showAlert('Updated', 'House details saved.', undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleDeleteHouse(h: House) {
    showAlert('Delete House?', `${h.ownerName} — ${h.registrationNumber}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHouse(h.id) },
    ], 'error');
  }

  function openEditHouse(h: House) {
    setEditingHouse(h);
    setHouseForm({ ownerName: h.ownerName, fatherOrHusband: h.fatherOrHusband || '', mobile: h.mobile, address: h.address, propertyType: h.propertyType || 'Residential' });
    setShowEditHouseModal(true);
  }

  // ── Ward CRUD ─────────────────────────────────────────────────────
  async function handleAddWard() {
    if (!wardForm.wardNumber.trim() || !wardForm.name.trim()) {
      showAlert('Missing', 'Ward number and name are required.', undefined, 'warning'); return;
    }
    if (wards.some(w => w.wardNumber === wardForm.wardNumber.trim())) {
      showAlert('Duplicate', `Ward ${wardForm.wardNumber} already exists.`, undefined, 'warning'); return;
    }
    setSaving(true);
    try {
      await addWard({ wardNumber: wardForm.wardNumber.trim(), name: wardForm.name.trim(), area: wardForm.area.trim() || wardForm.name.trim(), assignedWorkers: [], totalHouses: 0 });
      setWardForm({ wardNumber: '', name: '', area: '' }); setShowAddWardModal(false);
      showAlert('Ward Created', wardForm.name.trim(), undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleSaveEditWard() {
    if (!editingWard || !editWardForm.name.trim()) {
      showAlert('Missing', 'Ward name is required.', undefined, 'warning'); return;
    }
    setSaving(true);
    try {
      await updateWard(editingWard.id, { name: editWardForm.name.trim(), area: editWardForm.area.trim() || editWardForm.name.trim() });
      setShowEditWardModal(false); setEditingWard(null);
      showAlert('Updated', 'Ward details saved.', undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleDeleteWard(ward: Ward) {
    const wHouses = houses.filter(h => h.wardId === ward.id).length;
    if (wHouses > 0) {
      showAlert('Cannot Delete', `Ward ${ward.wardNumber} has ${wHouses} house(s). Remove all houses first.`, undefined, 'warning'); return;
    }
    showAlert('Delete Ward?', `Ward ${ward.wardNumber} — "${ward.name}" will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWard(ward.id) },
    ], 'error');
  }

  function openEditWard(ward: Ward) {
    setEditingWard(ward); setEditWardForm({ name: ward.name, area: ward.area || '' }); setShowEditWardModal(true);
  }

  // ── Group CRUD ────────────────────────────────────────────────────
  async function handleAddGroup() {
    if (!groupForm.name.trim()) { showAlert('Missing', 'Group name is required.', undefined, 'warning'); return; }
    setSaving(true);
    try {
      await addGroup({ name: groupForm.name.trim(), description: groupForm.description.trim(), color: groupForm.color, createdAt: new Date().toISOString().split('T')[0], createdBy: user?.name });
      setGroupForm({ name: '', description: '', color: GROUP_COLORS[0] }); setShowAddGroupModal(false);
      showAlert('Group Created', groupForm.name.trim(), undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleSaveEditGroup() {
    if (!editingGroup || !editGroupForm.name.trim()) { showAlert('Missing', 'Group name is required.', undefined, 'warning'); return; }
    setSaving(true);
    try {
      await updateGroup(editingGroup.id, { name: editGroupForm.name.trim(), description: editGroupForm.description.trim() });
      setShowEditGroupModal(false); setEditingGroup(null);
      showAlert('Updated', 'Group details saved.', undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleDeleteGroup(g: Group) {
    const count = houses.filter(h => h.groupId === g.id).length;
    showAlert('Delete Group?', `"${g.name}" has ${count} house(s). Houses will become ungrouped.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(g.id) },
    ], 'error');
  }

  function openEditGroup(g: Group) {
    setEditingGroup(g); setEditGroupForm({ name: g.name, description: g.description || '' }); setShowEditGroupModal(true);
  }

  // ── Worker assignment ─────────────────────────────────────────────
  const safaikarmis = users.filter(u => u.role === 'safaikarmi' && u.isActive !== false);

  function openWorkerModal(ward: Ward) { setWorkerModalWard(ward); setWorkerSearch(''); setShowWorkerModal(true); }

  async function handleAssignWorker(workerId: string) {
    if (!workerModalWard) return;
    setSavingWorker(true);
    try {
      await assignWorkerToWard(workerModalWard.id, workerId);
      setWorkerModalWard(prev => prev ? { ...prev, assignedWorkers: prev.assignedWorkers.includes(workerId) ? prev.assignedWorkers : [...prev.assignedWorkers, workerId] } : prev);
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

  // ── Move houses ───────────────────────────────────────────────────
  async function handleMoveHouses() {
    if (selectedHouseIds.length === 0) return;
    setSaving(true);
    try {
      const targetWard  = wards.find(w => w.id === moveWardId);
      const targetGroup = moveGroupId ? groups.find(g => g.id === moveGroupId) : null;
      const isCrossWard = targetWard && targetWard.id !== selectedWard?.id;
      if (isCrossWard || moveGroupId === null) {
        await Promise.all(selectedHouseIds.map(id => updateHouse(id, {
          wardId: targetWard?.id ?? selectedWard?.id, wardNumber: targetWard?.wardNumber ?? selectedWard?.wardNumber,
          groupId: targetGroup?.id, groupName: targetGroup?.name,
        })));
      } else if (targetGroup) {
        await assignGroupToHouses(selectedHouseIds, targetGroup.id, targetGroup.name);
      }
      setShowMoveModal(false); exitSelectionMode();
      showAlert('Done', `${selectedHouseIds.length} house(s) moved successfully.`, undefined, 'success');
    } catch { showAlert('Error', 'Failed to move houses.', undefined, 'error'); }
    finally { setSaving(false); }
  }

  async function handleUngroupSelected() {
    if (selectedHouseIds.length === 0) return;
    showAlert('Ungroup Houses?', `Remove ${selectedHouseIds.length} house(s) from their group?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Ungroup', style: 'destructive', onPress: async () => {
          setSaving(true);
          try { await removeGroupFromHouses(selectedHouseIds); exitSelectionMode(); showAlert('Done', 'Houses ungrouped.', undefined, 'success'); }
          finally { setSaving(false); }
        },
      },
    ], 'warning');
  }

  // ── Export CSV ────────────────────────────────────────────────────
  function buildCSV(list: House[]): string {
    const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const headers = ['S.No','Registration No','Owner Name','Father/Husband','Ward No','Group','Address','Mobile','Property Type','Status','Added On'];
    const rows = list.map((h, i) => [
      String(i+1), escape(h.registrationNumber), escape(h.ownerName), escape(h.fatherOrHusband||''),
      escape(`Ward ${h.wardNumber}`), escape(h.groupName||'Ungrouped'), escape(h.address),
      escape(h.mobile||''), escape(h.propertyType||'Residential'), escape(h.status||'Active'), escape(h.createdAt||''),
    ].join(','));
    return [headers.join(','), ...rows].join('\n');
  }

  async function handleExportCSV() {
    if (houseList.length === 0) { showAlert('Nothing to Export', 'No houses match the current filter.', undefined, 'warning'); return; }
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { showAlert('Not Supported', 'Sharing is not available on this device.', undefined, 'error'); return; }
    setExporting(true); setShowExportModal(false);
    try {
      const csv = buildCSV(houseList);
      const ward = selectedWard ? `Ward${selectedWard.wardNumber}` : 'AllWards';
      const grp  = selectedGroup ? `_${selectedGroup.name.replace(/\s+/g,'')}` : '';
      const date = new Date().toISOString().slice(0,10).replace(/-/g,'');
      const filename = `HouseDB_${ward}${grp}_${date}.csv`;
      const path = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: `Export ${filename}`, UTI: 'public.comma-separated-values-text' });
    } catch (e: any) { showAlert('Export Failed', e?.message ?? 'Unknown error.', undefined, 'error'); }
    finally { setExporting(false); }
  }

  // ─────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────
  const syncColor = syncStatus === 'synced' ? '#34D399' : syncStatus === 'pending' ? '#FBBF24' : '#F87171';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>

      {/* ── SEGMENT BAR: DB / Groups ─────────────────────────────────── */}
      <View style={s.segBar}>
        {([
          { key: 'db',     label: 'Database',   icon: 'database', color: '#6366F1' },
          { key: 'groups', label: 'Groups',      icon: 'layers',   color: '#10B981' },
        ] as const).map(seg => {
          const active = segment === seg.key;
          return (
            <TouchableOpacity
              key={seg.key}
              style={[s.segBtn, active && { backgroundColor: seg.color + '20', borderColor: seg.color + '50' }]}
              onPress={() => setSegment(seg.key)}
              activeOpacity={0.7}
            >
              <Feather name={seg.icon as any} size={14} color={active ? seg.color : MUTED} />
              <Text style={[s.segLabel, { color: active ? seg.color : MUTED, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {seg.label}
              </Text>
              {active && <View style={[s.segUnderline, { backgroundColor: seg.color }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ═══════════════════════════════════════════════════════════════
           DATABASE SEGMENT
         ═══════════════════════════════════════════════════════════════ */}
      {segment === 'db' && (
        <>
          {/* Breadcrumb */}
          {view !== 'wards' && (
            <View style={s.breadcrumb}>
              <TouchableOpacity onPress={() => { setView('wards'); setSelectedWard(null); setSelectedGroup(null); }}>
                <Text style={[s.breadLink, { color: '#6366F1' }]}>All Wards</Text>
              </TouchableOpacity>
              {selectedWard && (
                <>
                  <Feather name="chevron-right" size={11} color={MUTED} />
                  {view === 'groups' ? (
                    <Text style={[s.breadCur, { color: TEXT }]}>Ward {selectedWard.wardNumber}</Text>
                  ) : (
                    <TouchableOpacity onPress={() => { setView('groups'); setSelectedGroup(null); }}>
                      <Text style={[s.breadLink, { color: '#6366F1' }]}>Ward {selectedWard.wardNumber}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
              {view === 'houses' && (
                <>
                  <Feather name="chevron-right" size={11} color={MUTED} />
                  <Text style={[s.breadCur, { color: TEXT }]}>{selectedGroup?.name ?? 'All Houses'}</Text>
                </>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity style={s.backBtn} onPress={goBack}>
                <Feather name="arrow-left" size={11} color="#6366F1" />
                <Text style={[s.backBtnText, { color: '#6366F1' }]}>Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── WARDS VIEW ──────────────────────────────────────────── */}
          {view === 'wards' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 180 }}>
              {/* Global Search Bar */}
              <View style={[s.searchBox, { marginBottom: 2 }]}>
                <Feather name="search" size={15} color={MUTED} />
                <TextInput
                  style={[s.searchInput, { color: TEXT, flex: 1 }]}
                  placeholder="Search all houses — reg no, owner, mobile…"
                  placeholderTextColor={MUTED}
                  value={globalSearch}
                  onChangeText={setGlobalSearch}
                />
                {globalSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setGlobalSearch('')}>
                    <Feather name="x" size={14} color={MUTED} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Global search results */}
              {globalSearch.trim().length >= 2 && (
                <View style={{ gap: 6 }}>
                  <Text style={[s.sectionLabel, { color: MUTED, fontSize: 11 }]}>
                    {globalResults.length} result{globalResults.length !== 1 ? 's' : ''} found
                  </Text>
                  {globalResults.length === 0 ? (
                    <View style={[s.emptyCard, { paddingVertical: 20 }]}>
                      <Feather name="search" size={22} color={MUTED} />
                      <Text style={[s.emptyTitle, { color: TEXT }]}>No Houses Found</Text>
                      <Text style={[s.emptySub, { color: MUTED }]}>Try a different search term</Text>
                    </View>
                  ) : (
                    globalResults.map(h => {
                      const ward = wards.find(w => w.id === h.wardId);
                      return (
                        <View key={h.id} style={[s.globalResultCard]}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                            <View style={s.globalResultDot} />
                            <View style={{ flex: 1 }}>
                              <Text style={[s.regText, { color: '#818CF8' }]}>{h.registrationNumber}</Text>
                              <Text style={[s.ownerText, { color: TEXT }]} numberOfLines={1}>{h.ownerName}</Text>
                              <Text style={[s.wardArea, { color: MUTED, fontSize: 10 }]} numberOfLines={1}>
                                Ward {h.wardNumber}{ward ? ` · ${ward.name}` : ''}{h.groupName ? ` · ${h.groupName}` : ''}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[s.iconBtn, { backgroundColor: '#6366F118', borderColor: '#6366F130' }]}
                            onPress={() => {
                              if (ward) { goToGroups(ward); }
                            }}
                          >
                            <Feather name="arrow-right" size={12} color="#6366F1" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* Compact sticky info bar — shown when not searching */}
              {globalSearch.trim().length < 2 && (
                <View style={s.infoBar}>
                  {/* Stats pills */}
                  <View style={s.infoBarStats}>
                    <View style={s.infoBarPill}>
                      <Feather name="home" size={10} color="#818CF8" />
                      <Text style={s.infoBarNum}>{totalHouses}</Text>
                      <Text style={s.infoBarLbl}>Houses</Text>
                    </View>
                    <View style={[s.infoBarDivider]} />
                    <View style={s.infoBarPill}>
                      <Feather name="check-circle" size={10} color="#34D399" />
                      <Text style={[s.infoBarNum, { color: '#34D399' }]}>{activeHouses}</Text>
                      <Text style={s.infoBarLbl}>Active</Text>
                    </View>
                    <View style={[s.infoBarDivider]} />
                    <View style={s.infoBarPill}>
                      <Feather name="map-pin" size={10} color="#22D3EE" />
                      <Text style={[s.infoBarNum, { color: '#22D3EE' }]}>{wards.length}</Text>
                      <Text style={s.infoBarLbl}>Wards</Text>
                    </View>
                  </View>
                  {/* Sync status */}
                  <Animated.View style={[s.infoBarSync, { opacity: syncPulse }]}>
                    <View style={[s.infoBarSyncDot, { backgroundColor: syncColor }]} />
                    <Text style={[s.infoBarSyncTxt, { color: syncColor }]}>
                      {syncStatus === 'synced' ? 'Synced' : syncStatus === 'pending' ? 'Syncing…' : 'Error'}
                    </Text>
                  </Animated.View>
                </View>
              )}

              {/* Action row — shown when not searching */}
              {globalSearch.trim().length < 2 && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={s.sectionLabel}>All Wards</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[s.actionChip, { borderColor: '#10B98145', backgroundColor: '#10B98112' }]} onPress={() => setShowAddGroupModal(true)} activeOpacity={0.8}>
                      <Feather name="layers" size={12} color="#10B981" />
                      <Text style={[s.actionChipText, { color: '#10B981' }]}>Add Group</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionChip, { borderColor: '#6366F145', backgroundColor: '#6366F112' }]} onPress={() => setShowAddWardModal(true)} activeOpacity={0.8}>
                      <Feather name="map-pin" size={12} color="#6366F1" />
                      <Text style={[s.actionChipText, { color: '#6366F1' }]}>Add Ward</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {globalSearch.trim().length < 2 && wards.map((ward, idx) => {
                const grad = WARD_GRADS[idx % WARD_GRADS.length];
                const wHouses = houses.filter(h => h.wardId === ward.id).length;
                const wWorkers = ward.assignedWorkers ?? [];
                return (
                  <View key={ward.id} style={s.wardCard}>
                    <LinearGradient colors={[grad[0]+'18', grad[1]+'0A']} style={StyleSheet.absoluteFill} />
                    <TouchableOpacity onPress={() => goToGroups(ward)} activeOpacity={0.85} style={s.wardRow}>
                      <LinearGradient colors={grad} style={s.wardBadge}>
                        <Text style={s.wardBadgeText}>W{ward.wardNumber}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.wardName, { color: TEXT }]} numberOfLines={1}>{ward.name}</Text>
                        <Text style={[s.wardArea, { color: MUTED }]} numberOfLines={1}>{ward.area}</Text>
                      </View>
                      <View style={s.wardMetaRow}>
                        <View style={s.metaPill}>
                          <Feather name="home" size={9} color={MUTED} />
                          <Text style={[s.metaText, { color: MUTED }]}>{wHouses}</Text>
                        </View>
                        <View style={s.metaPill}>
                          <Feather name="users" size={9} color={MUTED} />
                          <Text style={[s.metaText, { color: MUTED }]}>{wWorkers.length}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                    <View style={s.wardActions}>
                      <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#6366F118', borderColor: '#6366F130' }]} onPress={() => openWorkerModal(ward)}>
                        <Feather name="user-plus" size={12} color="#6366F1" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#10B98118', borderColor: '#10B98130' }]} onPress={() => openEditWard(ward)}>
                        <Feather name="edit-2" size={12} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#EF444418', borderColor: '#EF444430' }]} onPress={() => handleDeleteWard(ward)}>
                        <Feather name="trash-2" size={12} color="#EF4444" />
                      </TouchableOpacity>
                      <Feather name="chevron-right" size={13} color={MUTED} />
                    </View>
                  </View>
                );
              })}

              {globalSearch.trim().length < 2 && wards.length === 0 && (
                <View style={s.emptyCard}>
                  <LinearGradient colors={['#4F46E530','#7C3AED20']} style={s.emptyIcon}>
                    <Feather name="map" size={28} color="#7C3AED" />
                  </LinearGradient>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Wards Yet</Text>
                  <Text style={[s.emptySub, { color: MUTED }]}>Tap "Add Ward" to get started</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* ── GROUPS VIEW ─────────────────────────────────────────── */}
          {view === 'groups' && selectedWard && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 180 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={s.sectionLabel}>Groups · {groups.length}</Text>
                <View style={[s.crossBadge]}>
                  <Feather name="shuffle" size={9} color="#F97316" />
                  <Text style={s.crossBadgeText}>Cross-ward</Text>
                </View>
              </View>

              {/* All Houses card */}
              <TouchableOpacity style={s.allHousesCard} onPress={() => goToHouses(null)} activeOpacity={0.85}>
                <LinearGradient colors={['#4F46E520','#7C3AED12']} style={StyleSheet.absoluteFill} />
                <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.groupIconBox}>
                  <Feather name="grid" size={14} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.groupName, { color: TEXT }]}>All Houses · Ward {selectedWard.wardNumber}</Text>
                  <Text style={[s.groupDesc, { color: MUTED }]}>{houses.filter(h => h.wardId === selectedWard.id).length} houses</Text>
                </View>
                <TouchableOpacity style={s.addHouseChip} onPress={() => setShowAddHouseModal(true)}>
                  <Feather name="plus" size={10} color="#6366F1" />
                  <Text style={[s.addHouseChipText]}>Add</Text>
                </TouchableOpacity>
                <Feather name="chevron-right" size={13} color={MUTED} />
              </TouchableOpacity>

              {groups.map((g, idx) => {
                const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
                const count = houses.filter(h => h.groupId === g.id).length;
                return (
                  <View key={g.id} style={[s.groupCard, { borderColor: color + '35' }]}>
                    <LinearGradient colors={[color + '18', color + '08']} style={StyleSheet.absoluteFill} />
                    <TouchableOpacity style={s.groupCardMain} onPress={() => goToHouses(g)} activeOpacity={0.85}>
                      <View style={[s.groupDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.groupName, { color: TEXT }]} numberOfLines={1}>{g.name}</Text>
                        {g.description ? <Text style={[s.groupDesc, { color: MUTED }]} numberOfLines={1}>{g.description}</Text> : null}
                      </View>
                      <View style={[s.countBadge, { backgroundColor: color + '22', borderColor: color + '35' }]}>
                        <Feather name="home" size={9} color={color} />
                        <Text style={[s.countBadgeText, { color }]}>{count}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={s.wardActions}>
                      <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#10B98118', borderColor: '#10B98130' }]} onPress={() => openEditGroup(g)}>
                        <Feather name="edit-2" size={12} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.iconBtn, { backgroundColor: '#EF444418', borderColor: '#EF444430' }]} onPress={() => handleDeleteGroup(g)}>
                        <Feather name="trash-2" size={12} color="#EF4444" />
                      </TouchableOpacity>
                      <Feather name="chevron-right" size={13} color={MUTED} />
                    </View>
                  </View>
                );
              })}

              {groups.length === 0 && (
                <View style={s.emptyCard}>
                  <LinearGradient colors={['#10B98130','#05966920']} style={s.emptyIcon}>
                    <Feather name="layers" size={28} color="#10B981" />
                  </LinearGradient>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Groups Yet</Text>
                  <Text style={[s.emptySub, { color: MUTED }]}>Create a group using the button below</Text>
                </View>
              )}

              <TouchableOpacity onPress={() => setShowAddGroupModal(true)} activeOpacity={0.85} style={s.addGroupBtn}>
                <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.addGroupBtnGrad}>
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={s.addGroupBtnText}>Add New Group</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* ── HOUSES VIEW ─────────────────────────────────────────── */}
          {view === 'houses' && selectedWard && (
            <View style={{ flex: 1 }}>
              {/* Search + Export row */}
              <View style={s.searchRow}>
                <View style={[s.searchBox, { flex: 1 }]}>
                  <Feather name="search" size={15} color={MUTED} />
                  <TextInput
                    style={[s.searchInput, { color: TEXT }]}
                    placeholder="Search reg no, owner, address…"
                    placeholderTextColor={MUTED}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                      <Feather name="x" size={14} color={MUTED} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[s.exportBtn, { opacity: exporting ? 0.6 : 1 }]}
                  onPress={() => setShowExportModal(true)}
                  disabled={exporting}
                >
                  <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.exportBtnGrad}>
                    {exporting ? <ActivityIndicator size={13} color="#fff" /> : <Feather name="download-cloud" size={15} color="#fff" />}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Column headers */}
              <View style={s.colHeader}>
                <Text style={[s.colCell, { width: 38, color: MUTED }]}>S.No</Text>
                <View style={s.colDivider} />
                <Text style={[s.colCell, { flex: 1, color: MUTED }]}>Registration No</Text>
                <View style={s.colDivider} />
                <Text style={[s.colCell, { flex: 1.3, color: MUTED }]}>Owner Name</Text>
              </View>

              {/* Selection bar */}
              {selectionMode && (
                <View style={s.selBar}>
                  <TouchableOpacity onPress={exitSelectionMode} style={s.selBarCancel}>
                    <Feather name="x" size={15} color={MUTED} />
                  </TouchableOpacity>
                  <Text style={[s.selBarCount, { color: TEXT }]}>{selectedHouseIds.length} selected</Text>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity style={[s.selAction, { backgroundColor: '#F9731618', borderColor: '#F9731635' }]} onPress={handleUngroupSelected} disabled={selectedHouseIds.length === 0}>
                    <Feather name="link-2" size={13} color="#F97316" />
                    <Text style={[s.selActionText, { color: '#F97316' }]}>Ungroup</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.selAction, { backgroundColor: '#6366F118', borderColor: '#6366F135' }]} onPress={openMoveModal} disabled={selectedHouseIds.length === 0}>
                    <Feather name="move" size={13} color="#6366F1" />
                    <Text style={[s.selActionText, { color: '#6366F1' }]}>Move</Text>
                  </TouchableOpacity>
                </View>
              )}

              <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
                {houseList.map((h, idx) => {
                  const isExpanded = expandedHouseId === h.id && !selectionMode;
                  const isSelected = selectedHouseIds.includes(h.id);
                  return (
                    <View key={h.id}>
                      <TouchableOpacity
                        style={[s.houseRow, isSelected && { backgroundColor: '#6366F115' }, isExpanded && { backgroundColor: '#6366F10A' }]}
                        onPress={() => selectionMode ? toggleHouseSelection(h.id) : setExpandedHouseId(isExpanded ? null : h.id)}
                        onLongPress={() => { if (!selectionMode) { setSelectionMode(true); setExpandedHouseId(null); } toggleHouseSelection(h.id); }}
                        activeOpacity={0.8}
                      >
                        {selectionMode
                          ? <View style={[s.checkbox, { borderColor: isSelected ? '#6366F1' : GLASS_BD, backgroundColor: isSelected ? '#6366F1' : 'transparent' }]}>
                              {isSelected && <Feather name="check" size={10} color="#fff" />}
                            </View>
                          : <Text style={[s.houseIdx, { width: 38 }]}>{idx + 1}</Text>
                        }
                        <View style={s.colDivider} />
                        <View style={[s.houseCellFlex, { flex: 1 }]}>
                          <View style={[s.regDot, { backgroundColor: '#6366F1' }]} />
                          <Text style={[s.regText, { color: '#818CF8' }]}>{h.registrationNumber}</Text>
                        </View>
                        <View style={s.colDivider} />
                        <View style={[s.houseCellFlex, { flex: 1.3 }]}>
                          <Text style={[s.ownerText, { color: TEXT }]} numberOfLines={1}>{h.ownerName}</Text>
                          {!selectionMode && <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={MUTED} />}
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={s.houseDetail}>
                          <View style={s.detailHeader}>
                            <Text style={[s.detailTitle, { color: TEXT }]}>{h.ownerName}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <TouchableOpacity style={[s.detailAction, { backgroundColor: '#6366F120', borderColor: '#6366F135' }]} onPress={() => openEditHouse(h)}>
                                <Feather name="edit-2" size={13} color="#6366F1" />
                              </TouchableOpacity>
                              <TouchableOpacity style={[s.detailAction, { backgroundColor: '#EF444420', borderColor: '#EF444435' }]} onPress={() => handleDeleteHouse(h)}>
                                <Feather name="trash-2" size={13} color="#EF4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                          {[
                            { icon: 'hash', label: 'Registration', value: h.registrationNumber },
                            { icon: 'user', label: 'Owner', value: h.ownerName },
                            { icon: 'users', label: 'Father/Husband', value: h.fatherOrHusband || '—' },
                            { icon: 'map-pin', label: 'Ward', value: `Ward ${h.wardNumber}` },
                            { icon: 'layers', label: 'Group', value: h.groupName || 'Ungrouped' },
                            { icon: 'home', label: 'Address', value: h.address },
                            { icon: 'phone', label: 'Mobile', value: h.mobile || '—' },
                            { icon: 'tag', label: 'Property Type', value: h.propertyType || '—' },
                            { icon: 'activity', label: 'Status', value: h.status || 'Active' },
                          ].map(row => (
                            <View key={row.label} style={s.detailRow}>
                              <View style={s.detailLabelWrap}>
                                <Feather name={row.icon as any} size={11} color={MUTED} />
                                <Text style={[s.detailLabel, { color: MUTED }]}>{row.label}</Text>
                              </View>
                              <Text style={[s.detailValue, { color: TEXT }]}>{row.value}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {houseList.length === 0 && (
                  <View style={[s.emptyCard, { margin: 16 }]}>
                    <LinearGradient colors={['#6366F120','#7C3AED10']} style={s.emptyIcon}>
                      <Feather name="home" size={28} color="#6366F1" />
                    </LinearGradient>
                    <Text style={[s.emptyTitle, { color: TEXT }]}>No Houses Found</Text>
                    <Text style={[s.emptySub, { color: MUTED }]}>Add a house using the + button</Text>
                  </View>
                )}
              </ScrollView>

              {/* FAB */}
              <TouchableOpacity style={s.fab} onPress={() => setShowAddHouseModal(true)} activeOpacity={0.85}>
                <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.fabGrad}>
                  <Feather name="plus" size={24} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           GROUPS SEGMENT
         ═══════════════════════════════════════════════════════════════ */}
      {segment === 'groups' && (
        <View style={{ flex: 1 }}>
          {/* Ward pill bar */}
          <View style={s.wardPillBar}>
            <Text style={[s.wardPillLabel, { color: MUTED }]}>Ward</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
              {wards.map((ward, idx) => {
                const active = grpWard?.id === ward.id;
                const grad = WARD_GRADS[idx % WARD_GRADS.length];
                return (
                  <TouchableOpacity key={ward.id} onPress={() => grpSelectWard(ward)} activeOpacity={0.8}>
                    {active
                      ? <LinearGradient colors={grad} style={s.wardPillActive}><Text style={s.wardPillActiveText}>W{ward.wardNumber}</Text></LinearGradient>
                      : <View style={s.wardPill}><Text style={[s.wardPillText, { color: MUTED }]}>W{ward.wardNumber}</Text></View>
                    }
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {!grpWard ? (
            <View style={s.emptyCenter}>
              <LinearGradient colors={['#10B98130','#05966920']} style={s.emptyIcon}>
                <Feather name="layers" size={30} color="#10B981" />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: TEXT }]}>Select a Ward</Text>
              <Text style={[s.emptySub, { color: MUTED }]}>Choose a ward above to view and manage groups</Text>
            </View>

          ) : grpViewMode === 'cards' ? (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 180 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <Text style={s.sectionLabel}>All Groups · {groups.length}</Text>
                <View style={s.crossBadge}>
                  <Feather name="shuffle" size={9} color="#F97316" />
                  <Text style={s.crossBadgeText}>Cross-ward</Text>
                </View>
              </View>

              {groups.length === 0 ? (
                <View style={s.emptyCard}>
                  <LinearGradient colors={['#10B98120','#05966912']} style={s.emptyIcon}>
                    <Feather name="layers" size={26} color="#10B981" />
                  </LinearGradient>
                  <Text style={[s.emptyTitle, { color: TEXT }]}>No Groups Yet</Text>
                  <Text style={[s.emptySub, { color: MUTED }]}>Create groups in the Database tab</Text>
                </View>
              ) : (
                groups.map((g, idx) => {
                  const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
                  const count = houses.filter(h => h.groupId === g.id).length;
                  return (
                    <TouchableOpacity key={g.id} style={[s.grpGroupCard, { borderColor: color + '35' }]} onPress={() => grpOpenGroup(g)} activeOpacity={0.85}>
                      <LinearGradient colors={[color + '18', color + '08']} style={StyleSheet.absoluteFill} />
                      <View style={[s.grpColorBar, { backgroundColor: color }]} />
                      <View style={[s.groupIconBox, { backgroundColor: color + '20' }]}>
                        <Feather name="layers" size={18} color={color} />
                      </View>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[s.groupName, { color: TEXT }]}>{g.name}</Text>
                        {g.description ? <Text style={[s.groupDesc, { color: MUTED }]}>{g.description}</Text> : null}
                      </View>
                      <View style={[s.countBadge, { backgroundColor: color + '22', borderColor: color + '35' }]}>
                        <Feather name="home" size={9} color={color} />
                        <Text style={[s.countBadgeText, { color }]}>{count}</Text>
                      </View>
                      <Feather name="chevron-right" size={16} color={MUTED} />
                    </TouchableOpacity>
                  );
                })
              )}

              {grpUngroupedCount > 0 && (
                <TouchableOpacity style={[s.grpGroupCard, { borderColor: '#F9731635' }]} onPress={grpOpenUngrouped} activeOpacity={0.85}>
                  <LinearGradient colors={['#F9731618','#F9731608']} style={StyleSheet.absoluteFill} />
                  <View style={[s.grpColorBar, { backgroundColor: '#F97316' }]} />
                  <View style={[s.groupIconBox, { backgroundColor: '#F9731620' }]}>
                    <Feather name="alert-circle" size={18} color="#F97316" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[s.groupName, { color: TEXT }]}>Ungrouped Houses</Text>
                    <Text style={[s.groupDesc, { color: MUTED }]}>Not assigned to any group</Text>
                  </View>
                  <View style={[s.countBadge, { backgroundColor: '#F9731622', borderColor: '#F9731635' }]}>
                    <Feather name="home" size={9} color="#F97316" />
                    <Text style={[s.countBadgeText, { color: '#F97316' }]}>{grpUngroupedCount}</Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={MUTED} />
                </TouchableOpacity>
              )}
            </ScrollView>

          ) : (
            /* Houses inside group */
            <View style={{ flex: 1 }}>
              <View style={s.grpHousesHeader}>
                <TouchableOpacity style={s.grpBackBtn} onPress={grpGoBack}>
                  <Feather name="arrow-left" size={17} color="#6366F1" />
                </TouchableOpacity>
                {grpGroupFilter ? (
                  <View style={[s.groupChip, { backgroundColor: (grpGroupFilter.color || '#6366F1') + '20' }]}>
                    <View style={[s.groupChipDot, { backgroundColor: grpGroupFilter.color || '#6366F1' }]} />
                    <Text style={[s.groupChipText, { color: grpGroupFilter.color || '#6366F1' }]}>{grpGroupFilter.name}</Text>
                  </View>
                ) : (
                  <View style={[s.groupChip, { backgroundColor: '#F9731620' }]}>
                    <View style={[s.groupChipDot, { backgroundColor: '#F97316' }]} />
                    <Text style={[s.groupChipText, { color: '#F97316' }]}>Ungrouped</Text>
                  </View>
                )}
                <Text style={[s.grpHouseCount, { color: MUTED }]}>{grpHouseList.length} houses</Text>
              </View>

              {/* Search */}
              <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
                <View style={s.searchBox}>
                  <Feather name="search" size={14} color={MUTED} />
                  <TextInput
                    style={[s.searchInput, { color: TEXT }]}
                    placeholder="Search houses…"
                    placeholderTextColor={MUTED}
                    value={grpSearch}
                    onChangeText={setGrpSearch}
                  />
                </View>
              </View>

              {/* Selection bar */}
              {grpHouseList.length > 0 && (
                <View style={[s.grpSelBar]}>
                  <TouchableOpacity style={s.grpSelectAll} onPress={() => grpSelectAll(grpHouseList)}>
                    <View style={[s.checkbox, { borderColor: '#4F46E5', backgroundColor: grpSelectedIds.size === grpHouseList.length ? '#4F46E5' : 'transparent' }]}>
                      {grpSelectedIds.size === grpHouseList.length && <Feather name="check" size={9} color="#fff" />}
                    </View>
                    <Text style={[s.grpSelectAllText]}>
                      {grpSelectedIds.size === grpHouseList.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                  {grpSelectedIds.size > 0 && (
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Text style={[s.grpSelCount]}>{grpSelectedIds.size} selected</Text>
                      {!grpShowUngrouped && (
                        <TouchableOpacity style={[s.selAction, { backgroundColor: '#EF444415', borderColor: '#EF444430' }]} onPress={grpHandleRemove}>
                          <Feather name="x-circle" size={12} color="#EF4444" />
                          <Text style={[s.selActionText, { color: '#EF4444' }]}>Remove</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[s.selAction, { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }]} onPress={() => setShowGrpAssignModal(true)}>
                        <Feather name="arrow-right-circle" size={12} color="#fff" />
                        <Text style={[s.selActionText, { color: '#fff' }]}>Move</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}

              <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 160, gap: 8, paddingTop: 10 }}>
                {grpHouseList.map(h => {
                  const isSelected = grpSelectedIds.has(h.id);
                  const grpColor = groups.find(g => g.id === h.groupId)?.color || '#6B7280';
                  return (
                    <TouchableOpacity
                      key={h.id}
                      style={[s.grpHouseCard, { borderColor: isSelected ? '#4F46E550' : GLASS_BD }]}
                      onPress={() => grpToggle(h.id)}
                      activeOpacity={0.85}
                    >
                      {isSelected && <LinearGradient colors={['#4F46E512','#7C3AED08']} style={StyleSheet.absoluteFill} />}
                      <View style={[s.checkbox, { borderColor: isSelected ? '#4F46E5' : GLASS_BD, backgroundColor: isSelected ? '#4F46E5' : 'transparent' }]}>
                        {isSelected && <Feather name="check" size={9} color="#fff" />}
                      </View>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <Text style={[s.regText, { color: '#818CF8' }]}>{h.registrationNumber}</Text>
                          {h.groupId
                            ? <View style={[s.groupSmallChip, { backgroundColor: grpColor + '20', borderColor: grpColor + '40' }]}>
                                <View style={[s.groupChipDot, { backgroundColor: grpColor, width: 6, height: 6 }]} />
                                <Text style={[s.grpSmallChipText, { color: grpColor }]}>{h.groupName}</Text>
                              </View>
                            : <View style={[s.groupSmallChip, { backgroundColor: '#F9731618', borderColor: '#F9731635' }]}>
                                <Text style={[s.grpSmallChipText, { color: '#F97316' }]}>Ungrouped</Text>
                              </View>
                          }
                        </View>
                        <Text style={[s.ownerText, { color: TEXT, fontSize: 13 }]}>{h.ownerName}</Text>
                        <Text style={[s.detailLabel, { color: MUTED }]} numberOfLines={1}>{h.address}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {grpHouseList.length === 0 && (
                  <View style={s.emptyCard}>
                    <Feather name="home" size={28} color={MUTED2} />
                    <Text style={[s.emptyTitle, { color: TEXT }]}>No houses found</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           MODALS
         ═══════════════════════════════════════════════════════════════ */}

      {/* Groups segment – assign to group modal */}
      <Modal visible={showGrpAssignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>{grpShowUngrouped ? 'Assign to Group' : 'Move to Group'}</Text>
              <Text style={s.modalSub}>{grpSelectedIds.size} house(s) selected</Text>
            </View>
            <Pressable onPress={() => setShowGrpAssignModal(false)} style={s.closeBtn}>
              <Feather name="x" size={19} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {grpAssignable.map((g, idx) => {
              const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
              const count = houses.filter(h => h.groupId === g.id).length;
              return (
                <TouchableOpacity key={g.id} style={[s.grpSelectCard, { borderColor: color + '35' }]} onPress={() => grpHandleAssign(g)} disabled={assigning} activeOpacity={0.85}>
                  <LinearGradient colors={[color + '18', color + '08']} style={StyleSheet.absoluteFill} />
                  <View style={[s.grpColorDot, { backgroundColor: color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.groupName, { color: TEXT }]}>{g.name}</Text>
                    {g.description ? <Text style={[s.groupDesc, { color: MUTED }]}>{g.description}</Text> : null}
                  </View>
                  <View style={[s.countBadge, { backgroundColor: color + '22', borderColor: color + '35' }]}>
                    <Feather name="home" size={9} color={color} />
                    <Text style={[s.countBadgeText, { color }]}>{count}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={MUTED} />
                </TouchableOpacity>
              );
            })}
            {grpAssignable.length === 0 && (
              <View style={s.emptyCard}>
                <Feather name="layers" size={28} color={MUTED2} />
                <Text style={[s.emptyTitle, { color: TEXT }]}>No other groups available</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Add House Modal */}
      <Modal visible={showAddHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Add House</Text>
            <Pressable onPress={() => setShowAddHouseModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Owner Name *', key: 'ownerName', placeholder: 'Ram Prasad' },
              { label: 'Father / Husband Name', key: 'fatherOrHusband', placeholder: 'Shiv Prasad' },
              { label: 'Mobile', key: 'mobile', placeholder: '9876543210', keyboard: 'phone-pad' },
              { label: 'Address *', key: 'address', placeholder: 'Ward 1, Near Temple…' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(houseForm as any)[f.key]}
                  onChangeText={v => setHouseForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}
            <Text style={[s.fieldLabel, { color: MUTED }]}>Property Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROPERTY_TYPES.map(pt => (
                <TouchableOpacity key={pt} style={[s.typePill, houseForm.propertyType === pt && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }, { borderColor: GLASS_BD }]} onPress={() => setHouseForm(p => ({ ...p, propertyType: pt }))}>
                  <Text style={[s.typePillText, { color: houseForm.propertyType === pt ? '#fff' : MUTED }]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleAddHouse} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Add House'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit House Modal */}
      <Modal visible={showEditHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#0EA5E9','#0284C7']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Edit House</Text>
            <Pressable onPress={() => setShowEditHouseModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Owner Name *', key: 'ownerName', placeholder: 'Ram Prasad' },
              { label: 'Father / Husband Name', key: 'fatherOrHusband', placeholder: 'Shiv Prasad' },
              { label: 'Mobile', key: 'mobile', placeholder: '9876543210', keyboard: 'phone-pad' },
              { label: 'Address *', key: 'address', placeholder: 'Ward 1, Near Temple…' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(houseForm as any)[f.key]}
                  onChangeText={v => setHouseForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}
            <Text style={[s.fieldLabel, { color: MUTED }]}>Property Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {PROPERTY_TYPES.map(pt => (
                <TouchableOpacity key={pt} style={[s.typePill, houseForm.propertyType === pt && { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' }, { borderColor: GLASS_BD }]} onPress={() => setHouseForm(p => ({ ...p, propertyType: pt }))}>
                  <Text style={[s.typePillText, { color: houseForm.propertyType === pt ? '#fff' : MUTED }]}>{pt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleSaveEditHouse} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#0EA5E9','#0284C7']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Group Modal */}
      <Modal visible={showAddGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#10B981','#059669']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Create Group</Text>
            <Pressable onPress={() => setShowAddGroupModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Group Name *', key: 'name', placeholder: 'Zone A' },
              { label: 'Description', key: 'description', placeholder: 'Optional description…' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(groupForm as any)[f.key]}
                  onChangeText={v => setGroupForm(p => ({ ...p, [f.key]: v }))}
                />
              </View>
            ))}
            <Text style={[s.fieldLabel, { color: MUTED }]}>Color</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {GROUP_COLORS.map(c => (
                <TouchableOpacity key={c} onPress={() => setGroupForm(p => ({ ...p, color: c }))}>
                  <View style={[s.colorDot, { backgroundColor: c, borderWidth: groupForm.color === c ? 3 : 0, borderColor: '#fff' }]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={handleAddGroup} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981','#059669']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Create Group'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Group Modal */}
      <Modal visible={showEditGroupModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#10B981','#059669']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Edit Group</Text>
            <Pressable onPress={() => setShowEditGroupModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Group Name *', key: 'name', placeholder: 'Zone A' },
              { label: 'Description', key: 'description', placeholder: 'Optional description…' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(editGroupForm as any)[f.key]}
                  onChangeText={v => setEditGroupForm(p => ({ ...p, [f.key]: v }))}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveEditGroup} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981','#059669']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Ward Modal */}
      <Modal visible={showAddWardModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#4F46E5','#6366F1']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Add Ward</Text>
            <Pressable onPress={() => setShowAddWardModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Ward Number *', key: 'wardNumber', placeholder: '1', keyboard: 'numeric' },
              { label: 'Ward Name *', key: 'name', placeholder: 'Ward 1 Central' },
              { label: 'Area / Locality', key: 'area', placeholder: 'Station Road Area' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(wardForm as any)[f.key]}
                  onChangeText={v => setWardForm(p => ({ ...p, [f.key]: v }))}
                  keyboardType={f.keyboard as any}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleAddWard} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5','#6366F1']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Create Ward'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Ward Modal */}
      <Modal visible={showEditWardModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#4F46E5','#6366F1']} style={s.modalHdr}>
            <Text style={s.modalTitle}>Edit Ward</Text>
            <Pressable onPress={() => setShowEditWardModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
            {[
              { label: 'Ward Name *', key: 'name', placeholder: 'Ward 1 Central' },
              { label: 'Area / Locality', key: 'area', placeholder: 'Station Road Area' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[s.fieldLabel, { color: MUTED }]}>{f.label}</Text>
                <TextInput
                  style={[s.fieldInput, { backgroundColor: GLASS, borderColor: GLASS_BD, color: TEXT }]}
                  placeholder={f.placeholder} placeholderTextColor={MUTED2}
                  value={(editWardForm as any)[f.key]}
                  onChangeText={v => setEditWardForm(p => ({ ...p, [f.key]: v }))}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveEditWard} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5','#6366F1']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Worker Assignment Modal */}
      <Modal visible={showWorkerModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#7C3AED','#4F46E5']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>Assign Workers</Text>
              <Text style={s.modalSub}>Ward {workerModalWard?.wardNumber} — {workerModalWard?.name}</Text>
            </View>
            <Pressable onPress={() => setShowWorkerModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <View style={{ paddingHorizontal: 16, paddingTop: 14 }}>
            <View style={s.searchBox}>
              <Feather name="search" size={14} color={MUTED} />
              <TextInput style={[s.searchInput, { color: TEXT }]} placeholder="Search workers…" placeholderTextColor={MUTED2} value={workerSearch} onChangeText={setWorkerSearch} />
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            {safaikarmis
              .filter(u => !workerSearch || u.name?.toLowerCase().includes(workerSearch.toLowerCase()))
              .map(u => {
                const assigned = workerModalWard?.assignedWorkers.includes(u.id) ?? false;
                return (
                  <TouchableOpacity key={u.id} style={[s.workerRow, { borderColor: assigned ? '#10B98135' : GLASS_BD }]} onPress={() => assigned ? handleRemoveWorker(u.id) : handleAssignWorker(u.id)} activeOpacity={0.85} disabled={savingWorker}>
                    {assigned && <LinearGradient colors={['#10B98112','#05966908']} style={StyleSheet.absoluteFill} />}
                    <LinearGradient colors={assigned ? ['#10B981','#059669'] : ['#374151','#1F2937']} style={s.workerAvatar}>
                      <Text style={s.workerAvatarText}>{u.name?.[0]?.toUpperCase() ?? '?'}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.workerName, { color: TEXT }]}>{u.name}</Text>
                      <Text style={[s.workerRole, { color: MUTED }]}>Safai Karmi</Text>
                    </View>
                    {assigned
                      ? <View style={s.assignedBadge}><Feather name="check" size={11} color="#10B981" /><Text style={s.assignedText}>Assigned</Text></View>
                      : <View style={s.unassignedBadge}><Feather name="plus" size={11} color={MUTED} /><Text style={s.unassignedText}>Assign</Text></View>
                    }
                  </TouchableOpacity>
                );
              })}
            {safaikarmis.length === 0 && (
              <View style={s.emptyCard}>
                <Feather name="users" size={28} color={MUTED2} />
                <Text style={[s.emptyTitle, { color: TEXT }]}>No Workers Found</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Move Houses Modal */}
      <Modal visible={showMoveModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
          <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>Move Houses</Text>
              <Text style={s.modalSub}>{selectedHouseIds.length} house(s) selected</Text>
            </View>
            <Pressable onPress={() => setShowMoveModal(false)} style={s.closeBtn}><Feather name="x" size={19} color="#fff" /></Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View>
              <Text style={[s.fieldLabel, { color: MUTED, marginBottom: 10 }]}>Select Ward</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {wards.map((w, idx) => {
                  const grad = WARD_GRADS[idx % WARD_GRADS.length];
                  const active = moveWardId === w.id;
                  return (
                    <TouchableOpacity key={w.id} onPress={() => { setMoveWardId(w.id); setMoveGroupId(null); }}>
                      {active
                        ? <LinearGradient colors={grad} style={s.wardPillActive}><Text style={s.wardPillActiveText}>Ward {w.wardNumber}</Text></LinearGradient>
                        : <View style={s.wardPill}><Text style={[s.wardPillText, { color: MUTED }]}>Ward {w.wardNumber}</Text></View>
                      }
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <View>
              <Text style={[s.fieldLabel, { color: MUTED, marginBottom: 10 }]}>Select Group (optional)</Text>
              <TouchableOpacity style={[s.moveGroupRow, { borderColor: moveGroupId === null ? '#6366F150' : GLASS_BD, backgroundColor: moveGroupId === null ? '#6366F112' : GLASS }]} onPress={() => setMoveGroupId(null)} activeOpacity={0.8}>
                <Text style={[s.moveGroupName, { color: moveGroupId === null ? '#6366F1' : MUTED }]}>Ungrouped (no group)</Text>
                {moveGroupId === null && <Feather name="check" size={14} color="#6366F1" />}
              </TouchableOpacity>
              {groups.filter(g => !moveWardId || wards.find(w => w.id === moveWardId)).map((g, idx) => {
                const color = g.color || GROUP_COLORS[idx % GROUP_COLORS.length];
                return (
                  <TouchableOpacity key={g.id} style={[s.moveGroupRow, { borderColor: moveGroupId === g.id ? color + '50' : GLASS_BD, backgroundColor: moveGroupId === g.id ? color + '12' : GLASS, marginTop: 8 }]} onPress={() => setMoveGroupId(g.id)} activeOpacity={0.8}>
                    <View style={[s.groupDot, { backgroundColor: color }]} />
                    <Text style={[s.moveGroupName, { color: moveGroupId === g.id ? color : TEXT }]}>{g.name}</Text>
                    {moveGroupId === g.id && <Feather name="check" size={14} color={color} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={handleMoveHouses} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.saveBtn}>
                <Text style={s.saveBtnText}>{saving ? 'Moving…' : `Move ${selectedHouseIds.length} Houses`}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Export Modal */}
      <Modal visible={showExportModal} animationType="fade" transparent>
        <View style={s.exportOverlay}>
          <View style={s.exportSheet}>
            <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.exportHeader}>
              <View style={s.exportHeaderRow}>
                <LinearGradient colors={['rgba(255,255,255,0.2)','rgba(255,255,255,0.1)']} style={s.exportHeaderIcon}>
                  <Feather name="download-cloud" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={s.exportTitle}>Export CSV</Text>
                  <Text style={s.exportSub}>House Database</Text>
                </View>
                <Pressable onPress={() => setShowExportModal(false)} style={s.closeBtn}>
                  <Feather name="x" size={17} color="#fff" />
                </Pressable>
              </View>
            </LinearGradient>
            <View style={{ padding: 20, gap: 16 }}>
              <View style={[s.exportScopeBox]}>
                <Text style={[s.exportScopeLabel, { color: MUTED }]}>Exporting from</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Feather name="map-pin" size={12} color="#6366F1" />
                  <Text style={[s.exportScopeValue, { color: TEXT }]}>Ward {selectedWard?.wardNumber} — {selectedWard?.name}</Text>
                </View>
                {selectedGroup && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Feather name="layers" size={12} color="#10B981" />
                    <Text style={[s.exportScopeValue, { color: TEXT }]}>{selectedGroup.name}</Text>
                  </View>
                )}
                <View style={[s.exportCountBadge, { marginTop: 10 }]}>
                  <Feather name="home" size={12} color="#6366F1" />
                  <Text style={[s.exportCountText, { color: TEXT }]}>{houseList.length} houses will be exported</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleExportCSV} disabled={exporting} activeOpacity={0.85}>
                <LinearGradient colors={['#4F46E5','#7C3AED']} style={s.saveBtn}>
                  {exporting ? <ActivityIndicator size={16} color="#fff" /> : (
                    <>
                      <Feather name="download-cloud" size={16} color="#fff" />
                      <Text style={s.saveBtnText}>Export CSV</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Header
  header: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18, overflow: 'hidden' },
  orb: { position: 'absolute', borderRadius: 999 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  superBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,215,0,0.12)', borderColor: 'rgba(255,215,0,0.25)', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  superBadgeText: { color: '#FFD700', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  headerTitle: { color: '#F0F4FF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  headerSub: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  syncWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  statRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, alignItems: 'center', gap: 4 },
  statNum: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Inter_500Medium' },

  // Compact info bar
  infoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.18)', paddingHorizontal: 12, paddingVertical: 7, marginBottom: 8 },
  infoBarStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoBarPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  infoBarNum: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#818CF8' },
  infoBarLbl: { fontSize: 10, fontFamily: 'Inter_500Medium', color: MUTED },
  infoBarDivider: { width: 1, height: 14, backgroundColor: 'rgba(255,255,255,0.10)' },
  infoBarSync: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoBarSyncDot: { width: 6, height: 6, borderRadius: 3 },
  infoBarSyncTxt: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  // Segment bar
  segBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8 },
  segBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, margin: 6, borderWidth: 1, borderColor: 'transparent', position: 'relative' },
  segLabel: { fontSize: 13 },
  segUnderline: { position: 'absolute', bottom: -7, left: 16, right: 16, height: 2, borderRadius: 1 },

  // Breadcrumb
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  breadLink: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  breadCur: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#6366F110', borderWidth: 1, borderColor: '#6366F125' },
  backBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Section label
  sectionLabel: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#818CF8', letterSpacing: 0.5 },

  // Action chips
  actionChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  actionChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  // Ward cards
  wardCard: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingRight: 10, paddingVertical: 12 },
  wardRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  wardBadge: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  wardBadgeText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  wardName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  wardArea: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  wardMetaRow: { flexDirection: 'row', gap: 6 },
  wardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 },
  metaText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  iconBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },

  // Group views
  allHousesCard: { borderRadius: 16, borderWidth: 1, borderColor: '#6366F135', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  groupCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingRight: 12, paddingVertical: 12 },
  groupCardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 14 },
  groupIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  groupDesc: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  countBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  countBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  addHouseChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#6366F118', borderWidth: 1, borderColor: '#6366F130' },
  addHouseChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#6366F1' },
  crossBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F9731612', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#F9731630' },
  crossBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#F97316' },
  addGroupBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  addGroupBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  addGroupBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  // Houses view
  searchRow: { flexDirection: 'row', gap: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GLASS, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: GLASS_BD },
  searchInput: { flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', padding: 0 },
  exportBtn: { },
  exportBtnGrad: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  colHeader: { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  colCell: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  colDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
  selBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(99,102,241,0.08)', borderBottomWidth: 1, borderBottomColor: 'rgba(99,102,241,0.15)' },
  selBarCancel: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center' },
  selBarCount: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  selAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  selActionText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  houseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  houseIdx: { fontSize: 12, fontFamily: 'Inter_500Medium', color: MUTED, textAlign: 'center' },
  houseCellFlex: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  regDot: { width: 6, height: 6, borderRadius: 3 },
  regText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  ownerText: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  houseDetail: { backgroundColor: 'rgba(255,255,255,0.04)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', padding: 16, gap: 10 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  detailTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  detailAction: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  detailLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  detailLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 12, fontFamily: 'Inter_600SemiBold', flex: 1, textAlign: 'right' },
  fab: { position: 'absolute', bottom: 24, right: 20 },
  fabGrad: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 12, elevation: 8 },

  // Groups segment
  wardPillBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  wardPillLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginRight: 2 },
  wardPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS },
  wardPillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  wardPillActive: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  wardPillActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  grpGroupCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', gap: 12, paddingRight: 14, paddingVertical: 14 },
  grpColorBar: { width: 4, alignSelf: 'stretch' },
  grpHousesHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.03)' },
  grpBackBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#6366F110', borderWidth: 1, borderColor: '#6366F125', justifyContent: 'center', alignItems: 'center' },
  groupChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  groupChipDot: { width: 8, height: 8, borderRadius: 4 },
  groupChipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  grpHouseCount: { marginLeft: 'auto', fontSize: 12, fontFamily: 'Inter_500Medium' },
  grpSelBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 14, marginTop: 10, borderRadius: 12, borderWidth: 1, borderColor: '#4F46E525', backgroundColor: '#4F46E50A', padding: 10 },
  grpSelectAll: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grpSelectAllText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: '#818CF8' },
  grpSelCount: { fontSize: 12, fontFamily: 'Inter_700Bold', color: '#818CF8' },
  grpHouseCard: { borderRadius: 14, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', backgroundColor: GLASS },
  groupSmallChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, borderWidth: 1 },
  grpSmallChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  grpSelectCard: { borderRadius: 16, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  grpColorDot: { width: 12, height: 12, borderRadius: 6 },

  // Empty states
  globalResultCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: GLASS, borderRadius: 12, borderWidth: 1, borderColor: GLASS_BD, paddingHorizontal: 12, paddingVertical: 10 },
  globalResultDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366F1' },
  emptyCard: { borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, padding: 36, alignItems: 'center', gap: 12, backgroundColor: GLASS },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 40 },
  emptyIcon: { width: 70, height: 70, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  // Modals
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  // Forms
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: 'Inter_400Regular' },
  typePill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: GLASS },
  typePillText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  // Worker modal
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: GLASS },
  workerAvatar: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  workerAvatarText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  workerName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  workerRole: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98130' },
  assignedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#10B981' },
  unassignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: GLASS, borderWidth: 1, borderColor: GLASS_BD },
  unassignedText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: MUTED },

  // Move modal
  moveGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  moveGroupName: { flex: 1, fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  // Export modal
  exportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  exportSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: '#0D1535', borderWidth: 1, borderColor: GLASS_BD },
  exportHeader: { padding: 20 },
  exportHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  exportHeaderIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  exportTitle: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  exportSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  exportScopeBox: { backgroundColor: GLASS, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: GLASS_BD },
  exportScopeLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.5 },
  exportScopeValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  exportCountBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#6366F112', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#6366F125' },
  exportCountText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
});
