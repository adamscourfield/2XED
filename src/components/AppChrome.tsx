"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { StudentTopBarSubjectSelector, type StudentTopBarSubjectOption } from "@/components/student/StudentTopBarSubjectSelector";
import { StudentTopBarUserMenu } from "@/components/student/StudentTopBarUserMenu";

export type AppChromeVariant = "student" | "teacher";

type NavIconKind =
  | "home"
  | "school"
  | "book"
  | "bookOpen"
  | "clipboardList"
  | "bolt"
  | "dashboard"
  | "radio"
  | "calendar"
  | "file"
  | "users"
  | "chart"
  | "folder"
  | "clock"
  | "help"
  | "gear";

interface NavItem {
  href: string;
  label: string;
  description?: string;
  icon: NavIconKind;
}

interface StudentSubjectNav {
  id: string;
  title: string;
  slug: string;
  href: string;
  averageMastery: number;
  dueNowCount: number;
  onboardingComplete: boolean;
}

function LogoImage({ className }: { className?: string }) {
  return (
    <Image
      src="/Ember_logo_icon.png"
      alt="Ember"
      width={512}
      height={512}
      className={className ?? "h-8 w-8"}
      priority
    />
  );
}

type NavIconChrome = "default" | "teacher";

function NavIconBox({
  kind,
  active,
  chrome = "default",
}: {
  kind: NavIconKind;
  active: boolean;
  chrome?: NavIconChrome;
}) {
  const isTeacher = chrome === "teacher";
  const box = active
    ? isTeacher
      ? "bg-[#f5f3ff] text-[#5850ec] ring-1 ring-inset ring-[#e9e5ff]"
      : "bg-[rgba(99,102,241,0.18)] text-[#4338ca]"
    : isTeacher
      ? "bg-white text-[#6b7280] ring-1 ring-inset ring-[#e5e7eb]"
      : "bg-[#f0f1f4] text-[#374151]";
  const stroke = "currentColor";
  const icon = (() => {
    switch (kind) {
      case "home":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 10.5L12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "school":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M22 19V9l-10-5-10 5v10"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M6 10.5 12 13l6-2.5" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 13v6" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "book":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <path
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path d="M8 7h8M8 11h6" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "bookOpen":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 6.5v11M12 6.5c-1.2-.67-2.75-1-4.5-1-1.4 0-2.6.22-3.5.6V18c.9-.38 2.1-.6 3.5-.6 1.75 0 3.3.33 4.5 1M12 6.5c1.2-.67 2.75-1 4.5-1 1.4 0 2.6.22 3.5.6V18c-.9-.38-2.1-.6-3.5-.6-1.75 0-3.3.33-4.5 1"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "clipboardList":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 5h-.5a1.5 1.5 0 0 0-3 0H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-.5a1.5 1.5 0 0 0-3 0H9"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M9 12h6M9 16h6M9 8h2" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "bolt":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "dashboard":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="7" height="9" rx="1.5" stroke={stroke} strokeWidth="1.75" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" stroke={stroke} strokeWidth="1.75" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" stroke={stroke} strokeWidth="1.75" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" stroke={stroke} strokeWidth="1.75" />
          </svg>
        );
      case "radio":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
              stroke={stroke}
              strokeWidth="1.75"
            />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "calendar":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" stroke={stroke} strokeWidth="1.75" />
            <path d="M16 3v4M8 3v4M3 11h18" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "file":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6M9 13h6M9 17h4" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "users":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinecap="round"
            />
            <circle cx="9" cy="7" r="4" stroke={stroke} strokeWidth="1.75" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "chart":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M4 20V4M4 20h16M8 16V11M12 16V7M16 16v-4" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        );
      case "folder":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8Z"
              stroke={stroke}
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
        );
      case "clock":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
            <path d="M12 7v5l3 2" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "help":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth="1.75" />
            <path d="M9.5 9.5a2.5 2.5 0 0 1 4.86 1c0 1.5-1.36 1.5-1.36 3" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" />
            <path d="M12 17h.01" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "gear":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              stroke={stroke}
              strokeWidth="1.75"
            />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
              stroke={stroke}
              strokeWidth="1.25"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  })();
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${box}`}
      aria-hidden
    >
      {icon}
    </span>
  );
}

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard") {
    return pathname === href;
  }
  if (href === "/teacher/dashboard") {
    return pathname === "/teacher/dashboard";
  }
  if (href === "/teacher/lessons") {
    if (pathname === "/teacher/lessons" || pathname.startsWith("/teacher/lessons/")) return true;
    if (pathname.startsWith("/teacher/live")) return true;
    return false;
  }
  if (href === "/teacher/question-bank") {
    if (pathname === "/teacher/question-bank" || pathname.startsWith("/teacher/question-bank/")) return true;
    if (pathname.startsWith("/teacher/content/review")) return true;
    return false;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isSubjectNavActive(pathname: string | null, slug: string) {
  if (!pathname) return false;
  return (
    pathname.startsWith(`/learn/${slug}`) ||
    pathname.startsWith(`/diagnostic/${slug}`) ||
    pathname.startsWith(`/baseline/${slug}`)
  );
}

interface AppChromeProps {
  variant: AppChromeVariant;
  showLeadershipNav?: boolean;
  children: ReactNode;
  /** Student dashboard-style layout: top bar only (no side nav). */
  studentLayout?: "sidebar" | "topbar";
  /** Subject options for the student top bar (Year 7 Maths style switcher). */
  studentTopBarSubjects?: StudentTopBarSubjectOption[];
}

function studentInitials(displayName: string, email: string): string {
  const name = displayName.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  const c = name.charAt(0) || email.charAt(0) || "?";
  return c.toUpperCase();
}

export function AppChrome({
  variant,
  showLeadershipNav = false,
  children,
  studentLayout = "sidebar",
  studentTopBarSubjects = [],
}: AppChromeProps) {
  const pathname = usePathname();
  const { data: authSession, status: sessionStatus } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectNav[] | null>(null);

  const role = (authSession?.user as { role?: string } | undefined)?.role;
  const userName = authSession?.user?.name ?? authSession?.user?.email ?? "Account";
  const userEmail = authSession?.user?.email ?? "";
  const initial = (userName.trim().charAt(0) || userEmail.charAt(0) || "?").toUpperCase();
  const teacherInitials =
    variant === "teacher" ? studentInitials(userName, userEmail) : initial;

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (variant !== "student" || studentLayout === "topbar") return;
    if (role !== "STUDENT" || sessionStatus !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/student/nav-summary");
        if (!res.ok) return;
        const data = (await res.json()) as { subjects: StudentSubjectNav[] };
        if (!cancelled) setStudentSubjects(data.subjects ?? []);
      } catch {
        if (!cancelled) setStudentSubjects([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, role, sessionStatus, studentLayout]);

  const homeHref = variant === "teacher" ? "/teacher/dashboard" : "/dashboard";
  const tagline = variant === "teacher" ? "Teach the Room" : "Your learning hub";

  const teacherNavPrimary: NavItem[] = [
    { href: "/teacher/dashboard", label: "Home", icon: "home" },
    { href: "/teacher/lessons", label: "Lessons", icon: "bookOpen" },
    { href: "/teacher/question-bank", label: "Question bank", icon: "clipboardList" },
    { href: "/teacher/dashboard/classes", label: "Classes", icon: "users" },
    { href: "/teacher/reports", label: "Reports", icon: "chart" },
    { href: "/teacher/resources", label: "Resources", icon: "folder" },
    { href: "/teacher/recent-sessions", label: "Recent sessions", icon: "clock" },
    ...(showLeadershipNav
      ? ([{ href: "/teacher/leadership", label: "Leadership", icon: "dashboard" }] satisfies NavItem[])
      : []),
  ];

  const teacherNavSecondary: NavItem[] = [
    { href: "/teacher/help", label: "Help centre", icon: "help" },
    { href: "/teacher/settings", label: "Settings", icon: "gear" },
  ];

  const liveStudentItem: NavItem = {
    href: "/student/live",
    label: "Join live lesson",
    description: "Enter your class code",
    icon: "bolt",
  };

  const homeStudentItem: NavItem = {
    href: "/dashboard",
    label: "Home",
    description: "Overview and next steps",
    icon: "home",
  };

  function subjectIcon(slug: string): NavItem["icon"] {
    if (slug.includes("english")) return "book";
    return "school";
  }

  function roleFooterLabel(): string {
    switch (role) {
      case "TEACHER":
        return "Teacher";
      case "ADMIN":
        return "Admin";
      case "LEADERSHIP":
        return "Leadership";
      default:
        return "Student";
    }
  }

  function NavRow({
    href,
    label,
    description,
    iconKind,
    active,
    badge,
    onNavigate,
    variant = "default",
  }: {
    href: string;
    label: string;
    description?: string;
    iconKind: NavIconKind;
    active: boolean;
    badge?: number;
    onNavigate?: () => void;
    variant?: "default" | "teacher";
  }) {
    const teacher = variant === "teacher";
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={
          teacher
            ? `group relative flex items-center gap-3 rounded-xl py-2.5 pl-3 pr-2.5 transition-colors duration-150 ${
                active
                  ? "bg-[#f5f3ff] before:absolute before:left-0 before:top-1/2 before:h-[2.125rem] before:w-[4px] before:-translate-y-1/2 before:rounded-full before:bg-[#2563eb] before:content-['']"
                  : "text-[#374151] hover:bg-[#f9fafb]"
              }`
            : `group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 pl-3 transition-colors duration-150 ${
                active
                  ? "bg-[rgba(99,102,241,0.12)] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
                  : "text-[color:var(--anx-text)] hover:bg-[var(--anx-surface-hover)]"
              }`
        }
      >
        {!teacher && active ? (
          <span
            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[#6366f1]"
            aria-hidden
          />
        ) : null}
        <NavIconBox kind={iconKind} active={active} chrome={teacher ? "teacher" : "default"} />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[0.9375rem] font-semibold leading-snug tracking-tight ${
              teacher
                ? active
                  ? "text-[#111827]"
                  : "text-[#374151]"
                : active
                  ? "text-[#312e81]"
                  : "text-[color:var(--anx-text)]"
            }`}
          >
            {label}
          </span>
          {description ? (
            <span
              className={`mt-0.5 block text-xs leading-relaxed ${
                teacher
                  ? active
                    ? "text-[#5850ec]"
                    : "text-[#6b7280]"
                  : active
                    ? "text-[#4f46e5]/90"
                    : "text-[color:var(--anx-text-muted)]"
              }`}
            >
              {description}
            </span>
          ) : null}
        </span>
        {badge !== undefined && badge > 0 ? (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-bold text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </Link>
    );
  }

  function StudentNav({ onNavigate }: { onNavigate?: () => void }) {
    const homeActive = isNavActive(pathname, homeStudentItem.href);
    const liveActive = isNavActive(pathname, liveStudentItem.href);

    return (
      <div className="flex flex-col gap-6 px-2 py-2">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--anx-text-muted)]">
            Main
          </p>
          <nav className="flex flex-col gap-1" aria-label="Main">
            <NavRow
              href={homeStudentItem.href}
              label={homeStudentItem.label}
              description={homeStudentItem.description}
              iconKind={homeStudentItem.icon}
              active={homeActive}
              onNavigate={onNavigate}
            />
            {studentSubjects === null
              ? [0, 1].map((i) => (
                  <div
                    key={i}
                    className="flex animate-pulse items-center gap-3 rounded-2xl px-3 py-2.5"
                  >
                    <span className="h-9 w-9 rounded-lg bg-[#f0f1f4]" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-24 rounded bg-[#f0f1f4]" />
                      <span className="block h-2 w-32 rounded bg-[#f0f1f4]" />
                    </span>
                  </div>
                ))
              : studentSubjects.map((sub) => {
                  const active = isSubjectNavActive(pathname, sub.slug);
                  const desc = sub.onboardingComplete
                    ? `${sub.averageMastery}% mastery across this subject`
                    : "Start diagnostic to unlock practice";
                  return (
                    <NavRow
                      key={sub.id}
                      href={sub.href}
                      label={sub.title}
                      description={desc}
                      iconKind={subjectIcon(sub.slug)}
                      active={active}
                      badge={sub.dueNowCount}
                      onNavigate={onNavigate}
                    />
                  );
                })}
          </nav>
        </div>
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--anx-text-muted)]">
            Live
          </p>
          <nav className="flex flex-col gap-1" aria-label="Live">
            <NavRow
              href={liveStudentItem.href}
              label={liveStudentItem.label}
              description={liveStudentItem.description}
              iconKind={liveStudentItem.icon}
              active={liveActive}
              onNavigate={onNavigate}
            />
          </nav>
        </div>
      </div>
    );
  }

  function TeacherNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex flex-col gap-5 px-2 py-3">
        <nav className="flex flex-col gap-0.5" aria-label="Primary">
          {teacherNavPrimary.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <NavRow
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.description}
                iconKind={item.icon}
                active={active}
                onNavigate={onNavigate}
                variant="teacher"
              />
            );
          })}
        </nav>
        <div className="mx-2 border-t border-[#e5e7eb]" />
        <nav className="flex flex-col gap-0.5" aria-label="Secondary">
          {teacherNavSecondary.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <NavRow
                key={item.href}
                href={item.href}
                label={item.label}
                description={item.description}
                iconKind={item.icon}
                active={active}
                onNavigate={onNavigate}
                variant="teacher"
              />
            );
          })}
        </nav>
      </div>
    );
  }

  const brandBlock = (
    <Link
      href={homeHref}
      className={`flex items-center gap-3 rounded-2xl p-2 outline-none transition-colors focus-visible:ring-2 ${
        variant === "teacher"
          ? "hover:bg-[#f9fafb] focus-visible:ring-[#5850ec]/25"
          : "hover:bg-[var(--anx-surface-hover)] focus-visible:ring-[var(--anx-primary-glow)]"
      }`}
      onClick={() => setMenuOpen(false)}
    >
      <LogoImage className="h-8 w-auto shrink-0 sm:h-9" />
      <div className="min-w-0 text-left">
        <p
          className={
            variant === "teacher"
              ? "truncate text-base font-bold leading-tight tracking-tight text-[#111827]"
              : "truncate text-xs font-medium text-[color:var(--anx-text-muted)]"
          }
        >
          {tagline}
        </p>
      </div>
    </Link>
  );

  const logoOnly = (
    <Link
      href={homeHref}
      className="flex shrink-0 items-center rounded-xl p-1 outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--anx-primary-glow)]"
      aria-label="Home"
    >
      <LogoImage className="h-7 w-auto sm:h-8" />
    </Link>
  );

  const studentTopBar =
    variant === "student" &&
    studentLayout === "topbar" &&
    (role === "STUDENT" || sessionStatus === "loading") ? (
      <header
        className="sticky top-0 z-40 border-b border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)]/95 px-4 py-2.5 backdrop-blur-md sm:px-6"
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-4">
          {logoOnly}
          <div className="min-w-0 flex-1 flex justify-center sm:justify-start sm:pl-2">
            <StudentTopBarSubjectSelector subjects={studentTopBarSubjects} />
          </div>
          <span
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-bright)] text-[color:var(--anx-text-secondary)]"
            title="Notifications"
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Zm6-6V11a6 6 0 1 0-12 0v5l-2 2V20h16v-2l-2-2Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--anx-primary)] ring-2 ring-[color:var(--anx-surface-bright)]" />
          </span>
          <StudentTopBarUserMenu userName={userName} initial={studentInitials(userName, userEmail)} />
        </div>
      </header>
    ) : null;

  if (studentTopBar) {
    return (
      <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)]">
        {studentTopBar}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)] lg:flex-row">
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)]/95 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      >
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--anx-outline-variant)] bg-white text-[color:var(--anx-text)] shadow-[var(--anx-shadow-card)] transition hover:bg-[var(--anx-surface-soft)]"
          aria-expanded={menuOpen}
          aria-controls="app-chrome-drawer"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            {menuOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <>
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
        <div className="min-w-0 flex-1">{brandBlock}</div>
      </header>

      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <aside
        id="app-chrome-drawer"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r shadow-[var(--anx-shadow-lg)] transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-[min(17.5rem,20vw)] lg:max-w-[280px] lg:translate-x-0 lg:shadow-none ${
          variant === "teacher"
            ? "border-[#e5e7eb] bg-[#fafafa] lg:border-[#e5e7eb] lg:shadow-[1px_0_0_rgba(0,0,0,0.04)]"
            : "border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)] lg:shadow-none"
        } ${menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        <div
          className={`hidden p-4 lg:block ${
            variant === "teacher" ? "border-b border-[#e5e7eb]" : "border-b border-[var(--anx-outline-variant)]"
          }`}
        >
          {brandBlock}
        </div>
        <div
          className={`p-3 lg:hidden ${
            variant === "teacher" ? "border-b border-[#e5e7eb]" : "border-b border-[var(--anx-outline-variant)]"
          }`}
        >
          {brandBlock}
        </div>

        <div className="flex-1 overflow-y-auto">
          {variant === "student" &&
          (role === "STUDENT" || sessionStatus === "loading") ? (
            <StudentNav onNavigate={() => setMenuOpen(false)} />
          ) : (
            <TeacherNav onNavigate={() => setMenuOpen(false)} />
          )}
        </div>

        <div
          className={`p-4 ${
            variant === "teacher" ? "border-t border-[#e5e7eb] bg-[#fafafa]" : "border-t border-[var(--anx-outline-variant)]"
          }`}
        >
          {variant === "teacher" ? (
            <Link
              href="/teacher/settings"
              className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 shadow-sm transition hover:border-[#d1d5db] hover:shadow-md"
              onClick={() => setMenuOpen(false)}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: "linear-gradient(145deg, #5850ec 0%, #7c3aed 100%)" }}
                aria-hidden
              >
                {teacherInitials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#111827]">{userName}</p>
              </div>
              <span className="shrink-0 text-[#9ca3af]" aria-hidden>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ) : (
            <div
              className="flex items-center gap-3 rounded-xl border border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-bright)] px-3 py-2.5 shadow-[var(--anx-shadow-card)]"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{
                  background:
                    "linear-gradient(145deg, var(--anx-primary) 0%, #6366f1 55%, #8b7bff 100%)",
                }}
                aria-hidden
              >
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[color:var(--anx-text)]">{userName}</p>
                <p className="truncate text-xs text-[color:var(--anx-text-muted)]">{roleFooterLabel()}</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={`mt-3 w-full text-center text-xs font-medium transition ${
              variant === "teacher"
                ? "text-[#6b7280] hover:text-[#5850ec]"
                : "text-[color:var(--anx-text-muted)] hover:text-[color:var(--anx-text)]"
            }`}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div
        className={
          variant === "teacher"
            ? "flex min-h-0 min-w-0 flex-1 flex-col bg-[#f9fafb]"
            : "flex min-h-0 min-w-0 flex-1 flex-col"
        }
      >
        {children}
      </div>
    </div>
  );
}
