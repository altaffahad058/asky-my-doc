// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const [state, setState] = useState<{
    firstName: string;
    lastName: string;
    occupation: string;
    email: string;
    password: string;
    confirmPassword: string;
    localError: string | null;
  }>({
    firstName: "",
    lastName: "",
    occupation: "",
    email: "",
    password: "",
    confirmPassword: "",
    localError: null,
  });
  const {
    firstName,
    lastName,
    occupation,
    email,
    password,
    confirmPassword,
    localError,
  } = state;
  const { signup, isSigningUp, error, clearError } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState((prev) => ({ ...prev, localError: null }));
    clearError();

    if (password !== confirmPassword) {
      setState((prev) => ({ ...prev, localError: "Passwords do not match" }));
      return;
    }

    await signup({ firstName, lastName, occupation, email, password });
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card">
        <h1>Create account</h1>
        <p className="muted mt-1">Start using the app in a minute.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div className="field">
            <label className="label">First name</label>
            <input
              className="input"
              value={firstName}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  firstName: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="field">
            <label className="label">Last name</label>
            <input
              className="input"
              value={lastName}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
              required
            />
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
              type="email"
              required
            />
          </div>
          <div className="field">
            <label className="label">Password (min 8)</label>
            <input
              className="input"
              value={password}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
              type="password"
              required
            />
          </div>
          <div className="field">
            <label className="label">Confirm password</label>
            <input
              className="input"
              value={confirmPassword}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  confirmPassword: e.target.value,
                }))
              }
              type="password"
              required
            />
          </div>
          <div className="field">
            <label className="label">Occupation</label>
            <input
              className="input"
              value={occupation}
              onChange={(e) =>
                setState((prev) => ({
                  ...prev,
                  occupation: e.target.value,
                }))
              }
              placeholder="e.g., Student, Developer"
              required
            />
          </div>
          <button className="button" disabled={isSigningUp} type="submit">
            {isSigningUp ? "Creating..." : "Create account"}
          </button>
        </form>
        {displayError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {displayError}
          </p>
        )}
        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <a className="link" href="/login">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
