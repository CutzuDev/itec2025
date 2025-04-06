"use client";

import { useState, useEffect } from "react";
import { ImageUpload } from "@/components/ui/image-upload";

interface AvatarUploadProps {
  currentAvatarUrl: string;
  userId: string;
}

export function AvatarUpload({ currentAvatarUrl, userId }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Sincronizează valoarea input-ului hidden când se schimbă avatarUrl
  useEffect(() => {
    const hiddenInput = document.getElementById("avatarUrl") as HTMLInputElement;
    if (hiddenInput) {
      hiddenInput.value = avatarUrl || "";
    }
  }, [avatarUrl]);
  
  const handleAvatarChange = (url: string | null) => {
    setAvatarUrl(url);
    setUploadError(null);
  };
  
  const handleError = (error: string) => {
    setUploadError(error);
  };
  
  return (
    <div>
      <ImageUpload 
        value={avatarUrl} 
        onChange={handleAvatarChange}
        onError={handleError}
        bucketName="avatars"
        userId={userId}
      />
      {uploadError && (
        <p className="text-sm text-destructive mt-1">{uploadError}</p>
      )}
    </div>
  );
} 