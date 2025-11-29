"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getPlayerRegistrations } from "../lib/firebase";

import {
  ArrowRight,
  LayoutDashboard,
  Wallet as WalletIcon,
  Users,
  Shield,
  Palette,
  ShieldCheck,
  FileText,
  ChevronRight,
  LogOut,
  Target,
  TrendingUp,
  Trophy,
  History,
  Menu,
} from "lucide-react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Tournaments", href: "/tournaments" },
  { label: "Contact Us", href: "/contact" },
  { label: "Rules", href: "/rules" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Wallet", href: "/wallet" },
] as const;

type SiteHeaderProps = {
  user: User | null;
  authReady: boolean;
};

type UserProfileBarProps = {
  user: User;
  balance?: number;
};

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [stats, setStats] = useState({
    balance: 0,
    tournamentsPlayed: 0,
    totalKills: 0,
    totalEarnings: 0
  });
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (!user) {
        router.push("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      const fetchStats = async () => {
        try {
          // Fetch Wallet
          const walletRef = doc(db, "wallets", currentUser.uid);
          const walletSnap = await getDoc(walletRef);
          const walletData = walletSnap.exists() ? walletSnap.data() : null;

          // Fetch Registrations
          const registrations = await getPlayerRegistrations(currentUser.uid);

          setStats({
            balance: walletData?.balance || 0,
            tournamentsPlayed: registrations.length,
            totalKills: 0, // Placeholder
            totalEarnings: walletData?.totalEarnings || 0
          });
        } catch (error) {
          console.error("Error fetching dashboard stats:", error);
        }
      };
      fetchStats();
    }
  }, [currentUser]);

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Player";
  const handle = currentUser?.email
    ? `@${currentUser.email.split("@")[0]}`
    : "@player";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#050608] text-white">
      <SiteHeader user={currentUser} authReady={authReady} />
      {authReady && currentUser ? <UserProfileBar user={currentUser} balance={stats.balance} /> : null}

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-24 pt-8 lg:px-10">
        <section className="rounded-3xl bg-[#080f0c] px-6 py-6 sm:flex sm:items-center sm:gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-2xl font-semibold text-emerald-300">
            {initial}
          </div>
          <div className="mt-4 sm:mt-0">
            <p className="text-lg font-semibold text-white">{displayName}</p>
            <p className="text-sm text-muted">{handle}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          {[
            {
              label: "Wallet Balance",
              value: stats.balance.toString(),
              sublabel: "diamonds",
              icon: WalletIcon,
            },
            {
              label: "Tournaments Played",
              value: stats.tournamentsPlayed.toString(),
              sublabel: "",
              icon: Trophy,
            },
            {
              label: "Total Kills",
              value: stats.totalKills.toString(),
              sublabel: "",
              icon: Target,
            },
            {
              label: "Total Earnings",
              value: stats.totalEarnings.toString(),
              sublabel: "diamonds",
              icon: TrendingUp,
            },
          ].map(({ label, value, sublabel, icon: Icon }) => (
            <div
              key={label}
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-5 py-4"
            >
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{label}</span>
                <Icon className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-semibold text-white">{value}</p>
                {sublabel ? (
                  <p className="text-xs text-muted">{sublabel}</p>
                ) : null}
              </div>
            </div>
          ))}
        </section>

        <section className="mt-4 space-y-3">
          <p className="text-lg font-semibold text-white">Quick Actions</p>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              href="/tournaments"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  Join Tournament
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Browse and join upcoming tournaments
              </p>
            </Link>

            <Link
              href="/wallet"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  Manage Wallet
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Deposit or withdraw funds
              </p>
            </Link>

            <Link
              href="/history"
              className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-4 text-left transition hover:border-emerald-400/60"
            >
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-emerald-300" />
                <span className="text-base font-semibold text-white">
                  View History
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">
                Check your tournament history
              </p>
            </Link>
          </div>
        </section>
      </main >
    </div >
  );
}

