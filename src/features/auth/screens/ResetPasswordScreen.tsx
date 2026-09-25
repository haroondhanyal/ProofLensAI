import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../core/api/client';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit() {
    setError(''); setNotice('');
    if (password.length < 10) { setError('Password kam az kam 10 characters ka ho.'); return; }
    if (password !== confirmPassword) { setError('Dono passwords match nahi karte.'); return; }
    setBusy(true);
    try {
      const response = await apiFetch('/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: token ?? '', new_password: password }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || 'Reset link invalid ya expire ho gaya.');
      setNotice('Password update ho gaya. Ab naye password se sign in karein.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password update nahi hua.'); }
    finally { setBusy(false); }
  }

  return <View style={styles.screen}>
    <Text style={styles.brand}>ProofLens <Text style={styles.ai}>AI</Text></Text>
    <Text style={styles.kicker}>ACCOUNT SECURITY</Text><Text style={styles.title}>Choose a new password</Text>
    <Text style={styles.copy}>Reset links 30 minutes mein expire hote hain aur sirf ek baar use ho sakte hain.</Text>
    <View style={styles.feature}><Text style={styles.featureTag}>PROOFLENS AI · ACCOUNT SAFETY</Text><Text style={styles.featureTitle}>A safer next step starts with a check.</Text><Text style={styles.featureCopy}>Review suspicious links, messages, QR codes and files with clear evidence.</Text></View>
    <View style={styles.passwordRow}><TextInput style={styles.passwordInput} placeholder="New password (10+ characters)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword}/><Pressable onPress={() => setShowPassword(value => !value)}><Text style={styles.link}>{showPassword ? 'Hide' : 'Show'}</Text></Pressable></View>
    <View style={styles.passwordRow}><TextInput style={styles.passwordInput} placeholder="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showConfirm}/><Pressable onPress={() => setShowConfirm(value => !value)}><Text style={styles.link}>{showConfirm ? 'Hide' : 'Show'}</Text></Pressable></View>
    {error !== '' && <Text style={styles.error}>{error}</Text>}{notice !== '' && <Text style={styles.notice}>{notice}</Text>}
    <Pressable style={styles.primary} onPress={submit} disabled={busy}>{busy ? <ActivityIndicator color="white"/> : <Text style={styles.primaryText}>Update password</Text>}</Pressable>
    <Pressable style={styles.back} onPress={() => router.replace('/')}><Text style={styles.link}>‹ Return to sign in</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f7f9fa' }, brand: { fontSize: 22, fontWeight: '800', color: '#192b3d', marginBottom: 34 }, ai: { fontSize: 12, color: '#668492' }, kicker: { fontSize: 10, letterSpacing: 1.4, color: '#8999a2', fontWeight: '700' }, title: { fontSize: 25, fontWeight: '700', color: '#192b3d', marginTop: 8 }, copy: { fontSize: 12, lineHeight: 19, color: '#7b8a93', marginTop: 7, marginBottom: 10 }, feature:{padding:14,borderRadius:11,backgroundColor:'#e8f2f3',borderWidth:1,borderColor:'#d8e7e9',marginTop:6,marginBottom:6},featureTag:{fontSize:8,letterSpacing:1,color:'#286c8b',fontWeight:'800'},featureTitle:{fontSize:14,fontWeight:'700',color:'#192b3d',marginTop:7},featureCopy:{fontSize:10,lineHeight:15,color:'#637983',marginTop:4}, passwordRow: { backgroundColor: 'white', borderColor: '#dfe6e8', borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center' }, passwordInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: '#203744' }, link: { color: '#286c8b', fontSize: 12, fontWeight: '700' }, primary: { backgroundColor: '#286c8b', borderRadius: 9, padding: 14, alignItems: 'center', marginTop: 13, minHeight: 47, justifyContent: 'center' }, primaryText: { color: 'white', fontSize: 13, fontWeight: '700' }, back: { alignItems: 'center', padding: 16 }, error: { color: '#a44840', backgroundColor: '#fff1ef', padding: 10, marginTop: 10, borderRadius: 7, fontSize: 12 }, notice: { color: '#397658', backgroundColor: '#f0f8f3', padding: 10, marginTop: 10, borderRadius: 7, fontSize: 12, lineHeight: 18 } });
