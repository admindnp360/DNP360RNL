import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import type { PasswordResetRequest, SecretKey } from '@/types';
import SuperAdminImport from './SuperAdminImport';

// ── Design tokens ────────────────────────────────────────────────────
const BG       = '#060B18';
const GLASS    = 'rgba(255,255,255,0.06)';
const GLASS_HI = 'rgba(255,255,255,0.10)';
const GLASS_BD = 'rgba(255,255,255,0.10)';
const TEXT     = '#F0F4FF';
const MUTED    = 'rgba(255,255,255,0.42)';

// Role colour system
const SK_GRAD: readonly [string, string]  = ['#10B981', '#059669'];
const OFF_GRAD: readonly [string, string] = ['#F59E0B', '#EF4444'];
const ROLE_GRADS: Record<string, readonly [string, string]> = {
  safaikarmi: SK_GRAD,
  official:   OFF_GRAD,
  admin:      ['#6366F1', '#8B5CF6'],
};
const ROLE_COLOR: Record<string, string> = {
  safaikarmi: '#34D399',
  official:   '#FCD34D',
};

const PRIORITY = {
  high:   { color: '#FB7185', bg: 'rgba(251,113,133,0.12)', border: 'rgba(251,113,133,0.28)' },
  medium: { color: '#FCD34D', bg: 'rgba(252,211,77,0.10)',  border: 'rgba(252,211,77,0.28)'  },
  low:    { color: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.28)'  },
};

type Tab = 'genkey' | 'notices' | 'resets' | 'import';

const TAB_CFG = [
  { key: 'notices', label: 'Notices',  icon: 'volume-2',    color: '#22D3EE', grad: ['#0EA5E9','#0284C7'] as const },
  { key: 'resets',  label: 'Resets',   icon: 'unlock',      color: '#FB7185', grad: ['#F97316','#EF4444'] as const },
  { key: 'genkey',  label: 'Gen Key',  icon: 'key',         color: '#C084FC', grad: ['#7C3AED','#4F46E5'] as const },
  { key: 'import',  label: 'Import',   icon: 'upload-cloud',color: '#34D399', grad: ['#10B981','#059669'] as const },
] as const;

// ─────────────────────────────────────────────────────────────────────

