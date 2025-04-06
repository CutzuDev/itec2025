import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CalendarIcon, ArrowLeft } from "lucide-react";

async function addCalendarIntegration(formData: FormData) {
  "use server";
  
  const supabase = await createClient();
  const provider = formData.get("provider") as string;
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Here you would typically:
  // 1. Redirect to OAuth flow for the selected provider
  // 2. Get the access token and refresh token
  // 3. Save the integration

  const { error } = await supabase.from("calendar_integrations").insert({
    user_id: user.id,
    provider: provider,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Error adding calendar integration:", error);
    // Handle error appropriately
  }

  redirect("/calendar");
}

export default async function AddCalendarPage() {
  const providers = [
    {
      id: "google",
      name: "Google Calendar",
      description: "Connect your Google Calendar",
    },
    {
      id: "outlook",
      name: "Outlook Calendar",
      description: "Connect your Outlook Calendar",
    },
    {
      id: "apple",
      name: "Apple Calendar",
      description: "Connect your Apple Calendar",
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <a href="/calendar" className="flex items-center gap-2">
            <ArrowLeft size={16} />
            Back to Calendar
          </a>
        </Button>
        <h1 className="text-2xl font-bold">Add Calendar Integration</h1>
        <p className="text-muted-foreground">
          Choose a calendar provider to connect with
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {providers.map((provider) => (
          <Card key={provider.id} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <CalendarIcon className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">{provider.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {provider.description}
            </p>
            <form action={addCalendarIntegration}>
              <input type="hidden" name="provider" value={provider.id} />
              <Button type="submit" className="w-full">
                Connect
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
} 