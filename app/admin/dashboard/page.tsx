"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  doc,
  deleteDoc,
  getDoc,
  setDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import {
  LayoutDashboard,
  Trophy,
  CalendarClock,
  Users,
  DollarSign,
  ShieldCheck,
  Database,
  CreditCard,
  Settings,
  ArrowRight,
  LogOut,
  Trash2,
  CheckCircle2,
  XCircle,
  PlayCircle,
  UserCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  X,
  Gift,
  Banknote,
  Calendar,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Filter,
  Gauge,
  GemIcon,
  Link2,
  Plus,
  Upload,
  Coins,
  Lock,
} from "lucide-react";

import { auth, db } from "../../firebase";
import { getTournaments, deleteTournament, updateTournament, getTournamentRegistrations } from "../../lib/firebase";
import type { Tournament, TournamentStatus, PlayerRegistration } from "../../lib/types";

const ADMIN_EMAIL = "fflionking12345678@gmail.com";

type OverviewStats = {
  totalUsers: number;
  totalTournaments: number;
  totalRevenue: number;
  totalMatches: number;
};

type SystemStatus = "online" | "issue";

type WalletUserSummary = {
  id: string;
  displayName: string;
  email: string;
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
};

type AdminTransaction = {
  id: string;
  userId: string;
  type: "deposit" | "withdraw";
  amount: number;
  createdAt: Date | null;
  screenshotUrl?: string | null;
};

type PaymentRequest = {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  type: "deposit" | "withdraw";
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date | null;
  screenshotUrl?: string | null;
  depositAccountName?: string | null;
  depositAccountNumber?: string | null;
  withdrawMethod?: string;
  recipientName?: string;
  recipientAccount?: string;
  deductedOnSubmit?: boolean;
};

type AdminRedeemCode = {
  id: string;
  code: string;
  amount: number;
  maxUses: number;
  currentUses: number;
  expiresAt: Date | null;
  createdAt: Date | null;
};

type AdminTab =
  | "dashboard"
  | "tournaments"
  | "matches"
  | "users"
  | "payments"
  | "redeem"
  | "admin";

