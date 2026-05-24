// Cookie-based session for the hackathon. Two seed users, pick a role.
// No password, no encryption — demo only.

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ensureSeedUsers, getUserById, getUserByRole } from './users';

const COOKIE_NAME = 'silkhr_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function loginAsRole(role) {
  if (!['interviewer', 'candidate'].includes(role)) {
    throw new Error('Invalid role');
  }
  await ensureSeedUsers();
  const user = await getUserByRole(role);
  if (!user) throw new Error('Seed user missing');

  const jar = await cookies();
  jar.set(COOKIE_NAME, user._id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return user;
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

// Read the current user from the cookie. Returns null if not logged in.
export async function currentUser() {
  const jar = await cookies();
  const userId = jar.get(COOKIE_NAME)?.value;
  if (!userId) return null;
  return getUserById(userId);
}

// Server-component helper: redirect to /login if no session.
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect('/login');
  return user;
}

// Server-component helper: redirect if user isn't the expected role.
export async function requireRole(role) {
  const user = await requireUser();
  if (user.role !== role) {
    redirect(user.role === 'interviewer' ? '/interviewer' : '/candidate');
  }
  return user;
}
