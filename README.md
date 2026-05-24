# SilkHR

> An AI voice interviewer that sounds like a person, not a bot. Native Hinglish, adaptive follow-ups, scheduled screens for recruiters, and unlimited mock practice for candidates.

Built at the **Rumik × AWS Voice AI Hackathon** (May 2026).

---

## The problem

Indian hiring teams spend an absurd amount of time on phone screens. A senior recruiter at a 200-person startup runs 40+ screens a week — same questions, similar answers, no leverage. Existing "AI interviewer" tools have three problems that keep them stuck in pilots:

1. **They sound robotic.** Synthesised English voices that read questions like a teleprompter. Candidates either talk down to them or freeze. Either way, the signal is bad.
2. **They don't speak how candidates speak.** Most Indian engineers slip between English and Hindi within the same sentence — `"Acha, toh main usko optimise karne ke liye redis cache lagaya"`. An English-only bot turns that into garbage transcripts and shallow follow-ups.
3. **Candidates can't practice.** The same tools that screen candidates aren't available *to* candidates. So the prep market is YouTube videos and mock-interview Discords, neither of which simulate the real thing.

## The solution

A two-sided voice platform built on three best-in-class voice models, glued together with a turn-by-turn pipeline that streams on both ends:

- **STT:** Deepgram Nova-3 with `language: 'multi'` — handles Hinglish code-switching without a separate language toggle.
- **Brain:** Gemini 2.x Flash, prompted to behave like an Indian recruiter — short conversational lines, pressure mode for skeptical drilling, deep-follow-up mode for chasing vague answers.
- **TTS:** [Silk muga](https://muga.silk.ai) — a Hinglish emotion-TTS model that supports tone markers (`[neutral]`, `[happy]`) and inline events (` <sigh> `, ` <chuckle> `). Streams PCM at 24kHz, first audio in under a second.

Two distinct users:

- **Interviewer (Maya)** — builds interview templates (role, JD, resume highlights, pressure / Hinglish / follow-up toggles), bulk-assigns candidates via comma- or newline-separated email list, reviews completed transcripts + scored feedback, and explicitly **releases** results to candidates (default: held).
- **Candidate (Aarav)** — sees scheduled interviews on their dashboard, takes them in-browser with webcam + mic, OR runs ad-hoc **mock interviews** customised to whatever role they're prepping for. Feedback for mocks is always visible; scheduled feedback only unlocks after the recruiter releases it.

---

## How it works

```
Browser                                Next.js API                Models
───────                                ───────────                ──────
mic ──── stream WebM/Opus ─►  Deepgram WS  ────► partial transcripts
                                    │
                                    └─► final transcript ──► /api/answer
                                                                  │
                                                                  ├─► Gemini (eval + next line, strict JSON)
                                                                  │       └─► nextQuestion, isFollowup, isComplete
                                                                  │
                                                                  └─► /api/voice  ─► Silk muga WS-connect (mint token)
                                                                          │
                                                       ┌──────────────────┘
                                                       ▼
                  speakers ◄── PCM Int16 @ 24kHz ◄── muga WS (streams as it generates)
```

Per-turn latency on a warm pipeline:

| Stage                                | Typical |
| ------------------------------------ | ------- |
| Final STT after candidate stops      | ~400 ms |
| Gemini eval + next-line              | ~1.5 s  |
| Silk muga WS connect + first chunk   | ~500 ms |
| **Round-trip user-stop → AI-speaks** | ~2.4 s  |

The first version was REST-only and ran 11–17 s per turn. The current build cut that ~5x by streaming STT live, minting Silk tokens server-side and opening the TTS WS from the browser, and keeping the Mongo + model clients warm across HMR.

---

## Stack

- **Frontend:** Next.js 16 (App Router, Turbopack) + React 19 + Tailwind 4 + pure JSX (no TypeScript in app code)
- **Server:** Next.js API routes — single Node process, no separate backend
- **DB:** MongoDB Atlas (`mongodb+srv://`), `users` / `templates` / `assignments` / `sessions` collections
- **Auth:** httpOnly cookie holding a userId — no passwords, two seeded demo accounts (interviewer + candidate)
- **Voice in:** Browser `MediaRecorder` → Deepgram Nova-3 WS (browser-side, auth via `Sec-WebSocket-Protocol: ['token', key]`)
- **Voice out:** Silk muga `POST /v1/tts/ws-connect` (server-side, mints a `{ws_url, token}` pair) → browser opens the WS, streams Int16 PCM into a shared `AudioContext @ 24kHz`
- **Fonts:** Geist Sans + Geist Mono everywhere; Fraunces serif on the landing page

---

## Data model

```
users         _id, email, name, role ('interviewer' | 'candidate')
templates     _id, ownerId, name, role, jobDescription, resumeHighlights,
              interviewType, durationMinutes, pressureMode, hinglishMode, deepFollowups
assignments   _id, templateId, ownerId, candidateEmail, candidateId,
              status ('pending' | 'in_progress' | 'completed'), sessionId,
              released (bool, default false), createdAt, completedAt
sessions      _id, config, baseQuestions, nextBaseIndex, history[],
              kind ('mock' | 'scheduled'), candidateId, assignmentId, released
```

`history[]` entries hold `{question, transcript, analysisTags, isFollowup}` — enough to reconstruct the full interview later for transcript + feedback views.

---

## Routes

| Path                                      | Who          | Purpose                                             |
| ----------------------------------------- | ------------ | --------------------------------------------------- |
| `/`                                       | public       | Editorial landing page                              |
| `/login` (`?role=interviewer\|candidate`) | public       | Pick a seed account; auto-signs in via query hint   |
| `/interviewer` (`?tab=…`)                 | interviewer  | Templates / Assignments / Results dashboard         |
| `/candidate` (`?tab=…`)                   | candidate    | Scheduled / Mock practice / Results dashboard       |
| `/mock/new`                               | candidate    | One-shot setup for an ad-hoc mock interview         |
| `/interview/[sessionId]`                  | candidate    | The live interview UI (cam + mic + voice orb)      |
| `/feedback/[sessionId]`                   | both         | Scored feedback (gated for scheduled until release) |
| `/transcript/[sessionId]`                 | both         | Full turn-by-turn transcript                        |
| `/history`                                | both         | Role-aware redirect to the right dashboard tab      |

API routes mirror those: `/api/login`, `/api/logout`, `/api/me`, `/api/templates(/[id])`, `/api/assignments(/[id])`, `/api/start-session`, `/api/answer`, `/api/voice`, `/api/feedback/[sessionId]`, `/api/sessions`.

---

## Local setup

```bash
# 1. Install
npm install

# 2. Create .env.local with the four hackathon keys:
cat > .env.local <<EOF
DEEPGRAM_API_KEY=...
NEXT_PUBLIC_DEEPGRAM_API_KEY=...    # browser uses this to open the live WS
GEMINI_API_KEY=...
SILK_API_KEY=...
MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/?appName=Cluster0
MONGODB_DB=silkhr
EOF

# 3. Run
npm run dev
# → http://localhost:3000
```

On first visit, the landing page offers two CTAs: **I'm hiring** (interviewer) and **I'm interviewing** (candidate). Both jump to `/login?role=...` which auto-signs you in as the seeded demo user — no form to fill.

> Some local DNS resolvers silently drop SRV queries, which breaks `mongodb+srv://`. [lib/db.js](lib/db.js) prepends Google + Cloudflare public DNS to Node's resolver list at boot. If you still get `querySrv ECONNREFUSED`, your network is blocking outbound 53 — switch off VPN or onto a hotspot.

---

## Notable engineering decisions

**Default-held results, per-assignment release toggle.** The release flag lives on `assignment.released` and is mirrored onto `session.released` so feedback access can be checked directly against the session ID. Candidates polling `/api/feedback/[sessionId]` get 403 for scheduled feedback until the recruiter flips the toggle. Mocks are always visible to their owner.

**Voice-out is browser-side WS, not proxied.** The server mints a short-lived `{ws_url, token}` from Silk's `ws-connect` endpoint and hands it to the browser. The browser opens the WS directly. This shaves ~500 ms off TTFB by avoiding a server-to-browser audio relay, at the cost of putting the token (not the API key) on the client for ~30 seconds.

**One AudioContext, scheduled buffers.** [lib/silkPlayer.js](lib/silkPlayer.js) keeps a single `AudioContext @ 24kHz` for the session and uses a running `playAt` timestamp to schedule each incoming PCM chunk immediately after the previous one. No `<audio>` element, no gaps, no rebuffer.

**Stable client across HMR.** [lib/db.js](lib/db.js) stashes the MongoClient promise on `globalThis` so Next's hot reload doesn't open a fresh connection pool on every save.

**`responseMimeType: 'application/json'` for the brain.** Every Gemini call returns strict JSON via the native MIME-type contract. No regex parsing, no fenced-block extraction, no flaky outputs. The downside — and the *limitation* below — is that this rules out streaming the response.

---

## Honest limitations

- **Turn-by-turn, not realtime.** The user finishes speaking → STT finalises → Gemini returns full JSON → muga starts streaming. There's a noticeable ~2-second gap between user-stop and AI-speak. **Barge-in was attempted** (a second always-on Deepgram session listening during AI speech, with the user's first words triggering a "stop AI + promote session" handoff) **and reverted**: without headphones, the AI's own audio bleeds into the mic and self-triggers barge-in despite `echoCancellation: true`. The clean paths forward are:
  1. Switch the Gemini contract to text-first + trailing metadata, and stream tokens straight to muga as sentences complete (~3 hr of work, but partial-JSON parsing is risky for live demos).
  2. Move to a true bidirectional voice model (OpenAI Realtime, Gemini Live) — kills the "built on three best-in-class voice models" pitch but actually solves it.
