"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingCart,
  Truck,
  BarChart3,
  Settings,
  Printer,
  ListChecks,
  PackageSearch,
  Menu,
  LogOut,
  ChevronRight,
  Layers,
  Building2,
  Zap,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/inventory", label: "Inventory", icon: Boxes },
  { href: "/dashboard/suppliers", label: "Suppliers", icon: Building2 },
  { href: "/dashboard/purchase-orders", label: "Purchase Orders", icon: PackageSearch },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/print-queue", label: "Print Queue", icon: Printer },
  { href: "/dashboard/picking", label: "Picking", icon: ListChecks },
  { href: "/dashboard/shipping", label: "Shipping", icon: Truck },
  { href: "/dashboard/categories", label: "Categories", icon: Layers, roles: ["ADMIN", "MANAGER"] },
  {
    href: "/dashboard/analytics",
    label: "Analytics",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: Settings,
    roles: ["ADMIN", "MANAGER"],
  },
];

function NavLink({ item, collapsed }: { item: NavItem; collapsed?: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <item.icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

function Sidebar({ className }: { className?: string }) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role as string;

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(role)
  );

  return (
    <div className={cn("flex h-full flex-col gap-2 p-4", className)}>
      <div className="flex items-center gap-2 px-2 py-1">
        <Zap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">StockPilot</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1">
        {visibleItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </nav>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r bg-background lg:flex lg:flex-col">
        <Sidebar />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-14 items-center justify-between border-b px-4">
          {/* Mobile hamburger */}
          <Sheet>
            <SheetTrigger>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <Sidebar />
            </SheetContent>
          </Sheet>

          <div className="flex-1 lg:hidden" />

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline-block text-sm font-medium">
                  {user?.name ?? user?.email}
                </span>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{user?.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
