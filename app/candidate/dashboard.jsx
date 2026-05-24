'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'mock',      label: 'Mock practice' },
  { key: 'results',   label: 'Results' },
];

function TabLink({ tab, current, count }) {
  const isActive = current === tab.key;
  return (
    <Link
      href={`/candidate?tab=${tab.key}`}
      scroll={false}
      className={`px-4 py-2 text-[10px] tracking-[0.28em] uppercase font-semibold transition-colors ${
        isActive ? 'text-[#1C1917] border-b-2 border-[#1C1917]' : 'text-[#A89F92] hover:text-[#1C1917] border-b-2 border-transparent'
      }`}
      style={{ fontFamily: 'var(--font-geist-mono)' }}
    >
      {tab.label}{typeof count === 'number' ? ` · ${count}` : ''}
    </Link>
  );
}

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
  return new Date(ts).toLocaleDateString();
}

function TakeButton({ assignmentId, status, sessionId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (status === 'in_progress' && sessionId) {
    return (
      <Link href={`/interview/${sessionId}`} className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full bg-amber-500 text-[#0F0D0B] hover:bg-amber-400 transition-colors">
        Resume →
      </Link>
    );
  }

  if (status === 'completed') {
    return <span className="text-[10px] tracking-widest uppercase font-semibold text-[#78716C]">Awaiting review</span>;
  }

  const start = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        // If already completed, jump straight to feedback
        if (data?.sessionId) { router.push(`/feedback/${data.sessionId}`); return; }
        throw new Error(data?.error || 'Failed to start');
      }
      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  };

  return (
    <button
      onClick={start}
      disabled={busy}
      className="text-[10px] tracking-widest uppercase font-semibold px-3 py-1.5 rounded-full bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520] transition-colors disabled:opacity-60"
    >
      {busy ? 'Starting…' : 'Take interview →'}
    </button>
  );
}

