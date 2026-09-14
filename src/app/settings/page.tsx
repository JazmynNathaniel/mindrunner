import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { SettingsApp } from "@/components/settings/SettingsApp";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const auth = await getSessionUser();
  if (!auth) redirect("/login");
  return <SettingsApp isAdmin={auth.user.role === "ADMIN"} />;
}
