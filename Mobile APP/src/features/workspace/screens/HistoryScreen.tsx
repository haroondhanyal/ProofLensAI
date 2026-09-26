import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Scan } from '../../analysis/types/scan';
import type { WorkspacePalette } from '../../../core/theme/palette';

export function HistoryScreen({ demo, scans, palette, onSelectScan, onToggleSaved, onDelete }: {
  demo: boolean;
  scans: Scan[];
  palette: WorkspacePalette;
  onSelectScan: (scan: Scan) => void;
  onToggleSaved: (scan: Scan) => void;
  onDelete: (scan: Scan) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Saved' | 'High risk'>('All');
  const visibleScans = useMemo(() => scans.filter((scan) => {
    if (filter === 'Saved' && !scan.is_saved) return false;
    if (filter === 'High risk' && !['HIGH', 'CRITICAL'].includes(scan.risk_level)) return false;
    const term = query.trim().toLowerCase();
    return !term || `${scan.scan_id} ${scan.scan_type} ${scan.summary}`.toLowerCase().includes(term);
  }), [filter, query, scans]);
  return <>
    <Text style={styles.kicker}>{demo ? 'LIMITED EDITION · SAMPLE REPORTS' : 'YOUR WORKSPACE'}</Text>
    <Text style={[styles.title, { color: palette.text }]}>{demo ? 'Sample reports' : 'Scan history'}</Text>
    {!demo && <>
      <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search reports by type, ID, or summary" accessibilityLabel="Search scan history" />
      <View style={styles.filters}>{(['All', 'Saved', 'High risk'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterSelected]}><Text style={[styles.filterText, filter === value && styles.filterTextSelected]}>{value}</Text></Pressable>)}</View>
    </>}
    {scans.length === 0
      ? <Text style={[styles.copy, { color: palette.text }]}>No scans yet. Check a link or message to start your history.</Text>
      : visibleScans.length === 0
        ? <Text style={[styles.copy, { color: palette.text }]}>No reports match this search or filter.</Text>
        : visibleScans.map((scan) => <View key={scan.scan_id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${scan.scan_type} report, ${scan.risk_level} risk`} onPress={() => onSelectScan(scan)}>
            <View style={styles.row}><Text style={[styles.cardTitle, { color: palette.text }]}>{scan.scan_type} check</Text><Text style={riskStyle(scan.risk_level)}>{scan.risk_level}</Text></View>
            <Text style={[styles.copy, { color: palette.text }]}>{scan.is_demo ? 'DEMO · ' : ''}{scan.scan_id} · {scan.risk_score}/100</Text>
          </Pressable>
          {!scan.is_demo && <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={() => onToggleSaved(scan)}><Text style={styles.actionText}>{scan.is_saved ? 'Unsave' : 'Save'}</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onDelete(scan)}><Text style={styles.deleteText}>Delete</Text></Pressable>
          </View>}
        </View>)}
  </>;
}

const riskStyle = (level: string) => level === 'LOW' ? styles.low : level === 'CAUTION' ? styles.caution : styles.high;
const styles = StyleSheet.create({
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  copy: { fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 10, opacity: 0.75 },
  card: { borderWidth: 1, padding: 14, borderRadius: 9, marginTop: 9 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700' },
  search: { backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, padding: 12, fontSize: 13, color: '#203744', marginTop: 12 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 3 },
  filter: { borderWidth: 1, borderColor: '#dfe6e8', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  filterSelected: { backgroundColor: '#eaf3f5', borderColor: '#286c8b' },
  filterText: { color: '#617781', fontSize: 10, fontWeight: '600' },
  filterTextSelected: { color: '#286c8b' },
  actions: { borderTopColor: '#edf0f1', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 8, paddingTop: 8 },
  actionText: { color: '#286c8b', fontSize: 11, fontWeight: '700' },
  deleteText: { color: '#a44840', fontSize: 11, fontWeight: '700' },
  low: { color: '#438267', fontSize: 9, fontWeight: '700' },
  caution: { color: '#987331', fontSize: 9, fontWeight: '700' },
  high: { color: '#a24e44', fontSize: 9, fontWeight: '700' },
});
