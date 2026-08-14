const bnDigits = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBn(input: string | number) {
  return String(input).replace(/\d/g, (d) => bnDigits[Number(d)] ?? d);
}

export function money(n: number) {
  const rounded = Math.round(n);
  return "৳ " + toBn(rounded.toLocaleString("en-US"));
}

export function num(n: number) {
  return toBn(n.toLocaleString("en-US"));
}

export function bnDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = [
    "জানু",
    "ফেব",
    "মার্চ",
    "এপ্রিল",
    "মে",
    "জুন",
    "জুলাই",
    "আগস্ট",
    "সেপ্ট",
    "অক্টো",
    "নভে",
    "ডিসে",
  ];
  return `${toBn(d.getDate())} ${months[d.getMonth()]} ${toBn(d.getFullYear())}`;
}
