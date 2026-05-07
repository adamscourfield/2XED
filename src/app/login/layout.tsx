import type { ReactNode } from 'react';
import { Manrope } from 'next/font/google';

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
});

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${manrope.className} anx-app-canvas min-h-[100dvh] text-[#2D236E] antialiased`}
    >
      {children}
    </div>
  );
}
