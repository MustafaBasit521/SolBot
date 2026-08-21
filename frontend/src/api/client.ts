import type {
  CheckIn,
  ChatResponse,
  Conversation,
  EmotionalTheme,
  Message,
  MoodTrendPoint,
  User,
} from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8123/api";

const TOKEN_KEY = "solbot_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {
      // response had no JSON body -- fall back to statusText
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export { ApiError };

export function registerUser(email: string, password: string, displayName?: string): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name: displayName ?? null }),
  });
}

export async function login(email: string, password: string): Promise<string> {
  const { access_token } = await request<{ access_token: string; token_type: string }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, password }) },
  );
  return access_token;
}

export function getMe(): Promise<User> {
  return request<User>("/users/me");
}

export function listConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/conversations");
}

export function createConversation(title?: string): Promise<Conversation> {
  return request<Conversation>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title: title ?? null }),
  });
}

export function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`);
}

export function listMessages(conversationId: string): Promise<Message[]> {
  return request<Message[]>(`/conversations/${conversationId}/messages`);
}

export function deleteConversation(conversationId: string): Promise<void> {
  return request<void>(`/conversations/${conversationId}`, { method: "DELETE" });
}

export function deleteAccount(): Promise<void> {
  return request<void>("/users/me", { method: "DELETE" });
}

export function exportMyData(): Promise<unknown> {
  return request<unknown>("/users/me/export");
}

export function sendChatMessage(conversationId: string, content: string): Promise<ChatResponse> {
  return request<ChatResponse>(`/conversations/${conversationId}/chat`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export interface CheckInInput {
  mood: number;
  stress: number;
  energy: number;
  social_connection: number;
  overall_wellbeing: number;
}

export function createCheckIn(payload: CheckInInput): Promise<CheckIn> {
  return request<CheckIn>("/check-ins", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listCheckIns(days?: number): Promise<CheckIn[]> {
  return request<CheckIn[]>(`/check-ins${days ? `?days=${days}` : ""}`);
}

export function getMoodTrend(days = 14): Promise<MoodTrendPoint[]> {
  return request<MoodTrendPoint[]>(`/insights/mood-trend?days=${days}`);
}

export function getEmotionalThemes(days = 14, limit = 6): Promise<EmotionalTheme[]> {
  return request<EmotionalTheme[]>(`/insights/emotional-themes?days=${days}&limit=${limit}`);
}
