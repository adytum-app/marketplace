# Adytum Frontend

> _The interface to the innermost chamber for protected knowledge_

A Next.js frontend for the Adytum Marketplace — enabling inventors to monetize their intellectual property through TEE-enforced execution and game-theoretic Nash bargaining, without ever revealing the underlying code.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)](https://tailwindcss.com/)
[![wagmi](https://img.shields.io/badge/wagmi-2.x-purple)](https://wagmi.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Theoretical Foundation: The NDAi Paper

This frontend implements the user-facing interface for concepts from:

> **"NDAI"** by Matt Stephenson, Andrew Miller, Xyn Sun, Bhargav Annem, and Rohan Parikh  
> arXiv:2502.07924v1 [econ.TH] — February 2025  
> https://arxiv.org/abs/2502.07924

### Arrow's Information Paradox — Solved

The NDAI paper addresses a fundamental tension identified by Arrow (1962): an inventor must reveal their idea to capture its value, yet revelation risks expropriation. As the paper illustrates through John Harrison's 40-year struggle to receive payment for his marine chronometer, this paradox has plagued innovators for centuries.

The solution: **Trusted Execution Environments (TEEs) combined with AI agents** function as an "ironclad NDA" — enabling disclosure conditional on agreement, with enforcement shifted inside the technology itself.

### How the Frontend Implements NDAI Concepts

| NDAI Concept                         | Frontend Implementation                         |
| ------------------------------------ | ----------------------------------------------- |
| Sealed-bid mechanism                 | `NashBidModal` with client-side hash generation |
| Budget caps (prevent overpayment)    | `requiredDeposit` field in listing form         |
| Acceptance thresholds                | `sellerMin` commitment with salt storage        |
| Nash bargaining price `θ = (1+α₀)/2` | Settlement display in `NashSidebar`             |
| TEE-resident agents                  | Execution interface in `ExecuteModal`           |
| Buyer public key encryption          | Key pair generation in `lib/crypto.ts`          |
| Robustness to agent errors           | Grace periods and phase tracking                |

---

## Table of Contents

- [Theoretical Foundation](#theoretical-foundation-the-ndai-paper)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Key Components](#key-components)
- [Smart Contract Integration](#smart-contract-integration)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### For Sellers (Inventors)

- 📝 **List Inventions** — Upload encrypted code with metadata to IPFS
- 💰 **Two Monetization Models** — Choose Pay-Per-Use or Nash Negotiation
- 🔐 **Sealed Minimum Price** — Commit to minimum acceptable price with cryptographic hash
- 📊 **Revenue Dashboard** — Track executions, revenue, and active negotiations
- ⚙️ **Tiered Pricing** — Configure anti-extraction multipliers (1.5x, 3x, 10x)

### For Buyers (Users)

- 🔍 **Browse Marketplace** — Filter by category, model, and search
- ⚡ **Pay-Per-Use Execution** — Buy credits and execute inventions
- 🎯 **Nash Bidding** — Submit sealed bids with commitment hashes
- 🔑 **Secure Key Delivery** — Generate keypairs for post-sale decryption
- 📈 **Usage Tracking** — Monitor credits, rate limits, and cooldowns

### Platform Features

- 🌐 **Base Sepolia** — Deployed on Base L2 testnet
- 💵 **USDC Payments** — Stable currency for all transactions
- ⏱️ **Block Time Sync** — Accurate deadline countdowns via `useBlockTimeOffset`
- 🎨 **Dark Theme** — Custom "Adytum" design system
- 📱 **Responsive** — Mobile-first design

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND ARCHITECTURE                          │
│              (Implementing NDAI User Interface)                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      Next.js App Router                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │   │
│  │  │  page   │  │  list   │  │invention│  │      vault      │ │   │
│  │  │ (browse)│  │ (create)│  │  [id]   │  │ (seller/buyer)  │ │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └────────┬────────┘ │   │
│  └───────┼────────────┼───────────┼─────────────────┼──────────┘   │
│          │            │           │                 │               │
│  ┌───────┴────────────┴───────────┴─────────────────┴──────────┐   │
│  │                     React Components                         │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐ │   │
│  │  │ Invention  │  │  Execute   │  │      NashBidModal      │ │   │
│  │  │   Card     │  │   Modal    │  │  (sealed-bid + reveal) │ │   │
│  │  └─────┬──────┘  └─────┬──────┘  └───────────┬────────────┘ │   │
│  └────────┼───────────────┼─────────────────────┼──────────────┘   │
│           │               │                     │                   │
│  ┌────────┴───────────────┴─────────────────────┴──────────────┐   │
│  │                         Hooks & Libs                         │   │
│  │  ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐ │   │
│  │  │useBlockTimeOffset│  │  lib/api.ts  │  │ lib/crypto.ts  │ │   │
│  │  │  (deadline sync) │  │ (hash gen)   │  │ (keypair gen)  │ │   │
│  │  └────────┬─────────┘  └──────┬───────┘  └───────┬────────┘ │   │
│  └───────────┼───────────────────┼──────────────────┼───────────┘   │
│              │                   │                  │                │
│  ┌───────────┴───────────────────┴──────────────────┴───────────┐   │
│  │                     wagmi / viem                              │   │
│  │           (Contract reads, writes, event decoding)            │   │
│  └──────────────────────────────┬────────────────────────────────┘   │
│                                 │                                    │
│                                 ▼                                    │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              AdytumMarketplace.sol (Base Sepolia)            │   │
│  │    TEE_EXECUTION_ROLE │ TEE_SETTLEMENT_ROLE │ USDC (6 dec)   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- A wallet with Base Sepolia ETH and USDC for testing

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/adytum-frontend.git
cd adytum-frontend

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local

# Start development server
pnpm dev
```

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=your_gateway.mypinata.cloud
```

---

## Project Structure

```
adytum-frontend/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Marketplace browse page
│   ├── list/page.tsx             # Create listing (PPU/Nash)
│   ├── invention/[id]/page.tsx   # Invention detail view
│   ├── vault/page.tsx            # Seller studio + Buyer hub
│   ├── providers.tsx             # wagmi + RainbowKit + BlockTime
│   ├── layout.tsx                # Root layout
│   └── api/ipfs/route.ts         # IPFS upload endpoint
│
├── components/
│   ├── layout/
│   │   ├── Header.tsx            # Navigation + wallet connect
│   │   └── AdytumLogo.tsx        # Brand logo
│   ├── marketplace/
│   │   ├── InventionCard.tsx     # Listing card (PPU/Nash aware)
│   │   ├── ExecuteModal.tsx      # Execution interface (dual mode)
│   │   └── NashBidModal.tsx      # Sealed-bid + reveal flow
│   └── ui/
│       └── LiveTimeRemaining.tsx # Real-time deadline countdown
│
├── config/
│   ├── wagmi.ts                  # Chain config, USDC helpers
│   └── abi.ts                    # Full contract ABI + ERC20
│
├── hooks/
│   └── useBlockTimeOffset.tsx    # Block time synchronization
│
├── lib/
│   ├── api.ts                    # generateSalt, generateNashBidHash
│   ├── crypto.ts                 # generateBuyerKeyPair, encryptCodeForTEE
│   └── mockData.ts               # Development fixtures
│
├── types/
│   └── index.ts                  # TypeScript definitions
│
└── public/                       # Static assets
```

---

## Key Components

### Nash Bidding Flow (Implementing NDAi Sealed-Bid Mechanism)

The frontend implements the paper's sealed-bid Nash bargaining through a multi-phase flow:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NASH BIDDING LIFECYCLE                        │
│           (Frontend implementation of NDAI §4.1)                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PHASE 0: OPEN (Bid Submission)                                 │
│  ─────────────────────────────                                  │
│  • Buyer enters maxWillingToPay in NashBidModal                 │
│  • Frontend generates: salt = generateSalt()                    │
│  • Frontend computes: bidHash = keccak256(amount || salt)       │
│  • Frontend generates: keypair = generateBuyerKeyPair()         │
│  • Contract call: submitNashBid(id, bidHash, buyerPubKey)       │
│  • localStorage stores: salt, amount, privateKey                │
│                                                                 │
│  PHASE 1: REVEAL                                                │
│  ─────────────────                                              │
│  • Seller calls revealSellerMin(id, minAcceptable, salt)        │
│  • Buyers call revealNashBid(id, maxWillingToPay, salt)         │
│  • Contract verifies hash matches commitment                     │
│  • Frontend retrieves stored salt/amount from localStorage      │
│                                                                 │
│  PHASE 2: SETTLED                                               │
│  ────────────────                                               │
│  • If highestBid ≥ sellerMin:                                   │
│     finalPrice = (highestBid + sellerMin) / 2  [Nash solution]  │
│  • TEE calls releaseEncryptedKey(id, encKey, attestation)       │
│  • Winner decrypts with stored privateKey                       │
│                                                                 │
│  PHASE 3/4: FAILED/EXPIRED                                      │
│  ─────────────────────────                                      │
│  • Refunds available via claimNashRefund()                      │
│  • Deposits returned if seller didn't reveal                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Block Time Synchronization

The `useBlockTimeOffset` hook ensures deadline countdowns are accurate by syncing with on-chain block timestamps:

```typescript
// hooks/useBlockTimeOffset.tsx
const offset = blockTimestamp - Date.now() / 1000;
// All deadline displays use: timestamp + offset
```

This prevents UX issues where client clocks drift from chain time.

### Cryptographic Utilities

```typescript
// lib/api.ts — Commitment scheme (NDAi §4.2)
export function generateNashBidHash(
  amount: bigint,
  salt: `0x${string}`,
): `0x${string}` {
  return keccak256(encodePacked(["uint256", "bytes32"], [amount, salt]));
}

// lib/crypto.ts — Buyer key delivery (NDAI §3.2)
export function generateBuyerKeyPair(): {
  publicKey: string;
  privateKey: string;
} {
  // secp256k1 keypair for encrypted key delivery
}
```

---

## Smart Contract Integration

### Contract Addresses (Base Sepolia)

```typescript
// config/wagmi.ts
export const CONTRACTS = {
  ADYTUM_MARKETPLACE: "0x...", // AdytumMarketplace.sol
  USDC: "0x...", // USDC (6 decimals)
};
```

### Key Contract Interactions

| Action            | Function                          | Frontend Location   |
| ----------------- | --------------------------------- | ------------------- |
| List Pay-Per-Use  | `listPayPerUse(...)`              | `app/list/page.tsx` |
| List Nash         | `listNashNegotiation(...)`        | `app/list/page.tsx` |
| Submit sealed bid | `submitNashBid(id, hash, pubKey)` | `NashBidModal.tsx`  |
| Reveal bid        | `revealNashBid(id, amount, salt)` | `NashBidModal.tsx`  |
| Execute PPU       | `execute(id, inputHash)`          | `ExecuteModal.tsx`  |
| Buy credits       | `buyCredits(id, numCredits)`      | `ExecuteModal.tsx`  |
| Claim key         | `releaseEncryptedKey(...)`        | TEE-initiated       |

### ABI Structure

The frontend uses a comprehensive ABI (`config/abi.ts`) that includes:

- All struct definitions with correct field names
- All Nash phase transitions and events
- ERC20 approval for USDC flows

---

## Development

### Type Definitions

All contract types are mirrored in TypeScript (`types/index.ts`):

```typescript
// Matches contract NashConfig struct (13 fields)
export interface NashConfig {
  sellerBidHash: `0x${string}`;
  sellerMinRevealed: bigint;
  bidDeadline: bigint;
  revealDeadline: bigint;
  requiredDeposit: bigint;
  sellerRevealed: boolean;
  allowTrialsDuring: boolean;
  trialFee: bigint;
  maxTrialsPerBidder: bigint;
  phase: NashPhase;
  highestBidder: `0x${string}`;
  highestBid: bigint;
  sellerBond: bigint;
}
```

### Local Development with Mock Data

For rapid iteration, `lib/mockData.ts` provides fixtures matching contract types:

```bash
# Run with mock data (no contract needed)
pnpm dev
```

### Testing Against Testnet

```bash
# Ensure wallet has Base Sepolia ETH + USDC
# Update CONTRACTS addresses in wagmi.ts
pnpm dev
```

---

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
pnpm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables for Production

```env
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=xxx
NEXT_PUBLIC_PINATA_JWT=xxx
NEXT_PUBLIC_PINATA_GATEWAY=xxx
```

### Build Verification

```bash
pnpm build
pnpm start
```

---

## Security Considerations

### Client-Side Secret Storage

Nash bidding requires storing sensitive data locally:

| Data        | Storage Key                    | Purpose              |
| ----------- | ------------------------------ | -------------------- |
| Bid salt    | `nash_bid_salt_{id}_{addr}`    | Reveal commitment    |
| Bid amount  | `nash_bid_amount_{id}_{addr}`  | Reveal commitment    |
| Private key | `nash_priv_key_{id}_{addr}`    | Decrypt received key |
| Seller salt | `seller_nash_salt_{id}_{addr}` | Seller reveal        |

**Warnings displayed to users:**

- Clear localStorage = lose ability to reveal/decrypt
- Never share private keys
- Back up bid details before clearing browser data

### USDC Approval Flow

All USDC transfers require explicit approval:

```typescript
// Step 1: Approve marketplace
await writeContract({ address: USDC, functionName: "approve", args: [MARKETPLACE, amount] });

// Step 2: Execute action
await writeContract({ address: MARKETPLACE, functionName: "submitNashBid", ... });
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Tailwind CSS for styling
- React Server Components where possible

---

## References

1. Stephenson, M., Miller, A., Sun, X., Annem, B., & Parikh, R. (2025). _NDAi_. arXiv:2502.07924v1 [econ.TH]. https://arxiv.org/abs/2502.07924

2. Arrow, K. J. (1962). Economic welfare and the allocation of resources for invention. _The Rate and Direction of Inventive Activity_.

3. Nelson, R. R. (1959). The simple economics of basic scientific research. _Journal of Political Economy_, 67(3), 297-306.

4. Anton, J. J., & Yao, D. A. (1994). Expropriation and inventions: Appropriable rents in the absence of property rights. _The American Economic Review_, 190-209.

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Links

- **Live App**: [adytum.app](https://adytum.app)
- **Smart Contract**: [GitHub](https://github.com/your-org/adytum-contracts)
- **NDAI Paper**: [arXiv:2502.07924](https://arxiv.org/abs/2502.07924)

---
