// MongoDB-backed session store. Sessions persist across server restarts.
//
// All CRUD is async. Routes mutate the session object then call saveSession.

import { getSessions } from './db';

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function createSession(config) {
  const session = {
    sessionId: newId(),
    config,
    voiceProfile: { model: 'muga', tone: 'neutral' },
    baseQuestions: [],
    questions: [],
    questionFollowups: [],
    currentQuestionIndex: 0,
    nextBaseIndex: 0,
    history: [],
    status: 'idle',
    feedback: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const col = await getSessions();
  await col.insertOne(session);
  return session;
}

export async function getSession(sessionId) {
  if (!sessionId) return null;
  const col = await getSessions();
  return col.findOne({ sessionId });
}

// Replaces the document in Mongo with the (mutated) session object.
// _id is added by Mongo on insert; we strip it before replaceOne to avoid mismatch.
export async function saveSession(session) {
  if (!session?.sessionId) throw new Error('saveSession: missing sessionId');
  session.updatedAt = Date.now();
  const { _id, ...rest } = session;
  const col = await getSessions();
  await col.replaceOne({ sessionId: session.sessionId }, rest, { upsert: true });
  return session;
}

export async function listRecentSessions(limit = 50) {
  const col = await getSessions();
  return col
    .find(
      {},
      {
        projection: {
          _id: 0,
          sessionId: 1,
          'config.role': 1,
          'config.interviewType': 1,
          'config.durationMinutes': 1,
          'config.pressureMode': 1,
          'config.hinglishMode': 1,
          'config.deepFollowups': 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          history: 1,
          feedback: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
