import { updateEmailAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UpdateEmailFormProps {
  message?: Message;
  className?: string;
  onSuccessRedirect?: string; // Redirect URL for successful email change
  currentEmail?: string; // Optional current email to display
}

export function UpdateEmailForm({
  message,
  className = "flex flex-col w-full max-w-md p-4 gap-2 [&>input]:mb-4",
  onSuccessRedirect,
  currentEmail,
}: UpdateEmailFormProps) {
  return (
    <form className={className}>
      <h1 className="text-2xl font-medium">Update Email Address</h1>
      <p className="text-sm text-foreground/60">
        Please enter your new email address below.
      </p>

      <Label htmlFor="email">New Email Address</Label>
      <Input
        type="email"
        name="email"
        id="email"
        placeholder="Enter your new email address"
        required
      />

      {/* Pass the redirect URL as a hidden input to be used in the action */}
      {onSuccessRedirect && (
        <input type="hidden" name="redirectUrl" value={onSuccessRedirect} />
      )}

      <SubmitButton formAction={updateEmailAction}>Update Email</SubmitButton>

      {message && <FormMessage message={message} />}
    </form>
  );
}
