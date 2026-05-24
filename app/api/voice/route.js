import { getSession } from '@/lib/sessions';
import { mintSilkWS } from '@/lib/silk';

// GET /api/voice?sessionId=...&idx=N
// Mints a fresh Silk WS token for the question at session.questions[idx].
// Used for initial load and Replay.

export async function GET(request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const idxParam  = url.searchParams.get('idx');

  if (!sessionId) return Response.json({ error: 'Missing sessionId' }, { status: 400 });
  const session = await getSession(sessionId);
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const idx = idxParam !== null ? Number(idxParam) : session.currentQuestionIndex;
  const text = session.questions[idx];
  if (!text) return Response.json({ error: 'No question at that index' }, { status: 404 });

  try {
    const voice = await mintSilkWS(text, { tone: session.voiceProfile.tone });
    return Response.json({ idx, ...voice });
  } catch (err) {
    console.error('[voice] mint failed:', err);
    return Response.json({ error: err.message || 'Voice mint failed' }, { status: 502 });
  }
}
