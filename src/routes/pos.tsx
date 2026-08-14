import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Sel } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
  ShoppingCart,
  PackageSearch,
  BadgeCheck,
  Wallet,
  UserRound,
  ScanBarcode,
  X,
} from "lucide-react";
import { money, num, bnDate, toBn } from "@/lib/bn";
import {
  createSale,
  saleTotal,
  setDB,
  uid,
  useDB,
  type Sale,
  type SaleItem,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "বিক্রয় (POS) — মাহমুদ টেলিকম" },
      { name: "description", content: "পণ্য নির্বাচন করে দ্রুত বিক্রি, ডিসকাউন্ট, পেমেন্ট ও ইনভয়েস প্রিন্ট।" },
      { property: "og:title", content: "বিক্রয় (POS) — মাহমুদ টেলিকম" },
      { property: "og:description", content: "পণ্য নির্বাচন করে দ্রুত বিক্রি, ডিসকাউন্ট, পেমেন্ট ও ইনভয়েস প্রিন্ট।" },
    ],
  }),
  component: PosPage,
});

function PosPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "acc-cash");
  const [customerId, setCustomerId] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [invoice, setInvoice] = useState<Sale | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    db.products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [db.products]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    let base = db.products;
    if (cat !== "all") base = base.filter((p) => p.category === cat);
    if (s) {
      base = base.filter((p) =>
        [p.name, p.brand, p.code, p.imei].join(" ").toLowerCase().includes(s),
      );
    }
    return base.slice(0, 36);
  }, [db.products, q, cat]);

  const gross = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const total = Math.max(0, gross - discount);
  const due = Math.max(0, total - paid);
  const items = cart.reduce((s, i) => s + i.qty, 0);
  const profit = cart.reduce((s, i) => s + i.qty * (i.price - i.cost), 0) - discount;

  function add(productId: string) {
    const p = db.products.find((x) => x.id === productId);
    if (!p) return;
    const inCart = cart.find((i) => i.productId === productId);
    if ((inCart?.qty ?? 0) + 1 > p.stock) {
      toast.error("পর্যাপ্ত স্টক নেই");
      return;
    }
    setCart((c) =>
      inCart
        ? c.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i))
        : [
            ...c,
            {
              productId: p.id,
              name: p.name,
              qty: 1,
              price: p.salePrice,
              cost: p.purchasePrice,
              imei: p.imei,
              warrantyMonths: p.warrantyMonths,
            },
          ],
    );
  }

  function setQty(productId: string, qty: number) {
    const p = db.products.find((x) => x.id === productId);
    if (p && qty > p.stock) {
      toast.error("পর্যাপ্ত স্টক নেই");
      return;
    }
    setCart((c) =>
      qty <= 0
        ? c.filter((i) => i.productId !== productId)
        : c.map((i) => (i.productId === productId ? { ...i, qty } : i)),
    );
  }

  function reset() {
    setCart([]);
    setDiscount(0);
    setPaid(0);
    setCustomer("");
    setCustomerId("");
    setPhone("");
  }

  function checkout() {
    if (cart.length === 0) {
      toast.error("কার্টে কোনো পণ্য নেই");
      return;
    }
    let cid = customerId;
    const name = customer.trim();
    if (!cid && name) {
      cid = uid("cus");
      setDB((d) => ({
        ...d,
        customers: [{ id: cid, name, phone, address: "", note: "" }, ...d.customers],
      }));
    }
    const sale = createSale({
      customer: name || (cid ? (db.customers.find((c) => c.id === cid)?.name ?? "") : ""),
      customerId: cid || undefined,
      phone: phone || undefined,
      items: cart,
      discount,
      paid: Math.min(paid, total),
      accountId,
    });
    if (sale) {
      setInvoice(sale);
      toast.success("বিক্রয় সম্পন্ন হয়েছে");
      reset();
    }
  }

  return (
    <AppShell title="বিক্রয় (POS)" subtitle="পণ্য নির্বাচন করে দ্রুত বিক্রি ও ইনভয়েস">
      <div className="grid gap-4 xl:grid-cols-[1fr_400px]">
        {/* ---------- Left: catalog ---------- */}
        <div className="min-w-0">
          <div className="card-surface flex items-center gap-3 rounded-xl px-4 py-3 shadow-sm ring-1 ring-transparent transition focus-within:ring-primary/40">
            <ScanBarcode className="size-5 shrink-0 text-primary" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && list[0]) {
                  add(list[0].id);
                  setQ("");
                }
                if (e.key === "Escape") setQ("");
              }}
              placeholder="পণ্যের নাম, কোড বা IMEI স্ক্যান/লিখুন — Enter চাপলে কার্টে যাবে"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {q ? (
              <button onClick={() => setQ("")} aria-label="সার্চ মুছুন">
                <X className="size-4 text-muted-foreground hover:text-foreground" />
              </button>
            ) : (
              <Search className="size-4 text-muted-foreground" />
            )}
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip active={cat === "all"} onClick={() => setCat("all")}>
                সব পণ্য
              </Chip>
              {categories.map((c) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
                  {c}
                </Chip>
              ))}
            </div>
          )}

          {db.products.length === 0 ? (
            <div className="card-surface mt-3 flex flex-col items-center gap-2 py-14 text-center">
              <PackageSearch className="size-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                আগে “পণ্য ও স্টক” পেজ থেকে পণ্য যোগ করুন।
              </p>
            </div>
          ) : list.length === 0 ? (
            <div className="card-surface mt-3 py-14 text-center text-sm text-muted-foreground">
              কোনো পণ্য পাওয়া যায়নি
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id)?.qty ?? 0;
                const out = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => add(p.id)}
                    disabled={out}
                    className={
                      "group relative overflow-hidden rounded-xl border bg-card p-3 text-left shadow-sm transition-all " +
                      (out
                        ? "cursor-not-allowed border-border opacity-50"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md active:translate-y-0")
                    }
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 scale-x-0 bg-primary transition-transform group-hover:scale-x-100" />
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</p>
                      {inCart > 0 && (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                          {num(inCart)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {p.brand || "—"}
                      {p.code ? ` · ${p.code}` : ""}
                    </p>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="text-base font-bold text-primary">{money(p.salePrice)}</span>
                      <span
                        className={
                          "rounded-md px-1.5 py-0.5 text-[11px] font-medium " +
                          (out
                            ? "bg-destructive/10 text-destructive"
                            : p.stock <= p.minStock
                              ? "bg-accent/20 text-accent-foreground"
                              : "bg-secondary text-muted-foreground")
                        }
                      >
                        স্টক {num(p.stock)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- Right: cart ---------- */}
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg">
            <header className="flex items-center justify-between gap-2 border-b border-border bg-secondary/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">চলতি বিক্রয়</h2>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                  {num(items)} আইটেম
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={reset}
                  className="text-xs font-medium text-muted-foreground hover:text-destructive"
                >
                  খালি করুন
                </button>
              )}
            </header>

            <div className="max-h-[38vh] overflow-y-auto px-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <ShoppingCart className="size-9 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">পণ্যে ক্লিক করে কার্টে যোগ করুন</p>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {cart.map((i) => (
                    <li key={i.productId} className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium leading-snug">{i.name}</p>
                        <button onClick={() => setQty(i.productId, 0)} aria-label="বাদ দিন">
                          <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setQty(i.productId, i.qty - 1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold">{num(i.qty)}</span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-7"
                            onClick={() => setQty(i.productId, i.qty + 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                        <Input
                          type="number"
                          value={i.price}
                          onChange={(e) =>
                            setCart((c) =>
                              c.map((x) =>
                                x.productId === i.productId
                                  ? { ...x, price: Number(e.target.value) }
                                  : x,
                              ),
                            )
                          }
                          className="h-8 w-24 text-right"
                        />
                        <span className="w-24 text-right text-sm font-semibold">
                          {money(i.qty * i.price)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-3 border-t border-border px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <UserRound className="size-3.5" /> কাস্টমার
              </div>
              <Sel
                value={customerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setCustomerId(id);
                  const c = db.customers.find((x) => x.id === id);
                  setCustomer(c?.name ?? "");
                  setPhone(c?.phone ?? "");
                }}
              >
                <option value="">নতুন / ওয়াক-ইন কাস্টমার</option>
                {db.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.phone ? `(${c.phone})` : ""}
                  </option>
                ))}
              </Sel>
              {!customerId && (
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="নাম" value={customer} onChange={(e) => setCustomer(e.target.value)} />
                  <Input placeholder="মোবাইল" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Field label="ডিসকাউন্ট (৳)">
                  <Input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </Field>
                <Field label="জমা (৳)">
                  <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value))} />
                </Field>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <QuickBtn onClick={() => setPaid(total)}>পুরো টাকা</QuickBtn>
                <QuickBtn onClick={() => setPaid(0)}>বাকি</QuickBtn>
                {[500, 1000, 5000].map((v) => (
                  <QuickBtn key={v} onClick={() => setPaid((p) => p + v)}>
                    +{num(v)}
                  </QuickBtn>
                ))}
              </div>

              <div>
                <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Wallet className="size-3.5" /> পেমেন্ট অ্যাকাউন্ট
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {db.accounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAccountId(a.id)}
                      className={
                        "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors " +
                        (accountId === a.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/50")
                      }
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-3 text-sm">
                <Row label="সাবটোটাল" value={money(gross)} />
                <Row label="ডিসকাউন্ট" value={`− ${money(discount)}`} />
                <div className="my-2 border-t border-dashed border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold">সর্বমোট</span>
                  <span className="text-2xl font-extrabold tracking-tight text-primary">
                    {money(total)}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-background px-2 py-1.5">
                    <p className="text-muted-foreground">জমা</p>
                    <p className="font-semibold">{money(Math.min(paid, total))}</p>
                  </div>
                  <div className="rounded-lg bg-background px-2 py-1.5">
                    <p className="text-muted-foreground">বাকি</p>
                    <p className={"font-semibold " + (due > 0 ? "text-destructive" : "")}>
                      {money(due)}
                    </p>
                  </div>
                </div>
                {cart.length > 0 && (
                  <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <BadgeCheck className="size-3.5 text-primary" /> সম্ভাব্য লাভ {money(profit)}
                  </p>
                )}
              </div>

              <Button size="lg" className="w-full text-base font-semibold" onClick={checkout}>
                বিক্রয় সম্পন্ন করুন · {money(total)}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      <Dialog open={!!invoice} onOpenChange={(o) => !o && setInvoice(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ইনভয়েস</DialogTitle>
          </DialogHeader>
          {invoice ? (
            <InvoiceView sale={invoice} shop={db.shopName} address={db.shopAddress} phone={db.shopPhone} />
          ) : null}
          <Button onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4" /> প্রিন্ট করুন
          </Button>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}

function QuickBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
    >
      {children}
    </button>
  );
}

function InvoiceView({
  sale,
  shop,
  address,
  phone,
}: {
  sale: Sale;
  shop: string;
  address: string;
  phone: string;
}) {
  const total = saleTotal(sale);
  return (
    <div id="invoice-print" className="rounded-lg border border-border p-4 text-sm">
      <div className="text-center">
        <p className="text-base font-bold">{shop}</p>
        {address ? <p className="text-xs text-muted-foreground">{address}</p> : null}
        {phone ? <p className="text-xs text-muted-foreground">মোবাইল: {toBn(phone)}</p> : null}
      </div>
      <div className="mt-3 flex justify-between text-xs text-muted-foreground">
        <span>ইনভয়েস: {sale.invoiceNo}</span>
        <span>{bnDate(sale.date)}</span>
      </div>
      <p className="mt-1 text-xs">
        কাস্টমার: {sale.customer || "ওয়াক-ইন"} {sale.phone ? `· ${toBn(sale.phone)}` : ""}
      </p>
      <table className="mt-3 w-full text-xs">
        <thead className="border-y border-border">
          <tr>
            <th className="py-1 text-left">পণ্য</th>
            <th className="py-1 text-center">পরি.</th>
            <th className="py-1 text-right">দাম</th>
            <th className="py-1 text-right">মোট</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((i) => (
            <tr key={i.productId} className="border-b border-border/60">
              <td className="py-1">{i.name}</td>
              <td className="py-1 text-center">{num(i.qty)}</td>
              <td className="py-1 text-right">{money(i.price)}</td>
              <td className="py-1 text-right">{money(i.qty * i.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-sm">
        <Row label="ডিসকাউন্ট" value={money(sale.discount)} />
        <Row label="সর্বমোট" value={money(total)} strong />
        <Row label="জমা" value={money(sale.paid)} />
        <Row label="বাকি" value={money(Math.max(0, total - sale.paid))} />
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">ধন্যবাদ — আবার আসবেন</p>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex justify-between py-0.5 " + (strong ? "font-semibold" : "")}>
      <span className={strong ? "" : "text-muted-foreground"}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
