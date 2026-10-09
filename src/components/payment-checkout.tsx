'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CreditCard, Info, ShieldCheck } from 'lucide-react';
type Payment={title:string;client:string;amount:string;paid:boolean;approvalUrl:string};
export function PaymentCheckout({token}:{token:string}) {
  const [payment,setPayment]=useState<Payment|null>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useEffect(()=>{const controller=new AbortController(); fetch('/api/pay/'+token,{signal:controller.signal}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error);setPayment(result);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return()=>controller.abort();},[token]);
  async function capture(){if(busy)return;setBusy(true);setError('');try{const response=await fetch('/api/pay/'+token,{method:'POST'});const result=await response.json();if(!response.ok)throw new Error(result.error);setPayment(p=>p?{...p,paid:true}:p);}catch(error){setError(error instanceof Error?error.message:'Unable to verify payment');}finally{setBusy(false);}}
  return <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 sm:px-6 sm:py-12">
    <div className="grid w-full max-w-[440px] gap-3">
      <section aria-labelledby="checkout-title" className="squircle rounded-[32px] bg-paper p-6 sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium tracking-tight">DeliveryProof</Link>
          <ShieldCheck size={17} className="text-muted" aria-hidden="true"/>
        </div>
        <div className="mt-9 mb-5 flex size-12 items-center justify-center rounded-2xl bg-surface">
          {payment?.paid?<CheckCircle2 size={24} aria-hidden="true"/>:<CreditCard size={24} aria-hidden="true"/>}
        </div>
        <h1 id="checkout-title" className="text-[28px] font-semibold tracking-[-0.04em]">{payment?.paid?'Payment confirmed.':'Your payment.'}</h1>
        {payment?<>
          <div className="mt-5 min-w-0">
            <p className="break-words text-sm font-medium">{payment.title}</p>
            <p className="mt-1 break-words text-sm text-muted">{payment.client}</p>
          </div>
          <div className="my-8 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[clamp(2rem,8vw,2.75rem)] leading-none tracking-[-0.055em] tabular-nums">${Number(payment.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <span className="text-xs font-medium text-muted">USD</span>
          </div>
          {!payment.paid&&<div className="grid gap-3">
            <a className="button primary w-full justify-center gap-2" href={payment.approvalUrl} title="Step 1: Sign in to PayPal sandbox and approve this order.">1. Approve in PayPal<ArrowUpRight size={15} aria-hidden="true"/></a>
            <button className="button secondary w-full justify-center" disabled={busy} onClick={capture} title="Step 2: After PayPal approval, capture and verify the payment.">{busy?'Verifying payment…':'2. Complete & verify payment'}</button>
          </div>}
          {payment.paid&&<p role="status" className="text-sm text-muted">Your PayPal payment has been verified.</p>}
        </>:!error&&<p role="status" className="mt-6 text-sm text-muted">Loading payment…</p>}
        {error&&<p role="alert" className="form-error mt-5">{error}</p>}
      </section>

      <aside aria-label="Sandbox payment help">
        {payment && !payment.paid && <p className="mb-3 px-2 text-xs leading-relaxed text-muted">Approve in PayPal, then return to this page and complete payment. The seller sees payment only after step 2 succeeds.</p>}
        <details className="squircle rounded-[24px] bg-paper px-5 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-xs [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2 text-muted"><Info size={15} className="shrink-0" aria-hidden="true"/><span>Sandbox · Test funds only</span></span>
            <span className="shrink-0 font-medium">Help</span>
          </summary>
          <div className="grid gap-5 pt-1 pb-6 text-xs leading-relaxed text-muted">
            <div><h2 className="mb-1 text-xs font-medium text-ink">Which account should I use?</h2><p>Choose Log in in PayPal and use a Personal sandbox account. Use test credentials, rather than the seller’s Business account or a real card.</p></div>
            <div><h2 className="mb-1 text-xs font-medium text-ink">Where are my test credentials?</h2><p>PayPal Developer → Testing Tools → Sandbox Accounts. Open your Personal account to find its email and password.</p></div>
            <div><h2 className="mb-1 text-xs font-medium text-ink">How do I complete payment?</h2><p>Approve the order in PayPal, return here, then select Complete &amp; verify payment. Approval alone does not confirm a captured payment.</p></div>
            <div><h2 className="mb-1 text-xs font-medium text-ink">Where does the payment go?</h2><p>The capture goes to the Business sandbox account connected by the seller. This checkout uses test funds only.</p></div>
          </div>
        </details>
      </aside>
    </div>
  </main>;
}
