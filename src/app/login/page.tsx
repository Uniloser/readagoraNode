import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Sign in', description: 'Sign in to your ReadAgora account.', robots: { index: false, follow: false } };

export default function LoginPage() {
  return <LegacySiteRuntime title="Welcome back" description="Sign in to pick up where your reading journey left off." />;
}
