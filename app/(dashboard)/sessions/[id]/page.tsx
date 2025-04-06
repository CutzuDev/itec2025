"use server";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import React from "react";
import {
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  UsersIcon,
  ArrowLeft,
  Tag,
  BookOpen,
  FileText,
  Volume2,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { EventActions } from "@/components/event-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import AudioLink from '../_components/audio-link';

// Define interfaces for our data
interface EventType {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  is_public: boolean | null;
  created_at: string | null;
  creator_id: string;
  max_participants: number | null;
  tags?: string[] | null;
  avatar_url?: string;
  creator: {
    id: string;
    full_name: string;
    email: string;
  };
  event_participants: {
    id: string;
    user_id: string;
    status: string;
    created_at: string;
  }[];
}


async function joinEvent(formData: FormData) {

  try {
    const supabase = await createClient();
    const eventId = formData.get("event_id");

    if (!eventId || typeof eventId !== "string") {
      throw new Error("Invalid event ID");
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return redirect("/sign-in");
    }

    // First check if the event exists
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      throw new Error("Event not found");
    }

    // Check if user is already a participant
    const { data: existingParticipant, error: checkError } = await supabase
      .from("event_participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (checkError) {
      throw new Error("Error checking participant status");
    }

    if (existingParticipant) {
      return redirect(`/sessions/${eventId}`);
    }

    // Insert new participant
    const { error: insertError } = await supabase
      .from("event_participants")
      .insert([
        {
          event_id: eventId,
          user_id: user.id,
          status: "joined",
        },
      ]);

    if (insertError) {
      throw new Error(`Failed to join event: ${insertError.message}`);
    }

    return redirect(`/sessions/${eventId}`);
  } catch (error) {
    console.error("Error in joinEvent:", error);
    return redirect("/sessions");
  }
}

