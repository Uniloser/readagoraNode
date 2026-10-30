import type { Metadata } from 'next';
import OnboardingExperience from '../components/onboarding/onboarding-experience';

export const metadata: Metadata = { title: 'Welcome to ReadAgora', description: 'Discover stories, shape your reading experience, and connect with readers and writers.' };

export default function OnboardingPage() { return <OnboardingExperience />; }
