import { ApplicationFrame } from '@/components/application/frame';
import { DiscoveryPage } from '@/components/application/discovery';

export const metadata = { title: 'Discover stories', description: 'Find your next world in stories and comics from ReadAgora creators.' };

export default function HomePage() {
  return <ApplicationFrame><DiscoveryPage /></ApplicationFrame>;
}
