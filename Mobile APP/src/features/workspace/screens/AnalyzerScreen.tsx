import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ScanMode } from '../../analysis/types/scan';
import type { WorkspacePalette } from '../../../core/theme/palette';

const SCAN_MODES: [ScanMode, string][] = [
  ['url', 'URL'], ['message', 'Message'], ['screenshot', 'Screenshot'], ['qr', 'QR'], ['image', 'Image'],
  ['file', 'File'], ['store', 'Store'], ['product', 'Product'], ['claim', 'Claim'],
];
type AnalyzerData = {
  demo: boolean;
  scanType: ScanMode;
  input: string;
  productUrl: string;
  storeContext: string;
  claimSources: string;
  price: string;
  referencePrice: string;
  fetchUrlPage: boolean;
  fetchStorePage: boolean;
  fetchProductPage: boolean;
  fileName: string | null;
  busy: boolean;
  error: string;
};
type AnalyzerActions = {
  onModeChange: (mode: ScanMode) => void;
  onInputChange: (value: string) => void;
  onProductUrlChange: (value: string) => void;
  onStoreContextChange: (value: string) => void;
  onClaimSourcesChange: (value: string) => void;
  onPriceChange: (value: string) => void;
  onReferencePriceChange: (value: string) => void;
  onToggleFetchUrl: () => void;
  onToggleFetchStore: () => void;
  onToggleFetchProduct: () => void;
  onChooseFile: () => void;
  onChooseImage: () => void;
  onOpenCamera: () => void;
  onAnalyze: () => void;
};

export function AnalyzerScreen({ data, actions, palette }: { data: AnalyzerData; actions: AnalyzerActions; palette: WorkspacePalette }) {
  const mediaMode = ['screenshot', 'image', 'qr'].includes(data.scanType);
  const canSubmit = mediaMode
    ? true
    : data.scanType === 'file'
      ? !!data.fileName
    : data.scanType === 'product'
      ? !!(data.input.trim() || data.productUrl.trim())
      : !!data.input.trim();

  return <>
    <Text style={styles.kicker}>SAFETY CHECK</Text>
    <Text style={[styles.title, { color: palette.text }]}>What would you like to verify?</Text>
    <View style={styles.modeRow}>{SCAN_MODES.map(([mode, label]) => <Pressable key={mode} style={[styles.mode, data.scanType === mode && styles.modeActive]} onPress={() => actions.onModeChange(mode)}>
      <Text style={styles.modeText}>{label}</Text>
    </Pressable>)}</View>

    {data.scanType === 'file' ? <>
      <Pressable style={styles.secondary} onPress={actions.onChooseFile}><Text style={styles.secondaryText}>{data.fileName ? `Selected: ${data.fileName}` : 'Choose PDF, Office file, ZIP or text file'}</Text></Pressable>
      <Text style={styles.disclaimer}>Static checks only. Uploaded files are never executed.</Text>
    </> : mediaMode ? <>
      <Text style={styles.disclaimer}>{data.scanType === 'qr' ? 'Scan a QR with your camera or choose its image.' : 'Choose an image from your photo library.'}</Text>
      <View style={styles.actionRow}>
        <Pressable style={styles.secondary} onPress={actions.onChooseImage}><Text style={styles.secondaryText}>Choose image</Text></Pressable>
        <Pressable style={styles.secondary} onPress={actions.onOpenCamera}><Text style={styles.secondaryText}>{data.scanType === 'qr' ? 'Open QR camera' : 'Scan QR camera'}</Text></Pressable>
      </View>
    </> : <>
      {data.scanType === 'product' && <>
        <TextInput style={styles.input} placeholder="Product URL (optional)" value={data.productUrl} onChangeText={actions.onProductUrlChange} autoCapitalize="none" />
        <View style={styles.actionRow}>
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Price" value={data.price} onChangeText={actions.onPriceChange} keyboardType="decimal-pad" />
          <TextInput style={[styles.input, styles.flexInput]} placeholder="Reference price" value={data.referencePrice} onChangeText={actions.onReferencePriceChange} keyboardType="decimal-pad" />
        </View>
      </>}
      <TextInput
        multiline
        style={[styles.input, styles.textArea]}
        placeholder={data.scanType === 'url' ? 'Paste suspicious URL' : data.scanType === 'store' ? 'Paste online store URL' : data.scanType === 'product' ? 'Paste product listing details' : data.scanType === 'claim' ? 'Enter a claim to review' : 'Paste suspicious SMS, email or chat message'}
        value={data.input}
        onChangeText={actions.onInputChange}
      />
      {data.scanType === 'claim' && <>
        <TextInput multiline style={[styles.input, styles.textArea]} placeholder="Optional source URLs (one per line, up to 3)" value={data.claimSources} onChangeText={actions.onClaimSourcesChange} autoCapitalize="none" />
        <Text style={styles.disclaimer}>Fetched links are shown as unverified references, not a verdict.</Text>
      </>}
      {data.scanType === 'store' && <>
        <TextInput multiline style={[styles.input, styles.textArea]} placeholder="Optional: paste public store details or policies" value={data.storeContext} onChangeText={actions.onStoreContextChange} />
        <ToggleOption value={data.fetchStorePage} label="Fetch public HTTPS page and up to 2 same-site policy pages" onPress={actions.onToggleFetchStore} />
      </>}
      {data.scanType === 'product' && <ToggleOption value={data.fetchProductPage} label="Fetch public HTTPS product page" onPress={actions.onToggleFetchProduct} />}
      {data.scanType === 'url' && <ToggleOption value={data.fetchUrlPage} label="Fetch public page to inspect redirects and form fields" onPress={actions.onToggleFetchUrl} />}
    </>}

    {data.error !== '' && <Text style={styles.error}>{data.error}</Text>}
    <Pressable style={styles.primary} onPress={actions.onAnalyze} disabled={data.busy || data.demo || !canSubmit}>
      {data.busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>{data.demo ? 'Sign in for a live check' : mediaMode ? 'Analyze selected image' : 'Analyze safely'}</Text>}
    </Pressable>
    <Text style={styles.disclaimer}>No submitted URLs are opened. External provider checks are optional; findings explain their source and limits.</Text>
  </>;
}

function ToggleOption({ value, label, onPress }: { value: boolean; label: string; onPress: () => void }) {
  return <Pressable style={styles.secondary} accessibilityRole="checkbox" accessibilityState={{ checked: value }} onPress={onPress}>
    <Text style={styles.secondaryText}>{value ? '☑' : '☐'} {label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  mode: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#edf1f2' },
  modeActive: { backgroundColor: '#dfedf0', borderWidth: 1, borderColor: '#286c8b' },
  modeText: { fontSize: 11, color: '#436a79', fontWeight: '600' },
  input: { backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, padding: 13, fontSize: 14, color: '#203744', marginTop: 12 },
  textArea: { minHeight: 125, textAlignVertical: 'top' },
  flexInput: { flex: 1 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 10 },
  secondary: { flex: 1, backgroundColor: 'white', borderColor: '#dce5e7', borderWidth: 1, borderRadius: 9, padding: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#386e80', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  primary: { backgroundColor: '#286c8b', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  disclaimer: { fontSize: 10, color: '#8d9aa2', lineHeight: 15, marginTop: 12 },
  error: { color: '#a44840', backgroundColor: '#fff1ef', borderRadius: 7, padding: 10, marginTop: 10, fontSize: 12 },
});
