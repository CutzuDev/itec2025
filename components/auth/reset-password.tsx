import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordFormProps {
  message?: Message;
  className?: string;
  // Remove the customFormAction prop as we can't pass functions directly
  onSuccessRedirect?: string; // Use a redirect URL instead of a callback
}

export function ResetPasswordForm({
  message,
  className = "flex flex-col w-full max-w-md p-4 gap-2 [&>input]:mb-4",
  onSuccessRedirect,
}: ResetPasswordFormProps) {
  // We'll use the original resetPasswordAction directly
  // The onSuccess logic can be handled inside the action itself

  return (
    <form className={className}>
      <h1 className="text-2xl font-medium">Reset password</h1>
      <p className="text-sm text-foreground/60">
        Please enter your new password below.
      </p>
      <Label htmlFor="password">New password</Label>
      <Input
        type="password"
        name="password"
        placeholder="New password"
        required
      />
      <Label htmlFor="confirmPassword">Confirm password</Label>
      <Input
        type="password"
        name="confirmPassword"
        placeholder="Confirm password"
        required
      />
      {/* Pass the redirect URL as a hidden input to be used in the action */}
      {onSuccessRedirect && (
        <input type="hidden" name="redirectUrl" value={onSuccessRedirect} />
      )}
      <SubmitButton formAction={resetPasswordAction}>
        Reset password
      </SubmitButton>
      {message && <FormMessage message={message} />}
    </form>
  );
}
