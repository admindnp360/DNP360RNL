import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';

type Tab = 'request' | 'check';

const STATUS_CONFIG = {
  pending: {
    icon: 'clock' as const,
    grad: ['#F59E0B', '#D97706'] as const,
    label: 'Pending Review',
    desc: 'Your request is being reviewed. Please wait 1–2 working days.',
    borderColor: 'rgba(245,158,11,0.3)',
    bg: 'rgba(245,158,11,0.08)',
  },
  approved: {
    icon: 'check-circle' as const,
    grad: ['#10B981', '#059669'] as const,
    label: 'Approved!',
    desc: 'Password has been reset. Admin will contact you via your registered mobile.',
    borderColor: 'rgba(16,185,129,0.3)',
    bg: 'rgba(16,185,129,0.08)',
  },
  rejected: {
    icon: 'x-circle' as const,
    grad: ['#EF4444', '#DC2626'] as const,
    label: 'Request Rejected',
    desc: 'Your request was not approved. Please contact the Nagar Parishad office directly.',
    borderColor: 'rgba(239,68,68,0.3)',
    bg: 'rgba(239,68,68,0.08)',
  },
};

export default function ForgotPasswordScreen() {
  const { addPasswordResetRequest, passwordResetRequests } = useAppData();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<Tab>('request');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState('');
  const [checkedRequest, setCheckedRequest] = useState<typeof passwordResetRequests[0] | null | 'not_found'>(null);

  async function handleRequest() {
    if (!email.trim() || !name.trim()) {
      showAlert('Missing Fields', 'Please enter your registered email and full name.', undefined, 'warning');
      return;
    }
    setLoading(true);
    try {
      await addPasswordResetRequest(email.trim().toLowerCase(), name.trim());
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  function handleCheckStatus() {
    if (!checkEmail.trim()) {
      showAlert('Missing Email', 'Please enter your registered email.', undefined, 'warning');
      return;
    }
    const found = passwordResetRequests.find(r => r.email.toLowerCase() === checkEmail.trim().toLowerCase());
    setCheckedRequest(found ?? 'not_found');
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <LinearGradient colors={['#060C1D', '#0B1429', '#111B3E']} style={StyleSheet.absoluteFill} />
      <View style={[s.blob, s.blob1]} />
      <View style={[s.blob, s.blob2]} />

      <View style={s.topBar}>
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <View style={s.backIconWrap}>
            <Feather name="arrow-left" size={17} color="#FBBF24" />
          </View>
        </Pressable>
        <Text style={s.topTitle}>Reset Password</Text>
        <View style={{ width: 42 }} />
      </View>

      <View style={s.tabRow}>
        {(['request', 'check'] as Tab[]).map(t => (
          <Pressable key={t} style={s.tabWrap} onPress={() => setTab(t)}>
            {tab === t
              ? <LinearGradient
                  colors={t === 'request' ? ['#F59E0B','#EF4444'] : ['#2563EB','#6366F1']}
                  style={s.tabActive}
                >
                  <Feather name={t === 'request' ? 'send' : 'search'} size={13} color="#fff" />
                  <Text style={s.tabActiveTxt}>{t === 'request' ? 'Submit Request' : 'Check Status'}</Text>
                </LinearGradient>
              : <View style={s.tabInactive}>
                  <Feather name={t === 'request' ? 'send' : 'search'} size={13} color="#4B5563" />
                  <Text style={s.tabInactiveTxt}>{t === 'request' ? 'Submit Request' : 'Check Status'}</Text>
                </View>
            }
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {tab === 'request' ? (
            !submitted ? (
              <>
                <View style={s.heroWrap}>
                  <LinearGradient colors={['#F59E0B','#EF4444']} style={s.heroIcon}>
                    <Feather name="unlock" size={28} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={s.sectionTitle}>Forgot your password?</Text>
                <Text style={s.sectionSub}>
                  Submit a request — the Admin will contact you via your registered mobile to reset your password.
                </Text>

                <View style={s.card}>
                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
                    <View style={s.inputBox}>
                      <Feather name="user" size={15} color="#F59E0B" style={s.inputIcon} />
                      <TextInput
                        style={s.input}
                        placeholder="Your registered full name"
                        placeholderTextColor="#2D2009"
                        autoCapitalize="words"
                        value={name}
                        onChangeText={setName}
                      />
                    </View>
                  </View>

                  <View style={s.fieldGroup}>
                    <Text style={s.label}>Registered Email <Text style={s.req}>*</Text></Text>
                    <View style={s.inputBox}>
                      <Feather name="mail" size={15} color="#F59E0B" style={s.inputIcon} />
                      <TextInput
                        style={s.input}
                        placeholder="your@email.com"
                        placeholderTextColor="#2D2009"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        value={email}
                        onChangeText={setEmail}
                      />
                    </View>
                  </View>

                  <View style={s.infoBox}>
                    <Feather name="info" size={12} color="#F59E0B" />
                    <Text style={s.infoTxt}>Your request will be reviewed within 1–2 working days.</Text>
                  </View>

                  <TouchableOpacity
                    style={[s.btnWrap, loading && { opacity: 0.65 }]}
                    onPress={handleRequest}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#F59E0B','#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                      <Feather name="send" size={16} color="#fff" />
                      <Text style={s.btnTxt}>{loading ? 'Submitting…' : 'Request Password Reset'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <View style={s.heroWrap}>
                  <LinearGradient colors={['#10B981','#059669']} style={s.heroIcon}>
                    <Feather name="check-circle" size={28} color="#fff" />
                  </LinearGradient>
                </View>
                <Text style={s.sectionTitle}>Request Submitted!</Text>
                <Text style={s.sectionSub}>
                  The Admin has been notified and will contact you via your registered mobile.
                </Text>

                <View style={s.card}>
                  <View style={s.successRow}>
                    <Feather name="mail" size={14} color="#34D399" />
                    <Text style={s.successEmail}>{email}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.btnWrap}
                    onPress={() => { setCheckEmail(email); setTab('check'); }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#2563EB','#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                      <Feather name="search" size={16} color="#fff" />
                      <Text style={s.btnTxt}>Check Request Status</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.btnWrap}
                    onPress={() => router.replace('/login')}
                    activeOpacity={0.85}
                  >
                    <View style={[s.btn, { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
                      <Feather name="arrow-left" size={16} color="#94A3B8" />
                      <Text style={[s.btnTxt, { color: '#94A3B8' }]}>Back to Login</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )
          ) : (
            <>
              <View style={s.heroWrap}>
                <LinearGradient colors={['#2563EB','#6366F1']} style={s.heroIcon}>
                  <Feather name="search" size={28} color="#fff" />
                </LinearGradient>
              </View>
              <Text style={s.sectionTitle}>Check Request Status</Text>
              <Text style={s.sectionSub}>
                Enter your registered email to see your password reset request status.
              </Text>

              <View style={s.card}>
                <View style={s.fieldGroup}>
                  <Text style={s.label}>Registered Email</Text>
                  <View style={s.inputBox}>
                    <Feather name="mail" size={15} color="#3B82F6" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="your@email.com"
                      placeholderTextColor="#0D1829"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={checkEmail}
                      onChangeText={v => { setCheckEmail(v); setCheckedRequest(null); }}
                    />
                  </View>
                </View>
                <TouchableOpacity style={s.btnWrap} onPress={handleCheckStatus} activeOpacity={0.85}>
                  <LinearGradient colors={['#2563EB','#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                    <Feather name="search" size={16} color="#fff" />
                    <Text style={s.btnTxt}>Check Status</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {checkedRequest === 'not_found' && (
                <View style={[s.statusCard, { borderColor: 'rgba(239,68,68,0.25)', backgroundColor: 'rgba(239,68,68,0.06)' }]}>
                  <LinearGradient colors={['#EF4444','#DC2626']} style={s.statusIcon}>
                    <Feather name="alert-circle" size={22} color="#fff" />
                  </LinearGradient>
                  <Text style={s.statusLabel}>No Request Found</Text>
                  <Text style={s.statusDesc}>No password reset request was found for this email. Please submit a new request.</Text>
                </View>
              )}

              {checkedRequest && checkedRequest !== 'not_found' && (() => {
                const cfg = STATUS_CONFIG[checkedRequest.status];
                return (
                  <View style={[s.statusCard, { borderColor: cfg.borderColor, backgroundColor: cfg.bg }]}>
                    <LinearGradient colors={cfg.grad} style={s.statusIcon}>
                      <Feather name={cfg.icon} size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={s.statusLabel}>{cfg.label}</Text>
                    <Text style={s.statusDesc}>{cfg.desc}</Text>
                    <View style={s.statusMeta}>
                      <View style={s.metaRow}>
                        <Feather name="user" size={11} color="#64748B" />
                        <Text style={s.metaTxt}>{checkedRequest.name}</Text>
                      </View>
                      <View style={s.metaRow}>
                        <Feather name="calendar" size={11} color="#64748B" />
                        <Text style={s.metaTxt}>Submitted: {checkedRequest.requestedAt}</Text>
                      </View>
                    </View>
                    {checkedRequest.adminNote && (
                      <View style={s.adminNote}>
                        <View style={s.adminNoteHeader}>
                          <Feather name="message-square" size={11} color="#A5B4FC" />
                          <Text style={s.adminNoteTitle}>Note from Admin</Text>
                        </View>
                        <Text style={s.adminNoteTxt}>{checkedRequest.adminNote}</Text>
                      </View>
                    )}
                  </View>
                );
              })()}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  blob: { position: 'absolute', borderRadius: 999 },
  blob1: { width: 220, height: 220, backgroundColor: '#F59E0B0A', top: -40, right: -50 },
  blob2: { width: 160, height: 160, backgroundColor: '#6366F10A', bottom: 100, left: -40 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: {},
  backIconWrap: { width: 40, height: 40, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)' },
  topTitle: { color: '#F1F5F9', fontSize: 17, fontFamily: 'Inter_700Bold' },

  tabRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 4 },
  tabWrap: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  tabActive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tabActiveTxt: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  tabInactiveTxt: { color: '#4B5563', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  inner: { padding: 18, gap: 14, paddingBottom: 60 },

  heroWrap: { alignSelf: 'center' },
  heroIcon: { width: 68, height: 68, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { color: '#F1F5F9', fontSize: 21, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  sectionSub: { color: '#475569', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },

  card: { backgroundColor: 'rgba(255,255,255,0.035)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 16, gap: 13 },

  fieldGroup: { gap: 6 },
  label: { color: '#64748B', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  req: { color: '#F87171' },

  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 13, paddingVertical: 1 },
  inputIcon: { marginRight: 4 },
  input: { flex: 1, color: '#E2E8F0', fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 13 },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: 'rgba(245,158,11,0.07)', borderRadius: 11, padding: 11, borderWidth: 1, borderColor: 'rgba(245,158,11,0.15)' },
  infoTxt: { flex: 1, color: '#FBBF24', fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 17 },

  btnWrap: { borderRadius: 14, overflow: 'hidden' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  btnTxt: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(52,211,153,0.08)', borderRadius: 11, padding: 13, borderWidth: 1, borderColor: 'rgba(52,211,153,0.18)' },
  successEmail: { color: '#34D399', fontSize: 14, fontFamily: 'Inter_500Medium' },

  statusCard: { borderRadius: 20, borderWidth: 1, padding: 18, alignItems: 'center', gap: 11 },
  statusIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statusLabel: { color: '#F1F5F9', fontSize: 17, fontFamily: 'Inter_700Bold' },
  statusDesc: { color: '#94A3B8', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  statusMeta: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 11, padding: 11, alignSelf: 'stretch', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metaTxt: { color: '#64748B', fontSize: 12, fontFamily: 'Inter_400Regular' },
  adminNote: { backgroundColor: 'rgba(165,180,252,0.08)', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(165,180,252,0.18)', padding: 13, alignSelf: 'stretch', gap: 8 },
  adminNoteHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adminNoteTitle: { color: '#A5B4FC', fontSize: 11, fontFamily: 'Inter_700Bold' },
  adminNoteTxt: { color: '#C7D2FE', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 19 },
});
