import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';
import { useAlert } from '@/contexts/AlertContext';
import { useAppData } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { useColors } from '@/hooks/useColors';
import type { House, ImportError } from '@/types';
import { PROPERTY_TYPES } from '@/types';

type DupMode = 'skip' | 'update' | 'replace';
type SubTab = 'import' | 'history';

const CSV_TEMPLATE = `S.No,House Registration No,Owner Name,Father/Husband Name,Ward,Address,Mobile,Property Type
1,DNPH001,Ramesh Prasad,Shiv Prasad,1,Ward 1 Station Road Daudnagar,9876543210,Residential
2,DNPH002,Sunita Devi,Ram Kumar,2,Ward 2 Market Road Daudnagar,9876543211,Commercial`;

interface ParsedRow {
  rowNumber: number;
  registrationNo: string;
  ownerName: string;
  fatherOrHusband?: string;
  ward: string;
  address: string;
  mobile?: string;
  propertyType?: string;
  status: 'valid' | 'duplicate' | 'error' | 'dup_excel';
  errorReason?: string;
  wardId?: string;
  wardNumber?: string;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  return lines.map(line => {
    const cells: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  });
}

const STATUS_CFG = {
  valid:     { label: 'Valid',      color: '#10B981', bg: '#10B98118', icon: 'check-circle' },
  duplicate: { label: 'Duplicate',  color: '#F59E0B', bg: '#F59E0B18', icon: 'copy' },
  error:     { label: 'Error',      color: '#EF4444', bg: '#EF444418', icon: 'x-circle' },
  dup_excel: { label: 'Dup in File',color: '#F97316', bg: '#F9731618', icon: 'alert-triangle' },
} as const;

