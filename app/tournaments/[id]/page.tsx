"use client";

import { useEffect, useMemo, useState } from "react";

import { useRouter, useParams } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  Calendar,
  Users,
  Clock,
  Trophy,
  ShieldCheck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Gem,
  Tag,
  Lock,
  Info,
} from "lucide-react";

import Link from "next/link";

import { auth } from "../../firebase";
import { 
  getTournamentById, 
  getTournamentRegistrations, 
  registerPlayer, 
} from "../../lib/firebase";
import { Tournament, PlayerRegistration } from "../../lib/types";

export default function TournamentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tournamentId = params.id as string;
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [userRegistration, setUserRegistration] = useState<PlayerRegistration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"participants" | "rewards" | "rules">(
    "participants",
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      
      if (!user) {
        router.push(`/login?redirect=/tournaments/${tournamentId}`);
      }
    });

    return () => unsubscribe();
  }, [router, tournamentId]);

  useEffect(() => {
    const fetchTournamentData = async () => {
      if (!authReady || !tournamentId) return;
      
      try {
        setLoading(true);
        const [tournamentData, registrationData] = await Promise.all([
          getTournamentById(tournamentId),
          getTournamentRegistrations(tournamentId)
        ]);
        
        if (!tournamentData) {
          setError("Tournament not found");
          return;
        }
        
        setTournament(tournamentData);
        setRegistrations(registrationData);
        
        // Check if current user is registered
        if (currentUser) {
          const userReg = registrationData.find(reg => reg.userId === currentUser.uid);
          setUserRegistration(userReg || null);
        }
      } catch (err) {
        console.error("Error fetching tournament data:", err);
        setError("Failed to load tournament data");
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentData();
  }, [authReady, currentUser, tournamentId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (slotNumber?: number) => {
    if (!currentUser || !tournament) return;

    if (!slotNumber || slotNumber < 1 || slotNumber > tournament.maxSlots) {
      setError("Please select a slot before joining.");
      return;
    }

    const existingForSlot = registrations.find(
      (reg) => reg.slotNumber === slotNumber,
    );
    if (existingForSlot) {
      setError("That slot has already been taken. Please choose another slot.");
      return;
    }

    setRegistering(true);
    setError(null);
    
    try {
      // Check if user already has a wallet and sufficient balance
      // In a real app, you would check the user's wallet balance here
      
      const registration = await registerPlayer({
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split("@")[0] || "Player",
        userEmail: currentUser.email || "",
        tournamentId: tournament.id,
        slotNumber,
      });
      
      // Update local state
      const newRegistration = {
        ...registration,
        id: registration.id,
        registrationTime: new Date(),
        slotNumber,
      } as PlayerRegistration;
      
      setUserRegistration(newRegistration);
      setRegistrations((prev) => [...prev, newRegistration]);
      setSelectedSlot(null);
      
      // Update tournament slots
      if (tournament) {
        setTournament({
          ...tournament,
          registeredSlots: tournament.registeredSlots + 1,
        });
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Failed to register for tournament. Please try again.");
    } finally {
      setRegistering(false);
    }
  };

  const slots = useMemo(
    () => {
      if (!tournament) return [] as { slotNumber: number; registration?: PlayerRegistration }[];

      const assigned: Record<number, PlayerRegistration | undefined> = {};
      const unassigned: PlayerRegistration[] = [];

      registrations.forEach((reg) => {
        const n = reg.slotNumber;
        if (typeof n === "number" && n >= 1 && n <= tournament.maxSlots) {
          if (!assigned[n]) {
            assigned[n] = reg;
          }
        } else {
          unassigned.push(reg);
        }
      });

      let nextSlot = 1;
      for (const reg of unassigned) {
        while (nextSlot <= tournament.maxSlots && assigned[nextSlot]) {
          nextSlot++;
        }
        if (nextSlot <= tournament.maxSlots) {
          assigned[nextSlot] = reg;
          nextSlot++;
        }
      }

      return Array.from({ length: tournament.maxSlots }, (_, index) => {
        const slotNumber = index + 1;
        return {
          slotNumber,
          registration: assigned[slotNumber],
        };
      });
    },
    [registrations, tournament],
  );

  if (loading) {
    return (
      <div className="global-bg min-h-screen flex items-center justify-center px-4 text-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <p className="mt-4 text-muted">Loading tournament details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="global-bg min-h-screen flex items-center justify-center px-4 text-white">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-white">Error</h2>
          <p className="mt-2 text-muted">{error}</p>
          <Link
            href="/tournaments"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="global-bg min-h-screen flex items-center justify-center px-4 text-white">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-white">Tournament Not Found</h2>
          <p className="mt-2 text-muted">
            The tournament you're looking for doesn't exist or has been removed.
          </p>
          <Link
            href="/tournaments"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const isFull = tournament.registeredSlots >= tournament.maxSlots;
  const isUpcoming = tournament.status === 'upcoming';
  const isOngoing = tournament.status === 'ongoing';
  const isCompleted = tournament.status === 'completed';
  const isCancelled = tournament.status === 'cancelled';

  const canRegister = currentUser && isUpcoming && !userRegistration && !isFull;

  const modeLabel = tournament.mode
    .replace("-", " ")
    .replace(/^(.)/, (c) => c.toUpperCase());
  const categoryLabel = tournament.type
    .replace("-", " ")
    .replace(/^(.)/, (c) => c.toUpperCase());

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusPillLabel = isUpcoming
    ? "Upcoming"
    : isOngoing
    ? "Live"
    : isCompleted
    ? "Past"
    : "Cancelled";

  const diffToStartMs = tournament.startTime.getTime() - now.getTime();
  const hasStarted = diffToStartMs <= 0 || !isUpcoming;

  let countdownLabel: string | null = null;
  if (isUpcoming && diffToStartMs > 0) {
    const totalSeconds = Math.max(0, Math.floor(diffToStartMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    countdownLabel = `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  const createdAt = tournament.createdAt;
  const startTime = tournament.startTime;
  let timeProgress = 0;
  if (createdAt && startTime && createdAt < startTime) {
    const total = startTime.getTime() - createdAt.getTime();
    const elapsed = Math.min(
      Math.max(0, now.getTime() - createdAt.getTime()),
      total,
    );
    timeProgress = Math.round((elapsed / total) * 100);
  }

  let matchStatusMessage = "";
  if (isCancelled) {
    matchStatusMessage = "This tournament has been cancelled.";
  } else if (isCompleted) {
    matchStatusMessage = "The tournament has ended.";
  } else if (hasStarted) {
    matchStatusMessage = "The tournament has started!";
  } else {
    matchStatusMessage = "The tournament has not started yet.";
  }

  return (
    <div className="global-bg min-h-screen px-4 pb-20 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Tournaments
          </Link>
        </div>

        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-emerald-300">
            Welcome to JE Esports
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            {tournament.name}
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
              {modeLabel}
            </span>
            <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs font-semibold text-purple-200">
              {categoryLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">Je Esports Private Limited</p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(260px,2fr)]">
          <section className="space-y-4">
            <div className="flex rounded-full bg-white/5 p-1 text-xs sm:text-sm">
              {[
                {
                  id: "participants" as const,
                  label: `Participants (${registrations.length}/${tournament.maxSlots})`,
                },
                { id: "rewards" as const, label: "Rewards" },
                { id: "rules" as const, label: "Rules" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 rounded-full px-3 py-2 font-medium transition ${
                    activeTab === tab.id
                      ? "bg-[#080f0c] text-white"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#080f0c] p-6">
              {activeTab === "participants" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-white">
                      Tournament Slots
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      Choose an available slot below. Each slot can only be taken by
                      one player.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#050a0f] px-4 py-4">
                    {isCancelled || !isUpcoming ? (
                      <div className="py-6 text-center">
                        <Lock
                          className={`mx-auto h-6 w-6 ${
                            isCancelled ? "text-red-400" : "text-white/60"
                          }`}
                        />
                        <p className="mt-3 text-sm font-semibold text-white">
                          {isCancelled ? "Tournament Cancelled" : "Registration is Closed"}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Slots cannot be selected for this tournament.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="mb-3 flex items-center justify-between text-xs text-muted">
                          <span>
                            Slots ({registrations.length} / {tournament.maxSlots} filled)
                          </span>
                          {userRegistration?.slotNumber && (
                            <span className="font-semibold text-emerald-300">
                              Your slot: #{userRegistration.slotNumber}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                          {slots.map(({ slotNumber, registration: slotReg }) => {
                            const isYou =
                              !!slotReg &&
                              !!currentUser &&
                              slotReg.userId === currentUser.uid;
                            const isTaken = !!slotReg;
                            const isSelected = selectedSlot === slotNumber;
                            const disabled = !canRegister || isTaken || registering;

                            return (
                              <button
                                key={slotNumber}
                                type="button"
                                disabled={disabled}
                                onClick={() => setSelectedSlot(slotNumber)}
                                className={`flex flex-col items-center justify-center rounded-xl border px-2 py-2 text-xs transition ${
                                  isYou
                                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                                    : isTaken
                                    ? "border-white/20 bg-black/30 text-white/60"
                                    : isSelected
                                    ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                                    : "border-white/10 bg-black/30 text-white/80 hover:border-emerald-400 hover:bg-emerald-500/5"
                                } ${
                                  disabled
                                    ? "cursor-not-allowed opacity-60"
                                    : "cursor-pointer"
                                }`}
                              >
                                <span className="text-[10px] uppercase tracking-[0.18em] text-white/50">
                                  Slot {slotNumber}
                                </span>
                                <span className="mt-1 text-xs font-semibold">
                                  {isYou
                                    ? "You"
                                    : isTaken
                                    ? slotReg?.userName || "Taken"
                                    : "Empty"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "rewards" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Rewards</h2>
                    <p className="mt-1 text-xs text-muted">
                      Prize breakdown and payout details for this tournament.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#050a0f] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-emerald-300" />
                        <span className="text-sm font-semibold text-white">
                          Total Prize Pool
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-300">
                        <Gem className="h-4 w-4" />
                        {tournament.prizePool}
                      </span>
                    </div>

                    {tournament.prizeDistribution ? (
                      <p className="mt-3 whitespace-pre-line text-xs text-muted">
                        {tournament.prizeDistribution}
                      </p>
                    ) : (
                      <p className="mt-3 text-xs text-muted">
                        Detailed prize distribution will be shared before the match
                        starts.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "rules" && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Rules</h2>
                    <p className="mt-1 text-xs text-muted">
                      Key rules and fair-play guidelines for this lobby.
                    </p>
                  </div>

                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    <li>- Use only the designated map and mode specified for each tournament.</li>
                    <li>- Custom room settings will be provided by tournament organizers.</li>
                    <li>- Players must record their gameplay for verification if requested.</li>
                    <li>- Third-party apps and modifications are strictly prohibited.</li>
                    <li>- Team formation must be completed before match start.</li>
                    <li>- Substitutions are not allowed once the match begins.</li>
                    <li>- Tournaments will start 10 minutes after the scheduled starting time to allow all players to join.</li>
                    <li>- Players must join the match room within 10 minutes of starting time.</li>
                    <li>- Late arrivals will be disqualified automatically.</li>
                    <li>- Tournament brackets are final once published.</li>
                    <li>- Prizes are paid out to your account wallet within 5 hours after the tournament has ended.</li>
                  </ul>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#080f0c] p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Clock className="h-4 w-4 text-emerald-300" />
                  Match Status
                </h3>
              </div>

              <div className="mt-3 rounded-2xl bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">
                {matchStatusMessage}
              </div>

              {countdownLabel && (
                <p className="mt-3 text-xs text-muted">
                  Starts in{" "}
                  <span className="font-semibold text-white">{countdownLabel}</span>
                </p>
              )}

              {timeProgress > 0 && timeProgress < 100 && (
                <div className="mt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${timeProgress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    Time until match start ({timeProgress}%)
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#080f0c] p-5">
              <h3 className="text-sm font-semibold text-white">Key Info</h3>
              <dl className="mt-4 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Clock className="h-4 w-4 text-emerald-300" />
                    <span>Status</span>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {statusPillLabel}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Users className="h-4 w-4 text-emerald-300" />
                    <span>Mode</span>
                  </div>
                  <span className="font-semibold text-white">{modeLabel}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Tag className="h-4 w-4 text-purple-300" />
                    <span>Category</span>
                  </div>
                  <span className="font-semibold text-purple-300">{categoryLabel}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Gem className="h-4 w-4 text-emerald-300" />
                    <span>Entry Fee</span>
                  </div>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-300">
                    <Gem className="h-4 w-4" />
                    {tournament.entryFee}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Users className="h-4 w-4 text-emerald-300" />
                    <span>Participants</span>
                  </div>
                  <span className="font-semibold text-white">
                    {registrations.length} / {tournament.maxSlots}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-muted">
                    <Calendar className="h-4 w-4 text-emerald-300" />
                    <span>Schedule</span>
                  </div>
                  <span className="text-xs font-semibold text-white text-right leading-tight">
                    {formatDate(tournament.startTime)}
                  </span>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#080f0c] p-5">
              <h3 className="text-sm font-semibold text-white">Actions</h3>
              <div className="mt-4 space-y-3 text-xs sm:text-sm">
                {canRegister && (
                  <button
                    type="button"
                    onClick={() => handleRegister(selectedSlot ?? undefined)}
                    disabled={registering || isFull || !selectedSlot}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-2.5 font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {registering ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                        Registering...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        {selectedSlot ? `Join Slot #${selectedSlot}` : "Select a slot to join"}
                      </>
                    )}
                  </button>
                )}

                {!selectedSlot && !registering && (
                  <p className="text-[11px] text-muted">
                    First choose an empty slot in the Slots section, then press Join.
                  </p>
                )}

                {userRegistration && (
                  <div className="flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-200">
                    <CheckCircle className="h-4 w-4" />
                    <span>You are registered! Good luck.</span>
                  </div>
                )}

                {!userRegistration && !canRegister && !isCancelled && (
                  <div className="flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-xs text-muted">
                    <Lock className="h-4 w-4" />
                    <span>Registration is closed for this tournament.</span>
                  </div>
                )}

                {isCancelled && (
                  <div className="flex items-center gap-2 rounded-2xl bg-red-500/15 px-3 py-2 text-xs text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    <span>This tournament has been cancelled by the admins.</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}