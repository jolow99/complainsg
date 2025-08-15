"use client";
import React, { useEffect, useState } from "react";
import { retrieveAllTopics, retrieveThreadMetaDataByTopic } from "@/lib/database";
import TopicCard from "@/components/customComponents/topicCard";
import { useRouter } from "next/navigation";

export default function Pulse() {
  const [topics, setTopics] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    retrieveAllTopics().then(async (topics) => {
      const topicsWithThreads = [];
      for (const topic of topics) {
        const threads = await retrieveThreadMetaDataByTopic(topic.topic);
        console.log("🔍 PULSE PAGE: threads =", threads);
        if (threads.length > 0) {
          topicsWithThreads.push(topic);
        }
      }
      setTopics(topicsWithThreads);
      });
    }, []);

  return (
    <div className="min-h-screen flex w-full">
      <div className="flex flex-col w-full items-center justify-center">
        {topics.map((topic) => (
          <div 
            key={topic.topic} 
            onClick={() => router.push(`/pulse/topic?topic=${topic.topic}`)}
            className="cursor-pointer hover:scale-105 transition-transform duration-200 mb-6"
          >
            <TopicCard topic={topic.topic} description={topic.summary} imageURL={topic.imageURL}/>
          </div>
        ))}
      </div>
    </div>
  );
}
