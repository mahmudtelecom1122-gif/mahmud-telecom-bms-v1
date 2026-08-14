import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Trash2 } from "lucide-react";
import { money, num, bnDate } from "@/lib/bn";
import { accountBalance, setDB, totalBalance, uid, useDB, type TxnKind } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/accounts")({
  head: () => ({
    meta: [
      { title: "হিসাব / টাকা — মাহমুদ টেলিকম" },
      { name: "description", content: "ক্যাশ, মোবাইল ব্যাংকিং ও ব্যাংক অ্যাকাউন্টের জমা, উত্তোলন ও ট্রান্সফার।" },
      { property: "og:title", content: "হিসাব / টাকা — মাহমুদ টেলিকম" },
      { property: "og:description", content: "ক্যাশ, মোবাইল ব্যাংকিং ও ব্যাংক অ্যাকাউন্টের জমা, উত্তোলন ও ট্রান্সফার।" },
    ],
  }),
  component: AccountsPage,
});

function AccountsPage() {
  const db = useDB();
  const [kind, setKind] = useState<TxnKind | null>(null);
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState(db.accounts[1]?.id ?? "");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [filter, setFilter] = useState("");

  const txns = useMemo(
    () => db.transactions.filter((t) => !filter || t.accountId === filter || t.toAccountId === filter),
    [db.transactions, filter],
  );

  function open(k: TxnKind) {
    setKind(k);
    setAmount(0);
    setNote("");
  }

  function save() {
    if (!kind) return;
    if (amount <= 0) {
      toast.error("সঠিক পরিমাণ দিন");
      return;
    }
    if (kind === "transfer" && accountId === toAccountId) {
      toast.error("ভিন্ন অ্যাকাউন্ট নির্বাচন করুন");
      return;
    }
    setDB((d) => ({
      ...d,
      transactions: [
        {
          id: uid("txn"),
          date: new Date().toISOString(),
          kind,
          accountId,
          ...(kind === "transfer" ? { toAccountId } : {}),
          amount,
          category: kind === "in" ? "জমা" : kind === "out" ? "উত্তোলন" : "ট্রান্সফার",
          note,
          refType: "manual" as const,
        },
        ...d.transactions,
      ],
    }));
    setKind(null);
    toast.success("লেনদেন সংরক্ষণ হয়েছে");
  }

  function remove(id: string) {
    setDB((d) => ({ ...d, transactions: d.transactions.filter((t) => t.id !== id) }));
    toast.success("লেনদেন মুছে ফেলা হয়েছে");
  }

  const accName = (id?: string) => db.accounts.find((a) => a.id === id)?.name ?? "—";

  return (
    <AppShell
      title="হিসাব / টাকা"
      subtitle="ক্যাশ, মোবাইল ব্যাংকিং ও ব্যাংক অ্যাকাউন্টের হিসাব"
      actions={
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open("in")}>
            <ArrowDownLeft className="size-4" /> টাকা জমা
          </Button>
          <Button variant="secondary" onClick={() => open("out")}>
            <ArrowUpRight className="size-4" /> টাকা উত্তোলন
          </Button>
          <Button variant="outline" onClick={() => open("transfer")}>
            <ArrowLeftRight className="size-4" /> ট্রান্সফার
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {db.accounts.map((a) => (
          <button
            key={a.id}
            onClick={() => setFilter(filter === a.id ? "" : a.id)}
            className={
              "card-surface p-4 text-left transition-colors " +
              (filter === a.id ? "border-primary" : "hover:border-primary/50")
            }
          >
            <p className="text-xs text-muted-foreground">
              {a.type === "cash" ? "ক্যাশ" : a.type === "bank" ? "ব্যাংক" : "মোবাইল ব্যাংকিং"}
            </p>
            <p className="text-sm font-medium">{a.name}</p>
            <p className="mt-1 text-lg font-bold">{money(accountBalance(db, a.id))}</p>
          </button>
        ))}
        <div className="card-surface bg-primary p-4 text-primary-foreground">
          <p className="text-xs opacity-80">সর্বমোট ব্যালেন্স</p>
          <p className="mt-1 text-xl font-bold">{money(totalBalance(db))}</p>
          <p className="mt-1 text-xs opacity-80">{num(db.accounts.length)} টি অ্যাকাউন্ট</p>
        </div>
      </div>

      <Card
        title={filter ? `লেনদেন — ${accName(filter)}` : "সব লেনদেন"}
        className="mt-4"
        actions={
          filter ? (
            <Button size="sm" variant="ghost" onClick={() => setFilter("")}>
              ফিল্টার সরান
            </Button>
          ) : null
        }
      >
        {txns.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">কোনো লেনদেন নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>তারিখ</Th>
                  <Th>ধরন</Th>
                  <Th>অ্যাকাউন্ট</Th>
                  <Th>বিবরণ</Th>
                  <Th className="text-right">পরিমাণ</Th>
                  <Th className="text-center">মুছুন</Th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2">{bnDate(t.date)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs " +
                          (t.kind === "in"
                            ? "bg-success/10 text-success"
                            : t.kind === "out"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-info/10 text-info")
                        }
                      >
                        {t.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {accName(t.accountId)}
                      {t.kind === "transfer" ? ` → ${accName(t.toAccountId)}` : ""}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{t.note || "—"}</td>
                    <td className="px-3 py-2 text-right font-medium">{money(t.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="icon" variant="ghost" onClick={() => remove(t.id)}>
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

      <Dialog open={!!kind} onOpenChange={(o) => !o && setKind(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {kind === "in" ? "টাকা জমা" : kind === "out" ? "টাকা উত্তোলন" : "ট্রান্সফার"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label={kind === "transfer" ? "যে অ্যাকাউন্ট থেকে" : "অ্যাকাউন্ট"}>
              <Sel value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Sel>
            </Field>
            {kind === "transfer" && (
              <Field label="যে অ্যাকাউন্টে">
                <Sel value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
                  {db.accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Sel>
              </Field>
            )}
            <Field label="পরিমাণ (৳)">
              <Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            <Field label="বিবরণ">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="যেমন: মালিকের জমা" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKind(null)}>
              বাতিল
            </Button>
            <Button onClick={save}>সংরক্ষণ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
