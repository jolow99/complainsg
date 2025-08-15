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
import { ThreadData, ThreadMetaData } from "@/types/chat";
import { ExportedMessageRepositoryItem } from "@/types/types";
import { GLOBAL_PLACEHOLDERS } from "@/app/constants";

interface ChatMetadata {
  constituency: string;
  genre: string;
}


// Still unsure if this is best practice (saving message by message) 
// Alternatively is to retrieve entire message state in the runtime provider then save the entire state to the DB everytime we post
// But that also seems like wasted bandwidth esp the chat is long
export const saveMessageToDB = async (message: ExportedMessageRepositoryItem, userID: string = "ryan", threadID: string = "123", threadMetaData: ThreadMetaData = {}) => {

  // Possible race condition: 
  try {
    // Query chats collection for document with both chatID and userID
    const threadsCollection = collection(db, "threads");
    const userThreadQuery = query(
      threadsCollection,
      where("userID", "==", userID),
      where("threadID", "==", threadID)
    );
    const userThreadSnapshot = await getDocs(userThreadQuery) ?? [];

    let threadRef = null;

    // If chat document exists, reference the old one
    if (!userThreadSnapshot.empty && userThreadSnapshot.docs[0].exists()) {
      // There should be only one chat document with the same userID and chatID
      const updateData = {
        updatedAt: new Date(),
        // Put title and topic same for now
        title: threadMetaData.topic,
        userID: userID, 
        threadID: threadID,
        category: "feedback",
        headId: message.message.id,
        tags: [],
        topic: threadMetaData.topic,
        location: threadMetaData.location,
        summary: threadMetaData.summary,
      };
      threadRef = userThreadSnapshot.docs[0].ref;
      await updateDoc(threadRef, updateData);
    } else {
      // Create new chat document with custom ID
      const threadData: ThreadData = {
        userID: userID,
        threadID: threadID,
        localId: '',
        title: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        category: "feedback",
        headId: message.message.id,
        tags: [],
        topic: null,
        location: null,
        summary: null,
      };

      // Use setDoc with custom ID instead of addDoc
      threadRef = doc(db, "threads", threadID);
      await setDoc(threadRef, threadData);
    }

    // Check if messages subcollection exists
    const threadMessagesCollection = collection(
      db,
      "threads",
      threadRef!.id,
      "messages"
    );
    const messagesSnapshot = await getDocs(threadMessagesCollection);

    // Firebase cannot suppose nested params 
    // Flatten ExportedMessageRepositoryItem to DatabaseMessageObject that can be saved to the DB
    const messageObj = {
      id: message.message.id,
      parentId: message.parentId,
      content: message.message.content,
      role: message.message.role,
      metadata: message.message.metadata,
      createdAt: message.message.createdAt,
      // assistant ui library says status field is optional (in the typing) but this is not true, messages cannot render in the UI without it
      // update: nevermind, im going to hardcode it to complete when retrieving from DB, i only save to DB when message is complete anw
      // status: message.message.status as MessageStatus,
    };

    await addDoc(threadMessagesCollection, messageObj);
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

export const retrieveThreadMetaDataByThreadID = async (threadID: string) => {
  const threadRef = doc(db, "threads", threadID);
  const threadSnapshot = await getDoc(threadRef);
  return threadSnapshot.data();
};

export const retrieveThreadMetaDataByTopic = async (topic: string) => {
  const threadsCollection = collection(db, "threads");
  const threadsQuery = query(threadsCollection, where("topic", "==", topic));
  const threadsSnapshot = await getDocs(threadsQuery);
  return threadsSnapshot.docs.map((doc) => doc.data());
};

export const retrieveAllTopics = async () => {
  const topicsCollection = collection(db, "topics");
  const topicsQuery = query(topicsCollection);
  const topicsSnapshot = await getDocs(topicsQuery);
  console.log("🔍 DATABASE FUNCTION: topicsSnapshot =", topicsSnapshot);
  return topicsSnapshot.docs.map((doc) => doc.data());
};

export const retrieveTopicData = async (topic: string) => {
  const topicsRef = collection(db, "topics");
  const q = query(topicsRef, where("topic", "==", topic));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  // Return the first matching document
  return querySnapshot.docs[0].data();
};

export const retrieveThreadMessages = async (threadID: string) => {
  const messagesCollection = collection(db, "threads", threadID, "messages");
  const messagesQuery = query(messagesCollection);
  const messagesSnapshot = await getDocs(messagesQuery);
  return messagesSnapshot.docs.map((doc) => doc.data());
};

export const retrieveMessagesByThreadID = async (threadID: string) => {
  const messagesCollection = collection(db, "threads", threadID, "messages");
  const messagesQuery = query(messagesCollection);
  const messagesSnapshot = await getDocs(messagesQuery);
  return messagesSnapshot.docs.map((doc) => doc.data());
};