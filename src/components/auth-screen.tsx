'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { signIn } from 'next-auth/react';
import { ArrowRight, Eye, EyeOff, Fingerprint, LoaderCircle, Moon, Sun } from 'lucide-react';
import { useWorkspace } from '@/components/workspace-provider';
import { AuthProofScene } from './auth-proof-scene';

export function AuthScreen({ mode }: { mode: 'signin' | 'signup' }) {
  const signup = mode === 'signup';
  const { theme, toggleTheme } = useWorkspace();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [passwordLength, setPasswordLength] = useState(0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const password = String(data.get('password') ?? '');
    try {
      if (signup && !created) {
        const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: String(data.get('name') ?? '').trim(), email, password }) });
        const result = await response.json();
        if (!response.ok) { setError(result.error || 'Could not create your account.'); return; }
        setCreated(true);
      }
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error || !result?.ok) { setError(signup ? 'Your account was created. Please sign in to continue.' : 'Could not sign in. Check your email and password, or try again shortly.'); return; }
      window.location.assign('/dashboard');
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return (
    <main className="auth-page">
      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Link href="/" className="flex items-center gap-3 text-[15px] font-semibold tracking-[-.4px]" aria-label="DeliveryProof home">
          <span className="auth-brand"><Fingerprint size={22} strokeWidth={1.7} /></span>DeliveryProof
        </Link>
        <button type="button" onClick={toggleTheme} className="auth-icon" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
      </header>
      <div className="auth-layout">
        <section className="auth-story" aria-label="About DeliveryProof">
          <p className="auth-eyebrow"><span /> A little clarity. A lot less back-and-forth.</p>
          <h1><span className="auth-headline-line">The work is yours.</span><span className="auth-headline-line auth-headline-muted">The proof is here.</span></h1>
          <p className="auth-description">Keep the agreement, the delivery, and the receipt together. One clear story, whenever you need it.</p>
          <AuthProofScene />
          <p className="auth-story-footer">Built for the work behind every payment.</p>
        </section>
        <section className="auth-form-area" key={mode}>
          <nav className="auth-mode-switch" aria-label="Account access"><span className="auth-mode-indicator" data-signup={signup} /><Link href="/signin" aria-current={!signup ? 'page' : undefined}>Sign in</Link><Link href="/signup" aria-current={signup ? 'page' : undefined}>Create account</Link></nav>
          <div className="auth-mobile-seal" aria-hidden="true"><Fingerprint size={32} strokeWidth={1.3} /></div>
          <div className="auth-form-heading"><span className="auth-eyebrow">YOUR WORKSPACE</span><h2>{signup ? 'Start with clarity.' : 'Welcome back.'}</h2><p>{signup ? 'Create an account. Keep your work in order.' : 'Your work, right where you left it.'}</p></div>
          <form onSubmit={submit} className="auth-form">
            {signup && <label htmlFor="auth-name">Your name<input id="auth-name" name="name" autoComplete="name" placeholder="Your full name" required maxLength={80} disabled={busy || created} /></label>}
            <label htmlFor="auth-email">Email address<input id="auth-email" name="email" type="email" autoComplete="email" placeholder="you@studio.com" required maxLength={254} disabled={busy} /></label>
            <label htmlFor="auth-password">Password<div className="auth-password"><input id="auth-password" name="password" type={visible ? 'text' : 'password'} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? 'At least 12 characters' : 'Enter your password'} required minLength={12} maxLength={128} disabled={busy} onChange={event => setPasswordLength(event.target.value.length)} aria-describedby={signup ? 'password-length-hint' : undefined} /><button type="button" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="auth-icon"><span key={String(visible)} className="auth-eye-swap">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</span></button></div></label>
            {signup && <div className="auth-password-guidance"><div className="auth-length-bars" aria-hidden="true">{[3, 6, 9, 12].map(length => <span key={length} data-filled={passwordLength >= length} />)}</div><p id="password-length-hint" className="auth-password-hint">{passwordLength >= 12 ? 'Minimum length met. Make it unique to you.' : '12 or more characters. A longer phrase works well.'}</p></div>}
            {error && <p role="alert" className="auth-error">{error}</p>}
            <button type="submit" disabled={busy} className="auth-submit"><span>{busy ? (signup && !created ? 'Creating your account…' : 'Signing you in…') : signup ? 'Create account' : 'Sign in'}</span>{busy ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}</button>
          </form>
          <p className="auth-switch">{signup ? 'Already have an account?' : 'New to DeliveryProof?'} <Link href={signup ? '/signin' : '/signup'}>{signup ? 'Sign in' : 'Create an account'}</Link></p>
          <div className="auth-form-note"><Fingerprint size={16} /><span>Your workspace starts with you.</span></div>
        </section>
      </div>
      <footer className="auth-bottom"><span>DeliveryProof</span><span>Less chasing. More creating.</span></footer>
    </main>
  );
}
