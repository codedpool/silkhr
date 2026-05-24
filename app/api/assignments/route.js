import { requireUser, requireRole } from '@/lib/auth';
import { getUserById } from '@/lib/users';
import { getDb } from '@/lib/db';
import { getTemplate } from '@/lib/templates';
import { createAssignments, listAssignmentsForCandidate, listAssignmentsForOwner } from '@/lib/assignments';

// Resolve a candidate by email — for demo we only have one candidate.
async function resolveByEmail(email) {
  const db = await getDb();
  return db.collection('users').findOne({ email });
}

export async function GET(request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const templateId = url.searchParams.get('templateId');

  if (user.role === 'interviewer') {
    const assignments = await listAssignmentsForOwner(user._id, { templateId });
    return Response.json({ assignments });
  } else {
    const assignments = await listAssignmentsForCandidate(user._id, user.email);
    return Response.json({ assignments });
  }
}

// POST { templateId, emails: ["a@b.com", ...] }  OR  { templateId, csv: "a@b.com\nc@d.com" }
export async function POST(request) {
  const user = await requireRole('interviewer');
  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const tpl = await getTemplate(body?.templateId);
  if (!tpl || tpl.ownerId !== user._id) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  // Build emails list from explicit array or CSV blob.
  let emails = [];
  if (Array.isArray(body.emails)) emails = body.emails;
  if (typeof body.csv === 'string' && body.csv.trim()) {
    const fromCsv = body.csv
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s && s.includes('@'));
    emails = emails.concat(fromCsv);
  }
  emails = Array.from(new Set(emails.map((e) => e.toLowerCase()))).filter(Boolean);

  if (emails.length === 0) {
    return Response.json({ error: 'No valid emails provided' }, { status: 400 });
  }

  const created = await createAssignments({
    templateId: tpl._id,
    ownerId: user._id,
    emails,
    resolveCandidate: resolveByEmail,
  });

  return Response.json({ assignments: created, count: created.length });
}
