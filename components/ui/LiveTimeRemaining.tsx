"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface LiveTimeRemainingProps {
  deadline: bigint;
  timeOffset?: bigint; // Blockchain time offset (blockchain - local)
  onExpire?: () => void;
  showIcon?: boolean;
  className?: string;
  urgentClassName?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  expired: boolean;
}

function getTimeRemaining(
  deadline: bigint,
  timeOffset: bigint = BigInt(0),
): TimeRemaining {
  // Adjust local time by offset to get blockchain-equivalent time
  const localNow = BigInt(Math.floor(Date.now() / 1000));
  const networkNow = localNow + timeOffset;
  const remaining = deadline - networkNow;

  if (remaining <= BigInt(0)) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      expired: true,
    };
  }

  const totalSeconds = Number(remaining);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, expired: false };
}

function formatTime(time: TimeRemaining): string {
  if (time.expired) return "Expired";
  if (time.days > 0) return `${time.days}d ${time.hours}h`;
  if (time.hours > 0) return `${time.hours}h ${time.minutes}m`;
  if (time.minutes > 5) return `${time.minutes}m`;
  if (time.minutes > 0) return `${time.minutes}m ${time.seconds}s`;
  return `${time.seconds}s`;
}

/**
 * LiveTimeRemaining - Countdown with adaptive tick rate
 *
 * Tick rates:
 * - > 1 hour: every 60 seconds
 * - > 5 minutes: every 30 seconds
 * - < 5 minutes: every 1 second (builds tension!)
 * - Expired: stops ticking
 *
 * @param timeOffset - Blockchain time offset from useBlockTimeOffset().
 *                     If user's clock is 5min behind blockchain, offset = +300.
 *                     This prevents "you have 5min left" when blockchain says 0.
 */
export function LiveTimeRemaining({
  deadline,
  timeOffset = BigInt(0),
  onExpire,
  showIcon = true,
  className = "",
  urgentClassName = "text-red-400 animate-pulse",
}: LiveTimeRemainingProps) {
  // null until after first commit — avoids hydration mismatch (server vs client clock)
  const [time, setTime] = useState<TimeRemaining | null>(null);
  const onExpireRef = useRef(onExpire);
  useLayoutEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    queueMicrotask(() => {
      setTime(getTimeRemaining(deadline, timeOffset));
    });
  }, [deadline, timeOffset]);

  // Adaptive tick rate based on time remaining
  const tickRate = useMemo(() => {
    if (!time || time.expired) return null; // Stop ticking
    if (time.totalSeconds <= 360) return 1000; // < 5 min: every 1 second
    if (time.totalSeconds <= 3600) return 30_000; // < 1 hour: every 30 seconds
    return 60_000; // > 1 hour: every 60 seconds
  }, [time]);

  useEffect(() => {
    if (tickRate === null) return;

    const interval = setInterval(() => {
      const newTime = getTimeRemaining(deadline, timeOffset);
      setTime(newTime);

      if (newTime.expired) {
        onExpireRef.current?.();
      }
    }, tickRate);

    return () => clearInterval(interval);
  }, [deadline, tickRate, timeOffset]);

  // Show placeholder during SSR / before first client update
  if (!time) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium ${className}`}
      >
        {showIcon && <Clock className="h-4 w-4" />}
        <span className="opacity-50">--:--</span>
      </span>
    );
  }

  // Determine urgency level
  const isUrgent = time.totalSeconds <= 300 && !time.expired; // < 5 minutes
  const isCritical = time.totalSeconds <= 60 && !time.expired; // < 1 minute

  const displayClass = time.expired
    ? "text-red-500"
    : isCritical
      ? urgentClassName
      : isUrgent
        ? "text-yellow-400"
        : className;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium ${displayClass}`}
    >
      {showIcon &&
        (isUrgent || time.expired ? (
          <AlertTriangle className="h-4 w-4" />
        ) : (
          <Clock className="h-4 w-4" />
        ))}
      {formatTime(time)}
    </span>
  );
}

/**
 * Compact version for table rows / cards
 */
export function LiveTimeRemainingCompact({
  deadline,
  timeOffset = BigInt(0),
  onExpire,
}: {
  deadline: bigint;
  timeOffset?: bigint;
  onExpire?: () => void;
}) {
  return (
    <LiveTimeRemaining
      deadline={deadline}
      timeOffset={timeOffset}
      onExpire={onExpire}
      showIcon={false}
      className="text-sm text-white"
      urgentClassName="text-sm text-red-400 animate-pulse font-semibold"
    />
  );
}
