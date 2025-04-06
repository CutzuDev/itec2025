"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { ImageIcon, Loader2, X } from "lucide-react";

interface ImageUploadProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  onError?: (error: string) => void;
  bucketName?: string;
  userId?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  onError,
  bucketName = 'event-avatars',
  userId
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true);

      // Verificam dimensiunea fisierului (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Fișierul este prea mare. Mărimea maximă permisă este de 5MB.');
      }

      // Generate a unique file name
      const fileExt = file.name.split('.').pop();
      // Pentru users, foloseșe folder bazat pe id-ul utilizatorului
      let filePath = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // Dacă avem userId, folosim ca folder pentru organizare mai bună
      if (userId && bucketName === 'avatars') {
        filePath = `${userId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
      }

      // Upload the file to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from(bucketName)
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase
        .storage
        .from(bucketName)
        .getPublicUrl(uploadData.path);

      onChange?.(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setIsUploading(false);
    }
  }, [supabase, onChange, onError, bucketName, userId]);

  const handleRemove = useCallback(async () => {
    try {
      if (value) {
        // Extract file path from URL
        let filePath = value.split('/').pop() || '';
        
        // Dacă este un avatar și avem userId, includem folderul în path
        if (userId && bucketName === 'avatars' && !filePath.includes(userId)) {
          const segments = value.split('/');
          if (segments.length >= 2) {
            filePath = `${userId}/${segments[segments.length - 1]}`;
          }
        }
        
        if (filePath) {
          await supabase
            .storage
            .from(bucketName)
            .remove([filePath]);
        }
      }
      onChange?.(null);
    } catch (error) {
      console.error('Remove error:', error);
      onError?.(error instanceof Error ? error.message : 'Error removing file');
    }
  }, [value, supabase, onChange, onError, bucketName, userId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {value ? (
          <div className="relative w-24 h-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Uploaded image"
              className="w-full h-full object-cover rounded-lg"
            />
            <button
              onClick={handleRemove}
              className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-muted-foreground/25" />
          </div>
        )}
        <div className="space-y-2">
          <Button
            disabled={isUploading}
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  handleUpload(file);
                }
              };
              input.click();
            }}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Upload Image'
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Recommended: Square image, max 5MB
          </p>
        </div>
      </div>
    </div>
  );
} 