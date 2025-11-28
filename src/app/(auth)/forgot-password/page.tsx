// src/app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ForgotPasswordPage() {
  const [state, setState] = useState<{
    email: string;
    step: "email" | "reset";
    message: string | null;
    newPassword: string;
    confirmPassword: string;
    localError: string | null;
  }>({
    email: "",
    step: "email",
    message: null,
    newPassword: "",
    confirmPassword: "",
    localError: null,
  });

  const { email, step, message, newPassword, confirmPassword, localError } =
    state;
  const {
    forgotPassword,
    resetPassword,
    isForgotPasswordLoading,
    error,
    clearError,
  } = useAuth();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState((prev) => ({
      ...prev,
      localError: null,
      message: null,
    }));
    clearError();

    const result = await forgotPassword(email);
    if (result) {
      if (result.exists) {
        setState((prev) => ({
          ...prev,
          step: "reset",
          message: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          message:
            "If an account exists for that email, you can reset the password.",
        }));
      }
    }
  }

  async function onReset(e: React.FormEvent) {
    e.preventDefault();
    setState((prev) => ({
      ...prev,
      localError: null,
      message: null,
    }));
    clearError();

    if (newPassword.length < 8) {
      setState((prev) => ({
        ...prev,
        localError: "Password must be at least 8 characters",
      }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setState((prev) => ({
        ...prev,
        localError: "Passwords do not match",
      }));
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
                  onChange={(e) =>
                    setState((prev) => ({ ...prev, email: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      newPassword: e.target.value,
                    }))
                  }
                  type="password"
                  required
                />
              </div>
              <div className="field">
                <label className="label">Confirm new password</label>
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
