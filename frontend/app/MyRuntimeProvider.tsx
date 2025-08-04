"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";

// Helper function to parse SSE stream
async function* parseSSEStream(response: Response) {
  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  console.log("🔄 Starting to read stream...");

  try {
    while (true) {
      const { done, value } = await reader.read();
      console.log("📖 Read chunk:", { done, valueLength: value?.length });
      
      if (done) {
        console.log("✅ Stream reading completed");
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      console.log("🔤 Decoded chunk:", chunk);
      
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonPart = line.slice(6);
          console.log("🧩 Processing JSON:", jsonPart);
          
          try {
            const data = JSON.parse(jsonPart);
            console.log("📊 Parsed data:", data);
            
            if (data.content) {
              yield data.content;
            } else if (data.done) {
              console.log("🏁 Stream completed");
              return;
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.warn("⚠️ Failed to parse SSE data:", line, e);
          }
        }
      }
    }
  } finally {
    console.log("🔚 Releasing reader lock");
    reader.releaseLock();
  }
}

const MyModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    console.log("🚀 MyModelAdapter.run called with messages:", messages);
    
    const requestBody = {
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content.map(c => c.type === "text" ? c.text : "").join("")
      }))
    };
    console.log("📤 Sending request:", requestBody);

    const response = await fetch("http://localhost:8000/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: abortSignal,
    });

    console.log("📥 Response received:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const stream = parseSSEStream(response);
    let text = "";
    
    for await (const part of stream) {
      text += part;
      console.log("🎯 Yielding text:", text);
      yield {
        content: [{ type: "text", text }],
      };
    }
  },
};

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  console.log("🏗️ MyRuntimeProvider rendering");
  
  const runtime = useLocalRuntime(MyModelAdapter);
  console.log("🔌 Runtime created:", runtime);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}