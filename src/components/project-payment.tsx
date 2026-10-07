'use client';
import { useState } from 'react';
import Link from 'next/link';
export function ProjectPayment({projectId}:{projectId:string}) {
 const [url,setUrl]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState(''); const [copied,setCopied]=useState(false);
 async function create(){if(busy)return;setBusy(true);setError('');try{const response=await fetch(`/api/projects/${projectId}/payment`,{method:'POST'});const result=await response.json();if(!response.ok)throw new Error(result.error);setUrl(result.paymentUrl);}catch(error){setError(error instanceof Error?error.message:'Unable to create payment');}finally{setBusy(false);}}
 return <div className="grid gap-3"><button className="button primary" disabled={busy} onClick={create}>{busy?'Creating PayPal order…':'Create payment link'}</button>{url&&<><a href={url} target="_blank" rel="noreferrer" className="text-button">Open client payment page ↗</a><button className="text-button" onClick={async()=>{try{await navigator.clipboard.writeText(url);setCopied(true);}catch{setError('Copy the link from the field below.');}}}>{copied?'Link copied':'Copy payment link'}</button><input aria-label="Client payment link" readOnly value={url}/></>}{error&&<p role="alert" className="form-error">{error}</p>}<Link href="/account" className="caption">Connect your PayPal sandbox app in Account →</Link><p className="caption">Sandbox test funds. Refresh after the client completes payment.</p></div>;
}
