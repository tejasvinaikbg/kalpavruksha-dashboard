import { AdminShell } from "@/components/admin-shell";
import InventoryClient from "./inventory-client";

export default function InventoryPage() {
    return (
        <AdminShell>
            <InventoryClient />
        </AdminShell>
    );
}
