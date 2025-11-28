// src/app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const [state, setState] = useState<{ email: string; password: string }>({
    email: "",
    password: "",
  });
  const { email, password } = state;
  const { login, isLoggingIn, error } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await login({ email, password });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted mt-1">Welcome back. Enter your credentials.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) =>
                setState((prev) => ({ ...prev, email: e.target.value }))
              }
              type="email"
              required
            />
          </div>
          <div className="field">
            <label className="label">Password</label>
            <input
              className="input"
              value={password}
              onChange={(e) =>
                setState((prev) => ({ ...prev, password: e.target.value }))
              }
              type="password"
              required
            />
          </div>
          <button className="button cursor-pointer" disabled={isLoggingIn} type="submit">
            {isLoggingIn ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <p className="mt-4 text-center text-sm">
          <a className="link" href="/forgot-password">
            Forgot password?
          </a>
        </p>
        <p className="mt-2 text-center text-sm">
          No account?{" "}
          <a className="link" href="/signup">
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
