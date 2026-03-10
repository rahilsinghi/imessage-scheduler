import { useState } from 'react';
import type { Message } from '../types';
import { StatusBadge } from './StatusBadge';
import { PhoneIcon, ClockIcon, XIcon } from './Icons';
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

export function MessageCard({ message, onCancelled, onToast }: MessageCardProps) {
  const [cancelling, setCancelling] = useState(false);

  const canCancel = message.status === 'QUEUED';

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
      <div className="flex items-start justify-between gap-3">
        {/* Left content */}
        <div className="flex-1 min-w-0">
          {/* Phone number row */}
          <div className="flex items-center gap-2 mb-1.5">
            <PhoneIcon size={15} className="text-imsg-blue shrink-0" />
            <span className="font-semibold text-sm text-text-primary truncate">
              {message.phoneNumber}
            </span>
          </div>

          {/* Message content */}
          <p className="text-sm text-text-secondary leading-relaxed mb-2.5 line-clamp-2">
            {message.content}
          </p>

          {/* Timestamp + status row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-text-tertiary">
              <ClockIcon size={13} />
              <span className="text-xs">{formatTimestamp(message.createdAt)}</span>
            </div>
            <StatusBadge status={message.status} />
          </div>
        </div>

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
  );
}
