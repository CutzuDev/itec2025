"use client";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Edit, UserMinus, Users } from "lucide-react";

interface EventActionsProps {
  eventId: string;
  isCreator: boolean;
  isParticipant: boolean;
  canJoin: boolean;
}

export function EventActions({ eventId, isCreator, isParticipant, canJoin }: EventActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleJoin = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/sign-in");
        return;
      }

      // Insert new participant without specifying status
      const { error: insertError } = await supabase
        .from("event_participants")
        .insert([{
          event_id: eventId,
          user_id: user.id
        }]);

      if (insertError) {
        console.error("Error joining event:", insertError);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error joining event:", error);
    }
  };

  const handleLeave = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push("/sign-in");
        return;
      }

      const { error: deleteError } = await supabase
        .from("event_participants")
        .delete()
        .match({ event_id: eventId, user_id: user.id });

      if (deleteError) {
        console.error("Error leaving event:", deleteError);
        return;
      }

      router.refresh();
    } catch (error) {
      console.error("Error leaving event:", error);
    }
  };

  const handleEdit = () => {
    router.push(`/sessions/${eventId}/edit`);
  };

  const handleManageParticipants = () => {
    router.push(`/sessions/${eventId}/participants`);
  };

  if (isCreator) {
    return (
      <div className="pt-4 flex gap-3">
        <Button variant="outline" onClick={handleEdit} className="flex items-center gap-2">
          <Edit size={16} />
          Editează sesiunea
        </Button>
        <Button variant="outline" onClick={handleManageParticipants} className="flex items-center gap-2">
          <Users size={16} />
          Gestionează participanții
        </Button>
      </div>
    );
  }

  if (isParticipant) {
    return (
      <div className="pt-4">
        <Button variant="destructive" onClick={handleLeave}>
          Leave Session
        </Button>
      </div>
    );
  }

  if (canJoin) {
    return (
      <div className="pt-4">
        <Button onClick={handleJoin}>
          Join Session
        </Button>
      </div>
    );
  }

  return (
    <div className="pt-4">
      <Button disabled>
        Session Full
      </Button>
    </div>
  );
} 