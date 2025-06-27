"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ThumbnailDownloader() {
  const [url, setUrl] = useState("");
  const [thumbnailUrls, setThumbnailUrls] = useState<string[]>([]);
  const [videoId, setVideoId] = useState<string | null>(null);

  const extractVideoId = (url: string) => {
    const match = url.match(
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/
    );
    return match ? match[1] : null;
  };

  const handleGenerate = () => {
    const id = extractVideoId(url);
    if (id) {
      setVideoId(id);
      const base = `https://img.youtube.com/vi/${id}`;
      const urls = ["maxresdefault.jpg", "hqdefault.jpg", "mqdefault.jpg"].map(
        (res) => `${base}/${res}`
      );
      setThumbnailUrls(urls);
    } else {
      alert("Please add a valid YouTube URL");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">YouTube Thumbnail Downloader</h1>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Paste YouTube video URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleGenerate}>Get Thumbnail</Button>
      </div>

      {thumbnailUrls.length > 0 && (
        <Tabs defaultValue="download" className="mt-4">
          <TabsList>
            <TabsTrigger value="download">Download</TabsTrigger>
            <TabsTrigger value="copy">Copy Link</TabsTrigger>
          </TabsList>

          <TabsContent value="download">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {thumbnailUrls.map((thumb, i) => (
                <Card key={i}>
                  <CardContent className="p-2">
                    <img src={thumb} alt={`Thumbnail ${i}`} className="w-full rounded" />
                    <a
                      href={thumb}
                      download
                      className="block mt-2 text-center text-blue-500 hover:underline"
                    >
                      Download
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="copy">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {thumbnailUrls.map((thumb, i) => (
                <Card key={i}>
                  <CardContent className="p-2">
                    <img src={thumb} alt={`Thumbnail ${i}`} className="w-full rounded" />
                    <Button
                      className="mt-2 w-full"
                      onClick={() => {
                        navigator.clipboard.writeText(thumb);
                        alert("Link copied!");
                      }}
                    >
                      Copy Link
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
