// src/hooks/useAuth.ts
'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';

export type SignupData = {
	firstName: string;
	lastName: string;
	occupation: string;
	email: string;
	password: string;
};

export type LoginData = {
	email: string;
	password: string;
};

export type ForgotPasswordResponse = {
	exists: boolean;
};

export function useAuth() {
	const router = useRouter();
	const [isLoggingIn, setIsLoggingIn] = useState(false);
	const [isSigningUp, setIsSigningUp] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const login = useCallback(async (data: LoginData): Promise<boolean> => {
		setIsLoggingIn(true);
		setError(null);
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (res.ok) {
				router.push('/');
				return true;
			} else {
				const responseData = await res.json();
				setError(responseData.error ?? 'Login failed');
				return false;
			}
		} catch (err: any) {
			setError(err?.message || 'Network error');
			return false;
		} finally {
			setIsLoggingIn(false);
		}
	}, [router]);

	const signup = useCallback(async (data: SignupData): Promise<boolean> => {
		setIsSigningUp(true);
		setError(null);
		try {
			const res = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data),
			});

			if (res.ok) {
				router.push('/');
				return true;
			} else {
				const responseData = await res.json();
				setError(responseData.error ?? 'Signup failed');
				return false;
			}
		} catch (err: any) {
			setError(err?.message || 'Network error');
			return false;
		} finally {
			setIsSigningUp(false);
		}
	}, [router]);

	const logout = useCallback(async (): Promise<void> => {
		setIsLoggingOut(true);
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			router.replace('/login');
		} catch (err: any) {
			console.error('Logout error:', err);
			// Still redirect even if the API call fails
			router.replace('/login');
		} finally {
			setIsLoggingOut(false);
		}
	}, [router]);

	const forgotPassword = useCallback(async (email: string): Promise<ForgotPasswordResponse | null> => {
		setIsForgotPasswordLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			});

			if (res.ok) {
				const data = await res.json();
				return { exists: data.exists };
			} else {
				const responseData = await res.json();
				setError(responseData.error ?? 'Request failed');
				return null;
			}
		} catch (err: any) {
			setError(err?.message || 'Network error');
			return null;
		} finally {
			setIsForgotPasswordLoading(false);
		}
	}, []);

	const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
		setIsForgotPasswordLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/auth/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email, newPassword }),
			});

			if (res.ok) {
				return true;
			} else {
				const responseData = await res.json();
				setError(responseData.error ?? 'Failed to update password');
				return false;
			}
		} catch (err: any) {
			setError(err?.message || 'Network error');
			return false;
		} finally {
			setIsForgotPasswordLoading(false);
		}
	}, []);

	const clearError = useCallback(() => {
		setError(null);
	}, []);

	return {
		// Methods
		login,
		signup,
		logout,
		forgotPassword,
		resetPassword,
		clearError,
		// States
		isLoggingIn,
		isSigningUp,
		isLoggingOut,
		isForgotPasswordLoading,
		error,
	};
}
