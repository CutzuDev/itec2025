"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { Paperclip, MoreVertical, Pencil, Trash2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  message: string;
  created_at: string;
  updated_at: string | null;
  files: string[] | null;
  user: {
    full_name: string;
    avatar_url?: string;
  };
  user_id: string;
}

interface ChatMessagesProps {
  initialMessages: Message[];
  currentUserId: string;
  eventId: string;
}

export function ChatMessages({ initialMessages, currentUserId, eventId }: ChatMessagesProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Inițializăm canalele pentru mesaje și typing
    const messagesChannel = supabase
      .channel(`messages:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `event_id=eq.${eventId}`
        },
        async (payload) => {
          if (payload.eventType === 'DELETE') {
            setMessages(current => 
              current.filter(message => message.id !== payload.old.id)
            );
            return;
          }

          const { data: userData } = await supabase
            .from('users')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          const messageWithUser = {
            ...payload.new,
            user: userData,
            updated_at: payload.new.updated_at || null
          } as Message;

          if (payload.eventType === 'INSERT') {
            setMessages(current => [...current, messageWithUser]);
          } else if (payload.eventType === 'UPDATE') {
            setMessages(current =>
              current.map(msg =>
                msg.id === messageWithUser.id ? messageWithUser : msg
              )
            );
          }
        }
      );

    // Inițializăm canalul pentru evenimente de typing
    const typingChannel = supabase
      .channel(`typing:${eventId}`);
    
    console.log('Initializing typing channel in ChatMessages:', `typing:${eventId}`);
    
    // Testăm canalul cu un eveniment de test
    typingChannel
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('Test event received in ChatMessages:', payload);
      });
    
    // Trimitem un eveniment de test
    typingChannel.send({
      type: 'broadcast',
      event: 'test',
      payload: { test: 'test' }
    }).then(() => {
      console.log('Test event sent successfully from ChatMessages');
    }).catch((error: Error) => {
      console.error('Error sending test event from ChatMessages:', error);
    });
    
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        console.log('Typing event received:', payload);
        console.log('Current user ID:', currentUserId);
        console.log('Payload user ID:', payload.user_id);
        
        // Nu afișăm indicatorul pentru utilizatorul curent
        if (payload.user_id === currentUserId) {
          console.log('Ignoring typing event from current user');
          return;
        }
        
        // Adăugăm utilizatorul la setul de utilizatori care scriu
        setTypingUsers(current => {
          const updated = new Set(current);
          updated.add(payload.user_name);
          console.log('Updated typing users:', Array.from(updated));
          return updated;
        });
      })
      .on('broadcast', { event: 'stop_typing' }, (payload) => {
        console.log('Stop typing event received:', payload);
        console.log('Current user ID:', currentUserId);
        console.log('Payload user ID:', payload.user_id);
        
        // Eliminăm utilizatorul din setul de utilizatori care scriu
        setTypingUsers(current => {
          const updated = new Set(current);
          updated.delete(payload.user_name);
          console.log('Updated typing users after stop:', Array.from(updated));
          return updated;
        });
      });
    
    // Subscribem la ambele canale
    messagesChannel.subscribe();
    typingChannel.subscribe();
    
    console.log('Subscribed to typing channel');

    // Curățăm la unmount
    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [eventId, currentUserId, supabase]);

  const handleDeleteMessage = async (messageId: string) => {
    try {
      // Actualizare optimistă
      setMessages(current => 
        current.filter(message => message.id !== messageId)
      );

      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .match({
          id: messageId,
          user_id: currentUserId,
          event_id: eventId
        });

      if (error) {
        console.error('Error deleting message:', error);
        // Dacă apare o eroare, restaurăm mesajul
        const deletedMessage = messages.find(msg => msg.id === messageId);
        if (deletedMessage) {
          setMessages(current => [...current, deletedMessage]);
        }
      }
    } catch (error) {
      console.error('Error deleting message:', error);
      // Restaurăm mesajul și în caz de eroare
      const deletedMessage = messages.find(msg => msg.id === messageId);
      if (deletedMessage) {
        setMessages(current => [...current, deletedMessage]);
      }
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedContent(message.message);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditedContent("");
  };

  const handleEditMessage = async (messageId: string) => {
    const trimmedContent = editedContent.trim();
    
    // Găsește mesajul curent
    const currentMessage = messages.find(msg => msg.id === messageId);
    if (!currentMessage) return;

    // Verifică dacă mesajul s-a schimbat
    if (trimmedContent === currentMessage.message) {
      setEditingMessageId(null);
      setEditedContent("");
      return;
    }

    // Verifică dacă mesajul nu este gol
    if (!trimmedContent) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .update({
          message: trimmedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('user_id', currentUserId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        // Actualizare optimistă
        setMessages(current =>
          current.map(msg =>
            msg.id === messageId
              ? {
                  ...msg,
                  message: trimmedContent,
                  updated_at: data.updated_at
                }
              : msg
          )
        );
      }
      
      setEditingMessageId(null);
      setEditedContent("");
    } catch (error) {
      console.error('Error updating message:', error);
      // Poți adăuga aici un toast sau altă notificare pentru utilizator
    }
  };

  const renderFiles = (files: string[]) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {files.map((url) => {
          const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
          if (isImage) {
            return (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={url}
                  alt="Attached file"
                  className="w-24 h-24 object-cover rounded"
                />
              </a>
            );
          }
          return (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted transition-colors"
            >
              <Paperclip size={16} />
              <span className="text-sm truncate max-w-[120px]">
                {url.split('/').pop()}
              </span>
            </a>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-4 flex-1">
        {messages.map((message) => {
          const isCurrentUser = message.user_id === currentUserId;
          const isEditing = editingMessageId === message.id;
          const isEdited = message.updated_at && new Date(message.updated_at).getTime() > new Date(message.created_at).getTime() + 1000;
          
          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex items-end gap-2 max-w-[80%] ${isCurrentUser ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="h-8 w-8">
                  {message.user.avatar_url ? (
                    <AvatarImage src={message.user.avatar_url} alt={message.user.full_name} />
                  ) : (
                    <AvatarFallback>
                      {message.user.full_name?.[0] || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Card className={`p-3 relative group ${isCurrentUser ? "bg-primary text-primary-foreground" : ""}`}>
                  {isCurrentUser && !isEditing && (
                    <div className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => startEditing(message)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editează
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Șterge
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Șterge mesajul</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Ești sigur că vrei să ștergi acest mesaj? Această acțiune nu poate fi anulată.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anulează</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteMessage(message.id)}
                                >
                                  Șterge
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <div className="text-sm font-medium mb-1">
                    {message.user.full_name}
                  </div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[60px] bg-background text-foreground"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleEditMessage(message.id);
                          } else if (e.key === "Escape") {
                            cancelEditing();
                          }
                        }}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={cancelEditing}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Anulează
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleEditMessage(message.id)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Salvează
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {message.message && (
                        <div className="text-sm whitespace-pre-wrap">
                          {message.message}
                        </div>
                      )}
                      {message.files && renderFiles(message.files)}
                    </>
                  )}
                  <div className={`text-xs mt-1 flex items-center gap-2 ${isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span>
                      {new Date(message.created_at).toLocaleTimeString('ro-RO', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    {isEdited && (
                      <span className="italic">(editat)</span>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      {typingUsers.size > 0 && (
        <div className="text-sm text-muted-foreground italic p-2 bg-muted/10 rounded-lg mt-2">
          {(() => {
            const typingList = Array.from(typingUsers);
            if (typingList.length === 1) {
              return `${typingList[0]} scrie...`;
            } else if (typingList.length === 2) {
              return `${typingList[0]} și ${typingList[1]} scriu...`;
            } else {
              return `${typingList[0]} și încă ${typingList.length - 1} persoane scriu...`;
            }
          })()}
        </div>
      )}
    </div>
  );
} 