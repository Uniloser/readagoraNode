import { ApplicationFrame } from '@/components/application/frame';
import { CommunityPage as CommunityScreen } from '@/components/application/community';

export const metadata = { title: 'Community', description: 'Join readers and creators in the ReadAgora community.' };

export default function CommunityPage() {
  return <ApplicationFrame><CommunityScreen /></ApplicationFrame>;
}
