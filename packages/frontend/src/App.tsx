import { useState, useCallback } from 'react';
import { ScheduleForm } from './components/ScheduleForm';
import { MessageList } from './components/MessageList';
import { Dashboard } from './components/Dashboard';
import { Toast } from './components/Toast';
import { useMessages } from './hooks/useMessages';
import { CalendarIcon, BarChartIcon } from './components/Icons';

type Tab = 'scheduler' | 'dashboard';

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

let toastId = 0;

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scheduler');
  const { messages, loading, error, refetch } = useMessages();
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            iMessage Scheduler
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Schedule and manage your iMessages
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 bg-surface rounded-xl shadow-sm mb-6">
          <button
            onClick={() => setActiveTab('scheduler')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'scheduler'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
              }`}
          >
            <CalendarIcon size={16} />
            Scheduler
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-primary'
              }`}
          >
            <BarChartIcon size={16} />
            Dashboard
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'scheduler' ? (
          <div className="space-y-6">
            <ScheduleForm onScheduled={refetch} onToast={showToast} />
            <MessageList
              messages={messages}
              loading={loading}
              error={error}
              onRefetch={refetch}
              onToast={showToast}
            />
          </div>
        ) : (
          <Dashboard onToast={showToast} />
        )}

        {/* Footer */}
        <p className="text-center text-xs text-text-tertiary mt-8">
          Powered by Sendblue
        </p>
      </div>
    </div>
  );
}
