import { AdminShell } from "@/components/admin-shell";
import { CartsClient } from "./carts-client";

export default function CartsPage() {
  return (
    <AdminShell>
      <CartsClient />
    </AdminShell>
  );
}
