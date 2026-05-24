'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginInner() {
  const router = useRouter();
  const params = useRouter && typeof window !== 'undefined' ? useSearchParams() : null;
  const presetRole = params?.get('role');

  const [busy, setBusy]   = useState('');
  const [error, setError] = useState('');

  // If a ?role= hint is present, auto-trigger that login.
  useEffect(() => {
    if (presetRole === 'interviewer' || presetRole === 'candidate') {
      // small delay so users see what's happening
      const t = setTimeout(() => doLogin(presetRole), 250);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetRole]);

  const doLogin = async (role) => {
    setBusy(role);
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Login failed');
      router.push(role === 'interviewer' ? '/interviewer' : '/candidate');
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  };

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917] flex flex-col">

      <header className="px-8 py-5 flex items-center justify-between border-b border-[#1C1917]/15">
        <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          SilkHR
        </Link>
        <span className="text-[10px] tracking-widest uppercase text-[#A89F92]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          Sign in
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-2xl">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[#78716C] mb-4" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            Demo accounts
          </p>
          <h1 className="text-4xl font-medium tracking-tight mb-2">Who are you, today?</h1>
          <p className="text-sm text-[#78716C] mb-10">No password — pick a role and you're in. (Demo build for the Rumik × AWS Voice Hackathon.)</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => doLogin('interviewer')}
              disabled={!!busy}
              className={`group text-left rounded-2xl border p-6 transition-all ${
                busy === 'interviewer'
                  ? 'bg-[#1C1917] border-[#1C1917] text-[#FEF9EC]'
                  : 'border-[#DDD6C8] hover:border-[#1C1917] hover:bg-white/40 cursor-pointer'
              } disabled:cursor-wait`}
            >
              <p className="text-[9px] tracking-[0.32em] uppercase font-semibold mb-3 opacity-70" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Interviewer
              </p>
              <p className="text-xl font-medium mb-1">Maya Recruiter</p>
              <p className="text-xs opacity-70 mb-6">interviewer@silkhr.dev</p>
              <p className="text-xs leading-relaxed opacity-80">
                Build interview templates, schedule candidates, review the tapes, release results.
              </p>
              <p className="mt-6 text-[10px] tracking-[0.32em] uppercase opacity-60" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {busy === 'interviewer' ? 'Signing in…' : 'Sign in →'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => doLogin('candidate')}
              disabled={!!busy}
              className={`group text-left rounded-2xl border p-6 transition-all ${
                busy === 'candidate'
                  ? 'bg-[#1C1917] border-[#1C1917] text-[#FEF9EC]'
                  : 'border-[#DDD6C8] hover:border-[#1C1917] hover:bg-white/40 cursor-pointer'
              } disabled:cursor-wait`}
            >
              <p className="text-[9px] tracking-[0.32em] uppercase font-semibold mb-3 opacity-70" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                Candidate
              </p>
              <p className="text-xl font-medium mb-1">Aarav Kumar</p>
              <p className="text-xs opacity-70 mb-6">candidate@silkhr.dev</p>
              <p className="text-xs leading-relaxed opacity-80">
                Take scheduled interviews assigned to you, or run mock practice on your own time.
              </p>
              <p className="mt-6 text-[10px] tracking-[0.32em] uppercase opacity-60" style={{ fontFamily: 'var(--font-geist-mono)' }}>
                {busy === 'candidate' ? 'Signing in…' : 'Sign in →'}
              </p>
            </button>
          </div>

          {error && (
            <p className="mt-6 text-xs text-rose-600 text-center">{error}</p>
          )}

          <p className="mt-12 text-center text-[10px] tracking-[0.32em] uppercase text-[#A89F92]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
            <Link href="/" className="hover:text-[#1C1917] transition-colors">← Back to landing</Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FEF9EC]" />}>
      <LoginInner />
    </Suspense>
  );
}
