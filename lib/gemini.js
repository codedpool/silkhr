// Gemini Flash helpers for SilkHR.

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

function extractJson(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function callGemini(prompt, { temperature = 0.8 } = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set');

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, parsed: extractJson(text) };
}

// ---------- 1. Initial question generation ----------

function buildQuestionsPrompt(config) {
  const { role, jobDescription, resumeHighlights, interviewType, durationMinutes, hinglishMode } = config;

  const count = durationMinutes <= 5 ? 4 : 6;

  const typeGuide =
    interviewType === 'Technical'
      ? 'Mix high-level architecture / system thinking with one or two grounded "how would you" prompts.'
      : interviewType === 'HR'
        ? 'Focus on motivation, ownership, conflict, growth — no leetcode.'
        : 'Mix behavioural and technical depth.';

  const hinglishGuide = hinglishMode
    ? `LANGUAGE: Write in natural Hinglish — Romanised Hindi mixed with English ("Acha, mujhe batao...", "thoda specifics share karo", "kya challenges face kiye"). Latin script ONLY — never Devanagari. Code-switch naturally; don't force Hindi every sentence.`
    : `LANGUAGE: English. Avoid stiff phrasing; sound like a person talking, not writing.`;

  return `You are designing the opening question set for a ${interviewType} interview for the role of "${role}". The session is ${durationMinutes} minutes long, so plan for ${count} questions.

Job description:
"""
${jobDescription}
"""

${resumeHighlights ? `Candidate resume highlights:\n"""\n${resumeHighlights}\n"""\n` : ''}
Rules for the questions:
- Sound like a real human Indian recruiter speaking — short, conversational, ≤ 2 sentences each (target 2–15 seconds when spoken aloud).
- Never start with "Tell me about yourself" verbatim; if you want an opener, phrase it freshly.
- ${typeGuide}
- Each question should stand alone (the interviewer will follow up live).
- No numbering, no preamble, no markdown.
- ${hinglishGuide}

Return STRICT JSON, nothing else:
{"questions": ["...", "...", "..."]}`;
}

export async function generateQuestions(config) {
  const prompt = buildQuestionsPrompt(config);
  const { text, parsed } = await callGemini(prompt, { temperature: 0.8 });
  const questions = Array.isArray(parsed?.questions) ? parsed.questions.filter(Boolean) : [];
  if (!questions.length) throw new Error(`Gemini returned no questions. Raw: ${text.slice(0, 300)}`);
  return questions.slice(0, 6);
}

// ---------- 2. Per-turn evaluation + next-line generation ----------

function buildEvalPrompt(session, transcript) {
  const { config, baseQuestions, nextBaseIndex, history } = session;
  const currentQuestion = history.length ? history[history.length - 1].question : baseQuestions[0];

  const remainingBase = baseQuestions.slice(nextBaseIndex);
  const totalCovered = history.filter((h) => !h.isFollowup).length;
  const totalBase = baseQuestions.length;

  const consecutiveFollowups = (() => {
    let n = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].isFollowup) n++;
      else break;
    }
    return n;
  })();

  const historyDump = history
    .slice(-6)
    .map((h, i) => `Turn ${history.length - history.slice(-6).length + i + 1}${h.isFollowup ? ' (follow-up)' : ''}\n  Q: ${h.question}\n  A: ${h.transcript || '(no answer)'}`)
    .join('\n');

  const hinglishGuide = config.hinglishMode
    ? `LANGUAGE: Write the next line in natural Hinglish — Romanised Hindi mixed with English. Latin script only, never Devanagari.`
    : `LANGUAGE: English. Conversational, not formal.`;

  const pressureGuide = config.pressureMode
    ? `PRESSURE MODE IS ON. Be direct and slightly skeptical. Push for specifics, metrics, trade-offs. When the answer is vague, prefix the next line with " <sigh> " (with spaces) before drilling. Sentences should be shorter and more clipped than usual. Tone stays [neutral] — never [angry].`
    : `Pressure mode off. Stay warm and conversational.`;

  const followupGuide = config.deepFollowups
    ? `DEEP FOLLOW-UPS ARE ON. If the candidate's answer is vague, hand-wavy, missing specifics, or off-topic, return a focused follow-up that drills into the gap (set isFollowup=true). If the answer is solid or already specific, move to the next base question (isFollowup=false). NEVER chain more than 2 follow-ups in a row — if consecutiveFollowups is already 2, you MUST progress to the next base question.`
    : `Deep follow-ups OFF. Always progress to the next base question; never return a follow-up.`;

  const isLastBase = nextBaseIndex >= totalBase;
  const closingGuide = isLastBase
    ? `This was the LAST base question. If the answer was reasonable (or you've already follow-up-ed twice), return isComplete=true and put a brief warm closing line in nextQuestion (e.g. "[neutral] That's all I had for now, thanks for walking me through everything."). Otherwise (one final follow-up is allowed), return a single follow-up.`
    : `There are still ${remainingBase.length} base question(s) left. Use them as the next-question source when not following up.`;

  return `You are voicing an Indian recruiter conducting a live ${config.interviewType} interview for the role of "${config.role}". This is a back-and-forth voice conversation — keep replies SHORT and spoken.

CONFIG
- Role: ${config.role}
- Interview type: ${config.interviewType}
- Job description: ${config.jobDescription}
${config.resumeHighlights ? `- Candidate resume notes: ${config.resumeHighlights}\n` : ''}- Pressure mode: ${config.pressureMode}
- Hinglish mode: ${config.hinglishMode}
- Deep follow-ups: ${config.deepFollowups}

PROGRESS
- Base questions covered: ${totalCovered} / ${totalBase}
- Consecutive follow-ups so far: ${consecutiveFollowups}
- Remaining base questions (use the next one verbatim or lightly paraphrased when you progress):
${remainingBase.map((q, i) => `  ${i + 1}. ${q}`).join('\n') || '  (none — last base question already asked)'}

RECENT HISTORY
${historyDump}

CANDIDATE'S LATEST ANSWER (transcript of their voice):
"""
${transcript || '(empty / unclear)'}
"""

TASK
Decide the next interviewer line. Output STRICT JSON:
{
  "analysisTags": ["..."],            // 1–3 short labels from: vague, specific, no-metrics, strong-example, off-topic, rambling, confident, hesitant, technical-depth, surface-level, honest-uncertainty, empty
  "isFollowup": <boolean>,
  "isComplete": <boolean>,
  "nextQuestion": "[tone] <line>"     // tone marker required; ≤ 2 sentences; voice-friendly
}

WRITING THE NEXT LINE
- Lead with a tone marker: [neutral] 90% of the time. [happy] for a warm acknowledgement when the candidate said something genuinely good. Never [sad]/[angry]/[whisper]/[excited].
- ≤ 2 sentences, 2–15 seconds spoken.
- At most ONE inline event (<chuckle>, <sigh>, or <laugh>), with a space on both sides, never mid-word. Match the tone (e.g. no <laugh> in a strict line).
- Often start with a tiny acknowledgement before pivoting ("Okay, ", "Got it, ", "Acha, " for Hinglish).
- ${hinglishGuide}
- ${pressureGuide}
- ${followupGuide}
- ${closingGuide}

Return ONLY the JSON.`;
}

