import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

const ROLE_LABELS: Record<string, { en: string; hi: string }> = {
  citizen:    { en: 'Citizen',              hi: 'नागरिक' },
  safaikarmi: { en: 'Safai Karmi',          hi: 'सफाई कर्मी' },
  official:   { en: 'Municipal Official',   hi: 'नगरपालिका अधिकारी' },
  admin:      { en: 'System Administrator', hi: 'सिस्टम प्रशासक' },
};

const ROLE_GRADIENTS: Record<string, readonly [string, string]> = {
  citizen:    ['#0D2A6E', '#1264E8'],
  safaikarmi: ['#003D1C', '#007F42'],
  official:   ['#5A2E00', '#C45C00'],
  admin:      ['#0A1F5A', '#1A3FA8'],
};

const ROLE_COLORS: Record<string, string> = {
  citizen: '#1264E8', safaikarmi: '#007F42', official: '#C45C00', admin: '#1A3FA8',
};
const ROLE_BG: Record<string, string> = {
  citizen: '#DCEEFF', safaikarmi: '#C8FADC', official: '#FFE2C0', admin: '#D5E1FF',
};

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const {
    supportDetails, updateSupportDetails,
    complaints, users, notices,
    getComplaintsByUser, getVisitsByWorker, getAttendanceByWorker,
  } = useAppData();
  const colors = useColors();

  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSupportAddr, setEditSupportAddr] = useState('');
  const [editHours, setEditHours] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('dnp360_lang').then(v => { if (v === 'hi' || v === 'en') setLang(v); });
  }, []);

  if (!user) return null;

  const roleColor   = ROLE_COLORS[user.role]   ?? '#1264E8';
  const roleBg      = ROLE_BG[user.role]        ?? '#DCEEFF';
  const roleGrad    = ROLE_GRADIENTS[user.role] ?? ['#0D2A6E', '#1264E8'];
  const roleLabelObj = ROLE_LABELS[user.role]   ?? { en: user.role, hi: user.role };
  const roleLabel   = lang === 'hi' ? roleLabelObj.hi : roleLabelObj.en;
  const isAdmin     = user.role === 'admin';

  const statsRow = (() => {
    if (user.role === 'citizen') {
      const mine = getComplaintsByUser(user.id);
      return [
        { label: lang === 'hi' ? 'शिकायतें' : 'Complaints', value: mine.length,                                        icon: 'clipboard' },
        { label: lang === 'hi' ? 'सक्रिय'   : 'Active',      value: mine.filter(c => c.status !== 'resolved').length,  icon: 'loader' },
        { label: lang === 'hi' ? 'हल'        : 'Resolved',    value: mine.filter(c => c.status === 'resolved').length,  icon: 'check-circle' },
      ];
    }
    if (user.role === 'safaikarmi') {
      const todayStr = new Date().toISOString().split('T')[0];
      const visits = getVisitsByWorker(user.id);
      const att = getAttendanceByWorker(user.id);
      return [
        { label: lang === 'hi' ? 'आज के दौरे' : "Today",       value: visits.filter(v => v.visitDate === todayStr).length,              icon: 'home' },
        { label: lang === 'hi' ? 'इस माह'     : 'This Month',  value: att.filter(a => a.date.startsWith(todayStr.slice(0, 7))).length,  icon: 'calendar' },
        { label: lang === 'hi' ? 'कुल दौरे'   : 'Total Visits', value: visits.length,                                                    icon: 'map' },
      ];
    }
    if (user.role === 'official') {
      return [
        { label: lang === 'hi' ? 'शिकायतें' : 'Complaints', value: complaints.length,                                       icon: 'clipboard' },
        { label: lang === 'hi' ? 'लंबित'    : 'Pending',     value: complaints.filter(c => c.status === 'submitted').length, icon: 'clock' },
        { label: lang === 'hi' ? 'कर्मी'    : 'Workers',     value: users.filter(u => u.role === 'safaikarmi').length,       icon: 'users' },
      ];
    }
    return [
      { label: lang === 'hi' ? 'उपयोगकर्ता' : 'Users',      value: users.length,                               icon: 'users' },
      { label: lang === 'hi' ? 'शिकायतें'   : 'Complaints', value: complaints.length,                          icon: 'clipboard' },
      { label: lang === 'hi' ? 'नोटिस'      : 'Notices',    value: notices.filter(n => n.isActive).length,     icon: 'volume-2' },
    ];
  })();

  function openEdit() {
    setEditName(user.name);
    setEditMobile(user.mobile ?? '');
    setEditAddress(user.address ?? '');
    setShowEditModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) { Alert.alert('Missing', 'Name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      await updateProfile({ name: editName.trim(), mobile: editMobile.trim() || undefined, address: editAddress.trim() || undefined });
      setShowEditModal(false);
      Alert.alert('✓ Updated', 'Your profile has been updated.');
    } finally { setSavingProfile(false); }
  }

  function openEditSupport() {
    setEditPhone(supportDetails.phone);
    setEditEmail(supportDetails.email);
    setEditSupportAddr(supportDetails.address);
    setEditHours(supportDetails.hours);
    setShowSupportModal(true);
  }

  async function handleSaveSupport() {
    setSaving(true);
    try {
      await updateSupportDetails({ phone: editPhone.trim(), email: editEmail.trim(), address: editSupportAddr.trim(), hours: editHours.trim() });
      setShowSupportModal(false);
      Alert.alert('✓ Saved', 'Support details updated.');
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  const INFO_ROWS = [
    { icon: 'mail',      label: lang === 'hi' ? 'ईमेल'          : 'Email',         value: user.email },
    ...(user.mobile     ? [{ icon: 'smartphone', label: lang === 'hi' ? 'मोबाइल'        : 'Mobile',        value: user.mobile }]    : []),
    ...(user.address    ? [{ icon: 'map-pin',    label: lang === 'hi' ? 'पता'            : 'Address',       value: user.address }]   : []),
    ...(user.employeeId ? [{ icon: 'briefcase',  label: lang === 'hi' ? 'कर्मचारी आईडी' : 'Employee ID',   value: user.employeeId }]: []),
    ...(user.wardId     ? [{ icon: 'map',        label: lang === 'hi' ? 'वार्ड'          : 'Assigned Ward', value: `Ward ${user.wardId.replace(/[^0-9]/g, '')}` }] : []),
    { icon: 'calendar', label: lang === 'hi' ? 'सदस्य बने'    : 'Member Since',  value: user.createdAt ?? '—' },
    { icon: 'hash',     label: lang === 'hi' ? 'उपयोगकर्ता आईडी' : 'User ID',   value: user.id },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── GRADIENT HEADER ── */}
        <LinearGradient colors={roleGrad as any} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerTopBar}>
            <View style={styles.rolePill}>
              <Feather name="shield" size={10} color="#FFFFFF" />
              <Text style={styles.rolePillText}>{roleLabel}</Text>
            </View>
            <TouchableOpacity style={styles.editIconBtn} onPress={openEdit} activeOpacity={0.8}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.headerCenter}>
            <View style={styles.avatarRing}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{user.name[0].toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileSub}>{user.employeeId ?? user.email}</Text>
          </View>

          <View style={styles.headerBottom}>
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={11} color="#80FFC8" />
              <Text style={styles.verifiedText}>{lang === 'hi' ? 'सत्यापित खाता' : 'Verified Account'}</Text>
            </View>
            <Text style={styles.dnpVersion}>DNP360 v1.0</Text>
          </View>
        </LinearGradient>

        {/* ── STATS STRIP ── */}
        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {statsRow.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={styles.statCell}>
                <View style={[styles.statIcon, { backgroundColor: roleBg }]}>
                  <Feather name={s.icon as any} size={13} color={roleColor} />
                </View>
                <Text style={[styles.statVal, { color: roleColor }]}>{s.value}</Text>
                <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
              {i < statsRow.length - 1 && <View style={[styles.statSep, { backgroundColor: colors.border }]} />}
            </React.Fragment>
          ))}
        </View>

        {/* ── ACCOUNT INFORMATION ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {lang === 'hi' ? 'खाता जानकारी' : 'ACCOUNT INFORMATION'}
            </Text>
            <Pressable onPress={openEdit} style={[styles.editChip, { backgroundColor: roleBg, borderColor: roleColor + '50' }]}>
              <Feather name="edit-2" size={10} color={roleColor} />
              <Text style={[styles.editChipText, { color: roleColor }]}>{lang === 'hi' ? 'संपादित' : 'Edit'}</Text>
            </Pressable>
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {INFO_ROWS.map((row, i) => (
              <View key={row.label} style={[styles.infoRow, i < INFO_ROWS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.rowIcon, { backgroundColor: roleBg }]}>
                  <Feather name={row.icon as any} size={14} color={roleColor} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={1}>{row.value}</Text>
                </View>
                <Feather name="chevron-right" size={13} color={colors.border} />
              </View>
            ))}
          </View>
        </View>

        {/* ── SETTINGS ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 8 }]}>
            {lang === 'hi' ? 'सेटिंग्स' : 'SETTINGS'}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.rowIcon, { backgroundColor: roleBg }]}>
                <Feather name="bell" size={14} color={roleColor} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowValue, { color: colors.text }]}>{lang === 'hi' ? 'सूचनाएं' : 'Notifications'}</Text>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{lang === 'hi' ? 'शिकायत अपडेट, नोटिस' : 'Complaints, notices, alerts'}</Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={setNotifEnabled}
                trackColor={{ false: colors.border, true: roleColor + 'AA' }}
                thumbColor={notifEnabled ? roleColor : colors.mutedForeground}
              />
            </View>
            <TouchableOpacity style={styles.infoRow} onPress={() => setShowLangModal(true)} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: '#EDE9FE' }]}>
                <Feather name="globe" size={14} color="#6B00C7" />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowValue, { color: colors.text }]}>{lang === 'hi' ? 'भाषा' : 'Language'}</Text>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{lang === 'hi' ? 'हिन्दी' : 'English (India)'}</Text>
              </View>
              <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SUPPORT DETAILS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {lang === 'hi' ? 'सहायता विवरण' : 'SUPPORT DETAILS'}
            </Text>
            {isAdmin && (
              <Pressable onPress={openEditSupport} style={[styles.editChip, { backgroundColor: colors.adminBg, borderColor: colors.adminColor + '50' }]}>
                <Feather name="edit-2" size={10} color={colors.adminColor} />
                <Text style={[styles.editChipText, { color: colors.adminColor }]}>Edit</Text>
              </Pressable>
            )}
          </View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { icon: 'phone',   label: lang === 'hi' ? 'फोन'     : 'Phone',          value: supportDetails.phone },
              { icon: 'mail',    label: lang === 'hi' ? 'ईमेल'    : 'Email',          value: supportDetails.email },
              { icon: 'map-pin', label: lang === 'hi' ? 'कार्यालय' : 'Office Address', value: supportDetails.address },
              { icon: 'clock',   label: lang === 'hi' ? 'समय'     : 'Office Hours',   value: supportDetails.hours },
            ].map((row, i, arr) => (
              <View key={row.label} style={[styles.infoRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.rowIcon, { backgroundColor: '#E6F4EC' }]}>
                  <Feather name={row.icon as any} size={14} color="#006A35" />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[styles.rowValue, { color: colors.text }]}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── ABOUT DNP360 ── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginBottom: 8 }]}>
            {lang === 'hi' ? 'ऐप के बारे में' : 'ABOUT DNP360'}
          </Text>
          <LinearGradient colors={[roleGrad[0] + 'DD', roleGrad[1] + 'AA']} style={styles.aboutCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <View style={styles.aboutTop}>
              <View>
                <Text style={styles.aboutName}>DNP360</Text>
                <Text style={styles.aboutVer}>v1.0.0 · Bihar, India</Text>
              </View>
              <View style={styles.aboutShieldWrap}>
                <Feather name="shield" size={24} color="rgba(255,255,255,0.9)" />
              </View>
            </View>
            <Text style={styles.aboutDesc}>
              {lang === 'hi'
                ? 'दौदनगर नगर परिषद 360 — नागरिकों, सफाई कर्मियों और अधिकारियों को जोड़ने वाली स्मार्ट शासन प्रणाली।'
                : 'Daudnagar Nagar Parishad 360 — Smart governance connecting citizens, Safai Karmis, and officials for efficient municipal management.'}
            </Text>
            <View style={styles.aboutTags}>
              {['Digital India', 'Smart Gov', 'Bihar'].map(t => (
                <View key={t} style={styles.aboutTag}>
                  <Text style={styles.aboutTagText}>{t}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <TouchableOpacity style={styles.infoRow} onPress={() => {}} activeOpacity={0.7}>
              <View style={[styles.rowIcon, { backgroundColor: colors.surface }]}>
                <Feather name="file-text" size={14} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.rowValue, { color: colors.text, flex: 1 }]}>{lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}</Text>
              <Feather name="chevron-right" size={13} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SIGN OUT ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={16} color="#C91B1B" />
          <Text style={styles.logoutText}>{lang === 'hi' ? 'साइन आउट' : 'Sign Out'}</Text>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          DNP360 · Nagar Parishad Daudnagar{'\n'}Bihar, India
        </Text>
      </ScrollView>

      {/* ── EDIT PROFILE MODAL ── */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalBar, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{lang === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}</Text>
              <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{lang === 'hi' ? 'अपनी जानकारी अपडेट करें' : 'Update your information'}</Text>
            </View>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={() => setShowEditModal(false)}>
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={[styles.previewRow, { backgroundColor: roleBg }]}>
              <View style={[styles.previewAvatar, { backgroundColor: roleColor }]}>
                <Text style={styles.previewLetter}>{(editName[0] ?? user.name[0] ?? '?').toUpperCase()}</Text>
              </View>
              <View>
                <Text style={[styles.previewName, { color: colors.text }]}>{editName || user.name}</Text>
                <View style={[styles.previewBadge, { backgroundColor: roleColor + '22' }]}>
                  <Text style={[styles.previewBadgeText, { color: roleColor }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            {[
              { label: lang === 'hi' ? 'पूरा नाम *'    : 'Full Name *',    value: editName,    change: setEditName,    icon: 'user',        ph: 'Your full name',         caps: 'words'     as const, key: 'name' },
              { label: lang === 'hi' ? 'मोबाइल नंबर'  : 'Mobile Number',  value: editMobile,  change: setEditMobile,  icon: 'smartphone',  ph: '10-digit mobile number', caps: 'none'      as const, key: 'mobile', num: true },
              { label: lang === 'hi' ? 'पता'           : 'Address',        value: editAddress, change: setEditAddress, icon: 'map-pin',     ph: 'Street, Ward, City',     caps: 'sentences' as const, key: 'addr' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color={roleColor} />
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    value={f.value}
                    onChangeText={f.change}
                    autoCapitalize={f.caps}
                    keyboardType={(f as any).num ? 'phone-pad' : 'default'}
                    placeholder={f.ph}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            ))}
            <View style={[styles.notice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                {lang === 'hi' ? 'ईमेल और कर्मचारी आईडी बदलने के लिए कार्यालय से संपर्क करें।' : 'To change email or Employee ID, contact the municipal office.'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: roleColor }, savingProfile && { opacity: 0.6 }]} onPress={handleSaveProfile} disabled={savingProfile} activeOpacity={0.85}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>{savingProfile ? (lang === 'hi' ? 'सहेज रहे हैं…' : 'Saving…') : (lang === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}</Text>
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
                style={[styles.langOption, { borderColor: lang === l.key ? roleColor : colors.border, backgroundColor: lang === l.key ? roleBg : colors.surface }]}
                onPress={() => { setLang(l.key as 'en' | 'hi'); AsyncStorage.setItem('dnp360_lang', l.key); setShowLangModal(false); }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langNative, { color: colors.text }]}>{l.native}</Text>
                  <Text style={[styles.langSub, { color: colors.mutedForeground }]}>{l.label}</Text>
                </View>
                {lang === l.key && <Feather name="check-circle" size={20} color={roleColor} />}
              </TouchableOpacity>
            ))}
            <Pressable style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={() => setShowLangModal(false)}>
              <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── EDIT SUPPORT MODAL (Admin only) ── */}
      <Modal visible={showSupportModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalBar, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Support Details</Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={() => setShowSupportModal(false)}>
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Phone',          value: editPhone,       setter: setEditPhone,       icon: 'phone' },
              { label: 'Email',          value: editEmail,       setter: setEditEmail,       icon: 'mail' },
              { label: 'Office Address', value: editSupportAddr, setter: setEditSupportAddr, icon: 'map-pin' },
              { label: 'Office Hours',   value: editHours,       setter: setEditHours,       icon: 'clock' },
            ].map(f => (
              <View key={f.label}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color={colors.adminColor} />
                  <TextInput style={[styles.fieldInput, { color: colors.text }]} value={f.value} onChangeText={f.setter} autoCapitalize="none" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.adminColor }, saving && { opacity: 0.6 }]} onPress={handleSaveSupport} disabled={saving} activeOpacity={0.85}>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 20, paddingHorizontal: 18, gap: 14 },
  headerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  rolePillText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  editIconBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  headerCenter: { alignItems: 'center', gap: 4 },
  avatarRing: { width: 82, height: 82, borderRadius: 41, borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.45)', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 32, fontFamily: 'Inter_700Bold' },
  profileName: { color: '#FFFFFF', fontSize: 21, fontFamily: 'Inter_700Bold' },
  profileSub: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  headerBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { color: '#80FFC8', fontSize: 11, fontFamily: 'Inter_500Medium' },
  dnpVersion: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: 'Inter_400Regular' },

  statsCard: { flexDirection: 'row', marginHorizontal: 16, marginTop: 14, borderRadius: 16, borderWidth: 1, padding: 14, alignItems: 'center' },
  statCell: { flex: 1, alignItems: 'center', gap: 5 },
  statIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  statSep: { width: 1, height: 40, marginHorizontal: 4 },

  section: { marginTop: 20, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8 },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  editChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 13 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  rowValue: { fontSize: 13, fontFamily: 'Inter_500Medium' },

  aboutCard: { borderRadius: 16, padding: 18, gap: 10 },
  aboutTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  aboutName: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  aboutVer: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  aboutShieldWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  aboutDesc: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  aboutTags: { flexDirection: 'row', gap: 8 },
  aboutTag: { backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  aboutTagText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 24, borderRadius: 16, paddingVertical: 15, backgroundColor: '#FDECEA', borderWidth: 1, borderColor: '#F8C4C4' },
  logoutText: { color: '#C91B1B', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  footerText: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 16, marginBottom: 8, lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4, textAlign: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 16 },
  langNative: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  langSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  cancelBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  modalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14 },
  previewAvatar: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  previewLetter: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  previewName: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  previewBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  previewBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  divider: { height: 1 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 13 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  noticeText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
