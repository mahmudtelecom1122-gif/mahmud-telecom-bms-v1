import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Search, PackageSearch } from "lucide-react";
import { money, num, bnDate } from "@/lib/bn";
import { setDB, uid, useDB, warrantyStatus, type Product } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "পণ্য ও স্টক — মাহমুদ টেলিকম" },
      {
        name: "description",
        content: "পণ্য, ব্র্যান্ড, IMEI, ক্রয়-বিক্রয় মূল্য ও স্টক ম্যানেজমেন্ট।",
      },
      { property: "og:title", content: "পণ্য ও স্টক — মাহমুদ টেলিকম" },
      {
        property: "og:description",
        content: "পণ্য, ব্র্যান্ড, IMEI, ক্রয়-বিক্রয় মূল্য ও স্টক ম্যানেজমেন্ট।",
      },
    ],
  }),
  component: ProductsPage,
});

const blank = (): Product => ({
  id: "",
  name: "",
  category: "মোবাইল",
  brand: "",
  purchasePrice: 0,
  salePrice: 0,
  stock: 0,
  minStock: 1,
  supplier: "",
  code: "",
  imei: "",
  warrantyMonths: 12,
  purchaseDate: new Date().toISOString().slice(0, 10),
  image: "",
  note: "",
});

function ProductsPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Product>(blank);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return db.products;
    return db.products.filter((p) =>
      [p.name, p.brand, p.category, p.code, p.imei, p.supplier]
        .join(" ")
        .toLowerCase()
        .includes(s),
    );
  }, [db.products, q]);

  function startAdd() {
    setDraft(blank());
    setOpen(true);
  }

  function startEdit(p: Product) {
    setDraft({ ...p });
    setOpen(true);
  }

  function save() {
    if (!draft.name.trim()) {
      toast.error("পণ্যের নাম দিন");
      return;
    }
    setDB((db) => {
      if (draft.id) {
        return { ...db, products: db.products.map((p) => (p.id === draft.id ? draft : p)) };
      }
      return { ...db, products: [{ ...draft, id: uid("prd") }, ...db.products] };
    });
    setOpen(false);
    toast.success(draft.id ? "পণ্য আপডেট হয়েছে" : "নতুন পণ্য যোগ হয়েছে");
  }

  function remove(id: string) {
    setDB((db) => ({ ...db, products: db.products.filter((p) => p.id !== id) }));
    toast.success("পণ্য মুছে ফেলা হয়েছে");
  }

  return (
    <AppShell
      title="পণ্য ও স্টক"
      subtitle="সব পণ্যের তালিকা, ক্রয়-বিক্রয় মূল্য, IMEI ও ওয়ারেন্টি"
      actions={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startAdd}>
              <Plus className="size-4" /> নতুন পণ্য
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{draft.id ? "পণ্য সম্পাদনা" : "নতুন পণ্য যোগ করুন"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="পণ্যের নাম">
                <Input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Samsung Galaxy A16"
                />
              </Field>
              <Field label="ব্র্যান্ড">
                <Input
                  value={draft.brand}
                  onChange={(e) => setDraft({ ...draft, brand: e.target.value })}
                  placeholder="Samsung"
                />
              </Field>
              <Field label="ক্যাটাগরি">
                <Input
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  placeholder="মোবাইল / এক্সেসরিজ"
                />
              </Field>
              <Field label="প্রোডাক্ট কোড">
                <Input
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                  placeholder="P-001"
                />
              </Field>
              <Field label="ক্রয় মূল্য (৳)">
                <Input
                  type="number"
                  value={draft.purchasePrice}
                  onChange={(e) => setDraft({ ...draft, purchasePrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="বিক্রয় মূল্য (৳)">
                <Input
                  type="number"
                  value={draft.salePrice}
                  onChange={(e) => setDraft({ ...draft, salePrice: Number(e.target.value) })}
                />
              </Field>
              <Field label="স্টক">
                <Input
                  type="number"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
                />
              </Field>
              <Field label="মিনিমাম স্টক">
                <Input
                  type="number"
                  value={draft.minStock}
                  onChange={(e) => setDraft({ ...draft, minStock: Number(e.target.value) })}
                />
              </Field>
              <Field label="IMEI / সিরিয়াল নম্বর">
                <Input
                  value={draft.imei}
                  onChange={(e) => setDraft({ ...draft, imei: e.target.value })}
                  placeholder="৩৫২১…"
                />
              </Field>
              <Field label="সাপ্লায়ার">
                <Input
                  value={draft.supplier}
                  onChange={(e) => setDraft({ ...draft, supplier: e.target.value })}
                />
              </Field>
              <Field label="ওয়ারেন্টি (মাস)">
                <Input
                  type="number"
                  value={draft.warrantyMonths}
                  onChange={(e) => setDraft({ ...draft, warrantyMonths: Number(e.target.value) })}
                />
              </Field>
              <Field label="ক্রয়ের তারিখ">
                <Input
                  type="date"
                  value={draft.purchaseDate}
                  onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })}
                />
              </Field>
              <Field label="ছবির লিংক (ঐচ্ছিক)">
                <Input
                  value={draft.image}
                  onChange={(e) => setDraft({ ...draft, image: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <Field label="নোট">
                <Input
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
              </Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                বাতিল
              </Button>
              <Button onClick={save}>সংরক্ষণ করুন</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="card-surface mb-4 flex items-center gap-2 p-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="নাম, ব্র্যান্ড, কোড বা IMEI দিয়ে খুঁজুন…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          মোট {num(list.length)} টি
        </span>
      </div>

      {list.length === 0 ? (
        <div className="card-surface p-10 text-center">
          <PackageSearch className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 font-medium">কোনো পণ্য পাওয়া যায়নি</p>
          <p className="mt-1 text-sm text-muted-foreground">
            উপরের “নতুন পণ্য” বাটন থেকে পণ্য যোগ করুন।
          </p>
        </div>
      ) : (
        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs text-secondary-foreground">
              <tr>
                <Th>পণ্য</Th>
                <Th>ক্যাটাগরি</Th>
                <Th>IMEI</Th>
                <Th className="text-right">ক্রয়</Th>
                <Th className="text-right">বিক্রয়</Th>
                <Th className="text-center">স্টক</Th>
                <Th>ওয়ারেন্টি</Th>
                <Th className="text-center">অ্যাকশন</Th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const w = warrantyStatus(p.purchaseDate, p.warrantyMonths);
                const low = p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.brand || "—"} · {p.code || "কোড নেই"} · {bnDate(p.purchaseDate)}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{p.category || "—"}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.imei || "—"}</td>
                    <td className="px-3 py-2.5 text-right">{money(p.purchasePrice)}</td>
                    <td className="px-3 py-2.5 text-right font-medium">{money(p.salePrice)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-xs font-medium " +
                          (low
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success")
                        }
                      >
                        {num(p.stock)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {p.warrantyMonths ? `${num(p.warrantyMonths)} মাস · ${w.label}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex justify-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(p)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(p.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={"px-3 py-2 text-left font-medium " + className}>{children}</th>;
}
