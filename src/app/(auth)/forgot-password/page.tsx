// src/app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "reset">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const {
    forgotPassword,
    resetPassword,
    isForgotPasswordLoading,
    error,
    clearError,
  } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setMessage(null);
    clearError();

    const result = await forgotPassword(email);
    if (result) {
      if (result.exists) {
        setStep("reset");
        setMessage(null);
      } else {
        setMessage(
          "If an account exists for that email, you can reset the password."
        );
      }
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setMessage(null);
    clearError();

    if (newPassword.length < 8) {
      setLocalError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    const success = await resetPassword(email, newPassword);
    if (success) {
      window.location.href = "/login";
    }
  }

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card">
        <h1>Reset password</h1>
        {step === "email" && (
          <>
            <p className="muted mt-1">Enter your account email to continue.</p>
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
              <button
                className="button"
                disabled={isForgotPasswordLoading}
                type="submit"
              >
                {isForgotPasswordLoading ? "Checking..." : "Continue"}
              </button>
            </form>
          </>
        )}
        {step === "reset" && (
          <>
            <p className="muted mt-1">Set a new password for {email}.</p>
            <form onSubmit={onReset} className="mt-6 space-y-4">
              <div className="field">
                <label className="label">New password</label>
                <input
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  required
                />
              </div>
              <div className="field">
                <label className="label">Confirm new password</label>
                <input
                  className="input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  type="password"
                  required
                />
              </div>
              <button
                className="button"
                disabled={isForgotPasswordLoading}
                type="submit"
              >
                {isForgotPasswordLoading ? "Updating..." : "Update password"}
              </button>
            </form>
          </>
        )}
        {message && (
          <p className="mt-3 text-sm text-green-600 dark:text-green-400">
            {message}
          </p>
        )}
        {displayError && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {displayError}
          </p>
        )}
        <p className="mt-4 text-center text-sm">
          <a className="link" href="/login">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
