import { Feather } from '@expo/vector-icons';
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
import { useColors } from '@/hooks/useColors';
import type { User } from '@/types';

/* ─── constants ──────────────────────────────────────────────── */
type RoleTab = 'all' | 'safaikarmi' | 'official' | 'citizen';

const ALL_TABS: { key: RoleTab; label: string; icon: string; grad: readonly [string, string] }[] = [
  { key: 'all',        label: 'All Users',   icon: 'users',     grad: ['#6366F1', '#8B5CF6'] },
  { key: 'safaikarmi', label: 'Safai Karmi', icon: 'trash-2',   grad: ['#10B981', '#059669'] },
  { key: 'official',   label: 'Official',    icon: 'briefcase', grad: ['#F59E0B', '#EF4444'] },
  { key: 'citizen',    label: 'Citizen',     icon: 'user',      grad: ['#0EA5E9', '#2563EB'] },
];

const STAT_CARDS: { key: 'total' | RoleTab; label: string; icon: string; grad: readonly [string, string] }[] = [
  { key: 'total',      label: 'Total Users',  icon: 'users',     grad: ['#6366F1', '#8B5CF6'] },
  { key: 'safaikarmi', label: 'Safai Karmi',  icon: 'trash-2',   grad: ['#10B981', '#059669'] },
  { key: 'official',   label: 'Official',     icon: 'briefcase', grad: ['#F59E0B', '#EF4444'] },
  { key: 'citizen',    label: 'Citizen',      icon: 'user',      grad: ['#0EA5E9', '#2563EB'] },
];

const ROLE_GRAD: Record<string, readonly [string, string]> = {
  safaikarmi: ['#10B981', '#059669'],
  official:   ['#F59E0B', '#EF4444'],
  citizen:    ['#0EA5E9', '#2563EB'],
  admin:      ['#6366F1', '#8B5CF6'],
};

