import { NextResponse, type NextRequest } from 'next/server';

// Cheap gate: no session cookie → login page. API routes verify the signature themselves.
export function proxy(request: NextRequest) {
  if (!request.cookies.get('pc_session')) return NextResponse.redirect(new URL('/login', request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|login|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|jpg)$).*)'],
};
