import { loginAsRole } from '@/lib/auth';

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { role } = body || {};
  try {
    const user = await loginAsRole(role);
    return Response.json({ user });
  } catch (err) {
    return Response.json({ error: err.message || 'Login failed' }, { status: 400 });
  }
}
