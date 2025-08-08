"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { saveMessageToDB, saveChatMetadataToDB } from "@/lib/database";

// Helper function to parse SSE stream
async function* parseSSEStream(response: Response) {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });

      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonPart = line.slice(6);

          try {
            const data = JSON.parse(jsonPart);

            if (data.content) {
              yield { type: "content", data: data.content };
            } else if (data.type === "metadata") {
              yield { type: "metadata", data: data };
            } else if (data.done) {
              return;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const MyModelAdapter: ChatModelAdapter = {
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
    const latestUserMessage = requestBody.messages[requestBody.messages.length - 1];

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
        saveChatMetadataToDB(item.data.complaintTopic, item.data.complaintMetadata, chatID);
      }
    }

    // Save the assistant's response to DB
    if (text) {
      saveMessageToDB(text, "assistant", [], userID, chatID);
    }

  },
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const runtime = useLocalRuntime(MyModelAdapter);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
