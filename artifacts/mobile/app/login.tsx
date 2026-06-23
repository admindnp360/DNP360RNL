import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
  Image,
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
import { useAlert } from '@/contexts/AlertContext';
import { useAuth } from '@/contexts/AuthContext';

const IS_WEB = Platform.OS === 'web';

const ROLE_CHIPS = [
  { label: 'Admin',        prefix: 'AD…',  icon: 'shield',    grad: ['#7C3AED','#6366F1'] as const },
  { label: 'Official',     prefix: 'OF…',  icon: 'briefcase', grad: ['#0EA5E9','#2563EB'] as const },
  { label: 'Safai Karmi',  prefix: 'SK…',  icon: 'trash-2',   grad: ['#10B981','#059669'] as const },
  { label: 'Citizen',      prefix: 'C…',   icon: 'user',      grad: ['#F59E0B','#EF4444'] as const },
];

export default function LoginScreen() {
  const { login, loginWithCode } = useAuth();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'citizen' | 'staff'>('citizen');
  const [subTab, setSubTab] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    const id = subTab === 'mobile' ? mobile.trim() : email.trim();
    if (!id || !password) {
      showAlert('Missing Fields', 'Please fill in all required fields.', undefined, 'warning');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(id, password, subTab);
      if (!ok) showAlert('Login Failed', 'Invalid credentials. Please check your details.', undefined, 'error');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  async function handleSecretCode() {
    if (!secretCode.trim()) {
      showAlert('Missing Code', 'Please enter your secret code.', undefined, 'warning');
      return;
    }
    setLoading(true);
    try {
      const ok = await loginWithCode(secretCode.trim());
      if (!ok) showAlert('Invalid Code', 'Secret code not recognised or inactive.', undefined, 'error');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  function handleCopy() {
    if (!secretCode.trim()) return;
    if (IS_WEB) {
      navigator.clipboard?.writeText(secretCode.trim()).catch(() => {});
    } else {
      Clipboard.setString(secretCode.trim());
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#060C1D', '#0B1429', '#111B3E']} style={StyleSheet.absoluteFill} />

      <View style={[s.blob, s.blob1]} />
      <View style={[s.blob, s.blob2]} />
      <View style={[s.blob, s.blob3]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={s.header}>
            <View style={s.logoRing}>
              <View style={s.logoRingInner}>
                <Image
                  source={require('@/assets/images/dnp360-logo.png')}
                  style={s.logoImg}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={s.appName}>DNP360</Text>
            <Text style={s.orgName}>Nagar Parishad Daudnagar</Text>
            <View style={s.liveBadge}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>Smart Governance · Digital India</Text>
            </View>
          </View>

          <View style={s.tabRow}>
            <Pressable style={s.tabWrap} onPress={() => setTab('citizen')}>
              {tab === 'citizen'
                ? <LinearGradient colors={['#2563EB','#4F46E5']} style={s.tabActive}>
                    <Feather name="user" size={14} color="#fff" />
                    <Text style={s.tabActiveTxt}>Citizen</Text>
                  </LinearGradient>
                : <View style={s.tabInactive}>
                    <Feather name="user" size={14} color="#4B5563" />
                    <Text style={s.tabInactiveTxt}>Citizen</Text>
                  </View>}
            </Pressable>
            <Pressable style={s.tabWrap} onPress={() => setTab('staff')}>
              {tab === 'staff'
                ? <LinearGradient colors={['#7C3AED','#6366F1']} style={s.tabActive}>
                    <Feather name="shield" size={14} color="#fff" />
                    <Text style={s.tabActiveTxt}>Staff Login</Text>
                  </LinearGradient>
                : <View style={s.tabInactive}>
                    <Feather name="shield" size={14} color="#4B5563" />
                    <Text style={s.tabInactiveTxt}>Staff Login</Text>
                  </View>}
            </Pressable>
          </View>

          <View style={s.card}>
            {tab === 'citizen' ? (
              <>
                <Text style={s.cardTitle}>Welcome Back</Text>
                <Text style={s.cardSub}>Sign in with your email or mobile number</Text>

                <View style={s.subRow}>
                  {(['email','mobile'] as const).map(t => (
                    <Pressable key={t} onPress={() => setSubTab(t)} style={[s.subBtn, subTab === t && s.subBtnActive]}>
                      <Feather name={t === 'email' ? 'mail' : 'smartphone'} size={12} color={subTab === t ? '#60A5FA' : '#4B5563'} />
                      <Text style={[s.subBtnTxt, subTab === t && s.subBtnTxtActive]}>
                        {t === 'email' ? 'Email' : 'Mobile'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {subTab === 'email' ? (
                  <View style={s.inputBox}>
                    <Feather name="mail" size={16} color="#4B6EAF" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="Email address"
                      placeholderTextColor="#2D3A52"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                    />
                  </View>
                ) : (
                  <View style={s.inputBox}>
                    <Feather name="smartphone" size={16} color="#4B6EAF" style={s.inputIcon} />
                    <TextInput
                      style={s.input}
                      placeholder="10-digit mobile number"
                      placeholderTextColor="#2D3A52"
                      keyboardType="phone-pad"
                      value={mobile}
                      onChangeText={setMobile}
                      maxLength={10}
                    />
                  </View>
                )}

                <View style={s.inputBox}>
                  <Feather name="lock" size={16} color="#4B6EAF" style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Password"
                    placeholderTextColor="#2D3A52"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    onSubmitEditing={handleSignIn}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowPassword(p => !p)} style={s.eyeBtn}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#4B6EAF" />
                  </Pressable>
                </View>

                <Pressable onPress={() => router.push('/forgot-password')} style={s.forgotRow}>
                  <Text style={s.forgotTxt}>Forgot Password?</Text>
                </Pressable>

                <TouchableOpacity
                  onPress={handleSignIn}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={[s.btnWrap, loading && { opacity: 0.65 }]}
                >
                  <LinearGradient colors={['#2563EB','#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Feather name="log-in" size={17} color="#fff" />}
                    <Text style={s.btnTxt}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.cardTitle}>Staff Authentication</Text>
                <Text style={s.cardSub}>Enter the secret code issued by Admin</Text>

                <View style={s.roleRow}>
                  {ROLE_CHIPS.map(r => (
                    <View key={r.label} style={s.roleChip}>
                      <LinearGradient colors={r.grad} style={s.roleChipIcon}>
                        <Feather name={r.icon as any} size={9} color="#fff" />
                      </LinearGradient>
                      <View>
                        <Text style={s.roleChipPrefix}>{r.prefix}</Text>
                        <Text style={s.roleChipLabel}>{r.label}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={s.inputBox}>
                  <Feather name="key" size={16} color="#8B5CF6" style={s.inputIcon} />
                  <TextInput
                    style={[s.input, { flex: 1 }]}
                    placeholder="Enter your secret code"
                    placeholderTextColor="#2D3A52"
                    autoCapitalize="characters"
                    secureTextEntry={!showSecret}
                    value={secretCode}
                    onChangeText={setSecretCode}
                    onSubmitEditing={handleSecretCode}
                    returnKeyType="done"
                  />
                  <Pressable onPress={() => setShowSecret(p => !p)} style={s.eyeBtn}>
                    <Feather name={showSecret ? 'eye-off' : 'eye'} size={16} color="#8B5CF6" />
                  </Pressable>
                  <Pressable onPress={handleCopy} style={[s.copyBtn, copied && s.copyBtnActive]}>
                    <Feather name={copied ? 'check' : 'copy'} size={14} color={copied ? '#10B981' : '#8B5CF6'} />
                  </Pressable>
                </View>

                {copied && (
                  <View style={s.copiedBanner}>
                    <Feather name="check-circle" size={12} color="#10B981" />
                    <Text style={s.copiedTxt}>Secret key copied to clipboard</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSecretCode}
                  disabled={loading}
                  activeOpacity={0.88}
                  style={[s.btnWrap, loading && { opacity: 0.65 }]}
                >
                  <LinearGradient colors={['#7C3AED','#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Feather name="shield" size={17} color="#fff" />}
                    <Text style={s.btnTxt}>{loading ? 'Verifying…' : 'Authenticate'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.staffNote}>
                  <Feather name="info" size={12} color="#6366F1" />
                  <Text style={s.staffNoteTxt}>First login creates your account automatically.</Text>
                </View>
              </>
            )}
          </View>

          <View style={s.quickLinks}>
            <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.85} style={s.qlBtn}>
              <LinearGradient colors={['rgba(16,185,129,0.13)','rgba(5,150,105,0.04)']} style={s.qlGrad}>
                <Feather name="user-plus" size={15} color="#10B981" />
                <Text style={[s.qlTxt, { color: '#10B981' }]}>Create Citizen Account</Text>
                <Feather name="chevron-right" size={14} color="#10B981" />
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/forgot-password')} activeOpacity={0.85} style={s.qlBtn}>
              <LinearGradient colors={['rgba(245,158,11,0.12)','rgba(239,68,68,0.04)']} style={s.qlGrad}>
                <Feather name="unlock" size={15} color="#F59E0B" />
                <Text style={[s.qlTxt, { color: '#F59E0B' }]}>Reset Password</Text>
                <Feather name="chevron-right" size={14} color="#F59E0B" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <Text style={s.version}>DNP360 · Nagar Parishad Daudnagar · Bihar</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 999 },
  blob1: { width: 320, height: 320, backgroundColor: '#2563EB0D', top: -100, right: -100 },
  blob2: { width: 220, height: 220, backgroundColor: '#7C3AED0A', bottom: 80, left: -80 },
  blob3: { width: 160, height: 160, backgroundColor: '#06B6D408', top: '42%', right: -40 },

  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 28 },

  header: { alignItems: 'center', marginBottom: 28 },
  logoRing: {
    width: 110, height: 110, borderRadius: 55,
    borderWidth: 2.5,
    borderTopColor: '#2563EB',
    borderRightColor: '#06B6D4',
    borderBottomColor: '#7C3AED',
    borderLeftColor: '#10B981',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  logoRingInner: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: 'rgba(6,12,29,0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  logoImg: { width: 78, height: 78 },
  appName: { color: '#FFFFFF', fontSize: 26, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  orgName: { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter_400Regular', marginTop: 3 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveTxt: { color: '#475569', fontSize: 11, fontFamily: 'Inter_400Regular' },

  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tabWrap: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  tabActive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tabActiveTxt: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  tabInactiveTxt: { color: '#4B5563', fontSize: 14, fontFamily: 'Inter_600SemiBold' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: 20,
    gap: 14,
    marginBottom: 16,
  },
  cardTitle: { color: '#F1F5F9', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  cardSub: { color: '#475569', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -6 },

  subRow: { flexDirection: 'row', gap: 8 },
  subBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  subBtnActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(37,99,235,0.15)' },
  subBtnTxt: { color: '#4B5563', fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  subBtnTxtActive: { color: '#60A5FA' },

  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 14, paddingVertical: 1 },
  inputIcon: { marginRight: 4 },
  input: { flex: 1, color: '#E2E8F0', fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  eyeBtn: { padding: 6 },
  copyBtn: { padding: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)', marginLeft: 4 },
  copyBtnActive: { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)' },

  copiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.1)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.2)' },
  copiedTxt: { color: '#34D399', fontSize: 12, fontFamily: 'Inter_500Medium' },

  forgotRow: { alignSelf: 'flex-end' },
  forgotTxt: { color: '#60A5FA', fontSize: 13, fontFamily: 'Inter_500Medium' },

  btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold' },

  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', paddingHorizontal: 10, paddingVertical: 8, flex: 1, minWidth: '44%' },
  roleChipIcon: { width: 24, height: 24, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  roleChipPrefix: { color: '#94A3B8', fontSize: 10, fontFamily: 'Inter_700Bold' },
  roleChipLabel: { color: '#64748B', fontSize: 9, fontFamily: 'Inter_400Regular' },

  staffNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  staffNoteTxt: { color: '#818CF8', fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },

  quickLinks: { gap: 10, marginBottom: 14 },
  qlBtn: { borderRadius: 14, overflow: 'hidden' },
  qlGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  qlTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  version: { textAlign: 'center', color: '#1E2A40', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
