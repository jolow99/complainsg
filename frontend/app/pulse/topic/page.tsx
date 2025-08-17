"use client";
import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import {
  retrieveThreadMetaDataByTopic,
  retrieveTopicData,
} from "@/lib/database";
import MessageCard from "@/components/customComponents/messageCard";
import { ThreadData, TopicData } from "@/types/chat";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export default function TopicPage() {
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [topic, setTopic] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  return (
    <Suspense fallback={<div>Loading search parameters...</div>}>
      <TopicContent
        threads={threads}
        setThreads={setThreads}
        topic={topic}
        setTopic={setTopic}
        loading={loading}
        setLoading={setLoading}
        router={router}
      />
    </Suspense>
  );
}

function TopicContent({
  threads,
  setThreads,
  topic,
  setTopic,
  loading,
  setLoading,
  router,
}: {
  threads: ThreadData[];
  setThreads: React.Dispatch<React.SetStateAction<ThreadData[]>>;
  topic: TopicData | null;
  setTopic: React.Dispatch<React.SetStateAction<TopicData | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  router: AppRouterInstance;
}) {
  const searchParams = useSearchParams();
  const handleThreadClick = (threadID: string) => {
    router.push(`/pulse/topic/thread?threadId=${threadID}`);
  };

  useEffect(() => {
    const fetchTopic = async () => {
      const topicParam = searchParams.get("topic");
      if (!topicParam) {
        console.error("No topic parameter found");
        setLoading(false);
        return;
      }
      try {
        const topicData = await retrieveTopicData(topicParam);
        console.log("🔍 TOPIC PAGE: topicData =", topicData);
        if (topicData) {
          setTopic({
            topic: topicData.topic,
            summary: topicData.summary,
            imageURL: topicData.imageURL,
          });
        }
      } catch (error) {
        console.error("Error fetching topic:", error);
      } finally {
        setLoading(false);
      }
    };

    // Returns array with threadID, topic, summary, imageURL
    const fetchThreadMetaData = async () => {
      const topicParam = searchParams.get("topic");
      if (!topicParam) {
        console.error("No topic parameter found");
        return;
      }
      console.log("🔍 TOPIC PAGE: topicParam =", topicParam);
      const threads = await retrieveThreadMetaDataByTopic(topicParam);
      setThreads(threads as ThreadData[]);
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
                src={topic.imageURL || "/Plane_Cuphead.png"}
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
                threads.map((thread: ThreadData) => (
                  <MessageCard
                    key={thread.threadID}
                    topic={thread.topic || ""}
                    description={thread.summary || ""}
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
