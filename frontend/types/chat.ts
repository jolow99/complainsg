import { MessageStatus, ThreadUserMessagePart } from "@assistant-ui/react";

export interface ThreadData {
  userID: string;
  threadID: string;
  localId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  category: string;
  tags: string[];
  headId: string | null;
  topic: string | null;
  location: string | null;
  summary: string | null;
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

export type ThreadMetaData = Record<string, {
  topic: string;
  summary: string;
  location: string;
}>;

export type MessageRole = "user" | "assistant" | "system" | "data";
