"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";

export type AppChromeVariant = "student" | "teacher";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: "home" | "school" | "book" | "bolt" | "dashboard" | "radio" | "calendar" | "file" | "users";
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
      src="/Ember_logo.png"
      alt="Ember"
      width={1774}
      height={887}
      className={className ?? "h-8 w-auto"}
      priority
    />
  );
}

function NavIconBox({
  kind,
  active,
}: {
  kind: NavItem["icon"];
  active: boolean;
}) {
  const box = active
    ? "bg-[rgba(99,102,241,0.18)] text-[#4338ca]"
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
      default:
        return null;
    }
  })();
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${box}`}
      aria-hidden
    >
      {icon}
    </span>
  );
}

function isNavActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  if (href === "/dashboard" || href === "/teacher/dashboard") {
    return pathname === href;
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
}

export function AppChrome({
  variant,
  showLeadershipNav = false,
  children,
}: AppChromeProps) {
  const pathname = usePathname();
  const { data: authSession, status: sessionStatus } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectNav[] | null>(null);

  const role = (authSession?.user as { role?: string } | undefined)?.role;
  const userName = authSession?.user?.name ?? authSession?.user?.email ?? "Account";
  const userEmail = authSession?.user?.email ?? "";
  const initial = (userName.trim().charAt(0) || userEmail.charAt(0) || "?").toUpperCase();

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
    if (variant !== "student" || role !== "STUDENT" || sessionStatus !== "authenticated") return;
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
  }, [variant, role, sessionStatus]);

  const homeHref = variant === "teacher" ? "/teacher/dashboard" : "/dashboard";
  const tagline =
    variant === "teacher" ? "Teaching workspace" : "Your learning hub";

  const teacherNav: NavItem[] = [
    {
      href: "/teacher/dashboard",
      label: "Dashboard",
      description: "Classes and analytics",
      icon: "dashboard",
    },
    {
      href: "/teacher/live/new",
      label: "Live lesson",
      description: "Start a session",
      icon: "radio",
    },
    {
      href: "/teacher/timetable",
      label: "Timetables",
      description: "Recurring class slots",
      icon: "calendar",
    },
    {
      href: "/teacher/content/review",
      label: "Content review",
      description: "English booklet gate",
      icon: "file",
    },
    ...(showLeadershipNav
      ? ([
          {
            href: "/teacher/leadership",
            label: "Leadership",
            description: "School-wide overview",
            icon: "users",
          },
        ] satisfies NavItem[])
      : []),
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
  }: {
    href: string;
    label: string;
    description: string;
    iconKind: NavItem["icon"];
    active: boolean;
    badge?: number;
    onNavigate?: () => void;
  }) {
    return (
      <Link
        href={href}
        onClick={onNavigate}
        className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 pl-3 transition-colors duration-150 ${
          active
            ? "bg-[rgba(99,102,241,0.12)] shadow-[inset_0_0_0_1px_rgba(99,102,241,0.35)]"
            : "text-[color:var(--anx-text)] hover:bg-[var(--anx-surface-hover)]"
        }`}
      >
        {active ? (
          <span
            className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-full bg-[#6366f1]"
            aria-hidden
          />
        ) : null}
        <NavIconBox kind={iconKind} active={active} />
        <span className="min-w-0 flex-1">
          <span
            className={`block text-[0.9375rem] font-semibold leading-snug tracking-tight ${
              active ? "text-[#312e81]" : "text-[color:var(--anx-text)]"
            }`}
          >
            {label}
          </span>
          <span
            className={`mt-0.5 block text-xs leading-relaxed ${
              active ? "text-[#4f46e5]/90" : "text-[color:var(--anx-text-muted)]"
            }`}
          >
            {description}
          </span>
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
      <div className="px-2 py-2">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--anx-text-muted)]">
          Main
        </p>
        <nav className="flex flex-col gap-1" aria-label="Main">
          {teacherNav.map((item) => {
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
      className="flex items-center gap-3 rounded-2xl p-2 outline-none transition-colors hover:bg-[var(--anx-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--anx-primary-glow)]"
      onClick={() => setMenuOpen(false)}
    >
      <LogoImage className="h-7 w-auto shrink-0 sm:h-8" />
      <div className="min-w-0 text-left">
        <p className="truncate text-xs font-medium text-[color:var(--anx-text-muted)]">
          {tagline}
        </p>
      </div>
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)] lg:flex-row">
      <header
        className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)]/95 px-4 py-3 backdrop-blur-md lg:hidden"
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      >
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--anx-outline-variant)] bg-white text-[color:var(--anx-text)] shadow-[var(--anx-shadow-sm)] transition hover:bg-[var(--anx-surface-soft)]"
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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-[var(--anx-outline-variant)] bg-[color:var(--anx-surface-raised)] shadow-[var(--anx-shadow-lg)] transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-[min(17.5rem,19vw)] lg:translate-x-0 lg:shadow-none ${
          menuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="hidden border-b border-[var(--anx-outline-variant)] p-4 lg:block">
          {brandBlock}
        </div>
        <div className="border-b border-[var(--anx-outline-variant)] p-3 lg:hidden">
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

        <div className="border-t border-[var(--anx-outline-variant)] p-4">
          <div className="flex items-center gap-3">
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
              <p className="truncate text-sm font-semibold text-[color:var(--anx-text)]">
                {userName}
              </p>
              <p className="truncate text-xs text-[color:var(--anx-text-muted)]">
                {roleFooterLabel()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="shrink-0 text-xs font-medium text-[color:var(--anx-text-muted)] transition hover:text-[color:var(--anx-text)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
