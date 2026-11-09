"use client";
import Link from "next/link";
export default function AdminError({ reset }: { reset: () => void }) {
  return <main id="main-content" className="max-w-lg mx-auto px-6 py-20 space-y-5"><h1 className="text-2xl font-bold">That couldn’t finish.</h1><p className="text-muted-foreground">Your connection may have been interrupted. Try again before leaving this page.</p><div className="flex gap-5 items-center"><button onClick={reset} className="btn-primary">Try again</button><Link href="/admin/login" className="text-sm text-primary">Sign in again</Link></div></main>;
}
