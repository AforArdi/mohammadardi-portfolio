"use client";

import IconPicker from "./IconPicker";
import ImageUpload from "./ImageUpload";

type IconSelection = { iconKey: string | null; customMediaId: string | null };

// One selection flow for skills and socials; switching sources always clears the other source.
export default function IconField({ value, onChange, kind, disabled, onBusy }: {
  value: IconSelection;
  onChange: (value: IconSelection) => void;
  kind: "skill" | "social";
  disabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <IconPicker value={value.iconKey} allowBrand={kind === "social"} disabled={disabled} onChange={iconKey => onChange({ iconKey, customMediaId: null })} />
      <ImageUpload
        label={`Custom ${kind} icon`} purpose="icon" value={value.customMediaId}
        disabled={disabled} onBusy={onBusy}
        onChange={customMediaId => onChange({ customMediaId, iconKey: customMediaId ? null : kind === "skill" ? "lucide:code" : "lucide:globe" })}
      />
      <p className="text-xs text-muted-foreground">{value.customMediaId ? "Using your custom icon." : "Using the selected library icon."} For custom icons, choose a transparent PNG or WebP with enough contrast for the dark background.</p>
    </div>
  );
}
