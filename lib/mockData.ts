import {
  InventionMetadata,
  InventionCategory,
  MonetizationModel,
  NashPhase,
  FullInvention,
  PayPerUseInvention,
  NashInvention,
} from "@/types";

// ============================================
// PAY-PER-USE INVENTIONS
// ============================================

const PAY_PER_USE_INVENTIONS: PayPerUseInvention[] = [
  {
    id: "0x0001000000000000000000000000000000000000000000000000000000000001" as `0x${string}`,
    seller: "0x1234567890123456789012345678901234567890" as `0x${string}`,
    metadataURI: "ipfs://mock1",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000001" as `0x${string}`,
    category: InventionCategory.MLModel,
    model: MonetizationModel.PayPerUse,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 3),
    isActive: true,
    metadata: {
      title: "Sentiment Analysis Model v2.1",
      description:
        "A fine-tuned transformer model for financial sentiment analysis. Trained on 2M+ financial news articles and SEC filings. Achieves 94.2% accuracy on the FinBERT benchmark. Input any text and receive sentiment classification with confidence scores.",
      shortDescription:
        "Fine-tuned transformer for financial sentiment with 94.2% accuracy",
      benchmarks: [
        { metric: "Accuracy", value: 94.2, unit: "%" },
        { metric: "F1 Score", value: 0.93, unit: "" },
        { metric: "Inference Time", value: 12, unit: "ms" },
      ],
      tags: ["NLP", "Finance", "Transformer", "Sentiment"],
      inputSchema: { text: "string" },
      outputSchema: { sentiment: "string", confidence: "number" },
    },
    config: {
      pricePerCall: BigInt(500_000), // $0.50 USDC
      maxCallsPerDay: BigInt(100),
      maxCallsPer30Days: BigInt(2000),
      cooldownSeconds: BigInt(1),
      tier1Threshold: BigInt(100),
      tier1Multiplier: BigInt(15000), // 1.5x
      tier2Threshold: BigInt(500),
      tier2Multiplier: BigInt(30000), // 3x
      tier3Threshold: BigInt(1000),
      tier3Multiplier: BigInt(100000), // 10x
      totalExecutions: BigInt(4721),
      totalRevenue: BigInt(2_360_500_000), // ~$2,360 USDC
    },
  },
  {
    id: "0x0002000000000000000000000000000000000000000000000000000000000002" as `0x${string}`,
    seller: "0x2345678901234567890123456789012345678901" as `0x${string}`,
    metadataURI: "ipfs://mock2",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000002" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000002" as `0x${string}`,
    category: InventionCategory.Algorithm,
    model: MonetizationModel.PayPerUse,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 7),
    isActive: true,
    metadata: {
      title: "Optimal Graph Partitioning Algorithm",
      description:
        "Novel O(n log n) algorithm for balanced graph partitioning. Outperforms METIS by 23% on sparse graphs while maintaining partition quality. Ideal for distributed computing workload distribution.",
      shortDescription: "O(n log n) graph partitioning, 23% faster than METIS",
      benchmarks: [
        { metric: "Speed vs METIS", value: 23, unit: "% faster" },
        { metric: "Memory", value: 45, unit: "MB/M edges" },
        { metric: "Balance Ratio", value: 1.02, unit: "" },
      ],
      tags: ["Graph Theory", "Optimization", "Distributed Systems"],
      inputSchema: { nodes: "array", edges: "array", partitions: "number" },
      outputSchema: { partition_map: "object", balance_score: "number" },
    },
    config: {
      pricePerCall: BigInt(200_000), // $0.20 USDC
      maxCallsPerDay: BigInt(500),
      maxCallsPer30Days: BigInt(10000),
      cooldownSeconds: BigInt(0),
      tier1Threshold: BigInt(1000),
      tier1Multiplier: BigInt(15000),
      tier2Threshold: BigInt(5000),
      tier2Multiplier: BigInt(25000),
      tier3Threshold: BigInt(10000),
      tier3Multiplier: BigInt(50000),
      totalExecutions: BigInt(15632),
      totalRevenue: BigInt(3_126_400_000), // ~$3,126 USDC
    },
  },
  {
    id: "0x0003000000000000000000000000000000000000000000000000000000000003" as `0x${string}`,
    seller: "0x3456789012345678901234567890123456789012" as `0x${string}`,
    metadataURI: "ipfs://mock3",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000003" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000003" as `0x${string}`,
    category: InventionCategory.TradingStrategy,
    model: MonetizationModel.PayPerUse,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 1),
    isActive: true,
    metadata: {
      title: "Cross-Exchange Arbitrage Engine",
      description:
        "Real-time arbitrage detection and execution strategy for CEX/DEX pairs. Includes slippage prediction and MEV protection. Backtested on 18 months of data with Sharpe ratio of 2.4.",
      shortDescription:
        "Cross-exchange arbitrage with MEV protection, 18mo backtest",
      benchmarks: [
        { metric: "Sharpe Ratio", value: 2.4, unit: "" },
        { metric: "Max Drawdown", value: 8.2, unit: "%" },
        { metric: "Avg Daily Return", value: 0.34, unit: "%" },
      ],
      tags: ["DeFi", "Arbitrage", "MEV", "Quantitative"],
      inputSchema: {
        pairs: "array",
        capital: "number",
        risk_tolerance: "number",
      },
      outputSchema: { signals: "array", expected_profit: "number" },
    },
    config: {
      pricePerCall: BigInt(5_000_000), // $5 USDC per signal
      maxCallsPerDay: BigInt(20),
      maxCallsPer30Days: BigInt(200),
      cooldownSeconds: BigInt(60), // 1 minute cooldown
      tier1Threshold: BigInt(50),
      tier1Multiplier: BigInt(20000), // 2x
      tier2Threshold: BigInt(100),
      tier2Multiplier: BigInt(50000), // 5x
      tier3Threshold: BigInt(200),
      tier3Multiplier: BigInt(100000), // 10x
      totalExecutions: BigInt(847),
      totalRevenue: BigInt(4_235_000_000), // ~$4,235 USDC
    },
  },
  {
    id: "0x0004000000000000000000000000000000000000000000000000000000000004" as `0x${string}`,
    seller: "0x4567890123456789012345678901234567890123" as `0x${string}`,
    metadataURI: "ipfs://mock4",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000004" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000004" as `0x${string}`,
    category: InventionCategory.Formula,
    model: MonetizationModel.PayPerUse,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 14),
    isActive: true,
    metadata: {
      title: "Pharmaceutical Compound Solubility Predictor",
      description:
        "ML-enhanced solubility prediction formula for drug candidates. Combines QSPR with deep learning. FDA submission ready documentation included. Predicts aqueous solubility from SMILES notation.",
      shortDescription: "ML solubility prediction for pharma, FDA-ready docs",
      benchmarks: [
        { metric: "R² Score", value: 0.97, unit: "" },
        { metric: "RMSE", value: 0.23, unit: "log S" },
        { metric: "Coverage", value: 98.5, unit: "% drug-like" },
      ],
      tags: ["Pharma", "Chemistry", "Drug Discovery", "QSPR"],
      inputSchema: { smiles: "string", temperature: "number" },
      outputSchema: { log_s: "number", confidence_interval: "array" },
    },
    config: {
      pricePerCall: BigInt(100_000), // $0.10 USDC - cheap for high volume
      maxCallsPerDay: BigInt(1000),
      maxCallsPer30Days: BigInt(25000),
      cooldownSeconds: BigInt(0),
      tier1Threshold: BigInt(5000),
      tier1Multiplier: BigInt(12000), // 1.2x
      tier2Threshold: BigInt(15000),
      tier2Multiplier: BigInt(15000), // 1.5x
      tier3Threshold: BigInt(25000),
      tier3Multiplier: BigInt(20000), // 2x
      totalExecutions: BigInt(89234),
      totalRevenue: BigInt(8_923_400_000), // ~$8,923 USDC
    },
  },
];

