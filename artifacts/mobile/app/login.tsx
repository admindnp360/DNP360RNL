import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { DNP360Logo } from '@/components/DNP360Logo';
import { useAuth } from '@/contexts/AuthContext';

const IS_WEB = Platform.OS === 'web';

export default function LoginScreen() {
  const { login, loginWithCode, loginWithGoogle } = useAuth();
  const [mainTab, setMainTab] = useState<'signin' | 'secret'>('signin');
  const [subTab, setSubTab] = useState<'mobile' | 'email'>('email');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSignIn() {
    const id = subTab === 'mobile' ? mobile.trim() : email.trim();
    if (!id || !password) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(id, password, subTab);
      if (!ok) Alert.alert('Login Failed', 'Invalid credentials.\n\nDemo:\ncitizen.dnp360@gmail.com / 12345678');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  async function handleSecretCode() {
    if (!secretCode.trim()) {
      Alert.alert('Missing Code', 'Please enter your secret code.');
      return;
    }
    setLoading(true);
    try {
      const ok = await loginWithCode(secretCode.trim());
      if (!ok) Alert.alert('Invalid Code', 'Secret code not recognised.\n\nDemo codes:\nSK2566F · OFF4416A · ADMIN5790X');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    try {
      const ok = await loginWithGoogle();
      if (ok) router.replace('/(tabs)');
      else Alert.alert('Sign-In Failed', 'Google Sign-In failed. Make sure your Google account is authorised in Firebase Console.');
    } catch {
      Alert.alert('Error', 'Google Sign-In encountered an error. Please try again.');
    } finally { setGoogleLoading(false); }
  }

  return (
    <LinearGradient colors={['#020E22', '#071A3E', '#020E22']} locations={[0, 0.5, 1]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* ── Header / Logo ── */}
          <View style={styles.header}>
            <View style={styles.logoRing}>
              <View style={styles.logoRingInner}>
                <View style={styles.logoShield}>
                  <DNP360Logo size="md" />
                </View>
              </View>
            </View>
            <Text style={styles.orgName}>Nagar Parishad Daudnagar</Text>
            <Text style={styles.orgSub}>Smart Governance · Digital India</Text>

            <View style={styles.badgeRow}>
              {['Bihar', 'Est. 1956', 'Certified'].map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* ── Card ── */}
          <View style={styles.cardShadow}>
            <LinearGradient
              colors={['rgba(30,123,240,0.18)', 'rgba(255,255,255,0.04)']}
              locations={[0, 0.3]}
              style={styles.cardGlow}
            >
              <View style={styles.card}>
                <Text style={styles.welcome}>Welcome Back</Text>
                <Text style={styles.welcomeSub}>Sign in to your DNP360 account</Text>

                {/* Main tab switcher */}
                <View style={styles.mainTabs}>
                  {(['signin', 'secret'] as const).map((t) => (
                    <Pressable
                      key={t}
                      style={[styles.mainTab, mainTab === t && styles.mainTabActive]}
                      onPress={() => setMainTab(t)}
                    >
                      {mainTab === t && (
                        <LinearGradient
                          colors={['#1E6FE8', '#1253C0']}
                          style={StyleSheet.absoluteFill}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        />
                      )}
                      <Feather
                        name={t === 'signin' ? 'log-in' : 'shield'}
                        size={13}
                        color={mainTab === t ? '#fff' : '#6A8BAD'}
                      />
                      <Text style={[styles.mainTabText, mainTab === t && styles.mainTabTextActive]}>
                        {t === 'signin' ? 'Sign In' : 'Secret Code'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {mainTab === 'signin' ? (
                  <>
                    {/* Sub-tabs: Mobile / Email */}
                    <View style={styles.subTabs}>
                      {(['mobile', 'email'] as const).map((t) => (
                        <Pressable
                          key={t}
                          style={[styles.subTab, subTab === t && styles.subTabActive]}
                          onPress={() => setSubTab(t)}
                        >
                          <Feather
                            name={t === 'mobile' ? 'smartphone' : 'mail'}
                            size={13}
                            color={subTab === t ? '#60A5FA' : '#5F7A96'}
                          />
                          <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>
                            {t === 'mobile' ? 'Mobile No.' : 'Email'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {subTab === 'mobile' ? (
                      <View style={styles.inputWrap}>
                        <View style={styles.inputIcon}><Feather name="smartphone" size={16} color="#4A7FB5" /></View>
                        <TextInput
                          style={styles.input}
                          placeholder="Mobile Number"
                          placeholderTextColor="#3D5E82"
                          keyboardType="phone-pad"
                          value={mobile}
                          onChangeText={setMobile}
                        />
                      </View>
                    ) : (
                      <View style={styles.inputWrap}>
                        <View style={styles.inputIcon}><Feather name="mail" size={16} color="#4A7FB5" /></View>
                        <TextInput
                          style={styles.input}
                          placeholder="Email Address"
                          placeholderTextColor="#3D5E82"
                          keyboardType="email-address"
                          autoCapitalize="none"
                          value={email}
                          onChangeText={setEmail}
                        />
                      </View>
                    )}

                    <View style={styles.inputWrap}>
                      <View style={styles.inputIcon}><Feather name="lock" size={16} color="#4A7FB5" /></View>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        placeholder="Password"
                        placeholderTextColor="#3D5E82"
                        secureTextEntry={!showPassword}
                        value={password}
                        onChangeText={setPassword}
                      />
                      <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                        <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#4A7FB5" />
                      </Pressable>
                    </View>

                    <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotRow}>
                      <Text style={styles.forgotText}>Forgot Password?</Text>
                    </Pressable>

                    {/* Primary Sign In */}
                    <TouchableOpacity
                      onPress={handleSignIn}
                      disabled={loading || googleLoading}
                      activeOpacity={0.88}
                      style={styles.primaryBtnWrap}
                    >
                      <LinearGradient
                        colors={loading ? ['#0D3A7A', '#0D3A7A'] : ['#1E7BF0', '#0F52C4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.primaryBtn}
                      >
                        {loading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Feather name="log-in" size={16} color="#fff" />}
                        <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Google Sign-In — web only */}
                    {IS_WEB && (
                      <>
                        <View style={styles.dividerRow}>
                          <View style={styles.dividerLine} />
                          <Text style={styles.dividerText}>or continue with</Text>
                          <View style={styles.dividerLine} />
                        </View>
                        <TouchableOpacity
                          style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
                          onPress={handleGoogleSignIn}
                          disabled={loading || googleLoading}
                          activeOpacity={0.88}
                        >
                          {googleLoading
                            ? <ActivityIndicator color="#4285F4" size="small" />
                            : (
                              <View style={styles.googleIconWrap}>
                                <Text style={styles.googleG}>G</Text>
                              </View>
                            )}
                          <Text style={styles.googleBtnText}>
                            {googleLoading ? 'Signing in…' : 'Continue with Google'}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
                      <Feather name="user-plus" size={15} color="#60A5FA" />
                      <Text style={styles.createBtnText}>Create Citizen Account</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Secret Code panel */}
                    <LinearGradient
                      colors={['rgba(99,102,241,0.18)', 'rgba(139,92,246,0.08)']}
                      style={styles.secretInfoBox}
                    >
                      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.secretInfoIcon}>
                        <Feather name="shield" size={16} color="#fff" />
                      </LinearGradient>
                      <Text style={styles.secretInfoText}>
                        Your secret code is issued by the Nagar Parishad Admin. Each code is unique and tied to your role.
                      </Text>
                    </LinearGradient>

                    <View style={styles.inputWrap}>
                      <View style={styles.inputIcon}><Feather name="key" size={16} color="#4A7FB5" /></View>
                      <TextInput
                        style={styles.input}
                        placeholder="Secret Code (e.g. SK2566F)"
                        placeholderTextColor="#3D5E82"
                        autoCapitalize="characters"
                        value={secretCode}
                        onChangeText={setSecretCode}
                      />
                    </View>

                    <TouchableOpacity
                      onPress={handleSecretCode}
                      disabled={loading}
                      activeOpacity={0.88}
                      style={styles.primaryBtnWrap}
                    >
                      <LinearGradient
                        colors={loading ? ['#3D2D6E', '#3D2D6E'] : ['#6366F1', '#4F46E5']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.primaryBtn}
                      >
                        {loading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Feather name="shield" size={16} color="#fff" />}
                        <Text style={styles.primaryBtnText}>
                          {loading ? 'Verifying…' : 'Authenticate with Code'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.codeRoles}>
                      {[
                        { role: 'Safai Karmi', prefix: 'SK', color: '#10B981' },
                        { role: 'Official',    prefix: 'OFF', color: '#F59E0B' },
                        { role: 'Admin',       prefix: 'ADMIN', color: '#818CF8' },
                      ].map(r => (
                        <View key={r.role} style={[styles.codeRoleChip, { borderColor: r.color + '50' }]}>
                          <View style={[styles.codeRoleDot, { backgroundColor: r.color }]} />
                          <Text style={[styles.codeRolePrefix, { color: r.color }]}>{r.prefix}…</Text>
                          <Text style={styles.codeRoleName}>{r.role}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </LinearGradient>
          </View>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerVer}>DNP360 v1.0 · Bihar, India</Text>
            <View style={styles.footerDots}>
              {['#1E7BF0', '#6366F1', '#10B981'].map((c, i) => (
                <View key={i} style={[styles.footerDot, { backgroundColor: c }]} />
              ))}
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 56, paddingBottom: 32 },

  /* Header */
  header: { alignItems: 'center', marginBottom: 30 },
  logoRing: {
    width: 108, height: 108, borderRadius: 54,
    borderWidth: 1.5, borderColor: 'rgba(30,123,240,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E7BF0', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20,
    elevation: 12,
  },
  logoRingInner: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.2)',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(30,123,240,0.08)',
  },
  logoShield: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(14,42,105,0.9)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.3)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    elevation: 8,
  },
  orgName: { color: '#FFFFFF', fontSize: 19, fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  orgSub: { color: '#6A8BAD', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: 'rgba(30,123,240,0.12)',
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.25)',
  },
  badgeText: { color: '#6AA0D8', fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  /* Card */
  cardShadow: {
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 16,
    borderRadius: 24, marginBottom: 24,
  },
  cardGlow: {
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.25)',
    padding: 1.5,
  },
  card: {
    backgroundColor: 'rgba(5,20,50,0.92)',
    borderRadius: 23,
    padding: 22,
    gap: 14,
  },
  welcome: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  welcomeSub: { color: '#5F82A8', fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  /* Main tabs */
  mainTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, padding: 4, gap: 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  mainTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 11,
    overflow: 'hidden',
  },
  mainTabActive: {},
  mainTabText: { color: '#6A8BAD', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  mainTabTextActive: { color: '#FFFFFF' },

  /* Sub tabs */
  subTabs: { flexDirection: 'row', gap: 8 },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 5,
    paddingVertical: 9, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  subTabActive: {
    backgroundColor: 'rgba(30,123,240,0.15)',
    borderColor: 'rgba(96,165,250,0.4)',
  },
  subTabText: { color: '#5F7A96', fontSize: 12, fontFamily: 'Inter_500Medium' },
  subTabTextActive: { color: '#60A5FA' },

  /* Inputs */
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 13, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
  },
  inputIcon: {
    width: 44, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
    borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)',
  },
  input: {
    flex: 1, color: '#FFFFFF', fontSize: 14,
    fontFamily: 'Inter_400Regular',
    paddingHorizontal: 12, paddingVertical: 14,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { color: '#4A7FB5', fontSize: 12, fontFamily: 'Inter_500Medium' },

  /* Primary button */
  primaryBtnWrap: {
    borderRadius: 14,
    shadowColor: '#1264E8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 15,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_700Bold' },

  /* Divider */
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { color: '#3D5E82', fontSize: 11, fontFamily: 'Inter_400Regular' },

  /* Google (web only) */
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 13,
    paddingVertical: 13, paddingHorizontal: 20,
    justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  googleIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(66,133,244,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  googleG: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#4285F4' },
  googleBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1F2937', flex: 1, textAlign: 'center' },

  /* Create account */
  createBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 13, paddingVertical: 13,
    backgroundColor: 'rgba(30,123,240,0.08)',
    borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)',
  },
  createBtnText: { color: '#60A5FA', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  /* Secret tab */
  secretInfoBox: {
    flexDirection: 'row', gap: 12, borderRadius: 14,
    padding: 14, alignItems: 'flex-start',
    borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)',
  },
  secretInfoIcon: {
    width: 34, height: 34, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  secretInfoText: { flex: 1, color: '#A5B4FC', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  codeRoles: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  codeRoleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 99, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  codeRoleDot: { width: 6, height: 6, borderRadius: 3 },
  codeRolePrefix: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  codeRoleName: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontFamily: 'Inter_400Regular' },

  /* Footer */
  footer: { alignItems: 'center', gap: 8 },
  footerVer: { color: '#2A4060', fontSize: 10, fontFamily: 'Inter_400Regular' },
  footerDots: { flexDirection: 'row', gap: 5 },
  footerDot: { width: 5, height: 5, borderRadius: 3, opacity: 0.6 },
});
