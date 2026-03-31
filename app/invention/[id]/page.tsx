"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount, useReadContract } from "wagmi";
import Link from "next/link";
import {
  ArrowLeft,
  Shield,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Lock,
  Gavel,
  Play,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { getMockInvention } from "@/lib/mockData";
import { CONTRACTS, formatUSDC } from "@/config/wagmi";
import { ADYTUM_ABI } from "@/config/abi";
import {
  CategoryLabels,
  CategoryIcons,
  MonetizationModel,
  ModelLabels,
  NashPhase,
  NashBid,
  calculateTieredPrice,
  getPriceTierLabel,
  isPayPerUse,
  isNash,
} from "@/types";
import { ExecuteModal } from "@/components/marketplace/ExecuteModal";
import { NashBidModal } from "@/components/marketplace/NashBidModal";
import { LiveTimeRemaining } from "@/components/ui/LiveTimeRemaining";
import { useBlockTimeOffset } from "@/hooks/useBlockTimeOffset";

export default function InventionDetailPage() {
  const params = useParams();
  const { isConnected } = useAccount();
  const { timeOffset } = useBlockTimeOffset();
  const [copied, setCopied] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [showNashModal, setShowNashModal] = useState(false);

  const inventionId = params.id as string;
  const invention = getMockInvention(inventionId);

  if (!invention) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold text-white mb-4">
            Invention not found
          </h2>
          <Link href="/" className="btn-primary">
            Back to Browse
          </Link>
        </div>
      </div>
    );
  }

  const { metadata, category } = invention;
  const categoryLabel = CategoryLabels[category];
  const categoryIcon = CategoryIcons[category];

  const copyAddress = () => {
    navigator.clipboard.writeText(invention.seller);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shortAddress = `${invention.seller.slice(0, 6)}...${invention.seller.slice(-4)}`;

  return (
    <>
      <div className="min-h-screen pb-20">
        {/* Back button */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-adytum-smoke hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Browse
          </Link>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="badge">
                    {categoryIcon} {categoryLabel}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                      invention.model === MonetizationModel.PayPerUse
                        ? "bg-adytum-vault/20 text-adytum-vault-light"
                        : "bg-adytum-seal/20 text-adytum-seal-light"
                    }`}
                  >
                    {invention.model === MonetizationModel.PayPerUse ? (
                      <Zap className="h-3 w-3" />
                    ) : (
                      <Gavel className="h-3 w-3" />
                    )}
                    {ModelLabels[invention.model]}
                  </span>
                  <span className="badge badge-vault">
                    <Shield className="h-3 w-3 mr-1" />
                    TEE Protected
                  </span>
                </div>

                <h1 className="font-display text-3xl font-bold text-white mb-4">
                  {metadata.title}
                </h1>

                <p className="text-adytum-smoke leading-relaxed">
                  {metadata.description}
                </p>

                {/* Seller info */}
                <div className="mt-6 pt-6 border-t border-adytum-amethyst-500/10 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-adytum-smoke mb-1">Listed by</p>
                    <button
                      onClick={copyAddress}
                      className="flex items-center gap-2 text-sm text-adytum-amethyst-300 hover:text-adytum-amethyst-200 transition-colors"
                    >
                      <code className="font-mono">{shortAddress}</code>
                      {copied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                  <a
                    href={`https://sepolia.basescan.org/address/${invention.seller}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-adytum-smoke hover:text-white flex items-center gap-1"
                  >
                    View on BaseScan
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              {/* Benchmarks */}
              {metadata.benchmarks && metadata.benchmarks.length > 0 && (
                <div className="card p-6">
                  <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-adytum-seal" />
                    Benchmarks
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {metadata.benchmarks.map((benchmark, index) => (
                      <div
                        key={index}
                        className="bg-adytum-void-100 rounded-lg p-4 text-center"
                      >
                        <p className="text-2xl font-bold text-white">
                          {benchmark.value}
                          <span className="text-sm font-normal text-adytum-smoke ml-1">
                            {benchmark.unit}
                          </span>
                        </p>
                        <p className="text-sm text-adytum-smoke mt-1">
                          {benchmark.metric}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {metadata.tags && metadata.tags.length > 0 && (
                <div className="card p-6">
                  <h2 className="font-display text-xl font-semibold text-white mb-4">
                    Tags
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {metadata.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-adytum-void-100 text-adytum-smoke-light rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* How it works - model-specific */}
              <div className="card p-6">
                <h2 className="font-display text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-adytum-amethyst-400" />
                  How Adytum Protects This Invention
                </h2>

                {isPayPerUse(invention) ? (
                  <PayPerUseExplainer />
                ) : (
                  <NashExplainer />
                )}
              </div>
            </div>

            {/* Sidebar - Action Card */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                {isPayPerUse(invention) ? (
                  <PayPerUseSidebar
                    invention={invention}
                    isConnected={isConnected}
                    onExecute={() => setShowExecuteModal(true)}
                  />
                ) : (
                  <NashSidebar
                    invention={invention}
                    isConnected={isConnected}
                    timeOffset={timeOffset}
                    onBid={() => setShowNashModal(true)}
                    onExecuteTrial={() => setShowExecuteModal(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showExecuteModal &&
        (isPayPerUse(invention) ||
          (isNash(invention) && invention.config.allowTrialsDuring)) && (
          <ExecuteModal
            invention={invention}
            isOpen={showExecuteModal}
            onClose={() => setShowExecuteModal(false)}
          />
        )}
      {showNashModal && isNash(invention) && (
        <NashBidModal
          invention={invention}
          isOpen={showNashModal}
          onClose={() => setShowNashModal(false)}
        />
      )}
    </>
  );
}

// ============================================
// EXPLAINER COMPONENTS
// ============================================

function PayPerUseExplainer() {
  return (
    <div className="space-y-4 text-sm text-adytum-smoke">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-amethyst-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-amethyst-300">1</span>
        </div>
        <p>
          <strong className="text-white">Pay per execution</strong> — Each time
          you run the invention, you pay the execution fee. No upfront purchase
          required.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-amethyst-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-amethyst-300">2</span>
        </div>
        <p>
          <strong className="text-white">TEE execution</strong> — Your input is
          processed inside a Trusted Execution Environment. You receive the
          output but never see the underlying code.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-amethyst-500/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-amethyst-300">3</span>
        </div>
        <p>
          <strong className="text-white">Anti-extraction protection</strong> —
          Rate limits and tiered pricing prevent systematic extraction of the
          invention&apos;s logic through repeated queries.
        </p>
      </div>
    </div>
  );
}

function NashExplainer() {
  return (
    <div className="space-y-4 text-sm text-adytum-smoke">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-seal/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-seal-light">1</span>
        </div>
        <p>
          <strong className="text-white">Sealed-bid negotiation</strong> —
          Submit your maximum price in a cryptographically sealed bid. No one
          can see your bid until the reveal phase.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-seal/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-seal-light">2</span>
        </div>
        <p>
          <strong className="text-white">Nash bargaining solution</strong> — If
          your max price ≥ seller&apos;s minimum, the final price is the
          midpoint. Fair for both parties.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-adytum-seal/20 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-xs font-bold text-adytum-seal-light">3</span>
        </div>
        <p>
          <strong className="text-white">Full ownership transfer</strong> — The
          winner receives the decryption key and gains complete ownership of the
          invention code.
        </p>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR COMPONENTS
// ============================================

function PayPerUseSidebar({
  invention,
  isConnected,
  onExecute,
}: {
  invention: ReturnType<typeof getMockInvention> & {
    model: MonetizationModel.PayPerUse;
  };
  isConnected: boolean;
  onExecute: () => void;
}) {
  const { config } = invention;
  // In production, this would come from the contract
  const userTotalCalls = BigInt(0);
  const currentPrice = calculateTieredPrice(config, userTotalCalls);
  const priceTier = getPriceTierLabel(userTotalCalls, config);

  return (
    <div className="card card-elevated p-6 glow-amethyst">
      {/* Stats */}
      <div className="flex items-center justify-between mb-6 pb-6 border-b border-adytum-amethyst-500/10">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1 text-adytum-smoke">
            <Play className="h-4 w-4" />
            {config.totalExecutions.toString()} executions
          </span>
        </div>
        <span className="text-sm text-adytum-vault-light">
          ${formatUSDC(config.totalRevenue)} earned
        </span>
      </div>

      {/* Pricing */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-adytum-smoke">Price per execution</span>
          <span className="text-xs text-adytum-smoke">{priceTier}</span>
        </div>
        <p className="text-3xl font-bold text-adytum-vault-light mb-1">
          {formatUSDC(currentPrice)}
        </p>
        <p className="text-xs text-adytum-smoke">
          Base: {formatUSDC(config.pricePerCall)} • Tiered pricing applies at
          higher usage
        </p>
      </div>

      {/* Rate limits */}
      <div className="mb-6 p-3 bg-adytum-void-100 rounded-lg">
        <p className="text-xs text-adytum-smoke mb-2">Rate Limits</p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-adytum-smoke">Daily:</span>{" "}
            <span className="text-white">
              {config.maxCallsPerDay.toString()}
            </span>
          </div>
          <div>
            <span className="text-adytum-smoke">Monthly:</span>{" "}
            <span className="text-white">
              {config.maxCallsPerMonth.toString()}
            </span>
          </div>
        </div>
      </div>

      {/* Execute button */}
      <button
        onClick={onExecute}
        disabled={!isConnected}
        className="w-full btn-primary"
      >
        <Zap className="h-4 w-4 mr-2" />
        {isConnected ? "Execute" : "Connect Wallet"}
      </button>

      {/* Trust indicators */}
      <div className="mt-6 pt-6 border-t border-adytum-amethyst-500/10">
        <div className="flex items-center gap-2 text-xs text-adytum-smoke">
          <Shield className="h-4 w-4 text-adytum-vault" />
          <span>TEE Protected • Anti-extraction • Rate limited</span>
        </div>
      </div>
    </div>
  );
}

function NashSidebar({
  invention,
  isConnected,
  timeOffset,
  onBid,
  onExecuteTrial,
}: {
  invention: ReturnType<typeof getMockInvention> & {
    model: MonetizationModel.NashNegotiation;
  };
  isConnected: boolean;
  timeOffset: bigint;
  onBid: () => void;
  onExecuteTrial: () => void;
}) {
  const { config } = invention;
  const { address } = useAccount();

  // Actively fetch if the user has submitted a bid to enable the trial button
  const { data: nashBid } = useReadContract({
    address: CONTRACTS.ADYTUM_MARKETPLACE,
    abi: ADYTUM_ABI,
    functionName: "getNashBid",
    args: isConnected && address ? [invention.id, address] : undefined,
    query: { enabled: !!isConnected && !!address },
  });

  const hasBid = (nashBid as NashBid | undefined)?.submitted ?? false;
  const trialCount = (nashBid as NashBid | undefined)?.trialCount ?? BigInt(0);

  const getPhaseInfo = () => {
    switch (config.phase) {
      case NashPhase.Open:
        return {
          label: "Accepting Bids",
          color: "bg-green-500/20 text-green-400",
          deadlineTs: config.bidDeadline,
          deadlineLabel: "Bid deadline",
        };
      case NashPhase.Reveal:
        return {
          label: "Reveal Phase",
          color: "bg-amber-500/20 text-amber-400",
          deadlineTs: config.revealDeadline,
          deadlineLabel: "Reveal deadline",
        };
      case NashPhase.Settled:
        return {
          label: "Settled",
          color: "bg-adytum-vault/20 text-adytum-vault-light",
          deadlineTs: null,
          deadlineLabel: null,
        };
      case NashPhase.Failed:
        return {
          label: "No Deal",
          color: "bg-red-500/20 text-red-400",
          deadlineTs: null,
          deadlineLabel: null,
        };
      default:
        return {
          label: "Expired",
          color: "bg-gray-500/20 text-gray-400",
          deadlineTs: null,
          deadlineLabel: null,
        };
    }
  };

  const phaseInfo = getPhaseInfo();

  return (
    <div className="card card-elevated p-6 glow-amethyst">
      {/* Phase indicator */}
      <div className="mb-6 pb-6 border-b border-adytum-amethyst-500/10">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-sm font-medium rounded-full ${phaseInfo.color}`}
          >
            {phaseInfo.label}
          </span>
          {phaseInfo.deadlineTs != null && (
            <div className="flex items-center gap-1 text-sm text-adytum-smoke">
              <Clock className="h-4 w-4" />
              <LiveTimeRemaining
                deadline={phaseInfo.deadlineTs}
                timeOffset={timeOffset}
              />
            </div>
          )}
        </div>
        {phaseInfo.deadlineLabel && (
          <p className="text-xs text-adytum-smoke">{phaseInfo.deadlineLabel}</p>
        )}
      </div>

      {/* Nash info */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-adytum-smoke">Model</span>
          <span className="text-sm text-white flex items-center gap-1">
            <Gavel className="h-3.5 w-3.5" />
            Nash Bargaining
          </span>
        </div>

        {config.allowTrialsDuring && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-adytum-smoke">Trial fee</span>
            <span className="text-sm text-adytum-seal-light">
              {formatUSDC(config.trialFee)} USDC
            </span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-sm text-adytum-smoke">Max trials</span>
          <span className="text-sm text-white">
            {config.maxTrialsPerBidder.toString()} per bidder
          </span>
        </div>
      </div>

      {/* Trials allowed notice */}
      {config.allowTrialsDuring && (
        <div className="mb-6 p-3 bg-adytum-seal/10 rounded-lg border border-adytum-seal/20">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-adytum-seal shrink-0 mt-0.5" />
            <p className="text-xs text-adytum-seal-light">
              Trials are allowed during negotiation. Test the invention before
              committing to a bid.
            </p>
          </div>
        </div>
      )}

      {/* Primary Action Button (Bid / Reveal) */}
      {(config.phase === NashPhase.Open ||
        config.phase === NashPhase.Reveal) && (
        <button
          onClick={onBid}
          disabled={!isConnected}
          className="w-full btn-primary"
        >
          <Gavel className="h-4 w-4 mr-2" />
          {!isConnected
            ? "Connect Wallet"
            : config.phase === NashPhase.Open
              ? "Submit Bid"
              : "Reveal Bid"}
        </button>
      )}

      {/* Secondary Action Button (Trial) */}
      {config.allowTrialsDuring &&
        (config.phase === NashPhase.Open ||
          config.phase === NashPhase.Reveal) && (
          <button
            onClick={onExecuteTrial}
            disabled={
              !isConnected || !hasBid || trialCount >= config.maxTrialsPerBidder
            }
            className="w-full btn-secondary mt-3 disabled:opacity-50"
            title={!hasBid ? "Submit a sealed bid first to unlock trials" : ""}
          >
            <Play className="h-4 w-4 mr-2" />
            {!hasBid
              ? "Submit Bid to Unlock Trials"
              : trialCount >= config.maxTrialsPerBidder
                ? "Max Trials Reached"
                : `Run Trial (${formatUSDC(config.trialFee)} USDC)`}
          </button>
        )}

      {config.phase === NashPhase.Settled && (
        <div className="p-4 bg-adytum-vault/10 rounded-lg text-center">
          <p className="text-sm text-adytum-vault-light">
            This negotiation has concluded
          </p>
        </div>
      )}

      {config.phase === NashPhase.Failed && (
        <div className="p-4 bg-red-500/10 rounded-lg text-center">
          <p className="text-sm text-red-400">
            No qualifying bids — negotiation failed
          </p>
        </div>
      )}

      {/* Trust indicators */}
      <div className="mt-6 pt-6 border-t border-adytum-amethyst-500/10">
        <div className="flex items-center gap-2 text-xs text-adytum-smoke">
          <Shield className="h-4 w-4 text-adytum-vault" />
          <span>Sealed bids • Fair pricing • Atomic transfer</span>
        </div>
      </div>
    </div>
  );
}
