// Types matching the AdytumMarketplace smart contract

// ============================================
// ENUMS
// ============================================

export enum MonetizationModel {
  PayPerUse = 0,
  NashNegotiation = 1,
}

export enum InventionCategory {
  MLModel = 0,
  Algorithm = 1,
  TradingStrategy = 2,
  Formula = 3,
  DataInsight = 4,
  TradeSecret = 5,
  Other = 6,
}

export enum NashPhase {
  Open = 0,
  Reveal = 1,
  Settled = 2,
  Failed = 3,
  Expired = 4,
}

export const CategoryLabels: Record<InventionCategory, string> = {
  [InventionCategory.MLModel]: "ML Model",
  [InventionCategory.Algorithm]: "Algorithm",
  [InventionCategory.TradingStrategy]: "Trading Strategy",
  [InventionCategory.Formula]: "Formula",
  [InventionCategory.DataInsight]: "Data Insight",
  [InventionCategory.TradeSecret]: "Trade Secret",
  [InventionCategory.Other]: "Other",
};

export const CategoryIcons: Record<InventionCategory, string> = {
  [InventionCategory.MLModel]: "🧠",
  [InventionCategory.Algorithm]: "⚡",
  [InventionCategory.TradingStrategy]: "📈",
  [InventionCategory.Formula]: "🧪",
  [InventionCategory.DataInsight]: "📊",
  [InventionCategory.TradeSecret]: "🔐",
  [InventionCategory.Other]: "📦",
};

export const ModelLabels: Record<MonetizationModel, string> = {
  [MonetizationModel.PayPerUse]: "Pay-Per-Use",
  [MonetizationModel.NashNegotiation]: "Nash Bargaining",
};

export const ModelDescriptions: Record<MonetizationModel, string> = {
  [MonetizationModel.PayPerUse]: "Pay per execution, never own the code",
  [MonetizationModel.NashNegotiation]: "Sealed-bid negotiation for ownership",
};

export const NashPhaseLabels: Record<NashPhase, string> = {
  [NashPhase.Open]: "Accepting Bids",
  [NashPhase.Reveal]: "Reveal Phase",
  [NashPhase.Settled]: "Settled",
  [NashPhase.Failed]: "No Deal",
  [NashPhase.Expired]: "Expired",
};

// ============================================
// CONTRACT STRUCTS
// ============================================

export interface Invention {
  id: `0x${string}`;
  seller: `0x${string}`;
  metadataURI: string;
  encryptedCodeHash: `0x${string}`;
  encryptionKeyHash: `0x${string}`;
  category: InventionCategory;
  model: MonetizationModel;
  createdAt: bigint;
  isActive: boolean;
}

export interface PayPerUseConfig {
  pricePerCall: bigint;
  maxCallsPerDay: bigint;
  maxCallsPerMonth: bigint;
  cooldownSeconds: bigint;
  tier1Threshold: bigint;
  tier1Multiplier: bigint;
  tier2Threshold: bigint;
  tier2Multiplier: bigint;
  tier3Threshold: bigint;
  tier3Multiplier: bigint;
  totalExecutions: bigint;
  totalRevenue: bigint;
}

export interface NashConfig {
  sellerBidHash: `0x${string}`;
  sellerMinRevealed: bigint;
  bidDeadline: bigint;
  revealDeadline: bigint;
  sellerRevealed: boolean;
  allowTrialsDuring: boolean;
  trialFee: bigint;
  maxTrialsPerBidder: bigint;
  phase: NashPhase;
}

export interface NashBid {
  bidHash: `0x${string}`;
  revealedAmount: bigint;
  submitted: boolean;
  revealed: boolean;
  trialCount: bigint;
}

export interface UsageTracker {
  totalCalls: bigint;
  callsToday: bigint;
  callsThisMonth: bigint;
  lastCallTimestamp: bigint;
  lastDayReset: bigint;
  lastMonthReset: bigint;
  flaggedForExtraction: boolean;
}

export interface Execution {
  id: `0x${string}`;
  inventionId: `0x${string}`;
  buyer: `0x${string}`;
  inputHash: `0x${string}`;
  resultHash: `0x${string}`;
  attestation: `0x${string}`;
  executionTimeMs: bigint;
  priceCharged: bigint;
  requestedAt: bigint;
  completedAt: bigint;
  completed: boolean;
  success: boolean;
}

// ============================================
// METADATA (stored on IPFS)
// ============================================

export interface InventionMetadata {
  title: string;
  description: string;
  shortDescription: string;
  benchmarks: Benchmark[];
  tags: string[];
  imageUrl?: string;
  // Input/output schema for documentation
  inputSchema?: Record<string, string>;
  outputSchema?: Record<string, string>;
}

export interface Benchmark {
  metric: string;
  value: number;
  unit: string;
}

