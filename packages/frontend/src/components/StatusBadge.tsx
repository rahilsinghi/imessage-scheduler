import type { MessageStatus } from '../types';
import { CheckIcon } from './Icons';

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

// ─── Status Timeline ────────────────────────────────────────────────────────

interface StatusTimelineProps {
  status: MessageStatus;
}

const TIMELINE_STEPS = ['QUEUED', 'ACCEPTED', 'SENT', 'DELIVERED'] as const;
const STEP_LABELS: Record<string, string> = {
  QUEUED: 'Queued',
  ACCEPTED: 'Accepted',
  SENT: 'Sent',
  DELIVERED: 'Delivered',
};

const STATUS_INDEX: Record<string, number> = {
  QUEUED: 0,
  ACCEPTED: 1,
  SENT: 2,
  DELIVERED: 3,
  RECEIVED: 3,
};

export function StatusTimeline({ status }: StatusTimelineProps) {
  const isFailed = status === 'FAILED';
  const currentIndex = isFailed ? -1 : (STATUS_INDEX[status] ?? 0);

  return (
    <div className="flex items-start w-full" role="progressbar" aria-label={`Message status: ${status}`}>
      {TIMELINE_STEPS.map((step, index) => {
        const isCompleted = !isFailed && index < currentIndex;
        const isActive = !isFailed && index === currentIndex;
        const isReached = !isFailed && index <= currentIndex;

        let dotClass = 'timeline-dot';
        if (isFailed && index === 0) {
          dotClass += ' timeline-dot-failed';
        } else if (isCompleted) {
          dotClass += ' timeline-dot-completed';
        } else if (isActive) {
          dotClass += ' timeline-dot-active';
        }

        return (
          <div key={step} className="timeline-step">
            {/* Connector line (skip for first step) */}
            {index > 0 && (
              <div
                className={`timeline-connector ${isReached ? 'timeline-connector-active' : ''}`}
                style={{
                  left: '-50%',
                  right: '50%',
                  top: '9px',
                }}
              />
            )}

            {/* Dot */}
            <div className={dotClass}>
              {isCompleted && (
                <CheckIcon size={11} className="text-white" />
              )}
              {isFailed && index === 0 && (
                <span className="text-white text-[9px] font-bold leading-none">!</span>
              )}
            </div>

            {/* Label */}
            <span
              className={`text-[10px] mt-1.5 font-medium leading-none ${
                isFailed && index === 0
                  ? 'text-status-failed'
                  : isActive
                    ? 'text-imsg-blue'
                    : isCompleted
                      ? 'text-status-delivered'
                      : 'text-text-tertiary'
              }`}
            >
              {isFailed && index === 0 ? 'Failed' : STEP_LABELS[step]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
