'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SAMPLE_JD = `We're looking for a Backend Engineer to join our platform team. You'll design and build high-throughput APIs, own reliability for core services, and collaborate with the data team on pipeline architecture.

Requirements: 2+ years with Node.js, Go, or Python. Experience with PostgreSQL and Redis. Familiarity with distributed systems.`;

const TOGGLES = [
  { key: 'pressure',      label: 'Pressure',       hint: 'Pushes back on vague answers' },
  { key: 'hinglish',      label: 'Hinglish',       hint: 'Natural code-switching'        },
  { key: 'deepFollowups', label: 'Deep follow-ups', hint: 'Drills weak answers harder'   },
];

function Toggle({ label, hint, value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`text-left px-3 py-3 rounded-xl border transition-all duration-200 ${
        value ? 'bg-[#1C1917] border-[#1C1917]' : 'bg-transparent border-[#DDD6C8] hover:border-[#A89F92]'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[10px] font-semibold tracking-widest uppercase ${value ? 'text-[#FEF9EC]' : 'text-[#1C1917]'}`}>
          {label}
        </span>
        <div className={`w-7 h-[15px] rounded-full relative transition-colors duration-200 flex-shrink-0 ${value ? 'bg-[#5C5650]' : 'bg-[#DDD6C8]'}`}>
          <div className={`absolute top-[2px] w-[11px] h-[11px] rounded-full bg-white shadow-sm transition-all duration-200 ${value ? 'left-[14px]' : 'left-[2px]'}`} />
        </div>
      </div>
      <p className={`text-[10px] leading-relaxed ${value ? 'text-[#8C8278]' : 'text-[#A89F92]'}`}>{hint}</p>
    </button>
  );
}

function Pill({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-all duration-150 border ${
        selected
          ? 'bg-[#1C1917] text-[#FEF9EC] border-[#1C1917]'
          : 'bg-transparent text-[#78716C] border-[#DDD6C8] hover:border-[#A89F92] hover:text-[#1C1917]'
      }`}
    >
      {label}
    </button>
  );
}

export default function NewMockPage() {
  const router = useRouter();
  const [role, setRole]                   = useState('');
  const [jd, setJd]                       = useState('');
  const [resume, setResume]               = useState('');
  const [interviewType, setInterviewType] = useState('Technical');
  const [duration, setDuration]           = useState(10);
  const [toggles, setToggles]             = useState({ pressure: false, hinglish: false, deepFollowups: false });
  const [starting, setStarting]           = useState(false);
  const [startError, setStartError]       = useState('');

  const setToggle = (key) => (val) => setToggles((prev) => ({ ...prev, [key]: val }));
  const handleSampleJD = () => { setRole('Backend Engineer'); setJd(SAMPLE_JD); };
  const canStart = role.trim().length > 0 && jd.trim().length > 0 && !starting;

  const handleStart = async () => {
    if (!canStart) return;
    setStarting(true);
    setStartError('');
    try {
      const res = await fetch('/api/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          jobDescription: jd,
          resumeHighlights: resume,
          interviewType,
          durationMinutes: duration,
          ...toggles,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start');
      router.push(`/interview/${data.sessionId}`);
    } catch (err) {
      setStartError(err.message || 'Something went wrong');
      setStarting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FEF9EC] overflow-hidden">

      <header className="flex-shrink-0 px-8 py-4 flex items-center justify-between">
        <Link href="/candidate" className="text-[#1C1917] tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          SilkHR
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/candidate" className="text-[10px] tracking-widest uppercase text-[#A89F92] hover:text-[#1C1917] transition-colors">
            ← Dashboard
          </Link>
          <span className="text-[10px] tracking-widest uppercase text-[#A89F92]">New mock interview</span>
        </div>
      </header>

      <div className="flex-shrink-0 border-t border-[#E8E0D0] mx-8" />

      <main className="flex-1 flex flex-col max-w-lg w-full mx-auto px-6 pt-7 pb-6 min-h-0">

        <div className="flex-shrink-0 mb-6">
          <h1 className="text-2xl font-medium text-[#1C1917] tracking-tight">Configure your session</h1>
          <p className="text-xs text-[#A89F92] mt-1">Takes under a minute. The AI does the rest.</p>
        </div>

        <div className="flex-1 flex flex-col gap-4 min-h-0">

          <div className="flex-shrink-0">
            <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-1.5 font-semibold">Role</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Backend Engineer"
              className="w-full bg-transparent border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#C8BFAF] focus:outline-none focus:border-[#1C1917] transition-colors"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-1.5 font-semibold">Job Description</label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={3}
              placeholder="Paste the job description..."
              className="w-full bg-transparent border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#C8BFAF] focus:outline-none focus:border-[#1C1917] transition-colors resize-none"
            />
          </div>

          <div className="flex-shrink-0">
            <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-1.5 font-semibold">
              Resume Highlights <span className="normal-case tracking-normal font-normal text-[#C8BFAF]">— optional</span>
            </label>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={2}
              placeholder="Key projects, skills, or context..."
              className="w-full bg-transparent border border-[#DDD6C8] rounded-xl px-3.5 py-2.5 text-sm text-[#1C1917] placeholder:text-[#C8BFAF] focus:outline-none focus:border-[#1C1917] transition-colors resize-none"
            />
          </div>

          <div className="flex-shrink-0 flex gap-8 items-start">
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-2 font-semibold">Type</label>
              <div className="flex gap-1.5">
                {['HR', 'Technical', 'Mixed'].map((t) => (
                  <Pill key={t} label={t} selected={interviewType === t} onClick={() => setInterviewType(t)} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-2 font-semibold">Duration</label>
              <div className="flex gap-1.5">
                {[5, 10].map((d) => (
                  <Pill key={d} label={`${d} min`} selected={duration === d} onClick={() => setDuration(d)} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-shrink-0">
            <label className="block text-[10px] tracking-widest uppercase text-[#A89F92] mb-2 font-semibold">Behaviour</label>
            <div className="grid grid-cols-3 gap-2.5">
              {TOGGLES.map(({ key, label, hint }) => (
                <Toggle key={key} label={label} hint={hint} value={toggles[key]} onChange={setToggle(key)} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 mt-5 space-y-2.5">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-3.5 rounded-2xl text-sm font-semibold tracking-wide transition-all duration-150 ${
              canStart
                ? 'bg-[#1C1917] text-[#FEF9EC] hover:bg-[#2C2520] cursor-pointer'
                : 'bg-[#DDD6C8] text-[#A89F92] cursor-not-allowed'
            }`}
          >
            {starting ? 'Preparing your interviewer…' : 'Start Interview →'}
          </button>
          {startError && (
            <p className="text-[11px] text-red-600 text-center">{startError}</p>
          )}
          <button
            onClick={handleSampleJD}
            className="w-full border border-[#DDD6C8] text-[#78716C] py-3 rounded-2xl text-sm font-medium hover:border-[#A89F92] hover:text-[#1C1917] transition-all duration-150"
          >
            Use sample JD
          </button>
        </div>

      </main>
    </div>
  );
}
