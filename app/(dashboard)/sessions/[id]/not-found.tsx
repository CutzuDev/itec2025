import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function SessionNotFound() {
  return (
    <div className="container mx-auto py-12 flex flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold mb-4">Session Not Found</h1>
      <p className="text-muted-foreground mb-6">
        The session you are looking for does not exist or has been removed.
      </p>
      <Button asChild>
        <Link href="/sessions" className="flex items-center gap-2">
          <ArrowLeft size={16} />
          Return to Sessions
        </Link>
      </Button>
    </div>
  );
} 