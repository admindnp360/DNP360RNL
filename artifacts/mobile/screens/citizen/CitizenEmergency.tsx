import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

const EMERGENCY_CONTACTS = [
  {
    name: 'Police Control Room',
    number: '100',
    icon: 'shield',
    grad: ['#1E3A8A', '#2563EB'] as const,
    accent: '#93C5FD',
    desc: 'Law & Order Emergency',
    tag: 'POLICE',
  },
  {
    name: 'Ambulance / Medical',
    number: '108',
    icon: 'activity',
    grad: ['#7F1D1D', '#DC2626'] as const,
    accent: '#FCA5A5',
    desc: 'Medical Emergency',
    tag: 'MEDICAL',
  },
  {
    name: 'Fire Brigade',
    number: '101',
    icon: 'wind',
    grad: ['#78350F', '#D97706'] as const,
    accent: '#FDE68A',
    desc: 'Fire Emergency',
    tag: 'FIRE',
  },
  {
    name: 'Disaster Management',
    number: '1070',
    icon: 'alert-triangle',
    grad: ['#3B0764', '#7C3AED'] as const,
    accent: '#C4B5FD',
    desc: 'Natural Disaster Relief',
    tag: 'DISASTER',
  },
  {
    name: 'DNP Municipal Office',
    number: '06184200000',
    icon: 'home',
    grad: ['#0C4A6E', '#0EA5E9'] as const,
    accent: '#BAE6FD',
    desc: 'Nagar Parishad Helpline',
    tag: 'MUNICIPAL',
  },
  {
    name: 'Women Helpline',
    number: '1091',
    icon: 'heart',
    grad: ['#831843', '#EC4899'] as const,
    accent: '#FBCFE8',
    desc: 'Safety & Security',
    tag: 'HELPLINE',
  },
];

const SERVICES = [
  { label: 'Birth Certificate',  icon: 'file-plus',  grad: ['#0EA5E9','#2563EB'] as const },
  { label: 'Death Certificate',  icon: 'file-minus', grad: ['#F59E0B','#EF4444'] as const },
  { label: 'Property Tax',       icon: 'credit-card',grad: ['#10B981','#059669'] as const },
  { label: 'Water Bill',         icon: 'droplet',    grad: ['#0EA5E9','#0284C7'] as const },
  { label: 'Trade License',      icon: 'briefcase',  grad: ['#8B5CF6','#6D28D9'] as const },
  { label: 'Building Plan',      icon: 'map',        grad: ['#10B981','#047857'] as const },
];

function openDialer(number: string) {
  Linking.openURL(`tel:${number}`);
}

