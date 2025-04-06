'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCcw } from "lucide-react";

export default function ChatroomError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Chatroom error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-6">
        We encountered an error while loading this chatroom.
      </p>
      <div className="flex gap-4">
        <Button onClick={reset} variant="outline" className="flex items-center gap-2">
          <RefreshCcw size={16} />
          Try again
        </Button>
        <Button asChild>
          <Link href="/chatrooms" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Return to Chatrooms
          </Link>
        </Button>
      </div>
    </div>
  );
} 