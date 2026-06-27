import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

type Phase = 'scanning' | 'confirm' | 'saving' | 'done' | 'notfound';

interface HouseResult {
  id: string;
  reg: string;
  owner: string;
  address: string;
  wardId: string;
}

// ── Late detection: scans after LATE_CUTOFF_HOUR (IST) are flagged Late ──
const LATE_CUTOFF_HOUR = 11; // 11 AM IST

function getISTHour(): number {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  return istNow.getHours();
}

function isLateVisit(): boolean {
  return getISTHour() >= LATE_CUTOFF_HOUR;
}

export function CameraScanner({ visible, onClose }: Props) {
  const { user } = useAuth();
  const { houses, getHouseByRegistration, addHouseVisit } = useAppData();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [house, setHouse] = useState<HouseResult | null>(null);
  const [garbageCollected, setGarbageCollected] = useState(true);
  const [lastScannedData, setLastScannedData] = useState('');
  const hasScanned = useRef(false);

  function nowTime() {
    const n = new Date();
    return `${n.getHours().toString().padStart(2, '0')}:${n.getMinutes().toString().padStart(2, '0')}`;
  }

  const handleBarcodeScan = useCallback(({ data }: { data: string }) => {
    if (hasScanned.current || data === lastScannedData) return;
    hasScanned.current = true;
    setLastScannedData(data);

    const reg = data.trim().toUpperCase();
    const found =
      getHouseByRegistration(reg) ??
      houses.find(h => h.registrationNumber.toUpperCase() === reg);

    if (found) {
      setHouse({ id: found.id, reg: found.registrationNumber, owner: found.ownerName, address: found.address, wardId: found.wardId });
      setGarbageCollected(true);
      setPhase('confirm');
    } else {
      setPhase('notfound');
      setTimeout(() => {
        setPhase('scanning');
        hasScanned.current = false;
      }, 2200);
    }
  }, [houses, getHouseByRegistration, lastScannedData]);

  async function confirmVisit() {
    if (!house) return;
    setPhase('saving');
    const found = getHouseByRegistration(house.reg) ?? houses.find(h => h.id === house.id);
    const late = garbageCollected && isLateVisit();
    if (found) {
      await addHouseVisit({
        houseId: found.id,
        houseRegistrationNumber: found.registrationNumber,
        ownerName: found.ownerName,
        address: found.address,
        workerId: user?.id ?? '',
        workerName: user?.name,
        wardId: found.wardId,
        collectedGarbage: garbageCollected,
        isLate: late,
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: nowTime(),
        status: 'visited',
      });
    }
    setPhase('done');
    setTimeout(() => {
      handleClose();
    }, 1600);
  }

  function resumeScanning() {
    setPhase('scanning');
    setHouse(null);
    hasScanned.current = false;
  }

  function handleClose() {
    setPhase('scanning');
    setHouse(null);
    hasScanned.current = false;
    setLastScannedData('');
    onClose();
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.root}>

        {/* ── Camera view ── */}
        {phase === 'scanning' || phase === 'notfound' ? (
          <>
            {!permission ? (
              <View style={styles.centered}>
                <ActivityIndicator color="#34D399" size="large" />
                <Text style={styles.permTxt}>Checking camera permission…</Text>
              </View>
            ) : !permission.granted ? (
              <View style={styles.centered}>
                <LinearGradient colors={['#10B981','#059669']} style={styles.permIcon}>
                  <Feather name="camera-off" size={32} color="#fff" />
                </LinearGradient>
                <Text style={styles.permTitle}>Camera Access Required</Text>
                <Text style={styles.permBody}>
                  Allow camera access to scan house QR codes.
                </Text>
                <TouchableOpacity onPress={requestPermission} activeOpacity={0.85} style={styles.permBtn}>
                  <LinearGradient colors={['#10B981','#059669']} style={styles.permBtnGrad}>
                    <Feather name="camera" size={16} color="#fff" />
                    <Text style={styles.permBtnTxt}>Allow Camera</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleClose} style={styles.cancelLink}>
                  <Text style={styles.cancelLinkTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScan}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                />

                {/* Overlay */}
                <View style={styles.overlay}>
                  {/* Top bar */}
                  <View style={styles.topBar}>
                    <Pressable onPress={handleClose} style={styles.closeBtn}>
                      <Feather name="x" size={22} color="#fff" />
                    </Pressable>
                    <Text style={styles.topTitle}>Scan House QR</Text>
                    <View style={{ width: 40 }} />
                  </View>

                  {/* Viewfinder */}
                  <View style={styles.viewfinderWrap}>
                    <View style={styles.viewfinder}>
                      {/* Corner brackets */}
                      <View style={[styles.corner, styles.cornerTL]} />
                      <View style={[styles.corner, styles.cornerTR]} />
                      <View style={[styles.corner, styles.cornerBL]} />
                      <View style={[styles.corner, styles.cornerBR]} />

                      {phase === 'notfound' && (
                        <View style={styles.notFoundBadge}>
                          <Feather name="alert-circle" size={18} color="#EF4444" />
                          <Text style={styles.notFoundTxt}>House not found</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Bottom hint */}
                  <View style={styles.bottomHint}>
                    <View style={styles.hintPill}>
                      <View style={styles.hintDot} />
                      <Text style={styles.hintTxt}>
                        {phase === 'notfound'
                          ? 'QR not recognised — try again'
                          : 'Point camera at house QR code'}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            )}
          </>
        ) : phase === 'confirm' && house ? (
          /* ── Confirm modal ── */
          <View style={styles.confirmRoot}>
            <LinearGradient colors={['#010D06','#052E1A']} style={StyleSheet.absoluteFill} />

            <View style={styles.confirmHandle} />
            <Feather name="check-circle" size={18} color="#34D399" style={{ alignSelf: 'center' }} />
            <Text style={styles.confirmTitle}>House Scanned</Text>

            {/* Late scan warning */}
            {isLateVisit() && (
              <View style={styles.lateBadge}>
                <Feather name="clock" size={13} color="#FBBF24" />
                <Text style={styles.lateBadgeTxt}>
                  Late Scan — after {LATE_CUTOFF_HOUR}:00 AM (will be marked L)
                </Text>
              </View>
            )}

            <LinearGradient colors={['rgba(52,211,153,0.15)','rgba(16,185,129,0.04)']}
              style={styles.houseCard}>
              <LinearGradient colors={['#10B981','#059669']} style={styles.houseAvatar}>
                <Feather name="home" size={22} color="#fff" />
              </LinearGradient>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.houseReg}>{house.reg}</Text>
                <Text style={styles.houseOwner}>{house.owner}</Text>
                <Text style={styles.houseAddr}>{house.address}</Text>
              </View>
            </LinearGradient>

            <Text style={styles.toggleLabel}>Was garbage collected?</Text>
            <View style={styles.toggleRow}>
              <TouchableOpacity onPress={() => setGarbageCollected(true)} style={{ flex: 1 }} activeOpacity={0.85}>
                {garbageCollected ? (
                  <LinearGradient colors={['#10B981','#059669']} style={styles.toggleActive}>
                    <Feather name="check" size={15} color="#fff" />
                    <Text style={styles.toggleActiveTxt}>Yes, Collected</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.toggleOff}>
                    <Feather name="check" size={15} color="#4B5563" />
                    <Text style={styles.toggleOffTxt}>Yes, Collected</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setGarbageCollected(false)} style={{ flex: 1 }} activeOpacity={0.85}>
                {!garbageCollected ? (
                  <LinearGradient colors={['#EF4444','#DC2626']} style={styles.toggleActive}>
                    <Feather name="x" size={15} color="#fff" />
                    <Text style={styles.toggleActiveTxt}>Not Collected</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.toggleOff}>
                    <Feather name="x" size={15} color="#4B5563" />
                    <Text style={styles.toggleOffTxt}>Not Collected</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={confirmVisit} activeOpacity={0.87}>
              <LinearGradient colors={['#10B981','#059669']} style={styles.confirmBtn}>
                <Feather name="check-circle" size={17} color="#fff" />
                <Text style={styles.confirmBtnTxt}>Confirm Visit</Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.confirmActions}>
              <TouchableOpacity onPress={resumeScanning} style={styles.rescanBtn} activeOpacity={0.85}>
                <Feather name="camera" size={14} color="#34D399" />
                <Text style={styles.rescanTxt}>Scan Another</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleClose} style={styles.cancelBtn} activeOpacity={0.85}>
                <Text style={styles.cancelBtnTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : phase === 'saving' ? (
          <View style={[styles.centered, { backgroundColor: '#010D06' }]}>
            <ActivityIndicator color="#34D399" size="large" />
            <Text style={styles.savingTxt}>Recording visit…</Text>
          </View>
        ) : (
          /* done */
          <View style={[styles.centered, { backgroundColor: '#010D06' }]}>
            <LinearGradient colors={['#10B981','#059669']} style={styles.doneIcon}>
              <Feather name="check" size={40} color="#fff" />
            </LinearGradient>
            <Text style={styles.doneTxt}>Visit Recorded!</Text>
            <Text style={styles.doneHouse}>{house?.owner}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const CORNER_SIZE = 26;
const CORNER_THICK = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 32, backgroundColor: '#010D06' },

  /* Permission */
  permIcon: { width: 80, height: 80, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  permTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  permBody: { color: '#6B7280', fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
  permBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 8 },
  permBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 28 },
  permBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  permTxt: { color: '#6B7280', fontSize: 14, fontFamily: 'Inter_400Regular' },
  cancelLink: { paddingVertical: 12 },
  cancelLinkTxt: { color: '#4B5563', fontSize: 14, fontFamily: 'Inter_500Medium' },

  /* Camera overlay */
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  topTitle: { color: '#fff', fontSize: 17, fontFamily: 'Inter_700Bold' },

  viewfinderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  viewfinder: {
    width: 260, height: 260,
    justifyContent: 'center', alignItems: 'center',
  },
  corner: {
    position: 'absolute', width: CORNER_SIZE, height: CORNER_SIZE,
    borderColor: '#34D399',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICK, borderLeftWidth: CORNER_THICK },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICK, borderRightWidth: CORNER_THICK },

  notFoundBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 99,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.4)',
  },
  notFoundTxt: { color: '#F87171', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  bottomHint: { paddingBottom: 60, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingTop: 16 },
  hintPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 99,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  hintDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#34D399' },
  hintTxt: { color: '#fff', fontSize: 13, fontFamily: 'Inter_500Medium' },

  /* Confirm screen */
  confirmRoot: {
    flex: 1, padding: 24, paddingTop: 40, gap: 16,
    justifyContent: 'center',
  },
  confirmHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 8 },
  confirmTitle: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  lateBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'center',
    backgroundColor: 'rgba(251,191,36,0.12)', borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)', paddingHorizontal: 12, paddingVertical: 7,
  },
  lateBadgeTxt: { color: '#FBBF24', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  houseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  houseAvatar: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  houseReg: { color: '#34D399', fontSize: 14, fontFamily: 'Inter_700Bold' },
  houseOwner: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  houseAddr: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'Inter_400Regular' },

  toggleLabel: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 10 },
  toggleActive: { borderRadius: 13, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  toggleActiveTxt: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  toggleOff: { borderRadius: 13, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toggleOffTxt: { color: '#4B5563', fontSize: 13, fontFamily: 'Inter_600SemiBold' },

  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 16,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  confirmBtnTxt: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  confirmActions: { flexDirection: 'row', gap: 10 },
  rescanBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 12, paddingVertical: 12,
    backgroundColor: 'rgba(52,211,153,0.1)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.25)',
  },
  rescanTxt: { color: '#34D399', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cancelBtnTxt: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'Inter_500Medium' },

  /* Saving / Done */
  savingTxt: { color: '#6EE7B7', fontSize: 14, fontFamily: 'Inter_500Medium' },
  doneIcon: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20, elevation: 16 },
  doneTxt: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold' },
  doneHouse: { color: '#34D399', fontSize: 16, fontFamily: 'Inter_500Medium' },
});
