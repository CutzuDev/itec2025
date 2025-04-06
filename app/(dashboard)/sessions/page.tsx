import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusIcon, MapPinIcon, ClockIcon, UsersIcon, Tag } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function SessionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch all public events and private events where user is participant
  const { data: events, error } = await supabase
    .from("events")
    .select(`
      *,
      creator:users!creator_id(full_name),
      event_participants(count)
    `)
    .or(`is_public.eq.true,creator_id.eq.${user.id}`)
    .gte('end_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Error loading events</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please try again later
          </p>
        </div>
      </div>
    );
  }

  // Get all events where user is participant
  const { data: participantEvents } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", user.id);

  const participantEventIds = new Set(participantEvents?.map(p => p.event_id) || []);

  // Fetch topics for all events
  const { data: allTopics } = await supabase
    .from("event_topics")
    .select("event_id, id, topic");

  // Group topics by event_id
  const topicsByEventId = (allTopics || []).reduce((acc, topic) => {
    if (!acc[topic.event_id]) {
      acc[topic.event_id] = [];
    }
    acc[topic.event_id].push(topic);
    return acc;
  }, {} as Record<string, any[]>);

  // Group events by date
  const eventsByDate = (events || []).reduce((acc, event) => {
    const date = new Date(event.start_time).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({
      ...event,
      isParticipating: participantEventIds.has(event.id),
      current_participants: event.event_participants?.[0]?.count || 0,
      topics: topicsByEventId[event.id] || []
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Study Sessions</h1>
          <p className="text-sm text-muted-foreground">
            Browse and join study sessions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/calendar" className="flex items-center gap-2">
              <CalendarIcon size={16} />
              My Calendar
            </a>
          </Button>
          <Button asChild>
            <a href="/sessions/create" className="flex items-center gap-2">
              <PlusIcon size={16} />
              Create Session
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-8">
        {Object.entries(eventsByDate).map(([date, events]) => (
          <div key={date} className="space-y-4">
            <h2 className="text-lg font-semibold sticky top-0 bg-background py-2">
              {new Date(date).toLocaleDateString('ro-RO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h2>
            <div className="grid gap-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/sessions/${event.id}`}
                  className="block"
                >
                  <Card className="hover:bg-accent/50 transition-colors">
                    <CardHeader>
                      <div className="flex gap-4">
                        {event.avatar_url && (
                          <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={event.avatar_url}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <CardTitle>{event.title}</CardTitle>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm text-muted-foreground">
                                {event.is_public ? "Public" : "Privat"}
                              </span>
                              {event.isParticipating && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  Participă
                                </span>
                              )}
                            </div>
                          </div>
                          <CardDescription>
                            Creat de {event.creator?.full_name || 'Utilizator necunoscut'}
                          </CardDescription>
                          
                          {event.topics && event.topics.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.topics.slice(0, 3).map((topicItem: any) => (
                                <Badge key={topicItem.id} variant="outline" className="px-1.5 py-0.5 text-xs">
                                  <Tag size={10} className="mr-1" />
                                  {topicItem.topic}
                                </Badge>
                              ))}
                              {event.topics.length > 3 && (
                                <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
                                  +{event.topics.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          {event.description && (
                            <p className="text-muted-foreground mt-2">{event.description}</p>
                          )}
                          <div className="space-y-2 text-sm text-muted-foreground mt-3">
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
                                  {event.current_participants || 0} / {event.max_participants} participanți
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(eventsByDate).length === 0 && (
          <div className="text-center py-12 border rounded-lg">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Be the first to create a study session
            </p>
            <Button asChild>
              <a href="/sessions/create">Create Session</a>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 