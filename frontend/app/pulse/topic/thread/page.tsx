"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { retrieveMessagesByThreadID } from "@/lib/database";

export default function ThreadPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const threadID = searchParams.get("threadId");

  useEffect(() => {
    const fetchMessages = async () => {
      if (!threadID) {
        setError("No thread ID provided");
        setLoading(false);
        return;
      }

      try {
        const fetchedMessages = await retrieveMessagesByThreadID(threadID);
        console.log("🔍 THREAD PAGE: messages =", fetchedMessages);
        
        // Sort messages by createdAt to ensure proper order
        const sortedMessages = fetchedMessages.sort((a, b) => {
          if (a.createdAt && b.createdAt) {
            return new Date(a.createdAt.seconds * 1000).getTime() - new Date(b.createdAt.seconds * 1000).getTime();
          }
          return 0;
        });
        
        setMessages(sortedMessages);
      } catch (err) {
        console.error("Error fetching messages:", err);
        setError("Failed to load messages");
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [threadID]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading conversation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-lg text-red-600 mb-2">Error</div>
          <div className="text-gray-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conversation Thread
          </h1>
          <p className="text-gray-600">
            {messages.length} message{messages.length !== 1 ? 's' : ''} in this conversation
          </p>
        </div>

        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={message.id || index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-3xl rounded-2xl px-6 py-4 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white ml-12"
                    : "bg-white text-gray-900 mr-12 shadow-sm border border-gray-200"
                }`}
              >
                <div className="flex items-center mb-2">
                  <span className="text-sm font-medium opacity-75">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                  {message.createdAt && (
                    <span className="text-xs opacity-50 ml-2">
                      {new Date(message.createdAt.seconds * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                
                <div className="prose prose-sm max-w-none">
                  {Array.isArray(message.content) ? (
                    message.content.map((content: any, contentIndex: number) => (
                      <div key={contentIndex}>
                        {content.type === "text" && (
                          <p className="whitespace-pre-wrap leading-relaxed">
                            {content.text}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {message.content}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No messages found in this thread.</p>
          </div>
        )}
      </div>
    </div>
  );
}