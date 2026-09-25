import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { apiFetch, readApiError } from '../../../core/api/client';

export async function exportPdfReport(scanId: string): Promise<void> {
  const response = await apiFetch(`/reports/${encodeURIComponent(scanId)}/pdf`);
  if (!response.ok) throw await readApiError(response, 'PDF report download nahi hui.');

  const safeId = scanId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  const report = new File(Paths.cache, `prooflens-${safeId}-${Date.now()}.pdf`);
  report.create();
  report.write(new Uint8Array(await response.arrayBuffer()));
  await shareAsync(report.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Share ProofLens PDF report',
    UTI: 'com.adobe.pdf',
  });
}
