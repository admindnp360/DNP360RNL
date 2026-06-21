import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SKPerformance() {
  const { user } = useAuth();
  const { getVisitsByWorker, getAttendanceByWorker, wards } = useAppData();
  const colors = useColors();

  const visits = getVisitsByWorker(user?.id ?? '');
  const attendance = getAttendanceByWorker(user?.id ?? '');
  const presentDays  = attendance.filter(a => a.status === 'present').length;
  const absentDays   = attendance.filter(a => a.status === 'absent').length;
  const collected    = visits.filter(v => v.collectedGarbage).length;
  const efficiency   = visits.length > 0 ? Math.round((collected / visits.length) * 100) : 0;
  const todayStr     = new Date().toISOString().split('T')[0];
  const todayVisits  = visits.filter(v => v.visitDate === todayStr).length;
  const myWard       = wards.find(w => w.id === user?.wardId);
  const totalHouses  = myWard?.totalHouses ?? 0;
  const todayProgress = totalHouses > 0 ? Math.min(100, Math.round((todayVisits / totalHouses) * 100)) : 0;
  const attendanceRate = attendance.length > 0 ? Math.round((presentDays / attendance.length) * 100) : 0;

  const RATING = efficiency >= 90 ? 'Excellent' : efficiency >= 75 ? 'Good' : efficiency >= 50 ? 'Average' : 'Needs Work';
  const HERO_GRAD: readonly [string, string, string] =
    efficiency >= 75 ? ['#020E07', '#063018', '#0A5C2C'] :
    efficiency >= 50 ? ['#1C0A00', '#3D1800', '#6B3000'] :
                       ['#1C0000', '#4A0000', '#7F1D1D'];

  const progressBarColor = todayProgress >= 80 ? '#34D399' : todayProgress >= 40 ? '#FCD34D' : '#F87171';

  const BADGES: { label: string; icon: string; earned: boolean; desc: string; grad: readonly [string, string] }[] = [
    { label: 'Perfect Collector', icon: 'award',        earned: efficiency >= 95,                desc: '95%+ collection rate',  grad: ['#F59E0B','#D97706'] },
    { label: 'Consistent Worker', icon: 'calendar',     earned: presentDays >= 20,               desc: '20+ present days',       grad: ['#3B82F6','#2563EB'] },
    { label: 'House Pro',         icon: 'home',         earned: visits.length >= 50,             desc: '50+ houses visited',     grad: ['#8B5CF6','#6D28D9'] },
    { label: 'Zero Skips',        icon: 'check-circle', earned: efficiency === 100 && visits.length > 0, desc: '100% collection rate', grad: ['#10B981','#059669'] },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020E07' }} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient colors={HERO_GRAD} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>My Performance</Text>
            <Text style={styles.heroSub}>Work metrics & achievements</Text>
          </View>
          <View style={styles.effCircle}>
            <Text style={styles.effPct}>{efficiency}%</Text>
            <Text style={styles.effLabel}>Rate</Text>
          </View>
        </View>

        {/* Efficiency bar */}
        <View>
          <View style={styles.effBarRow}>
            <Text style={styles.effRating}>{RATING}</Text>
            <Text style={styles.effBarLabel}>Collection Efficiency</Text>
          </View>
          <View style={styles.effTrack}>
            <View style={[styles.effFill, { width: `${efficiency}%` as any }]} />
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.heroStats}>
          {[
            { label: 'Collected', value: collected,             grad: ['#10B981','#059669'] as const },
            { label: 'Total',     value: visits.length,         grad: ['#3B82F6','#2563EB'] as const },
            { label: 'Skipped',   value: visits.length - collected, grad: ['#EF4444','#DC2626'] as const },
            { label: 'Attendance',value: `${attendanceRate}%`,  grad: ['#8B5CF6','#6D28D9'] as const },
          ].map(s => (
            <LinearGradient key={s.label} colors={s.grad} style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── TODAY PROGRESS ── */}
        <LinearGradient colors={['#020E07', '#063018']} style={styles.todayCard}>
          <View style={styles.todayTop}>
            <LinearGradient colors={['rgba(52,211,153,0.2)','rgba(16,185,129,0.08)']} style={styles.todayIconWrap}>
              <Feather name="sun" size={18} color="#34D399" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Today's Progress</Text>
              <Text style={styles.todaySub}>{todayVisits} of {totalHouses} houses visited</Text>
            </View>
            <Text style={[styles.todayPct, { color: progressBarColor }]}>{todayProgress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${todayProgress}%` as any, backgroundColor: progressBarColor }]} />
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressMetaText}>
              {totalHouses - todayVisits > 0 ? `${totalHouses - todayVisits} houses remaining` : '✓ All houses visited today!'}
            </Text>
          </View>
        </LinearGradient>

        {/* ── STATS GRID ── */}
        <View style={styles.statsGrid}>
          {[
            { label: 'Total Visits',    value: visits.length,   icon: 'home',      grad: ['#10B981','#059669'] as const },
            { label: 'Present Days',    value: presentDays,     icon: 'calendar',  grad: ['#3B82F6','#2563EB'] as const },
            { label: 'Absent Days',     value: absentDays,      icon: 'x-circle',  grad: ['#EF4444','#DC2626'] as const },
            { label: 'Garbage Collected',value: collected,      icon: 'trash-2',   grad: ['#10B981','#047857'] as const },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={s.grad} style={styles.statIcon}>
                <Feather name={s.icon as any} size={16} color="#fff" />
              </LinearGradient>
              <Text style={[styles.statVal, { color: s.grad[0] }]}>{s.value}</Text>
              <Text style={[styles.statLbl, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── ACHIEVEMENTS ── */}
        <View>
          <View style={styles.sectionHead}>
            <LinearGradient colors={['#F59E0B','#D97706']} style={styles.sectionIcon}>
              <Feather name="award" size={13} color="#fff" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Achievements</Text>
            <View style={[styles.earnedBadgeCount, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.earnedBadgeText, { color: '#D97706' }]}>{BADGES.filter(b => b.earned).length}/{BADGES.length}</Text>
            </View>
          </View>
          <View style={styles.badgesGrid}>
            {BADGES.map(b => (
              <View key={b.label} style={[styles.badgeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: b.earned ? 1 : 0.45 }]}>
                {b.earned && <LinearGradient colors={b.grad} style={styles.badgeTopBar} />}
                <View style={{ alignItems: 'center', gap: 6, paddingTop: b.earned ? 10 : 14 }}>
                  {b.earned ? (
                    <LinearGradient colors={b.grad} style={styles.badgeIcon}>
                      <Feather name={b.icon as any} size={20} color="#fff" />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.badgeIcon, { backgroundColor: colors.surface }]}>
                      <Feather name={b.icon as any} size={20} color={colors.mutedForeground} />
                    </View>
                  )}
                  <Text style={[styles.badgeName, { color: b.earned ? colors.text : colors.mutedForeground }]} numberOfLines={2}>{b.label}</Text>
                  <Text style={[styles.badgeDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
                  {b.earned && (
                    <LinearGradient colors={b.grad} style={styles.earnedCheckmark}>
                      <Feather name="check" size={8} color="#fff" />
                    </LinearGradient>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── PERFORMANCE DETAILS ── */}
        <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <LinearGradient colors={['#063018', '#0A5C2C']} style={styles.detailHeader}>
            <Feather name="bar-chart-2" size={16} color="#34D399" />
            <Text style={styles.detailHeaderText}>Performance Details</Text>
          </LinearGradient>
          {[
            { label: 'Houses Visited',      value: `${visits.length}`,          icon: 'home',       grad: ['#10B981','#059669'] as const },
            { label: 'Garbage Collected',   value: `${collected} / ${visits.length}`, icon: 'trash-2', grad: ['#10B981','#047857'] as const },
            { label: 'Attendance Days',     value: `${presentDays}`,            icon: 'calendar',   grad: ['#3B82F6','#2563EB'] as const },
            { label: 'Collection Rate',     value: `${efficiency}%`,            icon: 'trending-up',grad: efficiency >= 75 ? ['#10B981','#059669'] as const : ['#EF4444','#DC2626'] as const },
            { label: "Today's Progress",    value: `${todayVisits} / ${totalHouses}`, icon: 'sun', grad: ['#F59E0B','#D97706'] as const },
            { label: 'Attendance Rate',     value: `${attendanceRate}%`,        icon: 'user-check', grad: ['#8B5CF6','#6D28D9'] as const },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.detailRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <LinearGradient colors={item.grad} style={styles.detailIcon}>
                <Feather name={item.icon as any} size={13} color="#fff" />
              </LinearGradient>
              <Text style={[styles.detailLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.detailValue, { color: item.grad[0] }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* ── TIP ── */}
        <LinearGradient colors={['#020E07', '#063018']} style={styles.tipCard}>
          <Feather name="star" size={16} color="#34D399" />
          <Text style={styles.tipText}>
            {efficiency >= 90
              ? `Outstanding! Keep maintaining 90%+ efficiency to stay a Top Performer.`
              : efficiency >= 75
              ? `Good work! Reach 90%+ collection rate to earn the Excellent rating.`
              : `Collect garbage at every house to improve your efficiency score.`}
          </Text>
        </LinearGradient>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 20, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(110,231,183,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  effCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(52,211,153,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(52,211,153,0.4)' },
  effPct: { color: '#34D399', fontSize: 18, fontFamily: 'Inter_700Bold' },
  effLabel: { color: 'rgba(52,211,153,0.7)', fontSize: 9, fontFamily: 'Inter_500Medium' },
  effBarRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  effRating: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  effBarLabel: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Inter_400Regular' },
  effTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  effFill: { height: 8, borderRadius: 4, backgroundColor: '#34D399' },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 2 },
  heroStatVal: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  heroStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  todayCard: { borderRadius: 18, padding: 16, gap: 12 },
  todayTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  todayTitle: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  todaySub: { color: 'rgba(110,231,183,0.7)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  todayPct: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressMeta: {},
  progressMetaText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Inter_400Regular' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, borderRadius: 16, padding: 14, borderWidth: 1, gap: 8 },
  statIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  statVal: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  statLbl: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  earnedBadgeCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  earnedBadgeText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgeCard: { width: '47%', flexGrow: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden', paddingBottom: 14, paddingHorizontal: 12, gap: 4, alignItems: 'center', position: 'relative' },
  badgeTopBar: { height: 4, width: '150%', marginBottom: 0 },
  badgeIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  badgeName: { fontSize: 12, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  badgeDesc: { fontSize: 10, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  earnedCheckmark: { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  detailCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  detailHeaderText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  detailIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  detailLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 14, fontFamily: 'Inter_700Bold' },

  tipCard: { borderRadius: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 16 },
  tipText: { flex: 1, color: 'rgba(110,231,183,0.85)', fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
});
