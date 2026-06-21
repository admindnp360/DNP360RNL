import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsItem } from '@/components/SettingsItem';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

const ROLE_LABELS: Record<string, { en: string; hi: string }> = {
  citizen: { en: 'Citizen', hi: 'नागरिक' },
  safaikarmi: { en: 'Safai Karmi', hi: 'सफाई कर्मी' },
  official: { en: 'Municipal Official', hi: 'नगरपालिका अधिकारी' },
  admin: { en: 'System Administrator', hi: 'सिस्टम प्रशासक' },
};

const ROLE_COLORS: Record<string, string> = { citizen: '#1264E8', safaikarmi: '#007F42', official: '#C45C00', admin: '#1A3FA8' };
const ROLE_BG: Record<string, string> = { citizen: '#DCEEFF', safaikarmi: '#C8FADC', official: '#FFE2C0', admin: '#D5E1FF' };

export default function ProfileScreen() {
  const { user, logout, updateProfile } = useAuth();
  const { supportDetails, updateSupportDetails } = useAppData();
  const colors = useColors();
  const [lang, setLang] = useState<'en' | 'hi'>('en');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Edit profile state
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Support edit state
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editSupportAddress, setEditSupportAddress] = useState('');
  const [editHours, setEditHours] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('dnp360_lang').then(v => { if (v === 'hi' || v === 'en') setLang(v); });
  }, []);

  if (!user) return null;

  const roleColor = ROLE_COLORS[user.role] ?? colors.primary;
  const roleBg = ROLE_BG[user.role] ?? colors.surface;
  const roleLabelObj = ROLE_LABELS[user.role] ?? { en: user.role, hi: user.role };
  const roleLabel = lang === 'hi' ? roleLabelObj.hi : roleLabelObj.en;
  const isAdmin = user.role === 'admin';

  async function selectLang(l: 'en' | 'hi') {
    setLang(l);
    await AsyncStorage.setItem('dnp360_lang', l);
    setShowLangModal(false);
  }

  function openEditProfile() {
    setEditName(user.name);
    setEditMobile(user.mobile ?? '');
    setEditAddress(user.address ?? '');
    setShowEditProfileModal(true);
  }

  async function handleSaveProfile() {
    if (!editName.trim()) {
      Alert.alert('Missing', 'Name cannot be empty.');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({
        name: editName.trim(),
        mobile: editMobile.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      setShowEditProfileModal(false);
      Alert.alert('✓ Updated', 'Your profile has been updated.');
    } finally {
      setSavingProfile(false);
    }
  }

  function openEditSupport() {
    setEditPhone(supportDetails.phone);
    setEditEmail(supportDetails.email);
    setEditSupportAddress(supportDetails.address);
    setEditHours(supportDetails.hours);
    setShowSupportModal(true);
  }

  async function handleSaveSupport() {
    setSaving(true);
    try {
      await updateSupportDetails({ phone: editPhone.trim(), email: editEmail.trim(), address: editSupportAddress.trim(), hours: editHours.trim() });
      setShowSupportModal(false);
      Alert.alert('✓ Saved', 'Support details updated for all users.');
    } finally { setSaving(false); }
  }

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await logout(); router.replace('/login'); } },
    ]);
  }

  const INFO_ROWS = [
    { icon: 'mail', label: lang === 'hi' ? 'ईमेल' : 'Email', value: user.email },
    ...(user.mobile ? [{ icon: 'smartphone', label: lang === 'hi' ? 'मोबाइल' : 'Mobile', value: user.mobile }] : []),
    ...(user.address ? [{ icon: 'map-pin', label: lang === 'hi' ? 'पता' : 'Address', value: user.address }] : []),
    ...(user.employeeId ? [{ icon: 'briefcase', label: lang === 'hi' ? 'कर्मचारी आईडी' : 'Employee ID', value: user.employeeId }] : []),
    ...(user.wardId ? [{ icon: 'map', label: lang === 'hi' ? 'वार्ड' : 'Assigned Ward', value: `Ward ${user.wardId.replace(/[^0-9]/g, '')}` }] : []),
    { icon: 'calendar', label: lang === 'hi' ? 'सदस्य बने' : 'Member Since', value: user.createdAt ?? '—' },
    { icon: 'hash', label: lang === 'hi' ? 'उपयोगकर्ता आईडी' : 'User ID', value: user.id },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: roleColor }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{user.name[0].toUpperCase()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: 'rgba(255,255,255,0.25)', borderColor: 'rgba(255,255,255,0.5)' }]}
              onPress={openEditProfile}
              activeOpacity={0.8}
            >
              <Feather name="edit-2" size={13} color="#FFFFFF" />
              <Text style={styles.editAvatarText}>{lang === 'hi' ? 'संपादित करें' : 'Edit Profile'}</Text>
            </TouchableOpacity>
            <View style={[styles.roleBadge, { backgroundColor: roleBg }]}>
              <Text style={[styles.roleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
            </View>
          </View>
          <Text style={styles.profileName}>{user.name}</Text>
          {user.employeeId && <Text style={styles.profileEmpId}>{user.employeeId}</Text>}
        </View>

        {/* Account Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {lang === 'hi' ? 'खाता जानकारी' : 'ACCOUNT INFORMATION'}
            </Text>
            <Pressable
              onPress={openEditProfile}
              style={[styles.editChip, { backgroundColor: roleBg, borderColor: roleColor + '40' }]}
            >
              <Feather name="edit-2" size={11} color={roleColor} />
              <Text style={[styles.editChipText, { color: roleColor }]}>{lang === 'hi' ? 'संपादित' : 'Edit'}</Text>
            </Pressable>
          </View>
          {INFO_ROWS.map((row, i) => (
            <View key={row.label} style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: i < INFO_ROWS.length - 1 ? 1 : 0 }]}>
              <View style={[styles.infoIcon, { backgroundColor: roleBg }]}>
                <Feather name={row.icon as any} size={14} color={roleColor} />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {lang === 'hi' ? 'सेटिंग्स' : 'SETTINGS'}
          </Text>
          <SettingsItem
            icon="bell"
            label={lang === 'hi' ? 'सूचनाएं' : 'Notifications'}
            subtitle={lang === 'hi' ? 'शिकायत अपडेट, नोटिस' : 'Complaint updates, notices, alerts'}
            toggle
            toggleValue
            onToggle={() => {}}
            iconColor={roleColor}
          />
          <SettingsItem
            icon="globe"
            label={lang === 'hi' ? 'भाषा' : 'Language'}
            subtitle={lang === 'hi' ? 'हिन्दी' : 'English (India)'}
            onPress={() => setShowLangModal(true)}
            iconColor="#6B00C7"
            last
          />
        </View>

        {/* Support Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              {lang === 'hi' ? 'सहायता विवरण' : 'SUPPORT DETAILS'}
            </Text>
            {isAdmin && (
              <Pressable onPress={openEditSupport} style={[styles.editChip, { backgroundColor: colors.adminBg, borderColor: colors.adminColor + '40' }]}>
                <Feather name="edit-2" size={11} color={colors.adminColor} />
                <Text style={[styles.editChipText, { color: colors.adminColor }]}>Edit</Text>
              </Pressable>
            )}
          </View>
          {[
            { icon: 'phone', label: lang === 'hi' ? 'फोन' : 'Phone', value: supportDetails.phone },
            { icon: 'mail', label: lang === 'hi' ? 'ईमेल' : 'Email', value: supportDetails.email },
            { icon: 'map-pin', label: lang === 'hi' ? 'कार्यालय' : 'Office Address', value: supportDetails.address },
            { icon: 'clock', label: lang === 'hi' ? 'समय' : 'Office Hours', value: supportDetails.hours },
          ].map((row, i, arr) => (
            <View key={row.label} style={[styles.infoRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
              <View style={[styles.infoIcon, { backgroundColor: '#E6F4EC' }]}>
                <Feather name={row.icon as any} size={14} color="#006A35" />
              </View>
              <View style={styles.infoContent}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* About DNP360 */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {lang === 'hi' ? 'डीएनपी360 के बारे में' : 'ABOUT DNP360'}
          </Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.aboutAppName, { color: colors.text }]}>DNP360</Text>
            <Text style={[styles.aboutDesc, { color: colors.mutedForeground }]}>
              {lang === 'hi'
                ? 'दौदनगर नगर परिषद 360 — एक स्मार्ट शासन प्रणाली जो नागरिकों, सफाई कर्मियों और अधिकारियों को जोड़ती है।'
                : 'Daudnagar Nagar Parishad 360 — A smart governance ecosystem connecting citizens, Safai Karmis, and officials for efficient municipal management.'}
            </Text>
            <View style={styles.aboutTagRow}>
              {['v1.0.0', 'Bihar, India', 'Digital India'].map(t => (
                <View key={t} style={[styles.aboutTag, { backgroundColor: roleBg }]}>
                  <Text style={[styles.aboutTagText, { color: roleColor }]}>{t}</Text>
                </View>
              ))}
            </View>
          </View>
          <SettingsItem
            icon="file-text"
            label={lang === 'hi' ? 'गोपनीयता नीति' : 'Privacy Policy'}
            onPress={() => {}}
            iconColor="#727785"
            last
          />
        </View>

        <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: '#FDECEA' }]} onPress={handleLogout} activeOpacity={0.8}>
          <Feather name="log-out" size={18} color="#C91B1B" />
          <Text style={styles.logoutText}>{lang === 'hi' ? 'साइन आउट' : 'Sign Out'}</Text>
        </TouchableOpacity>
        <Text style={[styles.footer, { color: colors.mutedForeground }]}>DNP360 · Nagar Parishad Daudnagar{'\n'}Bihar, India · v1.0.0</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfileModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {lang === 'hi' ? 'प्रोफ़ाइल संपादित करें' : 'Edit Profile'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
                {lang === 'hi' ? 'अपनी जानकारी अपडेट करें' : 'Update your personal information'}
              </Text>
            </View>
            <Pressable
              style={[styles.closeIconBtn, { backgroundColor: colors.surface }]}
              onPress={() => setShowEditProfileModal(false)}
            >
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {/* Avatar preview */}
            <View style={[styles.editAvatarPreview, { backgroundColor: roleBg }]}>
              <View style={[styles.editAvatarCircle, { backgroundColor: roleColor }]}>
                <Text style={styles.editAvatarCircleLetter}>
                  {(editName[0] ?? user.name[0] ?? '?').toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={[styles.editAvatarName, { color: colors.text }]}>{editName || user.name}</Text>
                <View style={[styles.editRoleBadge, { backgroundColor: roleColor + '20' }]}>
                  <Text style={[styles.editRoleBadgeText, { color: roleColor }]}>{roleLabel}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.formDivider, { backgroundColor: colors.border }]} />

            {[
              {
                label: lang === 'hi' ? 'पूरा नाम *' : 'Full Name *',
                value: editName,
                onChange: setEditName,
                icon: 'user',
                placeholder: 'Your full name',
                caps: 'words' as const,
                key: 'name',
              },
              {
                label: lang === 'hi' ? 'मोबाइल नंबर' : 'Mobile Number',
                value: editMobile,
                onChange: setEditMobile,
                icon: 'smartphone',
                placeholder: '10-digit mobile number',
                caps: 'none' as const,
                key: 'mobile',
                numeric: true,
              },
              {
                label: lang === 'hi' ? 'पता' : 'Address',
                value: editAddress,
                onChange: setEditAddress,
                icon: 'map-pin',
                placeholder: 'Street, Ward, City',
                caps: 'sentences' as const,
                key: 'address',
              },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color={roleColor} />
                  <TextInput
                    style={[styles.fieldInputInner, { color: colors.text }]}
                    value={f.value}
                    onChangeText={f.onChange}
                    autoCapitalize={f.caps}
                    keyboardType={(f as any).numeric ? 'phone-pad' : 'default'}
                    placeholder={f.placeholder}
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            ))}

            <View style={[styles.infoNotice, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="info" size={13} color={colors.mutedForeground} />
              <Text style={[styles.infoNoticeText, { color: colors.mutedForeground }]}>
                {lang === 'hi'
                  ? 'ईमेल और कर्मचारी आईडी बदलने के लिए कार्यालय से संपर्क करें।'
                  : 'To change your email or Employee ID, contact the municipal office.'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: roleColor }, savingProfile && { opacity: 0.6 }]}
              onPress={handleSaveProfile}
              disabled={savingProfile}
              activeOpacity={0.85}
            >
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.saveBtnText}>
                {savingProfile ? (lang === 'hi' ? 'सहेज रहे हैं…' : 'Saving…') : (lang === 'hi' ? 'परिवर्तन सहेजें' : 'Save Changes')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Language Modal */}
      <Modal visible={showLangModal} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Select Language / भाषा चुनें</Text>
            {[{ key: 'en', label: 'English (India)', native: 'English' }, { key: 'hi', label: 'Hindi', native: 'हिन्दी' }].map(l => (
              <TouchableOpacity
                key={l.key}
                style={[styles.langOption, { borderColor: lang === l.key ? roleColor : colors.border, backgroundColor: lang === l.key ? roleBg : colors.surface }]}
                onPress={() => selectLang(l.key as 'en' | 'hi')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.langLabel, { color: colors.text }]}>{l.native}</Text>
                  <Text style={[styles.langSub, { color: colors.mutedForeground }]}>{l.label}</Text>
                </View>
                {lang === l.key && <Feather name="check-circle" size={20} color={roleColor} />}
              </TouchableOpacity>
            ))}
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.surface }]} onPress={() => setShowLangModal(false)}>
              <Text style={[styles.closeBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Edit Support Modal (Admin Only) */}
      <Modal visible={showSupportModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Support Details</Text>
            <Pressable
              style={[styles.closeIconBtn, { backgroundColor: colors.surface }]}
              onPress={() => setShowSupportModal(false)}
            >
              <Feather name="x" size={18} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Phone', value: editPhone, setter: setEditPhone, icon: 'phone' },
              { label: 'Email', value: editEmail, setter: setEditEmail, icon: 'mail' },
              { label: 'Office Address', value: editSupportAddress, setter: setEditSupportAddress, icon: 'map-pin' },
              { label: 'Office Hours', value: editHours, setter: setEditHours, icon: 'clock' },
            ].map(f => (
              <View key={f.label}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldInputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color={colors.adminColor} />
                  <TextInput
                    style={[styles.fieldInputInner, { color: colors.text }]}
                    value={f.value}
                    onChangeText={f.setter}
                    autoCapitalize="none"
                    placeholderTextColor={colors.mutedForeground}
                  />
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
  profileHeader: { paddingTop: 16, paddingBottom: 18, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  avatarWrap: { alignItems: 'center', gap: 6, marginBottom: 2 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)' },
  avatarLetter: { color: '#FFFFFF', fontSize: 28, fontFamily: 'Inter_700Bold' },
  editAvatarBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  editAvatarText: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  roleBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  profileName: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Inter_700Bold', marginTop: 2 },
  profileEmpId: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_500Medium' },
  section: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  sectionTitle: { fontSize: 11, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.9 },
  editChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  editChipText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoContent: { flex: 1, gap: 1 },
  infoLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  infoValue: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  aboutCard: { marginHorizontal: 16, marginBottom: 4, borderRadius: 12, padding: 14, gap: 8 },
  aboutAppName: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  aboutDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  aboutTagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  aboutTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  aboutTagText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 20, borderRadius: 14, paddingVertical: 15, borderWidth: 1, borderColor: '#F8C4C4' },
  logoutText: { color: '#C91B1B', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  footer: { textAlign: 'center', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 16, marginBottom: 8, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  sheetTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', marginBottom: 4, textAlign: 'center' },
  langOption: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 16 },
  langLabel: { fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  langSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeIconBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  editAvatarPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14 },
  editAvatarCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  editAvatarCircleLetter: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold' },
  editAvatarName: { fontSize: 16, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  editRoleBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  editRoleBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  formDivider: { height: 1 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInputInner: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 13 },
  infoNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  infoNoticeText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 4 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
