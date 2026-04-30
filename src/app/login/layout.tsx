import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${inter.className} anx-app-canvas min-h-[100dvh] text-[#2D236E] antialiased`}
    >
      {children}
    </div>
  );
}
