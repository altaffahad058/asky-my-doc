// src/app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createSession } from '@/lib/auth';

const schema = z.object({
	email: z.string().email(),
	password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { email, password } = schema.parse(body);

		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

		const ok = await bcrypt.compare(password, user.passwordHash);
		if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

		await createSession(user.id);

		return NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 200 });
	} catch (err: any) {
		const message = err?.issues?.[0]?.message ?? 'Invalid request';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}