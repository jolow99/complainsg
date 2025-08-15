"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
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
  createMessageAdapter,
  createThreadHistoryAdapter,
  myDatabaseAdapter,
} from "./runtimeAdapters";
import { ThreadMetaData } from "@/types/chat";

export function MyRuntimeProvider({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  // TECH DEBT: Storing Thread Metadata correctly
  // Originally i tried to use useThread and pass it to createMessageAdapter, but it cannot be defined here so high up the component hierarchy
  // Then i tried to define my own threadMetaData state (see below) to pass setThreadMetaData as a param to the messageAdapter, but there was an AUI internal error when i call setState
  // I think it was rerendering the provider, which triggered some error within in the library, will investigate further when I have the time
  // In the meantime i will store threadMetaData in localStorage from within messageAdapter

  // const [threadMetaData, setThreadMetaData] = useState<ThreadMetaData>({
  //   THREAD_ID_PLACEHOLDER: {
  //     topic: "",
  //     summary: "",
  //     location: "",
  //   },
  // });

  // intialize useRemoteThreadListRuntime runtime
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      const threadListItem = useThreadListItem();
      const messageAdapter = useMemo(
        () => createMessageAdapter(threadListItem ),
        [threadListItem]
      );
      return useLocalThreadRuntime(messageAdapter, {});
    },
    adapter: {
      // Spread all the functions in the myDatabaseAdapter object into the adapter object

      // list : function
      // initialize : function
      // rename : function
      // archive : function
      // unarchive : function
      // delete : function
      // generateTitle : function
      // getMessages : function
      ...myDatabaseAdapter,

      // custom provider
      unstable_Provider: ({ children }) => {
        // This runs in the context of each thread
        // When first entering the page, logic is ran with created with local ID ( example: __LOCALID_mFreCyM)
        // When switching to a thread, logic is ran with remote ID ( example: thread_mFreCyM)

        const threadListItem = useThreadListItem();
        const threadListItemRuntime = useThreadListItemRuntime();
        console.log("🔍 MESSSAGE ADAPTER THREAD LIST ITEM", threadListItem);
        console.log("🔍 MESSSAGE ADAPTER THREAD LIST ITEM ID", threadListItem.id);
        console.log("🔍 MESSSAGE ADAPTER THREAD LIST ITEM REMOTE ID", threadListItem.remoteId);
        // Create thread-specific history adapter using abstracted function
        // Im not sure if this is best practise, but it works
        // In the docs, they did not pass the threadListItemRuntime as a param, but im not sure how else to start the init process for a new thread
        const threadHistoryAdapter = useMemo<ThreadHistoryAdapter>(
          () => createThreadHistoryAdapter(threadListItem.id, threadListItem.remoteId, threadListItemRuntime),
          [threadListItem.id, threadListItem.remoteId, threadListItemRuntime]
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
