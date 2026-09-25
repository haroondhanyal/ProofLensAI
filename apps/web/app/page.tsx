'use client';

import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { apiFetch } from './api';
import { ShieldCheck, Link2, MessageSquareText, Image as ImageIcon, QrCode, FileSearch, History, LayoutDashboard, Settings, ChevronRight, ArrowUpRight, LoaderCircle, AlertTriangle, CheckCircle2, LockKeyhole, ScanLine, Eye, EyeOff, Camera, UserRound } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const NAV_ITEMS = [{label:'Overview',Icon:LayoutDashboard},{label:'Analyze',Icon:ScanLine},{label:'History',Icon:History}];
const QUICK_CHECKS = [{Icon:ImageIcon,label:'Screenshot',description:'Local text extraction',mode:'screenshot' as const},{Icon:QrCode,label:'QR code',description:'Decode before opening',mode:'qr' as const},{Icon:FileSearch,label:'Image details',description:'Metadata and text',mode:'image' as const}];

type Evidence = { title: string; description: string; severity: string; source: string };
type UserProfile = { id?: string; email: string; display_name: string; phone?: string | null; avatar_url?: string | null };
type ThemeName = 'light' | 'dark' | 'slate' | 'ocean' | 'contrast';
type PhoneCountry = { name: string; dial: string; flag: string };
type ExtensionRequest = { kind: 'url' | 'text'; value: string };
type LocalAiStatus = { configured: boolean; model: string | null; unavailable?: boolean };
const PHONE_COUNTRIES: PhoneCountry[] = [
  {name:'Pakistan',dial:'+92',flag:'🇵🇰'},{name:'United States',dial:'+1',flag:'🇺🇸'},{name:'Canada',dial:'+1',flag:'🇨🇦'},
  {name:'United Kingdom',dial:'+44',flag:'🇬🇧'},{name:'India',dial:'+91',flag:'🇮🇳'},{name:'United Arab Emirates',dial:'+971',flag:'🇦🇪'},
  {name:'Saudi Arabia',dial:'+966',flag:'🇸🇦'},{name:'Australia',dial:'+61',flag:'🇦🇺'},{name:'New Zealand',dial:'+64',flag:'🇳🇿'},
  {name:'Bangladesh',dial:'+880',flag:'🇧🇩'},{name:'Turkey',dial:'+90',flag:'🇹🇷'},{name:'Germany',dial:'+49',flag:'🇩🇪'},
  {name:'France',dial:'+33',flag:'🇫🇷'},{name:'Italy',dial:'+39',flag:'🇮🇹'},{name:'Spain',dial:'+34',flag:'🇪🇸'},
  {name:'Netherlands',dial:'+31',flag:'🇳🇱'},{name:'Qatar',dial:'+974',flag:'🇶🇦'},{name:'Kuwait',dial:'+965',flag:'🇰🇼'},
  {name:'Oman',dial:'+968',flag:'🇴🇲'},{name:'South Africa',dial:'+27',flag:'🇿🇦'},{name:'Nigeria',dial:'+234',flag:'🇳🇬'},
  {name:'China',dial:'+86',flag:'🇨🇳'},{name:'Japan',dial:'+81',flag:'🇯🇵'},{name:'Singapore',dial:'+65',flag:'🇸🇬'}
];
const AUTH_SLIDES = [
  {title:'Check before you trust.',body:'Inspect links, messages, QR codes and files with clear evidence before taking action.',tag:'SAFER EVERYDAY DECISIONS'},
  {title:'Know what was checked.',body:'ProofLens explains local findings and shows which optional providers were available.',tag:'EVIDENCE FIRST'},
  {title:'Your scans stay yours.',body:'Sign in to keep a private history and review your digital safety checks.',tag:'PRIVATE WORKSPACE'}
];
type Result = { scan_id: string; scan_type: string; risk_score: number; risk_level: string; confidence: string; summary: string; evidence: Evidence[]; recommendations: string[]; status: string; is_demo?: boolean; analysis_meta?: {local_ai?:{status?:string;model?:string;insight?:string};image_metadata?:Record<string,string>;c2pa_status?:string;page_fetch?:{status?:string;final_url?:string;http_status?:number;redirect_count?:number;tls_valid?:boolean;forms?:{method?:string;fields?:string[]}[]};local_signatures?:{status?:string;matches?:string[]};claim_sources?:{publisher:string;url:string;title:string;review_date:string;rating:string}[];extracted_text?: string; detected_urls?: string[]; qr_destination?: string | null; ocr_available?: boolean; sha256?: string; threat_feeds?:Record<string,string>; media_provider?: {status?:string; ai_generated?:{label?:string;confidence?:number}|null; deepfake?:{label?:string;confidence?:number}|null; provenance?:{status?:string}|null}; yara?:{status?:string;matches?:string[]}; antivirus?:{status?:string;scanner?:string;signature?:string}; embedded_urls?:string[]} };
type ScanRow = Result & { created_at: string; is_saved?: boolean; is_demo?: boolean };

const DEMO_SCANS: ScanRow[] = [
  {scan_id:'DEMO-URL-SAFE',scan_type:'URL',risk_score:0,risk_level:'LOW',confidence:'LOW',summary:'SAMPLE ONLY — reserved example.com address shown to demonstrate the report layout. It was not checked by ProofLens.',evidence:[{title:'Reserved example domain',description:'example.com is reserved for documentation and samples. This is not a live safety finding.',severity:'INFO',source:'Synthetic demo'}],recommendations:['This synthetic example is not a live verdict.'],status:'DEMO',created_at:'2026-09-24T12:00:00Z',is_demo:true},
  {scan_id:'DEMO-URL-FICTIONAL',scan_type:'URL',risk_score:62,risk_level:'CAUTION',confidence:'MEDIUM',summary:'SAMPLE ONLY — fictional suspicious-address example for demonstrating how evidence appears.',evidence:[{title:'Fictional look-alike wording',description:'Made-up address contains account and verification terms.',severity:'MEDIUM',source:'Synthetic demo'},{title:'No reputation provider checked',description:'Sample does not query any security provider.',severity:'INFO',source:'Synthetic demo'}],recommendations:['Do not use a demo report to judge a real address.'],status:'DEMO',created_at:'2026-09-24T11:00:00Z',is_demo:true},
  {scan_id:'DEMO-MESSAGE',scan_type:'MESSAGE',risk_score:70,risk_level:'HIGH',confidence:'MEDIUM',summary:'SAMPLE ONLY — fictional scam-message sample for previewing a report.',evidence:[{title:'Urgency in fictional text',description:'Made-up sample uses deadline language.',severity:'MEDIUM',source:'Synthetic demo'}],recommendations:['This is simulated content, not a live scan.'],status:'DEMO',created_at:'2026-09-24T10:00:00Z',is_demo:true},
  {scan_id:'DEMO-QR-SAFE',scan_type:'QR',risk_score:0,risk_level:'LOW',confidence:'LOW',summary:'SAMPLE ONLY — safe QR example points to reserved example.com and was not scanned.',evidence:[{title:'Reserved example destination',description:'Illustration of the benign QR report state only.',severity:'INFO',source:'Synthetic demo'}],recommendations:['Use the live scanner to inspect a real QR code.'],status:'DEMO',created_at:'2026-09-24T09:00:00Z',is_demo:true},
];

