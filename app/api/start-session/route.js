import { createSession, saveSession } from '@/lib/sessions';
import { generateQuestions } from '@/lib/gemini';
import { mintSilkWS } from '@/lib/silk';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    role,
    jobDescription,
    resumeHighlights = '',
    interviewType = 'Technical',
    durationMinutes = 10,
    pressure = false,
    hinglish = false,
    deepFollowups = false,
  } = body || {};

  if (!role?.trim() || !jobDescription?.trim()) {
    return Response.json({ error: 'role and jobDescription are required' }, { status: 400 });
  }

  const config = {
    role: role.trim(),
    jobDescription: jobDescription.trim(),
    resumeHighlights: resumeHighlights.trim(),
    interviewType,
    durationMinutes,
    pressureMode: !!pressure,
    hinglishMode: !!hinglish,
    deepFollowups: !!deepFollowups,
  };

  const session = await createSession(config);

  let baseQuestions;
  try {
    baseQuestions = await generateQuestions(config);
  } catch (err) {
    console.error('[start-session] Gemini failed:', err);
    baseQuestions = [
      `To kick things off — walk me through your background and what drew you to this ${config.role} role.`,
      `What's a recent project you shipped that you're proud of, and what was your specific contribution?`,
      `Tell me about a time something broke in production. How did you debug it?`,
      `Where do you want to grow technically over the next year or two?`,
    ];
  }
  session.baseQuestions = baseQuestions;

  // Seed questions[] with Q1 and consume it from the base list.
  const q1 = baseQuestions[0];
  session.questions = [q1];
  session.questionFollowups = [false]; // Q1 is a base question, not a follow-up
  session.currentQuestionIndex = 0;
  session.nextBaseIndex = 1;
  session.status = 'active';

  // Persist the seeded session before we hand control to the client.
  await saveSession(session);

  // Mint a Silk WS token for Q1 so the client can stream as soon as it lands.
  let voice = null;
  try {
    voice = await mintSilkWS(q1, { tone: session.voiceProfile.tone });
  } catch (err) {
    console.error('[start-session] Silk WS mint failed:', err);
  }

  return Response.json({
    sessionId: session.sessionId,
    firstQuestion: q1,
    totalQuestions: session.baseQuestions.length,
    voice, // { wsUrl, token, text } or null on failure
  });
}
