import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

const ROLE_LABELS: Record<string, { en: string; hi: string }> = {
  citizen:    { en: 'Citizen',              hi: 'नागरिक' },
  safaikarmi: { en: 'Safai Karmi',          hi: 'सफाई कर्मी' },
  official:   { en: 'Municipal Official',   hi: 'नगरपालिका अधिकारी' },
  admin:      { en: 'System Administrator', hi: 'सिस्टम प्रशासक' },
};

const ROLE_CONFIG: Record<string, {
  hero: readonly [string, string, string];
  grad: readonly [string, string];
  accent: string;
  accentLight: string;
  iconGrads: readonly [string, string][];
}> = {
  citizen: {
    hero: ['#050C1A', '#0D2260', '#1652CC'],
    grad: ['#0D2260', '#1652CC'],
    accent: '#1264E8',
    accentLight: '#DCEEFF',
    iconGrads: [['#1264E8', '#0EA5E9'], ['#6366F1', '#8B5CF6'], ['#10B981', '#059669']],
  },
  safaikarmi: {
    hero: ['#021208', '#013D1C', '#006A35'],
    grad: ['#013D1C', '#006A35'],
    accent: '#007F42',
    accentLight: '#D1FAE5',
    iconGrads: [['#10B981', '#059669'], ['#0EA5E9', '#2563EB'], ['#6366F1', '#7C3AED']],
  },
  official: {
    hero: ['#120800', '#3D1800', '#8B3E00'],
    grad: ['#3D1800', '#8B3E00'],
    accent: '#C45C00',
    accentLight: '#FFE2C0',
    iconGrads: [['#F59E0B', '#EF4444'], ['#EC4899', '#DB2777'], ['#6366F1', '#8B5CF6']],
  },
};

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { showAlert } = useAlert();
  const {
    supportDetails, complaints, users, notices,
    getComplaintsByUser, getVisitsByWorker, getAttendanceByWorker,
  } = useAppData();
  const colors = useColors();

  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('dnp360_lang').then(v => { if (v === 'hi' || v === 'en') setLang(v); });
  }, []);

  if (!user) return null;

  const cfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.citizen;
  const roleLabelObj = ROLE_LABELS[user.role] ?? { en: user.role, hi: user.role };
  const roleLabel = lang === 'hi' ? roleLabelObj.hi : roleLabelObj.en;

  const statsRow = (() => {
    if (user.role === 'citizen') {
      const mine = getComplaintsByUser(user.id);
      return [
        { label: lang === 'hi' ? 'शिकायतें' : 'Total',    value: mine.length,                                        icon: 'clipboard', gi: 0 },
        { label: lang === 'hi' ? 'सक्रिय'   : 'Active',   value: mine.filter(c => c.status !== 'resolved').length,  icon: 'loader',    gi: 1 },
        { label: lang === 'hi' ? 'हल'        : 'Resolved', value: mine.filter(c => c.status === 'resolved').length,  icon: 'check-circle', gi: 2 },
      ];
    }
    if (user.role === 'safaikarmi') {
      const todayStr = new Date().toISOString().split('T')[0];
      const visits = getVisitsByWorker(user.id);
      const att = getAttendanceByWorker(user.id);
      return [
        { label: lang === 'hi' ? 'आज' : "Today",      value: visits.filter(v => v.visitDate === todayStr).length,             icon: 'home',     gi: 0 },
        { label: lang === 'hi' ? 'माह' : 'Month',     value: att.filter(a => a.date.startsWith(todayStr.slice(0, 7))).length, icon: 'calendar', gi: 1 },
        { label: lang === 'hi' ? 'कुल' : 'Total',     value: visits.length,                                                    icon: 'map',      gi: 2 },
      ];
    }
    if (user.role === 'official') {
      return [
        { label: lang === 'hi' ? 'शिकायतें' : 'Complaints', value: complaints.length,                                       icon: 'clipboard', gi: 0 },
        { label: lang === 'hi' ? 'लंबित'    : 'Pending',    value: complaints.filter(c => c.status === 'submitted').length, icon: 'clock',     gi: 1 },
        { label: lang === 'hi' ? 'कर्मी'    : 'Workers',    value: users.filter(u => u.role === 'safaikarmi').length,       icon: 'users',     gi: 2 },
      ];
    }
    return [
      { label: 'Users',      value: users.length,                           icon: 'users',    gi: 0 },
      { label: 'Complaints', value: complaints.length,                       icon: 'clipboard',gi: 1 },
      { label: 'Notices',    value: notices.filter(n => n.isActive).length, icon: 'volume-2', gi: 2 },
    ];
  })();

  function openEdit() {
    if (!user) return;
    setEditName(user.name); setEditMobile(user.mobile ?? ''); setEditAddress(user.address ?? '');
    setShowEditModal(true);
  }

  async function handleSave() {
    if (!editName.trim()) { showAlert('Missing', 'Name cannot be empty.', undefined, 'warning'); return; }
    setSaving(true);
    try {
      await updateProfile({ name: editName.trim(), mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined });
      setShowEditModal(false);
      showAlert('Updated', 'Profile saved successfully.', undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ], 'warning');
  }

  const INFO_ROWS = [
    { icon: 'mail',      grad: cfg.iconGrads[0],  label: lang === 'hi' ? 'ईमेल'          : 'Email',         value: user.email },
    ...(user.mobile     ? [{ icon: 'phone',      grad: cfg.iconGrads[1],  label: lang === 'hi' ? 'मोबाइल'        : 'Mobile',        value: user.mobile }]    : []),
    ...(user.address    ? [{ icon: 'map-pin',    grad: cfg.iconGrads[2],  label: lang === 'hi' ? 'पता'            : 'Address',       value: user.address }]   : []),
    ...(user.employeeId ? [{ icon: 'briefcase',  grad: cfg.iconGrads[0],  label: lang === 'hi' ? 'कर्मचारी आईडी' : 'Employee ID',   value: user.employeeId }]: []),
    ...(user.wardId     ? [{ icon: 'map',        grad: cfg.iconGrads[1],  label: lang === 'hi' ? 'वार्ड'          : 'Assigned Ward', value: `Ward ${user.wardId.replace(/[^0-9]/g, '')}` }] : []),
    { icon: 'calendar', grad: cfg.iconGrads[2],  label: lang === 'hi' ? 'सदस्य बने'        : 'Member Since',  value: user.createdAt ?? '—' },
    { icon: 'hash',     grad: cfg.iconGrads[0],  label: lang === 'hi' ? 'उपयोगकर्ता आईडी' : 'User ID',       value: user.id },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050C1A' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── HERO ── */}
        <View style={styles.hero}>
          <LinearGradient colors={cfg.hero} style={StyleSheet.absoluteFill} />

          <View style={styles.topBar}>
            <View style={[styles.rolePill, { borderColor: cfg.accent + '50', backgroundColor: cfg.accent + '18' }]}>
              <Feather name="shield" size={10} color={cfg.accentLight} />
              <Text style={[styles.rolePillText, { color: cfg.accentLight }]}>{roleLabel}</Text>
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEdit} activeOpacity={0.8}>
              <Feather name="edit-2" size={15} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarWrap}>
            <View style={[styles.avatarRing1, { borderColor: cfg.accent + '55' }]}>
              <View style={[styles.avatarRing2, { borderColor: cfg.accent + '80' }]}>
                <LinearGradient colors={cfg.grad as any} style={styles.avatarCore}>
                  <Text style={styles.avatarLetter}>{user.name[0].toUpperCase()}</Text>
                </LinearGradient>
              </View>
            </View>
            <View style={[styles.onlineDot, { backgroundColor: cfg.accent, borderColor: '#050C1A' }]} />
          </View>

          <Text style={styles.heroName}>{user.name}</Text>
          {user.employeeId
            ? <Text style={[styles.heroSub, { color: cfg.accentLight + 'CC' }]}>{user.employeeId}</Text>
            : null}
          <Text style={[styles.heroEmail, { color: 'rgba(255,255,255,0.5)' }]}>{user.email}</Text>

          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Feather name="check-circle" size={10} color="#86EFAC" />
              <Text style={styles.heroBadgeText}>Verified Account</Text>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="calendar" size={10} color="#93C5FD" />
              <Text style={styles.heroBadgeText}>{lang === 'hi' ? 'सदस्य' : 'Member'} {user.createdAt}</Text>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* ── STATS ── */}
          <View style={styles.statsRow}>
            {statsRow.map(s => (
              <View key={s.label} style={styles.statCell}>
                <LinearGradient colors={cfg.iconGrads[s.gi] as any} style={styles.statCard}>
                  <Feather name={s.icon as any} size={18} color="#fff" />
                  <Text style={styles.statVal}>{s.value}</Text>
                </LinearGradient>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* ── ACCOUNT INFORMATION ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <LinearGradient colors={cfg.grad as any} style={styles.sectionIcon}>
                <Feather name="user" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? 'खाता जानकारी' : 'Account Information'}
              </Text>
              <TouchableOpacity onPress={openEdit} style={[styles.editChip, { backgroundColor: cfg.accent + '22', borderColor: cfg.accent + '55' }]}>
                <Feather name="edit-2" size={10} color={cfg.accent} />
                <Text style={[styles.editChipText, { color: cfg.accent }]}>{lang === 'hi' ? 'संपादित' : 'Edit'}</Text>
              </TouchableOpacity>
            </View>
            <LinearGradient colors={[cfg.grad[0] + '22', cfg.grad[1] + '10', 'rgba(10,18,40,0.95)']} style={styles.vibrantCard}>
              {INFO_ROWS.map((row, i, arr) => (
                <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowDivider]}>
                  <LinearGradient colors={row.grad as any} style={styles.rowIcon}>
                    <Feather name={row.icon as any} size={13} color="#fff" />
                  </LinearGradient>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowValue} numberOfLines={1}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* ── SETTINGS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} style={styles.sectionIcon}>
                <Feather name="settings" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? 'सेटिंग्स' : 'Settings'}
              </Text>
            </View>
            <LinearGradient colors={['rgba(139,92,246,0.18)', 'rgba(99,102,241,0.08)', 'rgba(10,18,40,0.95)']} style={styles.vibrantCard}>
              <View style={[styles.infoRow, styles.infoRowDivider]}>
                <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.rowIcon}>
                  <Feather name="bell" size={13} color="#fff" />
                </LinearGradient>
                <View style={styles.rowText}>
                  <Text style={styles.rowValue}>{lang === 'hi' ? 'सूचनाएं' : 'Notifications'}</Text>
                  <Text style={styles.rowLabel}>{lang === 'hi' ? 'शिकायत अपडेट, नोटिस' : 'Complaints, notices, alerts'}</Text>
                </View>
                <Switch value={notifEnabled} onValueChange={setNotifEnabled} trackColor={{ false: '#2E3E55', true: '#8B5CF6AA' }} thumbColor={notifEnabled ? '#8B5CF6' : '#4B5563'} />
              </View>
              <TouchableOpacity style={styles.infoRow} onPress={() => setShowLangModal(true)} activeOpacity={0.7}>
                <LinearGradient colors={['#0EA5E9', '#2563EB']} style={styles.rowIcon}>
                  <Feather name="globe" size={13} color="#fff" />
                </LinearGradient>
                <View style={styles.rowText}>
                  <Text style={styles.rowValue}>{lang === 'hi' ? 'भाषा' : 'Language'}</Text>
                  <Text style={styles.rowLabel}>{lang === 'hi' ? 'हिन्दी' : 'English (India)'}</Text>
                </View>
                <Feather name="chevron-right" size={14} color="#4B5563" />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* ── SUPPORT DETAILS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.sectionIcon}>
                <Feather name="phone-call" size={13} color="#fff" />
              </LinearGradient>
              <Text style={styles.sectionTitle}>
                {lang === 'hi' ? 'सहायता विवरण' : 'Support Details'}
              </Text>
            </View>
            <LinearGradient colors={['rgba(16,185,129,0.18)', 'rgba(5,150,105,0.08)', 'rgba(10,18,40,0.95)']} style={styles.vibrantCard}>
              {[
                { icon: 'phone',   grad: ['#10B981','#059669'] as const, label: lang === 'hi' ? 'फोन'      : 'Phone',          value: supportDetails.phone },
                { icon: 'mail',    grad: ['#0EA5E9','#2563EB'] as const, label: lang === 'hi' ? 'ईमेल'     : 'Email',          value: supportDetails.email },
                { icon: 'map-pin', grad: ['#EC4899','#DB2777'] as const, label: lang === 'hi' ? 'कार्यालय'  : 'Office Address', value: supportDetails.address },
                { icon: 'clock',   grad: ['#F59E0B','#EF4444'] as const, label: lang === 'hi' ? 'समय'      : 'Office Hours',   value: supportDetails.hours },
              ].map((row, i, arr) => (
                <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowDivider]}>
                  <LinearGradient colors={row.grad} style={styles.rowIcon}>
                    <Feather name={row.icon as any} size={13} color="#fff" />
                  </LinearGradient>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{row.label}</Text>
                    <Text style={styles.rowValue}>{row.value}</Text>
                  </View>
                </View>
              ))}
            </LinearGradient>
          </View>

          {/* ── ABOUT ── */}
          <View style={styles.section}>
            <LinearGradient colors={['#0D1B4B', '#1A237E', '#283593']} style={styles.aboutCard}>
              <View style={styles.aboutTop}>
                <View>
                  <Text style={styles.aboutTitle}>DNP360</Text>
                  <Text style={styles.aboutVer}>v1.0.0 · Nagar Parishad Daudnagar</Text>
                  <Text style={styles.aboutSub}>Bihar, India</Text>
                </View>
                <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.aboutShield}>
                  <Feather name="shield" size={26} color="rgba(255,255,255,0.9)" />
                </LinearGradient>
              </View>
              <Text style={styles.aboutDesc}>
                {lang === 'hi'
                  ? 'दौदनगर नगर परिषद 360 — नागरिकों, सफाई कर्मियों और अधिकारियों को जोड़ने वाली स्मार्ट शासन प्रणाली।'
                  : 'Smart governance connecting citizens, Safai Karmis, and officials for efficient municipal management.'}
              </Text>
              <View style={styles.aboutTags}>
                {['Digital India', 'Smart Gov', 'Bihar'].map(t => (
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
              <Text style={styles.logoutText}>{lang === 'hi' ? 'साइन आउट' : 'Sign Out'}</Text>
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
          <LinearGradient colors={cfg.grad as any} style={styles.modalHdr}>
            <Text style={styles.modalHdrTitle}>{lang === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
            <Pressable style={styles.modalClose} onPress={() => setShowEditModal(false)}>
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={[styles.editPreview, { backgroundColor: cfg.accent + '12', borderColor: cfg.accent + '30' }]}>
              <LinearGradient colors={cfg.grad as any} style={styles.editAvatar}>
                <Text style={styles.editAvatarLetter}>{(editName[0] ?? user.name[0] ?? '?').toUpperCase()}</Text>
              </LinearGradient>
              <View>
                <Text style={[styles.editName, { color: colors.text }]}>{editName || user.name}</Text>
                <Text style={[styles.editRole, { color: cfg.accent }]}>{roleLabel}</Text>
              </View>
            </View>
            {[
              { label: lang === 'hi' ? 'पूरा नाम *'   : 'Full Name *',   value: editName,    set: setEditName,    icon: 'user',     key: 'name', caps: 'words'     as const },
              { label: lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number', value: editMobile,  set: setEditMobile,  icon: 'phone',    key: 'mob',  caps: 'none'      as const, num: true },
              { label: lang === 'hi' ? 'पता'          : 'Address',       value: editAddress, set: setEditAddress, icon: 'map-pin',  key: 'addr', caps: 'sentences' as const },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color={cfg.accent} />
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={f.value}
                    onChangeText={f.set}
                    autoCapitalize={f.caps}
                    keyboardType={(f as any).num ? 'phone-pad' : 'default'}
                    placeholder={f.label.replace(' *', '')}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
              <LinearGradient colors={cfg.grad as any} style={styles.saveBtn}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>{saving ? (lang === 'hi' ? 'सहेज रहे हैं…' : 'Saving…') : (lang === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── LANGUAGE MODAL ── */}
      <Modal visible={showLangModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Language / भाषा चुनें</Text>
            {[{ key: 'en', label: 'English (India)', native: 'English' }, { key: 'hi', label: 'Hindi', native: 'हिन्दी' }].map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langOpt, { borderColor: lang === l.key ? cfg.accent : colors.border, backgroundColor: lang === l.key ? cfg.accent + '15' : colors.surface }]}
                onPress={() => { setLang(l.key as 'en' | 'hi'); AsyncStorage.setItem('dnp360_lang', l.key); setShowLangModal(false); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.langNative, { color: colors.text }]}>{l.native}</Text>
                {lang === l.key && <Feather name="check" size={16} color={cfg.accent} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowLangModal(false)} style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingBottom: 14 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 8 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  rolePillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  editBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  avatarWrap: { alignItems: 'center', marginBottom: 8, position: 'relative' },
  avatarRing1: { width: 68, height: 68, borderRadius: 34, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarRing2: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  avatarCore: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  onlineDot: { position: 'absolute', bottom: 2, right: '34%', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },

  heroName: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center', paddingHorizontal: 20 },
  heroSub: { fontSize: 12, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 1 },
  heroEmail: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: 1, marginBottom: 8 },
  heroBadgeRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 2 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  heroBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_500Medium' },

  body: { padding: 16, gap: 18 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCell: { flex: 1, alignItems: 'center', gap: 6 },
  statCard: { width: '100%', aspectRatio: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center', gap: 6 },
  statVal: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },

  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1, color: '#E9F1FF' },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  editChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  vibrantCard: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 10, fontFamily: 'Inter_400Regular', marginBottom: 1, color: '#8B919E' },
  rowValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: '#E9F1FF' },

  aboutCard: { borderRadius: 20, padding: 20, gap: 12 },
  aboutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aboutTitle: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
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
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  editPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  editAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editAvatarLetter: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  editName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  editRole: { fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  saveBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  langOpt: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14 },
  langNative: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
});
