import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE = 'session';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
	const token = req.cookies.get(AUTH_COOKIE)?.value;
	if (!token) return false;
	const secret = process.env.AUTH_SECRET;
	if (!secret) return false;
	try {
		await jwtVerify(token, new TextEncoder().encode(secret));
		return true;
	} catch {
		return false;
	}
}

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	console.log('Pathname', pathname);

	if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password') {
		if (await isAuthenticated(req)) {
			return NextResponse.redirect(new URL('/', req.url));
		}
	}

	if (pathname === '/logout') {
		console.log('Logging out', pathname);
		const res = NextResponse.redirect(new URL('/login', req.url));
		res.cookies.set(AUTH_COOKIE, '', {
			httpOnly: true,
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
			path: '/',
			maxAge: 0,
		});
		return res;
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/login', '/signup', '/forgot-password', '/logout'],
};


