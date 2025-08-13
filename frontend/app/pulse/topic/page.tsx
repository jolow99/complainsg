"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  retrieveThreadMetaDataByTopic,
  retrieveTopicData,
} from "@/lib/database";
import MessageCard from "@/components/customComponents/messageCard";

export default function TopicPage() {
  const [threads, setThreads] = useState<any>(null);
  const [topic, setTopic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const handleThreadClick = (threadID: string) => {
    router.push(`/pulse/topic/thread?threadId=${threadID}`);
  };

  useEffect(() => {
    const fetchTopic = async () => {
      try {
        const topicData = await retrieveTopicData("Noise from planes");
        console.log("🔍 TOPIC PAGE: topicData =", topicData);
        setTopic(topicData);
      } catch (error) {
        console.error("Error fetching topic:", error);
      } finally {
        setLoading(false);
      }
    };

    // Returns array with threadID, topic, summary, imageURL
    const fetchThreadMetaData = async () => {
      const threads = await retrieveThreadMetaDataByTopic("Noise from planes");
      setThreads(threads);
    };

    fetchTopic();
    fetchThreadMetaData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex w-full items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen flex w-full items-center justify-center">
        <div className="text-lg">Topic not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center justify-center space-y-6">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-gray-900 leading-tight">
                {topic.topic}
              </h1>
              <p className="text-lg text-gray-600 max-w-md leading-relaxed">
                {topic.summary}
              </p>
            </div>

            <div className="flex-shrink-0">
              <img
                src="/Plane_Cuphead.png"
                alt="Topic illustration"
                className="w-64 h-64 object-contain drop-shadow-lg"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Related Complaints
              </h2>
              <p className="text-gray-600">
                {threads?.length || 0} complaint
                {threads?.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {threads && threads.length > 0 ? (
                threads.map((thread: any) => (
                  <MessageCard
                    key={thread.threadID}
                    topic={thread.topic}
                    description={thread.summary}
                    threadID={thread.threadID}
                    onClick={() => handleThreadClick(thread.threadID)}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">
                    No complaints found for this topic yet.
                  </p>
                  <p className="text-sm mt-2">
                    Be the first to report an issue!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
