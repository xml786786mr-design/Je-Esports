"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CreditCard,
  Gem,
  History,
} from "lucide-react";

import { auth, db } from "../firebase";

type WalletStats = {
  balance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalEarnings: number;
};

type WalletTransaction = {
  id: string;
  type: "deposit" | "withdraw";
  amount: number;
  createdAt: Date | null;
};

type WalletTab = "deposit" | "withdraw" | "history" | "redeem";

type PaymentMethod =
  | "bank_transfer"
  | "jazzcash"
  | "easypaisa"
  | "sadapay"
  | "nayapay";

export default function WalletPage() {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<WalletTab>("deposit");
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("bank_transfer");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountNumberInput, setAccountNumberInput] = useState("");
  const [depositScreenshotFile, setDepositScreenshotFile] =
    useState<File | null>(null);
  const [withdrawMethod, setWithdrawMethod] =
    useState<PaymentMethod | "">("");
  const [withdrawRecipientName, setWithdrawRecipientName] = useState("");
  const [withdrawRecipientAccount, setWithdrawRecipientAccount] =
    useState("");
  const [redeemCode, setRedeemCode] = useState("");

  const router = useRouter();

  const fetchWallet = async (walletUser: User) => {
    setLoading(true);
    setError(null);

    try {
      const walletRef = doc(db, "wallets", walletUser.uid);
      const snap = await getDoc(walletRef);

      const profile = {
        email: walletUser.email ?? "",
        displayName:
          walletUser.displayName ||
          walletUser.email?.split("@")[0] ||
          "Player",
      };

      let data: WalletStats;
      if (!snap.exists()) {
        data = {
          balance: 0,
          totalDeposited: 0,
          totalWithdrawn: 0,
          totalEarnings: 0,
        };
        await setDoc(walletRef, { ...data, ...profile }, { merge: true });
      } else {
        const raw = snap.data() as any;
        data = {
          balance: raw.balance ?? 0,
          totalDeposited: raw.totalDeposited ?? 0,
          totalWithdrawn: raw.totalWithdrawn ?? 0,
          totalEarnings: raw.totalEarnings ?? 0,
        };
        await setDoc(walletRef, profile, { merge: true });
      }
      setStats(data);

      const txRef = collection(db, "wallets", walletUser.uid, "transactions");
      const q = query(txRef, orderBy("createdAt", "desc"), limit(10));
      const qSnap = await getDocs(q);
      const list: WalletTransaction[] = qSnap.docs.map((docSnap) => {
        const txData = docSnap.data() as any;
        return {
          id: docSnap.id,
          type: txData.type,
          amount: txData.amount ?? 0,
          createdAt: txData.createdAt?.toDate() ?? null,
        };
      });
      setTransactions(list);
    } catch (err) {
      console.error(err);
      setError("Failed to load wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (current) => {
      if (!current) {
        router.push("/login");
        return;
      }
      setUser(current);
      fetchWallet(current);
    });

    return () => unsubscribe();
  }, [router]);

  const handleTransaction = async (
    type: "deposit" | "withdraw",
    rawAmount: string,
  ) => {
    if (!user || !stats) return;

    const value = Number(rawAmount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Enter a valid diamond amount.");
      return;
    }

    if (type === "deposit" && !depositScreenshotFile) {
      setError("Please upload a screenshot of your payment.");
      return;
    }

    if (type === "withdraw" && value < 25) {
      setError("Minimum withdrawal is 25 diamonds.");
      return;
    }

    if (type === "withdraw" && value > stats.balance) {
      setError("Not enough diamonds to withdraw that amount.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      let screenshotUrl: string | null = null;
      if (type === "deposit" && depositScreenshotFile) {
        try {
          const formData = new FormData();
          formData.append("file", depositScreenshotFile);

          const response = await fetch("/api/upload-proof", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = (await response.json()) as { url?: string };
            if (data.url) {
              screenshotUrl = data.url;
            }
          } else {
            console.warn("Upload proof API returned an error status");
          }
        } catch (uploadError) {
          console.warn("Failed to upload deposit screenshot", uploadError);
        }
      }

      // For withdrawals, immediately reserve (deduct) the amount from the wallet balance
      if (type === "withdraw") {
        const walletRef = doc(db, "wallets", user.uid);
        try {
          await runTransaction(db, async (transaction) => {
            const walletSnap = await transaction.get(walletRef);
            const walletData = (walletSnap.data() as any) || {};
            const currentBalance = walletData.balance ?? 0;

            if (value > currentBalance) {
              throw new Error("insufficient-balance");
            }

            const newBalance = currentBalance - value;

            transaction.set(
              walletRef,
              {
                balance: newBalance,
              },
              { merge: true },
            );
          });
        } catch (err) {
          console.error("Failed to reserve balance for withdrawal", err);
          if (err instanceof Error && err.message === "insufficient-balance") {
            setError("Not enough diamonds to withdraw that amount.");
          } else {
            setError("Failed to process request. Please try again.");
          }
          setSubmitting(false);
          return;
        }
      }

      const requestsRef = collection(db, "paymentRequests");
      await addDoc(requestsRef, {
        userId: user.uid,
        userEmail: user.email ?? "",
        userDisplayName:
          user.displayName ?? user.email?.split("@")[0] ?? "Player",
        type,
        amount: value,
        status: "pending",
        createdAt: serverTimestamp(),
        // For deposits, also store the receipt/account details the player entered
        depositAccountName: type === "deposit" ? accountNameInput : null,
        depositAccountNumber: type === "deposit" ? accountNumberInput : null,
        // For withdrawals, mark that balance was already deducted on submit
        deductedOnSubmit: type === "withdraw",
        ...(type === "deposit" && screenshotUrl ? { screenshotUrl } : {}),
        ...(type === "withdraw"
          ? {
              withdrawMethod: withdrawMethod,
              recipientName: withdrawRecipientName,
              recipientAccount: withdrawRecipientAccount,
            }
          : {}),
      });

      if (type === "deposit") {
        setDepositAmount("");
        setDepositScreenshotFile(null);
      } else {
        setWithdrawAmount("");
        setWithdrawMethod("");
        setWithdrawRecipientName("");
        setWithdrawRecipientAccount("");
      }
      setMessage(
        type === "deposit"
          ? "Your deposit request has been submitted and is pending admin approval."
          : "Your withdrawal request has been submitted and is pending admin approval.",
      );

      fetchWallet(user);
    } catch (err) {
      console.error(err);
      setError("Failed to process request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const safeStats: WalletStats = stats ?? {
    balance: 0,
    totalDeposited: 0,
    totalWithdrawn: 0,
    totalEarnings: 0,
  };
  const currentMethodLabel = (() => {
    switch (paymentMethod) {
      case "jazzcash":
        return "JazzCash";
      case "easypaisa":
        return "Easypaisa";
      case "sadapay":
        return "SadaPay";
      case "nayapay":
        return "NayaPay";
      default:
        return "Bank Transfer";
    }
  })();

  const handleRedeemCode = async () => {
    if (!user) return;

    const raw = redeemCode.trim();
    if (!raw) {
      setError("Enter a redeem code.");
      return;
    }

    const code = raw.toUpperCase();

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const codeRef = doc(db, "redeemCodes", code);

      const result = await runTransaction(db, async (transaction) => {
        const codeSnap = await transaction.get(codeRef);
        if (!codeSnap.exists()) {
          throw new Error("invalid-code");
        }

        const data = codeSnap.data() as any;
        if (data.used) {
          throw new Error("already-used");
        }

        const amount: number = data.amount ?? 0;
        if (!Number.isFinite(amount) || amount <= 0) {
          throw new Error("invalid-amount");
        }

        const walletRef = doc(db, "wallets", user.uid);
        const walletSnap = await transaction.get(walletRef);
        const walletData = (walletSnap.data() as any) || {};

        const currentBalance = walletData.balance ?? 0;
        const currentDeposited = walletData.totalDeposited ?? 0;
        const currentWithdrawn = walletData.totalWithdrawn ?? 0;
        const currentEarnings = walletData.totalEarnings ?? 0;

        const newBalance = currentBalance + amount;
        const newTotalDeposited = currentDeposited + amount;

        transaction.set(
          walletRef,
          {
            balance: newBalance,
            totalDeposited: newTotalDeposited,
            totalWithdrawn: currentWithdrawn,
            totalEarnings: currentEarnings,
          },
          { merge: true },
        );

        transaction.update(codeRef, {
          used: true,
          usedBy: user.uid,
          usedAt: serverTimestamp(),
        });

        const txRef = collection(db, "wallets", user.uid, "transactions");
        const newTxRef = doc(txRef);
        transaction.set(newTxRef, {
          type: "deposit",
          amount,
          createdAt: serverTimestamp(),
          source: "redeemCode",
          code,
        });

        return { amount, newBalance, newTotalDeposited };
      });

      setStats((prev) => {
        const base =
          prev ??
          ({
            balance: 0,
            totalDeposited: 0,
            totalWithdrawn: 0,
            totalEarnings: 0,
          } as WalletStats);
        return {
          ...base,
          balance: result.newBalance,
          totalDeposited: result.newTotalDeposited,
        };
      });

      setRedeemCode("");
      setMessage(`Redeem code applied. You received ${result.amount} diamonds.`);

      if (user) {
        await fetchWallet(user);
      }
    } catch (err: any) {
      console.error("Failed to redeem code", err);
      if (err instanceof Error) {
        if (err.message === "invalid-code") {
          setError("Redeem code not found. Please check and try again.");
        } else if (err.message === "already-used") {
          setError("This redeem code has already been used.");
        } else if (err.message === "invalid-amount") {
          setError("This redeem code is invalid.");
        } else {
          setError("Failed to redeem code. Please try again.");
        }
      } else {
        setError("Failed to redeem code. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const paymentAccountDetails = (() => {
    if (paymentMethod === "bank_transfer") {
      return {
        accountNameLabel: "Account Name",
        accountNameValue: "Fazal Rehman",
        accountNumberLabel: "UBL Account Number",
        accountNumberValue: "1136309436894",
      } as const;
    }

    if (paymentMethod === "easypaisa") {
      return {
        accountNameLabel: "Account Name",
        accountNameValue: "Fazal Rehman",
        accountNumberLabel: "Easypaisa Number",
        accountNumberValue: "03165928659",
      } as const;
    }

    if (paymentMethod === "sadapay") {
      return {
        accountNameLabel: "Account Name",
        accountNameValue: "Fazal Rehman",
        accountNumberLabel: "SadaPay Number",
        accountNumberValue: "03165475717",
      } as const;
    }

    if (paymentMethod === "nayapay") {
      return {
        accountNameLabel: "Account Name",
        accountNameValue: "Fazal Rehman",
        accountNumberLabel: "NayaPay Number",
        accountNumberValue: "03165475717",
      } as const;
    }

    // Default for any other method (e.g. JazzCash) until a real number is provided
    return {
      accountNameLabel: "Account Name",
      accountNameValue: "Fazal Rehman",
      accountNumberLabel:
        paymentMethod === "jazzcash" ? "JazzCash Number" : "Account Number",
      accountNumberValue: "0000-0000000",
    } as const;
  })();

  return (
    <div className="global-bg min-h-screen px-4 pb-24 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Wallet</h1>
          <p className="text-sm text-muted">
            Manage your funds and transactions. Currency: diamonds.
          </p>
        </header>

        {message ? (
          <p className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <section className="rounded-3xl bg-[#080f0c] px-6 py-5">
          <p className="text-sm font-semibold text-white">Current Balance</p>
          <div className="mt-4 flex items-baseline gap-3">
            <Gem className="h-7 w-7 text-emerald-400" />
            <p className="text-3xl font-semibold text-emerald-400">
              {safeStats.balance}
            </p>
            <span className="text-sm text-muted">diamonds</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            This is your current available balance to join tournaments.
          </p>
        </section>

        <section className="rounded-3xl bg-[#05080b] px-2 py-1">
          <div className="flex gap-2 text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => setActiveTab("deposit")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 font-semibold transition ${
                activeTab === "deposit"
                  ? "bg-emerald-500 text-black"
                  : "bg-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Deposit</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("withdraw")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 font-semibold transition ${
                activeTab === "withdraw"
                  ? "bg-emerald-500 text-black"
                  : "bg-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <ArrowUpFromLine className="h-4 w-4" />
              <span>Withdraw</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 font-semibold transition ${
                activeTab === "history"
                  ? "bg-emerald-500 text-black"
                  : "bg-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <History className="h-4 w-4" />
              <span>History</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("redeem")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl px-3 py-2 font-semibold transition ${
                activeTab === "redeem"
                  ? "bg-emerald-500 text-black"
                  : "bg-transparent text-muted hover:bg-white/5 hover:text-white"
              }`}
            >
              <History className="h-4 w-4" />
              <span>Redeem</span>
            </button>
          </div>
        </section>

        {activeTab === "deposit" && (
          <>
            <section className="rounded-3xl bg-[#080f0c] px-6 py-5 text-sm">
              <p className="text-sm font-semibold text-white">How It Works</p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted">
                <li>Choose a payment method below.</li>
                <li>Send your payment using the account details in Step 1.</li>
                <li>
                  Fill out the form in Step 2 so our team can verify your
                  payment.
                </li>
              </ol>
            </section>

            <section className="space-y-4 rounded-3xl bg-[#080f0c] px-6 py-5 text-sm">
              <div>
                <p className="text-sm font-semibold text-white">
                  Step 1: Send Payment
                </p>
                <p className="text-xs text-muted">
                  Send your payment to the account details shown for the
                  selected method.
                </p>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-emerald-300">
                    {currentMethodLabel}
                  </p>

                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl bg-[#05080b] px-4 py-3 text-xs">
                      <p className="text-[11px] text-muted">
                        {paymentAccountDetails.accountNameLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {paymentAccountDetails.accountNameValue}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-[#05080b] px-4 py-3 text-xs">
                      <p className="text-[11px] text-muted">
                        {paymentAccountDetails.accountNumberLabel}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {paymentAccountDetails.accountNumberValue}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-5">
                <p className="text-sm font-semibold text-white">
                  Step 2: Submit Your Details
                </p>
                <p className="text-xs text-muted">
                  After sending, fill out this form so we can match your
                  payment.
                </p>

                <div className="mt-4 space-y-4 text-xs">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-muted">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(event) =>
                        setPaymentMethod(event.target.value as PaymentMethod)
                      }
                      className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                    >
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="easypaisa">Easypaisa</option>
                      <option value="sadapay">SadaPay</option>
                      <option value="nayapay">NayaPay</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-muted">
                      Amount (diamonds)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={depositAmount}
                      onChange={(event) =>
                        setDepositAmount(event.target.value)
                      }
                      placeholder="Enter amount you sent"
                      className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-muted">
                      Your Account Name
                    </label>
                    <input
                      type="text"
                      value={accountNameInput}
                      onChange={(event) =>
                        setAccountNameInput(event.target.value)
                      }
                      placeholder="Enter the name on your payment account"
                      className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-muted">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumberInput}
                      onChange={(event) =>
                        setAccountNumberInput(event.target.value)
                      }
                      placeholder="Enter the account / mobile number you used"
                      className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-muted">
                      Transaction Screenshot
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0] ?? null;
                        setDepositScreenshotFile(file);
                      }}
                      className="w-full cursor-pointer rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-black focus:ring-emerald-500/70"
                    />
                    <p className="text-[10px] text-muted">
                      Upload a clear photo of your payment receipt or
                      transaction screen.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={submitting || loading}
                    onClick={() => void handleTransaction("deposit", depositAmount)}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Submitting..." : "Submit for Verification"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === "withdraw" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[#080f0c] px-6 py-5 text-sm">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <ArrowUpFromLine className="h-4 w-4 text-emerald-300" />
                Withdraw Funds
              </p>
              <p className="mt-1 text-xs text-muted">
                Request a withdrawal to your bank account or mobile wallet.
                Minimum withdrawal is 25 diamonds.
              </p>

              <div className="mt-4 space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted">
                    Amount to Withdraw
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="Enter amount in diamonds"
                    className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                  />
                  <p className="pt-1 text-[11px] text-muted">
                    Your current balance is
                    {" "}
                    <span className="font-semibold text-white">
                      {safeStats.balance}
                    </span>{" "}
                    diamonds.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted">
                    Withdrawal Method
                  </label>
                  <select
                    value={withdrawMethod}
                    onChange={(event) =>
                      setWithdrawMethod(
                        event.target.value as PaymentMethod | "",
                      )
                    }
                    className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                  >
                    <option value="">Select where to send funds</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="easypaisa">Easypaisa</option>
                    <option value="sadapay">SadaPay</option>
                    <option value="nayapay">NayaPay</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted">
                    Recipient Account Name
                  </label>
                  <input
                    type="text"
                    value={withdrawRecipientName}
                    onChange={(event) =>
                      setWithdrawRecipientName(event.target.value)
                    }
                    placeholder="e.g., John Doe"
                    className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-muted">
                    Recipient Account Number
                  </label>
                  <input
                    type="text"
                    value={withdrawRecipientAccount}
                    onChange={(event) =>
                      setWithdrawRecipientAccount(event.target.value)
                    }
                    placeholder="e.g., 03001234567"
                    className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                  />
                </div>

                <button
                  type="button"
                  disabled={submitting || loading}
                  onClick={() => {
                    if (!withdrawAmount) {
                      setError("Enter an amount to withdraw.");
                      return;
                    }
                    if (!withdrawMethod) {
                      setError("Select where to send funds.");
                      return;
                    }
                    if (
                      !withdrawRecipientName.trim() ||
                      !withdrawRecipientAccount.trim()
                    ) {
                      setError(
                        "Enter the recipient account name and account number.",
                      );
                      return;
                    }
                    void handleTransaction("withdraw", withdrawAmount);
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111318] px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowUpFromLine className="h-4 w-4" />
                  Request Withdrawal
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "redeem" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[#080f0c] px-6 py-5 text-sm">
              <p className="text-sm font-semibold text-white">Redeem Code</p>
              <p className="mt-1 text-xs text-muted">
                Enter a redeem code from events or tournaments to receive free
                diamonds. Codes usually start with
                {" "}
                <span className="font-mono text-emerald-300">JEESPORTS</span>.
              </p>

              <div className="mt-4 space-y-3 text-xs">
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(event) => setRedeemCode(event.target.value)}
                  placeholder="Enter your redeem code, e.g. JEESPORTS-ABC123"
                  className="w-full rounded-lg bg-[#05080b] px-3 py-2 text-xs text-white outline-none ring-1 ring-white/10 focus:ring-emerald-500/70"
                />

                <button
                  type="button"
                  disabled={submitting || loading}
                  onClick={handleRedeemCode}
                  className="inline-flex w-full items-center justify-center rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-black transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Redeem Code
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "history" && (
          <section className="space-y-4">
            <div className="rounded-3xl bg-[#080f0c] px-6 py-5">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-300" />
                <div>
                  <p className="text-sm font-semibold text-white">
                    Transaction History
                  </p>
                  <p className="text-xs text-muted">
                    Your recent deposits and withdrawals.
                  </p>
                </div>
              </div>

              {loading ? (
                <p className="mt-4 text-sm text-muted">Loading wallet...</p>
              ) : transactions.length === 0 ? (
                <p className="mt-4 text-sm text-muted">No transactions yet.</p>
              ) : (
                <ul className="mt-4 divide-y divide-white/5 text-sm">
                  {transactions.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex items-center gap-3">
                        {tx.type === "deposit" ? (
                          <ArrowDownToLine className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <ArrowUpFromLine className="h-4 w-4 text-red-300" />
                        )}
                        <div>
                          <p className="font-semibold text-white">
                            {tx.type === "deposit" ? "Deposit" : "Withdraw"}
                          </p>
                          <p className="text-[11px] text-muted">
                            {tx.createdAt
                              ? tx.createdAt.toLocaleString()
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                      <p
                        className={`font-semibold ${
                          tx.type === "deposit"
                            ? "text-emerald-300"
                            : "text-red-300"
                        }`}
                      >
                        {tx.type === "withdraw" ? "-" : "+"}
                        {tx.amount}{" "}
                        <span className="text-xs text-muted">diamonds</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:border-emerald-400/60"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
