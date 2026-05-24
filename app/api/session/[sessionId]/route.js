import { getSession } from '@/lib/sessions';
import { requireUser } from '@/lib/auth';

export async function GET(_request, { params }) {
  const user = await requireUser();
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }
  // Candidates can only see their own sessions
  if (user.role === 'candidate' && session.candidateId && session.candidateId !== user._id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Don't leak voiceProfile internals more than needed.
  return Response.json({
    sessionId: session.sessionId,
    config: session.config,
    questions: session.questions,
    currentQuestionIndex: session.currentQuestionIndex,
    history: session.history,
    status: session.status,
  });
}
