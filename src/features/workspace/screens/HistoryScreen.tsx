import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Scan } from '../../analysis/types/scan';
import type { WorkspacePalette } from '../../../core/theme/palette';

export function HistoryScreen({ demo, scans, palette, onSelectScan }: {
  demo: boolean;
  scans: Scan[];
  palette: WorkspacePalette;
  onSelectScan: (scan: Scan) => void;
}) {
  return <>
    <Text style={styles.kicker}>{demo ? 'LIMITED EDITION · SAMPLE REPORTS' : 'YOUR WORKSPACE'}</Text>
    <Text style={[styles.title, { color: palette.text }]}>{demo ? 'Sample reports' : 'Scan history'}</Text>
    {scans.length === 0
      ? <Text style={[styles.copy, { color: palette.text }]}>No scans yet. Check a link or message to start your history.</Text>
      : scans.map((scan) => <Pressable key={scan.scan_id} style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => onSelectScan(scan)}>
        <View style={styles.row}><Text style={[styles.cardTitle, { color: palette.text }]}>{scan.scan_type} check</Text><Text style={riskStyle(scan.risk_level)}>{scan.risk_level}</Text></View>
        <Text style={[styles.copy, { color: palette.text }]}>{scan.is_demo ? 'DEMO · ' : ''}{scan.scan_id} · {scan.risk_score}/100</Text>
      </Pressable>)}
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
  low: { color: '#438267', fontSize: 9, fontWeight: '700' },
  caution: { color: '#987331', fontSize: 9, fontWeight: '700' },
  high: { color: '#a24e44', fontSize: 9, fontWeight: '700' },
});
