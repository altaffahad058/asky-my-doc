// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'session';
const alg = 'HS256';

function getSecret() {
	const secret = process.env.AUTH_SECRET;
	if (!secret) throw new Error('AUTH_SECRET is not set');
	return new TextEncoder().encode(secret);
}

export async function createSession(userId: number | string) {
	const token = await new SignJWT({ sub: String(userId) })
		.setProtectedHeader({ alg })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(getSecret());

	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 60 * 60 * 24 * 7,
	});
}

export async function getSessionUserId(): Promise<number | null> {
	try {
		const cookieStore = await cookies();
		const cookie = cookieStore.get(COOKIE_NAME);
		if (!cookie?.value) return null;
		const { payload } = await jwtVerify(cookie.value, getSecret());
		const sub = payload.sub as string | undefined;
		if (!sub) return null;
		const id = Number(sub);
		return Number.isNaN(id) ? null : id;
	} catch {
		return null;
	}
}


export async function clearSession() {
	const cookieStore = await cookies();
	cookieStore.set(COOKIE_NAME, '', {
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		path: '/',
		maxAge: 0,
	});
}