import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface TopicDataProps {
  topic: {
    topic: string;
    summary: string;
    imageURL?: string;
    [key: string]: any;
  };
}

export default function TopicData({ topic }: TopicDataProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push("/pulse");
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pulse
        </Button>
      </div>

      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold mb-4">
            {topic.topic}
          </CardTitle>
          <CardDescription className="text-lg">
            {topic.summary}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {topic.imageURL && (
            <div className="flex justify-center">
              <img
                src={topic.imageURL}
                alt={topic.topic}
                className="rounded-lg border-2 border-gray-200 shadow-lg w-full max-w-md h-64 object-cover"
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Topic Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Topic:</span>
                  <span>{topic.topic}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Summary:</span>
                  <span className="text-right max-w-xs">{topic.summary}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Additional Information</h3>
              <div className="space-y-2">
                {Object.entries(topic).map(([key, value]) => {
                  if (key === 'topic' || key === 'summary' || key === 'imageURL') return null;
                  return (
                    <div key={key} className="flex justify-between">
                      <span className="font-medium capitalize">{key}:</span>
                      <span className="text-right max-w-xs">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
