import {
  BarChart3, BookOpen, CreditCard, Code2, Inbox, LayoutDashboard, MessageSquare,
  Megaphone, Phone, PhoneCall, Settings, Target, UserPlus, Users, Zap, type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
};

export const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Calls, leads and credits at a glance." },
      { href: "/employees", label: "My Employees", icon: Users, description: "Your AI employees and their configuration." },
      { href: "/employees/new", label: "New Employee", icon: UserPlus, description: "Set up a new AI employee step by step." },
      { href: "/talk", label: "Talk to an Employee", icon: PhoneCall, description: "Place a test call to one of your employees." },
    ],
  },
  {
    title: "Calling",
    items: [
      { href: "/instant-leads", label: "Instant Leads", icon: Zap, description: "Call new leads the moment they arrive." },
      { href: "/campaigns", label: "Bulk Campaigns", icon: Megaphone, description: "Upload contacts and run outbound campaigns." },
      { href: "/inbound", label: "Inbound Calls", icon: Inbox, description: "Route incoming calls to your employees." },
    ],
  },
  {
    title: "Results & Setup",
    items: [
      { href: "/leads", label: "Leads & Results", icon: Target, description: "Every lead, outcome and callback." },
      { href: "/conversations", label: "All Conversations", icon: MessageSquare, description: "Transcripts, summaries and recordings." },
      { href: "/train", label: "Train Employees", icon: BookOpen, description: "Knowledge sources and instructions." },
      { href: "/phone-numbers", label: "Phone Numbers", icon: Phone, description: "Numbers, routing and caller ID." },
      { href: "/performance", label: "Performance", icon: BarChart3, description: "Answer rates, conversions and costs." },
      { href: "/billing", label: "Billing", icon: CreditCard, description: "Credits, usage and invoices." },
      { href: "/settings", label: "Settings", icon: Settings, description: "Organization, team and preferences." },
      { href: "/developers", label: "Developers", icon: Code2, description: "API keys, webhooks and docs." },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);
