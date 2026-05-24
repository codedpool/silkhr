import { requireRole } from '@/lib/auth';
import CandidateDashboard from './dashboard';

export default async function Page() {
  const user = await requireRole('candidate');
  return <CandidateDashboard user={{ _id: user._id, name: user.name, email: user.email }} />;
}
