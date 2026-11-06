import { ApplicationFrame } from '@/components/application/frame';
import { AuthPage } from '@/components/application/auth';

export const metadata = { title: 'Sign in', description: 'Sign in to your ReadAgora account.', robots: { index: false, follow: false } };

export default function LoginPage() {
  return <ApplicationFrame><AuthPage mode="login" /></ApplicationFrame>;
}
