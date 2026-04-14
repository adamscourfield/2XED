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
  title: '2XED',
  description: 'Adaptive mastery learning platform',
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
