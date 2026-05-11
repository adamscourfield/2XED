'use client';

import { useState } from 'react';
import SplashScreen from '@/components/SplashScreen';
import { MARKETING_LANDING_HTML } from '@/content/marketingLandingHtml';

function marketingSrcDoc() {
  const base = typeof window !== 'undefined' ? `<base href="${window.location.origin}/">` : '';
  return MARKETING_LANDING_HTML.replace('<head>', `<head>\n    ${base}`);
}

export default function HomePageClient() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      {splashDone ? (
        <iframe
          title="Ember — Teach the Room"
          srcDoc={marketingSrcDoc()}
          className="fixed inset-0 h-[100dvh] w-full border-0"
        />
      ) : null}
    </>
  );
}
