import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Scan } from '../../analysis/types/scan';
import type { AiStatus } from '../../ai/types/aiStatus';
import { AiStatusCard } from '../../ai/components/AiStatusCard';
import type { WorkspacePalette } from '../../../core/theme/palette';

type OverviewScreenProps = {
  demo: boolean;
  scans: Scan[];
  palette: WorkspacePalette;
  aiStatus: AiStatus | null;
  onSelectScan: (scan: Scan) => void;
  onStartCheck: () => void;
};

export function OverviewScreen({ demo, scans, palette, aiStatus, onSelectScan, onStartCheck }: OverviewScreenProps) {
  return <>
    <Text style={styles.kicker}>{demo ? 'SAMPLE WORKSPACE' : 'YOUR SAFETY OVERVIEW'}</Text>
    <Text style={[styles.title, { color: palette.text }]}>Check before you trust.</Text>
    <Text style={[styles.copy, { color: palette.text }]}>Your ProofLens checks and recent findings.</Text>
    {!demo && <AiStatusCard status={aiStatus} surfaceColor={palette.surface} borderColor={palette.border} textColor={palette.text} accentColor={palette.accent} />}
    <View style={styles.metrics}>
      <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={styles.metricValue}>{scans.length}</Text><Text style={[styles.copy, { color: palette.text }]}>Total checks</Text>
      </View>
      <View style={[styles.metricCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
        <Text style={styles.metricValue}>{scans.filter((scan) => ['HIGH', 'CRITICAL'].includes(scan.risk_level)).length}</Text>
        <Text style={[styles.copy, { color: palette.text }]}>High risk</Text>
      </View>
    </View>
    <Pressable style={styles.primary} onPress={onStartCheck}><Text style={styles.primaryText}>{demo ? 'Browse sample reports' : 'Check something new'}</Text></Pressable>
    <Text style={[styles.sectionTitle, { color: palette.text }]}>Recent activity</Text>
    {scans.slice(0, 4).map((scan) => <Pressable key={scan.scan_id} style={[styles.scanCard, { backgroundColor: palette.surface, borderColor: palette.border }]} onPress={() => onSelectScan(scan)}>
      <View style={styles.scanRow}><Text style={[styles.scanTitle, { color: palette.text }]}>{scan.scan_type} check</Text><Text style={riskStyle(scan.risk_level)}>{scan.risk_level}</Text></View>
      <Text style={[styles.copy, { color: palette.text }]}>{scan.scan_id} · {scan.risk_score}/100</Text>
    </Pressable>)}
  </>;
}

const riskStyle = (level: string) => level === 'LOW' ? styles.low : level === 'CAUTION' ? styles.caution : styles.high;
const styles = StyleSheet.create({
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  copy: { fontSize: 12, lineHeight: 18, marginBottom: 10, opacity: 0.75 },
  metrics: { flexDirection: 'row', gap: 10, marginVertical: 12 },
  metricCard: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 14 },
  metricValue: { fontSize: 24, fontWeight: '800', color: '#286c8b' },
  primary: { backgroundColor: '#286c8b', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 18 },
  scanCard: { borderWidth: 1, padding: 14, borderRadius: 9, marginTop: 9 },
  scanRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scanTitle: { fontSize: 12, fontWeight: '700' },
  low: { color: '#438267', fontSize: 9, fontWeight: '700' },
  caution: { color: '#987331', fontSize: 9, fontWeight: '700' },
  high: { color: '#a24e44', fontSize: 9, fontWeight: '700' },
});
