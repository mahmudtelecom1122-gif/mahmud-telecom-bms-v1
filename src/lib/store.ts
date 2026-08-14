import { useSyncExternalStore } from "react";

/* ---------------- Types ---------------- */

export type Product = {
  id: string;
  name: string;
  category: string;
  brand: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  minStock: number;
  supplier: string;
  code: string;
  imei: string;
  warrantyMonths: number;
  purchaseDate: string;
  image: string;
  note: string;
};

export type AccountType = "cash" | "mobile" | "bank";

export type PaymentAccount = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
};

export type TxnKind = "in" | "out" | "transfer";

export type Transaction = {
  id: string;
  date: string;
  kind: TxnKind;
  accountId: string;
  toAccountId?: string | undefined;
  amount: number;
  category: string;
  note: string;
  refType?: "sale" | "purchase" | "installment" | "due" | "manual" | undefined;
  refId?: string | undefined;
};

export type SaleItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  cost: number;
  imei?: string | undefined;
  warrantyMonths?: number | undefined;
};

export type Sale = {
  id: string;
  invoiceNo: string;
  date: string;
  customer: string;
  customerId?: string | undefined;
  phone?: string | undefined;
  items: SaleItem[];
  discount: number;
  paid: number;
  accountId: string;
  note?: string | undefined;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  note: string;
};

export type PurchaseItem = { productId: string; name: string; qty: number; cost: number };

export type Purchase = {
  id: string;
  invoiceNo: string;
  date: string;
  supplier: string;
  items: PurchaseItem[];
  paid: number;
  accountId: string;
  note?: string | undefined;
};

export type InstallmentRow = {
  no: number;
  dueDate: string;
  amount: number;
  paidDate?: string | undefined;
  paidAmount?: number | undefined;
  accountId?: string | undefined;
};

export type InstallmentPlan = {
  id: string;
  date: string;
  customer: string;
  phone: string;
  productName: string;
  totalAmount: number;
  downPayment: number;
  months: number;
  startDate: string;
  rows: InstallmentRow[];
  note?: string | undefined;
};

export type DB = {
  version: number;
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  invoiceSeq: number;
  products: Product[];
  accounts: PaymentAccount[];
  transactions: Transaction[];
  sales: Sale[];
  customers: Customer[];
  purchases: Purchase[];
  installments: InstallmentPlan[];
};

const KEY = "mtbms_v1";

export const defaultAccounts: PaymentAccount[] = [
  { id: "acc-cash", name: "ক্যাশ", type: "cash", openingBalance: 0 },
  { id: "acc-bkash", name: "বিকাশ", type: "mobile", openingBalance: 0 },
  { id: "acc-nagad", name: "নগদ", type: "mobile", openingBalance: 0 },
  { id: "acc-rocket", name: "রকেট", type: "mobile", openingBalance: 0 },
  { id: "acc-cellfin", name: "CellFin", type: "mobile", openingBalance: 0 },
  { id: "acc-mcash", name: "mCash", type: "mobile", openingBalance: 0 },
  { id: "acc-ibbl", name: "ইসলামী ব্যাংক", type: "bank", openingBalance: 0 },
];

export const expenseHeads = [
  "দোকান ভাড়া",
  "বিদ্যুৎ বিল",
  "কর্মচারী বেতন",
  "যাতায়াত",
  "খাবার",
  "ইন্টারনেট",
  "মেরামত",
  "অন্যান্য",
];

const emptyDB: DB = {
  version: 2,
  shopName: "মাহমুদ টেলিকম",
  shopAddress: "",
  shopPhone: "",
  invoiceSeq: 1,
  products: [],
  accounts: defaultAccounts,
  transactions: [],
  sales: [],
  customers: [],
  purchases: [],
  installments: [],
};

/* ---------------- Store ---------------- */

let state: DB = emptyDB;
let loaded = false;
const listeners = new Set<() => void>();

