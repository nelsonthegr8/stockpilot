import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/dashboard/shared";
import Link from "next/link";
import { WebhookPayloadButton } from "@/components/dashboard/WebhookPayloadButton";

export default async function OutboxPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || !["ADMIN", "MANAGER"].includes(role)) redirect("/dashboard");

  const status = searchParams.status;
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = 50;

  const where = status && status !== "ALL" ? { status } : {};
  const [logs, total] = await Promise.all([
    prisma.outboundLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: { printJob: { select: { id: true, orderId: true } } },
    }),
    prisma.outboundLog.count({ where }),
  ]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="BambuBuddy Outbox"
        description="Rolling log of all messages sent to BambuBuddy."
      />
      <div className="flex flex-wrap gap-2">
        {["ALL", "success", "error"].map((s) => (
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
                <TableHead>Service</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Print Job</TableHead>
                <TableHead>Error</TableHead>
                <TableHead>Request</TableHead>
                <TableHead>Response</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell><Badge variant="outline">{log.service}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{log.action}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "success" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.printJob?.id ? (
                      <Link href={`/dashboard/print-queue`} className="text-sm text-primary underline underline-offset-2">
                        {log.printJob.id.slice(-8).toUpperCase()}
                      </Link>
                    ) : "\u2014"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-destructive">
                    {log.errorMsg ?? "\u2014"}
                  </TableCell>
                  <TableCell>
                    <WebhookPayloadButton payload={log.requestBody} />
                  </TableCell>
                  <TableCell>
                    {log.responseBody ? <WebhookPayloadButton payload={log.responseBody} /> : "\u2014"}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No outbound logs yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {total ? (page - 1) * limit + 1 : 0}&ndash;{Math.min(page * limit, total)} of {total}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