async function leaveEvent(formData: FormData) {

  const supabase = await createClient();
  const eventId = formData.get("event_id") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  const { error } = await supabase
    .from("event_participants")
    .delete()
    .match({ event_id: eventId, user_id: user.id });

  if (error) {
    console.error("Error leaving event:", error);
    // Handle error appropriately
  }

  // Refresh the page to show updated state
  redirect(`/sessions/${eventId}`);
}

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch event details with creator and participants
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select(
      `
      *,
      creator:users!creator_id(id, full_name, email),
      event_participants(
        id,
        user_id,
        status,
        created_at
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (eventError || !event) {
    console.error("Error fetching event:", eventError);
    return notFound();
  }

  const typedEvent = event as unknown as EventType;

  // For curricula shared with this event, we'll focus only on direct event_id links
  // This simplifies our approach and avoids issues with potentially missing tables
  const { data: eventCurricula, error: curriculaError } = await supabase
    .from("curricula")
    .select("id, title, summary, audio_url, creator_id, created_at")
    .eq("event_id", params.id);

  if (curriculaError) {
    console.error("Error fetching curricula:", curriculaError);
  }

  const allCurricula = eventCurricula || [];

  // Get creator details for the curricula
  const creatorIds = Array.from(new Set(allCurricula.map(c => c.creator_id)));
  
  let creatorMap: Record<string, any> = {};
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from("users")
      .select("id, full_name")
      .in("id", creatorIds);
      
    if (creators) {
      creatorMap = creators.reduce((acc, creator) => {
        acc[creator.id] = creator;
        return acc;
      }, {} as Record<string, any>);
    }
  }

  // Fetch participants details
  const { data: participants } = await supabase
    .from("users")
    .select("id, full_name, email")
    .in(
      "id",
      typedEvent.event_participants.map((p) => p.user_id)
    );

  const participantsMap = new Map(participants?.map((p) => [p.id, p]) || []);

  const isCreator = typedEvent.creator_id === user.id;
  const isParticipant = typedEvent.event_participants.some(
    (p) => p.user_id === user.id
  );
  const canJoin =
    !isCreator &&
    !isParticipant &&
    (!typedEvent.max_participants ||
      typedEvent.event_participants.length < typedEvent.max_participants);

  // Fetch topics
  const { data: topics } = await supabase
    .from("event_topics")
    .select("id, topic")
    .eq("event_id", params.id);

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-6">
        <a href="/sessions" className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Sessions
        </a>
      </Button>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          {typedEvent.avatar_url && (
            <div className="aspect-video w-full relative rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={typedEvent.avatar_url}
                alt={typedEvent.title}
                className="object-cover w-full h-full"
              />
            </div>
          )}

          <div>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2">{typedEvent.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Hosted by {typedEvent.creator?.full_name || "Unknown"}
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {typedEvent.is_public ? "Public" : "Private"}
              </span>
            </div>

            {topics && topics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {topics.map((topicItem) => (
                  <Badge
                    key={topicItem.id}
                    variant="secondary"
                    className="px-2 py-1"
                  >
                    <Tag size={12} className="mr-1" />
                    {topicItem.topic}
                  </Badge>
                ))}
              </div>
            )}

            {typedEvent.description && (
              <p className="mt-4 text-muted-foreground">{typedEvent.description}</p>
            )}
          </div>

          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <ClockIcon size={16} />
              <div>
                <div>
                  {new Date(typedEvent.start_time).toLocaleDateString("ro-RO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div>
                  {new Date(typedEvent.start_time).toLocaleTimeString("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" - "}
                  {new Date(typedEvent.end_time).toLocaleTimeString("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {typedEvent.location && (
              <div className="flex items-center gap-2">
                <MapPinIcon size={16} />
                <span>{typedEvent.location}</span>
              </div>
            )}

            {typedEvent.max_participants && (
              <div className="flex items-center gap-2">
                <UsersIcon size={16} />
                <span>
                  {typedEvent.event_participants.length} / {typedEvent.max_participants}{" "}
                  participants
                </span>
              </div>
            )}
          </div>

          <EventActions
            eventId={typedEvent.id}
            isCreator={isCreator}
            isParticipant={isParticipant}
            canJoin={canJoin}
          />

          {/* Study Materials Section */}
          {allCurricula.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <BookOpen className="mr-2 h-5 w-5" />
                Study Materials
              </h2>
              <div className="space-y-4">
                {allCurricula.map((curriculum) => (
                  <Card key={curriculum.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{curriculum.title}</CardTitle>
                          <CardDescription>
                            Shared by {creatorMap[curriculum.creator_id]?.full_name || 'Unknown'}
                          </CardDescription>
                        </div>
                        {curriculum.audio_url && (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <Volume2 className="h-3 w-3 mr-1" />
                            Audio Available
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {curriculum.summary ? (
                        <div className="prose prose-sm max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: curriculum.summary }} />
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic">No summary available</p>
                      )}
                      
                      {curriculum.audio_url && (
                        <div className="mt-4">
                          <AudioLink audioUrl={curriculum.audio_url} />
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="bg-muted/50 py-2">
                      <div className="text-xs text-muted-foreground">
                        Added on {curriculum.created_at ? new Date(curriculum.created_at).toLocaleDateString() : 'Unknown date'}
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-3">
            {/* Show creator first */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                {typedEvent.creator?.full_name?.[0] || "?"}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {typedEvent.creator?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">Host</p>
              </div>
            </div>

            {/* Show other participants */}
            {typedEvent.event_participants
              .filter((p) => p.user_id !== typedEvent.creator_id)
              .map((participant) => {
                const participantDetails = participantsMap.get(
                  participant.user_id
                );
                return (
                  <div key={participant.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      {participantDetails?.full_name?.[0] || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {participantDetails?.full_name || "Unknown User"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Joined{" "}
                        {participant.created_at
                          ? new Date(
                              participant.created_at
                            ).toLocaleDateString()
                          : "recently"}
                      </p>
                    </div>
                  </div>
                );
              })}

            {typedEvent.event_participants.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No participants yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