// ============================================
// EXECUTION RESULTS (from TEE)
// ============================================

export interface ExecutionResult {
  output: unknown;
  metrics: {
    executionTimeMs: number;
    memoryUsedMb: number;
  };
  attestation: string;
}

// ============================================
// FRONTEND-SPECIFIC TYPES
// ============================================

export interface InventionWithMetadata extends Invention {
  metadata: InventionMetadata;
}

export interface PayPerUseInvention extends InventionWithMetadata {
  model: MonetizationModel.PayPerUse;
  config: PayPerUseConfig;
}

export interface NashInvention extends InventionWithMetadata {
  model: MonetizationModel.NashNegotiation;
  config: NashConfig;
}

// Discriminated union for type-safe model handling
export type FullInvention = PayPerUseInvention | NashInvention;

// ============================================
// FORM TYPES
// ============================================

export interface ListPayPerUseForm {
  // Basic info
  title: string;
  description: string;
  shortDescription: string;
  category: InventionCategory;
  tags: string[];
  benchmarks: Benchmark[];
  inventionCode: string;
  // Pay-per-use config
  pricePerCall: string; // In USDC
  maxCallsPerDay: number;
  maxCallsPerMonth: number;
  cooldownSeconds: number;
}

export interface ListNashForm {
  // Basic info
  title: string;
  description: string;
  shortDescription: string;
  category: InventionCategory;
  tags: string[];
  benchmarks: Benchmark[];
  inventionCode: string;
  // Nash config
  minAcceptable: string; // Seller's minimum in USDC (will be hashed)
  bidDurationDays: number;
  revealDurationDays: number;
  allowTrialsDuring: boolean;
  trialFee: string; // In USDC
  maxTrialsPerBidder: number;
}

export interface SubmitNashBidForm {
  maxWillingToPay: string; // In USDC
}

export interface ExecutionInput {
  data: Record<string, unknown>;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ExecutionRequest {
  executionId: string;
  inventionId: string;
  buyer: string;
  inputHash: string;
  status: "pending" | "executing" | "completed" | "failed";
}

export interface ExecutionResponse {
  executionId: string;
  status: "completed" | "failed";
  result?: ExecutionResult;
  error?: string;
}

export interface KeyReleaseResponse {
  inventionId: string;
  buyer: string;
  decryptionKey: string;
  released: boolean;
}

// ============================================
// PRICE CALCULATION HELPERS
// ============================================

export function calculateTieredPrice(
  config: PayPerUseConfig,
  totalCalls: bigint,
): bigint {
  const {
    pricePerCall,
    tier1Threshold,
    tier1Multiplier,
    tier2Threshold,
    tier2Multiplier,
    tier3Threshold,
    tier3Multiplier,
  } = config;

  if (totalCalls >= tier3Threshold) {
    return (pricePerCall * tier3Multiplier) / BigInt(10000);
  } else if (totalCalls >= tier2Threshold) {
    return (pricePerCall * tier2Multiplier) / BigInt(10000);
  } else if (totalCalls >= tier1Threshold) {
    return (pricePerCall * tier1Multiplier) / BigInt(10000);
  }
  return pricePerCall;
}

export function getPriceTierLabel(
  totalCalls: bigint,
  config: PayPerUseConfig,
): string {
  if (totalCalls >= config.tier3Threshold) return "Tier 3 (10x)";
  if (totalCalls >= config.tier2Threshold) return "Tier 2 (3x)";
  if (totalCalls >= config.tier1Threshold) return "Tier 1 (1.5x)";
  return "Base Price";
}

// ============================================
// TIME HELPERS
// ============================================

export function getNashTimeRemaining(
  deadline: bigint,
  timeOffset: bigint = BigInt(0), // Add timeOffset with a default of 0
): {
  days: number;
  hours: number;
  minutes: number;
  expired: boolean;
} {
  // Apply the time offset to sync with the blockchain
  const now = BigInt(Math.floor(Date.now() / 1000)) + timeOffset;
  const remaining = deadline - now;

  if (remaining <= BigInt(0)) {
    return { days: 0, hours: 0, minutes: 0, expired: true };
  }

  const seconds = Number(remaining);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  return { days, hours, minutes, expired: false };
}

export function formatTimeRemaining(
  deadline: bigint,
  timeOffset: bigint = BigInt(0), // Pass it down here too
): string {
  const { days, hours, minutes, expired } = getNashTimeRemaining(
    deadline,
    timeOffset,
  );

  if (expired) return "Expired";
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============================================
// TYPE GUARDS
// ============================================

export function isPayPerUse(inv: FullInvention): inv is PayPerUseInvention {
  return inv.model === MonetizationModel.PayPerUse;
}

export function isNash(inv: FullInvention): inv is NashInvention {
  return inv.model === MonetizationModel.NashNegotiation;
}