function read(): DB {
  if (typeof window === "undefined") return emptyDB;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return emptyDB;
    const parsed = JSON.parse(raw) as Partial<DB>;
    return { ...emptyDB, ...parsed };
  } catch {
    return emptyDB;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    state = read();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function setDB(updater: (db: DB) => DB) {
  ensureLoaded();
  state = updater(state);
  persist();
  emit();
}

export function replaceDB(next: DB) {
  state = { ...emptyDB, ...next };
  persist();
  emit();
}

export function resetDB() {
  replaceDB(emptyDB);
}

function subscribe(cb: () => void) {
  ensureLoaded();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): DB {
  ensureLoaded();
  return state;
}

function getServerSnapshot(): DB {
  return emptyDB;
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function uid(prefix = "id") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------------- Derived helpers ---------------- */

export function accountBalance(db: DB, accountId: string) {
  const acc = db.accounts.find((a) => a.id === accountId);
  let bal = acc?.openingBalance ?? 0;
  for (const t of db.transactions) {
    if (t.kind === "transfer") {
      if (t.accountId === accountId) bal -= t.amount;
      if (t.toAccountId === accountId) bal += t.amount;
    } else if (t.accountId === accountId) {
      bal += t.kind === "in" ? t.amount : -t.amount;
    }
  }
  return bal;
}

export function totalBalance(db: DB) {
  return db.accounts.reduce((sum, a) => sum + accountBalance(db, a.id), 0);
}

export function saleTotal(sale: Sale) {
  const gross = sale.items.reduce((s, i) => s + i.qty * i.price, 0);
  return gross - sale.discount;
}

export function saleCost(sale: Sale) {
  return sale.items.reduce((s, i) => s + i.qty * i.cost, 0);
}

export function salePaid(db: DB, sale: Sale) {
  const extra = db.transactions
    .filter((t) => t.refType === "due" && t.refId === sale.id)
    .reduce((s, t) => s + t.amount, 0);
  return sale.paid + extra;
}

export function saleDue(db: DB, sale: Sale) {
  return Math.max(0, saleTotal(sale) - salePaid(db, sale));
}

export function purchaseTotal(p: Purchase) {
  return p.items.reduce((s, i) => s + i.qty * i.cost, 0);
}

export function isToday(dateISO: string) {
  return dateISO.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

export function inRange(dateISO: string, from: string, to: string) {
  const d = dateISO.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

export function stockValue(db: DB) {
  return db.products.reduce((s, p) => s + p.stock * p.purchasePrice, 0);
}

export function stockSaleValue(db: DB) {
  return db.products.reduce((s, p) => s + p.stock * p.salePrice, 0);
}

export function lowStock(db: DB) {
  return db.products.filter((p) => p.stock <= p.minStock);
}

export function totalDue(db: DB) {
  return db.sales.reduce((s, sale) => s + saleDue(db, sale), 0);
}

export function totalExpense(db: DB, onlyToday = false) {
  return db.transactions
    .filter((t) => t.kind === "out" && t.category === "খরচ" && (!onlyToday || isToday(t.date)))
    .reduce((s, t) => s + t.amount, 0);
}

export function warrantyStatus(purchaseDate: string, months: number) {
  if (!purchaseDate || !months) return { label: "নেই", days: 0 };
  const end = new Date(purchaseDate);
  end.setMonth(end.getMonth() + months);
  const days = Math.ceil((end.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "মেয়াদোত্তীর্ণ", days };
  if (days <= 30) return { label: "শেষ হচ্ছে", days };
  return { label: "সক্রিয়", days };
}

export function addMonths(iso: string, m: number) {
  const d = new Date(iso || new Date().toISOString());
  d.setMonth(d.getMonth() + m);
  return d.toISOString().slice(0, 10);
}

export function planPaid(plan: InstallmentPlan) {
  return plan.downPayment + plan.rows.reduce((s, r) => s + (r.paidAmount ?? 0), 0);
}

export function planDue(plan: InstallmentPlan) {
  return Math.max(0, plan.totalAmount - planPaid(plan));
}

/* ---------------- Actions ---------------- */

export function nextInvoiceNo(db: DB, prefix = "INV") {
  return `${prefix}-${String(db.invoiceSeq).padStart(4, "0")}`;
}

export function createSale(input: {
  customer: string;
  customerId?: string | undefined;
  phone?: string | undefined;
  items: SaleItem[];
  discount: number;
  paid: number;
  accountId: string;
  note?: string | undefined;
}) {
  let created: Sale | null = null;
  setDB((db) => {
    const sale: Sale = {
      id: uid("sale"),
      invoiceNo: nextInvoiceNo(db),
      date: new Date().toISOString(),
      ...input,
    };
    created = sale;
    const products = db.products.map((p) => {
      const it = input.items.find((i) => i.productId === p.id);
      return it ? { ...p, stock: p.stock - it.qty } : p;
    });
    const txns: Transaction[] = [];
    if (input.paid > 0) {
      txns.push({
        id: uid("txn"),
        date: sale.date,
        kind: "in",
        accountId: input.accountId,
        amount: input.paid,
        category: "বিক্রয়",
        note: `${sale.invoiceNo} — ${input.customer || "ওয়াক-ইন কাস্টমার"}`,
        refType: "sale",
        refId: sale.id,
      });
    }
    return {
      ...db,
      invoiceSeq: db.invoiceSeq + 1,
      products,
      sales: [sale, ...db.sales],
      transactions: [...txns, ...db.transactions],
    };
  });
  return created as Sale | null;
}

export function collectDue(sale: Sale, amount: number, accountId: string) {
  setDB((db) => ({
    ...db,
    transactions: [
      {
        id: uid("txn"),
        date: new Date().toISOString(),
        kind: "in",
        accountId,
        amount,
        category: "বকেয়া আদায়",
        note: `${sale.invoiceNo} — ${sale.customer || "কাস্টমার"}`,
        refType: "due",
        refId: sale.id,
      },
      ...db.transactions,
    ],
  }));
}

export function createPurchase(input: {
  supplier: string;
  items: PurchaseItem[];
  paid: number;
  accountId: string;
  note?: string | undefined;
  date?: string | undefined;
}) {
  setDB((db) => {
    const purchase: Purchase = {
      id: uid("pur"),
      invoiceNo: `PUR-${String(db.purchases.length + 1).padStart(4, "0")}`,
      date: input.date ? new Date(input.date).toISOString() : new Date().toISOString(),
      supplier: input.supplier,
      items: input.items,
      paid: input.paid,
      accountId: input.accountId,
      note: input.note,
    };
    const products = db.products.map((p) => {
      const it = input.items.find((i) => i.productId === p.id);
      return it ? { ...p, stock: p.stock + it.qty, purchasePrice: it.cost || p.purchasePrice } : p;
    });
    const txns: Transaction[] = [];
    if (input.paid > 0) {
      txns.push({
        id: uid("txn"),
        date: purchase.date,
        kind: "out",
        accountId: input.accountId,
        amount: input.paid,
        category: "ক্রয়",
        note: `${purchase.invoiceNo} — ${input.supplier || "সাপ্লায়ার"}`,
        refType: "purchase",
        refId: purchase.id,
      });
    }
    return {
      ...db,
      products,
      purchases: [purchase, ...db.purchases],
      transactions: [...txns, ...db.transactions],
    };
  });
}

export function payInstallment(planId: string, no: number, amount: number, accountId: string) {
  setDB((db) => {
    const plan = db.installments.find((p) => p.id === planId);
    const today = new Date().toISOString();
    return {
      ...db,
      installments: db.installments.map((p) =>
        p.id === planId
          ? {
              ...p,
              rows: p.rows.map((r) =>
                r.no === no
                  ? { ...r, paidAmount: amount, paidDate: today.slice(0, 10), accountId }
                  : r,
              ),
            }
          : p,
      ),
      transactions: [
        {
          id: uid("txn"),
          date: today,
          kind: "in" as TxnKind,
          accountId,
          amount,
          category: "কিস্তি আদায়",
          note: `${plan?.customer ?? ""} — কিস্তি ${no}`,
          refType: "installment" as const,
          refId: planId,
        },
        ...db.transactions,
      ],
    };
  });
}
