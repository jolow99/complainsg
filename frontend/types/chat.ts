export interface ChatData {
  userID: string;
  chatID: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  category: string;
  tags: string[];
}

export interface MessageData {
  role: "user" | "assistant" | "system" | "data";
  content: string;
  timestamp: Date;
  messageIndex: number;
} 