export default function CandidateDashboard({ user }) {
  const params = useSearchParams();
  const router = useRouter();
  const tab    = params.get('tab') || 'scheduled';

  const [assignments, setAssignments] = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [templates,   setTemplates]   = useState({}); // map id → name (for assignment labels)
  const [loading,     setLoading]     = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [asnRes, sesRes] = await Promise.all([
      fetch('/api/assignments'),
      fetch('/api/sessions'),
    ]);
    const asn = await asnRes.json();
    const ses = await sesRes.json();
    setAssignments(asn.assignments || []);
    setSessions(ses.sessions || []);

    // Best-effort: try to look up template details per assignment (candidates can't list all templates but the assignment carries enough for now)
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  const pendingAsns = assignments.filter((a) => a.status !== 'completed' || !a.released);
  const mockSessions      = sessions.filter((s) => s.kind === 'mock');
  const releasedResults   = sessions.filter((s) => s.kind === 'mock' || s.released);

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917]">

      <header className="border-b border-[#1C1917]/15">
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              SilkHR
            </Link>
            <span className="text-[10px] tracking-widest uppercase text-[#A89F92]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Candidate · {user.name}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-[10px] tracking-widest uppercase text-[#A89F92] hover:text-[#1C1917] transition-colors"
            style={{ fontFamily: 'var(--font-geist-mono)' }}
          >
            Sign out →
          </button>
        </div>
        <div className="max-w-[1200px] mx-auto px-8 flex gap-2">
          {TABS.map((t) => (
            <TabLink
              key={t.key}
              tab={t}
              current={tab}
              count={
                t.key === 'scheduled' ? pendingAsns.length :
                t.key === 'mock'      ? mockSessions.length :
                releasedResults.length
              }
            />
          ))}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-10">

        {tab === 'scheduled' && (
          <section className="space-y-2">
            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && assignments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DDD6C8] px-6 py-12 text-center">
                <p className="text-sm text-[#78716C]">No interviews scheduled for you yet.</p>
                <p className="text-[11px] text-[#A89F92] mt-2">When an interviewer assigns you one, it&apos;ll appear here.</p>
                <Link href="/candidate?tab=mock" className="mt-4 inline-block text-xs underline text-[#1C1917]">Try a mock interview instead →</Link>
              </div>
            )}
            {assignments.map((asn) => (
              <div key={asn._id} className="rounded-xl border border-[#E8E0D0] bg-white/40 px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    Interview · <span className="text-[#78716C] font-normal">scheduled for you</span>
                  </p>
                  <p className="text-[11px] text-[#78716C] mt-0.5">
                    {asn.status === 'completed'
                      ? (asn.released ? 'Released by interviewer' : 'Awaiting interviewer review')
                      : `${formatRelative(asn.createdAt)} · ${asn.status}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {asn.status === 'completed' && asn.released && asn.sessionId && (
                    <Link href={`/feedback/${asn.sessionId}`} className="text-[10px] tracking-widest uppercase font-semibold text-[#1C1917] hover:underline">
                      View result →
                    </Link>
                  )}
                  {asn.status !== 'completed' && (
                    <TakeButton assignmentId={asn._id} status={asn.status} sessionId={asn.sessionId} />
                  )}
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'mock' && (
          <section className="space-y-3">
            <div className="flex items-end justify-between mb-3">
              <p className="text-sm text-[#78716C]">Practice on your own — any role, any time. Same voice and feedback engine as scheduled interviews.</p>
              <Link
                href="/mock/new"
                className="text-[10px] tracking-widest uppercase font-semibold px-4 py-2 rounded-full bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520] transition-colors"
              >
                + New mock
              </Link>
            </div>

            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && mockSessions.length === 0 && (
              <div className="rounded-2xl border border-dashed border-[#DDD6C8] px-6 py-12 text-center">
                <p className="text-sm text-[#78716C]">No mock interviews yet.</p>
                <Link href="/mock/new" className="mt-3 inline-block text-xs underline text-[#1C1917]">Start your first one →</Link>
              </div>
            )}
            {mockSessions.map((s) => (
              <div key={s.sessionId} className="rounded-xl border border-[#E8E0D0] bg-white/40 px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.config?.role || 'Mock interview'}</p>
                  <p className="text-[11px] text-[#78716C] mt-0.5">
                    {s.config?.interviewType} · {s.config?.durationMinutes} min · {s.turnCount} turn{s.turnCount === 1 ? '' : 's'} · {formatRelative(s.updatedAt || s.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link href={`/transcript/${s.sessionId}`} className="text-[10px] tracking-widest uppercase text-[#A89F92] hover:text-[#1C1917]">
                    Transcript
                  </Link>
                  <Link href={s.status === 'completed' ? `/feedback/${s.sessionId}` : `/interview/${s.sessionId}`} className="text-[10px] tracking-widest uppercase font-semibold text-[#1C1917] hover:underline">
                    {s.status === 'completed' ? 'Feedback →' : 'Resume →'}
                  </Link>
                </div>
              </div>
            ))}
          </section>
        )}

        {tab === 'results' && (
          <section className="space-y-2">
            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && releasedResults.length === 0 && (
              <p className="text-sm text-[#78716C]">No results visible yet. Released scheduled interviews and your mocks will appear here.</p>
            )}
            {releasedResults.map((s) => (
              <Link
                key={s.sessionId}
                href={`/feedback/${s.sessionId}`}
                className="block rounded-xl border border-[#E8E0D0] bg-white/40 hover:border-[#A89F92] transition-colors px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <p className="text-sm font-medium truncate">{s.config?.role || 'Interview'}</p>
                      <span className={`text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${
                        s.kind === 'scheduled'
                          ? 'bg-[#1C1917] text-[#FEF9EC]'
                          : 'border border-[#DDD6C8] text-[#78716C]'
                      }`}>
                        {s.kind === 'scheduled' ? 'Scheduled' : 'Mock'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      {s.config?.interviewType} · {s.turnCount} turn{s.turnCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-[10px] tracking-widest uppercase text-[#A89F92] font-mono">
                    {formatRelative(s.updatedAt || s.createdAt)}
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}

      </main>
    </div>
  );
}
