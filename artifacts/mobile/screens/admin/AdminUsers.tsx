import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Image, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';

/* ─── design tokens ──────────────────────────────────────────── */
const BG       = '#060B18';
const GLASS    = 'rgba(255,255,255,0.055)';
const GLASS_BD = 'rgba(255,255,255,0.10)';
const TEXT     = '#F0F4FF';
const MUTED    = 'rgba(240,244,255,0.42)';

/* ─── constants ──────────────────────────────────────────────── */
type RoleTab = 'all' | 'safaikarmi' | 'official' | 'citizen';

const ALL_TABS: { key: RoleTab; label: string; icon: string; grad: readonly [string, string] }[] = [
  { key: 'all',        label: 'All',        icon: 'users',     grad: ['#6366F1', '#8B5CF6'] },
  { key: 'safaikarmi', label: 'Safai',      icon: 'trash-2',   grad: ['#10B981', '#059669'] },
  { key: 'official',   label: 'Official',   icon: 'briefcase', grad: ['#F59E0B', '#EF4444'] },
  { key: 'citizen',    label: 'Citizen',    icon: 'user',      grad: ['#0EA5E9', '#2563EB'] },
];

const ROLE_GRAD: Record<string, readonly [string, string]> = {
  safaikarmi: ['#10B981', '#059669'],
  official:   ['#F59E0B', '#EF4444'],
  citizen:    ['#0EA5E9', '#2563EB'],
  admin:      ['#6366F1', '#8B5CF6'],
};

