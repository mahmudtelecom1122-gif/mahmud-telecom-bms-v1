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
import { Plus, Pencil, Trash2, HandCoins } from "lucide-react";
import { money, num, toBn, bnDate } from "@/lib/bn";
import {
  collectDue,
  saleDue,
  saleTotal,
  setDB,
  uid,
  useDB,
  type Customer,
  type Sale,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "কাস্টমার — মাহমুদ টেলিকম" },
      { name: "description", content: "কাস্টমার তালিকা, মোট কেনাকাটা, বকেয়া ও পেমেন্ট আদায়ের হিসাব।" },
      { property: "og:title", content: "কাস্টমার — মাহমুদ টেলিকম" },
      { property: "og:description", content: "কাস্টমার তালিকা, মোট কেনাকাটা, বকেয়া ও পেমেন্ট আদায়ের হিসাব।" },
    ],
  }),
  component: CustomersPage,
});

const blank = (): Customer => ({ id: "", name: "", phone: "", address: "", note: "" });

function CustomersPage() {
  const db = useDB();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Customer>(blank);
  const [duePay, setDuePay] = useState<Sale | null>(null);
  const [payAmount, setPayAmount] = useState(0);
  const [payAccount, setPayAccount] = useState(db.accounts[0]?.id ?? "");

  const dueSales = useMemo(() => db.sales.filter((s) => saleDue(db, s) > 0), [db]);

  function save() {
    if (!draft.name.trim()) {
      toast.error("নাম দিন");
      return;
    }
    setDB((d) => ({
      ...d,
      customers: draft.id
        ? d.customers.map((c) => (c.id === draft.id ? draft : c))
        : [{ ...draft, id: uid("cus") }, ...d.customers],
    }));
    setOpen(false);
    toast.success("সংরক্ষণ হয়েছে");
  }

  function stats(c: Customer) {
    const sales = db.sales.filter((s) => s.customerId === c.id || (s.phone && s.phone === c.phone));
    const bought = sales.reduce((s, x) => s + saleTotal(x), 0);
    const due = sales.reduce((s, x) => s + saleDue(db, x), 0);
    return { count: sales.length, bought, due };
  }

  return (
    <AppShell
      title="কাস্টমার"
      subtitle="কাস্টমার তালিকা ও পাওনার হিসাব"
      actions={
        <Button
          onClick={() => {
            setDraft(blank());
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> নতুন কাস্টমার
        </Button>
      }
    >
      <Card title="কাস্টমার তালিকা">
        {db.customers.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">কোনো কাস্টমার নেই।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>নাম</Th>
                  <Th>মোবাইল</Th>
                  <Th>ঠিকানা</Th>
                  <Th className="text-center">বিক্রয়</Th>
                  <Th className="text-right">মোট কেনাকাটা</Th>
                  <Th className="text-right">বকেয়া</Th>
                  <Th className="text-center">অ্যাকশন</Th>
                </tr>
              </thead>
              <tbody>
                {db.customers.map((c) => {
                  const s = stats(c);
                  return (
                    <tr key={c.id} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 font-medium">{c.name}</td>
                      <td className="px-3 py-2">{c.phone ? toBn(c.phone) : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{c.address || "—"}</td>
                      <td className="px-3 py-2 text-center">{num(s.count)}</td>
                      <td className="px-3 py-2 text-right">{money(s.bought)}</td>
                      <td className="px-3 py-2 text-right font-medium text-destructive">
                        {money(s.due)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setDraft({ ...c });
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setDB((d) => ({ ...d, customers: d.customers.filter((x) => x.id !== c.id) }))
                          }
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="বকেয়া বিক্রয় (আদায় বাকি)" className="mt-4">
        {dueSales.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">কোনো বকেয়া নেই। 👍</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="border-b border-border bg-secondary/50 text-xs">
                <tr>
                  <Th>ইনভয়েস</Th>
                  <Th>তারিখ</Th>
                  <Th>কাস্টমার</Th>
                  <Th className="text-right">মোট</Th>
                  <Th className="text-right">বকেয়া</Th>
                  <Th className="text-center">আদায়</Th>
                </tr>
              </thead>
              <tbody>
                {dueSales.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{s.invoiceNo}</td>
                    <td className="px-3 py-2">{bnDate(s.date)}</td>
                    <td className="px-3 py-2">{s.customer || "ওয়াক-ইন"}</td>
                    <td className="px-3 py-2 text-right">{money(saleTotal(s))}</td>
                    <td className="px-3 py-2 text-right font-medium text-destructive">
                      {money(saleDue(db, s))}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setDuePay(s);
                          setPayAmount(saleDue(db, s));
                        }}
                      >
                        <HandCoins className="size-4" /> আদায়
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
            <DialogTitle>{draft.id ? "কাস্টমার সম্পাদনা" : "নতুন কাস্টমার"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Field label="নাম">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label="মোবাইল">
              <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <Field label="ঠিকানা">
              <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label="নোট">
              <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
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

      <Dialog open={!!duePay} onOpenChange={(o) => !o && setDuePay(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>বকেয়া আদায় — {duePay?.invoiceNo}</DialogTitle>
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
            <Button variant="outline" onClick={() => setDuePay(null)}>
              বাতিল
            </Button>
            <Button
              onClick={() => {
                if (!duePay || payAmount <= 0) return;
                collectDue(duePay, Math.min(payAmount, saleDue(db, duePay)), payAccount);
                setDuePay(null);
                toast.success("বকেয়া আদায় হয়েছে");
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
