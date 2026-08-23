export interface User {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  // Only present on user messages that were risk-assessed.
  risk_level: number | null;
}

export interface ChatEmotion {
  primary_emotion: string;
  confidence: number;
  secondary_emotions: { label: string; score: number }[];
}

export interface ChatRisk {
  risk_level: number;
  method: string;
  rationale: string | null;
}

export interface ChatResponse {
  reply: Message;
  emotion: ChatEmotion;
  risk: ChatRisk;
  strategies: string[];
}

export interface CheckIn {
  id: string;
  user_id: string;
  mood: number;
  stress: number;
  energy: number;
  social_connection: number;
  overall_wellbeing: number;
  created_at: string;
}

export interface MoodTrendPoint {
  created_at: string;
  mood: number;
  stress: number;
}

export interface EmotionalTheme {
  label: string;
  count: number;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  is_active: boolean;
  created_at: string;
  // ISO date strings (YYYY-MM-DD) for the last 14 days the goal was
  // marked done -- used to render both "done today" and a streak strip.
  completed_dates: string[];
}

export interface GroundingSession {
  id: string;
  pre_intensity: number;
  post_intensity: number | null;
  completed: boolean;
  created_at: string;
}
