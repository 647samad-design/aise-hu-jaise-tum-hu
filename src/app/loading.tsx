export default function Loading() {
  return (
    <div className="page" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-4 w-32" />
      <div className="skeleton mt-4 h-10 w-72 max-w-full" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel space-y-3">
            <div className="skeleton aspect-[4/3] w-full" />
            <div className="skeleton h-5 w-3/4" />
            <div className="skeleton h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