export async function evaluateAndContinue(session, transcript) {
  const prompt = buildEvalPrompt(session, transcript);
  const { text, parsed } = await callGemini(prompt, { temperature: 0.85 });
  if (!parsed || typeof parsed.nextQuestion !== 'string') {
    throw new Error(`Gemini eval returned bad JSON. Raw: ${text.slice(0, 300)}`);
  }
  return {
    analysisTags: Array.isArray(parsed.analysisTags) ? parsed.analysisTags : [],
    isFollowup: !!parsed.isFollowup,
    isComplete: !!parsed.isComplete,
    nextQuestion: parsed.nextQuestion.trim(),
  };
}

// ---------- 3. End-of-interview feedback ----------

function buildFeedbackPrompt(session) {
  const { config, history } = session;

  const dump = history
    .map((h, i) => `Turn ${i + 1}${h.isFollowup ? ' (follow-up)' : ''}\n  Q: ${h.question}\n  A: ${h.transcript || '(no answer)'}\n  Tags: ${(h.analysisTags || []).join(', ') || '—'}`)
    .join('\n\n');

  return `You are an Indian recruiter writing post-interview feedback for a ${config.interviewType} interview for the role of "${config.role}". Be honest, specific, and constructive — never bland.

JOB DESCRIPTION
"""
${config.jobDescription}
"""

FULL INTERVIEW TRANSCRIPT
${dump || '(no turns)'}

Score each dimension 1–5 (5 = excellent, 3 = passable, 1 = weak). Then give 3 strengths, 3 improvement areas, and 1–2 rewritten "even better" example answers for the weakest moments.

Return STRICT JSON, nothing else:
{
  "scores": {
    "clarity": <1-5>,
    "specificity": <1-5>,
    "confidence": <1-5>,
    "structure": <1-5>
  },
  "summary": "1-2 sentence overall verdict",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "...", "..."],
  "examples": [
    { "originalQuestion": "...", "yourAnswerSummary": "...", "improvedAnswer": "..." }
  ]
}

Rules:
- All text in English regardless of interview language (English feedback is easier to act on).
- Be concrete. Reference what the candidate actually said.
- Improved answers should be realistic, 2–4 sentences, not idealised essays.`;
}

export async function generateFeedback(session) {
  const prompt = buildFeedbackPrompt(session);
  const { text, parsed } = await callGemini(prompt, { temperature: 0.6 });
  if (!parsed?.scores) throw new Error(`Gemini feedback returned bad JSON. Raw: ${text.slice(0, 300)}`);
  return {
    scores: {
      clarity:     Number(parsed.scores.clarity)     || 0,
      specificity: Number(parsed.scores.specificity) || 0,
      confidence:  Number(parsed.scores.confidence)  || 0,
      structure:   Number(parsed.scores.structure)   || 0,
    },
    summary:      String(parsed.summary || ''),
    strengths:    Array.isArray(parsed.strengths)    ? parsed.strengths.filter(Boolean)    : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.filter(Boolean) : [],
    examples:     Array.isArray(parsed.examples)     ? parsed.examples.filter(Boolean)     : [],
  };
}
