"use client";
import { useActionState, useState, useTransition } from "react";
import { beginEnrollment, verifyMfa, type AuthState } from "@/lib/auth/actions";

export default function MfaForm({ factors }: { factors: { id: string; name: string }[] }) {
  const [enrollment, setEnrollment] = useState<Awaited<ReturnType<typeof beginEnrollment>>>({});
  const [settingUp, startSetup] = useTransition();
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyMfa, {});
  const qr = enrollment.qr?.startsWith("data:image/svg+xml") ? enrollment.qr : enrollment.qr ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qr)}` : undefined;
  return <div className="space-y-6">
    {!factors.length && !enrollment.factorId && <button className="btn-primary w-full" disabled={settingUp} onClick={() => startSetup(async () => setEnrollment(await beginEnrollment()))}>{settingUp ? "Preparing…" : "Connect authenticator"}</button>}
    {qr && <div className="space-y-4">
      {/* The QR is a Supabase-generated SVG shown as an image, never injected as HTML. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} width={240} height={240} alt="Scan this QR with your authenticator app" className="bg-white rounded-lg p-3 mx-auto" />
      <details className="text-sm"><summary className="cursor-pointer text-primary">Can’t scan? Enter the setup key</summary><code className="block break-all mt-3 select-all">{enrollment.secret}</code></details>
    </div>}
    {(factors.length > 0 || enrollment.factorId) && <form action={action} className="space-y-5">
      {factors.length > 1 ? <div><label htmlFor="factor" className="block text-sm mb-2">Authenticator</label><select id="factor" name="factorId" className="input-field">{factors.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></div> : <input type="hidden" name="factorId" value={factors[0]?.id || enrollment.factorId || ""} />}
      <div><label htmlFor="totp-code" className="block mb-2 text-sm">Six-digit code</label><input id="totp-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required className="input-field text-center font-mono text-2xl tracking-[0.4em]" /></div>
      <button disabled={pending} className="btn-primary w-full disabled:opacity-50">{pending ? "Verifying…" : "Unlock dashboard"}</button>
    </form>}
    <p role="status" className="text-red-300 text-sm">{state.error || enrollment.error}</p>
  </div>;
}
