import {
  ChatModelAdapter,
  ThreadHistoryAdapter,
  ThreadMessage,
} from "@assistant-ui/react";
import { unstable_RemoteThreadListAdapter as RemoteThreadListAdapter } from "@assistant-ui/react";
import {
  saveMessageToDB,
  saveChatMetadataToDB,
  retrieveThreadsFromDB,
  retrieveMessagesFromDB,
} from "@/lib/database";
import { parseSSEStream } from "./runtimeUtils";

export type ExportedMessageRepository = {
  /** ID of the head message, or null/undefined if no head */
  headId?: string | null;
  /** Array of all messages with their parent references */
  messages: Array<{
    message: ThreadMessage;
    parentId: string | null;
  }>;
};

export const messageAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const chatID = "This is a test chat ID"; // Extract for reuse
    const userID = "Ronald Weasley";

    // Convert assistant-ui message format to backend format
    const requestBody = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .map((c) => (c.type === "text" ? c.text : ""))
          .join(""),
      })),
    };

    // POST request contains : entire message history + metadata + topic
    const flowResponse = await fetch("http://localhost:8000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    if (!flowResponse.ok) {
      throw new Error(`Flow start failed! status: ${flowResponse.status}`);
    }

    // Make sure the tasks has started
    const { task_id } = await flowResponse.json();

    // Latest user message
    const latestUserMessage =
      requestBody.messages[requestBody.messages.length - 1];

    if (latestUserMessage && latestUserMessage.role === "user") {
      // Firing this async with no await not sure if this is best practice but its quicker
      saveMessageToDB(latestUserMessage.content, "user", [], userID, chatID);
    }

    // Get the stream response with GET
    const response = await fetch(
      `http://localhost:8000/api/chat/stream/${task_id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const stream = parseSSEStream(response);
    let text = "";

    for await (const item of stream) {
      if (item.type === "content") {
        text += item.data;
        yield {
          content: [{ type: "text", text }],
        };
      } else if (item.type === "metadata") {
        // Handle metadata here outside of parseSSEStream
        console.log("🔍 Saving metadata to DB");
        console.log("🔍 Metadata:", item.data);
        saveChatMetadataToDB(
          item.data.complaintTopic,
          item.data.complaintMetadata,
          chatID
        );
      }
    }

    // Save the assistant's response to DB
    if (text) {
      saveMessageToDB(text, "assistant", [], userID, chatID);
    }
  },
};

// Database adapter for thread management
export const myDatabaseAdapter: RemoteThreadListAdapter = {
  async list() {
    // TODO: Implement actual database call to get threads
    console.log("🔍 DATABASE ADAPTER: list() called");

    // change to const userID = getCurrentUser() from auth system after im done with that
    const userID = "Ronald Weasley";

    const threads = await retrieveThreadsFromDB(userID);

    console.log("🔍 DATABASE ADAPTER: threads =", threads);

    const threadList = threads.map((thread) => ({
      status: "regular" as const,
      remoteId: thread.chatID,
      title: thread.title,
    }));

    return {
      threads: threadList,
    };
  },

  async initialize(threadId: string) {
    // TODO: Implement actual database call to create thread
    console.log("🔍 DATABASE ADAPTER: initialize() called with", threadId);
    return { remoteId: threadId, externalId: "externalId" };
  },

  async rename(remoteId: string, newTitle: string) {
    // TODO: Implement actual database call to rename thread
    console.log("🔍 DATABASE ADAPTER: rename() called", remoteId, newTitle);
  },

  async archive(remoteId: string) {
    // TODO: Implement actual database call to archive thread
    console.log("🔍 DATABASE ADAPTER: archive() called", remoteId);
  },

  async unarchive(remoteId: string) {
    // TODO: Implement actual database call to unarchive thread
    console.log("🔍 DATABASE ADAPTER: unarchive() called", remoteId);
  },

  async delete(remoteId: string) {
    // TODO: Implement actual database call to delete thread and messages
    console.log("🔍 DATABASE ADAPTER: delete() called", remoteId);
  },

  async generateTitle(remoteId: string, messages: any[]) {
    // TODO: Implement actual title generation
    console.log("🔍 DATABASE ADAPTER: generateTitle() called", remoteId);
    return new ReadableStream();
  },
};

// Abstract ThreadHistoryAdapter into its own function
export function createThreadHistoryAdapter(
  id: string | undefined
): ThreadHistoryAdapter {
  return {
    async load() {

      console.log("🔍 HISTORY ADAPTER: remoteId =", id);
      if (!id) return { messages: [] };
      console.log("🔍 HISTORY ADAPTER: load() called for thread", id);
      // const messages = await retrieveMessagesFromDB(remoteId);

      // Check if messages exist in localStorage
      const localStorageMessages = localStorage.getItem("thread_messages");
      const messagesFromLocalStorage: ThreadMessage[] = JSON.parse(
        localStorageMessages || "[]"
      );

      console.log("🔍 HISTORY ADAPTER: messagesFromLocalStorage =", messagesFromLocalStorage);

      const messagePayload: Array<{
        message: ThreadMessage;
        parentId: string | null;
      }> = messagesFromLocalStorage.map(
        (msg: ThreadMessage, index: number) => ({
          message: msg,
          parentId: index === 0 ? null : messagesFromLocalStorage[index - 1].id,
        })
      );

      const messagesList: ExportedMessageRepository = {
        headId: messagesFromLocalStorage[messagesFromLocalStorage.length - 1].id,
        messages: messagePayload,
      };

      console.log("🔍 HISTORY ADAPTER: messagesList =", messagesList);
      return messagesList;
    },

    async append(message) {
      // this doesnt seem right, i shouldnt have to call initalize myself, i feel like the devs for this package will fix this on stable release and there will no need for this
      let threadId = "";
      if (!id) {
        // Create a new thread if current thread is not initialized (on first message probably)
        const { remoteId } = await myDatabaseAdapter.initialize("PLEASE WORK");
        threadId = remoteId;
      }

      console.log("🔍 HISTORY ADAPTER: threadId =", threadId);

      console.log(
        "🔍 HISTORY ADAPTER: append() called for thread",
        id,
        message
      );

      // TODO: Implement actual database call to save message
      console.log(
        "🔍 HISTORY ADAPTER: append() called for thread",
        id,
        message
      );
    },
  };
}
