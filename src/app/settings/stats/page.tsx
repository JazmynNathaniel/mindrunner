import { redirect } from "next/navigation";
import { getSessionUser } from "@/server/auth";
import { BrainAccessView } from "@/components/settings/BrainAccessView";

export const dynamic = "force-dynamic";

export default async function BrainAccessPage() {
  const auth = await getSessionUser();
  if (!auth) redirect("/login");
  return <BrainAccessView />;
}
