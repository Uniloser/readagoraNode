import { LegacySiteRuntime } from '@/components/legacy-site-runtime';

export const metadata = { title: 'Profile', description: 'Manage your ReadAgora profile, creator tools, and account settings.', robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <LegacySiteRuntime title="Your ReadAgora profile" description="Manage your identity, creator tools, rewards, and account settings." />;
}
