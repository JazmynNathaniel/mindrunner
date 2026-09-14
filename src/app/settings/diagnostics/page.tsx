import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { DiagnosticsView } from "@/components/settings/DiagnosticsView";

export const dynamic = "force-dynamic";

export default async function DiagnosticsPage() {
  const auth = await getSessionUser();
  if (!auth) redirect("/login");
  return <DiagnosticsView />;
}
