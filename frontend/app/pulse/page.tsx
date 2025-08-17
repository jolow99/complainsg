"use client";
import React, { useEffect, useState } from "react";
import {
  retrieveAllTopics,
  retrieveThreadMetaDataByTopic,
} from "@/lib/database";
import TopicCard from "@/components/customComponents/topicCard";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopicData } from "@/types/chat";

export default function Pulse() {
  const [topics, setTopics] = useState<TopicData[]>([]);
  const router = useRouter();

  useEffect(() => {
    retrieveAllTopics().then(async (topics) => {
      console.log("🔍 PULSE PAGE: topics =", topics);
      const topicsWithThreads: TopicData[] = [];
      for (const topic of topics) {
        const threads = await retrieveThreadMetaDataByTopic(topic.topic);
        console.log("🔍 PULSE PAGE: threads =", threads);
        if (threads.length > 0) {
          topicsWithThreads.push({
            topic: topic.topic,
            summary: topic.summary,
            imageURL: topic.imageURL,
          });
        }
      }
      console.log("🔍 PULSE PAGE: topicsWithThreads =", topicsWithThreads);
      setTopics(topicsWithThreads);
    });
  }, []);

  return (
    <div className="min-h-screen flex w-full">
      <Tabs defaultValue="list" className="w-full h-full flex flex-col items-center justify-center">
        <TabsList className="my-12">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="map">Map</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <div className="flex flex-col w-full items-center justify-center">
            {topics.map((topic) => (
              <div
                key={topic.topic}
                onClick={() => router.push(`/pulse/topic?topic=${topic.topic}`)}
                className="cursor-pointer hover:scale-105 transition-transform duration-200 mb-6"
              >
                <TopicCard
                  topic={topic.topic}
                  description={topic.summary}
                  imageURL={topic.imageURL}
                />
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="map">Work in progress</TabsContent>
      </Tabs>
    </div>
  );
}
