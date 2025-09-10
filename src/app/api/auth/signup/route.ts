// src/app/api/auth/signup/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createSession } from '@/lib/auth';

const schema = z.object({
	firstName: z.string().min(1).max(60),
	lastName: z.string().min(1).max(60),
	occupation: z.string().min(1).max(60),
	email: z.string().email(),
	password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { firstName, lastName, occupation, email, password } = schema.parse(body);

		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
		}

		const passwordHash = await bcrypt.hash(password, 12);

		const user = await prisma.user.create({
			data: { email, passwordHash, firstName, lastName, occupation },
			select: { id: true, email: true, firstName: true, lastName: true, occupation: true },
		});

		await createSession(user.id);

		return NextResponse.json({ user }, { status: 201 });
	} catch (err: any) {
		const message = err?.issues?.[0]?.message ?? 'Invalid request';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}