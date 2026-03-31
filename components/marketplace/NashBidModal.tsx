"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Gavel,
  Lock,
  Eye,
  Key,
} from "lucide-react";
import { NashInvention, NashPhase, NashBid } from "@/types";
import { LiveTimeRemaining } from "@/components/ui/LiveTimeRemaining";
import { useBlockTimeOffset } from "@/hooks/useBlockTimeOffset";
import { CONTRACTS, parseUSDC } from "@/config/wagmi";
import { ADYTUM_ABI } from "@/config/abi";
import { generateNashBidHash, generateSalt, waitForKeyRelease } from "@/lib/api";

interface NashBidModalProps {
  invention: NashInvention;
  isOpen: boolean;
  onClose: () => void;
  existingBid?: NashBid;
  isWinner?: boolean;
}

type Step =
  | "bid"
  | "submitting"
  | "bid_success"
  | "reveal"
  | "revealing"
  | "reveal_success"
  | "claim_key"
  | "claiming"
  | "key_released"
  | "error";

export function NashBidModal({
  invention,
  isOpen,
  onClose,
  existingBid,
  isWinner,
}: NashBidModalProps) {
  const { address } = useAccount();
  const { config } = invention;
  const { timeOffset } = useBlockTimeOffset();

  const [step, setStep] = useState<Step>(
    isWinner
      ? "claim_key"
      : existingBid?.submitted &&
          !existingBid.revealed &&
          config.phase === NashPhase.Reveal
        ? "reveal"
        : existingBid?.submitted
          ? "bid_success"
          : "bid",
  );

  const [bidAmount, setBidAmount] = useState("");
  const [salt, setSalt] = useState<`0x${string}` | null>(null);
  const [decryptionKey, setDecryptionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Contract writes
  const { writeContract: submitBid, data: submitTxHash } = useWriteContract();
  const { writeContract: revealBid, data: revealTxHash } = useWriteContract();

  const { isSuccess: submitConfirmed } = useWaitForTransactionReceipt({
    hash: submitTxHash,
  });

  const { isSuccess: revealConfirmed } = useWaitForTransactionReceipt({
    hash: revealTxHash,
  });

  // Handle submit confirmation - FIXED DEPENDENCIES
  useEffect(() => {
    if (submitConfirmed && step === "submitting") {
      // Store salt in localStorage for reveal phase
      if (salt) {
        localStorage.setItem(`nash_salt_${invention.id}_${address}`, salt);
        localStorage.setItem(
          `nash_amount_${invention.id}_${address}`,
          bidAmount,
        );
      }
      setStep("bid_success");
    }
  }, [submitConfirmed, step, salt, bidAmount, invention.id, address]);

  // Handle reveal confirmation - FIXED DEPENDENCIES
  useEffect(() => {
    if (revealConfirmed && step === "revealing") {
      setStep("reveal_success");
    }
  }, [revealConfirmed, step]);

  const handleSubmitBid = async () => {
    try {
      setStep("submitting");
      setError(null);

      const amount = parseUSDC(bidAmount);
      const newSalt = generateSalt();
      const bidHash = generateNashBidHash(amount, newSalt);

      setSalt(newSalt);

      submitBid({
        address: CONTRACTS.ADYTUM_MARKETPLACE,
        abi: ADYTUM_ABI,
        functionName: "submitNashBid",
        args: [invention.id, bidHash],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit bid");
      setStep("error");
    }
  };

  const handleRevealBid = async () => {
    try {
      setStep("revealing");
      setError(null);

      // Retrieve stored values
      const storedSalt = localStorage.getItem(
        `nash_salt_${invention.id}_${address}`,
      ) as `0x${string}`;
      const storedAmount = localStorage.getItem(
        `nash_amount_${invention.id}_${address}`,
      );

      if (!storedSalt || !storedAmount) {
        throw new Error(
          "Bid data not found. Did you submit from a different browser?",
        );
      }

      const amount = parseUSDC(storedAmount);

      revealBid({
        address: CONTRACTS.ADYTUM_MARKETPLACE,
        abi: ADYTUM_ABI,
        functionName: "revealNashBid",
        args: [invention.id, amount, storedSalt],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal bid");
      setStep("error");
    }
  };

  const handleClaimKey = async () => {
    try {
      setStep("claiming");
      setError(null);

      const result = await waitForKeyRelease(invention.id, address!);
      setDecryptionKey(result.decryption_key);
      setStep("key_released");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim key");
      setStep("error");
    }
  };

  const handleClose = () => {
    // Don't reset if user has submitted a bid
    if (
      step !== "bid_success" &&
      step !== "reveal" &&
      step !== "reveal_success"
    ) {
      setStep("bid");
      setBidAmount("");
      setSalt(null);
      setError(null);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-adytum-obsidian border border-adytum-void-100 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-adytum-void-100">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-adytum-seal" />
            <h2 className="font-display text-lg font-semibold text-white">
              Nash Bargaining
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-adytum-smoke hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === "bid" && (
            <BidStep
              invention={invention}
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              timeOffset={timeOffset}
              onSubmit={handleSubmitBid}
            />
          )}

          {step === "submitting" && (
            <LoadingStep
              title="Submitting Sealed Bid"
              description="Confirm the transaction in your wallet. Your bid amount is encrypted."
            />
          )}

          {step === "bid_success" && (
            <BidSuccessStep
              invention={invention}
              timeOffset={timeOffset}
              onClose={handleClose}
            />
          )}

          {step === "reveal" && (
            <RevealStep
              invention={invention}
              timeOffset={timeOffset}
              onReveal={handleRevealBid}
            />
          )}

          {step === "revealing" && (
            <LoadingStep
              title="Revealing Bid"
              description="Confirm the reveal transaction in your wallet..."
            />
          )}

          {step === "reveal_success" && (
            <RevealSuccessStep onClose={handleClose} />
          )}

          {step === "claim_key" && <ClaimKeyStep onClaim={handleClaimKey} />}

          {step === "claiming" && (
            <LoadingStep
              title="Claiming Decryption Key"
              description="Requesting key release from the TEE..."
            />
          )}

          {step === "key_released" && decryptionKey && (
            <KeyReleasedStep
              decryptionKey={decryptionKey}
              onClose={handleClose}
            />
          )}

          {step === "error" && (
            <ErrorStep
              error={error}
              onRetry={() => setStep(existingBid?.submitted ? "reveal" : "bid")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function BidStep({
  invention,
  bidAmount,
  setBidAmount,
  timeOffset,
  onSubmit,
}: {
  invention: NashInvention;
  bidAmount: string;
  setBidAmount: (v: string) => void;
  timeOffset: bigint;
  onSubmit: () => void;
}) {
  const { config } = invention;

  return (
    <div className="space-y-4">
      {/* Deadline info */}
      <div className="p-3 bg-adytum-seal/10 rounded-lg border border-adytum-seal/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-adytum-smoke">Bid deadline</span>
          <LiveTimeRemaining
            deadline={config.bidDeadline}
            timeOffset={timeOffset}
            className="text-adytum-seal-light"
          />
        </div>
      </div>

      {/* How it works */}
      <div className="p-3 bg-adytum-void-100 rounded-lg space-y-2">
        <h4 className="text-sm font-medium text-white">
          How Nash Bargaining Works
        </h4>
        <ol className="text-xs text-adytum-smoke space-y-1.5 list-decimal list-inside">
          <li>Submit your maximum price (sealed, no one can see it)</li>
          <li>After bid deadline, reveal your bid amount</li>
          <li>If your max ≥ seller&apos;s min, deal at the midpoint</li>
          <li>Winner receives decryption key for full ownership</li>
        </ol>
      </div>

      {/* Bid input */}
      <div>
        <label className="label">Your Maximum Price (USDC)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={bidAmount}
          onChange={(e) => setBidAmount(e.target.value)}
          placeholder="1000.00"
          className="input"
        />
        <p className="mt-1 text-xs text-adytum-smoke">
          This is the maximum you&apos;re willing to pay. If you win, the final
          price will be between your max and the seller&apos;s minimum.
        </p>
      </div>

      {/* Sealed bid notice */}
      <div className="flex items-start gap-2 p-3 bg-adytum-amethyst-500/10 rounded-lg">
        <Lock className="h-4 w-4 text-adytum-amethyst-400 shrink-0 mt-0.5" />
        <p className="text-xs text-adytum-amethyst-200">
          Your bid is cryptographically sealed. No one (including the seller)
          can see your amount until the reveal phase.
        </p>
      </div>

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={!bidAmount || parseFloat(bidAmount) <= 0}
        className="btn-primary w-full"
      >
        <Lock className="h-4 w-4 mr-2" />
        Submit Sealed Bid
      </button>
    </div>
  );
}

function BidSuccessStep({
  invention,
  timeOffset,
  onClose,
}: {
  invention: NashInvention;
  timeOffset: bigint;
  onClose: () => void;
}) {
  return (
    <div className="text-center py-6">
      <CheckCircle className="h-12 w-12 text-adytum-vault mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        Bid Submitted!
      </h3>
      <p className="text-sm text-adytum-smoke mb-4">
        Your sealed bid has been recorded on-chain.
      </p>

      <div className="p-3 bg-adytum-void-100 rounded-lg mb-6">
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-adytum-smoke">Reveal phase starts in </span>
          <LiveTimeRemaining
            deadline={invention.config.bidDeadline}
            timeOffset={timeOffset}
            className="text-adytum-seal-light"
          />
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg text-left mb-4">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200">
          <strong>Important:</strong> You must return during the reveal phase to
          reveal your bid. Unrevealed bids are disqualified.
        </p>
      </div>

      <button onClick={onClose} className="btn-secondary w-full">
        Close
      </button>
    </div>
  );
}

function RevealStep({
  invention,
  timeOffset,
  onReveal,
}: {
  invention: NashInvention;
  timeOffset: bigint;
  onReveal: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <Eye className="h-12 w-12 text-adytum-seal mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          Reveal Your Bid
        </h3>
        <p className="text-sm text-adytum-smoke">
          The reveal phase is open. Reveal your bid to be eligible for winning.
        </p>
      </div>

      {/* Deadline */}
      <div className="p-3 bg-adytum-seal/10 rounded-lg border border-adytum-seal/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-adytum-smoke">Reveal deadline</span>
          <LiveTimeRemaining
            deadline={invention.config.revealDeadline}
            timeOffset={timeOffset}
            className="text-adytum-seal-light"
          />
        </div>
      </div>

      <button onClick={onReveal} className="btn-primary w-full">
        <Eye className="h-4 w-4 mr-2" />
        Reveal Bid
      </button>
    </div>
  );
}

function RevealSuccessStep({ onClose }: { onClose: () => void }) {
  return (
    <div className="text-center py-6">
      <CheckCircle className="h-12 w-12 text-adytum-vault mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        Bid Revealed!
      </h3>
      <p className="text-sm text-adytum-smoke mb-6">
        Your bid is now visible. The settlement will happen after the reveal
        deadline when all bids are compared.
      </p>
      <button onClick={onClose} className="btn-secondary w-full">
        Close
      </button>
    </div>
  );
}

function ClaimKeyStep({ onClaim }: { onClaim: () => void }) {
  return (
    <div className="text-center py-6">
      <div className="w-16 h-16 rounded-full bg-adytum-vault/20 flex items-center justify-center mx-auto mb-4">
        <Key className="h-8 w-8 text-adytum-vault" />
      </div>
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        You Won!
      </h3>
      <p className="text-sm text-adytum-smoke mb-6">
        Congratulations! You can now claim the decryption key to access the full
        invention code.
      </p>
      <button onClick={onClaim} className="btn-primary w-full">
        <Key className="h-4 w-4 mr-2" />
        Claim Decryption Key
      </button>
    </div>
  );
}

function KeyReleasedStep({
  decryptionKey,
  onClose,
}: {
  decryptionKey: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(decryptionKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-adytum-vault mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          Key Released!
        </h3>
        <p className="text-sm text-adytum-smoke">
          Save this key securely. You&apos;ll need it to decrypt the invention
          code.
        </p>
      </div>

      <div className="p-3 bg-adytum-void-100 rounded-lg">
        <label className="label">Decryption Key</label>
        <div className="flex gap-2">
          <code className="flex-1 p-2 bg-adytum-void-200 rounded text-xs text-white font-mono break-all">
            {decryptionKey}
          </code>
          <button onClick={handleCopy} className="btn-secondary px-3">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-200">
          <strong>Save this key!</strong> It will not be shown again. You can
          download the encrypted invention from IPFS and decrypt it locally.
        </p>
      </div>

      <button onClick={onClose} className="btn-secondary w-full">
        Close
      </button>
    </div>
  );
}

function LoadingStep({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-12 w-12 text-adytum-amethyst-400 animate-spin mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-adytum-smoke">{description}</p>
    </div>
  );
}

function ErrorStep({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-8">
      <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        Something Went Wrong
      </h3>
      <p className="text-sm text-adytum-smoke mb-6">{error}</p>
      <button onClick={onRetry} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}
