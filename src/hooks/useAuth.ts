// src/hooks/useAuth.ts
'use client';

import { signIn, signOut } from 'next-auth/react';
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
			const result = await signIn('credentials', {
				redirect: false,
				email: data.email,
				password: data.password,
			});

			if (!result || result.error) {
				setError(result?.error ?? 'Login failed');
				return false;
			}

			router.push('/');
			return true;
		} catch (err: unknown) {
			const message = err instanceof Error && err.message ? err.message : 'Login failed';
			setError(message);
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

			if (!res.ok) {
				const responseData = await res.json();
				setError(responseData.error ?? 'Signup failed');
				return false;
			}

			const loginResult = await signIn('credentials', {
				redirect: false,
				email: data.email,
				password: data.password,
			});

			if (!loginResult || loginResult.error) {
				setError(loginResult?.error ?? 'Signup succeeded but auto-login failed');
				return false;
			}

			router.push('/');
			return true;
		} catch (err: unknown) {
			const message = err instanceof Error && err.message ? err.message : 'Signup failed';
			setError(message);
			return false;
		} finally {
			setIsSigningUp(false);
		}
	}, [router]);

	const logout = useCallback(async (): Promise<void> => {
		setIsLoggingOut(true);
		try {
			await signOut({ redirect: false });
		} catch (err: unknown) {
			console.error('Logout error:', err);
		} finally {
			setIsLoggingOut(false);
			router.replace('/login');
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
		} catch (err: unknown) {
			const message = err instanceof Error && err.message ? err.message : 'Network error';
			setError(message);
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
		} catch (err: unknown) {
			const message = err instanceof Error && err.message ? err.message : 'Network error';
			setError(message);
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
