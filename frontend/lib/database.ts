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
import { MessageRole } from "@/types/chat";
import { JSONValue } from "ai";

interface ChatMetadata {
  constituency: string;
  genre: string;
}


// Still unsure if this is best practice (saving message by message) 
// Alternatively is to retrieve entire message state in the runtime provider then save the entire state to the DB everytime we post
// But that also seems like wasted bandwidth esp the chat is long
export const saveMessageToDB = async (content: string, role: MessageRole, annotations?: JSONValue[], userID: string = "ryan", chatID: string = "123") => {

  try {
    // Query chats collection for document with both chatID and userID
    const chatsCollection = collection(db, "chats");
    const userChatQuery = query(
      chatsCollection,
      where("userID", "==", userID),
      where("chatID", "==", chatID)
    );
    const userChatSnapshot = await getDocs(userChatQuery) ?? [];

    let chatRef = null;

    // If chat document exists, reference the old one
    if (!userChatSnapshot.empty && userChatSnapshot.docs[0].exists()) {
      // There should be only one chat document with the same userID and chatID
      // Update existing chat document
      const updateData = {
        updatedAt: new Date(),
        title: content.slice(0, 50) + "...",
      };
      chatRef = userChatSnapshot.docs[0].ref;
      await updateDoc(chatRef, updateData);
    } else {
      // Create new chat document with custom ID
      const chatData: ChatData = {
        userID: userID,
        chatID: chatID,
        title:
          content.slice(0, 50) + "...",
        createdAt: new Date(),
        updatedAt: new Date(),
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

    // Add the actual message to the subcollection
    const messageObj = {
      role: role,
      content: content,
      timestamp: new Date(),
      messageIndex: messagesSnapshot.size, // Use current size as index
      annotations: annotations || []
    };

    await addDoc(messagesCollection, messageObj);
    console.log(`✅ Saved ${role} message to subcollection`, { messageIndex: messagesSnapshot.size });
  } catch (error) {
    console.error(`❌ Error saving ${role} message to DB:`, error);
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
  const threadsCollection = collection(db, "chats");
  const threadsQuery = query(threadsCollection, where("userID", "==", userID));
  const threadsSnapshot = await getDocs(threadsQuery);
  return threadsSnapshot.docs.map((doc) => doc.data());
};

export const retrieveMessagesFromDB = async (chatID: string) => {
  const messagesCollection = collection(db, "chats", chatID, "messages");
  const messagesQuery = query(messagesCollection);
  const messagesSnapshot = await getDocs(messagesQuery);
  return messagesSnapshot.docs.map((doc) => doc.data());
};

