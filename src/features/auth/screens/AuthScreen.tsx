import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CountryCodeField } from '../components/CountryCodeField';
import type { PhoneCountry } from '../data/phoneCountries';
import type { WorkspacePalette } from '../../../core/theme/palette';

type AuthMode = 'login' | 'register';
type AuthScreenProps = {
  data: {
    mode: AuthMode;
    profilePhoto: ImagePickerAsset | null;
    name: string;
    phoneCountry: PhoneCountry;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
    showPassword: boolean;
    showConfirmPassword: boolean;
    busy: boolean;
    error: string;
  };
  palette: WorkspacePalette;
  actions: {
    onChoosePhoto: () => void;
    onNameChange: (value: string) => void;
    onPhoneCountryChange: (country: PhoneCountry) => void;
    onPhoneChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onTogglePassword: () => void;
    onToggleConfirmPassword: () => void;
    onSubmit: () => void;
    onModeChange: (mode: AuthMode) => void;
    onStartDemo: () => void;
  };
};

const AUTH_FEATURES = [
  { title: 'Check before you trust', copy: 'Inspect suspicious links, messages, QR codes and files.' },
  { title: 'See the evidence', copy: 'Understand why a check raised a warning and what to do next.' },
  { title: 'Keep your checks private', copy: 'Sign in to save your personal safety history.' },
];

export function AuthScreen({ data, palette, actions }: AuthScreenProps) {
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <StatusBar style="dark" />
    <View style={styles.brandRow}><Text style={styles.brandIcon}>✓</Text><Text style={[styles.brand, { color: palette.text }]}>ProofLens <Text style={styles.ai}>AI</Text></Text></View>
    <Text style={styles.kicker}>CHECK BEFORE YOU TRUST</Text>
    <Text style={[styles.title, { color: palette.text }]}>{data.mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
    <Text style={[styles.copy, { color: palette.text }]}>Check suspicious links and messages with explainable evidence.</Text>
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.featureTrack} contentContainerStyle={styles.featureContent}>
      {AUTH_FEATURES.map((feature, index) => <View key={feature.title} style={styles.featureCard}>
        <Text style={styles.featureTag}>PROOFLENS AI · 0{index + 1}</Text><Text style={styles.featureTitle}>{feature.title}</Text><Text style={styles.featureCopy}>{feature.copy}</Text>
      </View>)}
    </ScrollView>

    {data.mode === 'register' && <>
      <Pressable style={styles.secondary} onPress={actions.onChoosePhoto}><Text style={styles.secondaryText}>{data.profilePhoto ? 'Change profile photo' : 'Add profile photo (optional)'}</Text></Pressable>
      {data.profilePhoto && <Image source={{ uri: data.profilePhoto.uri }} style={styles.profilePreview} />}
      <TextInput style={styles.input} placeholder="Your full name" value={data.name} onChangeText={actions.onNameChange} autoCapitalize="words" />
      <CountryCodeField country={data.phoneCountry} onCountry={actions.onPhoneCountryChange} value={data.phone} onValue={actions.onPhoneChange} placeholder="Phone number (optional)" />
    </>}
    <TextInput style={styles.input} placeholder="Email address" value={data.email} onChangeText={actions.onEmailChange} autoCapitalize="none" keyboardType="email-address" />
    <PasswordField label="Password (10+ characters)" value={data.password} visible={data.showPassword} onChangeText={actions.onPasswordChange} onToggle={actions.onTogglePassword} />
    {data.mode === 'register' && <PasswordField label="Confirm password" value={data.confirmPassword} visible={data.showConfirmPassword} onChangeText={actions.onConfirmPasswordChange} onToggle={actions.onToggleConfirmPassword} />}
    {data.error !== '' && <Text style={styles.error}>{data.error}</Text>}
    <Pressable style={styles.primary} onPress={actions.onSubmit} disabled={data.busy}>
      {data.busy ? <ActivityIndicator color="white" /> : <Text style={styles.primaryText}>{data.mode === 'login' ? 'Sign in' : 'Create account'}</Text>}
    </Pressable>
    {data.mode === 'login' && <Pressable style={styles.link} onPress={() => router.push('/forgot-password')}><Text style={styles.linkText}>Forgot password?</Text></Pressable>}
    <Pressable style={styles.link} onPress={() => actions.onModeChange(data.mode === 'login' ? 'register' : 'login')}>
      <Text style={styles.linkText}>{data.mode === 'login' ? 'Create account' : 'Already registered? Sign in'}</Text>
    </Pressable>
    <View style={styles.divider} />
    <Pressable style={styles.secondary} onPress={actions.onStartDemo}><Text style={styles.secondaryText}>✦ LIMITED EDITION · Explore sample workspace</Text></Pressable>
    <Text style={styles.disclaimer}>Demo data is synthetic. No live scan was run.</Text>
  </KeyboardAvoidingView>;
}

function PasswordField({ label, value, visible, onChangeText, onToggle }: { label: string; value: string; visible: boolean; onChangeText: (value: string) => void; onToggle: () => void }) {
  return <View style={styles.passwordRow}>
    <TextInput style={styles.passwordInput} placeholder={label} value={value} onChangeText={onChangeText} secureTextEntry={!visible} />
    <Pressable style={styles.passwordToggle} accessibilityRole="button" onPress={onToggle}><Text style={styles.linkText}>{visible ? 'Hide' : 'Show'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f7f9fa' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 24 },
  brandIcon: { backgroundColor: '#e9f3f5', color: '#266b86', overflow: 'hidden', padding: 8, borderRadius: 10, fontWeight: '800' },
  brand: { fontSize: 20, fontWeight: '800' }, ai: { fontSize: 11, color: '#668492' },
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700' },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  copy: { fontSize: 12, lineHeight: 18, marginBottom: 10, opacity: 0.75 },
  featureTrack: { height: 94, marginTop: 7, marginBottom: 8, marginHorizontal: -5 },
  featureContent: { gap: 8, paddingHorizontal: 5 },
  featureCard: { width: 258, justifyContent: 'center', padding: 13, borderRadius: 11, backgroundColor: '#e7f2f3', borderWidth: 1, borderColor: '#d5e6e8' },
  featureTag: { fontSize: 8, letterSpacing: 1, color: '#286c8b', fontWeight: '800' },
  featureTitle: { fontSize: 13, fontWeight: '700', color: '#192b3d', marginTop: 6 },
  featureCopy: { fontSize: 10, lineHeight: 14, color: '#637983', marginTop: 3 },
  secondary: { backgroundColor: 'white', borderColor: '#dce5e7', borderWidth: 1, borderRadius: 9, padding: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#386e80', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  profilePreview: { width: 62, height: 62, borderRadius: 31, alignSelf: 'center', marginTop: 10 },
  input: { backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, padding: 13, fontSize: 14, color: '#203744', marginTop: 12 },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
  passwordInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#203744' },
  passwordToggle: { padding: 10 },
  primary: { backgroundColor: '#286c8b', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  link: { alignItems: 'center', padding: 13 }, linkText: { color: '#286c8b', fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#e6ecee', marginVertical: 10 },
  disclaimer: { fontSize: 10, color: '#8d9aa2', lineHeight: 15, marginTop: 12 },
  error: { color: '#a44840', backgroundColor: '#fff1ef', borderRadius: 7, padding: 10, marginTop: 10, fontSize: 12 },
});
