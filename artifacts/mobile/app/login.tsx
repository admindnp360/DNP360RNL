import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Clipboard,
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

type RoleKey = 'ADMIN' | 'OFFICIAL' | 'SAFAI KARMI' | 'CITIZEN';

const ROLES: { key: RoleKey; prefix: string; grad: readonly [string, string]; icon: string }[] = [
  { key: 'ADMIN',      prefix: 'ADMIN', grad: ['#7C3AED', '#6366F1'], icon: 'shield' },
  { key: 'OFFICIAL',   prefix: 'OF',    grad: ['#0EA5E9', '#2563EB'], icon: 'briefcase' },
  { key: 'SAFAI KARMI',prefix: 'SK',    grad: ['#10B981', '#059669'], icon: 'trash-2' },
  { key: 'CITIZEN',    prefix: 'C',     grad: ['#F59E0B', '#EF4444'], icon: 'user' },
];

function DNPLogo() {
  return (
    <View style={logo.wrap}>
      <View style={logo.outerRing}>
        <View style={logo.seg1} />
        <View style={logo.seg2} />
        <View style={logo.seg3} />
        <View style={logo.seg4} />
      </View>

      {[0,1,2,3,4,5,6,7].map(i => {
        const angle = (i * 45 * Math.PI) / 180;
        const r = 62;
        const cx = 72, cy = 72;
        const x = cx + r * Math.cos(angle) - 4;
        const y = cy + r * Math.sin(angle) - 4;
        const colors = ['#6366F1','#06B6D4','#10B981','#FBBF24','#EF4444','#EC4899','#2563EB','#8B5CF6'];
        return (
          <View key={i} style={[logo.dot, { left: x, top: y, backgroundColor: colors[i] }]} />
        );
      })}

      <View style={logo.innerRing}>
        <LinearGradient colors={['#0E1628','#141E38']} style={logo.face}>
          <View style={logo.faceAccent} />

          <Text style={logo.dnpTxt}>DNP</Text>

          <View style={logo.threeRow}>
            <View style={logo.threeBar} />
            <Text style={logo.threeTxt}>360</Text>
            <View style={logo.threeBar} />
          </View>

          <View style={logo.bottomLine} />
        </LinearGradient>
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { login, loginWithCode } = useAuth();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'citizen' | 'staff'>('citizen');
  const [subTab, setSubTab] = useState<'email' | 'mobile'>('email');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleKey | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const codeRef = useRef<TextInput>(null);

  function handleRoleSelect(role: typeof ROLES[0]) {
    setSelectedRole(role.key);
    setSecretCode(role.prefix);
    setTimeout(() => codeRef.current?.focus(), 100);
  }

  function handleCodeChange(v: string) {
    const cleaned = v.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (selectedRole) {
      const prefix = ROLES.find(r => r.key === selectedRole)?.prefix ?? '';
      if (!cleaned.startsWith(prefix)) {
        setSecretCode(prefix);
        return;
      }
    }
    setSecretCode(cleaned);
  }

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
      <LinearGradient colors={['#060C1D', '#0B1429', '#0F1C3F']} style={StyleSheet.absoluteFill} />
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
            <DNPLogo />
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
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="log-in" size={17} color="#fff" />}
                    <Text style={s.btnTxt}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={s.cardTitle}>Staff Authentication</Text>
                <Text style={s.cardSub}>Select your role then enter the secret code</Text>

                <View style={s.roleGrid}>
                  {ROLES.map(r => {
                    const active = selectedRole === r.key;
                    return (
                      <Pressable key={r.key} style={s.roleCardWrap} onPress={() => handleRoleSelect(r)}>
                        {active
                          ? <LinearGradient colors={r.grad} style={s.roleCardActive}>
                              <Feather name={r.icon as any} size={18} color="#fff" />
                              <Text style={s.roleCardTxtActive}>{r.key}</Text>
                            </LinearGradient>
                          : <View style={s.roleCardInactive}>
                              <Feather name={r.icon as any} size={18} color="#475569" />
                              <Text style={s.roleCardTxt}>{r.key}</Text>
                            </View>}
                      </Pressable>
                    );
                  })}
                </View>

                <View style={[s.inputBox, selectedRole && { borderColor: ROLES.find(r => r.key === selectedRole)?.grad[0] ?? 'rgba(255,255,255,0.08)' }]}>
                  <Feather name="key" size={16} color="#8B5CF6" style={s.inputIcon} />
                  <TextInput
                    ref={codeRef}
                    style={[s.input, { flex: 1, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 }]}
                    placeholder={selectedRole ? `${ROLES.find(r=>r.key===selectedRole)?.prefix}…` : 'Select role above first'}
                    placeholderTextColor="#2D3A52"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    secureTextEntry={!showSecret}
                    value={secretCode}
                    onChangeText={handleCodeChange}
                    onSubmitEditing={handleSecretCode}
                    returnKeyType="done"
                    editable={!!selectedRole}
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

                {selectedRole && (
                  <View style={s.prefixHint}>
                    <Text style={s.prefixHintLabel}>Prefix locked: </Text>
                    <Text style={s.prefixHintCode}>{ROLES.find(r=>r.key===selectedRole)?.prefix}</Text>
                    <Text style={s.prefixHintLabel}> — only digits &amp; uppercase letters</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSecretCode}
                  disabled={loading || !selectedRole}
                  activeOpacity={0.88}
                  style={[s.btnWrap, (loading || !selectedRole) && { opacity: 0.5 }]}
                >
                  <LinearGradient
                    colors={selectedRole ? (ROLES.find(r=>r.key===selectedRole)?.grad ?? ['#7C3AED','#6366F1']) : ['#374151','#1F2937']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.btn}
                  >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="shield" size={17} color="#fff" />}
                    <Text style={s.btnTxt}>{loading ? 'Verifying…' : 'Authenticate'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <View style={s.staffNote}>
                  <Feather name="info" size={12} color="#6366F1" />
                  <Text style={s.staffNoteTxt}>First-time login creates your account automatically.</Text>
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

const logo = StyleSheet.create({
  wrap: {
    width: 144, height: 144,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    marginBottom: 16,
  },
  outerRing: {
    position: 'absolute',
    width: 144, height: 144,
    borderRadius: 72,
    overflow: 'hidden',
  },
  seg1: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
    borderTopLeftRadius: 72, borderTopRightRadius: 72,
    borderWidth: 3, borderBottomWidth: 0,
    borderColor: '#2563EB',
  },
  seg2: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
    borderBottomLeftRadius: 72, borderBottomRightRadius: 72,
    borderWidth: 3, borderTopWidth: 0,
    borderColor: '#7C3AED',
  },
  seg3: {
    position: 'absolute', top: 0, left: 0, bottom: 0, width: '50%',
    borderTopLeftRadius: 72, borderBottomLeftRadius: 72,
    borderWidth: 3, borderRightWidth: 0,
    borderColor: '#10B981',
  },
  seg4: {
    position: 'absolute', top: 0, right: 0, bottom: 0, width: '50%',
    borderTopRightRadius: 72, borderBottomRightRadius: 72,
    borderWidth: 3, borderLeftWidth: 0,
    borderColor: '#06B6D4',
  },
  dot: {
    position: 'absolute',
    width: 8, height: 8, borderRadius: 4,
  },
  innerRing: {
    width: 118, height: 118, borderRadius: 59,
    justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderTopColor: 'rgba(99,102,241,0.6)',
    borderRightColor: 'rgba(6,182,212,0.6)',
    borderBottomColor: 'rgba(16,185,129,0.6)',
    borderLeftColor: 'rgba(245,158,11,0.6)',
  },
  face: {
    width: '100%', height: '100%',
    borderRadius: 59,
    justifyContent: 'center', alignItems: 'center',
    gap: 2,
  },
  faceAccent: {
    width: 56, height: 2, borderRadius: 1,
    backgroundColor: '#2563EB',
    marginBottom: 2,
  },
  dnpTxt: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 4,
    lineHeight: 30,
  },
  threeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  threeBar: {
    width: 14, height: 1.5, borderRadius: 1,
    backgroundColor: '#06B6D4',
  },
  threeTxt: {
    color: '#06B6D4',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 2,
  },
  bottomLine: {
    width: 40, height: 2, borderRadius: 1,
    backgroundColor: '#7C3AED',
    marginTop: 2,
  },
});

