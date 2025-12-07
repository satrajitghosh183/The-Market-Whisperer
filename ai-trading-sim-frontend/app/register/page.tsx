"use client";
import { useState } from "react";
import { useAuth } from "@/lib/authContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      console.log('Registration complete, redirecting...');
      // Use both router.push and a slight delay to ensure state updates
      router.push("/");
      // Fallback to force refresh if needed
      setTimeout(() => {
        window.location.href = "/";
      }, 100);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-[70vh] animate-fade-in">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20 blur-3xl"></div>
        <div className="card max-w-md w-full relative shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2 gradient-text">Join Us! 🚀</h1>
            <p className="text-gray-400">Start your trading journey today</p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/50 rounded-xl text-red-400 font-semibold flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-2 text-gray-300">
              👤 Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="input-modern"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2 text-gray-300">
              📧 Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-modern"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2 text-gray-300">
              🔒 Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-modern"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2 text-gray-300">
              🔐 Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="input-modern"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn text-lg py-4 disabled:opacity-50"
          >
            {loading ? "🔄 Creating account..." : "🚀 Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold">
              Login here →
            </Link>
          </p>
        </div>
      </div>
    </div>
    </main>
  );
}

