import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const auth = await getSessionUser();
  if (auth) redirect(auth.user.role === "ADMIN" ? "/admin" : "/");
  return (
    <main className="crt flicker flex min-h-dvh items-center justify-center p-4">
      <LoginForm />
    </main>
  );
}
