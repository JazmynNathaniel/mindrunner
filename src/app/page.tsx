import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { TerminalApp } from "@/components/terminal/TerminalApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const auth = await getSessionUser();
  if (!auth) redirect("/login");
  return <TerminalApp isAdmin={auth.user.role === "ADMIN"} />;
}
