"use client";

import { useState, useMemo } from "react";
import { useAccount } from "wagmi";
import Link from "next/link";
import {
  Package,
  Plus,
  Zap,
  Gavel,
  DollarSign,
  Activity,
  Clock,
  ChevronRight,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  FileText,
  Eye,
  EyeOff,
  Briefcase,
} from "lucide-react";

import { MOCK_INVENTIONS } from "@/lib/mockData";
import {
  NashPhase,
  NashPhaseLabels,
  CategoryIcons,
  FullInvention,
  isPayPerUse,
  isNash,
  formatTimeRemaining,
  Execution,
  InventionCategory,
} from "@/types";
import { formatUSDC } from "@/config/wagmi";
import { useBlockTimeOffset } from "@/hooks/useBlockTimeOffset";

// ============================================
// MOCK DATA (Buyer Hub)
// ============================================

const MOCK_EXECUTIONS: (Execution & {
  inventionTitle: string;
  inventionCategory: number;
})[] = [
  {
    id: "0x1234" as `0x${string}`,
    inventionId: MOCK_INVENTIONS[0].id,
    inventionTitle: MOCK_INVENTIONS[0].metadata.title,
    inventionCategory: MOCK_INVENTIONS[0].category,
    buyer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    inputHash: "0xabcd" as `0x${string}`,
    resultHash: "0xef01" as `0x${string}`,
    attestation: "0x..." as `0x${string}`,
    executionTimeMs: BigInt(234),
    priceCharged: BigInt(5_000000), // 5 USDC
    requestedAt: BigInt(Math.floor(Date.now() / 1000) - 3600),
    completedAt: BigInt(Math.floor(Date.now() / 1000) - 3500),
    completed: true,
    success: true,
  },
  {
    id: "0x5678" as `0x${string}`,
    inventionId: MOCK_INVENTIONS[0].id,
    inventionTitle: MOCK_INVENTIONS[0].metadata.title,
    inventionCategory: MOCK_INVENTIONS[0].category,
    buyer: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    inputHash: "0xabcd" as `0x${string}`,
    resultHash: "0x0000" as `0x${string}`,
    attestation: "0x" as `0x${string}`,
    executionTimeMs: BigInt(0),
    priceCharged: BigInt(5_000000),
    requestedAt: BigInt(Math.floor(Date.now() / 1000) - 60),
    completedAt: BigInt(0),
    completed: false,
    success: false,
  },
];

interface NashBidWithDetails {
  inventionId: `0x${string}`;
  inventionTitle: string;
  inventionCategory: number;
  bidHash: `0x${string}`;
  maxWillingToPay: bigint;
  depositAmount: bigint;
  submitted: boolean;
  revealed: boolean;
  phase: NashPhase;
  bidDeadline: bigint;
  revealDeadline: bigint;
  isWinner: boolean;
  finalPrice?: bigint;
}

const MOCK_NASH_BIDS: NashBidWithDetails[] = [
  {
    inventionId: MOCK_INVENTIONS[1]?.id || ("0x0" as `0x${string}`),
    inventionTitle: MOCK_INVENTIONS[1]?.metadata.title || "Trading Strategy",
    inventionCategory: MOCK_INVENTIONS[1]?.category || 2,
    bidHash: "0xabc123" as `0x${string}`,
    maxWillingToPay: BigInt(50000_000000), // 50K USDC
    depositAmount: BigInt(1000_000000), // 1K USDC deposit
    submitted: true,
    revealed: false,
    phase: NashPhase.Open,
    bidDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 2),
    revealDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5),
    isWinner: false,
  },
  {
    inventionId: "0x9999" as `0x${string}`,
    inventionTitle: "Proprietary Alpha Model",
    inventionCategory: 2,
    bidHash: "0xdef456" as `0x${string}`,
    maxWillingToPay: BigInt(100000_000000), // 100K USDC
    depositAmount: BigInt(5000_000000), // 5K deposit
    submitted: true,
    revealed: true,
    phase: NashPhase.Settled,
    bidDeadline: BigInt(Math.floor(Date.now() / 1000) - 86400 * 5),
    revealDeadline: BigInt(Math.floor(Date.now() / 1000) - 86400 * 2),
    isWinner: true,
    finalPrice: BigInt(85000_000000), // 85K USDC
  },
];

