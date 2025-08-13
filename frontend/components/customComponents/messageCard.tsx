import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";

export default function MessageCard({
  topic,
  description,
  threadID,
  onClick,
}: {
  topic: string;
  description: string;
  threadID?: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className="w-xl cursor-pointer hover:shadow-lg transition-shadow duration-200 hover:bg-gray-50"
      onClick={onClick}
    >
      <CardHeader className="flex flex-col justify-around gap-6 py-6 pl-6">
        <CardTitle className="text-3xl font-bold">{topic}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
