"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Play,
  Zap,
  Shield,
  TrendingUp,
  Coins,
  Plus,
} from "lucide-react";
import {
  FullInvention,
  ExecutionResult,
  PayPerUseInvention,
  NashInvention,
  calculateTieredPrice,
  getPriceTierLabel,
  isNash,
} from "@/types";
import { CONTRACTS, formatUSDC } from "@/config/wagmi";
import { ADYTUM_ABI, ERC20_ABI } from "@/config/abi";
import {
  requestExecution,
  waitForExecution,
  hashInput,
  type ExecutionResult as ApiExecutionResult,
} from "@/lib/api";

function mapApiResultToDomain(api: ApiExecutionResult): ExecutionResult {
  const m = api.metrics;
  return {
    output: api.output ?? null,
    metrics: {
      executionTimeMs: m?.execution_time_ms ?? 0,
      memoryUsedMb: m?.memory_used_mb ?? 0,
    },
    attestation: api.attestation ?? "",
  };
}

interface ExecuteModalProps {
  invention: FullInvention;
  isOpen: boolean;
  onClose: () => void;
}

type Step =
  | "input"
  | "approving"
  | "buying_credits"
  | "executing"
  | "processing"
  | "result"
  | "error";

export function ExecuteModal({
  invention,
  isOpen,
  onClose,
}: ExecuteModalProps) {
  const { address } = useAccount();
  const [step, setStep] = useState<Step>("input");
  const [inputData, setInputData] = useState<string>("{}");
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsToBuy, setCreditsToBuy] = useState<number>(5);

  const isNashMode = isNash(invention);

  // Fetch user's actual usage from contract (Only for Pay-Per-Use)
  const {
    data: usageTracker,
    isLoading: usageLoading,
    refetch: refetchUsage,
  } = useReadContract({
    address: CONTRACTS.ADYTUM_MARKETPLACE,
    abi: ADYTUM_ABI,
    functionName: "getUsageTracker",
    args: address ? [invention.id, address] : undefined,
    query: {
      enabled: !!address && isOpen && !isNashMode,
    },
  });

  // Fetch user's credit balance (Only for Pay-Per-Use)
  const {
    data: creditBalance,
    isLoading: creditsLoading,
    refetch: refetchCredits,
  } = useReadContract({
    address: CONTRACTS.ADYTUM_MARKETPLACE,
    abi: ADYTUM_ABI,
    functionName: "creditBalances",
    args: address ? [invention.id, address] : undefined,
    query: {
      enabled: !!address && isOpen && !isNashMode,
    },
  });

  // Extract values
  const userTotalCalls = usageTracker?.totalCalls ?? BigInt(0);
  const isFlagged = usageTracker?.flaggedForExtraction ?? false;
  const userCredits = creditBalance ?? BigInt(0);
  const hasCredits = !isNashMode && userCredits > BigInt(0);

  // Calculate dynamic current price based on the model
  const currentPrice: bigint = isNashMode
    ? (invention as NashInvention).config.trialFee
    : calculateTieredPrice(
        (invention as PayPerUseInvention).config,
        userTotalCalls,
      );

  const priceTier = isNashMode
    ? "Nash Trial Fee"
    : getPriceTierLabel(
        userTotalCalls,
        (invention as PayPerUseInvention).config,
      );

  // Contract writes
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { writeContract: buyCredits, data: buyCreditsTxHash } =
    useWriteContract();
  const { writeContract: execute, data: executeTxHash } = useWriteContract();

  const { isSuccess: approveConfirmed } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  const { isSuccess: buyCreditsConfirmed } = useWaitForTransactionReceipt({
    hash: buyCreditsTxHash,
  });

  const { isSuccess: executeConfirmed } = useWaitForTransactionReceipt({
    hash: executeTxHash,
  });

  // Handles standard execution or Nash Trial execution
  const handleExecute = useCallback(async () => {
    try {
      setStep("executing");

      const parsedInput = JSON.parse(inputData);
      const inputHash = hashInput(parsedInput);

      execute({
        address: CONTRACTS.ADYTUM_MARKETPLACE,
        abi: ADYTUM_ABI,
        functionName: isNashMode ? "nashTrial" : "execute",
        args: [invention.id, inputHash],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setStep("error");
    }
  }, [inputData, execute, invention.id, isNashMode]);

  const handleProcessing = useCallback(async () => {
    try {
      setStep("processing");
      const parsedInput = JSON.parse(inputData);

      // Request TEE execution (identical for both models)
      const request = await requestExecution(
        invention.id,
        address!,
        parsedInput,
        executeTxHash!,
      );

      const executionResult = await waitForExecution(request.execution_id);

      if (executionResult.status === "completed") {
        setResult(mapApiResultToDomain(executionResult));
        setStep("result");
      } else {
        setError(executionResult.error || "Execution failed");
        setStep("error");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
      setStep("error");
    }
  }, [inputData, invention.id, address, executeTxHash]);

  const handleBuyCredits = useCallback(async () => {
    try {
      setStep("buying_credits");
      buyCredits({
        address: CONTRACTS.ADYTUM_MARKETPLACE,
        abi: ADYTUM_ABI,
        functionName: "buyCredits",
        args: [invention.id, BigInt(creditsToBuy)],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to buy credits");
      setStep("error");
    }
  }, [buyCredits, invention.id, creditsToBuy]);

  // Handle approval confirmation routing
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      if (isNashMode) {
        handleExecute(); // Nash goes straight to execute after approve
      } else {
        handleBuyCredits(); // PPU goes to buy credits
      }
    }
  }, [approveConfirmed, step, isNashMode, handleBuyCredits, handleExecute]);

  // Handle buy credits confirmation → execute (PPU only)
  useEffect(() => {
    if (buyCreditsConfirmed && step === "buying_credits") {
      refetchCredits();
      handleExecute();
    }
  }, [buyCreditsConfirmed, step, handleExecute, refetchCredits]);

  // Handle execute confirmation
  useEffect(() => {
    if (executeConfirmed && step === "executing") {
      if (!isNashMode) {
        refetchCredits();
        refetchUsage();
      }
      handleProcessing();
    }
  }, [
    executeConfirmed,
    step,
    handleProcessing,
    isNashMode,
    refetchCredits,
    refetchUsage,
  ]);

  // Single-run exact approval (For Nash Trials)
  const handleApproveForTrial = useCallback(async () => {
    try {
      setStep("approving");
      setError(null);
      approve({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.ADYTUM_MARKETPLACE, currentPrice],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
      setStep("error");
    }
  }, [approve, currentPrice]);

  // Bulk credits approval (For Pay-Per-Use)
  const handleApproveForCredits = useCallback(async () => {
    try {
      setStep("approving");
      setError(null);
      const totalCost =
        BigInt(creditsToBuy) *
        (invention as PayPerUseInvention).config.pricePerCall;
      approve({
        address: CONTRACTS.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.ADYTUM_MARKETPLACE, totalCost],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approval failed");
      setStep("error");
    }
  }, [approve, creditsToBuy, invention]);

  // Master submit router
  const handleSubmit = useCallback(async () => {
    if (isNashMode) {
      if (currentPrice === BigInt(0)) {
        handleExecute(); // Free trial
      } else {
        handleApproveForTrial();
      }
    } else {
      if (hasCredits) {
        handleExecute();
      } else {
        handleApproveForCredits();
      }
    }
  }, [
    isNashMode,
    currentPrice,
    hasCredits,
    handleExecute,
    handleApproveForTrial,
    handleApproveForCredits,
  ]);

  const handleClose = () => {
    setStep("input");
    setInputData("{}");
    setResult(null);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      <div className="relative bg-adytum-obsidian border border-adytum-void-100 rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-adytum-void-100">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-adytum-vault" />
            <h2 className="font-display text-lg font-semibold text-white">
              {isNashMode ? "Execute Nash Trial" : "Execute Invention"}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-adytum-smoke hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {step === "input" && (
            <InputStep
              inputData={inputData}
              setInputData={setInputData}
              currentPrice={currentPrice}
              priceTier={priceTier}
              userTotalCalls={userTotalCalls}
              userCredits={userCredits}
              creditsToBuy={creditsToBuy}
              setCreditsToBuy={setCreditsToBuy}
              isFlagged={isFlagged}
              isNashMode={isNashMode}
              isLoading={!isNashMode && (usageLoading || creditsLoading)}
              onSubmit={handleSubmit}
              onClose={handleClose}
            />
          )}

          {step === "approving" && (
            <LoadingStep
              title="Approving USDC"
              description="Confirm the approval transaction in your wallet..."
            />
          )}

          {step === "buying_credits" && (
            <LoadingStep
              title="Buying Credits"
              description={`Purchasing ${creditsToBuy} execution credits...`}
            />
          )}

          {step === "executing" && (
            <LoadingStep
              title="Executing"
              description={
                isNashMode
                  ? "Confirm the trial execution in your wallet..."
                  : hasCredits
                    ? "Using 1 credit to execute..."
                    : "Confirm the execution transaction in your wallet..."
              }
            />
          )}

          {step === "processing" && (
            <LoadingStep
              title="Processing in TEE"
              description="Your input is being processed in a secure enclave. This may take a moment..."
              showAttestation
            />
          )}

          {step === "result" && result && (
            <ResultStep
              result={result}
              onClose={handleClose}
              creditsRemaining={!isNashMode ? userCredits : undefined}
              isRefetchingCredits={!isNashMode ? creditsLoading : false}
            />
          )}

          {step === "error" && (
            <ErrorStep error={error} onRetry={() => setStep("input")} />
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function InputStep({
  inputData,
  setInputData,
  currentPrice,
  priceTier,
  userTotalCalls,
  userCredits,
  creditsToBuy,
  setCreditsToBuy,
  isFlagged,
  isNashMode,
  isLoading,
  onSubmit,
  onClose,
}: {
  inputData: string;
  setInputData: (v: string) => void;
  currentPrice: bigint;
  priceTier: string;
  userTotalCalls: bigint;
  userCredits: bigint;
  creditsToBuy: number;
  setCreditsToBuy: (v: number) => void;
  isFlagged: boolean;
  isNashMode: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [isValidJson, setIsValidJson] = useState(true);
  const hasCredits = !isNashMode && userCredits > BigInt(0);

  const handleInputChange = (value: string) => {
    setInputData(value);
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
    }
  };

  if (isFlagged) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="font-display text-lg font-semibold text-white mb-2">
          Access Suspended
        </h3>
        <p className="text-sm text-adytum-smoke mb-4">
          Your access to this invention has been suspended due to suspected
          extraction attempts.
        </p>
        <button onClick={onClose} className="btn-secondary w-full">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isNashMode && hasCredits && (
        <div
          className={`p-3 rounded-lg border ${userCredits <= BigInt(2) ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins
                className={`h-5 w-5 ${userCredits <= BigInt(2) ? "text-amber-400" : "text-green-400"}`}
              />
              <span
                className={`text-sm font-medium ${userCredits <= BigInt(2) ? "text-amber-400" : "text-green-400"}`}
              >
                {userCredits.toString()} credit
                {userCredits > BigInt(1) ? "s" : ""} remaining
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Pricing info */}
      <div className="p-3 bg-adytum-vault/10 rounded-lg border border-adytum-vault/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-adytum-smoke">Price per execution</span>
          {isLoading ? (
            <span className="text-lg font-semibold text-adytum-smoke">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Loading...
            </span>
          ) : (
            <span className="text-lg font-semibold text-adytum-vault-light">
              {formatUSDC(currentPrice)} USDC
            </span>
          )}
        </div>
        <div className="flex items-center justify-between text-xs text-adytum-smoke">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3" />
            <span>{priceTier}</span>
          </div>
          {!isNashMode && (
            <span>Your executions: {userTotalCalls.toString()}</span>
          )}
        </div>
      </div>

      {/* Buy credits option - Only for PPU */}
      {!isNashMode && (!hasCredits || userCredits <= BigInt(2)) && (
        <div
          className={`p-3 rounded-lg border ${hasCredits ? "bg-amber-500/5 border-amber-500/20" : "bg-adytum-void-100 border-adytum-void-100"}`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plus
                className={`h-4 w-4 ${hasCredits ? "text-amber-400" : "text-adytum-amethyst-400"}`}
              />
              <span className="text-sm font-medium text-white">
                {hasCredits ? "Top Up Credits" : "Buy Credits"}
              </span>
            </div>
            <span className="text-xs text-adytum-smoke">
              Skip approval on future runs
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-adytum-void-100 rounded-lg">
              <button
                onClick={() => setCreditsToBuy(Math.max(1, creditsToBuy - 1))}
                className="px-3 py-1.5 text-adytum-smoke hover:text-white transition-colors"
              >
                −
              </button>
              <span className="px-3 py-1.5 text-white font-medium min-w-[40px] text-center">
                {creditsToBuy}
              </span>
              <button
                onClick={() => setCreditsToBuy(Math.min(100, creditsToBuy + 1))}
                className="px-3 py-1.5 text-adytum-smoke hover:text-white transition-colors"
              >
                +
              </button>
            </div>
            <div className="flex-1 text-right">
              <span className="text-sm text-adytum-smoke">Total: </span>
              <span className="text-sm font-medium text-white">
                {formatUSDC(BigInt(creditsToBuy) * currentPrice)} USDC
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">Input Data (JSON)</label>
        <textarea
          value={inputData}
          onChange={(e) => handleInputChange(e.target.value)}
          rows={6}
          className={`input font-mono text-sm ${!isValidJson ? "border-red-500 focus:border-red-500" : ""}`}
          placeholder='{"text": "Your input here..."}'
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={!isValidJson || isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isNashMode ? (
          <>
            <Play className="h-4 w-4 mr-2" />
            Run Trial ({formatUSDC(currentPrice)} USDC)
          </>
        ) : hasCredits ? (
          <>
            <Zap className="h-4 w-4 mr-2" />
            Execute (1 credit)
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Buy {creditsToBuy} Credits & Execute
          </>
        )}
      </button>
    </div>
  );
}

function LoadingStep({
  title,
  description,
  showAttestation,
}: {
  title: string;
  description: string;
  showAttestation?: boolean;
}) {
  return (
    <div className="text-center py-8">
      <Loader2 className="h-12 w-12 text-adytum-amethyst-400 animate-spin mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-adytum-smoke">{description}</p>
      {showAttestation && (
        <div className="mt-6 p-3 bg-adytum-vault/10 rounded-lg border border-adytum-vault/20">
          <div className="flex items-center justify-center gap-2 text-sm text-adytum-vault-light">
            <Shield className="h-4 w-4" />
            <span>TEE Attestation in progress</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultStep({
  result,
  onClose,
  creditsRemaining,
  isRefetchingCredits,
}: {
  result: ExecutionResult;
  onClose: () => void;
  creditsRemaining?: bigint;
  isRefetchingCredits?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-adytum-vault mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-white">
          Execution Complete
        </h3>
      </div>

      {isRefetchingCredits ? (
        <div className="p-3 bg-adytum-void-100 rounded-lg border border-adytum-void-100">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-adytum-smoke animate-spin" />
            <span className="text-sm text-adytum-smoke">
              Updating balance...
            </span>
          </div>
        </div>
      ) : creditsRemaining !== undefined && creditsRemaining > BigInt(0) ? (
        <div
          className={`p-3 rounded-lg border ${creditsRemaining <= BigInt(2) ? "bg-amber-500/10 border-amber-500/20" : "bg-green-500/10 border-green-500/20"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins
                className={`h-4 w-4 ${creditsRemaining <= BigInt(2) ? "text-amber-400" : "text-green-400"}`}
              />
              <span
                className={`text-sm ${creditsRemaining <= BigInt(2) ? "text-amber-400" : "text-green-400"}`}
              >
                {creditsRemaining.toString()} credit
                {creditsRemaining > BigInt(1) ? "s" : ""} remaining
              </span>
            </div>
          </div>
        </div>
      ) : creditsRemaining !== undefined && creditsRemaining === BigInt(0) ? (
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <span className="text-sm text-amber-400">
              No credits remaining — next run will require approval
            </span>
          </div>
        </div>
      ) : null}

      <div>
        <label className="label">Output</label>
        <pre className="p-3 bg-adytum-void-100 rounded-lg overflow-x-auto text-sm text-white font-mono">
          {JSON.stringify(result.output, null, 2)}
        </pre>
      </div>

      <button onClick={onClose} className="btn-secondary w-full">
        Close
      </button>
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
        Execution Failed
      </h3>
      <p className="text-sm text-adytum-smoke mb-6">{error}</p>
      <button onClick={onRetry} className="btn-primary">
        Try Again
      </button>
    </div>
  );
}
