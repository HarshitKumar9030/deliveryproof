'use client';
import { useState, type FormEvent } from 'react';
import { signOut } from 'next-auth/react';
import { useWorkspace } from './workspace-provider';
import { Fingerprint, LogOut, Check } from 'lucide-react';
import { MerchantConnection } from './merchant-connection';
export function AccountSettings() {
  const {user, notify} = useWorkspace();
  const [name,setName] = useState(user?.name || '');
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  async function save(event:FormEvent) {
    event.preventDefault(); if(busy) return;
    setBusy(true); setError(''); setSaved(false);
    try {
      const response = await fetch('/api/account',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
      const result=await response.json(); if(!response.ok) throw new Error(result.error);
      setSaved(true); notify('Account updated.'); window.location.reload();
    } catch(error) { setError(error instanceof Error ? error.message : 'Unable to save'); }
    finally {setBusy(false);}
  }
  return <div><div className="page-heading"><div><span className="workspace-eyebrow">PERSONAL SETTINGS</span><h1>Your account.</h1><p>The person behind the workspace.</p></div></div><section className="squircle max-w-xl rounded-[30px] bg-paper p-7 sm:p-9"><div className="mb-7 flex items-center gap-4"><span className="auth-brand"><Fingerprint size={24}/></span><div><h2>{user?.name}</h2><p className="caption mt-1">{user?.email}</p></div></div><form onSubmit={save} className="form-stack"><label>Display name<input required maxLength={80} autoComplete="name" value={name} onChange={event=>setName(event.target.value)}/></label><label>Email address<input type="email" value={user?.email || ''} readOnly aria-readonly="true"/></label><p className="caption">Your projects and evidence belong to this account.</p>{error && <p role="alert" className="form-error">{error}</p>}<button className="button primary" disabled={busy}>{saved && <Check size={16}/>} {busy?'Saving…':'Save changes'}</button></form><div className="mt-10"><button className="text-button" onClick={()=>signOut({callbackUrl:'/signin'})}><LogOut size={16}/>Sign out</button></div></section><MerchantConnection/></div>;
}
