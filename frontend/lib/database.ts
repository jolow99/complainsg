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
  getDoc,
} from "firebase/firestore";
import { ChatData, DatabaseMessageObject } from "@/types/chat";
import { MessageRole } from "@/types/chat";
import { JSONValue } from "ai";
import { ExportedMessageRepositoryItem } from "@/types/types";
import { MessageStatus, ThreadUserMessagePart } from "@assistant-ui/react";

interface ChatMetadata {
  constituency: string;
  genre: string;
}


// Still unsure if this is best practice (saving message by message) 
// Alternatively is to retrieve entire message state in the runtime provider then save the entire state to the DB everytime we post
// But that also seems like wasted bandwidth esp the chat is long
export const saveMessageToDB = async (message: ExportedMessageRepositoryItem, userID: string = "ryan", threadID: string = "123") => {

  // Possible race condition: 
  try {
    // Query chats collection for document with both chatID and userID
    const chatsCollection = collection(db, "threads");
    console.log("🔍 DATABASE ADAPTER: chatsCollection =", chatsCollection);
    const userChatQuery = query(
      chatsCollection,
      where("userID", "==", userID),
      where("threadID", "==", threadID)
    );
    const userChatSnapshot = await getDocs(userChatQuery) ?? [];

    let chatRef = null;

    // If chat document exists, reference the old one
    if (!userChatSnapshot.empty && userChatSnapshot.docs[0].exists()) {
      // There should be only one chat document with the same userID and chatID
      // Update existing chat document
      const updateData = {
        updatedAt: new Date(),
        title: 'TEST METADATA',
        userID: userID,
        threadID: threadID,
        category: "feedback",
        headId: message.message.id,
        tags: [],
      };
      chatRef = userChatSnapshot.docs[0].ref;
      await updateDoc(chatRef, updateData);
    } else {
      // Create new chat document with custom ID
      const chatData: ChatData = {
        userID: userID,
        threadID: threadID,
        title: "test title",
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "feedback",
        headId: message.message.id,
        tags: [],
      };

      // Use setDoc with custom ID instead of addDoc
      chatRef = doc(db, "threads", threadID);
      await setDoc(chatRef, chatData);
    }

    // Check if messages subcollection exists
    const messagesCollection = collection(
      db,
      "threads",
      chatRef!.id,
      "messages"
    );
    const messagesSnapshot = await getDocs(messagesCollection);

    // Firebase cannot suppose nested params 
    // Flatten ExportedMessageRepositoryItem to DatabaseMessageObject that can be saved to the DB
    const messageObj = {
      id: message.message.id,
      parentId: message.parentId,
      content: message.message.content,
      role: message.message.role,
      metadata: message.message.metadata,
      createdAt: message.message.createdAt,
      // assistant ui library says status field is optional (in the typing) but its a fucking lie, messages cannot render in the UI without it
      // update: nevermind, im going to hardcode it to complete when retrieving from DB, i only save to DB when message is complete anw
      // status: message.message.status as MessageStatus,
    };

    await addDoc(messagesCollection, messageObj);
    console.log(`✅ Saved ${message.message.role} message to subcollection`, { messageIndex: messagesSnapshot.size });
  } catch (error) {
    console.error(`❌ Error saving ${message.message.role} message to DB:`, error);
  }
}; 

export const saveChatMetadataToDB = async (complaintTopic: string, complaintMetadata: ChatMetadata, chatID: string = "123") => {
  try {
    const chatRef = doc(db, "chats", chatID);
    await updateDoc(chatRef, {
      complaintTopic: complaintTopic,
      complaintMetadata: complaintMetadata,
    });
  } catch (error) {
    console.error("Error saving chat metadata to DB: ", error);
  }
};

export const retrieveThreadsFromDB = async (userID: string) => {
  const threadsCollection = collection(db, "threads");
  const threadsQuery = query(threadsCollection, where("userID", "==", userID));
  const threadsSnapshot = await getDocs(threadsQuery);
  return threadsSnapshot.docs.map((doc) => doc.data());
};

export const retrieveMessagesFromDB = async (threadID: string) => {
  const messagesCollection = collection(db, "threads", threadID, "messages");
  const messagesQuery = query(messagesCollection);
  const messagesSnapshot = await getDocs(messagesQuery);
  return messagesSnapshot.docs.map((doc) => doc.data());
};

export const retrieveThreadMetaData = async (threadID: string) => {
  const threadRef = doc(db, "threads", threadID);
  const threadSnapshot = await getDoc(threadRef);
  return threadSnapshot.data();
};

