import { ApplicationFrame } from '@/components/application/frame';
import { AuthPage } from '@/components/application/auth';

export const metadata = { title: 'Create your account', description: 'Join ReadAgora as a reader and creator.', robots: { index: false, follow: false } };

export default function SignupPage() {
  return <ApplicationFrame><AuthPage mode="signup" /></ApplicationFrame>;
}