function parsePhone(value: string): { country: PhoneCountry; number: string } {
  const normalized = value.replace(/\D/g, '');
  const country = [...PHONE_COUNTRIES].sort((a,b)=>b.dial.length-a.dial.length).find(item=>normalized.startsWith(item.dial.slice(1))) ?? PHONE_COUNTRIES[0];
  const national = normalized.startsWith(country.dial.slice(1)) ? normalized.slice(country.dial.length-1) : normalized;
  return {country,number:national.slice(0,15)};
}

export default function Home() {
  const [mode, setMode] = useState<'url' | 'message' | 'screenshot' | 'image' | 'qr' | 'file' | 'store' | 'product' | 'claim'>('url');
  const [upload, setUpload] = useState<File | null>(null);
  const [productUrl, setProductUrl] = useState('');
  const [storeContext, setStoreContext] = useState('');
  const [claimSources, setClaimSources] = useState('');
  const [fetchStorePage, setFetchStorePage] = useState(false);
  const [fetchProductPage, setFetchProductPage] = useState(false);
  const [fetchUrlPage, setFetchUrlPage] = useState(false);
  const [price, setPrice] = useState('');
  const [referencePrice, setReferencePrice] = useState('');
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [page, setPage] = useState('Overview');
  const [token, setToken] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCountry, setAuthCountry] = useState<PhoneCountry>(PHONE_COUNTRIES[0]);
  const [authConfirm, setAuthConfirm] = useState('');
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [showAuthConfirm, setShowAuthConfirm] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileCountry, setProfileCountry] = useState<PhoneCountry>(PHONE_COUNTRIES[0]);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState('');
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [profileNotice, setProfileNotice] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [theme, setTheme] = useState<ThemeName>('light');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [shareUrl, setShareUrl] = useState('');
  const [actionError, setActionError] = useState('');
  const [forgotMode, setForgotMode] = useState(false);
  const [resetNotice, setResetNotice] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  const [scanTypeFilter, setScanTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [authSlide, setAuthSlide] = useState(0);
  const [extensionRequest, setExtensionRequest] = useState<ExtensionRequest | null>(null);
  const [localAiStatus, setLocalAiStatus] = useState<LocalAiStatus | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${API.replace(/\/api\/v1\/?$/, '')}/health`).then(async response => {
      if (!response.ok) throw new Error('AI status unavailable');
      const body = await response.json();
      if (active) setLocalAiStatus({configured:body.data?.analysis_mode==='local-model-assisted',model:body.data?.local_ai_model??null});
    }).catch(() => { if (active) setLocalAiStatus({configured:false,model:null,unavailable:true}); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const prefix = '#prooflens=';
    if (!window.location.hash.startsWith(prefix)) return;
    const encoded = window.location.hash.slice(prefix.length);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    const timer = window.setTimeout(() => {
      try {
        const request = JSON.parse(decodeURIComponent(encoded)) as Partial<ExtensionRequest>;
        if ((request.kind === 'url' || request.kind === 'text') && typeof request.value === 'string' && request.value.length <= 12000) {
          setExtensionRequest({ kind: request.kind, value: request.value });
        }
      } catch {
        setError('The browser check could not be opened. Please try again from the extension.');
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!extensionRequest || token !== 'active' || demoMode) return;
    const timer = window.setTimeout(() => {
      setMode(extensionRequest.kind === 'url' ? 'url' : 'message');
      setInput(extensionRequest.value);
      setResult(null);
      setError('');
      setPage('Analyze');
      setExtensionRequest(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [extensionRequest, token, demoMode]);

  useEffect(() => {
    apiFetch(`${API}/auth/me`, {credentials:'include'}).then(async response=>{if(!response.ok)return;const meBody=await response.json();setProfile(meBody.data);setProfileName(meBody.data.display_name||'');const parsedPhone=parsePhone(meBody.data.phone||'');setProfileCountry(parsedPhone.country);setProfilePhone(parsedPhone.number);setToken('active');const scansResponse=await apiFetch(`${API}/scans?limit=50`,{credentials:'include'});const body=await scansResponse.json();if(body.success)setScans(body.data.items)}).catch(()=>{});
  }, [token, demoMode]);

  useEffect(() => {
    const saved = localStorage.getItem('prooflens-theme') as ThemeName | null;
    if (saved && ['light','dark','slate','ocean','contrast'].includes(saved)) {
      const frame = window.requestAnimationFrame(() => setTheme(saved));
      return () => window.cancelAnimationFrame(frame);
    }
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('prooflens-theme', theme); }, [theme]);
  useEffect(() => () => { if (profilePhotoPreview) URL.revokeObjectURL(profilePhotoPreview); }, [profilePhotoPreview]);

  function openDemo() { setProfile(null); setDemoMode(true); setScans(DEMO_SCANS); setResult(DEMO_SCANS[1]); setToken('demo'); setPage('Overview'); }

  async function authenticate() {
    setAuthError(''); setAuthBusy(true);
    try {
      if (authMode === 'register' && (authPassword.length < 10 || authPassword !== authConfirm)) throw new Error(authPassword.length < 10 ? 'Password kam az kam 10 characters ka ho.' : 'Dono passwords match nahi karte.');
      const path = authMode === 'register' ? 'register' : 'login';
      const response = await apiFetch(`${API}/auth/${path}`, {method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify(authMode === 'register' ? {email:authEmail,password:authPassword,display_name:displayName,phone:authPhone?`${authCountry.dial}${authPhone}`:null} : {email:authEmail,password:authPassword})});
      const body = await response.json();
      if (!response.ok) throw new Error(body?.detail || body?.error?.message || 'Account access nahi ho saka.');
      setToken('active');
      if (authMode === 'register' && profilePhoto) {
        try { await uploadAvatar(profilePhoto); }
        catch (error) { setActionError(error instanceof Error?error.message:'Profile photo upload nahi hui.'); setPage('Settings'); }
      }
    } catch (e) { setAuthError(e instanceof Error ? e.message : 'Backend se rabta nahi ho saka.'); }
    finally { setAuthBusy(false); }
  }

  async function uploadAvatar(file: File) {
    const form = new FormData(); form.append('file', file);
    const response = await apiFetch(`${API}/auth/me/avatar`, {method:'POST',credentials:'include',body:form});
    const body = await response.json();
    if (!response.ok) throw new Error(body?.error?.message || 'Profile photo upload nahi hui.');
    setAvatarVersion(Date.now()); setProfile(previous=>previous?{...previous,avatar_url:'/api/v1/auth/me/avatar'}:previous); setProfilePhoto(null); setProfilePhotoPreview('');
  }

  function chooseProfilePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024) { setAuthError('Profile photo JPEG, PNG ya WEBP ho aur 3 MB se chhoti ho.'); setActionError('Profile photo JPEG, PNG ya WEBP ho aur 3 MB se chhoti ho.'); return; }
    setAuthError(''); setActionError(''); setProfilePhoto(file); setProfilePhotoPreview(URL.createObjectURL(file));
  }

  async function saveProfile() {
    setProfileBusy(true); setProfileNotice(''); setActionError('');
    try {
      const response = await apiFetch(`${API}/auth/me`, {method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({display_name:profileName,phone:profilePhone?`${profileCountry.dial}${profilePhone}`:null})});
      const body = await response.json(); if(!response.ok) throw new Error(body?.error?.message||'Profile save nahi hua.');
      setProfile(body.data);
      if(profilePhoto) await uploadAvatar(profilePhoto);
      setProfileNotice('Profile update ho gayi.');
    } catch(e) { setActionError(e instanceof Error?e.message:'Profile update nahi hui.'); }
    finally { setProfileBusy(false); }
  }

  async function changePassword() {
    setActionError(''); setProfileNotice('');
    if(newPassword.length<10){setActionError('Naya password kam az kam 10 characters ka ho.');return;}
    if(newPassword!==confirmNewPassword){setActionError('Naye passwords match nahi karte.');return;}
    setProfileBusy(true);
    try {
      const response=await apiFetch(`${API}/auth/change-password`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({current_password:currentPassword,new_password:newPassword})});
      const body=await response.json();if(!response.ok)throw new Error(body?.error?.message||'Password update nahi hua.');
      setCurrentPassword('');setNewPassword('');setConfirmNewPassword('');setProfileNotice('Password update ho gaya. Baqi signed-in sessions sign out kar diye hain.');
    } catch(e){setActionError(e instanceof Error?e.message:'Password update nahi hua.');}
    finally{setProfileBusy(false);}
  }

  useEffect(() => {
    if (!token || page !== 'History') return;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({limit:'50'});
      if (scanTypeFilter) params.set('scan_type', scanTypeFilter);
      if (riskFilter) params.set('risk_level', riskFilter);
      if (savedOnly) params.set('saved_only', 'true');
      if (historyQuery.trim()) params.set('query', historyQuery.trim());
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      try { const response=await apiFetch(`${API}/scans?${params}`,{credentials:'include'}); const body=await response.json(); if(body.success)setScans(body.data.items); } catch { /* Preserve the last successful result. */ }
    }, 250);
    return () => clearTimeout(timer);
  }, [token,page,scanTypeFilter,riskFilter,savedOnly,historyQuery,dateFrom,dateTo]);

  async function requestPasswordReset() {
    setAuthError(''); setResetNotice(''); setDevelopmentResetUrl(''); setAuthBusy(true);
    try { const response=await apiFetch(`${API}/auth/forgot-password`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:authEmail})}); const body=await response.json(); if(!response.ok)throw new Error(body?.error?.message||'Request could not be completed.'); setResetNotice(body.data.message); if(body.data.development_reset_token)setDevelopmentResetUrl(`${window.location.origin}/reset-password?token=${encodeURIComponent(body.data.development_reset_token)}`); }
    catch(e){setAuthError(e instanceof Error?e.message:'Backend se rabta nahi ho saka.')} finally {setAuthBusy(false)}
  }

  async function removeAccount() {
    setActionError('');
    try { const response=await apiFetch(`${API}/auth/me`,{method:'DELETE',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:accountPassword})}); const body=await response.json(); if(!response.ok)throw new Error(body?.error?.message||'Account could not be deleted.'); setToken(''); setScans([]); }
    catch(e){setActionError(e instanceof Error?e.message:'Account could not be deleted.')}
  }

  async function analyze() {
    setError(''); setResult(null);
    if (demoMode) { setError('Demo reports are read-only. Sign in to run a live check.'); return; }
    if (['url','message','store','claim'].includes(mode) && !input.trim()) { setError('Pehle link, claim ya message paste karein.'); return; }
    if (mode === 'product' && !input.trim() && !productUrl.trim()) { setError('Product description ya URL add karein.'); return; }
    if (['screenshot','image','qr','file'].includes(mode) && !upload) { setError('Pehle file select karein.'); return; }
    setBusy(true);
    try {
      const headers: Record<string,string> = {};
      let requestBody: BodyInit;
      let endpoint = mode;
      if (mode === 'url' || mode === 'message') { headers['Content-Type']='application/json'; requestBody=JSON.stringify({content:input,fetch_page:mode==='url'&&fetchUrlPage}); }
      else if (mode === 'store') { headers['Content-Type']='application/json'; requestBody=JSON.stringify({url:input,context:storeContext,fetch_page:fetchStorePage}); }
      else if (mode === 'claim') { headers['Content-Type']='application/json'; requestBody=JSON.stringify({claim:input,source_urls:claimSources.split(/\r?\n/).map(value=>value.trim()).filter(Boolean).slice(0,3)}); }
      else if (mode === 'product') { headers['Content-Type']='application/json'; requestBody=JSON.stringify({url:productUrl||undefined,description:input,price:price?Number(price):undefined,reference_price:referencePrice?Number(referencePrice):undefined,fetch_page:fetchProductPage}); }
      else { const form = new FormData(); form.append('file', upload as File); requestBody=form; endpoint = mode === 'file' ? 'file' : mode; }
      const response = await apiFetch(`${API}/analyze/${endpoint}`, { method: 'POST', credentials:'include', headers, body:requestBody });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message || body?.detail || 'Analysis nahi ho saki.');
      setResult(body.data);
      setScans(prev=>[{...body.data,created_at:body.data.created_at??new Date().toISOString()},...prev.filter(scan=>scan.scan_id!==body.data.scan_id)]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Backend se rabta nahi ho saka.'); }
    finally { setBusy(false); }
  }

  async function scanAction(action: 'save'|'delete'|'share'|'revoke', scanId: string) {
    setActionError('');
    if (demoMode) { setActionError('Sample reports are read-only; no real scan was changed.'); return; }
    try {
      const method = action==='delete'||action==='revoke'?'DELETE':'POST';
      const path = action==='share'||action==='revoke'?`/reports/${scanId}/share`:`/scans/${scanId}/${action==='save'?'save':''}`.replace(/\/$/,'');
      const response = await apiFetch(`${API}${path}`,{method,credentials:'include'});
      const body = await response.json();
      if(!response.ok)throw new Error(body?.error?.message||body?.detail||'Action could not be completed.');
      if(action==='delete'){setScans(prev=>prev.filter(scan=>scan.scan_id!==scanId));if(result?.scan_id===scanId)setResult(null)}
      if(action==='save')setScans(prev=>prev.map(scan=>scan.scan_id===scanId?{...scan,is_saved:body.data.saved} as ScanRow:scan));
      if(action==='share')setShareUrl(body.data.url);
      if(action==='revoke')setShareUrl('');
    }catch(e){setActionError(e instanceof Error?e.message:'Action could not be completed.')}
  }

  const riskClass = result?.risk_level === 'LOW' ? 'low' : result?.risk_level === 'CAUTION' ? 'caution' : 'high';
  const feedSeen = scans.some(scan => Object.values(scan.analysis_meta?.threat_feeds ?? {}).some(status => status && status !== 'not_configured'));
  const avatarSource = profilePhotoPreview || (profile?.avatar_url ? `${API}/auth/me/avatar?v=${avatarVersion}` : '');
  const profileInitial = (profile?.display_name || profile?.email || displayName || 'P').trim().slice(0,1).toUpperCase();
  if (!token) return <main className="auth-screen"><div className="auth-layout">
    <aside className="auth-story" aria-label="About ProofLens AI">
      <div className="auth-story-top"><div className="brand auth-brand"><span className="brand-icon"><ShieldCheck size={21}/></span><span>ProofLens<span className="brand-ai">AI</span></span></div><span className="story-pill"><span/> PRIVATE SAFETY WORKSPACE</span></div>
      <div className="auth-orbit orbit-one"/><div className="auth-orbit orbit-two"/>
      <div className="story-console"><div className="console-top"><span/><span/><span/><small>PROOFLENS CHECK</small></div><div className="console-shield"><ShieldCheck size={25}/></div><b>Pause. Check. Then trust.</b><small>Evidence to help you make a safer choice.</small><div className="console-types"><span>↗ URL</span><span>▤ MESSAGE</span><span>▦ QR</span><span>◇ FILE</span></div></div>
      <div className="auth-story-copy" key={authSlide}><span className="eyebrow">{AUTH_SLIDES[authSlide].tag}</span><h2>{AUTH_SLIDES[authSlide].title}</h2><p>{AUTH_SLIDES[authSlide].body}</p></div>
      <div className="story-controls"><button type="button" aria-label="Previous feature" onClick={()=>setAuthSlide((authSlide+AUTH_SLIDES.length-1)%AUTH_SLIDES.length)}>←</button><div>{AUTH_SLIDES.map((slide,index)=><button type="button" key={slide.tag} className={index===authSlide?'active':''} aria-label={`Show feature ${index+1}`} onClick={()=>setAuthSlide(index)}/>)}</div><button type="button" aria-label="Next feature" onClick={()=>setAuthSlide((authSlide+1)%AUTH_SLIDES.length)}>→</button></div>
      <div className="auth-story-footer"><span>LOCAL-FIRST CHECKS</span><span>BUILT FOR CLARITY</span></div>
    </aside>
    <section className="auth-card"><div className="auth-mobile-brand"><span className="brand-icon"><ShieldCheck size={20}/></span><span>ProofLens<span className="brand-ai">AI</span></span></div><div className="eyebrow">{forgotMode?'ACCOUNT RECOVERY':authMode==='register'?'GET STARTED':'WELCOME BACK'}</div><h1>{forgotMode?'Reset your password':authMode==='register'?'Create your workspace':'Welcome back'}</h1><p className="auth-intro">{forgotMode?'Enter your account email to get a secure one-time reset link.':authMode==='register'?'Create an account for private scans and a personal safety history.':'Sign in to access your private checks and scan history.'}</p>
      {extensionRequest&&<div className="success-box" role="status">Browser check ready. Sign in to review it in ProofLens.</div>}
      <form onSubmit={event=>{event.preventDefault();void(forgotMode?requestPasswordReset():authenticate())}}>
        {!forgotMode&&authMode==='register'&&<div className="signup-photo-row"><div className="signup-avatar">{profilePhotoPreview?<img src={profilePhotoPreview} alt="Profile preview"/>:<UserRound size={24}/>}</div><label className="photo-picker"><Camera size={15}/>{profilePhoto?'Change photo':'Add profile photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseProfilePhoto}/></label><small>Optional · JPEG, PNG or WEBP · up to 3 MB</small></div>}
        {!forgotMode&&authMode==='register'&&<label>Full name<input type="text" required maxLength={120} value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name" autoComplete="name"/></label>}
        {!forgotMode&&authMode==='register'&&<label>Phone number <span className="optional-label">Optional</span><div className="phone-control"><select aria-label="Country calling code" value={authCountry.name} onChange={e=>setAuthCountry(PHONE_COUNTRIES.find(country=>country.name===e.target.value)||PHONE_COUNTRIES[0])}>{PHONE_COUNTRIES.map(country=><option key={`${country.name}-${country.dial}`} value={country.name}>{country.flag} {country.dial} · {country.name}</option>)}</select><input type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={15} value={authPhone} onChange={e=>setAuthPhone(e.target.value.replace(/\D/g,'').slice(0,15))} placeholder="300 1234567" autoComplete="tel-national"/></div></label>}
        <label>Email address<input type="email" required value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/></label>
        {!forgotMode&&<><label>Password<div className="password-field"><input type={showAuthPassword?'text':'password'} required minLength={authMode==='register'?10:1} maxLength={128} value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder={authMode==='register'?'At least 10 characters':'Your password'} autoComplete={authMode==='register'?'new-password':'current-password'}/><button type="button" onClick={()=>setShowAuthPassword(!showAuthPassword)} aria-label={showAuthPassword?'Hide password':'Show password'}>{showAuthPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
        {authMode==='register'&&<label>Confirm password<div className="password-field"><input type={showAuthConfirm?'text':'password'} required minLength={10} maxLength={128} value={authConfirm} onChange={e=>setAuthConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password"/><button type="button" onClick={()=>setShowAuthConfirm(!showAuthConfirm)} aria-label={showAuthConfirm?'Hide confirmation':'Show confirmation'}>{showAuthConfirm?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>}</>}
        {authError&&<div className="error-box" role="alert"><AlertTriangle size={16}/>{authError}</div>}{resetNotice&&<div className="success-box" role="status">{resetNotice}{developmentResetUrl&&<a className="dev-reset-link" href={developmentResetUrl}>Open local password reset</a>}</div>}
        <button className="auth-submit" type="submit" disabled={authBusy}>{authBusy?'Please wait…':forgotMode?'Send reset link':authMode==='register'?'Create account':'Sign in'}</button>
      </form>
      {!forgotMode&&authMode==='login'&&<div className="auth-switch"><button onClick={()=>{setForgotMode(true);setAuthError('');setResetNotice('')}}>Forgot password?</button></div>}
      <div className="auth-switch">{forgotMode?'Remembered it?':authMode==='register'?'Already have an account?':'New to ProofLens?'} <button onClick={()=>{if(forgotMode)setForgotMode(false);else setAuthMode(authMode==='register'?'login':'register');setAuthError('');setResetNotice('')}}>{forgotMode?'Sign in':authMode==='register'?'Sign in':'Create account'}</button></div>
      {!forgotMode&&<><button className="demo-entry" onClick={openDemo}>Explore sample workspace <span className="limited-edition-pill">LIMITED EDITION</span><ArrowUpRight size={14}/></button><div className="demo-disclaimer">Demo reports are synthetic examples. They are not live security findings.</div></>}
      <div className="auth-privacy"><LockKeyhole size={14}/> Passwords are hashed. Session cookies are HttpOnly; scans stay in your local ProofLens database.</div>
    </section>
  </div></main>;
  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-icon"><ShieldCheck size={21}/></span><span>ProofLens<span className="brand-ai">AI</span></span></div>
      <div className="workspace-label">WORKSPACE</div>
      <nav aria-label="Main navigation">
        {NAV_ITEMS.filter(({label})=>!demoMode||label!=='Analyze').map(({label,Icon}) => <button key={label} className={`nav-item ${page===label?'selected':''}`} onClick={()=>setPage(label)}><Icon size={17}/>{label}</button>)}
      </nav>
      <div className="side-bottom"><div className="privacy-card"><LockKeyhole size={17}/><div><b>Private by design</b><small>Your checks stay yours.</small></div></div>{!demoMode&&<button className={`nav-item ${page==='Settings'?'selected':''}`} onClick={()=>setPage('Settings')}><Settings size={17}/>Settings</button>}<button className="profile profile-button" onClick={async()=>{if(!demoMode)await apiFetch(`${API}/auth/logout`,{method:'POST',credentials:'include'}).catch(()=>{});setDemoMode(false);setProfile(null);setToken('');setScans([]);setResult(null);}} title="Sign out"><div className="avatar">{avatarSource?<img src={avatarSource} alt=""/>:profileInitial}</div><div><b>{demoMode?'Sample workspace':profile?.display_name||profile?.email||'Account'}</b><small>{demoMode?'Exit sample':'Sign out'}</small></div><ChevronRight size={15}/></button></div>
    </aside>
    <section className="main-area">
      <header className="topbar"><div className="crumb">Workspace <ChevronRight size={14}/> <b>{page}</b></div><div className="top-right"><div className="header-account"><span className="secure"><span/> Local analysis</span><div className="header-profile"><div className="avatar small">{avatarSource?<img src={avatarSource} alt=""/>:profileInitial}</div><div><b>{demoMode?'Sample workspace':profile?.display_name||profile?.email||'Account'}</b><small>{profile?.email||'Demo mode'}</small></div></div></div></div></header>
      <div className="content">
        {demoMode&&<div className="demo-banner"><b><span className="limited-edition-pill">LIMITED EDITION</span> SAMPLE-ONLY PREVIEW</b><span>Browse fictional ProofLens reports. No live scans or account data appear in this workspace.</span></div>}
        {extensionRequest&&token==='active'&&!demoMode&&<div className="success-box" role="status">Browser check ready. Review the content and choose Analyze safely to create its report.</div>}
        {demoMode?<section className="sample-workspace"><div className="sample-workspace-heading"><div><div className="eyebrow">PROOFLENS AI · DEMO EDITION</div><h1>Explore the sample workspace</h1><p>See how example checks and evidence are presented. Everything below is fictional.</p></div><span className="limited-edition-pill">✦ LIMITED EDITION</span></div><div className="sample-note"><ShieldCheck size={17}/><span>Sample reports only <small>No real account data, live analysis, or external provider checks.</small></span></div><h2>Pick a sample report</h2><div className="sample-report-grid">{DEMO_SCANS.map(scan=><button key={scan.scan_id} className={`sample-report-card ${scan.risk_level.toLowerCase()} ${result?.scan_id===scan.scan_id?'selected':''}`} onClick={()=>setResult(scan)}><span className="sample-report-type">{scan.scan_type} · EXAMPLE</span><b>{scan.risk_level==='LOW'?'Low risk example':scan.risk_level==='CAUTION'?'Caution example':'High risk example'}</b><small>{scan.summary.replace('SAMPLE ONLY — ','').slice(0,112)}…</small><span className="sample-report-score">{scan.risk_score}/100 <ChevronRight size={14}/></span></button>)}</div>{result?.is_demo&&<article className="sample-report-detail"><div className="eyebrow">SAMPLE REPORT · NOT A LIVE CHECK</div><h2>{result.scan_type} example · {result.risk_level} risk</h2><p>{result.summary}</p><h3>Example evidence</h3>{result.evidence.map((item,index)=><div className="sample-evidence" key={`${result.scan_id}-${index}`}><b>{item.title}</b><p>{item.description}</p></div>)}<h3>Recommended next step</h3>{result.recommendations.map((item,index)=><p key={index}>{item}</p>)}</article>}</section>:page==='Settings'?<section className="settings-page"><div className="eyebrow">ACCOUNT & PREFERENCES</div><h1>Settings</h1><p className="settings-intro">Manage your profile, password, appearance and account security.</p><div className="settings-grid"><section className="settings-card"><div className="eyebrow">PROFILE</div><h2>Your details</h2><div className="profile-edit-photo"><div className="profile-large-avatar">{profilePhotoPreview?<img src={profilePhotoPreview} alt="Selected profile photo"/>:avatarSource?<img src={avatarSource} alt="Your profile"/>:<span>{profileInitial}</span>}</div><label className="photo-picker"><Camera size={15}/>Change photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseProfilePhoto}/></label><small>JPEG, PNG or WEBP · maximum 3 MB</small></div><label>Full name<input value={profileName} maxLength={120} onChange={e=>setProfileName(e.target.value)} autoComplete="name"/></label><label>Email address<input value={profile?.email||''} disabled readOnly/></label><label>Phone number <span className="optional-label">Optional</span><div className="phone-control"><select aria-label="Country calling code" value={profileCountry.name} onChange={e=>setProfileCountry(PHONE_COUNTRIES.find(country=>country.name===e.target.value)||PHONE_COUNTRIES[0])}>{PHONE_COUNTRIES.map(country=><option key={`${country.name}-${country.dial}`} value={country.name}>{country.flag} {country.dial} · {country.name}</option>)}</select><input type="tel" inputMode="numeric" pattern="[0-9]*" maxLength={15} value={profilePhone} onChange={e=>setProfilePhone(e.target.value.replace(/\D/g,'').slice(0,15))} placeholder="300 1234567" autoComplete="tel-national"/></div></label><button className="auth-submit settings-submit" onClick={saveProfile} disabled={profileBusy}>{profileBusy?'Saving…':'Save profile'}</button>{actionError&&<div className="error-box" role="alert">{actionError}</div>}{profileNotice&&<div className="success-box" role="status">{profileNotice}</div>}</section><section className="settings-card"><div className="eyebrow">SECURITY</div><h2>Change password</h2><p className="auth-intro">Use at least 10 characters. Other signed-in sessions will be revoked.</p><label>Current password<input type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} autoComplete="current-password"/></label><label>New password<div className="password-field"><input type={showNewPassword?'text':'password'} minLength={10} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} autoComplete="new-password"/><button type="button" aria-label={showNewPassword?'Hide password':'Show password'} onClick={()=>setShowNewPassword(!showNewPassword)}>{showNewPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label><label>Confirm new password<div className="password-field"><input type={showConfirmNewPassword?'text':'password'} minLength={10} maxLength={128} value={confirmNewPassword} onChange={e=>setConfirmNewPassword(e.target.value)} autoComplete="new-password"/><button type="button" aria-label={showConfirmNewPassword?'Hide confirmation':'Show confirmation'} onClick={()=>setShowConfirmNewPassword(!showConfirmNewPassword)}>{showConfirmNewPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label><button className="auth-submit settings-submit" onClick={changePassword} disabled={profileBusy}>{profileBusy?'Updating…':'Update password'}</button>{actionError&&<div className="error-box" role="alert">{actionError}</div>}{profileNotice&&<div className="success-box" role="status">{profileNotice}</div>}</section><section className="settings-card theme-settings"><div className="eyebrow">APPEARANCE</div><h2>Choose a theme</h2><p className="auth-intro">Saved on this device and applied across the dashboard.</p><div className="theme-options">{([['light','Light'],['ocean','Ocean'],['dark','Dark'],['slate','Gray'],['contrast','High contrast']] as [ThemeName,string][]).map(([value,label])=><button key={value} className={`theme-option ${theme===value?'selected':''}`} onClick={()=>setTheme(value)} aria-pressed={theme===value}><span className={`theme-swatch ${value}`}/><span>{label}</span>{theme===value&&<CheckCircle2 size={15}/>}</button>)}</div></section><section className="settings-card settings-danger"><div className="eyebrow">DANGER ZONE</div><h2>Delete account and data</h2><p>This permanently deletes your profile, saved checks, sessions and reset links.</p><label>Confirm current password<input type="password" value={accountPassword} onChange={e=>setAccountPassword(e.target.value)} autoComplete="current-password"/></label>{actionError&&<div className="error-box" role="alert">{actionError}</div>}{deleteConfirm?<div className="confirm-actions"><button className="danger-button" onClick={removeAccount}>Permanently delete my account</button><button onClick={()=>setDeleteConfirm(false)}>Cancel</button></div>:<button className="danger-button" onClick={()=>setDeleteConfirm(true)}>Delete account</button>}</section></div></section>:<><div className="welcome"><div><div className="eyebrow">YOUR SAFETY OVERVIEW</div><h1>Your digital safety, at a glance.</h1><p>Check suspicious links and messages before you trust them.</p><small className="ai-status-inline">{localAiStatus === null ? "Checking AI availability…" : localAiStatus.configured ? `Local AI configured · ${localAiStatus.model}. It can explain message warning signs when reachable; its advice does not change the score.` : localAiStatus.unavailable ? "AI status unavailable; check the API connection." : "Local AI is not configured; rules based analysis remains active."}</small></div><div className="streak"><div className="streak-icon"><ShieldCheck size={20}/></div><div><b>One careful check</b><small>can prevent a costly mistake.</small></div></div></div>
        <div className="metrics"><article className="metric-card"><div className="metric-top"><span>Total checks</span><span className="metric-icon blue"><ScanLine size={16}/></span></div><strong>{scans.length}</strong><small>Saved in your private history</small></article><article className="metric-card"><div className="metric-top"><span>High-risk findings</span><span className="metric-icon red"><AlertTriangle size={16}/></span></div><strong>{scans.filter(scan=>['HIGH','CRITICAL'].includes(scan.risk_level)).length}</strong><small>Based on the evidence available for each check</small></article><article className="metric-card"><div className="metric-top"><span>Analysis providers</span><span className="metric-icon green"><CheckCircle2 size={16}/></span></div><strong>{feedSeen?'Configured':'Local'}</strong><small>{feedSeen?'At least one recorded scan checked a configured feed.':'External feeds are optional and not present in current scan records.'}</small></article></div>
        <div className="scan-layout">
          <section className="scan-card"><div className="scan-heading"><div><div className="eyebrow">QUICK CHECK</div><h2>What would you like to verify?</h2><p>Start with a suspicious link or message.</p></div><div className="scan-stamp"><ShieldCheck size={18}/></div></div>
            <div className="tabs" role="tablist">{([['url',Link2,'URL'],['message',MessageSquareText,'Message'],['screenshot',ImageIcon,'Screenshot'],['qr',QrCode,'QR'],['image',FileSearch,'Image'],['file',FileSearch,'File'],['store',Link2,'Store'],['product',FileSearch,'Product'],['claim',MessageSquareText,'Claim']] as const).map(([key,Icon,label])=><button key={key} role="tab" aria-selected={mode===key} className={mode===key?'active':''} onClick={()=>{setMode(key);setResult(null);setError('');setUpload(null)}}><Icon size={15}/>{label}</button>)}</div>
            {['screenshot','image','qr','file'].includes(mode)?<><label className="input-label" htmlFor="image-upload">{mode==='file'?'Upload PDF, DOCX, XLSX, PPTX, ZIP or text (max 20 MB)':'Upload a PNG, JPG or WEBP image (max 20 MB)'}</label><input id="image-upload" className="file-input" type="file" accept={mode==='file'?'.pdf,.docx,.xlsx,.pptx,.zip,.txt,.md,.csv,.exe,.dll,.docm,.xlsm,.pptm':'image/png,image/jpeg,image/webp'} onChange={e=>setUpload(e.target.files?.[0]??null)}/>{upload&&<div className="selected-file"><ImageIcon size={15}/>{upload.name}<button onClick={()=>setUpload(null)}>Remove</button></div>}</>:<>{mode==='product'&&<><label className="input-label" htmlFor="product-url">Product URL (optional)</label><input id="product-url" value={productUrl} onChange={e=>setProductUrl(e.target.value)} placeholder="https://store.example/product"/><div className="product-prices"><label>Price<input type="number" min="0" value={price} onChange={e=>setPrice(e.target.value)} placeholder="Current price"/></label><label>Reference price<input type="number" min="0" value={referencePrice} onChange={e=>setReferencePrice(e.target.value)} placeholder="Optional original price"/></label></div></>}{mode==='product'&&<label className="input-label" htmlFor="analyze-input">Listing description</label>}{mode!=='product'&&<label className="input-label" htmlFor="analyze-input">{mode==='url'?'Paste the website address':mode==='store'?'Paste the online store address':mode==='claim'?'Enter a claim to verify':'Paste the suspicious message'}</label>}<textarea id="analyze-input" value={input} onChange={e=>setInput(e.target.value)} placeholder={mode==='url'?'https://example.com/...':mode==='store'?'https://shop.example/...':mode==='product'?'Paste the listing text and seller wording…':mode==='claim'?'Tomorrow all banks will remain closed.':'“Your account will be suspended. Verify now...”'} rows={mode==='url'||mode==='store'?2:4}/>{mode==='claim'&&<><label className="input-label" htmlFor="claim-sources">Optional source URLs (up to 3, one per line)</label><textarea id="claim-sources" value={claimSources} onChange={e=>setClaimSources(e.target.value)} placeholder="https://official-source.example/statement" rows={3}/><small className="disclaimer">ProofLens will fetch public HTTPS pages you provide. They will be shown as unverified references; they will not produce a verdict.</small></>}{mode==='store'&&<><label className="input-label" htmlFor="store-context">Store details you want checked (optional)</label><textarea id="store-context" value={storeContext} onChange={e=>setStoreContext(e.target.value)} placeholder="Paste public store text, return terms or payment details." rows={4}/><label className="saved-filter"><input type="checkbox" checked={fetchStorePage} onChange={e=>setFetchStorePage(e.target.checked)}/>Fetch public HTTPS store page and up to 2 same-site policy pages</label><small className="disclaimer">If enabled, ProofLens server requests these pages. Private and local network addresses are blocked.</small></>}{mode==="product"&&<label className="saved-filter"><input type="checkbox" checked={fetchProductPage} onChange={e=>setFetchProductPage(e.target.checked)}/>Fetch public HTTPS product page</label>}{mode==="url"&&<><label className="saved-filter"><input type="checkbox" checked={fetchUrlPage} onChange={e=>setFetchUrlPage(e.target.checked)}/>Safely fetch public page to inspect redirects and form fields</label><small className="disclaimer">Optional. Sends a request from this server to the public address; private/local addresses are blocked.</small></>}</>}
            <div className="scan-controls"><span><LockKeyhole size={14}/> No store page is fetched; configured providers may receive submitted data.</span><button onClick={analyze} disabled={busy||demoMode}>{busy?<><LoaderCircle size={16} className="spin"/>Checking…</>:<>{demoMode?'Sign in for a live check':'Analyze safely'} <ArrowUpRight size={16}/></>}</button></div>
            {error&&<div className="error-box" role="alert"><AlertTriangle size={16}/>{error}</div>}
            {result&&<div className={`result-box ${riskClass}`} aria-live="polite"><div className="result-head"><div><div className="eyebrow">{result.is_demo?'SAMPLE REPORT · NOT LIVE':'PROOFLENS ASSESSMENT'}</div><h3>{result.risk_level.replace('_',' ')} RISK <span>{result.risk_score}/100</span></h3></div><div className={`risk-symbol ${riskClass}`}>{riskClass==='low'?<CheckCircle2/>:<AlertTriangle/>}</div></div><p>{result.summary}</p><div className="result-meta">Confidence: <b>{result.confidence}</b><span>•</span>{result.evidence.length} signal{result.evidence.length===1?'':'s'}{result.status==='PARTIAL'&&<><span>•</span>Limited analysis</>}</div>{result.analysis_meta?.local_ai?.insight&&<div className="extracted"><b>Local AI explanation · {result.analysis_meta.local_ai.model||'Ollama'}</b><p>{result.analysis_meta.local_ai.insight}</p><small>Advisory only; this does not affect the evidence or risk score.</small></div>}{result.analysis_meta?.claim_sources&&result.analysis_meta.claim_sources.length>0&&<div className="extracted"><b>Published reviews · {result.analysis_meta.claim_sources.length}</b>{result.analysis_meta.claim_sources.map((source,i)=><p key={i}><a href={source.url} target="_blank" rel="noreferrer">{source.publisher}: {source.title||source.rating}</a>{source.review_date?` · ${source.review_date}`:""}<br/><small>Publisher rating: {source.rating}</small></p>)}</div>}{result.analysis_meta?.extracted_text&&<div className="extracted"><b>Text found in image</b><p>{result.analysis_meta.extracted_text}</p></div>}{result.analysis_meta?.qr_destination&&<div className="extracted"><b>QR destination</b><p>{result.analysis_meta.qr_destination}</p></div>}{result.analysis_meta?.page_fetch?.status&&result.analysis_meta.page_fetch.status!=="not_requested"&&<div className="extracted"><b>Live page inspection: {result.analysis_meta.page_fetch.status}</b>{result.analysis_meta.page_fetch.final_url&&<p>Final address: {result.analysis_meta.page_fetch.final_url}</p>}{result.analysis_meta.page_fetch.http_status&&<p>HTTP {result.analysis_meta.page_fetch.http_status} · {result.analysis_meta.page_fetch.redirect_count||0} redirect(s) · HTTPS certificate validated</p>}</div>}{result.analysis_meta?.image_metadata&&Object.keys(result.analysis_meta.image_metadata).length>0&&<div className="extracted"><b>Image metadata</b>{Object.entries(result.analysis_meta.image_metadata).map(([key,value])=><p key={key}>{key.replaceAll("_"," ")}: {value}</p>)}</div>}{result.analysis_meta?.c2pa_status&&result.scan_type==="IMAGE"&&<div className="extracted"><b>Content credentials: {result.analysis_meta.c2pa_status}</b><p>{result.analysis_meta.c2pa_status==="marker_present_unverified"?"A marker was found, but its signature and manifest were not validated.":"No marker was detected. Its absence does not show that an image is fake."}</p></div>}{result.analysis_meta?.sha256&&<div className="extracted"><b>File SHA-256</b><p>{result.analysis_meta.sha256}</p></div>}{result.analysis_meta?.media_provider&&<div className="extracted"><b>Media authenticity provider</b><p>{result.analysis_meta.media_provider.status==='not_configured'?'Not configured; no AI-generated or deepfake verdict was produced.':`Provider status: ${result.analysis_meta.media_provider.status}. Results are signals, not proof.`}</p></div>}{result.analysis_meta?.local_signatures&&<div className="extracted"><b>Local file signature scan</b><p>{result.analysis_meta.local_signatures.matches?.length?result.analysis_meta.local_signatures.matches.join(", "):"No built-in byte-pattern rule matched; this does not mean the file is clean."}</p></div>}{result.analysis_meta?.yara&&<div className="extracted"><b>YARA scanner: {result.analysis_meta.yara.status}</b>{result.analysis_meta.yara.matches?.map(match=><p key={match}>{match}</p>)}</div>}{result.analysis_meta?.antivirus&&<div className="extracted"><b>Antivirus: {result.analysis_meta.antivirus.status}</b>{result.analysis_meta.antivirus.signature&&<p>{result.analysis_meta.antivirus.signature}</p>}</div>}{result.evidence.length>0&&<div className="evidence-list">{result.evidence.map((item,i)=><div className="evidence" key={i}><span className="evidence-dot"/><div><b>{item.title}</b><small>{item.description}</small></div><em>{item.severity}</em></div>)}</div>}<div className="recommendation"><b>Recommended action</b><ul>{result.recommendations.map((item,i)=><li key={i}>{item}</li>)}</ul></div>{result.is_demo?<div className="demo-readonly">Sample report: saving, sharing and deleting are disabled.</div>:<><div className="result-actions"><button onClick={()=>scanAction('save',result.scan_id)}>Save check</button><button onClick={()=>scanAction('share',result.scan_id)}>Create private report link</button><button onClick={async()=>{const response=await apiFetch(`${API}/reports/${result.scan_id}/pdf`,{credentials:'include'});if(response.ok){const blob=await response.blob();const href=URL.createObjectURL(blob);const link=document.createElement('a');link.href=href;link.download=`${result.scan_id}.pdf`;link.click();URL.revokeObjectURL(href)}else setActionError('PDF report could not be downloaded.')}}>Download PDF</button><button className="danger-action" onClick={()=>scanAction('delete',result.scan_id)}>Delete</button></div>{shareUrl&&<div className="share-link"><span>Anyone with this link can view the limited report:</span><a href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a><button onClick={()=>scanAction('revoke',result.scan_id)}>Revoke</button></div>}{actionError&&<div className="error-box" role="alert">{actionError}</div>}</>}<small className="disclaimer">Risk score is an indicator, not a probability. A low-risk result does not guarantee safety.</small></div>}
          </section>
          <aside className="side-panel"><div className="panel-title"><h3>Other checks</h3><button aria-label="More check types"><ArrowUpRight size={15}/></button></div><div className="quick-grid">{QUICK_CHECKS.map(({Icon,label,description,mode:checkMode})=><button className="quick-item" key={label} onClick={()=>{setMode(checkMode);setError('');setUpload(null)}}><span className="quick-icon"><Icon size={18}/></span><span><b>{label}</b><small>{description}</small></span><ChevronRight size={15}/></button>)}</div><div className="trust-note"><div className="trust-icon"><ShieldCheck size={18}/></div><div><b>Evidence over guesses</b><p>ProofLens explains which signals shaped each result. AI guesses never set the risk score.</p><a href="#how-it-works">How it works <ArrowUpRight size={13}/></a></div></div></aside>
        </div>
        <section className="recent"><div><div className="eyebrow">YOUR WORKSPACE</div><h2>{page==='History'?'Scan history':'Recent checks'}</h2></div><button className="text-button" onClick={()=>setPage(page==='History'?'Overview':'History')}>{page==='History'?'Back to overview':'View history'} <ArrowUpRight size={15}/></button>{page==='History'&&<div className="history-filters"><input aria-label="Search checks" placeholder="Search text or scan ID" value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)}/><select aria-label="Type" value={scanTypeFilter} onChange={e=>setScanTypeFilter(e.target.value)}><option value="">All types</option>{['URL','MESSAGE','SCREENSHOT','QR','IMAGE','FILE','STORE','PRODUCT','CLAIM'].map(x=><option key={x}>{x}</option>)}</select><select aria-label="Risk" value={riskFilter} onChange={e=>setRiskFilter(e.target.value)}><option value="">All risks</option>{['LOW','CAUTION','HIGH','CRITICAL'].map(x=><option key={x}>{x}</option>)}</select><label className="saved-filter"><input type="checkbox" checked={savedOnly} onChange={e=>setSavedOnly(e.target.checked)}/>Saved only</label><label>From<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label><label>To<input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></label></div>}{scans.length===0?<div className="empty-row"><div className="empty-icon"><History size={19}/></div><div><b>{page==='History'?'No checks match these filters':'Your checks will show up here'}</b><small>Analyze a link, message, screenshot, QR code, or image to start your history.</small></div><ChevronRight size={16}/></div>:scans.slice(0,page==='History'?50:5).map(scan=><div className="scan-row" key={scan.scan_id} onClick={()=>setResult(scan)}><span className={`row-badge ${scan.risk_level.toLowerCase()}`}>{scan.risk_level}</span><div><b>{scan.scan_type} check</b><small>{scan.scan_id} · {new Date(scan.created_at).toLocaleString()}</small></div><strong>{scan.risk_score}</strong>{!scan.is_demo&&<button onClick={e=>{e.stopPropagation();scanAction('delete',scan.scan_id)}} aria-label={`Delete ${scan.scan_id}`}>Delete</button>}</div>)}</section>
        <footer id="how-it-works">ProofLens provides evidence, not certainty. Always verify through an organization&apos;s official app or website.</footer>
        </>}
      </div>
    </section>
  </main>;
}
