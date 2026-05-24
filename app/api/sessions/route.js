import { listRecentSessions } from '@/lib/sessions';

export async function GET() {
  try {
    const sessions = await listRecentSessions(50);
    // Trim history down to just counts to keep payload small
    const trimmed = sessions.map((s) => ({
      sessionId:      s.sessionId,
      config:         s.config,
      status:         s.status,
      createdAt:      s.createdAt,
      updatedAt:      s.updatedAt,
      turnCount:      s.history?.length || 0,
      hasFeedback:    !!s.feedback,
    }));
    return Response.json({ sessions: trimmed });
  } catch (err) {
    console.error('[sessions] list failed:', err);
    return Response.json({ error: err.message || 'Failed to list sessions' }, { status: 500 });
  }
}
