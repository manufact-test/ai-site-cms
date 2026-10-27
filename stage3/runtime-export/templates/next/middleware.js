import {NextResponse} from 'next/server';
import releases from './data/release-manifest.json';

// SSR redirect records are genuine HTTP 301. Static export uses HTML fallback pages.
export function middleware(request) {
  const redirect = releases.redirects.find(x => x.from === request.nextUrl.pathname);
  if (redirect) {
    const location = new URL(redirect.to, request.url);
    return NextResponse.redirect(location, 301);
  }
  return NextResponse.next();
}
export const config = {matcher:['/((?!_next/|assets/|favicon.ico).*)']};
