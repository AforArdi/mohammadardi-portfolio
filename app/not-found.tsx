import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="text-primary font-mono">404</p>
      <h1 className="text-3xl sm:text-4xl font-bold">Page not found</h1>
      <p className="text-muted-foreground">This page may have moved. Let’s get you back to the portfolio.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </main>
  );
}