function SiteHeader({ user, authReady }: SiteHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const filteredNav = navLinks.filter((item) => {
    if (item.label === "Dashboard" || item.label === "Wallet") {
      return !!user;
    }
    return true;
  });

  return (
    <>
      <header className="header-shell flex w-full items-center justify-between rounded-none px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-[#0d1611]">
            <Image
              src="https://anyimage.io/storage/uploads/b876d0034821a9b733f61d5e3f56fb64"
              alt="JE Esports logo"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-emerald-300">
              JE Esports
            </p>
            <p className="text-sm text-muted">Premier Free Fire League</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-3 text-sm font-semibold text-muted lg:flex">
          {filteredNav.map((item) => {
            const isActive = item.href === "/dashboard";
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-full px-3 py-1.5 transition ${isActive
                  ? "bg-[#14cc6f] text-black"
                  : "hover:bg-white/5 hover:text-white"
                  }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          {!authReady ? (
            <div className="h-9 w-32 rounded-full bg-white/5" />
          ) : user ? null : (
            <>
              <Link
                href="/login"
                className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-[#14cc6f] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#0fa75b]"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          <Menu className="h-5 w-5 text-muted" />
        </button>
      </header>

      {mobileOpen ? (
        <nav className="lg:hidden border-t border-white/10 bg-[#050a0f] px-6 py-4 text-sm font-semibold text-muted">
          <div className="flex flex-col gap-2">
            {filteredNav.map((item) => {
              const isActive = item.href === "/dashboard";
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-full px-3 py-2 transition ${isActive
                    ? "bg-[#14cc6f] text-black"
                    : "hover:bg-white/5 hover:text-white"
                    }`}
                >
                  {item.label}
                </Link>
              );
            })}
            {!authReady || user ? null : (
              <div className="mt-2 flex flex-col gap-2 border-t border-white/10 pt-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full border border-white/15 px-3 py-2 text-center text-sm font-semibold text-white transition hover:border-emerald-400/60"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full bg-[#14cc6f] px-3 py-2 text-center text-sm font-semibold text-black transition hover:bg-[#0fa75b]"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </nav>
      ) : null}
    </>
  );
}

function UserProfileBar({ user, balance }: UserProfileBarProps) {
  const displayName = user.displayName || user.email?.split("@")[0] || "Player";
  const email = user.email ?? "";
  const roleLabel =
    email === "fflionking12345678@gmail.com" ? "Admin" : "Player";
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed right-4 top-4 z-40 flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300 shadow-md cursor-pointer"
        aria-label="Open profile menu"
      >
        {initial}
      </button>

      {open ? (
        <div className="mt-3 w-64 rounded-2xl border border-white/10 bg-[#050a0f] p-4 shadow-xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
              {initial}
            </div>
            <div>
              <p className="text-xs font-semibold leading-tight text-white">{displayName}</p>
              <p className="text-[10px] leading-tight text-muted break-all">{roleLabel} · {email}</p>
            </div>
          </div>
          <div className="space-y-1 text-sm text-muted">
            <button
              onClick={() => {
                setOpen(false);
                router.push("/dashboard");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/wallet");
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <WalletIcon className="h-4 w-4" />
                <span>Wallet</span>
              </div>
              {balance !== undefined && (
                <span className="text-xs font-semibold text-emerald-300">{balance} 💎</span>
              )}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/tournaments");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <Users className="h-4 w-4" />
              <span>My Tournaments</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/settings");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <Shield className="h-4 w-4" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/theme");
              }}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <span className="inline-flex items-center gap-2">
                <Palette className="h-4 w-4" />
                <span>Theme</span>
              </span>
              <ChevronRight className="h-3 w-3 text-muted" />
            </button>
            <div className="my-1 h-px bg-white/10" />
            <button
              onClick={() => {
                setOpen(false);
                router.push("/privacy");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Privacy Policy</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                router.push("/terms");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <FileText className="h-4 w-4" />
              <span>Terms of Service</span>
            </button>
            <button
              onClick={handleLogout}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Log out</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
