"use client";
import { useRef, useState } from "react";
import { Upload, X, LoaderCircle } from "lucide-react";

async function resize(file: File, portrait: boolean) {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) throw new Error("Choose a PNG, JPEG, or WebP.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
    const size = Math.min(bitmap.width, bitmap.height);
    canvas.width = portrait ? Math.min(800, size) : Math.round(bitmap.width * scale);
    canvas.height = portrait ? canvas.width : Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare the image.");
    if (portrait) context.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
    else context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image processing failed")), "image/webp", 0.88));
    if (blob.size > 3_500_000) throw new Error("Choose a smaller image; the processed image must be under 3.5 MB.");
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } finally { bitmap.close(); }
}

export default function ImageUpload({ label, value, onChange, pdf = false, portrait = false, disabled = false, onBusy }: {
  label: string; value: string | null; onChange: (value: string | null) => void;
  pdf?: boolean; portrait?: boolean; disabled?: boolean; onBusy: (value: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function upload(file: File) {
    setBusy(true); onBusy(true); setError("");
    try {
      const prepared = pdf ? file : await resize(file, portrait);
      if (prepared.size > 3_500_000) throw new Error("Keep PDF uploads under 3.5 MB.");
      const data = new FormData(); data.set("file", prepared); data.set("kind", pdf ? "resume" : "image");
      const response = await fetch("/api/admin/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed.");
      onChange(result.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); onBusy(false); if (input.current) input.current.value = ""; }
  }
  return <div className="space-y-3">
    <p className="text-sm font-medium">{label}</p>
    {value && <div className="relative border border-border rounded-lg bg-background/70 p-3">
      {pdf ? <a href={`/api/admin/media/${value}`} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Preview current PDF ↗</a> :
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={`/api/admin/media/${value}`} alt={`${label} preview`} className={`max-h-44 mx-auto object-contain ${portrait ? "rounded-full aspect-square" : "rounded"}`} />}
      <button type="button" disabled={disabled || busy} aria-label={`Remove ${label}`} className="absolute right-2 top-2 p-1.5 bg-background border border-border rounded-full" onClick={() => onChange(null)}><X size={15} /></button>
    </div>}
    <input ref={input} type="file" accept={pdf ? ".pdf,application/pdf" : "image/png,image/jpeg,image/webp"} className="sr-only" aria-label={`Upload ${label}`} disabled={disabled || busy} onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
    <button type="button" className="inline-flex items-center gap-2 text-sm px-4 py-2 border border-border rounded-md hover:border-primary disabled:opacity-50" disabled={disabled || busy} onClick={() => input.current?.click()}>{busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}{busy ? "Uploading…" : value ? "Replace file" : "Upload file"}</button>
    <p className="text-xs text-muted-foreground">{pdf ? "PDF, up to 3.5 MB." : portrait ? "A square center crop is applied. Preview the result before saving." : "PNG, JPEG, or WebP. Large photos are resized before uploading; transparency is preserved."}</p>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
  </div>;
}
