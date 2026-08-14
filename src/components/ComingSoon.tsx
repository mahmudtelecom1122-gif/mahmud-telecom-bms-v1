import { AppShell } from "@/components/AppShell";
import { Construction } from "lucide-react";

export function ComingSoon({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: string[];
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <div className="card-surface p-8 text-center">
        <Construction className="mx-auto size-10 text-accent" />
        <h2 className="mt-4 text-lg font-semibold">এই মডিউলটি পরবর্তী ধাপে আসছে</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ধাপে ধাপে তৈরি হচ্ছে — এই অংশে যা যা থাকবে:
        </p>
        <ul className="mx-auto mt-5 grid max-w-lg gap-2 text-right">
          {points.map((p) => (
            <li
              key={p}
              className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm text-secondary-foreground"
            >
              {p}
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
