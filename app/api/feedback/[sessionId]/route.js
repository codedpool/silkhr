import { getSession, saveSession } from '@/lib/sessions';
import { generateFeedback } from '@/lib/gemini';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  // Cache: only generate once per session
  if (!session.feedback) {
    if (!session.history?.length) {
      // Nothing to grade — return a stub so the page renders cleanly instead of erroring.
      session.feedback = {
        scores:       { clarity: 0, specificity: 0, confidence: 0, structure: 0 },
        summary:      'Interview ended before any answers were recorded.',
        strengths:    [],
        improvements: ['Give it at least one full answer next time so the interviewer has something to evaluate.'],
        examples:     [],
      };
    } else {
      try {
        session.feedback = await generateFeedback(session);
      } catch (err) {
        console.error('[feedback] Gemini failed:', err);
        return Response.json({ error: err.message || 'Feedback generation failed' }, { status: 502 });
      }
    }
    await saveSession(session);
  }

  return Response.json({
    sessionId: session.sessionId,
    config: session.config,
    history: session.history,
    feedback: session.feedback,
  });
}
