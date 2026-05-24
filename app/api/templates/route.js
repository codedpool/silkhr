import { requireRole } from '@/lib/auth';
import { createTemplate, listTemplates } from '@/lib/templates';

export async function GET() {
  const user = await requireRole('interviewer');
  const templates = await listTemplates(user._id);
  return Response.json({ templates });
}

export async function POST(request) {
  const user = await requireRole('interviewer');
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  if (!body?.role?.trim() || !body?.jobDescription?.trim()) {
    return Response.json({ error: 'role and jobDescription are required' }, { status: 400 });
  }

  const tpl = await createTemplate(user._id, body);
  return Response.json({ template: tpl });
}
