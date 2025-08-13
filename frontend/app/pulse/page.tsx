"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { retrieveAllTopics } from "@/lib/database";
import CustomCard from "@/components/customComponents/customCard";

// Ideas:

export default function Pulse() {
  const [topics, setTopics] = useState<any[]>([]);

  useEffect(() => {
    retrieveAllTopics().then((topics) => {
      console.log("🔍 PULSE PAGE: topics =", topics);
      setTopics(topics);
    });
  }, []);


  return (
    <div className="min-h-screen flex w-full">
      <div className="flex flex-col w-full items-center justify-center">
        {topics.map((topic) => (
          <CustomCard topic={topic.topic} key={topic.topic} description={topic.summary} />
        ))}
      </div>
    </div>
  );
}
