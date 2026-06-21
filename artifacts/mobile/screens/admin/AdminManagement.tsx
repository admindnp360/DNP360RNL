import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { PasswordResetRequest, Ward } from '@/types';

type Tab = 'wards' | 'notices' | 'resets';

const TAB_CONFIG = [
  { key: 'wards',   label: 'Wards',   icon: 'map',      grad: ['#4F46E5', '#7C3AED'] as const },
  { key: 'notices', label: 'Notices', icon: 'volume-2', grad: ['#0EA5E9', '#0284C7'] as const },
  { key: 'resets',  label: 'Resets',  icon: 'unlock',   grad: ['#F97316', '#EF4444'] as const },
] as const;

const PRIORITY_CONFIG = {
  high:   { grad: ['#FEF2F2', '#FEE2E2'] as const, text: '#DC2626', badge: '#DC2626', badgeBg: '#FEE2E2' },
  medium: { grad: ['#FFFBEB', '#FEF3C7'] as const, text: '#D97706', badge: '#D97706', badgeBg: '#FEF3C7' },
  low:    { grad: ['#F0FDF4', '#DCFCE7'] as const, text: '#16A34A', badge: '#16A34A', badgeBg: '#DCFCE7' },
};

const WARD_GRADIENTS = [
  ['#4F46E5', '#7C3AED'],
  ['#0EA5E9', '#0284C7'],
  ['#10B981', '#059669'],
  ['#F97316', '#EA580C'],
  ['#EC4899', '#DB2777'],
  ['#8B5CF6', '#7C3AED'],
] as const;

