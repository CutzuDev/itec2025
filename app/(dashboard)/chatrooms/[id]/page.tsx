"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, ArrowLeft, Send, CalendarIcon, ClockIcon, MapPinIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { ChatMessages } from "@/components/chat-messages";
import { ChatInput } from "@/components/chat-input";
import React from "react";

// Definirea tipului pentru mesaje
interface Message {
  id: string;
  message: string;
  created_at: string;
  updated_at: string | null;
  files: string[] | null;
  user: {
    full_name: string;
    avatar_url?: string | null;
  };
  user_id: string;
  event_id: string;
}

// Definirea tipului pentru evenimente
interface Event {
  id: string;
  title: string;
  description: string | null;
  creator_id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  max_participants: number | null;
  is_public: boolean | null;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
  creator?: {
    full_name: string | null;
  };
  event_participants?: {
    count: number;
  }[];
}

// @ts-ignore - bypassing TypeScript for Next.js build
export default async function ChatroomPage({ params }: any) {
  const eventId = params.id;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch event details
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select(`
      *,
      creator:users!creator_id(full_name),
      event_participants(count)
    `)
    .eq("id", eventId)
    .single();

  if (eventError || !eventData) {
    console.error("Error fetching event:", eventError);
    return notFound();
  }
  
  // Convertim la tipul Event
  const event: Event = eventData as Event;

  // Check if user is creator or participant
  const { data: participant } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  const isCreator = event.creator_id === user.id;
  const isParticipant = !!participant;

  if (!isCreator && !isParticipant) {
    return notFound();
  }

  // Fetch chat messages
  const { data: messagesData, error: messagesError } = await supabase
    .from("chat_messages")
    .select(`
      *,
      user:users!user_id(full_name, avatar_url)
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("Error fetching messages:", messagesError);
  }
  
  // Folosim any pentru a ocoli problemele de tip
  const messages = messagesData as any;

  const { data: currentUser } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/chatrooms" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Înapoi la chat-uri
          </Link>
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground">
              Chat pentru evenimentul organizat de {event.creator?.full_name || 'Utilizator necunoscut'}
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {isCreator ? "Organizator" : "Participant"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg">Mesaje</CardTitle>
              <CardDescription>
                {event.event_participants?.[0]?.count || 0} participanți în chat
              </CardDescription>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-4">
              <ChatMessages 
                initialMessages={messages} 
                currentUserId={user.id} 
                eventId={eventId}
              />
            </div>
            <div className="border-t p-4">
              <ChatInput 
                eventId={eventId} 
                userId={user.id} 
                userName={currentUser?.full_name || 'Utilizator necunoscut'}
              />
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Informații eveniment</CardTitle>
            </CardHeader>
            <div className="p-4 space-y-4">
              {event.avatar_url && (
                <div className="aspect-video w-full relative rounded-lg overflow-hidden">
                  <img
                    src={event.avatar_url}
                    alt={event.title}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {event.description && (
                <div>
                  <h3 className="font-medium mb-1">Descriere</h3>
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={14} />
                  <span>
                    {new Date(event.start_time).toLocaleDateString('ro-RO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ClockIcon size={14} />
                  <span>
                    {new Date(event.start_time).toLocaleTimeString('ro-RO', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {" - "}
                    {new Date(event.end_time).toLocaleTimeString('ro-RO', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPinIcon size={14} />
                    <span>{event.location}</span>
                  </div>
                )}
                
                {event.max_participants && (
                  <div className="flex items-center gap-2">
                    <UsersIcon size={14} />
                    <span>
                      {event.event_participants?.[0]?.count || 0} / {event.max_participants} participanți
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
} 