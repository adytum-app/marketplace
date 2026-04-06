"use client";

import Link from "next/link";
import {
  FullInvention,
  CategoryLabels,
  CategoryIcons,
  MonetizationModel,
  ModelLabels,
  NashPhase,
  isPayPerUse,
  isNash,
} from "@/types";
import { formatUSDC } from "@/config/wagmi";
import { LiveTimeRemainingCompact } from "@/components/ui/LiveTimeRemaining";
import { useBlockTimeOffset } from "@/hooks/useBlockTimeOffset";
import {
  Zap,
  Gavel,
  TrendingUp,
  Users,
  Shield,
  ShieldAlert,
} from "lucide-react";

interface InventionCardProps {
  invention: FullInvention;
}

export function InventionCard({ invention }: InventionCardProps) {
  const { metadata, category, model } = invention;
  const { timeOffset } = useBlockTimeOffset();

  return (
    <Link href={`/invention/${invention.id}`}>
      <div className="card group hover:border-adytum-amethyst-500/50 transition-all duration-200 h-full flex flex-col">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-adytum-void-100">
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Category badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-adytum-void-100 text-adytum-smoke-light rounded-full">
              <span>{CategoryIcons[category]}</span>
              {CategoryLabels[category]}
            </span>

            {/* Model badge */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                model === MonetizationModel.PayPerUse
                  ? "bg-adytum-vault/20 text-adytum-vault-light"
                  : "bg-adytum-seal/20 text-adytum-seal-light"
              }`}
            >
              {model === MonetizationModel.PayPerUse ? (
                <Zap className="h-3 w-3" />
              ) : (
                <Gavel className="h-3 w-3" />
              )}
              {ModelLabels[model]}
            </span>
          </div>

          <h3 className="font-display text-lg font-semibold text-white group-hover:text-adytum-amethyst-300 transition-colors line-clamp-2">
            {metadata.title}
          </h3>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 flex flex-col">
          <p className="text-sm text-adytum-smoke line-clamp-2 mb-4">
            {metadata.shortDescription}
          </p>

          {/* Tags */}
          {metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {metadata.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 text-xs bg-adytum-void-100 text-adytum-smoke rounded"
                >
                  {tag}
                </span>
              ))}
              {metadata.tags.length > 3 && (
                <span className="px-2 py-0.5 text-xs text-adytum-smoke">
                  +{metadata.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Model-specific info */}
          {isPayPerUse(invention) && <PayPerUseInfo invention={invention} />}
          {isNash(invention) && (
            <NashInfo invention={invention} timeOffset={timeOffset} />
          )}
        </div>
      </div>
    </Link>
  );
}

function PayPerUseInfo({
  invention,
}: {
  invention: FullInvention & { model: MonetizationModel.PayPerUse };
}) {
  const { config } = invention;

  return (
    <div className="pt-3 border-t border-adytum-void-100 space-y-2">
      {/* Price per call */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-adytum-smoke">Price per call</span>
        <span className="text-sm font-semibold text-adytum-vault-light">
          {formatUSDC(config.pricePerCall)} USDC
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-adytum-smoke">
        <div className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          <span>{config.totalExecutions.toString()} executions</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-adytum-vault-light">
            ${formatUSDC(config.totalRevenue)} earned
          </span>
        </div>
      </div>
    </div>
  );
}

function NashInfo({
  invention,
  timeOffset,
}: {
  invention: FullInvention & { model: MonetizationModel.NashNegotiation };
  timeOffset: bigint;
}) {
  const { config } = invention;
  const deadline =
    config.phase === NashPhase.Open
      ? config.bidDeadline
      : config.revealDeadline;

  return (
    <div className="pt-3 border-t border-adytum-void-100 space-y-2">
      {/* Phase & Time */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
            config.phase === NashPhase.Open
              ? "bg-green-500/20 text-green-400"
              : config.phase === NashPhase.Reveal
                ? "bg-amber-500/20 text-amber-400"
                : config.phase === NashPhase.Settled
                  ? "bg-adytum-vault/20 text-adytum-vault-light"
                  : "bg-red-500/20 text-red-400"
          }`}
        >
          {config.phase === NashPhase.Open && "Accepting Bids"}
          {config.phase === NashPhase.Reveal && "Reveal Phase"}
          {config.phase === NashPhase.Settled && "Settled"}
          {config.phase === NashPhase.Failed && "No Deal"}
          {config.phase === NashPhase.Expired && "Expired"}
        </span>

        {(config.phase === NashPhase.Open ||
          config.phase === NashPhase.Reveal) && (
          <LiveTimeRemainingCompact
            deadline={deadline}
            timeOffset={timeOffset}
          />
        )}
      </div>

      {/* Required Deposit info */}
      {config.requiredDeposit > BigInt(0) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-adytum-smoke flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" />
            Required Deposit
          </span>
          <span className="text-adytum-seal-light font-medium">
            {formatUSDC(config.requiredDeposit)} USDC
          </span>
        </div>
      )}

      {/* Seller Bond indicator (trust signal) */}
      {config.sellerBond > BigInt(0) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-adytum-smoke flex items-center gap-1">
            <Shield className="h-3 w-3 text-green-400" />
            Seller Bonded
          </span>
          <span className="text-green-400 font-medium">
            {formatUSDC(config.sellerBond)} USDC
          </span>
        </div>
      )}

      {/* Trials info */}
      {config.allowTrialsDuring && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-adytum-smoke">Trial fee</span>
          <span className="text-adytum-seal-light">
            {formatUSDC(config.trialFee)} USDC
          </span>
        </div>
      )}

      {/* Bidders count - would come from contract in production */}
      <div className="flex items-center gap-1 text-xs text-adytum-smoke">
        <Users className="h-3 w-3" />
        <span>Sealed-bid negotiation for ownership</span>
      </div>
    </div>
  );
}
