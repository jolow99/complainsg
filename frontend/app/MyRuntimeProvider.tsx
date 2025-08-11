"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  useLocalThreadRuntime,
  unstable_useRemoteThreadListRuntime as useRemoteThreadListRuntime,
  useThreadListItem,
  RuntimeAdapterProvider,
  type ThreadHistoryAdapter,
  useThreadListItemRuntime,
} from "@assistant-ui/react";
import {
  messageAdapter,
  createThreadHistoryAdapter,
  myDatabaseAdapter,
} from "./runtimeAdapters";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      return useLocalThreadRuntime(messageAdapter, {});
    },
    adapter: {
      ...myDatabaseAdapter,

      // The Provider component adds thread-specific adapters
      unstable_Provider: ({ children }) => {
        // This runs in the context of each thread
        // When first entering the page, logic is ran with created with local ID ( example: __LOCALID_mFreCyM)
        // When switching to a thread, logic is ran with remote ID ( example: thread_mFreCyM)

        const threadListItem = useThreadListItem();
        const threadListItemRuntime = useThreadListItemRuntime();
        let id = "";

      
        // If thead is not initalized, 
        if (!threadListItem.remoteId) {
          id = threadListItem.id;
        } else {
          id = threadListItem.remoteId;
        }

        // Create thread-specific history adapter using abstracted function
        // Im not sure if this is best practise, but it works
        // In the docs, they did not pass the threadListItemRuntime as a param, but im not sure how else to start the init process for a new thread
        const threadHistoryAdapter = useMemo<ThreadHistoryAdapter>(
          () => createThreadHistoryAdapter(id, threadListItemRuntime),
          [id, threadListItemRuntime]
        );

        const adapters = useMemo(
          () => ({ history: threadHistoryAdapter }),
          [threadHistoryAdapter]
        );

        return (
          <RuntimeAdapterProvider adapters={adapters}>
            {children}
          </RuntimeAdapterProvider>
        );
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
