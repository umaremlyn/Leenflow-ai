"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Bot, MessageSquare, Users, Package,
  HelpCircle, FileText, CreditCard, BarChart2, Plug, Settings,
} from "lucide-react";
import type { Tenant } from "@/types";

const NAV = [
  { section: "Main", items: [
    { href: "/dashboard",       icon: LayoutDashboard, label: "Dashboard"     },
    { href: "/ai-assistant",    icon: Bot,             label: "AI assistant"  },
    { href: "/conversations",   icon: MessageSquare,   label: "Conversations" },
    { href: "/leads",           icon: Users,           label: "Leads"         },
  ]},
  { section: "Knowledge", items: [
    { href: "/products",  icon: Package,    label: "Products"  },
    { href: "/faqs",      icon: HelpCircle, label: "FAQs"      },
    { href: "/policies",  icon: FileText,   label: "Policies"  },
    { href: "/payments",  icon: CreditCard, label: "Payments"  },
  ]},
  { section: "System", items: [
    { href: "/analytics",    icon: BarChart2, label: "Analytics"    },
    { href: "/integrations", icon: Plug,      label: "Integrations" },
    { href: "/settings",     icon: Settings,  label: "Settings"     },
  ]},
];

interface Props { tenant: Tenant; userRole: string; }

export default function Sidebar({ tenant }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-44 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <div className="w-2 h-2 rounded-full bg-brand-600" />
        <span className="text-sm font-semibold text-gray-900">Leen-Co AI</span>
      </div>

      {/* Business card */}
      <div className="mx-2 mt-3 mb-2 bg-gray-50 rounded-lg p-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
            {tenant?.name?.[0] ?? "B"}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">{tenant?.name ?? "My Business"}</p>
            <p className="text-[10px] text-gray-500 capitalize">{tenant?.plan ?? "starter"} plan</p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-green-600">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          AI assistant live
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto pb-4">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider px-3 pt-3 pb-1">
              {section}
            </p>
            {items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
              return (
                <Link key={href} href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs mx-1 rounded-md transition-colors ${
                    active ? "bg-brand-50 text-brand-600 font-medium" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}>
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
