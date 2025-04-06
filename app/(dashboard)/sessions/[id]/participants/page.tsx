"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, UserMinus, User } from "lucide-react";
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

interface Participant {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface Event {
  id: string;
  title: string;
  creator_id: string;
}

// Adăugăm componente simple pentru tabel, în loc să importăm din module care pot să nu existe
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full overflow-auto">
    <table className="w-full caption-bottom text-sm">{children}</table>
  </div>
);

const TableHeader = ({ children }: { children: React.ReactNode }) => (
  <thead className="[&_tr]:border-b">{children}</thead>
);

const TableBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="[&_tr:last-child]:border-0">{children}</tbody>
);

const TableRow = ({ children }: { children: React.ReactNode }) => (
  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">{children}</tr>
);

const TableHead = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground ${className}`}>{children}</th>
);

const TableCell = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <td className={`p-4 align-middle ${className}`}>{children}</td>
);

// Helper pentru a executa interogări Supabase în mod sigur
const useSafeSupabase = () => {
  const fetchParticipants = useCallback(async (eventIdParam: string) => {
    const supabase = createClient();
    
    // Verificăm dacă eventId este valid
    if (!eventIdParam) {
      return { error: new Error("Event ID is missing"), data: null, user: null };
    }

    try {
      // Obținem utilizatorul curent
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { error: authError || new Error("Authentication failed"), data: null, user: null };
      }

      // Obținem detaliile evenimentului
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, title, creator_id")
        .eq("id", eventIdParam)
        .single();

      if (eventError || !eventData) {
        return { error: eventError || new Error("Event not found"), data: null, user };
      }

      // Verificăm dacă utilizatorul este creatorul evenimentului
      if (eventData.creator_id !== user.id) {
        return { error: new Error("Not authorized to manage this event"), data: null, user };
      }

      // Obținem participanții
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_participants")
        .select(`
          id,
          user_id,
          status,
          created_at,
          user:users(id, full_name, email)
        `)
        .eq("event_id", eventIdParam);

      if (participantsError) {
        return { error: participantsError, data: null, user };
      }

      // Procesează formatul datelor
      const formattedParticipants = (participantsData || []).map(p => {
        const userObj = Array.isArray(p.user) ? p.user[0] : p.user;
        
        return {
          id: p.id,
          user_id: p.user_id,
          status: p.status,
          created_at: p.created_at,
          user: {
            id: userObj?.id || '',
            full_name: userObj?.full_name || '',
            email: userObj?.email || ''
          }
        };
      });

      return { 
        error: null, 
        data: { 
          event: eventData,
          participants: formattedParticipants
        },
        user
      };
    } catch (error) {
      console.error("Error fetching data:", error);
      return { error, data: null, user: null };
    }
  }, []);

  const removeParticipant = useCallback(async (eventId: string, participantId: string, currentUserId: string) => {
    try {
      const supabase = createClient();
      
      if (!eventId) {
        return { error: new Error("Event ID is missing") };
      }

      const { error } = await supabase
        .from("event_participants")
        .delete()
        .eq("id", participantId)
        .eq("event_id", eventId);

      return { error };
    } catch (error) {
      console.error("Error removing participant:", error);
      return { error };
    }
  }, []);

  return { fetchParticipants, removeParticipant };
};

export default function ParticipantsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string>("");
  const { fetchParticipants, removeParticipant } = useSafeSupabase();

  // Extragem ID-ul din pathname
  useEffect(() => {
    if (pathname) {
      const id = pathname.split('/').pop() || "";
      setEventId(id);
    }
  }, [pathname]);

  useEffect(() => {
    // Nu încărcăm datele până când eventId nu este setat
    if (!eventId) return;

    async function loadData() {
      setIsLoading(true);
      
      const result = await fetchParticipants(eventId);
      
      if (result.error) {
        console.error("Error:", result.error);
        setError(result.error instanceof Error ? result.error.message : String(result.error));
        
        // Redirect based on error type
        if (result.error instanceof Error) {
          if (result.error.message === "Authentication failed") {
            router.push("/sign-in");
          } else if (result.error.message === "Not authorized to manage this event") {
            router.push(`/sessions/${eventId}`);
          }
        }
      } else if (result.data) {
        setEvent(result.data.event);
        setParticipants(result.data.participants);
        if (result.user) {
          setCurrentUserId(result.user.id);
        }
      }
      
      setIsLoading(false);
    }

    loadData();
  }, [eventId, router, fetchParticipants]);

  const handleRemoveParticipant = async (participantId: string, participantUserId: string) => {
    // Nu permitem eliminarea propriului cont
    if (participantUserId === currentUserId) {
      setError("Nu vă puteți elimina pe dvs. din sesiune.");
      return;
    }

    // Verificăm dacă eventId este setat
    if (!eventId) {
      setError("ID-ul sesiunii nu este disponibil. Reîncărcați pagina.");
      return;
    }

    const { error: removeError } = await removeParticipant(eventId, participantId, currentUserId || "");
    
    if (removeError) {
      setError("Could not remove participant. Please try again.");
    } else {
      // Actualizăm lista de participanți
      setParticipants(prev => prev.filter(p => p.id !== participantId));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-4xl mx-auto text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Event not found</h1>
          <Button asChild>
            <a href="/sessions">Back to Sessions</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Button variant="ghost" asChild className="mb-6">
        <a href={event ? `/sessions/${event.id}` : '/sessions'} className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to Session
        </a>
      </Button>

      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Manage Participants</h1>
        <p className="text-muted-foreground mb-6">
          For session: {event?.title}
        </p>

        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {participants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No participants yet</h3>
            <p className="text-sm text-muted-foreground">
              Share your session with others to get participants
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nume</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Data alăturării</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow key={participant.id}>
                  <TableCell className="font-medium">{participant.user.full_name}</TableCell>
                  <TableCell>{participant.user.email}</TableCell>
                  <TableCell>
                    {new Date(participant.created_at).toLocaleDateString("ro-RO")}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1 text-destructive"
                          disabled={participant.user.id === currentUserId}
                        >
                          <UserMinus size={14} />
                          Exclude
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmă excluderea</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ești sigur că vrei să excludi pe {participant.user.full_name} din această sesiune?
                            Această acțiune nu poate fi anulată.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anulează</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveParticipant(participant.id, participant.user.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Exclude
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
} 