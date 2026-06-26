import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function AdminProfile() {
  const { user, logout, updateProfile } = useAuth();
  const { showAlert } = useAlert();
  const {
    users, complaints, notices, wards, houses, secretKeys,
    supportDetails, updateSupportDetails, passwordResetRequests,
  } = useAppData();
  const colors = useColors();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSupportAddr, setEditSupportAddr] = useState('');
  const [editHours, setEditHours] = useState('');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const citizens   = users.filter(u => u.role === 'citizen').length;
  const workers    = users.filter(u => u.role === 'safaikarmi').length;
  const officials  = users.filter(u => u.role === 'official').length;
  const resolved   = complaints.filter(c => c.status === 'resolved').length;
  const pending    = complaints.filter(c => c.status === 'submitted').length;
  const rate       = complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0;
  const pendingResets = passwordResetRequests.filter(r => r.status === 'pending').length;
  const activeKeys = secretKeys.filter(k => k.isActive).length;

  function openEdit() {
    if (!user) return;
    setEditName(user.name); setEditMobile(user.mobile ?? ''); setEditAddress(user.address ?? '');
    setShowEditModal(true);
  }
  function openSupport() {
    setEditPhone(supportDetails.phone); setEditEmail(supportDetails.email);
    setEditSupportAddr(supportDetails.address); setEditHours(supportDetails.hours);
    setShowSupportModal(true);
  }
  async function handleSaveProfile() {
    if (!editName.trim()) { showAlert('Missing', 'Name cannot be empty.', undefined, 'warning'); return; }
    setSavingProfile(true);
    try {
      await updateProfile({ name: editName.trim(), mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined });
      setShowEditModal(false); showAlert('Updated', 'Profile saved successfully.', undefined, 'success');
    } finally { setSavingProfile(false); }
  }
  async function handleSaveSupport() {
    setSaving(true);
    try {
      await updateSupportDetails({ phone: editPhone.trim(), email: editEmail.trim(), address: editSupportAddr.trim(), hours: editHours.trim() });
      setShowSupportModal(false); showAlert('Saved', 'Support details updated.', undefined, 'success');
    } finally { setSaving(false); }
  }
  async function handleLogout() {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ], 'warning');
  }

  const QUICK_STATS = [
    { label: 'Citizens',   value: citizens,  icon: 'users',     grad: ['#6366F1', '#8B5CF6'] as const },
    { label: 'Workers',    value: workers,   icon: 'user-check', grad: ['#10B981', '#059669'] as const },
    { label: 'Officials',  value: officials, icon: 'briefcase', grad: ['#F59E0B', '#EF4444'] as const },
    { label: 'Wards',      value: wards.length, icon: 'map',   grad: ['#0EA5E9', '#2563EB'] as const },
  ];

  const SYSTEM_METRICS = [
    { label: 'Complaints',   value: complaints.length, color: '#F59E0B', icon: 'clipboard' },
    { label: 'Resolved',     value: resolved,           color: '#10B981', icon: 'check-circle' },
    { label: 'Pending',      value: pending,            color: '#EF4444', icon: 'alert-circle' },
    { label: 'Rate',         value: `${rate}%`,         color: '#6366F1', icon: 'trending-up' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050818' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── HERO ── */}
        <View style={styles.hero}>
          <LinearGradient colors={['#050818', '#0D1B4B', '#1A237E']} style={StyleSheet.absoluteFill} />

          {/* Top bar */}
          <View style={styles.heroTopBar}>
            <View style={styles.adminBadge}>
              <Feather name="shield" size={11} color="#A5B4FC" />
              <Text style={styles.adminBadgeText}>System Administrator</Text>
            </View>
            <TouchableOpacity style={styles.editIconBtn} onPress={openEdit} activeOpacity={0.8}>
              <Feather name="edit-2" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarOuterRing}>
              <View style={styles.avatarMidRing}>
                <LinearGradient colors={['#6366F1', '#8B5CF6', '#EC4899']} style={styles.avatarGrad}>
                  <Text style={styles.avatarLetter}>{user.name[0].toUpperCase()}</Text>
                </LinearGradient>
              </View>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.heroName}>{user.name}</Text>
          <Text style={styles.heroEmpId}>{user.employeeId}</Text>
          <Text style={styles.heroEmail}>{user.email}</Text>

          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Feather name="check-circle" size={10} color="#86EFAC" />
              <Text style={styles.heroBadgeText}>Verified · Full Access</Text>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="calendar" size={10} color="#93C5FD" />
              <Text style={styles.heroBadgeText}>Since {user.createdAt}</Text>
            </View>
          </View>

          {/* Pending Reset Alert */}
          {pendingResets > 0 && (
            <TouchableOpacity style={styles.resetAlert} onPress={() => router.push('/(tabs)/tertiary')} activeOpacity={0.85}>
              <Feather name="alert-circle" size={13} color="#FCD34D" />
              <Text style={styles.resetAlertText}>{pendingResets} password reset{pendingResets > 1 ? 's' : ''} awaiting review</Text>
              <Feather name="arrow-right" size={12} color="#FCD34D" />
            </TouchableOpacity>
          )}
        </View>

        {/* ── QUICK STATS ── */}
        <View style={styles.body}>
          <View style={styles.quickStatsGrid}>
            {QUICK_STATS.map(s => (
              <View key={s.label} style={styles.quickStatCell}>
                <LinearGradient colors={s.grad} style={styles.quickStatCard}>
                  <Feather name={s.icon as any} size={18} color="#fff" />
                  <Text style={styles.quickStatVal}>{s.value}</Text>
                </LinearGradient>
                <Text style={[styles.quickStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── SYSTEM PERFORMANCE ── */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.panelIconWrap}>
                <Feather name="activity" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.panelTitle, { color: colors.text }]}>System Performance</Text>
            </View>
            <View style={[styles.metricsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {SYSTEM_METRICS.map((m, i, arr) => (
                <View key={m.label} style={[styles.metricCell, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                  <Feather name={m.icon as any} size={14} color={m.color} />
                  <Text style={[styles.metricVal, { color: m.color }]}>{m.value}</Text>
                  <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── ADMIN OVERVIEW ── */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.panelIconWrap}>
                <Feather name="grid" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Platform Overview</Text>
            </View>
            <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { label: 'Active Notices',    value: notices.filter(n => n.isActive).length,  icon: 'volume-2',  grad: ['#0EA5E9','#0284C7'] as const, tab: '/(tabs)/tertiary' },
                { label: 'Active Keys',       value: activeKeys,                              icon: 'key',       grad: ['#6366F1','#7C3AED'] as const, tab: '/(tabs)/secondary' },
                { label: 'Registered Houses', value: houses.filter(h => h.isActive).length,  icon: 'home',      grad: ['#10B981','#059669'] as const, tab: '/(tabs)/tertiary' },
                { label: 'Total Users',       value: users.length,                           icon: 'users',     grad: ['#F59E0B','#EF4444'] as const, tab: '/(tabs)/action' },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.overviewRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => router.push(item.tab as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient colors={item.grad} style={styles.overviewIcon}>
                    <Feather name={item.icon as any} size={13} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.overviewLabel, { color: colors.text }]}>{item.label}</Text>
                  <Text style={[styles.overviewValue, { color: item.grad[0] }]}>{item.value}</Text>
                  <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── ACCOUNT INFORMATION ── */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <LinearGradient colors={['#0EA5E9', '#2563EB']} style={styles.panelIconWrap}>
                <Feather name="user" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Account Information</Text>
              <TouchableOpacity onPress={openEdit} style={[styles.editChip, { backgroundColor: '#6366F110', borderColor: '#6366F130' }]} activeOpacity={0.8}>
                <Feather name="edit-2" size={10} color="#6366F1" />
                <Text style={styles.editChipText}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {[
                { icon: 'mail',     grad: ['#6366F1','#8B5CF6'] as const, label: 'Email',       value: user.email },
                { icon: 'phone',    grad: ['#10B981','#059669'] as const, label: 'Mobile',      value: user.mobile ?? 'Not set' },
                { icon: 'briefcase',grad: ['#F59E0B','#EF4444'] as const, label: 'Employee ID', value: user.employeeId ?? '—' },
                { icon: 'hash',     grad: ['#0EA5E9','#2563EB'] as const, label: 'User ID',     value: user.id },
                { icon: 'calendar', grad: ['#EC4899','#DB2777'] as const, label: 'Member Since', value: user.createdAt ?? '—' },
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                  <LinearGradient colors={row.grad} style={styles.infoRowIcon}>
                    <Feather name={row.icon as any} size={13} color="#fff" />
                  </LinearGradient>
                  <View style={styles.infoRowText}>
                    <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[styles.infoRowValue, { color: colors.text }]} numberOfLines={1}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── SETTINGS ── */}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <LinearGradient colors={['#6B7280', '#374151']} style={styles.panelIconWrap}>
                <Feather name="settings" size={14} color="#fff" />
              </LinearGradient>
              <Text style={[styles.panelTitle, { color: colors.text }]}>Settings</Text>
            </View>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.infoRowIcon}>
                  <Feather name="bell" size={13} color="#fff" />
                </LinearGradient>
                <View style={styles.infoRowText}>
                  <Text style={[styles.infoRowValue, { color: colors.text }]}>Notifications</Text>
                  <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>Alerts, complaints, notices</Text>
                </View>
                <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ false: colors.border, true: '#6366F1AA' }} thumbColor={notifEnabled ? '#6366F1' : colors.mutedForeground} />
              </View>
              <TouchableOpacity style={styles.infoRow} onPress={openSupport} activeOpacity={0.7}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.infoRowIcon}>
                  <Feather name="phone-call" size={13} color="#fff" />
                </LinearGradient>
                <View style={styles.infoRowText}>
                  <Text style={[styles.infoRowValue, { color: colors.text }]}>Edit Support Details</Text>
                  <Text style={[styles.infoRowLabel, { color: colors.mutedForeground }]}>{supportDetails.phone}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── ABOUT DNP360 ── */}
          <View style={styles.panel}>
            <LinearGradient colors={['#0D1B4B', '#1A237E', '#283593']} style={styles.aboutCard}>
              <View style={styles.aboutTop}>
                <View>
                  <Text style={styles.aboutName}>DNP360</Text>
                  <Text style={styles.aboutVer}>v1.0.0 · Nagar Parishad Daudnagar</Text>
                  <Text style={styles.aboutSub}>Bihar, India · Digital India Initiative</Text>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.aboutShield}>
                  <Feather name="shield" size={26} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              </View>
              <Text style={styles.aboutDesc}>
                Smart governance system connecting citizens, Safai Karmis, and officials for efficient municipal management.
              </Text>
              <View style={styles.aboutTags}>
                {['Digital India', 'Smart Gov', 'Bihar', 'Open Data'].map(t => (
                  <View key={t} style={styles.aboutTag}>
                    <Text style={styles.aboutTagText}>{t}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>

          {/* ── SIGN OUT ── */}
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={styles.logoutWrap}>
            <LinearGradient colors={['#FEF2F2', '#FEE2E2']} style={styles.logoutBtn}>
              <View style={styles.logoutIcon}>
                <Feather name="log-out" size={18} color="#DC2626" />
              </View>
              <Text style={styles.logoutText}>Sign Out</Text>
              <Feather name="chevron-right" size={16} color="#DC2626" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[styles.footer, { color: colors.mutedForeground }]}>
            DNP360 · Nagar Parishad Daudnagar · Bihar, India
          </Text>
        </View>
      </ScrollView>

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#0D1B4B', '#1A237E']} style={styles.modalHdr}>
            <Text style={styles.modalHdrTitle}>Edit Profile</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowEditModal(false)}>
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={[styles.editPreview, { backgroundColor: '#6366F110', borderColor: '#6366F130' }]}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.editAvatar}>
                <Text style={styles.editAvatarLetter}>{(editName[0] ?? user.name[0] ?? '?').toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.editPreviewName, { color: colors.text }]}>{editName || user.name}</Text>
                <Text style={[styles.editPreviewRole, { color: '#6366F1' }]}>System Administrator</Text>
              </View>
            </View>
            {[
              { label: 'Full Name *',   value: editName,    setter: setEditName,    icon: 'user',      ph: 'Your full name',     caps: 'words'     as const, key: 'name' },
              { label: 'Mobile',        value: editMobile,  setter: setEditMobile,  icon: 'phone',     ph: '10-digit number',    caps: 'none'      as const, key: 'mobile', num: true },
              { label: 'Address',       value: editAddress, setter: setEditAddress, icon: 'map-pin',   ph: 'Street, Ward…',      caps: 'sentences' as const, key: 'addr' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color="#6366F1" />
                  <TextInput style={[styles.fieldInput, { color: colors.text }]} value={f.value} onChangeText={f.setter} autoCapitalize={f.caps} keyboardType={(f as any).num ? 'phone-pad' : 'default'} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveProfile} disabled={savingProfile} activeOpacity={0.85} style={savingProfile ? { opacity: 0.6 } : {}}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.submitBtn}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{savingProfile ? 'Saving…' : 'Save Changes'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── EDIT SUPPORT MODAL ── */}
      <Modal visible={showSupportModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#064E3B', '#065F46']} style={styles.modalHdr}>
            <Text style={styles.modalHdrTitle}>Edit Support Details</Text>
            <Pressable style={styles.modalCloseBtn} onPress={() => setShowSupportModal(false)}>
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {[
              { label: 'Phone Number', value: editPhone,       setter: setEditPhone,       key: 'phone', ph: '06184-XXXXXX',              icon: 'phone',   num: true },
              { label: 'Email',        value: editEmail,       setter: setEditEmail,       key: 'email', ph: 'support@dnp360.in',         icon: 'mail',    num: false },
              { label: 'Office Address', value: editSupportAddr, setter: setEditSupportAddr, key: 'addr', ph: 'Municipal Office…',         icon: 'map-pin', num: false },
              { label: 'Office Hours', value: editHours,       setter: setEditHours,       key: 'hrs',  ph: 'Mon–Sat, 10 AM – 5 PM',    icon: 'clock',   num: false },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color="#10B981" />
                  <TextInput style={[styles.fieldInput, { color: colors.text }]} value={f.value} onChangeText={f.setter} autoCapitalize="none" keyboardType={f.num ? 'phone-pad' : 'default'} placeholder={f.ph} placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveSupport} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.submitBtn}>
                <Feather name="save" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{saving ? 'Saving…' : 'Save Support Details'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingBottom: 28 },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 14, marginBottom: 20 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(165,180,252,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(165,180,252,0.3)' },
  adminBadgeText: { color: '#A5B4FC', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  editIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },

  avatarSection: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  avatarOuterRing: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(99,102,241,0.5)', justifyContent: 'center', alignItems: 'center' },
  avatarMidRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: 'rgba(139,92,246,0.6)', justifyContent: 'center', alignItems: 'center' },
  avatarGrad: { width: 78, height: 78, borderRadius: 39, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 32, fontFamily: 'Inter_700Bold' },
  onlineDot: { position: 'absolute', bottom: 4, right: '36%', width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#050818' },

  heroName: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center', paddingHorizontal: 20 },
  heroEmpId: { color: '#A5B4FC', fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 2 },
  heroEmail: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 2, marginBottom: 12 },
  heroBadgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 14 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  heroBadgeText: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontFamily: 'Inter_500Medium' },
  resetAlert: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(252,211,77,0.12)', marginHorizontal: 20, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(252,211,77,0.3)' },
  resetAlertText: { flex: 1, color: '#FCD34D', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  body: { padding: 16, gap: 18 },

  quickStatsGrid: { flexDirection: 'row', gap: 10 },
  quickStatCell: { flex: 1, alignItems: 'center', gap: 6 },
  quickStatCard: { width: '100%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 6 },
  quickStatVal: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  quickStatLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  panel: { gap: 10 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelIconWrap: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  panelTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  editChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: '#6366F1' },

  metricsRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  metricCell: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  metricVal: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  metricLabel: { fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  overviewCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  overviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  overviewIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  overviewLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  overviewValue: { fontSize: 16, fontFamily: 'Inter_700Bold' },

  infoCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  infoRowIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  infoRowText: { flex: 1 },
  infoRowLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 1 },
  infoRowValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  aboutCard: { borderRadius: 20, padding: 20, gap: 12 },
  aboutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aboutName: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  aboutVer: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 3 },
  aboutSub: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  aboutShield: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  aboutDesc: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  aboutTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aboutTag: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  aboutTagText: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  logoutWrap: { borderRadius: 16, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  logoutIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  logoutText: { flex: 1, color: '#DC2626', fontSize: 15, fontFamily: 'Inter_700Bold' },

  footer: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: -6 },

  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  modalHdrTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },

  editPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  editAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editAvatarLetter: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  editPreviewName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  editPreviewRole: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },

  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  submitBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
