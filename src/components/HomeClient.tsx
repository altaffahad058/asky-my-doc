'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function HomeClient() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		try {
			setLoading(true);
			await fetch('/api/auth/logout', { method: 'POST' });
			router.replace('/login');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="mt-6">
			<form onSubmit={onSubmit}>
				<button className="button max-w-xs" type="submit" disabled={loading}>
					{loading ? 'Logging out…' : 'Log out'}
				</button>
			</form>
		</div>
	);
}


