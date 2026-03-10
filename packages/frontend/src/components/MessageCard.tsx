import { useState, useEffect } from 'react';
import type { Message } from '../types';
import { StatusTimeline } from './StatusBadge';
import { PhoneIcon, ClockIcon, XIcon, TimerIcon } from './Icons';
import { cancelMessage } from '../api/client';

interface MessageCardProps {
  message: Message;
  onCancelled: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (isToday) {
    return `Today at ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr} at ${timeStr}`;
}

function formatScheduledFor(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function useCountdown(targetIso: string | null, isQueued: boolean): string | null {
  const [display, setDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!targetIso || !isQueued) {
      setDisplay(null);
      return;
    }

    const computeDisplay = (): string | null => {
      const now = Date.now();
      const target = new Date(targetIso).getTime();
      const diff = target - now;

      if (diff <= 0) return null;

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;
        return `${days}d ${remainingHours}h`;
      }
      if (hours > 0) {
        return `${hours}h ${minutes}m`;
      }
      if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
      }
      return `${seconds}s`;
    };

    setDisplay(computeDisplay());

    const intervalId = setInterval(() => {
      const result = computeDisplay();
      setDisplay(result);
      if (result === null) {
        clearInterval(intervalId);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [targetIso, isQueued]);

  return display;
}

function isScheduledForFuture(scheduledFor: string | null): boolean {
  if (!scheduledFor) return false;
  return new Date(scheduledFor).getTime() > Date.now();
}

function getBubbleStyle(status: string): string {
  switch (status) {
    case 'SENT':
    case 'DELIVERED':
    case 'RECEIVED':
      return 'imsg-bubble imsg-bubble-blue';
    case 'FAILED':
      return 'imsg-bubble bg-red-50 text-status-failed';
    default:
      return 'imsg-bubble imsg-bubble-gray';
  }
}

export function MessageCard({ message, onCancelled, onToast }: MessageCardProps) {
  const [cancelling, setCancelling] = useState(false);

  const canCancel = message.status === 'QUEUED';
  const isFuture = isScheduledForFuture(message.scheduledFor);
  const countdown = useCountdown(message.scheduledFor, message.status === 'QUEUED');
  const hasScheduledTime = message.scheduledFor !== null;

  const handleCancel = async () => {
    if (!canCancel || cancelling) return;

    setCancelling(true);
    try {
      await cancelMessage(message.id);
      onToast('Message cancelled', 'success');
      onCancelled();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel message';
      onToast(errorMsg, 'error');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="card-enter bg-surface rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5 group">
      {/* Header row: phone + cancel */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <PhoneIcon size={15} className="text-imsg-blue shrink-0" />
          <span className="font-semibold text-sm text-text-primary truncate">
            {message.phoneNumber}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Countdown badge */}
          {countdown && isFuture && (
            <div className="countdown-active flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-imsg-blue">
              <TimerIcon size={12} />
              <span className="text-xs font-semibold whitespace-nowrap">
                {countdown}
              </span>
            </div>
          )}

          {/* Cancel button */}
          {canCancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              title="Cancel message"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg
                text-text-tertiary hover:text-red-500 hover:bg-red-50
                opacity-0 group-hover:opacity-100
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-200"
            >
              {cancelling ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-red-200 border-t-red-500 rounded-full animate-spin" />
              ) : (
                <XIcon size={14} />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Message bubble */}
      <div className="mb-3">
        <div className={`${getBubbleStyle(message.status)} line-clamp-3`}>
          {message.content}
        </div>
      </div>

      {/* Schedule info */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-1.5 text-text-tertiary">
          <ClockIcon size={13} />
          <span className="text-xs">{formatTimestamp(message.createdAt)}</span>
        </div>
        {hasScheduledTime && isFuture && (
          <div className="flex items-center gap-1.5 text-imsg-blue">
            <TimerIcon size={12} />
            <span className="text-xs font-medium">
              Scheduled for {formatScheduledFor(message.scheduledFor!)}
            </span>
          </div>
        )}
        {hasScheduledTime && !isFuture && message.status === 'QUEUED' && (
          <span className="text-xs text-status-accepted font-medium">
            Ready to send
          </span>
        )}
        {!hasScheduledTime && message.status === 'QUEUED' && (
          <span className="text-xs text-text-tertiary italic">
            Immediate delivery
          </span>
        )}
      </div>

      {/* Status timeline */}
      <div className="pt-2 border-t border-border/60">
        <StatusTimeline status={message.status} />
      </div>
    </div>
  );
}
