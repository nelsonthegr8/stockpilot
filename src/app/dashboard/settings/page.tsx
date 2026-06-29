import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/dashboard/shared";

const sections = [
  { href: "/dashboard/settings/users", title: "Users", description: "Invite teammates and manage roles." },
  { href: "/dashboard/settings/printers", title: "Printers", description: "Configure label printers and defaults." },
  { href: "/dashboard/settings/shipping", title: "Shipping", description: "Select label workflow and API keys." },
  { href: "/dashboard/settings/bambubuddy", title: "BambuBuddy", description: "Control print queue integration and archive mappings." },
  { href: "/dashboard/settings/operator-buttons", title: "Operator Buttons", description: "Pair notification buttons used on the floor." },
  { href: "/dashboard/settings/system", title: "System", description: "Version and update utilities." },
  { href: "/dashboard/settings/channels", title: "Channels", description: "Monitor connected sales channels." },
];

export default function SettingsPage() {
  return <div className="space-y-6 p-6"><PageHeader title="Settings" description="Configure StockPilot behavior and integrations." /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{sections.map((section) => <Link key={section.href} href={section.href}><Card className="h-full transition hover:border-primary"><CardHeader><CardTitle>{section.title}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">{section.description}</CardContent></Card></Link>)}</div></div>;
}
