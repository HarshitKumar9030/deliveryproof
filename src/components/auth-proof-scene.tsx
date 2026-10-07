import { ArrowUpRight, Check, FileText, Fingerprint, PackageCheck } from 'lucide-react';

/** An illustrative proof trail, never a representation of account records. */
export function AuthProofScene() {
  return <div className="auth-scene" aria-hidden="true">
    <div className="auth-scene-grid" />
    <svg className="auth-scene-routes" viewBox="0 0 480 330" fill="none">
      <path className="auth-route-base" d="M78 68H220Q240 68 240 88V242Q240 262 260 262H404" />
      <path className="auth-route-draw" d="M78 68H220Q240 68 240 88V242Q240 262 260 262H404" pathLength="1" />
      <circle className="auth-route-node auth-node-first" cx="78" cy="68" r="4" />
      <circle className="auth-route-node auth-node-last" cx="404" cy="262" r="4" />
    </svg>
    <div className="auth-floating-note auth-note-agreement"><span><FileText size={16} /></span><div><strong>Scope agreed</strong><small>It starts with a clear agreement.</small></div><Check size={14} /></div>
    <div className="auth-receipt">
      <div className="auth-receipt-top"><span>THE DELIVERY RECORD</span><ArrowUpRight size={14} /></div>
      <div className="auth-seal"><svg viewBox="0 0 92 92"><circle className="auth-seal-ring" cx="46" cy="46" r="42" pathLength="1" /></svg><Fingerprint size={36} strokeWidth={1.2} /></div>
      <strong className="auth-receipt-title">Good work.<br />Clearly documented.</strong>
      <div className="auth-receipt-lines"><span /><span /><span /></div>
      <div className="auth-receipt-trail">{['Agreement', 'Delivery', 'Receipt'].map((text, index) => <span key={text} style={{ '--trail-index': index } as React.CSSProperties}><svg viewBox="0 0 16 16"><path d="M3 8l3 3 7-7" pathLength="1" /></svg>{text}</span>)}</div>
      <div className="auth-receipt-bottom"><span>ONE CONNECTED STORY</span><span className="auth-barcode">|||| ||| || |||| |||</span></div>
    </div>
    <div className="auth-floating-note auth-note-received"><span><PackageCheck size={18} /></span><div><strong>Receipt kept</strong><small>Ready when you need it.</small></div><span className="auth-note-status" /></div>
    <div className="auth-scene-caption"><span>01 — 02 — 03</span><span>Nothing gets lost in between.</span></div>
  </div>;
}
