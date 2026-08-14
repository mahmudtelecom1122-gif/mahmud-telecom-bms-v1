import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, Stat, Th } from "@/components/bits";
import { Input } from "@/components/ui/input";
import { money, num, bnDate } from "@/lib/bn";
import { inRange, saleCost, saleDue, saleTotal, useDB } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "রিপোর্ট — মাহমুদ টেলিকম" },
      { name: "description", content: "তারিখ অনুযায়ী বিক্রয়, লাভ-ক্ষতি, খরচ ও ক্যাশ ফ্লো রিপোর্ট।" },
      { property: "og:title", content: "রিপোর্ট — মাহমুদ টেলিকম" },
      { property: "og:description", content: "তারিখ অনুযায়ী বিক্রয়, লাভ-ক্ষতি, খরচ ও ক্যাশ ফ্লো রিপোর্ট।" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const db = useDB();
  const monthStart = new Date().toISOString().slice(0, 8) + "01";
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const sales = useMemo(() => db.sales.filter((s) => inRange(s.date, from, to)), [db.sales, from, to]);
  const txns = useMemo(
    () => db.transactions.filter((t) => inRange(t.date, from, to)),
    [db.transactions, from, to],
  );

  const gross = sales.reduce((s, x) => s + saleTotal(x), 0);
  const cost = sales.reduce((s, x) => s + saleCost(x), 0);
  const expense = txns.filter((t) => t.kind === "out" && t.category === "খরচ").reduce((s, t) => s + t.amount, 0);
  const purchase = txns.filter((t) => t.category === "ক্রয়").reduce((s, t) => s + t.amount, 0);
  const due = sales.reduce((s, x) => s + saleDue(db, x), 0);
  const cashIn = txns.filter((t) => t.kind === "in").reduce((s, t) => s + t.amount, 0);
  const cashOut = txns.filter((t) => t.kind === "out").reduce((s, t) => s + t.amount, 0);

  const byDay = useMemo(() => {
    const map = new Map<string, { sale: number; profit: number }>();
    for (const s of sales) {
      const d = s.date.slice(0, 10);
      const cur = map.get(d) ?? { sale: 0, profit: 0 };
      cur.sale += saleTotal(s);
      cur.profit += saleTotal(s) - saleCost(s);
      map.set(d, cur);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [sales]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; amount: number }>();
    for (const s of sales)
      for (const i of s.items) {
        const cur = map.get(i.productId) ?? { name: i.name, qty: 0, amount: 0 };
        cur.qty += i.qty;
        cur.amount += i.qty * i.price;
        map.set(i.productId, cur);
      }
    return [...map.values()].sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [sales]);

  return (
    <AppShell title="রিপোর্ট" subtitle="তারিখ অনুযায়ী বিক্রয়, লাভ-ক্ষতি ও ক্যাশ ফ্লো">
      <Card className="mb-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="শুরুর তারিখ">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="শেষ তারিখ">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="মোট বিক্রি" value={money(gross)} hint={`${num(sales.length)} টি বিক্রয়`} />
        <Stat label="ক্রয়মূল্য (COGS)" value={money(cost)} />
        <Stat label="গ্রস প্রফিট" value={money(gross - cost)} />
        <Stat label="নিট লাভ / ক্ষতি" value={money(gross - cost - expense)} hint={`খরচ ${money(expense)}`} />
        <Stat label="ক্যাশ ইন" value={money(cashIn)} />
        <Stat label="ক্যাশ আউট" value={money(cashOut)} />
        <Stat label="পণ্য ক্রয় (পরিশোধ)" value={money(purchase)} />
        <Stat label="এই সময়ের বকেয়া" value={money(due)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="দৈনিক বিক্রয় ও লাভ">
          {byDay.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">এই সময়ে কোনো বিক্রয় নেই।</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>তারিখ</Th>
                  <Th className="text-right">বিক্রয়</Th>
                  <Th className="text-right">লাভ</Th>
                </tr>
              </thead>
              <tbody>
                {byDay.map(([d, v]) => (
                  <tr key={d} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{bnDate(d)}</td>
                    <td className="px-3 py-2 text-right">{money(v.sale)}</td>
                    <td className="px-3 py-2 text-right text-success">{money(v.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="সর্বাধিক বিক্রিত পণ্য">
          {topProducts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">তথ্য নেই।</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>পণ্য</Th>
                  <Th className="text-center">পরিমাণ</Th>
                  <Th className="text-right">মোট</Th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p) => (
                  <tr key={p.name} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{p.name}</td>
                    <td className="px-3 py-2 text-center">{num(p.qty)}</td>
                    <td className="px-3 py-2 text-right">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="বিক্রয় তালিকা" className="mt-4">
        {sales.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">এই সময়ে কোনো বিক্রয় নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>ইনভয়েস</Th>
                  <Th>তারিখ</Th>
                  <Th>কাস্টমার</Th>
                  <Th className="text-right">মোট</Th>
                  <Th className="text-right">লাভ</Th>
                  <Th className="text-right">বকেয়া</Th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{s.invoiceNo}</td>
                    <td className="px-3 py-2">{bnDate(s.date)}</td>
                    <td className="px-3 py-2">{s.customer || "ওয়াক-ইন"}</td>
                    <td className="px-3 py-2 text-right">{money(saleTotal(s))}</td>
                    <td className="px-3 py-2 text-right text-success">
                      {money(saleTotal(s) - saleCost(s))}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">{money(saleDue(db, s))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
