import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
} from "../ui/card";

export default function TopicCard({
  topic,
  description,
  imageURL,
}: {
  topic: string;
  description: string;
  imageURL?: string;
}) {
  return (
    <Card className="w-xl">
      <CardHeader className="flex flex-col justify-around gap-6 py-6 pl-6">
        <CardTitle className="text-3xl font-bold">{topic}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardAction className="flex flex-col flex-shrink-0 p-6">
        <img
          src={imageURL || "/Plane_Cuphead.png"}
          alt="Pulse"
          width={100}
          height={100}
          className="rounded-lg border-2 border-gray-200 shadow-sm w-full h-48 object-cover"
        />
      </CardAction>
    </Card>
  );
}
