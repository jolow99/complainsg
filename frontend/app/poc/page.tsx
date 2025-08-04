"use client";

import { Thread } from "@/components/assistant-ui/thread";
import { MyRuntimeProvider } from "../MyRuntimeProvider";

export default function Home() {
  
  return (
    <MyRuntimeProvider>
      <div className="min-h-screen flex justify-center items-center w-full p-4 px-8">
        <div className="w-full max-w-4xl h-[80vh] border rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h1 className="text-xl font-semibold">SSE Streaming Chat POC</h1>
            <p className="text-sm text-gray-600">Testing streaming responses with Assistant UI</p>
          </div>
          <div className="flex-1 overflow-hidden">
            <Thread />
          </div>
        </div>
      </div>
    </MyRuntimeProvider>
  );
}