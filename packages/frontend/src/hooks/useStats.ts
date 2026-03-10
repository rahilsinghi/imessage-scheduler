import { useState, useEffect, useCallback, useRef } from 'react';
import { getStats } from '../api/client';
import type { Stats } from '../types';

const POLL_INTERVAL = 5000;

interface UseStatsResult {
  stats: Stats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStats(): UseStatsResult {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getStats();
      if (mountedRef.current) {
        setStats(result);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch stats';
        setError(message);
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchStats();
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => {
    mountedRef.current = true;

    const initialFetch = async () => {
      await fetchStats();
      if (mountedRef.current) {
        setLoading(false);
      }
    };

    initialFetch();

    const intervalId = setInterval(fetchStats, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch };
}
