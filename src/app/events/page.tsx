import { ApplicationFrame } from '@/components/application/frame';
import { EventsPage as EventsScreen } from '@/components/application/events';

export const metadata = { title: 'Events', description: 'Discover ReadAgora writing challenges, event updates, and verified champions.' };

export default function EventsPage() {
  return <ApplicationFrame><EventsScreen /></ApplicationFrame>;
}
