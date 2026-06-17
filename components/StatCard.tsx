export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-sky-200/70">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-blue-100/62">{detail}</p> : null}
    </div>
  );
}
