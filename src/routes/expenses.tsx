import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, Sel, Stat, Th } from "@/components/bits";
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
import { expenseHeads, isToday, setDB, uid, useDB } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "খরচ — মাহমুদ টেলিকম" },
      { name: "description", content: "দোকানের সকল খরচ — খাত, অ্যাকাউন্ট, দৈনিক ও মাসিক হিসাব।" },
      { property: "og:title", content: "খরচ — মাহমুদ টেলিকম" },
      { property: "og:description", content: "দোকানের সকল খরচ — খাত, অ্যাকাউন্ট, দৈনিক ও মাসিক হিসাব।" },
    ],
  }),
  component: ExpensePage,
});

function ExpensePage() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [head, setHead] = useState(expenseHeads[0] ?? "অন্যান্য");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const list = useMemo(
    () => db.transactions.filter((t) => t.kind === "out" && t.category === "খরচ"),
    [db.transactions],
  );
  const today = list.filter((t) => isToday(t.date)).reduce((s, t) => s + t.amount, 0);
  const month = list
    .filter((t) => t.date.slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, t) => s + t.amount, 0);
  const all = list.reduce((s, t) => s + t.amount, 0);

  function save() {
    if (amount <= 0) {
      toast.error("সঠিক পরিমাণ দিন");
      return;
    }
    setDB((d) => ({
      ...d,
      transactions: [
        {
          id: uid("txn"),
          date: new Date(date).toISOString(),
          kind: "out" as const,
          accountId,
          amount,
          category: "খরচ",
          note: note ? `${head} — ${note}` : head,
          refType: "manual" as const,
        },
        ...d.transactions,
      ],
    }));
    setOpen(false);
    setAmount(0);
    setNote("");
    toast.success("খরচ যোগ হয়েছে");
  }

  return (
    <AppShell
      title="খরচ"
      subtitle="দোকানের সকল খরচের হিসাব"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> নতুন খরচ
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="আজকের খরচ" value={money(today)} />
        <Stat label="এই মাসের খরচ" value={money(month)} />
        <Stat label="সর্বমোট খরচ" value={money(all)} hint={`${num(list.length)} টি এন্ট্রি`} />
      </div>

      <Card title="খরচের তালিকা" className="mt-4">
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">কোনো খরচ যোগ করা হয়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>তারিখ</Th>
                  <Th>খাত ও বিবরণ</Th>
                  <Th>অ্যাকাউন্ট</Th>
                  <Th className="text-right">পরিমাণ</Th>
                  <Th className="text-center">মুছুন</Th>
                </tr>
              </thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{bnDate(t.date)}</td>
                    <td className="px-3 py-2">{t.note}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {db.accounts.find((a) => a.id === t.accountId)?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-destructive">
                      {money(t.amount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setDB((d) => ({
                            ...d,
                            transactions: d.transactions.filter((x) => x.id !== t.id),
                          }))
                        }
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>নতুন খরচ</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="খরচের খাত">
              <Sel value={head} onChange={(e) => setHead(e.target.value)}>
                {expenseHeads.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label="পরিমাণ (৳)">
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <Field label="অ্যাকাউন্ট">
              <Sel value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label="তারিখ">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="বিবরণ (ঐচ্ছিক)">
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
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
