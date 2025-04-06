'use client';

import { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
          <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
          <p className="text-muted-foreground mb-8 max-w-md">
            We're sorry, but there was an error loading the application. Our team has been notified.
          </p>
          <Button onClick={reset} className="flex items-center gap-2">
            <RefreshCcw size={16} />
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
} 