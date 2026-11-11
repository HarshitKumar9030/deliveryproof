'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, CreditCard, Info, LockKeyhole, ShieldCheck } from 'lucide-react';
type Payment={title:string;client:string;amount:string;paid:boolean;approved:boolean;approvalUrl:string|null;intent:'CAPTURE'|'AUTHORIZE';hold:{state:string;expiresAt:string|null}|null};
export function PaymentCheckout({token}:{token:string}) {
  const [payment,setPayment]=useState<Payment|null>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  const finishing=useRef(false);
  async function capture(){if(finishing.current)return;finishing.current=true;setBusy(true);setError('');try{const response=await fetch('/api/pay/'+token,{method:'POST'});const result=await response.json();if(!response.ok)throw new Error(result.error);setPayment(p=>p?{...p,paid:!!result.paid,hold:result.held?(p.hold??{state:'held',expiresAt:null}):p.hold}:p);}catch(error){setError(error instanceof Error?error.message:'Unable to verify payment');}finally{finishing.current=false;setBusy(false);}}
  // Load the live state, and reload it whenever this tab regains focus, so a stale tab
  // never offers a payment step that has already happened elsewhere.
  useEffect(()=>{
    let controller=new AbortController();
    const load=()=>{controller.abort();controller=new AbortController();const signal=controller.signal;
      return fetch('/api/pay/'+token,{signal,cache:'no-store'}).then(async response=>{const result=await response.json();if(!response.ok)throw new Error(result.error);setPayment(result);return result as Payment;}).catch(error=>{if(!signal.aborted)setError(error.message);return null;});};
    load().then(result=>{
      // Returning from PayPal: finish automatically instead of asking for another click.
      const params=new URLSearchParams(window.location.search);
      if(params.get('approved')==='1'){window.history.replaceState(null,'',window.location.pathname);if(result&&!result.paid&&!result.hold&&result.approved)void capture();}
    });
    const refresh=()=>{if(document.visibilityState==='visible'&&!finishing.current)void load();};
    document.addEventListener('visibilitychange',refresh);
    return()=>{controller.abort();document.removeEventListener('visibilitychange',refresh);};
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[token]);
  return <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-8 sm:px-6 sm:py-12">
    <div className="grid w-full max-w-[440px] gap-3">
      <section aria-labelledby="checkout-title" className="squircle rounded-[32px] bg-paper p-6 sm:p-9">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-sm font-medium tracking-tight">DeliveryProof</Link>
          <ShieldCheck size={17} className="text-muted" aria-hidden="true"/>
        </div>
        <div className="mt-9 mb-5 flex size-12 items-center justify-center rounded-2xl bg-surface">
          {payment?.paid?<CheckCircle2 size={24} aria-hidden="true"/>:payment?.intent==='AUTHORIZE'?<LockKeyhole size={24} aria-hidden="true"/>:<CreditCard size={24} aria-hidden="true"/>}
        </div>
        <h1 id="checkout-title" className="text-[28px] font-semibold tracking-[-0.04em]">{payment?.paid?'Payment confirmed.':payment?.hold?.state==='returned'?'Payment returned.':payment?.hold?'Payment held.':payment?.intent==='AUTHORIZE'?'Pay on proof.':'Your payment.'}</h1>
        {payment?<>
          <div className="mt-5 min-w-0">
            <p className="break-words text-sm font-medium">{payment.title}</p>
            <p className="mt-1 break-words text-sm text-muted">{payment.client}</p>
          </div>
          <div className="my-8 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="text-[clamp(2rem,8vw,2.75rem)] leading-none tracking-[-0.055em] tabular-nums">${Number(payment.amount).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
            <span className="text-xs font-medium text-muted">USD</span>
          </div>
          {payment.intent==='AUTHORIZE'&&!payment.paid&&!payment.hold&&<div className="mb-5 grid gap-2 rounded-2xl bg-surface p-4 text-xs leading-relaxed"><strong className="flex items-center gap-2 font-medium"><ShieldCheck size={14} aria-hidden="true"/>Protected until delivery is proven</strong><span className="text-muted">PayPal authorizes this amount but does not send it to the seller yet. It is released only after you confirm receipt of the work and an AI review finds every agreed item evidenced. If not, the seller can void the hold and you are not charged.</span></div>}
          {!payment.paid&&!payment.hold&&<div className="grid gap-3">
            {payment.approved||!payment.approvalUrl
              ? <p className="flex items-center gap-2 text-xs text-muted"><CheckCircle2 size={14} aria-hidden="true"/>Approved in PayPal. {busy?'Finishing now…':'Finish below; do not approve again.'}</p>
              : <a className="button primary w-full justify-center gap-2" href={payment.approvalUrl} title="Step 1: Sign in to PayPal sandbox and approve this order.">1. Approve in PayPal<ArrowUpRight size={15} aria-hidden="true"/></a>}
            <button className={`button ${payment.approved?'primary':'secondary'} w-full justify-center`} disabled={busy||!payment.approved} onClick={capture}>{busy?'Verifying payment…':payment.intent==='AUTHORIZE'?'2. Authorize & hold payment':'2. Complete & verify payment'}</button>
          </div>}
          {payment.paid&&<p role="status" className="text-sm text-muted">Your PayPal payment has been verified.</p>}
          {!payment.paid&&payment.hold&&<p role="status" className="text-sm leading-relaxed text-muted">{payment.hold.state==='returned'?'The seller voided the hold. You were not charged.':'PayPal is holding your payment. It is released to the seller only after you confirm receipt and the delivery is verified against the agreed scope.'}</p>}
        </>:!error&&<p role="status" className="mt-6 text-sm text-muted">Loading payment…</p>}
        {error&&<p role="alert" className="form-error mt-5">{error}</p>}
      </section>

      <aside aria-label="Sandbox payment help">
        {payment && !payment.paid && !payment.hold && <p className="mb-3 px-2 text-xs leading-relaxed text-muted">{payment.intent==='AUTHORIZE'?'Approve in PayPal, then return to this page and authorize. Your funds stay held until the delivery is proven.':'Approve in PayPal, then return to this page and complete payment. The seller sees payment only after step 2 succeeds.'}</p>}
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
