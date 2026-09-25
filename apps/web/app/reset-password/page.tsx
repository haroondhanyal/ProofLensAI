'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice(''); setBusy(true);
    try {
      if (password !== confirmPassword) throw new Error('Dono passwords match nahi karte.');
      const resetToken = new URLSearchParams(window.location.search).get('token') ?? '';
      const response = await apiFetch(`${API}/auth/reset-password`, { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body:JSON.stringify({token:resetToken,new_password:password}) });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Reset link is invalid or expired.');
      setNotice('Password updated. You can now sign in with your new password.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update password.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-screen"><section className="auth-card"><div className="eyebrow">ACCOUNT SECURITY</div><h1>Choose a new password</h1><p className="auth-intro">Reset links expire after 30 minutes and work once.</p><form onSubmit={submit}><label>New password<div className="password-field"><input type={showPassword?'text':'password'} minLength={10} maxLength={128} required value={password} onChange={(event)=>setPassword(event.target.value)} autoComplete="new-password"/><button type="button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label><label>Confirm new password<div className="password-field"><input type={showConfirmPassword?'text':'password'} minLength={10} maxLength={128} required value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} autoComplete="new-password"/><button type="button" onClick={()=>setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword?'Hide confirmation':'Show confirmation'}>{showConfirmPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>{error&&<div className="error-box" role="alert">{error}</div>}{notice&&<div className="success-box" role="status">{notice}</div>}<button className="auth-submit" disabled={busy}>{busy?'Updating…':'Update password'}</button></form><div className="auth-switch"><Link href="/">Return to sign in</Link></div></section></main>;
}
