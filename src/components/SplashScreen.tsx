'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface SplashScreenProps {
  onComplete?: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  const reducedExitRef = useRef(false);
  const [visible, setVisible] = useState(true);
  const [lettersReady, setLettersReady] = useState(false);

  const skipSplash = useCallback(() => {
    setVisible(false);
    const delay = prefersReducedMotion === true ? 0 : 900;
    window.setTimeout(() => {
      onComplete?.();
    }, delay);
  }, [onComplete, prefersReducedMotion]);

  useEffect(() => {
    if (prefersReducedMotion !== true) return;
    if (reducedExitRef.current) return;
    reducedExitRef.current = true;
    skipSplash();
  }, [prefersReducedMotion, skipSplash]);

  useEffect(() => {
    if (prefersReducedMotion === true) return;
    const timer = setTimeout(() => {
      if (visible) skipSplash();
    }, 4000);

    const letterTimer = setTimeout(() => setLettersReady(true), 1800);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipSplash();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      clearTimeout(timer);
      clearTimeout(letterTimer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [visible, skipSplash, prefersReducedMotion]);

  if (prefersReducedMotion === true) {
    return null;
  }

  const tagline = 'Teach the Room';
  const letters = tagline.split('');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer bg-[#FAFAF8]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.08, filter: 'brightness(1.4)' }}
          transition={{ duration: 0.9, ease: EASE }}
          aria-hidden="true"
          onClick={(e) => {
            const target = e.currentTarget;
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const ripple = document.createElement('div');
            ripple.style.cssText = `
              position: absolute;
              left: ${x}px;
              top: ${y}px;
              width: 0;
              height: 0;
              border-radius: 50%;
              border: 1px solid rgba(59,31,122,0.2);
              animation: shockwaveExpand 0.6s ease-out forwards;
              pointer-events: none;
              z-index: 100;
            `;
            target.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
            skipSplash();
          }}
        >
          <style>{`
            @keyframes shockwaveExpand {
              0% { width: 0; height: 0; opacity: 1; margin-left: 0; margin-top: 0; }
              100% { width: 300px; height: 300px; opacity: 0; margin-left: -150px; margin-top: -150px; }
            }
            @keyframes drawStroke {
              to { stroke-dashoffset: 0; }
            }
            @keyframes ambientPulse {
              0%, 100% { transform: scale(1); opacity: 0.6; }
              50% { transform: scale(1.15); opacity: 1; }
            }
            @keyframes iconGlowBreathe {
              0%, 100% { transform: scale(1); opacity: 0.7; }
              50% { transform: scale(1.2); opacity: 1; }
            }
            @keyframes crosshairReveal {
              0% { opacity: 0; transform: scale(0.5); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes crosshairFade {
              to { opacity: 0; }
            }
            @keyframes skipFade {
              0% { opacity: 0; }
              100% { opacity: 1; }
            }
          `}</style>

          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: 600,
              height: 600,
              background:
                'radial-gradient(circle, rgba(59,31,122,0.04) 0%, rgba(255,107,107,0.02) 40%, transparent 70%)',
              animation: 'ambientPulse 4s ease-in-out infinite',
            }}
          />

          <svg
            className="absolute pointer-events-none"
            style={{ width: 500, height: 500, opacity: 0, animation: 'linesFadeIn 0.6s ease-out 0.2s forwards' }}
            viewBox="0 0 400 400"
          >
            <style>{`
              @keyframes linesFadeIn { to { opacity: 1; } }
              .draw-line { stroke-dasharray: 40; stroke-dashoffset: 40; animation: drawStroke 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
              .draw-line.d1 { animation-delay: 0.6s; }
              .draw-line.d2 { animation-delay: 0.8s; }
              .draw-circle { stroke-dasharray: 566; stroke-dashoffset: 566; animation: drawStroke 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards; }
            `}</style>
            <line
              x1="200"
              y1="80"
              x2="200"
              y2="120"
              stroke="rgba(59,31,122,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              className="draw-line"
            />
            <line
              x1="120"
              y1="200"
              x2="160"
              y2="200"
              stroke="rgba(59,31,122,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              className="draw-line d1"
            />
            <line
              x1="240"
              y1="200"
              x2="280"
              y2="200"
              stroke="rgba(59,31,122,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              className="draw-line d1"
            />
            <line
              x1="200"
              y1="280"
              x2="200"
              y2="320"
              stroke="rgba(59,31,122,0.12)"
              strokeWidth="1"
              strokeLinecap="round"
              className="draw-line d2"
            />
            <circle
              cx="200"
              cy="200"
              r="90"
              fill="none"
              stroke="rgba(59,31,122,0.12)"
              strokeWidth="1"
              className="draw-circle"
            />
          </svg>

          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              className="relative mb-7"
              initial={{ opacity: 0, scale: 0.6, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: EASE, delay: 0.5 }}
            >
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  inset: -40,
                  background: 'radial-gradient(circle, rgba(59,31,122,0.08) 0%, transparent 70%)',
                  animation: 'iconGlowBreathe 3s ease-in-out infinite',
                }}
              />
              <Image
                src="/Ember_logo_icon.png"
                alt="Ember"
                width={320}
                height={320}
                className="relative z-10 h-20 w-auto"
                style={{ filter: 'drop-shadow(0 4px 20px rgba(59,31,122,0.1))' }}
                priority
              />
            </motion.div>

            <div
              className="mb-8 overflow-hidden"
              style={{ opacity: 0, animation: 'linesFadeIn 0.1s ease-out 1.0s forwards' }}
            >
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: EASE, delay: 1.1 }}
              >
                <Image
                  src="/Ember_logo_text.png"
                  alt="Ember"
                  width={360}
                  height={96}
                  className="block h-8 w-auto"
                  style={{ filter: 'contrast(1.1)' }}
                  priority
                />
              </motion.div>
            </div>

            <div className="flex h-6 items-center justify-center">
              <span
                className="flex"
                style={{
                  fontFamily: 'Space Grotesk, sans-serif',
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: '0.25em',
                  textTransform: 'uppercase',
                  color: '#9B8CB3',
                }}
              >
                {letters.map((char, i) => (
                  <motion.span
                    key={i}
                    className="inline-block"
                    style={char === ' ' ? { width: '0.6em' } : {}}
                    initial={char === ' ' ? {} : { opacity: 0, y: 12, scale: 0.9 }}
                    animate={lettersReady && char !== ' ' ? { opacity: 1, y: 0, scale: 1 } : {}}
                    transition={{
                      duration: 0.5,
                      ease: EASE,
                      delay: i * 0.08,
                    }}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </motion.span>
                ))}
              </span>
            </div>
          </div>

          {[
            { top: 40, left: 40 },
            { top: 40, right: 40 },
            { bottom: 40, left: 40 },
            { bottom: 40, right: 40 },
          ].map((pos, i) => (
            <div
              key={i}
              className="pointer-events-none absolute"
              style={{
                ...pos,
                width: 24,
                height: 24,
                opacity: 0,
                animation: `crosshairReveal 0.4s ease-out 2.8s forwards, crosshairFade 0.4s ease-in 3.6s forwards`,
              }}
            >
              <div
                className="absolute bg-[rgba(59,31,122,0.15)]"
                style={{ width: 1, height: '100%', left: '50%', transform: 'translateX(-50%)' }}
              />
              <div
                className="absolute bg-[rgba(59,31,122,0.15)]"
                style={{ height: 1, width: '100%', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          ))}

          <div
            className="absolute bottom-9 left-1/2 -translate-x-1/2 cursor-pointer text-[10px] uppercase tracking-[0.2em] transition-colors duration-300 hover:text-[rgba(59,31,122,0.5)]"
            style={{ color: 'rgba(59,31,122,0.25)', opacity: 0, animation: 'skipFade 0.5s ease-out 3.0s forwards' }}
            onClick={(e) => {
              e.stopPropagation();
              skipSplash();
            }}
          >
            Click to enter
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
