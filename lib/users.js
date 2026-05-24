// Seed users. Two demo accounts only — no real signup/auth for the hackathon.
//
// Stored stable IDs so they're easy to reference from other collections.

import { getDb } from './db';

export const SEED_USERS = [
  {
    _id: 'usr_interviewer',
    email: 'interviewer@silkhr.dev',
    name: 'Maya Recruiter',
    role: 'interviewer',
  },
  {
    _id: 'usr_candidate',
    email: 'candidate@silkhr.dev',
    name: 'Aarav Kumar',
    role: 'candidate',
  },
];

async function getCol() {
  const db = await getDb();
  return db.collection('users');
}

// Ensure both seed users exist. Idempotent.
export async function ensureSeedUsers() {
  const col = await getCol();
  for (const u of SEED_USERS) {
    await col.updateOne(
      { _id: u._id },
      { $setOnInsert: { ...u, createdAt: Date.now() } },
      { upsert: true },
    );
  }
}

export async function getUserById(userId) {
  if (!userId) return null;
  const col = await getCol();
  return col.findOne({ _id: userId });
}

export async function getUserByRole(role) {
  const col = await getCol();
  return col.findOne({ role });
}