// ============================================
// NASH NEGOTIATION INVENTIONS
// ============================================

const NASH_INVENTIONS: NashInvention[] = [
  {
    id: "0x0005000000000000000000000000000000000000000000000000000000000005" as `0x${string}`,
    seller: "0x5678901234567890123456789012345678901234" as `0x${string}`,
    metadataURI: "ipfs://mock5",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000005" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000005" as `0x${string}`,
    category: InventionCategory.DataInsight,
    model: MonetizationModel.NashNegotiation,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 12),
    isActive: true,
    metadata: {
      title: "Crypto Wallet Clustering Dataset + Algorithm",
      description:
        "Labeled dataset of 50M+ Ethereum addresses with entity clustering algorithm. Includes exchange wallets, known protocols, and suspicious activity flags. Updated monthly. Full ownership transfer via Nash negotiation.",
      shortDescription:
        "50M+ labeled Ethereum addresses with entity clustering",
      benchmarks: [
        { metric: "Addresses", value: 50, unit: "M+" },
        { metric: "Entity Clusters", value: 12500, unit: "" },
        { metric: "Label Accuracy", value: 99.2, unit: "%" },
      ],
      tags: ["Blockchain", "Analytics", "Ethereum", "Compliance"],
    },
    config: {
      sellerBidHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`,
      sellerMinRevealed: BigInt(0),
      bidDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5),
      revealDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 7),
      requiredDeposit: BigInt(10_000_000), // 10 USDC
      sellerRevealed: false,
      allowTrialsDuring: true,
      trialFee: BigInt(50_000_000), // $50 per trial
      maxTrialsPerBidder: BigInt(3),
      phase: NashPhase.Open,
      highestBidder:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      highestBid: BigInt(0),
      sellerBond: BigInt(50_000_000), // 50 USDC
    },
  },
  {
    id: "0x0006000000000000000000000000000000000000000000000000000000000006" as `0x${string}`,
    seller: "0x6789012345678901234567890123456789012345" as `0x${string}`,
    metadataURI: "ipfs://mock6",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000006" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000006" as `0x${string}`,
    category: InventionCategory.MLModel,
    model: MonetizationModel.NashNegotiation,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 5),
    isActive: true,
    metadata: {
      title: "Medical Image Anomaly Detector",
      description:
        "Self-supervised vision model for detecting anomalies in X-ray and CT scans. Trained on 500K+ images. HIPAA compliant deployment guide included. Full ownership transfer - includes model weights, training code, and documentation.",
      shortDescription: "Self-supervised anomaly detection for medical imaging",
      benchmarks: [
        { metric: "AUC-ROC", value: 0.96, unit: "" },
        { metric: "Sensitivity", value: 94.8, unit: "%" },
        { metric: "Specificity", value: 97.2, unit: "%" },
      ],
      tags: ["Healthcare", "Computer Vision", "Radiology", "AI"],
    },
    config: {
      sellerBidHash:
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890" as `0x${string}`,
      sellerMinRevealed: BigInt(0),
      bidDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 3),
      revealDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5),
      requiredDeposit: BigInt(0), // No deposit required
      sellerRevealed: false,
      allowTrialsDuring: true,
      trialFee: BigInt(25_000_000), // $25 per trial
      maxTrialsPerBidder: BigInt(5),
      phase: NashPhase.Open,
      highestBidder:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      highestBid: BigInt(0),
      sellerBond: BigInt(50_000_000), // 50 USDC
    },
  },
  {
    id: "0x0007000000000000000000000000000000000000000000000000000000000007" as `0x${string}`,
    seller: "0x7890123456789012345678901234567890123456" as `0x${string}`,
    metadataURI: "ipfs://mock7",
    encryptedCodeHash:
      "0x0000000000000000000000000000000000000000000000000000000000000007" as `0x${string}`,
    encryptionKeyHash:
      "0x0000000000000000000000000000000000000000000000000000000000000007" as `0x${string}`,
    category: InventionCategory.TradeSecret,
    model: MonetizationModel.NashNegotiation,
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 10),
    isActive: true,
    metadata: {
      title: "High-Frequency Market Making Strategy",
      description:
        "Complete HFT market making system with inventory management, quote optimization, and adverse selection protection. Battle-tested on Binance and FTX (pre-collapse). Includes full source code, backtesting framework, and parameter tuning guides.",
      shortDescription:
        "Battle-tested HFT market making with inventory management",
      benchmarks: [
        { metric: "Sharpe Ratio", value: 4.2, unit: "" },
        { metric: "Win Rate", value: 67, unit: "%" },
        { metric: "Avg Trade PnL", value: 0.003, unit: "%" },
      ],
      tags: ["HFT", "Market Making", "Quantitative", "Trading"],
    },
    config: {
      sellerBidHash:
        "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321" as `0x${string}`,
      sellerMinRevealed: BigInt(0),
      bidDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 10),
      revealDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 14),
      requiredDeposit: BigInt(100_000_000), // 100 USDC deposit
      sellerRevealed: false,
      allowTrialsDuring: false,
      trialFee: BigInt(0),
      maxTrialsPerBidder: BigInt(0),
      phase: NashPhase.Open,
      highestBidder:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      highestBid: BigInt(0),
      sellerBond: BigInt(250_000_000), // 250 USDC
    },
  },
];

// ============================================
// COMBINED MOCK DATA
// ============================================

export const MOCK_INVENTIONS: FullInvention[] = [
  ...PAY_PER_USE_INVENTIONS,
  ...NASH_INVENTIONS,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getMockInvention(id: string): FullInvention | undefined {
  return MOCK_INVENTIONS.find((item) => item.id === id);
}

export function getMockMetadata(
  metadataURI: string,
): InventionMetadata | undefined {
  const mock = MOCK_INVENTIONS.find((item) => item.metadataURI === metadataURI);
  return mock?.metadata;
}

export function getPayPerUseInventions(): PayPerUseInvention[] {
  return MOCK_INVENTIONS.filter(
    (inv): inv is PayPerUseInvention =>
      inv.model === MonetizationModel.PayPerUse,
  );
}

export function getNashInventions(): NashInvention[] {
  return MOCK_INVENTIONS.filter(
    (inv): inv is NashInvention =>
      inv.model === MonetizationModel.NashNegotiation,
  );
}
