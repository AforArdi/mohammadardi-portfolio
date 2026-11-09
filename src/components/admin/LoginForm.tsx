"use client";
import { useActionState } from "react";
import { login, type AuthState } from "@/lib/auth/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return <form action={action} className="space-y-5">
    <div><label htmlFor="admin-email" className="block mb-2 text-sm">Email</label><input id="admin-email" name="email" type="email" autoComplete="username" required maxLength={254} className="input-field" /></div>
    <div><label htmlFor="admin-password" className="block mb-2 text-sm">Password</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required maxLength={256} className="input-field" /></div>
    <p role="status" className="text-sm text-red-300 min-h-5">{state.error}</p>
    <button disabled={pending} className="btn-primary w-full disabled:opacity-50">{pending ? "Signing in…" : "Continue to authenticator"}</button>
  </form>;
}
