import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';
import type { SecretKey } from '@/types';

const ROLE_LABELS: Record<string, string> = { safaikarmi: 'Safai Karmi', official: 'Official' };
const ROLE_GRADS: Record<string, readonly [string, string]> = {
  safaikarmi: ['#10B981', '#059669'],
  official:   ['#F59E0B', '#EF4444'],
};
const ROLE_ICONS: Record<string, string> = { safaikarmi: 'trash-2', official: 'briefcase' };

const GEN_ROLES: { role: SecretKey['role']; label: string; desc: string; icon: string; grad: readonly [string, string] }[] = [
  { role: 'safaikarmi', label: 'Safai Karmi', desc: 'SK-XXXX-XXXX',  icon: 'trash-2',   grad: ['#10B981', '#059669'] },
  { role: 'official',   label: 'Official',    desc: 'OF-XXXX-XXXX',  icon: 'briefcase', grad: ['#F59E0B', '#EF4444'] },
];

export default function AdminKeys() {
  const { secretKeys, users, addSecretKey, toggleSecretKey, deleteSecretKey } = useAppData();
  const colors = useColors();
  const [generating, setGenerating] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<SecretKey | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredKeys = secretKeys.filter(k => {
    if (filter === 'active') return k.isActive;
    if (filter === 'inactive') return !k.isActive;
    return true;
  }).filter(k => k.role === 'safaikarmi' || k.role === 'official');

  const activeCount   = secretKeys.filter(k => k.isActive && (k.role === 'safaikarmi' || k.role === 'official')).length;
  const revokedCount  = secretKeys.filter(k => !k.isActive && (k.role === 'safaikarmi' || k.role === 'official')).length;
  const usedCount     = secretKeys.filter(k => !!k.usedBy && (k.role === 'safaikarmi' || k.role === 'official')).length;
  const totalCount    = secretKeys.filter(k => k.role === 'safaikarmi' || k.role === 'official').length;

  const latestKey = secretKeys.filter(k => k.role === 'safaikarmi' || k.role === 'official').length > 0
    ? [...secretKeys.filter(k => k.role === 'safaikarmi' || k.role === 'official')].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : null;

  const getUserName = (userId?: string) => userId ? users.find(u => u.id === userId)?.name ?? null : null;

  async function handleGenerate(role: SecretKey['role']) {
    setGenerating(role);
    try { setNewKey(await addSecretKey(role)); setCodeCopied(false); } finally { setGenerating(null); }
  }

  async function handleCopyCode(code: string) {
    await Clipboard.setStringAsync(code);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  }

  const { showAlert } = useAlert();

  function handleToggle(k: SecretKey) {
    showAlert(k.isActive ? 'Revoke Key?' : 'Activate Key?', `Code: ${k.code}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: k.isActive ? 'Revoke' : 'Activate', onPress: () => toggleSecretKey(k.id) },
    ], 'warning');
  }

  function handleDelete(k: SecretKey) {
    showAlert('Delete Key?', `Permanently delete ${k.code}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSecretKey(k.id) },
    ], 'error');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050818' }} edges={['top']}>
      {/* ── HERO ── */}
      <LinearGradient colors={['#0A0018', '#1A0050', '#2D007A']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Secret Keys</Text>
            <Text style={styles.heroSub}>Access code management</Text>
          </View>
          <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.heroKeyIcon}>
            <Feather name="key" size={22} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: 'Total',   value: totalCount,   grad: ['#6366F1','#8B5CF6'] as const },
            { label: 'Active',  value: activeCount,  grad: ['#10B981','#059669'] as const },
            { label: 'Revoked', value: revokedCount, grad: ['#EF4444','#DC2626'] as const },
            { label: 'Used',    value: usedCount,    grad: ['#F59E0B','#EF4444'] as const },
          ].map(s => (
            <LinearGradient key={s.label} colors={s.grad} style={styles.heroStat}>
              <Text style={styles.heroStatVal}>{s.value}</Text>
              <Text style={styles.heroStatLbl}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── GENERATE CARD ── */}
        <LinearGradient colors={['#0D1B4B', '#1A237E']} style={styles.genCard}>
          <View style={styles.genCardTop}>
            <LinearGradient colors={['rgba(255,255,255,0.15)','rgba(255,255,255,0.05)']} style={styles.genCardIcon}>
              <Feather name="plus-circle" size={18} color="#fff" />
            </LinearGradient>
            <View>
              <Text style={styles.genCardTitle}>Generate New Key</Text>
              <Text style={styles.genCardSub}>Unique access code for registration</Text>
            </View>
          </View>

          {/* Two buttons side-by-side with new design */}
          <View style={styles.genBtnRow}>
            {GEN_ROLES.map(item => {
              const isThis = generating === item.role;
              const isOther = generating !== null && generating !== item.role;
              return (
                <TouchableOpacity
                  key={item.role}
                  style={[styles.genBtnWrap, isOther && { opacity: 0.38 }]}
                  onPress={() => handleGenerate(item.role)}
                  disabled={generating !== null}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={item.grad} style={styles.genBtn}>
                    <View style={styles.genBtnIconWrap}>
                      {isThis
                        ? <Feather name="loader" size={16} color="#fff" />
                        : <Feather name={item.icon as any} size={16} color="#fff" />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.genBtnLabel}>{item.label}</Text>
                      <Text style={styles.genBtnDesc}>{item.desc}</Text>
                    </View>
                    {!isThis && (
                      <View style={styles.genPlusCircle}>
                        <Feather name="plus" size={14} color="rgba(255,255,255,0.9)" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Latest generated key */}
          {latestKey && (
            <View style={styles.latestWrap}>
              <View style={styles.latestHdrRow}>
                <Feather name="clock" size={11} color="rgba(255,255,255,0.5)" />
                <Text style={styles.latestHdrText}>Latest Generated</Text>
                <View style={[styles.latestRolePill, { backgroundColor: (ROLE_GRADS[latestKey.role]?.[0] ?? '#7C3AED') + '35' }]}>
                  <Text style={[styles.latestRolePillTxt, { color: ROLE_GRADS[latestKey.role]?.[0] ?? '#7C3AED' }]}>
                    {ROLE_LABELS[latestKey.role] ?? latestKey.role}
                  </Text>
                </View>
              </View>
              <TouchableOpacity activeOpacity={0.8} onPress={() => handleCopyCode(latestKey.code)} style={{ width: '100%' }}>
                <LinearGradient
                  colors={(ROLE_GRADS[latestKey.role] ?? ['#6366F1','#8B5CF6']) as readonly [string, string]}
                  style={styles.latestCodeBar}
                >
                  <Feather name="key" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.latestCodeTxt} numberOfLines={1}>{latestKey.code}</Text>
                  <Feather name="copy" size={14} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>

        {/* ── FILTER TABS ── */}
        <View style={styles.filterRow}>
          {([
            { key: 'all',      label: `All (${totalCount})`,        icon: 'list' },
            { key: 'active',   label: `Active (${activeCount})`,    icon: 'check-circle' },
            { key: 'inactive', label: `Revoked (${revokedCount})`,  icon: 'x-circle' },
          ] as const).map(f => {
            const active = filter === f.key;
            return active ? (
              <LinearGradient key={f.key} colors={['#6366F1','#8B5CF6']} style={styles.filterActive}>
                <Feather name={f.icon} size={11} color="#fff" />
                <Text style={styles.filterActiveText}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <Pressable key={f.key} style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setFilter(f.key)}>
                <Feather name={f.icon} size={11} color={colors.mutedForeground} />
                <Text style={[styles.filterBtnText, { color: colors.mutedForeground }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── KEYS LIST ── */}
        {filteredKeys.map(k => {
          const grad = ROLE_GRADS[k.role] ?? ['#6366F1', '#8B5CF6'] as const;
          const assignedName = getUserName(k.usedBy);
          return (
            <View key={k.id} style={[styles.keyCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: k.isActive ? 1 : 0.7 }]}>
              <LinearGradient colors={grad} style={styles.keyAccent} />
              <View style={styles.keyInner}>

                {/* Row 1: Role icon + Code + Status */}
                <View style={styles.keyRow1}>
                  <LinearGradient colors={grad} style={styles.keyRoleIcon}>
                    <Feather name={ROLE_ICONS[k.role] as any} size={11} color="#fff" />
                  </LinearGradient>
                  <Feather name="key" size={12} color={grad[0]} />
                  <Text style={[styles.codeText, { color: grad[0], flex: 1 }]} numberOfLines={1}>{k.code}</Text>
                  {k.usedBy && (
                    <View style={[styles.usedChip, { backgroundColor: grad[0] + '18' }]}>
                      <Feather name="user-check" size={8} color={grad[0]} />
                      <Text style={[styles.usedChipText, { color: grad[0] }]}>Used</Text>
                    </View>
                  )}
                  <View style={[styles.keyStatusPill, { backgroundColor: k.isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                    <View style={[styles.keyStatusDot, { backgroundColor: k.isActive ? '#10B981' : '#EF4444' }]} />
                    <Text style={[styles.keyStatusText, { color: k.isActive ? '#059669' : '#DC2626' }]}>{k.isActive ? 'Active' : 'Revoked'}</Text>
                  </View>
                </View>

                {/* Row 2: Role badge + date + assigned user */}
                <View style={styles.keyRow2}>
                  <LinearGradient colors={grad} style={styles.keyRoleBadge}>
                    <Text style={styles.keyRoleBadgeText}>{ROLE_LABELS[k.role] ?? k.role}</Text>
                  </LinearGradient>
                  <Text style={[styles.keyDate, { color: colors.mutedForeground }]}>{k.createdAt}</Text>
                  {assignedName && (
                    <>
                      <View style={styles.keyDot} />
                      <LinearGradient colors={grad} style={styles.assignedAvatar}>
                        <Text style={styles.assignedAvatarLetter}>{assignedName[0].toUpperCase()}</Text>
                      </LinearGradient>
                      <Text style={[styles.assignedName, { color: colors.text }]} numberOfLines={1}>{assignedName}</Text>
                      <Feather name="check-circle" size={11} color="#10B981" />
                    </>
                  )}
                </View>

                {/* Row 3: Actions */}
                <View style={styles.keyActions}>
                  <TouchableOpacity
                    style={[styles.keyActionBtn, { flex: 1, backgroundColor: k.isActive ? '#FEF3C7' : '#D1FAE5' }]}
                    onPress={() => handleToggle(k)} activeOpacity={0.8}
                  >
                    <Feather name={k.isActive ? 'lock' : 'unlock'} size={12} color={k.isActive ? '#D97706' : '#059669'} />
                    <Text style={[styles.keyActionText, { color: k.isActive ? '#D97706' : '#059669' }]}>{k.isActive ? 'Revoke' : 'Activate'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.keyActionIconBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => handleDelete(k)} activeOpacity={0.8}>
                    <Feather name="trash-2" size={13} color="#EF4444" />
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          );
        })}

        {filteredKeys.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.emptyIcon}>
              <Feather name="key" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No keys found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Generate a key above to get started</Text>
          </View>
        )}
      </ScrollView>

      {/* ── NEW KEY CELEBRATION MODAL ── */}
      <Modal visible={!!newKey} animationType="slide" transparent>
        <View style={styles.overlay}>
          <LinearGradient colors={['#050818', '#0D1B4B']} style={styles.newKeySheet}>
            <View style={styles.celebRing}>
              <LinearGradient colors={(ROLE_GRADS[newKey?.role ?? 'safaikarmi']) as readonly [string, string]} style={styles.celebGrad}>
                <Feather name="key" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.celebTitle}>Key Generated!</Text>
            <Text style={[styles.celebRole, { color: 'rgba(255,255,255,0.65)' }]}>
              {ROLE_LABELS[newKey?.role ?? 'safaikarmi'] ?? 'Staff'} Access Code
            </Text>

            {/* Tap-to-copy single-line code */}
            <TouchableOpacity activeOpacity={0.85} onPress={() => newKey && handleCopyCode(newKey.code)} style={{ width: '100%' }}>
              <LinearGradient
                colors={codeCopied ? ['#10B981','#059669'] : (ROLE_GRADS[newKey?.role ?? 'safaikarmi'] as readonly [string, string])}
                style={styles.codeReveal}
              >
                <Feather name={codeCopied ? 'check' : 'key'} size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.codeRevealText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {codeCopied ? 'Copied to Clipboard!' : newKey?.code}
                </Text>
                {!codeCopied && <Feather name="copy" size={16} color="rgba(255,255,255,0.7)" />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={[styles.celebNote, { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.1)' }]}>
              <Feather name="alert-circle" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={styles.celebNoteText}>Share this code securely. It will not be shown again after closing.</Text>
            </View>

            <TouchableOpacity onPress={() => { setNewKey(null); setCodeCopied(false); }} activeOpacity={0.85}>
              <LinearGradient colors={(ROLE_GRADS[newKey?.role ?? 'safaikarmi']) as readonly [string, string]} style={styles.celebDoneBtn}>
                <Text style={styles.celebDoneText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 22, gap: 16 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  heroKeyIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  heroStats: { flexDirection: 'row', gap: 8 },
  heroStat: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', gap: 2 },
  heroStatVal: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  heroStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  genCard: { borderRadius: 20, padding: 18, gap: 16 },
  genCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  genCardIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  genCardTitle: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
  genCardSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },

  genBtnRow: { flexDirection: 'row', gap: 10 },
  genBtnWrap: { flex: 1 },
  genBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  genBtnIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  genBtnLabel: { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },
  genBtnDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: 'Inter_400Regular', marginTop: 1 },
  genPlusCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  latestWrap: { gap: 8 },
  latestHdrRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  latestHdrText: { color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Inter_500Medium', flex: 1 },
  latestRolePill: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  latestRolePillTxt: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  latestCodeBar: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  latestCodeTxt: { flex: 1, color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold', letterSpacing: 2 },

  filterRow: { flexDirection: 'row', gap: 8 },
  filterActive: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: 10 },
  filterActiveText: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold' },
  filterBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, paddingVertical: 10, borderWidth: 1 },
  filterBtnText: { fontSize: 11, fontFamily: 'Inter_500Medium' },

  keyCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  keyAccent: { height: 3 },
  keyInner: { padding: 9, gap: 6 },

  keyRow1: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  keyRoleIcon: { width: 24, height: 24, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  codeText: { fontSize: 15, fontFamily: 'Inter_700Bold', letterSpacing: 1.5 },
  usedChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 99 },
  usedChipText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  keyStatusPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  keyStatusDot: { width: 5, height: 5, borderRadius: 3 },
  keyStatusText: { fontSize: 9, fontFamily: 'Inter_700Bold' },

  keyRow2: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' },
  keyRoleBadge: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2, alignSelf: 'flex-start' },
  keyRoleBadgeText: { color: '#fff', fontSize: 8, fontFamily: 'Inter_700Bold' },
  keyDate: { fontSize: 9, fontFamily: 'Inter_400Regular' },
  keyDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#9CA3AF' },
  assignedAvatar: { width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  assignedAvatarLetter: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  assignedName: { fontSize: 10, fontFamily: 'Inter_600SemiBold', flexShrink: 1 },

  keyActions: { flexDirection: 'row', gap: 6 },
  keyActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 8, paddingVertical: 6 },
  keyActionText: { fontSize: 11, fontFamily: 'Inter_700Bold' },
  keyActionIconBtn: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  empty: { borderRadius: 16, padding: 40, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  emptySub: { fontSize: 12, fontFamily: 'Inter_400Regular' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  newKeySheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, gap: 16, alignItems: 'center' },
  celebRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  celebGrad: { width: 74, height: 74, borderRadius: 37, justifyContent: 'center', alignItems: 'center' },
  celebTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  celebRole: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  codeReveal: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18, alignSelf: 'stretch', justifyContent: 'center' },
  codeRevealText: { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: 3, flex: 1, textAlign: 'center' },
  celebNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, alignSelf: 'stretch' },
  celebNoteText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
  celebDoneBtn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 60 },
  celebDoneText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },
});
