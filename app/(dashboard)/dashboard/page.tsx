import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { 
  BookOpen, 
  Calendar, 
  Users, 
  Clock, 
  Headphones, 
  ChevronRight, 
  TrendingUp, 
  ArrowUpRight
} from "lucide-react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  trend?: number;
  linkText?: string;
  linkHref?: string;
}

function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  linkText,
  linkHref,
}: StatCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="rounded-full bg-muted p-1.5 text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend !== undefined && (
          <div className={`mt-2 flex items-center text-xs ${trend >= 0 ? "text-green-500" : "text-red-500"}`}>
            {trend >= 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingUp className="mr-1 h-3 w-3 rotate-180" />}
            <span>{Math.abs(trend)}% from last month</span>
          </div>
        )}
      </CardContent>
      {linkText && linkHref && (
        <CardFooter className="pt-1">
          <a
            href={linkHref}
            className="inline-flex items-center text-xs text-primary hover:underline"
          >
            {linkText}
            <ChevronRight className="ml-1 h-3 w-3" />
          </a>
        </CardFooter>
      )}
    </Card>
  );
}

export default async function Dashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Fetch user data
  const { data: userData } = await supabase
    .from("users")
    .select("full_name, created_at")
    .eq("id", user.id)
    .single();

  // Fetch curricula count
  const { count: curriculaCount } = await supabase
    .from("curricula")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id);

  // Fetch events data
  const { count: createdEventsCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id);

  // Fetch events the user is participating in
  const { count: participatingEventsCount } = await supabase
    .from("event_participants")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // Fetch upcoming events
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("*")
    .or(`creator_id.eq.${user.id},id.in.(${
      supabase.from("event_participants").select("event_id").eq("user_id", user.id).toString()
    })`)
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5);

  // Fetch audio count
  const { count: audioCount } = await supabase
    .from("curricula")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", user.id)
    .not("audio_url", "is", null);

  // Calculate days as member
  const createdAt = userData?.created_at ? new Date(userData.created_at) : new Date();
  const today = new Date();
  const daysAsMember = Math.floor((today.getTime() - createdAt.getTime()) / (1000 * 3600 * 24));

  return (
    <div className="flex-1 w-full flex flex-col gap-8 p-4 md:p-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {userData?.full_name || user.email}!
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Your Curricula"
          value={curriculaCount || 0}
          description="Total learning materials created"
          icon={<BookOpen className="h-4 w-4" />}
          trend={12}
          linkText="View all curricula"
          linkHref="/curricula"
        />
        
        <StatCard
          title="Hosted Events"
          value={createdEventsCount || 0}
          description="Study sessions you've created"
          icon={<Calendar className="h-4 w-4" />}
          trend={5}
          linkText="Create new event"
          linkHref="/sessions/create"
        />
        
        <StatCard
          title="Participating Events"
          value={participatingEventsCount || 0}
          description="Sessions you're attending"
          icon={<Users className="h-4 w-4" />}
          trend={-2}
          linkText="Find events"
          linkHref="/sessions"
        />
        
        <StatCard
          title="Audio Materials"
          value={audioCount || 0}
          description="Curricula with audio content"
          icon={<Headphones className="h-4 w-4" />}
          trend={20}
          linkText="Convert to audio"
          linkHref="/podcasts"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Your next study sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <div className="space-y-2">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Calendar className="mr-1 h-3 w-3" />
                        {new Date(event.start_time).toLocaleDateString()} at{" "}
                        {new Date(event.start_time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <a
                      href={`/sessions/${event.id}`}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-20 items-center justify-center text-muted-foreground">
                No upcoming events
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <a href="/sessions">View all events</a>
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
            <CardDescription>Your activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Account created</span>
                <span>{new Date(createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Days as member</span>
                <span>{daysAsMember}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total study material</span>
                <span>{curriculaCount || 0} curricula</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total events</span>
                <span>{(createdEventsCount || 0) + (participatingEventsCount || 0)}</span>
              </div>
              <div className="mt-4 pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Completion rate</span>
                  <span className="text-green-500 font-medium">82%</span>
                </div>
                <div className="mt-1 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "82%" }}></div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on curricula with audio content
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <a href="/settings">Account settings</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
