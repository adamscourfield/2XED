'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState(0);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const sequence = async () => {
      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;
      setPhase(1);

      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;
      setPhase(2);

      await new Promise((r) => setTimeout(r, 2000));
      if (cancelled) return;
      setPhase(3);

      await new Promise((r) => setTimeout(r, 2500));
      if (cancelled || doneRef.current) return;
      doneRef.current = true;
      setExiting(true);
      setPhase(4);
      await new Promise((r) => setTimeout(r, 800));
      if (!cancelled) onComplete?.();
    };
    sequence();
    return () => {
      cancelled = true;
    };
  }, [onComplete]);

  const skip = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setPhase(4);
    setTimeout(() => onComplete?.(), 800);
  }, [onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && skip();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [skip]);

  const tagline = 'Teach the Room';
  const letters = tagline.split('');

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-white cursor-pointer overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          onClick={skip}
        >
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 1.5 }}
            style={{
              background: 'radial-gradient(ellipse at 50% 45%, rgba(59,31,122,0.03) 0%, transparent 60%)',
            }}
          />

          <div className="relative flex flex-col items-center gap-8">
            <motion.div
              className="relative flex flex-col items-center gap-5"
              initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
              animate={phase >= 1 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ duration: 0.9, ease: EASE }}
            >
              <Image
                src="/Ember_logo_icon.png"
                alt=""
                width={320}
                height={320}
                className="h-24 w-auto drop-shadow-lg md:h-32"
                priority
              />
              <Image
                src="/Ember_logo_text.png"
                alt="Ember"
                width={400}
                height={120}
                className="h-12 w-auto drop-shadow-md md:h-16"
                priority
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent) {
                    const fallback = document.createElement('h1');
                    fallback.className = 'text-5xl md:text-7xl font-bold tracking-tight';
                    fallback.style.cssText =
                      'font-family: Space Grotesk, Inter, sans-serif; color: #3B1F7A; letter-spacing: -0.02em;';
                    fallback.textContent = 'Ember';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </motion.div>

            <motion.div
              className="h-[2px] bg-gradient-to-r from-transparent via-purple-800 to-transparent"
              initial={{ width: 0, opacity: 0 }}
              animate={phase >= 1 ? { width: 120, opacity: 0.25 } : {}}
              transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
            />

            <div className="flex items-baseline gap-1 h-8">
              {letters.map((char, i) => {
                const isSpace = char === ' ';
                return (
                  <motion.span
                    key={i}
                    className={isSpace ? 'w-3' : ''}
                    initial={{ opacity: 0, y: 12 }}
                    animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
                    transition={{
                      duration: 0.4,
                      ease: EASE,
                      delay: i * 0.06,
                    }}
                    style={{
                      fontFamily: 'Space Grotesk, Inter, sans-serif',
                      fontSize: '1.1rem',
                      fontWeight: 500,
                      letterSpacing: '0.12em',
                      textTransform: 'uppercase',
                      color: isSpace ? 'transparent' : '#9B8CB3',
                    }}
                  >
                    {isSpace ? '\u00A0' : char}
                  </motion.span>
                );
              })}
            </div>

            <motion.p
              className="absolute -bottom-16 text-xs font-medium tracking-[0.2em] uppercase"
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
              style={{ color: 'rgba(59,31,122,0.25)' }}
            >
              Real-Time Learning Intelligence
            </motion.p>
          </div>

          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.25em] uppercase font-medium cursor-pointer hover:opacity-60 transition-opacity"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 0.2 } : {}}
            transition={{ duration: 0.5, delay: 1 }}
            style={{ color: '#3B1F7A' }}
            onClick={(e) => {
              e.stopPropagation();
              skip();
            }}
          >
            Click to enter
          </motion.div>

          {[
            { top: 32, left: 32 },
            { top: 32, right: 32 },
            { bottom: 32, left: 32 },
            { bottom: 32, right: 32 },
          ].map((pos, i) => (
            <motion.div
              key={i}
              className="absolute w-6 h-6 pointer-events-none"
              style={pos}
              initial={{ opacity: 0 }}
              animate={phase >= 3 ? { opacity: 0.1 } : {}}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute top-0 left-0 w-full h-[1px] bg-purple-800" />
              <div className="absolute top-0 left-0 w-[1px] h-full bg-purple-800" />
            </motion.div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
