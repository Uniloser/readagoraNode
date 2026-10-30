import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Complete sign-in', description: 'Complete secure sign-in to your ReadAgora account.', robots: { index: false, follow: false } };

export default function AuthCallbackPage() {
  return <LegacySiteRuntime title="Completing secure sign-in" description="Please wait while we finish signing you in." />;
}
