import { useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { apiFetch, apiUrl, clearMobileCredentials, getMobileRefreshToken, saveMobileCredentials } from '../../../core/api/client';
import { getThemePalette, readThemePreference, writeThemePreference } from '../../../core/theme/storage';
import type { ThemeName } from '../../../core/theme/storage';
import type { Scan, ScanMode } from '../../analysis/types/scan';
import { DEMO_SCANS } from '../../analysis/data/demoScans';
import { exportPdfReport } from '../../analysis/services/exportPdf';
import { PHONE_COUNTRIES, splitPhone } from '../../auth/data/phoneCountries';
import type { PhoneCountry } from '../../auth/data/phoneCountries';
import { fetchAiStatus } from '../../ai/services/aiStatus';
import type { AiStatus } from '../../ai/types/aiStatus';
import { OverviewScreen } from './OverviewScreen';
import { ScanReportScreen } from './ScanReportScreen';
import { HistoryScreen } from './HistoryScreen';
import { SettingsScreen } from './SettingsScreen';
import { AnalyzerScreen } from './AnalyzerScreen';
import { AuthScreen } from '../../auth/screens/AuthScreen';

type Tab = 'Overview' | 'Scan' | 'History' | 'Settings';
type UserProfile = { email: string; display_name: string; phone?: string | null; avatar_url?: string | null };

export default function App() {
  const { returnToShare } = useLocalSearchParams<{ returnToShare?: string }>();
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState(''); const [phone,setPhone]=useState(''); const [phoneCountry,setPhoneCountry]=useState<PhoneCountry>(PHONE_COUNTRIES[0]); const [profileCountry,setProfileCountry]=useState<PhoneCountry>(PHONE_COUNTRIES[0]); const [confirmPassword,setConfirmPassword]=useState(''); const [showPassword,setShowPassword]=useState(false); const [showConfirmPassword,setShowConfirmPassword]=useState(false); const [profile,setProfile]=useState<UserProfile|null>(null); const [profilePhoto,setProfilePhoto]=useState<ImagePicker.ImagePickerAsset|null>(null); const [avatarVersion,setAvatarVersion]=useState(0); const [profileName,setProfileName]=useState(''); const [profilePhone,setProfilePhone]=useState(''); const [currentPassword,setCurrentPassword]=useState(''); const [newPassword,setNewPassword]=useState(''); const [confirmNewPassword,setConfirmNewPassword]=useState(''); const [showCurrentPassword,setShowCurrentPassword]=useState(false); const [showNewPassword,setShowNewPassword]=useState(false); const [showConfirmNewPassword,setShowConfirmNewPassword]=useState(false); const [theme,setTheme]=useState<ThemeName>('Light'); const [notice,setNotice]=useState(''); const [scanRetentionDays,setScanRetentionDays]=useState<number|null>(365); const [deletePassword,setDeletePassword]=useState('');
  const [authMode,setAuthMode]=useState<'login'|'register'>('login'); const [user,setUser]=useState(''); const [demo,setDemo]=useState(false);
  const [tab,setTab]=useState<Tab>('Overview'); const [scanType,setScanType]=useState<ScanMode>('url'); const [input,setInput]=useState(''); const [productUrl,setProductUrl]=useState(''); const [storeContext,setStoreContext]=useState(''); const [claimSources,setClaimSources]=useState(''); const [price,setPrice]=useState(''); const [referencePrice,setReferencePrice]=useState(''); const [fetchUrlPage,setFetchUrlPage]=useState(false); const [fetchStorePage,setFetchStorePage]=useState(false); const [fetchProductPage,setFetchProductPage]=useState(false); const [document,setDocument]=useState<DocumentPicker.DocumentPickerAsset|null>(null);
  const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [scans,setScans]=useState<Scan[]>([]); const [selected,setSelected]=useState<Scan|null>(null);
  const [cameraOpen,setCameraOpen]=useState(false); const [cameraPermission,requestCameraPermission]=useCameraPermissions();
  const [aiStatus,setAiStatus]=useState<AiStatus|null>(null);

  useEffect(()=>{let mounted=true;fetchAiStatus().then(status=>{if(mounted)setAiStatus(status)}).catch(()=>{if(mounted)setAiStatus({enabled:false,model:null,status:'unavailable'})});return()=>{mounted=false}},[]);
  useEffect(()=>{let mounted=true;readThemePreference().then(value=>{if(mounted&&value)setTheme(value)});return()=>{mounted=false}},[]);
  useEffect(()=>{ apiFetch('/auth/me').then(async r=>{if(r.ok){const body=await r.json();const me=body.data as UserProfile;setProfile(me);setProfileName(me.display_name||'');const parsed=splitPhone(me.phone);setProfileCountry(parsed.country);setProfilePhone(parsed.number);setUser(me.display_name||me.email);loadHistory();apiFetch('/auth/me/privacy').then(async response=>{if(response.ok){const privacy=await response.json();setScanRetentionDays(privacy.data.scan_retention_days??null)}}).catch(()=>{});}}).catch(()=>{}); },[]);

  async function loadHistory(){
    try {const response=await apiFetch('/scans?limit=50');const body=await response.json();if(response.ok)setScans(body.data.items);} catch {setError('History load nahi hui. API connection check karein.');}
  }
  async function authenticate(){
    setBusy(true);setError('');
    try {if(authMode==='register'&&(password.length<10||password!==confirmPassword))throw new Error(password.length<10?'Password kam az kam 10 characters ka ho.':'Dono passwords match nahi karte.');const mobile=Platform.OS!=='web';const endpoint=mobile?(authMode==='register'?'/auth/mobile/register':'/auth/mobile/login'):(authMode==='register'?'/auth/register':'/auth/login');const data=authMode==='register'?{email,password,display_name:name,phone:phone?`${phoneCountry.dial}${phone}`:null}:{email,password};const response=await apiFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||body?.detail||'Sign in nahi ho saka.');if(mobile){if(!body.data.access_token||!body.data.refresh_token)throw new Error('Secure mobile session create nahi ho saka.');await saveMobileCredentials(body.data.access_token,body.data.refresh_token);}const me:UserProfile={email:body.data.user.email,display_name:body.data.user.display_name,phone:body.data.user.phone};const parsed=splitPhone(me.phone);setProfile(me);setProfileName(me.display_name);setProfileCountry(parsed.country);setProfilePhone(parsed.number);setUser(me.display_name||me.email);if(authMode==='register'&&profilePhoto){try{await uploadProfilePhoto(profilePhoto)}catch(reason){Alert.alert('Profile photo upload nahi hui',reason instanceof Error?reason.message:'Settings mein dobara koshish karein.')}}loadHistory();if(returnToShare==='1')router.replace('/handle-share');}
    catch(e){setError(e instanceof Error?e.message:'API connection nahi ho saka.')}finally{setBusy(false)}
  }
  async function chooseProfilePhoto(){const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.85});if(!picked.canceled&&picked.assets[0])setProfilePhoto(picked.assets[0]);}
  async function uploadProfilePhoto(asset:ImagePicker.ImagePickerAsset){if(asset.fileSize&&asset.fileSize>3*1024*1024)throw new Error('Profile photo 3 MB se chhoti honi chahiye.');const form=new FormData();form.append('file',{uri:asset.uri,name:asset.fileName??'profile.jpg',type:asset.mimeType??'image/jpeg'} as unknown as Blob);const response=await apiFetch('/auth/me/avatar',{method:'POST',body:form});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Profile photo upload nahi hui.');setProfile((old)=>old?{...old,avatar_url:'/auth/me/avatar'}:old);setAvatarVersion(Date.now());setProfilePhoto(null);}
  async function saveProfile(){setBusy(true);setError('');setNotice('');try{const response=await apiFetch('/auth/me',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:profileName,phone:profilePhone?`${profileCountry.dial}${profilePhone}`:null})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Profile save nahi hui.');setProfile(body.data);setUser(body.data.display_name);if(profilePhoto)await uploadProfilePhoto(profilePhoto);setNotice('Profile update ho gayi.');}catch(e){setError(e instanceof Error?e.message:'Profile update nahi hui.')}finally{setBusy(false)}}
  async function updatePassword(){setBusy(true);setError('');setNotice('');try{if(newPassword.length<10)throw new Error('Naya password kam az kam 10 characters ka ho.');if(newPassword!==confirmNewPassword)throw new Error('Naye passwords match nahi karte.');const response=await apiFetch('/auth/change-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Password update nahi hua.');setCurrentPassword('');setNewPassword('');setConfirmNewPassword('');setNotice('Password update ho gaya.');}catch(e){setError(e instanceof Error?e.message:'Password update nahi hua.')}finally{setBusy(false)}}
  async function saveRetention(){setBusy(true);setError('');setNotice('');try{const response=await apiFetch('/auth/me/privacy',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({scan_retention_days:scanRetentionDays})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Privacy settings save nahi huin.');setNotice(scanRetentionDays===null?'Scan reports ab manually delete karne tak rahengi.':`Scan reports ${scanRetentionDays} din baad automatically delete hongi.`)}catch(e){setError(e instanceof Error?e.message:'Privacy settings save nahi huin.')}finally{setBusy(false)}}
  function confirmDeleteAccount(){if(!deletePassword){setError('Account delete karne ke liye current password enter karein.');return;}Alert.alert('Permanently delete account?','Your profile, scans, reports, and active sessions will be deleted.',[{text:'Cancel',style:'cancel'},{text:'Delete account',style:'destructive',onPress:()=>void deleteAccount()}])}
  async function deleteAccount(){setBusy(true);setError('');try{const response=await apiFetch('/auth/me',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:deletePassword})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Account delete nahi hua.');await clearMobileCredentials();setDeletePassword('');setUser('');setProfile(null);setScans([]);setSelected(null);setDemo(false);setNotice('')}catch(e){setError(e instanceof Error?e.message:'Account delete nahi hua.')}finally{setBusy(false)}}
  async function analyze(){
    setBusy(true);setError('');
    try {
      let endpoint = `/analyze/${scanType}`; let options: RequestInit;
      if (scanType === 'url' || scanType === 'message') options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:input,fetch_page:scanType==='url'&&fetchUrlPage})};
      else if (scanType === 'store') options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:input,context:storeContext,fetch_page:fetchStorePage})};
      else if (scanType === 'claim') options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({claim:input,source_urls:claimSources.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,3)})};
      else if (scanType === 'product') options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:productUrl||undefined,description:input,price:price||undefined,reference_price:referencePrice||undefined,fetch_page:fetchProductPage})};
      else if (scanType === 'file') {
        if (!document) throw new Error('Pehle document select karein.');
        const form=new FormData(); form.append('file',{uri:document.uri,name:document.name,type:document.mimeType??'application/octet-stream'} as unknown as Blob); options={method:'POST',body:form};
      } else throw new Error('Screenshot, image aur QR ke liye upload ya camera action use karein.');
      const response=await apiFetch(endpoint,options);const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||body?.detail||'Analysis nahi ho saki.');const scan=body.data as Scan;setSelected(scan);setScans(old=>[scan,...old]);setInput('');
    }
    catch(e){setError(e instanceof Error?e.message:'API connection nahi ho saka.')}finally{setBusy(false)}
  }
  async function pickDocument(){
    const picked=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});
    if(!picked.canceled)setDocument(picked.assets[0]);
  }
  async function uploadImage(){
    if(demo){Alert.alert('Sample workspace','Live checks require an account.');return;}
    const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:1});
    if(picked.canceled||!picked.assets[0])return;
    const asset=picked.assets[0];const form=new FormData();form.append('file',{uri:asset.uri,name:asset.fileName??'prooflens-image.jpg',type:asset.mimeType??'image/jpeg'} as unknown as Blob);
    setBusy(true);setError('');
    try {const endpoint=scanType==='qr'?'/analyze/qr':scanType==='image'?'/analyze/image':'/analyze/screenshot';const response=await apiFetch(endpoint,{method:'POST',body:form});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Image check nahi ho saki.');setSelected(body.data);setScans(old=>[body.data,...old]);}
    catch(e){setError(e instanceof Error?e.message:'Image upload nahi ho saki.')}finally{setBusy(false)}
  }
  async function openQr(){
    if(demo){Alert.alert('Sample workspace','Live QR checks require an account.');return;}
    if(!cameraPermission?.granted){const permission=await requestCameraPermission();if(!permission.granted){Alert.alert('Camera permission needed','QR scan karne ke liye camera access allow karein.');return;}}
    setCameraOpen(true);
  }
  async function onQr(data:string){
    setCameraOpen(false);setScanType('url');setInput(data);
    if(/^https?:\/\//i.test(data)){setBusy(true);try{const response=await apiFetch('/analyze/url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:data})});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'QR destination analyze nahi hui.');setSelected(body.data);setScans(old=>[body.data,...old]);}catch(e){setError(e instanceof Error?e.message:'QR check fail hui.')}finally{setBusy(false)}}else Alert.alert('QR text decoded',data.slice(0,400));
  }
  async function shareReport(scan:Scan){
    if(scan.is_demo){Alert.alert('Demo sample','Sample reports share nahi kiye ja sakte.');return;}
    if(scan.is_shared){try{const response=await apiFetch(`/reports/${encodeURIComponent(scan.scan_id)}/share`,{method:'DELETE'});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Share link revoke nahi hua.');const update=(item:Scan)=>item.scan_id===scan.scan_id?{...item,is_shared:false}:item;setScans(old=>old.map(update));setSelected(old=>old?update(old):old);Alert.alert('Share link revoked','Purana link ab open nahi ho sakta.');}catch(e){Alert.alert('Link revoke nahi hua',e instanceof Error?e.message:'Try again.');}return;}
    Alert.alert('Create a public link?','The shared report shows the assessment and evidence, but not the submitted message, URL, or file. Anyone with the link can view it.',[{text:'Cancel',style:'cancel'},{text:'Create link',onPress:()=>void createReportShare(scan)}]);
  }
  async function createReportShare(scan:Scan){try{const response=await apiFetch(`/reports/${encodeURIComponent(scan.scan_id)}/share`,{method:'POST'});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Share link nahi bana.');const update=(item:Scan)=>item.scan_id===scan.scan_id?{...item,is_shared:true}:item;setScans(old=>old.map(update));setSelected(old=>old?update(old):old);await Share.share({message:`ProofLens report: ${body.data.url}`});}catch(e){Alert.alert('Share nahi ho saka',e instanceof Error?e.message:'Try again.');}}
  async function exportReportPdf(scan:Scan){
    if(scan.is_demo){Alert.alert('Sample report','PDF export is available for live reports only.');return;}
    try{await exportPdfReport(scan.scan_id);}catch(e){Alert.alert('PDF export nahi hui',e instanceof Error?e.message:'Try again.');}
  }
  async function toggleSaved(scan:Scan){try{const response=await apiFetch(`/scans/${encodeURIComponent(scan.scan_id)}/save`,{method:'POST'});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Report update nahi hui.');const update=(value:Scan)=>value.scan_id===scan.scan_id?{...value,is_saved:body.data.saved}:value;setScans(old=>old.map(update));setSelected(old=>old?update(old):old)}catch(e){Alert.alert('Report update nahi hui',e instanceof Error?e.message:'Dobara koshish karein.')}}
  function confirmDeleteScan(scan:Scan){Alert.alert('Delete this scan?','This permanently removes the report and its evidence.',[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>void deleteScan(scan)}])}
  async function deleteScan(scan:Scan){try{const response=await apiFetch(`/scans/${encodeURIComponent(scan.scan_id)}`,{method:'DELETE'});const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Scan delete nahi hui.');setScans(old=>old.filter(item=>item.scan_id!==scan.scan_id));if(selected?.scan_id===scan.scan_id)setSelected(null)}catch(e){Alert.alert('Delete nahi hua',e instanceof Error?e.message:'Dobara koshish karein.')}}
  async function signOut(){if(!demo){if(Platform.OS!=='web'){await apiFetch('/auth/me').catch(()=>{});const refreshToken=await getMobileRefreshToken();await apiFetch('/auth/mobile/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken})}).catch(()=>{});await clearMobileCredentials();}else await apiFetch('/auth/logout',{method:'POST'}).catch(()=>{});}setUser('');setProfile(null);setScans([]);setSelected(null);setDemo(false);}
  function startDemo(){setDemo(true);setUser('Sample workspace');setScans(DEMO_SCANS);setSelected(null);setTab('History');}

  const palette = getThemePalette(theme);
  if (!user) return <AuthScreen
    data={{mode:authMode,profilePhoto,name,phoneCountry,phone,email,password,confirmPassword,showPassword,showConfirmPassword,busy,error}}
    palette={palette}
    actions={{onChoosePhoto:chooseProfilePhoto,onNameChange:setName,onPhoneCountryChange:setPhoneCountry,onPhoneChange:setPhone,onEmailChange:setEmail,onPasswordChange:setPassword,onConfirmPasswordChange:setConfirmPassword,onTogglePassword:()=>setShowPassword(value=>!value),onToggleConfirmPassword:()=>setShowConfirmPassword(value=>!value),onSubmit:authenticate,onModeChange:setAuthMode,onStartDemo:startDemo}}
  />;

  return <View style={[styles.screen,{backgroundColor:palette.bg}]}><StatusBar style={theme==='Dark'||theme==='Gray'?'light':'dark'}/><View style={[styles.header,{backgroundColor:palette.surface,borderBottomColor:palette.border}]}><View><Text style={[styles.brand,{color:palette.text}]}>ProofLens <Text style={styles.ai}>AI</Text></Text><Text style={[styles.headerSub,{color:palette.text}]}>Local analysis · {user}</Text></View><View style={styles.headerActions}>{!demo&&<Pressable style={styles.headerProfile} onPress={()=>setTab('Settings')}>{profile?.avatar_url?<Image source={{uri:`${apiUrl('/auth/me/avatar')}?v=${avatarVersion}`}} style={styles.headerAvatar}/>:<View style={styles.headerAvatar}><Text style={styles.avatarInitial}>{(profile?.display_name||user).slice(0,1).toUpperCase()}</Text></View>}<Text style={[styles.linkText,{color:palette.accent}]}>{profile?.display_name||user}</Text></Pressable>}<Pressable onPress={signOut}><Text style={styles.linkText}>{demo?'Exit demo':'Sign out'}</Text></Pressable></View></View>
    {demo&&<View style={styles.demoBanner}><Text style={styles.demoTitle}>✦ LIMITED EDITION · SAMPLE ONLY</Text><Text style={styles.demoCopy}>All reports below are fictional examples and do not indicate real-world safety.</Text></View>}
    <View style={[styles.tabs,{backgroundColor:palette.surface,borderColor:palette.border}]}><Pressable style={[styles.tab,tab==='Overview'&&{borderBottomColor:palette.accent}]} onPress={()=>{setTab('Overview');setSelected(null)}}><Text style={[styles.tabText,tab==='Overview'&&{color:palette.accent,fontWeight:'700'}]}>Overview</Text></Pressable>{!demo&&<Pressable style={[styles.tab,tab==='Scan'&&{borderBottomColor:palette.accent}]} onPress={()=>{setTab('Scan');setSelected(null)}}><Text style={[styles.tabText,tab==='Scan'&&{color:palette.accent,fontWeight:'700'}]}>Check</Text></Pressable>}<Pressable style={[styles.tab,tab==='History'&&{borderBottomColor:palette.accent}]} onPress={()=>{setTab('History');setSelected(null);if(!demo)loadHistory()}}><Text style={[styles.tabText,tab==='History'&&{color:palette.accent,fontWeight:'700'}]}>{demo?'Samples':'History'}</Text></Pressable>{!demo&&<Pressable style={[styles.tab,tab==='Settings'&&{borderBottomColor:palette.accent}]} onPress={()=>{setTab('Settings');setSelected(null)}}><Text style={[styles.tabText,tab==='Settings'&&{color:palette.accent,fontWeight:'700'}]}>Settings</Text></Pressable>}</View>
    {cameraOpen?<View style={styles.camera}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{barcodeTypes:['qr']}} onBarcodeScanned={({data})=>onQr(data)}/><Pressable style={styles.cameraClose} onPress={()=>setCameraOpen(false)}><Text style={styles.primaryText}>Close camera</Text></Pressable></View>:<ScrollView style={{backgroundColor:palette.bg}} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {tab==='Overview'&&!selected&&<OverviewScreen demo={demo} scans={scans} palette={palette} aiStatus={aiStatus} onSelectScan={setSelected} onStartCheck={()=>setTab(demo?'History':'Scan')} />}
      {tab==='Scan'&&!selected&&<AnalyzerScreen
        data={{demo,scanType,input,productUrl,storeContext,claimSources,price,referencePrice,fetchUrlPage,fetchStorePage,fetchProductPage,fileName:document?.name??null,busy,error}}
        palette={palette}
        actions={{onModeChange:(mode)=>{setScanType(mode);setError('');setDocument(null)},onInputChange:setInput,onProductUrlChange:setProductUrl,onStoreContextChange:setStoreContext,onClaimSourcesChange:setClaimSources,onPriceChange:setPrice,onReferencePriceChange:setReferencePrice,onToggleFetchUrl:()=>setFetchUrlPage(value=>!value),onToggleFetchStore:()=>setFetchStorePage(value=>!value),onToggleFetchProduct:()=>setFetchProductPage(value=>!value),onChooseFile:pickDocument,onChooseImage:uploadImage,onOpenCamera:openQr,onAnalyze:()=>{if(['screenshot','image','qr'].includes(scanType))void uploadImage();else void analyze()}}}
      />}
      {tab==='Settings'&&!demo&&<SettingsScreen data={{name:profileName,email:profile?.email||'',profilePhoto,phoneCountry:profileCountry,phone:profilePhone,currentPassword,newPassword,confirmNewPassword,showCurrentPassword,showNewPassword,showConfirmNewPassword,theme,busy,error,notice,scanRetentionDays,deletePassword}} palette={palette} actions={{onChooseProfilePhoto:chooseProfilePhoto,onNameChange:setProfileName,onPhoneCountryChange:setProfileCountry,onPhoneChange:setProfilePhone,onSaveProfile:saveProfile,onCurrentPasswordChange:setCurrentPassword,onNewPasswordChange:setNewPassword,onConfirmPasswordChange:setConfirmNewPassword,onToggleCurrentPassword:()=>setShowCurrentPassword(value=>!value),onToggleNewPassword:()=>setShowNewPassword(value=>!value),onToggleConfirmPassword:()=>setShowConfirmNewPassword(value=>!value),onUpdatePassword:updatePassword,onThemeChange:(value)=>{setTheme(value);void writeThemePreference(value)},onRetentionChange:setScanRetentionDays,onSaveRetention:saveRetention,onDeletePasswordChange:setDeletePassword,onDeleteAccount:confirmDeleteAccount}} />}
      {tab==='History'&&!selected&&<HistoryScreen demo={demo} scans={scans} palette={palette} onSelectScan={setSelected} onToggleSaved={toggleSaved} onDelete={confirmDeleteScan} />}
      {selected&&<ScanReportScreen scan={selected} palette={palette} onBack={()=>setSelected(null)} onShare={shareReport} onExportPdf={exportReportPdf} onToggleSaved={toggleSaved} onDelete={confirmDeleteScan} />}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f9fa', paddingTop: Platform.OS === 'android' ? 32 : 52 },
  header: { backgroundColor: 'white', padding: 19, borderBottomWidth: 1, borderBottomColor: '#e8edef', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 20, fontWeight: '800', color: '#192b3d' },
  ai: { fontSize: 11, color: '#668492' },
  headerSub: { fontSize: 11, color: '#80909a', marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerProfile: { alignItems: 'center', gap: 3 },
  headerAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#e9f3f5', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 12, fontWeight: '700', color: '#286c8b' },
  linkText: { color: '#286c8b', fontSize: 12, fontWeight: '700' },
  demoBanner: { backgroundColor: '#fff6e4', borderColor: '#eed9a7', borderWidth: 1, borderRadius: 9, padding: 12, margin: 14, marginBottom: 4 },
  demoTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: '#8a6823' },
  demoCopy: { fontSize: 11, lineHeight: 16, color: '#73613b', marginTop: 4 },
  tabs: { flexDirection: 'row', backgroundColor: 'white', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: '#e8edef' },
  tab: { paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { color: '#85939b', fontSize: 12 },
  content: { padding: 20, paddingBottom: 45 },
  primaryText: { color: 'white', fontSize: 13, fontWeight: '700' },
  camera: { flex: 1, overflow: 'hidden' },
  cameraClose: { position: 'absolute', bottom: 32, alignSelf: 'center', backgroundColor: '#192b3d', paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 },
});
