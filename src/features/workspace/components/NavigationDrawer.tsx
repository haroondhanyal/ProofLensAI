import { useEffect, useState } from 'react';
import { Animated, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WorkspacePalette } from '../../../core/theme/palette';
import type { ThemeName } from '../../../core/theme/storage';

export type WorkspaceTab = 'Overview' | 'Scan' | 'History' | 'Settings';

type NavigationDrawerProps = {
  visible: boolean;
  activeTab: WorkspaceTab;
  displayName: string;
  email?: string;
  avatarUri?: string;
  demo: boolean;
  theme: ThemeName;
  palette: WorkspacePalette;
  onClose: () => void;
  onNavigate: (tab: WorkspaceTab) => void;
  onThemeChange: (theme: ThemeName) => void;
  onSignOut: () => void;
};

const NAV_ITEMS: { tab: WorkspaceTab; icon: string; label: string }[] = [
  { tab: 'Overview', icon: '⌂', label: 'Overview' },
  { tab: 'Scan', icon: '⌕', label: 'Check something' },
  { tab: 'History', icon: '◷', label: 'Scan history' },
  { tab: 'Settings', icon: '⚙', label: 'Profile & settings' },
];
const THEMES: ThemeName[] = ['Light', 'Ocean', 'Dark', 'Gray', 'High contrast'];
const DRAWER_WIDTH = 340;

