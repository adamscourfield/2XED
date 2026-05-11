'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  Zap,
  ScanEye,
  Activity,
  Target,
  BarChart3,
  Users,
  Sparkles,
  AlertTriangle,
  MousePointerClick,
  AlertCircle,
  FileText,
  Route,
  Check,
  Send,
  X,
  ArrowRight,
  PlayCircle,
  Menu,
  CheckCircle,
} from 'lucide-react';
import SplashScreen from '@/components/SplashScreen';
import { patterns, students } from '@/components/marketing/landingData';

const features: {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}[] = [
  {
    icon: ScanEye,
    title: 'Misconception Radar',
    desc: 'AI-powered detection identifies exactly where students are getting stuck, before it becomes a habit.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: Activity,
    title: 'Live Understanding Map',
    desc: 'See comprehension levels across your entire class in real-time, displayed in an intuitive visual grid.',
    color: 'bg-red-50 text-red-500',
  },
  {
    icon: Target,
    title: 'Smart Interventions',
    desc: 'Get actionable suggestions on which students need help and exactly what concept to reteach.',
    color: 'bg-orange-50 text-orange-500',
  },
  {
    icon: BarChart3,
    title: 'Progress Analytics',
    desc: 'Track learning velocity over time. See which teaching methods drive the fastest gains.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: Users,
    title: 'Group Formation',
    desc: 'Automatically create optimal peer groups based on complementary strengths and gaps.',
    color: 'bg-red-50 text-red-500',
  },
  {
    icon: Sparkles,
    title: 'Lesson Recommendations',
    desc: 'AI suggests the next best activity based on where the class actually is, not where the plan says.',
    color: 'bg-orange-50 text-orange-500',
  },
];

const steps = [
  {
    num: '1',
    title: 'Set Your Lesson',
    desc: 'Input your learning objectives. Ember maps the key concepts students need to master.',
    color: 'bg-purple-700',
    shadow: 'shadow-purple-500/20',
  },
  {
    num: '2',
    title: 'Teach & Monitor',
    desc: 'Run your class as normal. Ember silently analyzes responses and engagement in real-time.',
    color: 'bg-red-400',
    shadow: 'shadow-red-400/20',
  },
  {
    num: '3',
    title: 'Act on Insights',
    desc: 'Receive instant alerts on misconceptions and targeted suggestions to close gaps immediately.',
    color: 'bg-orange-400',
    shadow: 'shadow-orange-400/20',
  },
];

const stats = [
  { value: '2x', label: 'Faster Learning' },
  { value: '85%', label: 'Misconceptions Caught' },
  { value: '30min', label: 'Setup Time' },
  { value: '500+', label: 'Teachers Onboard' },
];

