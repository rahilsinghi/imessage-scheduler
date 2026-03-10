import type { Message, MessagesResponse, ApiResponse, Stats, Config } from '../types';

const BASE_URL = '/api';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error ?? parsed.message ?? body;
    } catch {
      message = body || `Request failed with status ${response.status}`;
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<T>;
}

export async function scheduleMessage(
  phoneNumber: string,
  content: string,
): Promise<Message> {
  const result = await request<ApiResponse<Message>>('/messages', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, content }),
  });
  return result.data;
}

export async function getMessages(status?: string): Promise<{ messages: Message[]; total: number }> {
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  const result = await request<MessagesResponse>(`/messages${params}`);
  return { messages: result.data, total: result.total };
}

export async function getMessage(id: string): Promise<Message> {
  const result = await request<ApiResponse<Message>>(`/messages/${id}`);
  return result.data;
}

export async function cancelMessage(id: string): Promise<boolean> {
  const result = await request<ApiResponse<{ success: boolean }>>(`/messages/${id}`, {
    method: 'DELETE',
  });
  return result.data.success;
}

export async function getStats(): Promise<Stats> {
  const result = await request<ApiResponse<Stats>>('/stats');
  return result.data;
}

export async function getConfig(): Promise<Config> {
  const result = await request<ApiResponse<Config>>('/config');
  return result.data;
}

export async function updateConfig(
  config: Partial<Config>,
): Promise<Config> {
  const result = await request<ApiResponse<Config>>('/config', {
    method: 'PUT',
    body: JSON.stringify(config),
  });
  return result.data;
}
