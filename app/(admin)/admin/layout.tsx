import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireOwnerAdmin } from "@/lib/auth/guard";
import { logout } from "@/lib/auth/actions";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Portfolio studio", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const owner = await requireOwnerAdmin().catch(() => null);
  if (!owner) redirect("/admin/login");
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border bg-card/60"><div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
      <Link href="/admin" className="font-mono text-xl font-bold"><span className="text-primary">&lt;</span> Ardi <span className="text-primary">/ studio &gt;</span></Link>
      <div className="flex flex-wrap items-center gap-5"><Link href="/admin/security" className="text-sm text-muted-foreground hover:text-primary">Security</Link><Link href="/" target="_blank" className="text-sm text-muted-foreground hover:text-primary">View portfolio ↗</Link><form action={logout}><button className="text-sm border border-border rounded-md px-3 py-2 hover:border-primary">Sign out</button></form></div>
    </div></header>
    <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-5"><p className="text-xs text-muted-foreground">Authenticator verified · Session ends {owner.deadlineAt.toLocaleString("en-GB", { timeZone: "Asia/Dhaka", dateStyle: "medium", timeStyle: "short" })} (Dhaka)</p></div>
    {children}
  </div>;
}
