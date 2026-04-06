import { http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// Contract addresses - update after deployment
export const CONTRACTS = {
  ADYTUM_MARKETPLACE:
    "0x0000000000000000000000000000000000000000" as `0x${string}`,
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as `0x${string}`, // Base Sepolia USDC
} as const;

// RainbowKit + wagmi config
export const config = getDefaultConfig({
  appName: "Adytum",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo",
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(
      process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    ),
  },
  ssr: true,
});

// USDC has 6 decimals
export const USDC_DECIMALS = 6;

export function formatUSDC(amount: bigint): string {
  const value = Number(amount) / 10 ** USDC_DECIMALS;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseUSDC(amount: string): bigint {
  const value = parseFloat(amount);
  return BigInt(Math.round(value * 10 ** USDC_DECIMALS));
}
