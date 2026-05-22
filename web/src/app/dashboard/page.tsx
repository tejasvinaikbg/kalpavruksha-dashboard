import { AdminShell } from "@/components/admin-shell";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <AdminShell>
      <DashboardClient />
    </AdminShell>
  );
}
