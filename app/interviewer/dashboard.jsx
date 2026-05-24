'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TABS = [
  { key: 'templates',   label: 'Templates'   },
  { key: 'assignments', label: 'Assignments' },
  { key: 'results',     label: 'Results'     },
];

function TabLink({ tab, current, count }) {
  const isActive = current === tab.key;
  return (
    <Link
      href={`/interviewer?tab=${tab.key}`}
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

function ToggleCheckbox({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-[#1C1917]"
      />
      <span className="text-[11px] tracking-wide text-[#1C1917]">{label}</span>
    </label>
  );
}

function NewTemplateForm({ onCreated }) {
  const [open, setOpen]                       = useState(false);
  const [name, setName]                       = useState('');
  const [role, setRole]                       = useState('');
  const [jd, setJd]                           = useState('');
  const [resume, setResume]                   = useState('');
  const [interviewType, setInterviewType]     = useState('Technical');
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [pressureMode, setPressureMode]       = useState(false);
  const [hinglishMode, setHinglishMode]       = useState(false);
  const [deepFollowups, setDeepFollowups]     = useState(false);
  const [busy, setBusy]                       = useState(false);
  const [err, setErr]                         = useState('');

  const canSubmit = name.trim() && role.trim() && jd.trim() && !busy;

  const reset = () => {
    setName(''); setRole(''); setJd(''); setResume('');
    setInterviewType('Technical'); setDurationMinutes(10);
    setPressureMode(false); setHinglishMode(false); setDeepFollowups(false);
    setErr('');
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, role, jobDescription: jd, resumeHighlights: resume,
          interviewType, durationMinutes,
          pressureMode, hinglishMode, deepFollowups,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      reset();
      setOpen(false);
      onCreated?.(data.template);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-dashed border-[#A89F92] hover:border-[#1C1917] hover:bg-white/40 transition-colors w-full py-8 text-sm text-[#78716C] hover:text-[#1C1917]"
      >
        + New template
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1C1917] bg-white/50 backdrop-blur-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-medium">New template</h3>
        <button onClick={() => { reset(); setOpen(false); }} className="text-xs text-[#78716C] hover:text-[#1C1917]">Cancel</button>
      </div>

      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Template name (e.g. Backend Engineer Q1)"
        className="w-full bg-transparent border border-[#DDD6C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1C1917]"
      />
      <input
        type="text"
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Role"
        className="w-full bg-transparent border border-[#DDD6C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1C1917]"
      />
      <textarea
        value={jd}
        onChange={(e) => setJd(e.target.value)}
        rows={4}
        placeholder="Job description"
        className="w-full bg-transparent border border-[#DDD6C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1C1917] resize-none"
      />
      <textarea
        value={resume}
        onChange={(e) => setResume(e.target.value)}
        rows={2}
        placeholder="Resume highlights (optional)"
        className="w-full bg-transparent border border-[#DDD6C8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1C1917] resize-none"
      />

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <p className="text-[9px] tracking-[0.28em] uppercase text-[#A89F92] font-semibold mb-1.5">Type</p>
          <div className="flex gap-1.5">
            {['HR', 'Technical', 'Mixed'].map((t) => (
              <button
                key={t}
                onClick={() => setInterviewType(t)}
                className={`px-3 py-1 rounded-full text-[10px] tracking-wide uppercase font-semibold border transition-colors ${
                  interviewType === t ? 'bg-[#1C1917] text-[#FEF9EC] border-[#1C1917]' : 'border-[#DDD6C8] text-[#78716C] hover:border-[#1C1917]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[9px] tracking-[0.28em] uppercase text-[#A89F92] font-semibold mb-1.5">Duration</p>
          <div className="flex gap-1.5">
            {[5, 10].map((d) => (
              <button
                key={d}
                onClick={() => setDurationMinutes(d)}
                className={`px-3 py-1 rounded-full text-[10px] tracking-wide uppercase font-semibold border transition-colors ${
                  durationMinutes === d ? 'bg-[#1C1917] text-[#FEF9EC] border-[#1C1917]' : 'border-[#DDD6C8] text-[#78716C] hover:border-[#1C1917]'
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
        <ToggleCheckbox label="Pressure mode" value={pressureMode} onChange={setPressureMode} />
        <ToggleCheckbox label="Hinglish" value={hinglishMode} onChange={setHinglishMode} />
        <ToggleCheckbox label="Deep follow-ups" value={deepFollowups} onChange={setDeepFollowups} />
      </div>

      {err && <p className="text-xs text-rose-600">{err}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={`px-5 py-2 text-xs font-semibold rounded-full ${
            canSubmit ? 'bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520]' : 'bg-[#DDD6C8] text-[#A89F92] cursor-not-allowed'
          }`}
        >
          {busy ? 'Creating…' : 'Create template'}
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({ templateId, onScheduled }) {
  const [emails, setEmails] = useState('candidate@silkhr.dev');
  const [busy, setBusy]     = useState(false);
  const [msg, setMsg]       = useState('');
  const [err, setErr]       = useState('');

  const submit = async () => {
    setBusy(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, csv: emails }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed');
      setMsg(`Scheduled ${data.count} candidate${data.count === 1 ? '' : 's'}`);
      setEmails('');
      onScheduled?.();
    } catch (e) {
      setErr(e.message);
    } finally { setBusy(false); }
  };

  const onCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setEmails((prev) => (prev ? `${prev}\n${text}` : text));
  };

  return (
    <div className="mt-3 rounded-lg bg-[#FEF9EC] border border-[#DDD6C8] p-3 space-y-2">
      <p className="text-[9px] tracking-[0.28em] uppercase text-[#A89F92] font-semibold">Schedule candidates</p>
      <textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        rows={2}
        placeholder="One email per line, or comma-separated"
        className="w-full bg-white/50 border border-[#DDD6C8] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#1C1917] resize-none"
      />
      <div className="flex items-center justify-between gap-3">
        <label className="text-[10px] text-[#78716C] cursor-pointer hover:text-[#1C1917]">
          + Upload CSV
          <input type="file" accept=".csv,text/csv,text/plain" onChange={onCsvUpload} className="hidden" />
        </label>
        <button
          onClick={submit}
          disabled={busy || !emails.trim()}
          className={`px-4 py-1.5 rounded-full text-[10px] tracking-wide uppercase font-semibold ${
            busy || !emails.trim() ? 'bg-[#DDD6C8] text-[#A89F92] cursor-not-allowed' : 'bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520]'
          }`}
        >
          {busy ? 'Scheduling…' : 'Schedule'}
        </button>
      </div>
      {msg && <p className="text-[11px] text-emerald-700">{msg}</p>}
      {err && <p className="text-[11px] text-rose-600">{err}</p>}
    </div>
  );
}

export default function InterviewerDashboard({ user }) {
  const params  = useSearchParams();
  const router  = useRouter();
  const tab     = params.get('tab') || 'templates';

  const [templates,   setTemplates]   = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [sessions,    setSessions]    = useState([]);
  const [loading,     setLoading]     = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [tplRes, asnRes, sesRes] = await Promise.all([
      fetch('/api/templates'),
      fetch('/api/assignments'),
      fetch('/api/sessions'),
    ]);
    const tpl = await tplRes.json();
    const asn = await asnRes.json();
    const ses = await sesRes.json();
    setTemplates(tpl.templates || []);
    setAssignments(asn.assignments || []);
    setSessions(ses.sessions || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const logout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
  };

  const counts = {
    templates:   templates.length,
    assignments: assignments.length,
    results:     sessions.length,
  };

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917]">

      <header className="border-b border-[#1C1917]/15">
        <div className="max-w-[1200px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              SilkHR
            </Link>
            <span className="text-[10px] tracking-widest uppercase text-[#A89F92]" style={{ fontFamily: 'var(--font-geist-mono)' }}>
              Interviewer · {user.name}
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
          {TABS.map((t) => <TabLink key={t.key} tab={t} current={tab} count={counts[t.key]} />)}
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-8 py-10">

        {tab === 'templates' && (
          <section className="space-y-3">
            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && templates.length === 0 && (
              <p className="text-sm text-[#78716C] mb-4">No templates yet. Create your first interview brief below.</p>
            )}
            {templates.map((tpl) => {
              const tplAsns = assignments.filter((a) => a.templateId === tpl._id);
              return (
                <div key={tpl._id} className="rounded-2xl border border-[#E8E0D0] bg-white/40 p-5">
                  <div className="flex items-start justify-between gap-4 mb-1">
                    <div className="min-w-0">
                      <h3 className="text-base font-medium truncate">{tpl.name}</h3>
                      <p className="text-xs text-[#78716C] mt-0.5">
                        {tpl.role} · {tpl.interviewType} · {tpl.durationMinutes} min
                        {tpl.pressureMode && ' · Pressure'}
                        {tpl.hinglishMode && ' · Hinglish'}
                        {tpl.deepFollowups && ' · Deep follow-ups'}
                      </p>
                    </div>
                    <span className="text-[10px] tracking-widest uppercase text-[#A89F92] flex-shrink-0">
                      {tplAsns.length} scheduled
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5650] mt-2 line-clamp-2">{tpl.jobDescription}</p>
                  <ScheduleForm templateId={tpl._id} onScheduled={refresh} />
                </div>
              );
            })}
            <NewTemplateForm onCreated={refresh} />
          </section>
        )}

        {tab === 'assignments' && (
          <section className="space-y-2">
            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && assignments.length === 0 && (
              <p className="text-sm text-[#78716C]">No assignments yet. Schedule candidates from the Templates tab.</p>
            )}
            {assignments.map((asn) => {
              const tpl = templates.find((t) => t._id === asn.templateId);
              return (
                <div key={asn._id} className="rounded-xl border border-[#E8E0D0] bg-white/40 px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-medium truncate">{asn.candidateEmail}</p>
                      <StatusPill status={asn.status} />
                      {asn.status === 'completed' && (
                        <span className={`text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${
                          asn.released ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {asn.released ? 'Released' : 'Held'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#78716C]">
                      {tpl?.name || 'Unknown template'} · {tpl?.role || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {asn.status === 'completed' && asn.sessionId && (
                      <>
                        <Link href={`/feedback/${asn.sessionId}`} className="text-[10px] tracking-widest uppercase text-[#1C1917] hover:underline">
                          Open
                        </Link>
                        <ReleaseToggle assignment={asn} onChange={refresh} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {tab === 'results' && (
          <section className="space-y-2">
            {loading && <p className="text-xs text-[#A89F92]">Loading…</p>}
            {!loading && sessions.length === 0 && (
              <p className="text-sm text-[#78716C]">No completed interviews to review yet.</p>
            )}
            {sessions.map((s) => {
              const asn = assignments.find((a) => a.sessionId === s.sessionId);
              return (
                <div key={s.sessionId} className="rounded-xl border border-[#E8E0D0] bg-white/40 px-5 py-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.config?.role || 'Interview'}</p>
                    <p className="text-[11px] text-[#78716C] mt-0.5">
                      {s.turnCount} turn{s.turnCount === 1 ? '' : 's'} · {s.kind === 'scheduled' ? 'Scheduled' : 'Mock'}
                      {asn && ` · ${asn.candidateEmail}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Link href={`/transcript/${s.sessionId}`} className="text-[10px] tracking-widest uppercase text-[#A89F92] hover:text-[#1C1917]">
                      Transcript
                    </Link>
                    <Link href={`/feedback/${s.sessionId}`} className="text-[10px] tracking-widest uppercase font-semibold text-[#1C1917] hover:underline">
                      Feedback →
                    </Link>
                    {asn && asn.status === 'completed' && <ReleaseToggle assignment={asn} onChange={refresh} />}
                  </div>
                </div>
              );
            })}
          </section>
        )}

      </main>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    pending:     { label: 'Pending',     bg: 'bg-[#E8E0D0]', text: 'text-[#5C5650]' },
    in_progress: { label: 'In progress', bg: 'bg-amber-100',  text: 'text-amber-800' },
    completed:   { label: 'Completed',   bg: 'bg-[#1C1917]',  text: 'text-[#FEF9EC]' },
  };
  const m = map[status] || map.pending;
  return <span className={`text-[9px] tracking-widest uppercase font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>{m.label}</span>;
}

function ReleaseToggle({ assignment, onChange }) {
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    setBusy(true);
    try {
      await fetch(`/api/assignments/${assignment._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ released: !assignment.released }),
      });
      onChange?.();
    } finally { setBusy(false); }
  };
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`text-[10px] tracking-widest uppercase font-semibold px-3 py-1 rounded-full border transition-colors ${
        assignment.released
          ? 'border-emerald-700 text-emerald-700 hover:bg-emerald-700 hover:text-white'
          : 'border-[#F0B96B] text-[#9C7330] hover:bg-[#F0B96B] hover:text-[#0F0D0B]'
      }`}
    >
      {busy ? '...' : assignment.released ? 'Hold' : 'Release'}
    </button>
  );
}
