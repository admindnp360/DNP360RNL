import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

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

  async function handleMarkAttendance() {
    if (attendanceMarked) { Alert.alert('Already Marked', 'Your attendance for today is already recorded.'); return; }
    const success = await markAttendance(user?.id ?? '', 'manual');
    if (success) Alert.alert('✓ Attendance Marked', `Recorded at ${new Date().toLocaleTimeString()}`);
    else Alert.alert('Error', 'Could not mark attendance. Try again.');
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Header */}
        <LinearGradient colors={['#003D1C', '#006A35']} style={styles.header}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting()},</Text>
              <Text style={styles.name}>{user?.name ?? 'Worker'}</Text>
              <Text style={styles.empId}>{user?.employeeId ?? ''}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(user?.name ?? 'S')[0]}</Text>
            </View>
          </View>

          <View style={[styles.attendancePill, { backgroundColor: attendanceMarked ? 'rgba(160,255,190,0.15)' : 'rgba(255,210,110,0.15)' }]}>
            <Feather name={attendanceMarked ? 'check-circle' : 'clock'} size={13} color={attendanceMarked ? '#80FFA0' : '#FFD06E'} />
            <Text style={[styles.attendancePillText, { color: attendanceMarked ? '#80FFA0' : '#FFD06E' }]}>
              {attendanceMarked ? 'Present Today' : 'Attendance Not Marked'}
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Attendance CTA */}
          {!attendanceMarked && (
            <TouchableOpacity style={styles.markBtn} onPress={handleMarkAttendance} activeOpacity={0.85}>
              <LinearGradient colors={['#006A35', '#00A550']} style={styles.markBtnGradient}>
                <Feather name="check-circle" size={20} color="#fff" />
                <Text style={styles.markBtnText}>Mark Today's Attendance</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {[
              { label: "Today's Visits", value: todayVisits.length, icon: 'home', color: colors.safaikarmi, bg: colors.safaikarmiBg },
              { label: 'Total Houses', value: totalHouses, icon: 'map', color: colors.citizen, bg: colors.citizenBg },
              { label: 'This Month', value: thisMonthAttendance, icon: 'calendar', color: colors.official, bg: colors.officialBg },
              { label: 'Progress', value: `${progressPct}%`, icon: 'trending-up', color: colors.resolved, bg: colors.resolvedBg },
            ].map(s => (
              <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIcon, { backgroundColor: s.bg }]}>
                  <Feather name={s.icon as any} size={16} color={s.color} />
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Ward Card */}
          {myWard && (
            <View style={[styles.wardCard, { backgroundColor: colors.card, borderColor: colors.safaikarmi + '40' }]}>
              <View style={styles.wardTop}>
                <LinearGradient colors={['#003D1C', '#006A35']} style={styles.wardIcon}>
                  <Feather name="map-pin" size={16} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.wardName, { color: colors.text }]}>{myWard.name}</Text>
                  <Text style={[styles.wardArea, { color: colors.mutedForeground }]}>{myWard.area}</Text>
                </View>
                <View style={[styles.wardNumBadge, { backgroundColor: colors.safaikarmiBg }]}>
                  <Text style={[styles.wardNumText, { color: colors.safaikarmi }]}>W{myWard.wardNumber}</Text>
                </View>
              </View>

              <View>
                <View style={styles.progressHeader}>
                  <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
                    {todayVisits.length} of {totalHouses} houses visited
                  </Text>
                  <Text style={[styles.progressPct, { color: colors.safaikarmi }]}>{progressPct}%</Text>
                </View>
                <View style={[styles.progressBar, { backgroundColor: colors.surface }]}>
                  <LinearGradient
                    colors={['#006A35', '#00A550']}
                    style={[styles.progressFill, { width: `${progressPct}%` }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>

              {attendanceMarked && (
                <View style={[styles.presentBadge, { backgroundColor: colors.safaikarmiBg }]}>
                  <Feather name="check-circle" size={12} color={colors.safaikarmi} />
                  <Text style={[styles.presentText, { color: colors.safaikarmi }]}>Attendance Marked</Text>
                </View>
              )}
            </View>
          )}

          {/* Recent Visits */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Visits</Text>
          {visits.slice(0, 6).map(v => (
            <View key={v.id} style={[styles.visitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.visitIcon, { backgroundColor: colors.safaikarmiBg }]}>
                <Feather name="home" size={15} color={colors.safaikarmi} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.visitHouse, { color: colors.text }]}>{v.houseRegistrationNumber}</Text>
                <Text style={[styles.visitMeta, { color: colors.mutedForeground }]}>{v.visitDate} · {v.visitTime}</Text>
              </View>
              <View style={[styles.garbageBadge, { backgroundColor: v.collectedGarbage ? colors.resolvedBg : '#FDECEA' }]}>
                <Feather name={v.collectedGarbage ? 'check' : 'x'} size={11} color={v.collectedGarbage ? colors.resolved : colors.destructive} />
                <Text style={[styles.garbageText, { color: v.collectedGarbage ? colors.resolved : colors.destructive }]}>
                  {v.collectedGarbage ? 'Collected' : 'Skipped'}
                </Text>
              </View>
            </View>
          ))}
          {visits.length === 0 && (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="home" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No visits yet. Start scanning QR codes!</Text>
            </View>
          )}

          <TouchableOpacity style={styles.announceBannerWrap} activeOpacity={0.85} onPress={() => Linking.openURL('tel:0618400000')}>
            <LinearGradient colors={['#003D1C', '#007F42']} style={styles.announceBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
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
  header: { paddingTop: 16, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  greeting: { color: '#9DFFC0', fontSize: 13, fontFamily: 'Inter_400Regular' },
  name: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold' },
  empId: { color: '#7CFFA4', fontSize: 12, fontFamily: 'Inter_500Medium', marginTop: 2 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarLetter: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold' },
  attendancePill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  attendancePillText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  body: { padding: 16, gap: 14 },
  markBtn: { borderRadius: 16, overflow: 'hidden' },
  markBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  markBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { width: '47%', flexGrow: 1, borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  statIcon: { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  statValue: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  statLabel: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  wardCard: { borderRadius: 16, padding: 16, borderWidth: 1.5, gap: 14 },
  wardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wardIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  wardName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  wardArea: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  wardNumBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  wardNumText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  progressPct: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  progressBar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  presentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  presentText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  visitRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 13, padding: 14, borderWidth: 1 },
  visitIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  visitHouse: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  visitMeta: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  garbageBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  garbageText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  empty: { borderRadius: 14, padding: 32, borderWidth: 1, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  announceBannerWrap: { borderRadius: 16, overflow: 'hidden' },
  announceBanner: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 16, padding: 16 },
  bannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
