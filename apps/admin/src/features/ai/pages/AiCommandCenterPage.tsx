import { Link } from "react-router-dom";
import { Sparkles, MessageCircle, PhoneCall, Inbox, FileSignature, FolderKanban, Receipt } from "lucide-react";
import { PageHeader } from "@/components/system";
import { Button } from "@/components/ui/button";

const MODULES = [
  { title: "Lead AI", desc: "Follow-up emails, close probability, proposals", href: "/leads", icon: Inbox },
  { title: "Proposal writer", desc: "Generate scope, pricing, terms", href: "/proposals", icon: FileSignature },
  { title: "Project reports", desc: "Status reports and delay estimates", href: "/projects", icon: FolderKanban },
  { title: "Finance AI", desc: "Invoice items and payment reminders", href: "/invoices", icon: Receipt },
  { title: "Conversations", desc: "Live chat inbox", href: "/ai/conversations", icon: MessageCircle },
  { title: "Campaigns", desc: "AI outbound calling", href: "/ai/campaigns", icon: PhoneCall },
];

export default function AiCommandCenterPage() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader title="AI Command Center" description="Curvv AI OS — embedded across Sales, Delivery, and Finance." />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Link key={m.href} to={m.href} className="rounded-xl border border-border bg-card p-5 hover:border-foreground/20 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4" />
              <m.icon className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">{m.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{m.desc}</p>
          </Link>
        ))}
      </div>
      <Button asChild><Link to="/ceo">Open CEO Command Center</Link></Button>
    </div>
  );
}
