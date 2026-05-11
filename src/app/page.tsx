import type { Metadata } from 'next';
import LandingPage from '@/components/marketing/LandingPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ember — Teach the Room',
  description:
    'Supercharge your teaching. Ember helps you find misconceptions in real-time, so you can 2x student learning with data-driven insights.',
  openGraph: {
    title: 'Ember — Teach the Room',
    description:
      'Supercharge your teaching. Ember helps you find misconceptions in real-time, so you can 2x student learning with data-driven insights.',
    images: ['/Ember_logo_icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ember — Teach the Room',
    description:
      'Supercharge your teaching. Ember helps you find misconceptions in real-time, so you can 2x student learning with data-driven insights.',
    images: ['/Ember_logo_icon.png'],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
