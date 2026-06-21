import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SKAttendance() {
  const { user } = useAuth();
  const { getAttendanceByWorker, isTodayAttendanceMarked, markAttendance } = useAppData();
  const colors = useColors();
  const [monthOffset, setMonthOffset] = useState(0);

  const history = getAttendanceByWorker(user?.id ?? '');
  const markedToday = isTodayAttendanceMarked(user?.id ?? '');
  const presentDays = history.filter(a => a.status === 'present').length;
  const absentDays  = history.filter(a => a.status === 'absent').length;
  const attendanceRate = history.length > 0 ? Math.round((presentDays / history.length) * 100) : 0;

  const now = new Date();
  const displayDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthKey = `${displayDate.getFullYear()}-${(displayDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthLabel = displayDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const monthRecords = history.filter(a => a.date.startsWith(monthKey));
  const monthPresent = monthRecords.filter(a => a.status === 'present').length;

  const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(displayDate.getFullYear(), displayDate.getMonth(), 1).getDay();

  async function handleMark() {
    if (markedToday) { Alert.alert('Already Marked', 'Attendance is already recorded for today.'); return; }
    const ok = await markAttendance(user?.id ?? '', 'manual');
    if (ok) Alert.alert('✓ Marked!', `Attendance recorded at ${new Date().toLocaleTimeString()}`);
    else Alert.alert('Error', 'Could not mark attendance.');
  }

  function getStatusForDate(day: number): 'present' | 'absent' | 'none' {
    const dateStr = `${monthKey}-${day.toString().padStart(2, '0')}`;
    const record = history.find(a => a.date === dateStr);
    if (!record) return 'none';
    return record.status === 'present' ? 'present' : 'absent';
  }

  const isToday = (day: number) => monthOffset === 0 && day === now.getDate();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020E07' }} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient colors={['#020E07', '#063018', '#0A5C2C']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Attendance</Text>
            <Text style={styles.heroSub}>{now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
          </View>
          <LinearGradient colors={markedToday ? ['#10B981','#059669'] : ['#D97706','#F59E0B']} style={styles.todayStatusBubble}>
            <Feather name={markedToday ? 'check-circle' : 'clock'} size={16} color="#fff" />
            <Text style={styles.todayStatusText}>{markedToday ? 'Present' : 'Pending'}</Text>
          </LinearGradient>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: 'Present', value: presentDays, grad: ['#10B981','#059669'] as const, icon: 'check-circle' },
            { label: 'Absent',  value: absentDays,  grad: ['#EF4444','#DC2626'] as const, icon: 'x-circle' },
            { label: 'Month',   value: monthPresent, grad: ['#3B82F6','#2563EB'] as const, icon: 'calendar' },
            { label: 'Rate',    value: `${attendanceRate}%`, grad: ['#8B5CF6','#6D28D9'] as const, icon: 'trending-up' },
          ].map(s => (
            <LinearGradient key={s.label} colors={s.grad} style={styles.heroStat}>
              <Feather name={s.icon as any} size={13} color="#fff" />
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 14, gap: 16, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── TODAY STATUS CARD ── */}
        {markedToday ? (
          <LinearGradient colors={['#064E3B', '#065F46']} style={styles.todayCard}>
            <View style={styles.todayCardInner}>
              <LinearGradient colors={['rgba(52,211,153,0.25)','rgba(16,185,129,0.1)']} style={styles.todayIconWrap}>
                <Feather name="check-circle" size={28} color="#34D399" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayCardTitle}>Present Today ✓</Text>
                <Text style={styles.todayCardSub}>Attendance recorded for {now.toLocaleDateString('en-IN')}</Text>
              </View>
            </View>
          </LinearGradient>
        ) : (
          <LinearGradient colors={['#451A00', '#78350F']} style={styles.todayCard}>
            <View style={styles.todayCardInner}>
              <LinearGradient colors={['rgba(252,211,77,0.25)','rgba(217,119,6,0.1)']} style={styles.todayIconWrap}>
                <Feather name="clock" size={28} color="#FCD34D" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.todayCardTitle}>Not Marked Yet</Text>
                <Text style={styles.todayCardSub}>Mark attendance to register your presence</Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleMark} activeOpacity={0.85}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.markBtn}>
                <Feather name="check-circle" size={16} color="#fff" />
                <Text style={styles.markBtnText}>Mark Attendance Now</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        )}

        {/* ── CALENDAR ── */}
        <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Nav */}
          <View style={styles.calNav}>
            <TouchableOpacity onPress={() => setMonthOffset(o => o - 1)} style={[styles.navBtn, { backgroundColor: '#D1FAE5' }]}>
              <Feather name="chevron-left" size={18} color="#059669" />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.text }]}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
              style={[styles.navBtn, { backgroundColor: monthOffset === 0 ? colors.surface : '#D1FAE5' }]}>
              <Feather name="chevron-right" size={18} color={monthOffset === 0 ? colors.mutedForeground : '#059669'} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={styles.weekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={[styles.weekDay, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>

          {/* Days */}
          <View style={styles.daysGrid}>
            {Array.from({ length: firstDayOfWeek }, (_, i) => <View key={`e-${i}`} style={styles.dayCell} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const status = getStatusForDate(day);
              const today = isToday(day);
              const isSunday = new Date(displayDate.getFullYear(), displayDate.getMonth(), day).getDay() === 0;
              return (
                <View key={day} style={styles.dayCell}>
                  {status === 'present' ? (
                    <LinearGradient colors={['#10B981','#059669']} style={styles.dayCircle}>
                      <Text style={[styles.dayNum, { color: '#fff' }]}>{day}</Text>
                    </LinearGradient>
                  ) : status === 'absent' ? (
                    <View style={[styles.dayCircle, { backgroundColor: '#FEE2E2' }]}>
                      <Text style={[styles.dayNum, { color: '#DC2626' }]}>{day}</Text>
                    </View>
                  ) : (
                    <View style={[styles.dayCircle, today && { borderWidth: 2, borderColor: '#10B981' }, { backgroundColor: 'transparent' }]}>
                      <Text style={[styles.dayNum, { color: today ? '#10B981' : isSunday ? colors.mutedForeground : colors.text }, today && { fontFamily: 'Inter_700Bold' }]}>{day}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            {[
              { color1: '#10B981', color2: '#059669', label: 'Present', grad: true },
              { bg: '#FEE2E2', textColor: '#DC2626', label: 'Absent' },
              { border: '#9CA3AF', label: 'Not recorded' },
            ].map((l: any) => (
              <View key={l.label} style={styles.legendItem}>
                {l.grad ? (
                  <LinearGradient colors={[l.color1, l.color2]} style={styles.legendDot} />
                ) : (
                  <View style={[styles.legendDot, { backgroundColor: l.bg ?? 'transparent', borderWidth: l.border ? 1 : 0, borderColor: l.border }]} />
                )}
                <Text style={[styles.legendText, { color: colors.mutedForeground }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── HISTORY ── */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHead}>
            <LinearGradient colors={['#6366F1','#8B5CF6']} style={styles.sectionIcon}>
              <Feather name="list" size={13} color="#fff" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>History</Text>
            <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.countText, { color: '#059669' }]}>{history.length}</Text>
            </View>
          </View>
          {history.slice(0, 10).map(a => {
            const isPresent = a.status === 'present';
            return (
              <View key={a.id} style={[styles.histCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={isPresent ? ['#10B981','#059669'] : ['#EF4444','#DC2626']} style={styles.histAccent} />
                <View style={styles.histInner}>
                  <LinearGradient colors={isPresent ? ['#10B981','#059669'] : ['#EF4444','#DC2626']} style={styles.histIcon}>
                    <Feather name={isPresent ? 'check' : 'x'} size={13} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.histDate, { color: colors.text }]}>{a.date}</Text>
                    <Text style={[styles.histMethod, { color: colors.mutedForeground }]}>via {a.method}{a.checkInTime ? ` · ${a.checkInTime}` : ''}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: isPresent ? '#D1FAE5' : '#FEE2E2' }]}>
                    <Text style={[styles.statusText, { color: isPresent ? '#059669' : '#DC2626' }]}>
                      {isPresent ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
          {history.length === 0 && (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={['#10B981','#059669']} style={styles.emptyIcon}>
                <Feather name="calendar" size={26} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No attendance records yet</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 20, gap: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(110,231,183,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  todayStatusBubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayStatusText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 3 },
  heroStatVal: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  heroStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  todayCard: { borderRadius: 18, padding: 18, gap: 14 },
  todayCardInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  todayIconWrap: { width: 54, height: 54, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  todayCardTitle: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },
  todayCardSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },
  markBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  markBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  calCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  calNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  monthLabel: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Inter_600SemiBold', paddingVertical: 4 },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayNum: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  legend: { flexDirection: 'row', gap: 14, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  countText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  histCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  histAccent: { height: 3 },
  histInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  histIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  histDate: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  histMethod: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  empty: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 56, height: 56, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
