import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Join the conversation.">
      <RegisterForm />
    </AuthShell>
  );
}
