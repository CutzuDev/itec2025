"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Smile } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { v4 as uuidv4 } from "uuid";
import EmojiPicker from "emoji-picker-react";
import * as Popover from "@radix-ui/react-popover";

interface ChatInputProps {
  eventId: string;
  userId: string;
  userName: string;
}

export function ChatInput({ eventId, userId, userName }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingChannelRef = useRef<any>(null);

  // Funcție pentru a emite evenimentul de typing
  const emitTypingEvent = () => {
    console.log('Emitting typing event for channel:', `typing:${eventId}`);
    console.log('Typing event payload:', { user_id: userId, user_name: userName });
    
    // Folosim canalul existent în loc să creăm unul nou
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { user_id: userId, user_name: userName }
      }).then(() => {
        console.log('Typing event sent successfully');
      }).catch((error: Error) => {
        console.error('Error sending typing event:', error);
      });
    } else {
      console.error('Typing channel not initialized');
    }
  };

  // Funcție pentru a emite evenimentul de stop typing
  const emitStopTypingEvent = () => {
    console.log('Emitting stop typing event for channel:', `typing:${eventId}`);
    console.log('Stop typing event payload:', { user_id: userId, user_name: userName });
    
    // Folosim canalul existent în loc să creăm unul nou
    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'stop_typing',
        payload: { user_id: userId, user_name: userName }
      }).then(() => {
        console.log('Stop typing event sent successfully');
      }).catch((error: Error) => {
        console.error('Error sending stop typing event:', error);
      });
    } else {
      console.error('Typing channel not initialized');
    }
  };

  // Gestionăm evenimentul de input pentru a emite evenimentele de typing
  const handleInput = () => {
    // Emitem evenimentul de typing
    emitTypingEvent();
    
    // Resetăm timeout-ul existent dacă există
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Setăm un nou timeout pentru stop_typing
    typingTimeoutRef.current = setTimeout(() => {
      emitStopTypingEvent();
    }, 2000);
  };

  // Inițializăm canalul de typing
  useEffect(() => {
    const channel = supabase.channel(`typing:${eventId}`);
    console.log('Initializing typing channel in ChatInput:', `typing:${eventId}`);
    
    // Testăm canalul cu un eveniment de test
    channel.on('broadcast', { event: 'test' }, (payload) => {
      console.log('Test event received in ChatInput:', payload);
    });
    
    // Trimitem un eveniment de test
    channel.send({
      type: 'broadcast',
      event: 'test',
      payload: { test: 'test' }
    }).then(() => {
      console.log('Test event sent successfully from ChatInput');
    }).catch((error: Error) => {
      console.error('Error sending test event from ChatInput:', error);
    });
    
    channel.subscribe();
    console.log('Subscribed to typing channel in ChatInput');
    
    // Adăugăm event listener pentru input
    if (inputRef.current) {
      inputRef.current.addEventListener('input', handleInput);
    }
    
    typingChannelRef.current = channel;
    
    return () => {
      // Curățăm la unmount
      if (inputRef.current) {
        inputRef.current.removeEventListener('input', handleInput);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      console.log('Removed typing channel in ChatInput');
    };
  }, [eventId, userId, userName, supabase]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newUploadedFiles: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(fileName);

        newUploadedFiles.push(publicUrl);
      }

      setUploadedFiles(prev => [...prev, ...newUploadedFiles]);
    } catch (error) {
      console.error('Error handling file upload:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && uploadedFiles.length === 0) return;

    try {
      // Emitem stop_typing imediat ce se trimite mesajul
      emitStopTypingEvent();

      const messageData: any = {
        event_id: eventId,
        user_id: userId,
        message: message.trim(),
        files: uploadedFiles
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;

      setMessage('');
      setUploadedFiles([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setMessage(prev => prev + emojiData.emoji);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t">
      {uploadedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {uploadedFiles.map((url, index) => (
            <div key={url} className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <Paperclip size={16} />
              <span className="text-sm truncate max-w-[120px]">
                {url.split('/').pop()}
              </span>
              <button
                type="button"
                className="text-destructive hover:text-destructive/70"
                onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <Textarea
          ref={inputRef}
          value={message}
          onChange={handleMessageChange}
          placeholder="Scrie un mesaj..."
          className="min-h-[80px]"
        />
        <div className="flex flex-col gap-2">
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
              >
                <Smile />
              </Button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content className="z-50">
                <EmojiPicker onEmojiClick={handleEmojiSelect} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            multiple
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
          </Button>
          <Button type="submit" size="icon" disabled={isUploading}>
            <Send />
          </Button>
        </div>
      </div>
    </form>
  );
} 