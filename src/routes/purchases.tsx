import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, Sel, Th } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { money, num, bnDate } from "@/lib/bn";
import { createPurchase, purchaseTotal, useDB, type PurchaseItem } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "ক্রয় — মাহমুদ টেলিকম" },
      { name: "description", content: "সাপ্লায়ার থেকে পণ্য ক্রয়, স্টকে যোগ ও ক্রয় বকেয়ার হিসাব।" },
      { property: "og:title", content: "ক্রয় — মাহমুদ টেলিকম" },
      { property: "og:description", content: "সাপ্লায়ার থেকে পণ্য ক্রয়, স্টকে যোগ ও ক্রয় বকেয়ার হিসাব।" },
    ],
  }),
  component: PurchasesPage,
});

function PurchasesPage() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<PurchaseItem[]>([]);

  const total = items.reduce((s, i) => s + i.qty * i.cost, 0);

  function addItem(productId: string) {
    const p = db.products.find((x) => x.id === productId);
    if (!p || items.some((i) => i.productId === productId)) return;
    setItems((c) => [...c, { productId: p.id, name: p.name, qty: 1, cost: p.purchasePrice }]);
  }

  function save() {
    if (items.length === 0) {
      toast.error("অন্তত একটি পণ্য যোগ করুন");
      return;
    }
    createPurchase({ supplier, items, paid, accountId, date });
    setOpen(false);
    setItems([]);
    setPaid(0);
    setSupplier("");
    toast.success("ক্রয় সংরক্ষণ হয়েছে ও স্টকে যোগ হয়েছে");
  }

  return (
    <AppShell
      title="ক্রয়"
      subtitle="সাপ্লায়ার থেকে পণ্য ক্রয়ের হিসাব"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> নতুন ক্রয়
        </Button>
      }
    >
      <Card title="ক্রয় তালিকা">
        {db.purchases.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">কোনো ক্রয় রেকর্ড নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>ইনভয়েস</Th>
                  <Th>তারিখ</Th>
                  <Th>সাপ্লায়ার</Th>
                  <Th>পণ্য</Th>
                  <Th className="text-right">মোট</Th>
                  <Th className="text-right">পরিশোধ</Th>
                  <Th className="text-right">বাকি</Th>
                </tr>
              </thead>
              <tbody>
                {db.purchases.map((p) => {
                  const t = purchaseTotal(p);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{p.invoiceNo}</td>
                      <td className="px-3 py-2">{bnDate(p.date)}</td>
                      <td className="px-3 py-2">{p.supplier || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {p.items.map((i) => `${i.name} (${num(i.qty)})`).join(", ")}
                      </td>
                      <td className="px-3 py-2 text-right">{money(t)}</td>
                      <td className="px-3 py-2 text-right">{money(p.paid)}</td>
                      <td className="px-3 py-2 text-right font-medium text-destructive">
                        {money(Math.max(0, t - p.paid))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>নতুন ক্রয়</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="সাপ্লায়ার">
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </Field>
            <Field label="তারিখ">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="পণ্য যোগ করুন">
              <Sel value="" onChange={(e) => addItem(e.target.value)}>
                <option value="">— পণ্য নির্বাচন করুন —</option>
                {db.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label="পেমেন্ট অ্যাকাউন্ট">
              <Sel value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>

          {items.length > 0 && (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {items.map((i) => (
                <li key={i.productId} className="flex items-center gap-2 p-2 text-sm">
                  <span className="flex-1 truncate">{i.name}</span>
                  <Input
                    type="number"
                    value={i.qty}
                    onChange={(e) =>
                      setItems((c) =>
                        c.map((x) =>
                          x.productId === i.productId ? { ...x, qty: Number(e.target.value) } : x,
                        ),
                      )
                    }
                    className="h-8 w-20"
                  />
                  <Input
                    type="number"
                    value={i.cost}
                    onChange={(e) =>
                      setItems((c) =>
                        c.map((x) =>
                          x.productId === i.productId ? { ...x, cost: Number(e.target.value) } : x,
                        ),
                      )
                    }
                    className="h-8 w-28"
                  />
                  <span className="w-24 text-right">{money(i.qty * i.cost)}</span>
                  <button onClick={() => setItems((c) => c.filter((x) => x.productId !== i.productId))}>
                    <Trash2 className="size-4 text-destructive" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="পরিশোধ (৳)">
              <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
            </Field>
            <div className="self-end rounded-lg bg-secondary/50 p-3 text-sm">
              <div className="flex justify-between font-semibold">
                <span>মোট</span>
                <span>{money(total)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>বাকি</span>
                <span>{money(Math.max(0, total - paid))}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={save}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
