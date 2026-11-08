import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({ title, description, back, actions }: {
  title: string;
  description?: React.ReactNode;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="grid gap-1">
      {back ? (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary hover:underline">
          <ArrowLeft className="size-4" />{back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

/** Pill-style status filter links (All / Processing / Shipped ...). */
export function FilterTabs({ items, active }: { items: { href: string; label: string; key: string }[]; active: string }) {
  return (
    <nav aria-label="Filter" className="scrollbar-none flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1">
      {items.map((it) => (
        <Link key={it.key} href={it.href}
          className={`rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap ${it.key === active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
