"use client";

import {
  ChatHandler,
  ChatSection as ChatSectionUI,
  Message,
  ChatMessages,
  ChatInput,
  ChatMessage,
} from "@llamaindex/chat-ui";
import { useState, useEffect, useRef } from "react";

import "@llamaindex/chat-ui/styles/markdown.css";
import "@llamaindex/chat-ui/styles/pdf.css";
import "@llamaindex/chat-ui/styles/editor.css";

import { db, firebaseConfig } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore"; 


const initialMessages: Message[] = [];

export function ChatSection() {
  console.log("firebaseConfig: ", firebaseConfig);
  try {
    addDoc(collection(db, "users"), {
      first: "Ada",
      last: "Lovelace",
      born: 1815
    });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
  // You can replace the handler with a useChat hook from Vercel AI SDK
  const handler = useMockChat(initialMessages);
  return (
    <div
      className="w-1/2 flex max-h-[80vh] flex-col gap-6 "
      style={{ fontFamily: "StyreneB-Regular", color: "#FFFFFA" }}
    >
      <ChatSectionUI
        handler={handler}
        className="chat-section-bg overflow-auto"
      >
        <ChatMessages className="rounded-xl backdrop-blur rounded-lg shadow-lg bg-messages-padding">
          <ChatMessages.List className="p-6 rounded-lg bg-messages color-white">
            {handler.messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                isLast={index === handler.messages.length - 1}
              ></ChatMessage>
            ))}
            <ChatMessages.Empty
              heading="Welcome to ComplainSG!"
              subheading="Start a feedback session with us by typing below"
            />

            <ChatMessages.Loading>
              <div className="animate-pulse">Thinking...</div>
            </ChatMessages.Loading>
          </ChatMessages.List>
        </ChatMessages>

        <ChatInput className="rounded-xl backdrop-blur rounded-lg shadow-lg bg-messages-padding">
          <ChatInput.Form className="flex items-end gap-3">
            <ChatInput.Field
              className="flex-1 border-none rounded-lg px-4 py-2"
              placeholder="Ask me anything..."
            />
            <ChatInput.Submit
              disabled={handler.isLoading}
              className="text-white rounded-lg py-2 px-8"
            >
              Send
            </ChatInput.Submit>
          </ChatInput.Form>
        </ChatInput>
      </ChatSectionUI>
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
          console.log(
            "🔵 setMessages called from: WebSocket connection message"
          );
          console.log(messages);
          // setMessages((prev) => [
          //   ...prev,
          //   {
          //     role: "assistant",
          //     content: data.message,
          //   },
          // ]);
        }

        // Handle message received acknowledgment
        if (data.type === "message_received") {
          console.log("isLoading: True");
          setIsLoading(true);
          // Temporarily remove the acknowledgment message from UI for cleaner chat
          // setMessages(prev => [...prev, {
          //   role: 'assistant',
          //   content: data.content
          // }])
        }

        // Handle stream chunks (word-by-word streaming)
        if (data.type === "chunk") {
          setIsLoading(false);
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

  // This is called when the user sends a message
  const append = async (message: Message) => {
    // Add user message to chat
    console.log("setMessage: Append", message.content);
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
      console.log(
        "🔵 setMessages called from: append function (WebSocket fallback)"
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "WebSocket not connected. Please refresh the page.",
        },
      ]);
    }

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
