import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Scan } from '../../analysis/types/scan';
import type { WorkspacePalette } from '../../../core/theme/palette';

type ScanReportScreenProps = {
  scan: Scan;
  palette: WorkspacePalette;
  onBack: () => void;
  onShare: (scan: Scan) => void;
  onExportPdf: (scan: Scan) => void;
};

export function ScanReportScreen({ scan, palette, onBack, onShare, onExportPdf }: ScanReportScreenProps) {
  return <>
    <Pressable onPress={onBack}><Text style={styles.back}>‹ Back</Text></Pressable>
    {scan.is_demo && <View style={styles.demoBanner}><Text style={styles.demoTitle}>SIMULATED REPORT</Text><Text style={styles.demoCopy}>Not analyzed by ProofLens. Do not use this example to decide whether a real link or message is safe.</Text></View>}
    <Text style={styles.kicker}>{scan.scan_type} ASSESSMENT</Text>
    <Text style={[styles.title, riskStyle(scan.risk_level)]}>{scan.risk_level} RISK · {scan.risk_score}/100</Text>
    <Text style={[styles.copy, { color: palette.text }]}>Confidence: {scan.confidence}</Text>
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.sectionTitle, { color: palette.text }]}>What we found</Text>
      <Text style={[styles.copy, { color: palette.text }]}>{scan.summary}</Text>
      {scan.analysis_meta?.local_ai?.insight && <View style={styles.metadata}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>Local AI explanation · {scan.analysis_meta.local_ai.model || 'Ollama'}</Text>
        <Text style={[styles.copy, { color: palette.text }]}>{scan.analysis_meta.local_ai.insight}</Text>
        <Text style={styles.disclaimer}>Advisory only; this does not affect the evidence or risk score.</Text>
      </View>}
      {scan.analysis_meta?.local_ai?.status === 'not_configured' && <Metadata label="Local AI explanation" value="Not configured. The rules based assessment still works." palette={palette} />}
      {scan.analysis_meta?.local_ai?.status === 'unavailable' && <Metadata label="Local AI explanation" value="Temporarily unavailable. The rules based assessment is shown." palette={palette} />}
      {scan.analysis_meta?.page_fetch && <Metadata label="Live page inspection" value={`${scan.analysis_meta.page_fetch.status || 'unknown'}${scan.analysis_meta.page_fetch.http_status ? ` · HTTP ${scan.analysis_meta.page_fetch.http_status}` : ''}${scan.analysis_meta.page_fetch.redirect_count ? ` · ${scan.analysis_meta.page_fetch.redirect_count} redirect(s)` : ''}${scan.analysis_meta.page_fetch.final_url ? ` · ${scan.analysis_meta.page_fetch.final_url}` : ''}`} palette={palette} />}
      {scan.analysis_meta?.fetch_status && <Metadata label="Page fetch" value={scan.analysis_meta.fetch_status} palette={palette} />}
      {scan.analysis_meta?.claim_sources?.map((source, index) => <Pressable key={`${source.url}-${index}`} onPress={() => void Linking.openURL(source.url)}>
        <Text style={styles.sourceLink}>{source.publisher}: {source.title || source.rating}{source.review_date ? ` · ${source.review_date}` : ''}</Text>
      </Pressable>)}
      {scan.analysis_meta?.extracted_text && <Metadata label="Text found in image" value={scan.analysis_meta.extracted_text} palette={palette} />}
      {scan.analysis_meta?.qr_destination && <Metadata label="QR destination" value={scan.analysis_meta.qr_destination} palette={palette} />}
      {scan.analysis_meta?.image_metadata && Object.entries(scan.analysis_meta.image_metadata).map(([key, value]) => <Metadata key={key} label={key.replaceAll('_', ' ')} value={value} palette={palette} />)}
      {scan.analysis_meta?.c2pa_status && <Metadata label="Content credentials" value={`${scan.analysis_meta.c2pa_status}. A missing marker does not mean an image is fake; a detected marker remains unverified.`} palette={palette} />}
      {scan.analysis_meta?.sha256 && <Metadata label="SHA-256" value={scan.analysis_meta.sha256} palette={palette} />}
      {scan.analysis_meta?.local_signatures && <Metadata label="Local file signatures" value={scan.analysis_meta.local_signatures.matches?.length ? scan.analysis_meta.local_signatures.matches.join(', ') : 'No built-in pattern matched; this is not a clean-file guarantee.'} palette={palette} />}
      {scan.analysis_meta?.yara && <Metadata label={`YARA · ${scan.analysis_meta.yara.status}`} value={scan.analysis_meta.yara.matches?.join(', ') || 'No rule match reported.'} palette={palette} />}
      {scan.analysis_meta?.antivirus && <Metadata label={`Antivirus · ${scan.analysis_meta.antivirus.status}`} value={scan.analysis_meta.antivirus.signature || scan.analysis_meta.antivirus.scanner || 'No signature detail reported.'} palette={palette} />}
      {scan.analysis_meta?.media_provider && <Metadata label="Image authenticity provider" value={scan.analysis_meta.media_provider.status === 'not_configured' ? 'Not configured; no AI-generated or deepfake verdict was produced.' : `${scan.analysis_meta.media_provider.status}. Provider output is a signal, not proof.`} palette={palette} />}
      {scan.evidence.map((item, index) => <View style={styles.evidence} key={`${item.title}-${index}`}>
        <Text style={[styles.sectionTitle, { color: palette.text }]}>{item.title}</Text><Text style={[styles.copy, { color: palette.text }]}>{item.description}</Text><Text style={styles.severity}>{item.severity}</Text>
      </View>)}
      <Text style={[styles.sectionTitle, { color: palette.text }]}>Recommended action</Text>
      {scan.recommendations.map((item, index) => <Text style={[styles.copy, { color: palette.text }]} key={index}>• {item}</Text>)}
    </View>
    {!scan.is_demo && <View style={styles.actions}>
      <Pressable style={styles.share} onPress={() => onShare(scan)}><Text style={styles.shareText}>Create private share link</Text></Pressable>
      <Pressable style={styles.share} onPress={() => onExportPdf(scan)}><Text style={styles.shareText}>Export PDF report</Text></Pressable>
    </View>}
  </>;
}

