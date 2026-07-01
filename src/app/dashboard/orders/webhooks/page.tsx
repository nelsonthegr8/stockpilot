import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";
import Link from "next/link";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  processed: "default",
  received: "secondary",
  skipped: "outline",
  error: "destructive",
};

export default async function WebhookLogsPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) redirect("/dashboard");

  const status = searchParams.status;
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = 50;

  const where = status && status !== "ALL" ? { status } : {};
  const [logs, total] = await Promise.all([
    prisma.webhookLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { order: { select: { id: true } } },
    }),
    prisma.webhookLog.count({ where }),
  ]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Webhook Inbox"
        description="All inbound messages from sales channels."
      />
      <div className="flex flex-wrap gap-2">
        {["ALL", "processed", "error", "skipped", "received"].map((s) => (
          <Link key={s} href={`?status=${s}`}>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              status === s || (!status && s === "ALL") ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent"
            }`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </Link>
        ))}
      </div>
      <Card>
        <CardContent className="pt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.source}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.topic}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[log.status] ?? "outline"}>{log.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {log.order?.id ? (
                      <Link href={`/dashboard/orders/${log.order.id}`} className="text-sm text-primary underline underline-offset-2">
                        {log.order.id.slice(-8).toUpperCase()}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive">
                    {log.errorMsg ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No webhook logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {total ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} of {total}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
