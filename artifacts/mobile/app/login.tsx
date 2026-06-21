import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { DNP360Logo } from '@/components/DNP360Logo';
import { useAuth } from '@/contexts/AuthContext';

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
    if (!id || !password) { Alert.alert('Missing fields', 'Please fill in all required fields.'); return; }
    setLoading(true);
    try {
      const success = await login(id, password, subTab);
      if (!success) Alert.alert('Login Failed', 'Invalid credentials.\n\nDemo:\ncitizen.dnp360@gmail.com / 12345678');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  async function handleSecretCode() {
    if (!secretCode.trim()) { Alert.alert('Missing code', 'Please enter your secret code.'); return; }
    setLoading(true);
    try {
      const success = await loginWithCode(secretCode.trim());
      if (!success) Alert.alert('Invalid Code', 'Secret code not recognised.\n\nDemo codes:\nSK2566F · OFF4416A · ADMIN5790X');
      else router.replace('/(tabs)');
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    if (Platform.OS !== 'web') {
      Alert.alert('Google Sign-In', 'Google Sign-In is available on the web version.\n\nOpen this app in a browser to use Google Sign-In.', [{ text: 'OK' }]);
      return;
    }
    setGoogleLoading(true);
    try {
      const success = await loginWithGoogle();
      if (success) router.replace('/(tabs)');
      else Alert.alert('Sign-In Failed', 'Google Sign-In failed. Make sure your Google account is authorised in Firebase Console.\n\nNote: Add your Replit domain to Firebase → Authentication → Authorized Domains.');
    } catch {
      Alert.alert('Error', 'Google Sign-In encountered an error. Please try again.');
    } finally { setGoogleLoading(false); }
  }

  return (
    <LinearGradient colors={['#031331', '#0D2350', '#031331']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.logoShield}>
              <DNP360Logo size="md" />
            </View>
            <Text style={styles.tagline}>Nagar Parishad Daudnagar</Text>
            <Text style={styles.subtitle}>Smart Governance · Digital India</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcome}>Welcome Back</Text>
            <Text style={styles.welcomeSub}>Sign in to access your DNP360 account</Text>

            <View style={styles.mainTabs}>
              <Pressable style={[styles.mainTab, mainTab === 'signin' && styles.mainTabActive]} onPress={() => setMainTab('signin')}>
                <Text style={[styles.mainTabText, mainTab === 'signin' && styles.mainTabTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable style={[styles.mainTab, mainTab === 'secret' && styles.mainTabActive]} onPress={() => setMainTab('secret')}>
                <Text style={[styles.mainTabText, mainTab === 'secret' && styles.mainTabTextActive]}>Secret Code</Text>
              </Pressable>
            </View>

            {mainTab === 'signin' ? (
              <>
                <View style={styles.roleHintBox}>
                  <Feather name="info" size={12} color="#8AB0D8" />
                  <Text style={styles.roleHintText}>
                    <Text style={{ color: '#60A0F0', fontFamily: 'Inter_600SemiBold' }}>Citizens & Admin</Text>
                    {' use email/mobile · '}
                    <Text style={{ color: '#93C5FD', fontFamily: 'Inter_600SemiBold' }}>Officials & Safai Karmis</Text>
                    {' use Secret Code tab'}
                  </Text>
                </View>

                <View style={styles.subTabs}>
                  {(['mobile', 'email'] as const).map((t) => (
                    <Pressable key={t} style={[styles.subTab, subTab === t && styles.subTabActive]} onPress={() => setSubTab(t)}>
                      <Feather name={t === 'mobile' ? 'smartphone' : 'mail'} size={13} color={subTab === t ? '#60A0F0' : '#8A9BB0'} />
                      <Text style={[styles.subTabText, subTab === t && styles.subTabTextActive]}>{t === 'mobile' ? 'Mobile No.' : 'Email'}</Text>
                    </Pressable>
                  ))}
                </View>

                {subTab === 'mobile' ? (
                  <View style={styles.inputWrap}>
                    <Feather name="smartphone" size={16} color="#8A9BB0" />
                    <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#8A9BB0" keyboardType="phone-pad" value={mobile} onChangeText={setMobile} />
                  </View>
                ) : (
                  <View style={styles.inputWrap}>
                    <Feather name="mail" size={16} color="#8A9BB0" />
                    <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#8A9BB0" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
                  </View>
                )}

                <View style={styles.inputWrap}>
                  <Feather name="lock" size={16} color="#8A9BB0" />
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="Password" placeholderTextColor="#8A9BB0" secureTextEntry={!showPassword} value={password} onChangeText={setPassword} />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color="#8A9BB0" />
                  </Pressable>
                </View>

                <Pressable onPress={() => router.push('/forgot-password')} style={styles.forgotRow}>
                  <Text style={styles.forgotText}>Forgot Password?</Text>
                </Pressable>

                <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleSignIn} disabled={loading || googleLoading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="log-in" size={16} color="#fff" />}
                  <Text style={styles.primaryBtnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[styles.googleBtn, googleLoading && { opacity: 0.7 }]}
                  onPress={handleGoogleSignIn}
                  disabled={loading || googleLoading}
                  activeOpacity={0.85}
                >
                  {googleLoading ? (
                    <ActivityIndicator color="#4285F4" size="small" />
                  ) : (
                    <View style={styles.googleIconWrap}>
                      <Text style={styles.googleG}>G</Text>
                    </View>
                  )}
                  <Text style={styles.googleBtnText}>
                    {googleLoading ? 'Signing in with Google…' : 'Continue with Google'}
                  </Text>
                  {Platform.OS === 'web' && (
                    <View style={styles.firebasePill}>
                      <Text style={styles.firebasePillText}>Firebase</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/signup')} activeOpacity={0.85}>
                  <Feather name="user-plus" size={15} color="#60A0F0" />
                  <Text style={styles.createBtnText}>Create Citizen Account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.secretInfoBox}>
                  <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.secretInfoIcon}>
                    <Feather name="shield" size={16} color="#fff" />
                  </LinearGradient>
                  <Text style={styles.secretInfoText}>
                    Your secret code is issued by the Nagar Parishad Admin. Each code is unique and tied to your role.
                  </Text>
                </View>
                <View style={styles.inputWrap}>
                  <Feather name="key" size={16} color="#8A9BB0" />
                  <TextInput style={styles.input} placeholder="Secret Code (e.g. SK2566F)" placeholderTextColor="#8A9BB0" autoCapitalize="characters" value={secretCode} onChangeText={setSecretCode} />
                </View>
                <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleSecretCode} disabled={loading} activeOpacity={0.85}>
                  {loading ? <ActivityIndicator color="#fff" size="small" /> : <Feather name="shield" size={16} color="#fff" />}
                  <Text style={styles.primaryBtnText}>{loading ? 'Verifying…' : 'Authenticate with Secret Code'}</Text>
                </TouchableOpacity>
                <View style={styles.codeRoles}>
                  {[
                    { role: 'Safai Karmi', prefix: 'SK', color: '#10B981' },
                    { role: 'Official', prefix: 'OFF', color: '#F59E0B' },
                    { role: 'Admin', prefix: 'ADMIN', color: '#6366F1' },
                  ].map(r => (
                    <View key={r.role} style={[styles.codeRoleChip, { borderColor: r.color + '40' }]}>
                      <View style={[styles.codeRoleDot, { backgroundColor: r.color }]} />
                      <Text style={[styles.codeRolePrefix, { color: r.color }]}>{r.prefix}…</Text>
                      <Text style={styles.codeRoleName}>{r.role}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.footer}>
            {[{ icon: 'shield', label: 'Firebase Auth' }, { icon: 'database', label: 'Firebase DB' }, { icon: 'zap', label: 'Real-time' }, { icon: 'award', label: 'Trusted' }].map((f) => (
              <View key={f.label} style={styles.footerItem}>
                <Feather name={f.icon as any} size={14} color="#5F8BC0" />
                <Text style={styles.footerText}>{f.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.version}>DNP360 v1.0 · Firebase · Bihar, India</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoShield: { width: 88, height: 88, borderRadius: 24, backgroundColor: 'rgba(0,90,182,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,90,182,0.4)' },
  tagline: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Inter_700Bold' },
  subtitle: { color: '#8AB0D8', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4 },
  card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', padding: 24, marginBottom: 24, gap: 14 },
  welcome: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  welcomeSub: { color: '#8AB0D8', fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  mainTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: 4 },
  mainTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  mainTabActive: { backgroundColor: '#1264E8' },
  mainTabText: { color: '#8AB0D8', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  mainTabTextActive: { color: '#FFFFFF' },
  roleHintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: 'rgba(96,160,240,0.2)' },
  roleHintText: { flex: 1, color: '#8AB0D8', fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  subTabs: { flexDirection: 'row', gap: 8 },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  subTabActive: { borderColor: '#60A0F0', backgroundColor: 'rgba(18,100,232,0.2)' },
  subTabText: { color: '#8A9BB0', fontSize: 12, fontFamily: 'Inter_500Medium' },
  subTabTextActive: { color: '#60A0F0' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14 },
  input: { flex: 1, color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  forgotRow: { alignItems: 'flex-end' },
  forgotText: { color: '#5F8BC0', fontSize: 13, fontFamily: 'Inter_500Medium' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1264E8', borderRadius: 14, paddingVertical: 15 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { color: '#5F8BC0', fontSize: 11, fontFamily: 'Inter_400Regular' },
  googleBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20, justifyContent: 'center' },
  googleIconWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(66,133,244,0.1)', justifyContent: 'center', alignItems: 'center' },
  googleG: { fontSize: 15, fontFamily: 'Inter_700Bold', color: '#4285F4' },
  googleBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: '#1F2937', flex: 1, textAlign: 'center' },
  firebasePill: { backgroundColor: '#FFF3E0', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  firebasePillText: { color: '#E65100', fontSize: 9, fontFamily: 'Inter_700Bold' },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(96,160,240,0.1)', borderRadius: 14, paddingVertical: 13, borderWidth: 1, borderColor: 'rgba(96,160,240,0.3)' },
  createBtnText: { color: '#60A0F0', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  secretInfoBox: { flexDirection: 'row', gap: 12, backgroundColor: 'rgba(99,102,241,0.12)', borderRadius: 14, padding: 14, alignItems: 'flex-start', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  secretInfoIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  secretInfoText: { flex: 1, color: '#A5B4FC', fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  codeRoles: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  codeRoleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.04)' },
  codeRoleDot: { width: 6, height: 6, borderRadius: 3 },
  codeRolePrefix: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  codeRoleName: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'Inter_400Regular' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 12 },
  footerItem: { alignItems: 'center', gap: 4 },
  footerText: { color: '#5F8BC0', fontSize: 10, fontFamily: 'Inter_400Regular' },
  version: { textAlign: 'center', color: '#3D5E82', fontSize: 10, fontFamily: 'Inter_400Regular' },
});
