"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, LoaderCircle, Check, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ImageUpload from "./ImageUpload";
import IconPicker from "./IconPicker";

type Section = "profile" | "skills" | "projects" | "achievements" | "socials";
type RecordData = Record<string, unknown> & { id?: string | number; version?: number };
type Field = { key: string; label: string; type?: "textarea" | "email" | "url"; required?: boolean; max?: number };
const sections: { id: Section; label: string; description: string }[] = [
  { id: "profile", label: "Profile & CV", description: "Your introduction, portrait, biography, availability, and resume." },
  { id: "skills", label: "Skills", description: "Choose an icon, fine-tune its glow, and keep your skills current." },
  { id: "projects", label: "Projects", description: "Show the work you’re proud of, with images and useful links." },
  { id: "achievements", label: "Achievements", description: "Share your certificates, milestones, and verification links." },
  { id: "socials", label: "Social links", description: "One place to update the links shown across your portfolio." },
];
const fields: Record<Section, Field[]> = {
  profile: [{ key: "greeting", label: "Greeting", max: 60 }, { key: "displayName", label: "Display name" }, { key: "fullName", label: "Full name" }, { key: "tagline", label: "Tagline", max: 200 }, { key: "aboutHeading", label: "About section heading" }, { key: "aboutBio", label: "About you", type: "textarea" }, { key: "availabilityText", label: "Availability", required: false, max: 100 }, { key: "contactEmail", label: "Public contact email", type: "email", max: 254 }],
  skills: [{ key: "name", label: "Skill name" }],
  projects: [{ key: "title", label: "Project title" }, { key: "description", label: "Description", type: "textarea" }, { key: "liveUrl", label: "Live site", type: "url" }, { key: "githubUrl", label: "GitHub / frontend repository", type: "url", required: false }, { key: "githubServerUrl", label: "Backend repository", type: "url", required: false }],
  achievements: [{ key: "title", label: "Achievement title" }, { key: "certificateType", label: "Certificate type" }, { key: "description", label: "Description", type: "textarea" }, { key: "verifyUrl", label: "View certificate link", type: "url" }],
  socials: [{ key: "platform", label: "Platform" }, { key: "label", label: "Accessible link label" }, { key: "url", label: "Profile URL", type: "url" }],
};
function blank(section: Section, order: number): RecordData {
  const record: RecordData = Object.fromEntries(fields[section].map(field => [field.key, ""]));
  if (section !== "profile") Object.assign(record, { displayOrder: order, isPublished: false });
  if (section === "skills") Object.assign(record, { iconProvider: "lucide", iconKey: "lucide:code", customMediaId: null, accentColor: "#C084FC" });
  if (section === "socials") record.iconKey = "lucide:globe";
  if (section === "projects" || section === "achievements") record.imageMediaId = null;
  return record;
}