// ============================================
// TYPES
// ============================================

type MainView = "creator" | "buyer";
type CreatorTab = "all" | "pay-per-use" | "nash";
type BuyerTab = "executions" | "nash-bids";

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function VaultPage() {
  const { address, isConnected } = useAccount();
  const [mainView, setMainView] = useState<MainView>("creator");

  // Sub-states for each view
  const [creatorTab, setCreatorTab] = useState<CreatorTab>("all");
  const [buyerTab, setBuyerTab] = useState<BuyerTab>("executions");

  // --- CREATOR STUDIO STATS & DATA ---
  const myInventions = useMemo(() => {
    if (!address) return [];
    return MOCK_INVENTIONS; // In production, filter by actual seller address
  }, [address]);

  const filteredInventions = useMemo(() => {
    if (creatorTab === "all") return myInventions;
    if (creatorTab === "pay-per-use") return myInventions.filter(isPayPerUse);
    return myInventions.filter(isNash);
  }, [myInventions, creatorTab]);

  const creatorStats = useMemo(() => {
    return myInventions.reduce(
      (acc, inv) => {
        acc.total++;
        if (isPayPerUse(inv)) {
          acc.payPerUse++;
          acc.totalRevenue += inv.config.totalRevenue;
          acc.totalExecutions += inv.config.totalExecutions;
        } else if (isNash(inv)) {
          acc.nash++;
          if (inv.config.phase === NashPhase.Open) acc.activeNash++;
        }
        return acc;
      },
      {
        total: 0,
        payPerUse: 0,
        nash: 0,
        activeNash: 0,
        totalRevenue: BigInt(0),
        totalExecutions: BigInt(0),
      },
    );
  }, [myInventions]);

  // --- BUYER HUB STATS ---
  const buyerStats = useMemo(() => {
    const completedExecutions = MOCK_EXECUTIONS.filter(
      (e) => e.completed && e.success,
    );
    const pendingExecutions = MOCK_EXECUTIONS.filter((e) => !e.completed);
    const totalSpent = MOCK_EXECUTIONS.reduce(
      (sum, e) => sum + e.priceCharged,
      BigInt(0),
    );
    const activeBids = MOCK_NASH_BIDS.filter(
      (b) => b.phase === NashPhase.Open || b.phase === NashPhase.Reveal,
    );
    const wonBids = MOCK_NASH_BIDS.filter((b) => b.isWinner);
    const totalDeposits = activeBids.reduce(
      (sum, b) => sum + b.depositAmount,
      BigInt(0),
    );

    return {
      completedExecutions: completedExecutions.length,
      pendingExecutions: pendingExecutions.length,
      totalSpent,
      activeBids: activeBids.length,
      wonBids: wonBids.length,
      totalDeposits,
    };
  }, []);

  // --- UNAUTHENTICATED STATE ---
  if (!isConnected) {
    return (
      <div className="min-h-screen py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center card p-12 max-w-2xl mx-auto">
            <Briefcase className="h-16 w-16 text-adytum-amethyst-400 mx-auto mb-4 animate-pulse" />
            <h1 className="font-display text-2xl font-bold text-white mb-2">
              Access Your Adytum Vault
            </h1>
            <p className="text-adytum-smoke mb-6">
              Connect your wallet to manage your listed inventions, track your
              active bids, and view your execution history.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ================= HEADER & MASTER TOGGLE ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              The Vault
            </h1>
            <p className="text-adytum-smoke">
              Your central hub for IP monetization and TEE executions.
            </p>
          </div>

          {/* Master View Toggle */}
          <div className="flex p-1 bg-adytum-void-200 rounded-xl border border-adytum-void-100">
            <button
              onClick={() => setMainView("creator")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mainView === "creator"
                  ? "bg-adytum-amethyst-500 text-white shadow-lg"
                  : "text-adytum-smoke hover:text-white"
              }`}
            >
              <Package className="h-4 w-4" />
              Creator Studio
            </button>
            <button
              onClick={() => setMainView("buyer")}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mainView === "buyer"
                  ? "bg-adytum-vault text-white shadow-lg"
                  : "text-adytum-smoke hover:text-white"
              }`}
            >
              <Zap className="h-4 w-4" />
              Buyer Hub
            </button>
          </div>
        </div>

        {/* ================= CREATOR STUDIO VIEW ================= */}
        {mainView === "creator" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Creator Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1">Total Listings</p>
                <p className="text-2xl font-semibold text-white">
                  {creatorStats.total}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Zap className="h-3 w-3" /> Pay-Per-Use
                </p>
                <p className="text-2xl font-semibold text-adytum-vault-light">
                  {creatorStats.payPerUse}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Gavel className="h-3 w-3" /> Nash Bargaining
                </p>
                <p className="text-2xl font-semibold text-adytum-seal-light">
                  {creatorStats.nash}
                </p>
                {creatorStats.activeNash > 0 && (
                  <p className="text-xs text-adytum-seal-light mt-1">
                    {creatorStats.activeNash} active
                  </p>
                )}
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Revenue
                </p>
                <p className="text-2xl font-semibold text-green-400">
                  {formatUSDC(creatorStats.totalRevenue)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Total Executions
                </p>
                <p className="text-2xl font-semibold text-white">
                  {creatorStats.totalExecutions.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Creator Tabs & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex gap-2">
                {(["all", "pay-per-use", "nash"] as CreatorTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCreatorTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      creatorTab === tab
                        ? "bg-adytum-void-200 text-white border border-adytum-amethyst-500/50"
                        : "bg-adytum-void-100 text-adytum-smoke hover:text-white border border-transparent"
                    }`}
                  >
                    {tab === "all" && <Package className="h-4 w-4" />}
                    {tab === "pay-per-use" && <Zap className="h-4 w-4" />}
                    {tab === "nash" && <Gavel className="h-4 w-4" />}
                    <span className="hidden sm:inline">
                      {tab === "all"
                        ? "All"
                        : tab === "pay-per-use"
                          ? "Pay-Per-Use"
                          : "Nash Bargaining"}
                    </span>
                  </button>
                ))}
              </div>
              <Link
                href="/list"
                className="btn-primary flex items-center justify-center gap-2"
              >
                <Plus className="h-4 w-4" />
                List New Invention
              </Link>
            </div>

            {/* Creator List */}
            {filteredInventions.length === 0 ? (
              <div className="text-center py-16 card">
                <Package className="h-12 w-12 text-adytum-smoke mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-white mb-2">
                  No Inventions Yet
                </h3>
                <p className="text-adytum-smoke mb-6">
                  List your first algorithm, ML model, or trade secret.
                </p>
                <Link
                  href="/list"
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" /> List Invention
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredInventions.map((invention) => (
                  <InventionRow key={invention.id} invention={invention} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= BUYER HUB VIEW ================= */}
        {mainView === "buyer" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Buyer Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </p>
                <p className="text-2xl font-semibold text-green-400">
                  {buyerStats.completedExecutions}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3" /> Pending
                </p>
                <p className="text-2xl font-semibold text-yellow-400">
                  {buyerStats.pendingExecutions}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Total Spent
                </p>
                <p className="text-2xl font-semibold text-white">
                  {formatUSDC(buyerStats.totalSpent)}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Gavel className="h-3 w-3" /> Active Bids
                </p>
                <p className="text-2xl font-semibold text-adytum-seal-light">
                  {buyerStats.activeBids}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Won
                </p>
                <p className="text-2xl font-semibold text-green-400">
                  {buyerStats.wonBids}
                </p>
              </div>
              <div className="card p-4">
                <p className="text-xs text-adytum-smoke mb-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Deposits Locked
                </p>
                <p className="text-2xl font-semibold text-yellow-400">
                  {formatUSDC(buyerStats.totalDeposits)}
                </p>
              </div>
            </div>

            {/* Buyer Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setBuyerTab("executions")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  buyerTab === "executions"
                    ? "bg-adytum-void-200 text-white border border-adytum-vault/50"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white border border-transparent"
                }`}
              >
                <Zap className="h-4 w-4 text-adytum-vault" />
                Executions
                <span className="px-1.5 py-0.5 rounded bg-black/20 text-xs">
                  {MOCK_EXECUTIONS.length}
                </span>
              </button>
              <button
                onClick={() => setBuyerTab("nash-bids")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                  buyerTab === "nash-bids"
                    ? "bg-adytum-void-200 text-white border border-adytum-seal/50"
                    : "bg-adytum-void-100 text-adytum-smoke hover:text-white border border-transparent"
                }`}
              >
                <Gavel className="h-4 w-4 text-adytum-seal" />
                Nash Bids
                <span className="px-1.5 py-0.5 rounded bg-black/20 text-xs">
                  {MOCK_NASH_BIDS.length}
                </span>
              </button>
            </div>

            {/* Buyer Lists */}
            {buyerTab === "executions" && (
              <ExecutionsTab executions={MOCK_EXECUTIONS} />
            )}
            {buyerTab === "nash-bids" && <NashBidsTab bids={MOCK_NASH_BIDS} />}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS (CREATOR STUDIO)
// ============================================

function InventionRow({ invention }: { invention: FullInvention }) {
  const { timeOffset } = useBlockTimeOffset();

  return (
    <div className="card p-4 hover:border-adytum-amethyst-500/30 transition-colors">
      <div className="flex items-center gap-4">
        <div className="text-3xl">{CategoryIcons[invention.category]}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/invention/${invention.id}`}
              className="font-display font-semibold text-white hover:text-adytum-amethyst-300 transition-colors truncate"
            >
              {invention.metadata.title}
            </Link>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isPayPerUse(invention)
                  ? "bg-adytum-vault/20 text-adytum-vault-light"
                  : "bg-adytum-seal/20 text-adytum-seal-light"
              }`}
            >
              {isPayPerUse(invention) ? "Pay-Per-Use" : "Nash"}
            </span>
            {!invention.isActive && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-adytum-smoke truncate">
            {invention.metadata.shortDescription}
          </p>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {isPayPerUse(invention) && (
            <>
              <div className="text-right">
                <p className="text-xs text-adytum-smoke">Price</p>
                <p className="text-sm font-medium text-white">
                  {formatUSDC(invention.config.pricePerCall)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-adytum-smoke">Executions</p>
                <p className="text-sm font-medium text-white">
                  {invention.config.totalExecutions.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-adytum-smoke">Revenue</p>
                <p className="text-sm font-medium text-green-400">
                  {formatUSDC(invention.config.totalRevenue)}
                </p>
              </div>
            </>
          )}
          {isNash(invention) && (
            <>
              <div className="text-right">
                <p className="text-xs text-adytum-smoke">Phase</p>
                <NashPhaseIndicator phase={invention.config.phase} />
              </div>
              <div className="text-right">
                <p className="text-xs text-adytum-smoke">
                  {invention.config.phase === NashPhase.Open
                    ? "Bid Deadline"
                    : "Reveal Deadline"}
                </p>
                <p className="text-sm font-medium text-white">
                  {formatTimeRemaining(
                    invention.config.phase === NashPhase.Open
                      ? invention.config.bidDeadline
                      : invention.config.revealDeadline,
                    timeOffset,
                  )}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/invention/${invention.id}`}
            className="btn-ghost p-2"
            title="View Details"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function NashPhaseIndicator({ phase }: { phase: NashPhase }) {
  const config = {
    [NashPhase.Open]: {
      icon: Clock,
      color: "text-blue-400",
      bg: "bg-blue-500/20",
    },
    [NashPhase.Reveal]: {
      icon: AlertCircle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
    },
    [NashPhase.Settled]: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/20",
    },
    [NashPhase.Failed]: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/20",
    },
    [NashPhase.Expired]: {
      icon: XCircle,
      color: "text-gray-400",
      bg: "bg-gray-500/20",
    },
  };

  const { icon: Icon, color, bg } = config[phase];
  return (
    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded ${bg}`}>
      <Icon className={`h-3.5 w-3.5 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>
        {NashPhaseLabels[phase]}
      </span>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS (BUYER HUB)
// ============================================

function ExecutionsTab({
  executions,
}: {
  executions: (Execution & {
    inventionTitle: string;
    inventionCategory: number;
  })[];
}) {
  if (executions.length === 0) {
    return (
      <div className="text-center py-16 card">
        <Zap className="h-12 w-12 text-adytum-smoke mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          No Executions Yet
        </h3>
        <p className="text-adytum-smoke mb-6">
          Execute an invention to see your history here.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Browse Inventions
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {executions.map((execution, index) => (
        <ExecutionRow key={`${execution.id}-${index}`} execution={execution} />
      ))}
    </div>
  );
}

function ExecutionRow({
  execution,
}: {
  execution: Execution & { inventionTitle: string; inventionCategory: number };
}) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig = {
    pending: {
      icon: Loader2,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      label: "Pending",
      animate: true,
    },
    success: {
      icon: CheckCircle2,
      color: "text-green-400",
      bg: "bg-green-500/20",
      label: "Completed",
      animate: false,
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/20",
      label: "Failed",
      animate: false,
    },
  };

  const status = !execution.completed
    ? "pending"
    : execution.success
      ? "success"
      : "failed";
  const { icon: Icon, color, bg, label, animate } = statusConfig[status];
  const timestamp = new Date(Number(execution.requestedAt) * 1000);

  return (
    <div className="card overflow-hidden">
      <div
        className="p-4 cursor-pointer hover:bg-adytum-void-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="text-2xl">
            {CategoryIcons[execution.inventionCategory as InventionCategory]}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/invention/${execution.inventionId}`}
                className="font-medium text-white hover:text-adytum-amethyst-300 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {execution.inventionTitle}
              </Link>
            </div>
            <p className="text-xs text-adytum-smoke">
              {timestamp.toLocaleDateString()} at{" "}
              {timestamp.toLocaleTimeString()}
            </p>
          </div>

          <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${bg}`}>
            <Icon
              className={`h-4 w-4 ${color} ${animate ? "animate-spin" : ""}`}
            />
            <span className={`text-sm font-medium ${color}`}>{label}</span>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">
              {formatUSDC(execution.priceCharged)}
            </p>
          </div>

          <ChevronDown
            className={`h-5 w-5 text-adytum-smoke transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-adytum-void-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs text-adytum-smoke mb-1">Execution ID</p>
              <p className="text-sm font-mono text-white truncate">
                {execution.id}
              </p>
            </div>
            <div>
              <p className="text-xs text-adytum-smoke mb-1">Input Hash</p>
              <p className="text-sm font-mono text-white truncate">
                {execution.inputHash}
              </p>
            </div>
            {execution.completed && execution.success && (
              <>
                <div>
                  <p className="text-xs text-adytum-smoke mb-1">Result Hash</p>
                  <p className="text-sm font-mono text-white truncate">
                    {execution.resultHash}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-adytum-smoke mb-1">
                    Execution Time
                  </p>
                  <p className="text-sm text-white">
                    {Number(execution.executionTimeMs)}ms
                  </p>
                </div>
              </>
            )}
          </div>
          {execution.completed && execution.success && (
            <div className="mt-4 flex gap-2">
              <button className="btn-secondary text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" /> View Result
              </button>
              <button className="btn-ghost text-sm flex items-center gap-2">
                <ExternalLink className="h-4 w-4" /> Verify Attestation
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NashBidsTab({ bids }: { bids: NashBidWithDetails[] }) {
  if (bids.length === 0) {
    return (
      <div className="text-center py-16 card">
        <Gavel className="h-12 w-12 text-adytum-smoke mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          No Bids Yet
        </h3>
        <p className="text-adytum-smoke mb-6">
          Submit a bid on a Nash Bargaining listing to start negotiating.
        </p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          Browse Inventions
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {bids.map((bid) => (
        <NashBidRow key={bid.inventionId} bid={bid} />
      ))}
    </div>
  );
}

function NashBidRow({ bid }: { bid: NashBidWithDetails }) {
  const [showAmount, setShowAmount] = useState(false);
  const { timeOffset } = useBlockTimeOffset();

  const phaseConfig = {
    [NashPhase.Open]: { color: "text-blue-400", bg: "bg-blue-500/20" },
    [NashPhase.Reveal]: { color: "text-yellow-400", bg: "bg-yellow-500/20" },
    [NashPhase.Settled]: { color: "text-green-400", bg: "bg-green-500/20" },
    [NashPhase.Failed]: { color: "text-red-400", bg: "bg-red-500/20" },
    [NashPhase.Expired]: { color: "text-gray-400", bg: "bg-gray-500/20" },
  };

  const { color, bg } = phaseConfig[bid.phase];
  const needsAction =
    (bid.phase === NashPhase.Reveal && !bid.revealed) ||
    (bid.phase === NashPhase.Settled && bid.isWinner);

  return (
    <div className={`card p-4 ${needsAction ? "border-yellow-500/50" : ""}`}>
      <div className="flex items-center gap-4">
        <div className="text-2xl">
          {CategoryIcons[bid.inventionCategory as InventionCategory]}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/invention/${bid.inventionId}`}
              className="font-medium text-white hover:text-adytum-amethyst-300 transition-colors"
            >
              {bid.inventionTitle}
            </Link>
            {bid.isWinner && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                Winner!
              </span>
            )}
            {needsAction && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-adytum-smoke">
            <span
              className={`flex items-center gap-1 px-2 py-0.5 rounded ${bg}`}
            >
              <span className={color}>{NashPhaseLabels[bid.phase]}</span>
            </span>
            {(bid.phase === NashPhase.Open ||
              bid.phase === NashPhase.Reveal) && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeRemaining(
                  bid.phase === NashPhase.Open
                    ? bid.bidDeadline
                    : bid.revealDeadline,
                  timeOffset,
                )}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-adytum-smoke mb-1">Your Max Bid</p>
          <div className="flex items-center gap-2">
            {showAmount ? (
              <p className="text-sm font-medium text-white">
                {formatUSDC(bid.maxWillingToPay)}
              </p>
            ) : (
              <p className="text-sm font-medium text-adytum-smoke">••••••</p>
            )}
            <button
              onClick={() => setShowAmount(!showAmount)}
              className="text-adytum-smoke hover:text-white"
            >
              {showAmount ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="text-right hidden md:block">
          <p className="text-xs text-adytum-smoke mb-1">Deposit</p>
          <p className="text-sm font-medium text-yellow-400">
            {formatUSDC(bid.depositAmount)}
          </p>
        </div>

        {bid.phase === NashPhase.Settled && bid.finalPrice && (
          <div className="text-right hidden md:block">
            <p className="text-xs text-adytum-smoke mb-1">Final Price</p>
            <p className="text-sm font-medium text-green-400">
              {formatUSDC(bid.finalPrice)}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2">
          {bid.phase === NashPhase.Reveal && !bid.revealed && (
            <button className="btn-primary text-sm">Reveal Bid</button>
          )}
          {bid.phase === NashPhase.Settled && bid.isWinner && (
            <button className="btn-primary text-sm">Claim Key</button>
          )}
          <Link
            href={`/invention/${bid.inventionId}`}
            className="btn-ghost p-2"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