- **No real auth.** Two hardcoded seed users. Demo-only.
- **No CSV file upload.** The interviewer pastes comma- or newline-separated emails into a textarea; that's all that was needed for the demo.
- **Mobile not supported.** Desktop only, 1024 px and up. The interview UI's two-tile grid breaks below that.
- **No retries on Gemini 403.** A suspended Gemini project surfaces as a hard error mid-interview. Swap the key in `.env.local`, restart dev, retry.

---

## Project structure

```
app/
├── page.jsx                    Landing (editorial / Fraunces)
├── login/                      Seed-account picker
├── interviewer/                Recruiter dashboard
├── candidate/                  Candidate dashboard
├── mock/new/                   Ad-hoc mock setup
├── interview/[sessionId]/      Live interview UI
├── feedback/[sessionId]/       Scored feedback
├── transcript/[sessionId]/     Turn-by-turn transcript
├── history/                    Role-aware redirect
└── api/                        All server routes

lib/
├── auth.js          Cookie session + requireRole()
├── db.js            MongoClient singleton (with DNS workaround)
├── users.js         Seed user definitions
├── templates.js     Templates CRUD
├── assignments.js   Assignments CRUD
├── sessions.js      Session persistence
├── gemini.js        Question generation, per-turn eval, end-of-interview feedback
├── deepgram.js      Server-side STT (REST fallback)
├── deepgramLive.js  Browser-side Deepgram live transcriber
├── silk.js          Server-side muga ws-connect (mints tokens)
└── silkPlayer.js    Browser-side PCM streaming player
```

---

## Credits

Built at the **Rumik × AWS Voice AI Hackathon**, May 2026. Voice models: Deepgram, Google Gemini, Silk muga.
