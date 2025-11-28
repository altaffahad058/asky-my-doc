import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
	const secret = process.env.AUTH_SECRET;
	if (!secret) return false;
	const token = await getToken({ req, secret });
	return Boolean(token);
}

export async function middleware(req: NextRequest) {
	const { pathname } = req.nextUrl;
	const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';

	if (isAuthRoute && (await isAuthenticated(req))) {
		return NextResponse.redirect(new URL('/', req.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/login', '/signup', '/forgot-password'],
};


