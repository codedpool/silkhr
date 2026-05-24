import { createSession, saveSession } from '@/lib/sessions';
import { generateQuestions } from '@/lib/gemini';
import { mintSilkWS } from '@/lib/silk';
import { requireUser } from '@/lib/auth';
import { getTemplate } from '@/lib/templates';
import { getAssignment, updateAssignment } from '@/lib/assignments';

export async function POST(request) {
  const user = await requireUser();

  let body;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  let config;
  let assignmentId = null;
  let kind = 'mock';

  // ── Scheduled path: candidate taking an assigned interview ──
  if (body?.assignmentId) {
    if (user.role !== 'candidate') {
      return Response.json({ error: 'Only candidates can take scheduled interviews' }, { status: 403 });
    }
    const asn = await getAssignment(body.assignmentId);
    if (!asn) return Response.json({ error: 'Assignment not found' }, { status: 404 });
    if (asn.candidateId && asn.candidateId !== user._id) {
      return Response.json({ error: 'This assignment is not for you' }, { status: 403 });
    }
    if (asn.candidateEmail && asn.candidateEmail !== user.email) {
      return Response.json({ error: 'This assignment is not for you' }, { status: 403 });
    }
    if (asn.status === 'completed') {
      return Response.json({ error: 'Already completed', sessionId: asn.sessionId }, { status: 409 });
    }

    const tpl = await getTemplate(asn.templateId);
    if (!tpl) return Response.json({ error: 'Template missing' }, { status: 404 });

    config = {
      role:             tpl.role,
      jobDescription:   tpl.jobDescription,
      resumeHighlights: tpl.resumeHighlights || '',
      interviewType:    tpl.interviewType,
      durationMinutes:  tpl.durationMinutes,
      pressureMode:     !!tpl.pressureMode,
      hinglishMode:     !!tpl.hinglishMode,
      deepFollowups:    !!tpl.deepFollowups,
    };
    assignmentId = asn._id;
    kind = 'scheduled';
  }
  // ── Mock path: candidate (or interviewer testing) self-configures ──
  else {
    const {
      role,
      jobDescription,
      resumeHighlights = '',
      interviewType = 'Technical',
      durationMinutes = 10,
      pressure = false,
      hinglish = false,
      deepFollowups = false,
    } = body || {};

    if (!role?.trim() || !jobDescription?.trim()) {
      return Response.json({ error: 'role and jobDescription are required' }, { status: 400 });
    }

    config = {
      role: role.trim(),
      jobDescription: jobDescription.trim(),
      resumeHighlights: resumeHighlights.trim(),
      interviewType,
      durationMinutes,
      pressureMode: !!pressure,
      hinglishMode: !!hinglish,
      deepFollowups: !!deepFollowups,
    };
  }

  const session = await createSession(config);
  session.kind         = kind;
  session.candidateId  = user._id;
  session.assignmentId = assignmentId;
  session.released     = kind === 'mock'; // mocks are always visible to their owner

  let baseQuestions;
  try {
    baseQuestions = await generateQuestions(config);
  } catch (err) {
    console.error('[start-session] Gemini failed:', err);
    baseQuestions = [
      `To kick things off — walk me through your background and what drew you to this ${config.role} role.`,
      `What's a recent project you shipped that you're proud of, and what was your specific contribution?`,
      `Tell me about a time something broke in production. How did you debug it?`,
      `Where do you want to grow technically over the next year or two?`,
    ];
  }
  session.baseQuestions = baseQuestions;

  const q1 = baseQuestions[0];
  session.questions = [q1];
  session.questionFollowups = [false];
  session.currentQuestionIndex = 0;
  session.nextBaseIndex = 1;
  session.status = 'active';

  await saveSession(session);

  if (assignmentId) {
    await updateAssignment(assignmentId, { status: 'in_progress', sessionId: session.sessionId });
  }

  let voice = null;
  try {
    voice = await mintSilkWS(q1, { tone: session.voiceProfile.tone });
  } catch (err) {
    console.error('[start-session] Silk WS mint failed:', err);
  }

  return Response.json({
    sessionId: session.sessionId,
    firstQuestion: q1,
    totalQuestions: session.baseQuestions.length,
    voice,
  });
}
