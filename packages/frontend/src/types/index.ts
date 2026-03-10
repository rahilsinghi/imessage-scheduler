export interface Message {
  id: string;
  phoneNumber: string;
  content: string;
  status: MessageStatus;
  scheduledAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MessageStatus =
  | 'QUEUED'
  | 'ACCEPTED'
  | 'SENT'
  | 'DELIVERED'
  | 'RECEIVED'
  | 'FAILED';

export interface Stats {
  queued: number;
  sent: number;
  delivered: number;
  failed: number;
  total: number;
}

export interface Config {
  sendIntervalMs: number;
  messagesPerTick: number;
}

export interface ApiResponse<T> {
  data: T;
}

export interface MessagesResponse {
  data: Message[];
  total: number;
}
