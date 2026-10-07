import { NextResponse } from 'next/server';
import { auth } from './auth';
export const proxy = auth(request => {
  const path = request.nextUrl.pathname;
  const signedIn = !!request.auth?.user?.id;
  const authPage = path === '/signin' || path === '/signup';
  if (signedIn && authPage) return NextResponse.redirect(new URL('/dashboard', request.url));
  if (!signedIn && !authPage) return NextResponse.redirect(new URL('/signin', request.url));
  return NextResponse.next();
});
export const config = { matcher: ['/signin', '/signup', '/dashboard/:path*', '/projects/:path*', '/deliveries/:path*', '/disputes/:path*', '/account/:path*'] };