export default function AdminManagement() {
  const {
    notices, passwordResetRequests, secretKeys,
    addNotice, deleteNotice, updatePasswordResetRequest, addSecretKey,
  } = useAppData();
  const { resetUserPassword } = useAuth();
  const { showAlert } = useAlert();

  const [tab, setTab]                 = useState<Tab>('notices');
  const [generating, setGenerating]   = useState<string | null>(null);
  const [newKey, setNewKey]           = useState<SecretKey | null>(null);
  const [copiedId, setCopiedId]       = useState<string | null>(null);

  const [showNoticeModal, setShowNoticeModal]     = useState(false);
  const [showApproveModal, setShowApproveModal]   = useState(false);
  const [selectedRequest, setSelectedRequest]     = useState<PasswordResetRequest | null>(null);
  const [tempPassword, setTempPassword]           = useState('');
  const [adminNote, setAdminNote]                 = useState('');
  const [noticeTitle, setNoticeTitle]             = useState('');
  const [noticeContent, setNoticeContent]         = useState('');
  const [noticeType, setNoticeType]               = useState<'notice'|'announcement'|'alert'>('notice');
  const [noticePriority, setNoticePriority]       = useState<'low'|'medium'|'high'>('medium');
  const [saving, setSaving]                       = useState(false);

  const pendingResets = passwordResetRequests.filter(r => r.status === 'pending').length;
  const allResets     = [...passwordResetRequests].sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const activeTab     = TAB_CFG.find(t => t.key === tab)!;

  // keys split by role
  const skKeys   = secretKeys.filter(k => k.role === 'safaikarmi');
  const offKeys  = secretKeys.filter(k => k.role === 'official');
  const unusedSK  = skKeys.filter(k => k.isActive && !k.usedBy);
  const unusedOff = offKeys.filter(k => k.isActive && !k.usedBy);
  const allUnused = [...secretKeys]
    .filter(k => k.isActive && !k.usedBy)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  async function handleGenerate(role: SecretKey['role']) {
    setGenerating(role);
    try { setNewKey(await addSecretKey(role)); }
    finally { setGenerating(null); }
  }

  async function handleCopy(code: string, id: string) {
    await Clipboard.setStringAsync(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleAddNotice() {
    if (!noticeTitle.trim() || !noticeContent.trim()) {
      showAlert('Missing', 'Title and content required.', undefined, 'warning'); return;
    }
    setSaving(true);
    try {
      await addNotice({ title: noticeTitle.trim(), content: noticeContent.trim(), type: noticeType, priority: noticePriority, isActive: true });
      setShowNoticeModal(false); setNoticeTitle(''); setNoticeContent('');
      showAlert('Published', 'Notice is now visible to all citizens.', undefined, 'success');
    } finally { setSaving(false); }
  }

  function openApproveModal(req: PasswordResetRequest) {
    setSelectedRequest(req); setTempPassword(''); setAdminNote(''); setShowApproveModal(true);
  }

  async function handleApproveReset() {
    if (!selectedRequest) return;
    if (tempPassword.trim().length < 6) { showAlert('Too Short', 'Password must be at least 6 characters.', undefined, 'warning'); return; }
    setSaving(true);
    try {
      const ok = await resetUserPassword(selectedRequest.email, tempPassword.trim());
      if (!ok) { showAlert('Error', 'No user found with this email.', undefined, 'error'); return; }
      await updatePasswordResetRequest(selectedRequest.id, 'approved', adminNote.trim() || undefined);
      setShowApproveModal(false); setSelectedRequest(null); setTempPassword(''); setAdminNote('');
      showAlert('Approved', `Password reset for ${selectedRequest.name}.`, undefined, 'success');
    } finally { setSaving(false); }
  }

  async function handleRejectReset(req: PasswordResetRequest) {
    showAlert('Reject Request', `Reject reset for ${req.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: () => updatePasswordResetRequest(req.id, 'rejected') },
    ], 'warning');
  }

  // ─── Key card for horizontal list ──────────────────────────────────
  function KeyCard({ k }: { k: SecretKey }) {
    const grad  = ROLE_GRADS[k.role] ?? SK_GRAD;
    const color = ROLE_COLOR[k.role] ?? '#34D399';
    const isCopied = copiedId === k.id;
    const label = k.role === 'safaikarmi' ? 'Safai Karmi' : 'Official';
    const used  = !!k.usedBy;
    return (
      <TouchableOpacity
        onPress={() => !used && handleCopy(k.code, k.id)}
        activeOpacity={used ? 1 : 0.8}
        style={[
          s.keyCard,
          { borderColor: used ? GLASS_BD : color + '45' },
          used && { opacity: 0.5 },
        ]}
      >
        <LinearGradient colors={used ? ['#1E293B','#0F172A'] : [grad[0]+'22', grad[1]+'10']} style={StyleSheet.absoluteFill} />

        {/* top row: role pill + status */}
        <View style={s.keyCardTop}>
          <View style={[s.keyRolePill, { backgroundColor: color + '22', borderColor: color + '35' }]}>
            <View style={[s.keyRoleDot, { backgroundColor: color }]} />
            <Text style={[s.keyRoleTxt, { color }]}>{label}</Text>
          </View>
          {used
            ? <View style={s.usedPill}><Text style={s.usedTxt}>Used</Text></View>
            : <View style={s.freePill}><Text style={s.freeTxt}>Unused</Text></View>
          }
        </View>

        {/* code */}
        <LinearGradient
          colors={isCopied ? ['#10B981','#059669'] : grad}
          style={s.keyCodeBox}
        >
          <Feather name={isCopied ? 'check' : 'key'} size={10} color="rgba(255,255,255,0.8)" />
          <Text style={s.keyCodeTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {isCopied ? 'Copied!' : k.code}
          </Text>
          {!isCopied && !used && <Feather name="copy" size={9} color="rgba(255,255,255,0.65)" />}
        </LinearGradient>

        {/* date */}
        <View style={s.keyCardBottom}>
          <Feather name="clock" size={9} color={MUTED} />
          <Text style={s.keyDate}>{k.createdAt}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ─── Generate row ───────────────────────────────────────────────────
  function GenRow({
    role, label, subtitle, icon, grad, color,
  }: {
    role: SecretKey['role'];
    label: string;
    subtitle: string;
    icon: string;
    grad: readonly [string, string];
    color: string;
  }) {
    const isThis  = generating === role;
    const isOther = generating !== null && generating !== role;
    const unused  = secretKeys.filter(k => k.role === role && k.isActive && !k.usedBy).length;
    return (
      <TouchableOpacity
        onPress={() => handleGenerate(role)}
        disabled={generating !== null}
        activeOpacity={0.85}
        style={[s.genRow, { borderColor: color + '40', opacity: isOther ? 0.35 : 1 }]}
      >
        <LinearGradient colors={[grad[0]+'1A', grad[1]+'0D']} style={StyleSheet.absoluteFill} />

        {/* left icon */}
        <LinearGradient colors={grad} style={s.genRowIcon}>
          <Feather name={isThis ? 'loader' : icon as any} size={20} color="#fff" />
        </LinearGradient>

        {/* middle text */}
        <View style={{ flex: 1 }}>
          <Text style={s.genRowLabel}>{label}</Text>
          <Text style={s.genRowSub}>{subtitle}</Text>
        </View>

        {/* unused badge */}
        <View style={[s.unusedBadge, { backgroundColor: color + '20', borderColor: color + '40' }]}>
          <Text style={[s.unusedBadgeTxt, { color }]}>{unused}</Text>
          <Text style={[s.unusedBadgeLabel, { color }]}>free</Text>
        </View>

        {/* generate button */}
        <LinearGradient colors={grad} style={s.genPill}>
          {isThis
            ? <Feather name="loader" size={13} color="#fff" />
            : <>
                <Feather name="plus" size={13} color="#fff" />
                <Text style={s.genPillTxt}>Generate</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>

      {/* ── HEADER ── */}
      <LinearGradient colors={['#0F1A3E', '#0A1128', BG]} style={s.header}>
        <View style={[s.orb, { top: -20, right: -10, backgroundColor: activeTab.color + '18', width: 120, height: 120 }]} />
        <Text style={s.headerTitle}>Management</Text>
        <Text style={s.headerSub}>
          {tab === 'notices' ? `${notices.length} notices · ${notices.filter(n => n.isActive).length} active`
            : tab === 'resets' ? `${pendingResets} pending reset${pendingResets !== 1 ? 's' : ''}`
            : tab === 'import' ? 'Bulk import via Excel or CSV'
            : `${allUnused.length} unused key${allUnused.length !== 1 ? 's' : ''} · ${secretKeys.length} total`}
        </Text>
      </LinearGradient>

      {/* ── TAB BAR ── */}
      <View style={s.tabBar}>
        {TAB_CFG.map(t => {
          const isActive = tab === t.key;
          const hasBadge = t.key === 'resets' && pendingResets > 0;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabPill, isActive && { backgroundColor: t.color + '18', borderColor: t.color + '40' }]}
              onPress={() => setTab(t.key as Tab)}
              activeOpacity={0.7}
            >
              <View style={{ position: 'relative' }}>
                <Feather name={t.icon as any} size={15} color={isActive ? t.color : MUTED} />
                {hasBadge && (
                  <View style={s.tabBadge}><Text style={s.tabBadgeTxt}>{pendingResets}</Text></View>
                )}
              </View>
              <Text style={[s.tabLabel, { color: isActive ? t.color : MUTED, fontFamily: isActive ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════════════════════════════════════════════════════
           GEN KEY TAB  ──  full redesign
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'genkey' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110, gap: 20, paddingTop: 8 }}
        >
          {/* ── STATS ROW ── */}
          <View style={s.statsRow}>
            {[
              { label: 'Total',     value: secretKeys.length,                                     color: '#C084FC', icon: 'key'        },
              { label: 'Unused',    value: allUnused.length,                                      color: '#34D399', icon: 'unlock'     },
              { label: 'SK Keys',   value: unusedSK.length,                                       color: '#34D399', icon: 'trash-2'    },
              { label: 'Off. Keys', value: unusedOff.length,                                      color: '#FCD34D', icon: 'briefcase'  },
            ].map(stat => (
              <View key={stat.label} style={[s.statCell, { borderColor: stat.color + '30', backgroundColor: stat.color + '10' }]}>
                <Feather name={stat.icon as any} size={13} color={stat.color} />
                <Text style={[s.statVal, { color: stat.color }]}>{stat.value}</Text>
                <Text style={s.statLbl}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* ── GENERATE SECTION ── */}
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            {/* Section header */}
            <View style={s.sectionHdr}>
              <LinearGradient colors={['#7C3AED','#4F46E5']} style={s.sectionHdrIcon}>
                <Feather name="zap" size={12} color="#fff" />
              </LinearGradient>
              <Text style={s.sectionHdrTxt}>Generate New Key</Text>
            </View>

            {/* Row 1 — Safai Karmi */}
            <GenRow
              role="safaikarmi"
              label="Safai Karmi"
              subtitle="SK-XXXX-XXXX  ·  Sanitation worker access"
              icon="trash-2"
              grad={SK_GRAD}
              color="#34D399"
            />

            {/* Row 2 — Official */}
            <GenRow
              role="official"
              label="Official"
              subtitle="OF-XXXX-XXXX  ·  Government officer access"
              icon="briefcase"
              grad={OFF_GRAD}
              color="#FCD34D"
            />
          </View>

          {/* ── ALL UNUSED KEYS (horizontal list) ── */}
          <View style={{ gap: 12 }}>
            <View style={[s.sectionHdr, { paddingHorizontal: 16 }]}>
              <LinearGradient colors={['#34D399','#059669']} style={s.sectionHdrIcon}>
                <Feather name="unlock" size={12} color="#fff" />
              </LinearGradient>
              <Text style={s.sectionHdrTxt}>Unused Keys</Text>
              <View style={s.unusedCount}>
                <Text style={s.unusedCountTxt}>{allUnused.length}</Text>
              </View>
            </View>

            {allUnused.length === 0 ? (
              <View style={[s.emptyCard, { marginHorizontal: 16 }]}>
                <LinearGradient colors={['rgba(192,132,252,0.18)','rgba(79,70,229,0.10)']} style={s.emptyIconBox}>
                  <Feather name="key" size={24} color="#C084FC" />
                </LinearGradient>
                <Text style={s.emptyTitle}>No Unused Keys</Text>
                <Text style={s.emptyText}>Generate keys above to get started</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {allUnused.map(k => <KeyCard key={k.id} k={k} />)}
              </ScrollView>
            )}
          </View>

          {/* ── ALL KEYS (used) ── */}
          {secretKeys.some(k => k.usedBy) && (
            <View style={{ gap: 12 }}>
              <View style={[s.sectionHdr, { paddingHorizontal: 16 }]}>
                <LinearGradient colors={['#6B7280','#374151']} style={s.sectionHdrIcon}>
                  <Feather name="check-circle" size={12} color="#fff" />
                </LinearGradient>
                <Text style={s.sectionHdrTxt}>Used Keys</Text>
                <View style={[s.unusedCount, { backgroundColor: 'rgba(107,114,128,0.18)', borderColor: 'rgba(107,114,128,0.28)' }]}>
                  <Text style={[s.unusedCountTxt, { color: MUTED }]}>{secretKeys.filter(k => k.usedBy).length}</Text>
                </View>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
              >
                {secretKeys.filter(k => k.usedBy).map(k => <KeyCard key={k.id} k={k} />)}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════
           NOTICES TAB
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'notices' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
          <TouchableOpacity onPress={() => setShowNoticeModal(true)} activeOpacity={0.85}>
            <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.publishBtn}>
              <View style={s.publishBtnInner}>
                <View style={s.publishBtnIcon}>
                  <Feather name="plus" size={16} color="rgba(255,255,255,0.9)" />
                </View>
                <Text style={s.publishBtnText}>Publish New Notice</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {notices.map(n => {
            const pc = PRIORITY[n.priority];
            return (
              <View key={n.id} style={[s.noticeCard, { backgroundColor: pc.bg, borderColor: pc.border }]}>
                <View style={[s.noticeSidebar, { backgroundColor: pc.color }]} />
                <View style={s.noticeBody}>
                  <View style={s.noticeTopRow}>
                    <View style={[s.priorityChip, { backgroundColor: pc.color + '22' }]}>
                      <Feather name={n.priority === 'high' ? 'alert-triangle' : n.priority === 'medium' ? 'alert-circle' : 'info'} size={10} color={pc.color} />
                      <Text style={[s.priorityChipTxt, { color: pc.color }]}>{n.priority.toUpperCase()}</Text>
                    </View>
                    <View style={s.typeChip}><Text style={s.typeChipTxt}>{n.type}</Text></View>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity
                      onPress={() => showAlert('Delete?', n.title, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => deleteNotice(n.id) }], 'error')}
                      style={s.deleteBtn}
                    >
                      <Feather name="trash-2" size={14} color="#FB7185" />
                    </TouchableOpacity>
                  </View>
                  <Text style={s.noticeTitle}>{n.title}</Text>
                  <Text style={s.noticeContent} numberOfLines={2}>{n.content}</Text>
                  <View style={s.noticeFooter}>
                    <Feather name="calendar" size={10} color={MUTED} />
                    <Text style={s.noticeDate}>{n.createdAt}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {notices.length === 0 && (
            <View style={s.emptyCard}>
              <View style={[s.emptyIconBox, { backgroundColor: 'rgba(34,211,238,0.12)' }]}>
                <Feather name="volume-x" size={24} color="#22D3EE" />
              </View>
              <Text style={s.emptyTitle}>No Notices Yet</Text>
              <Text style={s.emptyText}>Publish your first notice above</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* ══════════════════════════════════════════════════════════════
           RESETS TAB
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'resets' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 110 }}>
          <View style={[s.glassCard, { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start' }]}>
            <View style={[s.infoIconBox, { backgroundColor: 'rgba(251,113,133,0.18)' }]}>
              <Feather name="unlock" size={14} color="#FB7185" />
            </View>
            <Text style={[s.infoText, { flex: 1 }]}>
              Users who forgot their password appear here. Set a temporary password and share it via their registered mobile number.
            </Text>
          </View>

          {pendingResets > 0 && (
            <View style={s.pendingHeader}>
              <View style={s.pendingDot} />
              <Text style={s.pendingLbl}>Pending Review  ({pendingResets})</Text>
            </View>
          )}

          {allResets.length === 0 ? (
            <View style={s.emptyCard}>
              <LinearGradient colors={['#10B981', '#059669']} style={s.emptyIconBox}>
                <Feather name="check" size={22} color="#fff" />
              </LinearGradient>
              <Text style={s.emptyTitle}>All Clear</Text>
              <Text style={s.emptyText}>No password reset requests</Text>
            </View>
          ) : (
            allResets.map(req => {
              const isPending  = req.status === 'pending';
              const isApproved = req.status === 'approved';
              const sColor = isApproved ? '#34D399' : isPending ? '#FCD34D' : '#FB7185';
              return (
                <View
                  key={req.id}
                  style={[s.resetCard, isPending
                    ? { backgroundColor: 'rgba(252,211,77,0.08)', borderColor: 'rgba(252,211,77,0.28)' }
                    : { backgroundColor: GLASS, borderColor: GLASS_BD }
                  ]}
                >
                  {isPending && <View style={s.resetUrgentBar} />}
                  <View style={s.resetInner}>
                    <LinearGradient
                      colors={isPending ? ['#F97316','#EF4444'] : isApproved ? ['#10B981','#059669'] : ['#6B7280','#4B5563']}
                      style={s.resetAvatar}
                    >
                      <Text style={s.resetAvatarLetter}>{req.name[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={s.resetName}>{req.name}</Text>
                      <Text style={s.resetEmail} numberOfLines={1}>{req.email}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                        <Feather name="clock" size={10} color={MUTED} />
                        <Text style={s.resetDate}>{req.requestedAt}</Text>
                      </View>
                    </View>
                    <View style={[s.statusPill, { backgroundColor: sColor + '18' }]}>
                      <View style={[s.statusDot, { backgroundColor: sColor }]} />
                      <Text style={[s.statusTxt, { color: sColor }]}>{req.status}</Text>
                    </View>
                  </View>
                  {isPending && (
                    <View style={[s.resetActions, { borderTopColor: 'rgba(252,211,77,0.20)' }]}>
                      <TouchableOpacity style={s.rejectBtn} onPress={() => handleRejectReset(req)} activeOpacity={0.8}>
                        <Feather name="x" size={13} color="#FB7185" />
                        <Text style={s.rejectBtnTxt}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.approveBtn} onPress={() => openApproveModal(req)} activeOpacity={0.85}>
                        <LinearGradient colors={['#10B981','#059669']} style={s.approveBtnGrad}>
                          <Feather name="check" size={13} color="#fff" />
                          <Text style={s.approveBtnTxt}>Approve & Set Password</Text>
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

      {/* ══════════════════════════════════════════════════════════════
           IMPORT TAB
         ══════════════════════════════════════════════════════════════ */}
      {tab === 'import' && (
        <View style={{ flex: 1 }}>
          <SuperAdminImport embedded />
        </View>
      )}

      {/* ══════════════════════════════════════════════════════════════
           NEW KEY SUCCESS MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Modal visible={!!newKey} animationType="slide" transparent>
        <View style={s.overlay}>
          <LinearGradient colors={['#0D1535', '#060B18']} style={s.newKeySheet}>
            {/* glow ring */}
            <View style={s.celebRing}>
              <LinearGradient colors={ROLE_GRADS[newKey?.role ?? 'safaikarmi']} style={s.celebGrad}>
                <Feather name="key" size={30} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={s.celebTitle}>Key Generated!</Text>
            <Text style={s.celebRole}>
              {newKey?.role === 'safaikarmi' ? 'Safai Karmi' : 'Official'} Access Code
            </Text>

            {/* tap to copy */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => newKey && handleCopy(newKey.code, newKey.id)}
              style={{ width: '100%' }}
            >
              <LinearGradient
                colors={copiedId === newKey?.id ? ['#10B981','#059669'] : ROLE_GRADS[newKey?.role ?? 'safaikarmi']}
                style={s.codeReveal}
              >
                <Feather name={copiedId === newKey?.id ? 'check' : 'key'} size={16} color="rgba(255,255,255,0.8)" />
                <Text style={s.codeRevealTxt} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {copiedId === newKey?.id ? 'Copied!' : newKey?.code}
                </Text>
                {copiedId !== newKey?.id && <Feather name="copy" size={16} color="rgba(255,255,255,0.7)" />}
              </LinearGradient>
            </TouchableOpacity>

            <View style={s.celebNote}>
              <Feather name="alert-circle" size={12} color={MUTED} />
              <Text style={s.celebNoteTxt}>Share this code securely. It will not be shown again after closing.</Text>
            </View>
            <TouchableOpacity onPress={() => setNewKey(null)} activeOpacity={0.85}>
              <LinearGradient colors={ROLE_GRADS[newKey?.role ?? 'safaikarmi']} style={s.celebDoneBtn}>
                <Text style={s.celebDoneTxt}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
           NOTICE MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showNoticeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#080E22' }}>
          <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.modalHdr}>
            <Text style={s.modalHdrTitle}>New Notice</Text>
            <Pressable style={s.closeBtn} onPress={() => setShowNoticeModal(false)}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }}>
            <Text style={[s.fieldLabel, { color: TEXT }]}>Type</Text>
            <View style={s.chipRow}>
              {(['notice','announcement','alert'] as const).map(t => (
                <Pressable
                  key={t}
                  style={[s.chip, { borderColor: noticeType === t ? '#0EA5E9' : GLASS_BD, backgroundColor: noticeType === t ? 'rgba(14,165,233,0.14)' : GLASS }]}
                  onPress={() => setNoticeType(t)}
                >
                  <Text style={[s.chipTxt, { color: noticeType === t ? '#22D3EE' : MUTED }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[s.fieldLabel, { color: TEXT }]}>Priority</Text>
            <View style={s.chipRow}>
              {(['low','medium','high'] as const).map(p => {
                const pc = PRIORITY[p];
                return (
                  <Pressable
                    key={p}
                    style={[s.chip, { borderColor: noticePriority === p ? pc.color : GLASS_BD, backgroundColor: noticePriority === p ? pc.bg : GLASS }]}
                    onPress={() => setNoticePriority(p)}
                  >
                    <Text style={[s.chipTxt, { color: noticePriority === p ? pc.color : MUTED }]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[s.fieldLabel, { color: TEXT }]}>Title *</Text>
            <TextInput
              style={[s.fieldInput, { color: TEXT, backgroundColor: GLASS, borderColor: GLASS_BD }]}
              placeholder="Notice title…" placeholderTextColor={MUTED}
              value={noticeTitle} onChangeText={setNoticeTitle}
            />
            <Text style={[s.fieldLabel, { color: TEXT }]}>Content *</Text>
            <TextInput
              style={[s.textarea, { color: TEXT, backgroundColor: GLASS, borderColor: GLASS_BD }]}
              placeholder="Write content…" placeholderTextColor={MUTED}
              multiline numberOfLines={5} value={noticeContent}
              onChangeText={setNoticeContent} textAlignVertical="top"
            />
            <TouchableOpacity onPress={handleAddNotice} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
              <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.submitBtn}>
                <Feather name="send" size={16} color="#fff" />
                <Text style={s.submitBtnTxt}>{saving ? 'Publishing…' : 'Publish Notice'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════
           APPROVE RESET MODAL
         ══════════════════════════════════════════════════════════════ */}
      <Modal visible={showApproveModal && !!selectedRequest} animationType="slide" presentationStyle="pageSheet">
        {selectedRequest && (
          <SafeAreaView style={{ flex: 1, backgroundColor: '#080E22' }}>
            <LinearGradient colors={['#F97316', '#EF4444']} style={s.modalHdr}>
              <Text style={s.modalHdrTitle}>Approve Reset</Text>
              <Pressable style={s.closeBtn} onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}>
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
            </LinearGradient>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
              <View style={[s.glassCard, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }]}>
                <LinearGradient colors={['#F97316', '#EF4444']} style={s.resetAvatar}>
                  <Text style={s.resetAvatarLetter}>{selectedRequest.name[0]?.toUpperCase()}</Text>
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.resetName, { fontSize: 16 }]}>{selectedRequest.name}</Text>
                  <Text style={s.resetEmail}>{selectedRequest.email}</Text>
                </View>
              </View>
              <View style={[s.glassCard, { flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-start', borderColor: 'rgba(251,113,133,0.25)' }]}>
                <Feather name="info" size={14} color="#FB7185" />
                <Text style={[s.infoText, { flex: 1, color: '#FB7185' }]}>Set a temporary password and share it via registered mobile. User should change it after login.</Text>
              </View>
              <Text style={[s.fieldLabel, { color: TEXT }]}>Temporary Password *</Text>
              <TextInput
                style={[s.fieldInput, { color: TEXT, backgroundColor: GLASS, borderColor: GLASS_BD }]}
                placeholder="Min. 6 characters" placeholderTextColor={MUTED}
                value={tempPassword} onChangeText={setTempPassword} autoCapitalize="none"
              />
              <Text style={[s.fieldLabel, { color: TEXT }]}>Note to User (optional)</Text>
              <TextInput
                style={[s.textarea, { color: TEXT, backgroundColor: GLASS, borderColor: GLASS_BD }]}
                placeholder="e.g. Contact office if you need help…" placeholderTextColor={MUTED}
                value={adminNote} onChangeText={setAdminNote} multiline numberOfLines={3} textAlignVertical="top"
              />
              <TouchableOpacity onPress={handleApproveReset} disabled={saving} activeOpacity={0.85} style={saving ? { opacity: 0.6 } : {}}>
                <LinearGradient colors={['#10B981', '#059669']} style={s.submitBtn}>
                  <Feather name="check" size={16} color="#fff" />
                  <Text style={s.submitBtnTxt}>{saving ? 'Processing…' : 'Confirm & Reset Password'}</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => { setShowApproveModal(false); setSelectedRequest(null); }}
                activeOpacity={0.8}
              >
                <Text style={s.cancelBtnTxt}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  orb: { position: 'absolute', borderRadius: 999 },

  // header
  header:      { paddingTop: 18, paddingBottom: 22, paddingHorizontal: 20, overflow: 'hidden' },
  headerTitle: { color: TEXT,  fontSize: 28, fontFamily: 'Inter_700Bold',    zIndex: 1 },
  headerSub:   { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 4, zIndex: 1 },

  // tab bar
  tabBar:      { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: GLASS_BD },
  tabPill:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: 'transparent' },
  tabBadge:    { position: 'absolute', top: -5, right: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
  tabBadgeTxt: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },
  tabLabel:    { fontSize: 12 },

  // ── GEN KEY TAB ──────────────────────────────────────────────
  // stats row
  statsRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  statCell:  { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 12, alignItems: 'center', gap: 3 },
  statVal:   { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLbl:   { color: MUTED, fontSize: 8, fontFamily: 'Inter_600SemiBold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 0.3 },

  // section header
  sectionHdr:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionHdrIcon: { width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionHdrTxt:  { color: TEXT, fontSize: 15, fontFamily: 'Inter_700Bold', flex: 1 },
  unusedCount:    { backgroundColor: 'rgba(52,211,153,0.18)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  unusedCountTxt: { color: '#34D399', fontSize: 11, fontFamily: 'Inter_700Bold' },

  // generate row (full width)
  genRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16, overflow: 'hidden' },
  genRowIcon:  { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  genRowLabel: { color: TEXT,  fontSize: 15, fontFamily: 'Inter_700Bold' },
  genRowSub:   { color: MUTED, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  unusedBadge: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 38 },
  unusedBadgeTxt:   { fontSize: 16, fontFamily: 'Inter_700Bold' },
  unusedBadgeLabel: { fontSize: 8,  fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.3 },
  genPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  genPillTxt:  { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },

  // key card (horizontal list item)
  keyCard:      { width: 158, borderRadius: 18, borderWidth: 1, padding: 12, gap: 8, overflow: 'hidden' },
  keyCardTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  keyRolePill:  { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 3 },
  keyRoleDot:   { width: 5, height: 5, borderRadius: 3 },
  keyRoleTxt:   { fontSize: 9, fontFamily: 'Inter_700Bold' },
  freePill:     { backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  freeTxt:      { color: '#34D399', fontSize: 9, fontFamily: 'Inter_700Bold' },
  usedPill:     { backgroundColor: 'rgba(107,114,128,0.20)', borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },
  usedTxt:      { color: MUTED, fontSize: 9, fontFamily: 'Inter_600SemiBold' },
  keyCodeBox:   { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 7 },
  keyCodeTxt:   { flex: 1, color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  keyCardBottom:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  keyDate:      { color: MUTED, fontSize: 9, fontFamily: 'Inter_400Regular' },

  // empty state
  emptyCard:    { backgroundColor: GLASS, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BD, padding: 32, alignItems: 'center', gap: 10 },
  emptyIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { color: TEXT,  fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptyText:    { color: MUTED, fontSize: 13, fontFamily: 'Inter_400Regular' },

  // glass card
  glassCard:   { backgroundColor: GLASS, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, overflow: 'hidden' },
  infoIconBox: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoText:    { fontSize: 12, fontFamily: 'Inter_500Medium', lineHeight: 18, color: MUTED },

  // publish btn
  publishBtn:     { borderRadius: 16, overflow: 'hidden' },
  publishBtnInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  publishBtnIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  publishBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  // notice card
  noticeCard:     { borderRadius: 16, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  noticeSidebar:  { width: 4 },
  noticeBody:     { flex: 1, padding: 13, gap: 6 },
  noticeTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityChip:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 },
  priorityChipTxt:{ fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 0.5 },
  typeChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: GLASS },
  typeChipTxt:    { fontSize: 9, fontFamily: 'Inter_500Medium', color: MUTED },
  deleteBtn:      { padding: 4 },
  noticeTitle:    { color: TEXT,  fontSize: 14, fontFamily: 'Inter_700Bold' },
  noticeContent:  { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
  noticeFooter:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  noticeDate:     { color: MUTED, fontSize: 10, fontFamily: 'Inter_400Regular' },

  // resets
  pendingHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingDot:    { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FCD34D' },
  pendingLbl:    { color: '#FCD34D', fontSize: 13, fontFamily: 'Inter_700Bold' },
  resetCard:         { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  resetUrgentBar:    { height: 3, backgroundColor: '#FCD34D' },
  resetInner:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  resetAvatar:       { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  resetAvatarLetter: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  resetName:         { color: TEXT,  fontSize: 14, fontFamily: 'Inter_700Bold' },
  resetEmail:        { color: MUTED, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  resetDate:         { color: MUTED, fontSize: 10, fontFamily: 'Inter_400Regular' },
  statusPill:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusDot:         { width: 6, height: 6, borderRadius: 3 },
  statusTxt:         { fontSize: 11, fontFamily: 'Inter_700Bold' },
  resetActions:      { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1 },
  rejectBtn:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,113,133,0.40)', backgroundColor: 'rgba(251,113,133,0.10)', paddingVertical: 10 },
  rejectBtnTxt:      { color: '#FB7185', fontSize: 13, fontFamily: 'Inter_700Bold' },
  approveBtn:        { flex: 2, borderRadius: 12, overflow: 'hidden' },
  approveBtnGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  approveBtnTxt:     { color: '#fff', fontSize: 13, fontFamily: 'Inter_700Bold' },

  // new key modal
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.82)', justifyContent: 'flex-end' },
  newKeySheet:  { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28, gap: 16, alignItems: 'center' },
  celebRing:    { width: 92, height: 92, borderRadius: 46, borderWidth: 1.5, borderColor: GLASS_BD, justifyContent: 'center', alignItems: 'center' },
  celebGrad:    { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  celebTitle:   { color: TEXT,  fontSize: 26, fontFamily: 'Inter_700Bold' },
  celebRole:    { color: MUTED, fontSize: 14, fontFamily: 'Inter_400Regular' },
  codeReveal:   { borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 18, alignSelf: 'stretch', justifyContent: 'center' },
  codeRevealTxt:{ color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', letterSpacing: 3, flex: 1, textAlign: 'center' },
  celebNote:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS, padding: 12, alignSelf: 'stretch' },
  celebNoteTxt: { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular', flex: 1, lineHeight: 18 },
  celebDoneBtn: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 60 },
  celebDoneTxt: { color: '#fff', fontSize: 16, fontFamily: 'Inter_700Bold' },

  // modals
  modalHdr:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  modalHdrTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  fieldLabel:    { fontSize: 13, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  fieldInput:    { borderRadius: 14, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular' },
  textarea:      { borderRadius: 14, borderWidth: 1, padding: 13, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 120 },
  chipRow:       { flexDirection: 'row', gap: 8 },
  chip:          { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  chipTxt:       { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  submitBtn:     { borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  submitBtnTxt:  { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
  cancelBtn:     { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: GLASS_BD },
  cancelBtnTxt:  { color: MUTED, fontSize: 14, fontFamily: 'Inter_500Medium' },
});
