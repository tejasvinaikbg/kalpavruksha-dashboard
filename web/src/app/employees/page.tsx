import { AdminShell } from "@/components/admin-shell";
import { EmployeesClient } from "./employees-client";

export default function EmployeesPage() {
  return (
    <AdminShell>
      <EmployeesClient />
    </AdminShell>
  );
}
