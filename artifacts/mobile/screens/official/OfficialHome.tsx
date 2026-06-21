import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComplaintCard } from '@/components/ComplaintCard';
import { SectionHeader } from '@/components/SectionHeader';
import { StatCard } from '@/components/StatCard';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function OfficialHome() {
  const { user } = useAuth();
  const { complaints, wards, users } = useAppData();
  const colors = useColors();

  const myWard = wards.find(w => w.officialId === user?.id);
  const workers = users.filter(u => u.role === 'safaikarmi');
  const pending = complaints.filter(c => c.status === 'submitted');
  const inProgress = complaints.filter(c => c.status === 'in_progress');
  const resolved = complaints.filter(c => c.status === 'resolved');
  const critical = complaints.filter(c => c.status === 'submitted').slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#6E3900', '#904D00']} style={styles.header}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greeting}>Municipal Officer</Text>
              <Text style={styles.name}>{user?.name ?? 'Official'}</Text>
              <Text style={styles.emp}>ID: {user?.employeeId ?? 'N/A'}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(user?.name ?? 'O')[0]}</Text>
            </View>
          </View>
          {myWard && (
            <View style={styles.wardBadge}>
              <Feather name="map-pin" size={11} color="#FFDCC3" />
              <Text style={styles.wardText}>{myWard.name}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.grid}>
            <StatCard label="Total Complaints" value={complaints.length} icon="clipboard" iconColor={colors.official} iconBg={colors.officialBg} accentLeft={colors.official} />
            <StatCard label="Pending" value={pending.length} icon="clock" iconColor={colors.submitted} iconBg={colors.submittedBg} accentLeft={colors.submitted} />
          </View>
          <View style={styles.grid}>
            <StatCard label="In Progress" value={inProgress.length} icon="loader" iconColor={colors.inProgress} iconBg={colors.inProgressBg} accentLeft={colors.inProgress} />
            <StatCard label="Resolved" value={resolved.length} icon="check-circle" iconColor={colors.resolved} iconBg={colors.resolvedBg} accentLeft={colors.resolved} />
          </View>

          {/* Workers summary */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader title="Workers Overview" />
            <View style={styles.workersRow}>
              <View style={styles.workerStat}>
                <Text style={[styles.workerNum, { color: colors.official }]}>{workers.length}</Text>
                <Text style={[styles.workerLabel, { color: colors.mutedForeground }]}>Total</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.workerStat}>
                <Text style={[styles.workerNum, { color: colors.resolved }]}>{workers.filter(w => w.isActive).length}</Text>
                <Text style={[styles.workerLabel, { color: colors.mutedForeground }]}>Active</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.workerStat}>
                <Text style={[styles.workerNum, { color: colors.citizen }]}>{wards.length}</Text>
                <Text style={[styles.workerLabel, { color: colors.mutedForeground }]}>Wards</Text>
              </View>
            </View>
          </View>

          {critical.length > 0 && (
            <>
              <SectionHeader title="Pending Complaints" actionLabel="View All" />
              <View style={{ gap: 10 }}>
                {critical.map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </View>
            </>
          )}

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Quick Stats</Text>
            {[
              { label: 'Resolution Rate', value: complaints.length > 0 ? `${Math.round((resolved.length / complaints.length) * 100)}%` : '0%', color: colors.resolved },
              { label: 'Total Houses', value: wards.reduce((s, w) => s + w.totalHouses, 0), color: colors.citizen },
              { label: 'Active Workers', value: workers.filter(w => w.isActive).length, color: colors.safaikarmi },
            ].map((stat, i, arr) => (
              <View key={stat.label} style={[styles.quickRow, { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
                <Text style={[styles.quickLabel, { color: colors.text }]}>{stat.label}</Text>
                <Text style={[styles.quickValue, { color: stat.color }]}>{stat.value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.announceBannerWrap} activeOpacity={0.85} onPress={() => Linking.openURL('tel:0618400000')}>
            <LinearGradient colors={['#5A2E00', '#C45C00']} style={styles.announceBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  greeting: { color: '#FFDCC3', fontSize: 13, fontFamily: 'Inter_400Regular' },
  name: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold' },
  emp: { color: '#FFA07A', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  wardBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  wardText: { color: '#FFDCC3', fontSize: 11, fontFamily: 'Inter_500Medium' },
  body: { padding: 16, gap: 14 },
  grid: { flexDirection: 'row', gap: 10 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 14 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  workersRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  workerStat: { alignItems: 'center', gap: 4 },
  workerNum: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  workerLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  divider: { width: 1, height: 40 },
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  quickLabel: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  quickValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  announceBannerWrap: { borderRadius: 16, overflow: 'hidden' },
  announceBanner: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 16, padding: 16 },
  bannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
