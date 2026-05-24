import { getSession, saveSession } from '@/lib/sessions';
import { generateFeedback } from '@/lib/gemini';
import { requireUser } from '@/lib/auth';

export async function GET(_request, { params }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  // Access control:
  //  - Interviewer can see any session they own (via assignment lookup not needed for demo since there's one interviewer)
  //  - Candidate can see: their mocks always; scheduled only if released
  if (user.role === 'candidate') {
    if (session.candidateId && session.candidateId !== user._id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (session.kind === 'scheduled' && !session.released) {
      return Response.json({ error: 'Feedback is not yet released by the interviewer' }, { status: 403 });
    }
  }
  // Interviewer: allowed (single interviewer in demo). Real prod would scope by ownership via assignment.ownerId.

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
