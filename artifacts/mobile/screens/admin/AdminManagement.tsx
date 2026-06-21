import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { PasswordResetRequest, Ward } from '@/types';

type Tab = 'wards' | 'notices' | 'resets';

export default function AdminManagement() {
  const { wards, notices, houses, users, passwordResetRequests, addWard, updateWard, addNotice, deleteNotice, assignWorkerToWard, addHouse, updatePasswordResetRequest } = useAppData();
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
  const pendingResets = passwordResetRequests.filter(r => r.status === 'pending');
  const allResets = [...passwordResetRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));

  const filteredWards = wards.filter(w => {
    if (!wardSearch) return true;
    const q = wardSearch.toLowerCase();
    return w.name.toLowerCase().includes(q) || w.area.toLowerCase().includes(q) || w.wardNumber.includes(q);
  });

  function openWard(w: Ward) {
    setSelectedWard(w);
    setShowWardModal(true);
  }

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
    await addHouse({
      registrationNumber: regNum,
      ownerName: houseOwner.trim(),
      mobile: houseMobile.trim(),
      address: houseAddress.trim(),
      wardId: selectedWard.id,
      wardNumber: selectedWard.wardNumber,
      isActive: true,
    });
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
      setShowNoticeModal(false);
      setNoticeTitle(''); setNoticeContent('');
      Alert.alert('✓ Notice Published', 'Visible to all citizens.');
    } finally { setSaving(false); }
  }

  function openApproveModal(request: PasswordResetRequest) {
    setSelectedRequest(request);
    setTempPassword('');
    setShowApproveModal(true);
  }

  async function handleApproveReset() {
    if (!selectedRequest) return;
    if (tempPassword.trim().length < 6) {
      Alert.alert('Too Short', 'Temporary password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    try {
      const success = await resetUserPassword(selectedRequest.email, tempPassword.trim());
      if (!success) {
        Alert.alert('Error', 'Could not find a user with this email address.');
        return;
      }
      await updatePasswordResetRequest(selectedRequest.id, 'approved');
      setShowApproveModal(false);
      setSelectedRequest(null);
      setTempPassword('');
      Alert.alert(
        '✓ Approved',
        `Password reset for ${selectedRequest.name}.\n\nTemporary password: ${tempPassword.trim()}\n\nPlease inform the user via their registered mobile number.`
      );
    } finally { setSaving(false); }
  }

  async function handleRejectReset(request: PasswordResetRequest) {
    Alert.alert(
      'Reject Request',
      `Reject password reset request from ${request.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject', style: 'destructive',
          onPress: async () => {
            await updatePasswordResetRequest(request.id, 'rejected');
          },
        },
      ]
    );
  }

  function getStatusColor(status: PasswordResetRequest['status']) {
    if (status === 'approved') return colors.resolved;
    if (status === 'rejected') return colors.destructive;
    return colors.official;
  }

  function getStatusBg(status: PasswordResetRequest['status']) {
    if (status === 'approved') return colors.resolvedBg;
    if (status === 'rejected') return '#FDECEA';
    return colors.officialBg;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Management</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {([
          { key: 'wards', label: 'Wards', icon: 'map' },
          { key: 'notices', label: 'Notices', icon: 'volume-2' },
          { key: 'resets', label: `Resets${pendingResets.length > 0 ? ` (${pendingResets.length})` : ''}`, icon: 'unlock' },
        ] as const).map(t => (
          <Pressable
            key={t.key}
            style={[
              styles.tabBtn,
              {
                backgroundColor: tab === t.key ? colors.adminColor : colors.card,
                borderColor: t.key === 'resets' && pendingResets.length > 0 && tab !== 'resets'
                  ? colors.destructive
                  : tab === t.key ? colors.adminColor : colors.border,
              },
            ]}
            onPress={() => setTab(t.key)}
          >
            <Feather name={t.icon as any} size={14} color={tab === t.key ? '#fff' : t.key === 'resets' && pendingResets.length > 0 ? colors.destructive : colors.mutedForeground} />
            <Text style={[styles.tabBtnText, { color: tab === t.key ? '#fff' : t.key === 'resets' && pendingResets.length > 0 ? colors.destructive : colors.mutedForeground }]}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {tab === 'wards' ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          <SearchBar value={wardSearch} onChangeText={setWardSearch} placeholder="Search wards…" />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap a ward to assign workers or add houses</Text>

          <View style={styles.wardGrid}>
            {filteredWards.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[styles.wardCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => openWard(w)}
                activeOpacity={0.82}
              >
                <View style={styles.wardCardTop}>
                  <View style={[styles.wardNum, { backgroundColor: colors.adminBg }]}>
                    <Text style={[styles.wardNumText, { color: colors.adminColor }]}>W{w.wardNumber}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.wardName, { color: colors.text }]} numberOfLines={2}>{w.name}</Text>
                <Text style={[styles.wardArea, { color: colors.mutedForeground }]} numberOfLines={1}>{w.area}</Text>
                <View style={styles.wardMeta}>
                  <View style={styles.wardMetaItem}>
                    <Feather name="home" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.wardMetaText, { color: colors.mutedForeground }]}>{w.totalHouses}</Text>
                  </View>
                  <View style={styles.wardMetaItem}>
                    <Feather name="user-check" size={10} color={w.assignedWorkers.length > 0 ? colors.safaikarmi : colors.mutedForeground} />
                    <Text style={[styles.wardMetaText, { color: w.assignedWorkers.length > 0 ? colors.safaikarmi : colors.mutedForeground }]}>{w.assignedWorkers.length}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : tab === 'notices' ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.adminColor }]} onPress={() => setShowNoticeModal(true)} activeOpacity={0.85}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Publish New Notice</Text>
          </TouchableOpacity>
          {notices.map(n => (
            <View key={n.id} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: n.isActive ? 1 : 0.6 }]}>
              <View style={styles.noticeTop}>
                <View style={[styles.priorityBadge, { backgroundColor: n.priority === 'high' ? '#FDECEA' : n.priority === 'medium' ? '#FFF3E0' : colors.surface }]}>
                  <Text style={[styles.priorityText, { color: n.priority === 'high' ? colors.destructive : n.priority === 'medium' ? colors.official : colors.mutedForeground }]}>
                    {n.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => Alert.alert('Delete Notice?', n.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteNotice(n.id) }])}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </Pressable>
              </View>
              <Text style={[styles.noticeTitle, { color: colors.text }]}>{n.title}</Text>
              <Text style={[styles.noticeContent, { color: colors.mutedForeground }]} numberOfLines={2}>{n.content}</Text>
              <Text style={[styles.noticeDate, { color: colors.mutedForeground }]}>{n.createdAt}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 100 }}>
          <View style={[styles.infoBox, { backgroundColor: colors.adminBg, borderColor: colors.adminColor + '40' }]}>
            <Feather name="info" size={14} color={colors.adminColor} />
            <Text style={[styles.infoText, { color: colors.adminColor }]}>
              Users who forgot their password appear here. Set a temporary password and inform them via mobile.
            </Text>
          </View>

          {pendingResets.length > 0 && (
            <View style={[styles.sectionHeader]}>
              <Feather name="clock" size={14} color={colors.destructive} />
              <Text style={[styles.sectionLabel, { color: colors.destructive }]}>Pending ({pendingResets.length})</Text>
            </View>
          )}

          {allResets.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="check-circle" size={36} color={colors.resolved} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No password reset requests yet.</Text>
            </View>
          ) : (
            allResets.map(req => (
              <View key={req.id} style={[styles.resetCard, { backgroundColor: colors.card, borderColor: req.status === 'pending' ? colors.destructive + '60' : colors.border }]}>
                <View style={styles.resetTop}>
                  <View style={[styles.resetAvatar, { backgroundColor: colors.adminBg }]}>
                    <Text style={[styles.resetAvatarLetter, { color: colors.adminColor }]}>{req.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resetName, { color: colors.text }]}>{req.name}</Text>
                    <Text style={[styles.resetEmail, { color: colors.mutedForeground }]}>{req.email}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBg(req.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(req.status) }]}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.resetMeta, { borderTopColor: colors.border }]}>
                  <Feather name="calendar" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.resetDate, { color: colors.mutedForeground }]}>Requested: {req.requestedAt}</Text>
                </View>

                {req.status === 'pending' && (
                  <View style={styles.resetActions}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { borderColor: colors.destructive }]}
                      onPress={() => handleRejectReset(req)}
                      activeOpacity={0.8}
                    >
                      <Feather name="x" size={13} color={colors.destructive} />
                      <Text style={[styles.rejectBtnText, { color: colors.destructive }]}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: colors.resolved }]}
                      onPress={() => openApproveModal(req)}
                      activeOpacity={0.85}
                    >
                      <Feather name="check" size={13} color="#fff" />
                      <Text style={styles.approveBtnText}>Approve & Set Password</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Ward Detail Modal */}
      <Modal visible={showWardModal && !!selectedWard} animationType="slide" presentationStyle="pageSheet">
        {selectedWard && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedWard.name}</Text>
                <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{selectedWard.area}</Text>
              </View>
              <Pressable onPress={() => setShowWardModal(false)}><Feather name="x" size={22} color={colors.text} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
              <View style={styles.wardStatRow}>
                {[{ label: 'Houses', value: selectedWard.totalHouses, icon: 'home', color: colors.citizen }, { label: 'Workers', value: selectedWard.assignedWorkers.length, icon: 'user-check', color: colors.safaikarmi }].map(s => (
                  <View key={s.label} style={[styles.wardStatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Feather name={s.icon as any} size={20} color={s.color} />
                    <Text style={[styles.wardStatVal, { color: s.color }]}>{s.value}</Text>
                    <Text style={[styles.wardStatLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.text }]}>Assign Safai Karmi</Text>
              {safaiKarmis.map(sk => {
                const assigned = selectedWard.assignedWorkers.includes(sk.id);
                return (
                  <TouchableOpacity
                    key={sk.id}
                    style={[styles.workerRow, { backgroundColor: colors.card, borderColor: assigned ? colors.safaikarmi : colors.border }]}
                    onPress={() => handleAssignWorker(sk.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.workerAvatar, { backgroundColor: colors.safaikarmiBg }]}>
                      <Text style={[styles.workerAvatarLetter, { color: colors.safaikarmi }]}>{sk.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.workerName, { color: colors.text }]}>{sk.name}</Text>
                      <Text style={[styles.workerId, { color: colors.mutedForeground }]}>{sk.employeeId}</Text>
                    </View>
                    {assigned ? (
                      <View style={[styles.assignedBadge, { backgroundColor: colors.safaikarmiBg }]}>
                        <Feather name="check" size={12} color={colors.safaikarmi} />
                        <Text style={[styles.assignedBadgeText, { color: colors.safaikarmi }]}>Assigned</Text>
                      </View>
                    ) : (
                      <View style={[styles.assignBtn, { backgroundColor: colors.adminBg }]}>
                        <Text style={[styles.assignBtnText, { color: colors.adminColor }]}>Assign</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
              {safaiKarmis.length === 0 && (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active Safai Karmis available.</Text>
              )}

              <View style={styles.addHouseHeader}>
                <Text style={[styles.sectionLabel, { color: colors.text }]}>Houses in Ward</Text>
                <TouchableOpacity style={[styles.miniAddBtn, { backgroundColor: colors.adminBg }]} onPress={() => { setShowWardModal(false); setTimeout(() => setShowAddHouseModal(true), 300); }}>
                  <Feather name="plus" size={13} color={colors.adminColor} />
                  <Text style={[styles.miniAddBtnText, { color: colors.adminColor }]}>Add House</Text>
                </TouchableOpacity>
              </View>
              {houses.filter(h => h.wardId === selectedWard.id).slice(0, 8).map(h => (
                <View key={h.id} style={[styles.houseRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.houseIcon, { backgroundColor: colors.citizenBg }]}>
                    <Feather name="home" size={14} color={colors.citizen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.houseOwner, { color: colors.text }]}>{h.ownerName}</Text>
                    <Text style={[styles.houseReg, { color: colors.mutedForeground }]}>{h.registrationNumber}</Text>
                  </View>
                </View>
              ))}
              {houses.filter(h => h.wardId === selectedWard.id).length === 0 && (
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No houses registered yet.</Text>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Add House Modal */}
      <Modal visible={showAddHouseModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add House</Text>
            <Pressable onPress={() => { setShowAddHouseModal(false); setShowWardModal(true); }}><Feather name="x" size={22} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            {[
              { label: 'Owner Name *', value: houseOwner, setter: setHouseOwner, key: 'owner', placeholder: 'Full name', caps: 'words' },
              { label: 'Mobile Number', value: houseMobile, setter: setHouseMobile, key: 'mobile', placeholder: '10-digit mobile', caps: 'none', numeric: true },
              { label: 'Address *', value: houseAddress, setter: setHouseAddress, key: 'address', placeholder: 'Street, locality…', caps: 'sentences' },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  placeholder={f.placeholder}
                  placeholderTextColor={colors.mutedForeground}
                  value={f.value}
                  onChangeText={f.setter}
                  autoCapitalize={f.caps as any}
                  keyboardType={f.numeric ? 'phone-pad' : 'default'}
                />
              </View>
            ))}
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.adminColor }]} onPress={handleAddHouse} activeOpacity={0.85}>
              <Feather name="home" size={16} color="#fff" />
              <Text style={styles.addBtnText}>Add House</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Notice Modal */}
      <Modal visible={showNoticeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Notice</Text>
            <Pressable onPress={() => setShowNoticeModal(false)}><Feather name="x" size={22} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Type</Text>
            <View style={styles.typeRow}>
              {(['notice', 'announcement', 'alert'] as const).map(t => (
                <Pressable key={t} style={[styles.typeBtn, { borderColor: noticeType === t ? colors.adminColor : colors.border, backgroundColor: noticeType === t ? colors.adminBg : colors.card }]} onPress={() => setNoticeType(t)}>
                  <Text style={[styles.typeBtnText, { color: noticeType === t ? colors.adminColor : colors.mutedForeground }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Priority</Text>
            <View style={styles.typeRow}>
              {(['low', 'medium', 'high'] as const).map(p => (
                <Pressable key={p} style={[styles.typeBtn, { borderColor: noticePriority === p ? colors.official : colors.border, backgroundColor: noticePriority === p ? colors.officialBg : colors.card }]} onPress={() => setNoticePriority(p)}>
                  <Text style={[styles.typeBtnText, { color: noticePriority === p ? colors.official : colors.mutedForeground }]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Title *</Text>
            <TextInput style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="Notice title…" placeholderTextColor={colors.mutedForeground} value={noticeTitle} onChangeText={setNoticeTitle} />
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Content *</Text>
            <TextInput style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholder="Write content…" placeholderTextColor={colors.mutedForeground} multiline numberOfLines={5} value={noticeContent} onChangeText={setNoticeContent} textAlignVertical="top" />
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.adminColor }, saving && { opacity: 0.6 }]} onPress={handleAddNotice} disabled={saving} activeOpacity={0.85}>
              <Feather name="send" size={16} color="#fff" />
              <Text style={styles.addBtnText}>{saving ? 'Publishing…' : 'Publish Notice'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Approve Password Reset Modal */}
      <Modal visible={showApproveModal && !!selectedRequest} animationType="slide" presentationStyle="pageSheet">
        {selectedRequest && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Approve Reset</Text>
              <Pressable onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}>
                <Feather name="x" size={22} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={[styles.infoBox, { backgroundColor: colors.resolvedBg, borderColor: colors.resolved + '50' }]}>
                <Feather name="user" size={14} color={colors.resolved} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.infoText, { color: colors.text, fontFamily: 'Inter_600SemiBold' }]}>{selectedRequest.name}</Text>
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{selectedRequest.email}</Text>
                </View>
              </View>

              <View style={[styles.infoBox, { backgroundColor: colors.adminBg, borderColor: colors.adminColor + '40' }]}>
                <Feather name="info" size={14} color={colors.adminColor} />
                <Text style={[styles.infoText, { color: colors.adminColor }]}>
                  Set a temporary password for this user. Share it with them via their registered mobile number. They should change it after logging in.
                </Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Temporary Password *</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                placeholder="Min. 6 characters"
                placeholderTextColor={colors.mutedForeground}
                value={tempPassword}
                onChangeText={setTempPassword}
                autoCapitalize="none"
                secureTextEntry={false}
              />

              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.resolved }, saving && { opacity: 0.6 }]}
                onPress={handleApproveReset}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.addBtnText}>{saving ? 'Processing…' : 'Confirm & Reset Password'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                activeOpacity={0.8}
              >
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
  header: { padding: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 22, fontFamily: 'Inter_700Bold' },
  tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  tabBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: -4 },
  wardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  wardCard: { width: '47%', flexGrow: 1, borderRadius: 14, padding: 14, borderWidth: 1, gap: 6 },
  wardCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  wardNum: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  wardNumText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  wardName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', lineHeight: 18 },
  wardArea: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  wardMeta: { flexDirection: 'row', gap: 10, marginTop: 4 },
  wardMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  wardMetaText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  noticeCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 6 },
  noticeTop: { flexDirection: 'row', alignItems: 'center' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  priorityText: { fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  noticeTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  noticeContent: { fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  noticeDate: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 14 },
  addBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  cancelBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  wardStatRow: { flexDirection: 'row', gap: 10 },
  wardStatCard: { flex: 1, borderRadius: 12, padding: 16, borderWidth: 1, alignItems: 'center', gap: 6 },
  wardStatVal: { fontSize: 26, fontFamily: 'Inter_700Bold' },
  wardStatLabel: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionLabel: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  workerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 12 },
  workerAvatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  workerAvatarLetter: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  workerName: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  workerId: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  assignedBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  assignBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99 },
  assignBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  emptyText: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center', paddingVertical: 12 },
  addHouseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99 },
  miniAddBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  houseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 10, borderWidth: 1, padding: 12 },
  houseIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  houseOwner: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  houseReg: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldInput: { borderRadius: 12, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: 'Inter_400Regular' },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 120 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  infoBox: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18 },
  resetCard: { borderRadius: 14, padding: 14, borderWidth: 1.5, gap: 10 },
  resetTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resetAvatar: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  resetAvatarLetter: { fontSize: 18, fontFamily: 'Inter_700Bold' },
  resetName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  resetEmail: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  resetMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 10 },
  resetDate: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  resetActions: { flexDirection: 'row', gap: 10 },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1.5, paddingVertical: 10 },
  rejectBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  approveBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  approveBtnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
});
