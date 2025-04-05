import { signOutAction } from "@/app/actions";
import { ResetPasswordForm } from "@/components/auth/reset-password";
import { UpdateEmailForm } from "@/components/auth/update-mail";
import { FormMessage, Message } from "@/components/form-message";
import { Button } from "@/components/ui/button";
async function page(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;

  return (
    <div className="flex justify-center flex-col items-center  w-full">
      <UpdateEmailForm message={searchParams} />
      <ResetPasswordForm message={searchParams} />
      <Button onClick={signOutAction}>Sign Out</Button>
    </div>
  );
}

export default page;
