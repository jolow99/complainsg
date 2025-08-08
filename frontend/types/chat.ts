export interface ChatData {
  userID: string;
  chatID: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  category: string;
  tags: string[];
}

export interface MessageData {
  role: MessageRole;
  content: string;
  timestamp: Date;
  messageIndex: number;
} 

export type MessageRole = "user" | "assistant" | "system" | "data";