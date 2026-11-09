import { redirect } from "next/navigation";
import Link from "next/link";
import { freshLoginIdentity } from "@/lib/auth/fresh-login";
import MfaForm from "@/components/admin/MfaForm";

export default async function MfaPage() {
  const identity = await freshLoginIdentity().catch(() => null);
  if (!identity) redirect("/admin/login");
  const { data, error } = await identity.supabase.auth.mfa.listFactors();
  if (error) redirect("/admin/login");
  const factors = data.totp.filter(f => f.status === "verified").map(f => ({ id: f.id, name: f.friendly_name || "Authenticator" }));
  return <main id="main-content" className="min-h-screen grid place-items-center px-6 py-16"><div className="max-w-md w-full space-y-7"><p className="text-primary font-mono">ONE MORE STEP</p><h1 className="text-3xl font-bold">{factors.length ? "Verify it’s you." : "Set up your authenticator."}</h1><p className="text-muted-foreground">{factors.length ? "Enter the current code from your authenticator app." : "Connect an authenticator app, then verify its six-digit code. Keep a backup of your setup on a second trusted device."}</p><MfaForm factors={factors} /><Link href="/admin/login" className="text-sm text-muted-foreground">Start a new login</Link></div></main>;
}
