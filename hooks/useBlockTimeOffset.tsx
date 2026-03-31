"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { usePublicClient } from "wagmi";

interface BlockTimeContextValue {
  timeOffset: bigint;
  isLoading: boolean;
  lastSyncedAt: number | null;
}

const BlockTimeContext = createContext<BlockTimeContextValue>({
  timeOffset: BigInt(0),
  isLoading: true,
  lastSyncedAt: null,
});

/**
 * BlockTimeProvider - Syncs local clock with blockchain time
 * * Uses lazy polling (every 5 mins) and visibility changes to avoid RPC spam,
 * ensuring accuracy even if the user's computer goes to sleep.
 * * Usage:
 * ```tsx
 * // In layout.tsx or providers.tsx
 * <BlockTimeProvider>
 * <App />
 * </BlockTimeProvider>
 * * // In any component
 * const { timeOffset } = useBlockTimeOffset();
 * <LiveTimeRemaining deadline={deadline} timeOffset={timeOffset} />
 * ```
 */
export function BlockTimeProvider({ children }: { children: ReactNode }) {
  const [timeOffset, setTimeOffset] = useState<bigint>(BigInt(0));
  const [isLoading, setIsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const publicClient = usePublicClient();

  // Memoize the sync function so we can use it in multiple event listeners
  const syncTime = useCallback(async () => {
    if (!publicClient) return;

    try {
      // Fetch the latest block directly instead of subscribing to all blocks
      const block = await publicClient.getBlock({ blockTag: "latest" });
      const localTime = BigInt(Math.floor(Date.now() / 1000));

      // Offset = blockchain time - local time
      // If block says 10:05:00 and local says 10:00:00, offset is +300 seconds
      // If block says 10:00:00 and local says 10:05:00, offset is -300 seconds
      const offset = block.timestamp - localTime;

      setTimeOffset(offset);
      setLastSyncedAt(Date.now());
      setIsLoading(false);

      // Log significant drift for debugging
      const driftSeconds = Number(offset);
      if (Math.abs(driftSeconds) > 60) {
        console.warn(
          `[BlockTimeSync] Significant clock drift detected: ${driftSeconds}s ` +
            `(local clock is ${driftSeconds > 0 ? "behind" : "ahead"} blockchain)`,
        );
      }
    } catch (error) {
      console.error("[BlockTimeSync] Failed to sync block time:", error);
      // Don't update offset on error - keep using last known good value
      setIsLoading(false);
    }
  }, [publicClient]);

  useEffect(() => {
    // 1. Sync immediately on mount
    syncTime();

    // 2. Heartbeat: Sync every 5 minutes (300,000 ms) instead of every block
    const SYNC_INTERVAL_MS = 5 * 60 * 1000;
    const intervalId = setInterval(syncTime, SYNC_INTERVAL_MS);

    // 3. Sleep/Wake handler: Sync immediately when the user returns to the tab
    // This catches scenarios where the computer went to sleep and setInterval paused
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncTime();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncTime]);

  return (
    <BlockTimeContext.Provider value={{ timeOffset, isLoading, lastSyncedAt }}>
      {children}
    </BlockTimeContext.Provider>
  );
}

/**
 * useBlockTimeOffset - Get the current blockchain time offset
 * * @returns {bigint} timeOffset - Seconds to add to local time to get blockchain time
 * @returns {boolean} isLoading - True until first sync completes
 * @returns {number|null} lastSyncedAt - Timestamp of last successful sync
 */
export function useBlockTimeOffset(): BlockTimeContextValue {
  const context = useContext(BlockTimeContext);

  if (context === undefined) {
    // Return safe defaults if used outside provider (graceful degradation)
    return {
      timeOffset: BigInt(0),
      isLoading: false,
      lastSyncedAt: null,
    };
  }

  return context;
}

/**
 * getNetworkTime - Convert local timestamp to blockchain-adjusted timestamp
 * * @param timeOffset - The offset from useBlockTimeOffset()
 * @returns Current time adjusted for blockchain
 */
export function getNetworkTime(timeOffset: bigint): bigint {
  return BigInt(Math.floor(Date.now() / 1000)) + timeOffset;
}
