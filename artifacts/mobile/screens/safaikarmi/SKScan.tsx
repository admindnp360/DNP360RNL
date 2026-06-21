import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

export default function SKScan() {
  const { user } = useAuth();
  const { houses, getHouseByRegistration, addHouseVisit, getVisitsByWorker } = useAppData();
  const colors = useColors();

  const [manualReg, setManualReg] = useState('');
  const [scanning, setScanning] = useState(false);
  const [garbageCollected, setGarbageCollected] = useState(true);
  const [notes, setNotes] = useState('');

  const recentVisits = getVisitsByWorker(user?.id ?? '').slice(0, 8);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayCount = getVisitsByWorker(user?.id ?? '').filter(v => v.visitDate === todayStr).length;

  function nowTime() {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
  }

  async function markVisit(regNum: string) {
    const reg = regNum.trim().toUpperCase();
    const house = getHouseByRegistration(reg) ?? houses.find(h => h.registrationNumber.toUpperCase() === reg);
    if (!house) { Alert.alert('Not Found', `House "${regNum}" is not registered in the system.`); return; }
    const visitDate = new Date().toISOString().split('T')[0];
    await addHouseVisit({
      houseId: house.id, houseRegistrationNumber: house.registrationNumber,
      ownerName: house.ownerName, address: house.address,
      workerId: user?.id ?? '', workerName: user?.name,
      wardId: house.wardId, collectedGarbage: garbageCollected,
      notes: notes.trim() || undefined, visitDate, visitTime: nowTime(), status: 'visited',
    });
    setManualReg(''); setNotes('');
    Alert.alert('✓ Visit Recorded', `${house.ownerName}\n${house.address}\n\nGarbage: ${garbageCollected ? '✓ Collected' : '✗ Not Collected'}`);
  }

  async function simulateScan() {
    if (houses.length === 0) { Alert.alert('No Houses', 'No houses registered in the system.'); return; }
    setScanning(true);
    await new Promise(r => setTimeout(r, 1800));
    setScanning(false);
    await markVisit(houses[Math.floor(Math.random() * houses.length)].registrationNumber);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020E07' }} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient colors={['#020E07', '#063018', '#0A5C2C']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>QR Scanner</Text>
            <Text style={styles.heroSub}>Mark house visits by scan or manual entry</Text>
          </View>
          <LinearGradient colors={['rgba(52,211,153,0.2)', 'rgba(16,185,129,0.1)']} style={styles.heroIconWrap}>
            <Feather name="camera" size={22} color="#34D399" />
          </LinearGradient>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: 'Today',  value: todayCount,   grad: ['#10B981','#059669'] as const },
            { label: 'Total',  value: recentVisits.length, grad: ['#3B82F6','#2563EB'] as const },
            { label: 'Houses', value: houses.length, grad: ['#8B5CF6','#6D28D9'] as const },
          ].map(s => (
            <LinearGradient key={s.label} colors={s.grad} style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── QR SCAN FRAME ── */}
        <View style={styles.scanFrame}>
          <LinearGradient colors={['#020E07', '#042812', '#063018']} style={styles.cameraArea}>
            {/* Corner brackets */}
            {([['tl', true, false], ['tr', true, true], ['bl', false, false], ['br', false, true]] as const).map(([pos, top, right]) => (
              <View key={pos} style={[
                styles.corner,
                top ? { top: 20 } : { bottom: 20 },
                right ? { right: 20 } : { left: 20 },
                !top && !right && { borderBottomWidth: 3, borderLeftWidth: 3 },
                !top && right && { borderBottomWidth: 3, borderRightWidth: 3 },
                top && !right && { borderTopWidth: 3, borderLeftWidth: 3 },
                top && right && { borderTopWidth: 3, borderRightWidth: 3 },
              ]} />
            ))}
            {/* Center */}
            {scanning ? (
              <View style={styles.scanCenter}>
                <LinearGradient colors={['rgba(52,211,153,0.2)','rgba(16,185,129,0.05)']} style={styles.scanIconRing}>
                  <Feather name="loader" size={32} color="#34D399" />
                </LinearGradient>
                <Text style={styles.scanLabel}>Scanning QR Code…</Text>
                <Text style={styles.scanSub}>Please wait</Text>
              </View>
            ) : (
              <View style={styles.scanCenter}>
                <LinearGradient colors={['rgba(52,211,153,0.15)','rgba(16,185,129,0.05)']} style={styles.scanIconRing}>
                  <Feather name="maximize" size={32} color="#34D399" />
                </LinearGradient>
                <Text style={styles.scanLabel}>Point at House QR Code</Text>
                <Text style={styles.scanSub}>Simulated camera view</Text>
              </View>
            )}
          </LinearGradient>
          <TouchableOpacity onPress={simulateScan} disabled={scanning} activeOpacity={0.85} style={scanning ? { opacity: 0.7 } : {}}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.scanBtn}>
              <Feather name="camera" size={18} color="#fff" />
              <Text style={styles.scanBtnText}>{scanning ? 'Scanning…' : 'Simulate QR Scan'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── MANUAL ENTRY ── */}
        <View style={[styles.manualCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.manualHeader}>
            <LinearGradient colors={['#10B981','#059669']} style={styles.manualIcon}>
              <Feather name="edit-3" size={15} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={[styles.manualTitle, { color: colors.text }]}>Manual Entry</Text>
              <Text style={[styles.manualSub, { color: colors.mutedForeground }]}>Type the registration number</Text>
            </View>
          </View>

          {/* Reg number */}
          <View style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="hash" size={16} color="#10B981" />
            <TextInput style={[styles.fieldInput, { color: colors.text }]} placeholder="e.g. DNPH001" placeholderTextColor={colors.mutedForeground} autoCapitalize="characters" value={manualReg} onChangeText={setManualReg} />
          </View>

          {/* Garbage toggle */}
          <View>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>Garbage Status</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => setGarbageCollected(true)} activeOpacity={0.85} style={{ flex: 1 }}>
                {garbageCollected ? (
                  <LinearGradient colors={['#10B981','#059669']} style={styles.toggleBtnActive}>
                    <Feather name="check" size={13} color="#fff" />
                    <Text style={styles.toggleBtnActiveText}>Collected</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.toggleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Feather name="check" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.toggleBtnText, { color: colors.mutedForeground }]}>Collected</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGarbageCollected(false)} activeOpacity={0.85} style={{ flex: 1 }}>
                {!garbageCollected ? (
                  <LinearGradient colors={['#EF4444','#DC2626']} style={styles.toggleBtnActive}>
                    <Feather name="x" size={13} color="#fff" />
                    <Text style={styles.toggleBtnActiveText}>Not Collected</Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.toggleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Feather name="x" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.toggleBtnText, { color: colors.mutedForeground }]}>Not Collected</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Notes */}
          <View style={[styles.fieldRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="file-text" size={16} color={colors.mutedForeground} />
            <TextInput style={[styles.fieldInput, { color: colors.text }]} placeholder="Notes (optional)" placeholderTextColor={colors.mutedForeground} value={notes} onChangeText={setNotes} />
          </View>

          <TouchableOpacity onPress={() => markVisit(manualReg)} disabled={!manualReg.trim()} activeOpacity={0.85} style={!manualReg.trim() ? { opacity: 0.4 } : {}}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.submitBtn}>
              <Feather name="check-circle" size={16} color="#fff" />
              <Text style={styles.submitBtnText}>Mark House Visit</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── RECENT VISITS ── */}
        <View style={{ gap: 10 }}>
          <View style={styles.sectionHead}>
            <LinearGradient colors={['#3B82F6','#2563EB']} style={styles.sectionIcon}>
              <Feather name="clock" size={13} color="#fff" />
            </LinearGradient>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Visits</Text>
            <View style={[styles.countBadge, { backgroundColor: '#D1FAE5' }]}>
              <Text style={[styles.countText, { color: '#059669' }]}>{recentVisits.length}</Text>
            </View>
          </View>
          {recentVisits.map(v => (
            <View key={v.id} style={[styles.visitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={v.collectedGarbage ? ['#10B981','#059669'] : ['#EF4444','#DC2626']} style={styles.visitAccent} />
              <View style={styles.visitInner}>
                <LinearGradient colors={v.collectedGarbage ? ['#10B981','#059669'] : ['#6B7280','#4B5563']} style={styles.visitIcon}>
                  <Feather name="home" size={13} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.visitReg, { color: colors.text }]}>{v.houseRegistrationNumber}</Text>
                  <Text style={[styles.visitMeta, { color: colors.mutedForeground }]}>{v.visitDate} · {v.visitTime}</Text>
                </View>
                <View style={[styles.garbagePill, { backgroundColor: v.collectedGarbage ? '#D1FAE5' : '#FEE2E2' }]}>
                  <Feather name={v.collectedGarbage ? 'check' : 'x'} size={10} color={v.collectedGarbage ? '#059669' : '#DC2626'} />
                  <Text style={[styles.garbageText, { color: v.collectedGarbage ? '#059669' : '#DC2626' }]}>
                    {v.collectedGarbage ? 'Collected' : 'Skipped'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          {recentVisits.length === 0 && (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={['#10B981','#059669']} style={styles.emptyIcon}>
                <Feather name="camera-off" size={24} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No visits yet — start scanning!</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 20, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(110,231,183,0.65)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  heroIconWrap: { width: 52, height: 52, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 2 },
  heroStatVal: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  heroStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  scanFrame: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#064E3B' },
  cameraArea: { height: 220, justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#34D399' },
  scanCenter: { alignItems: 'center', gap: 10 },
  scanIconRing: { width: 66, height: 66, borderRadius: 33, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#34D399' },
  scanLabel: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  scanSub: { color: '#6EE7B7', fontSize: 11, fontFamily: 'Inter_400Regular' },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  scanBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  manualCard: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 14 },
  manualHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  manualIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  manualTitle: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  manualSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 13 },
  toggleLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 8 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtnActive: { borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toggleBtnActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  toggleBtn: { borderRadius: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
  toggleBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  submitBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  submitBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', flex: 1 },
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  countText: { fontSize: 12, fontFamily: 'Inter_700Bold' },

  visitCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  visitAccent: { height: 3 },
  visitInner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  visitIcon: { width: 32, height: 32, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  visitReg: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  visitMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  garbagePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  garbageText: { fontSize: 10, fontFamily: 'Inter_700Bold' },

  empty: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});
