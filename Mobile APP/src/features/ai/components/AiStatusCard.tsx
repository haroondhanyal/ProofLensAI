import { StyleSheet, Text, View } from 'react-native';
import type { AiStatus } from '../types/aiStatus';

type AiStatusCardProps = {
  status: AiStatus | null;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
};

export function AiStatusCard({ status, surfaceColor, borderColor, textColor, accentColor }: AiStatusCardProps) {
  const ready = status?.enabled === true;
  return <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
    <View style={styles.headingRow}>
      <Text style={[styles.badge, { color: ready ? '#277452' : '#8a6823', backgroundColor: ready ? '#eaf6ef' : '#fff6e4' }]}>AI</Text>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: textColor }]}>{ready ? 'Local AI is configured' : status?.status === 'not_configured' ? 'Local AI is not configured' : status ? 'AI status unavailable' : 'Checking AI status…'}</Text>
        <Text style={[styles.description, { color: textColor }]}>
          {ready
            ? `${status.model} can explain message warning signs when the model is reachable. Its advice does not change the risk score.`
            : status?.status === 'not_configured'
              ? 'Rules based checks still work. Configure local Ollama on the API server to add message explanations.'
              : status
                ? 'The API health check could not be reached. Check the API server connection.'
                : 'Reading AI settings from the API server.'}
        </Text>
      </View>
    </View>
    <Text style={[styles.footer, { color: accentColor }]}>Evidence and risk scores remain independent of AI advice.</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 11, padding: 14, marginTop: 14 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badge: { overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 7, fontSize: 10, fontWeight: '800' },
  copy: { flex: 1 },
  title: { fontSize: 12, fontWeight: '700' },
  description: { fontSize: 11, lineHeight: 16, opacity: 0.75, marginTop: 4 },
  footer: { fontSize: 10, lineHeight: 14, marginTop: 9 },
});
