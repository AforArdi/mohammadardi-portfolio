"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export default function PasswordSettings() {
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signInAgain, setSignInAgain] = useState(false);
  const [changed, setChanged] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/security/password", { signal: controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Authenticators could not be loaded.");
      setFactors(result.factors);
    }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || signInAgain) return;
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/security/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      const result = await response.json();
      if (result.signInAgain) { setSignInAgain(true); form.current?.reset(); }
      if (!response.ok) throw new Error(result.error || "Your password could not be changed.");
      setChanged(true);
    } catch (error) { setError(error instanceof Error ? error.message : "Your password could not be changed."); }
    finally { setBusy(false); }
  }

  return <section className="max-w-xl rounded-xl border border-border bg-card/40 p-6 sm:p-8">
    <h1 className="font-mono text-2xl font-bold">Change password</h1>
    <p className="text-muted-foreground text-sm mt-3 mb-6">Confirm your current password and a fresh authenticator code. Changing your password signs you out of every dashboard session.</p>
    {changed ? <p role="status" className="text-green-200">Password changed. Sign in again with your new password and authenticator.</p> : <form ref={form} onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy || signInAgain || !factors.length} className="space-y-5 disabled:opacity-60">
        {[{ name: "currentPassword", label: "Current password", autoComplete: "current-password" }, { name: "newPassword", label: "New password", autoComplete: "new-password" }, { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" }].map(field => <div key={field.name}><label className="block text-sm mb-2" htmlFor={field.name}>{field.label}</label><input className="input-field" id={field.name} name={field.name} type="password" autoComplete={field.autoComplete} required maxLength={256} minLength={field.name === "currentPassword" ? 1 : 12} /></div>)}
        <p className="text-xs text-muted-foreground">Use a unique password of at least 12 characters.</p>
        <div><label className="block text-sm mb-2" htmlFor="factorId">Authenticator</label><select className="input-field" id="factorId" name="factorId" required>{factors.map(factor => <option key={factor.id} value={factor.id}>{factor.name}</option>)}</select></div>
        <div><label className="block text-sm mb-2" htmlFor="code">Six-digit authenticator code</label><input className="input-field font-mono" id="code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required /></div>
        <button className="btn-primary rounded-md" type="submit">{busy ? "Changing password…" : "Change password and sign out"}</button>
      </fieldset>
    </form>}
    {error && <p role="alert" className="text-red-300 text-sm mt-5">{error}</p>}
    {(signInAgain || changed) && <Link href="/admin/login" className="inline-block text-primary underline mt-5">Return to sign in</Link>}
  </section>;
}
