import type { Metadata } from 'next';
import { Fraunces, Inter, Plus_Jakarta_Sans, Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

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

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
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
    images: ['/Ember_logo_icon.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ember',
    description: 'Adaptive mastery learning platform',
    images: ['/Ember_logo_icon.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${plusJakarta.variable} ${manrope.variable} ${spaceGrotesk.variable} ${fraunces.variable}`}
    >
      <body className={`${manrope.className} bg-surface text-on-surface antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
