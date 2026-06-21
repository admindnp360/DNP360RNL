import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function AdminHome() {
  const { user } = useAuth();
  const { complaints, houses, wards, users, notices, secretKeys, passwordResetRequests } = useAppData();
  const colors = useColors();

  const citizens = users.filter(u => u.role === 'citizen');
  const workers = users.filter(u => u.role === 'safaikarmi');
  const officials = users.filter(u => u.role === 'official');
  const pending = complaints.filter(c => c.status === 'submitted').length;
  const resolved = complaints.filter(c => c.status === 'resolved').length;
  const resolutionRate = complaints.length > 0 ? Math.round((resolved / complaints.length) * 100) : 0;
  const pendingResets = passwordResetRequests.filter(r => r.status === 'pending').length;

  const SYSTEM_STATS = [
    { label: 'Citizens', value: citizens.length, icon: 'users', color: colors.citizen, bg: colors.citizenBg, tab: '/(tabs)/action' },
    { label: 'Workers', value: workers.length, icon: 'user-check', color: colors.safaikarmi, bg: colors.safaikarmiBg, tab: '/(tabs)/action' },
    { label: 'Officials', value: officials.length, icon: 'briefcase', color: colors.official, bg: colors.officialBg, tab: '/(tabs)/action' },
    { label: 'Secret Keys', value: secretKeys.length, icon: 'key', color: colors.adminColor, bg: colors.adminBg, tab: '/(tabs)/secondary' },
    { label: 'Houses', value: houses.filter(h => h.isActive).length, icon: 'home', color: colors.citizen, bg: colors.citizenBg, tab: '/(tabs)/tertiary' },
    { label: 'Wards', value: wards.length, icon: 'map', color: colors.safaikarmi, bg: colors.safaikarmiBg, tab: '/(tabs)/tertiary' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#00245A', '#003884']} style={styles.header}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.role}>System Administrator</Text>
              <Text style={styles.name}>{user?.name ?? 'Admin'}</Text>
              <Text style={styles.emp}>{user?.employeeId ?? ''}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(user?.name ?? 'A')[0]}</Text>
            </View>
          </View>
          <View style={styles.systemBadge}>
            <Feather name="shield" size={11} color="#ABC7FF" />
            <Text style={styles.systemBadgeText}>DNP360 Admin · Full Access</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {pendingResets > 0 && (
            <TouchableOpacity style={[styles.alertBanner, { backgroundColor: '#FFF3E0', borderColor: colors.official + '50' }]} activeOpacity={0.85} onPress={() => router.push('/(tabs)/action')}>
              <Feather name="alert-circle" size={16} color={colors.official} />
              <Text style={[styles.alertText, { color: colors.official }]}>
                {pendingResets} password reset request{pendingResets > 1 ? 's' : ''} pending
              </Text>
              <Feather name="chevron-right" size={14} color={colors.official} />
            </TouchableOpacity>
          )}

          <View style={[styles.metricsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: 'Complaints', value: complaints.length, color: colors.official },
              { label: 'Pending', value: pending, color: colors.submitted },
              { label: 'Resolved', value: resolved, color: colors.resolved },
              { label: 'Rate', value: `${resolutionRate}%`, color: colors.citizen },
            ].map((m, i, arr) => (
              <View key={m.label} style={[styles.metric, i < arr.length - 1 && { borderRightColor: colors.border, borderRightWidth: 1 }]}>
                <Text style={[styles.metricVal, { color: m.color }]}>{m.value}</Text>
                <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>System Overview</Text>
          <View style={styles.grid}>
            {SYSTEM_STATS.map(s => (
              <TouchableOpacity
                key={s.label}
                style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(s.tab as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
                  <Feather name={s.icon as any} size={18} color={s.color} />
                </View>
                <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                <Feather name="chevron-right" size={10} color={colors.mutedForeground} style={{ marginTop: 2 }} />
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Content Summary</Text>
            {[
              { label: 'Active Notices', value: notices.filter(n => n.isActive).length, icon: 'volume-2', color: colors.accent, tab: '/(tabs)/tertiary' },
              { label: 'Active Secret Keys', value: secretKeys.filter(k => k.isActive).length, icon: 'key', color: colors.citizen, tab: '/(tabs)/secondary' },
              { label: 'Registered Houses', value: houses.filter(h => h.isActive).length, icon: 'home', color: colors.safaikarmi, tab: '/(tabs)/tertiary' },
              { label: 'Total Users', value: users.length, icon: 'users', color: colors.official, tab: '/(tabs)/action' },
            ].map((item, i, arr) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.contentRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                onPress={() => router.push(item.tab as any)}
                activeOpacity={0.7}
              >
                <Feather name={item.icon as any} size={15} color={item.color} />
                <Text style={[styles.contentLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.contentValue, { color: item.color }]}>{item.value}</Text>
                <Feather name="chevron-right" size={12} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.announceBannerWrap} activeOpacity={0.85} onPress={() => Linking.openURL('tel:0618400000')}>
            <LinearGradient colors={['#0A1F5A', '#1A3FA8']} style={styles.announceBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.bannerIconWrap}>
                <Feather name="phone" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Nagar Parishad Daudnagar</Text>
                <Text style={styles.bannerSub}>Municipal Office: 06184-XXXXXX</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  role: { color: '#ABC7FF', fontSize: 13, fontFamily: 'Inter_400Regular' },
  name: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold' },
  emp: { color: '#8AB0D8', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  systemBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  systemBadgeText: { color: '#ABC7FF', fontSize: 11, fontFamily: 'Inter_500Medium' },
  body: { padding: 16, gap: 14 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  alertText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  metricsRow: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  metricVal: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  metricLabel: { fontSize: 9, fontFamily: 'Inter_500Medium', textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '30%', flexGrow: 1, borderRadius: 12, padding: 14, borderWidth: 1, gap: 4, alignItems: 'center' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statVal: { fontSize: 24, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 10, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', padding: 16, paddingBottom: 12 },
  contentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  contentLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  contentValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  announceBannerWrap: { borderRadius: 16, overflow: 'hidden' },
  announceBanner: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 16, padding: 16 },
  bannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
