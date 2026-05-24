import { requireRole } from '@/lib/auth';
import InterviewerDashboard from './dashboard';

export default async function Page() {
  const user = await requireRole('interviewer');
  return <InterviewerDashboard user={{ _id: user._id, name: user.name, email: user.email }} />;
}
