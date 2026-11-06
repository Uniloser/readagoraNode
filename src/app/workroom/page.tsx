import { ApplicationFrame } from '@/components/application/frame';
import { WorkroomPage as Workroom } from '@/components/application/workroom';

export const metadata = { title: 'Creator Workroom', description: 'Create stories, manage chapters, and review your ReadAgora readership.', robots: { index: false, follow: false } };

export default function WorkroomPage() {
  return <ApplicationFrame><Workroom /></ApplicationFrame>;
}
