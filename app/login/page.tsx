"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";

import { auth } from "../firebase";

const ADMIN_EMAIL = "fflionking12345678@gmail.com";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050a0f] px-4 text-white flex items-center justify-center">
          <p className="text-sm text-gray-400">Loading login...</p>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [formValues, setFormValues] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: "email" | "password") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setIsLoading(true);
      await signInWithEmailAndPassword(
        auth,
        formValues.email,
        formValues.password,
      );
      setSuccess("Signed in successfully. Redirecting...");

      const redirect = searchParams.get("redirect");
      const isAdminEmail =
        formValues.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Redirect after 1 second
      setTimeout(() => {
        if (redirect && isAdminEmail) {
          router.push(redirect);
        } else if (isAdminEmail) {
          router.push("/admin/dashboard");
        } else {
          router.push("/dashboard");
        }
      }, 1000);

    } catch (firebaseError: unknown) {
      const message =
        firebaseError instanceof Error ? firebaseError.message : "Failed to sign in.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a0f] px-4 text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-20">
        <div className="text-center">
          <div className="mx-auto mb-6 h-20 w-20 overflow-hidden rounded-full bg-[#0d1611]">
            <Image
              src="https://anyimage.io/storage/uploads/ac072c2c761f68b87d0b8b44244ba360"
              alt="JE Esports logo"
              width={80}
              height={80}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">
            Je Esports
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-[#070b10] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          <h1 className="text-3xl font-semibold">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-400">
            Sign in to manage your wallet, tournaments, and team invites.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formValues.email}
                onChange={handleChange("email")}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formValues.password}
                  onChange={handleChange("password")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="text-right">
                <button type="button" className="text-xs text-emerald-400">
                  Forgot password?
                </button>
              </div>
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}
            {success ? <p className="text-sm text-emerald-300">{success}</p> : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full rounded-xl bg-[#14cc6f] py-3 text-center text-sm font-semibold text-black transition hover:bg-[#0fa75b] disabled:opacity-60"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            New to JE Esports?{" "}
            <Link href="/signup" className="text-emerald-400">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
