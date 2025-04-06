import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarIcon, PlusIcon, MapPinIcon, ClockIcon, UsersIcon } from "lucide-react";

export default async function CalendarPage() {
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
    .or(`creator_id.eq.${user.id},id.in.(${participantEventIds.join(',')})`)
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

  // Group events by date
  const eventsByDate = (events || []).reduce((acc, event) => {
    const date = new Date(event.start_time).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push({
      ...event,
      isParticipating: participantEventIds.includes(event.id),
      current_participants: event.event_participants?.[0]?.count || 0
    });
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">My Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Your study sessions and events
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/sessions" className="flex items-center gap-2">
              <CalendarIcon size={16} />
              All Sessions
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
                <div
                  key={event.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
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
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            Hosted by {event.creator?.full_name || 'Unknown'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm text-muted-foreground">
                            {event.is_public ? "Public" : "Private"}
                          </span>
                          {event.creator_id === user.id ? (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Hosting
                            </span>
                          ) : event.isParticipating && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                              Joined
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {event.description && (
                        <p className="text-muted-foreground mb-3">{event.description}</p>
                      )}
                      
                      <div className="space-y-2 text-sm text-muted-foreground">
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
                              {event.current_participants || 0} / {event.max_participants} participants
                            </span>
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/sessions/${event.id}`}>View Details</a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(eventsByDate).length === 0 && (
          <div className="text-center py-12 border rounded-lg">
            <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No events found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You don't have any study sessions yet
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
