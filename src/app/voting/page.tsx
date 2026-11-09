import { ApplicationFrame } from '@/components/application/frame';
import { VotingPage } from '@/components/application/voting';

export const metadata = {
  title: 'Community voting',
  description: 'Read ReadAgora event entries and cast your verified vote.',
};

export default function CommunityVotingPage() {
  return <ApplicationFrame><VotingPage /></ApplicationFrame>;
}
