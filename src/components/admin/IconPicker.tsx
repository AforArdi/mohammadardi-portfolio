"use client";

import { useId, useState } from "react";
import { searchIcons } from "@/lib/content/icons";

export default function IconPicker({ value, onChange, allowBrand = true, disabled = false }: {
  value: string | null;
  onChange: (key: string) => void;
  allowBrand?: boolean;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const hintId = useId();
  const matches = searchIcons(search, allowBrand);

  return (
    <fieldset disabled={disabled} className="space-y-3 disabled:opacity-60">
      <legend className="mb-3 text-sm font-medium">Library icon</legend>
      <input value={search} onChange={event => setSearch(event.target.value)} className="input-field text-sm" aria-label="Search icons" aria-describedby={hintId} placeholder="Search WhatsApp, Telegram, React…" />
      <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-6">
        {matches.map(({ key, label, Icon }) => (
          <button key={key} type="button" title={label} aria-label={label} aria-pressed={key === value} onClick={() => onChange(key)} className={`flex min-h-16 flex-col items-center gap-2 rounded-lg border p-3 transition-colors disabled:cursor-not-allowed ${key === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/60"}`}>
            <Icon size={24} aria-hidden />
            <span className="max-w-full truncate text-[10px]">{label}</span>
          </button>
        ))}
      </div>
      {!matches.length && <p role="status" className="text-sm text-muted-foreground">No matching icons. Try another name or upload a custom icon below.</p>}
      <p id={hintId} className="text-xs text-muted-foreground">Search the bundled library. Choosing an icon replaces your custom upload for this item.</p>
    </fieldset>
  );
}