/* ─── component ──────────────────────────────────────────────── */
export default function AdminUsers() {
  const { users, updateUser, deleteUser, secretKeys, updateSecretKeyCode, assignSecretKeyToUser, updateUserId, updateUserFull } = useAppData();
  const { user: currentUser } = useAuth();
  const { showAlert } = useAlert();
  const isSuperAdmin = !!(currentUser as any)?.isSuperAdmin;

  const TABS = isSuperAdmin ? ALL_TABS : ALL_TABS.filter(t => t.key !== 'citizen');

  const [search, setSearch]             = useState('');
  const [activeTab, setActiveTab]       = useState<RoleTab>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'frozen'>('all');
  const [keyFilter, setKeyFilter]       = useState<'all' | 'hasKey' | 'noKey'>('all');

  const [profileUser, setProfileUser]         = useState<User | null>(null);
  const [editMode, setEditMode]               = useState(false);
  const [editName, setEditName]               = useState('');
  const [editEmail, setEditEmail]             = useState('');
  const [editMobile, setEditMobile]           = useState('');
  const [editAddress, setEditAddress]         = useState('');
  const [editEmpId, setEditEmpId]             = useState('');
  const [editUserId, setEditUserId]           = useState('');
  const [editAvatar, setEditAvatar]           = useState('');
  const [editKeyCode, setEditKeyCode]         = useState('');
  const [showKey, setShowKey]                 = useState(false);
  const [saving, setSaving]                   = useState(false);
  const [assigningKey, setAssigningKey]       = useState(false);
  const [newlyAssignedKey, setNewlyAssignedKey] = useState<{ code: string; role: string } | null>(null);
  const [copiedId, setCopiedId]               = useState<string | null>(null);

  /* stats */
  const countSafaikarmi = users.filter(u => u.role === 'safaikarmi').length;
  const countOfficial   = users.filter(u => u.role === 'official').length;
  const countCitizen    = users.filter(u => u.role === 'citizen').length;
  const countAdmin      = users.filter(u => u.role === 'admin').length;
  const countStaff      = countSafaikarmi + countOfficial + countAdmin;

  /* derived list */
  const tabList = users
    .filter(u =>
      activeTab === 'all'
        ? u.role === 'safaikarmi' || u.role === 'official' || u.role === 'admin'
        : u.role === activeTab
    )
    .filter(u => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || (u.employeeId ?? '').toLowerCase().includes(q);
    })
    .filter(u => {
      if (statusFilter === 'active') return u.isActive === true;
      if (statusFilter === 'frozen') return u.isActive === false;
      return true;
    })
    .filter(u => {
      if (keyFilter === 'all') return true;
      const hasKey = secretKeys.some(k => k.usedBy === u.id);
      return keyFilter === 'hasKey' ? hasKey : !hasKey;
    });

  const totalBeforeFilter = users.filter(u =>
    activeTab === 'all'
      ? u.role === 'safaikarmi' || u.role === 'official' || u.role === 'admin'
      : u.role === activeTab
  ).length;
  const filtersActive = search.trim() !== '' || statusFilter !== 'all' || keyFilter !== 'all';

  function getUserKey(userId: string) {
    return secretKeys.find(k => k.usedBy === userId) ?? null;
  }

  function openProfile(u: User) {
    const key = getUserKey(u.id);
    setProfileUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditMobile(u.mobile ?? '');
    setEditAddress(u.address ?? '');
    setEditEmpId(u.employeeId ?? '');
    setEditUserId(u.id);
    setEditAvatar(u.avatar ?? '');
    setEditKeyCode(key?.code ?? '');
    setShowKey(false);
    setEditMode(false);
    setNewlyAssignedKey(null);
  }

  function closeProfile() {
    setProfileUser(null);
    setEditMode(false);
    setNewlyAssignedKey(null);
  }

  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Allow photo library access to add a profile picture.', undefined, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: false,
    });
    if (!result.canceled && result.assets[0]) setEditAvatar(result.assets[0].uri);
  }

  async function handleSave() {
    if (!profileUser) return;
    if (!isSuperAdmin && profileUser.role === 'citizen') return;
    if (!editName.trim()) { showAlert('Required', 'Name cannot be empty.', undefined, 'warning'); return; }
    const newId = editUserId.trim().toUpperCase();
    if (isSuperAdmin && newId && newId !== profileUser.id) {
      const conflict = users.find(u => u.id === newId && u.id !== profileUser.id);
      if (conflict) { showAlert('ID Taken', `User ID "${newId}" is already in use.`, undefined, 'error'); return; }
    }
    const effectiveId = isSuperAdmin && newId && newId !== profileUser.id ? newId : profileUser.id;
    setSaving(true);
    try {
      await updateUserFull(profileUser.id, effectiveId, {
        name: editName.trim(), email: editEmail.trim(),
        mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined,
        employeeId: editEmpId.trim() || undefined, avatar: editAvatar || undefined,
      });
      if (isSuperAdmin && profileUser.role !== 'citizen') {
        const key = getUserKey(profileUser.id) ?? getUserKey(effectiveId);
        if (key && editKeyCode.trim() && editKeyCode.trim().toUpperCase() !== key.code)
          await updateSecretKeyCode(key.id, editKeyCode.trim().toUpperCase());
      }
      setProfileUser(prev => prev ? {
        ...prev, id: effectiveId, name: editName.trim(), email: editEmail.trim(),
        mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined,
        employeeId: editEmpId.trim() || undefined, avatar: editAvatar || undefined,
      } : prev);
      setEditMode(false);
      showAlert('Saved', 'Profile updated successfully.', undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleAssignKey(u: User) {
    if (!isSuperAdmin) return;
    setAssigningKey(true);
    try {
      const key = await assignSecretKeyToUser(u.id, u.name, u.role as any);
      setNewlyAssignedKey({ code: key.code, role: u.role });
      showAlert('Key Assigned', `New secret key created and linked to ${u.name}.`, undefined, 'success');
    } finally { setAssigningKey(false); }
  }

  function handleFreeze(u: User) {
    if (!isSuperAdmin && u.role === 'citizen') return;
    if ((u as any).cannotBeDeleted) { showAlert('Protected', 'This account cannot be modified.', undefined, 'warning'); return; }
    showAlert(
      u.isActive ? 'Freeze Account?' : 'Unfreeze Account?',
      `${u.name} will ${u.isActive ? 'lose' : 'regain'} access.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: u.isActive ? 'Freeze' : 'Unfreeze', onPress: () => { updateUser(u.id, { isActive: !u.isActive }); setProfileUser(prev => prev ? { ...prev, isActive: !u.isActive } : prev); } }],
      'warning'
    );
  }

  function handleDelete(u: User) {
    if (!isSuperAdmin && u.role === 'citizen') return;
    if ((u as any).cannotBeDeleted) { showAlert('Protected', 'This account cannot be deleted.', undefined, 'warning'); return; }
    showAlert(
      'Delete User?', `Permanently remove ${u.name}? This cannot be undone.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleteUser(u.id); closeProfile(); } }],
      'error'
    );
  }

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]!;

  /* ── render ──────────────────────────────────────────── */
  return (
    <SafeAreaView style={s.root} edges={['top']}>

      {/* ── Compact sticky info bar ── */}
      <View style={s.infoBar}>
        <LinearGradient colors={['rgba(99,102,241,0.18)', 'rgba(79,70,229,0.08)']} style={StyleSheet.absoluteFill as any} />
        <InfoPill icon="users" label="Staff" value={countStaff} color="#818CF8" />
        <View style={s.infoDivider} />
        <InfoPill icon="trash-2" label="SK" value={countSafaikarmi} color="#34D399" />
        <View style={s.infoDivider} />
        <InfoPill icon="briefcase" label="Offcl" value={countOfficial} color="#FCD34D" />
        <View style={s.infoDivider} />
        <InfoPill icon="user" label="Ctzn" value={countCitizen} color="#38BDF8" />
        <View style={s.infoDivider} />
        <View style={s.syncPill}>
          <View style={s.syncDot} />
          <Text style={s.syncText}>Live</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Feather name="search" size={15} color={MUTED} />
          <TextInput
            style={s.searchInput}
            placeholder="Search name, ID or employee ID…"
            placeholderTextColor={MUTED}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x-circle" size={14} color={MUTED} />
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <View style={s.filterRow}>
          {/* Status chips */}
          <View style={s.filterGroup}>
            <Feather name="activity" size={9} color={MUTED} />
            {(['all', 'active', 'frozen'] as const).map(opt => {
              const active = statusFilter === opt;
              const chipColor = opt === 'active' ? '#10B981' : opt === 'frozen' ? '#EF4444' : currentTab.grad[0];
              return (
                <TouchableOpacity
                  key={opt} activeOpacity={0.75}
                  onPress={() => setStatusFilter(opt)}
                  style={[s.filterChip, active ? { backgroundColor: chipColor + 'CC', borderColor: chipColor } : { backgroundColor: GLASS, borderColor: GLASS_BD }]}
                >
                  {opt !== 'all' && <View style={[s.filterDot, { backgroundColor: active ? '#fff' : chipColor }]} />}
                  <Text style={[s.filterChipText, { color: active ? '#fff' : MUTED }]}>
                    {opt === 'all' ? 'All' : opt === 'active' ? 'Active' : 'Frozen'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Key chips */}
          {activeTab !== 'citizen' && (
            <View style={s.filterGroup}>
              <Feather name="key" size={9} color={MUTED} />
              {(['all', 'hasKey', 'noKey'] as const).map(opt => {
                const active = keyFilter === opt;
                const chipColor = opt === 'hasKey' ? '#818CF8' : opt === 'noKey' ? '#FBBF24' : currentTab.grad[0];
                return (
                  <TouchableOpacity
                    key={opt} activeOpacity={0.75}
                    onPress={() => setKeyFilter(opt)}
                    style={[s.filterChip, active ? { backgroundColor: chipColor + 'CC', borderColor: chipColor } : { backgroundColor: GLASS, borderColor: GLASS_BD }]}
                  >
                    <Text style={[s.filterChipText, { color: active ? '#fff' : MUTED }]}>
                      {opt === 'all' ? 'Any' : opt === 'hasKey' ? 'Has Key' : 'No Key'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {filtersActive && (
            <View style={s.filterResultRow}>
              <Text style={[s.filterCount, { color: MUTED }]}>{tabList.length}/{totalBeforeFilter}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => { setSearch(''); setStatusFilter('all'); setKeyFilter('all'); }}
                style={[s.clearAllBtn, { borderColor: GLASS_BD }]}
              >
                <Feather name="x" size={9} color={MUTED} />
                <Text style={[s.clearAllText, { color: MUTED }]}>Clear</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Role Tabs ── */}
      <View style={s.tabRow}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const count = tab.key === 'all'
            ? countSafaikarmi + countOfficial + countAdmin
            : users.filter(u => u.role === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key} style={s.tabItem}
              onPress={() => { setActiveTab(tab.key); setStatusFilter('all'); setKeyFilter('all'); setSearch(''); }}
              activeOpacity={0.75}
            >
              {active ? (
                <LinearGradient colors={tab.grad} style={s.tabPillActive}>
                  <Feather name={tab.icon as any} size={12} color="#fff" />
                  <Text style={s.tabLabelActive}>{tab.label}</Text>
                  <View style={s.tabCountBubble}>
                    <Text style={s.tabCountText}>{count}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={s.tabPillInactive}>
                  <Feather name={tab.icon as any} size={12} color={MUTED} />
                  <Text style={s.tabLabelInactive}>{tab.label}</Text>
                  <Text style={s.tabCountInactive}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Table header ── */}
      <View style={s.tableHead}>
        <Text style={s.thNo}>#</Text>
        <Text style={s.thName}>User</Text>
        <Text style={s.thId}>ID</Text>
        {activeTab !== 'citizen' && <Text style={s.thCode}>Key</Text>}
      </View>

      {/* ── Table rows ── */}
      <ScrollView style={s.list} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
        {tabList.length === 0 ? (
          <View style={s.emptyWrap}>
            <LinearGradient colors={currentTab.grad} style={s.emptyIcon}>
              <Feather name={currentTab.icon as any} size={24} color="#fff" />
            </LinearGradient>
            <Text style={s.emptyTitle}>No {currentTab.label}s found</Text>
            {search ? <Text style={s.emptyHint}>Try a different search term</Text> : null}
          </View>
        ) : (
          tabList.map((u, idx) => {
            const linkedKey = getUserKey(u.id);
            const isEven = idx % 2 === 0;
            const roleGrad = ROLE_GRAD[u.role];
            return (
              <TouchableOpacity
                key={u.id} activeOpacity={0.7}
                onPress={() => openProfile(u)}
                style={[s.tableRow, { backgroundColor: isEven ? 'transparent' : 'rgba(255,255,255,0.025)', opacity: u.isActive ? 1 : 0.5 }]}
              >
                <Text style={s.tdNo}>{idx + 1}</Text>

                <View style={s.tdNameCell}>
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={s.rowAvatar} />
                  ) : (
                    <LinearGradient colors={roleGrad} style={s.rowAvatarGrad}>
                      <Text style={s.rowAvatarLetter}>{u.name[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.tdName} numberOfLines={1}>{u.name}</Text>
                    <View style={s.statusRow}>
                      <View style={[s.statusDot, { backgroundColor: u.isActive ? '#10B981' : '#EF4444' }]} />
                      <Text style={[s.statusLabel, { color: u.isActive ? '#10B981' : '#EF4444' }]}>
                        {u.isActive ? 'Active' : 'Frozen'}
                      </Text>
                      {u.employeeId ? <Text style={s.empIdLabel}>· {u.employeeId}</Text> : null}
                    </View>
                  </View>
                </View>

                <Text style={s.tdId} numberOfLines={1}>{u.id}</Text>

                {activeTab !== 'citizen' && (
                  <View style={s.tdCodeCell}>
                    {linkedKey ? (
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={async () => {
                          await Clipboard.setStringAsync(linkedKey.code);
                          setCopiedId(u.id);
                          setTimeout(() => setCopiedId(null), 1400);
                        }}
                      >
                        <View style={[
                          s.codePill,
                          copiedId === u.id
                            ? { backgroundColor: '#10B98125', borderWidth: 1, borderColor: '#10B98155' }
                            : { backgroundColor: currentTab.grad[0] + '18', borderWidth: 1, borderColor: currentTab.grad[0] + '30' },
                        ]}>
                          {copiedId === u.id ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                              <Feather name="check" size={9} color="#10B981" />
                              <Text style={[s.codeText, { color: '#10B981' }]}>Copied</Text>
                            </View>
                          ) : (
                            <Text style={[s.codeText, { color: currentTab.grad[0] }]} numberOfLines={1}>{linkedKey.code}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[s.codePill, { backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)' }]}>
                        <Text style={[s.codeText, { color: '#FBBF24' }]}>No Key</Text>
                      </View>
                    )}
                  </View>
                )}

                <Feather name="chevron-right" size={13} color={MUTED} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ═══════════════ PROFILE MODAL ═══════════════ */}
      <Modal visible={!!profileUser} animationType="slide" presentationStyle="pageSheet">
        {profileUser && (() => {
          const grad = ROLE_GRAD[profileUser.role];
          const linkedKey = getUserKey(profileUser.id);
          const isProtected = !!(profileUser as any).cannotBeDeleted;
          const showKeySection = isSuperAdmin && profileUser.role !== 'citizen';

          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: BG }}>
              {/* Modal header */}
              <LinearGradient colors={grad} style={s.modalHdr}>
                <Pressable style={s.modalBack} onPress={closeProfile}>
                  <Feather name="x" size={18} color="#fff" />
                </Pressable>
                <Text style={s.modalHdrTitle} numberOfLines={1}>
                  {editMode ? 'Edit Profile' : 'User Profile'}
                </Text>
                {!editMode ? (
                  <Pressable style={s.modalEditBtn} onPress={() => setEditMode(true)}>
                    <Feather name="edit-2" size={14} color="#fff" />
                    <Text style={s.modalEditBtnText}>Edit</Text>
                  </Pressable>
                ) : (
                  <Pressable style={s.modalEditBtn} onPress={() => setEditMode(false)}>
                    <Feather name="x" size={14} color="#fff" />
                    <Text style={s.modalEditBtnText}>Cancel</Text>
                  </Pressable>
                )}
              </LinearGradient>

              <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
                {/* Avatar section */}
                <View style={[s.avatarSection, { backgroundColor: grad[0] + '12' }]}>
                  <View style={s.avatarWrap}>
                    {(editMode ? editAvatar : profileUser.avatar) ? (
                      <Image source={{ uri: editMode ? editAvatar : profileUser.avatar }} style={s.profileAvatar} />
                    ) : (
                      <LinearGradient colors={grad} style={s.profileAvatar}>
                        <Text style={s.profileAvatarLetter}>
                          {(editMode ? editName[0] : profileUser.name[0])?.toUpperCase() ?? '?'}
                        </Text>
                      </LinearGradient>
                    )}
                    {editMode && (
                      <TouchableOpacity style={s.cameraBtn} onPress={pickPhoto} activeOpacity={0.8}>
                        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={s.cameraBtnGrad}>
                          <Feather name="camera" size={13} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                  {!editMode && (
                    <>
                      <Text style={s.profileName}>{profileUser.name}</Text>
                      <LinearGradient colors={grad} style={s.profileRolePill}>
                        <Text style={s.profileRoleText}>
                          {profileUser.role === 'safaikarmi' ? 'Safai Karmi'
                            : profileUser.role === 'official' ? 'Official'
                            : profileUser.role === 'citizen' ? 'Citizen' : 'Admin'}
                        </Text>
                      </LinearGradient>
                      <View style={[s.profileStatusPill, { backgroundColor: profileUser.isActive ? '#10B98120' : '#EF444420', borderColor: profileUser.isActive ? '#10B98140' : '#EF444440' }]}>
                        <View style={[s.profileStatusDot, { backgroundColor: profileUser.isActive ? '#10B981' : '#EF4444' }]} />
                        <Text style={[s.profileStatusText, { color: profileUser.isActive ? '#10B981' : '#EF4444' }]}>
                          {profileUser.isActive ? 'Active Account' : 'Frozen Account'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Info / Edit fields */}
                <View style={{ padding: 16, gap: 12 }}>
                  {editMode ? (
                    <>
                      <SectionHeading icon="user" label="Basic Information" color={grad[0]} />
                      <EditField label="Full Name" icon="user" value={editName} onChange={setEditName} caps="words" accentColor={grad[0]} />
                      <EditField label="Email Address" icon="mail" value={editEmail} onChange={setEditEmail} caps="none" keyboard="email-address" accentColor={grad[0]} />
                      <EditField label="Mobile Number" icon="phone" value={editMobile} onChange={setEditMobile} caps="none" keyboard="phone-pad" accentColor={grad[0]} />
                      <EditField label="Address" icon="map-pin" value={editAddress} onChange={setEditAddress} caps="sentences" accentColor={grad[0]} multiline />
                      {profileUser.role !== 'citizen' && (
                        <EditField label="Employee ID" icon="briefcase" value={editEmpId} onChange={setEditEmpId} caps="characters" accentColor={grad[0]} />
                      )}

                      {isSuperAdmin && (
                        <>
                          <SectionHeading icon="hash" label="User ID" color="#818CF8" />
                          <View>
                            <Text style={ef.label}>User ID</Text>
                            <View style={[ef.row, { borderColor: '#6366F140' }]}>
                              <Feather name="hash" size={15} color="#818CF8" />
                              <TextInput
                                style={[ef.input, { fontFamily: 'Inter_700Bold', letterSpacing: 1 }]}
                                value={editUserId}
                                onChangeText={v => setEditUserId(v.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
                                autoCapitalize="characters" autoCorrect={false}
                                placeholder="e.g. SK1234A" placeholderTextColor={MUTED}
                              />
                            </View>
                            <View style={[s.keyWarnBox, { marginTop: 6 }]}>
                              <Feather name="alert-triangle" size={11} color="#D97706" />
                              <Text style={s.keyWarnText}>Changing User ID updates all linked records. Use with caution.</Text>
                            </View>
                          </View>
                        </>
                      )}

                      {showKeySection && (
                        <>
                          <SectionHeading icon="key" label="Secret Key" color="#A78BFA" />
                          {linkedKey ? (
                            <>
                              <View style={[s.keyInfoBox, { backgroundColor: '#7C3AED0E', borderColor: '#7C3AED22' }]}>
                                <Feather name="info" size={12} color="#A78BFA" />
                                <Text style={s.keyInfoText}>
                                  Current: <Text style={s.keyInfoCode}>{linkedKey.code}</Text>
                                  {'  ·  '}
                                  <Text style={{ color: linkedKey.isActive ? '#10B981' : '#EF4444' }}>
                                    {linkedKey.isActive ? 'Active' : 'Revoked'}
                                  </Text>
                                </Text>
                              </View>
                              <View style={[s.editRow, { borderColor: '#7C3AED30' }]}>
                                <Feather name="key" size={15} color="#A78BFA" />
                                <TextInput
                                  style={[s.editInput, { fontFamily: 'Inter_700Bold', letterSpacing: 1.5 }]}
                                  value={editKeyCode}
                                  onChangeText={v => setEditKeyCode(v.replace(/[^A-Z0-9a-z]/g, '').toUpperCase())}
                                  autoCapitalize="characters" autoCorrect={false}
                                  secureTextEntry={!showKey}
                                  placeholder="New secret code…" placeholderTextColor={MUTED}
                                />
                                <Pressable onPress={() => setShowKey(p => !p)}>
                                  <Feather name={showKey ? 'eye-off' : 'eye'} size={15} color={MUTED} />
                                </Pressable>
                              </View>
                              <View style={s.keyWarnBox}>
                                <Feather name="alert-triangle" size={11} color="#D97706" />
                                <Text style={s.keyWarnText}>Changing the code requires the staff member to use the new code on next login.</Text>
                              </View>
                            </>
                          ) : (
                            <View style={{ gap: 10 }}>
                              <View style={[s.keyInfoBox, { backgroundColor: '#FBBF2410', borderColor: '#FBBF2422' }]}>
                                <Feather name="alert-circle" size={12} color="#FBBF24" />
                                <Text style={[s.keyInfoText, { color: '#D97706' }]}>No secret key linked. Assign one to enable staff registration.</Text>
                              </View>
                              {profileUser.role !== 'citizen' && (
                                <TouchableOpacity onPress={() => handleAssignKey(profileUser)} disabled={assigningKey} activeOpacity={0.85} style={assigningKey ? { opacity: 0.6 } : {}}>
                                  <LinearGradient colors={['#7C3AED', '#6366F1']} style={s.assignKeyBtn}>
                                    <Feather name={assigningKey ? 'loader' : 'key'} size={15} color="#fff" />
                                    <Text style={s.assignKeyBtnText}>{assigningKey ? 'Assigning…' : 'Assign New Secret Key'}</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              )}
                              {newlyAssignedKey && (
                                <View style={[s.newKeyReveal, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED30' }]}>
                                  <Feather name="check-circle" size={14} color="#A78BFA" />
                                  <Text style={[s.newKeyRevealTxt, { color: '#A78BFA' }]} numberOfLines={1}>{newlyAssignedKey.code}</Text>
                                  <Text style={s.newKeyRevealHint}>Tap to copy</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </>
                      )}

                      <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6, marginTop: 4 } : { marginTop: 4 }}>
                        <LinearGradient colors={grad} style={s.saveBtn}>
                          <Feather name="check" size={16} color="#fff" />
                          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <SectionHeading icon="info" label="Account Details" color={grad[0]} />
                      <InfoRow icon="hash"      label="User ID"     value={profileUser.id}             accentColor={grad[0]} mono copyable />
                      {profileUser.employeeId && <InfoRow icon="briefcase" label="Employee ID" value={profileUser.employeeId} accentColor={grad[0]} mono />}
                      <InfoRow icon="mail"      label="Email"        value={profileUser.email}           accentColor={grad[0]} />
                      {profileUser.mobile  && <InfoRow icon="phone"   label="Mobile"       value={profileUser.mobile}   accentColor={grad[0]} />}
                      {profileUser.address && <InfoRow icon="map-pin" label="Address"      value={profileUser.address}  accentColor={grad[0]} />}
                      {profileUser.createdAt && <InfoRow icon="calendar" label="Joined"    value={profileUser.createdAt} accentColor={grad[0]} />}

                      {showKeySection && (
                        <>
                          <SectionHeading icon="key" label="Secret Key" color="#A78BFA" />
                          {linkedKey ? (
                            <View style={[s.keyCard, { backgroundColor: '#7C3AED0A', borderColor: '#7C3AED22' }]}>
                              <LinearGradient colors={['#7C3AED', '#6366F1']} style={s.keyIconBox}>
                                <Feather name="key" size={14} color="#fff" />
                              </LinearGradient>
                              <View style={{ flex: 1 }}>
                                <Text style={s.keyCardCode} numberOfLines={1}>{linkedKey.code}</Text>
                                <Text style={s.keyCardMeta}>{linkedKey.role === 'safaikarmi' ? 'Safai Karmi' : 'Official'}  ·  {linkedKey.createdAt}</Text>
                              </View>
                              <View style={[s.keyStatusPill, { backgroundColor: linkedKey.isActive ? '#10B98120' : '#EF444420' }]}>
                                <View style={[s.keyStatusDot, { backgroundColor: linkedKey.isActive ? '#10B981' : '#EF4444' }]} />
                                <Text style={[s.keyStatusText, { color: linkedKey.isActive ? '#10B981' : '#EF4444' }]}>
                                  {linkedKey.isActive ? 'Active' : 'Revoked'}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={{ gap: 10 }}>
                              <View style={[s.keyInfoBox, { backgroundColor: '#FBBF2410', borderColor: '#FBBF2422' }]}>
                                <Feather name="alert-circle" size={12} color="#FBBF24" />
                                <Text style={[s.keyInfoText, { color: '#D97706' }]}>No secret key linked. Assign one below.</Text>
                              </View>
                              {profileUser.role !== 'citizen' && (
                                <TouchableOpacity onPress={() => handleAssignKey(profileUser)} disabled={assigningKey} activeOpacity={0.85} style={assigningKey ? { opacity: 0.6 } : {}}>
                                  <LinearGradient colors={['#7C3AED', '#6366F1']} style={s.assignKeyBtn}>
                                    <Feather name={assigningKey ? 'loader' : 'key'} size={15} color="#fff" />
                                    <Text style={s.assignKeyBtnText}>{assigningKey ? 'Assigning…' : 'Assign New Secret Key'}</Text>
                                  </LinearGradient>
                                </TouchableOpacity>
                              )}
                              {newlyAssignedKey && (
                                <View style={[s.newKeyReveal, { backgroundColor: '#7C3AED15', borderColor: '#7C3AED30' }]}>
                                  <Feather name="check-circle" size={14} color="#A78BFA" />
                                  <Text style={[s.newKeyRevealTxt, { color: '#A78BFA' }]} numberOfLines={1}>{newlyAssignedKey.code}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </>
                      )}

                      {!isProtected && (
                        <>
                          <SectionHeading icon="settings" label="Actions" color={MUTED} />
                          <View style={s.actionsGrid}>
                            <TouchableOpacity
                              style={[s.actionCard, { backgroundColor: profileUser.isActive ? '#D9770618' : '#10B98118', borderColor: profileUser.isActive ? '#D9770630' : '#10B98130', flex: 1 }]}
                              onPress={() => handleFreeze(profileUser)} activeOpacity={0.8}
                            >
                              <Feather name={profileUser.isActive ? 'lock' : 'unlock'} size={18} color={profileUser.isActive ? '#FBBF24' : '#10B981'} />
                              <Text style={[s.actionCardText, { color: profileUser.isActive ? '#FBBF24' : '#10B981' }]}>
                                {profileUser.isActive ? 'Freeze' : 'Unfreeze'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[s.actionCard, { backgroundColor: '#EF444418', borderColor: '#EF444430', flex: 1 }]}
                              onPress={() => handleDelete(profileUser)} activeOpacity={0.8}
                            >
                              <Feather name="trash-2" size={18} color="#F87171" />
                              <Text style={[s.actionCardText, { color: '#F87171' }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      )}

                      {isProtected && (
                        <View style={[s.protectedNote, { backgroundColor: '#7C3AED0A', borderColor: '#7C3AED20' }]}>
                          <LinearGradient colors={['#7C3AED', '#6366F1']} style={s.protectedIcon}>
                            <Feather name="star" size={12} color="#FFD700" />
                          </LinearGradient>
                          <Text style={s.protectedText}>Super Admin · This account is protected and cannot be deleted or frozen.</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>
    </SafeAreaView>
  );
}

/* ── sub-components ──────────────────────────────────────────── */

function InfoPill({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <View style={ip.wrap}>
      <Feather name={icon as any} size={10} color={color} />
      <Text style={[ip.val, { color }]}>{value}</Text>
      <Text style={ip.lbl}>{label}</Text>
    </View>
  );
}
const ip = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1, gap: 1 },
  val:  { fontSize: 15, fontFamily: 'Inter_700Bold', lineHeight: 18 },
  lbl:  { fontSize: 9, fontFamily: 'Inter_500Medium', color: MUTED, letterSpacing: 0.3 },
});

function SectionHeading({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={sh.wrap}>
      <Feather name={icon as any} size={12} color={color} />
      <Text style={[sh.label, { color }]}>{label}</Text>
      <View style={[sh.line, { backgroundColor: color + '22' }]} />
    </View>
  );
}
const sh = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  label: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  line:  { flex: 1, height: 1 },
});

function InfoRow({
  icon, label, value, accentColor, mono = false, copyable = false,
}: { icon: string; label: string; value: string; accentColor: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = React.useState(false);
  async function handleCopy() {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  const inner = (
    <View style={[ir.row, { backgroundColor: copied ? '#10B98110' : GLASS, borderColor: copied ? '#10B98140' : GLASS_BD }]}>
      <View style={[ir.iconBox, { backgroundColor: copied ? '#10B98122' : accentColor + '18' }]}>
        <Feather name={copied ? 'check' : icon as any} size={14} color={copied ? '#10B981' : accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ir.label, { color: copied ? '#10B981' : MUTED }]}>{copied ? 'Copied!' : label}</Text>
        <Text style={[ir.value, { color: copied ? '#10B981' : TEXT, fontFamily: mono ? 'Inter_700Bold' : 'Inter_500Medium' }]} numberOfLines={2}>{value}</Text>
      </View>
      {copyable && !copied && (
        <View style={ir.copyHint}>
          <Feather name="copy" size={12} color={accentColor} />
        </View>
      )}
    </View>
  );
  if (!copyable) return inner;
  return <TouchableOpacity activeOpacity={0.75} onPress={handleCopy}>{inner}</TouchableOpacity>;
}
const ir = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  iconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  copyHint:{ width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: GLASS },
  label:   { fontSize: 10, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  value:   { fontSize: 14, lineHeight: 19 },
});

function EditField({
  label, icon, value, onChange, caps, keyboard, accentColor, multiline = false,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  caps?: 'none' | 'sentences' | 'words' | 'characters';
  keyboard?: 'default' | 'email-address' | 'phone-pad';
  accentColor: string; multiline?: boolean;
}) {
  return (
    <View>
      <Text style={ef.label}>{label}</Text>
      <View style={[ef.row, { borderColor: accentColor + '40' }]}>
        <Feather name={icon as any} size={15} color={accentColor} />
        <TextInput
          style={[ef.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
          value={value} onChangeText={onChange}
          autoCapitalize={caps ?? 'sentences'} keyboardType={keyboard ?? 'default'}
          placeholder={label} placeholderTextColor={MUTED} multiline={multiline}
        />
      </View>
    </View>
  );
}
const ef = StyleSheet.create({
  label: { fontSize: 10, fontFamily: 'Inter_600SemiBold', color: MUTED, marginBottom: 5 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 13, paddingVertical: 2, backgroundColor: GLASS },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 12, color: TEXT },
});

/* ── main styles ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  list: { flex: 1, backgroundColor: BG },

  /* info bar */
  infoBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: GLASS_BD,
    overflow: 'hidden',
  },
  infoDivider: { width: 1, height: 28, backgroundColor: GLASS_BD, marginHorizontal: 2 },
  syncPill: { flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 4 },
  syncDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  syncText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#10B981', letterSpacing: 0.3 },

  /* search */
  searchWrap: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: GLASS_BD },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS, paddingHorizontal: 12, paddingVertical: 9 },
  searchInput:{ flex: 1, fontSize: 13, fontFamily: 'Inter_400Regular', color: TEXT, padding: 0 },

  /* filters */
  filterRow:      { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  filterGroup:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  filterChip:     { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 99, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 4 },
  filterChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  filterDot:      { width: 5, height: 5, borderRadius: 3 },
  filterResultRow:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' },
  filterCount:    { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  clearAllBtn:    { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 99, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  clearAllText:   { fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  /* tabs */
  tabRow:  { flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: GLASS_BD, backgroundColor: 'rgba(255,255,255,0.02)' },
  tabItem: { flex: 1 },
  tabPillActive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 4,
  },
  tabLabelActive:  { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  tabCountBubble:  { backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 99, paddingHorizontal: 4, paddingVertical: 1 },
  tabCountText:    { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  tabPillInactive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 4,
    borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS,
  },
  tabLabelInactive: { fontSize: 9, fontFamily: 'Inter_500Medium', color: MUTED },
  tabCountInactive: { fontSize: 8, fontFamily: 'Inter_600SemiBold', color: MUTED },

  /* table */
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: GLASS_BD, backgroundColor: 'rgba(99,102,241,0.08)' },
  thNo:   { width: 30, fontSize: 9, fontFamily: 'Inter_700Bold', color: '#818CF8', textTransform: 'uppercase', letterSpacing: 0.4 },
  thName: { flex: 1,   fontSize: 9, fontFamily: 'Inter_700Bold', color: '#818CF8', textTransform: 'uppercase', letterSpacing: 0.4 },
  thId:   { width: 68, fontSize: 9, fontFamily: 'Inter_700Bold', color: '#818CF8', textTransform: 'uppercase', letterSpacing: 0.4 },
  thCode: { width: 80, fontSize: 9, fontFamily: 'Inter_700Bold', color: '#818CF8', textTransform: 'uppercase', letterSpacing: 0.4 },

  tableRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: GLASS_BD },
  tdNo:        { width: 30, fontSize: 11, fontFamily: 'Inter_500Medium', color: MUTED },
  tdNameCell:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  rowAvatar:     { width: 30, height: 30, borderRadius: 15 },
  rowAvatarGrad: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rowAvatarLetter: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  tdName:    { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: TEXT },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  empIdLabel:  { fontSize: 9, fontFamily: 'Inter_400Regular', color: MUTED, marginLeft: 2 },
  tdId:        { width: 68, fontSize: 10, fontFamily: 'Inter_500Medium', color: MUTED },
  tdCodeCell:  { width: 88, alignItems: 'flex-start', marginRight: 6 },
  codePill:    { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, maxWidth: 86 },
  codeText:    { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },

  /* empty */
  emptyWrap:  { margin: 24, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, padding: 36, alignItems: 'center', gap: 12, backgroundColor: GLASS },
  emptyIcon:  { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold', color: TEXT },
  emptyHint:  { fontSize: 12, fontFamily: 'Inter_400Regular', color: MUTED },

  /* modal */
  modalHdr:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  modalBack:     { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalHdrTitle: { flex: 1, color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },
  modalEditBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  modalEditBtnText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  /* avatar section */
  avatarSection:     { alignItems: 'center', paddingVertical: 22, gap: 10 },
  avatarWrap:        { position: 'relative' },
  profileAvatar:     { width: 86, height: 86, borderRadius: 43, justifyContent: 'center', alignItems: 'center' },
  profileAvatarLetter: { color: '#fff', fontSize: 34, fontFamily: 'Inter_700Bold' },
  cameraBtn:         { position: 'absolute', bottom: 0, right: 0 },
  cameraBtnGrad:     { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: BG },
  profileName:       { fontSize: 19, fontFamily: 'Inter_700Bold', textAlign: 'center', color: TEXT },
  profileRolePill:   { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 99 },
  profileRoleText:   { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  profileStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  profileStatusDot:  { width: 6, height: 6, borderRadius: 3 },
  profileStatusText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  /* key card */
  keyCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  keyIconBox:  { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  keyCardCode: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#A78BFA', letterSpacing: 1.5 },
  keyCardMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, color: MUTED },
  keyStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  keyStatusDot:  { width: 5, height: 5, borderRadius: 3 },
  keyStatusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },

  /* key edit */
  keyInfoBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  keyInfoText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#A78BFA', flex: 1 },
  keyInfoCode: { fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  editRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 13, backgroundColor: GLASS },
  editInput:   { flex: 1, fontSize: 14, paddingVertical: 12, color: TEXT },
  keyWarnBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#D9770610', borderRadius: 10, borderWidth: 1, borderColor: '#D9770625', padding: 10 },
  keyWarnText: { color: '#D97706', fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 16 },
  assignKeyBtn:     { borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13 },
  assignKeyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  newKeyReveal:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  newKeyRevealTxt: { flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  newKeyRevealHint:{ fontSize: 10, fontFamily: 'Inter_400Regular', color: MUTED },

  /* actions */
  actionsGrid:  { flexDirection: 'row', gap: 12 },
  actionCard:   { borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1 },
  actionCardText: { fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center' },

  /* protected */
  protectedNote: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  protectedIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  protectedText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#A78BFA', lineHeight: 18 },

  /* save */
  saveBtn:     { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
});
