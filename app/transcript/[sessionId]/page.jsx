'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

function stripToneMarker(text) {
  return (text || '').replace(/^\s*\[[a-z]+\]\s*/i, '').replace(/<(laugh|chuckle|sigh|exhale|curious)>/gi, '').replace(/\s+/g, ' ').trim();
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

function buildPlainText(session) {
  const lines = [];
  lines.push(`SilkHR Interview — ${session.config?.role || 'Unnamed role'}`);
  lines.push(`${session.config?.interviewType || ''} · ${session.config?.durationMinutes || '?'} min · ${formatDate(session.createdAt)}`);
  if (session.config?.pressureMode || session.config?.hinglishMode || session.config?.deepFollowups) {
    const toggles = [];
    if (session.config.pressureMode)  toggles.push('Pressure');
    if (session.config.hinglishMode)  toggles.push('Hinglish');
    if (session.config.deepFollowups) toggles.push('Deep follow-ups');
    lines.push(`Modes: ${toggles.join(', ')}`);
  }
  lines.push('');
  lines.push('─'.repeat(50));
  lines.push('');

  (session.history || []).forEach((h, i) => {
    const label = h.isFollowup ? '  (follow-up)' : ` ${i + 1}`;
    lines.push(`Interviewer${label}:`);
    lines.push(stripToneMarker(h.question));
    lines.push('');
    lines.push(`You:`);
    lines.push(h.transcript || '(no answer)');
    if (h.analysisTags?.length) {
      lines.push(`[tags: ${h.analysisTags.join(', ')}]`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

export default function TranscriptPage({ params }) {
  const { sessionId } = use(params);
  const [session, setSession] = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/session/${sessionId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load session');
        if (!cancelled) setSession(data);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [sessionId]);

  const plainText = useMemo(() => session ? buildPlainText(session) : '', [session]);

  const download = () => {
    const blob = new Blob([plainText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silkhr-${session.config?.role?.replace(/\s+/g, '-').toLowerCase() || 'interview'}-${sessionId.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FEF9EC] gap-3 px-6">
        <p className="text-sm text-[#1C1917]">Couldn't load this transcript.</p>
        <p className="text-xs text-[#A89F92] text-center max-w-md">{error}</p>
        <Link href="/history" className="text-xs underline text-[#1C1917]">Back to history</Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FEF9EC]">
        <p className="text-[10px] tracking-widest uppercase text-[#A89F92]">Loading transcript…</p>
      </div>
    );
  }

  const { config, history } = session;

  const activeToggles = [];
  if (config?.pressureMode)  activeToggles.push('Pressure');
  if (config?.hinglishMode)  activeToggles.push('Hinglish');
  if (config?.deepFollowups) activeToggles.push('Deep follow-ups');

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917]">

      <header className="px-8 py-5 flex items-center justify-between border-b border-[#E8E0D0]">
        <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          SilkHR
        </Link>
        <div className="flex items-center gap-5 text-[10px] tracking-widest uppercase">
          <Link href="/history" className="text-[#A89F92] hover:text-[#1C1917] transition-colors">History</Link>
          <Link href={`/feedback/${sessionId}`} className="text-[#A89F92] hover:text-[#1C1917] transition-colors">Feedback</Link>
          <span className="text-[#A89F92]">Transcript</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-2">
              {config?.role || 'Unnamed role'} · {config?.interviewType || ''} · {config?.durationMinutes || '?'} min
            </p>
            <h1 className="text-3xl font-medium tracking-tight">Full transcript</h1>
            <p className="mt-1 text-xs text-[#A89F92]">
              {formatDate(session.createdAt)}
              {history?.length ? ` · ${history.length} exchange${history.length === 1 ? '' : 's'}` : ''}
            </p>
            {activeToggles.length > 0 && (
              <div className="mt-3 flex gap-1.5">
                {activeToggles.map((t) => (
                  <span key={t} className="text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full border border-[#DDD6C8] text-[#78716C]">{t}</span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={download}
            className="flex-shrink-0 px-4 py-2 rounded-full border border-[#1C1917] text-[#1C1917] text-xs font-semibold tracking-wide hover:bg-[#1C1917] hover:text-[#FEF9EC] transition-colors"
          >
            Download .txt
          </button>
        </div>

        {(!history || history.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[#DDD6C8] px-6 py-10 text-center">
            <p className="text-sm text-[#78716C]">No turns recorded for this session.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {history.map((h, i) => (
              <div key={i} className="space-y-3">
                <div>
                  <div className="text-[10px] tracking-widest uppercase font-semibold text-[#A89F92] mb-1.5">
                    Interviewer {h.isFollowup ? '· follow-up' : `Q${i + 1}`}
                  </div>
                  <div className="rounded-2xl border border-[#E8E0D0] bg-white/40 px-5 py-4">
                    <p className="text-sm leading-relaxed text-[#1C1917]">{stripToneMarker(h.question)}</p>
                  </div>
                </div>
                <div className="pl-8">
                  <div className="text-[10px] tracking-widest uppercase font-semibold text-[#A89F92] mb-1.5">You</div>
                  <div className={`rounded-2xl px-5 py-4 ${h.transcript ? 'bg-[#1C1917] text-[#FEF9EC]' : 'border border-dashed border-[#DDD6C8] text-[#A89F92]'}`}>
                    <p className="text-sm leading-relaxed">{h.transcript || '(no answer recorded)'}</p>
                  </div>
                  {h.analysisTags?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {h.analysisTags.map((t) => (
                        <span key={t} className="text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full border border-[#DDD6C8] text-[#A89F92]">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-between">
          <Link href="/history" className="text-xs underline text-[#78716C] hover:text-[#1C1917]">
            ← All interviews
          </Link>
          <Link
            href="/"
            className="px-5 py-2.5 rounded-full bg-[#1C1917] text-[#FEF9EC] text-xs font-semibold tracking-wide hover:bg-[#2C2520] transition-colors"
          >
            New interview
          </Link>
        </div>

      </main>
    </div>
  );
}
