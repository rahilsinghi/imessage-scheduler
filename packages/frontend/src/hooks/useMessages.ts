import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessages } from '../api/client';
import type { Message } from '../types';

const POLL_INTERVAL = 5000;

interface UseMessagesResult {
  messages: Message[];
  total: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMessages(): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchMessages = useCallback(async () => {
    try {
      const result = await getMessages();
      if (mountedRef.current) {
        setMessages(result.messages);
        setTotal(result.total);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch messages';
        setError(message);
      }
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchMessages();
    if (mountedRef.current) {
      setLoading(false);
    }
  }, [fetchMessages]);

  useEffect(() => {
    mountedRef.current = true;

    const initialFetch = async () => {
      await fetchMessages();
      if (mountedRef.current) {
        setLoading(false);
      }
    };

    initialFetch();

    const intervalId = setInterval(fetchMessages, POLL_INTERVAL);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [fetchMessages]);

  return { messages, total, loading, error, refetch };
}
