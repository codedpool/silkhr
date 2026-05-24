import { requireRole } from '@/lib/auth';
import { deleteTemplate, getTemplate } from '@/lib/templates';

export async function GET(_request, { params }) {
  const user = await requireRole('interviewer');
  const { templateId } = await params;
  const tpl = await getTemplate(templateId);
  if (!tpl || tpl.ownerId !== user._id) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }
  return Response.json({ template: tpl });
}

export async function DELETE(_request, { params }) {
  const user = await requireRole('interviewer');
  const { templateId } = await params;
  await deleteTemplate(templateId, user._id);
  return Response.json({ ok: true });
}
