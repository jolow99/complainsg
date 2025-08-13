import { MessageStatus, ThreadUserMessagePart } from "@assistant-ui/react";

export interface ChatData {
  userID: string;
  threadID: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  category: string;
  tags: string[];
  headId: string | null;
  topic: string | null;
  location: string | null;
}

export interface MessageData {
  role: MessageRole;
  content: string;
  timestamp: Date;
  messageIndex: number;
} 

export interface DatabaseMessageObject {
  id: string;
  parentId: string | null;
  content: ThreadUserMessagePart[];
  role: MessageRole;
  metadata: Record<string, any>;
  createdAt: Date;
  status: MessageStatus;
}

export type MessageRole = "user" | "assistant" | "system" | "data";