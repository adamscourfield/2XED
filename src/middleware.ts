import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin-only routes — redirect non-admins away
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      if (!token || token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Redirect ADMIN users away from the student dashboard
    if (pathname === '/dashboard' && token?.role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url));
    }

    // Teacher workspace — mirrors the per-page guards (defence in depth)
    if (pathname === '/teacher' || pathname.startsWith('/teacher/')) {
      if (!token || (token.role !== 'TEACHER' && token.role !== 'ADMIN' && token.role !== 'LEADERSHIP')) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Student live surface
    if (pathname === '/student' || pathname.startsWith('/student/')) {
      if (!token || token.role !== 'STUDENT') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Student/teacher-accessible routes
    if (pathname.startsWith('/learn') || pathname.startsWith('/dashboard') || pathname.startsWith('/diagnostic')) {
      if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
      }
      if (token.role !== 'STUDENT' && token.role !== 'ADMIN' && token.role !== 'TEACHER') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    '/learn/:path*',
    '/dashboard',
    '/diagnostic/:path*',
    '/admin',
    '/admin/:path*',
    '/teacher',
    '/teacher/:path*',
    '/student',
    '/student/:path*',
  ],
};
