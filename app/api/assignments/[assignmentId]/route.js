import { requireRole } from '@/lib/auth';
import { deleteAssignment, getAssignment, updateAssignment } from '@/lib/assignments';
import { getSession, saveSession } from '@/lib/sessions';

// PATCH { released: boolean }  — interviewer toggles result visibility for the candidate
export async function PATCH(request, { params }) {
  const user = await requireRole('interviewer');
  const { assignmentId } = await params;
  const asn = await getAssignment(assignmentId);
  if (!asn || asn.ownerId !== user._id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const patch = {};
  if (typeof body.released === 'boolean') patch.released = body.released;
  if (Object.keys(patch).length === 0) {
    return Response.json({ error: 'No supported fields' }, { status: 400 });
  }

  const next = await updateAssignment(assignmentId, patch);

  // Mirror released flag onto the session so feedback access can be checked on the session itself.
  if (typeof patch.released === 'boolean' && next?.sessionId) {
    const session = await getSession(next.sessionId);
    if (session) {
      session.released = patch.released;
      await saveSession(session);
    }
  }

  return Response.json({ assignment: next });
}

export async function DELETE(_request, { params }) {
  const user = await requireRole('interviewer');
  const { assignmentId } = await params;
  const asn = await getAssignment(assignmentId);
  if (!asn || asn.ownerId !== user._id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  await deleteAssignment(assignmentId, user._id);
  return Response.json({ ok: true });
}
