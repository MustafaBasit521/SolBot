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
