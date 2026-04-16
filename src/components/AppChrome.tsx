"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

export type AppChromeVariant = "student" | "teacher";

interface NavItem {
  href: string;
  label: string;
  description: string;
}

interface AppChromeProps {
  variant: AppChromeVariant;
  showLeadershipNav?: boolean;
  children: ReactNode;
}

function LogoMark() {
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-tight text-white shadow-[var(--anx-shadow-sm)]"
      style={{
        background:
          "linear-gradient(145deg, var(--anx-primary) 0%, #6b5cff 55%, #8b7bff 100%)",
      }}
      aria-hidden
    >
      2X
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

export function AppChrome({
  variant,
  showLeadershipNav = false,
  children,
}: AppChromeProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const homeHref = variant === "teacher" ? "/teacher/dashboard" : "/dashboard";
  const tagline =
    variant === "teacher" ? "Teaching workspace" : "Your learning hub";

  const studentNav: NavItem[] = [
    {
      href: "/dashboard",
      label: "Home",
      description: "Overview and next steps",
    },
    {
      href: "/student/live",
      label: "Join live lesson",
      description: "Enter your class code",
    },
  ];

  const teacherNav: NavItem[] = [
    {
      href: "/teacher/dashboard",
      label: "Dashboard",
      description: "Classes and analytics",
    },
    {
      href: "/teacher/live/new",
      label: "Live lesson",
      description: "Start a session",
    },
    {
      href: "/teacher/content/review",
      label: "Content review",
      description: "English booklet gate",
    },
    ...(showLeadershipNav
      ? ([
          {
            href: "/teacher/leadership",
            label: "Leadership",
            description: "School-wide overview",
          },
        ] satisfies NavItem[])
      : []),
  ];

  const navItems = variant === "teacher" ? teacherNav : studentNav;

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <nav className="flex flex-col gap-0.5 p-2" aria-label="Main">
        {navItems.map((item) => {
          const active = isNavActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`rounded-xl px-3 py-2.5 transition-colors duration-150 ${
                active
                  ? "bg-[var(--anx-primary-soft)] text-[var(--anx-primary)] shadow-[inset_0_0_0_1px_rgba(74,64,224,0.12)]"
                  : "text-[color:var(--anx-text)] hover:bg-[var(--anx-surface-hover)]"
              }`}
            >
              <span className="block text-[0.9375rem] font-semibold leading-snug tracking-tight">
                {item.label}
              </span>
              <span
                className={`mt-0.5 block text-xs leading-relaxed ${
                  active
                    ? "text-[var(--anx-primary)] opacity-[0.85]"
                    : "text-[color:var(--anx-text-muted)]"
                }`}
              >
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>
    );
  }

  const brandBlock = (
    <Link
      href={homeHref}
      className="flex items-center gap-3 rounded-2xl p-2 outline-none transition-colors hover:bg-[var(--anx-surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--anx-primary-glow)]"
      onClick={() => setMenuOpen(false)}
    >
      <LogoMark />
      <div className="min-w-0 text-left">
        <p className="truncate font-[family-name:var(--font-jakarta)] text-lg font-bold tracking-tight text-[color:var(--anx-text)]">
          2XED
        </p>
        <p className="truncate text-xs font-medium text-[color:var(--anx-text-muted)]">
          {tagline}
        </p>
      </div>
    </Link>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--anx-surface-bright)] lg:flex-row">
      {/* Mobile top bar */}
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
          <span className="sr-only">
            {menuOpen ? "Close menu" : "Open menu"}
          </span>
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

      {/* Mobile overlay */}
      {menuOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px] lg:hidden"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Drawer / desktop sidebar */}
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

        <div className="flex-1 overflow-y-auto py-2">
          <NavLinks onNavigate={() => setMenuOpen(false)} />
        </div>

        <div className="border-t border-[var(--anx-outline-variant)] p-4 text-xs text-[color:var(--anx-text-muted)]">
          Adaptive mastery learning
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
