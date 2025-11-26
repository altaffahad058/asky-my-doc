// src/app/(auth)/signup/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function SignupPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [occupation, setOccupation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { signup, isSigningUp, error, clearError } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
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
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Last name</label>
            <input
              className="input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="label">Email</label>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </div>
          <div className="field">
            <label className="label">Password (min 8)</label>
            <input
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <div className="field">
            <label className="label">Confirm password</label>
            <input
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              required
            />
          </div>
          <div className="field">
            <label className="label">Occupation</label>
            <input
              className="input"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
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
