import { getDb } from './db';

function newId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? `tpl_${crypto.randomUUID()}`
    : `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function getCol() {
  const db = await getDb();
  return db.collection('templates');
}

export async function createTemplate(ownerId, input) {
  const tpl = {
    _id: newId(),
    ownerId,
    name:              String(input.name || '').trim() || 'Untitled template',
    role:              String(input.role || '').trim(),
    jobDescription:    String(input.jobDescription || '').trim(),
    resumeHighlights:  String(input.resumeHighlights || '').trim(),
    interviewType:     input.interviewType || 'Technical',
    durationMinutes:   Number(input.durationMinutes) || 10,
    pressureMode:      !!input.pressureMode,
    hinglishMode:      !!input.hinglishMode,
    deepFollowups:     !!input.deepFollowups,
    createdAt:         Date.now(),
  };
  const col = await getCol();
  await col.insertOne(tpl);
  return tpl;
}

export async function listTemplates(ownerId) {
  const col = await getCol();
  return col.find({ ownerId }).sort({ createdAt: -1 }).limit(100).toArray();
}

export async function getTemplate(templateId) {
  if (!templateId) return null;
  const col = await getCol();
  return col.findOne({ _id: templateId });
}

export async function deleteTemplate(templateId, ownerId) {
  const col = await getCol();
  return col.deleteOne({ _id: templateId, ownerId });
}