function Metadata({ label, value, palette }: { label: string; value: string; palette: WorkspacePalette }) {
  return <View style={styles.metadata}><Text style={[styles.sectionTitle, { color: palette.text }]}>{label}</Text><Text style={[styles.copy, { color: palette.text }]}>{value}</Text></View>;
}

const riskStyle = (level: string) => level === 'LOW' ? styles.low : level === 'CAUTION' ? styles.caution : styles.high;
const styles = StyleSheet.create({
  back: { fontSize: 12, color: '#286c8b', fontWeight: '700', marginBottom: 18 },
  kicker: { fontSize: 10, letterSpacing: 1.3, color: '#8999a2', fontWeight: '700', marginTop: 12 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  copy: { fontSize: 12, lineHeight: 18, marginTop: 6, opacity: 0.78 },
  low: { color: '#438267' }, caution: { color: '#987331' }, high: { color: '#a24e44' },
  card: { borderWidth: 1, borderRadius: 10, padding: 15, marginVertical: 15 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 10 },
  metadata: { borderTopWidth: 1, borderColor: '#edf0f1', marginTop: 12, paddingTop: 8 },
  disclaimer: { fontSize: 10, color: '#87949b', lineHeight: 15, marginTop: 5 },
  sourceLink: { fontSize: 12, color: '#286c8b', marginTop: 8 },
  evidence: { borderTopWidth: 1, borderColor: '#edf0f1', marginTop: 12, paddingTop: 8 },
  severity: { fontSize: 9, color: '#a56458', marginTop: 4 },
  demoBanner: { backgroundColor: '#fff6e4', borderColor: '#eed9a7', borderWidth: 1, borderRadius: 9, padding: 12, marginVertical: 10 },
  demoTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#8a6823' },
  demoCopy: { fontSize: 11, lineHeight: 16, color: '#73613b', marginTop: 4 },
  share: { backgroundColor: 'white', borderColor: '#dce5e7', borderWidth: 1, borderRadius: 9, padding: 12, alignItems: 'center' },
  actions: { gap: 8, marginTop: 8 },
  shareText: { color: '#386e80', fontWeight: '600', fontSize: 12 },
});
