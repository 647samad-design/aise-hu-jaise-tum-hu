"use client";

import { useMemo, useState } from "react";
import DrawCard from "@/components/DrawCard";
import type { Draw } from "@/lib/format";

export default function DrawExplorer({ draws, unavailable }: { draws: Draw[]; unavailable: boolean }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(() => draws.filter(d => {
    const expired = !!d.ends_at && new Date(d.ends_at).getTime() <= Date.now();
    return `${d.title} ${d.description ?? ""}`.toLowerCase().includes(query.toLowerCase()) &&
      (filter === "all" || (filter === "open" ? d.status === "open" && !expired : d.status === "full"));
  }).sort((a, b) => sort === "price" ? a.ticket_price - b.ticket_price : sort === "closing" ?
    (a.ends_at ? new Date(a.ends_at).getTime() : Infinity) - (b.ends_at ? new Date(b.ends_at).getTime() : Infinity) :
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [draws, query, filter, sort]);

  return <section id="draws" className="scroll-mt-28 py-12">
    <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
      <div><p className="eyebrow">A LITTLE POSSIBILITY</p><h2 className="section-title">Find your next big thing.</h2></div>
      <p className="text-sm text-pine-900/60">Real prizes. Every ticket accounted for.</p>
    </div>
    <div className="explorer-tools">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filter draws">{[["all", "All draws"], ["open", "Open for entry"], ["full", "Sold out"]].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`filter-tab ${filter === value ? "selected" : ""}`}>{label}</button>)}</div>
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="draw-search">Search draws</label><input id="draw-search" className="input !w-full sm:!w-52 !py-2.5 !text-sm" placeholder="Search prizes…" value={query} onChange={e => setQuery(e.target.value)} type="search" />
        <label className="sr-only" htmlFor="draw-sort">Sort draws</label><select id="draw-sort" className="input !w-auto !py-2.5 !text-sm" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Newest first</option><option value="price">Lowest ticket price</option><option value="closing">Ending soonest</option></select>
      </div>
    </div>
    {unavailable ? <div className="empty-panel" role="status"><span className="empty-mark">!</span><h3>Draws are taking a moment.</h3><p>We couldn’t load the latest draws. Please try again shortly.</p><a href="/" className="btn-ghost mt-5">Try again ↗</a></div> : <><p className="mb-4 text-xs text-pine-900/60" aria-live="polite">{visible.length} draw{visible.length === 1 ? "" : "s"} found</p>{visible.length ? <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{visible.map(d => <DrawCard key={d.id} draw={d} />)}</div> : <div className="empty-panel"><span className="empty-mark">↗</span><h3>{draws.length ? "A fresh search, a new possibility." : "Good things are on their way."}</h3><p>{draws.length ? "Try a different search or explore all draws." : "There are no live draws right now. Explore how it works while the next prizes get ready."}</p>{draws.length ? <button className="btn-ghost mt-5" onClick={() => { setQuery(""); setFilter("all"); }}>Clear filters</button> : <a href="#how-it-works" className="btn-ghost mt-5">How it works ↗</a>}</div>}</>}
  </section>;
}
