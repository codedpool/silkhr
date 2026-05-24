import { getSession } from '@/lib/sessions';

export async function GET(_request, { params }) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
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
