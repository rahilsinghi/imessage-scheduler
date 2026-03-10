import type { Message } from '../types';
import { MessageCard } from './MessageCard';
import { InboxIcon } from './Icons';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onRefetch: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

const STATUS_ORDER: Record<string, number> = {
  QUEUED: 0,
  ACCEPTED: 1,
  SENT: 2,
  DELIVERED: 3,
  RECEIVED: 4,
  FAILED: 5,
};

function sortMessages(messages: readonly Message[]): Message[] {
  return [...messages].sort((a, b) => {
    const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
    if (statusDiff !== 0) return statusDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function MessageList({ messages, loading, error, onRefetch, onToast }: MessageListProps) {
  const sorted = sortMessages(messages);

  return (
    <div className="bg-surface rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-lg font-semibold text-text-primary">Scheduled Messages</h2>
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
          <p className="text-sm text-text-secondary font-medium">No scheduled messages yet</p>
          <p className="text-xs text-text-tertiary mt-1">
            Schedule your first message above
          </p>
        </div>
      )}

      {/* Message list */}
      {sorted.length > 0 && (
        <div className="space-y-3">
          {sorted.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              onCancelled={onRefetch}
              onToast={onToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