/* ─── component ──────────────────────────────────────────────── */
export default function AdminUsers() {
  const { users, updateUser, deleteUser, secretKeys, updateSecretKeyCode } = useAppData();
  const { user: currentUser } = useAuth();
  const colors = useColors();
  const { showAlert } = useAlert();
  const isSuperAdmin = !!(currentUser as any)?.isSuperAdmin;

  /* tabs visible to this admin role */
  const TABS = isSuperAdmin ? ALL_TABS : ALL_TABS.filter(t => t.key !== 'citizen');

  /* list state */
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<RoleTab>('all');

  /* profile modal state */
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [editMode, setEditMode] = useState(false);

  /* edit fields */
  const [editName, setEditName]       = useState('');
  const [editEmail, setEditEmail]     = useState('');
  const [editMobile, setEditMobile]   = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editEmpId, setEditEmpId]     = useState('');
  const [editAvatar, setEditAvatar]   = useState('');
  const [editKeyCode, setEditKeyCode] = useState('');
  const [showKey, setShowKey]         = useState(false);
  const [saving, setSaving]           = useState(false);

  /* stats counts */
  const countSafaikarmi = users.filter(u => u.role === 'safaikarmi').length;
  const countOfficial   = users.filter(u => u.role === 'official').length;
  const countCitizen    = users.filter(u => u.role === 'citizen').length;
  const countTotal      = users.length;

  function statCount(key: 'total' | RoleTab): number {
    if (key === 'total')      return countTotal;
    if (key === 'safaikarmi') return countSafaikarmi;
    if (key === 'official')   return countOfficial;
    if (key === 'citizen')    return countCitizen;
    return 0;
  }

  /* derived list — 'all' tab shows safaikarmi + official + admin (no citizens) */
  const tabList = users
    .filter(u =>
      activeTab === 'all'
        ? u.role === 'safaikarmi' || u.role === 'official' || u.role === 'admin'
        : u.role === activeTab
    )
    .filter(u => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q) ||
        (u.employeeId ?? '').toLowerCase().includes(q)
      );
    });

  function getUserKey(userId: string) {
    return secretKeys.find(k => k.usedBy === userId) ?? null;
  }

  /* open profile */
  function openProfile(u: User) {
    const key = getUserKey(u.id);
    setProfileUser(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditMobile(u.mobile ?? '');
    setEditAddress(u.address ?? '');
    setEditEmpId(u.employeeId ?? '');
    setEditAvatar(u.avatar ?? '');
    setEditKeyCode(key?.code ?? '');
    setShowKey(false);
    setEditMode(false);
  }

  function closeProfile() {
    setProfileUser(null);
    setEditMode(false);
  }

  /* pick photo */
  async function pickPhoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission Required', 'Allow photo library access to add a profile picture.', undefined, 'warning');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
      base64: false,
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatar(result.assets[0].uri);
    }
  }

  /* save edits */
  async function handleSave() {
    if (!profileUser) return;
    /* authz: non-super-admins cannot edit citizens */
    if (!isSuperAdmin && profileUser.role === 'citizen') return;
    if (!editName.trim()) {
      showAlert('Required', 'Name cannot be empty.', undefined, 'warning');
      return;
    }
    setSaving(true);
    try {
      await updateUser(profileUser.id, {
        name:       editName.trim(),
        email:      editEmail.trim(),
        mobile:     editMobile.trim() || undefined,
        address:    editAddress.trim() || undefined,
        employeeId: editEmpId.trim() || undefined,
        avatar:     editAvatar || undefined,
      });
      /* update secret key if changed */
      if (isSuperAdmin && profileUser.role !== 'citizen') {
        const key = getUserKey(profileUser.id);
        if (key && editKeyCode.trim() && editKeyCode.trim().toUpperCase() !== key.code) {
          await updateSecretKeyCode(key.id, editKeyCode.trim().toUpperCase());
        }
      }
      /* refresh local copy */
      setProfileUser(prev =>
        prev ? { ...prev, name: editName.trim(), email: editEmail.trim(),
          mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined,
          employeeId: editEmpId.trim() || undefined, avatar: editAvatar || undefined } : prev
      );
      setEditMode(false);
      showAlert('Saved', 'Profile updated successfully.', undefined, 'success');
    } finally {
      setSaving(false);
    }
  }

  /* freeze */
  function handleFreeze(u: User) {
    if (!isSuperAdmin && u.role === 'citizen') return;
    if ((u as any).cannotBeDeleted) {
      showAlert('Protected', 'This account cannot be modified.', undefined, 'warning');
      return;
    }
    showAlert(
      u.isActive ? 'Freeze Account?' : 'Unfreeze Account?',
      `${u.name} will ${u.isActive ? 'lose' : 'regain'} access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: u.isActive ? 'Freeze' : 'Unfreeze',
          onPress: () => {
            updateUser(u.id, { isActive: !u.isActive });
            setProfileUser(prev => prev ? { ...prev, isActive: !u.isActive } : prev);
          },
        },
      ],
      'warning'
    );
  }

  /* delete */
  function handleDelete(u: User) {
    if (!isSuperAdmin && u.role === 'citizen') return;
    if ((u as any).cannotBeDeleted) {
      showAlert('Protected', 'This account cannot be deleted.', undefined, 'warning');
      return;
    }
    showAlert(
      'Delete User?',
      `Permanently remove ${u.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { deleteUser(u.id); closeProfile(); },
        },
      ],
      'error'
    );
  }

  const currentTab = TABS.find(t => t.key === activeTab) ?? TABS[0]!;

  /* ── render ──────────────────────────────────────────── */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>

      {/* ── Stats Cards ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: colors.background }}
        contentContainerStyle={s.statsRow}
      >
        {STAT_CARDS.map(card => {
          const count = statCount(card.key);
          return (
            <LinearGradient key={card.key} colors={card.grad} style={s.statCard}>
              <View style={s.statIconBox}>
                <Feather name={card.icon as any} size={16} color="rgba(255,255,255,0.85)" />
              </View>
              <Text style={s.statCount}>{count}</Text>
              <Text style={s.statLabel} numberOfLines={1}>{card.label}</Text>
            </LinearGradient>
          );
        })}
      </ScrollView>

      {/* ── Search bar ── */}
      <View style={[s.searchWrap, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={[s.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.text }]}
            placeholder="Search name or ID…"
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Feather name="x-circle" size={15} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── 4 Tabs ── */}
      <View style={[s.tabRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          const countAdmin = users.filter(u => u.role === 'admin').length;
          const count  = tab.key === 'all'
            ? countSafaikarmi + countOfficial + countAdmin
            : users.filter(u => u.role === tab.key).length;
          return (
            <TouchableOpacity key={tab.key} style={s.tabItem} onPress={() => setActiveTab(tab.key)} activeOpacity={0.75}>
              {active ? (
                <LinearGradient colors={tab.grad} style={s.tabPillActive}>
                  <Feather name={tab.icon as any} size={13} color="#fff" />
                  <Text style={s.tabLabelActive}>{tab.label}</Text>
                  <View style={s.tabCountBubble}>
                    <Text style={s.tabCountText}>{count}</Text>
                  </View>
                </LinearGradient>
              ) : (
                <View style={[s.tabPillInactive, { borderColor: colors.border }]}>
                  <Feather name={tab.icon as any} size={13} color={colors.mutedForeground} />
                  <Text style={[s.tabLabelInactive, { color: colors.mutedForeground }]}>{tab.label}</Text>
                  <Text style={[s.tabCountInactive, { color: colors.mutedForeground }]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Table header ── */}
      <View style={[s.tableHead, { backgroundColor: colors.surface ?? '#F8FAFC', borderBottomColor: colors.border }]}>
        <Text style={[s.thNo,   { color: colors.mutedForeground }]}>S.No</Text>
        <Text style={[s.thName, { color: colors.mutedForeground }]}>User Name</Text>
        <Text style={[s.thId,   { color: colors.mutedForeground }]}>User ID</Text>
        {activeTab !== 'citizen' && (
          <Text style={[s.thCode, { color: colors.mutedForeground }]}>Secret Code</Text>
        )}
      </View>

      {/* ── Table rows ── */}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {tabList.length === 0 ? (
          <View style={[s.emptyWrap, { borderColor: colors.border }]}>
            <LinearGradient colors={currentTab.grad} style={s.emptyIcon}>
              <Feather name={currentTab.icon as any} size={26} color="#fff" />
            </LinearGradient>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No {currentTab.label}s found</Text>
            {search ? <Text style={[s.emptyHint, { color: colors.mutedForeground }]}>Try a different search term</Text> : null}
          </View>
        ) : (
          tabList.map((u, idx) => {
            const linkedKey = getUserKey(u.id);
            const isEven = idx % 2 === 0;
            return (
              <TouchableOpacity
                key={u.id}
                activeOpacity={0.7}
                onPress={() => openProfile(u)}
                style={[
                  s.tableRow,
                  {
                    backgroundColor: isEven ? colors.background : (colors.card),
                    borderBottomColor: colors.border,
                    opacity: u.isActive ? 1 : 0.55,
                  },
                ]}
              >
                {/* S.No */}
                <Text style={[s.tdNo, { color: colors.mutedForeground }]}>{idx + 1}</Text>

                {/* Name + emp ID + status dot */}
                <View style={s.tdNameCell}>
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={s.rowAvatar} />
                  ) : (
                    <LinearGradient colors={ROLE_GRAD[u.role]} style={s.rowAvatarGrad}>
                      <Text style={s.rowAvatarLetter}>{u.name[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[s.tdName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                    <View style={s.statusRow}>
                      <View style={[s.statusDot, { backgroundColor: u.isActive ? '#10B981' : '#EF4444' }]} />
                      <Text style={[s.statusLabel, { color: u.isActive ? '#059669' : '#EF4444' }]}>
                        {u.isActive ? 'Active' : 'Frozen'}
                      </Text>
                      {u.employeeId ? (
                        <Text style={[s.statusLabel, { color: colors.mutedForeground, marginLeft: 4 }]}>
                          · {u.employeeId}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>

                {/* User ID (canonical system ID) */}
                <Text style={[s.tdId, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {u.id}
                </Text>

                {/* Secret Code (non-citizen) */}
                {activeTab !== 'citizen' && (
                  <View style={s.tdCodeCell}>
                    {linkedKey ? (
                      <View style={[s.codePill, { backgroundColor: currentTab.grad[0] + '18' }]}>
                        <Text style={[s.codeText, { color: currentTab.grad[0] }]}>{linkedKey.code}</Text>
                      </View>
                    ) : (
                      <Text style={[s.noCode, { color: colors.mutedForeground }]}>—</Text>
                    )}
                  </View>
                )}

                {/* Chevron */}
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ════════════════════════════════════════════════════
          PROFILE MODAL
      ════════════════════════════════════════════════════ */}
      <Modal visible={!!profileUser} animationType="slide" presentationStyle="pageSheet">
        {profileUser && (() => {
          const grad      = ROLE_GRAD[profileUser.role];
          const linkedKey = getUserKey(profileUser.id);
          const isProtected = !!(profileUser as any).cannotBeDeleted;
          const showKeySection = isSuperAdmin && profileUser.role !== 'citizen';

          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>

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
                    <Feather name="edit-2" size={15} color="#fff" />
                    <Text style={s.modalEditBtnText}>Edit</Text>
                  </Pressable>
                ) : (
                  <Pressable style={s.modalEditBtn} onPress={() => setEditMode(false)}>
                    <Feather name="x" size={15} color="#fff" />
                    <Text style={s.modalEditBtnText}>Cancel</Text>
                  </Pressable>
                )}
              </LinearGradient>

              <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>

                {/* ── Avatar section ── */}
                <View style={[s.avatarSection, { backgroundColor: grad[0] + '10' }]}>
                  <View style={s.avatarWrap}>
                    {(editMode ? editAvatar : profileUser.avatar) ? (
                      <Image
                        source={{ uri: editMode ? editAvatar : profileUser.avatar }}
                        style={s.profileAvatar}
                      />
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
                          <Feather name="camera" size={14} color="#fff" />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>

                  {!editMode && (
                    <>
                      <Text style={[s.profileName, { color: colors.text }]}>{profileUser.name}</Text>
                      <LinearGradient colors={grad} style={s.profileRolePill}>
                        <Text style={s.profileRoleText}>
                          {profileUser.role === 'safaikarmi' ? 'Safai Karmi'
                            : profileUser.role === 'official' ? 'Official'
                            : profileUser.role === 'citizen' ? 'Citizen' : 'Admin'}
                        </Text>
                      </LinearGradient>
                      <View style={[s.profileStatusPill, { backgroundColor: profileUser.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                        <View style={[s.profileStatusDot, { backgroundColor: profileUser.isActive ? '#10B981' : '#EF4444' }]} />
                        <Text style={[s.profileStatusText, { color: profileUser.isActive ? '#059669' : '#DC2626' }]}>
                          {profileUser.isActive ? 'Active Account' : 'Frozen Account'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                {/* ── Info / Edit fields ── */}
                <View style={{ padding: 16, gap: 12 }}>

                  {editMode ? (
                    /* ── EDIT FIELDS ── */
                    <>
                      <SectionHeading icon="user" label="Basic Information" color={grad[0]} />

                      <EditField
                        label="Full Name"
                        icon="user"
                        value={editName}
                        onChange={setEditName}
                        caps="words"
                        colors={colors}
                        accentColor={grad[0]}
                      />
                      <EditField
                        label="Email Address"
                        icon="mail"
                        value={editEmail}
                        onChange={setEditEmail}
                        caps="none"
                        keyboard="email-address"
                        colors={colors}
                        accentColor={grad[0]}
                      />
                      <EditField
                        label="Mobile Number"
                        icon="phone"
                        value={editMobile}
                        onChange={setEditMobile}
                        caps="none"
                        keyboard="phone-pad"
                        colors={colors}
                        accentColor={grad[0]}
                      />
                      <EditField
                        label="Address"
                        icon="map-pin"
                        value={editAddress}
                        onChange={setEditAddress}
                        caps="sentences"
                        colors={colors}
                        accentColor={grad[0]}
                        multiline
                      />
                      {profileUser.role !== 'citizen' && (
                        <EditField
                          label="Employee ID"
                          icon="briefcase"
                          value={editEmpId}
                          onChange={setEditEmpId}
                          caps="characters"
                          colors={colors}
                          accentColor={grad[0]}
                        />
                      )}

                      {/* Secret Key edit (Super Admin only) */}
                      {showKeySection && (
                        <>
                          <SectionHeading icon="key" label="Secret Key" color="#7C3AED" />
                          {linkedKey ? (
                            <>
                              <View style={[s.keyInfoBox, { backgroundColor: '#7C3AED0E', borderColor: '#7C3AED22' }]}>
                                <Feather name="info" size={12} color="#7C3AED" />
                                <Text style={s.keyInfoText}>
                                  Current code: <Text style={s.keyInfoCode}>{linkedKey.code}</Text>
                                  {'  ·  '}
                                  <Text style={{ color: linkedKey.isActive ? '#10B981' : '#EF4444' }}>
                                    {linkedKey.isActive ? 'Active' : 'Revoked'}
                                  </Text>
                                </Text>
                              </View>
                              <View style={[s.editRow, { backgroundColor: colors.card, borderColor: '#7C3AED30' }]}>
                                <Feather name="key" size={16} color="#7C3AED" />
                                <TextInput
                                  style={[s.editInput, { color: colors.text, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 }]}
                                  value={editKeyCode}
                                  onChangeText={v => setEditKeyCode(v.replace(/[^A-Z0-9a-z]/g, '').toUpperCase())}
                                  autoCapitalize="characters"
                                  autoCorrect={false}
                                  secureTextEntry={!showKey}
                                  placeholder="New secret code…"
                                  placeholderTextColor={colors.mutedForeground}
                                />
                                <Pressable onPress={() => setShowKey(p => !p)}>
                                  <Feather name={showKey ? 'eye-off' : 'eye'} size={15} color={colors.mutedForeground} />
                                </Pressable>
                              </View>
                              <View style={s.keyWarnBox}>
                                <Feather name="alert-triangle" size={11} color="#D97706" />
                                <Text style={s.keyWarnText}>
                                  Changing the code will require the staff member to use the new code on next login. Share it securely.
                                </Text>
                              </View>
                            </>
                          ) : (
                            <View style={[s.keyInfoBox, { backgroundColor: '#FEF3C710', borderColor: '#F59E0B22' }]}>
                              <Feather name="info" size={12} color="#F59E0B" />
                              <Text style={[s.keyInfoText, { color: '#92400E' }]}>
                                No linked secret key for this user.
                              </Text>
                            </View>
                          )}
                        </>
                      )}

                      {/* Save button */}
                      <TouchableOpacity
                        onPress={handleSave}
                        disabled={saving}
                        activeOpacity={0.85}
                        style={saving ? { opacity: 0.6, marginTop: 4 } : { marginTop: 4 }}
                      >
                        <LinearGradient colors={grad} style={s.saveBtn}>
                          <Feather name="check" size={16} color="#fff" />
                          <Text style={s.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  ) : (
                    /* ── VIEW DETAILS ── */
                    <>
                      <SectionHeading icon="info" label="Account Details" color={grad[0]} />

                      <InfoRow icon="hash"        label="User ID"        value={profileUser.id}               colors={colors} accentColor={grad[0]} mono />
                      {profileUser.employeeId && (
                        <InfoRow icon="briefcase" label="Employee ID"    value={profileUser.employeeId}       colors={colors} accentColor={grad[0]} mono />
                      )}
                      <InfoRow icon="mail"         label="Email"          value={profileUser.email}            colors={colors} accentColor={grad[0]} />
                      {profileUser.mobile && (
                        <InfoRow icon="phone"      label="Mobile"         value={profileUser.mobile}           colors={colors} accentColor={grad[0]} />
                      )}
                      {profileUser.address && (
                        <InfoRow icon="map-pin"    label="Address"        value={profileUser.address}          colors={colors} accentColor={grad[0]} />
                      )}
                      {profileUser.createdAt && (
                        <InfoRow icon="calendar"   label="Joined"         value={profileUser.createdAt}        colors={colors} accentColor={grad[0]} />
                      )}

                      {/* Secret Key (Super Admin, non-citizen) */}
                      {showKeySection && (
                        <>
                          <SectionHeading icon="key" label="Secret Key" color="#7C3AED" />
                          {linkedKey ? (
                            <View style={[s.keyCard, { backgroundColor: '#7C3AED0A', borderColor: '#7C3AED22' }]}>
                              <LinearGradient colors={['#7C3AED', '#6366F1']} style={s.keyIconBox}>
                                <Feather name="key" size={14} color="#fff" />
                              </LinearGradient>
                              <View style={{ flex: 1 }}>
                                <Text style={s.keyCardCode}>{linkedKey.code}</Text>
                                <Text style={[s.keyCardMeta, { color: colors.mutedForeground }]}>
                                  Role: {linkedKey.role}  ·  Created {linkedKey.createdAt}
                                </Text>
                              </View>
                              <View style={[s.keyStatusPill, { backgroundColor: linkedKey.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                                <View style={[s.keyStatusDot, { backgroundColor: linkedKey.isActive ? '#10B981' : '#EF4444' }]} />
                                <Text style={[s.keyStatusText, { color: linkedKey.isActive ? '#059669' : '#DC2626' }]}>
                                  {linkedKey.isActive ? 'Active' : 'Revoked'}
                                </Text>
                              </View>
                            </View>
                          ) : (
                            <View style={[s.keyInfoBox, { backgroundColor: '#FEF3C710', borderColor: '#F59E0B22' }]}>
                              <Feather name="alert-circle" size={12} color="#F59E0B" />
                              <Text style={[s.keyInfoText, { color: '#92400E' }]}>No linked secret key</Text>
                            </View>
                          )}
                        </>
                      )}

                      {/* ── Action buttons ── */}
                      {!isProtected && (
                        <>
                          <SectionHeading icon="settings" label="Actions" color={colors.mutedForeground} />

                          <View style={s.actionsGrid}>
                            {/* Freeze / Unfreeze */}
                            <TouchableOpacity
                              style={[s.actionCard, { backgroundColor: profileUser.isActive ? '#FEF3C7' : '#D1FAE5', flex: 1 }]}
                              onPress={() => handleFreeze(profileUser)}
                              activeOpacity={0.8}
                            >
                              <Feather name={profileUser.isActive ? 'lock' : 'unlock'} size={18} color={profileUser.isActive ? '#D97706' : '#059669'} />
                              <Text style={[s.actionCardText, { color: profileUser.isActive ? '#D97706' : '#059669' }]}>
                                {profileUser.isActive ? 'Freeze Account' : 'Unfreeze Account'}
                              </Text>
                            </TouchableOpacity>

                            {/* Delete */}
                            <TouchableOpacity
                              style={[s.actionCard, { backgroundColor: '#FEE2E2', flex: 1 }]}
                              onPress={() => handleDelete(profileUser)}
                              activeOpacity={0.8}
                            >
                              <Feather name="trash-2" size={18} color="#EF4444" />
                              <Text style={[s.actionCardText, { color: '#EF4444' }]}>Delete User</Text>
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

function SectionHeading({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={sh.wrap}>
      <Feather name={icon as any} size={13} color={color} />
      <Text style={[sh.label, { color }]}>{label}</Text>
      <View style={[sh.line, { backgroundColor: color + '22' }]} />
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  label: { fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textTransform: 'uppercase' },
  line:  { flex: 1, height: 1 },
});

function InfoRow({
  icon, label, value, colors, accentColor, mono = false,
}: {
  icon: string; label: string; value: string;
  colors: any; accentColor: string; mono?: boolean;
}) {
  return (
    <View style={[ir.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[ir.iconBox, { backgroundColor: accentColor + '15' }]}>
        <Feather name={icon as any} size={14} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[ir.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[ir.value, { color: colors.text, fontFamily: mono ? 'Inter_700Bold' : 'Inter_500Medium' }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const ir = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label:   { fontSize: 10, fontFamily: 'Inter_500Medium', marginBottom: 2 },
  value:   { fontSize: 14, lineHeight: 19 },
});

function EditField({
  label, icon, value, onChange, caps, keyboard, colors, accentColor, multiline = false,
}: {
  label: string; icon: string; value: string; onChange: (v: string) => void;
  caps?: 'none' | 'sentences' | 'words' | 'characters';
  keyboard?: 'default' | 'email-address' | 'phone-pad';
  colors: any; accentColor: string; multiline?: boolean;
}) {
  return (
    <View>
      <Text style={[ef.label, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[ef.row, { backgroundColor: colors.card, borderColor: accentColor + '40' }]}>
        <Feather name={icon as any} size={15} color={accentColor} />
        <TextInput
          style={[ef.input, { color: colors.text }, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
          value={value}
          onChangeText={onChange}
          autoCapitalize={caps ?? 'sentences'}
          keyboardType={keyboard ?? 'default'}
          placeholder={label}
          placeholderTextColor={colors.mutedForeground}
          multiline={multiline}
        />
      </View>
    </View>
  );
}

const ef = StyleSheet.create({
  label: { fontSize: 11, fontFamily: 'Inter_600SemiBold', marginBottom: 5 },
  row:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 13, paddingVertical: 2 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
});

/* ── main styles ──────────────────────────────────────────────── */
const s = StyleSheet.create({
  /* stats cards */
  statsRow:    { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 12 },
  statCard:    { width: 100, borderRadius: 14, padding: 12, gap: 4, alignItems: 'flex-start' },
  statIconBox: { width: 30, height: 30, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statCount:   { fontSize: 22, fontFamily: 'Inter_700Bold', color: '#fff', lineHeight: 26 },
  statLabel:   { fontSize: 10, fontFamily: 'Inter_500Medium', color: 'rgba(255,255,255,0.82)', letterSpacing: 0.2 },

  /* search */
  searchWrap:  { padding: 12, paddingBottom: 10, borderBottomWidth: 1 },
  searchBox:   { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', padding: 0 },

  /* tabs */
  tabRow:  { flexDirection: 'row', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  tabItem: { flex: 1 },
  tabPillActive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 4,
  },
  tabLabelActive: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  tabCountBubble: { backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: 99, paddingHorizontal: 4, paddingVertical: 1 },
  tabCountText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  tabPillInactive: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, borderRadius: 99, paddingVertical: 7, paddingHorizontal: 4, borderWidth: 1,
  },
  tabLabelInactive: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  tabCountInactive: { fontSize: 8, fontFamily: 'Inter_600SemiBold' },

  /* table head */
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderBottomWidth: 1 },
  thNo:   { width: 32, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thName: { flex: 1,   fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thId:   { width: 72, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  thCode: { width: 84, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },

  /* table rows */
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
  tdNo:     { width: 32, fontSize: 12, fontFamily: 'Inter_500Medium' },
  tdNameCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 6 },
  rowAvatar:     { width: 30, height: 30, borderRadius: 15 },
  rowAvatarGrad: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  rowAvatarLetter: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  tdName:   { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  tdId:     { width: 72, fontSize: 11, fontFamily: 'Inter_500Medium' },
  tdCodeCell: { width: 84, alignItems: 'flex-start' },
  codePill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 },
  codeText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.8 },
  noCode:   { fontSize: 12 },

  /* empty */
  emptyWrap:  { margin: 24, borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12 },
  emptyIcon:  { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyHint:  { fontSize: 12, fontFamily: 'Inter_400Regular' },

  /* modal header */
  modalHdr: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  modalBack: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  modalHdrTitle: { flex: 1, color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  modalEditBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  /* avatar section */
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 10 },
  avatarWrap: { position: 'relative' },
  profileAvatar: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  profileAvatarLetter: { color: '#fff', fontSize: 36, fontFamily: 'Inter_700Bold' },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0 },
  cameraBtnGrad: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  profileName: { fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  profileRolePill: { paddingHorizontal: 14, paddingVertical: 4, borderRadius: 99 },
  profileRoleText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  profileStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99 },
  profileStatusDot: { width: 7, height: 7, borderRadius: 4 },
  profileStatusText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  /* key card */
  keyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  keyIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  keyCardCode: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#7C3AED', letterSpacing: 1.5 },
  keyCardMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  keyStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  keyStatusDot: { width: 5, height: 5, borderRadius: 3 },
  keyStatusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },

  /* key edit */
  keyInfoBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  keyInfoText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#5B21B6', flex: 1 },
  keyInfoCode: { fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 13 },
  editInput: { flex: 1, fontSize: 14, paddingVertical: 12 },
  keyWarnBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: '#FEF3C710', borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B25', padding: 10 },
  keyWarnText: { color: '#D97706', fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 16 },

  /* actions */
  actionsGrid: { flexDirection: 'row', gap: 12 },
  actionCard: { borderRadius: 14, padding: 16, alignItems: 'center', gap: 8 },
  actionCardText: { fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center' },

  /* protected */
  protectedNote: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  protectedIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  protectedText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6D28D9', lineHeight: 18 },

  /* save */
  saveBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
