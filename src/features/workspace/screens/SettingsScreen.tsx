import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { CountryCodeField } from '../../auth/components/CountryCodeField';
import type { PhoneCountry } from '../../auth/data/phoneCountries';
import type { WorkspacePalette } from '../../../core/theme/palette';

type ThemeName = 'Light' | 'Ocean' | 'Dark' | 'Gray' | 'High contrast';
type SettingsScreenProps = {
  data: {
    name: string;
    email: string;
    profilePhoto: ImagePickerAsset | null;
    phoneCountry: PhoneCountry;
    phone: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    showConfirmNewPassword: boolean;
    theme: ThemeName;
    busy: boolean;
    error: string;
    notice: string;
  };
  palette: WorkspacePalette;
  actions: {
    onChooseProfilePhoto: () => void;
    onNameChange: (value: string) => void;
    onPhoneCountryChange: (country: PhoneCountry) => void;
    onPhoneChange: (value: string) => void;
    onSaveProfile: () => void;
    onCurrentPasswordChange: (value: string) => void;
    onNewPasswordChange: (value: string) => void;
    onConfirmPasswordChange: (value: string) => void;
    onToggleConfirmPassword: () => void;
    onUpdatePassword: () => void;
    onThemeChange: (value: ThemeName) => void;
  };
};

export function SettingsScreen({ data, palette, actions }: SettingsScreenProps) {
  return <>
    <Text style={styles.kicker}>ACCOUNT & PREFERENCES</Text>
    <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
    <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile</Text>
    <Pressable style={styles.secondary} onPress={actions.onChooseProfilePhoto}><Text style={styles.secondaryText}>{data.profilePhoto ? 'Choose another photo' : 'Edit profile photo'}</Text></Pressable>
    {data.profilePhoto && <Image source={{ uri: data.profilePhoto.uri }} style={styles.profilePhoto} />}
    <TextInput style={styles.input} placeholder="Full name" value={data.name} onChangeText={actions.onNameChange} />
    <TextInput style={styles.input} placeholder="Email address" value={data.email} editable={false} />
    <CountryCodeField country={data.phoneCountry} onCountry={actions.onPhoneCountryChange} value={data.phone} onValue={actions.onPhoneChange} placeholder="Phone number" />
    <Pressable style={styles.primary} onPress={actions.onSaveProfile} disabled={data.busy}><Text style={styles.primaryText}>{data.busy ? 'Saving…' : 'Save profile'}</Text></Pressable>

    <Text style={[styles.sectionTitle, { color: palette.text }]}>Change password</Text>
    <TextInput style={styles.input} placeholder="Current password" value={data.currentPassword} onChangeText={actions.onCurrentPasswordChange} secureTextEntry />
    <TextInput style={styles.input} placeholder="New password (10+ characters)" value={data.newPassword} onChangeText={actions.onNewPasswordChange} secureTextEntry />
    <View style={styles.passwordRow}>
      <TextInput style={styles.passwordInput} placeholder="Confirm new password" value={data.confirmNewPassword} onChangeText={actions.onConfirmPasswordChange} secureTextEntry={!data.showConfirmNewPassword} />
      <Pressable onPress={actions.onToggleConfirmPassword} style={styles.passwordToggle}><Text style={styles.linkText}>{data.showConfirmNewPassword ? 'Hide' : 'Show'}</Text></Pressable>
    </View>
    <Pressable style={styles.primary} onPress={actions.onUpdatePassword} disabled={data.busy}><Text style={styles.primaryText}>{data.busy ? 'Updating…' : 'Update password'}</Text></Pressable>

    <Text style={[styles.sectionTitle, { color: palette.text }]}>Appearance</Text>
    <View style={styles.themeRow}>{(['Light', 'Ocean', 'Dark', 'Gray', 'High contrast'] as const).map((theme) => <Pressable key={theme} onPress={() => actions.onThemeChange(theme)} style={[styles.themeChip, { borderColor: data.theme === theme ? palette.accent : palette.border, backgroundColor: palette.surface }]}>
      <Text style={styles.secondaryText}>{data.theme === theme ? '✓ ' : ''}{theme}</Text>
    </Pressable>)}</View>
    {data.error !== '' && <Text style={styles.error}>{data.error}</Text>}
    {data.notice !== '' && <Text style={styles.notice}>{data.notice}</Text>}
  </>;
}

const styles = StyleSheet.create({
  kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700', marginTop: 12 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', marginTop: 18 },
  secondary: { backgroundColor: 'white', borderColor: '#dce5e7', borderWidth: 1, borderRadius: 9, padding: 12, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#386e80', fontWeight: '600', fontSize: 12 },
  profilePhoto: { width: 62, height: 62, borderRadius: 31, alignSelf: 'center', marginTop: 10 },
  input: { backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, padding: 13, fontSize: 14, color: '#203744', marginTop: 12 },
  primary: { backgroundColor: '#286c8b', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  passwordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, paddingHorizontal: 12 },
  passwordInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#203744' },
  passwordToggle: { padding: 8 },
  linkText: { color: '#286c8b', fontSize: 12, fontWeight: '700' },
  themeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  themeChip: { padding: 10, borderWidth: 1, borderRadius: 9 },
  error: { color: '#a44840', backgroundColor: '#fff1ef', padding: 10, marginTop: 10, borderRadius: 7, fontSize: 12 },
  notice: { color: '#397658', backgroundColor: '#f0f8f3', padding: 10, marginTop: 10, borderRadius: 7, fontSize: 12 },
});
