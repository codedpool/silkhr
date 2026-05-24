import Link from 'next/link';
import { Fraunces } from 'next/font/google';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

const serif = { fontFamily: 'var(--font-fraunces)' };
const mono  = { fontFamily: 'var(--font-geist-mono)' };

export default function LandingPage() {
  return (
    <div
      className={`${fraunces.variable} min-h-screen bg-[#FEF9EC] text-[#1C1917] selection:bg-[#1C1917] selection:text-[#FEF9EC]`}
    >
      {/* Staggered hero reveal — restrained, magazine-like */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeUp {
              from { opacity: 0; transform: translateY(14px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            .fade-up-1 { animation: fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1)  80ms both; }
            .fade-up-2 { animation: fadeUp 800ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both; }
            .fade-up-3 { animation: fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) 360ms both; }
            .fade-up-4 { animation: fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) 520ms both; }
            .fade-up-5 { animation: fadeUp 700ms cubic-bezier(0.16, 1, 0.3, 1) 680ms both; }
          `,
        }}
      />

      {/* ─── MASTHEAD ─────────────────────────────────────────────── */}
      <header className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="text-[11px] tracking-[0.32em] uppercase"
            style={mono}
          >
            SilkHR
          </Link>

          <div
            className="hidden md:flex items-center gap-5 text-[10px] tracking-[0.28em] uppercase text-[#78716C]"
            style={mono}
          >
            <span>Vol. I</span>
            <span className="w-px h-3 bg-[#DDD6C8]" />
            <span>An AI Voice Interviewer</span>
            <span className="w-px h-3 bg-[#DDD6C8]" />
            <span>MMXXVI</span>
          </div>

          <Link
            href="/login"
            className="group inline-flex items-center gap-2 text-[11px] tracking-[0.28em] uppercase hover:text-[#F0B96B] transition-colors"
            style={mono}
          >
            <span>Log in</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        </div>
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 pt-24 pb-32 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-2 fade-up-1">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#78716C] pt-6"
              style={mono}
            >
              No. 01 · Cover
            </p>
          </div>

          <div className="col-span-12 md:col-span-10">
            <h1
              className="text-[clamp(72px,9vw,132px)] leading-[0.94] tracking-[-0.04em] font-medium fade-up-2"
              style={serif}
            >
              An interviewer
              <br />
              that actually
              <br />
              <em className="italic font-normal">
                listens<span className="text-[#F0B96B]">.</span>
              </em>
            </h1>

            <p className="mt-12 max-w-2xl text-[18px] leading-[1.55] text-[#1C1917]/85 fade-up-3">
              SilkHR runs adaptive voice interviews that don&apos;t sound borrowed
              from a chatbot. Native Hinglish. Real follow-ups. A
              second-opinion read on every answer.
            </p>

            <div className="mt-14 flex flex-wrap items-center gap-4 fade-up-4">
              <Link
                href="/login?role=interviewer"
                className="group inline-flex items-center gap-3 bg-[#1C1917] text-[#FEF9EC] px-8 py-4 text-[14px] tracking-[0.04em] hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgba(28,25,23,0.45)] transition-all duration-200"
              >
                <span>I&apos;m hiring</span>
                <span className="text-[#F0B96B] group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </Link>
              <Link
                href="/login?role=candidate"
                className="group inline-flex items-center gap-3 border border-[#1C1917] text-[#1C1917] px-8 py-4 text-[14px] tracking-[0.04em] hover:bg-[#1C1917] hover:text-[#FEF9EC] hover:-translate-y-0.5 transition-all duration-200"
              >
                <span>I&apos;m interviewing</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>

            <p
              className="mt-12 text-[10px] tracking-[0.32em] uppercase text-[#A89F92] fade-up-5"
              style={mono}
            >
              <span className="text-[#F0B96B] mr-2">●</span>
              Powered by Deepgram · Gemini · Silk muga
            </p>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 py-28 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-2">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#78716C]"
              style={mono}
            >
              Departments
            </p>
          </div>

          <div className="col-span-12 md:col-span-10">
            <h2
              className="text-[clamp(36px,4vw,56px)] leading-[1.04] tracking-[-0.025em] max-w-2xl"
              style={serif}
            >
              Three things it does that the others{' '}
              <em className="italic">don&apos;t.</em>
            </h2>

            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-x-10 gap-y-12">
              {[
                {
                  no: '01',
                  label: 'Live Voice',
                  title: 'Streams while speaking.',
                  body:
                    'Silk muga emits audio as the model generates it. No long pause between turns — the interviewer just talks back, right when you’d expect.',
                },
                {
                  no: '02',
                  label: 'Code-switch',
                  title: 'Hinglish, properly.',
                  body:
                    'Romanised Hindi mixed with English, voiced by a model trained on it. “Acha, thoda specifics share karo.” Not stitched, not stilted.',
                },
                {
                  no: '03',
                  label: 'The Read-out',
                  title: 'Scores you can act on.',
                  body:
                    'Clarity, specificity, confidence, structure — graded one to five. Plus three sharp improvements and rewritten answers for the worst moments.',
                },
              ].map((item) => (
                <div key={item.no} className="flex flex-col">
                  <div className="border-t-2 border-[#1C1917] pt-6 mb-8 flex items-baseline gap-4">
                    <span
                      className="text-[44px] leading-none font-medium tabular-nums"
                      style={serif}
                    >
                      {item.no}
                    </span>
                    <span
                      className="text-[10px] tracking-[0.28em] uppercase text-[#78716C]"
                      style={mono}
                    >
                      {item.label}
                    </span>
                  </div>

                  <h3
                    className="text-[28px] leading-[1.12] tracking-[-0.015em] mb-4"
                    style={serif}
                  >
                    {item.title}
                  </h3>

                  <p className="text-[15px] leading-[1.65] text-[#1C1917]/75">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOR HIRING TEAMS ─────────────────────────────────────── */}
      <section className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 py-28 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-2">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#78716C]"
              style={mono}
            >
              Dept. A
            </p>
          </div>

          <div className="col-span-12 md:col-span-6">
            <p
              className="text-[11px] tracking-[0.32em] uppercase text-[#78716C] mb-6"
              style={mono}
            >
              For the hiring side
            </p>
            <h2
              className="text-[clamp(40px,4.5vw,64px)] leading-[1.02] tracking-[-0.03em]"
              style={serif}
            >
              Build a brief. Upload your shortlist. Read the{' '}
              <em className="italic">tape.</em>
            </h2>
            <p className="mt-10 max-w-xl text-[17px] leading-[1.65] text-[#1C1917]/80">
              Configure the role, the JD, and the tone. Drop in a CSV of
              candidates. The AI handles every screen. You review the
              transcripts at your pace — and decide, per candidate, what
              they&apos;re allowed to see back.
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 md:pl-12 md:border-l md:border-[#1C1917]/15 mt-8 md:mt-2">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#A89F92] mb-8"
              style={mono}
            >
              The Workflow
            </p>
            <ol className="space-y-7">
              {[
                'Compose the brief',
                'Schedule from CSV',
                'Review · Release · Hold',
              ].map((step, i) => (
                <li key={step} className="flex items-baseline gap-5">
                  <span
                    className="text-[11px] tracking-[0.28em] uppercase text-[#A89F92] tabular-nums w-10 flex-shrink-0"
                    style={mono}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[20px] leading-tight" style={serif}>
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ─── FOR CANDIDATES ───────────────────────────────────────── */}
      <section className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 py-28 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-2">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#78716C]"
              style={mono}
            >
              Dept. B
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 md:pr-12 md:border-r md:border-[#1C1917]/15 order-2 md:order-none">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#A89F92] mb-8"
              style={mono}
            >
              What you&apos;ll do
            </p>
            <ul className="space-y-7">
              {[
                ['Take what’s scheduled.', 'Real interviews land in your queue.'],
                ['Practice on your own.', 'Mock the role you want, on your time.'],
                ['Get the read-out.', 'See exactly what an interviewer would.'],
              ].map(([title, sub], i) => (
                <li key={title} className="border-l-2 border-[#1C1917] pl-6">
                  <p
                    className="text-[10px] tracking-[0.32em] uppercase text-[#A89F92] mb-1.5 tabular-nums"
                    style={mono}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <p className="text-[20px] leading-snug" style={serif}>
                    {title}
                  </p>
                  <p className="text-[13px] leading-[1.5] text-[#78716C] mt-1.5">
                    {sub}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-12 md:col-span-6 order-1 md:order-none">
            <p
              className="text-[11px] tracking-[0.32em] uppercase text-[#78716C] mb-6"
              style={mono}
            >
              For the other side of the desk
            </p>
            <h2
              className="text-[clamp(40px,4.5vw,64px)] leading-[1.02] tracking-[-0.03em]"
              style={serif}
            >
              Practice <em className="italic">until</em> the room shrinks.
            </h2>
            <p className="mt-10 max-w-xl text-[17px] leading-[1.65] text-[#1C1917]/80">
              Run mock interviews any time, any role. The voice is the same
              one real recruiters use. The follow-ups push back on vague
              answers and reward specific ones — until you stop noticing the
              AI.
            </p>
          </div>
        </div>
      </section>

      {/* ─── CLOSING CTA ──────────────────────────────────────────── */}
      <section className="border-b border-[#1C1917]/15">
        <div className="max-w-[1400px] mx-auto px-10 pt-28 pb-32 grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-2">
            <p
              className="text-[10px] tracking-[0.32em] uppercase text-[#78716C]"
              style={mono}
            >
              Coda
            </p>
          </div>

          <div className="col-span-12 md:col-span-10">
            <h2
              className="text-[clamp(120px,16vw,220px)] leading-[0.86] tracking-[-0.055em] font-medium"
              style={serif}
            >
              <em className="italic font-normal">
                Begin<span className="text-[#F0B96B]">.</span>
              </em>
            </h2>

            <Link
              href="/login"
              className="group mt-16 inline-flex items-center gap-4 bg-[#1C1917] text-[#FEF9EC] px-10 py-5 text-[15px] tracking-[0.04em] hover:-translate-y-0.5 hover:shadow-[0_18px_38px_-12px_rgba(28,25,23,0.5)] transition-all duration-200"
            >
              <span>Try it now</span>
              <span className="text-[#F0B96B] group-hover:translate-x-1.5 transition-transform">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────── */}
      <footer>
        <div
          className="max-w-[1400px] mx-auto px-10 py-7 flex items-center justify-between text-[10px] tracking-[0.32em] uppercase text-[#A89F92]"
          style={mono}
        >
          <p className="text-[#1C1917]">SilkHR</p>
          <p>Built at Rumik × AWS Voice Hackathon</p>
          <p>End of Issue</p>
        </div>
      </footer>
    </div>
  );
}
