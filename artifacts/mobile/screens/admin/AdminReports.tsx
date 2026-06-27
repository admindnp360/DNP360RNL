import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import type {
  CollectionStatus, GeneratedReport, HouseCollectionRow, ReportType,
} from '@/types';

// ── Design tokens ─────────────────────────────────────────────────────
const BG       = '#060B18';
const GLASS    = 'rgba(255,255,255,0.06)';
const GLASS_HI = 'rgba(255,255,255,0.10)';
const GLASS_BD = 'rgba(255,255,255,0.10)';
const TEXT     = '#F0F4FF';
const MUTED    = 'rgba(255,255,255,0.42)';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const QUARTER_LABELS = ['Q1 (Jan–Mar)', 'Q2 (Apr–Jun)', 'Q3 (Jul–Sep)', 'Q4 (Oct–Dec)'];

type RTab = 'monthly' | 'quarterly' | 'yearly';
const REPORT_TABS: { key: RTab; label: string; icon: string; color: string; grad: readonly [string,string] }[] = [
  { key: 'monthly',   label: 'Monthly',   icon: 'calendar',    color: '#22D3EE', grad: ['#0EA5E9','#0284C7'] },
  { key: 'quarterly', label: 'Quarterly', icon: 'bar-chart-2', color: '#A78BFA', grad: ['#7C3AED','#4F46E5'] },
  { key: 'yearly',    label: 'Yearly',    icon: 'trending-up', color: '#34D399', grad: ['#10B981','#059669'] },
] as const;

// ── Helpers ────────────────────────────────────────────────────────────
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function padDate(n: number) { return String(n).padStart(2, '0'); }

function getStatusColor(s: CollectionStatus) {
  if (s === 'P') return '#34D399';
  if (s === 'L') return '#FBBF24';
  return '#FB7185';
}

// IST check: last day of month, after 9 PM IST
function shouldAutoGenerate(year: number, month: number): boolean {
  const now = new Date();
  // IST = UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + istOffset);
  const lastDay = daysInMonth(month, year);
  return (
    istNow.getFullYear() === year &&
    istNow.getMonth() + 1 === month &&
    istNow.getDate() === lastDay &&
    istNow.getHours() >= 21
  );
}