export default function ContentStudio() {
  const [section, setSection] = useState<Section>("profile");
  const [items, setItems] = useState<RecordData[]>([]);
  const [editing, setEditing] = useState<RecordData | null>(null);
  const [deleting, setDeleting] = useState<RecordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const current = sections.find(value => value.id === section)!;
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setEditing(null); setError("");
    fetch(`/api/admin/content/${section}`, { signal: controller.signal, cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (controller.signal.aborted) return;
      setItems(section === "profile" ? result ? [result] : [] : result);
      if (section === "profile") setEditing(result);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message || "Could not load this section."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [section, refresh]);
  const change = (key: string, value: unknown) => setEditing(record => record ? { ...record, [key]: value } : record);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editing || saving || uploading) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const data: Record<string, unknown> = Object.fromEntries(fields[section].map(field => [field.key, editing[field.key] ?? ""]));
      if (section !== "profile") Object.assign(data, { displayOrder: Number(editing.displayOrder), isPublished: Boolean(editing.isPublished) });
      if (section === "profile") Object.assign(data, { avatarMediaId: editing.avatarMediaId || null, resumeMediaId: editing.resumeMediaId || null });
      if (section === "projects" || section === "achievements") data.imageMediaId = editing.imageMediaId;
      if (section === "skills") Object.assign(data, { iconProvider: editing.iconProvider, iconKey: editing.iconKey, customMediaId: editing.customMediaId || null, accentColor: editing.accentColor });
      if (section === "socials") data.iconKey = editing.iconKey;
      const response = await fetch(`/api/admin/content/${section}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(typeof editing.id === "string" ? { id: editing.id } : {}), ...(editing.version ? { expectedVersion: editing.version } : {}), data }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setNotice(section === "profile" || result.isPublished ? "Saved. Your portfolio is up to date." : "Draft saved. It’s visible only in your dashboard.");
      setRefresh(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Save failed."); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!deleting || saving) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`/api/admin/content/${section}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: deleting.id, expectedVersion: deleting.version }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setDeleting(null); setNotice("Deleted from your portfolio."); setRefresh(value => value + 1);
    } catch (error) { setError(error instanceof Error ? error.message : "Delete failed."); }
    finally { setSaving(false); }
  }
  return <div className="grid lg:grid-cols-[210px_minmax(0,1fr)] gap-8">
    <nav aria-label="Portfolio sections" className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">{sections.map(value => <button key={value.id} disabled={saving || uploading} onClick={() => { setSection(value.id); setNotice(""); }} aria-current={value.id === section ? "page" : undefined} className={`shrink-0 text-left px-4 py-3 rounded-lg border transition-colors ${value.id === section ? "border-primary/50 bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-card"}`}>{value.label}</button>)}</nav>
    <section className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6"><div><h2 className="text-2xl font-bold">{current.label}</h2><p className="text-sm mt-2 text-muted-foreground">{current.description}</p></div>{section !== "profile" && !editing && <button type="button" className="btn-primary rounded-md inline-flex items-center gap-2" disabled={loading} onClick={() => { setEditing(blank(section, items.length)); setNotice(""); }}><Plus size={16} />Add {section === "socials" ? "link" : section.slice(0, -1)}</button>}</div>
      {notice && <p role="status" className="mb-5 rounded-lg border border-green-400/20 bg-green-400/5 text-green-200 text-sm p-4 flex items-center gap-2"><Check size={16} />{notice}</p>}
      {error && <p role="alert" className="mb-5 rounded-lg border border-red-400/20 bg-red-400/5 text-red-200 text-sm p-4">{error}</p>}
      {loading ? <p className="flex items-center gap-2 text-muted-foreground py-12"><LoaderCircle className="animate-spin" size={20} />Loading…</p> : editing ?
        <form onSubmit={save} className="space-y-6 border border-border rounded-xl bg-card/40 p-5 sm:p-8">
          {section !== "profile" && <h3 className="font-mono text-lg">{editing.id ? "Edit" : "New"} {section === "socials" ? "social link" : section.slice(0, -1)}</h3>}
          <div className="grid sm:grid-cols-2 gap-5">{fields[section].map(field => <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}><label htmlFor={`field-${field.key}`} className="block text-sm mb-2">{field.label}{field.required === false && <span className="text-muted-foreground"> (optional)</span>}</label>{field.type === "textarea" ? <textarea id={`field-${field.key}`} value={String(editing[field.key] || "")} onChange={event => change(field.key, event.target.value)} required rows={5} maxLength={10000} className="input-field resize-y" /> : <input id={`field-${field.key}`} type={field.type || "text"} value={String(editing[field.key] || "")} onChange={event => change(field.key, event.target.value)} required={field.required !== false} maxLength={field.max || (field.type === "url" ? 2000 : 160)} placeholder={field.type === "url" ? "https://…" : undefined} className="input-field" />}</div>)}</div>
          {section === "profile" && <div className="grid sm:grid-cols-2 gap-8"><ImageUpload label="Portrait" portrait value={editing.avatarMediaId as string || null} onChange={value => change("avatarMediaId", value)} disabled={saving || uploading} onBusy={setUploading} /><ImageUpload label="Resume / CV" pdf value={editing.resumeMediaId as string || null} onChange={value => change("resumeMediaId", value)} disabled={saving || uploading} onBusy={setUploading} /></div>}
          {(section === "skills" || section === "socials") && <IconPicker allowBrand={section === "socials"} value={editing.iconKey as string || null} onChange={key => setEditing(record => ({ ...record, iconKey: key, ...(section === "skills" ? { iconProvider: key.startsWith("lucide:") ? "lucide" : "simple-icons", customMediaId: null } : {}) }))} />}
          {section === "skills" && <div className="grid sm:grid-cols-2 gap-8"><ImageUpload label="Custom skill icon" value={editing.customMediaId as string || null} disabled={saving || uploading} onBusy={setUploading} onChange={value => setEditing(record => ({ ...record, customMediaId: value, iconProvider: value ? "custom" : "lucide", iconKey: value ? null : "lucide:code" }))} /><div><label htmlFor="accent-color" className="block text-sm mb-3">Glow color</label><div className="flex gap-3 items-center"><input id="accent-color" type="color" value={String(editing.accentColor)} onChange={event => change("accentColor", event.target.value)} className="w-14 h-12 rounded cursor-pointer bg-transparent" /><code className="text-sm">{String(editing.accentColor)}</code></div><div className="mt-5 rounded-xl border p-5 text-center font-mono" style={{ borderColor: String(editing.accentColor), boxShadow: `0 0 25px ${String(editing.accentColor)}30` }}>{String(editing.name || "Skill preview")}</div></div></div>}
          {(section === "projects" || section === "achievements") && <ImageUpload label={section === "projects" ? "Project screenshot" : "Certificate image"} value={editing.imageMediaId as string || null} onChange={value => change("imageMediaId", value)} disabled={saving || uploading} onBusy={setUploading} />}
          {section !== "profile" && <div className="flex flex-wrap items-center gap-8 border-t border-border pt-6"><div><label htmlFor="display-order" className="block text-sm mb-2">Display order</label><input id="display-order" type="number" min={0} max={10000} step={1} value={Number(editing.displayOrder || 0)} onChange={event => change("displayOrder", Number(event.target.value))} className="input-field w-28" /><p className="text-xs text-muted-foreground mt-2">Lower numbers appear first.</p></div><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={Boolean(editing.isPublished)} onChange={event => change("isPublished", event.target.checked)} className="w-4 h-4 accent-purple-400" />Published on portfolio</label></div>}
          <div className="flex flex-wrap items-center gap-4 pt-3"><button disabled={saving || uploading} className="btn-primary rounded-md disabled:opacity-50 inline-flex items-center gap-2">{saving && <LoaderCircle size={16} className="animate-spin" />}{saving ? "Saving…" : uploading ? "Upload in progress…" : "Save changes"}</button>{section !== "profile" && <button type="button" disabled={saving || uploading} onClick={() => { setEditing(null); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>}</div>
        </form> : items.length ? <div className="space-y-3">{items.map(item => <article key={String(item.id)} className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-border bg-card/40"><div className="min-w-0"><h3 className="font-mono font-medium truncate">{String(item.title || item.name || item.label || "Untitled")}</h3><p className="mt-2 text-xs text-muted-foreground flex items-center gap-2">{item.isPublished ? <Eye size={13} /> : <EyeOff size={13} />}{item.isPublished ? "Published" : "Draft"}<span>· Order {Number(item.displayOrder)}</span></p></div><div className="flex gap-2"><button type="button" aria-label={`Edit ${item.title || item.name || item.label}`} className="p-2.5 border border-border rounded-md hover:border-primary" onClick={() => { setEditing(item); setNotice(""); }}><Pencil size={16} /></button><button type="button" aria-label={`Delete ${item.title || item.name || item.label}`} className="p-2.5 border border-border rounded-md text-red-300 hover:border-red-300" onClick={() => setDeleting(item)}><Trash2 size={16} /></button></div></article>)}</div> : <div className="text-center border border-dashed border-border rounded-xl py-16 px-6"><p className="font-mono text-lg">Room for your next story.</p><p className="text-muted-foreground text-sm mt-3">Add your first item using the button above.</p></div>}
    </section>
    <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !saving) setDeleting(null); }}><DialogContent><DialogHeader><DialogTitle>Delete this item?</DialogTitle><DialogDescription>{String(deleting?.title || deleting?.name || deleting?.label || "This item")} will be removed from your portfolio.</DialogDescription></DialogHeader><div className="flex justify-end gap-4 mt-4"><button disabled={saving} onClick={() => setDeleting(null)} className="text-sm">Cancel</button><button disabled={saving} onClick={() => void remove()} className="px-4 py-2 rounded-md bg-red-500/15 border border-red-400/40 text-red-200 text-sm">{saving ? "Deleting…" : "Delete item"}</button></div></DialogContent></Dialog>
  </div>;
}
