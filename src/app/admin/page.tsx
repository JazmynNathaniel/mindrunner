import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { AdminApp } from "@/components/admin/AdminApp";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await getSessionUser();
  if (!auth) redirect("/login");
  if (auth.user.role !== "ADMIN") redirect("/"); // role re-checked on every admin API call too
  return <AdminApp />;
}
