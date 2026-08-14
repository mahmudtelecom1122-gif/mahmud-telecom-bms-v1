import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { money, num, toBn, bnDate } from "@/lib/bn";
import {
  addMonths,
  payInstallment,
  planDue,
  planPaid,
  setDB,
  uid,
  useDB,
  type InstallmentPlan,
  type InstallmentRow,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/installments")({
  head: () => ({
    meta: [
      { title: "কিস্তি — মাহমুদ টেলিকম" },
      { name: "description", content: "কিস্তিতে বিক্রয়ের শিডিউল, আদায় ও বকেয়া কিস্তির হিসাব।" },
      { property: "og:title", content: "কিস্তি — মাহমুদ টেলিকম" },
      { property: "og:description", content: "কিস্তিতে বিক্রয়ের শিডিউল, আদায় ও বকেয়া কিস্তির হিসাব।" },
    ],
  }),
  component: InstallmentsPage,
});

function InstallmentsPage() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [productName, setProductName] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [months, setMonths] = useState(6);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [pay, setPay] = useState<{ planId: string; row: InstallmentRow } | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payAccount, setPayAccount] = useState(db.accounts[0]?.id ?? "");

  const today = new Date().toISOString().slice(0, 10);
  const allRows = db.installments.flatMap((p) => p.rows.map((r) => ({ p, r })));
  const overdue = allRows.filter((x) => !x.r.paidDate && x.r.dueDate < today);
  const upcoming = allRows.filter((x) => !x.r.paidDate && x.r.dueDate >= today);
  const collected = db.installments.reduce((s, p) => s + planPaid(p), 0);
  const remaining = db.installments.reduce((s, p) => s + planDue(p), 0);

  function create() {
    if (!customer.trim() || totalAmount <= 0 || months <= 0) {
      toast.error("কাস্টমার, মোট মূল্য ও মাস সঠিকভাবে দিন");
      return;
    }
    const per = Math.round((totalAmount - downPayment) / months);
    const rows: InstallmentRow[] = Array.from({ length: months }, (_, i) => ({
      no: i + 1,
      dueDate: addMonths(startDate, i + 1),
      amount: per,
    }));
    const plan: InstallmentPlan = {
      id: uid("ins"),
      date: new Date().toISOString(),
      customer,
      phone,
      productName,
      totalAmount,
      downPayment,
      months,
      startDate,
      rows,
    };
    setDB((d) => ({
      ...d,
      installments: [plan, ...d.installments],
      transactions:
        downPayment > 0
          ? [
              {
                id: uid("txn"),
                date: plan.date,
                kind: "in" as const,
                accountId,
                amount: downPayment,
                category: "কিস্তি ডাউন পেমেন্ট",
                note: `${customer} — ${productName}`,
                refType: "installment" as const,
                refId: plan.id,
              },
              ...d.transactions,
            ]
          : d.transactions,
    }));
    setOpen(false);
    setCustomer("");
    setPhone("");
    setProductName("");
    setTotalAmount(0);
    setDownPayment(0);
    toast.success("কিস্তি শিডিউল তৈরি হয়েছে");
  }

  return (
    <AppShell
      title="কিস্তি"
      subtitle="কিস্তিতে বিক্রয় ও আদায়ের হিসাব"
      actions={
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> নতুন কিস্তি
        </Button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="মোট আদায়" value={money(collected)} />
        <Stat label="বাকি আদায়যোগ্য" value={money(remaining)} />
        <Stat label="মেয়াদোত্তীর্ণ কিস্তি" value={num(overdue.length) + " টি"} />
        <Stat label="আসন্ন কিস্তি" value={num(upcoming.length) + " টি"} />
      </div>

      {overdue.length > 0 && (
        <Card title="মেয়াদোত্তীর্ণ কিস্তি" className="mt-4">
          <ul className="divide-y divide-border">
            {overdue.map(({ p, r }) => (
              <li key={p.id + r.no} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-medium">{p.customer}</span> — কিস্তি {num(r.no)}
                  <span className="block text-xs text-muted-foreground">
                    শেষ তারিখ {bnDate(r.dueDate)}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="font-medium text-destructive">{money(r.amount)}</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setPay({ planId: p.id, row: r });
                      setPayAmount(r.amount);
                    }}
                  >
                    আদায়
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-4 grid gap-4">
        {db.installments.length === 0 ? (
          <Card>
            <p className="py-6 text-center text-sm text-muted-foreground">কোনো কিস্তি শিডিউল নেই।</p>
          </Card>
        ) : (
          db.installments.map((p) => (
            <Card
              key={p.id}
              title={`${p.customer} — ${p.productName || "পণ্য"}`}
              actions={
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setDB((d) => ({ ...d, installments: d.installments.filter((x) => x.id !== p.id) }))
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              }
            >
              <div className="mb-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                <span>মোবাইল: {p.phone ? toBn(p.phone) : "—"}</span>
                <span>মোট: {money(p.totalAmount)}</span>
                <span>ডাউন পেমেন্ট: {money(p.downPayment)}</span>
                <span className="font-medium text-destructive">বাকি: {money(planDue(p))}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-xs">
                    <tr>
                      <Th>কিস্তি</Th>
                      <Th>শেষ তারিখ</Th>
                      <Th className="text-right">পরিমাণ</Th>
                      <Th>অবস্থা</Th>
                      <Th className="text-center">অ্যাকশন</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.rows.map((r) => (
                      <tr key={r.no} className="border-b border-border last:border-0">
                        <td className="px-3 py-2">{num(r.no)}</td>
                        <td className="px-3 py-2">{bnDate(r.dueDate)}</td>
                        <td className="px-3 py-2 text-right">{money(r.amount)}</td>
                        <td className="px-3 py-2 text-xs">
                          {r.paidDate ? (
                            <span className="text-success">পরিশোধিত · {bnDate(r.paidDate)}</span>
                          ) : r.dueDate < today ? (
                            <span className="text-destructive">মেয়াদোত্তীর্ণ</span>
                          ) : (
                            <span className="text-muted-foreground">বাকি</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.paidDate ? (
                            <CheckCircle2 className="mx-auto size-4 text-success" />
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setPay({ planId: p.id, row: r });
                                setPayAmount(r.amount);
                              }}
                            >
                              আদায়
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>নতুন কিস্তি শিডিউল</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="কাস্টমারের নাম">
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </Field>
            <Field label="মোবাইল">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field label="পণ্যের নাম">
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </Field>
            <Field label="মোট মূল্য (৳)">
              <Input type="number" value={totalAmount} onChange={(e) => setTotalAmount(Number(e.target.value))} />
            </Field>
            <Field label="ডাউন পেমেন্ট (৳)">
              <Input type="number" value={downPayment} onChange={(e) => setDownPayment(Number(e.target.value))} />
            </Field>
            <Field label="কিস্তির সংখ্যা (মাস)">
              <Input type="number" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
            </Field>
            <Field label="শুরুর তারিখ">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="ডাউন পেমেন্ট অ্যাকাউন্ট">
              <Sel value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            মাসিক কিস্তি প্রায়: {money(months > 0 ? Math.round((totalAmount - downPayment) / months) : 0)}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button onClick={create}>তৈরি করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pay} onOpenChange={(o) => !o && setPay(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>কিস্তি আদায়</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="পরিমাণ (৳)">
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
            </Field>
            <Field label="অ্যাকাউন্ট">
              <Sel value={payAccount} onChange={(e) => setPayAccount(e.target.value)}>
                {db.accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Sel>
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPay(null)}>
              বাতিল
            </Button>
            <Button
              onClick={() => {
                if (!pay || payAmount <= 0) return;
                payInstallment(pay.planId, pay.row.no, payAmount, payAccount);
                setPay(null);
                toast.success("কিস্তি আদায় হয়েছে");
              }}
            >
              আদায় করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