const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6 } } };
const slideUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function LandingPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [signInOpen, setSignInOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  const [scrolled, setScrolled] = useState(false);
  const [counters, setCounters] = useState({ stat1: '0', stat2: '0', stat3: '0' });
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSignInOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: '', visible: false }), 3000);
  }, []);

  const animateCounter = useCallback((key: 'stat1' | 'stat2' | 'stat3', target: number, suffix: string) => {
    let current = 0;
    const increment = target / 50;
    const timer = window.setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      setCounters((prev) => ({
        ...prev,
        [key]: `${Math.floor(current)}${suffix}`,
      }));
    }, 30);
  }, []);

  useEffect(() => {
    if (!heroRef.current) return;
    const el = heroRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter('stat1', 28, '');
            animateCounter('stat2', 4, '');
            animateCounter('stat3', 85, '%');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animateCounter]);

  const selectStudent = (id: number) => {
    setSelectedStudentId(id);
    setSelectedRouteIndex(null);
  };

  const clearSelection = () => {
    setSelectedStudentId(null);
    setSelectedRouteIndex(null);
  };

  const selectRoute = (idx: number) => {
    setSelectedRouteIndex(idx);
  };

  const deployRoute = () => {
    const student = students.find((s) => s.id === selectedStudentId);
    if (student && selectedRouteIndex !== null && student.misconception) {
      const route = student.misconception.routes[selectedRouteIndex];
      showToast(`Deployed "${route.name}" to ${student.name}`);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-white font-[family-name:var(--font-inter)] text-gray-800 antialiased">
      <AnimatePresence>{showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}</AnimatePresence>

      <AnimatePresence>
        {signInOpen && (
          <motion.div
            key="signin"
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSignInOpen(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-labelledby="sign-in-heading"
                className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSignInOpen(false)}
                  className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-gray-600" />
                </button>
                <div className="mb-8 text-center">
                  <div className="mb-4 flex items-center justify-center gap-3">
                    <Image src="/Ember_logo_icon.png" alt="" width={120} height={120} className="h-12 w-auto" priority />
                    <Image src="/Ember_logo_text.png" alt="" width={280} height={80} className="h-7 w-auto" priority />
                  </div>
                  <h2 id="sign-in-heading" className="font-marketing text-2xl font-bold text-gray-900">
                    Welcome back
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">Sign in to your Ember dashboard</p>
                </div>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSignInOpen(false);
                    router.push('/login');
                  }}
                >
                  <div>
                    <label htmlFor="landing-signin-email" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      id="landing-signin-email"
                      type="email"
                      placeholder="teacher@school.edu"
                      autoComplete="email"
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-purple-800 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="landing-signin-password" className="mb-1.5 block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <input
                      id="landing-signin-password"
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-gray-700 transition-colors focus:border-purple-800 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-purple-800 focus:ring-purple-800" />
                      <span className="text-gray-600">Remember me</span>
                    </label>
                    <Link href="mailto:admin@ember.local?subject=Password%20reset%20request" className="font-medium text-purple-800 hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-purple-800 via-purple-600 to-red-400 py-3.5 font-semibold text-white transition-all hover:shadow-lg hover:shadow-purple-500/30"
                  >
                    Sign In
                  </button>
                </form>
                <div className="mt-6 text-center">
                  <p className="text-sm text-gray-500">
                    Need an account?{' '}
                    <span className="font-semibold text-purple-800">Get early access</span> via your school contact.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast.visible && (
          <motion.div
            className="fixed bottom-6 right-6 z-[110] flex items-center gap-3 rounded-xl bg-gray-900 px-6 py-3 text-white shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <CheckCircle className="h-5 w-5 text-green-400" />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/90 shadow-sm backdrop-blur-lg' : ''
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/Ember_logo_icon.png" alt="Ember" width={160} height={160} className="h-14 w-auto" priority />
              <Image
                src="/Ember_logo_text.png"
                alt="Ember"
                width={320}
                height={96}
                className="hidden h-9 w-auto sm:block"
                priority
              />
            </div>
            <div className="hidden items-center gap-8 md:flex">
              <a href="#features" className="text-sm font-medium text-gray-600 transition-colors hover:text-purple-800">
                Features
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 transition-colors hover:text-purple-800">
                How it Works
              </a>
              <a href="#demo" className="text-sm font-medium text-gray-600 transition-colors hover:text-purple-800">
                Demo
              </a>
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="text-sm font-semibold text-purple-800 transition-colors hover:text-purple-600"
              >
                Sign In
              </button>
              <button
                type="button"
                className="rounded-full bg-purple-800 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-opacity-90 hover:shadow-lg hover:shadow-purple-500/20"
              >
                Get Early Access
              </button>
            </div>
            <div className="flex items-center gap-4 md:hidden">
              <button type="button" onClick={() => setSignInOpen(true)} className="text-sm font-semibold text-purple-800">
                Sign In
              </button>
              <button type="button" className="p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-expanded={mobileMenuOpen}>
                <Menu className="h-6 w-6 text-purple-800" />
              </button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="border-t border-gray-100 bg-white/95 backdrop-blur-lg md:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="space-y-3 px-6 py-4">
                <a href="#features" className="block text-sm font-medium text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </a>
                <a href="#how-it-works" className="block text-sm font-medium text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                  How it Works
                </a>
                <a href="#demo" className="block text-sm font-medium text-gray-600" onClick={() => setMobileMenuOpen(false)}>
                  Demo
                </a>
                <button
                  type="button"
                  className="w-full rounded-full bg-purple-800 px-6 py-2.5 text-sm font-semibold text-white"
                >
                  Get Early Access
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <section
        ref={heroRef}
        className="relative flex min-h-screen items-center overflow-hidden pt-20"
        style={{
          backgroundColor: '#ffffff',
          backgroundImage:
            'radial-gradient(at 20% 30%, rgba(59, 31, 122, 0.08) 0px, transparent 50%), radial-gradient(at 80% 70%, rgba(255, 107, 107, 0.06) 0px, transparent 50%), radial-gradient(at 50% 50%, rgba(255, 142, 83, 0.04) 0px, transparent 50%)',
        }}
      >
        <div className="absolute left-0 top-0 h-96 w-96 animate-blob rounded-full bg-purple-800 opacity-40 blur-3xl" style={{ animationDelay: '0s' }} />
        <div
          className="absolute bottom-0 right-0 h-80 w-80 animate-blob rounded-full bg-red-400 opacity-40 blur-3xl"
          style={{ animationDelay: '-5s' }}
        />
        <div
          className="animate-blob absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400 opacity-40 blur-3xl"
          style={{ animationDelay: '-10s' }}
        />

        <style>{`
          @keyframes blob-bounce {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -50px) scale(1.1); }
            66% { transform: translate(-20px, 20px) scale(0.9); }
          }
          .animate-blob { animation: blob-bounce 20s infinite ease-in-out; }
          .gradient-text { background: linear-gradient(135deg, #3B1F7A 0%, #FF6B6B 50%, #FF8E53 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        `}</style>

        <div className="relative z-10 mx-auto max-w-7xl px-6 py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div
              className="space-y-8"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
                <span className="text-sm font-semibold text-purple-800">Coming Soon — Join the Waitlist</span>
              </motion.div>

              <motion.h1 variants={slideUp} className="font-marketing text-5xl font-bold leading-tight md:text-7xl">
                Teach the
                <br />
                <span className="gradient-text">Room</span>
              </motion.h1>

              <motion.p variants={slideUp} className="max-w-lg text-xl leading-relaxed text-gray-600">
                Supercharge your teaching. Ember helps you find misconceptions in real-time, so you can 2x student learning with
                data-driven insights.
              </motion.p>

              <motion.div variants={slideUp} className="flex flex-col gap-4 sm:flex-row">
                <button
                  type="button"
                  className="flex transform items-center justify-center gap-2 rounded-full bg-gradient-to-r from-purple-800 via-purple-600 to-red-400 px-8 py-4 font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/30"
                >
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  className="group flex items-center justify-center gap-2 rounded-full border-2 border-purple-200 bg-white px-8 py-4 font-semibold text-purple-800 transition-all hover:border-purple-400"
                >
                  <PlayCircle className="h-5 w-5 transition-colors group-hover:text-red-400" />
                  Watch Demo
                </button>
              </motion.div>

              <motion.div variants={slideUp} className="flex items-center gap-6 pt-4">
                <div className="flex -space-x-3">
                  {[1, 5, 8, 12].map((img) => (
                    <Image
                      key={img}
                      src={`https://i.pravatar.cc/150?img=${img}`}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border-2 border-white"
                      alt=""
                    />
                  ))}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-bold text-purple-800">500+</span> teachers already signed up
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={scaleIn} initial="hidden" whileInView="visible" viewport={{ once: true }} className="relative">
              <div className="relative rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl shadow-purple-500/10">
                <div className="mb-6 flex items-center gap-2 border-b border-gray-100 pb-4">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-sm font-medium text-gray-400">Ember Dashboard</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-purple-50 p-4 text-center">
                      <div className="text-2xl font-bold text-purple-800">{counters.stat1}</div>
                      <div className="mt-1 text-xs text-gray-500">Active Students</div>
                    </div>
                    <div className="rounded-xl bg-red-50 p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{counters.stat2}</div>
                      <div className="mt-1 text-xs text-gray-500">Misconceptions</div>
                    </div>
                    <div className="rounded-xl bg-orange-50 p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400">{counters.stat3}</div>
                      <div className="mt-1 text-xs text-gray-500">Learning Gain</div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Live Understanding Map</span>
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                        Live
                      </span>
                    </div>
                    <LiveStudentGrid />
                  </div>

                  <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">Concept Gap Detected</div>
                        <div className="mt-1 text-xs text-gray-600">32% of students struggling with &quot;Photosynthesis Process&quot;</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                className="absolute -right-6 -top-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-purple-100"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Brain className="h-8 w-8 text-purple-800" />
              </motion.div>
              <motion.div
                className="absolute -bottom-4 -left-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
              >
                <Zap className="h-6 w-6 text-red-400" />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="py-24"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage:
            'radial-gradient(at 40% 20%, rgba(59, 31, 122, 0.05) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 107, 107, 0.05) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(255, 142, 83, 0.03) 0px, transparent 50%), radial-gradient(at 80% 50%, rgba(59, 31, 122, 0.05) 0px, transparent 50%), radial-gradient(at 0% 100%, rgba(255, 107, 107, 0.05) 0px, transparent 50%)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mx-auto mb-16 max-w-3xl text-center"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="mb-4 inline-block rounded-full bg-purple-50 px-4 py-1.5 text-sm font-semibold text-purple-800">
              Features
            </span>
            <h2 className="font-marketing mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
              Everything you need to <span className="gradient-text">2x learning</span>
            </h2>
            <p className="text-lg text-gray-600">Real-time insights that transform how you teach and how students learn.</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="rounded-2xl border border-gray-100 bg-white p-8 shadow-lg shadow-gray-200/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-purple-500/15"
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${feature.color}`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="font-marketing mb-3 text-xl font-bold text-gray-900">{feature.title}</h3>
                <p className="leading-relaxed text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mx-auto mb-20 max-w-3xl text-center"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="mb-4 inline-block rounded-full bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-400">
              How It Works
            </span>
            <h2 className="font-marketing text-4xl font-bold text-gray-900 md:text-5xl">
              Three steps to <span className="gradient-text">smarter teaching</span>
            </h2>
          </motion.div>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16.67%] right-[16.67%] top-8 z-0 hidden h-0.5 bg-gradient-to-r from-purple-800 via-red-400 to-orange-400 md:block" />

            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="relative z-10 text-center"
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
              >
                <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg ${step.color} ${step.shadow}`}>
                  <span className="text-2xl font-bold text-white">{step.num}</span>
                </div>
                <h3 className="font-marketing mb-3 text-xl font-bold text-gray-900">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="demo"
        className="py-24"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage:
            'radial-gradient(at 40% 20%, rgba(59, 31, 122, 0.05) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 107, 107, 0.05) 0px, transparent 50%)',
        }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            className="mx-auto mb-16 max-w-3xl text-center"
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <span className="mb-4 inline-block rounded-full bg-purple-50 px-4 py-1.5 text-sm font-semibold text-purple-800">
              Interactive Demo
            </span>
            <h2 className="font-marketing mb-6 text-4xl font-bold text-gray-900 md:text-5xl">
              See misconceptions, then <span className="gradient-text">fix them</span>
            </h2>
            <p className="text-lg text-gray-600">
              Click a struggling student to see their thinking, detect the pattern, and get an AI-recommended reteaching route.
            </p>
          </motion.div>

          <div className="grid gap-8 lg:grid-cols-5">
            <motion.div className="lg:col-span-2" variants={slideUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
              <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-purple-500/5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="font-marketing font-bold text-gray-900">Classroom View</div>
                    <div className="text-sm text-gray-500">Grade 7 — Photosynthesis</div>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Live
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-green-400" /> On Track
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-yellow-400" /> Needs Check
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded bg-red-400" /> Misconception
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-4 gap-3">
                  {students.map((student) => {
                    const isSelected = selectedStudentId === student.id;
                    const hasMisconception = student.misconception !== null;
                    return (
                      <button
                        key={student.id}
                        type="button"
                        className={`relative aspect-square w-full rounded-xl opacity-90 transition-all hover:opacity-100 ${student.color} ${
                          isSelected ? 'ring-2 ring-purple-800 ring-offset-2' : ''
                        } ${hasMisconception && !isSelected ? 'animate-pulse' : ''}`}
                        onClick={() => selectStudent(student.id)}
                        aria-pressed={isSelected}
                        aria-label={`${student.name}: ${student.status}`}
                      >
                        <span className="pointer-events-none absolute -top-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100">
                          {student.name}: {student.status}
                        </span>
                        {hasMisconception ? (
                          <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-red-400" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700">Detected Patterns</span>
                    <span className="text-xs text-gray-400">Just now</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {patterns.map((p) => (
                      <span
                        key={p.label}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${p.color}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {p.label}
                        <span className="opacity-60">({p.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="lg:col-span-3"
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex h-full flex-col rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-purple-500/5">
                {!selectedStudent ? (
                  <div className="flex h-full flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50">
                      <MousePointerClick className="h-8 w-8 text-purple-800" />
                    </div>
                    <h3 className="font-marketing mb-2 text-xl font-bold text-gray-900">Select a Student</h3>
                    <p className="max-w-sm text-gray-500">
                      Click on any student dot in the classroom grid to see their misconceptions and get AI-recommended teaching routes.
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
                      <div
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-xl font-bold text-white ${selectedStudent.color}`}
                      >
                        {selectedStudent.name.split(' ')[0]?.[0] ?? '?'}
                      </div>
                      <div>
                        <div className="font-marketing text-xl font-bold text-gray-900">{selectedStudent.name}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${selectedStudent.statusColor}`}>
                            {selectedStudent.status}
                          </span>
                          <span className="text-xs text-gray-500">Grade 7B</span>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="font-semibold text-gray-900">Misconception Detected</span>
                      </div>
                      {selectedStudent.misconception ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                          <div className="mb-1 font-semibold text-gray-800">{selectedStudent.misconception.title}</div>
                          <div className="text-sm text-gray-600">{selectedStudent.misconception.desc}</div>
                          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-red-400">
                            <Users className="h-4 w-4" />
                            <span>{selectedStudent.misconception.affected} also struggling</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                          <div className="mb-1 font-semibold text-gray-800">No misconception detected</div>
                          <div className="text-sm text-gray-600">This student is on track with the current lesson objectives.</div>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-900">Student Response</span>
                      </div>
                      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                        <div className="text-sm italic text-gray-700">
                          {selectedStudent.misconception?.answer ??
                            '"Plants use sunlight, water, and carbon dioxide to make glucose and oxygen through photosynthesis."'}
                        </div>
                        <div className="mt-2 text-xs text-gray-400">Q: Where does a plant get its energy from?</div>
                      </div>
                    </div>

                    {selectedStudent.misconception ? (
                      <>
                        <div className="mb-6">
                          <div className="mb-3 flex items-center gap-2">
                            <Route className="h-5 w-5 text-purple-800" />
                            <span className="font-semibold text-gray-900">AI Suggested Reteaching Routes</span>
                          </div>
                          <div className="space-y-3">
                            {selectedStudent.misconception.routes.map((route, idx) => (
                              <button
                                key={route.name}
                                type="button"
                                className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                                  selectedRouteIndex === idx ? 'border-purple-800 bg-purple-50' : 'border-gray-100 hover:border-gray-200'
                                }`}
                                onClick={() => selectRoute(idx)}
                              >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100">
                                  <span className="text-sm font-bold text-purple-800">{idx + 1}</span>
                                </div>
                                <div className="flex-1">
                                  <div className="text-sm font-semibold text-gray-800">{route.name}</div>
                                  <div className="text-xs text-gray-500">{route.time}</div>
                                </div>
                                {selectedRouteIndex === idx ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-800"
                                  >
                                    <Check className="h-4 w-4 text-white" />
                                  </motion.div>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedRouteIndex !== null && selectedStudent.misconception ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mb-6"
                            >
                              <div className="mb-3 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-orange-400" />
                                <span className="font-semibold text-gray-900">
                                  Preview: {selectedStudent.misconception.routes[selectedRouteIndex].name}
                                </span>
                              </div>
                              <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 to-red-50 p-5">
                                <div className="space-y-3">
                                  {selectedStudent.misconception.routes[selectedRouteIndex].steps.map((stepText, i) => (
                                    <motion.div
                                      key={stepText}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      transition={{ delay: i * 0.15 }}
                                      className="flex items-start gap-3"
                                    >
                                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-purple-100">
                                        <span className="text-xs font-bold text-purple-800">{i + 1}</span>
                                      </div>
                                      <div className="text-sm text-gray-700">{stepText}</div>
                                    </motion.div>
                                  ))}
                                </div>
                                <div className="mt-4 flex items-center justify-between border-t border-purple-100 pt-4">
                                  <div className="text-xs text-gray-500">
                                    <span className="font-semibold text-purple-800">Estimated time:</span>{' '}
                                    {selectedStudent.misconception.routes[selectedRouteIndex].time}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={deployRoute}
                                    className="flex items-center gap-2 rounded-lg bg-purple-800 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-opacity-90"
                                  >
                                    <Send className="h-4 w-4" />
                                    Deploy to Student
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                      </>
                    ) : null}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={clearSelection}
                        className="flex-1 rounded-xl border-2 border-gray-200 py-3 font-semibold text-gray-600 transition-all hover:border-gray-300"
                      >
                        Back to Class
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast('Intervention logged for follow-up')}
                        className="flex-1 rounded-xl bg-gradient-to-r from-purple-800 via-purple-600 to-red-400 py-3 font-semibold text-white transition-all hover:shadow-lg"
                      >
                        Log Intervention
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-purple-800 via-purple-600 to-red-400 py-20 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                variants={slideUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="font-marketing mb-2 text-4xl font-bold md:text-5xl">{stat.value}</div>
                <div className="text-white/80">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-24"
        style={{
          backgroundColor: '#fafafa',
          backgroundImage:
            'radial-gradient(at 40% 20%, rgba(59, 31, 122, 0.05) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(255, 107, 107, 0.05) 0px, transparent 50%)',
        }}
      >
        <motion.div
          className="mx-auto max-w-4xl px-6 text-center"
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <h2 className="font-marketing mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
            Ready to <span className="gradient-text">Teach the Room</span>?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-xl text-gray-600">
            Join hundreds of teachers who are already using Ember to transform their classrooms. Early access is free for the first semester.
          </p>

          <div className="mb-8 flex flex-col justify-center gap-4 sm:flex-row">
            <input
              type="email"
              placeholder="Enter your school email"
              className="w-full rounded-full border-2 border-gray-200 bg-white px-6 py-4 text-gray-700 focus:border-purple-800 focus:outline-none sm:w-80"
            />
            <button
              type="button"
              className="transform rounded-full bg-gradient-to-r from-purple-800 via-purple-600 to-red-400 px-8 py-4 font-semibold text-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/30"
            >
              Get Early Access
            </button>
          </div>

          <p className="text-sm text-gray-500">No credit card required. Free for educators during beta.</p>
        </motion.div>
      </section>

      <footer className="border-t border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div className="md:col-span-1">
              <div className="mb-4 flex items-center gap-3">
                <Image src="/Ember_logo_icon.png" alt="Ember" width={120} height={120} className="h-10 w-auto" />
                <Image src="/Ember_logo_text.png" alt="Ember" width={280} height={72} className="h-6 w-auto" />
              </div>
              <p className="text-sm text-gray-500">
                Supercharging teachers to 2x student learning through real-time misconception detection.
              </p>
            </div>
            <div>
              <div className="mb-4 font-semibold text-gray-900">Product</div>
              <div className="space-y-2 text-sm text-gray-600">
                <a href="#features" className="block transition-colors hover:text-purple-800">
                  Features
                </a>
                <span className="block text-gray-400">Pricing</span>
                <a href="#demo" className="block transition-colors hover:text-purple-800">
                  Demo
                </a>
                <span className="block text-gray-400">Changelog</span>
              </div>
            </div>
            <div>
              <div className="mb-4 font-semibold text-gray-900">Company</div>
              <div className="space-y-2 text-sm text-gray-600">
                <span className="block text-gray-400">About</span>
                <span className="block text-gray-400">Blog</span>
                <span className="block text-gray-400">Careers</span>
                <span className="block text-gray-400">Contact</span>
              </div>
            </div>
            <div>
              <div className="mb-4 font-semibold text-gray-900">Account</div>
              <div className="space-y-2 text-sm text-gray-600">
                <button type="button" onClick={() => setSignInOpen(true)} className="block text-left transition-colors hover:text-purple-800">
                  Sign In
                </button>
                <span className="block text-gray-400">Get Early Access</span>
                <span className="block text-gray-400">Privacy</span>
                <span className="block text-gray-400">Terms</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 pt-8 md:flex-row">
            <div className="text-sm text-gray-500">© 2026 Ember Education. All rights reserved.</div>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-purple-50"
                aria-label="X"
              >
                <IconX className="h-5 w-5 text-gray-600" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-purple-50"
                aria-label="LinkedIn"
              >
                <IconLinkedIn className="h-5 w-5 text-gray-600" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-purple-50"
                aria-label="GitHub"
              >
                <IconGitHub className="h-5 w-5 text-gray-600" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

const LIVE_COLORS = ['bg-green-400', 'bg-yellow-400', 'bg-red-400'] as const;

function IconX(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconLinkedIn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconGitHub(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

function LiveStudentGrid() {
  const [dots, setDots] = useState<string[]>(() => Array.from({ length: 18 }, () => 'bg-green-400'));

  useEffect(() => {
    setDots(Array.from({ length: 18 }, () => LIVE_COLORS[Math.floor(Math.random() * LIVE_COLORS.length)] ?? 'bg-green-400'));
    const interval = window.setInterval(() => {
      setDots((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * next.length);
        next[idx] = LIVE_COLORS[Math.floor(Math.random() * LIVE_COLORS.length)] ?? 'bg-green-400';
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-6 gap-2">
      {dots.map((color, i) => (
        <div
          key={i}
          className={`aspect-square w-full cursor-pointer rounded-lg opacity-80 transition-all duration-500 hover:opacity-100 ${color}`}
          title={`Student ${i + 1}`}
        />
      ))}
    </div>
  );
}
