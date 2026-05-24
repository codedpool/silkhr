'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const date = new Date(ts);
  return date.toLocaleDateString();
}

function StatusBadge({ status, completed }) {
  if (completed || status === 'completed') {
    return <span className="text-[9px] tracking-widest uppercase font-semibold px-2 py-1 rounded-full bg-[#1C1917] text-[#FEF9EC]">Completed</span>;
  }
  if (status === 'active') {
    return <span className="text-[9px] tracking-widest uppercase font-semibold px-2 py-1 rounded-full border border-[#A89F92] text-[#78716C]">In progress</span>;
  }
  return <span className="text-[9px] tracking-widest uppercase font-semibold px-2 py-1 rounded-full border border-[#DDD6C8] text-[#A89F92]">Idle</span>;
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState(null);
  const [error, setError]       = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sessions')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || 'Failed to load sessions');
        if (!cancelled) setSessions(data.sessions || []);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917]">

      <header className="px-8 py-5 flex items-center justify-between border-b border-[#E8E0D0]">
        <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          SilkHR
        </Link>
        <span className="text-[10px] tracking-widest uppercase text-[#A89F92]">Interview history</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">

        <div className="mb-8 flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Your past interviews</h1>
            <p className="mt-1 text-xs text-[#A89F92]">{sessions ? `${sessions.length} session${sessions.length === 1 ? '' : 's'}` : 'Loading…'}</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-full bg-[#1C1917] text-[#FEF9EC] text-xs font-semibold tracking-wide hover:bg-[#2C2520] transition-colors"
          >
            + New interview
          </Link>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {sessions && sessions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#DDD6C8] px-6 py-10 text-center">
            <p className="text-sm text-[#78716C]">No interviews yet.</p>
            <Link href="/" className="mt-3 inline-block text-xs underline text-[#1C1917]">Start your first one</Link>
          </div>
        )}

        {sessions && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((s) => {
              const completed   = s.status === 'completed' || s.hasFeedback;
              const hasContent  = s.turnCount > 0;
              const primaryHref = completed || hasContent
                ? `/feedback/${s.sessionId}`
                : `/interview/${s.sessionId}`;
              const primaryLabel = completed || hasContent ? 'Feedback' : 'Resume';
              return (
                <div
                  key={s.sessionId}
                  className="rounded-xl border border-[#E8E0D0] bg-white/40 hover:border-[#A89F92] transition-colors px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-1">
                        <h2 className="text-base font-medium text-[#1C1917] truncate">
                          {s.config?.role || 'Unnamed role'}
                        </h2>
                        <StatusBadge status={s.status} completed={completed} />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#78716C]">
                        <span>{s.config?.interviewType || 'Interview'}</span>
                        <span className="text-[#DDD6C8]">·</span>
                        <span>{s.config?.durationMinutes || '?'} min</span>
                        <span className="text-[#DDD6C8]">·</span>
                        <span>{s.turnCount} turn{s.turnCount === 1 ? '' : 's'}</span>
                        {s.config?.pressureMode && (<><span className="text-[#DDD6C8]">·</span><span>Pressure</span></>)}
                        {s.config?.hinglishMode && (<><span className="text-[#DDD6C8]">·</span><span>Hinglish</span></>)}
                        {s.config?.deepFollowups && (<><span className="text-[#DDD6C8]">·</span><span>Deep follow-ups</span></>)}
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-[10px] tracking-widest uppercase text-[#A89F92] font-mono">
                      {formatRelative(s.updatedAt || s.createdAt)}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E8E0D0] flex items-center gap-2">
                    <Link
                      href={primaryHref}
                      className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520] transition-colors"
                    >
                      {primaryLabel}
                    </Link>
                    {hasContent && (
                      <Link
                        href={`/transcript/${s.sessionId}`}
                        className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full border border-[#1C1917] text-[#1C1917] hover:bg-[#1C1917] hover:text-[#FEF9EC] transition-colors"
                      >
                        Transcript
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}
