import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Stat, Th } from "@/components/bits";
import { money, num, bnDate, toBn } from "@/lib/bn";
import { addMonths, useDB, warrantyStatus } from "@/lib/store";
import { Search } from "lucide-react";

export const Route = createFileRoute("/warranty")({
  head: () => ({
    meta: [
      { title: "ওয়ারেন্টি — মাহমুদ টেলিকম" },
      { name: "description", content: "বিক্রিত পণ্যের ওয়ারেন্টি ট্র্যাকিং, মেয়াদ ও IMEI অনুযায়ী খোঁজ।" },
      { property: "og:title", content: "ওয়ারেন্টি — মাহমুদ টেলিকম" },
      { property: "og:description", content: "বিক্রিত পণ্যের ওয়ারেন্টি ট্র্যাকিং, মেয়াদ ও IMEI অনুযায়ী খোঁজ।" },
    ],
  }),
  component: WarrantyPage,
});

function WarrantyPage() {
  const db = useDB();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const all = db.sales.flatMap((s) =>
      s.items
        .filter((i) => (i.warrantyMonths ?? 0) > 0)
        .map((i) => {
          const start = s.date.slice(0, 10);
          const w = warrantyStatus(start, i.warrantyMonths ?? 0);
          return {
            key: s.id + i.productId,
            invoiceNo: s.invoiceNo,
            customer: s.customer || "ওয়াক-ইন",
            phone: s.phone ?? "",
            name: i.name,
            imei: i.imei ?? "",
            start,
            end: addMonths(start, i.warrantyMonths ?? 0),
            months: i.warrantyMonths ?? 0,
            price: i.price,
            w,
          };
        }),
    );
    const s = q.trim().toLowerCase();
    return s
      ? all.filter((r) => [r.name, r.imei, r.customer, r.invoiceNo, r.phone].join(" ").toLowerCase().includes(s))
      : all;
  }, [db.sales, q]);

  const active = rows.filter((r) => r.w.label === "সক্রিয়").length;
  const soon = rows.filter((r) => r.w.label === "শেষ হচ্ছে").length;
  const expired = rows.filter((r) => r.w.label === "মেয়াদোত্তীর্ণ").length;

  return (
    <AppShell title="ওয়ারেন্টি" subtitle="বিক্রিত পণ্যের ওয়ারেন্টি ট্র্যাকিং">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="মোট ওয়ারেন্টি" value={num(rows.length) + " টি"} />
        <Stat label="সক্রিয়" value={num(active) + " টি"} />
        <Stat label="৩০ দিনে শেষ হচ্ছে" value={num(soon) + " টি"} />
        <Stat label="মেয়াদোত্তীর্ণ" value={num(expired) + " টি"} />
      </div>

      <div className="card-surface my-4 flex items-center gap-2 p-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="IMEI, পণ্য, কাস্টমার বা ইনভয়েস দিয়ে খুঁজুন…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <Card>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            কোনো ওয়ারেন্টি রেকর্ড নেই — POS থেকে ওয়ারেন্টিযুক্ত পণ্য বিক্রি করলে এখানে দেখা যাবে।
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>পণ্য / IMEI</Th>
                  <Th>কাস্টমার</Th>
                  <Th>ইনভয়েস</Th>
                  <Th>বিক্রয়</Th>
                  <Th>মেয়াদ শেষ</Th>
                  <Th className="text-right">মূল্য</Th>
                  <Th>অবস্থা</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">
                      <p className="font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">{r.imei || "IMEI নেই"}</p>
                    </td>
                    <td className="px-3 py-2">
                      {r.customer}
                      {r.phone ? <span className="block text-xs text-muted-foreground">{toBn(r.phone)}</span> : null}
                    </td>
                    <td className="px-3 py-2 text-xs">{r.invoiceNo}</td>
                    <td className="px-3 py-2">{bnDate(r.start)}</td>
                    <td className="px-3 py-2">{bnDate(r.end)}</td>
                    <td className="px-3 py-2 text-right">{money(r.price)}</td>
                    <td className="px-3 py-2 text-xs">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 " +
                          (r.w.label === "সক্রিয়"
                            ? "bg-success/10 text-success"
                            : r.w.label === "শেষ হচ্ছে"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/10 text-destructive")
                        }
                      >
                        {r.w.label}
                        {r.w.days > 0 ? ` · ${num(r.w.days)} দিন` : ""}
                      </span>
                    </td>
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
