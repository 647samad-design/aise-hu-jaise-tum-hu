export default function ProgressBar({ sold, target }: { sold: number; target: number }) {
  const pct = Math.min(100, Math.max(0, Math.round((sold / Math.max(1, target)) * 100)));
  return (
    <div>
      <div role="progressbar" aria-label="Tickets sold" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className="h-2 w-full overflow-hidden rounded-full bg-pine-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-pine-500 to-gold-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 flex justify-between text-xs font-medium text-pine-900/70">
        <span>
          {sold.toLocaleString()} / {target.toLocaleString()} tickets sold
        </span>
        <span>{pct}%</span>
      </p>
    </div>
  );
}
