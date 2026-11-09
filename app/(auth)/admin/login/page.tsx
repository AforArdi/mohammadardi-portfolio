import Link from "next/link";
import LoginForm from "@/components/admin/LoginForm";
import { authConfigured } from "@/lib/auth/config";

export default function LoginPage() {
  return <main id="main-content" className="min-h-screen grid place-items-center px-6 py-16"><div className="w-full max-w-md space-y-8">
    <Link href="/" className="font-mono text-primary">&lt; Ardi /&gt;</Link>
    <div><p className="text-primary font-mono text-sm mb-3">OWNER ACCESS</p><h1 className="text-3xl font-bold">Welcome back.</h1><p className="mt-3 text-muted-foreground">Sign in, then confirm with your authenticator. Your dashboard stays unlocked for one day.</p></div>
    {authConfigured() ? <LoginForm /> : <div className="skill-card"><p>The dashboard is not connected yet. Complete the owner setup before signing in.</p></div>}
    <Link href="/" className="inline-block text-sm text-muted-foreground hover:text-primary">← Back to portfolio</Link>
  </div></main>;
}
