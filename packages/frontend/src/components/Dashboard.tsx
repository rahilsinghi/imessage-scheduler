import { useState, useEffect, type FormEvent } from 'react';
import { useStats } from '../hooks/useStats';
import { getConfig, updateConfig } from '../api/client';
import type { Config } from '../types';
import { InboxIcon, CheckCircleIcon, AlertCircleIcon, ClockIcon } from './Icons';

interface DashboardProps {
  onToast: (message: string, type: 'success' | 'error') => void;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, icon, color, bgColor }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${bgColor} ${color}`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-text-secondary">{label}</span>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

export function Dashboard({ onToast }: DashboardProps) {
  const { stats, loading: statsLoading } = useStats();
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [intervalMs, setIntervalMs] = useState('');
  const [perTick, setPerTick] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchConfig = async () => {
      try {
        const result = await getConfig();
        if (mounted) {
          setConfig(result);
          setIntervalMs(String(result.sendIntervalMs));
          setPerTick(String(result.messagesPerTick));
        }
      } catch {
        // Config fetch failure is non-critical
      } finally {
        if (mounted) setConfigLoading(false);
      }
    };

    fetchConfig();
    return () => { mounted = false; };
  }, []);

  const handleConfigSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const sendIntervalMs = parseInt(intervalMs, 10);
    const messagesPerTick = parseInt(perTick, 10);

    if (isNaN(sendIntervalMs) || sendIntervalMs < 100) {
      onToast('Send interval must be at least 100ms', 'error');
      return;
    }
    if (isNaN(messagesPerTick) || messagesPerTick < 1) {
      onToast('Messages per tick must be at least 1', 'error');
      return;
    }

    setSaving(true);
    try {
      const updated = await updateConfig({ sendIntervalMs, messagesPerTick });
      setConfig(updated);
      onToast('Configuration updated', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update config';
      onToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="bg-surface rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-5">Message Statistics</h2>

        {statsLoading && !stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-xl p-5 bg-bg-primary animate-pulse">
                <div className="h-4 bg-border rounded w-1/2 mb-4" />
                <div className="h-8 bg-border rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Queued"
              value={stats.queued}
              icon={<InboxIcon size={18} />}
              color="text-status-queued"
              bgColor="bg-status-queued-bg"
            />
            <StatCard
              label="Sent"
              value={stats.sent}
              icon={<CheckCircleIcon size={18} />}
              color="text-status-sent"
              bgColor="bg-status-sent-bg"
            />
            <StatCard
              label="Delivered"
              value={stats.delivered}
              icon={<CheckCircleIcon size={18} />}
              color="text-status-delivered"
              bgColor="bg-status-delivered-bg"
            />
            <StatCard
              label="Failed"
              value={stats.failed}
              icon={<AlertCircleIcon size={18} />}
              color="text-status-failed"
              bgColor="bg-status-failed-bg"
            />
          </div>
        ) : null}

        {stats && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-text-secondary">
              Total messages: <span className="font-semibold text-text-primary">{stats.total}</span>
            </p>
          </div>
        )}
      </div>

      {/* Config Section */}
      <div className="bg-surface rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <ClockIcon size={18} className="text-text-secondary" />
          <h2 className="text-lg font-semibold text-text-primary">Send Configuration</h2>
        </div>

        {configLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-bg-primary rounded-xl" />
            <div className="h-10 bg-bg-primary rounded-xl" />
          </div>
        ) : config ? (
          <form onSubmit={handleConfigSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="intervalMs"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Send Interval (ms)
              </label>
              <input
                id="intervalMs"
                type="number"
                min={100}
                step={100}
                value={intervalMs}
                onChange={(e) => setIntervalMs(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary
                  focus:outline-none focus:ring-2 focus:ring-border-focus/30 focus:border-border-focus
                  transition-all duration-200"
                disabled={saving}
              />
              <p className="text-xs text-text-tertiary mt-1">
                How often the scheduler checks for queued messages
              </p>
            </div>

            <div>
              <label
                htmlFor="perTick"
                className="block text-sm font-medium text-text-secondary mb-1.5"
              >
                Messages Per Tick
              </label>
              <input
                id="perTick"
                type="number"
                min={1}
                max={50}
                value={perTick}
                onChange={(e) => setPerTick(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-text-primary
                  focus:outline-none focus:ring-2 focus:ring-border-focus/30 focus:border-border-focus
                  transition-all duration-200"
                disabled={saving}
              />
              <p className="text-xs text-text-tertiary mt-1">
                Maximum messages to send per interval
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl font-semibold text-white text-sm
                bg-gradient-to-r from-blue-500 to-indigo-600
                hover:from-blue-600 hover:to-indigo-700
                active:from-blue-700 active:to-indigo-800
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-sm hover:shadow-md
                transition-all duration-200
                transform active:scale-[0.98]"
            >
              {saving ? 'Saving...' : 'Update Configuration'}
            </button>
          </form>
        ) : (
          <p className="text-sm text-text-tertiary">Could not load configuration</p>
        )}
      </div>
    </div>
  );
}
