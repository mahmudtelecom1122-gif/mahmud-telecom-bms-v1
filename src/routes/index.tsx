import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { money, num, bnDate } from "@/lib/bn";
import {
  accountBalance,
  isToday,
  lowStock,
  saleCost,
  saleTotal,
  stockValue,
  totalBalance,
  totalDue,
  totalExpense,
  useDB,
  warrantyStatus,
} from "@/lib/store";
import {
  Wallet,
  TrendingUp,
  Package,
  CreditCard,
  Receipt,
  Landmark,
  AlertTriangle,
  ShieldCheck,
  CalendarClock,
  ShoppingCart,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ড্যাশবোর্ড — মাহমুদ টেলিকম বিজনেস সিস্টেম" },
      {
        name: "description",
        content: "আজকের বিক্রি, লাভ, স্টক মূল্য, বকেয়া, খরচ ও অ্যাকাউন্ট ব্যালেন্স এক নজরে।",
      },
      { property: "og:title", content: "ড্যাশবোর্ড — মাহমুদ টেলিকম বিজনেস সিস্টেম" },
      {
        property: "og:description",
        content: "আজকের বিক্রি, লাভ, স্টক মূল্য, বকেয়া, খরচ ও অ্যাকাউন্ট ব্যালেন্স এক নজরে।",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const db = useDB();
  const todaySales = db.sales.filter((s) => isToday(s.date));
  const todaySaleTotal = todaySales.reduce((s, x) => s + saleTotal(x), 0);
  const todayProfit = todaySales.reduce((s, x) => s + (saleTotal(x) - saleCost(x)), 0);
  const todayExpense = totalExpense(db, true);
  const low = lowStock(db);
  const expiring = db.products
    .filter((p) => p.warrantyMonths > 0)
    .map((p) => ({ p, w: warrantyStatus(p.purchaseDate, p.warrantyMonths) }))
    .filter((x) => x.w.label === "শেষ হচ্ছে")
    .sort((a, b) => a.w.days - b.w.days);

  return (
    <AppShell title="ড্যাশবোর্ড" subtitle={`আজ ${bnDate(new Date().toISOString())} — এক নজরে ব্যবসার হিসাব`}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={Wallet}
          tone="primary"
          label="আজকের মোট বিক্রি"
          value={money(todaySaleTotal)}
          hint={`${num(todaySales.length)} টি বিক্রয়`}
        />
        <StatCard
          icon={TrendingUp}
          tone="success"
          label="আজকের মোট লাভ"
          value={money(todayProfit - todayExpense)}
          hint="বিক্রয় − ক্রয়মূল্য − খরচ"
        />
        <StatCard
          icon={Package}
          tone="info"
          label="মোট পণ্য ও স্টক মূল্য"
          value={money(stockValue(db))}
          hint={`${num(db.products.length)} ধরনের পণ্য`}
        />
        <StatCard
          icon={CreditCard}
          tone="warning"
          label="মোট বকেয়া (কাস্টমার পাওনা)"
          value={money(totalDue(db))}
          hint="সব অপরিশোধিত বিক্রয়"
        />
        <StatCard
          icon={Receipt}
          tone="destructive"
          label="মোট খরচ"
          value={money(totalExpense(db))}
          hint={`আজ ${money(todayExpense)}`}
        />
        <StatCard
          icon={Landmark}
          tone="accent"
          label="ক্যাশ / ব্যাংক / মোবাইল ব্যালেন্স"
          value={money(totalBalance(db))}
          hint={`${num(db.accounts.length)} টি অ্যাকাউন্ট`}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="টাকা কোথায় আছে" icon={Landmark} className="lg:col-span-1">
          <ul className="divide-y divide-border">
            {db.accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-muted-foreground">{a.name}</span>
                <span className="font-medium">{money(accountBalance(db, a.id))}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
            <span>সর্বমোট</span>
            <span>{money(totalBalance(db))}</span>
          </div>
        </Panel>

        <Panel title="লাভ-ক্ষতির হিসাব (আজ)" icon={TrendingUp}>
          <Row label="মোট বিক্রি (Gross Sales)" value={money(todaySaleTotal)} />
          <Row
            label="ক্রয়মূল্য (Cost of Goods)"
            value={money(todaySales.reduce((s, x) => s + saleCost(x), 0))}
          />
          <Row label="গ্রস প্রফিট" value={money(todayProfit)} />
          <Row label="খরচ (Expenses)" value={money(todayExpense)} />
          <Row
            label="নিট লাভ / ক্ষতি"
            value={money(todayProfit - todayExpense)}
            strong
          />
        </Panel>

        <Panel title="সাম্প্রতিক বিক্রয়" icon={ShoppingCart}>
          {db.sales.length === 0 ? (
            <Empty text="এখনও কোনো বিক্রয় হয়নি। POS মডিউল পরবর্তী ধাপে আসছে।" />
          ) : (
            <ul className="divide-y divide-border">
              {db.sales.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{s.customer || "ওয়াক-ইন কাস্টমার"}</span>
                    <span className="block text-xs text-muted-foreground">{bnDate(s.date)}</span>
                  </span>
                  <span className="font-medium">{money(saleTotal(s))}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="কম স্টকের পণ্য" icon={AlertTriangle}>
          {low.length === 0 ? (
            <Empty text="সব পণ্যের স্টক ঠিক আছে।" />
          ) : (
            <ul className="divide-y divide-border">
              {low.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{p.name}</span>
                  <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                    স্টক {num(p.stock)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/products" className="mt-3 inline-block text-xs font-medium text-primary">
            সব পণ্য দেখুন →
          </Link>
        </Panel>

        <Panel title="আসন্ন ওয়ারেন্টি শেষ" icon={ShieldCheck}>
          {expiring.length === 0 ? (
            <Empty text="৩০ দিনের মধ্যে কোনো ওয়ারেন্টি শেষ হচ্ছে না।" />
          ) : (
            <ul className="divide-y divide-border">
              {expiring.slice(0, 6).map(({ p, w }) => (
                <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {p.name}
                    <span className="block text-xs text-muted-foreground">{p.imei || "IMEI নেই"}</span>
                  </span>
                  <span className="text-xs font-medium text-warning">{num(w.days)} দিন বাকি</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="বকেয়া কিস্তি" icon={CalendarClock}>
          {(() => {
            const rows = db.installments
              .flatMap((p) => p.rows.filter((r) => !r.paidDate).map((r) => ({ p, r })))
              .sort((a, b) => (a.r.dueDate < b.r.dueDate ? -1 : 1))
              .slice(0, 6);
            if (rows.length === 0) return <Empty text="কোনো বকেয়া কিস্তি নেই।" />;
            return (
              <ul className="divide-y divide-border">
                {rows.map(({ p, r }) => (
                  <li key={p.id + r.no} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      {p.customer}
                      <span className="block text-xs text-muted-foreground">
                        কিস্তি {num(r.no)} · {bnDate(r.dueDate)}
                      </span>
                    </span>
                    <span className="font-medium">{money(r.amount)}</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </Panel>

      </div>
    </AppShell>
  );
}

const tones: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  warning: "bg-warning/15 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  accent: "bg-accent/20 text-accent-foreground",
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  tone: keyof typeof tones;
}) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className={"flex size-10 shrink-0 items-center justify-center rounded-xl " + tones[tone]}>
          <Icon className="size-5" />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"card-surface p-4 " + className}>
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div
      className={
        "flex items-center justify-between border-b border-border py-2 text-sm last:border-0 " +
        (strong ? "font-semibold" : "")
      }
    >
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-4 text-sm text-muted-foreground">{text}</p>;
}
