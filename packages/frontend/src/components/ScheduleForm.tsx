import { useState, useMemo, type FormEvent } from 'react';
import { scheduleMessage } from '../api/client';
import { PaperPlaneIcon, TimerIcon, ClockIcon } from './Icons';

interface ScheduleFormProps {
  onScheduled: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatScheduledTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function ScheduleForm({ onScheduled, onToast }: ScheduleFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [content, setContent] = useState('');
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const minDatetime = useMemo(() => {
    const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return toLocalDatetimeString(fiveMinFromNow);
  }, []);

  const isValid = phoneNumber.trim().length > 0 && content.trim().length > 0;
  const scheduledForIso = scheduleLater && scheduledFor
    ? new Date(scheduledFor).toISOString()
    : undefined;
  const isScheduleValid = !scheduleLater || (scheduleLater && scheduledFor.length > 0);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValid || !isScheduleValid || submitting) return;

    setSubmitting(true);

    try {
      await scheduleMessage(phoneNumber.trim(), content.trim(), scheduledForIso);
      setPhoneNumber('');
      setContent('');
      setScheduledFor('');
      const successMsg = scheduledForIso
        ? `Message scheduled for ${formatScheduledTime(scheduledForIso)}`
        : 'Message queued for immediate delivery';
      onToast(successMsg, 'success');
      onScheduled();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule message';
      onToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSchedule = () => {
    setScheduleLater((prev) => {
      if (prev) setScheduledFor('');
      return !prev;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-surface rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-5">
        New Message
      </h2>

      <div className="space-y-4">
        {/* Phone Number */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Phone Number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="+1 (555) 000-0000"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-border-focus/30 focus:border-border-focus
              transition-all duration-200"
            disabled={submitting}
          />
        </div>

        {/* Message Content */}
        <div>
          <label
            htmlFor="content"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Message
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your message here..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary placeholder:text-text-tertiary
              resize-none
              focus:outline-none focus:ring-2 focus:ring-border-focus/30 focus:border-border-focus
              transition-all duration-200"
            disabled={submitting}
          />
        </div>

        {/* Schedule Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSchedule}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-border-focus/30
              ${scheduleLater ? 'bg-imsg-blue' : 'bg-border'}`}
            role="switch"
            aria-checked={scheduleLater}
            aria-label="Schedule for later"
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200
                ${scheduleLater ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
          <div className="flex items-center gap-1.5">
            <TimerIcon size={15} className={scheduleLater ? 'text-imsg-blue' : 'text-text-tertiary'} />
            <span className={`text-sm font-medium ${scheduleLater ? 'text-text-primary' : 'text-text-secondary'}`}>
              Schedule for later
            </span>
          </div>
        </div>

        {/* Date/Time Picker (collapsible) */}
        <div className={`schedule-panel ${scheduleLater ? 'schedule-panel-open' : 'schedule-panel-closed'}`}>
          <div className="pt-1">
            <label
              htmlFor="scheduledFor"
              className="block text-sm font-medium text-text-secondary mb-1.5"
            >
              Send at
            </label>
            <input
              id="scheduledFor"
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={minDatetime}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary
                focus:outline-none focus:ring-2 focus:ring-border-focus/30 focus:border-border-focus
                transition-all duration-200"
              disabled={submitting}
            />
            {scheduledFor && (
              <div className="flex items-center gap-1.5 mt-2 text-imsg-blue">
                <ClockIcon size={13} />
                <span className="text-xs font-medium">
                  {formatScheduledTime(new Date(scheduledFor).toISOString())}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || !isScheduleValid || submitting}
          className="w-full flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-white text-sm
            bg-gradient-to-r from-blue-500 to-indigo-600
            hover:from-blue-600 hover:to-indigo-700
            active:from-blue-700 active:to-indigo-800
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-500 disabled:hover:to-indigo-600
            shadow-sm hover:shadow-md
            transition-all duration-200
            transform active:scale-[0.98]"
        >
          {submitting ? (
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <PaperPlaneIcon size={16} />
          )}
          {submitting
            ? 'Scheduling...'
            : scheduleLater && scheduledFor
              ? 'Schedule Message'
              : 'Send Now'}
        </button>
      </div>
    </form>
  );
}
