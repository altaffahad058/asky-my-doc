// src/app/(auth)/forgot-password/page.tsx
'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [step, setStep] = useState<'email' | 'reset'>('email');
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		const res = await fetch('/api/auth/forgot-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email }),
		});
		setLoading(false);
		if (res.ok) {
			const data = await res.json();
			if (data.exists) {
				setStep('reset');
				setMessage(null);
			} else {
				setMessage('If an account exists for that email, you can reset the password.');
			}
		} else {
			const data = await res.json();
			setError(data.error ?? 'Request failed');
		}
	}

	async function onReset(e: React.FormEvent) {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);
		if (newPassword.length < 8) {
			setLoading(false);
			setError('Password must be at least 8 characters');
			return;
		}
		if (newPassword !== confirmPassword) {
			setLoading(false);
			setError('Passwords do not match');
			return;
		}
		const res = await fetch('/api/auth/forgot-password', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, newPassword }),
		});
		setLoading(false);
		if (res.ok) {
			window.location.href = '/login';
		} else {
			const data = await res.json();
			setError(data.error ?? 'Failed to update password');
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-6">
			<div className="card">
				<h1>Reset password</h1>
				{step === 'email' && (
					<>
						<p className="muted mt-1">Enter your account email to continue.</p>
						<form onSubmit={onSubmit} className="mt-6 space-y-4">
							<div className="field">
								<label className="label">Email</label>
								<input className="input" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
							</div>
							<button className="button" disabled={loading} type="submit">{loading ? 'Checking...' : 'Continue'}</button>
						</form>
					</>
				)}
				{step === 'reset' && (
					<>
						<p className="muted mt-1">Set a new password for {email}.</p>
						<form onSubmit={onReset} className="mt-6 space-y-4">
							<div className="field">
								<label className="label">New password</label>
								<input className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" required />
							</div>
							<div className="field">
								<label className="label">Confirm new password</label>
								<input className="input" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" required />
							</div>
							<button className="button" disabled={loading} type="submit">{loading ? 'Updating...' : 'Update password'}</button>
						</form>
					</>
				)}
				{message && <p className="mt-3 text-sm text-green-600 dark:text-green-400">{message}</p>}
				{error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
				<p className="mt-4 text-center text-sm">
					<a className="link" href="/login">Back to login</a>
				</p>
			</div>
		</div>
	);
}