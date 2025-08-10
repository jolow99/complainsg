"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "./MyRuntimeProvider";
import { ThreadList } from "@/components/assistant-ui/thread-list";

export default function Home() {
  return (
    <MyRuntimeProvider>
      <div className="min-h-screen flex w-full">
        {/* Sidebar for ThreadList */}
        <div className="w-80 min-w-80 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Conversations</h2>
            <p className="text-sm text-gray-600">Your complaint threads</p>
          </div>
          <ThreadList />
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="p-4 border-b bg-white shadow-sm">
            <h1 className="text-xl font-semibold">ComplainSG</h1>
            <p className="text-sm text-gray-600">
              Tell me more about your problems!
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </div>
      </div>
    </MyRuntimeProvider>
  );
}
