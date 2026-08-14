import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, Field, Sel, Th } from "@/components/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Plus, Trash2, Upload, RotateCcw } from "lucide-react";
import { money } from "@/lib/bn";
import {
  accountBalance,
  replaceDB,
  resetDB,
  setDB,
  uid,
  useDB,
  type AccountType,
  type DB,
} from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "সেটিংস — মাহমুদ টেলিকম" },
      { name: "description", content: "দোকানের তথ্য, পেমেন্ট অ্যাকাউন্ট এবং ডেটা ব্যাকআপ ও রিস্টোর।" },
      { property: "og:title", content: "সেটিংস — মাহমুদ টেলিকম" },
      { property: "og:description", content: "দোকানের তথ্য, পেমেন্ট অ্যাকাউন্ট এবং ডেটা ব্যাকআপ ও রিস্টোর।" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const db = useDB();
  const [name, setName] = useState(db.shopName);
  const [address, setAddress] = useState(db.shopAddress);
  const [phone, setPhone] = useState(db.shopPhone);
  const [accName, setAccName] = useState("");
  const [accType, setAccType] = useState<AccountType>("mobile");
  const [accOpen, setAccOpen] = useState(0);

  function backup() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `mahmud-telecom-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("ব্যাকআপ ডাউনলোড হয়েছে");
  }

  function restore(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        replaceDB(JSON.parse(String(reader.result)) as DB);
        toast.success("ডেটা রিস্টোর হয়েছে");
      } catch {
        toast.error("ফাইলটি সঠিক নয়");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell title="সেটিংস" subtitle="দোকানের তথ্য ও ডেটা ব্যবস্থাপনা">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="দোকানের তথ্য">
          <div className="grid gap-3">
            <Field label="দোকানের নাম">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="ঠিকানা">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="মোবাইল নম্বর">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Button
              onClick={() => {
                setDB((d) => ({ ...d, shopName: name, shopAddress: address, shopPhone: phone }));
                toast.success("সংরক্ষণ হয়েছে");
              }}
            >
              সংরক্ষণ করুন
            </Button>
          </div>
        </Card>

        <Card title="ডেটা ব্যবস্থাপনা">
          <p className="mb-3 text-sm text-muted-foreground">
            সব ডেটা এই ব্রাউজারে সংরক্ষিত থাকে। নিয়মিত ব্যাকআপ নিন।
          </p>
          <div className="grid gap-2">
            <Button variant="secondary" onClick={backup}>
              <Download className="size-4" /> ব্যাকআপ ডাউনলোড
            </Button>
            <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-secondary">
              <Upload className="size-4" /> ব্যাকআপ রিস্টোর
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm("সব ডেটা মুছে যাবে। আপনি কি নিশ্চিত?")) {
                  resetDB();
                  toast.success("সব ডেটা মুছে ফেলা হয়েছে");
                }
              }}
            >
              <RotateCcw className="size-4 text-destructive" /> সব ডেটা মুছুন
            </Button>
          </div>
        </Card>
      </div>

      <Card title="পেমেন্ট অ্যাকাউন্ট" className="mt-4">
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_160px_160px_auto]">
          <Input placeholder="অ্যাকাউন্টের নাম" value={accName} onChange={(e) => setAccName(e.target.value)} />
          <Sel value={accType} onChange={(e) => setAccType(e.target.value as AccountType)}>
            <option value="cash">ক্যাশ</option>
            <option value="mobile">মোবাইল ব্যাংকিং</option>
            <option value="bank">ব্যাংক</option>
          </Sel>
          <Input
            type="number"
            placeholder="ওপেনিং ব্যালেন্স"
            value={accOpen}
            onChange={(e) => setAccOpen(Number(e.target.value))}
          />
          <Button
            onClick={() => {
              if (!accName.trim()) {
                toast.error("নাম দিন");
                return;
              }
              setDB((d) => ({
                ...d,
                accounts: [
                  ...d.accounts,
                  { id: uid("acc"), name: accName, type: accType, openingBalance: accOpen },
                ],
              }));
              setAccName("");
              setAccOpen(0);
              toast.success("অ্যাকাউন্ট যোগ হয়েছে");
            }}
          >
            <Plus className="size-4" /> যোগ করুন
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-border bg-secondary/50 text-xs">
              <tr>
                <Th>নাম</Th>
                <Th>ধরন</Th>
                <Th className="text-right">ওপেনিং ব্যালেন্স</Th>
                <Th className="text-right">বর্তমান ব্যালেন্স</Th>
                <Th className="text-center">মুছুন</Th>
              </tr>
            </thead>
            <tbody>
              {db.accounts.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {a.type === "cash" ? "ক্যাশ" : a.type === "bank" ? "ব্যাংক" : "মোবাইল ব্যাংকিং"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Input
                      type="number"
                      value={a.openingBalance}
                      onChange={(e) =>
                        setDB((d) => ({
                          ...d,
                          accounts: d.accounts.map((x) =>
                            x.id === a.id ? { ...x, openingBalance: Number(e.target.value) } : x,
                          ),
                        }))
                      }
                      className="h-8 w-32 text-right"
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-medium">{money(accountBalance(db, a.id))}</td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDB((d) => ({ ...d, accounts: d.accounts.filter((x) => x.id !== a.id) }))
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
      </Card>
    </AppShell>
  );
}
