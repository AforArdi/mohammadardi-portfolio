"use client";
import { useState } from "react";
import { iconRegistry } from "@/lib/content/icons";

export default function IconPicker({ value, onChange, allowBrand = true }: { value: string | null; onChange: (key: string) => void; allowBrand?: boolean }) {
  const [search, setSearch] = useState("");
  return <fieldset className="space-y-3"><legend className="text-sm font-medium mb-3">Library icon</legend><input value={search} onChange={event => setSearch(event.target.value)} className="input-field text-sm" aria-label="Search icons" placeholder="Search technology or icon…" />
    <div className="max-h-52 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 gap-2 p-1">{Object.entries(iconRegistry).filter(([key]) => (allowBrand || !key.startsWith("brand:")) && key.includes(search.toLowerCase().replaceAll(" ", ""))).map(([key, Icon]) => <button key={key} type="button" title={key} aria-label={key.replace(":", ": ")} aria-pressed={key === value} onClick={() => onChange(key)} className={`p-3 min-h-16 rounded-lg border flex flex-col items-center gap-2 transition-colors ${key === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/60"}`}><Icon size={24} /><span className="text-[9px] max-w-full truncate">{key.split(":")[1]}</span></button>)}</div>
    <p className="text-xs text-muted-foreground">Choose a brand or interface icon, or upload a custom transparent icon below.</p>
  </fieldset>;
}
