'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';

const DIMENSIONS = [
  { key: 'clarity',     label: 'Clarity'     },
  { key: 'specificity', label: 'Specificity' },
  { key: 'confidence',  label: 'Confidence'  },
  { key: 'structure',   label: 'Structure'   },
];

function ScoreCard({ label, score }) {
  const pct = Math.max(0, Math.min(5, score)) / 5;
  return (
    <div className="rounded-2xl border border-[#E8E0D0] bg-white/40 backdrop-blur-sm px-5 py-4">
      <div className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-2">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-medium text-[#1C1917] tracking-tight">{score.toFixed(1)}</span>
        <span className="text-xs text-[#A89F92]">/5</span>
      </div>
      <div className="mt-3 h-1 rounded-full bg-[#E8E0D0] overflow-hidden">
        <div className="h-full bg-[#1C1917] transition-all duration-700" style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Bullet({ children }) {
  return (
    <li className="flex gap-3 text-sm leading-relaxed text-[#1C1917]">
      <span className="flex-shrink-0 mt-1.5 w-1 h-1 rounded-full bg-[#1C1917]" />
      <span>{children}</span>
    </li>
  );
}

export default function FeedbackPage({ params }) {
  const { sessionId } = use(params);
  const [data, setData]   = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/feedback/${sessionId}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || 'Failed to load feedback');
        if (!cancelled) setData(json);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [sessionId]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FEF9EC] gap-3 px-6">
        <p className="text-sm text-[#1C1917]">Couldn't load feedback.</p>
        <p className="text-xs text-[#A89F92] text-center max-w-md">{error}</p>
        <Link href="/" className="text-xs underline text-[#1C1917]">Back to setup</Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FEF9EC]">
        <p className="text-[10px] tracking-widest uppercase text-[#A89F92]">Writing your feedback…</p>
      </div>
    );
  }

  const { config, history, feedback } = data;

  return (
    <div className="min-h-screen bg-[#FEF9EC] text-[#1C1917]">

      <header className="px-8 py-5 flex items-center justify-between border-b border-[#E8E0D0]">
        <Link href="/" className="tracking-[0.25em] text-xs uppercase" style={{ fontFamily: 'var(--font-geist-mono)' }}>
          SilkHR
        </Link>
        <div className="flex items-center gap-5 text-[10px] tracking-widest uppercase">
          <Link href="/history" className="text-[#A89F92] hover:text-[#1C1917] transition-colors">History</Link>
          <span className="text-[#A89F92]">Feedback</span>
          <Link href={`/transcript/${sessionId}`} className="text-[#A89F92] hover:text-[#1C1917] transition-colors">Transcript</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-10">

        <div>
          <p className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-2">
            {config.role} · {config.interviewType} · {config.durationMinutes} min
          </p>
          <h1 className="text-3xl font-medium tracking-tight">How you did</h1>
          {feedback.summary && (
            <p className="mt-3 text-base leading-relaxed text-[#5C5650] max-w-2xl">{feedback.summary}</p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIMENSIONS.map((d) => (
            <ScoreCard key={d.key} label={d.label} score={feedback.scores?.[d.key] || 0} />
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          <Section title="Strengths">
            <ul className="space-y-2.5">
              {(feedback.strengths || []).map((s, i) => <Bullet key={i}>{s}</Bullet>)}
            </ul>
          </Section>
          <Section title="What to sharpen">
            <ul className="space-y-2.5">
              {(feedback.improvements || []).map((s, i) => <Bullet key={i}>{s}</Bullet>)}
            </ul>
          </Section>
        </div>

        {feedback.examples && feedback.examples.length > 0 && (
          <Section title="Even better answers">
            <div className="space-y-4">
              {feedback.examples.map((ex, i) => (
                <div key={i} className="rounded-2xl border border-[#E8E0D0] bg-white/40 backdrop-blur-sm p-5">
                  <p className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-1.5">Question</p>
                  <p className="text-sm text-[#1C1917] mb-3">{ex.originalQuestion}</p>
                  {ex.yourAnswerSummary && (
                    <>
                      <p className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-1.5">You said</p>
                      <p className="text-sm text-[#78716C] mb-3 italic">"{ex.yourAnswerSummary}"</p>
                    </>
                  )}
                  <p className="text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-1.5">Try this instead</p>
                  <p className="text-sm text-[#1C1917] leading-relaxed">{ex.improvedAnswer}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Full transcript">
          <div className="space-y-3">
            {(history || []).map((h, i) => (
              <div key={i} className="rounded-xl border border-[#E8E0D0] p-4">
                <div className="flex items-center justify-between text-[10px] tracking-widest uppercase text-[#A89F92] font-semibold mb-2">
                  <span>{h.isFollowup ? 'Follow-up' : `Q${i + 1}`}</span>
                  {h.analysisTags?.length > 0 && (
                    <span className="text-[#C8BFAF] normal-case tracking-normal">{h.analysisTags.join(' · ')}</span>
                  )}
                </div>
                <p className="text-sm text-[#1C1917] mb-2">{h.question.replace(/^\[[a-z]+\]\s*/i, '')}</p>
                <p className="text-sm text-[#78716C] italic">{h.transcript || '(no answer)'}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 rounded-2xl bg-[#1C1917] text-[#FEF9EC] text-sm font-semibold tracking-wide hover:bg-[#2C2520] transition-colors"
          >
            New interview
          </Link>
        </div>

      </main>
    </div>
  );
}
