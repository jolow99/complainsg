"use client";

import {
  ChatHandler,
  ChatSection as ChatSectionUI,
  Message,
} from "@llamaindex/chat-ui";

import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import "@llamaindex/chat-ui/styles/editor.css";
import { useState, useEffect, useRef } from "react";

const initialMessages: Message[] = [];

export function ChatSection() {
  // You can replace the handler with a useChat hook from Vercel AI SDK
  const handler = useMockChat(initialMessages);
  return (
    <div className="w-1/2 flex max-h-[80vh] flex-col gap-6 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chat Interface</h2>
        {handler.isLoading && (
          <button
            onClick={() => {}}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Stop Generation
          </button>
        )}
      </div>
      <ChatSectionUI handler={handler} />
    </div>
  );
}

// For reference lol

// interface Message {
//   content: string;
//   role: MessageRole;
//   annotations?: JSONValue[];
// }

function useMockChat(initMessages: Message[]): ChatHandler {
  const [messages, setMessages] = useState<Message[]>(initMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to WebSocket on component mount
    const ws = new WebSocket("ws://127.0.0.1:8000/ws");
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle welcome message
        if (data.type === "connection") {
          console.log("🔵 setMessages called from: WebSocket connection message");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
            },
          ]);
        }

        // Handle message received acknowledgment
        if (data.type === "message_received") {
          // Temporarily remove the acknowledgment message from UI for cleaner chat
          // setMessages(prev => [...prev, {
          //   role: 'assistant',
          //   content: data.content
          // }])
        }

        // Handle stream chunks (word-by-word streaming)
        if (data.type === "chunk") {
          console.log("🔵 setMessages called from: WebSocket chunk message");
          // Update or create a new assistant message
          setMessages((prev) => {
            console.log("Received chunk:", data.content);

            const lastMessage = prev[prev.length - 1];

            // If the last message is from assistant, append to it
            if (lastMessage && lastMessage.role === "assistant") {
              // Correct, immutable update:
              // 1. Create a new message object with the updated content
              const updatedLastMessage = {
                ...lastMessage,
                content: lastMessage.content + data.content,
              };

              // 2. Return a new array containing all messages except the last, plus our new updated one.
              return [...prev.slice(0, -1), updatedLastMessage];
            } else {
              // Create new assistant message
              return [
                ...prev,
                {
                  role: "assistant",
                  content: data.content,
                },
              ];
            }
          });
        }

        // Handle stream completion
        if (data.type === "stream_complete") {
          // Stream is complete, no additional action needed
          console.log("Stream completed");
        }

        // Handle legacy llm_output (fallback)
        if (data.type === "llm_output") {
          console.log("🔵 setMessages called from: WebSocket llm_output message");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.content,
            },
          ]);
        }

        // Handle interrupt acknowledgment
        if (data.type === "interrupt_acknowledged") {
          console.log("🔵 setMessages called from: WebSocket interrupt_acknowledged message");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.message,
            },
          ]);
        }

        // Handle errors
        if (data.type === "error") {
          console.log("🔵 setMessages called from: WebSocket error message");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Error: ${data.message}`,
            },
          ]);
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, []);

  const append = async (message: Message) => {
    setIsLoading(true);

    // Add user message to chat
    console.log("🔵 setMessages called from: append function (user message)");
    setMessages((prev) => [...prev, message]);

    // Send message to WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending message to WebSocket:", message.content);
      wsRef.current.send(
        JSON.stringify({
          type: "message",
          content: message.content,
        })
      );
    } else {
      // Fallback if WebSocket is not connected
      console.log("🔵 setMessages called from: append function (WebSocket fallback)");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "WebSocket not connected. Please refresh the page.",
        },
      ]);
    }

    setIsLoading(false);
    return message.content;
  };

  const interrupt = async () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log("Sending interrupt signal to WebSocket");
      wsRef.current.send(
        JSON.stringify({
          type: "interrupt",
        })
      );
    }
  };

  return {
    messages,
    input,
    setInput,
    isLoading,
    append,
  };
}
