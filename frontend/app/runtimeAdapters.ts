import React from "react";
import {
  ChatModelAdapter,
  ThreadHistoryAdapter,
  ThreadListItemRuntime,
  ThreadListItemState,
  ThreadMessage as AUI_Message,
} from "@assistant-ui/react";
import { ThreadMetaData } from "@/types/chat";
import {
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  useThreadListItemRuntime,
  useThread,
} from "@assistant-ui/react";
import {
  saveMessageToDB,
  retrieveThreadsFromDB,
  retrieveMessagesFromDB,
  retrieveThreadMetaDataByThreadID,
} from "@/lib/database";
import { ThreadData } from "@/types/chat";
import { parseSSEStream } from "./runtimeUtils";
import { doc, setDoc, DocumentData, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
} from "@/types/types";
import { GLOBAL_PLACEHOLDERS } from "./constants";

// Factory function to create messageAdapter with state injection
export function createMessageAdapter(
  threadListItem: ThreadListItemState
): ChatModelAdapter {
  return {
    async *run({ messages, abortSignal }) {
      // Retrieve threadMetaData from localStorage
      const storage = localStorage.getItem("threadMetaData");
      const metadata = storage ? JSON.parse(storage) : {};
      const remoteId = threadListItem.remoteId;

      console.log(
        "xx [RUN] sending metadata",
        remoteId && metadata[remoteId]
          ? metadata[remoteId]
          : {
              topic: "",
              summary: "",
              location: "",
            }
      );

      // Convert assistant-ui message format to backend format
      const requestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content
            .map((c) => (c.type === "text" ? c.text : ""))
            .join(""),
        })),

        // If remoteId is undefined, then its a new thread, so we need to create a new threadMetaData object
        threadMetaData:
          remoteId && metadata[remoteId]
            ? metadata[remoteId]
            : {
                topic: "",
                summary: "",
                location: "",
                quality: 0,
              },
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
          // Save metadata to localStorage
        } else if (item.type === "metadata") {
          const existingMetaData = localStorage.getItem("threadMetaData");
          const metaDataObj = existingMetaData
            ? JSON.parse(existingMetaData)
            : {};

          let saveKey = "";
          if (remoteId) {
            saveKey = remoteId;
          } else {
            // Bridge the localId to the remoteId from db adapter
            const idMapStorage = localStorage.getItem("threadIdMap");
            const idMap = idMapStorage ? JSON.parse(idMapStorage) : {};
            const mappedRemote = idMap[threadListItem.id];
            saveKey = mappedRemote || threadListItem.id;
          }
          metaDataObj[saveKey] = {
            topic: item.data.threadMetaData["complaint_topic"] || "",
            summary: item.data.threadMetaData["complaint_summary"] || "",
            location: item.data.threadMetaData["complaint_location"] || "",
            quality: item.data.threadMetaData["complaint_quality"] || 0,
          };

          console.log("xx [RUN] metadata", metaDataObj);

          localStorage.setItem("threadMetaData", JSON.stringify(metaDataObj));
        }
      }
    },
  };
}

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
      id: thread.localId,
      title: thread.title,
    }));

    return {
      threads: threadList,
    };
  },

  // when called from threadListItemRuntime, threadId will be the localId
  // Right now initalize is not using the local threadId, it will always create a new thread in the DB with a new id
  async initialize(threadId: string) {
    console.log("xx [INITIALIZE] initialize called");
    console.log("xx [INITIALIZE] threadId", threadId);
    const remoteThreadId = `thread_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // // Create new document in chats collection with the provided ID
    try {
      const threadData: ThreadData = {
        userID: GLOBAL_PLACEHOLDERS.USER_ID_PLACEHOLDER,
        threadID: remoteThreadId,
        localId: threadId,
        title: "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "feedback",
        tags: [],
        headId: null,
        topic: null,
        location: null,
        summary: null,
        quality: 0,
      };

      // Create the chat document in Firestore
      const threadRef = doc(db, "threads", remoteThreadId);
      await setDoc(threadRef, threadData);

      // Map localId -> remoteId in localStorage
      const idMapStorage = localStorage.getItem("threadIdMap");
      const idMap = idMapStorage ? JSON.parse(idMapStorage) : {};
      idMap[threadId] = remoteThreadId;
      localStorage.setItem("threadIdMap", JSON.stringify(idMap));

      return { remoteId: remoteThreadId, externalId: remoteThreadId };
    } catch (error) {
      // Even if Firestore write failed, still record the mapping so UI can proceed
      const idMapStorage = localStorage.getItem("threadIdMap");
      const idMap = idMapStorage ? JSON.parse(idMapStorage) : {};
      idMap[threadId] = remoteThreadId;
      localStorage.setItem("threadIdMap", JSON.stringify(idMap));
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

  async generateTitle(remoteId: string, messages: AUI_Message[]) {
    // TODO: Implement actual title generation
    console.log("🔍 DATABASE ADAPTER: generateTitle() called", remoteId);
    return new ReadableStream();
  },
};

// Abstract ThreadHistoryAdapter into its own function
export function createThreadHistoryAdapter(
  id: string,
  remoteId: string | undefined,
  threadListItemRuntime: ThreadListItemRuntime
): ThreadHistoryAdapter {
  return {
    async load() {
      // Fresh thread, dont load anything
      if (!remoteId) {
        return { messages: [] };
      }

      const databaseMessages = await retrieveMessagesFromDB(remoteId);
      const threadMetaData = (await retrieveThreadMetaDataByThreadID(
        remoteId
      )) as ThreadData;

      // Convert DatabaseMessageObject[] to ExportedMessageRepositoryItem[]
      const exportedMessages: ExportedMessageRepositoryItem[] =
        databaseMessages.map((dbMsg: DocumentData) => ({
          message: {
            id: dbMsg.id,
            role: dbMsg.role,
            content: dbMsg.content,
            createdAt: (dbMsg.createdAt as Timestamp).toDate(),
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
        console.log("xx [LOAD] a.message.createdAt", a.message.createdAt);
        console.log("xx [LOAD] b.message.createdAt", b.message.createdAt);
        console.log(
          "xx [LOAD] typeof a.message.createdAt",
          typeof a.message.createdAt
        );
        const dateA = a.message.createdAt as Date;
        const dateB = b.message.createdAt as Date;
        return dateA.getTime() - dateB.getTime(); // Oldest first
      });

      // Package into ExportedMessageRepository format
      const messageRepository: ExportedMessageRepository = {
        headId: threadMetaData.headId,
        messages: sortedMessages,
      };

      return messageRepository;

      return { messages: [] };
    },

    async append(message) {
      console.log("xx [APPEND] append called");
      console.log("xx [APPEND] localId", id);
      console.log("xx [APPEND] remoteId", remoteId);
      let threadId = "";

      // Check if id has the prefix __LOCAL, if it does then its the local id assistant-ui uses so we its a new thread
      if (id.startsWith("__LOCAL")) {
        console.log("🔍 HISTORY ADAPTER: append() called for local thread", id);
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

      const metadata = localStorage.getItem("threadMetaData");
      const metaDataObj = metadata ? JSON.parse(metadata) : {};
      const threadMetaData = metaDataObj[threadId];

      saveMessageToDB(
        message,
        GLOBAL_PLACEHOLDERS.USER_ID_PLACEHOLDER,
        threadId,
        threadMetaData ?? {
          topic: "",
          summary: "",
          location: "",
          quality: 0,
        }
      );
    },
  };
}
