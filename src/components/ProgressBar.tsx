export default function ProgressBar({ sold, target }: { sold: number; target: number }) {
  const pct = Math.min(100, Math.round((sold / target) * 100));
  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-pine-100">
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
