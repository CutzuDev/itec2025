"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { TagInput } from "@/components/ui/tag-input";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [isPublicSession, setIsPublicSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/sign-in");
        return;
      }

      const title = formData.get("title") as string;
      const description = formData.get("description") as string;
      const location = formData.get("location") as string;
      const startTime = formData.get("start_time") as string;
      const endTime = formData.get("end_time") as string;
      const maxParticipants = formData.get("max_participants") as string;

      const { error: insertError, data: eventData } = await supabase.from("events").insert([
        {
          title,
          description,
          location,
          start_time: startTime,
          end_time: endTime,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          is_public: isPublicSession,
          creator_id: user.id,
          avatar_url: avatarUrl
        },
      ]).select('id').single();

      if (insertError) {
        throw insertError;
      }

      // Adăugăm topics în baza de date dacă există
      if (topics.length > 0 && eventData?.id) {
        const topicsToInsert = topics.map(topic => ({
          event_id: eventData.id,
          topic
        }));

        const { error: topicsError } = await supabase
          .from('event_topics')
          .insert(topicsToInsert);

        if (topicsError) {
          console.error('Error adding topics:', topicsError);
          // Continuăm chiar dacă au apărut erori la adăugarea topicurilor
        }
      }

      router.push("/sessions");
      router.refresh();
    } catch (error) {
      console.error("Error creating event:", error);
      setError(error instanceof Error ? error.message : "Error creating event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-6">
        <a href="/sessions" className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Sessions
        </a>
      </Button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Create New Session</h1>
        <p className="text-muted-foreground mb-6">
          Fill in the details for your study session
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Session Image</label>
            <ImageUpload
              value={avatarUrl}
              onChange={setAvatarUrl}
              onError={setError}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              name="title"
              placeholder="Enter session title"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              name="description"
              placeholder="Describe your session"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium">
              Location
            </label>
            <Input
              id="location"
              name="location"
              placeholder="Enter location"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="start_time" className="text-sm font-medium">
                Start Time
              </label>
              <Input
                id="start_time"
                name="start_time"
                type="datetime-local"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="end_time" className="text-sm font-medium">
                End Time
              </label>
              <Input
                id="end_time"
                name="end_time"
                type="datetime-local"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="max_participants" className="text-sm font-medium">
              Maximum Participants
            </label>
            <Input
              id="max_participants"
              name="max_participants"
              type="number"
              min="1"
              placeholder="Leave empty for unlimited"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="topics" className="text-sm font-medium">
              Topics
            </label>
            <TagInput
              value={topics}
              onChange={setTopics}
              placeholder="Add a topic and press Enter..."
            />
            <p className="text-xs text-muted-foreground">
              Press Enter or comma after each topic
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              id="is_public" 
              checked={isPublicSession} 
              onCheckedChange={setIsPublicSession}
              defaultChecked 
            />
            <label htmlFor="is_public" className="text-sm font-medium">
              Public Session
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Session"}
          </Button>
        </form>
      </div>
    </div>
  );
} 