export function NavigationDrawer({
  visible, activeTab, displayName, email, avatarUri, demo, theme, palette,
  onClose, onNavigate, onThemeChange, onSignOut,
}: NavigationDrawerProps) {
  const [slide] = useState(() => new Animated.Value(-DRAWER_WIDTH));

  useEffect(() => {
    if (!visible) return;
    slide.setValue(-DRAWER_WIDTH);
    Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
  }, [slide, visible]);

  function selectTab(tab: WorkspaceTab) {
    onNavigate(tab);
    onClose();
  }

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent={Platform.OS === 'android'}>
    <View style={styles.modalRoot}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close navigation menu" />
      <Animated.View style={[styles.drawer, { backgroundColor: palette.surface, borderRightColor: palette.border, transform: [{ translateX: slide }] }]}>
        <View style={[styles.drawerHeader, { borderBottomColor: palette.border }]}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>P</Text></View>
          <View style={styles.brandCopy}><Text style={[styles.brand, { color: palette.text }]}>ProofLens <Text style={[styles.brandAI, { color: palette.accent }]}>AI</Text></Text><Text style={styles.brandCaption}>PERSONAL SAFETY WORKSPACE</Text></View>
          <Pressable style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close menu"><Text style={[styles.closeText, { color: palette.text }]}>×</Text></Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.drawerContent} keyboardShouldPersistTaps="handled">
          <View style={[styles.accountCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <View style={[styles.avatarFallback, { backgroundColor: `${palette.accent}1A` }]}><Text style={[styles.avatarInitial, { color: palette.accent }]}>{displayName.slice(0, 1).toUpperCase()}</Text></View>}
            <View style={styles.accountCopy}><Text numberOfLines={1} style={[styles.accountName, { color: palette.text }]}>{displayName}</Text><Text numberOfLines={1} style={styles.accountEmail}>{email || (demo ? 'Sample workspace' : 'ProofLens account')}</Text></View>
            <View style={[styles.onlineDot, { backgroundColor: demo ? '#d49a32' : '#26956f' }]} />
          </View>

          <Text style={styles.sectionLabel}>WORKSPACE</Text>
          {NAV_ITEMS.filter(({ tab }) => (tab !== 'Scan' || !demo) && (tab !== 'Settings' || !demo)).map(({ tab, icon, label }) => {
            const selected = activeTab === tab;
            return <Pressable key={tab} onPress={() => selectTab(tab)} style={[styles.navItem, selected && { backgroundColor: `${palette.accent}18` }]} accessibilityRole="button" accessibilityState={{ selected }}>
              <Text style={[styles.navIcon, { color: selected ? palette.accent : '#7f8e98' }]}>{icon}</Text>
              <Text style={[styles.navLabel, { color: selected ? palette.accent : palette.text, fontWeight: selected ? '700' : '500' }]}>{label}</Text>
              {selected && <View style={[styles.activeMark, { backgroundColor: palette.accent }]} />}
            </Pressable>;
          })}

          <Text style={[styles.sectionLabel, styles.appearanceTitle]}>APPEARANCE</Text>
          <Text style={[styles.themeHint, { color: palette.text }]}>Choose a theme for the whole app</Text>
          <View style={styles.themeGrid}>{THEMES.map((item) => {
            const selected = theme === item;
            return <Pressable key={item} onPress={() => onThemeChange(item)} accessibilityRole="radio" accessibilityState={{ selected }} style={[styles.themeChip, { backgroundColor: palette.bg, borderColor: selected ? palette.accent : palette.border }]}>
              <View style={[styles.themeDot, { backgroundColor: themeSwatch(item), borderColor: item === 'Light' ? '#ccd4dc' : themeSwatch(item) }]} />
              <Text numberOfLines={1} style={[styles.themeLabel, { color: palette.text, fontWeight: selected ? '700' : '500' }]}>{item}</Text>
              {selected && <Text style={[styles.themeCheck, { color: palette.accent }]}>✓</Text>}
            </Pressable>;
          })}</View>

          <Pressable onPress={() => { onClose(); onSignOut(); }} style={[styles.signOutButton, { borderColor: '#ead3d2', backgroundColor: '#fff8f7' }]} accessibilityRole="button">
            <Text style={styles.signOutIcon}>↪</Text><Text style={styles.signOutText}>{demo ? 'Exit sample workspace' : 'Sign out'}</Text>
          </Pressable>
          <Text style={styles.footer}>ProofLens AI · Check before you trust</Text>
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>;
}

function themeSwatch(theme: ThemeName) {
  return {
    Light: '#ffffff',
    Ocean: '#39a5b3',
    Dark: '#18232e',
    Gray: '#5a6572',
    'High contrast': '#0037a5',
  }[theme];
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, flexDirection: 'row' },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(8, 18, 28, 0.52)' },
  drawer: { width: '88%', maxWidth: DRAWER_WIDTH, height: '100%', borderRightWidth: 1, paddingTop: Platform.OS === 'ios' ? 48 : 28 },
  drawerHeader: { minHeight: 72, paddingHorizontal: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  brandMark: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#087b69', marginRight: 11 },
  brandMarkText: { color: 'white', fontSize: 24, fontWeight: '900' },
  brandCopy: { flex: 1 },
  brand: { fontSize: 17, fontWeight: '800' },
  brandAI: { fontSize: 11, fontWeight: '800' },
  brandCaption: { color: '#84949d', fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 3 },
  closeButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#82909a14' },
  closeText: { fontSize: 28, lineHeight: 32 },
  drawerContent: { paddingHorizontal: 17, paddingTop: 17, paddingBottom: 30 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  avatarImage: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 17, fontWeight: '800' },
  accountCopy: { flex: 1, marginLeft: 11 },
  accountName: { fontSize: 14, fontWeight: '700' },
  accountEmail: { color: '#87959e', fontSize: 10, marginTop: 4 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
  sectionLabel: { color: '#92a0a8', fontSize: 9, fontWeight: '800', letterSpacing: 1.35, marginHorizontal: 10, marginBottom: 9 },
  navItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, borderRadius: 11, marginBottom: 3 },
  navIcon: { width: 29, fontSize: 21, textAlign: 'center', marginRight: 8 },
  navLabel: { flex: 1, fontSize: 13 },
  activeMark: { width: 5, height: 22, borderRadius: 3 },
  appearanceTitle: { marginTop: 24 },
  themeHint: { opacity: 0.62, fontSize: 11, marginHorizontal: 10, marginBottom: 10 },
  themeGrid: { gap: 8 },
  themeChip: { minHeight: 40, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  themeDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, marginRight: 9 },
  themeLabel: { flex: 1, fontSize: 11 },
  themeCheck: { fontSize: 13, fontWeight: '800' },
  signOutButton: { minHeight: 46, borderWidth: 1, borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginTop: 27 },
  signOutIcon: { color: '#a14843', fontSize: 19, marginRight: 10 },
  signOutText: { color: '#a14843', fontWeight: '700', fontSize: 12 },
  footer: { color: '#a2adb4', textAlign: 'center', fontSize: 9, marginTop: 19 },
});
