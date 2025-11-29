"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ShieldCheck, Trophy, CalendarClock, Coins } from "lucide-react";

import { auth, db } from "../../../firebase";
import type { TournamentMode, TournamentType } from "../../../lib/types";

const ADMIN_EMAIL = "fflionking12345678@gmail.com";

type FormState = {
  name: string;
  description: string;
  prizeDistribution: string;
  mode: TournamentMode;
  type: TournamentType;
  entryFee: string;
  prizePool: string;
  maxSlots: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export default function AdminCreateTournamentPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(
    () => ({
      name: "",
      description: "",
      prizeDistribution: "",
      mode: "solo",
      type: "clash-squad",
      entryFee: "50",
      prizePool: "500",
      maxSlots: "100",
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
    }),
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      setCurrentUser(user);

      if (!user) {
        router.push("/admin/login");
        return;
      }

      if (user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setIsAdmin(true);
      } else {
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleChange = (field: keyof FormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
    };

  const buildDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr) return null;
    const iso = `${dateStr}T${timeStr}:00`;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    console.log("[AdminCreateTournament] Submit clicked", { form });

    // Run all validation BEFORE setting submitting=true so the button
    // never gets stuck on the loading state when validation fails.
    if (!form.name.trim()) {
      console.warn("[AdminCreateTournament] Validation failed: missing name");
      setError("Enter a tournament name.");
      return;
    }
    if (!form.description.trim()) {
      console.warn(
        "[AdminCreateTournament] Validation failed: missing description",
      );
      setError("Enter a short description.");
      return;
    }

    const entryFee = Number(form.entryFee);
    const prizePool = Number(form.prizePool);
    const maxSlots = Number(form.maxSlots);

    if (!Number.isFinite(entryFee) || entryFee < 0) {
      console.warn("[AdminCreateTournament] Validation failed: bad entryFee", {
        entryFee,
      });
      setError("Entry fee must be 0 or more.");
      return;
    }
    if (!Number.isFinite(prizePool) || prizePool < 0) {
      console.warn(
        "[AdminCreateTournament] Validation failed: bad prizePool",
        { prizePool },
      );
      setError("Prize pool must be 0 or more.");
      return;
    }
    if (!Number.isFinite(maxSlots) || maxSlots <= 0) {
      console.warn("[AdminCreateTournament] Validation failed: bad maxSlots", {
        maxSlots,
      });
      setError("Max slots must be greater than 0.");
      return;
    }

    const startTime = buildDateTime(form.startDate, form.startTime);
    if (!startTime) {
      console.warn("[AdminCreateTournament] Validation failed: bad startTime", {
        startDate: form.startDate,
        startTime: form.startTime,
      });
      setError("Select a valid start date and time.");
      return;
    }

    const endTime = buildDateTime(form.endDate, form.endTime) ?? undefined;

    try {
      setSubmitting(true);
      console.log("[AdminCreateTournament] Calling Firestore addDoc", {
        entryFee,
        prizePool,
        maxSlots,
        startTime,
        endTime,
      });
      
      // Tournament states will be managed automatically:
      // - "upcoming" before start time
      // - "ongoing" between start time and end time
      // - "completed" after end time

      await addDoc(collection(db, "tournaments"), {
        name: form.name.trim(),
        description: form.description.trim(),
        prizeDistribution: form.prizeDistribution.trim() || null,
        mode: form.mode,
        type: form.type,
        entryFee,
        prizePool,
        maxSlots,
        status: "upcoming",
        startTime,
        endTime: endTime ?? null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        registeredSlots: 0,
      });

      console.log("[AdminCreateTournament] addDoc resolved; redirect");

      // On success, immediately go back to admin dashboard where the
      // tournament list will show the new tournament live.
      router.push("/admin/dashboard");
    } catch (firebaseError: unknown) {
      console.error("[AdminCreateTournament] Create tournament failed:", firebaseError);
      const message =
        firebaseError instanceof Error
          ? firebaseError.message
          : "Failed to create tournament.";
      setError(message);
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!authReady || !currentUser || !isAdmin) {
    return (
      <div className="global-bg flex min-h-screen items-center justify-center px-4 text-white">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldCheck className="h-8 w-8 text-emerald-300" />
          <p className="text-sm text-muted">Checking admin access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="global-bg min-h-screen px-4 pb-20 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
            Admin · Tournaments
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
            <Trophy className="h-5 w-5 text-emerald-300" />
            Create Tournament
          </h1>
          <p className="text-sm text-muted">
            Configure a new Free Fire tournament with automatic state management based on time.
          </p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-[#070b10] p-6 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={handleChange("name")}
                  placeholder="Midnight Rush #120"
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">Mode</label>
                <select
                  value={form.mode}
                  onChange={handleChange("mode")}
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                >
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="squad">Squad</option>
                  <option value="clash-squad">Clash Squad</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted">Description</label>
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Short description about rules, map and rewards."
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted">
                Prize Distribution (optional)
              </label>
              <textarea
                value={form.prizeDistribution}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    prizeDistribution: event.target.value,
                  }))
                }
                placeholder="e.g. 1st: 5000 Diamonds 2nd: 2500 Diamonds 3rd: 1000 Diamonds"
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <Coins className="h-3 w-3 text-emerald-300" /> Entry Fee (diamonds)
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.entryFee}
                  onChange={handleChange("entryFee")}
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">Prize Pool (diamonds)</label>
                <input
                  type="number"
                  min={0}
                  value={form.prizePool}
                  onChange={handleChange("prizePool")}
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">Total Slots</label>
                <input
                  type="number"
                  min={1}
                  value={form.maxSlots}
                  onChange={handleChange("maxSlots")}
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">Category</label>
                <select
                  value={form.type}
                  onChange={handleChange("type")}
                  className="w-full rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                >
                  <option value="per-kill">Per Kill</option>
                  <option value="survival">Survival</option>
                  <option value="clash-squad">Clash Squad</option>
                  <option value="lone-wolf">Lone Wolf</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="flex items-center gap-1 text-xs font-semibold text-muted">
                  <CalendarClock className="h-3 w-3 text-emerald-300" /> Start
                  time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={handleChange("startDate")}
                    className="w-1/2 rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                  />
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={handleChange("startTime")}
                    className="w-1/2 rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                  />
                </div>
                <p className="mt-1 text-[11px] text-emerald-400/70">Tournament will automatically change to "ongoing" at this time</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted">End time (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={handleChange("endDate")}
                    className="w-1/2 rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                  />
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={handleChange("endTime")}
                    className="w-1/2 rounded-xl border border-white/10 bg-[#050b0f] px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400 focus:ring-emerald-500/40"
                  />
                </div>
                <p className="mt-1 text-[11px] text-emerald-400/70">Tournament will automatically change to "completed" at this time</p>
              </div>
            </div>

            {error ? (
              <p className="text-xs text-red-400">{error}</p>
            ) : null}
            {success ? (
              <p className="text-xs text-emerald-300">{success}</p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3 pt-2 text-sm">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create Tournament"}
              </button>
              <Link
                href="/admin/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
