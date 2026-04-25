import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Manrope } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Ember',
  description: 'Adaptive mastery learning platform',
  icons: {
    icon: '/Ember_logo_icon.png',
    apple: '/Ember_logo_icon.png',
  },
  openGraph: {
    title: 'Ember',
    description: 'Adaptive mastery learning platform',
    images: ['/Ember_logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ember',
    description: 'Adaptive mastery learning platform',
    images: ['/Ember_logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${manrope.variable}`}>
      <body className={`${manrope.className} bg-surface text-on-surface antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
