"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "../firebase";

const signupFields = [
  {
    label: "Your Name",
    placeholder: "Enter your full name",
    helper: "Use your real FreeFire name . This will be displayed on your profile.",
    type: "text",
    name: "name",
  },
  {
    label: "Free Fire UID",
    placeholder: "Enter your 10-digit UID",
    helper: "",
    type: "text",
    name: "uid",
  },
  {
    label: "Email",
    placeholder: "you@example.com",
    helper: "",
    type: "email",
    name: "email",
  },
];

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formValues, setFormValues] = useState({
    name: "",
    uid: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: keyof typeof formValues) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (formValues.password !== formValues.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!formValues.name.trim() || !formValues.uid.trim()) {
      setError("Name and Free Fire UID are required.");
      return;
    }

    try {
      setIsLoading(true);
      const credential = await createUserWithEmailAndPassword(
        auth,
        formValues.email,
        formValues.password,
      );

      await updateProfile(credential.user, {
        displayName: formValues.name,
      });

      setSuccess("Account created! Redirecting to login...");
      setFormValues({
        name: "",
        uid: "",
        email: "",
        password: "",
        confirmPassword: "",
      });

      // Redirect to login after 1.5 seconds
      setTimeout(() => {
        router.push("/login");
      }, 1500);

    } catch (firebaseError: unknown) {
      const message =
        firebaseError instanceof Error
          ? firebaseError.message
          : "Failed to create account.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050a0f] px-4 text-white">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 py-16">
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
          <h1 className="text-3xl font-semibold">Create Your Account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Join the competition and start your legacy today.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {signupFields.map(({ label, placeholder, helper, type, name }) => (
              <div key={name} className="space-y-2">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <input
                  type={type}
                  name={name}
                  placeholder={placeholder}
                  value={formValues[name as keyof typeof formValues] ?? ""}
                  onChange={handleChange(name as keyof typeof formValues)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-emerald-400"
                />
                {helper ? (
                  <p className="text-xs text-gray-500">{helper}</p>
                ) : null}
              </div>
            ))}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Create a secure password"
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Repeat Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="Repeat your password"
                  value={formValues.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white outline-none transition focus:border-emerald-400"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}
            {success ? (
              <p className="text-sm text-emerald-300">{success}</p>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-4 w-full rounded-xl bg-[#14cc6f] py-3 text-center text-sm font-semibold text-black transition hover:bg-[#0fa75b] disabled:opacity-60"
            >
              {isLoading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}