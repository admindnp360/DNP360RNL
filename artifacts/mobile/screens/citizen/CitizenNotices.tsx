import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchBar } from '@/components/SearchBar';
import { useAppData } from '@/contexts/AppContext';
import { useColors } from '@/hooks/useColors';

type Filter = 'all' | 'notice' | 'announcement' | 'alert';

const TYPE_CONFIG: Record<string, { label: string; grad: readonly [string, string]; icon: string; bg: string; color: string }> = {
  alert:        { label: 'Alert',        grad: ['#EF4444','#DC2626'], icon: 'alert-triangle', bg: '#FEF2F2', color: '#DC2626' },
  announcement: { label: 'Announcement', grad: ['#F59E0B','#D97706'], icon: 'volume-2',       bg: '#FFFBEB', color: '#D97706' },
  notice:       { label: 'Notice',       grad: ['#3B82F6','#2563EB'], icon: 'file-text',      bg: '#EFF6FF', color: '#2563EB' },
};

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: 'all',          label: 'All',           icon: 'list' },
  { key: 'alert',        label: 'Alerts',        icon: 'alert-triangle' },
  { key: 'announcement', label: 'Announcements', icon: 'volume-2' },
  { key: 'notice',       label: 'Notices',       icon: 'file-text' },
];

export default function CitizenNotices() {
  const { notices } = useAppData();
  const colors = useColors();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const allActive = notices.filter(n => n.isActive);
  const filtered = allActive.filter(n => {
    if (filter !== 'all' && n.type !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const alertCt        = allActive.filter(n => n.type === 'alert').length;
  const announceCt     = allActive.filter(n => n.type === 'announcement').length;
  const noticeCt       = allActive.filter(n => n.type === 'notice').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#030D1F' }} edges={['top']}>

      {/* ── HERO ── */}
      <LinearGradient colors={['#030D1F', '#1A0A00', '#3D1800']} style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>Public Notices</Text>
            <Text style={styles.heroSub}>Official announcements from Nagar Parishad</Text>
          </View>
          <View style={styles.totalBubble}>
            <Text style={styles.totalNum}>{allActive.length}</Text>
            <Text style={styles.totalLbl}>Active</Text>
          </View>
        </View>
        {/* Type stats */}
        <View style={styles.typeStats}>
          {[
            { label: 'Alerts', value: alertCt,    grad: ['#EF4444','#DC2626'] as const, icon: 'alert-triangle' },
            { label: 'News',   value: announceCt, grad: ['#F59E0B','#D97706'] as const, icon: 'volume-2' },
            { label: 'Notices',value: noticeCt,   grad: ['#3B82F6','#2563EB'] as const, icon: 'file-text' },
          ].map(s => (
            <LinearGradient key={s.label} colors={s.grad} style={styles.typeStat}>
              <Feather name={s.icon as any} size={13} color="#fff" />
              <Text style={styles.typeStatVal}>{s.value}</Text>
              <Text style={styles.typeStatLbl}>{s.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </LinearGradient>

      {/* ── SEARCH & FILTER ── */}
      <View style={[styles.controls, { backgroundColor: colors.background }]}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search notices…" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {FILTERS.map(f => {
            const tc = TYPE_CONFIG[f.key];
            const isActive = filter === f.key;
            return isActive ? (
              <LinearGradient key={f.key} colors={tc?.grad ?? ['#3B82F6','#2563EB']} style={styles.filterActive}>
                <Feather name={f.icon as any} size={11} color="#fff" />
                <Text style={styles.filterActiveText}>{f.label}</Text>
              </LinearGradient>
            ) : (
              <Pressable key={f.key} style={[styles.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setFilter(f.key)}>
                <Feather name={f.icon as any} size={11} color={colors.mutedForeground} />
                <Text style={[styles.filterBtnText, { color: colors.mutedForeground }]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── NOTICES LIST ── */}
      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {filtered.map(n => {
          const tc = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.notice;
          const isExpanded = expanded === n.id;
          return (
            <Pressable key={n.id} onPress={() => setExpanded(isExpanded ? null : n.id)} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={tc.grad} style={styles.noticeTopBar} />
              <View style={styles.noticeInner}>
                {/* Header */}
                <View style={styles.noticeHeader}>
                  <LinearGradient colors={tc.grad} style={styles.noticeTypeIcon}>
                    <Feather name={tc.icon as any} size={14} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>{n.title}</Text>
                    <Text style={[styles.noticeMeta, { color: colors.mutedForeground }]}>{n.createdAt}</Text>
                  </View>
                  <View style={[styles.typePill, { backgroundColor: tc.bg }]}>
                    <Text style={[styles.typePillText, { color: tc.color }]}>{tc.label}</Text>
                  </View>
                </View>

                {/* Priority bar */}
                {n.priority && (
                  <View style={[styles.priorityBar, {
                    backgroundColor: n.priority === 'high' ? '#FEF2F2' : n.priority === 'medium' ? '#FFFBEB' : '#F0FDF4',
                    borderColor: n.priority === 'high' ? '#EF4444' : n.priority === 'medium' ? '#F59E0B' : '#10B981',
                  }]}>
                    <Feather name={n.priority === 'high' ? 'alert-circle' : n.priority === 'medium' ? 'alert-triangle' : 'info'} size={11}
                      color={n.priority === 'high' ? '#DC2626' : n.priority === 'medium' ? '#D97706' : '#059669'} />
                    <Text style={[styles.priorityText, {
                      color: n.priority === 'high' ? '#DC2626' : n.priority === 'medium' ? '#D97706' : '#059669',
                    }]}>{n.priority.charAt(0).toUpperCase() + n.priority.slice(1)} Priority</Text>
                  </View>
                )}

                {/* Content */}
                <Text style={[styles.noticeContent, { color: colors.mutedForeground }]} numberOfLines={isExpanded ? undefined : 2}>{n.content}</Text>

                <View style={[styles.noticeFooter, { borderTopColor: colors.border }]}>
                  <Text style={[styles.tapHint, { color: colors.mutedForeground }]}>
                    {isExpanded ? '▲ Tap to collapse' : '▼ Tap to read more'}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
        {filtered.length === 0 && (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.emptyIcon}>
              <Feather name="inbox" size={28} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notices found</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
              {search ? 'Try a different search term' : 'Check back later for updates'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { padding: 20, paddingBottom: 20, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  heroSub: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, maxWidth: '80%' },
  totalBubble: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  totalNum: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  totalLbl: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontFamily: 'Inter_500Medium' },
  typeStats: { flexDirection: 'row', gap: 8 },
  typeStat: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', gap: 3 },
  typeStatVal: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  typeStatLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_600SemiBold' },

  controls: { padding: 14, paddingBottom: 8 },
  filterActive: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, marginRight: 8 },
  filterActiveText: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, marginRight: 8 },
  filterBtnText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  noticeCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  noticeTopBar: { height: 4 },
  noticeInner: { padding: 14, gap: 10 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  noticeTypeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  noticeTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  noticeMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  typePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99 },
  typePillText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  priorityBar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  priorityText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  noticeContent: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  noticeFooter: { borderTopWidth: 1, paddingTop: 8 },
  tapHint: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },

  empty: { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 60, height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
