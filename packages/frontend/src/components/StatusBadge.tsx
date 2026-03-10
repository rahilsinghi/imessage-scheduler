import type { MessageStatus } from '../types';

interface StatusBadgeProps {
  status: MessageStatus;
}

const STATUS_CONFIG: Record<MessageStatus, { label: string; className: string }> = {
  QUEUED: {
    label: 'Queued',
    className: 'bg-status-queued-bg text-status-queued',
  },
  ACCEPTED: {
    label: 'Accepted',
    className: 'bg-status-accepted-bg text-status-accepted',
  },
  SENT: {
    label: 'Sent',
    className: 'bg-status-sent-bg text-status-sent',
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-status-delivered-bg text-status-delivered',
  },
  RECEIVED: {
    label: 'Received',
    className: 'bg-status-received-bg text-status-received',
  },
  FAILED: {
    label: 'Failed',
    className: 'bg-status-failed-bg text-status-failed',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}
