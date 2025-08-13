"use client";
import React, { useEffect, useState } from "react";
import { retrieveAllTopics } from "@/lib/database";
import TopicCard from "@/components/customComponents/topicCard";
import { useRouter } from "next/navigation";

// Ideas:

export default function Pulse() {
  const [topics, setTopics] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    retrieveAllTopics().then((topics) => {
      setTopics(topics);
    });
  }, []);

  return (
    <div className="min-h-screen flex w-full">
      <div className="flex flex-col w-full items-center justify-center">
        {topics.map((topic) => (
          <div 
            key={topic.topic} 
            onClick={() => router.push(`/pulse/topic`)}
            className="cursor-pointer hover:scale-105 transition-transform duration-200"
          >
            <TopicCard topic={topic.topic} description={topic.summary} />
          </div>
        ))}
      </div>
    </div>
  );
}
