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
    avatarUri?: string;
    phoneCountry: PhoneCountry;
    phone: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    showCurrentPassword: boolean;
    showNewPassword: boolean;
    showConfirmNewPassword: boolean;
    theme: ThemeName;
    busy: boolean;
    error: string;
    notice: string;
    scanRetentionDays: number | null;
    deletePassword: string;
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
    onToggleCurrentPassword: () => void;
    onToggleNewPassword: () => void;
    onToggleConfirmPassword: () => void;
    onUpdatePassword: () => void;
    onThemeChange: (value: ThemeName) => void;
    onRetentionChange: (value: number | null) => void;
    onSaveRetention: () => void;
    onDeletePasswordChange: (value: string) => void;
    onDeleteAccount: () => void;
  };
};

export function SettingsScreen({ data, palette, actions }: SettingsScreenProps) {
  const profilePhotoUri = data.profilePhoto?.uri ?? data.avatarUri;
  return <>
    <Text style={styles.kicker}>ACCOUNT & PREFERENCES</Text>
    <Text style={[styles.title, { color: palette.text }]}>Settings</Text>
    <Text style={[styles.sectionTitle, { color: palette.text }]}>Profile</Text>
    <View style={[styles.profileSummary, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {profilePhotoUri ? <Image source={{ uri: profilePhotoUri }} style={styles.profilePhoto} /> : <View style={[styles.profilePhoto, styles.profilePhotoFallback, { backgroundColor: `${palette.accent}1A` }]}><Text style={[styles.profileInitial, { color: palette.accent }]}>{data.name.slice(0, 1).toUpperCase() || '?'}</Text></View>}
      <View style={styles.profileSummaryText}><Text numberOfLines={1} style={[styles.profileName, { color: palette.text }]}>{data.name || 'Your profile'}</Text><Text numberOfLines={1} style={styles.profileEmail}>{data.email}</Text><Text numberOfLines={1} style={styles.profilePhone}>{data.phone ? `${data.phoneCountry.dial} ${data.phone}` : 'Add a phone number'}</Text></View>
    </View>
    <Pressable style={styles.secondary} onPress={actions.onChooseProfilePhoto}><Text style={styles.secondaryText}>{profilePhotoUri ? 'Change profile photo' : 'Add profile photo'}</Text></Pressable>
    <Text style={styles.help}>JPEG, PNG or WEBP · up to 20 MB</Text>
    <TextInput style={styles.input} placeholder="Full name" value={data.name} onChangeText={actions.onNameChange} />
    <TextInput style={styles.input} placeholder="Email address" value={data.email} editable={false} />
    <CountryCodeField country={data.phoneCountry} onCountry={actions.onPhoneCountryChange} value={data.phone} onValue={actions.onPhoneChange} placeholder="Phone number" />
    <Pressable style={styles.primary} onPress={actions.onSaveProfile} disabled={data.busy}><Text style={styles.primaryText}>{data.busy ? 'Saving…' : 'Save profile'}</Text></Pressable>

    <Text style={[styles.sectionTitle, { color: palette.text }]}>Change password</Text>
    <View style={styles.passwordRow}>
      <TextInput style={styles.passwordInput} placeholder="Current password" value={data.currentPassword} onChangeText={actions.onCurrentPasswordChange} secureTextEntry={!data.showCurrentPassword} autoComplete="current-password" />
      <Pressable onPress={actions.onToggleCurrentPassword} style={styles.passwordToggle}><Text style={styles.linkText}>{data.showCurrentPassword ? 'Hide' : 'Show'}</Text></Pressable>
    </View>
    <View style={styles.passwordRow}>
      <TextInput style={styles.passwordInput} placeholder="New password (10+ characters)" value={data.newPassword} onChangeText={actions.onNewPasswordChange} secureTextEntry={!data.showNewPassword} autoComplete="new-password" />
      <Pressable onPress={actions.onToggleNewPassword} style={styles.passwordToggle}><Text style={styles.linkText}>{data.showNewPassword ? 'Hide' : 'Show'}</Text></Pressable>
    </View>
    <View style={styles.passwordRow}>
      <TextInput style={styles.passwordInput} placeholder="Confirm new password" value={data.confirmNewPassword} onChangeText={actions.onConfirmPasswordChange} secureTextEntry={!data.showConfirmNewPassword} />
      <Pressable onPress={actions.onToggleConfirmPassword} style={styles.passwordToggle}><Text style={styles.linkText}>{data.showConfirmNewPassword ? 'Hide' : 'Show'}</Text></Pressable>
    </View>
    <Pressable style={styles.primary} onPress={actions.onUpdatePassword} disabled={data.busy}><Text style={styles.primaryText}>{data.busy ? 'Updating…' : 'Update password'}</Text></Pressable>

    <Text style={[styles.sectionTitle, { color: palette.text }]}>Privacy · scan retention</Text>
    <Text style={styles.help}>Expired scans and evidence are removed automatically by the API once a day.</Text>
    <View style={styles.themeRow}>{([30, 90, 180, 365, null] as const).map((days) => {
      const selected = data.scanRetentionDays === days;
      const label = days === null ? 'Keep until deleted' : `${days} days`;
      return <Pressable key={label} onPress={() => actions.onRetentionChange(days)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.themeChip, { borderColor: selected ? palette.accent : palette.border, backgroundColor: palette.surface }]}>
        <Text style={[styles.secondaryText, { color: palette.text }]}>{selected ? '✓ ' : ''}{label}</Text>
      </Pressable>;
    })}</View>
    <Pressable style={styles.primary} onPress={actions.onSaveRetention} disabled={data.busy}><Text style={styles.primaryText}>{data.busy ? 'Saving…' : 'Save privacy settings'}</Text></Pressable>

    <Text style={[styles.sectionTitle, { color: palette.text }]}>Appearance</Text>
    <View style={styles.themeRow}>{(['Light', 'Ocean', 'Dark', 'Gray', 'High contrast'] as const).map((theme) => <Pressable key={theme} onPress={() => actions.onThemeChange(theme)} style={[styles.themeChip, { borderColor: data.theme === theme ? palette.accent : palette.border, backgroundColor: palette.surface }]}>
      <Text style={styles.secondaryText}>{data.theme === theme ? '✓ ' : ''}{theme}</Text>
    </Pressable>)}</View>
    <Text style={[styles.sectionTitle, { color: palette.text }]}>Danger zone · delete account</Text>
    <Text style={styles.help}>This permanently deletes your profile and saved reports.</Text>
    <TextInput style={styles.input} placeholder="Confirm current password" value={data.deletePassword} onChangeText={actions.onDeletePasswordChange} secureTextEntry autoComplete="current-password" />
    <Pressable style={styles.danger} onPress={actions.onDeleteAccount} disabled={data.busy}><Text style={styles.primaryText}>Delete account and data</Text></Pressable>
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
  profileSummary: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 14, borderWidth: 1, borderRadius: 12, marginTop: 10 },
  profilePhoto: { width: 70, height: 70, borderRadius: 35 },
  profilePhotoFallback: { alignItems: 'center', justifyContent: 'center' },
  profileInitial: { fontSize: 23, fontWeight: '800' },
  profileSummaryText: { flex: 1 },
  profileName: { fontSize: 14, fontWeight: '700' },
  profileEmail: { color: '#71828b', fontSize: 11, marginTop: 4 },
  profilePhone: { color: '#89979f', fontSize: 10, marginTop: 4 },
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
  help: { color: '#71828b', fontSize: 11, lineHeight: 16, marginTop: 8 },
  danger: { backgroundColor: '#a33d38', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' },
});