export default function SuperAdminImport({ embedded = false }: { embedded?: boolean }) {
  const { houses, wards, bulkImportHouses, addImportHistory, importHistory, deleteImportHistory } = useAppData();
  const { user } = useAuth();
  const colors = useColors();
  const { showAlert } = useAlert();

  const [subTab, setSubTab] = useState<SubTab>('import');
  const [csvText, setCsvText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [dupMode, setDupMode] = useState<DupMode>('skip');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importStats, setImportStats] = useState<{ imported: number; skipped: number; failed: number } | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<typeof importHistory[0] | null>(null);
  const [sourceFileName, setSourceFileName] = useState('Manual CSV Import');
  const [pickingFile, setPickingFile] = useState(false);
  const webFileInputRef = useRef<any>(null);

  const totalHouses = houses.length;
  const importsDone = importHistory.length;
  const totalWards = wards.length;

  function validateRows(rows: string[][]) {
    if (rows.length < 2) {
      showAlert('Invalid', 'File must have a header row + at least one data row.', undefined, 'error');
      return;
    }
    const seenReg = new Set<string>();
    const results: ParsedRow[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.every(c => !String(c ?? '').trim())) continue;
      const regNo = String(cols[1] ?? '').trim();
      const ownerName = String(cols[2] ?? '').trim();
      const fatherOrHusband = String(cols[3] ?? '').trim() || undefined;
      const wardInput = String(cols[4] ?? '').trim();
      const address = String(cols[5] ?? '').trim();
      const mobile = String(cols[6] ?? '').trim() || undefined;
      const propType = String(cols[7] ?? '').trim() || undefined;
      const errors: string[] = [];
      if (!regNo) errors.push('Registration No required');
      if (!ownerName) errors.push('Owner Name required');
      if (!address) errors.push('Address required');
      if (mobile && !/^\d{10}$/.test(mobile)) errors.push('Mobile must be 10 digits');
      if (propType && !PROPERTY_TYPES.includes(propType as any)) errors.push(`Invalid property type: ${propType}`);
      const matchedWard = wards.find(w =>
        w.wardNumber === wardInput ||
        w.id === wardInput ||
        w.name.toLowerCase().includes(wardInput.toLowerCase())
      );
      if (!matchedWard && wardInput) errors.push(`Ward "${wardInput}" not found`);
      let status: ParsedRow['status'] = 'valid';
      let errorReason: string | undefined;
      if (errors.length > 0) { status = 'error'; errorReason = errors.join('; '); }
      else if (seenReg.has(regNo.toUpperCase())) { status = 'dup_excel'; errorReason = 'Duplicate in file'; }
      else if (houses.some(h => h.registrationNumber.toUpperCase() === regNo.toUpperCase())) { status = 'duplicate'; errorReason = 'Already exists in DB'; }
      seenReg.add(regNo.toUpperCase());
      results.push({ rowNumber: i, registrationNo: regNo, ownerName, fatherOrHusband, ward: wardInput, address, mobile, propertyType: propType, status, errorReason, wardId: matchedWard?.id, wardNumber: matchedWard?.wardNumber });
    }
    setParsedRows(results);
    setIsPreviewing(true);
    setImportStats(null);
  }

  function validateAndPreview() {
    if (!csvText.trim()) {
      showAlert('Empty', 'Paste CSV content first.', undefined, 'warning');
      return;
    }
    const rows = parseCSV(csvText);
    setSourceFileName('Manual CSV Import');
    validateRows(rows);
  }

  async function parseAndLoad(fileName: string, readFile: () => Promise<string[][] | null>) {
    setSourceFileName(fileName);
    setPickingFile(true);
    try {
      const rows = await readFile();
      if (!rows) return;
      setCsvText('');
      setShowInput(false);
      validateRows(rows);
    } catch (e: any) {
      showAlert('File Error', e?.message ?? 'Could not read file.', undefined, 'error');
    } finally {
      setPickingFile(false);
    }
  }

  async function readFileNative(uri: string, isCSV: boolean): Promise<string[][]> {
    if (isCSV) {
      const text = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      return parseCSV(text);
    }
    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const wb = XLSX.read(b64, { type: 'base64' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][];
  }

  async function handleWebFileChange(e: any) {
    const file: File = e?.target?.files?.[0];
    if (!file) return;
    const fileName = file.name || 'Imported File';
    const isCSV = fileName.toLowerCase().endsWith('.csv');
    await parseAndLoad(fileName, async () => {
      const buffer = await file.arrayBuffer();
      if (isCSV) {
        const text = new TextDecoder('utf-8').decode(buffer);
        return parseCSV(text);
      }
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false }) as string[][];
    });
    if (webFileInputRef.current) webFileInputRef.current.value = '';
  }

  async function handlePickExcel() {
    if (Platform.OS === 'web') {
      webFileInputRef.current?.click();
      return;
    }
    setPickingFile(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) { setPickingFile(false); return; }
      const asset = result.assets[0];
      const fileName = asset.name || 'Imported File';
      const isCSV = fileName.toLowerCase().endsWith('.csv');
      await parseAndLoad(fileName, () => readFileNative(asset.uri, isCSV));
    } catch (e: any) {
      showAlert('File Error', e?.message ?? 'Could not read file.', undefined, 'error');
      setPickingFile(false);
    }
  }

  const counts = {
    total: parsedRows.length,
    valid: parsedRows.filter(r => r.status === 'valid').length,
    duplicate: parsedRows.filter(r => r.status === 'duplicate').length,
    dup_excel: parsedRows.filter(r => r.status === 'dup_excel').length,
    error: parsedRows.filter(r => r.status === 'error').length,
  };

  async function handleImport() {
    const validRows = parsedRows.filter(r => r.status === 'valid' || (r.status === 'duplicate' && dupMode !== 'skip'));
    if (validRows.length === 0) {
      showAlert('Nothing to import', 'No valid rows found.', undefined, 'warning');
      return;
    }
    setImporting(true);
    setProgress(0);
    setImportStats(null);
    const toImport: Omit<House, 'id'>[] = parsedRows
      .filter(r => r.status === 'valid' || (r.status === 'duplicate' && dupMode !== 'skip'))
      .map(r => ({
        registrationNumber: r.registrationNo,
        ownerName: r.ownerName,
        fatherOrHusband: r.fatherOrHusband,
        mobile: r.mobile || '',
        address: r.address,
        wardId: r.wardId || 'UNKNOWN',
        wardNumber: r.wardNumber || '0',
        propertyType: PROPERTY_TYPES.includes(r.propertyType as any) ? r.propertyType as any : undefined,
        status: 'Active' as const,
        isActive: true,
        createdBy: user?.name,
      }));
    try {
      const result = await bulkImportHouses(toImport, dupMode, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      setImportStats({ imported: result.imported, skipped: result.skipped, failed: result.failed });
      const errorReport: ImportError[] = [
        ...parsedRows.filter(r => r.status === 'error' || r.status === 'dup_excel').map(r => ({
          rowNumber: r.rowNumber,
          registrationNo: r.registrationNo,
          reason: r.errorReason || 'Unknown error',
        })),
        ...result.errors,
      ];
      await addImportHistory({
        fileName: sourceFileName,
        totalRows: parsedRows.length,
        successRows: result.imported,
        failedRows: result.failed + counts.error + counts.dup_excel,
        duplicateRows: result.skipped + counts.duplicate,
        uploadedBy: user?.id || '',
        uploadedByName: user?.name || 'Super Admin',
        uploadedTime: new Date().toISOString(),
        status: result.failed === 0 ? 'completed' : result.imported > 0 ? 'partial' : 'failed',
        errorReport,
      });
      showAlert('Import Complete', `${result.imported} imported · ${result.skipped} skipped · ${result.failed} failed`, undefined, 'success');
      setParsedRows([]);
      setIsPreviewing(false);
      setCsvText('');
      setShowInput(false);
    } catch (e) {
      showAlert('Import Failed', String(e), undefined, 'error');
    } finally {
      setImporting(false);
      setProgress(0);
    }
  }

  function resetImport() {
    setParsedRows([]);
    setIsPreviewing(false);
    setCsvText('');
    setImportStats(null);
    setShowInput(false);
    setSourceFileName('Manual CSV Import');
  }

  /* ─────────────────────────────────────────────────────── render */
  const content = (
    <View style={{ flex: 1, backgroundColor: embedded ? '#060B18' : colors.background }}>

      {/* ── HERO HEADER (only when not embedded) ── */}
      {!embedded && (
        <LinearGradient colors={['#0F0A2A', '#0C1A4A', '#0A2A3A']} style={s.hero}>
          <View style={s.heroContent}>
            <View style={{ flex: 1 }}>
              <View style={s.heroBadge}>
                <Feather name="star" size={9} color="#FFD700" />
                <Text style={s.heroBadgeText}>SUPER ADMIN</Text>
              </View>
              <Text style={s.heroTitle}>Bulk Import</Text>
              <Text style={s.heroSub}>Excel & CSV import for House Database</Text>
            </View>
            <LinearGradient colors={['#6366F130', '#0EA5E930']} style={s.heroIconRing}>
              <Feather name="upload-cloud" size={24} color="#A5B4FC" />
            </LinearGradient>
          </View>
          <View style={s.heroStats}>
            {[
              { icon: 'home', label: 'Total Houses', val: totalHouses, grad: ['#6366F1', '#4F46E5'] as [string,string] },
              { icon: 'clock', label: 'Imports Done', val: importsDone, grad: ['#0EA5E9', '#0284C7'] as [string,string] },
              { icon: 'map-pin', label: 'Wards', val: totalWards, grad: ['#10B981', '#059669'] as [string,string] },
            ].map(st => (
              <LinearGradient key={st.label} colors={st.grad} style={s.heroStatCard}>
                <Feather name={st.icon as any} size={13} color="rgba(255,255,255,0.75)" />
                <Text style={s.heroStatVal}>{st.val}</Text>
                <Text style={s.heroStatLabel}>{st.label}</Text>
              </LinearGradient>
            ))}
          </View>
        </LinearGradient>
      )}

      {/* ── SUB TAB BAR ── */}
      <View style={[s.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([
          { key: 'import',  icon: 'upload-cloud', label: 'Import',  color: '#6366F1' },
          { key: 'history', icon: 'clock',        label: 'History', color: '#0EA5E9' },
        ] as const).map(tab => {
          const active = subTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tabItem, active && { borderBottomColor: tab.color }]}
              onPress={() => setSubTab(tab.key)}
              activeOpacity={0.7}
            >
              <Feather name={tab.icon} size={16} color={active ? tab.color : colors.mutedForeground} />
              <Text style={[s.tabLabel, { color: active ? tab.color : colors.mutedForeground, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {tab.label}
              </Text>
              {tab.key === 'history' && importHistory.length > 0 && (
                <View style={[s.tabBadge, { backgroundColor: tab.color }]}>
                  <Text style={s.tabBadgeText}>{importHistory.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ══════════════ IMPORT TAB ══════════════ */}
      {subTab === 'import' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!isPreviewing ? (
            <>
              {/* ── Step indicator ── */}
              <View style={s.steps}>
                {(['Upload File', 'Preview & Validate', 'Import Records'] as const).map((lbl, i) => (
                  <React.Fragment key={lbl}>
                    <View style={s.stepItem}>
                      <LinearGradient
                        colors={i === 0 ? ['#6366F1', '#4F46E5'] : ['#E5E7EB', '#D1D5DB']}
                        style={s.stepCircle}
                      >
                        <Text style={[s.stepNum, { color: i === 0 ? '#fff' : '#9CA3AF' }]}>{i + 1}</Text>
                      </LinearGradient>
                      <Text style={[s.stepLabel, { color: i === 0 ? '#6366F1' : colors.mutedForeground }]}>{lbl}</Text>
                    </View>
                    {i < 2 && <View style={[s.stepLine, { backgroundColor: colors.border }]} />}
                  </React.Fragment>
                ))}
              </View>

              {/* ── Template download card ── */}
              <TouchableOpacity
                style={[s.templateCard, { borderColor: '#6366F130' }]}
                onPress={() => setShowTemplate(true)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.templateIconBox}>
                  <Feather name="file-text" size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.templateTitle, { color: colors.text }]}>Download CSV Template</Text>
                  <Text style={[s.templateSub, { color: colors.mutedForeground }]}>View the correct column format before importing</Text>
                </View>
                <View style={[s.templateArrow, { backgroundColor: '#6366F115' }]}>
                  <Feather name="arrow-right" size={15} color="#6366F1" />
                </View>
              </TouchableOpacity>

              {/* ── Column format guide ── */}
              <View style={[s.colGuide, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.colGuideHdr}>
                  <LinearGradient colors={['#0EA5E9', '#0284C7']} style={s.colGuideIcon}>
                    <Feather name="columns" size={13} color="#fff" />
                  </LinearGradient>
                  <Text style={[s.colGuideTitle, { color: colors.text }]}>Expected Columns</Text>
                  <View style={[s.colGuideNote, { backgroundColor: '#0EA5E915' }]}>
                    <Text style={[s.colGuideNoteText, { color: '#0EA5E9' }]}>Col A → H</Text>
                  </View>
                </View>
                <View style={s.colChipRow}>
                  {[
                    { name: 'S.No',            req: false },
                    { name: 'Reg No',          req: true  },
                    { name: 'Owner Name',      req: true  },
                    { name: 'Father/Husband',  req: false },
                    { name: 'Ward',            req: false },
                    { name: 'Address',         req: true  },
                    { name: 'Mobile',          req: false },
                    { name: 'Property Type',   req: false },
                  ].map((col, i) => (
                    <View key={col.name} style={[
                      s.colChip,
                      { backgroundColor: col.req ? '#6366F112' : colors.background, borderColor: col.req ? '#6366F140' : colors.border },
                    ]}>
                      <Text style={[s.colChipLetter, { color: '#9CA3AF' }]}>{String.fromCharCode(65 + i)}</Text>
                      <Text style={[s.colChipName, { color: col.req ? '#6366F1' : colors.text }]}>{col.name}</Text>
                      {col.req && <View style={s.colReqDot} />}
                    </View>
                  ))}
                </View>
                <View style={[s.colGuideFooter, { borderTopColor: colors.border }]}>
                  <View style={s.colLegendItem}>
                    <View style={[s.colLegendDot, { backgroundColor: '#6366F1' }]} />
                    <Text style={[s.colLegendText, { color: colors.mutedForeground }]}>Required</Text>
                  </View>
                  <View style={s.colLegendItem}>
                    <View style={[s.colLegendDot, { backgroundColor: colors.border }]} />
                    <Text style={[s.colLegendText, { color: colors.mutedForeground }]}>Optional</Text>
                  </View>
                  <Text style={[s.colLegendText, { color: colors.mutedForeground, marginLeft: 'auto' }]}>
                    Property: Residential · Commercial · Government…
                  </Text>
                </View>
              </View>

              {/* ── Upload options ── */}
              {!showInput && (
                <View style={s.uploadRow}>
                  {/* Pick File */}
                  <TouchableOpacity
                    style={[s.uploadCard, { backgroundColor: colors.card, borderColor: '#10B98140' }]}
                    onPress={handlePickExcel}
                    disabled={pickingFile}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#10B981', '#059669']} style={s.uploadCardIcon}>
                      {pickingFile
                        ? <ActivityIndicator size={20} color="#fff" />
                        : <Feather name="folder" size={20} color="#fff" />}
                    </LinearGradient>
                    <Text style={[s.uploadCardTitle, { color: colors.text }]}>Pick File</Text>
                    <Text style={[s.uploadCardSub, { color: colors.mutedForeground }]}>Excel or CSV from device</Text>
                    <View style={s.uploadCardFormats}>
                      {['.xlsx', '.xls', '.csv'].map(f => (
                        <View key={f} style={[s.formatBadge, { backgroundColor: '#10B98112', borderColor: '#10B98130' }]}>
                          <Text style={[s.formatText, { color: '#10B981' }]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>

                  {/* Paste CSV */}
                  <TouchableOpacity
                    style={[s.uploadCard, { backgroundColor: colors.card, borderColor: '#6366F140' }]}
                    onPress={() => setShowInput(true)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.uploadCardIcon}>
                      <Feather name="clipboard" size={20} color="#fff" />
                    </LinearGradient>
                    <Text style={[s.uploadCardTitle, { color: colors.text }]}>Paste CSV</Text>
                    <Text style={[s.uploadCardSub, { color: colors.mutedForeground }]}>Copy & paste raw text</Text>
                    <View style={s.uploadCardFormats}>
                      <View style={[s.formatBadge, { backgroundColor: '#6366F112', borderColor: '#6366F130' }]}>
                        <Text style={[s.formatText, { color: '#6366F1' }]}>Manual</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── CSV paste input ── */}
              {showInput && (
                <View style={[s.pasteCard, { backgroundColor: colors.card, borderColor: '#6366F130' }]}>
                  <View style={s.pasteCardHdr}>
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.pasteCardIcon}>
                      <Feather name="clipboard" size={14} color="#fff" />
                    </LinearGradient>
                    <Text style={[s.pasteCardTitle, { color: colors.text }]}>Paste CSV Content</Text>
                    <TouchableOpacity
                      onPress={() => { setShowInput(false); setCsvText(''); }}
                      style={[s.pasteCloseBtn, { backgroundColor: colors.background }]}
                    >
                      <Feather name="x" size={14} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[s.csvTextArea, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    multiline
                    numberOfLines={8}
                    placeholder={`S.No,House Registration No,Owner Name,...\n1,DNPH001,Ramesh Prasad,...`}
                    placeholderTextColor={colors.mutedForeground}
                    value={csvText}
                    onChangeText={setCsvText}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity onPress={validateAndPreview} activeOpacity={0.85}>
                    <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.previewBtn}>
                      <Feather name="eye" size={16} color="#fff" />
                      <Text style={s.previewBtnText}>Preview & Validate</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              {/* ── Step indicator (step 2 active) ── */}
              <View style={s.steps}>
                {(['Upload File', 'Preview & Validate', 'Import Records'] as const).map((lbl, i) => (
                  <React.Fragment key={lbl}>
                    <View style={s.stepItem}>
                      <LinearGradient
                        colors={i === 0 ? ['#10B981', '#059669'] : i === 1 ? ['#6366F1', '#4F46E5'] : ['#E5E7EB', '#D1D5DB']}
                        style={s.stepCircle}
                      >
                        {i === 0
                          ? <Feather name="check" size={12} color="#fff" />
                          : <Text style={[s.stepNum, { color: i === 1 ? '#fff' : '#9CA3AF' }]}>{i + 1}</Text>}
                      </LinearGradient>
                      <Text style={[s.stepLabel, {
                        color: i === 0 ? '#10B981' : i === 1 ? '#6366F1' : colors.mutedForeground,
                      }]}>{lbl}</Text>
                    </View>
                    {i < 2 && <View style={[s.stepLine, { backgroundColor: i === 0 ? '#10B98140' : colors.border }]} />}
                  </React.Fragment>
                ))}
              </View>

              {/* ── File source banner ── */}
              <View style={[s.sourceBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.sourceIconBox}>
                  <Feather name="file-text" size={14} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.sourceFile, { color: colors.text }]} numberOfLines={1}>{sourceFileName}</Text>
                  <Text style={[s.sourceRows, { color: colors.mutedForeground }]}>{counts.total} rows parsed</Text>
                </View>
                <TouchableOpacity onPress={resetImport} style={[s.sourceReset, { borderColor: colors.border }]}>
                  <Feather name="refresh-ccw" size={13} color={colors.mutedForeground} />
                  <Text style={[s.sourceResetText, { color: colors.mutedForeground }]}>Reset</Text>
                </TouchableOpacity>
              </View>

              {/* ── Preview stat pills ── */}
              <View style={s.statPills}>
                {[
                  { label: 'Total',     val: counts.total,                     color: '#6366F1', icon: 'list' },
                  { label: 'Valid',     val: counts.valid,                     color: '#10B981', icon: 'check-circle' },
                  { label: 'Duplicate',val: counts.duplicate,                  color: '#F59E0B', icon: 'copy' },
                  { label: 'Error',     val: counts.error + counts.dup_excel,  color: '#EF4444', icon: 'x-circle' },
                ].map(st => (
                  <View key={st.label} style={[s.statPill, { backgroundColor: st.color + '12', borderColor: st.color + '30' }]}>
                    <Feather name={st.icon as any} size={14} color={st.color} />
                    <Text style={[s.statPillNum, { color: st.color }]}>{st.val}</Text>
                    <Text style={[s.statPillLabel, { color: st.color + 'BB' }]}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* ── Duplicate handling ── */}
              <View style={[s.dupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.dupHdr}>
                  <LinearGradient colors={['#F59E0B', '#D97706']} style={s.dupHdrIcon}>
                    <Feather name="copy" size={13} color="#fff" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.dupTitle, { color: colors.text }]}>Duplicate Handling</Text>
                    <Text style={[s.dupSub, { color: colors.mutedForeground }]}>
                      {counts.duplicate} duplicate{counts.duplicate !== 1 ? 's' : ''} found in DB
                    </Text>
                  </View>
                </View>
                <View style={s.dupOptions}>
                  {([
                    { mode: 'skip',    label: 'Skip',    desc: 'Keep existing',  icon: 'skip-forward', color: '#6B7280' },
                    { mode: 'update',  label: 'Update',  desc: 'Merge fields',   icon: 'edit-2',       color: '#6366F1' },
                    { mode: 'replace', label: 'Replace', desc: 'Overwrite all',  icon: 'refresh-cw',   color: '#EF4444' },
                  ] as const).map(opt => {
                    const active = dupMode === opt.mode;
                    return (
                      <TouchableOpacity
                        key={opt.mode}
                        style={[s.dupOption, { borderColor: active ? opt.color : colors.border, backgroundColor: active ? opt.color + '10' : 'transparent' }]}
                        onPress={() => setDupMode(opt.mode)}
                        activeOpacity={0.8}
                      >
                        <Feather name={opt.icon} size={16} color={active ? opt.color : colors.mutedForeground} />
                        <Text style={[s.dupOptionLabel, { color: active ? opt.color : colors.text }]}>{opt.label}</Text>
                        <Text style={[s.dupOptionDesc, { color: colors.mutedForeground }]}>{opt.desc}</Text>
                        {active && <View style={[s.dupActiveDot, { backgroundColor: opt.color }]} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* ── Preview rows ── */}
              <View style={[s.previewTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.previewTableHdr, { backgroundColor: '#6366F108', borderBottomColor: colors.border }]}>
                  <Text style={[s.previewTh, { width: 36, color: colors.mutedForeground }]}>#</Text>
                  <Text style={[s.previewTh, { flex: 1, color: colors.mutedForeground }]}>Reg No</Text>
                  <Text style={[s.previewTh, { flex: 1.6, color: colors.mutedForeground }]}>Owner Name</Text>
                  <Text style={[s.previewTh, { width: 32, color: colors.mutedForeground }]}>Ward</Text>
                  <Text style={[s.previewTh, { width: 70, color: colors.mutedForeground }]}>Status</Text>
                </View>
                <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
                  {parsedRows.map(row => {
                    const cfg = STATUS_CFG[row.status];
                    return (
                      <View key={row.rowNumber} style={[s.previewRow, { borderBottomColor: colors.border, backgroundColor: cfg.bg }]}>
                        <Text style={[s.previewTd, { width: 36, color: colors.mutedForeground }]}>{row.rowNumber}</Text>
                        <Text style={[s.previewTd, { flex: 1, color: '#6366F1', fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                          {row.registrationNo || '—'}
                        </Text>
                        <Text style={[s.previewTd, { flex: 1.6, color: colors.text }]} numberOfLines={1}>
                          {row.ownerName || '—'}
                        </Text>
                        <Text style={[s.previewTd, { width: 32, color: colors.mutedForeground }]} numberOfLines={1}>
                          {row.ward || '—'}
                        </Text>
                        <View style={[s.statusPill, { backgroundColor: cfg.color + '18', borderColor: cfg.color + '40' }]}>
                          <Feather name={cfg.icon as any} size={9} color={cfg.color} />
                          <Text style={[s.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* ── Progress ── */}
              {importing && (
                <View style={[s.progressCard, { backgroundColor: colors.card, borderColor: '#6366F130' }]}>
                  <View style={s.progressHdr}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={[s.progressLabel, { color: colors.text }]}>Importing records…</Text>
                    <Text style={[s.progressPct, { color: '#6366F1' }]}>{progress}%</Text>
                  </View>
                  <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                    <LinearGradient
                      colors={['#6366F1', '#4F46E5']}
                      style={[s.progressFill, { width: `${progress}%` as any }]}
                    />
                  </View>
                </View>
              )}

              {/* ── Import done banner ── */}
              {importStats && (
                <LinearGradient colors={['#10B98118', '#059669' + '0A']} style={[s.doneBanner, { borderColor: '#10B98130' }]}>
                  <View style={s.doneBannerIcon}>
                    <Feather name="check-circle" size={22} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.doneBannerTitle}>Import Complete</Text>
                    <View style={s.doneBannerStats}>
                      <Text style={[s.doneStat, { color: '#10B981' }]}>{importStats.imported} imported</Text>
                      <Text style={s.doneSep}>·</Text>
                      <Text style={[s.doneStat, { color: '#F59E0B' }]}>{importStats.skipped} skipped</Text>
                      <Text style={s.doneSep}>·</Text>
                      <Text style={[s.doneStat, { color: '#EF4444' }]}>{importStats.failed} failed</Text>
                    </View>
                  </View>
                </LinearGradient>
              )}

              {/* ── Action buttons ── */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.resetBtn, { borderColor: colors.border }]}
                  onPress={resetImport}
                  activeOpacity={0.8}
                >
                  <Feather name="arrow-left" size={16} color={colors.mutedForeground} />
                  <Text style={[s.resetBtnText, { color: colors.mutedForeground }]}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={handleImport}
                  disabled={importing || counts.valid === 0}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={counts.valid === 0 ? ['#6B7280', '#4B5563'] : ['#6366F1', '#4F46E5']}
                    style={s.importBtn}
                  >
                    {importing
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Feather name="upload-cloud" size={18} color="#fff" />}
                    <Text style={s.importBtnText}>
                      {importing ? 'Importing…' : `Import ${counts.valid} Records`}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ══════════════ HISTORY TAB ══════════════ */}
      {subTab === 'history' && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 180 }}
          showsVerticalScrollIndicator={false}
        >
          {importHistory.length === 0 ? (
            <View style={[s.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.emptyIcon}>
                <Feather name="clock" size={24} color="#fff" />
              </LinearGradient>
              <Text style={[s.emptyTitle, { color: colors.text }]}>No imports yet</Text>
              <Text style={[s.emptySub, { color: colors.mutedForeground }]}>Import history will appear here</Text>
            </View>
          ) : (
            importHistory.map((h, idx) => {
              const statusCfg = h.status === 'completed'
                ? { color: '#10B981', bg: '#10B98115', icon: 'check-circle', label: 'Completed' }
                : h.status === 'partial'
                ? { color: '#F59E0B', bg: '#F59E0B15', icon: 'alert-circle', label: 'Partial' }
                : { color: '#EF4444', bg: '#EF444415', icon: 'x-circle', label: 'Failed' };

              const successPct = h.totalRows > 0 ? Math.round((h.successRows / h.totalRows) * 100) : 0;

              return (
                <TouchableOpacity
                  key={h.id}
                  style={[s.histCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedHistory(h)}
                  activeOpacity={0.85}
                >
                  {/* Left accent */}
                  <View style={[s.histAccent, { backgroundColor: statusCfg.color }]} />

                  <View style={{ flex: 1, padding: 14, paddingLeft: 18 }}>
                    {/* Top row */}
                    <View style={s.histTop}>
                      <View style={[s.histIconBox, { backgroundColor: statusCfg.bg }]}>
                        <Feather name={statusCfg.icon as any} size={16} color={statusCfg.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.histFileName, { color: colors.text }]} numberOfLines={1}>{h.fileName}</Text>
                        <Text style={[s.histBy, { color: colors.mutedForeground }]}>
                          {h.uploadedByName} · {new Date(h.uploadedTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </Text>
                      </View>
                      <View style={[s.histStatusPill, { backgroundColor: statusCfg.bg }]}>
                        <Text style={[s.histStatusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => showAlert('Delete?', `Remove "${h.fileName}" from history?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteImportHistory(h.id) },
                        ], 'error')}
                        style={s.histDeleteBtn}
                      >
                        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View style={[s.histProgressTrack, { backgroundColor: colors.border }]}>
                      <View style={[s.histProgressFill, { width: `${successPct}%` as any, backgroundColor: statusCfg.color }]} />
                    </View>

                    {/* Bottom stats */}
                    <View style={[s.histStats, { borderTopColor: colors.border }]}>
                      {[
                        { label: 'Total',    val: h.totalRows,     color: '#6366F1' },
                        { label: 'Imported', val: h.successRows,   color: '#10B981' },
                        { label: 'Skipped',  val: h.duplicateRows, color: '#F59E0B' },
                        { label: 'Failed',   val: h.failedRows,    color: '#EF4444' },
                      ].map(st => (
                        <View key={st.label} style={s.histStatItem}>
                          <Text style={[s.histStatNum, { color: st.color }]}>{st.val}</Text>
                          <Text style={[s.histStatLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
                        </View>
                      ))}
                      <View style={s.histStatItem}>
                        <Text style={[s.histStatNum, { color: statusCfg.color }]}>{successPct}%</Text>
                        <Text style={[s.histStatLabel, { color: colors.mutedForeground }]}>Success</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ══════════════ CSV TEMPLATE MODAL ══════════════ */}
      <Modal visible={showTemplate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#6366F1', '#4F46E5']} style={s.modalHdr}>
            <View style={{ flex: 1 }}>
              <Text style={s.modalTitle}>CSV Template</Text>
              <Text style={s.modalSub}>Copy & fill in your house data</Text>
            </View>
            <Pressable onPress={() => setShowTemplate(false)} style={s.modalClose}>
              <Feather name="x" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <View style={[s.templateBox, { backgroundColor: colors.card, borderColor: '#6366F130' }]}>
              <View style={[s.templateBoxHdr, { borderBottomColor: colors.border }]}>
                <Feather name="file-text" size={14} color="#6366F1" />
                <Text style={[s.templateBoxTitle, { color: '#6366F1' }]}>template.csv</Text>
              </View>
              <Text style={[s.templateBoxText, { color: colors.text }]} selectable>{CSV_TEMPLATE}</Text>
            </View>
            {[
              { color: '#F97316', icon: 'map-pin', text: 'Ward column: use ward number (e.g. "1", "42") or exact ward name' },
              { color: '#10B981', icon: 'info', text: 'Property Type options: Residential, Commercial, Government, Vacant, Mixed Use, Other' },
              { color: '#6366F1', icon: 'hash', text: 'Registration No must be unique across the entire database' },
            ].map(note => (
              <View key={note.text} style={[s.noteBox, { backgroundColor: note.color + '12', borderColor: note.color + '30' }]}>
                <Feather name={note.icon as any} size={14} color={note.color} />
                <Text style={[s.noteText, { color: note.color }]}>{note.text}</Text>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ══════════════ HISTORY DETAIL MODAL ══════════════ */}
      <Modal visible={!!selectedHistory} animationType="slide" presentationStyle="pageSheet">
        {selectedHistory && (() => {
          const sc = selectedHistory.status === 'completed'
            ? { color: '#10B981', grad: ['#10B981', '#059669'] as [string,string] }
            : selectedHistory.status === 'partial'
            ? { color: '#F59E0B', grad: ['#F59E0B', '#D97706'] as [string,string] }
            : { color: '#EF4444', grad: ['#EF4444', '#DC2626'] as [string,string] };
          const pct = selectedHistory.totalRows > 0
            ? Math.round((selectedHistory.successRows / selectedHistory.totalRows) * 100) : 0;
          return (
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
              <LinearGradient colors={sc.grad} style={s.modalHdr}>
                <View style={{ flex: 1 }}>
                  <Text style={s.modalTitle}>Import Details</Text>
                  <Text style={s.modalSub} numberOfLines={1}>{selectedHistory.fileName}</Text>
                </View>
                <Pressable onPress={() => setSelectedHistory(null)} style={s.modalClose}>
                  <Feather name="x" size={18} color="#fff" />
                </Pressable>
              </LinearGradient>
              <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
                {/* Summary stats */}
                <View style={s.detailStatRow}>
                  {[
                    { label: 'Total',    val: selectedHistory.totalRows,     color: '#6366F1' },
                    { label: 'Imported', val: selectedHistory.successRows,   color: '#10B981' },
                    { label: 'Skipped',  val: selectedHistory.duplicateRows, color: '#F59E0B' },
                    { label: 'Failed',   val: selectedHistory.failedRows,    color: '#EF4444' },
                  ].map(st => (
                    <View key={st.label} style={[s.detailStatCard, { backgroundColor: st.color + '10', borderColor: st.color + '25' }]}>
                      <Text style={[s.detailStatNum, { color: st.color }]}>{st.val}</Text>
                      <Text style={[s.detailStatLabel, { color: st.color + 'AA' }]}>{st.label}</Text>
                    </View>
                  ))}
                </View>

                {/* Progress bar */}
                <View style={[s.detailProgress, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={s.detailProgressHdr}>
                    <Text style={[s.detailProgressLabel, { color: colors.text }]}>Success Rate</Text>
                    <Text style={[s.detailProgressPct, { color: sc.color }]}>{pct}%</Text>
                  </View>
                  <View style={[s.histProgressTrack, { backgroundColor: colors.border }]}>
                    <View style={[s.histProgressFill, { width: `${pct}%` as any, backgroundColor: sc.color }]} />
                  </View>
                </View>

                {/* Info rows */}
                {[
                  { icon: 'file-text', label: 'File Name',    val: selectedHistory.fileName },
                  { icon: 'user',      label: 'Imported By',  val: selectedHistory.uploadedByName },
                  { icon: 'calendar',  label: 'Date & Time',  val: new Date(selectedHistory.uploadedTime).toLocaleString() },
                  { icon: 'activity',  label: 'Status',       val: selectedHistory.status },
                ].map(row => (
                  <View key={row.label} style={[s.infoRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[s.infoRowIcon, { backgroundColor: '#6366F110' }]}>
                      <Feather name={row.icon as any} size={14} color="#6366F1" />
                    </View>
                    <Text style={[s.infoRowLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[s.infoRowVal, { color: colors.text }]}>{row.val}</Text>
                  </View>
                ))}

                {/* Error report */}
                {selectedHistory.errorReport.length > 0 && (
                  <>
                    <View style={s.errorHdr}>
                      <LinearGradient colors={['#EF4444', '#DC2626']} style={s.errorHdrIcon}>
                        <Feather name="alert-triangle" size={13} color="#fff" />
                      </LinearGradient>
                      <Text style={[s.errorHdrText, { color: colors.text }]}>
                        Error Report ({selectedHistory.errorReport.length})
                      </Text>
                    </View>
                    {selectedHistory.errorReport.map((err, i) => (
                      <View key={i} style={[s.errorItem, { backgroundColor: '#EF444410', borderColor: '#EF444420' }]}>
                        <View style={s.errorItemTop}>
                          <Text style={s.errorItemRow}>Row {err.rowNumber}</Text>
                          {err.registrationNo && (
                            <Text style={[s.errorItemReg, { color: '#6366F1' }]}>{err.registrationNo}</Text>
                          )}
                        </View>
                        <Text style={[s.errorItemReason, { color: '#EF4444' }]}>{err.reason}</Text>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* Hidden web file input */}
      {Platform.OS === 'web' && (
        // @ts-ignore
        <input
          ref={webFileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
          style={{ display: 'none' }}
          onChange={handleWebFileChange}
        />
      )}
    </View>
  );

  if (embedded) return content;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {content}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  /* ── hero ── */
  hero:         { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18 },
  heroContent:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  heroBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  heroBadgeText:{ color: '#FFD700', fontSize: 9, fontFamily: 'Inter_700Bold', letterSpacing: 1 },
  heroTitle:    { color: '#fff', fontSize: 24, fontFamily: 'Inter_700Bold' },
  heroSub:      { color: '#FFFFFFAA', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 3 },
  heroIconRing: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF15' },
  heroStats:    { flexDirection: 'row', gap: 10 },
  heroStatCard: { flex: 1, borderRadius: 14, padding: 11, gap: 3, alignItems: 'flex-start' },
  heroStatVal:  { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold', lineHeight: 24 },
  heroStatLabel:{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontFamily: 'Inter_500Medium' },

  /* ── tab bar ── */
  tabBar:    { flexDirection: 'row', borderBottomWidth: 1 },
  tabItem:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel:  { fontSize: 13 },
  tabBadge:  { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, justifyContent: 'center', alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 9, fontFamily: 'Inter_700Bold' },

  /* ── step indicator ── */
  steps:      { flexDirection: 'row', alignItems: 'center' },
  stepItem:   { alignItems: 'center', gap: 5, flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  stepNum:    { fontSize: 12, fontFamily: 'Inter_700Bold' },
  stepLabel:  { fontSize: 9, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  stepLine:   { flex: 1, height: 1.5, marginBottom: 16 },

  /* ── template card ── */
  templateCard:   { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16, backgroundColor: '#6366F108' },
  templateIconBox:{ width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  templateTitle:  { fontSize: 14, fontFamily: 'Inter_700Bold' },
  templateSub:    { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  templateArrow:  { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  /* ── column guide ── */
  colGuide:       { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  colGuideHdr:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 12 },
  colGuideIcon:   { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  colGuideTitle:  { flex: 1, fontSize: 13, fontFamily: 'Inter_700Bold' },
  colGuideNote:   { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  colGuideNoteText:{ fontSize: 10, fontFamily: 'Inter_600SemiBold', color: '#0EA5E9' },
  colChipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
  colChip:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 5 },
  colChipLetter:  { fontSize: 10, fontFamily: 'Inter_700Bold' },
  colChipName:    { fontSize: 11, fontFamily: 'Inter_500Medium' },
  colReqDot:      { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366F1' },
  colGuideFooter: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  colLegendItem:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  colLegendDot:   { width: 6, height: 6, borderRadius: 3 },
  colLegendText:  { fontSize: 10, fontFamily: 'Inter_400Regular' },

  /* ── upload cards ── */
  uploadRow:        { flexDirection: 'row', gap: 12 },
  uploadCard:       { flex: 1, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 18, alignItems: 'center', gap: 8 },
  uploadCardIcon:   { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  uploadCardTitle:  { fontSize: 14, fontFamily: 'Inter_700Bold' },
  uploadCardSub:    { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  uploadCardFormats:{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', justifyContent: 'center', marginTop: 4 },
  formatBadge:      { borderRadius: 6, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3 },
  formatText:       { fontSize: 9, fontFamily: 'Inter_700Bold' },

  /* ── paste input ── */
  pasteCard:     { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  pasteCardHdr:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pasteCardIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  pasteCardTitle:{ flex: 1, fontSize: 14, fontFamily: 'Inter_700Bold' },
  pasteCloseBtn: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  csvTextArea:   { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 11, fontFamily: 'Inter_400Regular', minHeight: 120 },
  previewBtn:    { borderRadius: 14, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewBtnText:{ color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },

  /* ── source banner ── */
  sourceBanner:    { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12 },
  sourceIconBox:   { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sourceFile:      { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  sourceRows:      { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  sourceReset:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  sourceResetText: { fontSize: 12, fontFamily: 'Inter_500Medium' },

  /* ── stat pills ── */
  statPills:     { flexDirection: 'row', gap: 8 },
  statPill:      { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  statPillNum:   { fontSize: 18, fontFamily: 'Inter_700Bold' },
  statPillLabel: { fontSize: 9, fontFamily: 'Inter_500Medium' },

  /* ── dup card ── */
  dupCard:       { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  dupHdr:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dupHdrIcon:    { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  dupTitle:      { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dupSub:        { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 1 },
  dupOptions:    { flexDirection: 'row', gap: 8 },
  dupOption:     { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 10, alignItems: 'center', gap: 5, position: 'relative' },
  dupOptionLabel:{ fontSize: 12, fontFamily: 'Inter_700Bold' },
  dupOptionDesc: { fontSize: 9, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  dupActiveDot:  { position: 'absolute', top: 6, right: 6, width: 6, height: 6, borderRadius: 3 },

  /* ── preview table ── */
  previewTable:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  previewTableHdr: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 9 },
  previewTh:       { fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  previewRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  previewTd:       { fontSize: 11, fontFamily: 'Inter_400Regular' },
  statusPill:      { width: 68, flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 6, borderWidth: 1, paddingHorizontal: 4, paddingVertical: 3 },
  statusPillText:  { fontSize: 8, fontFamily: 'Inter_700Bold' },

  /* ── progress ── */
  progressCard:  { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  progressHdr:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressLabel: { flex: 1, fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  progressPct:   { fontSize: 14, fontFamily: 'Inter_700Bold' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: 8, borderRadius: 4 },

  /* ── done banner ── */
  doneBanner:       { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  doneBannerIcon:   { width: 44, height: 44, borderRadius: 14, backgroundColor: '#10B98120', justifyContent: 'center', alignItems: 'center' },
  doneBannerTitle:  { color: '#10B981', fontSize: 15, fontFamily: 'Inter_700Bold', marginBottom: 4 },
  doneBannerStats:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  doneStat:         { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  doneSep:          { fontSize: 12, color: '#9CA3AF' },

  /* ── action row ── */
  actionRow:     { flexDirection: 'row', gap: 10 },
  resetBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14 },
  resetBtnText:  { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  importBtn:     { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  importBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_700Bold' },

  /* ── history cards ── */
  emptyBox:    { borderRadius: 16, borderWidth: 1, padding: 40, alignItems: 'center', gap: 12 },
  emptyIcon:   { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:  { fontSize: 16, fontFamily: 'Inter_700Bold' },
  emptySub:    { fontSize: 12, fontFamily: 'Inter_400Regular' },

  histCard:          { borderRadius: 16, borderWidth: 1, overflow: 'hidden', flexDirection: 'row' },
  histAccent:        { width: 4 },
  histTop:           { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  histIconBox:       { width: 38, height: 38, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  histFileName:      { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  histBy:            { fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 },
  histStatusPill:    { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20 },
  histStatusText:    { fontSize: 10, fontFamily: 'Inter_700Bold' },
  histDeleteBtn:     { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
  histProgressTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 10 },
  histProgressFill:  { height: 5, borderRadius: 3 },
  histStats:         { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  histStatItem:      { flex: 1, alignItems: 'center', gap: 2 },
  histStatNum:       { fontSize: 15, fontFamily: 'Inter_700Bold' },
  histStatLabel:     { fontSize: 9, fontFamily: 'Inter_500Medium' },

  /* ── modals ── */
  modalHdr:    { flexDirection: 'row', alignItems: 'center', padding: 20 },
  modalTitle:  { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  modalSub:    { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  modalClose:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },

  templateBox:     { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  templateBoxHdr:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderBottomWidth: 1 },
  templateBoxTitle:{ fontSize: 12, fontFamily: 'Inter_700Bold' },
  templateBoxText: { padding: 14, fontSize: 10, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  noteBox:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  noteText:        { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },

  detailStatRow:    { flexDirection: 'row', gap: 10 },
  detailStatCard:   { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  detailStatNum:    { fontSize: 20, fontFamily: 'Inter_700Bold' },
  detailStatLabel:  { fontSize: 10, fontFamily: 'Inter_500Medium' },
  detailProgress:   { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  detailProgressHdr:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailProgressLabel:{ fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  detailProgressPct:  { fontSize: 15, fontFamily: 'Inter_700Bold' },
  infoRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  infoRowIcon:      { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  infoRowLabel:     { flex: 1, fontSize: 12, fontFamily: 'Inter_500Medium' },
  infoRowVal:       { fontSize: 13, fontFamily: 'Inter_600SemiBold', maxWidth: '55%', textAlign: 'right' },
  errorHdr:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  errorHdrIcon:     { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  errorHdrText:     { fontSize: 14, fontFamily: 'Inter_700Bold' },
  errorItem:        { borderRadius: 12, borderWidth: 1, padding: 12, gap: 4 },
  errorItemTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorItemRow:     { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#EF4444' },
  errorItemReg:     { fontSize: 11, fontFamily: 'Inter_500Medium' },
  errorItemReason:  { fontSize: 11, fontFamily: 'Inter_400Regular' },
});
