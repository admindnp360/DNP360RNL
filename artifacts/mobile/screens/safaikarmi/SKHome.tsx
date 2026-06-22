import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function SKHome() {
  const { user } = useAuth();
  const { wards, getVisitsByWorker, getAttendanceByWorker, isTodayAttendanceMarked, markAttendance } = useAppData();
  const colors = useColors();

  const todayStr = new Date().toISOString().split('T')[0];
  const myWard = wards.find(w => w.id === user?.wardId);
  const visits = getVisitsByWorker(user?.id ?? '');
  const todayVisits = visits.filter(v => v.visitDate === todayStr);
  const attendance = getAttendanceByWorker(user?.id ?? '');
  const attendanceMarked = isTodayAttendanceMarked(user?.id ?? '');
  const totalHouses = myWard?.totalHouses ?? 0;
  const progressPct = totalHouses > 0 ? Math.min(100, Math.round((todayVisits.length / totalHouses) * 100)) : 0;
  const thisMonthAttendance = attendance.filter(a => a.date.startsWith(todayStr.slice(0, 7))).length;
  const barColor = progressPct >= 80 ? '#34D399' : progressPct >= 40 ? '#FCD34D' : '#F87171';

  async function handleMarkAttendance() {
    if (attendanceMarked) { Alert.alert('Already Marked', 'Your attendance for today is already recorded.'); return; }
    const success = await markAttendance(user?.id ?? '', 'manual');
    if (success) Alert.alert('✓ Attendance Marked', `Recorded at ${new Date().toLocaleTimeString()}`);
    else Alert.alert('Error', 'Could not mark attendance. Try again.');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020E07' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── HERO ── */}
        <View style={styles.hero}>
          <LinearGradient colors={['#020E07', '#063018', '#0A5C2C']} style={StyleSheet.absoluteFill} />

          {/* Top bar */}
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{getGreeting()},</Text>
              <Text style={styles.heroName}>{user?.name ?? 'Worker'} 👷</Text>
              <View style={styles.heroEmpRow}>
                <Feather name="briefcase" size={11} color="#6EE7B7" />
                <Text style={styles.heroEmpId}>{user?.employeeId ?? ''} · Safai Karmi</Text>
              </View>
            </View>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.avatarRing}>
              <LinearGradient colors={['#34D399', '#10B981']} style={styles.avatarGrad}>
                <Text style={styles.avatarLetter}>{(user?.name ?? 'S')[0].toUpperCase()}</Text>
              </LinearGradient>
            </LinearGradient>
          </View>

          {/* Attendance status */}
          <View style={[styles.attendancePill, {
            backgroundColor: attendanceMarked ? 'rgba(52,211,153,0.15)' : 'rgba(252,211,77,0.15)',
            borderColor: attendanceMarked ? 'rgba(52,211,153,0.4)' : 'rgba(252,211,77,0.4)',
          }]}>
            <Feather name={attendanceMarked ? 'check-circle' : 'clock'} size={13}
              color={attendanceMarked ? '#34D399' : '#FCD34D'} />
            <Text style={[styles.attendancePillText, { color: attendanceMarked ? '#34D399' : '#FCD34D' }]}>
              {attendanceMarked ? '✓ Present Today' : 'Attendance not marked yet'}
            </Text>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {[
              { label: "Today",    value: todayVisits.length,     grad: ['#10B981','#059669'] as const, icon: 'home' },
              { label: 'Houses',   value: totalHouses,            grad: ['#3B82F6','#2563EB'] as const, icon: 'map' },
              { label: 'Month',    value: thisMonthAttendance,    grad: ['#F59E0B','#D97706'] as const, icon: 'calendar' },
              { label: 'Progress', value: `${progressPct}%`,     grad: ['#8B5CF6','#6D28D9'] as const, icon: 'trending-up' },
            ].map(s => (
              <View key={s.label} style={styles.statCell}>
                <LinearGradient colors={s.grad} style={styles.statIcon}>
                  <Feather name={s.icon as any} size={12} color="#fff" />
                </LinearGradient>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.body, { backgroundColor: colors.background }]}>

          {/* ── MARK ATTENDANCE CTA ── */}
          {!attendanceMarked && (
            <TouchableOpacity onPress={handleMarkAttendance} activeOpacity={0.85} style={styles.markBtnWrap}>
              <LinearGradient colors={['#059669', '#10B981', '#34D399']} style={styles.markBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <LinearGradient colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.05)']} style={styles.markBtnIcon}>
                  <Feather name="check-circle" size={20} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.markBtnTitle}>Mark Today's Attendance</Text>
                  <Text style={styles.markBtnSub}>Tap to record your presence</Text>
                </View>
                <Feather name="arrow-right" size={18} color="rgba(255,255,255,0.8)" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* ── WARD CARD ── */}
          {myWard && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.sectionIcon}>
                  <Feather name="map-pin" size={13} color="#fff" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Ward</Text>
              </View>
              <LinearGradient colors={['#020E07', '#063018']} style={styles.wardCard}>
                <View style={styles.wardTop}>
                  <LinearGradient colors={['rgba(52,211,153,0.2)', 'rgba(16,185,129,0.1)']} style={styles.wardIconWrap}>
                    <Feather name="map-pin" size={18} color="#34D399" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wardName}>{myWard.name}</Text>
                    <Text style={styles.wardArea}>{myWard.area}</Text>
                  </View>
                  <View style={styles.wardNumBadge}>
                    <Text style={styles.wardNumText}>W{myWard.wardNumber}</Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>{todayVisits.length} of {totalHouses} houses visited today</Text>
                    <Text style={[styles.progressPct, { color: barColor }]}>{progressPct}%</Text>
                  </View>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progressPct}%` as any, backgroundColor: barColor }]} />
                  </View>
                  <View style={styles.progressFooter}>
                    <View style={[styles.progressChip, { backgroundColor: progressPct >= 80 ? '#D1FAE5' : '#FEF3C7' }]}>
                      <Feather name={progressPct >= 80 ? 'check-circle' : 'clock'} size={10}
                        color={progressPct >= 80 ? '#059669' : '#D97706'} />
                      <Text style={[styles.progressChipText, { color: progressPct >= 80 ? '#059669' : '#D97706' }]}>
                        {progressPct >= 80 ? 'Great progress!' : `${totalHouses - todayVisits.length} remaining`}
                      </Text>
                    </View>
                    {attendanceMarked && (
                      <View style={styles.presentBadge}>
                        <Feather name="user-check" size={10} color="#34D399" />
                        <Text style={styles.presentBadgeText}>Present</Text>
                      </View>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* ── RECENT VISITS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.sectionIcon}>
                <Feather name="clock" size={13} color="#fff" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Visits</Text>
              <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
                <Text style={[styles.countText, { color: '#059669' }]}>{visits.length}</Text>
              </View>
            </View>

            {visits.length > 0 ? visits.slice(0, 6).map(v => (
              <View key={v.id} style={[styles.visitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={v.collectedGarbage ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']} style={styles.visitAccent} />
                <View style={styles.visitInner}>
                  <LinearGradient colors={v.collectedGarbage ? ['#10B981', '#059669'] : ['#6B7280', '#4B5563']} style={styles.visitIcon}>
                    <Feather name="home" size={14} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visitReg, { color: colors.text }]}>{v.houseRegistrationNumber}</Text>
                    <Text style={[styles.visitMeta, { color: colors.mutedForeground }]}>{v.ownerName} · {v.visitDate} {v.visitTime}</Text>
                  </View>
                  <View style={[styles.garbagePill, {
                    backgroundColor: v.collectedGarbage ? '#D1FAE5' : '#FEE2E2',
                  }]}>
                    <Feather name={v.collectedGarbage ? 'check' : 'x'} size={10}
                      color={v.collectedGarbage ? '#059669' : '#DC2626'} />
                    <Text style={[styles.garbagePillText, { color: v.collectedGarbage ? '#059669' : '#DC2626' }]}>
                      {v.collectedGarbage ? 'Collected' : 'Skipped'}
                    </Text>
                  </View>
                </View>
              </View>
            )) : (
              <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.emptyIcon}>
                  <Feather name="home" size={26} color="#fff" />
                </LinearGradient>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No visits yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Start scanning QR codes to record visits</Text>
              </View>
            )}
          </View>

          {/* ── MUNICIPAL BANNER ── */}
          <LinearGradient colors={['#020E07', '#063018']} style={styles.banner}>
            <LinearGradient colors={['rgba(52,211,153,0.2)', 'rgba(16,185,129,0.1)']} style={styles.bannerIcon}>
              <Feather name="home" size={18} color="#34D399" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Nagar Parishad Daudnagar</Text>
              <Text style={styles.bannerSub}>Municipal Office · Bihar, India</Text>
            </View>
            <Feather name="chevron-right" size={16} color="rgba(52,211,153,0.6)" />
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, marginBottom: 8 },
  heroGreeting: { color: '#6EE7B7', fontSize: 11, fontFamily: 'Inter_400Regular' },
  heroName: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold', marginTop: 1 },
  heroEmpRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  heroEmpId: { color: '#6EE7B7', fontSize: 10, fontFamily: 'Inter_500Medium' },
  avatarRing: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarGrad: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },
  attendancePill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1, alignSelf: 'flex-start' },
  attendancePillText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  statsStrip: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 8 },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  statLbl: { color: 'rgba(255,255,255,0.55)', fontSize: 9, fontFamily: 'Inter_500Medium' },

  body: { padding: 16, gap: 20 },

  markBtnWrap: { borderRadius: 18, overflow: 'hidden' },
  markBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  markBtnIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  markBtnTitle: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  markBtnSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  countText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  wardCard: { borderRadius: 18, padding: 16, gap: 14 },
  wardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wardIconWrap: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  wardName: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  wardArea: { color: 'rgba(110,231,183,0.7)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  wardNumBadge: { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(52,211,153,0.3)' },
  wardNumText: { color: '#34D399', fontSize: 12, fontFamily: 'Inter_700Bold' },
  progressSection: { gap: 8 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular' },
  progressPct: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  progressChipText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  presentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(52,211,153,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  presentBadgeText: { color: '#34D399', fontSize: 10, fontFamily: 'Inter_600SemiBold' },

  visitCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  visitAccent: { height: 3 },
  visitInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  visitIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  visitReg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  visitMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  garbagePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  garbagePillText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  empty: { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  banner: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  bannerIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(110,231,183,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
