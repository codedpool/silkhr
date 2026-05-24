import { requireUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
  const user = await requireUser();
  const db = await getDb();
  const col = db.collection('sessions');

  // Candidate: only their own sessions (mock + scheduled they've taken).
  // Interviewer: all sessions linked to assignments they own.
  let query;
  if (user.role === 'candidate') {
    query = { candidateId: user._id };
  } else {
    // pull assignment ids owned by this interviewer
    const asns = await db
      .collection('assignments')
      .find({ ownerId: user._id }, { projection: { _id: 1, sessionId: 1 } })
      .toArray();
    const sessionIds = asns.map((a) => a.sessionId).filter(Boolean);
    if (sessionIds.length === 0) return Response.json({ sessions: [] });
    query = { sessionId: { $in: sessionIds } };
  }

  const sessions = await col
    .find(query, {
      projection: {
        _id: 0,
        sessionId: 1,
        config: 1,
        status: 1,
        kind: 1,
        candidateId: 1,
        assignmentId: 1,
        released: 1,
        createdAt: 1,
        updatedAt: 1,
        history: 1,
        feedback: 1,
      },
    })
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  const trimmed = sessions.map((s) => ({
    sessionId:    s.sessionId,
    config:       s.config,
    status:       s.status,
    kind:         s.kind || 'mock',
    released:     !!s.released,
    candidateId:  s.candidateId,
    assignmentId: s.assignmentId,
    createdAt:    s.createdAt,
    updatedAt:    s.updatedAt,
    turnCount:    s.history?.length || 0,
    hasFeedback:  !!s.feedback,
  }));

  return Response.json({ sessions: trimmed });
}
