import { getSession, saveSession } from '@/lib/sessions';
import { transcribe } from '@/lib/deepgram';
import { evaluateAndContinue } from '@/lib/gemini';
import { mintSilkWS } from '@/lib/silk';

export async function POST(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });

  const session = await getSession(sessionId);
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });
  if (session.status === 'completed') {
    return Response.json({ error: 'Session already completed', isComplete: true }, { status: 409 });
  }

  // --- 1. Transcribe (skip if caller passed text via ?text=) ---
  let transcript = url.searchParams.get('text') || '';
  if (!transcript) {
    const contentType = request.headers.get('content-type') || 'audio/webm';
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) {
      return Response.json({ error: 'Audio payload too small' }, { status: 400 });
    }
    try {
      transcript = await transcribe(Buffer.from(arrayBuffer), contentType);
    } catch (err) {
      console.error('[answer] Deepgram failed:', err);
      return Response.json({ error: err.message || 'Transcription failed' }, { status: 502 });
    }
  }

  // --- 2. Record the turn for the question we just answered ---
  const answeredIdx = session.currentQuestionIndex;
  const answeredQuestion = session.questions[answeredIdx];
  const wasFollowup = !!session.questionFollowups[answeredIdx];
  const turn = {
    question: answeredQuestion,
    transcript,
    analysisTags: [],   // filled in below
    isFollowup: wasFollowup,
  };
  session.history.push(turn);

  // --- 3. Ask Gemini what to do next ---
  let evalResult;
  try {
    evalResult = await evaluateAndContinue(session, transcript);
  } catch (err) {
    console.error('[answer] Gemini eval failed:', err);
    // Soft fallback: progress to next base question if any, else end.
    if (session.nextBaseIndex < session.baseQuestions.length) {
      evalResult = {
        analysisTags: ['eval-failed'],
        isFollowup: false,
        isComplete: false,
        nextQuestion: `[neutral] Okay, let's move on. ${session.baseQuestions[session.nextBaseIndex]}`,
      };
    } else {
      evalResult = {
        analysisTags: ['eval-failed'],
        isFollowup: false,
        isComplete: true,
        nextQuestion: `[neutral] That's all I had for now. Thanks for walking me through everything.`,
      };
    }
  }

  // Apply tags to the recorded turn
  turn.analysisTags = evalResult.analysisTags;

  // --- 4. Advance state with the new line ---
  session.questions.push(evalResult.nextQuestion);
  session.questionFollowups.push(evalResult.isFollowup);
  const nextIndex = session.questions.length - 1;
  session.currentQuestionIndex = nextIndex;
  if (!evalResult.isFollowup && !evalResult.isComplete) {
    // We consumed a base question. (The closing line doesn't advance the base pointer.)
    session.nextBaseIndex = Math.min(session.nextBaseIndex + 1, session.baseQuestions.length);
  }
  if (evalResult.isComplete) {
    session.status = 'completed';
  }

  // Persist all the mutations we made above before responding.
  await saveSession(session);

  // --- 5. Mint a Silk WS token for the new line so the client can start streaming ---
  let voice = null;
  try {
    voice = await mintSilkWS(evalResult.nextQuestion, { tone: session.voiceProfile.tone });
  } catch (err) {
    console.error(`[answer] Silk WS mint q${nextIndex} failed:`, err);
  }

  return Response.json({
    transcript,
    nextQuestion: evalResult.nextQuestion,
    nextIndex,
    isFollowup: evalResult.isFollowup,
    isComplete: evalResult.isComplete,
    analysisTags: evalResult.analysisTags,
    voice, // { wsUrl, token, text } or null
    progress: {
      baseCovered: session.history.filter((h) => !h.isFollowup).length,
      totalBase: session.baseQuestions.length,
    },
  });
}
