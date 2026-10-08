'use client';
import { useState } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
export function ProjectPayment({projectId}:{projectId:string}) {
 const [url,setUrl]=useState('');
 const [busy,setBusy]=useState<'create'|'refresh'|null>(null);
 const [error,setError]=useState('');const [copied,setCopied]=useState(false);const [refreshed,setRefreshed]=useState(false);
 async function create(refresh=false) {
  if(busy)return;
  setBusy(refresh?'refresh':'create');setError('');setCopied(false);setRefreshed(false);
  try {
   const response=await fetch(`/api/projects/${projectId}/payment${refresh?'?refresh=1':''}`,{method:'POST'});
   const result=await response.json();if(!response.ok)throw new Error(result.error);
   setUrl(result.paymentUrl);setRefreshed(refresh);
  } catch(error) {
   setError(error instanceof Error?error.message:'Unable to create payment');
   // A failed provider call may already have replaced the old app link.
   if(refresh)setUrl('');
  } finally {setBusy(null);}
 }
 return <div className="grid gap-3" aria-busy={!!busy}>
  <div className="flex flex-wrap items-center gap-3">
   <button className="button primary" disabled={!!busy} onClick={()=>create()}>{busy==='create'?'Creating PayPal order…':url?'Retrieve payment link':'Create payment link'}</button>
   <button className="text-button inline-flex items-center gap-2" disabled={!!busy} onClick={()=>create(true)} title="Generate a fresh checkout and replace the previous app link"><RefreshCw size={15} aria-hidden="true"/>{busy==='refresh'?'Generating…':'New payment'}</button>
  </div>
  {refreshed&&<p role="status" className="caption">Fresh checkout ready. Share this link; the previous app link is no longer valid.</p>}
  {url&&<><a href={url} target="_blank" rel="noreferrer" className="text-button">Open client payment page ↗</a><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('Copy the link from the field below.');}}}>{copied?'Link copied':'Copy payment link'}</button><input aria-label="Client payment link" readOnly value={url}/></>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <Link href="/account" className="caption">Configure your PayPal sandbox app in Account →</Link>
  <p className="caption">New payment replaces an unpaid checkout. Approved payments must be completed first. Sandbox test funds only.</p>
 </div>;
}
