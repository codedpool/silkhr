import { requireUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

// Redirect old /history to role-specific dashboard.
export default async function Page() {
  const user = await requireUser();
  redirect(user.role === 'interviewer' ? '/interviewer?tab=results' : '/candidate?tab=mock');
}
