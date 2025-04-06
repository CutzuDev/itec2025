"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { Database } from "@/utils/studenthub-types";

interface CurriculumInsert {
  title: string;
  content: string;
  summary: string | null;
  creator_id: string;
  updated_at: string;
}

function SummariesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingCache, setIsCheckingCache] = useState(false);
  const [summaryHtml, setSummaryHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [cachedCurriculum, setCachedCurriculum] = useState<{
    id: string;
    content: string;
    summary: string | null;
  } | null>(null);
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.type !== "application/pdf") {
      setError("Please select a PDF file");
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
    setCachedCurriculum(null);
    setSummaryHtml(null);

    // Set default title from filename
    const filename = selectedFile.name.replace(/\.pdf$/i, "");
    setTitle(filename);
  };

  const checkForCachedVersion = async () => {
    if (!file || !title.trim()) {
      setError("Please provide a PDF file and title");
      return false;
    }

    try {
      setIsCheckingCache(true);
      setError(null);

      const filename = file.name.replace(/\.pdf$/i, "");

      // Check if a curriculum with the same title already exists
      const { data: existingCurricula, error: fetchError } = await supabase
        .from("curricula")
        .select("id, created_at, content, summary")
        .eq("title", filename)
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        throw new Error(
          `Failed to check existing curricula: ${fetchError.message}`
        );
      }

      if (existingCurricula && existingCurricula.length > 0) {
        const existingCurriculum = existingCurricula[0];
        const createdAt = new Date(existingCurriculum.created_at);
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        // If it was created less than an hour ago, use cached version
        if (createdAt >= oneHourAgo) {
          setCachedCurriculum({
            id: existingCurriculum.id,
            content: existingCurriculum.content,
            summary: existingCurriculum.summary,
          });
          setSummaryHtml(existingCurriculum.summary);
          return true; // Found a cached version
        }
      }

      return false; // No cached version found
    } catch (err) {
      setError(
        `Error checking for cached version: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      return false;
    } finally {
      setIsCheckingCache(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    try {
      // First, check for a cached version
      const hasCachedVersion = await checkForCachedVersion();

      if (hasCachedVersion) {
        // If we found a cached version, we're done - no need to hit the API
        setSaveMessage(
          "Using cached version of this document from recent processing"
        );
        return;
      }

      // No cached version found, proceed with API call
      setIsUploading(true);
      setError(null);
      setSummaryHtml(null);
      setSaveMessage(null);

      const formData = new FormData();
      formData.append("pdf", file);

      // Use fetch instead of XMLHttpRequest for better response handling
      const response = await fetch("/api/process-pdf", {
        method: "POST",
        body: formData,
        // Add a longer timeout for the request
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Get the HTML content directly
      const htmlContent = await response.text();
      setSummaryHtml(htmlContent);
    } catch (err) {
      setError(
        `Failed to get summary: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const saveToCurricula = async () => {
    if (!title.trim()) {
      setError("Please provide a title");
      return;
    }

    if (!summaryHtml) {
      setError("No summary available to save");
      return;
    }

    try {
      setIsSaving(true);
      setSaveMessage(null);
      setError(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to save");
      }

      let content: string;

      if (cachedCurriculum) {
        // If using cached version, use its content
        content = cachedCurriculum.content;
      } else if (file) {
        // Otherwise use the current file
        // Convert file to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Convert ArrayBuffer to base64 string
        content = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );
      } else {
        throw new Error("No content available to save");
      }

      // Create a new curriculum entry
      const { data, error: insertError } = await supabase
        .from("curricula")
        .insert({
          title: title,
          content: content,
          summary: summaryHtml,
          creator_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        throw new Error(`Failed to save: ${insertError.message}`);
      }

      setSaveMessage(
        cachedCurriculum
          ? `Successfully saved cached version as curriculum ID: ${data.id}`
          : `Successfully saved as curriculum ID: ${data.id}`
      );
    } catch (err) {
      setError(
        `Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full h-full p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>PDF Summarization</CardTitle>
          <CardDescription>
            Upload a PDF file to get an AI-generated summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-2">
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-green-600">
                    Selected: {file.name} (
                    {(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                {error && <p className="text-sm text-red-600">{error}</p>}
              </div>
            </div>
            <Button
              type="submit"
              disabled={!file || isUploading || isCheckingCache}
              className="w-full"
            >
              {isCheckingCache
                ? "Checking for cached version..."
                : isUploading
                  ? "Processing..."
                  : "Generate Summary"}
            </Button>
          </form>
        </CardContent>
        {summaryHtml && (
          <>
            <CardFooter className="flex flex-col items-start border-t p-4 w-full">
              <h3 className="font-semibold text-lg mb-2">Summary</h3>
              {cachedCurriculum && (
                <div className="bg-blue-50 p-3 rounded-md mb-4 w-full text-blue-800 text-sm">
                  This summary is from a cached version processed within the
                  last hour.
                </div>
              )}
              <div
                className="bg-gray-50 p-4 rounded-md w-full overflow-auto"
                dangerouslySetInnerHTML={{ __html: summaryHtml }}
              />
            </CardFooter>
            <CardFooter className="flex flex-col items-start border-t p-4 w-full space-y-4">
              <div className="w-full">
                <Label htmlFor="title" className="mb-2 block">
                  Title for saved curriculum
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a title for this curriculum"
                  className="mb-4"
                />
                <Button
                  onClick={saveToCurricula}
                  disabled={isSaving || !title.trim() || !summaryHtml}
                  className="w-full"
                >
                  {isSaving ? "Saving..." : "Save to Curricula"}
                </Button>
                {saveMessage && (
                  <p className="text-sm text-green-600 mt-2">{saveMessage}</p>
                )}
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

export default SummariesPage;
