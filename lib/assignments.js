import { getDb } from './db';

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `asn_${crypto.randomUUID()}`
    : `asn_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getCol() {
  const db = await getDb();
  return db.collection('assignments');
}

// Create assignment(s) for the given candidate emails under a template.
// For demo: candidateId is looked up by email; if not found we still create
// the assignment with email-only (will resolve later if that user logs in).
export async function createAssignments({ templateId, ownerId, emails, resolveCandidate }) {
  if (!templateId || !ownerId) throw new Error('templateId and ownerId required');
  if (!Array.isArray(emails) || emails.length === 0) return [];

  const col = await getCol();
  const created = [];
  for (const email of emails) {
    const clean = String(email || '').trim().toLowerCase();
    if (!clean) continue;
    const candidate = resolveCandidate ? await resolveCandidate(clean) : null;
    const asn = {
      _id: newId(),
      templateId,
      ownerId,
      candidateEmail: clean,
      candidateId:    candidate?._id || null,
      status:         'pending',
      sessionId:      null,
      released:       false,
      createdAt:      Date.now(),
      completedAt:    null,
    };
    await col.insertOne(asn);
    created.push(asn);
  }
  return created;
}

export async function getAssignment(assignmentId) {
  if (!assignmentId) return null;
  const col = await getCol();
  return col.findOne({ _id: assignmentId });
}

export async function listAssignmentsForOwner(ownerId, { templateId } = {}) {
  const col = await getCol();
  const query = { ownerId };
  if (templateId) query.templateId = templateId;
  return col.find(query).sort({ createdAt: -1 }).limit(200).toArray();
}

export async function listAssignmentsForCandidate(candidateId, candidateEmail) {
  const col = await getCol();
  return col
    .find({ $or: [{ candidateId }, { candidateEmail }] })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
}

export async function updateAssignment(assignmentId, patch) {
  const col = await getCol();
  const { _id, ...safe } = patch;
  await col.updateOne({ _id: assignmentId }, { $set: safe });
  return col.findOne({ _id: assignmentId });
}

// Owner-scoped delete. Linked session record (if any) is left intact so the
// transcript / feedback survives — only the scheduling link is removed.
export async function deleteAssignment(assignmentId, ownerId) {
  const col = await getCol();
  return col.deleteOne({ _id: assignmentId, ownerId });
}