const s = StyleSheet.create({
  root: { flex: 1 },
  blob: { position: 'absolute', borderRadius: 999 },
  blob1: { width: 320, height: 320, backgroundColor: '#2563EB0D', top: -100, right: -100 },
  blob2: { width: 220, height: 220, backgroundColor: '#7C3AED0A', bottom: 80, left: -80 },
  blob3: { width: 160, height: 160, backgroundColor: '#06B6D408', top: '42%', right: -40 },

  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 50, paddingBottom: 28 },

  header: { alignItems: 'center', marginBottom: 24 },
  orgName: { color: '#94A3B8', fontSize: 13, fontFamily: 'Inter_400Regular' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveTxt: { color: '#475569', fontSize: 11, fontFamily: 'Inter_400Regular' },

  tabRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
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
    padding: 18,
    gap: 13,
    marginBottom: 14,
  },
  cardTitle: { color: '#F1F5F9', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  cardSub: { color: '#475569', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', marginTop: -5 },

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

  copiedBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(16,185,129,0.18)' },
  copiedTxt: { color: '#34D399', fontSize: 12, fontFamily: 'Inter_500Medium' },

  forgotRow: { alignSelf: 'flex-end' },
  forgotTxt: { color: '#60A5FA', fontSize: 13, fontFamily: 'Inter_500Medium' },

  btnWrap: { borderRadius: 14, overflow: 'hidden', marginTop: 2 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 16 },
  btnTxt: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Inter_700Bold' },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  roleCardWrap: { width: '47.5%', borderRadius: 14, overflow: 'hidden' },
  roleCardActive: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 6 },
  roleCardInactive: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  roleCardTxt: { color: '#475569', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textAlign: 'center' },
  roleCardTxtActive: { color: '#FFFFFF', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 0.5, textAlign: 'center' },

  prefixHint: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.07)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(99,102,241,0.14)' },
  prefixHintLabel: { color: '#64748B', fontSize: 11, fontFamily: 'Inter_400Regular' },
  prefixHintCode: { color: '#818CF8', fontSize: 11, fontFamily: 'Inter_700Bold' },

  staffNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(99,102,241,0.07)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(99,102,241,0.13)' },
  staffNoteTxt: { color: '#818CF8', fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },

  quickLinks: { gap: 10, marginBottom: 14 },
  qlBtn: { borderRadius: 14, overflow: 'hidden' },
  qlGrad: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  qlTxt: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  version: { textAlign: 'center', color: '#1E2A40', fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 4 },
});
