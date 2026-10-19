export default function Loading() {
  return <div role="status" aria-label="Loading page" className="animate-pulse py-8"><span className="sr-only">Loading, please wait.</span><div className="grid gap-8 md:grid-cols-2"><div className="space-y-6 py-8"><div className="h-3 w-48 rounded bg-pine-100" /><div className="h-24 w-4/5 rounded-2xl bg-pine-100" /><div className="h-16 rounded-xl bg-pine-100" /><div className="h-12 w-40 rounded-xl bg-pine-100" /></div><div className="h-96 rounded-3xl bg-pine-100" /></div><div className="mt-12 h-16 rounded-xl bg-pine-100" /></div>;
}