export default function CitizenEmergency() {
  const colors = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0A' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── HERO ── */}
        <LinearGradient colors={['#1A0000', '#4A0000', '#7F1D1D']} style={styles.hero}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <View style={styles.heroPulseDot} />
              <Text style={styles.heroLabel}>EMERGENCY</Text>
            </View>
            <LinearGradient colors={['rgba(255,255,255,0.15)','rgba(255,255,255,0.05)']} style={styles.heroShield}>
              <Feather name="phone-call" size={24} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Emergency Contacts</Text>
          <Text style={styles.heroSub}>Tap any card to open dialer — then press Call</Text>
          <View style={styles.heroBadges}>
            <View style={styles.heroBadge}>
              <View style={[styles.heroBadgeDot, { backgroundColor: '#4ADE80' }]} />
              <Text style={styles.heroBadgeText}>All lines 24/7</Text>
            </View>
            <View style={styles.heroBadge}>
              <View style={[styles.heroBadgeDot, { backgroundColor: '#60A5FA' }]} />
              <Text style={styles.heroBadgeText}>Free to call</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* ── EMERGENCY CONTACT CARDS ── */}
          <Text style={[styles.sectionLabel, { color: '#fff' }]}>Emergency Numbers</Text>

          {EMERGENCY_CONTACTS.map(e => (
            <Pressable
              key={e.name}
              onPress={() => openDialer(e.number)}
              style={({ pressed }) => [styles.contactCardWrap, { opacity: pressed ? 0.88 : 1 }]}
            >
              <LinearGradient colors={e.grad} style={styles.contactCard}>
                {/* Left section */}
                <View style={styles.contactLeft}>
                  <View style={styles.contactTagRow}>
                    <View style={[styles.contactTag, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                      <Text style={styles.contactTagText}>{e.tag}</Text>
                    </View>
                  </View>
                  <Text style={[styles.contactNumber, { color: e.accent }]}>{e.number}</Text>
                  <Text style={styles.contactName}>{e.name}</Text>
                  <Text style={[styles.contactDesc, { color: 'rgba(255,255,255,0.6)' }]}>{e.desc}</Text>
                </View>

                {/* Right: dial button */}
                <View style={styles.contactRight}>
                  <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.08)']} style={styles.dialIconWrap}>
                    <Feather name={e.icon as any} size={20} color="#fff" />
                  </LinearGradient>
                  <View style={[styles.dialBtn, { borderColor: 'rgba(255,255,255,0.3)' }]}>
                    <Feather name="phone" size={16} color="#fff" />
                    <Text style={styles.dialBtnText}>Dial</Text>
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          ))}

          {/* ── MUNICIPAL SERVICES ── */}
          <Text style={[styles.sectionLabel, { color: '#fff', marginTop: 8 }]}>Municipal Services</Text>
          <View style={[styles.servicesPanel, { backgroundColor: '#111827', borderColor: '#1F2937' }]}>
            {SERVICES.map((s, i) => (
              <Pressable
                key={s.label}
                style={({ pressed }) => [
                  styles.serviceRow,
                  i < SERVICES.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#1F2937' },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <LinearGradient colors={s.grad} style={styles.serviceIcon}>
                  <Feather name={s.icon as any} size={14} color="#fff" />
                </LinearGradient>
                <Text style={styles.serviceLabel}>{s.label}</Text>
                <Feather name="chevron-right" size={15} color="#6B7280" />
              </Pressable>
            ))}
          </View>

          {/* ── INFO BANNER ── */}
          <LinearGradient colors={['#071E56', '#0A2E8A']} style={styles.infoBanner}>
            <LinearGradient colors={['rgba(255,255,255,0.15)','rgba(255,255,255,0.05)']} style={styles.infoIconWrap}>
              <Feather name="info" size={16} color="#93C5FD" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Municipal Office Hours</Text>
              <Text style={styles.infoText}>Mon–Sat, 10 AM – 5 PM</Text>
              <Text style={styles.infoText}>Nagar Parishad Daudnagar, Bihar</Text>
            </View>
          </LinearGradient>

          {/* ── DISCLAIMER ── */}
          <View style={[styles.disclaimer, { backgroundColor: '#111827', borderColor: '#374151' }]}>
            <Feather name="alert-circle" size={13} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              Tapping a contact opens your phone's dialer with the number pre-filled. Press the call button in your dialer to connect.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 24, gap: 10 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  heroTextWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroPulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444' },
  heroLabel: { color: '#FCA5A5', fontSize: 12, fontFamily: 'Inter_700Bold', letterSpacing: 2 },
  heroShield: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: 'Inter_400Regular' },
  heroBadges: { flexDirection: 'row', gap: 12, marginTop: 4 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBadgeDot: { width: 7, height: 7, borderRadius: 3.5 },
  heroBadgeText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular' },

  body: { padding: 14, gap: 12 },
  sectionLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },

  contactCardWrap: { borderRadius: 18, overflow: 'hidden' },
  contactCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, gap: 12, borderRadius: 18 },
  contactLeft: { flex: 1, gap: 4 },
  contactTagRow: { flexDirection: 'row', marginBottom: 4 },
  contactTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  contactTagText: { color: 'rgba(255,255,255,0.85)', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  contactNumber: { fontSize: 32, fontFamily: 'Inter_700Bold' },
  contactName: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  contactDesc: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  contactRight: { alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  dialIconWrap: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dialBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
  dialBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },

  servicesPanel: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  serviceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  serviceLabel: { flex: 1, color: '#E5E7EB', fontSize: 14, fontFamily: 'Inter_500Medium' },

  infoBanner: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  infoIconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  infoTitle: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 2 },
  infoText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular' },

  disclaimer: { borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12 },
  disclaimerText: { color: '#6B7280', fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 17 },
});
