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
import { useColors } from '@/hooks/useColors';
import type { User, UserRole } from '@/types';

const ROLE_LABELS: Record<string, string> = { safaikarmi: 'Safai Karmi', official: 'Official', admin: 'Admin' };
const ROLE_GRADS: Record<string, readonly [string, string]> = {
  safaikarmi: ['#10B981', '#059669'],
  official:   ['#F59E0B', '#EF4444'],
  admin:      ['#6366F1', '#8B5CF6'],
};
const ROLE_FILTERS: ('all' | Exclude<UserRole, 'citizen'>)[] = ['all', 'safaikarmi', 'official', 'admin'];

export default function AdminUsers() {
  const { users, updateUser, deleteUser } = useAppData();
  const colors = useColors();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Exclude<UserRole, 'citizen'>>('all');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const nonCitizens = users.filter(u => u.role !== 'citizen');
  const filtered = nonCitizens.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.employeeId ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeCt  = nonCitizens.filter(u => u.isActive).length;
  const frozenCt  = nonCitizens.filter(u => !u.isActive).length;

  function handleFreeze(u: User) {
    Alert.alert(u.isActive ? 'Freeze Account?' : 'Unfreeze Account?', `${u.name}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: u.isActive ? 'Freeze' : 'Unfreeze', onPress: () => updateUser(u.id, { isActive: !u.isActive }) },
    ]);
  }
  function handleEdit(u: User) { setEditUser(u); setEditName(u.name); setEditMobile(u.mobile ?? ''); setEditEmail(u.email); }
  function handleSaveEdit() {
    if (!editUser) return;
    updateUser(editUser.id, { name: editName.trim(), mobile: editMobile.trim(), email: editEmail.trim() });
    setEditUser(null); Alert.alert('✓ Updated', 'User details saved.');
  }
  function handleDelete(u: User) {
    Alert.alert('Delete User?', `Permanently remove ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser(u.id) },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050818' }} edges={['top']}>
      {/* ── HERO HEADER ── */}
      <LinearGradient colors={['#0D1B4B', '#1A237E', '#283593']} style={styles.heroHdr}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>User Management</Text>
            <Text style={styles.heroSub}>Staff accounts & permissions</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeNum}>{nonCitizens.length}</Text>
            <Text style={styles.heroBadgeLbl}>Staff</Text>
          </View>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: 'Active', value: activeCt, grad: ['#10B981','#059669'] as const, icon: 'user-check' },
            { label: 'Frozen', value: frozenCt, grad: ['#EF4444','#DC2626'] as const, icon: 'lock' },
            { label: 'Workers', value: nonCitizens.filter(u=>u.role==='safaikarmi').length, grad: ['#10B981','#059669'] as const, icon: 'trash-2' },
            { label: 'Officials', value: nonCitizens.filter(u=>u.role==='official').length, grad: ['#F59E0B','#EF4444'] as const, icon: 'briefcase' },
          ].map(s => (
            <View key={s.label} style={styles.heroStat}>
              <LinearGradient colors={s.grad} style={styles.heroStatIcon}>
                <Feather name={s.icon as any} size={11} color="#fff" />
              </LinearGradient>
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── SEARCH & FILTERS ── */}
      <View style={[styles.controls, { backgroundColor: colors.background }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, email, ID…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {ROLE_FILTERS.map(r => {
            const active = roleFilter === r;
            const grad = r !== 'all' ? ROLE_GRADS[r] : ['#6366F1', '#8B5CF6'] as const;
            return active ? (
              <LinearGradient key={r} colors={grad} style={styles.filterChipActive}>
                <Text style={styles.filterChipActiveText}>{r === 'all' ? 'All Staff' : ROLE_LABELS[r]}</Text>
              </LinearGradient>
            ) : (
              <Pressable key={r} style={[styles.filterChip, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setRoleFilter(r)}>
                <Text style={[styles.filterChipText, { color: colors.mutedForeground }]}>{r === 'all' ? 'All Staff' : ROLE_LABELS[r]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── USERS LIST ── */}
      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}
        style={{ backgroundColor: colors.background }}>
        {filtered.map(u => {
          const grad = ROLE_GRADS[u.role] ?? (['#6366F1', '#8B5CF6'] as const);
          return (
            <View key={u.id} style={[styles.userCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: u.isActive ? 1 : 0.7 }]}>
              {/* Card gradient accent bar */}
              <LinearGradient colors={grad} style={styles.accentBar} />

              <View style={styles.cardInner}>
                {/* Top row */}
                <View style={styles.cardTop}>
                  <LinearGradient colors={grad} style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{u.name[0].toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{u.name}</Text>
                      <LinearGradient colors={grad} style={styles.roleBadge}>
                        <Text style={styles.roleText}>{ROLE_LABELS[u.role]}</Text>
                      </LinearGradient>
                    </View>
                    <Text style={[styles.userEmail, { color: colors.mutedForeground }]} numberOfLines={1}>{u.email}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: u.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                    <View style={[styles.statusDot, { backgroundColor: u.isActive ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.statusText, { color: u.isActive ? '#059669' : '#DC2626' }]}>{u.isActive ? 'Active' : 'Frozen'}</Text>
                  </View>
                </View>

                {/* Meta row */}
                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  {u.employeeId && (
                    <View style={styles.metaChip}>
                      <Feather name="briefcase" size={9} color={colors.mutedForeground} />
                      <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{u.employeeId}</Text>
                    </View>
                  )}
                  <View style={styles.metaChip}>
                    <Feather name="calendar" size={9} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{u.createdAt}</Text>
                  </View>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: u.isActive ? '#FEF3C7' : '#D1FAE5', flex: 1 }]} onPress={() => handleFreeze(u)} activeOpacity={0.8}>
                    <Feather name={u.isActive ? 'lock' : 'unlock'} size={14} color={u.isActive ? '#D97706' : '#059669'} />
                    <Text style={[styles.actionBtnText, { color: u.isActive ? '#D97706' : '#059669' }]}>{u.isActive ? 'Freeze' : 'Unfreeze'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#EEF2FF', flex: 1 }]} onPress={() => handleEdit(u)} activeOpacity={0.8}>
                    <Feather name="edit-2" size={14} color="#6366F1" />
                    <Text style={[styles.actionBtnText, { color: '#6366F1' }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionIconBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(u)} activeOpacity={0.8}>
                    <Feather name="trash-2" size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyIcon}>
              <Feather name="users" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No staff users found</Text>
          </View>
        )}
      </ScrollView>

      {/* ── EDIT MODAL ── */}
      <Modal visible={!!editUser} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#0D1B4B', '#1A237E']} style={styles.modalHdr}>
            <View>
              <Text style={styles.modalHdrTitle}>Edit User</Text>
              {editUser && <Text style={styles.modalHdrSub}>{ROLE_LABELS[editUser.role]}</Text>}
            </View>
            <Pressable style={styles.modalClose} onPress={() => setEditUser(null)}>
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            {editUser && (
              <View style={[styles.editPreview, { backgroundColor: '#6366F110', borderColor: '#6366F130' }]}>
                <LinearGradient colors={ROLE_GRADS[editUser.role] ?? ['#6366F1','#8B5CF6']} style={styles.editAvatar}>
                  <Text style={styles.editAvatarLetter}>{(editName[0] ?? '?').toUpperCase()}</Text>
                </LinearGradient>
                <View>
                  <Text style={[styles.editPreviewName, { color: colors.text }]}>{editName || editUser.name}</Text>
                  <Text style={styles.editPreviewRole}>{ROLE_LABELS[editUser.role]}</Text>
                </View>
              </View>
            )}
            {[
              { label: 'Full Name', value: editName,   set: setEditName,   icon: 'user',       key: 'name',   caps: 'words'     as const },
              { label: 'Email',     value: editEmail,  set: setEditEmail,  icon: 'mail',       key: 'email',  caps: 'none'      as const },
              { label: 'Mobile',    value: editMobile, set: setEditMobile, icon: 'smartphone', key: 'mobile', caps: 'none'      as const, num: true },
            ].map(f => (
              <View key={f.key}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>{f.label}</Text>
                <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name={f.icon as any} size={16} color="#6366F1" />
                  <TextInput style={[styles.fieldInput, { color: colors.text }]} value={f.value} onChangeText={f.set} autoCapitalize={f.caps} keyboardType={(f as any).num ? 'phone-pad' : 'default'} placeholder={f.label} placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={handleSaveEdit} activeOpacity={0.85}>
              <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.saveBtn}>
                <Feather name="check" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroHdr: { padding: 20, paddingBottom: 18, gap: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  heroBadge: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  heroBadgeNum: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  heroBadgeLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Inter_500Medium' },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  heroStatIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  heroStatVal: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  heroStatLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: 'Inter_500Medium' },

  controls: { padding: 14, paddingBottom: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, marginRight: 8 },
  filterChipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  filterChipActive: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, marginRight: 8 },
  filterChipActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  userCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  accentBar: { height: 4 },
  cardInner: { padding: 14, gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  userName: { fontSize: 14, fontFamily: 'Inter_700Bold', flex: 1 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  roleText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  userEmail: { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 8, borderTopWidth: 1 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 10, fontFamily: 'Inter_400Regular' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 9 },
  actionBtnText: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  actionIconBtn: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  empty: { borderRadius: 16, padding: 40, borderWidth: 1, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  modalHdrTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalHdrSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  editPreview: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  editAvatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  editAvatarLetter: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold' },
  editPreviewName: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  editPreviewRole: { fontSize: 12, fontFamily: 'Inter_500Medium', color: '#6366F1', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 6 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  saveBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  saveBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
