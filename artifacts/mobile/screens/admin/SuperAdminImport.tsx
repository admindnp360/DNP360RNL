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

export default function SuperAdminImport() {
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
      else if (houses.some(h => h.registrationNumber.toUpperCase() === regNo.toUpperCase())) { status = 'duplicate'; errorReason = 'Already exists in database'; }
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

      showAlert('Import Complete', `${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed`, undefined, 'success');
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

  function statusIcon(s: ParsedRow['status']) {
    if (s === 'valid') return { icon: '🟢', color: '#10B981' };
    if (s === 'duplicate') return { icon: '🟡', color: '#F59E0B' };
    return { icon: '🔴', color: '#EF4444' };
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <LinearGradient colors={['#1a0533', '#0D1B4B']} style={s.header}>
        <View style={s.headerTop}>
          <View style={{ flex: 1 }}>
            <View style={s.superBadge}>
              <Feather name="star" size={10} color="#FFD700" />
              <Text style={s.superBadgeText}>SUPER ADMIN</Text>
            </View>
            <Text style={s.headerTitle}>Bulk Import</Text>
            <Text style={s.headerSub}>Import houses from Excel or CSV files</Text>
          </View>
          <View style={s.headerIcon}>
            <Feather name="upload-cloud" size={22} color="#fff" />
          </View>
        </View>
        <View style={s.statRow}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.statPill}>
            <Text style={s.statNum}>{totalHouses}</Text>
            <Text style={s.statLbl}>Total Houses</Text>
          </LinearGradient>
          <LinearGradient colors={['#10B981', '#059669']} style={s.statPill}>
            <Text style={s.statNum}>{importsDone}</Text>
            <Text style={s.statLbl}>Imports Done</Text>
          </LinearGradient>
          <LinearGradient colors={['#F97316', '#EA580C']} style={s.statPill}>
            <Text style={s.statNum}>{totalWards}</Text>
            <Text style={s.statLbl}>Total Wards</Text>
          </LinearGradient>
        </View>
      </LinearGradient>

      {/* Sub Tabs */}
      <View style={[s.subTabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {([['import', 'upload', 'Import'], ['history', 'clock', 'History']] as const).map(([key, icon, label]) => {
          const active = subTab === key;
          return (
            <TouchableOpacity key={key} style={s.subTab} onPress={() => setSubTab(key)} activeOpacity={0.7}>
              <Feather name={icon as any} size={15} color={active ? '#4F46E5' : colors.mutedForeground} />
              <Text style={[s.subTabLabel, { color: active ? '#4F46E5' : colors.mutedForeground, fontFamily: active ? 'Inter_700Bold' : 'Inter_500Medium' }]}>
                {label}
              </Text>
              {active && <View style={s.subTabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── IMPORT TAB ── */}
      {subTab === 'import' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 170 }}>
          {!isPreviewing ? (
            <>
              {/* Template download */}
              <TouchableOpacity
                style={[s.templateCard, { backgroundColor: colors.card, borderColor: '#4F46E540' }]}
                onPress={() => setShowTemplate(true)}
                activeOpacity={0.85}
              >
                <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.templateIcon}>
                  <Feather name="download" size={18} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[s.templateTitle, { color: colors.text }]}>Download CSV Template</Text>
                  <Text style={[s.templateSub, { color: colors.mutedForeground }]}>Get the correct column format before importing</Text>
                </View>
                <Feather name="external-link" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>

              {/* Expected Columns */}
              <View style={[s.colCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={s.colCardHeader}>
                  <Feather name="info" size={14} color="#6366F1" />
                  <Text style={[s.colCardTitle, { color: colors.text }]}>Expected Columns</Text>
                </View>
                {[
                  { name: 'registrationNumber', ex: 'DNPH001', req: true },
                  { name: 'ownerName', ex: 'Ramesh Prasad', req: true },
                  { name: 'address', ex: 'Ward 1, Station Road', req: true },
                  { name: 'fatherName', ex: 'Shiv Prasad', req: false },
                  { name: 'mobile', ex: '9876543210', req: false },
                  { name: 'wardNumber', ex: '1', req: false },
                  { name: 'propertyType', ex: 'Residential', req: false },
                ].map(col => (
                  <View key={col.name} style={s.colRow}>
                    <View style={[s.colBadge, { backgroundColor: col.req ? '#EF444420' : '#10B98120' }]}>
                      <Text style={[s.colBadgeText, { color: col.req ? '#EF4444' : '#10B981' }]}>{col.req ? 'REQ' : 'OPT'}</Text>
                    </View>
                    <Text style={[s.colName, { color: colors.text }]}>{col.name}</Text>
                    <Text style={[s.colEx, { color: colors.mutedForeground }]}>{col.ex}</Text>
                  </View>
                ))}
              </View>

              {/* Upload options */}
              {!showInput && (
                <View style={s.uploadOptionsRow}>
                  {/* Excel / CSV file picker */}
                  <TouchableOpacity
                    style={[s.uploadOptionCard, { backgroundColor: colors.card, borderColor: '#10B98140', flex: 1 }]}
                    onPress={handlePickExcel}
                    disabled={pickingFile}
                    activeOpacity={0.85}
                  >
                    {pickingFile ? (
                      <ActivityIndicator size={28} color="#10B981" />
                    ) : (
                      <LinearGradient colors={['#10B981', '#059669']} style={s.uploadIcon}>
                        <Feather name="file-text" size={22} color="#fff" />
                      </LinearGradient>
                    )}
                    <Text style={[s.uploadTitle, { color: colors.text }]}>Pick File</Text>
                    <Text style={[s.uploadSub, { color: colors.mutedForeground, textAlign: 'center' }]}>.xlsx · .xls · .csv</Text>
                    <View style={[s.excelBadge, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
                      <Feather name="check-circle" size={10} color="#10B981" />
                      <Text style={[s.excelBadgeText, { color: '#10B981' }]}>Excel supported</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Paste CSV */}
                  <TouchableOpacity
                    style={[s.uploadOptionCard, { backgroundColor: colors.card, borderColor: '#4F46E540', flex: 1 }]}
                    onPress={() => setShowInput(true)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.uploadIcon}>
                      <Feather name="clipboard" size={22} color="#fff" />
                    </LinearGradient>
                    <Text style={[s.uploadTitle, { color: colors.text }]}>Paste CSV</Text>
                    <Text style={[s.uploadSub, { color: colors.mutedForeground, textAlign: 'center' }]}>Copy &amp; paste text</Text>
                    <View style={[s.excelBadge, { backgroundColor: '#4F46E515', borderColor: '#4F46E530' }]}>
                      <Feather name="type" size={10} color="#4F46E5" />
                      <Text style={[s.excelBadgeText, { color: '#4F46E5' }]}>Manual entry</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* CSV Text Input */}
              {showInput && (
                <View style={[s.csvInputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={s.csvInputHeader}>
                    <Text style={[s.csvInputTitle, { color: colors.text }]}>Paste CSV Content</Text>
                    <TouchableOpacity onPress={() => { setShowInput(false); setCsvText(''); }}>
                      <Feather name="x" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[s.csvInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                    multiline
                    numberOfLines={8}
                    placeholder={`S.No,House Registration No,Owner Name,...\n1,DNPH001,Ramesh Prasad,...`}
                    placeholderTextColor={colors.mutedForeground}
                    value={csvText}
                    onChangeText={setCsvText}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity onPress={validateAndPreview} activeOpacity={0.85}>
                    <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.previewBtn}>
                      <Feather name="eye" size={16} color="#fff" />
                      <Text style={s.previewBtnText}>Preview &amp; Validate</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <>
              {/* Preview Stats */}
              <View style={s.previewStatsRow}>
                {[
                  { label: 'Total', val: counts.total, color: '#6366F1' },
                  { label: 'Valid', val: counts.valid, color: '#10B981' },
                  { label: 'Duplicate', val: counts.duplicate, color: '#F59E0B' },
                  { label: 'Error', val: counts.error + counts.dup_excel, color: '#EF4444' },
                ].map(st => (
                  <View key={st.label} style={[s.previewStat, { backgroundColor: colors.card, borderColor: st.color + '40' }]}>
                    <Text style={[s.previewStatNum, { color: st.color }]}>{st.val}</Text>
                    <Text style={[s.previewStatLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
                  </View>
                ))}
              </View>

              {/* Duplicate mode */}
              <View style={[s.dupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[s.dupTitle, { color: colors.text }]}>Duplicate Handling</Text>
                <View style={s.dupRow}>
                  {([['skip', 'Skip Duplicate'], ['update', 'Update Existing'], ['replace', 'Replace Record']] as const).map(([mode, label]) => (
                    <TouchableOpacity
                      key={mode}
                      style={[s.dupBtn, dupMode === mode && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }, { borderColor: colors.border }]}
                      onPress={() => setDupMode(mode)}
                    >
                      <Text style={[s.dupBtnText, { color: dupMode === mode ? '#fff' : colors.mutedForeground }]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Preview Table */}
              <View style={[s.previewTable, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[s.previewTableHeader, { borderBottomColor: colors.border }]}>
                  {['S.No', 'Reg No', 'Owner', 'Ward', 'Status'].map(h => (
                    <Text key={h} style={[s.previewTableHeaderCell, { color: colors.mutedForeground, flex: h === 'Owner' ? 1.5 : 1 }]}>{h}</Text>
                  ))}
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {parsedRows.map(row => {
                    const si = statusIcon(row.status);
                    return (
                      <View key={row.rowNumber} style={[s.previewTableRow, { borderBottomColor: colors.border }]}>
                        <Text style={[s.previewCell, { color: colors.mutedForeground, flex: 1 }]}>{row.rowNumber}</Text>
                        <Text style={[s.previewCell, { color: '#6366F1', flex: 1 }]} numberOfLines={1}>{row.registrationNo || '—'}</Text>
                        <Text style={[s.previewCell, { color: colors.text, flex: 1.5 }]} numberOfLines={1}>{row.ownerName || '—'}</Text>
                        <Text style={[s.previewCell, { color: colors.mutedForeground, flex: 1 }]} numberOfLines={1}>{row.ward || '—'}</Text>
                        <Text style={[s.previewCell, { flex: 1 }]}>{si.icon}</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Import Progress */}
              {importing && (
                <View style={[s.progressCard, { backgroundColor: colors.card, borderColor: '#4F46E540' }]}>
                  <View style={s.progressHeader}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={[s.progressText, { color: colors.text }]}>Importing… {progress}%</Text>
                  </View>
                  <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[s.progressFill, { width: `${progress}%` as any, backgroundColor: '#4F46E5' }]} />
                  </View>
                </View>
              )}

              {importStats && (
                <View style={[s.doneCard, { backgroundColor: '#10B98115', borderColor: '#10B98130' }]}>
                  <Feather name="check-circle" size={20} color="#10B981" />
                  <Text style={[s.doneText, { color: '#10B981' }]}>
                    Done: {importStats.imported} imported · {importStats.skipped} skipped · {importStats.failed} failed
                  </Text>
                </View>
              )}

              <View style={s.importActions}>
                <TouchableOpacity style={[s.cancelBtn, { borderColor: colors.border }]} onPress={resetImport}>
                  <Text style={[s.cancelBtnText, { color: colors.mutedForeground }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={handleImport}
                  disabled={importing || counts.valid === 0}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={counts.valid === 0 ? ['#6B7280', '#4B5563'] : ['#4F46E5', '#7C3AED']}
                    style={s.importBtn}
                  >
                    {importing ? <ActivityIndicator size="small" color="#fff" /> : <Feather name="upload-cloud" size={16} color="#fff" />}
                    <Text style={s.importBtnText}>{importing ? 'Importing…' : `Import ${counts.valid} Records`}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── HISTORY TAB ── */}
      {subTab === 'history' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 170 }}>
          {importHistory.length === 0 ? (
            <View style={[s.empty, { backgroundColor: colors.card }]}>
              <Feather name="clock" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground }]}>No import history yet</Text>
            </View>
          ) : (
            importHistory.map(h => {
              const statusColor = h.status === 'completed' ? '#10B981' : h.status === 'partial' ? '#F59E0B' : '#EF4444';
              const statusBg = h.status === 'completed' ? '#10B98115' : h.status === 'partial' ? '#F59E0B15' : '#EF444415';
              return (
                <TouchableOpacity
                  key={h.id}
                  style={[s.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => setSelectedHistory(h)}
                  activeOpacity={0.85}
                >
                  <View style={s.historyHeader}>
                    <View style={[s.historyIconBox, { backgroundColor: '#4F46E520' }]}>
                      <Feather name="file-text" size={16} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.historyFileName, { color: colors.text }]} numberOfLines={1}>{h.fileName}</Text>
                      <Text style={[s.historyBy, { color: colors.mutedForeground }]}>by {h.uploadedByName}</Text>
                    </View>
                    <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[s.statusBadgeText, { color: statusColor }]}>{h.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => showAlert('Delete?', h.fileName, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Delete', style: 'destructive', onPress: () => deleteImportHistory(h.id) },
                    ], 'error')} style={{ padding: 4, marginLeft: 8 }}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                  <View style={[s.historyStats, { borderTopColor: colors.border }]}>
                    {[
                      { label: 'Total', val: h.totalRows, color: '#6366F1' },
                      { label: 'Imported', val: h.successRows, color: '#10B981' },
                      { label: 'Skipped', val: h.duplicateRows, color: '#F59E0B' },
                      { label: 'Failed', val: h.failedRows, color: '#EF4444' },
                    ].map(st => (
                      <View key={st.label} style={s.historyStatItem}>
                        <Text style={[s.historyStatNum, { color: st.color }]}>{st.val}</Text>
                        <Text style={[s.historyStatLabel, { color: colors.mutedForeground }]}>{st.label}</Text>
                      </View>
                    ))}
                  </View>
                  <Text style={[s.historyDate, { color: colors.mutedForeground }]}>
                    {new Date(h.uploadedTime).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Template Modal */}
      <Modal visible={showTemplate} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
            <Text style={s.modalTitle}>CSV Template</Text>
            <Pressable onPress={() => setShowTemplate(false)} style={s.closeBtn}>
              <Feather name="x" size={20} color="#fff" />
            </Pressable>
          </LinearGradient>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={[{ color: colors.mutedForeground, fontSize: 13, fontFamily: 'Inter_400Regular' }]}>
              Copy the template below and fill in your data. Each row = one house record.
            </Text>
            <View style={[s.templateBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.templateText, { color: colors.text }]} selectable>{CSV_TEMPLATE}</Text>
            </View>
            <View style={[s.infoBox, { backgroundColor: '#F97316' + '15', borderColor: '#F97316' + '30' }]}>
              <Feather name="alert-circle" size={14} color="#F97316" />
              <Text style={[s.infoText, { color: '#F97316' }]}>
                Ward column: use ward number (e.g. "1", "42") or exact ward name
              </Text>
            </View>
            <View style={[s.infoBox, { backgroundColor: '#10B981' + '15', borderColor: '#10B981' + '30' }]}>
              <Feather name="info" size={14} color="#10B981" />
              <Text style={[s.infoText, { color: '#10B981' }]}>
                Property Type: Residential, Commercial, Government, Vacant, Mixed Use, Other
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* History Detail Modal */}
      <Modal visible={!!selectedHistory} animationType="slide" presentationStyle="pageSheet">
        {selectedHistory && (
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
            <LinearGradient colors={['#4F46E5', '#7C3AED']} style={s.modalHdr}>
              <Text style={s.modalTitle}>Import Details</Text>
              <Pressable onPress={() => setSelectedHistory(null)} style={s.closeBtn}>
                <Feather name="x" size={20} color="#fff" />
              </Pressable>
            </LinearGradient>
            <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }}>
              {[
                { label: 'File Name', value: selectedHistory.fileName },
                { label: 'Imported By', value: selectedHistory.uploadedByName },
                { label: 'Date & Time', value: new Date(selectedHistory.uploadedTime).toLocaleString() },
                { label: 'Total Rows', value: String(selectedHistory.totalRows) },
                { label: 'Imported', value: String(selectedHistory.successRows) },
                { label: 'Skipped', value: String(selectedHistory.duplicateRows) },
                { label: 'Failed', value: String(selectedHistory.failedRows) },
                { label: 'Status', value: selectedHistory.status },
              ].map(row => (
                <View key={row.label} style={[s.detailRow, { borderBottomColor: colors.border }]}>
                  <Text style={[s.detailLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                  <Text style={[s.detailValue, { color: colors.text }]}>{row.value}</Text>
                </View>
              ))}
              {selectedHistory.errorReport.length > 0 && (
                <>
                  <Text style={[s.dupTitle, { color: colors.text, marginTop: 8 }]}>Error Report ({selectedHistory.errorReport.length})</Text>
                  {selectedHistory.errorReport.map((err, i) => (
                    <View key={i} style={[s.errorRow, { backgroundColor: '#EF444410', borderColor: '#EF444420' }]}>
                      <Text style={[s.errorRowText, { color: '#EF4444' }]}>Row {err.rowNumber}: {err.reason}</Text>
                      {err.registrationNo && <Text style={[s.errorRowSub, { color: colors.mutedForeground }]}>{err.registrationNo}</Text>}
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>

      {/* Hidden web file input — rendered only on web, triggered by handlePickExcel */}
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
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  superBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFD70020', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  superBadgeText: { color: '#FFD700', fontSize: 10, fontFamily: 'Inter_700Bold' },
  headerTitle: { color: '#fff', fontSize: 26, fontFamily: 'Inter_700Bold' },
  headerSub: { color: '#FFFFFFAA', fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  headerIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF15', justifyContent: 'center', alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: 10 },
  statPill: { flex: 1, borderRadius: 14, padding: 12, alignItems: 'center' },
  statNum: { color: '#fff', fontSize: 20, fontFamily: 'Inter_700Bold' },
  statLbl: { color: '#FFFFFFCC', fontSize: 10, fontFamily: 'Inter_500Medium', marginTop: 2 },
  subTabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  subTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, position: 'relative' },
  subTabLabel: { fontSize: 13 },
  subTabUnderline: { position: 'absolute', bottom: 0, left: 20, right: 20, height: 2, backgroundColor: '#4F46E5', borderRadius: 1 },
  templateCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1, padding: 16 },
  templateIcon: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  templateTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  templateSub: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  colCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  colCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  colCardTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  colRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, minWidth: 36, alignItems: 'center' },
  colBadgeText: { fontSize: 9, fontFamily: 'Inter_700Bold' },
  colName: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium' },
  colEx: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  uploadArea: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 40, alignItems: 'center', gap: 12 },
  uploadOptionsRow: { flexDirection: 'row', gap: 12 },
  uploadOptionCard: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', padding: 20, alignItems: 'center', gap: 10 },
  uploadIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  uploadTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  uploadSub: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  excelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, marginTop: 2 },
  excelBadgeText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  csvInputCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  csvInputHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  csvInputTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  csvInput: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 12, fontFamily: 'Inter_400Regular', minHeight: 120 },
  previewBtn: { borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  previewBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  previewStatsRow: { flexDirection: 'row', gap: 8 },
  previewStat: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  previewStatNum: { fontSize: 20, fontFamily: 'Inter_700Bold' },
  previewStatLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  dupCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  dupTitle: { fontSize: 14, fontFamily: 'Inter_700Bold' },
  dupRow: { flexDirection: 'row', gap: 8 },
  dupBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 8, alignItems: 'center', backgroundColor: 'transparent' },
  dupBtnText: { fontSize: 11, fontFamily: 'Inter_500Medium', textAlign: 'center' },
  previewTable: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  previewTableHeader: { flexDirection: 'row', padding: 10, borderBottomWidth: 1 },
  previewTableHeaderCell: { flex: 1, fontSize: 10, fontFamily: 'Inter_700Bold', textTransform: 'uppercase' },
  previewTableRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1 },
  previewCell: { flex: 1, fontSize: 11, fontFamily: 'Inter_400Regular' },
  progressCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  progressHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progressText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  doneCard: { borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  doneText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', flex: 1 },
  importActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  importBtn: { borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  importBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter_700Bold' },
  historyCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  historyIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  historyFileName: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  historyBy: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  historyStats: { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 10 },
  historyStatItem: { flex: 1, alignItems: 'center', gap: 2 },
  historyStatNum: { fontSize: 16, fontFamily: 'Inter_700Bold' },
  historyStatLabel: { fontSize: 10, fontFamily: 'Inter_500Medium' },
  historyDate: { fontSize: 11, fontFamily: 'Inter_400Regular', paddingHorizontal: 14, paddingBottom: 12 },
  empty: { borderRadius: 16, padding: 40, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  modalHdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  modalTitle: { color: '#fff', fontSize: 18, fontFamily: 'Inter_700Bold' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF20', justifyContent: 'center', alignItems: 'center' },
  templateBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  templateText: { fontSize: 11, fontFamily: 'Inter_400Regular', lineHeight: 20 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  infoText: { flex: 1, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  detailLabel: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  detailValue: { fontSize: 13, fontFamily: 'Inter_600SemiBold', maxWidth: '60%', textAlign: 'right' },
  errorRow: { borderRadius: 10, borderWidth: 1, padding: 10 },
  errorRowText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  errorRowSub: { fontSize: 11, fontFamily: 'Inter_400Regular', marginTop: 2 },
});
