"use client";

import {
  BarChart3,
  FileText,
  MapPin,
  Menu,
  ShoppingBasket,
  UsersRound,
  X,
  LogOut,
  ShelvingUnit,
  TreePalm
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { apolloClient } from "@/lib/apollo-client";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/carts", label: "Cart Management", icon: ShoppingBasket },
  { href: "/locations", label: "Location Management", icon: MapPin },
  { href: "/employees", label: "Employee Management", icon: UsersRound },
  { href: "/inventory", label: "Inventory Management", icon: ShelvingUnit },
  { href: "/reports", label: "Reports", icon: FileText },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      router.replace("/login");
    }
  }, [router]);

  async function handleLogout() {
    clearAuthToken();
    await apolloClient.clearStore();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-stone-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-stone-200 bg-white lg:block">
        <ShellNav pathname={pathname} onLogout={handleLogout} />
      </aside>

      {/* Mobile Menu */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-white px-4">
          <button
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <p className="text-sm font-bold text-stone-950">Kalpavruksha</p>
          <button
            aria-label="Logout"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-stone-200 text-stone-700"
            onClick={handleLogout}
            type="button"
          >
            <LogOut aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-black/30">
            <div className="h-full w-72 bg-white shadow-xl">
              <div className="flex h-14 items-center justify-end border-b border-stone-200 px-4">
                <button
                  aria-label="Close menu"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-stone-200 text-stone-700"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <X aria-hidden="true" className="h-5 w-5" />
                </button>
              </div>
              <ShellNav pathname={pathname} onLogout={handleLogout} />
            </div>
          </div>
        ) : null}
      </div>

      <main>{children}</main>
    </div>
  );
}

function ShellNav({
  pathname,
  onLogout
}: {
  pathname: string;
  onLogout: () => void;
}) {
  return (
    <nav className="flex min-h-screen flex-col p-4">
      <div className="mb-6">
        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
          Kalpavruksha  <TreePalm aria-hidden="true" className="inline-block h-4 w-4" />
        </p>
        <h1 className=" mt-1 text-xl font-bold text-stone-950">Operations</h1>
      </div>
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${active
                ? "bg-emerald-700 text-white"
                : "text-stone-700 hover:bg-stone-100"
                }`}
              href={item.href}
              key={item.href}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
      <button
        className="mt-auto flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
        onClick={onLogout}
        type="button"
      >
        <LogOut aria-hidden="true" className="h-4 w-4" />
        Logout
      </button>
    </nav>
  );
}
