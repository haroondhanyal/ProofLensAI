import type { Scan } from '../types/scan';

export const DEMO_SCANS: Scan[] = [
  {
    scan_id: 'DEMO-URL-SAFE', scan_type: 'URL', risk_score: 0, risk_level: 'LOW', confidence: 'LOW',
    summary: 'SAMPLE ONLY — this reserved example address is shown to demonstrate the report layout. It was not checked by ProofLens.',
    evidence: [{ title: 'Reserved example domain', description: 'example.com is used for documentation and samples.', severity: 'INFO' }],
    recommendations: ['This is synthetic demo content, not a live verdict.'], is_demo: true,
  },
  {
    scan_id: 'DEMO-URL-FICTIONAL', scan_type: 'URL', risk_score: 62, risk_level: 'CAUTION', confidence: 'MEDIUM',
    summary: 'SAMPLE ONLY — fictional suspicious-address example for demonstrating evidence presentation.',
    evidence: [
      { title: 'Fictional look-alike wording', description: 'A made-up host uses account and verification terms.', severity: 'MEDIUM' },
      { title: 'No external reputation check', description: 'Demo content does not query any provider.', severity: 'INFO' },
    ],
    recommendations: ['Do not treat this sample as a real security assessment.'], is_demo: true,
  },
  {
    scan_id: 'DEMO-MESSAGE', scan_type: 'MESSAGE', risk_score: 70, risk_level: 'HIGH', confidence: 'MEDIUM',
    summary: 'SAMPLE ONLY — fictional scam-message text used to preview a report.',
    evidence: [{ title: 'Urgency in sample text', description: 'The example message uses made-up deadline language.', severity: 'MEDIUM' }],
    recommendations: ['This is simulated content, not a live scan.'], is_demo: true,
  },
  {
    scan_id: 'DEMO-QR-SAFE', scan_type: 'QR', risk_score: 0, risk_level: 'LOW', confidence: 'LOW',
    summary: 'SAMPLE ONLY — safe QR example points to reserved example.com and was not scanned.',
    evidence: [{ title: 'Reserved example destination', description: 'Shown only to illustrate a benign sample state.', severity: 'INFO' }],
    recommendations: ['Use the live scanner to inspect a QR code.'], is_demo: true,
  },
];
