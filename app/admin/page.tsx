"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import {
  ShieldCheck,
  Users,
  Wallet as WalletIcon,
  Trophy,
  Home,
  ArrowRight,
  AlertTriangle,
  Plus,
  Calendar,
  Coins,
  Users2,
  Gamepad2,
} from "lucide-react";

import { auth, db } from "../firebase";
import { createTournament } from "../lib/firebase";
import { TournamentMode, TournamentType } from "../lib/types";

const ADMIN_EMAIL = "fflionking12345678@gmail.com";

type AdminWalletStats = {
  totalWallets: number;
  totalDiamonds: number;
};

// Tournament form data type
type TournamentFormData = {
  name: string;
  description: string;
  mode: TournamentMode;
  type: TournamentType;
  entryFee: number;
  prizePool: number;
  maxSlots: number;
  startTime: string;
};

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [walletStats, setWalletStats] = useState<AdminWalletStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<TournamentFormData>({
    name: "",
    description: "",
    mode: "solo",
    type: "per-kill",
    entryFee: 50,
    prizePool: 500,
    maxSlots: 64,
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16), // 1 hour from now
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
      setCurrentUser(user);

      if (!user) {
        router.push("/login?redirect=/admin");
        return;
      }

      if (user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadWalletStats = async () => {
      if (!isAdmin) return;
      setLoadingStats(true);

      try {
        const snapshot = await getDocs(collection(db, "wallets"));
        let totalWallets = 0;
        let totalDiamonds = 0;

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          totalWallets += 1;
          totalDiamonds += data.balance ?? 0;
        });

        setWalletStats({ totalWallets, totalDiamonds });
      } catch (error) {
        console.error("Failed to load admin stats", error);
      } finally {
        setLoadingStats(false);
      }
    };

    loadWalletStats();
  }, [isAdmin]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "entryFee" || name === "prizePool" || name === "maxSlots" 
        ? Number(value) 
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    try {
      await createTournament({
        ...formData,
        startTime: new Date(formData.startTime),
        status: "upcoming",
      });
      
      // Reset form
      setFormData({
        name: "",
        description: "",
        mode: "solo",
        type: "per-kill",
        entryFee: 50,
        prizePool: 500,
        maxSlots: 64,
        startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      
      setShowCreateForm(false);
      alert("Tournament created successfully!");
    } catch (error) {
      console.error("Error creating tournament:", error);
      setFormError("Failed to create tournament. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Admin";
  const email = currentUser?.email ?? "";

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
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
              Admin Panel
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">
              JE Esports Control Center
            </h1>
            <p className="mt-1 text-sm text-muted">
              Manage tournaments, players, and wallet activity for your platform.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#080f0c] px-4 py-3 text-xs">
            <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-300">
              Logged in as
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{displayName}</p>
            <p className="text-[11px] text-muted">{email} · Super Admin</p>
          </div>
        </header>

        {/* Create Tournament Form */}
        {showCreateForm ? (
          <section className="rounded-3xl border border-white/10 bg-[#080f0c] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Create New Tournament</h2>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="text-sm text-muted hover:text-white"
              >
                Cancel
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Tournament Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Enter tournament name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Mode
                </label>
                <select
                  name="mode"
                  value={formData.mode}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="squad">Squad</option>
                  <option value="clash-squad">Clash Squad</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                >
                  <option value="per-kill">Per Kill</option>
                  <option value="survival">Survival</option>
                  <option value="top-kill">Top Kill</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Entry Fee (diamonds)
                </label>
                <input
                  type="number"
                  name="entryFee"
                  value={formData.entryFee}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Prize Pool (diamonds)
                </label>
                <input
                  type="number"
                  name="prizePool"
                  value={formData.prizePool}
                  onChange={handleInputChange}
                  min="0"
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Max Slots
                </label>
                <input
                  type="number"
                  name="maxSlots"
                  value={formData.maxSlots}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Start Time
                </label>
                <input
                  type="datetime-local"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-[#050a0f] px-4 py-2 text-white focus:border-emerald-400 focus:outline-none"
                  placeholder="Describe the tournament rules and details..."
                />
              </div>
              
              {formError && (
                <div className="md:col-span-2 text-sm text-red-400 bg-red-900/20 p-3 rounded-lg">
                  {formError}
                </div>
              )}
              
              <div className="md:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-full border border-white/15 px-6 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  {formLoading ? "Creating..." : "Create Tournament"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-[#080f0c] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Tournament Management</h2>
              <button 
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
              >
                <Plus className="h-4 w-4" />
                Create Tournament
              </button>
            </div>
            
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-[#050a0f] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Trophy className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Total Tournaments</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-[#050a0f] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Users2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Registered Players</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-2xl border border-white/10 bg-[#050a0f] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                    <Gamepad2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm text-muted">Active Matches</p>
                    <p className="text-xl font-semibold text-white">0</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-[#080f0c] px-5 py-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total Wallets</span>
              <WalletIcon className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-semibold text-white">
                {loadingStats ? "-" : walletStats?.totalWallets ?? 0}
              </p>
              <p className="text-xs text-muted">Players with wallet data</p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#080f0c] px-5 py-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Total Diamonds (Balance)</span>
              <Trophy className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="mt-3">
              <p className="text-2xl font-semibold text-emerald-300">
                {loadingStats ? "-" : walletStats?.totalDiamonds ?? 0}
              </p>
              <p className="text-xs text-muted">Live wallet balance across players</p>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-500/30 bg-[#080f0c] px-5 py-4">
            <div className="flex items-center justify-between text-xs text-amber-200">
              <span>Admin Notice</span>
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="mt-3 space-y-1 text-xs text-amber-100">
              <p>Use this panel only from secure devices.</p>
              <p>Coming soon: full tournament and user management tools.</p>
            </div>
          </div>
        </section>

        <section className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-white">Quick Admin Actions</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/tournaments"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  Manage Tournaments
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Review modes, entry fees, and prize pools.
              </p>
            </Link>

            <Link
              href="/wallet"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  Monitor Wallets
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Check balances and recent transactions.
              </p>
            </Link>

            <Link
              href="/dashboard"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  Player View
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Switch back to the standard player dashboard.
              </p>
            </Link>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
          >
            Go to Player Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}