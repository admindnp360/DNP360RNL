import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useColors } from '@/hooks/useColors';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good Morning', emoji: '🌅' };
  if (h < 17) return { text: 'Good Afternoon', emoji: '☀️' };
  return { text: 'Good Evening', emoji: '🌙' };
}

const STATUS_CONFIG: Record<string, { label: string; grad: readonly [string, string]; icon: string }> = {
  submitted:   { label: 'Submitted',   grad: ['#3B82F6', '#2563EB'], icon: 'send' },
  in_progress: { label: 'In Progress', grad: ['#F59E0B', '#D97706'], icon: 'loader' },
  resolved:    { label: 'Resolved',    grad: ['#10B981', '#059669'], icon: 'check-circle' },
};

export default function CitizenHome() {
  const { user } = useAuth();
  const { notices, getComplaintsByUser } = useAppData();
  const colors = useColors();
  const { t } = useLanguage();
  const greeting = getGreeting();

  const myComplaints = getComplaintsByUser(user?.id ?? '');
  const active   = myComplaints.filter(c => c.status !== 'resolved');
  const resolved = myComplaints.filter(c => c.status === 'resolved');
  const latestNotices = notices.filter(n => n.isActive).slice(0, 3);

  const NOTICE_TYPE_GRAD: Record<string, readonly [string, string]> = {
    alert:        ['#EF4444', '#DC2626'],
    announcement: ['#F59E0B', '#D97706'],
    notice:       ['#3B82F6', '#2563EB'],
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#030D1F' }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── HERO ── */}
        <View style={styles.hero}>
          <LinearGradient colors={['#030D1F', '#071E56', '#0A2E8A']} style={StyleSheet.absoluteFill} />

          {/* Top bar */}
          <View style={styles.heroTop}>
            <View style={styles.greetingWrap}>
              <Text style={styles.greetingText}>{greeting.text}</Text>
              <Text style={styles.heroName}>{user?.name ?? 'Citizen'} 👋</Text>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={11} color="#93C5FD" />
                <Text style={styles.locationText}>{user?.address ?? t('cityName') + ', Bihar'}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
                <LinearGradient colors={['#1652CC', '#0A2E8A']} style={styles.avatarRing}>
                  <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.avatarGrad}>
                    <Text style={styles.avatarLetter}>{(user?.name ?? 'C')[0].toUpperCase()}</Text>
                  </LinearGradient>
                </LinearGradient>
              </TouchableOpacity>
              <LanguageSwitcher />
            </View>
          </View>

          {/* Status badges */}
          <View style={styles.heroBadgeRow}>
            <View style={styles.heroBadge}>
              <Feather name="shield" size={10} color="#86EFAC" />
              <Text style={styles.heroBadgeText}>Verified Citizen</Text>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="hash" size={10} color="#93C5FD" />
              <Text style={styles.heroBadgeText}>DNP360</Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={styles.statsStrip}>
            {[
              { label: 'Total',    value: myComplaints.length, grad: ['#3B82F6','#2563EB'] as const, icon: 'clipboard' },
              { label: 'Active',   value: active.length,       grad: ['#F59E0B','#D97706'] as const, icon: 'loader' },
              { label: 'Resolved', value: resolved.length,     grad: ['#10B981','#059669'] as const, icon: 'check-circle' },
              { label: 'Notices',  value: notices.filter(n=>n.isActive).length, grad: ['#8B5CF6','#6D28D9'] as const, icon: 'volume-2' },
            ].map(s => (
              <View key={s.label} style={styles.statCell}>
                <LinearGradient colors={s.grad} style={styles.statIcon}>
                  <Feather name={s.icon as any} size={12} color="#fff" />
                </LinearGradient>
                <Text style={styles.statVal}>{s.value}</Text>
                <Text style={styles.statLbl}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.body, { backgroundColor: colors.background }]}>

          {/* ── QUICK ACTIONS ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
            </View>
            <View style={styles.actionsGrid}>
              {[
                { icon: 'plus-circle', label: 'New\nComplaint', grad: ['#3B82F6','#1652CC'] as const, route: '/(tabs)/action' },
                { icon: 'clock',       label: 'Track\nStatus',  grad: ['#8B5CF6','#6D28D9'] as const, route: '/(tabs)/action' },
                { icon: 'volume-2',    label: 'Read\nNotices',  grad: ['#F59E0B','#D97706'] as const, route: '/(tabs)/secondary' },
                { icon: 'phone-call',  label: 'Emergency\nCall',grad: ['#EF4444','#DC2626'] as const, route: '/(tabs)/tertiary' },
              ].map(a => (
                <TouchableOpacity key={a.label} onPress={() => router.push(a.route as any)} activeOpacity={0.85} style={styles.actionCell}>
                  <LinearGradient colors={a.grad} style={styles.actionCard}>
                    <Feather name={a.icon as any} size={22} color="#fff" />
                    <Text style={styles.actionLabel}>{a.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── LATEST NOTICES ── */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.sectionIcon}>
                <Feather name="volume-2" size={13} color="#fff" />
              </LinearGradient>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Notices</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/secondary')} style={styles.seeAllBtn}>
                <Text style={styles.seeAllText}>See All</Text>
                <Feather name="arrow-right" size={12} color="#3B82F6" />
              </TouchableOpacity>
            </View>

            {latestNotices.length > 0 ? latestNotices.map(n => {
              const grad = NOTICE_TYPE_GRAD[n.type] ?? ['#3B82F6','#2563EB'] as const;
              return (
                <View key={n.id} style={[styles.noticeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <LinearGradient colors={grad} style={styles.noticeAccent} />
                  <View style={styles.noticeBody}>
                    <LinearGradient colors={grad} style={styles.noticeTypeIcon}>
                      <Feather name={n.type === 'alert' ? 'alert-triangle' : n.type === 'announcement' ? 'volume-2' : 'file-text'} size={12} color="#fff" />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>{n.title}</Text>
                      <Text style={[styles.noticeMeta, { color: colors.mutedForeground }]}>{n.createdAt}</Text>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </View>
                </View>
              );
            }) : (
              <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="inbox" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No active notices</Text>
              </View>
            )}
          </View>

          {/* ── MY COMPLAINTS ── */}
          {myComplaints.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <LinearGradient colors={['#3B82F6', '#1652CC']} style={styles.sectionIcon}>
                  <Feather name="clipboard" size={13} color="#fff" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>My Complaints</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/action')} style={styles.seeAllBtn}>
                  <Text style={styles.seeAllText}>See All</Text>
                  <Feather name="arrow-right" size={12} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              {myComplaints.slice(0, 3).map(c => {
                const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.submitted;
                return (
                  <View key={c.id} style={[styles.complaintCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <LinearGradient colors={cfg.grad} style={styles.complaintAccent} />
                    <View style={styles.complaintBody}>
                      <LinearGradient colors={cfg.grad} style={styles.complaintIcon}>
                        <Feather name={cfg.icon as any} size={13} color="#fff" />
                      </LinearGradient>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.complaintDesc, { color: colors.text }]} numberOfLines={1}>{c.description}</Text>
                        <Text style={[styles.complaintMeta, { color: colors.mutedForeground }]}>{c.category?.replace(/_/g, ' ')} · {c.createdAt}</Text>
                      </View>
                      <LinearGradient colors={cfg.grad} style={styles.complaintStatusBadge}>
                        <Text style={styles.complaintStatusText}>{cfg.label}</Text>
                      </LinearGradient>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── MUNICIPAL BANNER ── */}
          <LinearGradient colors={['#071E56', '#0A2E8A', '#1652CC']} style={styles.banner}>
            <LinearGradient colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']} style={styles.bannerIcon}>
              <Feather name="home" size={20} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Nagar Parishad Daudnagar</Text>
              <Text style={styles.bannerSub}>Mon–Sat, 10 AM – 5 PM · Bihar, India</Text>
            </View>
            <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingBottom: 24 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: 14, marginBottom: 14 },
  greetingWrap: { flex: 1 },
  greetingText: { color: '#93C5FD', fontSize: 13, fontFamily: 'Inter_400Regular' },
  heroName: { color: '#fff', fontSize: 22, fontFamily: 'Inter_700Bold', marginTop: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locationText: { color: '#93C5FD', fontSize: 11, fontFamily: 'Inter_400Regular' },
  avatarRing: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
  avatarGrad: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  heroBadgeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 16 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  heroBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontFamily: 'Inter_500Medium' },
  statsStrip: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 18, padding: 12 },
  statCell: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  statVal: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  statLbl: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontFamily: 'Inter_500Medium' },

  body: { padding: 16, gap: 20 },
  section: { gap: 10 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontFamily: 'Inter_700Bold', flex: 1 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { color: '#3B82F6', fontSize: 12, fontFamily: 'Inter_600SemiBold' },

  actionsGrid: { flexDirection: 'row', gap: 10 },
  actionCell: { flex: 1 },
  actionCard: { borderRadius: 16, padding: 14, gap: 8, alignItems: 'flex-start', minHeight: 90, justifyContent: 'space-between' },
  actionLabel: { color: '#fff', fontSize: 11, fontFamily: 'Inter_700Bold', lineHeight: 15 },

  noticeCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  noticeAccent: { height: 4 },
  noticeBody: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  noticeTypeIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  noticeTitle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  noticeMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },

  complaintCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  complaintAccent: { height: 4 },
  complaintBody: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  complaintIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  complaintDesc: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  complaintMeta: { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2, textTransform: 'capitalize' },
  complaintStatusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  complaintStatusText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },

  empty: { borderRadius: 14, borderWidth: 1, padding: 28, alignItems: 'center', gap: 8 },
  emptyText: { fontSize: 13, fontFamily: 'Inter_400Regular' },

  banner: { borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  bannerIcon: { width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
