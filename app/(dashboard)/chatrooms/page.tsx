import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MessageSquare, CalendarIcon, PlusIcon } from "lucide-react";
import Link from "next/link";

export default async function ChatroomsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // First get all events where user is participant
  const { data: participantEvents } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", user.id);

  const participantEventIds = participantEvents?.map(p => p.event_id) || [];

  // Then fetch all relevant events
  const { data: events, error } = await supabase
    .from("events")
    .select(`
      *,
      creator:users!creator_id(full_name),
      event_participants(count)
    `)
    .or(`creator_id.eq.${user.id}${participantEventIds.length ? `,id.in.(${participantEventIds.join(',')})` : ''}`)
    .gte('end_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error("Error fetching events:", error);
    return (
      <div className="container mx-auto py-8">
        <div className="text-center py-12 border rounded-lg">
          <h3 className="text-lg font-medium mb-2">Eroare la încărcarea chat-urilor</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Vă rugăm să încercați din nou mai târziu
          </p>
        </div>
      </div>
    );
  }

  // Group events by date
  const eventsByDate = (events || []).reduce((acc, event) => {
    const date = new Date(event.start_time).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({
      ...event,
      isCreator: event.creator_id === user.id,
      current_participants: event.event_participants?.[0]?.count || 0
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Chat-uri</h1>
          <p className="text-sm text-muted-foreground">
            Chat-uri pentru evenimentele la care participi
          </p>
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
                  href={`/chatrooms/${event.id}`}
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
                              {event.isCreator ? (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  Organizator
                                </span>
                              ) : (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                  Participant
                                </span>
                              )}
                            </div>
                          </div>
                          <CardDescription>
                            Creat de {event.creator?.full_name || 'Utilizator necunoscut'}
                          </CardDescription>
                          <div className="space-y-2 text-sm text-muted-foreground mt-3">
                            <div className="flex items-center gap-2">
                              <CalendarIcon size={14} />
                              <span>
                                {new Date(event.start_time).toLocaleTimeString('ro-RO', { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </span>
                            </div>
                            
                            {event.max_participants && (
                              <div className="flex items-center gap-2">
                                <MessageSquare size={14} />
                                <span>
                                  {event.current_participants || 0} participanți în chat
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
            <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nu există chat-uri</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Nu participi la niciun eveniment momentan
            </p>
            <Button asChild>
              <Link href="/sessions">Explorează evenimente</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 