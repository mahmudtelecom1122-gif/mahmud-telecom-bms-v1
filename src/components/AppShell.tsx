import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Wallet,
  Receipt,
  Users,
  CalendarClock,
  ShieldCheck,
  BarChart3,
  Truck,
  Settings,
} from "lucide-react";

const nav = [
  { to: "/", label: "ড্যাশবোর্ড", icon: LayoutDashboard },
  { to: "/products", label: "পণ্য ও স্টক", icon: Package },
  { to: "/pos", label: "বিক্রয় (POS)", icon: ShoppingCart },
  { to: "/purchases", label: "ক্রয়", icon: Truck },
  { to: "/customers", label: "কাস্টমার", icon: Users },
  { to: "/installments", label: "কিস্তি", icon: CalendarClock },
  { to: "/warranty", label: "ওয়ারেন্টি", icon: ShieldCheck },
  { to: "/accounts", label: "হিসাব/টাকা", icon: Wallet },
  { to: "/expenses", label: "খরচ", icon: Receipt },
  { to: "/reports", label: "রিপোর্ট", icon: BarChart3 },
  { to: "/settings", label: "সেটিংস", icon: Settings },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground font-bold">
            মা
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">মাহমুদ টেলিকম</p>
            <p className="truncate text-[11px] opacity-80">বিজনেস ম্যানেজমেন্ট সিস্টেম V1.0</p>
          </div>
        </div>
        <nav className="mx-auto max-w-7xl overflow-x-auto px-2 pb-2">
          <ul className="flex gap-1">
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "bg-accent text-accent-foreground" }}
                  inactiveProps={{ className: "hover:bg-primary-foreground/10" }}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <item.icon className="size-3.5" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
