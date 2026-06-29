import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

export const metadata: Metadata = {
  title: "StockPilot",
  description: "Warehouse Management System",
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <SessionProvider session={session}>
      <DashboardLayout>{children}</DashboardLayout>
    </SessionProvider>
  );
}
