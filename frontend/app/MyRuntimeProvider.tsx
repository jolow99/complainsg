"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { saveMessageToDB } from "@/lib/database";

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
              yield data.content;
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

    // Convert assistant-ui message format to backend format
    const requestBody = {
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content
          .map((c) => (c.type === "text" ? c.text : ""))
          .join(""),
      })),
    };

    // POST request to start the flow
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
      saveMessageToDB(latestUserMessage.content, "user", [], "ryan", "123");
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

    for await (const part of stream) {
      text += part;
      yield {
        content: [{ type: "text", text }],
      };
    }

    // Save the assistant's response to DB
    if (text) {
      saveMessageToDB(text, "assistant", [], "ryan", "123");
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
