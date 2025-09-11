// src/app/(auth)/signup/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [occupation, setOccupation] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		if (password !== confirmPassword) {
			setLoading(false);
			setError('Passwords do not match');
			return;
		}
		const res = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ firstName, lastName, occupation, email, password }),
		});
		setLoading(false);
		if (res.ok) {
			router.push('/');
		} else {
			const data = await res.json();
			setError(data.error ?? 'Signup failed');
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="card">
				<h1>Create account</h1>
				<p className="muted mt-1">Start using the app in a minute.</p>
				<form onSubmit={onSubmit} className="mt-6 space-y-4">
					<div className="field">
						<label className="label">First name</label>
						<input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} required />
					</div>
					<div className="field">
						<label className="label">Last name</label>
						<input className="input" value={lastName} onChange={e => setLastName(e.target.value)} required />
					</div>
					<div className="field">
						<label className="label">Email</label>
						<input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
					</div>
					<div className="field">
						<label className="label">Password (min 8)</label>
						<input className="input" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
					</div>
					<div className="field">
						<label className="label">Confirm password</label>
						<input className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required />
					</div>
					<div className="field">
						<label className="label">Occupation</label>
						<input className="input" value={occupation} onChange={e => setOccupation(e.target.value)} placeholder="e.g., Student, Developer" required />
					</div>
					<button className="button" disabled={loading} type="submit">{loading ? 'Creating...' : 'Create account'}</button>
				</form>
				{error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
				<p className="mt-4 text-center text-sm">
					Already have an account? <a className="link" href="/login">Sign in</a>
				</p>
			</div>
		</div>
	);
}