import { ApplicationFrame } from '@/components/application/frame';
import { AuthCallback } from '@/components/application/auth';

export const metadata = { title: 'Complete sign-in', description: 'Complete secure sign-in to your ReadAgora account.', robots: { index: false, follow: false } };

export default function AuthCallbackPage() {
  return <ApplicationFrame><AuthCallback /></ApplicationFrame>;
}
