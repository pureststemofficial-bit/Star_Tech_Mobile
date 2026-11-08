export function DetailList({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[150px_1fr]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-muted-foreground">{k}</dt>
          <dd className="break-words whitespace-pre-wrap">{v || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
