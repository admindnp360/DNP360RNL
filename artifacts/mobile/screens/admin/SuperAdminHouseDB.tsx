import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet,
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
  const { houses, wards, groups, addHouse, updateHouse, deleteHouse, addGroup, deleteGroup } = useAppData();
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
  const [saving, setSaving] = useState(false);

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

  const wardGroups = selectedWard ? groups.filter(g => g.wardId === selectedWard.id) : [];

  const houseList = (() => {
    if (!selectedWard) return [];
    let list = houses.filter(h => h.wardId === selectedWard.id);
    if (selectedGroup !== null) {
      list = list.filter(h => h.groupId === selectedGroup.id);
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

  async function handleAddGroup() {
    if (!selectedWard) return;
    if (!groupForm.name.trim()) {
      showAlert('Missing', 'Group name is required.', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      await addGroup({
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        wardId: selectedWard.id,
        wardNumber: selectedWard.wardNumber,
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
          <Text style={[s.sectionLabel, { color: '#6366F1' }]}>All Wards</Text>
          {wards.map((ward, idx) => {
            const grad = WARD_GRADS[idx % WARD_GRADS.length];
            const wardHouses = houses.filter(h => h.wardId === ward.id).length;
            const wardGroups = groups.filter(g => g.wardId === ward.id).length;
            return (
              <TouchableOpacity
                key={ward.id}
                style={[s.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => goToGroups(ward)}
                activeOpacity={0.85}
              >
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
                      <Text style={[s.metaText, { color: colors.mutedForeground }]}>{wardHouses}</Text>
                    </View>
                    <View style={s.metaPill}>
                      <Feather name="layers" size={10} color={colors.mutedForeground} />
                      <Text style={[s.metaText, { color: colors.mutedForeground }]}>{wardGroups}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </View>
                </View>
              </TouchableOpacity>
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
          <View style={[s.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
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
});
