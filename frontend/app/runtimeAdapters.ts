import {
  ChatModelAdapter,
  ThreadHistoryAdapter,
  ThreadListItemRuntime,
} from "@assistant-ui/react";
import {
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  useThreadListItemRuntime,
} from "@assistant-ui/react";
import {
  saveMessageToDB,
  retrieveThreadsFromDB,
  retrieveMessagesFromDB,
  retrieveThreadMetaDataByThreadID,
} from "@/lib/database";
import { ThreadData } from "@/types/chat";
import { parseSSEStream } from "./runtimeUtils";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "@/types/types";
import { GLOBAL_PLACEHOLDERS } from "./constants";

export const messageAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
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
      }
    }

    // REMEMBER TO REMOVE THE METADATA STREAM FROM THE SERVER SIDED @RYAN
  },
};

// Database adapter for thread management
export const myDatabaseAdapter: RemoteThreadListAdapter = {
  async list() {
    // TODO: Implement actual database call to get threads
    console.log("🔍 DATABASE ADAPTER: list() called");

    const threads = await retrieveThreadsFromDB(
      GLOBAL_PLACEHOLDERS.USER_ID_PLACEHOLDER
    );

    const threadList = threads.map((thread) => ({
      status: "regular" as const,
      remoteId: thread.threadID,
      title: thread.title,
    }));

    return {
      threads: threadList,
    };
  },

  // when called from threadListItemRuntime, threadId will be the localId
  // Right now initalize is not using the local threadId, it will always create a new thread in the DB with a new id
  async initialize(threadId: string) {
    const remoteThreadId = `thread_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // // Create new document in chats collection with the provided ID
    try {
      const threadData: ThreadData = {
        userID: GLOBAL_PLACEHOLDERS.USER_ID_PLACEHOLDER,
        threadID: remoteThreadId,
        title: "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "feedback",
        tags: [],
        headId: null,
        topic: null,
        location: null,
        summary: null,
      };

      // Create the chat document in Firestore
      const threadRef = doc(db, "threads", remoteThreadId);
      await setDoc(threadRef, threadData);

      return { remoteId: remoteThreadId, externalId: remoteThreadId };
    } catch (error) {
      return { remoteId: remoteThreadId, externalId: remoteThreadId };
    }
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
  id: string,
  threadListItemRuntime: ThreadListItemRuntime
): ThreadHistoryAdapter {
  return {
    async load() {
      // Fresh thread, dont load anything
      if (id.startsWith("__LOCAL") || !id) {
        return { messages: [] };
      }

      if (!id) return { messages: [] };

      // From DB, load messages
      if (id.startsWith("thread_")) {
        const databaseMessages = await retrieveMessagesFromDB(id);
        const threadMetaData = (await retrieveThreadMetaDataByThreadID(id)) as ThreadData;

        // Convert DatabaseMessageObject[] to ExportedMessageRepositoryItem[]
        const exportedMessages: ExportedMessageRepositoryItem[] =
          databaseMessages.map((dbMsg: any) => ({
            message: {
              id: dbMsg.id,
              role: dbMsg.role,
              content: dbMsg.content,
              createdAt: dbMsg.createdAt,
              metadata: dbMsg.metadata || {},
              // Hardcode status to complete when retrieving from DB, i only save to DB when message is complete
              status: {
                type: "complete",
                reason: "stop",
              },
            },
            parentId: dbMsg.parentId,
          }));

        // Assistant-ui has to change this
        // They force me to include the parentId param in such a weird data struct
        // I assume its because they want to verify the order of the messages in the UI, which is fine
        // But I cant pass it in unordered, because if one of the message reference a message (as a parent) that hasnt been loaded into memory yet, then the whole thing breaks
        // So I have to manually sort it here, and then pass it to the message repository
        const sortedMessages = [...exportedMessages].sort((a, b) => {
          // Use Firestore Timestamp's toDate() method for proper conversion
          const dateA = (a.message.createdAt as any).toDate();
          const dateB = (b.message.createdAt as any).toDate();
          return dateA.getTime() - dateB.getTime(); // Oldest first
        });

        // Package into ExportedMessageRepository format
        const messageRepository: ExportedMessageRepository = {
          headId: threadMetaData.headId,
          messages: sortedMessages,
        };

        return messageRepository;
      }

      return { messages: [] };
    },

    async append(message) {
      let threadId = "";

      // Check if id has the prefix __LOCAL, if it does then its the local id assistant-ui uses so we its a new thread
      if (id.startsWith("__LOCAL")) {
        // When you call threadListItemRuntime.initialize(), it will cascade to initialize function in DB adapter
        // Then it will update the thread sate in the thread state runtime with the correct id (from DB adapter)
        // But if you call the initialize function in DB adapter directly it will not change the thread state it will just create a new thread in the db
        // This should have been documented better
        // Doesnt seem right i had to pass it as a param and call the init process myself on first message
        const { remoteId } = await threadListItemRuntime.initialize();
        threadId = remoteId;
      } else if (id.startsWith("thread_")) {
        threadId = id;
      }

      saveMessageToDB(message, GLOBAL_PLACEHOLDERS.USER_ID_PLACEHOLDER, threadId);

      console.log("🔍 HISTORY ADAPTER: message =", message);
      console.log(
        "🔍 HISTORY ADAPTER: append() called for thread",
        id,
        message
      );
    },
  };
}
