import { ResetPasswordForm } from "@/components/auth/reset-password";
import { UpdateEmailForm } from "@/components/auth/update-mail";
import { FormMessage, Message } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { UserIcon, CheckIcon, LogOutIcon } from "lucide-react";
import { revalidatePath } from "next/cache";
import { AvatarUpload } from "@/components/ui/avatar-upload";
import { signOutAction } from "@/app/actions";

// Server Action pentru actualizarea profilului
async function updateUserProfile(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Utilizatorul nu este autentificat");
  }

  const displayName = formData.get("displayName") as string;
  const avatarUrl = formData.get("avatarUrl") as string;

  const updates = {
    ...(displayName && { full_name: displayName }),
    ...(avatarUrl !== undefined && { avatar_url: avatarUrl }),
  };

  // Nu facem actualizare dacă nu există modificări
  if (Object.keys(updates).length === 0) {
    return; // Early return dacă nu sunt modificări
  }

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    throw new Error(`Nu s-a putut actualiza profilul: ${error.message}`);
  }

  revalidatePath("/settings");
}

async function SettingsPage(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/sign-in");
  }

  // Obținem datele utilizatorului din baza de date
  const { data: userData, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Eroare la obținerea datelor utilizatorului:", error);
  }

  const initiale = userData?.full_name
    ? userData.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
    : user.email?.substring(0, 2).toUpperCase();

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8">Setări profil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coloana cu profilul utilizatorului */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <CardTitle>Profilul tău</CardTitle>
            <CardDescription>Informațiile despre contul tău</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={userData?.avatar_url || ""}
                alt={userData?.full_name || "Profil"}
              />
              <AvatarFallback className="text-2xl">{initiale}</AvatarFallback>
            </Avatar>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-semibold">
                {userData?.full_name || "Utilizator"}
              </h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <div className="w-full space-y-2 mt-4">
              <div className="flex items-center space-x-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Membru din{" "}
                  {new Date(
                    userData?.created_at || Date.now()
                  ).toLocaleDateString("ro-RO")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coloana cu setările contului */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Setări cont</CardTitle>
            <CardDescription>Actualizează-ți setările contului</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="password">Parolă</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <form action={updateUserProfile}>
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Nume complet</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      placeholder="Nume complet"
                      defaultValue={userData?.full_name || ""}
                    />
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="avatar">Imagine profil</Label>
                    <input
                      type="hidden"
                      name="avatarUrl"
                      id="avatarUrl"
                      value={userData?.avatar_url || ""}
                    />
                    <div className="pt-2">
                      <AvatarUpload
                        currentAvatarUrl={userData?.avatar_url || ""}
                        userId={user.id}
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Recomandare: Imagine pătrată, max 5MB
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4">
                    <Button type="submit" className="w-full">
                      <CheckIcon className="mr-2 h-4 w-4" />
                      Salvează modificările
                    </Button>
                  </div>
                </form>

                <Separator className="my-4" />

                <div className="pt-2">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={signOutAction}
                  >
                    <LogOutIcon className="mr-2 h-4 w-4" />
                    Deconectare
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="email">
                <div className="space-y-4">
                  <UpdateEmailForm
                    message={searchParams}
                    className="space-y-4"
                    currentEmail={user.email || ""}
                  />
                </div>
              </TabsContent>

              <TabsContent value="password">
                <div className="space-y-4">
                  <ResetPasswordForm
                    message={searchParams}
                    className="space-y-4"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SettingsPage;
