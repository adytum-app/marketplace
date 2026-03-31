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
  PayPerUseInvention,
  ExecutionResult,
  calculateTieredPrice,
  getPriceTierLabel,
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
  invention: PayPerUseInvention;
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
  const [creditsToBuy, setCreditsToBuy] = useState<number>(5); // Default bulk purchase

  // Fetch user's actual usage from contract
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
      enabled: !!address && isOpen,
    },
  });

  // Fetch user's credit balance
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
      enabled: !!address && isOpen,
    },
  });

  // Extract values
  const userTotalCalls = usageTracker?.totalCalls ?? BigInt(0);
  const isFlagged = usageTracker?.flaggedForExtraction ?? false;
  const userCredits = creditBalance ?? BigInt(0);
  const hasCredits = userCredits > BigInt(0);

  // Calculate current price based on user's actual usage
  const currentPrice = calculateTieredPrice(invention.config, userTotalCalls);
  const priceTier = getPriceTierLabel(userTotalCalls, invention.config);

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

  // Wrapped in useCallback to prevent stale closures
  const handleExecute = useCallback(async () => {
    try {
      setStep("executing");

      const parsedInput = JSON.parse(inputData);
      const inputHash = hashInput(parsedInput);

      execute({
        address: CONTRACTS.ADYTUM_MARKETPLACE,
        abi: ADYTUM_ABI,
        functionName: "execute",
        args: [invention.id, inputHash],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Execution failed");
      setStep("error");
    }
  }, [inputData, execute, invention.id]);

  // Wrapped in useCallback to prevent stale closures
  const handleProcessing = useCallback(async () => {
    try {
      setStep("processing");

      const parsedInput = JSON.parse(inputData);

      // Request TEE execution
      const request = await requestExecution(
        invention.id,
        address!,
        parsedInput,
        executeTxHash!,
      );

      // Wait for result
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

  // Buy credits after approval
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

  // Handle approval confirmation → buy credits
  useEffect(() => {
    if (approveConfirmed && step === "approving") {
      handleBuyCredits();
    }
  }, [approveConfirmed, step, handleBuyCredits]);

  // Handle buy credits confirmation → execute
  useEffect(() => {
    if (buyCreditsConfirmed && step === "buying_credits") {
      refetchCredits();
      handleExecute();
    }
  }, [buyCreditsConfirmed, step, handleExecute, refetchCredits]);

  // Handle execute confirmation - refetch credits immediately since on-chain decrement happened
  useEffect(() => {
    if (executeConfirmed && step === "executing") {
      // Refetch credits NOW - the on-chain balance changed with this tx
      refetchCredits();
      refetchUsage();
      handleProcessing();
    }
  }, [executeConfirmed, step, handleProcessing, refetchCredits, refetchUsage]);

  // Approve USDC for buying credits
  const handleApproveForCredits = useCallback(async () => {
    try {
      setStep("approving");
      setError(null);

      const totalCost = BigInt(creditsToBuy) * invention.config.pricePerCall;

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
  }, [approve, creditsToBuy, invention.config.pricePerCall]);

  // If user has credits, skip approve → execute directly
  const handleSubmit = useCallback(async () => {
    if (hasCredits) {
      // Direct execution - no approval needed
      handleExecute();
    } else {
      // Need to approve and buy credits first
      handleApproveForCredits();
    }
  }, [hasCredits, handleExecute, handleApproveForCredits]);

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
            <Zap className="h-5 w-5 text-adytum-vault" />
            <h2 className="font-display text-lg font-semibold text-white">
              Execute Invention
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
          {step === "input" && (
            <InputStep
              invention={invention}
              inputData={inputData}
              setInputData={setInputData}
              currentPrice={currentPrice}
              priceTier={priceTier}
              userTotalCalls={userTotalCalls}
              userCredits={userCredits}
              creditsToBuy={creditsToBuy}
              setCreditsToBuy={setCreditsToBuy}
              isFlagged={isFlagged}
              isLoading={usageLoading || creditsLoading}
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
                hasCredits
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
              creditsRemaining={userCredits}
              isRefetchingCredits={creditsLoading}
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
  invention,
  inputData,
  setInputData,
  currentPrice,
  priceTier,
  userTotalCalls,
  userCredits,
  creditsToBuy,
  setCreditsToBuy,
  isFlagged,
  isLoading,
  onSubmit,
  onClose,
}: {
  invention: PayPerUseInvention;
  inputData: string;
  setInputData: (v: string) => void;
  currentPrice: bigint;
  priceTier: string;
  userTotalCalls: bigint;
  userCredits: bigint;
  creditsToBuy: number;
  setCreditsToBuy: (v: number) => void;
  isFlagged: boolean;
  isLoading: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const [isValidJson, setIsValidJson] = useState(true);
  const hasCredits = userCredits > BigInt(0);

  const handleInputChange = (value: string) => {
    setInputData(value);
    try {
      JSON.parse(value);
      setIsValidJson(true);
    } catch {
      setIsValidJson(false);
    }
  };

  // If user is flagged for extraction, show error
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
        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 mb-4">
          <p className="text-xs text-red-300">
            If you believe this is an error, please contact support.
          </p>
        </div>
        <button onClick={onClose} className="btn-secondary w-full">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Credits balance - show prominently if user has credits */}
      {hasCredits && (
        <div
          className={`p-3 rounded-lg border ${
            userCredits <= BigInt(2)
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-green-500/10 border-green-500/20"
          }`}
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
            <span
              className={`text-xs ${userCredits <= BigInt(2) ? "text-amber-300" : "text-green-300"}`}
            >
              {userCredits <= BigInt(2)
                ? "Running low!"
                : "1 credit = 1 execution"}
            </span>
          </div>
          {userCredits <= BigInt(2) && (
            <p className="text-xs text-amber-300 mt-2">
              ⚠️ Consider topping up to avoid approval popups on your next run.
            </p>
          )}
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
          <span>Your executions: {userTotalCalls.toString()}</span>
        </div>
      </div>

      {/* Buy credits option - show if no credits OR running low */}
      {(!hasCredits || userCredits <= BigInt(2)) && (
        <div
          className={`p-3 rounded-lg border ${
            hasCredits
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-adytum-void-100 border-adytum-void-100"
          }`}
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
          <p className="text-xs text-adytum-smoke mt-2">
            💡 With credits, future executions are instant — no wallet popups!
          </p>
        </div>
      )}

      {/* Input schema hint */}
      {invention.metadata.inputSchema && (
        <div className="p-3 bg-adytum-void-100 rounded-lg">
          <p className="text-xs text-adytum-smoke mb-2">
            Expected input schema:
          </p>
          <code className="text-xs text-adytum-amethyst-300">
            {JSON.stringify(invention.metadata.inputSchema, null, 2)}
          </code>
        </div>
      )}

      {/* Input textarea */}
      <div>
        <label className="label">Input Data (JSON)</label>
        <textarea
          value={inputData}
          onChange={(e) => handleInputChange(e.target.value)}
          rows={6}
          className={`input font-mono text-sm ${
            !isValidJson ? "border-red-500 focus:border-red-500" : ""
          }`}
          placeholder='{"text": "Your input here..."}'
        />
        {!isValidJson && (
          <p className="mt-1 text-xs text-red-400">Invalid JSON format</p>
        )}
      </div>

      {/* TEE info */}
      <div className="flex items-start gap-2 p-3 bg-adytum-amethyst-500/10 rounded-lg">
        <Shield className="h-4 w-4 text-adytum-amethyst-400 shrink-0 mt-0.5" />
        <p className="text-xs text-adytum-amethyst-200">
          Your input will be processed in a TEE (Trusted Execution Environment).
          You will receive the output but never see the underlying code.
        </p>
      </div>

      {/* Submit button */}
      <button
        onClick={onSubmit}
        disabled={!isValidJson || isLoading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {hasCredits ? (
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
      {/* Success header */}
      <div className="text-center">
        <CheckCircle className="h-12 w-12 text-adytum-vault mx-auto mb-3" />
        <h3 className="font-display text-lg font-semibold text-white">
          Execution Complete
        </h3>
      </div>

      {/* Credits remaining - show loading state while refetching */}
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
          className={`p-3 rounded-lg border ${
            creditsRemaining <= BigInt(2)
              ? "bg-amber-500/10 border-amber-500/20"
              : "bg-green-500/10 border-green-500/20"
          }`}
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
            <span
              className={`text-xs ${creditsRemaining <= BigInt(2) ? "text-amber-300" : "text-green-300"}`}
            >
              {creditsRemaining <= BigInt(2)
                ? "Running low!"
                : "Run again instantly!"}
            </span>
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

      {/* Output */}
      <div>
        <label className="label">Output</label>
        <pre className="p-3 bg-adytum-void-100 rounded-lg overflow-x-auto text-sm text-white font-mono">
          {JSON.stringify(result.output, null, 2)}
        </pre>
      </div>

      {/* Metrics */}
      {result.metrics && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-adytum-void-100 rounded-lg">
            <p className="text-xs text-adytum-smoke mb-1">Execution Time</p>
            <p className="text-sm font-semibold text-white">
              {result.metrics.executionTimeMs}ms
            </p>
          </div>
          <div className="p-3 bg-adytum-void-100 rounded-lg">
            <p className="text-xs text-adytum-smoke mb-1">Memory Used</p>
            <p className="text-sm font-semibold text-white">
              {result.metrics.memoryUsedMb}MB
            </p>
          </div>
        </div>
      )}

      {/* Attestation */}
      {result.attestation && (
        <div className="p-3 bg-adytum-vault/10 rounded-lg border border-adytum-vault/20">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-adytum-vault" />
            <span className="text-sm font-medium text-adytum-vault-light">
              TEE Attestation
            </span>
          </div>
          <code className="text-xs text-adytum-smoke break-all">
            {result.attestation.slice(0, 64)}...
          </code>
        </div>
      )}

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