// ── Main Component ─────────────────────────────────────────────────────
export default function AdminReports() {
  const { houses, wards, houseVisits } = useAppData();
  const { showAlert } = useAlert();

  const now = new Date();
  const [tab, setTab]             = useState<RTab>('monthly');
  const [selYear, setSelYear]     = useState(now.getFullYear());
  const [selMonth, setSelMonth]   = useState(now.getMonth() + 1);
  const [selQuarter, setSelQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));
  const [selWardId, setSelWardId] = useState<string | null>(null);
  const [report, setReport]       = useState<GeneratedReport | null>(null);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [autoGenDone, setAutoGenDone] = useState(false);

  // ── Auto-generate on last day at 9 PM IST ─────────────────────────
  useEffect(() => {
    if (tab === 'monthly' && !autoGenDone && shouldAutoGenerate(selYear, selMonth)) {
      setAutoGenDone(true);
      handleGenerate(true);
    }
  }, [tab, selYear, selMonth]);

  // ── Core: build HouseCollectionRow list ───────────────────────────
  const buildRows = useCallback((
    houseList: typeof houses,
    days: number[],
    startDate: string,
    endDate: string,
  ): HouseCollectionRow[] => {
    return houseList.map((house, idx) => {
      const visits = houseVisits.filter(v =>
        v.houseId === house.id &&
        v.visitDate >= startDate &&
        v.visitDate <= endDate
      );
      const dailyStatus: Record<number, CollectionStatus> = {};
      let totalPresent = 0;
      let totalAbsent  = 0;
      let totalLate    = 0;

      for (const day of days) {
        const dateStr = `${startDate.slice(0, 4)}-${startDate.slice(5, 7)}-${padDate(day)}`;
        const visit = visits.find(v => v.visitDate === dateStr);
        let status: CollectionStatus = 'N';
        if (visit && visit.collectedGarbage) {
          status = visit.isLate ? 'L' : 'P';
        }
        dailyStatus[day] = status;
        if (status === 'P') totalPresent++;
        else if (status === 'L') { totalLate++; totalPresent++; }
        else totalAbsent++;
      }

      const collected = totalPresent; // P + L both count as collected
      const pct = days.length > 0 ? ((collected / days.length) * 100).toFixed(2) + '%' : '0%';

      return {
        sNo: idx + 1,
        houseId: house.id,
        houseRegNo: house.registrationNumber,
        wardNo: house.wardNumber,
        dailyStatus,
        totalPresent,
        totalAbsent,
        totalLate,
        totalDays: days.length,
        percentage: pct,
      };
    });
  }, [houseVisits]);

  // ── Generate monthly report ────────────────────────────────────────
  function buildMonthlyReport(year: number, month: number, wardId: string | null): GeneratedReport {
    const totalDays = daysInMonth(month, year);
    const dayHeaders = Array.from({ length: totalDays }, (_, i) => i + 1);
    const mm = padDate(month);
    const startDate = `${year}-${mm}-01`;
    const endDate   = `${year}-${mm}-${padDate(totalDays)}`;

    const houseList = wardId ? houses.filter(h => h.wardId === wardId) : houses;
    const ward = wardId ? wards.find(w => w.id === wardId) : null;

    return {
      id: `RPT-M-${year}-${mm}${wardId ? `-W${ward?.wardNumber}` : ''}`,
      type: 'monthly',
      label: `${MONTH_NAMES[month - 1]} ${year}${ward ? ` · Ward ${ward.wardNumber}` : ''}`,
      year, month,
      wardId, wardNumber: ward?.wardNumber ?? null,
      generatedAt: new Date().toISOString(),
      rows: buildRows(houseList, dayHeaders, startDate, endDate),
      daysInPeriod: totalDays,
      dayHeaders,
    };
  }

  // ── Generate quarterly report ──────────────────────────────────────
  function buildQuarterlyReport(year: number, quarter: number, wardId: string | null): GeneratedReport {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth   = startMonth + 2;
    const startDate  = `${year}-${padDate(startMonth)}-01`;
    const endDays    = daysInMonth(endMonth, year);
    const endDate    = `${year}-${padDate(endMonth)}-${padDate(endDays)}`;

    // Build a unique "virtual" day list: day 1-90ish; we'll label as month-day
    // For display simplicity: show per-month summary rows
    const houseList = wardId ? houses.filter(h => h.wardId === wardId) : houses;
    const ward = wardId ? wards.find(w => w.id === wardId) : null;

    // Day headers: all days across the 3 months
    const dayHeaders: number[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      const d = daysInMonth(m, year);
      for (let day = 1; day <= d; day++) dayHeaders.push(day + (m - startMonth) * 100);
    }

    // Simplified: use total collection per house across the quarter
    const rows: HouseCollectionRow[] = houseList.map((house, idx) => {
      const visits = houseVisits.filter(v =>
        v.houseId === house.id &&
        v.visitDate >= startDate &&
        v.visitDate <= endDate
      );

      // Build per-month summaries
      let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalDays = 0;
      const dailyStatus: Record<number, CollectionStatus> = {};

      for (let m = startMonth; m <= endMonth; m++) {
        const dInM = daysInMonth(m, year);
        totalDays += dInM;
        for (let day = 1; day <= dInM; day++) {
          const dateStr = `${year}-${padDate(m)}-${padDate(day)}`;
          const visit = visits.find(v => v.visitDate === dateStr);
          let status: CollectionStatus = 'N';
          if (visit && visit.collectedGarbage) status = visit.isLate ? 'L' : 'P';
          const key = day + (m - startMonth) * 100;
          dailyStatus[key] = status;
          if (status === 'P') totalPresent++;
          else if (status === 'L') { totalLate++; totalPresent++; }
          else totalAbsent++;
        }
      }

      const pct = totalDays > 0 ? (((totalPresent) / totalDays) * 100).toFixed(2) + '%' : '0%';
      return {
        sNo: idx + 1, houseId: house.id,
        houseRegNo: house.registrationNumber, wardNo: house.wardNumber,
        dailyStatus, totalPresent, totalAbsent, totalLate, totalDays, percentage: pct,
      };
    });

    return {
      id: `RPT-Q${quarter}-${year}${wardId ? `-W${ward?.wardNumber}` : ''}`,
      type: 'quarterly', label: `${QUARTER_LABELS[quarter - 1]} ${year}${ward ? ` · Ward ${ward.wardNumber}` : ''}`,
      year, quarter, wardId, wardNumber: ward?.wardNumber ?? null,
      generatedAt: new Date().toISOString(),
      rows, daysInPeriod: dayHeaders.length, dayHeaders,
    };
  }

  // ── Generate yearly report ─────────────────────────────────────────
  function buildYearlyReport(year: number, wardId: string | null): GeneratedReport {
    const houseList = wardId ? houses.filter(h => h.wardId === wardId) : houses;
    const ward = wardId ? wards.find(w => w.id === wardId) : null;
    const startDate = `${year}-01-01`;
    const endDate   = `${year}-12-31`;

    let totalDaysInYear = 0;
    for (let m = 1; m <= 12; m++) totalDaysInYear += daysInMonth(m, year);

    const rows: HouseCollectionRow[] = houseList.map((house, idx) => {
      const visits = houseVisits.filter(v =>
        v.houseId === house.id &&
        v.visitDate >= startDate &&
        v.visitDate <= endDate
      );
      let totalPresent = 0, totalAbsent = 0, totalLate = 0;
      for (let m = 1; m <= 12; m++) {
        const dInM = daysInMonth(m, year);
        for (let day = 1; day <= dInM; day++) {
          const dateStr = `${year}-${padDate(m)}-${padDate(day)}`;
          const visit = visits.find(v => v.visitDate === dateStr);
          if (visit && visit.collectedGarbage) {
            if (visit.isLate) { totalLate++; totalPresent++; }
            else totalPresent++;
          } else totalAbsent++;
        }
      }
      const pct = totalDaysInYear > 0 ? (((totalPresent) / totalDaysInYear) * 100).toFixed(2) + '%' : '0%';
      return {
        sNo: idx + 1, houseId: house.id,
        houseRegNo: house.registrationNumber, wardNo: house.wardNumber,
        dailyStatus: {}, totalPresent, totalAbsent, totalLate,
        totalDays: totalDaysInYear, percentage: pct,
      };
    });

    return {
      id: `RPT-Y${year}${wardId ? `-W${ward?.wardNumber}` : ''}`,
      type: 'yearly', label: `Year ${year}${ward ? ` · Ward ${ward.wardNumber}` : ''}`,
      year, wardId, wardNumber: ward?.wardNumber ?? null,
      generatedAt: new Date().toISOString(),
      rows, daysInPeriod: totalDaysInYear, dayHeaders: [],
    };
  }

  async function handleGenerate(silent = false) {
    setGenerating(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      let rpt: GeneratedReport;
      if (tab === 'monthly')   rpt = buildMonthlyReport(selYear, selMonth, selWardId);
      else if (tab === 'quarterly') rpt = buildQuarterlyReport(selYear, selQuarter, selWardId);
      else                      rpt = buildYearlyReport(selYear, selWardId);
      setReport(rpt);
      if (!silent) showAlert('Report Ready', rpt.label, undefined, 'success');
    } finally { setGenerating(false); }
  }

  // ── Export to Excel (.xlsx) ────────────────────────────────────────
  async function handleExport() {
    if (!report) return;
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) { showAlert('Not Supported', 'Sharing is not available on this device.', undefined, 'error'); return; }
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const aoaData: (string | number)[][] = [];

      if (report.type === 'monthly' || report.type === 'quarterly') {
        const dayHdrLabels = report.type === 'monthly'
          ? report.dayHeaders.map(String)
          : report.dayHeaders.map(d => {
              const m = Math.floor(d / 100) + 1;
              const day = d % 100;
              return `${MONTH_NAMES[m - 1].slice(0, 3)}-${padDate(day)}`;
            });
        aoaData.push(['S.No', 'House Reg No', 'Ward No', ...dayHdrLabels, 'P', 'N', 'L', '%']);
        for (const row of report.rows) {
          const dayCells = report.dayHeaders.map(d => row.dailyStatus[d] ?? 'N');
          aoaData.push([row.sNo, row.houseRegNo, row.wardNo, ...dayCells, row.totalPresent, row.totalAbsent, row.totalLate, row.percentage]);
        }
      } else {
        aoaData.push(['S.No', 'House Reg No', 'Ward No', 'Total Present', 'Total Absent', 'Total Late', 'Percentage']);
        for (const row of report.rows) {
          aoaData.push([row.sNo, row.houseRegNo, row.wardNo, row.totalPresent, row.totalAbsent, row.totalLate, row.percentage]);
        }
      }

      // Summary sheet
      const totP = report.rows.reduce((a, r) => a + r.totalPresent, 0);
      const totN = report.rows.reduce((a, r) => a + r.totalAbsent, 0);
      const totL = report.rows.reduce((a, r) => a + r.totalLate, 0);
      const summaryAoa: (string | number)[][] = [
        ['Report', report.label],
        ['Generated At', new Date(report.generatedAt).toLocaleString('en-IN')],
        ['Total Houses', report.rows.length],
        ['Total Collected', totP],
        ['Total Missed', totN],
        ['Total Late', totL],
        ['Avg %', report.rows.length > 0 ? (((totP / (totP + totN)) || 0) * 100).toFixed(2) + '%' : '0%'],
      ];

      const ws = XLSX.utils.aoa_to_sheet(aoaData);
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);
      XLSX.utils.book_append_sheet(wb, ws, 'Collection Data');
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      const xlsxBase64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      const filename = `DNP360_${report.id}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      const path = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(path, xlsxBase64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Export: ${report.label}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    } catch (e: any) { showAlert('Export Failed', e?.message ?? 'Unknown error', undefined, 'error'); }
    finally { setExporting(false); }
  }

  const yearOptions = useMemo(() => {
    const y = now.getFullYear();
    return [y - 2, y - 1, y, y + 1];
  }, []);

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Report type tabs */}
      <View style={s.tabRow}>
        {REPORT_TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tabPill, active && { backgroundColor: t.color + '18', borderColor: t.color + '40' }]}
              onPress={() => { setTab(t.key); setReport(null); }}
              activeOpacity={0.7}
            >
              <Feather name={t.icon as any} size={14} color={active ? t.color : MUTED} />
              <Text style={[s.tabLabel, { color: active ? t.color : MUTED, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Config panel */}
      <View style={s.configCard}>
        <LinearGradient colors={['rgba(99,102,241,0.12)','rgba(79,70,229,0.06)']} style={StyleSheet.absoluteFill as any} />

        {/* Year selector */}
        <Text style={s.cfgLabel}>Year</Text>
        <View style={s.pillRow}>
          {yearOptions.map(y => (
            <TouchableOpacity
              key={y}
              style={[s.optPill, selYear === y && { backgroundColor: '#6366F120', borderColor: '#6366F155' }]}
              onPress={() => { setSelYear(y); setReport(null); }}
            >
              <Text style={[s.optPillTxt, selYear === y && { color: '#818CF8' }]}>{y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month selector (monthly only) */}
        {tab === 'monthly' && (
          <>
            <Text style={[s.cfgLabel, { marginTop: 14 }]}>Month</Text>
            <View style={s.pillGrid}>
              {MONTH_NAMES.map((m, i) => {
                const active = selMonth === i + 1;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[s.monthPill, active && { backgroundColor: '#22D3EE18', borderColor: '#22D3EE50' }]}
                    onPress={() => { setSelMonth(i + 1); setReport(null); }}
                  >
                    <Text style={[s.monthPillTxt, active && { color: '#22D3EE' }]}>{m.slice(0, 3)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* Quarter selector (quarterly only) */}
        {tab === 'quarterly' && (
          <>
            <Text style={[s.cfgLabel, { marginTop: 14 }]}>Quarter</Text>
            <View style={s.pillRow}>
              {[1, 2, 3, 4].map(q => (
                <TouchableOpacity
                  key={q}
                  style={[s.optPill, selQuarter === q && { backgroundColor: '#A78BFA20', borderColor: '#A78BFA55' }]}
                  onPress={() => { setSelQuarter(q); setReport(null); }}
                >
                  <Text style={[s.optPillTxt, selQuarter === q && { color: '#A78BFA' }]}>Q{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Ward selector */}
        <Text style={[s.cfgLabel, { marginTop: 14 }]}>Ward</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          <TouchableOpacity
            style={[s.wardPill, selWardId === null && { backgroundColor: '#6366F120', borderColor: '#6366F155' }]}
            onPress={() => { setSelWardId(null); setReport(null); }}
          >
            <Text style={[s.wardPillTxt, selWardId === null && { color: '#818CF8' }]}>All Wards</Text>
          </TouchableOpacity>
          {wards.map(w => (
            <TouchableOpacity
              key={w.id}
              style={[s.wardPill, selWardId === w.id && { backgroundColor: '#6366F120', borderColor: '#6366F155' }]}
              onPress={() => { setSelWardId(w.id); setReport(null); }}
            >
              <Text style={[s.wardPillTxt, selWardId === w.id && { color: '#818CF8' }]}>Ward {w.wardNumber}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Generate button */}
        <TouchableOpacity
          onPress={() => handleGenerate(false)}
          disabled={generating}
          activeOpacity={0.85}
          style={{ marginTop: 16 }}
        >
          <LinearGradient
            colors={tab === 'monthly' ? ['#0EA5E9','#0284C7'] : tab === 'quarterly' ? ['#7C3AED','#4F46E5'] : ['#10B981','#059669']}
            style={s.genBtn}
          >
            {generating
              ? <ActivityIndicator size={16} color="#fff" />
              : <>
                  <Feather name="zap" size={15} color="#fff" />
                  <Text style={s.genBtnTxt}>Generate Report</Text>
                </>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Report table */}
      {report && (
        <View style={{ marginHorizontal: 14, marginTop: 16 }}>
          {/* Report header */}
          <View style={s.reportHeader}>
            <LinearGradient colors={['rgba(99,102,241,0.15)','rgba(79,70,229,0.08)']} style={StyleSheet.absoluteFill as any} />
            <View style={{ flex: 1 }}>
              <Text style={s.reportTitle}>{report.label}</Text>
              <Text style={s.reportSub}>
                {report.rows.length} houses · Generated {new Date(report.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            {/* Export Excel + Share */}
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.8}
            >
              <LinearGradient colors={['#10B981','#059669']} style={s.exportBtnWide}>
                {exporting
                  ? <ActivityIndicator size={13} color="#fff" />
                  : <>
                      <Feather name="download" size={13} color="#fff" />
                      <Text style={s.exportBtnWideTxt}>Excel</Text>
                      <Feather name="share-2" size={13} color="rgba(255,255,255,0.7)" />
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={s.legend}>
            {([['P','Collected','#34D399'],['N','Not Collected','#FB7185'],['L','Late','#FBBF24']] as const).map(([code, label, color]) => (
              <View key={code} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: color }]} />
                <Text style={[s.legendCode, { color }]}>{code}</Text>
                <Text style={s.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Summary stats */}
          {report.rows.length > 0 && (
            <View style={s.summaryRow}>
              {(() => {
                const totP = report.rows.reduce((a, r) => a + r.totalPresent, 0);
                const totN = report.rows.reduce((a, r) => a + r.totalAbsent, 0);
                const totL = report.rows.reduce((a, r) => a + r.totalLate, 0);
                const totAll = totP + totN;
                const avgPct = totAll > 0 ? ((totP / totAll) * 100).toFixed(1) + '%' : '—';
                return [
                  { label: 'Collected', value: totP, color: '#34D399' },
                  { label: 'Missed',    value: totN, color: '#FB7185' },
                  { label: 'Late',      value: totL, color: '#FBBF24' },
                  { label: 'Avg %',     value: avgPct, color: '#818CF8', isStr: true },
                ].map(st => (
                  <View key={st.label} style={[s.summaryCell, { borderColor: st.color + '30', backgroundColor: st.color + '0E' }]}>
                    <Text style={[s.summaryVal, { color: st.color }]}>{st.value}</Text>
                    <Text style={s.summaryLbl}>{st.label}</Text>
                  </View>
                ));
              })()}
            </View>
          )}

          {/* Table */}
          {report.type !== 'yearly' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator style={s.tableWrap}>
              <View>
                {/* Table header */}
                <View style={s.tableHdrRow}>
                  <Text style={[s.thCell, { width: 36 }]}>#</Text>
                  <Text style={[s.thCell, { width: 110 }]}>Reg No</Text>
                  <Text style={[s.thCell, { width: 50 }]}>Ward</Text>
                  {report.dayHeaders.map(d => {
                    const label = report.type === 'quarterly'
                      ? (() => { const m = Math.floor(d / 100) + 1; const day = d % 100; return `${MONTH_NAMES[m-1].slice(0,1)}${padDate(day)}`; })()
                      : String(d);
                    return <Text key={d} style={[s.thCell, s.dayCell]}>{label}</Text>;
                  })}
                  <Text style={[s.thCell, { width: 30 }]}>P</Text>
                  <Text style={[s.thCell, { width: 30 }]}>N</Text>
                  <Text style={[s.thCell, { width: 30 }]}>L</Text>
                  <Text style={[s.thCell, { width: 55 }]}>%</Text>
                </View>

                {/* Table rows */}
                {report.rows.map((row, ri) => (
                  <View key={row.houseId} style={[s.tableRow, ri % 2 === 0 ? s.tableRowEven : s.tableRowOdd]}>
                    <Text style={[s.tdCell, { width: 36, color: MUTED }]}>{row.sNo}</Text>
                    <Text style={[s.tdCell, { width: 110, color: '#818CF8' }]} numberOfLines={1}>{row.houseRegNo}</Text>
                    <Text style={[s.tdCell, { width: 50, color: TEXT }]}>{row.wardNo}</Text>
                    {report.dayHeaders.map(d => {
                      const status = row.dailyStatus[d] ?? 'N';
                      return (
                        <View key={d} style={[s.dayCell, { alignItems: 'center', justifyContent: 'center' }]}>
                          <Text style={{ fontSize: 10, fontFamily: 'Inter_700Bold', color: getStatusColor(status) }}>
                            {status}
                          </Text>
                        </View>
                      );
                    })}
                    <Text style={[s.tdCell, { width: 30, color: '#34D399' }]}>{row.totalPresent}</Text>
                    <Text style={[s.tdCell, { width: 30, color: '#FB7185' }]}>{row.totalAbsent}</Text>
                    <Text style={[s.tdCell, { width: 30, color: '#FBBF24' }]}>{row.totalLate}</Text>
                    <Text style={[s.tdCell, { width: 55, color: '#818CF8' }]}>{row.percentage}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            /* Yearly summary table */
            <View style={s.tableWrap}>
              <View style={s.tableHdrRow}>
                <Text style={[s.thCell, { width: 36 }]}>#</Text>
                <Text style={[s.thCell, { flex: 1, minWidth: 110 }]}>House Reg No</Text>
                <Text style={[s.thCell, { width: 50 }]}>Ward</Text>
                <Text style={[s.thCell, { width: 55 }]}>P Days</Text>
                <Text style={[s.thCell, { width: 55 }]}>N Days</Text>
                <Text style={[s.thCell, { width: 45 }]}>Late</Text>
                <Text style={[s.thCell, { width: 60 }]}>%</Text>
              </View>
              {report.rows.map((row, ri) => (
                <View key={row.houseId} style={[s.tableRow, ri % 2 === 0 ? s.tableRowEven : s.tableRowOdd]}>
                  <Text style={[s.tdCell, { width: 36, color: MUTED }]}>{row.sNo}</Text>
                  <Text style={[s.tdCell, { flex: 1, minWidth: 110, color: '#818CF8' }]} numberOfLines={1}>{row.houseRegNo}</Text>
                  <Text style={[s.tdCell, { width: 50, color: TEXT }]}>{row.wardNo}</Text>
                  <Text style={[s.tdCell, { width: 55, color: '#34D399' }]}>{row.totalPresent}</Text>
                  <Text style={[s.tdCell, { width: 55, color: '#FB7185' }]}>{row.totalAbsent}</Text>
                  <Text style={[s.tdCell, { width: 45, color: '#FBBF24' }]}>{row.totalLate}</Text>
                  <Text style={[s.tdCell, { width: 60, color: '#818CF8' }]}>{row.percentage}</Text>
                </View>
              ))}
            </View>
          )}

          {report.rows.length === 0 && (
            <View style={s.emptyCard}>
              <Feather name="file-text" size={28} color={MUTED} />
              <Text style={s.emptyTitle}>No Houses Found</Text>
              <Text style={s.emptySub}>No house data for the selected period/ward</Text>
            </View>
          )}
        </View>
      )}

      {!report && !generating && (
        <View style={s.emptyCard}>
          <LinearGradient colors={['rgba(99,102,241,0.18)','rgba(79,70,229,0.10)']} style={s.emptyIconBox}>
            <Feather name="bar-chart-2" size={26} color="#818CF8" />
          </LinearGradient>
          <Text style={s.emptyTitle}>No Report Yet</Text>
          <Text style={s.emptySub}>Configure filters above and tap Generate</Text>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  tabRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tabPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', backgroundColor: GLASS },
  tabLabel: { fontSize: 12 },

  configCard: { marginHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, padding: 16, overflow: 'hidden' },
  cfgLabel: { fontSize: 11, fontFamily: 'Inter_700Bold', color: MUTED, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 },
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS },
  optPillTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: MUTED },
  pillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  monthPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS },
  monthPillTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: MUTED },
  wardPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: GLASS_BD, backgroundColor: GLASS },
  wardPillTxt: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: MUTED },
  genBtn: { borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  genBtnTxt: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  reportHeader: { borderRadius: 16, borderWidth: 1, borderColor: GLASS_BD, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', marginBottom: 12 },
  reportTitle: { color: TEXT, fontSize: 14, fontFamily: 'Inter_700Bold' },
  reportSub: { color: MUTED, fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  exportBtnWide: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  exportBtnWideTxt: { color: '#fff', fontSize: 12, fontFamily: 'Inter_700Bold' },

  legend: { flexDirection: 'row', gap: 14, marginBottom: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendCode: { fontSize: 12, fontFamily: 'Inter_700Bold' },
  legendLabel: { fontSize: 11, fontFamily: 'Inter_400Regular', color: MUTED },

  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCell: { flex: 1, borderRadius: 12, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  summaryVal: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  summaryLbl: { fontSize: 9, fontFamily: 'Inter_500Medium', color: MUTED, marginTop: 2 },

  tableWrap: { borderRadius: 14, borderWidth: 1, borderColor: GLASS_BD, overflow: 'hidden', backgroundColor: GLASS },
  tableHdrRow: { flexDirection: 'row', backgroundColor: 'rgba(99,102,241,0.12)', paddingVertical: 8, paddingHorizontal: 6 },
  thCell: { fontSize: 10, fontFamily: 'Inter_700Bold', color: '#818CF8', textTransform: 'uppercase', letterSpacing: 0.3, paddingHorizontal: 3, textAlign: 'center' },
  dayCell: { width: 22, paddingHorizontal: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  tableRowEven: { backgroundColor: 'transparent' },
  tableRowOdd: { backgroundColor: 'rgba(255,255,255,0.025)' },
  tdCell: { fontSize: 10, fontFamily: 'Inter_600SemiBold', paddingHorizontal: 3, textAlign: 'center', alignSelf: 'center' },

  emptyCard: { marginHorizontal: 14, marginTop: 30, borderRadius: 18, borderWidth: 1, borderColor: GLASS_BD, padding: 40, alignItems: 'center', gap: 12, backgroundColor: GLASS },
  emptyIconBox: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { color: TEXT, fontSize: 15, fontFamily: 'Inter_700Bold' },
  emptySub: { color: MUTED, fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
