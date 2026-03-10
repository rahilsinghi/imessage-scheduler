import type { Message } from '../types';
import { MessageCard } from './MessageCard';
import { InboxIcon, TimerIcon, ClockIcon, CheckCircleIcon, AlertCircleIcon } from './Icons';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

interface MessageGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  messages: Message[];
  accentClass: string;
}

function groupMessages(messages: readonly Message[]): MessageGroup[] {
  const now = Date.now();

  const upcoming: Message[] = [];
  const queued: Message[] = [];
  const inProgress: Message[] = [];
  const completed: Message[] = [];
  const failed: Message[] = [];

  for (const msg of messages) {
    if (msg.status === 'FAILED') {
      failed.push(msg);
    } else if (msg.status === 'QUEUED' && msg.scheduledFor && new Date(msg.scheduledFor).getTime() > now) {
      upcoming.push(msg);
    } else if (msg.status === 'QUEUED') {
      queued.push(msg);
    } else if (msg.status === 'ACCEPTED') {
      inProgress.push(msg);
    } else {
      completed.push(msg);
    }
  }

  // Sort upcoming by scheduledFor ascending (soonest first)
  const sortedUpcoming = [...upcoming].sort((a, b) => {
    const aTime = a.scheduledFor ? new Date(a.scheduledFor).getTime() : 0;
    const bTime = b.scheduledFor ? new Date(b.scheduledFor).getTime() : 0;
    return aTime - bTime;
  });

  // Sort queued by createdAt descending (newest first)
  const sortedQueued = [...queued].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Sort in-progress by updatedAt descending
  const sortedInProgress = [...inProgress].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  // Sort completed by sentAt or updatedAt descending
  const sortedCompleted = [...completed].sort((a, b) => {
    const aTime = new Date(a.sentAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.sentAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });

  // Sort failed by updatedAt descending
  const sortedFailed = [...failed].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const groups: MessageGroup[] = [];

  if (sortedUpcoming.length > 0) {
    groups.push({
      key: 'upcoming',
      label: 'Upcoming',
      icon: <TimerIcon size={14} />,
      messages: sortedUpcoming,
      accentClass: 'text-imsg-blue',
    });
  }

  if (sortedQueued.length > 0) {
    groups.push({
      key: 'queued',
      label: 'Queued',
      icon: <ClockIcon size={14} />,
      messages: sortedQueued,
      accentClass: 'text-status-queued',
    });
  }

  if (sortedInProgress.length > 0) {
    groups.push({
      key: 'in-progress',
      label: 'In Progress',
      icon: <ClockIcon size={14} />,
      messages: sortedInProgress,
      accentClass: 'text-status-accepted',
    });
  }

  if (sortedCompleted.length > 0) {
    groups.push({
      key: 'completed',
      label: 'Sent & Delivered',
      icon: <CheckCircleIcon size={14} />,
      messages: sortedCompleted,
      accentClass: 'text-status-delivered',
    });
  }

  if (sortedFailed.length > 0) {
    groups.push({
      key: 'failed',
      label: 'Failed',
      icon: <AlertCircleIcon size={14} />,
      messages: sortedFailed,
      accentClass: 'text-status-failed',
    });
  }

  return groups;
}

export function MessageList({ messages, loading, error, onRefetch, onToast }: MessageListProps) {
  const groups = groupMessages(messages);

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-text-primary">Messages</h2>
        {messages.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-2 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
            {messages.length}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="text-center py-6">
          <p className="text-sm text-status-failed mb-2">{error}</p>
          <button
            onClick={onRefetch}
            className="text-sm font-medium text-imsg-blue hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && messages.length === 0 && !error && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 bg-bg-primary animate-pulse">
              <div className="h-4 bg-border rounded w-1/3 mb-3" />
              <div className="h-3 bg-border rounded w-2/3 mb-2" />
              <div className="h-3 bg-border rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && messages.length === 0 && (
        <div className="text-center py-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-bg-primary text-text-tertiary mb-3">
            <InboxIcon size={24} />
          </div>
          <p className="text-sm text-text-secondary font-medium">No messages yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Schedule your first message above
          </p>
        </div>
      )}

      {/* Grouped message list */}
      {groups.length > 0 && (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              {/* Section header */}
              <div className={`section-header flex items-center gap-2 mb-2.5 ${group.accentClass}`}>
                {group.icon}
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {group.label}
                </span>
                <span className="text-xs font-medium opacity-60">
                  ({group.messages.length})
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {group.messages.map((message) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    onCancelled={onRefetch}
                    onToast={onToast}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
