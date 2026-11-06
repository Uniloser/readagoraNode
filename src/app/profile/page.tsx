import { ApplicationFrame } from '@/components/application/frame';
import { ProfilePage as ProfileScreen } from '@/components/application/profile';

export const metadata = { title: 'Profile', description: 'Manage your ReadAgora profile, creator tools, and account settings.', robots: { index: false, follow: false } };

export default function ProfilePage() {
  return <ApplicationFrame><ProfileScreen /></ApplicationFrame>;
}