export default function AdminDashboardPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [overview, setOverview] = useState<OverviewStats | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [dbStatus, setDbStatus] = useState<SystemStatus>("online");
  const [authStatus, setAuthStatus] = useState<SystemStatus>("online");
  const [paymentsStatus] = useState<SystemStatus>("issue");
  const [tournamentsData, setTournamentsData] = useState<Tournament[]>([]);
  const [walletUsers, setWalletUsers] = useState<WalletUserSummary[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [tournamentActionId, setTournamentActionId] = useState<string | null>(
    null,
  );
  const [tournamentFilter, setTournamentFilter] = useState<
    "all" | TournamentStatus
  >("all");
  const [userActionId, setUserActionId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [redeemCodes, setRedeemCodes] = useState<AdminRedeemCode[]>([]);
  const [redeemAmount, setRedeemAmount] = useState("");
  const [redeemMaxUses, setRedeemMaxUses] = useState("1");
  const [redeemExpiresAt, setRedeemExpiresAt] = useState("");
  const [redeemCustomCode, setRedeemCustomCode] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [pendingDeposits, setPendingDeposits] = useState<PaymentRequest[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PaymentRequest[]>([]);
  const [paymentActionId, setPaymentActionId] = useState<string | null>(null);
  const [selectedDepositDetails, setSelectedDepositDetails] = useState<PaymentRequest | null>(null);
  const [paymentSubTab, setPaymentSubTab] = useState<"deposits" | "withdrawals">("deposits");

  // Prize Distribution State
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [selectedTournamentForPrizes, setSelectedTournamentForPrizes] = useState<Tournament | null>(null);
  const [tournamentParticipants, setTournamentParticipants] = useState<PlayerRegistration[]>([]);
  const [prizeWinners, setPrizeWinners] = useState<{ id: string, userId: string, amount: string }[]>([]);
  const [processingPrizes, setProcessingPrizes] = useState(false);

  // Room Management State
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [selectedTournamentForRoom, setSelectedTournamentForRoom] = useState<Tournament | null>(null);
  const [roomDetails, setRoomDetails] = useState({ roomId: "", roomPassword: "" });



  const router = useRouter();

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setUserActionId(null);
        setAdminActionId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      setCurrentUser(user);

      if (!user) {
        router.push("/admin/login");
        return;
      }

      // Check if user is the primary admin
      const isPrimaryAdmin =
        user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      if (isPrimaryAdmin) {
        setIsAdmin(true);
        return;
      }

      // Check if user is in admins collection
      try {
        const adminDoc = await getDoc(doc(db, "admins", user.uid));
        if (adminDoc.exists()) {
          setIsAdmin(true);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Failed to check admin access", error);
        router.push("/dashboard");
      }
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    const loadOverview = async () => {
      if (!isAdmin) return;

      setLoadingOverview(true);
      try {
        const [walletSnap, tournaments] = await Promise.all([
          getDocs(collection(db, "wallets")),
          getTournaments().catch(() => [] as Tournament[]),
        ]);

        const totalUsers = walletSnap.size;
        const totalTournaments = tournaments.length;

        let totalRevenue = 0;
        let totalMatches = 0;

        tournaments.forEach((tournament) => {
          totalMatches += 1;
          const entryFee = (tournament.entryFee ?? 0) as number;
          const registeredSlots = (tournament.registeredSlots ?? 0) as number;
          totalRevenue += entryFee * registeredSlots;
        });

        const walletSummaries: WalletUserSummary[] = walletSnap.docs.map(
          (docSnap) => {
            const data = docSnap.data() as any;
            return {
              id: docSnap.id,
              displayName: data.displayName ?? "Player",
              email: data.email ?? "",
              balance: data.balance ?? 0,
              totalDeposited: data.totalDeposited ?? 0,
              totalWithdrawn: data.totalWithdrawn ?? 0,
              totalEarnings: data.totalEarnings ?? 0,
            };
          },
        );

        const allTransactions: AdminTransaction[] = [];
        for (const docSnap of walletSnap.docs) {
          const txRef = collection(db, "wallets", docSnap.id, "transactions");
          const q = query(txRef, orderBy("createdAt", "desc"), limit(5));
          const qSnap = await getDocs(q);
          qSnap.forEach((txDoc) => {
            const txData = txDoc.data() as any;
            allTransactions.push({
              id: txDoc.id,
              userId: docSnap.id,
              type: txData.type,
              amount: txData.amount ?? 0,
              createdAt: txData.createdAt?.toDate() ?? null,
            });
          });
        }

        allTransactions.sort((a, b) => {
          const aTime = a.createdAt?.getTime() ?? 0;
          const bTime = b.createdAt?.getTime() ?? 0;
          return bTime - aTime;
        });

        // Load admin IDs
        const adminsSnap = await getDocs(collection(db, "admins"));
        const adminIdList = adminsSnap.docs.map((docSnap) => docSnap.id);
        setAdminIds(adminIdList);

        // Load redeem codes
        try {
          const redeemSnap = await getDocs(
            query(
              collection(db, "redeemCodes"),
              orderBy("createdAt", "desc"),
              limit(50),
            ),
          );

          const redeemList: AdminRedeemCode[] = redeemSnap.docs.map(
            (docSnap) => {
              const data = docSnap.data() as any;
              return {
                id: docSnap.id,
                code: data.code ?? docSnap.id,
                amount: data.amount ?? 0,
                maxUses: data.maxUses ?? 1,
                currentUses: data.currentUses ?? 0,
                expiresAt: data.expiresAt?.toDate() ?? null,
                createdAt: data.createdAt?.toDate() ?? null,
              };
            },
          );
          setRedeemCodes(redeemList);
        } catch (error) {
          console.error("Failed to load redeem codes", error);
        }

        // Load payment requests
        try {
          const requestsSnap = await getDocs(
            query(
              collection(db, "paymentRequests"),
              orderBy("createdAt", "desc"),
              limit(100),
            ),
          );

          const allRequests: PaymentRequest[] = requestsSnap.docs.map(
            (docSnap) => {
              const data = docSnap.data() as any;
              return {
                id: docSnap.id,
                userId: data.userId ?? "",
                userEmail: data.userEmail ?? "",
                userDisplayName: data.userDisplayName ?? "Player",
                type: data.type,
                amount: data.amount ?? 0,
                status: data.status ?? "pending",
                createdAt: data.createdAt?.toDate() ?? null,
                screenshotUrl: data.screenshotUrl ?? null,
                depositAccountName: data.depositAccountName ?? null,
                depositAccountNumber: data.depositAccountNumber ?? null,
                withdrawMethod: data.withdrawMethod ?? null,
                recipientName: data.recipientName ?? null,
                recipientAccount: data.recipientAccount ?? null,
                deductedOnSubmit: data.deductedOnSubmit ?? false,
              };
            },
          );

          const deposits = allRequests.filter(
            (r) => r.type === "deposit" && r.status === "pending",
          );
          const withdrawals = allRequests.filter(
            (r) => r.type === "withdraw" && r.status === "pending",
          );

          setPendingDeposits(deposits);
          setPendingWithdrawals(withdrawals);
        } catch (error) {
          console.error("Failed to load payment requests", error);
        }

        setOverview({
          totalUsers,
          totalTournaments,
          totalRevenue,
          totalMatches,
        });
        setTournamentsData(tournaments);
        setWalletUsers(walletSummaries);
        setTransactions(allTransactions);
        setDbStatus("online");
        setAuthStatus("online");
      } catch (error) {
        console.error("Failed to load admin overview", error);
        setOverview(null);
        setDbStatus("issue");
      } finally {
        setLoadingOverview(false);
      }
    };

    loadOverview();
  }, [isAdmin]);

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Admin";
  const email = currentUser?.email ?? "";

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  const handleCreateRedeemCode = async () => {
    const value = Number(redeemAmount);
    const maxUsesValue = Number(redeemMaxUses);

    if (!Number.isFinite(value) || value <= 0) {
      alert("Enter a valid diamond amount for the redeem code.");
      return;
    }

    if (!Number.isFinite(maxUsesValue) || maxUsesValue < 1) {
      alert("Enter a valid maximum uses (minimum 1).");
      return;
    }

    try {
      setRedeemBusy(true);

      let codeToUse = redeemCustomCode.trim().toUpperCase();

      // If no custom code provided, generate one
      if (!codeToUse) {
        let attempts = 0;
        while (attempts < 5) {
          attempts += 1;
          const random = Math.random().toString(36).slice(2, 8).toUpperCase();
          codeToUse = `JEESPORTS-${random}`;
          const codeRef = doc(db, "redeemCodes", codeToUse);
          const existing = await getDoc(codeRef);
          if (!existing.exists()) {
            break;
          }
          codeToUse = "";
        }

        if (!codeToUse) {
          throw new Error("failed-generate");
        }
      } else {
        // Check if custom code already exists
        const codeRef = doc(db, "redeemCodes", codeToUse);
        const existing = await getDoc(codeRef);
        if (existing.exists()) {
          alert("This code already exists. Please choose a different code.");
          setRedeemBusy(false);
          return;
        }
      }

      // Parse expiration date if provided
      let expiresAtTimestamp = null;
      if (redeemExpiresAt) {
        const expiryDate = new Date(redeemExpiresAt);
        if (isNaN(expiryDate.getTime())) {
          alert("Invalid expiration date.");
          setRedeemBusy(false);
          return;
        }
        expiresAtTimestamp = expiryDate;
      }

      await setDoc(doc(db, "redeemCodes", codeToUse), {
        code: codeToUse,
        amount: value,
        maxUses: maxUsesValue,
        currentUses: 0,
        expiresAt: expiresAtTimestamp,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.uid ?? null,
      });

      setRedeemAmount("");
      setRedeemMaxUses("1");
      setRedeemExpiresAt("");
      setRedeemCustomCode("");
      alert(`Redeem code created: ${codeToUse}`);

      setRedeemCodes((prev) => [
        {
          id: codeToUse,
          code: codeToUse,
          amount: value,
          maxUses: maxUsesValue,
          currentUses: 0,
          expiresAt: expiresAtTimestamp,
          createdAt: new Date(),
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Failed to create redeem code", error);
      alert("Failed to create redeem code. Please try again.");
    } finally {
      setRedeemBusy(false);
    }
  };

  const handleDeleteRedeemCode = async (codeId: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this redeem code?`,
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "redeemCodes", codeId));
      setRedeemCodes((prev) => prev.filter((code) => code.id !== codeId));
    } catch (error) {
      console.error("Failed to delete redeem code", error);
      alert("Failed to delete redeem code. Please try again.");
    }
  };

  const handleApprovePayment = async (request: PaymentRequest) => {
    const confirmed = window.confirm(
      `Approve this ${request.type} of ${request.amount} diamonds for ${request.userDisplayName}?`,
    );
    if (!confirmed) return;

    try {
      setPaymentActionId(request.id);

      // Update wallet balance
      const walletRef = doc(db, "wallets", request.userId);
      const walletSnap = await getDoc(walletRef);

      if (!walletSnap.exists()) {
        alert("User wallet not found.");
        setPaymentActionId(null);
        return;
      }

      const walletData = walletSnap.data() as any;
      const currentBalance = walletData.balance ?? 0;
      const currentDeposited = walletData.totalDeposited ?? 0;
      const currentWithdrawn = walletData.totalWithdrawn ?? 0;

      let newBalance = currentBalance;
      let newDeposited = currentDeposited;
      let newWithdrawn = currentWithdrawn;

      if (request.type === "deposit") {
        // Add diamonds for deposit
        newBalance += request.amount;
        newDeposited += request.amount;
      } else {
        // For withdrawals with deductedOnSubmit, don't deduct again
        if (request.deductedOnSubmit) {
          // Balance already reduced when user submitted
          newWithdrawn += request.amount;
        } else {
          // Legacy withdrawals: deduct on approval
          newBalance -= request.amount;
          newWithdrawn += request.amount;
        }
      }

      await setDoc(
        walletRef,
        {
          balance: newBalance,
          totalDeposited: newDeposited,
          totalWithdrawn: newWithdrawn,
        },
        { merge: true },
      );

      // Update payment request status
      await setDoc(
        doc(db, "paymentRequests", request.id),
        {
          status: "approved",
          approvedAt: serverTimestamp(),
          approvedBy: currentUser?.uid ?? null,
        },
        { merge: true },
      );

      // Remove from pending lists
      if (request.type === "deposit") {
        setPendingDeposits((prev) => prev.filter((r) => r.id !== request.id));
      } else {
        setPendingWithdrawals((prev) => prev.filter((r) => r.id !== request.id));
      }

      // Update wallet users list
      setWalletUsers((prev) =>
        prev.map((user) =>
          user.id === request.userId
            ? {
              ...user,
              balance: newBalance,
              totalDeposited: newDeposited,
              totalWithdrawn: newWithdrawn,
            }
            : user,
        ),
      );

      alert(`${request.type === "deposit" ? "Deposit" : "Withdrawal"} approved successfully!`);
    } catch (error) {
      console.error("Failed to approve payment", error);
      alert("Failed to approve payment. Please try again.");
    } finally {
      setPaymentActionId(null);
    }
  };

  const handleRejectPayment = async (request: PaymentRequest) => {
    const confirmed = window.confirm(
      `Reject this ${request.type} of ${request.amount} diamonds for ${request.userDisplayName}?`,
    );
    if (!confirmed) return;

    try {
      setPaymentActionId(request.id);

      // For withdrawals with deductedOnSubmit, refund the amount
      if (request.type === "withdraw" && request.deductedOnSubmit) {
        const walletRef = doc(db, "wallets", request.userId);
        const walletSnap = await getDoc(walletRef);

        if (walletSnap.exists()) {
          const walletData = walletSnap.data() as any;
          const currentBalance = walletData.balance ?? 0;
          const refundBalance = currentBalance + request.amount;

          await setDoc(
            walletRef,
            {
              balance: refundBalance,
            },
            { merge: true },
          );

          // Update wallet users list
          setWalletUsers((prev) =>
            prev.map((user) =>
              user.id === request.userId
                ? { ...user, balance: refundBalance }
                : user,
            ),
          );
        }
      }

      // Update payment request status
      await setDoc(
        doc(db, "paymentRequests", request.id),
        {
          status: "rejected",
          rejectedAt: serverTimestamp(),
          rejectedBy: currentUser?.uid ?? null,
        },
        { merge: true },
      );

      // Remove from pending lists
      if (request.type === "deposit") {
        setPendingDeposits((prev) => prev.filter((r) => r.id !== request.id));
      } else {
        setPendingWithdrawals((prev) => prev.filter((r) => r.id !== request.id));
      }

      alert(`${request.type === "deposit" ? "Deposit" : "Withdrawal"} rejected successfully!`);
    } catch (error) {
      console.error("Failed to reject payment", error);
      alert("Failed to reject payment. Please try again.");
    } finally {
      setPaymentActionId(null);
    }
  };

  const handleBanUser = async (userId: string, displayName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to ban ${displayName}? They will not be able to participate in tournaments.`,
    );
    if (!confirmed) return;

    try {
      setUserActionId(userId);
      await setDoc(
        doc(db, "wallets", userId),
        {
          banned: true,
          bannedAt: serverTimestamp(),
          bannedBy: currentUser?.uid ?? null,
        },
        { merge: true },
      );
      alert(`${displayName} has been banned.`);

      // Reload data
      window.location.reload();
    } catch (error) {
      console.error("Failed to ban user", error);
      alert("Failed to ban user. Please try again.");
    } finally {
      setUserActionId(null);
    }
  };

  const handleUnbanUser = async (userId: string, displayName: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to unban ${displayName}?`,
    );
    if (!confirmed) return;

    try {
      setUserActionId(userId);
      await setDoc(
        doc(db, "wallets", userId),
        {
          banned: false,
          unbannedAt: serverTimestamp(),
          unbannedBy: currentUser?.uid ?? null,
        },
        { merge: true },
      );
      alert(`${displayName} has been unbanned.`);

      // Reload data
      window.location.reload();
    } catch (error) {
      console.error("Failed to unban user", error);
      alert("Failed to unban user. Please try again.");
    } finally {
      setUserActionId(null);
    }
  };

  const handleDeleteUser = async (userId: string, displayName: string) => {
    const confirmed = window.confirm(
      `⚠️ WARNING: Are you sure you want to DELETE ${displayName}?\n\nThis will:\n- Delete their wallet\n- Remove all their data\n- This action CANNOT be undone!\n\nType the user's name to confirm.`,
    );
    if (!confirmed) return;

    const nameConfirm = prompt(`Type "${displayName}" to confirm deletion:`);
    if (nameConfirm !== displayName) {
      alert("Name did not match. Deletion cancelled.");
      return;
    }

    try {
      setUserActionId(userId);
      await deleteDoc(doc(db, "wallets", userId));
      setWalletUsers((prev) => prev.filter((user) => user.id !== userId));
      alert(`${displayName} has been deleted.`);
    } catch (error) {
      console.error("Failed to delete user", error);
      alert("Failed to delete user. Please try again.");
    } finally {
      setUserActionId(null);
    }
  };

  const handleGrantAdmin = async (userId: string, displayName: string, email: string) => {
    const confirmed = window.confirm(
      `Grant admin access to ${displayName} (${email})?`,
    );
    if (!confirmed) return;

    try {
      setUserActionId(userId);
      await setDoc(doc(db, "admins", userId), {
        email: email,
        displayName: displayName,
        grantedAt: serverTimestamp(),
        grantedBy: currentUser?.uid ?? null,
      });
      setAdminIds((prev) => [...prev, userId]);
      alert(`${displayName} is now an admin.`);
    } catch (error) {
      console.error("Failed to grant admin access", error);
      alert("Failed to grant admin access. Please try again.");
    } finally {
      setUserActionId(null);
    }
  };

  const handleRevokeAdmin = async (userId: string, displayName: string) => {
    // Prevent revoking super admin
    const userEmail = walletUsers.find((u) => u.id === userId)?.email;
    if (userEmail?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      alert("Cannot revoke super admin access.");
      return;
    }

    const confirmed = window.confirm(
      `Revoke admin access from ${displayName}?`,
    );
    if (!confirmed) return;

    try {
      setAdminActionId(userId);
      await deleteDoc(doc(db, "admins", userId));
      setAdminIds((prev) => prev.filter((id) => id !== userId));
      alert(`${displayName} is no longer an admin.`);
    } catch (error) {
      console.error("Failed to revoke admin access", error);
      alert("Failed to revoke admin access. Please try again.");
    } finally {
      setAdminActionId(null);
    }
  };

  const handleOpenPrizeDistribution = async (tournament: Tournament) => {
    try {
      setSelectedTournamentForPrizes(tournament);
      setTournamentActionId(null); // Close the dropdown

      // Fetch participants
      const participants = await getTournamentRegistrations(tournament.id);
      setTournamentParticipants(participants);
      // Initialize with one empty winner row
      setPrizeWinners([{ id: Date.now().toString(), userId: "", amount: "0" }]);
      setShowPrizeModal(true);
    } catch (error) {
      console.error("Failed to load participants", error);
      alert("Failed to load participants. Please try again.");
    }
  };

  const handleAddWinnerRow = () => {
    setPrizeWinners(prev => [...prev, { id: Date.now().toString(), userId: "", amount: "0" }]);
  };

  const handleRemoveWinnerRow = (id: string) => {
    setPrizeWinners(prev => prev.filter(w => w.id !== id));
  };

  const handleUpdateWinnerRow = (id: string, field: "userId" | "amount", value: string) => {
    setPrizeWinners(prev => prev.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleConfirmPrizeDistribution = async () => {
    if (!selectedTournamentForPrizes) return;

    // Validate
    const validWinners = prizeWinners.filter(w => w.userId && Number(w.amount) > 0);
    if (validWinners.length === 0) {
      alert("Please add at least one winner with a valid amount.");
      return;
    }

    if (!window.confirm(`Are you sure you want to distribute prizes to ${validWinners.length} winners?`)) {
      return;
    }

    try {
      setProcessingPrizes(true);

      // Process each winner
      for (const winner of validWinners) {
        const participant = tournamentParticipants.find(p => p.userId === winner.userId);
        const userName = participant?.userName || "Unknown User";
        const amount = Number(winner.amount);

        // Update user wallet
        const walletRef = doc(db, "wallets", winner.userId);
        const walletSnap = await getDoc(walletRef);

        if (!walletSnap.exists()) {
          await setDoc(walletRef, {
            balance: amount,
            totalDeposited: 0,
            totalWithdrawn: 0,
            totalEarnings: amount,
            displayName: userName,
            createdAt: serverTimestamp(),
          });
        } else {
          const currentData = walletSnap.data();
          await setDoc(walletRef, {
            ...currentData,
            balance: (currentData.balance || 0) + amount,
            totalEarnings: (currentData.totalEarnings || 0) + amount,
          });
        }

        // Log transaction
        await addDoc(collection(db, `wallets/${winner.userId}/transactions`), {
          type: "prize",
          amount: amount,
          description: `Prize for ${selectedTournamentForPrizes.name}`,
          tournamentId: selectedTournamentForPrizes.id,
          tournamentName: selectedTournamentForPrizes.name,
          createdAt: serverTimestamp(),
        });
      }

      // Update tournament status to paid
      await updateTournament(selectedTournamentForPrizes.id, { status: "paid" });

      // Update local state
      setTournamentsData(prev => prev.map(t =>
        t.id === selectedTournamentForPrizes.id ? { ...t, status: "paid" } : t
      ));

      alert("Prizes distributed successfully!");
      setShowPrizeModal(false);
    } catch (error) {
      console.error("Failed to distribute prizes", error);
      alert("Failed to distribute prizes. Please try again.");
    } finally {
      setProcessingPrizes(false);
    }
  };

  const handleOpenRoomModal = (tournament: Tournament) => {
    setSelectedTournamentForRoom(tournament);
    setRoomDetails({
      roomId: tournament.roomId || "",
      roomPassword: tournament.roomPassword || ""
    });
    setTournamentActionId(null);
    setShowRoomModal(true);
  };

  const handleSaveRoomDetails = async () => {
    if (!selectedTournamentForRoom) return;

    try {
      await updateTournament(selectedTournamentForRoom.id, {
        roomId: roomDetails.roomId,
        roomPassword: roomDetails.roomPassword
      });

      setTournamentsData(prev => prev.map(t =>
        t.id === selectedTournamentForRoom.id ?
          { ...t, roomId: roomDetails.roomId, roomPassword: roomDetails.roomPassword } : t
      ));

      alert("Room details updated successfully!");
      setShowRoomModal(false);
    } catch (error) {
      console.error("Failed to update room details", error);
      alert("Failed to update room details. Please try again.");
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

  const overviewSafe: OverviewStats = overview ?? {
    totalUsers: 0,
    totalTournaments: 0,
    totalRevenue: 0,
    totalMatches: 0,
  };

  const formatDateTime = (date?: Date | null) => {
    if (!date) return "-";
    try {
      return date.toLocaleString("en-PK", {
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return date.toLocaleString();
    }
  };

  const handleTournamentStatusChange = async (
    id: string,
    status: TournamentStatus,
  ) => {
    try {
      setTournamentActionId(id);
      await updateTournament(id, { status });
      setTournamentsData((prev) =>
        prev.map((tournament) =>
          tournament.id === id ? { ...tournament, status } : tournament,
        ),
      );
    } catch (error) {
      console.error("Failed to update tournament status", error);
      alert("Failed to update tournament status. Please try again.");
    } finally {
      setTournamentActionId(null);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this tournament? This cannot be undone.",
    );
    if (!confirmDelete) return;

    try {
      setTournamentActionId(id);
      await deleteTournament(id);
      setTournamentsData((prev) =>
        prev.filter((tournament) => tournament.id !== id),
      );
    } catch (error) {
      console.error("Failed to delete tournament", error);
      alert("Failed to delete tournament. Please try again.");
    } finally {
      setTournamentActionId(null);
    }
  };

  const tabs: { id: AdminTab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "tournaments", label: "Tournaments" },
    { id: "matches", label: "Matches" },
    { id: "users", label: "Users" },
    { id: "payments", label: "Payments" },
    { id: "redeem", label: "Redeem Codes" },
    { id: "admin", label: "Admin Mgmt" },
  ];

  const renderTabContent = () => {
    if (activeTab === "dashboard") {
      return (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <AdminStatCard
              label="Total Users"
              description="Players with wallets"
              icon={Users}
              value={loadingOverview ? "-" : overviewSafe.totalUsers.toString()}
            />
            <AdminStatCard
              label="Total Tournaments"
              description="Across all modes"
              icon={Trophy}
              value={
                loadingOverview ? "-" : overviewSafe.totalTournaments.toString()
              }
            />
            <AdminStatCard
              label="Total Revenue"
              description="Entry fees collected"
              icon={DollarSign}
              value={
                loadingOverview
                  ? "-"
                  : `₨${overviewSafe.totalRevenue.toLocaleString("en-PK")}`
              }
            />
            <AdminStatCard
              label="Total Matches"
              description="Tournaments scheduled"
              icon={CalendarClock}
              value={
                loadingOverview ? "-" : overviewSafe.totalMatches.toString()
              }
            />
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-5">
              <p className="text-sm font-semibold text-white">Quick Actions</p>
              <p className="text-xs text-muted">Common administrative tasks</p>
              <div className="mt-4 space-y-3 text-sm">
                <AdminActionRow
                  title="Create New Tournament"
                  description="Set up a new tournament event"
                  href="/tournaments"
                />
                <AdminActionRow
                  title="Schedule Matches"
                  description="Adjust start times and rooms"
                  href="/tournaments"
                />
                <AdminActionRow
                  title="Manage Users"
                  description="Review players from dashboard view"
                  href="/dashboard"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#080f0c] px-6 py-5">
              <p className="text-sm font-semibold text-white">System Status</p>
              <p className="text-xs text-muted">Platform health and alerts</p>
              <div className="mt-4 space-y-3 text-sm">
                <StatusRow label="Database" status={dbStatus} icon={Database} />
                <StatusRow
                  label="Authentication"
                  status={authStatus}
                  icon={ShieldCheck}
                />
                <StatusRow
                  label="Payment System"
                  status={paymentsStatus}
                  icon={CreditCard}
                />
              </div>
            </div>
          </section>
        </>
      );
    }

    if (activeTab === "tournaments") {
      const filteredTournaments = tournamentsData.filter((tournament) =>
        tournamentFilter === "all"
          ? true
          : tournament.status === tournamentFilter,
      );

      return (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5 text-sm text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Manage Tournaments</p>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Link
                href="/admin/tournaments/create"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ea580c]"
              >
                <Plus className="h-4 w-4" />
                <span>Create Tournament</span>
              </Link>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-muted">
              <thead className="border-b border-white/10 text-xs uppercase tracking-wider text-muted/60">
                <tr>
                  <th className="py-3 pr-4 font-medium">Title</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium">Entry Fee</th>
                  <th className="py-3 pr-4 font-medium">Slots</th>
                  <th className="py-3 pr-4 font-medium">Start Date</th>
                  <th className="py-3 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTournaments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-muted">
                      No tournaments found.
                    </td>
                  </tr>
                ) : (
                  filteredTournaments.map((tournament) => {
                    const isWorking = tournamentActionId === tournament.id;

                    let statusColor = "bg-white/10 text-white";
                    let statusLabel = tournament.status;

                    switch (tournament.status) {
                      case "upcoming":
                        statusColor = "bg-[#f97316] text-white border-none"; // Orange
                        statusLabel = "Upcoming";
                        break;
                      case "ongoing":
                        statusColor = "bg-emerald-500 text-white border-none"; // Green
                        statusLabel = "Ongoing";
                        break;
                      case "completed":
                        statusColor = "bg-blue-500 text-white border-none"; // Blue
                        statusLabel = "Completed";
                        break;
                      case "awaiting_payout":
                        statusColor = "bg-white text-black border-none font-bold"; // White
                        statusLabel = "Awaiting Payout";
                        break;
                      case "paid":
                        statusColor = "bg-[#1a1a1a] text-white border border-white/20"; // Dark
                        statusLabel = "Paid";
                        break;
                      case "cancelled":
                        statusColor = "bg-red-500/10 text-red-400 border border-red-500/20";
                        statusLabel = "Cancelled";
                        break;
                    }

                    return (
                      <tr key={tournament.id} className="group transition hover:bg-white/5">
                        <td className="py-4 pr-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-white">{tournament.name}</span>
                            <span className="text-xs text-muted">{tournament.mode} • {tournament.type}</span>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusColor}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="py-4 pr-4 font-medium text-white">
                          {tournament.entryFee}
                        </td>
                        <td className="py-4 pr-4">
                          {tournament.registeredSlots}/{tournament.maxSlots}
                        </td>
                        <td className="py-4 pr-4 text-white">
                          {formatDateTime(tournament.startTime)}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <div className="relative inline-block" data-dropdown>
                            <button
                              type="button"
                              onClick={() => setTournamentActionId(tournamentActionId === tournament.id ? null : tournament.id)}
                              className="rounded-full p-2 text-muted transition hover:bg-white/10 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {tournamentActionId === tournament.id && (
                              <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-white/10 bg-[#1a1a1a] py-1 shadow-xl ring-1 ring-black/5">
                                <button
                                  onClick={() => {
                                    // Placeholder for edit
                                    alert("Edit functionality coming soon");
                                    setTournamentActionId(null);
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-xs text-white hover:bg-white/5"
                                >
                                  <Settings className="mr-2 h-3.5 w-3.5" />
                                  Edit
                                </button>

                                <button
                                  onClick={() => handleOpenRoomModal(tournament)}
                                  className="flex w-full items-center px-4 py-2 text-xs text-white hover:bg-white/5"
                                >
                                  <Lock className="mr-2 h-3.5 w-3.5" />
                                  Share Room Details
                                </button>

                                <button
                                  onClick={() => {
                                    handleOpenPrizeDistribution(tournament);
                                    // Also update status to awaiting_payout if it's not already paid
                                    if (tournament.status !== 'paid' && tournament.status !== 'awaiting_payout') {
                                      handleTournamentStatusChange(tournament.id, 'awaiting_payout');
                                    }
                                  }}
                                  className="flex w-full items-center px-4 py-2 text-xs text-white hover:bg-white/5"
                                >
                                  <Trophy className="mr-2 h-3.5 w-3.5" />
                                  Distribute Rewards
                                </button>

                                <div className="my-1 border-t border-white/10" />

                                <button
                                  onClick={() => handleDeleteTournament(tournament.id)}
                                  className="flex w-full items-center px-4 py-2 text-xs text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="mr-2 h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (activeTab === "matches") {
      const upcomingAndOngoing = tournamentsData.filter((tournament) =>
        ["upcoming", "ongoing"].includes(tournament.status),
      );

      return (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5 text-sm text-muted">
          <p className="text-sm font-semibold text-white">Matches</p>
          <p className="text-xs text-muted">
            See upcoming and live matches, with quick access to details.
          </p>

          <div className="mt-4 divide-y divide-white/5 border-t border-white/5">
            {upcomingAndOngoing.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                There are no upcoming or live matches right now.
              </p>
            ) : (
              upcomingAndOngoing.map((tournament) => (
                <div
                  key={tournament.id}
                  className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-white">
                        {tournament.name}
                      </p>
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
                        {tournament.mode}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${tournament.status === "upcoming"
                          ? "bg-blue-500/10 text-blue-300"
                          : "bg-emerald-500/10 text-emerald-300"
                          }`}
                      >
                        {tournament.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Starts: {formatDateTime(tournament.startTime)} ·
                      Registered: {tournament.registeredSlots}/
                      {tournament.maxSlots}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 font-semibold text-white hover:border-emerald-400/60"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                      View
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      );
    }

    if (activeTab === "users") {
      const filteredUsers = walletUsers.filter((user) =>
        user.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.toLowerCase())
      );

      return (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5 text-sm text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>)
              <p className="text-sm font-semibold text-white">Users</p>
              <p className="text-xs text-muted">
                Manage all registered users and their wallets.
              </p>
            </div>
            <div className="text-[11px] text-muted">
              Total users: <span className="font-semibold">{walletUsers.length}</span>
            </div>
          </div>

          <div className="mt-4">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-muted focus:border-emerald-400/60 focus:outline-none"
            />
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs text-muted">
              <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em]">
                <tr>
                  <th className="py-2 pr-4 font-semibold text-white">Player</th>
                  <th className="py-2 pr-4 font-semibold text-white">Email</th>
                  <th className="py-2 pr-4 font-semibold text-white">Balance</th>
                  <th className="py-2 pr-4 font-semibold text-white">Deposited</th>
                  <th className="py-2 pr-4 font-semibold text-white">Withdrawn</th>
                  <th className="py-2 pr-4 font-semibold text-white">Status</th>
                  <th className="py-2 pr-4 font-semibold text-white">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-6 text-center text-xs text-muted"
                    >
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userSummary) => {
                    const isAdmin = adminIds.includes(userSummary.id);
                    const isSuperAdmin = userSummary.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                    return (
                      <tr key={userSummary.id} className="border-b border-white/5">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 text-xs text-white">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-semibold text-emerald-300">
                              {userSummary.displayName.charAt(0).toUpperCase()}
                            </span>
                            <span>{userSummary.displayName}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-[11px] text-muted">
                          {userSummary.email}
                        </td>
                        <td className="py-3 pr-4 text-xs text-white">
                          {userSummary.balance} 💎
                        </td>
                        <td className="py-3 pr-4 text-xs text-emerald-300">
                          {userSummary.totalDeposited} 💎
                        </td>
                        <td className="py-3 pr-4 text-xs text-red-300">
                          {userSummary.totalWithdrawn} 💎
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex flex-wrap gap-1">
                            {isSuperAdmin && (
                              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                Super Admin
                              </span>
                            )}
                            {isAdmin && !isSuperAdmin && (
                              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-300">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="relative inline-block" data-dropdown>
                            <button
                              type="button"
                              onClick={() => setUserActionId(userActionId === userSummary.id ? null : userSummary.id)}
                              className="rounded-full p-1 text-muted transition hover:bg-white/5 hover:text-white"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {userActionId === userSummary.id && (
                              <div className="absolute right-0 z-10 mt-1 w-48 rounded-2xl border border-white/10 bg-[#0a0f0d] py-2 shadow-xl">
                                {!isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleGrantAdmin(userSummary.id, userSummary.displayName, userSummary.email);
                                      setUserActionId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs text-white transition hover:bg-emerald-500/10"
                                  >
                                    <ShieldCheck className="mr-2 inline h-3 w-3" />
                                    Grant Admin
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleBanUser(userSummary.id, userSummary.displayName);
                                    setUserActionId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs text-yellow-300 transition hover:bg-yellow-500/10"
                                >
                                  <XCircle className="mr-2 inline h-3 w-3" />
                                  Ban User
                                </button>
                                {!isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleDeleteUser(userSummary.id, userSummary.displayName);
                                      setUserActionId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                                  >
                                    <Trash2 className="mr-2 inline h-3 w-3" />
                                    Delete User
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      );
    }

    if (activeTab === "payments") {
      return (
        <section className="mt-6 space-y-4">
          <div className="flex gap-2 rounded-full bg-black/40 p-1 text-sm">
            <button
              type="button"
              onClick={() => setPaymentSubTab("deposits")}
              className={`flex-1 rounded-full px-4 py-2 font-semibold transition ${paymentSubTab === "deposits"
                ? "bg-emerald-500 text-black"
                : "text-muted hover:text-white"
                }`}
            >
              Deposits ({pendingDeposits.length})
            </button>
            <button
              type="button"
              onClick={() => setPaymentSubTab("withdrawals")}
              className={`flex-1 rounded-full px-4 py-2 font-semibold transition ${paymentSubTab === "withdrawals"
                ? "bg-emerald-500 text-black"
                : "text-muted hover:text-white"
                }`}
            >
              Withdrawals ({pendingWithdrawals.length})
            </button>
          </div>

          {paymentSubTab === "deposits" && (
            <div className="space-y-4">
              {pendingDeposits.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-12 text-center">
                  <p className="text-sm text-muted">No pending deposits</p>
                </div>
              ) : (
                pendingDeposits.map((request) => {
                  const userInfo = walletUsers.find((u) => u.id === request.userId);
                  return (
                    <div
                      key={request.id}
                      className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                              User Information
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-muted">Name:</span>{" "}
                                {request.userDisplayName}
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Email:</span>{" "}
                                {request.userEmail}
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Current Balance:</span>{" "}
                                {userInfo?.balance ?? 0} 💎
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-emerald-500/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                              Sender Details
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-emerald-300/70">Name:</span>{" "}
                                {request.depositAccountName ?? "N/A"}
                              </p>
                              <p className="text-white">
                                <span className="text-emerald-300/70">Phone:</span>{" "}
                                {request.depositAccountNumber ?? "N/A"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Request Details
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-muted">Amount:</span>{" "}
                                <span className="font-semibold text-emerald-300">
                                  {request.amount} 💎
                                </span>
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Submitted:</span>{" "}
                                {formatDateTime(request.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Transaction Proof
                            </p>
                            {request.screenshotUrl ? (
                              <img
                                src={request.screenshotUrl}
                                alt="Transaction proof"
                                className="mt-2 w-full rounded-2xl border border-white/10"
                              />
                            ) : (
                              <p className="mt-2 text-sm text-muted">No screenshot provided</p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprovePayment(request)}
                              disabled={paymentActionId === request.id}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectPayment(request)}
                              disabled={paymentActionId === request.id}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {paymentSubTab === "withdrawals" && (
            <div className="space-y-4">
              {pendingWithdrawals.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-12 text-center">
                  <p className="text-sm text-muted">No pending withdrawals</p>
                </div>
              ) : (
                pendingWithdrawals.map((request) => {
                  const userInfo = walletUsers.find((u) => u.id === request.userId);
                  return (
                    <div
                      key={request.id}
                      className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                              User Information
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-muted">Name:</span>{" "}
                                {request.userDisplayName}
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Email:</span>{" "}
                                {request.userEmail}
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Current Balance:</span>{" "}
                                {userInfo?.balance ?? 0} 💎
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-blue-500/10 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                              Recipient Details
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-blue-300/70">Method:</span>{" "}
                                {request.withdrawMethod ?? "N/A"}
                              </p>
                              <p className="text-white">
                                <span className="text-blue-300/70">Name:</span>{" "}
                                {request.recipientName ?? "N/A"}
                              </p>
                              <p className="text-white">
                                <span className="text-blue-300/70">Account:</span>{" "}
                                {request.recipientAccount ?? "N/A"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                              Request Details
                            </p>
                            <div className="mt-2 space-y-1 text-sm">
                              <p className="text-white">
                                <span className="text-muted">Amount:</span>{" "}
                                <span className="font-semibold text-red-300">
                                  {request.amount} 💎
                                </span>
                              </p>
                              <p className="text-white">
                                <span className="text-muted">Submitted:</span>{" "}
                                {formatDateTime(request.createdAt)}
                              </p>
                              {request.deductedOnSubmit && (
                                <p className="text-xs text-emerald-300">
                                  ✓ Diamonds already deducted
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprovePayment(request)}
                            disabled={paymentActionId === request.id}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Approve Withdrawal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectPayment(request)}
                            disabled={paymentActionId === request.id}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-60"
                          >
                            <XCircle className="h-4 w-4" />
                            Reject & Refund
                          </button>
                          {request.deductedOnSubmit && (
                            <p className="text-center text-[10px] text-muted">
                              Rejecting will refund {request.amount} 💎 to user
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>
      );
    }

    if (activeTab === "redeem") {
      return (
        <section className="mt-6 space-y-4">
          <div className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Create Redeem Code</p>
                <p className="text-xs text-muted">
                  Generate codes with custom settings
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-white">
                  Diamond Amount *
                </label>
                <input
                  type="number"
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(e.target.value)}
                  placeholder="e.g. 100"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-muted focus:border-emerald-400/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white">
                  Max Uses *
                </label>
                <input
                  type="number"
                  value={redeemMaxUses}
                  onChange={(e) => setRedeemMaxUses(e.target.value)}
                  placeholder="e.g. 1"
                  min="1"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-muted focus:border-emerald-400/60 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white">
                  Custom Code (Optional)
                </label>
                <input
                  type="text"
                  value={redeemCustomCode}
                  onChange={(e) => setRedeemCustomCode(e.target.value)}
                  placeholder="Leave empty to auto-generate"
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-muted focus:border-emerald-400/60 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted">
                  Will be converted to uppercase
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-white">
                  Expiration Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={redeemExpiresAt}
                  onChange={(e) => setRedeemExpiresAt(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder:text-muted focus:border-emerald-400/60 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted">
                  Leave empty for no expiration
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateRedeemCode}
              disabled={redeemBusy}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60"
            >
              <Gift className="h-4 w-4" />
              {redeemBusy ? "Creating..." : "Create Redeem Code"}
            </button>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5 text-sm text-muted">
            <p className="text-sm font-semibold text-white">Redeem Codes</p>
            <p className="text-xs text-muted">
              {redeemCodes.length} code{redeemCodes.length !== 1 ? "s" : ""} created
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-xs text-muted">
                <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.14em]">
                  <tr>
                    <th className="py-2 pr-4 font-semibold text-white">Code</th>
                    <th className="py-2 pr-4 font-semibold text-white">Amount</th>
                    <th className="py-2 pr-4 font-semibold text-white">Uses</th>
                    <th className="py-2 pr-4 font-semibold text-white">Expires</th>
                    <th className="py-2 pr-4 font-semibold text-white">Created</th>
                    <th className="py-2 pr-4 font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {redeemCodes.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-xs text-muted"
                      >
                        No redeem codes created yet.
                      </td>
                    </tr>
                  ) : (
                    redeemCodes.map((code) => {
                      const isExpired =
                        code.expiresAt && code.expiresAt < new Date();
                      const isFullyUsed = code.currentUses >= code.maxUses;
                      const isInactive = isExpired || isFullyUsed;

                      return (
                        <tr key={code.id} className="border-b border-white/5">
                          <td className="py-2 pr-4">
                            <div className="flex items-center gap-2">
                              <code className="rounded bg-black/40 px-2 py-1 text-[11px] font-mono text-emerald-300">
                                {code.code}
                              </code>
                              {isInactive && (
                                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                                  {isExpired ? "Expired" : "Used"}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 pr-4 text-xs text-white">
                            {code.amount} 💎
                          </td>
                          <td className="py-2 pr-4 text-xs">
                            <span
                              className={
                                isFullyUsed ? "text-red-300" : "text-emerald-300"
                              }
                            >
                              {code.currentUses}/{code.maxUses}
                            </span>
                          </td>
                          <td className="py-2 pr-4 text-[11px] text-muted">
                            {code.expiresAt
                              ? formatDateTime(code.expiresAt)
                              : "Never"}
                          </td>
                          <td className="py-2 pr-4 text-[11px] text-muted">
                            {formatDateTime(code.createdAt)}
                          </td>
                          <td className="py-2 pr-4">
                            <button
                              type="button"
                              onClick={() => handleDeleteRedeemCode(code.id)}
                              className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/25"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      );
    }

    if (activeTab === "admin") {
      const adminUsers = walletUsers.filter((user) =>
        adminIds.includes(user.id) || user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
      );

      return (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#070b10] px-6 py-5 text-sm text-muted">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Admin Management</p>
              <p className="text-xs text-muted">
                Manage who has access to the admin dashboard.
              </p>
            </div>
            <div className="text-[11px] text-muted">
              Total admins: <span className="font-semibold">{adminUsers.length}</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {adminUsers.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted">
                No admins found.
              </p>
            ) : (
              adminUsers.map((admin) => {
                const isSuperAdmin = admin.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

                return (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-semibold text-emerald-300">
                        {admin.displayName.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            {admin.displayName}
                          </p>
                          {isSuperAdmin && (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
                              Super Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted">{admin.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        Active
                      </span>

                      {!isSuperAdmin && (
                        <div className="relative inline-block" data-dropdown>
                          <button
                            type="button"
                            onClick={() => setAdminActionId(adminActionId === admin.id ? null : admin.id)}
                            className="rounded-full p-1 text-muted transition hover:bg-white/5 hover:text-white"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {adminActionId === admin.id && (
                            <div className="absolute right-0 z-10 mt-1 w-48 rounded-2xl border border-white/10 bg-[#0a0f0d] py-2 shadow-xl">
                              <button
                                type="button"
                                onClick={() => {
                                  handleRevokeAdmin(admin.id, admin.displayName);
                                  setAdminActionId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-xs text-red-300 transition hover:bg-red-500/10"
                              >
                                <XCircle className="mr-2 inline h-3 w-3" />
                                Revoke Admin Access
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-blue-500/5 p-4">
            <p className="text-xs font-semibold text-blue-300">ℹ️ How to Grant Admin Access</p>
            <p className="mt-1 text-[11px] text-muted">
              Go to the <strong>Users</strong> tab, find a user, click the three-dot menu, and select "Grant Admin" to give them admin access.
            </p>
          </div>

          <div className="mt-4 rounded-2xl bg-emerald-500/5 p-4">
            <p className="text-xs font-semibold text-emerald-300">🔒 Security Note</p>
            <p className="mt-1 text-[11px] text-muted">
              The Super Admin ({ADMIN_EMAIL}) cannot be revoked and has permanent access to all admin features.
            </p>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="global-bg min-h-screen px-4 pb-20 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-10">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
            Admin Dashboard
          </p>
          <h1 className="text-3xl font-semibold text-white">Control Center</h1>
          <p className="text-sm text-muted">
            Manage tournaments, users, and monitor platform performance.
          </p>
          <div className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-[#080f0c] px-4 py-2 text-xs">
            <div className="flex flex-col">
              <span className="font-semibold text-white">{displayName}</span>
              <span className="text-[11px] text-muted">{email}</span>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Super Admin
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              <LogOut className="h-3 w-3" />
              <span>Log out</span>
            </button>
          </div>
        </header>

        <nav className="mt-2 flex flex-wrap gap-2 rounded-full bg-black/40 p-1 text-xs sm:text-sm">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center rounded-full px-3 py-2 font-semibold transition sm:px-4 ${isActive
                  ? "bg-emerald-500 text-black shadow-[0_0_18px_rgba(16,185,129,0.6)]"
                  : "text-muted hover:bg-white/5 hover:text-white"
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {renderTabContent()}

        <div className="mt-6 flex flex-wrap justify-between gap-3 text-xs text-muted">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-semibold text-white hover:border-emerald-400/60"
          >
            Back to Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-semibold text-white hover:border-emerald-400/60"
          >
            View Player Dashboard
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-[11px]">
            <Settings className="h-3 w-3 text-emerald-300" />
            <span>More admin tools coming soon</span>
          </div>
        </div>
      </div>

      {/* Prize Distribution Modal */}
      {showPrizeModal && selectedTournamentForPrizes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Distribute Rewards</h2>
                <p className="mt-1 text-xs text-muted">
                  Select the winners and the prize amount they will receive.
                </p>
              </div>
              <button
                onClick={() => setShowPrizeModal(false)}
                className="rounded-full p-1 text-muted transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              {prizeWinners.map((winner, index) => (
                <div key={winner.id} className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <label className="mb-1.5 block text-xs font-semibold text-white">
                        Winner #{index + 1}
                      </label>
                      <select
                        value={winner.userId}
                        onChange={(e) => handleUpdateWinnerRow(winner.id, "userId", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">Select a player</option>
                        {tournamentParticipants.map((p) => (
                          <option key={p.id} value={p.userId}>
                            {p.userName} ({p.gameId})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <label className="mb-1.5 block text-xs font-semibold text-white">
                        Amount
                      </label>
                      <input
                        type="number"
                        value={winner.amount}
                        onChange={(e) => handleUpdateWinnerRow(winner.id, "amount", e.target.value)}
                        className="w-full rounded-lg border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="mt-6">
                      <button
                        onClick={() => handleRemoveWinnerRow(winner.id)}
                        className="rounded-lg bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                onClick={handleAddWinnerRow}
                className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Winner
              </button>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowPrizeModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrizeDistribution}
                disabled={processingPrizes}
                className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea580c] disabled:opacity-50"
              >
                {processingPrizes ? "Processing..." : "Confirm & Distribute"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Room Details Modal */}
      {showRoomModal && selectedTournamentForRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Share Room Credentials</h2>
                <p className="mt-1 text-xs text-muted">
                  Enter the room details to share with registered participants.
                </p>
              </div>
              <button
                onClick={() => setShowRoomModal(false)}
                className="rounded-full p-1 text-muted transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white">
                  Room ID
                </label>
                <input
                  type="text"
                  value={roomDetails.roomId}
                  onChange={(e) => setRoomDetails({ ...roomDetails, roomId: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
                  placeholder="Enter Room ID"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-white">
                  Room Password
                </label>
                <input
                  type="text"
                  value={roomDetails.roomPassword}
                  onChange={(e) => setRoomDetails({ ...roomDetails, roomPassword: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0f0d] px-3 py-2 text-sm text-white focus:border-[#f97316] focus:outline-none"
                  placeholder="Enter Room Password"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowRoomModal(false)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoomDetails}
                className="rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ea580c]"
              >
                Save & Share
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

type StatCardProps = {
  label: string;
  description: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function AdminStatCard({ label, description, value, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#080f0c] px-5 py-4">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        <Icon className="h-4 w-4 text-emerald-300" />
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold text-white">{value}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
    </div>
  );
}

type ActionRowProps = {
  title: string;
  description: string;
  href: string;
};

function AdminActionRow({ title, description, href }: ActionRowProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#070b10] px-4 py-3 text-left text-sm transition hover:border-emerald-400/60"
    >
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-emerald-300" />
    </Link>
  );
}

type StatusRowProps = {
  label: string;
  status: SystemStatus;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function StatusRow({ label, status, icon: Icon }: StatusRowProps) {
  const isOnline = status === "online";
  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#070b10] px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-emerald-300" />
        <span>{label}</span>
      </div>
      <span
        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${isOnline
          ? "bg-emerald-500/10 text-emerald-300"
          : "bg-red-500/10 text-red-300"
          }`}
      >
        {isOnline ? "Online" : "Issue"}
      </span>
    </div>
  );
}
