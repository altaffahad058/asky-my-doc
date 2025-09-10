// src/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
	const router = useRouter();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		const res = await fetch('/api/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, password }),
		});
		setLoading(false);
		if (res.ok) {
			router.push('/');
		} else {
			const data = await res.json();
			setError(data.error ?? 'Login failed');
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="card">
				<h1>Sign in</h1>
				<p className="muted mt-1">Welcome back. Enter your credentials.</p>
				<form onSubmit={onSubmit} className="mt-6 space-y-4">
					<div className="field">
						<label className="label">Email</label>
						<input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
					</div>
					<div className="field">
						<label className="label">Password</label>
						<input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
					</div>
					<button className="button" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Sign in'}</button>
				</form>
				{error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
				<p className="mt-4 text-center text-sm">
					<a className="link" href="/forgot-password">Forgot password?</a>
				</p>
				<p className="mt-2 text-center text-sm">
					No account? <a className="link" href="/signup">Create one</a>
				</p>
			</div>
		</div>
	);
}