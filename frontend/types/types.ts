// These are types that defined as part of AUI library, but are not exported
// So I have to define them here

import { ThreadMessage } from "@assistant-ui/react";

// I literally see this defined in frontend/node_modules/@assistant-ui/react/dist/runtimes/utils/MessageRepository.d.ts:6 but its not exported so i must define it here
export type ExportedMessageRepository = {
    /** ID of the head message, or null/undefined if no head */
    headId?: string | null;
    /** Array of all messages with their parent references */
    messages: Array<{
      message: ThreadMessage;
      parentId: string | null;
    }>;
  };

export type ExportedMessageRepositoryItem = {
    message: ThreadMessage;
    parentId: string | null;
}