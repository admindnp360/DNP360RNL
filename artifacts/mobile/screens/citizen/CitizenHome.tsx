import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ComplaintCard } from '@/components/ComplaintCard';
import { NoticeCard } from '@/components/NoticeCard';
import { QuickActionBtn } from '@/components/QuickActionBtn';
import { SectionHeader } from '@/components/SectionHeader';
import { StatCard } from '@/components/StatCard';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
}

export default function CitizenHome() {
  const { user } = useAuth();
  const { notices, getComplaintsByUser } = useAppData();
  const colors = useColors();

  const myComplaints = getComplaintsByUser(user?.id ?? '');
  const active = myComplaints.filter(c => c.status !== 'resolved');
  const resolved = myComplaints.filter(c => c.status === 'resolved');
  const latestNotices = notices.filter(n => n.isActive).slice(0, 3);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#0F2D6B', '#005AB6']} style={styles.header}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.greeting}>{getGreeting()},</Text>
              <Text style={styles.name}>{user?.name ?? 'Citizen'}</Text>
              <Text style={styles.location}>{user?.address ?? 'Daudnagar, Bihar'}</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(user?.name ?? 'C')[0]}</Text>
            </View>
          </View>
          <View style={styles.verifiedRow}>
            <Feather name="shield" size={11} color="#ABC7FF" />
            <Text style={styles.verifiedText}>Verified Citizen · DNP360</Text>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.grid}>
            <StatCard label="My Complaints" value={myComplaints.length} icon="alert-circle" iconColor={colors.citizen} iconBg={colors.citizenBg} accentLeft={colors.citizen} />
            <StatCard label="Resolved" value={resolved.length} icon="check-circle" iconColor={colors.resolved} iconBg={colors.resolvedBg} accentLeft={colors.resolved} />
          </View>
          <View style={styles.grid}>
            <StatCard label="Active" value={active.length} icon="loader" iconColor={colors.inProgress} iconBg={colors.inProgressBg} accentLeft={colors.inProgress} />
            <StatCard label="Notices" value={notices.filter(n => n.isActive).length} icon="volume-2" iconColor={colors.accent} iconBg={colors.submittedBg} accentLeft={colors.accent} />
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SectionHeader title="Quick Actions" />
            <View style={styles.actionsRow}>
              <QuickActionBtn icon="plus-circle" label={'New\nComplaint'} color={colors.citizen} bg={colors.citizenBg} onPress={() => router.push('/(tabs)/action')} />
              <QuickActionBtn icon="clock" label={'Track\nStatus'} color="#6B00C7" bg={colors.inProgressBg} onPress={() => router.push('/(tabs)/action')} />
              <QuickActionBtn icon="volume-2" label={'Read\nNotices'} color={colors.accent} bg="#FFF3E0" onPress={() => router.push('/(tabs)/secondary')} />
              <QuickActionBtn icon="phone-call" label={'Emergency\nCall'} color={colors.destructive} bg="#FDECEA" onPress={() => router.push('/(tabs)/tertiary')} />
            </View>
          </View>

          <SectionHeader title="Latest Notices" actionLabel="See All" />
          <View style={{ gap: 10 }}>
            {latestNotices.map(n => <NoticeCard key={n.id} notice={n} />)}
            {latestNotices.length === 0 && (
              <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }}>No active notices</Text>
              </View>
            )}
          </View>

          {myComplaints.length > 0 && (
            <>
              <SectionHeader title="My Complaints" actionLabel="See All" />
              <View style={{ gap: 10 }}>
                {myComplaints.slice(0, 3).map(c => <ComplaintCard key={c.id} complaint={c} />)}
              </View>
            </>
          )}

          <TouchableOpacity style={styles.announceBannerWrap} activeOpacity={0.85} onPress={() => Linking.openURL('tel:0618400000')}>
            <LinearGradient colors={['#0D2A6E', '#1264E8']} style={styles.announceBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View style={styles.bannerIconWrap}>
                <Feather name="phone" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Nagar Parishad Daudnagar</Text>
                <Text style={styles.bannerSub}>Municipal Office: 06184-XXXXXX</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.7)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingBottom: 28, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { color: '#ABC7FF', fontSize: 13, fontFamily: 'Inter_400Regular' },
  name: { color: '#FFFFFF', fontSize: 24, fontFamily: 'Inter_700Bold', lineHeight: 30 },
  location: { color: '#8AB0D8', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  avatarLetter: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Inter_700Bold' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedText: { color: '#ABC7FF', fontSize: 11, fontFamily: 'Inter_500Medium' },
  body: { padding: 16, gap: 14 },
  grid: { flexDirection: 'row', gap: 10 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1, gap: 14 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  empty: { borderRadius: 12, padding: 24, borderWidth: 1, alignItems: 'center' },
  announceBannerWrap: { borderRadius: 16, overflow: 'hidden' },
  announceBanner: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 16, padding: 16 },
  bannerIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Inter_700Bold' },
  bannerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
