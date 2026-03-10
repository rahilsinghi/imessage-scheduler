import { useState, type FormEvent } from 'react';
import { scheduleMessage } from '../api/client';
import { PaperPlaneIcon } from './Icons';

interface ScheduleFormProps {
  onScheduled: () => void;
  onToast: (message: string, type: 'success' | 'error') => void;
}

export function ScheduleForm({ onScheduled, onToast }: ScheduleFormProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isValid = phoneNumber.trim().length > 0 && content.trim().length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isValid || submitting) return;

    setSubmitting(true);

    try {
      await scheduleMessage(phoneNumber.trim(), content.trim());
      setPhoneNumber('');
      setContent('');
      onToast('Message scheduled successfully', 'success');
      onScheduled();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to schedule message';
      onToast(message, 'error');
    } finally {
      setSubmitting(false);
    }
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isValid || submitting}
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
          {submitting ? 'Scheduling...' : 'Schedule Message'}
        </button>
      </div>
    </form>
  );
}
