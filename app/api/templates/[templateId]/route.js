import { requireRole } from '@/lib/auth';
import { deleteTemplate, getTemplate, updateTemplate } from '@/lib/templates';

export async function GET(_request, { params }) {
  const user = await requireRole('interviewer');
  const { templateId } = await params;
  const tpl = await getTemplate(templateId);
  if (!tpl || tpl.ownerId !== user._id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json({ template: tpl });
}

export async function PATCH(request, { params }) {
  const user = await requireRole('interviewer');
  const { templateId } = await params;
  const existing = await getTemplate(templateId);
  if (!existing || existing.ownerId !== user._id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const updated = await updateTemplate(templateId, user._id, body);
  return Response.json({ template: updated });
}

export async function DELETE(_request, { params }) {
  const user = await requireRole('interviewer');
  const { templateId } = await params;
  await deleteTemplate(templateId, user._id);
  return Response.json({ ok: true });
}
