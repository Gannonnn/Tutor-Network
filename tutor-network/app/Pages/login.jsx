"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState(""); // "student" | "tutor" | ""
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);


  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push("/student-home");
    router.refresh();
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setMessage("");
    if (!userType) {
      setMessage("Please select whether you are a student or tutor.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { 
        data: { 
          full_name: name,
          user_type: userType 
        } 
      },
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.user) {
      setMessage("Account created successfully! Redirecting...");
      // Redirect to student home page after successful signup
      router.push("/student-home");
      router.refresh();
    } else {
      setMessage("Check your email to confirm your account.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-[family-name:var(--font-orbitron)] tracking-tight text-zinc-900">
            Tutor<span className="text-green-700">Network</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {mode === "login"
              ? "Sign in to your account"
              : "Create your account"}
          </p>
        </div>

        {/* Toggle Login / Sign up */}
        <div className="mb-6 flex rounded-lg bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-white text-zinc-900 shadow"
                : "text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage("");
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-white text-zinc-900 shadow"
                : "text-zinc-600 hover:bg-zinc-200"
            }`}
          >
            Create account
          </button>
        </div>

        <div className="relative transition-all duration-500 ease-in-out">
          {mode === "login" ? (
            <form 
              key="login-form"
              onSubmit={handleLogin} 
              className="space-y-4 animate-[fadeIn_0.4s_ease-in-out]"
            >
            <div>
              <label
                htmlFor="login-email"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="login-password"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          ) : (
            <form 
              key="signup-form"
              onSubmit={handleSignup} 
              className="space-y-4 animate-[fadeIn_0.4s_ease-in-out]"
            >
            <div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUserType("student")}
                  className={`flex-1 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                    userType === "student"
                      ? "border-green-700 bg-green-50 text-green-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        userType === "student"
                          ? "border-green-700 bg-green-700"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {userType === "student" && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span>Student</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setUserType("tutor")}
                  className={`flex-1 rounded-lg border-2 py-3 px-4 text-sm font-medium transition-all ${
                    userType === "tutor"
                      ? "border-green-700 bg-green-50 text-green-900"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <div
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-all ${
                        userType === "tutor"
                          ? "border-green-700 bg-green-700"
                          : "border-zinc-300 bg-white"
                      }`}
                    >
                      {userType === "tutor" && (
                        <svg
                          className="h-3 w-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="3"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7"></path>
                        </svg>
                      )}
                    </div>
                    <span>Tutor</span>
                  </div>
                </button>
              </div>
            </div>
            <div>
              <label
                htmlFor="signup-name"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="Your name"
              />
            </div>
            <div>
              <label
                htmlFor="signup-email"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label
                htmlFor="signup-password"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label
                htmlFor="signup-confirm"
                className="mb-1 block text-sm font-medium text-zinc-700"
              >
                Confirm password
              </label>
              <input
                id="signup-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          )}
        </div>

        {message && (
          <p className="mt-4 text-center text-sm text-zinc-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