export default function AdminManagement() {
  const {
    wards, notices, houses, users, passwordResetRequests,
    addWard, updateWard, addNotice, deleteNotice,
    assignWorkerToWard, addHouse, updatePasswordResetRequest,
  } = useAppData();
  const { resetUserPassword } = useAuth();
  const colors = useColors();

  const [tab, setTab] = useState<Tab>('wards');
  const [wardSearch, setWardSearch] = useState('');
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [showWardModal, setShowWardModal] = useState(false);
  const [showAddHouseModal, setShowAddHouseModal] = useState(false);
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PasswordResetRequest | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeType, setNoticeType] = useState<'notice' | 'announcement' | 'alert'>('notice');
  const [noticePriority, setNoticePriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [saving, setSaving] = useState(false);
  const [houseOwner, setHouseOwner] = useState('');
  const [houseMobile, setHouseMobile] = useState('');
  const [houseAddress, setHouseAddress] = useState('');

  const safaiKarmis = users.filter(u => u.role === 'safaikarmi' && u.isActive !== false);
  const pendingResets = passwordResetRequests.filter(r => r.status === 'pending').length;
  const allResets = [...passwordResetRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const filteredWards = wards.filter(w => {
    if (!wardSearch) return true;
    const q = wardSearch.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.area.toLowerCase().includes(q) || w.wardNumber.includes(q);
  });

  function openWard(w: Ward) { setSelectedWard(w); setShowWardModal(true); }

  async function handleAssignWorker(workerId: string) {
    if (!selectedWard) return;
    await assignWorkerToWard(selectedWard.id, workerId);
    const updated = wards.find(w => w.id === selectedWard.id);
    if (updated) setSelectedWard({ ...updated, assignedWorkers: [...updated.assignedWorkers.filter(id => id !== workerId), workerId] });
    Alert.alert('✓ Assigned', 'Worker assigned to this ward.');
  }

  async function handleAddHouse() {
    if (!selectedWard) return;
    if (!houseOwner.trim() || !houseAddress.trim()) { Alert.alert('Missing', 'Owner name and address are required.'); return; }
    const regNum = `DNPH${Date.now().toString().slice(-5)}`;
    await addHouse({ registrationNumber: regNum, ownerName: houseOwner.trim(), mobile: houseMobile.trim(), address: houseAddress.trim(), wardId: selectedWard.id, wardNumber: selectedWard.wardNumber, isActive: true });
    await updateWard(selectedWard.id, { totalHouses: selectedWard.totalHouses + 1 });
    setHouseOwner(''); setHouseMobile(''); setHouseAddress('');
    setShowAddHouseModal(false);
    Alert.alert('✓ House Added', `Registration: ${regNum}`);
  }

  async function handleAddNotice() {
    if (!noticeTitle.trim() || !noticeContent.trim()) { Alert.alert('Missing', 'Title and content required.'); return; }
    setSaving(true);
    try {
      await addNotice({ title: noticeTitle.trim(), content: noticeContent.trim(), type: noticeType, priority: noticePriority, isActive: true });
      setShowNoticeModal(false); setNoticeTitle(''); setNoticeContent('');
      Alert.alert('✓ Published', 'Notice is now visible to all citizens.');
    } finally { setSaving(false); }
  }

  function openApproveModal(req: PasswordResetRequest) { setSelectedRequest(req); setTempPassword(''); setShowApproveModal(true); }

  async function handleApproveReset() {
    if (!selectedRequest) return;
    if (tempPassword.trim().length < 6) { Alert.alert('Too Short', 'Password must be at least 6 characters.'); return; }
    setSaving(true);
    try {
      const ok = await resetUserPassword(selectedRequest.email, tempPassword.trim());
      if (!ok) { Alert.alert('Error', 'No user found with this email.'); return; }
      await updatePasswordResetRequest(selectedRequest.id, 'approved');
      setShowApproveModal(false); setSelectedRequest(null); setTempPassword('');
      Alert.alert('✓ Approved', `Password reset for ${selectedRequest.name}.\n\nTemp password: ${tempPassword.trim()}\n\nContact them via registered mobile.`);
    } finally { setSaving(false); }
  }

  async function handleRejectReset(req: PasswordResetRequest) {
    Alert.alert('Reject Request', `Reject reset for ${req.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => updatePasswordResetRequest(req.id, 'rejected') },
    ]);
  }

  const activeTab = TAB_CONFIG.find(t => t.key === tab)!;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>

      {/* Gradient Header */}
      <LinearGradient colors={activeTab.grad} style={styles.header}>
        <Text style={styles.headerTitle}>Management</Text>
        <Text style={styles.headerSub}>
          {tab === 'wards' ? `${wards.length} wards · ${houses.length} houses`
            : tab === 'notices' ? `${notices.length} notices published`
            : `${pendingResets} pending request${pendingResets !== 1 ? 's' : ''}`}
        </Text>
      </LinearGradient>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TAB_CONFIG.map(t => {
          const isActive = tab === t.key;
          const hasBadge = t.key === 'resets' && pendingResets > 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={styles.tabItem}
              onPress={() => setTab(t.key as Tab)}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrap, isActive && { backgroundColor: t.grad[0] + '18' }]}>
                <Feather name={t.icon as any} size={16} color={isActive ? t.grad[0] : colors.mutedForeground} />
                {hasBadge && <View style={styles.tabBadge}><Text style={styles.tabBadgeText}>{pendingResets}</Text></View>}
              </View>
              <Text style={[styles.tabLabel, { color: isActive ? t.grad[0] : colors.mutedForeground, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {t.label}
              </Text>
              {isActive && <View style={[styles.tabUnderline, { backgroundColor: t.grad[0] }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── WARDS TAB ── */}
      {tab === 'wards' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 110 }}>
          <SearchBar value={wardSearch} onChangeText={setWardSearch} placeholder="Search wards…" />

          {filteredWards.map((w, idx) => {
            const wardPending = 0;
            const grad = WARD_GRADIENTS[idx % WARD_GRADIENTS.length];
            const workerCount = w.assignedWorkers.length;
            const wardHouses = houses.filter(h => h.wardId === w.id).length;
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openWard(w)}
                activeOpacity={0.85}
              >
                <View style={styles.wardCardInner}>
                  <LinearGradient colors={grad} style={styles.wardNumBadge}>
                    <Text style={styles.wardNumText}>W{w.wardNumber}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wardName, { color: colors.text }]}>{w.name}</Text>
                    <Text style={[styles.wardArea, { color: colors.mutedForeground }]}>{w.area}</Text>
                  </View>
                  <View style={[styles.manageBtn, { backgroundColor: grad[0] + '15', borderColor: grad[0] + '40' }]}>
                    <Text style={[styles.manageBtnText, { color: grad[0] }]}>Manage</Text>
                    <Feather name="chevron-right" size={12} color={grad[0]} />
                  </View>
                </View>

                <View style={[styles.wardStats, { borderTopColor: colors.border }]}>
                  <View style={styles.wardStatPill}>
                    <View style={[styles.statDot, { backgroundColor: '#4F46E5' }]} />
                    <Feather name="home" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.wardStatText, { color: colors.mutedForeground }]}>{wardHouses} houses</Text>
                  </View>
                  <View style={styles.wardStatPill}>
                    <View style={[styles.statDot, { backgroundColor: workerCount > 0 ? '#10B981' : '#9CA3AF' }]} />
                    <Feather name="user-check" size={11} color={workerCount > 0 ? '#10B981' : colors.mutedForeground} />
                    <Text style={[styles.wardStatText, { color: workerCount > 0 ? '#10B981' : colors.mutedForeground }]}>{workerCount} worker{workerCount !== 1 ? 's' : ''}</Text>
                  </View>
                  {w.totalHouses > 0 && (
                    <View style={styles.wardStatPill}>
                      <Feather name="database" size={11} color={colors.mutedForeground} />
                      <Text style={[styles.wardStatText, { color: colors.mutedForeground }]}>{w.totalHouses} registered</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {filteredWards.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="map" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Wards Found</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── NOTICES TAB ── */}
      {tab === 'notices' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
          <TouchableOpacity style={styles.publishBtn} onPress={() => setShowNoticeModal(true)} activeOpacity={0.85}>
            <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.publishBtnGrad}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.publishBtnText}>Publish New Notice</Text>
            </LinearGradient>
          </TouchableOpacity>

          {notices.map(n => {
            const pc = PRIORITY_CONFIG[n.priority];
            return (
              <View key={n.id} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.noticePriorityBar, { backgroundColor: pc.badge }]} />
                <View style={styles.noticeCardContent}>
                  <View style={styles.noticeTop}>
                    <View style={[styles.priorityChip, { backgroundColor: pc.badgeBg }]}>
                      <Feather name={n.priority === 'high' ? 'alert-triangle' : n.priority === 'medium' ? 'alert-circle' : 'info'} size={10} color={pc.badge} />
                      <Text style={[styles.priorityChipText, { color: pc.badge }]}>{n.priority.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.typeChip, { backgroundColor: colors.surface }]}>
                      <Text style={[styles.typeChipText, { color: colors.mutedForeground }]}>{n.type}</Text>
                    </View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() => Alert.alert('Delete?', n.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteNotice(n.id) }])}
                      style={styles.deleteBtn}
                    >
                      <Feather name="trash-2" size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.noticeTitle, { color: colors.text }]}>{n.title}</Text>
                  <Text style={[styles.noticeContent, { color: colors.mutedForeground }]} numberOfLines={2}>{n.content}</Text>
                  <View style={styles.noticeFooter}>
                    <Feather name="calendar" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.noticeDate, { color: colors.mutedForeground }]}>{n.createdAt}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {notices.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="volume-x" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notices Yet</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Publish your first notice above</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ── RESETS TAB ── */}
      {tab === 'resets' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
          <View style={[styles.infoBox, { backgroundColor: '#FFF7ED', borderColor: '#F9731640' }]}>
            <LinearGradient colors={['#F97316', '#EF4444']} style={styles.infoIcon}>
              <Feather name="unlock" size={14} color="#fff" />
            </LinearGradient>
            <Text style={styles.infoText}>
              Users who forgot their password appear here. Set a temporary password and share it via their registered mobile number.
            </Text>
          </View>

          {pendingResets > 0 && (
            <View style={styles.pendingHeader}>
              <View style={styles.pendingDot} />
              <Text style={styles.pendingLabel}>Pending Review ({pendingResets})</Text>
            </View>
          )}

          {allResets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.emptyIcon}>
                <Feather name="check" size={22} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No password reset requests yet</Text>
            </View>
          ) : (
            allResets.map(req => {
              const isPending = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const statusColor = isApproved ? '#10B981' : isPending ? '#F97316' : '#EF4444';
              const statusBg = isApproved ? '#ECFDF5' : isPending ? '#FFF7ED' : '#FEF2F2';
              return (
                <View key={req.id} style={[styles.resetCard, { backgroundColor: colors.card, borderColor: isPending ? '#F9731640' : colors.border }]}>
                  {isPending && <View style={styles.resetUrgentBar} />}
                  <View style={styles.resetCardInner}>
                    <LinearGradient colors={isPending ? ['#F97316', '#EF4444'] : isApproved ? ['#10B981', '#059669'] : ['#9CA3AF', '#6B7280']} style={styles.resetAvatar}>
                      <Text style={styles.resetAvatarLetter}>{req.name[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.resetName, { color: colors.text }]}>{req.name}</Text>
                      <Text style={[styles.resetEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{req.email}</Text>
                      <View style={styles.resetMeta}>
                        <Feather name="clock" size={10} color={colors.mutedForeground} />
                        <Text style={[styles.resetDate, { color: colors.mutedForeground }]}>{req.requestedAt}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{req.status}</Text>
                    </View>
                  </View>

                  {isPending && (
                    <View style={[styles.resetActions, { borderTopColor: colors.border }]}>
                      <TouchableOpacity style={[styles.rejectBtn, { borderColor: '#EF4444' }]} onPress={() => handleRejectReset(req)} activeOpacity={0.8}>
                        <Feather name="x" size={14} color="#EF4444" />
                        <Text style={[styles.rejectBtnText, { color: '#EF4444' }]}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.approveBtn} onPress={() => openApproveModal(req)} activeOpacity={0.85}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.approveBtnGrad}>
                          <Feather name="check" size={14} color="#fff" />
                          <Text style={styles.approveBtnText}>Approve & Set Password</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── WARD DETAIL MODAL ── */}
      <Modal visible={showWardModal && !!selectedWard} animationType="slide" presentationStyle="pageSheet">
        {selectedWard && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={WARD_GRADIENTS[wards.findIndex(w => w.id === selectedWard.id) % WARD_GRADIENTS.length]} style={styles.modalHdr}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalHdrTitle}>{selectedWard.name}</Text>
                <Text style={styles.modalHdrSub}>{selectedWard.area}</Text>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => setShowWardModal(false)}>
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              <View style={styles.wardStatRow}>
                {[
                  { label: 'Registered', value: houses.filter(h => h.wardId === selectedWard.id).length, icon: 'home', grad: ['#4F46E5', '#7C3AED'] as const },
                  { label: 'Workers', value: selectedWard.assignedWorkers.length, icon: 'user-check', grad: ['#10B981', '#059669'] as const },
                ].map(s => (
                  <LinearGradient key={s.label} colors={s.grad} style={styles.wardStatCard}>
                    <Feather name={s.icon as any} size={20} color="#fff" />
                    <Text style={styles.wardStatVal}>{s.value}</Text>
                    <Text style={styles.wardStatLabel}>{s.label}</Text>
                  </LinearGradient>
                ))}
              </View>

              {/* Registration Progress Bar */}
              {(() => {
                const registeredCount = houses.filter(h => h.wardId === selectedWard.id).length;
                const totalCount = selectedWard.totalHouses;
                const pct = totalCount > 0 ? Math.min(100, Math.round((registeredCount / totalCount) * 100)) : 0;
                const remaining = Math.max(0, totalCount - registeredCount);
                const barColor = pct >= 80 ? '#10B981' : pct >= 40 ? '#F59E0B' : '#EF4444';
                return (
                  <View style={[styles.progressCard, { backgroundColor: '#0A0A2E10', borderColor: '#4F46E530' }]}>
                    <View style={styles.progressHeader}>
                      <View style={styles.progressLabelRow}>
                        <Feather name="bar-chart-2" size={13} color="#4F46E5" />
                        <Text style={styles.progressTitle}>Registration Coverage</Text>
                      </View>
                      <Text style={[styles.progressPct, { color: barColor }]}>{pct}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
                    </View>
                    <View style={styles.progressMeta}>
                      <Text style={styles.progressSub}>
                        <Text style={{ color: '#4F46E5', fontFamily: 'Inter_700Bold' }}>{registeredCount}</Text>
                        {' registered of '}
                        <Text style={{ color: '#6B7280', fontFamily: 'Inter_600SemiBold' }}>{totalCount}</Text>
                        {' municipality total'}
                      </Text>
                      {remaining > 0 && (
                        <View style={styles.remainingChip}>
                          <Text style={styles.remainingText}>{remaining} pending</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}

              <Text style={[styles.sectionLabel, { color: colors.text }]}>Assign Safai Karmi</Text>
              {safaiKarmis.map(sk => {
                const assigned = selectedWard.assignedWorkers.includes(sk.id);
                return (
                  <TouchableOpacity
                    key={sk.id}
                    style={[styles.workerRow, { backgroundColor: colors.card, borderColor: assigned ? '#10B981' : colors.border }]}
                    onPress={() => handleAssignWorker(sk.id)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient colors={assigned ? ['#10B981', '#059669'] : ['#6B7280', '#4B5563']} style={styles.workerAvatar}>
                      <Text style={styles.workerAvatarLetter}>{sk.name[0]}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.workerName, { color: colors.text }]}>{sk.name}</Text>
                      <Text style={[styles.workerId, { color: colors.mutedForeground }]}>{sk.employeeId}</Text>
                    </View>
                    {assigned ? (
                      <View style={styles.assignedChip}>
                        <Feather name="check" size={12} color="#10B981" />
                        <Text style={styles.assignedChipText}>Assigned</Text>
                      </View>
                    ) : (
                      <View style={[styles.assignChip, { backgroundColor: '#4F46E510', borderColor: '#4F46E540' }]}>
                        <Text style={[styles.assignChipText, { color: '#4F46E5' }]}>+ Assign</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {safaiKarmis.length === 0 && <Text style={[styles.emptyText2, { color: colors.mutedForeground }]}>No active Safai Karmis available.</Text>}

              <View style={styles.houseHeader}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Houses in Ward</Text>
                <TouchableOpacity
                  style={styles.addHouseBtn}
                  onPress={() => { setShowWardModal(false); setTimeout(() => setShowAddHouseModal(true), 300); }}
                >
                  <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.addHouseBtnGrad}>
                    <Feather name="plus" size={13} color="#fff" />
                    <Text style={styles.addHouseBtnText}>Add House</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              {houses.filter(h => h.wardId === selectedWard.id).slice(0, 8).map(h => (
                <View key={h.id} style={[styles.houseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.houseIconWrap, { backgroundColor: '#4F46E515' }]}>
                    <Feather name="home" size={14} color="#4F46E5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.houseOwner, { color: colors.text }]}>{h.ownerName}</Text>
                    <Text style={[styles.houseReg, { color: colors.mutedForeground }]}>{h.registrationNumber}</Text>
                  </View>
                </View>
              ))}
              {houses.filter(h => h.wardId === selectedWard.id).length === 0 && (
                <Text style={[styles.emptyText2, { color: colors.mutedForeground }]}>No houses registered yet.</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* ── ADD HOUSE MODAL ── */}
      <Modal visible={showAddHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.modalHdr}>
            <Text style={styles.modalHdrTitle}>Add House</Text>
            <Pressable style={styles.closeBtn} onPress={() => { setShowAddHouseModal(false); setShowWardModal(true); }}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Owner Name *', value: houseOwner, setter: setHouseOwner, key: 'owner', placeholder: 'Full name', caps: 'words', numeric: false },
              { label: 'Mobile Number', value: houseMobile, setter: setHouseMobile, key: 'mobile', placeholder: '10-digit mobile', caps: 'none', numeric: true },
              { label: 'Address *', value: houseAddress, setter: setHouseAddress, key: 'address', placeholder: 'Street, locality…', caps: 'sentences', numeric: false },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  placeholder={f.placeholder} placeholderTextColor={colors.mutedForeground}
                  value={f.value} onChangeText={f.setter}
                  autoCapitalize={f.caps as any} keyboardType={f.numeric ? 'phone-pad' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity onPress={handleAddHouse} activeOpacity={0.85}>
              <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.submitBtn}>
                <Feather name="home" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>Add House</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── NOTICE MODAL ── */}
      <Modal visible={showNoticeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.modalHdr}>
            <Text style={styles.modalHdrTitle}>New Notice</Text>
            <Pressable style={styles.closeBtn} onPress={() => setShowNoticeModal(false)}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.chipRow}>
              {(['notice', 'announcement', 'alert'] as const).map(t => (
                <Pressable key={t} style={[styles.chip, { borderColor: noticeType === t ? '#0EA5E9' : colors.border, backgroundColor: noticeType === t ? '#0EA5E915' : colors.card }]} onPress={() => setNoticeType(t)}>
                  <Text style={[styles.chipText, { color: noticeType === t ? '#0EA5E9' : colors.mutedForeground }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Priority</Text>
            <View style={styles.chipRow}>
              {(['low', 'medium', 'high'] as const).map(p => {
                const pc = PRIORITY_CONFIG[p];
                return (
                  <Pressable key={p} style={[styles.chip, { borderColor: noticePriority === p ? pc.badge : colors.border, backgroundColor: noticePriority === p ? pc.badgeBg : colors.card }]} onPress={() => setNoticePriority(p)}>
                    <Text style={[styles.chipText, { color: noticePriority === p ? pc.badge : colors.mutedForeground }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Title *</Text>
            <TextInput style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="Notice title…" placeholderTextColor={colors.mutedForeground} value={noticeTitle} onChangeText={setNoticeTitle} />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Content *</Text>
            <TextInput style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="Write content…" placeholderTextColor={colors.mutedForeground} multiline numberOfLines={5} value={noticeContent} onChangeText={setNoticeContent} textAlignVertical="top" />
            <TouchableOpacity onPress={handleAddNotice} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
              <LinearGradient colors={['#0EA5E9', '#0284C7']} style={styles.submitBtn}>
                <Feather name="send" size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{saving ? 'Publishing…' : 'Publish Notice'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── APPROVE RESET MODAL ── */}
      <Modal visible={showApproveModal && !!selectedRequest} animationType="slide" presentationStyle="pageSheet">
        {selectedRequest && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={['#F97316', '#EF4444']} style={styles.modalHdr}>
              <Text style={styles.modalHdrTitle}>Approve Reset</Text>
              <Pressable style={styles.closeBtn} onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}>
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
            </LinearGradient>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={[styles.requestPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={['#F97316', '#EF4444']} style={styles.requestAvatar}>
                  <Text style={styles.requestAvatarLetter}>{selectedRequest.name[0]?.toUpperCase()}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.requestName, { color: colors.text }]}>{selectedRequest.name}</Text>
                  <Text style={[styles.requestEmail, { color: colors.mutedForeground }]}>{selectedRequest.email}</Text>
                </View>
              </View>
              <View style={[styles.infoBox, { backgroundColor: '#FFF7ED', borderColor: '#F9731640' }]}>
                <Feather name="info" size={14} color="#F97316" />
                <Text style={[styles.infoText, { color: '#92400E' }]}>Set a temporary password and share it with the user via their registered mobile number. They should change it after logging in.</Text>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Temporary Password *</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Min. 6 characters" placeholderTextColor={colors.mutedForeground}
                value={tempPassword} onChangeText={setTempPassword} autoCapitalize="none"
              />
              <TouchableOpacity onPress={handleApproveReset} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.submitBtn}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>{saving ? 'Processing…' : 'Confirm & Reset Password'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }} activeOpacity={0.8}>
                <Text style={[styles.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 16, paddingBottom: 22, paddingHorizontal: 20 },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 3 },

  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 10, gap: 3, position: 'relative' },
  tabIconWrap: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  tabBadge: { position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  tabLabel: { fontSize: 11 },
  tabUnderline: { position: 'absolute', bottom: 0, left: 12, right: 12, height: 2.5, borderTopLeftRadius: 2, borderTopRightRadius: 2 },

  wardCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  wardCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  wardNumBadge: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  wardNumText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  wardName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  wardArea: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  manageBtn: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  manageBtnText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  wardStats: { flexDirection: 'row', gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  wardStatPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  wardStatText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  publishBtn: { borderRadius: 14, overflow: 'hidden' },
  publishBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  publishBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  noticeCard: { borderRadius: 14, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  noticePriorityBar: { width: 4 },
  noticeCardContent: { flex: 1, padding: 13, gap: 6 },
  noticeTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  priorityChipText: { fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  typeChipText: { fontSize: 9, fontFamily: 'Inter_500Medium' },
  deleteBtn: { padding: 4 },
  noticeTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  noticeContent: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  noticeFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  noticeDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },

  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'flex-start' },
  infoIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18, color: '#92400E' },
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97316' },
  pendingLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#F97316' },

  resetCard: { borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  resetUrgentBar: { height: 3, backgroundColor: '#F97316' },
  resetCardInner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  resetAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  resetAvatarLetter: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  resetName: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  resetEmail: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resetMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  resetDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  resetActions: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 12, borderWidth: 1.5, paddingVertical: 10 },
  rejectBtnText: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  approveBtn: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  approveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  approveBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },

  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_700Bold' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  modalHdrTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalHdrSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  wardStatRow: { flexDirection: 'row', gap: 12 },
  wardStatCard: { flex: 1, borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  wardStatVal: { color: '#fff', fontSize: 28, fontFamily: 'Inter_700Bold' },
  wardStatLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  sectionLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 12 },
  workerAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  workerAvatarLetter: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  workerName: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  workerId: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  assignedChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: '#DCFCE7' },
  assignedChipText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#10B981' },
  assignChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  assignChipText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  emptyText2: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 12 },

  houseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addHouseBtn: { borderRadius: 10, overflow: 'hidden' },
  addHouseBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7 },
  addHouseBtnText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  houseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  houseIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  houseOwner: { fontSize: 13, fontFamily: 'Inter_700Bold' },
  houseReg: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },

  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: 'Inter_400Regular' },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 120 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  chipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  submitBtn: { borderRadius: 14, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },

  progressCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTitle: { fontSize: 13, fontFamily: 'Inter_700Bold', color: '#4F46E5' },
  progressPct: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  progressFill: { height: 10, borderRadius: 5 },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6B7280', flex: 1 },
  remainingChip: { backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  remainingText: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#D97706' },

  requestPreview: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  requestAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  requestAvatarLetter: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  requestName: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  requestEmail: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
