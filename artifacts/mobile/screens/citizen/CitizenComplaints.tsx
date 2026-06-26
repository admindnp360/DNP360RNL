import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import { COMPLAINT_CATEGORIES } from '@/types';

type Filter = 'all' | 'active' | 'resolved';

const CATEGORIES = Object.entries(COMPLAINT_CATEGORIES) as [string, string][];

const STATUS_CONFIG: Record<string, { label: string; grad: readonly [string, string]; icon: string; bg: string; color: string }> = {
  submitted:   { label: 'Submitted',   grad: ['#3B82F6','#2563EB'], icon: 'send',         bg: '#EFF6FF', color: '#2563EB' },
  in_progress: { label: 'In Progress', grad: ['#F59E0B','#D97706'], icon: 'loader',       bg: '#FFFBEB', color: '#D97706' },
  resolved:    { label: 'Resolved',    grad: ['#10B981','#059669'], icon: 'check-circle',  bg: '#ECFDF5', color: '#059669' },
};

const CAT_ICONS: Record<string, string> = {
  garbage_collection: 'trash-2',
  road_damage:        'alert-triangle',
  water_supply:       'droplet',
  street_light:       'zap',
  drainage:           'wind',
  encroachment:       'home',
  noise_pollution:    'volume-x',
  other:              'more-horizontal',
};

