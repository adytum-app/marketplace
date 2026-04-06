// AdytumMarketplace ABI - Two Model Architecture (Pay-Per-Use + Nash Negotiation)

export const ADYTUM_ABI = [
  // ============================================
  // EVENTS
  // ============================================

  // Listing events
  {
    type: "event",
    name: "InventionListed",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "seller", type: "address", indexed: true },
      { name: "model", type: "uint8", indexed: false },
      { name: "category", type: "uint8", indexed: false },
      { name: "metadataURI", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "InventionDeactivated",
    inputs: [{ name: "id", type: "bytes32", indexed: true }],
  },

  // Pay-Per-Use events
  {
    type: "event",
    name: "CreditsPurchased",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "credits", type: "uint256", indexed: false },
      { name: "totalCost", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionRequested",
    inputs: [
      { name: "executionId", type: "bytes32", indexed: true },
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "priceCharged", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionCompleted",
    inputs: [
      { name: "executionId", type: "bytes32", indexed: true },
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "resultHash", type: "bytes32", indexed: false },
      { name: "executionTimeMs", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExecutionFailed",
    inputs: [
      { name: "executionId", type: "bytes32", indexed: true },
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExtractionFlagged",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ExtractionBanApplied",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
    ],
  },
  {
    type: "event",
    name: "PayPerUseTiersUpdated",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "tier1Threshold", type: "uint32", indexed: false },
      { name: "tier1Multiplier", type: "uint32", indexed: false },
      { name: "tier2Threshold", type: "uint32", indexed: false },
      { name: "tier2Multiplier", type: "uint32", indexed: false },
      { name: "tier3Threshold", type: "uint32", indexed: false },
      { name: "tier3Multiplier", type: "uint32", indexed: false },
    ],
  },

  // Nash events
  {
    type: "event",
    name: "NashBidSubmitted",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "depositAmount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NashBidRevealed",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NashSellerRevealed",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "minAcceptable", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NashSettled",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "winner", type: "address", indexed: true },
      { name: "finalPrice", type: "uint256", indexed: false },
      { name: "sellerMin", type: "uint256", indexed: false },
      { name: "buyerMax", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NashFailed",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event",
    name: "NashExpired",
    inputs: [{ name: "inventionId", type: "bytes32", indexed: true }],
  },
  {
    type: "event",
    name: "NashTrialExecuted",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "trialNumber", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "RefundClaimed",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DepositForfeited",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "DepositRefunded",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "bidder", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "KeyReleased",
    inputs: [
      { name: "inventionId", type: "bytes32", indexed: true },
      { name: "buyer", type: "address", indexed: true },
      { name: "encryptedKey", type: "bytes", indexed: false },
      { name: "attestation", type: "bytes", indexed: false },
    ],
  },

  // Withdrawal events
  {
    type: "event",
    name: "SellerWithdrawal",
    inputs: [
      { name: "seller", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // ============================================
  // READ FUNCTIONS
  // ============================================

  // Core getters
  {
    type: "function",
    name: "getInvention",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "seller", type: "address" },
          { name: "metadataURI", type: "string" },
          { name: "encryptedCodeHash", type: "bytes32" },
          { name: "encryptionKeyHash", type: "bytes32" },
          { name: "category", type: "uint8" },
          { name: "model", type: "uint8" },
          { name: "createdAt", type: "uint256" },
          { name: "isActive", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPayPerUseConfig",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "pricePerCall", type: "uint128" },
          { name: "maxCallsPerDay", type: "uint64" },
          { name: "maxCallsPer30Days", type: "uint64" },
          { name: "cooldownSeconds", type: "uint32" },
          { name: "tier1Threshold", type: "uint32" },
          { name: "tier1Multiplier", type: "uint32" },
          { name: "tier2Threshold", type: "uint32" },
          { name: "tier2Multiplier", type: "uint32" },
          { name: "tier3Threshold", type: "uint32" },
          { name: "tier3Multiplier", type: "uint32" },
          { name: "totalExecutions", type: "uint128" },
          { name: "totalRevenue", type: "uint128" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNashConfig",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "sellerBidHash", type: "bytes32" },
          { name: "sellerMinRevealed", type: "uint256" },
          { name: "bidDeadline", type: "uint256" },
          { name: "revealDeadline", type: "uint256" },
          { name: "requiredDeposit", type: "uint256" },
          { name: "sellerRevealed", type: "bool" },
          { name: "allowTrialsDuring", type: "bool" },
          { name: "trialFee", type: "uint256" },
          { name: "maxTrialsPerBidder", type: "uint256" },
          { name: "phase", type: "uint8" },
          { name: "highestBidder", type: "address" },
          { name: "highestBid", type: "uint256" },
          { name: "sellerBond", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUsageTracker",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "totalCalls", type: "uint64" },
          { name: "callsToday", type: "uint32" },
          { name: "callsThis30Days", type: "uint32" },
          { name: "lastCallTimestamp", type: "uint40" },
          { name: "lastDayReset", type: "uint32" },
          { name: "last30DayReset", type: "uint32" },
          { name: "flaggedForExtraction", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNashBid",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "bidder", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "bidHash", type: "bytes32" },
          { name: "revealedAmount", type: "uint256" },
          { name: "depositAmount", type: "uint256" },
          { name: "buyerPubKey", type: "bytes" },
          { name: "submitted", type: "bool" },
          { name: "revealed", type: "bool" },
          { name: "depositForfeited", type: "bool" },
          { name: "trialCount", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getExecution",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "bytes32" },
          { name: "inventionId", type: "bytes32" },
          { name: "buyer", type: "address" },
          { name: "inputHash", type: "bytes32" },
          { name: "resultHash", type: "bytes32" },
          { name: "attestation", type: "bytes" },
          { name: "executionTimeMs", type: "uint256" },
          { name: "priceCharged", type: "uint256" },
          { name: "requestedAt", type: "uint256" },
          { name: "completedAt", type: "uint256" },
          { name: "completed", type: "bool" },
          { name: "success", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getCurrentPrice",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNashBidders",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNashBiddersCount",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getBuyerPubKey",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getEncryptedKey",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nashWinner",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "nashFinalPrice",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasOwnership",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "canClaimKey",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "creditBalances",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "buyer", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "sellerBalances",
    inputs: [{ name: "seller", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getInventionCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getInventionIds",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes32[]" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "minSellerBond",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "payPerUseListingFee",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },

  // ============================================
  // WRITE FUNCTIONS - LISTING
  // ============================================

  {
    type: "function",
    name: "listPayPerUse",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "encryptedCodeHash", type: "bytes32" },
      { name: "encryptionKeyHash", type: "bytes32" },
      { name: "category", type: "uint8" },
      { name: "pricePerCall", type: "uint128" },
      { name: "maxCallsPerDay", type: "uint64" },
      { name: "maxCallsPer30Days", type: "uint64" },
      { name: "cooldownSeconds", type: "uint32" },
    ],
    outputs: [{ name: "inventionId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "listNashNegotiation",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "encryptedCodeHash", type: "bytes32" },
      { name: "encryptionKeyHash", type: "bytes32" },
      { name: "category", type: "uint8" },
      { name: "sellerBidHash", type: "bytes32" },
      { name: "bidDeadline", type: "uint256" },
      { name: "revealDeadline", type: "uint256" },
      { name: "allowTrialsDuring", type: "bool" },
      { name: "trialFee", type: "uint256" },
      { name: "maxTrialsPerBidder", type: "uint256" },
      { name: "sellerBond", type: "uint256" },
      { name: "requiredDeposit", type: "uint256" },
    ],
    outputs: [{ name: "inventionId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updatePayPerUseTiers",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "tier1Threshold", type: "uint32" },
      { name: "tier1Multiplier", type: "uint32" },
      { name: "tier2Threshold", type: "uint32" },
      { name: "tier2Multiplier", type: "uint32" },
      { name: "tier3Threshold", type: "uint32" },
      { name: "tier3Multiplier", type: "uint32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "deactivateInvention",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  // ============================================
  // WRITE FUNCTIONS - PAY-PER-USE
  // ============================================

  {
    type: "function",
    name: "buyCredits",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "numCredits", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
    ],
    outputs: [{ name: "executionId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },

  // ============================================
  // WRITE FUNCTIONS - NASH NEGOTIATION
  // ============================================

  {
    type: "function",
    name: "submitNashBid",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "bidHash", type: "bytes32" },
      { name: "buyerPubKey", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "nashTrial",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "inputHash", type: "bytes32" },
    ],
    outputs: [{ name: "executionId", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "startNashReveal",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealNashBid",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "maxWillingToPay", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revealSellerMin",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "minAcceptable", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleNash",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "expireNash",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "forfeitUnrevealedDeposits",
    inputs: [
      { name: "inventionId", type: "bytes32" },
      { name: "griefers", type: "address[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimDepositSellerNoReveal",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimNashRefund",
    inputs: [{ name: "inventionId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },

  // ============================================
  // WRITE FUNCTIONS - WITHDRAWAL
  // ============================================

  {
    type: "function",
    name: "withdrawSeller",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// ERC20 ABI for USDC approvals
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
] as const;