import { redirect } from 'next/navigation';

export const metadata = { title: 'Your profile', description: 'Manage your ReadAgora profile and account settings.', robots: { index: false, follow: false } };

export default function AccountPage() {
  redirect('/profile');
}
