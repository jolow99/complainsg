import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  doc,
  getDocs,
  updateDoc,
  setDoc,
  query,
  where,
} from "firebase/firestore";
import { ChatData } from "@/types/chat";
import { Message } from "@llamaindex/chat-ui";

export const saveChatToDB = async (messages: Message[], userID: string = "ryan", chatID: string = "123") => {

  try {
    // Query chats collection for document with both chatID and userID
    const chatsCollection = collection(db, "chats");
    const userChatQuery = query(
      chatsCollection,
      where("userID", "==", userID),
      where("chatID", "==", chatID)
    );
    const userChatSnapshot = await getDocs(userChatQuery);

    let chatRef = null;

    // If chat document exists, reference the old one
    if (!userChatSnapshot.empty && userChatSnapshot.docs[0].exists()) {
      // There should be only one chat document with the same userID and chatID
      // Update existing chat document
      const updateData = {
        updatedAt: new Date(),
        messageCount: messages.length,
        title:
          messages.length > 0
            ? messages[0].content.slice(0, 50) + "..."
            : "Updated Chat",
      };
      chatRef = userChatSnapshot.docs[0].ref;
      await updateDoc(chatRef, updateData);
    } else {
      // Create new chat document with custom ID
      const chatData: ChatData = {
        userID: userID,
        chatID: chatID,
        title:
          messages.length > 0
            ? messages[0].content.slice(0, 50) + "..."
            : "New Chat",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: messages.length,
        category: "feedback",
        tags: [],
      };

      // Use setDoc with custom ID instead of addDoc
      chatRef = doc(db, "chats", chatID);
      await setDoc(chatRef, chatData);
    }

    // Check if messages subcollection exists
    const messagesCollection = collection(
      db,
      "chats",
      chatRef!.id,
      "messages"
    );
    const messagesSnapshot = await getDocs(messagesCollection);

    if (messagesSnapshot.empty) {
      await addDoc(messagesCollection, {
        role: "asdf",
        content: "asdf",
        timestamp: new Date(),
        messageIndex: 0,
      });
    }
  } catch (error) {
    console.error("Error saving chat to DB: ", error);
  }
}; 