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

export default function SignUpScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdName, setCreatedName] = useState('');

  async function handleSignUp() {
    if (!name.trim() || !email.trim() || !mobile.trim() || !password) {
      Alert.alert('Missing Fields', 'Please fill in Name, Email, Mobile, and Password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (!/^\d{10}$/.test(mobile.trim())) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const result = await register(name.trim(), email.trim(), mobile.trim(), password, address.trim() || undefined);
      if (!result.success) {
        Alert.alert('Registration Failed', result.error ?? 'Unable to create account. Please try again.');
      } else {
        setCreatedName(name.trim());
        setSuccess(true);
        setTimeout(() => router.replace('/(tabs)'), 3000);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Success overlay ── */
  if (success) {
    return (
      <LinearGradient colors={['#010D1F', '#052A1A', '#010D1F']} style={styles.gradient}>
        <View style={styles.successScreen}>
          <LinearGradient colors={['#10B981','#059669']} style={styles.successIconWrap}>
            <Feather name="check" size={44} color="#fff" />
          </LinearGradient>
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successName}>{createdName}</Text>
          <Text style={styles.successMsg}>Your citizen account has been created successfully.{'\n'}Redirecting to dashboard…</Text>
          <View style={styles.successDotsRow}>
            {[0,1,2].map(i => (
              <View key={i} style={[styles.successDot, i === 1 && { backgroundColor: '#10B981' }]} />
            ))}
          </View>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')} activeOpacity={0.85}>
            <LinearGradient colors={['#10B981','#059669']} style={styles.successBtn}>
              <Feather name="arrow-right" size={16} color="#fff" />
              <Text style={styles.successBtnTxt}>Go to Dashboard</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#010D1F', '#06193A', '#010D1F']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          horizontal={false}
          bounces={false}
        >
          {/* ── Top bar ── */}
          <Pressable style={styles.backRow} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color="#4A7FB5" />
            <Text style={styles.backTxt}>Back to Sign In</Text>
          </Pressable>

          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <DNP360Logo size="sm" />
            </View>
            <Text style={styles.headerTitle}>Create Citizen Account</Text>
            <Text style={styles.headerSub}>Register to access DNP360 services</Text>
          </View>

          {/* ── Form card ── */}
          <View style={styles.cardShadow}>
            <LinearGradient
              colors={['rgba(30,123,240,0.22)','rgba(30,123,240,0.04)','transparent']}
              locations={[0,0.25,1]}
              style={styles.cardGlow}
            >
              <View style={styles.card}>

                <Field label="Full Name *" icon="user" placeholder="Your full name"
                  value={name} onChangeText={setName} autoCapitalize="words" />
                <Field label="Email Address *" icon="mail" placeholder="your@email.com"
                  value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
                <Field label="Mobile Number *" icon="smartphone" placeholder="10-digit mobile number"
                  value={mobile} onChangeText={setMobile} keyboardType="phone-pad" maxLength={10} />
                <Field label="Address (optional)" icon="map-pin" placeholder="Ward / Area, Daudnagar"
                  value={address} onChangeText={setAddress} />

                {/* Password */}
                <View style={styles.labeledField}>
                  <Text style={styles.fieldLabel}>Password *</Text>
                  <View style={styles.inputRow}>
                    <Feather name="lock" size={15} color="#3A6090" />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Min. 6 characters"
                      placeholderTextColor="#243C58"
                      secureTextEntry={!showPw}
                      value={password}
                      onChangeText={setPassword}
                    />
                    <Pressable onPress={() => setShowPw(p => !p)} hitSlop={8}>
                      <Feather name={showPw ? 'eye-off' : 'eye'} size={15} color="#3A6090" />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm password */}
                <View style={styles.labeledField}>
                  <Text style={styles.fieldLabel}>Confirm Password *</Text>
                  <View style={[styles.inputRow,
                    confirmPassword && confirmPassword !== password && { borderColor: '#F87171' }]}>
                    <Feather name="lock" size={15}
                      color={confirmPassword && confirmPassword !== password ? '#F87171' : '#3A6090'} />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Re-enter password"
                      placeholderTextColor="#243C58"
                      secureTextEntry={!showCPw}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                    />
                    <Pressable onPress={() => setShowCPw(p => !p)} hitSlop={8}>
                      <Feather name={showCPw ? 'eye-off' : 'eye'} size={15} color="#3A6090" />
                    </Pressable>
                  </View>
                  {confirmPassword && confirmPassword !== password && (
                    <Text style={styles.errorTxt}>Passwords do not match</Text>
                  )}
                </View>

                {/* Submit */}
                <TouchableOpacity onPress={handleSignUp} disabled={loading}
                  activeOpacity={0.87} style={[styles.btnWrap, loading && { opacity: 0.65 }]}>
                  <LinearGradient colors={['#1E7BF0','#0F4FBF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                    {loading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Feather name="user-check" size={15} color="#fff" />}
                    <Text style={styles.btnTxt}>{loading ? 'Creating Account…' : 'Create Account'}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Note */}
                <View style={styles.noteBox}>
                  <Feather name="info" size={12} color="#3A6090" />
                  <Text style={styles.noteTxt}>
                    Only Citizens can self-register. Safai Karmis and Officials receive secret codes from Admin.
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <Text style={styles.version}>DNP360 v1.0 · Bihar, India</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/* ── Reusable field ── */
function Field({ label, icon, placeholder, value, onChangeText, keyboardType, autoCapitalize, maxLength }: {
  label: string; icon: any; placeholder: string; value: string;
  onChangeText: (t: string) => void; keyboardType?: any; autoCapitalize?: any; maxLength?: number;
}) {
  return (
    <View style={styles.labeledField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <Feather name={icon} size={15} color="#3A6090" />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#243C58"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 32, width: '100%' },

  /* Success */
  successScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 18, padding: 32 },
  successIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20, elevation: 16,
  },
  successTitle: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  successName: { color: '#34D399', fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  successMsg: { color: '#6A9BBC', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22 },
  successDotsRow: { flexDirection: 'row', gap: 8 },
  successDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  successBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28,
  },
  successBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  /* Back */
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 22 },
  backTxt: { color: '#4A7FB5', fontSize: 13, fontFamily: 'Inter_500Medium' },

  /* Header */
  header: { alignItems: 'center', gap: 8, marginBottom: 22 },
  logoWrap: {
    width: 68, height: 68, borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.3)',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontFamily: 'Inter_700Bold' },
  headerSub: { color: '#3A5E82', fontSize: 12, fontFamily: 'Inter_400Regular' },

  /* Card */
  cardShadow: {
    borderRadius: 22, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 20, elevation: 16,
  },
  cardGlow: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(30,123,240,0.26)', padding: 1.5 },
  card: { backgroundColor: 'rgba(4,16,42,0.96)', borderRadius: 21, padding: 20, gap: 12 },

  /* Fields */
  labeledField: { gap: 6 },
  fieldLabel: { color: '#3A6090', fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 13, paddingVertical: 12,
  },
  input: { flex: 1, color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_400Regular' },
  errorTxt: { color: '#F87171', fontSize: 10, fontFamily: 'Inter_400Regular' },

  /* Button */
  btnWrap: {
    borderRadius: 13, marginTop: 4,
    shadowColor: '#1264E8', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 7,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, borderRadius: 13, paddingVertical: 14,
  },
  btnTxt: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },

  /* Note */
  noteBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: 'rgba(30,123,240,0.07)',
    borderRadius: 11, padding: 12,
    borderWidth: 1, borderColor: 'rgba(30,123,240,0.18)',
    alignItems: 'flex-start',
  },
  noteTxt: { flex: 1, color: '#3A6090', fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 16 },

  version: { textAlign: 'center', color: '#1C3050', fontSize: 9, fontFamily: 'Inter_400Regular' },
});
