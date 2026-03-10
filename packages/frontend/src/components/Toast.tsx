import { useEffect, useState } from 'react';
import { CheckCircleIcon, AlertCircleIcon, XIcon } from './Icons';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (exiting) {
      const timer = setTimeout(onClose, 200);
      return () => clearTimeout(timer);
    }
  }, [exiting, onClose]);

  const handleClose = () => {
    setExiting(true);
  };

  const bgColor = type === 'success'
    ? 'bg-white border-green-200'
    : 'bg-white border-red-200';

  const iconColor = type === 'success'
    ? 'text-green-500'
    : 'text-red-500';

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${bgColor} ${exiting ? 'toast-exit' : 'toast-enter'}`}
    >
      <span className={iconColor}>
        {type === 'success' ? <CheckCircleIcon size={20} /> : <AlertCircleIcon size={20} />}
      </span>
      <span className="text-sm font-medium text-text-primary">{message}</span>
      <button
        onClick={handleClose}
        className="ml-2 text-text-tertiary hover:text-text-secondary transition-colors"
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}
