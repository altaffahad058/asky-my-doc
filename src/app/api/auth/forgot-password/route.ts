// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const schema = z.object({
	email: z.string().email(),
	newPassword: z.string().min(8).max(100).optional(),
});

export async function POST(req: Request) {
	try {
		const body = await req.json();
		const { email, newPassword } = schema.parse(body);

		const user = await prisma.user.findUnique({ where: { email } });

		// Step 1: email check only
		if (!newPassword) {
			return NextResponse.json({ exists: Boolean(user) }, { status: 200 });
		}

		// Step 2: update password if email exists
		if (!user) {
			return NextResponse.json({ error: 'Email not found' }, { status: 404 });
		}

		const passwordHash = await bcrypt.hash(newPassword, 12);
		await prisma.user.update({
			where: { id: user.id },
			data: { passwordHash, resetToken: null, resetTokenExpiry: null },
		});

		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (err: any) {
		const message = err?.issues?.[0]?.message ?? 'Invalid request';
		return NextResponse.json({ error: message }, { status: 400 });
	}
}