export default function CitizenComplaints() {
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { getComplaintsByUser, addComplaint } = useAppData();
  const colors = useColors();

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState<string>('garbage_collection');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const complaints = getComplaintsByUser(user?.id ?? '');
  const filtered = complaints.filter(c => {
    if (filter === 'active' && c.status === 'resolved') return false;
    if (filter === 'resolved' && c.status !== 'resolved') return false;
    if (search && !c.description.toLowerCase().includes(search.toLowerCase()) && !c.category.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function handleSubmit() {
    if (!description.trim() || !location.trim()) { showAlert('Missing fields', 'Please fill description and location.', undefined, 'warning'); return; }
    setSubmitting(true);
    try {
      await addComplaint({ citizenId: user?.id ?? '', citizenName: user?.name ?? '', category: category as any, description: description.trim(), location: location.trim(), status: 'submitted', wardId: user?.wardId ?? '' });
      setShowModal(false); setDescription(''); setLocation(''); setCategory('garbage_collection');
      showAlert('Submitted', 'Your complaint has been submitted successfully.', undefined, 'success');
    } finally { setSubmitting(false); }
  }

  const allCt      = complaints.length;
  const activeCt   = complaints.filter(c => c.status !== 'resolved').length;
  const resolvedCt = complaints.filter(c => c.status === 'resolved').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#030D1F' }} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient colors={['#030D1F', '#071E56', '#0A2E8A']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>My Complaints</Text>
            <Text style={styles.heroSub}>Track & manage your civic issues</Text>
          </View>
          <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85}>
            <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.newBtn}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.newBtnText}>New</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <View style={styles.heroStats}>
          {[
            { label: `All (${allCt})`,        key: 'all',      grad: ['#3B82F6','#2563EB'] as const },
            { label: `Active (${activeCt})`,   key: 'active',   grad: ['#F59E0B','#D97706'] as const },
            { label: `Resolved (${resolvedCt})`,key: 'resolved',grad: ['#10B981','#059669'] as const },
          ].map(s => {
            const isActive = filter === s.key;
            return isActive ? (
              <LinearGradient key={s.key} colors={s.grad} style={styles.statChipActive}>
                <Text style={styles.statChipActiveText}>{s.label}</Text>
              </LinearGradient>
            ) : (
              <TouchableOpacity key={s.key} style={styles.statChip} onPress={() => setFilter(s.key as Filter)} activeOpacity={0.8}>
                <Text style={styles.statChipText}>{s.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {/* ── SEARCH ── */}
      <View style={[styles.searchWrap, { backgroundColor: colors.background }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search complaints…" />
      </View>

      {/* ── LIST ── */}
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filtered.map(c => {
          const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.submitted;
          const catIcon = CAT_ICONS[c.category] ?? 'alert-circle';
          return (
            <View key={c.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={cfg.grad} style={styles.cardTopBar} />
              <View style={styles.cardInner}>
                <View style={styles.cardHeader}>
                  <LinearGradient colors={cfg.grad} style={styles.cardCatIcon}>
                    <Feather name={catIcon as any} size={14} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardCat, { color: colors.text }]} numberOfLines={1}>
                      {c.category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    <Text style={[styles.cardDate, { color: colors.mutedForeground }]}>{c.createdAt} · {c.id}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon as any} size={10} color={cfg.color} />
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <Text style={[styles.cardDesc, { color: colors.text }]} numberOfLines={2}>{c.description}</Text>
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                  <Text style={[styles.cardLocation, { color: colors.mutedForeground }]} numberOfLines={1}>{c.location}</Text>
                </View>
              </View>
            </View>
          );
        })}
        {filtered.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.emptyIcon}>
              <Feather name="inbox" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No complaints found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {filter === 'all' ? 'Tap + New to submit your first complaint' : 'No complaints in this category'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity onPress={() => setShowModal(true)} activeOpacity={0.85}>
                <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.emptyBtn}>
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.emptyBtnText}>New Complaint</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── NEW COMPLAINT MODAL ── */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={['#071E56', '#0A2E8A']} style={styles.modalHdr}>
              <View>
                <Text style={styles.modalHdrTitle}>New Complaint</Text>
                <Text style={styles.modalHdrSub}>Fill all fields to submit</Text>
              </View>
              <Pressable style={styles.modalClose} onPress={() => setShowModal(false)}>
                <Feather name="x" size={18} color="#fff" />
              </Pressable>
            </LinearGradient>

            <ScrollView contentContainerStyle={{ padding: 18, gap: 18, paddingBottom: 40 }}>
              {/* Category */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Category *</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map(([key, label]) => {
                    const active = category === key;
                    const icon = CAT_ICONS[key] ?? 'alert-circle';
                    return active ? (
                      <LinearGradient key={key} colors={['#3B82F6', '#1652CC']} style={styles.catBtnActive}>
                        <Feather name={icon as any} size={12} color="#fff" />
                        <Text style={styles.catBtnActiveText}>{label}</Text>
                      </LinearGradient>
                    ) : (
                      <Pressable key={key} style={[styles.catBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setCategory(key)}>
                        <Feather name={icon as any} size={12} color={colors.mutedForeground} />
                        <Text style={[styles.catBtnText, { color: colors.text }]}>{label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Description */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Description *</Text>
                <TextInput
                  style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                  placeholder="Describe the issue in detail…"
                  placeholderTextColor={colors.mutedForeground}
                  multiline numberOfLines={4}
                  value={description} onChangeText={setDescription}
                />
              </View>

              {/* Location */}
              <View>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Location *</Text>
                <View style={[styles.fieldRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="map-pin" size={16} color="#3B82F6" />
                  <TextInput style={[styles.fieldInput, { color: colors.text }]} placeholder="Street, Ward, Landmark…" placeholderTextColor={colors.mutedForeground} value={location} onChangeText={setLocation} />
                </View>
              </View>

              {/* Submit */}
              <TouchableOpacity onPress={handleSubmit} disabled={submitting} activeOpacity={0.85} style={submitting ? { opacity: 0.6 } : {}}>
                <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.submitBtn}>
                  <Feather name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : 'Submit Complaint'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 18, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  newBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  heroStats: { flexDirection: 'row', gap: 8 },
  statChipActive: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  statChipActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  statChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  statChipText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontFamily: 'Inter_500Medium' },

  searchWrap: { padding: 14, paddingBottom: 8 },

  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  cardTopBar: { height: 4 },
  cardInner: { padding: 14, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardCatIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardCat: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  cardDate: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 99 },
  statusText: { fontSize: 10, fontFamily: 'Inter_700Bold' },
  cardDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 19 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: 1 },
  cardLocation: { fontSize: 11, fontFamily: 'Inter_400Regular', flex: 1 },

  empty: { borderRadius: 16, borderWidth: 1, padding: 36, alignItems: 'center', gap: 12 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 19 },
  emptyBtn: { borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  modalHdr: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  modalHdrTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  modalHdrSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  fieldLabel: { fontSize: 13, fontFamily: 'Inter_700Bold', marginBottom: 10 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtnActive: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  catBtnActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  catBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  catBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  textarea: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14, fontFamily: 'Inter_400Regular', minHeight: 100, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  fieldInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 14 },
  submitBtn: { borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  submitBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },
});
