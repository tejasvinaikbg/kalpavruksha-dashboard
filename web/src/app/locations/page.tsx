import { AdminShell } from "@/components/admin-shell";
import { LocationsClient } from "./locations-client";

export default function LocationsPage() {
  return (
    <AdminShell>
      <LocationsClient />
    </AdminShell>
  );
}
