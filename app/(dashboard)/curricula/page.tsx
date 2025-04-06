"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, Share2, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Curriculum = {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  created_at: string;
  event_id?: string;
};

type Event = {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
};

export default function CurriculaPage() {
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurriculum, setSelectedCurriculum] =
    useState<Curriculum | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Event sharing related state
  const [events, setEvents] = useState<Event[]>([]);
  const [sharingCurriculumId, setSharingCurriculumId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharedEvents, setSharedEvents] = useState<{curriculumId: string, eventId: string, eventTitle: string}[]>([]);
  
  const supabase = createClient();

  const fetchCurricula = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to view your curricula");
      }

      // Fetch curricula created by the current user
      const { data, error: fetchError } = await supabase
        .from("curricula")
        .select("id, title, content, summary, created_at, event_id")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(`Failed to fetch curricula: ${fetchError.message}`);
      }

      // If a curriculum has event_id but its details aren't in the events list yet
      // Fetch those events to ensure we have their titles
      const eventIds = data
        ?.filter(c => c.event_id)
        .map(c => c.event_id as string)
        .filter(id => !events.some(e => e.id === id)) || [];
      
      // If we have events to fetch
      if (eventIds.length > 0) {
        try {
          const { data: additionalEvents } = await supabase
            .from('events')
            .select('id, title, start_time, end_time')
            .in('id', eventIds);
            
          if (additionalEvents && additionalEvents.length > 0) {
            // Add these events to our events state
            setEvents(prev => {
              const newEvents = [...prev];
              additionalEvents.forEach(event => {
                if (!newEvents.some(e => e.id === event.id)) {
                  newEvents.push(event);
                }
              });
              return newEvents;
            });
          }
        } catch (eventError) {
          console.warn("Could not fetch additional event details:", eventError);
        }
      }

      setCurricula(data || []);
    } catch (err) {
      setError(
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setCurricula([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurricula();
    fetchEvents();
    fetchSharedCurricula();
  }, []);

  // Fetch events where user is creator
  const fetchEvents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Get events created by the user
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_time, end_time')
        .eq('creator_id', user.id)
        .order('start_time', { ascending: false });

      if (error) throw error;

      setEvents(data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  // Fetch curricula already shared with events
  const fetchSharedCurricula = async () => {
    try {
      // Safely get user data
      const userResponse = await supabase.auth.getUser();
      const user = userResponse?.data?.user;
      
      if (!user) {
        console.log('No authenticated user found, skipping shared curricula fetch');
        setSharedEvents([]);
        return;
      }

      // Safely check if tables exist using RPC or a more controlled approach
      try {
        // First check if the table exists by trying a simple count query
        const { count, error: countError } = await supabase
          .from('curricula_events')
          .select('*', { count: 'exact', head: true });
        
        // If there's an error that suggests the table doesn't exist
        if (countError) {
          console.log('curricula_events table may not exist yet:', countError.message);
          setSharedEvents([]);
          return;
        }
      } catch (tableError) {
        console.log('Error checking table existence:', tableError);
        setSharedEvents([]);
        return;
      }

      // Get curricula_events relationships with safer query
      let relationships = [];
      try {
        const { data, error } = await supabase
          .from('curricula_events')
          .select('curriculum_id, event_id')
          .eq('creator_id', user.id);
        
        if (error) {
          console.warn('Could not fetch curricula-event relationships:', error.message);
          setSharedEvents([]);
          return;
        }
        
        relationships = data || [];
        
        if (relationships.length === 0) {
          setSharedEvents([]);
          return;
        }
      } catch (relError) {
        console.error('Exception fetching relationships:', relError);
        setSharedEvents([]);
        return;
      }
      
      // Get all relevant event IDs
      const eventIds = relationships.map(rel => rel.event_id);
      
      // Check if we have any valid event IDs
      if (eventIds.length === 0) {
        setSharedEvents([]);
        return;
      }
      
      // Try to get event titles
      let eventMap: Record<string, string> = {};
      try {
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('id, title')
          .in('id', eventIds);
        
        if (!eventError && eventData) {
          // Create a map of event ID to title for easy lookup
          eventMap = eventData.reduce((map: Record<string, string>, event) => {
            if (event && event.id) {
              map[event.id] = event.title || 'Untitled Event';
            }
            return map;
          }, {});
        } else {
          console.warn('Could not fetch event details:', eventError?.message);
        }
      } catch (eventFetchError) {
        console.error('Exception fetching events:', eventFetchError);
        // Continue with empty event map
      }
      
      // Create the shared events data safely
      try {
        const shared = relationships.map(rel => {
          // Verify data integrity
          if (!rel || !rel.curriculum_id || !rel.event_id) {
            return null;
          }
          
          return {
            curriculumId: rel.curriculum_id,
            eventId: rel.event_id,
            eventTitle: (eventMap[rel.event_id] || 'Unknown Event')
          };
        }).filter((item): item is {curriculumId: string, eventId: string, eventTitle: string} => 
          item !== null
        ); // Remove any null entries and fix TypeScript type
        
        setSharedEvents(shared);
      } catch (mappingError) {
        console.error('Error mapping shared curricula data:', mappingError);
        setSharedEvents([]);
      }
    } catch (err) {
      console.error('Unhandled error in fetchSharedCurricula:', err);
      // Don't break the UI, just set empty shared events
      setSharedEvents([]);
    }
  };

  // Share curriculum with selected event
  const shareCurriculum = async () => {
    if (!sharingCurriculumId || !selectedEventId) return;
    
    try {
      setSharingLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to share curricula");
      }
      
      // Check if already shared
      const isAlreadyShared = sharedEvents.some(
        se => se.curriculumId === sharingCurriculumId && se.eventId === selectedEventId
      );
      
      if (isAlreadyShared) {
        setSuccessMessage("This curriculum is already shared with the selected event");
        setSharingCurriculumId(null);
        return;
      }

      // First verify that the user owns the event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, title')
        .eq('id', selectedEventId)
        .eq('creator_id', user.id)
        .single();
      
      if (eventError || !eventData) {
        throw new Error("You can only share curricula with events you've created");
      }

      // Update the curriculum record to set the event_id
      const { error: updateError } = await supabase
        .from('curricula')
        .update({ 
          event_id: selectedEventId,
          updated_at: new Date().toISOString()
        })
        .eq('id', sharingCurriculumId)
        .eq('creator_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update curriculum: ${updateError.message}`);
      }

      // Also add to curricula_events for backward compatibility and additional sharing features
      const { error: insertError } = await supabase
        .from('curricula_events')
        .insert({
          curriculum_id: sharingCurriculumId,
          event_id: selectedEventId,
          creator_id: user.id
        });

      if (insertError) {
        console.warn('Could not add to curricula_events table:', insertError.message);
        // Continue even if this fails, since we've updated the main record
      }

      // Update local state
      setSharedEvents([
        ...sharedEvents,
        {
          curriculumId: sharingCurriculumId,
          eventId: selectedEventId,
          eventTitle: eventData.title
        }
      ]);
      
      // Update the curricula list with the new event_id
      setCurricula(curricula.map(c => 
        c.id === sharingCurriculumId 
          ? {...c, event_id: selectedEventId}
          : c
      ));
      
      setSuccessMessage(`Successfully shared curriculum with event: ${eventData.title}`);
    } catch (err) {
      setError(`Failed to share curriculum: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSharingLoading(false);
      setSharingCurriculumId(null);
      setSelectedEventId("");
    }
  };

  // Get events a curriculum is shared with
  const getCurriculumSharedEvents = (curriculumId: string) => {
    // First check the sharedEvents list from curricula_events table
    const fromSharedEvents = sharedEvents.filter(se => se.curriculumId === curriculumId);
    
    // Then check if the curriculum itself has an event_id directly assigned
    const curriculum = curricula.find(c => c.id === curriculumId);
    if (curriculum?.event_id) {
      // Check if this event is already in the results
      const alreadyIncluded = fromSharedEvents.some(se => se.eventId === curriculum.event_id);
      
      if (!alreadyIncluded) {
        // Find the event details
        const event = events.find(e => e.id === curriculum.event_id);
        if (event) {
          // Add it to the results
          fromSharedEvents.push({
            curriculumId,
            eventId: curriculum.event_id,
            eventTitle: event.title
          });
        }
      }
    }
    
    return fromSharedEvents;
  };

  const handleDeleteCurriculum = async (id: string) => {
    try {
      setDeletingId(id);
      setError(null);
      setSuccessMessage(null);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("You must be logged in to delete curricula");
      }

      // Delete the curriculum
      const { error: deleteError } = await supabase
        .from("curricula")
        .delete()
        .eq("id", id)
        .eq("creator_id", user.id); // Ensure only creator can delete

      if (deleteError) {
        throw new Error(`Failed to delete: ${deleteError.message}`);
      }

      // Refresh the curricula list
      setSuccessMessage("Curriculum deleted successfully");

      // If the deleted curriculum was selected, unselect it
      if (selectedCurriculum?.id === id) {
        setSelectedCurriculum(null);
      }

      // Update the curricula list by removing the deleted item
      setCurricula(curricula.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        `Error deleting curriculum: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setDeletingId(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleDownload = (curriculum: Curriculum) => {
    try {
      // Convert base64 string to binary
      const binaryString = atob(curriculum.content);
      const bytes = new Uint8Array(binaryString.length);

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Create blob and download link
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${curriculum.title}.pdf`;
      document.body.appendChild(a);
      a.click();

      // Clean up
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(
        `Failed to download PDF: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="w-full p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Curricula</h1>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Show event sharing UI when a curriculum is selected for sharing */}
        {sharingCurriculumId && (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4">
            <h3 className="text-lg font-medium mb-2">
              Share Curriculum with Event
            </h3>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="select-event" className="mb-2 block">Select Event</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger id="select-event">
                    <SelectValue placeholder="Choose an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} ({new Date(event.start_time).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSharingCurriculumId(null)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={shareCurriculum} 
                  disabled={!selectedEventId || sharingLoading}
                >
                  {sharingLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    "Share"
                  )}
                </Button>
              </div>
            </div>
            {events.length === 0 && (
              <p className="text-sm text-blue-700 mt-2">
                You don't have any events. Create events first to share your curricula.
              </p>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-10">Loading your curricula...</div>
        ) : curricula.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-600 mb-4">
              You haven't created any curricula yet.
            </p>
            <Button onClick={() => (window.location.href = "/summaries")}>
              Create New Curriculum
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {curricula.map((curriculum) => (
              <Card key={curriculum.id} className="h-full flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="truncate">
                        {curriculum.title.length > 14 
                          ? `${curriculum.title.substring(0, 14)}...` 
                          : curriculum.title}
                      </CardTitle>
                      <CardDescription>
                        Created on {formatDate(curriculum.created_at)}
                      </CardDescription>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {getCurriculumSharedEvents(curriculum.id).map(event => (
                          <Badge
                            key={event.eventId}
                            variant="outline"
                            className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                          >
                            {event.eventTitle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSharingCurriculumId(curriculum.id);
                          setSelectedEventId("");
                        }}
                        title="Share with Event"
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        disabled={sharingCurriculumId !== null}
                      >
                        <Share2 size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(curriculum.id)}
                        title="Delete"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="flex space-x-2 mb-4">
                    <Button
                      onClick={() => handleDownload(curriculum)}
                      variant="outline"
                      size="sm"
                    >
                      Download PDF
                    </Button>
                    <Button
                      onClick={() =>
                        setSelectedCurriculum(
                          selectedCurriculum?.id === curriculum.id
                            ? null
                            : curriculum
                        )
                      }
                      variant="outline"
                      size="sm"
                    >
                      {selectedCurriculum?.id === curriculum.id
                        ? "Hide Summary"
                        : "View Summary"}
                    </Button>
                  </div>

                  {selectedCurriculum?.id === curriculum.id && (
                    <div className="bg-gray-50 p-4 rounded-md max-h-80 overflow-y-auto">
                      {curriculum.summary ? (
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: curriculum.summary,
                          }}
                        />
                      ) : (
                        <p className="text-gray-500 italic">
                          No summary available
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to delete this curriculum?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              curriculum and its associated PDF content and summary.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && handleDeleteCurriculum(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
