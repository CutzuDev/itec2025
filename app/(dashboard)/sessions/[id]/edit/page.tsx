"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUpload } from "@/components/ui/image-upload";
import { TagInput } from "@/components/ui/tag-input";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft } from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  max_participants: number | null;
  is_public: boolean;
  avatar_url: string | null;
  creator_id: string;
}

export default function EditEventPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const [topics, setTopics] = useState<string[]>([]);
  const [isPublicSession, setIsPublicSession] = useState(true);

  // Extragem ID-ul din pathname
  useEffect(() => {
    if (pathname) {
      const id = pathname.split('/').pop() || "";
      if (id !== 'edit') {
        setEventId(id);
      } else {
        // Obținem ID-ul din segmentul anterior
        const segments = pathname.split('/');
        if (segments.length >= 2) {
          setEventId(segments[segments.length - 2]);
        }
      }
    }
  }, [pathname]);

  // Funcția pentru a încărca datele evenimentului
  const fetchEvent = useCallback(async (id: string) => {
    if (!id) return null;
    
    setIsLoading(true);
    try {
      const supabase = createClient();
      
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.push("/sign-in");
        return null;
      }
      
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw error;
      }

      if (data.creator_id !== user.id) {
        // Redirectează dacă utilizatorul nu este creatorul evenimentului
        router.push(`/sessions/${id}`);
        return null;
      }

      // Încărcăm topicurile asociate evenimentului
      const { data: topicsData, error: topicsError } = await supabase
        .from("event_topics")
        .select("topic")
        .eq("event_id", id);

      if (topicsError) {
        console.error("Error fetching topics:", topicsError);
      } else {
        setTopics(topicsData.map(t => t.topic) || []);
      }

      return data;
    } catch (error) {
      console.error("Error fetching event:", error);
      setError("Could not load the event. Please try again.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  // Încărcăm datele evenimentului
  useEffect(() => {
    if (!eventId) return;

    async function loadEvent() {
      const data = await fetchEvent(eventId);
      if (data) {
        setEvent(data);
        setAvatarUrl(data.avatar_url);
        setIsPublicSession(data.is_public);
      }
    }

    loadEvent();
  }, [eventId, fetchEvent]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!eventId || !event) {
      setError("Event ID is missing or event data not loaded.");
      setIsSubmitting(false);
      return;
    }

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
      
      console.log("Updating event with data:", {
        title,
        description,
        location,
        startTime,
        endTime,
        maxParticipants: maxParticipants ? parseInt(maxParticipants) : null,
        isPublic: isPublicSession,
        avatarUrl,
        topics
      });

      const { error: updateError } = await supabase
        .from("events")
        .update({
          title,
          description,
          location,
          start_time: startTime,
          end_time: endTime,
          max_participants: maxParticipants ? parseInt(maxParticipants) : null,
          is_public: isPublicSession,
          avatar_url: avatarUrl
        })
        .eq("id", eventId)
        .eq("creator_id", user.id);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        throw updateError;
      }

      // Actualizăm topicurile
      // Mai întâi, ștergem topicurile existente
      const { error: deleteTopicsError } = await supabase
        .from("event_topics")
        .delete()
        .eq("event_id", eventId);

      if (deleteTopicsError) {
        console.error("Error deleting existing topics:", deleteTopicsError);
      }

      // Apoi adăugăm noile topicuri
      if (topics.length > 0) {
        const topicsToInsert = topics.map(topic => ({
          event_id: eventId,
          topic
        }));

        const { error: insertTopicsError } = await supabase
          .from("event_topics")
          .insert(topicsToInsert);

        if (insertTopicsError) {
          console.error("Error adding new topics:", insertTopicsError);
        }
      }

      router.push(`/sessions/${eventId}`);
      router.refresh();
    } catch (error) {
      console.error("Error updating event:", error);
      setError(error instanceof Error ? error.message : "Error updating event");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild>
            <a href="/sessions">Back to Sessions</a>
          </Button>
        </div>
      </div>
    );
  }

  // Format datetime local value
  const formatDateForInput = (dateString: string) => {
    try {
      const date = new Date(dateString);
      // Verificăm dacă data este validă
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toISOString().slice(0, 16);
    } catch (e) {
      console.error("Error formatting date:", e);
      return '';
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-6">
        <a href={`/sessions/${eventId}`} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Session
        </a>
      </Button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Edit Session</h1>
        <p className="text-muted-foreground mb-6">
          Update the details of your study session
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
              defaultValue={event.title}
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
              defaultValue={event.description}
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
              defaultValue={event.location}
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
                defaultValue={formatDateForInput(event.start_time)}
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
                defaultValue={formatDateForInput(event.end_time)}
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
              defaultValue={event.max_participants || ""}
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
            />
            <label htmlFor="is_public" className="text-sm font-medium">
              Public Session
            </label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Updating..." : "Update Session"}
          </Button>
        </form>
      </div>
    </div>
  );
} 